import Phaser from 'phaser';
import { Character } from '../game/character';
import { syncSpriteOverlay } from './spriteOverlay';
import { HERO_FEET_Y, HERO_FRAME_H, ensureHeroAnimations, heroTextures, idleFrame } from './heroSprite';

export const SPEED = 70;
const ARRIVE_THRESHOLD = 4;
// Real art renders noticeably larger than the 12x16 collision box (kept
// unchanged so every existing zone/collider tuned against it still lines
// up) — this is purely the on-screen size of the overlaid appearance image.
// Sized up from an initial 20px: most source portraits are 56px+ natively,
// so displaying much smaller than that throws away detail the generation
// actually has instead of it being a resolution ceiling.

export type PlayerSprite = Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };

export interface MoveTarget {
  x: number;
  y: number;
}

export function createPlayer(scene: Phaser.Scene, x: number, y: number): PlayerSprite {
  const player = scene.add
    .rectangle(x, y, 12, 16, 0xe8d9b5)
    .setStrokeStyle(1, 0x0b0c10) as PlayerSprite;
  scene.physics.add.existing(player);
  player.body.setCollideWorldBounds(true);
  player.body.setSize(12, 16);
  return player;
}

// Overlays an animated sprite on top of the (still physics-driving, now
// hidden) collision rectangle instead of replacing it — every scene's zones
// and colliders are tuned against the rectangle's 12x16 body. The hero wears exactly what is equipped (see art/heroLook.ts); its sheet
// is drawn by the game on the spot, so this is synchronous.
export function setPlayerAppearance(scene: Phaser.Scene, player: PlayerSprite, character: Character): void {
  const { sheet } = heroTextures(scene, character);
  ensureHeroAnimations(scene, sheet);
  const existing = player.getData('appearanceImage') as Phaser.GameObjects.GameObject | undefined;
  existing?.destroy();
  // Drawn at the world's pixel size (no scaling), feet on the bottom of the
  // 12x16 collision box every zone is tuned against.
  const sprite = scene.add
    .sprite(player.x, player.y, sheet, idleFrame('down'))
    .setOrigin(0.5, (HERO_FEET_Y - player.height / 2) / HERO_FRAME_H)
    .setDepth(player.y);
  // A soft shadow under the feet grounds the hero on any floor.
  (player.getData('shadow') as Phaser.GameObjects.Ellipse | undefined)?.destroy();
  const shadow = scene.add.ellipse(player.x, player.y + player.height / 2, 14, 5, 0x221c29, 0.35).setDepth(player.y - 1);
  player.setData('shadow', shadow);
  player.setData('appearanceImage', sprite);
  player.setData('heroSheet', sheet);
  player.setData('facing', 'down');
  player.setVisible(false);
}

// Keyboard (still supported as a desktop fallback) always overrides an
// in-flight tap target. Returns whether the player is still travelling
// toward moveTarget — false means "arrived" (or no target/keyboard took
// over), the caller's own tap controller should clear its target then.
export function updatePlayerMovement(
  player: PlayerSprite,
  cursors: Phaser.Types.Input.Keyboard.CursorKeys,
  moveTarget: MoveTarget | null,
): boolean {
  let dx = 0;
  let dy = 0;
  if (cursors.left.isDown) dx = -1;
  else if (cursors.right.isDown) dx = 1;
  if (cursors.up.isDown) dy = -1;
  else if (cursors.down.isDown) dy = 1;

  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy);
    player.body.setVelocity((dx / length) * SPEED, (dy / length) * SPEED);
    syncSpriteOverlay(player, true);
    return false;
  }

  if (!moveTarget) {
    player.body.setVelocity(0, 0);
    syncSpriteOverlay(player, false);
    return false;
  }

  const tx = moveTarget.x - player.x;
  const ty = moveTarget.y - player.y;
  const dist = Math.hypot(tx, ty);
  if (dist < ARRIVE_THRESHOLD) {
    player.body.setVelocity(0, 0);
    syncSpriteOverlay(player, false);
    return false;
  }

  player.body.setVelocity((tx / dist) * SPEED, (ty / dist) * SPEED);
  syncSpriteOverlay(player, true);
  return true;
}
