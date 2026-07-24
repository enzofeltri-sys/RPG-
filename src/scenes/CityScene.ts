import Phaser from 'phaser';
import { VirtualJoystick } from '../input/VirtualJoystick';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { Character } from '../game/character';
import { QUESTS, getQuestProgress, startQuest, turnInQuest } from '../game/quest';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { createTouchButton } from '../ui/TouchButton';
import { SaveManager } from '../save/SaveManager';
import { addCrispText } from '../ui/text';

const WORLD_WIDTH = 520;
const WORLD_HEIGHT = 480;
const INTERACT_RADIUS = 60;
const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';
const QUEST_ID = 'city_road_patrol';

const MAGE_LINES = [
  "La Guilde des Mages étudie la corruption depuis des décennies. Votre marque n'est pas passée inaperçue, voyageur.",
  "Aiglemont n'est que la première des cités-États. Chacune a ses propres intérêts — et ses propres secrets.",
  "Si vous croisez des runes que vous ne comprenez pas, n'y touchez pas. Venez plutôt m'en parler.",
];

interface CityData {
  x?: number;
  y?: number;
}

// Aiglemont — la première cité-État (région 2 de VISION.md), reliée à
// Valombre par la route commerciale (RoadScene). Volontairement pas de forge
// ici : l'artisanat reste l'identité de Valombre, Aiglemont apporte plutôt la
// première touche politique/faction (caserne, tour de mages) annoncée pour
// l'acte 2 dans DESIGN.md, sans encore de vrai système de réputation.
export class CityScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private joystick!: VirtualJoystick;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private buildings: Phaser.GameObjects.Rectangle[] = [];
  private isTransitioning = false;
  private character!: Character;
  private captain!: Phaser.GameObjects.Rectangle;
  private mage!: Phaser.GameObjects.Rectangle;
  private merchantNpc!: Phaser.GameObjects.Rectangle;
  private actionButton!: Phaser.GameObjects.Text;
  private dialogElements: Phaser.GameObjects.GameObject[] = [];
  private mageLineIndex = 0;
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('City');
  }

  init(data: CityData): void {
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.buildings = [];
    this.dialogElements = [];
    this.mageLineIndex = 0;
    this.drawGround();

    addCrispText(this, this.scale.width / 2, 12, 'Aiglemont', {
      fontSize: '11px',
      color: '#9aa0a6',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(500);

    const garrison = this.addBuilding(150, 100, 80, 60);
    addCrispText(this, 150, 68, 'Caserne', { fontSize: '8px', color: MUTED }).setOrigin(0.5);

    const tower = this.addBuilding(400, 130, 50, 100);
    addCrispText(this, 400, 78, 'Tour des Mages', { fontSize: '8px', color: MUTED }).setOrigin(0.5);

    const market = this.addBuilding(280, 340, 100, 60);
    addCrispText(this, 280, 308, 'Marché', { fontSize: '8px', color: MUTED }).setOrigin(0.5);

    // Each NPC kept off the straight west-entrance-to-building lines, same
    // lesson as every other location this session.
    this.captain = this.add.rectangle(150, 190, 14, 20, 0x6a5a7a).setStrokeStyle(1, 0x0b0c10);
    this.physics.add.existing(this.captain, true);
    addCrispText(this, 150, 170, 'Capitaine Bregan', { fontSize: '8px', color: MUTED }).setOrigin(0.5);

    this.mage = this.add.rectangle(400, 220, 14, 20, 0x4a3a7a).setStrokeStyle(1, 0x0b0c10);
    this.physics.add.existing(this.mage, true);
    addCrispText(this, 400, 200, 'Mage Sélène', { fontSize: '8px', color: MUTED }).setOrigin(0.5);

    this.merchantNpc = this.add.rectangle(280, 260, 14, 20, 0x7a3a5a).setStrokeStyle(1, 0x0b0c10);
    this.physics.add.existing(this.merchantNpc, true);
    addCrispText(this, 280, 240, 'Marchand', { fontSize: '8px', color: MUTED }).setOrigin(0.5);

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 40);
    this.physics.add.collider(this.player, [garrison, tower, market]);
    this.physics.add.collider(this.player, this.captain);
    this.physics.add.collider(this.player, this.mage);
    this.physics.add.collider(this.player, this.merchantNpc);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.joystick = new VirtualJoystick(this);

    const westZone = this.add.zone(10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT);
    this.physics.add.existing(westZone, true);
    this.physics.add.overlap(this.player, westZone, () => this.leaveCity());

    addCrispText(this, 30, WORLD_HEIGHT / 2 - 20, '← Route commerciale', {
      fontSize: '9px',
      color: MUTED,
      align: 'center',
    }).setOrigin(0.5);

    this.actionButton = createTouchButton(this, this.scale.width - 34, this.scale.height - 56, 'Action', () =>
      this.handleAction(),
    );

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
        'City',
        () => ({ x: this.player.x, y: this.player.y }),
        (open) => {
          this.joystick.setEnabled(!open);
          this.actionButton.input!.enabled = !open;
        },
      );
    }
  }

  update(): void {
    updatePlayerMovement(this.player, this.cursors, this.joystick);
  }

  private addBuilding(x: number, y: number, w: number, h: number): Phaser.GameObjects.Rectangle {
    const rect = this.add.rectangle(x, y, w, h, 0x5a5468).setStrokeStyle(1, 0x2e2b3a);
    this.physics.add.existing(rect, true);
    this.buildings.push(rect);
    return rect;
  }

  private drawGround(): void {
    if (!this.textures.exists('stoneTile')) {
      const g = this.make.graphics({}, false);
      g.fillStyle(0x4a4a52);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x545460);
      g.fillRect(0, 0, 16, 16);
      g.fillRect(16, 16, 16, 16);
      g.generateTexture('stoneTile', 32, 32);
      g.destroy();
    }
    this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'stoneTile').setOrigin(0, 0);
  }

  private distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y);
  }

  private handleAction(): void {
    if (this.distanceTo(this.captain.x, this.captain.y) < INTERACT_RADIUS) {
      this.talkToCaptain();
      return;
    }

    if (this.distanceTo(this.mage.x, this.mage.y) < INTERACT_RADIUS) {
      this.talkToMage();
      return;
    }

    if (this.distanceTo(this.merchantNpc.x, this.merchantNpc.y) < INTERACT_RADIUS) {
      this.scene.start('Merchant', { x: this.player.x, y: this.player.y, returnScene: 'City' });
      return;
    }

    const nearBuilding = this.buildings.find((b) => this.distanceTo(b.x, b.y) < INTERACT_RADIUS);
    this.showMessage(nearBuilding ? 'Un bâtiment fermé pour le moment.' : 'Rien à proximité.');
  }

  private talkToCaptain(): void {
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
      this.openDialog(
        `${quest.title}\n\nProgression : ${progress.progress}/${quest.objective.count} sangliers corrompus vaincus.`,
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(`${quest.title} — terminée !\n\nLa garnison vous remercie. Voici votre récompense.`, [
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

    this.openDialog('La route commerciale est plus sûre grâce à vous.', [
      { label: 'Fermer', onClick: () => this.closeDialog() },
    ]);
  }

  private talkToMage(): void {
    const text = MAGE_LINES[this.mageLineIndex % MAGE_LINES.length];
    this.mageLineIndex += 1;
    this.openDialog(text, [{ label: 'Fermer', onClick: () => this.closeDialog() }]);
  }

  private openDialog(text: string, buttons: { label: string; onClick: () => void }[]): void {
    this.closeDialog();
    this.joystick.setEnabled(false);
    this.actionButton.input!.enabled = false;

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
    this.joystick.setEnabled(true);
    this.actionButton.input!.enabled = true;
  }

  private showMessage(message: string): void {
    const messageText = addCrispText(this, this.scale.width / 2, 30, message, {
      fontSize: '10px',
      color: '#e8d9b5',
      backgroundColor: '#0b0c10',
      padding: { x: 8, y: 5 },
      align: 'center',
      wordWrap: { width: this.scale.width - 20 },
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001);

    this.time.delayedCall(1800, () => messageText.destroy());
  }

  private leaveCity(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Road', { x: 440, y: 110 });
    });
  }
}
