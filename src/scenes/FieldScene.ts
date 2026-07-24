import Phaser from 'phaser';
import { VirtualJoystick } from '../input/VirtualJoystick';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';

const WORLD_WIDTH = 320;
const WORLD_HEIGHT = 240;

export class FieldScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private joystick!: VirtualJoystick;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;

  constructor() {
    super('Field');
  }

  create(): void {
    this.isTransitioning = false;
    this.cameras.main.setBackgroundColor('#3a5a3a');

    this.player = createPlayer(this, WORLD_WIDTH / 2, 40);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.joystick = new VirtualJoystick(this);

    const returnZone = this.add.zone(WORLD_WIDTH / 2, WORLD_HEIGHT - 10, WORLD_WIDTH, 20);
    this.physics.add.existing(returnZone, true);
    this.physics.add.overlap(this.player, returnZone, () => this.returnToVillage());

    this.add
      .text(WORLD_WIDTH / 2, 30, 'Chemin vers le monde\n(à venir)', {
        fontFamily: 'Georgia, serif',
        fontSize: '9px',
        color: '#e8d9b5',
        align: 'center',
      })
      .setOrigin(0.5);
  }

  update(): void {
    updatePlayerMovement(this.player, this.cursors, this.joystick);
  }

  private returnToVillage(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Village');
    });
  }
}
