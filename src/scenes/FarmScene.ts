import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite, setPlayerAppearance } from '../entities/player';
import { attachSpriteOverlay } from '../entities/spriteOverlay';
import { paintZone } from '../world/zoneArt';
import { FARM } from '../world/zones/farm';
import { Character } from '../game/character';
import { QUESTS, getQuestProgress, startQuest, turnInQuest } from '../game/quest';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { SaveManager } from '../save/SaveManager';
import { playQuestComplete } from '../ui/sound';
import { addCrispText } from '../ui/text';
import { DialogBox, DialogButton } from '../ui/dialog';
import { EXIT_TEXT } from '../ui/kit';

const WORLD_WIDTH = 220;
// Tall enough to fill the portrait canvas at every camera position — see
// HamletScene's WORLD_HEIGHT comment for why a shorter world leaves a black
// band at the bottom of the screen.
const WORLD_HEIGHT = 400;
const MIN_ENCOUNTER_DISTANCE = 150;
const MAX_ENCOUNTER_DISTANCE = 300;
const QUEST_ID = 'crop_pests';
const KING_QUEST_ID = 'crop_pests_king';
const KING_ZONE_ID = 'rat_king_zone';

interface FarmData {
  // Set by CombatScene when handing control back after a fight, or by the
  // Menu overlay — distinguishes "returning mid-run" from a genuine fresh
  // entry, so the rat king zone (once cleared) doesn't respawn under the
  // player. Random ambient encounters don't need this (no fixed state).
  resume?: boolean;
  x?: number;
  y?: number;
}

// The "ferme isolée" from VISION.md's region-1 description — a small dead-end
// branch off Basse-Combe, west side. Random field_rat encounters while
// walking the crop rows (same distance-based model as ForestScene), no fixed
// encounter zones, so no cleared/resume tracking needed here.
export class FarmScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;
  private distanceWalked = 0;
  private encounterThreshold = 0;
  private character!: Character;
  private farmer!: Phaser.GameObjects.Rectangle;
  private dialog?: DialogBox;
  private clearedMonsterIds = new Set<string>();
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('Farm');
  }

  init(data: FarmData): void {
    if (!data?.resume) {
      this.clearedMonsterIds = new Set();
    }
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.dialog = undefined;
    this.distanceWalked = 0;
    this.rollNextEncounterThreshold();
    this.cameras.main.setBackgroundColor('#4a5a2a');


    // Farmhouse + crop rows, purely decorative.
    // Ground, buildings and decor drawn by the game (world/zones/farm.ts);
    // the farmhouse and the barn get collision boxes.
    const painted = paintZone(this, FARM);
    const buildings = Object.values(FARM.buildings!).map((spot) => {
      const rect = this.add.rectangle(spot.x, spot.y, spot.w, spot.h).setVisible(false);
      this.physics.add.existing(rect, true);
      return rect;
    });

    this.farmer = this.add.rectangle(170, 100, 14, 20, 0x8a6a3a).setStrokeStyle(1, 0x0b0c10);
    void attachSpriteOverlay(this, this.farmer, 'npc-farmer_generic', `${import.meta.env.BASE_URL}sprites/npc/farmer_generic.png`, 24);
    this.physics.add.existing(this.farmer, true);

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 40);
    painted.follow(this.player);
    this.physics.add.collider(this.player, this.farmer);
    this.physics.add.collider(this.player, buildings);
    this.addRatKingZone();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.tapControl = new TapController(this, this.player);

    const exitZone = this.add.zone(WORLD_WIDTH / 2, WORLD_HEIGHT - 10, WORLD_WIDTH, 20);
    this.physics.add.existing(exitZone, true);
    this.physics.add.overlap(this.player, exitZone, () => this.leaveFarm());

    addCrispText(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 22, '↓', {
      fontSize: '10px',
      ...EXIT_TEXT,
    }).setOrigin(0.5);

    const interactables: Interactable[] = [
      { x: this.farmer.x, y: this.farmer.y, radius: 24, onTap: () => this.talkToFarmer() },
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
        'Farm',
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

    if (this.isTransitioning) return;

    const speed = this.player.body.velocity.length();
    if (speed > 0) {
      this.distanceWalked += (speed * delta) / 1000;
      if (this.distanceWalked >= this.encounterThreshold) {
        this.startEncounter('field_rat');
      }
    }
  }

  private rollNextEncounterThreshold(): void {
    this.encounterThreshold = Phaser.Math.Between(MIN_ENCOUNTER_DISTANCE, MAX_ENCOUNTER_DISTANCE);
  }

  // Always present (not gated behind accepting crop_pests_king) — same
  // precedent as every other camp's leader: fightable on its own, the quest
  // just tracks/rewards the same kill. Placed clear of both crop-row blocks
  // and the farmer.
  private addRatKingZone(): void {
    if (this.clearedMonsterIds.has(KING_ZONE_ID)) return;

    const x = 170;
    const y = 320;
    const marker = this.add.rectangle(x, y, 30, 30, 0x3a2a1f, 0.85).setStrokeStyle(2, 0xe8d9b5);
    void attachSpriteOverlay(this, marker, 'monster-rat_king', `${import.meta.env.BASE_URL}sprites/monsters/rat_king.png`, 30);

    const zone = this.add.zone(x, y, 30, 30);
    this.physics.add.existing(zone, true);
    const overlap = this.physics.add.overlap(this.player, zone, () => {
      overlap.destroy();
      marker.destroy();
      zone.destroy();
      this.clearedMonsterIds.add(KING_ZONE_ID);
      this.startEncounter('rat_king');
    });
  }

  private startEncounter(monsterId: string): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Combat', {
        returnScene: 'Farm',
        monsterId,
        x: this.player.x,
        y: this.player.y,
      });
    });
  }

  private talkToFarmer(): void {
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
      this.openDialog(`${quest.title}\n\nProgression : ${progress.progress}/${quest.objective.count} rats éliminés.`, [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(`${quest.title} — terminée !\n\nMerci d'avoir protégé les récoltes. Voici votre récompense.`, [
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

    this.talkToFarmerAboutRatKing();
  }

  // Reached only once crop_pests is turned in — same shape as the camps'
  // leader follow-ups: the boss sits deeper in this same scene rather than
  // opening a new connected one.
  private talkToFarmerAboutRatKing(): void {
    const quest = QUESTS[KING_QUEST_ID];
    const progress = getQuestProgress(this.character, KING_QUEST_ID);

    if (!progress) {
      this.openDialog(quest.description, [
        {
          label: 'Accepter',
          onClick: async () => {
            startQuest(this.character, KING_QUEST_ID);
            await SaveManager.saveCharacter(this.character);
            this.closeDialog();
          },
        },
        { label: 'Plus tard', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'active') {
      this.openDialog(`${quest.title}\n\nIl se terre dans la remise, au fond de la ferme.`, [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(`${quest.title} — terminée !\n\nLes récoltes sont enfin tranquilles. Voici votre récompense.`, [
        {
          label: 'Récupérer la récompense',
          onClick: async () => {
            turnInQuest(this.character, KING_QUEST_ID);
            await SaveManager.saveCharacter(this.character);
            playQuestComplete();
            this.closeDialog();
          },
        },
      ]);
      return;
    }

    this.openDialog('Merci encore pour votre aide, les récoltes se portent bien mieux.', [
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

  private leaveFarm(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Hamlet', { x: 40, y: 140 });
    });
  }
}
