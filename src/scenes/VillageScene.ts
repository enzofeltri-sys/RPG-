import Phaser from 'phaser';
import { VirtualJoystick } from '../input/VirtualJoystick';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { createTouchButton } from '../ui/TouchButton';
import { addSignpost } from '../ui/signpost';
import { addCrispText } from '../ui/text';

const WORLD_WIDTH = 480;
const WORLD_HEIGHT = 640;
const INTERACT_RADIUS = 60;

interface VillageData {
  x?: number;
  y?: number;
}

// Valombre — the full-service town (forge, marchande), reached by crossing
// the Champ from the player's home hamlet (Basse-Combe, HamletScene). No
// quest-giver or gathering here anymore (increment 9 world pass) — those
// live in the hamlet and the Champ respectively, so Valombre reads as a real
// town you travel to rather than the same small starting point.
export class VillageScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private joystick!: VirtualJoystick;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private buildings: Phaser.GameObjects.Rectangle[] = [];
  private isTransitioning = false;
  private messageText?: Phaser.GameObjects.Text;
  private merchantNpc!: Phaser.GameObjects.Rectangle;
  private forgeBuilding!: Phaser.GameObjects.Rectangle;
  private actionButton!: Phaser.GameObjects.Text;
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('Village');
  }

  init(data: VillageData): void {
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.buildings = [];
    this.drawGround();

    addCrispText(this, this.scale.width / 2, 12, 'Valombre', {
      fontSize: '11px',
      color: '#9aa0a6',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(500);

    this.addBuilding(120, 160, 70, 50);
    this.addBuilding(300, 210, 60, 60);
    this.forgeBuilding = this.addBuilding(190, 360, 90, 50);
    addCrispText(this, 190, 330, 'Forge', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);
    this.addBuilding(340, 460, 60, 70);

    this.merchantNpc = this.add.rectangle(300, 270, 14, 20, 0x7a3a5a).setStrokeStyle(1, 0x0b0c10);
    this.physics.add.existing(this.merchantNpc, true);
    addCrispText(this, 300, 250, 'Marchande', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 80);
    this.physics.add.collider(this.player, this.buildings);
    this.physics.add.collider(this.player, this.merchantNpc);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.joystick = new VirtualJoystick(this);

    const exitZone = this.add.zone(WORLD_WIDTH / 2, 20, WORLD_WIDTH, 24);
    this.physics.add.existing(exitZone, true);
    this.physics.add.overlap(this.player, exitZone, () => this.leaveVillage());

    addCrispText(this, WORLD_WIDTH / 2, 40, 'Vers la Grotte ↑', {
      fontSize: '11px',
      color: '#9aa0a6',
    }).setOrigin(0.5);

    // Second exit south — the "route commerciale" toward Aiglemont (région
    // 2, VISION.md). Well clear of every building (bottommost building ends
    // around y=495).
    const roadZone = this.add.zone(WORLD_WIDTH / 2, WORLD_HEIGHT - 10, WORLD_WIDTH, 20);
    this.physics.add.existing(roadZone, true);
    this.physics.add.overlap(this.player, roadZone, () => this.leaveToRoad());

    addCrispText(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 22, 'Route commerciale ↓', {
      fontSize: '10px',
      color: '#9aa0a6',
    }).setOrigin(0.5);

    addSignpost(this, 240, 300, ['↑ Grotte (vers Basse-Combe)', '↓ Route commerciale (vers Aiglemont)']);

    this.actionButton = createTouchButton(this, this.scale.width - 34, this.scale.height - 56, 'Action', () =>
      this.handleAction(),
    );

    // See ForestScene.create() for why this must bail if the scene was
    // stopped while the load was pending (a zone overlap can fire and start
    // a new scene mid-await).
    const save = await SaveManager.load();
    if (!this.scene.isActive()) return;

    if (save?.character) {
      new CharacterSheetPanel(
        this,
        save.character,
        'Village',
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
    const rect = this.add.rectangle(x, y, w, h, 0x5a4632).setStrokeStyle(1, 0x2e2419);
    this.physics.add.existing(rect, true);
    this.buildings.push(rect);
    return rect;
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

  private distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y);
  }

  private handleAction(): void {
    if (this.distanceTo(this.merchantNpc.x, this.merchantNpc.y) < INTERACT_RADIUS) {
      this.scene.start('Merchant', { x: this.player.x, y: this.player.y });
      return;
    }

    if (this.distanceTo(this.forgeBuilding.x, this.forgeBuilding.y) < INTERACT_RADIUS) {
      this.scene.start('Crafting', { x: this.player.x, y: this.player.y });
      return;
    }

    const nearBuilding = this.buildings.find((b) => this.distanceTo(b.x, b.y) < INTERACT_RADIUS);
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
      this.scene.start('Cave', { x: 100, y: 40 });
    });
  }

  private leaveToRoad(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Road', { x: 40, y: 110 });
    });
  }
}
