import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite, setPlayerAppearance } from '../entities/player';
import { Character } from '../game/character';
import { QUESTS, getQuestProgress, startQuest, turnInQuest } from '../game/quest';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { SaveManager } from '../save/SaveManager';
import { playQuestComplete } from '../ui/sound';
import { addCrispText } from '../ui/text';

const WORLD_WIDTH = 260;
// Tall enough to fill the portrait canvas at every camera position — see
// HamletScene's WORLD_HEIGHT comment for why a shorter world leaves a black
// band at the bottom of the screen.
const WORLD_HEIGHT = 400;
const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
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
  private dialogElements: Phaser.GameObjects.GameObject[] = [];
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
    this.dialogElements = [];
    this.cameras.main.setBackgroundColor('#2a3a24');

    addCrispText(this, this.scale.width / 2, 12, 'Camp de gobelins', {
      fontSize: '10px',
      color: '#9aa0a6',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(500);

    // Crude huts + bonfire, purely decorative.
    this.add.rectangle(70, 140, 36, 28, 0x4a3a28).setStrokeStyle(1, 0x1f1810);
    this.add.rectangle(190, 130, 36, 28, 0x4a3a28).setStrokeStyle(1, 0x1f1810);
    this.add.circle(130, 145, 8, 0xb5602a).setStrokeStyle(1, 0x5a2e10);

    // A few crude totems along the approach south of the camp proper, purely
    // decorative, no collision.
    this.add.rectangle(90, 280, 10, 24, 0x4a3a28).setStrokeStyle(1, 0x1f1810);
    this.add.rectangle(180, 320, 10, 24, 0x4a3a28).setStrokeStyle(1, 0x1f1810);

    // Off the x=130 centerline (spawn sits on it) — see BanditCampScene.
    this.scout = this.add.rectangle(190, 185, 14, 20, 0x3a5a3a).setStrokeStyle(1, 0x0b0c10);
    this.physics.add.existing(this.scout, true);
    addCrispText(this, 190, 165, 'Éclaireuse', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 40);
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

    addCrispText(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 22, 'Sortie ↓', {
      fontSize: '10px',
      color: '#9aa0a6',
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
      await setPlayerAppearance(this, this.player, this.character.race, this.character.class);
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

  private openDialog(text: string, buttons: { label: string; onClick: () => void }[]): void {
    this.closeDialog();
    this.tapControl.setEnabled(false);

    const { width, height } = this.scale;
    const bg = this.add
      .rectangle(10, height / 2 - 100, width - 20, 200, 0x0b0c10, 0.97)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(800)
      .setStrokeStyle(1, 0xe8d9b5);

    const label = addCrispText(this, width / 2, height / 2 - 80, text, {
      fontSize: '10px',
      color: GOLD,
      align: 'center',
      lineSpacing: 5,
      wordWrap: { width: width - 44 },
    })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(801);

    this.dialogElements = [bg, label];

    buttons.forEach((button, i) => {
      const buttonText = addCrispText(this, width / 2, height / 2 + 50 + i * 26, button.label, {
        fontSize: '10px',
        color: DARK,
        backgroundColor: GOLD,
        padding: { x: 8, y: 5 },
      })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(801)
        .setInteractive({ useHandCursor: true });
      buttonText.on('pointerdown', button.onClick);
      this.dialogElements.push(buttonText);
    });
  }

  private closeDialog(): void {
    this.dialogElements.forEach((el) => el.destroy());
    this.dialogElements = [];
    this.tapControl.setEnabled(true);
  }

  private addEncounterZone(encounter: EncounterMarker): void {
    const marker = this.add.rectangle(encounter.x, encounter.y, 26, 26, 0x3a4a2a, 0.8).setStrokeStyle(1, 0x0b0c10);
    const label = addCrispText(this, encounter.x, encounter.y - 22, encounter.label, {
      fontSize: '8px',
      color: '#e8d9b5',
    }).setOrigin(0.5);

    const zone = this.add.zone(encounter.x, encounter.y, 26, 26);
    this.physics.add.existing(zone, true);

    const overlap = this.physics.add.overlap(this.player, zone, () => {
      overlap.destroy();
      marker.destroy();
      label.destroy();
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
    const label = addCrispText(this, x, y - 26, 'Chef des gobelins', {
      fontSize: '9px',
      color: '#e8d9b5',
      align: 'center',
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, 34, 34);
    this.physics.add.existing(zone, true);
    const overlap = this.physics.add.overlap(this.player, zone, () => {
      overlap.destroy();
      marker.destroy();
      label.destroy();
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
