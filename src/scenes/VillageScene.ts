import Phaser from 'phaser';
import { VirtualJoystick } from '../input/VirtualJoystick';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { createTouchButton } from '../ui/TouchButton';
import { addCrispText } from '../ui/text';

const WORLD_WIDTH = 480;
const WORLD_HEIGHT = 640;
const INTERACT_RADIUS = 60;

export class VillageScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private joystick!: VirtualJoystick;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private buildings: Phaser.GameObjects.Rectangle[] = [];
  private isTransitioning = false;
  private messageText?: Phaser.GameObjects.Text;

  constructor() {
    super('Village');
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.buildings = [];
    this.drawGround();

    this.addBuilding(120, 160, 70, 50);
    this.addBuilding(300, 210, 60, 60);
    this.addBuilding(190, 360, 90, 50);
    this.addBuilding(340, 460, 60, 70);

    this.player = createPlayer(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 80);
    this.physics.add.collider(this.player, this.buildings);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.joystick = new VirtualJoystick(this);

    const exitZone = this.add.zone(WORLD_WIDTH / 2, 20, WORLD_WIDTH, 24);
    this.physics.add.existing(exitZone, true);
    this.physics.add.overlap(this.player, exitZone, () => this.leaveVillage());

    addCrispText(this, WORLD_WIDTH / 2, 40, 'Sortie du village ↑', {
      fontSize: '11px',
      color: '#9aa0a6',
    }).setOrigin(0.5);

    const actionButton = createTouchButton(this, this.scale.width - 34, this.scale.height - 56, 'Action', () =>
      this.handleAction(),
    );

    const save = await SaveManager.load();
    if (save?.character) {
      new CharacterSheetPanel(this, save.character, (open) => {
        this.joystick.setEnabled(!open);
        actionButton.input!.enabled = !open;
      });
    }
  }

  update(): void {
    updatePlayerMovement(this.player, this.cursors, this.joystick);
  }

  private addBuilding(x: number, y: number, w: number, h: number): void {
    const rect = this.add.rectangle(x, y, w, h, 0x5a4632).setStrokeStyle(1, 0x2e2419);
    this.physics.add.existing(rect, true);
    this.buildings.push(rect);
  }

  private drawGround(): void {
    if (!this.textures.exists('groundTile')) {
      const g = this.make.graphics({}, false);
      g.fillStyle(0x2d4a2d);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x326032);
      g.fillRect(0, 0, 16, 16);
      g.fillRect(16, 16, 16, 16);
      g.generateTexture('groundTile', 32, 32);
      g.destroy();
    }
    this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'groundTile').setOrigin(0, 0);
  }

  private handleAction(): void {
    const nearBuilding = this.buildings.find(
      (b) => Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y) < INTERACT_RADIUS,
    );
    this.showMessage(nearBuilding ? 'Une maison du village. Personne ne répond.' : 'Rien à proximité.');
  }

  private showMessage(message: string): void {
    this.messageText?.destroy();
    this.messageText = addCrispText(this, this.scale.width / 2, 30, message, {
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

    this.time.delayedCall(1800, () => {
      this.messageText?.destroy();
      this.messageText = undefined;
    });
  }

  private leaveVillage(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Field');
    });
  }
}
