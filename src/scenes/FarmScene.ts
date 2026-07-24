import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { Character } from '../game/character';
import { QUESTS, getQuestProgress, startQuest, turnInQuest } from '../game/quest';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { SaveManager } from '../save/SaveManager';
import { addCrispText } from '../ui/text';

const WORLD_WIDTH = 220;
const WORLD_HEIGHT = 200;
const MIN_ENCOUNTER_DISTANCE = 150;
const MAX_ENCOUNTER_DISTANCE = 300;
const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const QUEST_ID = 'crop_pests';

interface FarmData {
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
  private dialogElements: Phaser.GameObjects.GameObject[] = [];
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('Farm');
  }

  init(data: FarmData): void {
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.dialogElements = [];
    this.distanceWalked = 0;
    this.rollNextEncounterThreshold();
    this.cameras.main.setBackgroundColor('#4a5a2a');

    addCrispText(this, this.scale.width / 2, 12, 'La ferme isolée', {
      fontSize: '10px',
      color: '#9aa0a6',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(500);

    // Farmhouse + crop rows, purely decorative.
    this.add.rectangle(50, 70, 40, 32, 0x6b5a42).setStrokeStyle(1, 0x2e2419);
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        this.add.rectangle(110 + col * 22, 40 + row * 26, 16, 10, 0x3a5a2a).setStrokeStyle(1, 0x1f3a18);
      }
    }

    // Off the x=110 spawn-to-exit centerline, same lesson as every other camp/NPC.
    this.farmer = this.add.rectangle(170, 100, 14, 20, 0x8a6a3a).setStrokeStyle(1, 0x0b0c10);
    this.physics.add.existing(this.farmer, true);
    addCrispText(this, 170, 80, 'Fermière', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 40);
    this.physics.add.collider(this.player, this.farmer);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.tapControl = new TapController(this, this.player);

    const exitZone = this.add.zone(WORLD_WIDTH / 2, WORLD_HEIGHT - 10, WORLD_WIDTH, 20);
    this.physics.add.existing(exitZone, true);
    this.physics.add.overlap(this.player, exitZone, () => this.leaveFarm());

    addCrispText(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 22, 'Sortie ↓', {
      fontSize: '10px',
      color: '#9aa0a6',
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
        this.startEncounter();
      }
    }
  }

  private rollNextEncounterThreshold(): void {
    this.encounterThreshold = Phaser.Math.Between(MIN_ENCOUNTER_DISTANCE, MAX_ENCOUNTER_DISTANCE);
  }

  private startEncounter(): void {
    this.isTransitioning = true;
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Combat', {
        returnScene: 'Farm',
        monsterId: 'field_rat',
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

  private leaveFarm(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Hamlet', { x: 40, y: 140 });
    });
  }
}
