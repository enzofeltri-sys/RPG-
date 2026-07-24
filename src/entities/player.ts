import Phaser from 'phaser';
import { VirtualJoystick } from '../input/VirtualJoystick';

const SPEED = 70;

export type PlayerSprite = Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };

export function createPlayer(scene: Phaser.Scene, x: number, y: number): PlayerSprite {
  const player = scene.add
    .rectangle(x, y, 12, 16, 0xe8d9b5)
    .setStrokeStyle(1, 0x0b0c10) as PlayerSprite;
  scene.physics.add.existing(player);
  player.body.setCollideWorldBounds(true);
  player.body.setSize(12, 16);
  return player;
}

export function updatePlayerMovement(
  player: PlayerSprite,
  cursors: Phaser.Types.Input.Keyboard.CursorKeys,
  joystick: VirtualJoystick,
): void {
  const joy = joystick.getVector();
  let dx = joy.x;
  let dy = joy.y;

  if (dx === 0 && dy === 0) {
    if (cursors.left.isDown) dx = -1;
    else if (cursors.right.isDown) dx = 1;
    if (cursors.up.isDown) dy = -1;
    else if (cursors.down.isDown) dy = 1;
  }

  const length = Math.hypot(dx, dy);
  if (length > 1) {
    dx /= length;
    dy /= length;
  }

  player.body.setVelocity(dx * SPEED, dy * SPEED);
}
