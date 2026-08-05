import Phaser from 'phaser';
import { Race, CharClass } from '../game/character';
import { attachSpriteOverlay, syncSpriteOverlay } from './spriteOverlay';

export const SPEED = 70;
const ARRIVE_THRESHOLD = 4;
// Real art renders noticeably larger than the 12x16 collision box (kept
// unchanged so every existing zone/collider tuned against it still lines
// up) — this is purely the on-screen size of the overlaid appearance image.
const APPEARANCE_SIZE = 20;

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

// Overlays a real sprite on top of the (still physics-driving, now hidden)
// collision rectangle instead of replacing it — every scene's zones and
// colliders are tuned against the rectangle's 12x16 body, and swapping the
// GameObject type entirely would mean touching every call site that reads
// player.width/setFillStyle/etc. Race/class aren't known until the save
// loads deep into each scene's async create(), well after Phaser's own
// preload() has already run, so the texture is loaded here on demand
// rather than up front.
export async function setPlayerAppearance(scene: Phaser.Scene, player: PlayerSprite, race: Race, charClass: CharClass): Promise<void> {
  const key = `player-${race}_${charClass}`;
  const url = `${import.meta.env.BASE_URL}sprites/player/${race}_${charClass}.png`;
  await attachSpriteOverlay(scene, player, key, url, APPEARANCE_SIZE);
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
  syncSpriteOverlay(player);

  let dx = 0;
  let dy = 0;
  if (cursors.left.isDown) dx = -1;
  else if (cursors.right.isDown) dx = 1;
  if (cursors.up.isDown) dy = -1;
  else if (cursors.down.isDown) dy = 1;

  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy);
    player.body.setVelocity((dx / length) * SPEED, (dy / length) * SPEED);
    return false;
  }

  if (!moveTarget) {
    player.body.setVelocity(0, 0);
    return false;
  }

  const tx = moveTarget.x - player.x;
  const ty = moveTarget.y - player.y;
  const dist = Math.hypot(tx, ty);
  if (dist < ARRIVE_THRESHOLD) {
    player.body.setVelocity(0, 0);
    return false;
  }

  player.body.setVelocity((tx / dist) * SPEED, (ty / dist) * SPEED);
  return true;
}
