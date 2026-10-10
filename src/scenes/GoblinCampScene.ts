import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite, setPlayerAppearance } from '../entities/player';
import { paintZone } from '../world/zoneArt';
import { GOBLIN_CAMP } from '../world/zones/camps';
import { attachSpriteOverlay } from '../entities/spriteOverlay';
import { Character } from '../game/character';
import { QUESTS, getQuestProgress, startQuest, turnInQuest } from '../game/quest';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { SaveManager } from '../save/SaveManager';
import { playQuestComplete } from '../ui/sound';
import { addCrispText } from '../ui/text';
import { DialogBox, DialogButton } from '../ui/dialog';
import { EXIT_TEXT } from '../ui/kit';

const WORLD_WIDTH = 260;
// Tall enough to fill the portrait canvas at every camera position — see
// HamletScene's WORLD_HEIGHT comment for why a shorter world leaves a black
// band at the bottom of the screen.
const WORLD_HEIGHT = 400;
const QUEST_ID = 'goblin_camp_threat';
const LEADER_QUEST_ID = 'goblin_camp_threat_leader';
const LEADER_ZONE_ID = 'goblin_chief_zone';

interface EncounterMarker {
  id: string;
  x: number;
  y: number;
  label: string;
}

const ENCOUNTERS: EncounterMarker[] = [
  { id: 'goblins_1', x: 80, y: 100, label: 'Gobelins' },
  { id: 'goblins_2', x: 190, y: 70, label: 'Gobelins' },
];

interface GoblinCampData {
  resume?: boolean;
  x?: number;
  y?: number;
}

// An optional detour off the Forêt — a goblin camp with a forest scout
// (quest giver) at the safe edge and the goblins further in. Dead end by
// design, same shape as BanditCampScene.
export class GoblinCampScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;
  private character!: Character;
  private scout!: Phaser.GameObjects.Rectangle;
  private dialog?: DialogBox;
  private clearedEncounterIds = new Set<string>();
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('GoblinCamp');
  }

  init(data: GoblinCampData): void {
    if (!data?.resume) {
      this.clearedEncounterIds = new Set();
    }
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.dialog = undefined;
    this.cameras.main.setBackgroundColor('#2a3a24');


    // Ground, huts or tents, fire and decor drawn by the game (world/zones/camps.ts).
    const painted = paintZone(this, GOBLIN_CAMP);

    this.scout = this.add.rectangle(190, 185, 14, 20, 0x3a5a3a).setStrokeStyle(1, 0x0b0c10);
    void attachSpriteOverlay(this, this.scout, 'npc-forest_scout', '', 24);
    this.physics.add.existing(this.scout, true);

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 40);
    painted.follow(this.player);
    this.physics.add.collider(this.player, this.scout);
    ENCOUNTERS.filter((e) => !this.clearedEncounterIds.has(e.id)).forEach((encounter) =>
      this.addEncounterZone(encounter),
    );
    this.addLeaderZone();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.tapControl = new TapController(this, this.player);

    const exitZone = this.add.zone(WORLD_WIDTH / 2, WORLD_HEIGHT - 10, WORLD_WIDTH, 20);
    this.physics.add.existing(exitZone, true);
    this.physics.add.overlap(this.player, exitZone, () => this.leaveCamp());

    addCrispText(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 22, '↓', {
      fontSize: '10px',
      ...EXIT_TEXT,
    }).setOrigin(0.5);

    const interactables: Interactable[] = [
      { x: this.scout.x, y: this.scout.y, radius: 24, onTap: () => this.talkToScout() },
    ];
    this.tapControl.setInteractables(interactables);

    // See ForestScene.create() for why this must bail if the scene was
    // stopped while the load was pending (a zone overlap can fire and start
    // a new scene mid-await).
    const save = await SaveManager.load();
    if (!this.scene.isActive()) return;

    if (save?.character) {
      this.character = save.character;
      setPlayerAppearance(this, this.player, this.character);
      if (!this.scene.isActive()) return;
      new CharacterSheetPanel(
        this,
        save.character,
        'GoblinCamp',
        () => ({ x: this.player.x, y: this.player.y }),
        (open) => {
          this.tapControl.setEnabled(!open);
        },
      );
    }
  }

  update(_time: number, delta: number): void {
    const arrived = !updatePlayerMovement(this.player, this.cursors, this.tapControl.getMoveTarget());
    if (arrived) this.tapControl.clearMoveTarget();
    this.tapControl.update(delta);
  }

  private talkToScout(): void {
    const quest = QUESTS[QUEST_ID];
    const progress = getQuestProgress(this.character, QUEST_ID);

    if (!progress) {
      this.openDialog(quest.description, [
        {
          label: 'Accepter',
          onClick: async () => {
            startQuest(this.character, QUEST_ID);
            await SaveManager.saveCharacter(this.character);
            this.closeDialog();
          },
        },
        { label: 'Plus tard', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'active') {
      this.openDialog(`${quest.title}\n\nProgression : ${progress.progress}/${quest.objective.count} gobelins vaincus.`, [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(`${quest.title} — terminée !\n\nMerci d'avoir nettoyé ce camp. Voici votre récompense.`, [
        {
          label: 'Récupérer la récompense',
          onClick: async () => {
            turnInQuest(this.character, QUEST_ID);
            await SaveManager.saveCharacter(this.character);
            playQuestComplete();
            this.closeDialog();
          },
        },
      ]);
      return;
    }

    this.talkToScoutAboutLeader();
  }

  // Reached only once goblin_camp_threat is turned in — same shape as
  // BanditCampScene's follow-up: the leader sits deeper in this same scene
  // rather than opening a new connected one (dead end by design).
  private talkToScoutAboutLeader(): void {
    const quest = QUESTS[LEADER_QUEST_ID];
    const progress = getQuestProgress(this.character, LEADER_QUEST_ID);

    if (!progress) {
      this.openDialog(quest.description, [
        {
          label: 'Accepter',
          onClick: async () => {
            startQuest(this.character, LEADER_QUEST_ID);
            await SaveManager.saveCharacter(this.character);
            this.closeDialog();
          },
        },
        { label: 'Plus tard', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'active') {
      this.openDialog(`${quest.title}\n\nIl se terre plus au nord, au fond du camp.`, [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(`${quest.title} — terminée !\n\nLa bande est dispersée. Voici votre récompense.`, [
        {
          label: 'Récupérer la récompense',
          onClick: async () => {
            turnInQuest(this.character, LEADER_QUEST_ID);
            await SaveManager.saveCharacter(this.character);
            playQuestComplete();
            this.closeDialog();
          },
        },
      ]);
      return;
    }

    this.openDialog('Merci encore pour votre aide contre les gobelins.', [
      { label: 'Fermer', onClick: () => this.closeDialog() },
    ]);
  }

  // Parchment dialogue box (ui/dialog.ts): long speeches page behind "Suite".
  private openDialog(text: string, buttons: DialogButton[]): void {
    this.closeDialog();
    this.tapControl.setEnabled(false);
    this.dialog = new DialogBox(this, text, buttons);
  }

  private closeDialog(): void {
    this.dialog?.destroy();
    this.dialog = undefined;
    this.tapControl.setEnabled(true);
  }

  private addEncounterZone(encounter: EncounterMarker): void {
    const marker = this.add.rectangle(encounter.x, encounter.y, 26, 26, 0x3a4a2a, 0.8).setStrokeStyle(1, 0x0b0c10);
    void attachSpriteOverlay(this, marker, 'monster-goblin_brute', `${import.meta.env.BASE_URL}sprites/monsters/goblin_brute.png`, 26);

    const zone = this.add.zone(encounter.x, encounter.y, 26, 26);
    this.physics.add.existing(zone, true);

    const overlap = this.physics.add.overlap(this.player, zone, () => {
      overlap.destroy();
      marker.destroy();
      zone.destroy();
      this.clearedEncounterIds.add(encounter.id);
      this.startCombat('goblin_brute');
    });
  }

  // Always present (not gated behind accepting goblin_camp_threat_leader) —
  // same precedent as the Entrepôt's smuggler_captain and the Camp de
  // bandits' chief: fightable on its own, the quest just tracks/rewards it.
  private addLeaderZone(): void {
    if (this.clearedEncounterIds.has(LEADER_ZONE_ID)) return;

    const x = 130;
    const y = 30;
    const marker = this.add.rectangle(x, y, 34, 34, 0x2a3a20, 0.85).setStrokeStyle(2, 0xe8d9b5);
    void attachSpriteOverlay(this, marker, 'monster-goblin_chief', `${import.meta.env.BASE_URL}sprites/monsters/goblin_chief.png`, 34);

    const zone = this.add.zone(x, y, 34, 34);
    this.physics.add.existing(zone, true);
    const overlap = this.physics.add.overlap(this.player, zone, () => {
      overlap.destroy();
      marker.destroy();
      zone.destroy();
      this.clearedEncounterIds.add(LEADER_ZONE_ID);
      this.startCombat('goblin_chief');
    });
  }

  private startCombat(monsterId: string): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Combat', {
        returnScene: 'GoblinCamp',
        monsterId,
        x: this.player.x,
        y: this.player.y,
      });
    });
  }

  private leaveCamp(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Forest', { x: 200, y: 30 });
    });
  }
}
