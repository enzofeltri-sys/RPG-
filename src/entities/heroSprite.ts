import Phaser from 'phaser';
import { Character } from '../game/character';
import { DOLL_FEET_Y, DOLL_H, DOLL_W, FACE_H, FACE_W, Look, SHEET_COLUMNS, SHEET_H, SHEET_VIEWS, SHEET_W, renderFace, renderSheet } from '../art/heroDoll';
import { heroLook, lookKey } from '../art/heroLook';

// The playable hero as it is dressed right now: its sheet (4 columns:
// stepA, idle, stepB, breathe x 4 rows: down, left, right, up, 24x32 frames
// at the world's pixel size) and its 32x26 portrait are drawn by the game
// from the equipped items (art/heroDoll.ts, art/heroLook.ts). Identical
// outfits share their textures; a new item gives a new texture.

export type Facing = 'down' | 'left' | 'right' | 'up';

const ROWS: Record<Facing, number> = { down: 0, left: 1, right: 2, up: 3 };
const COLUMNS = SHEET_COLUMNS.length;
export const HERO_FRAME_W = DOLL_W;
export const HERO_FRAME_H = DOLL_H;
// Bottom row of the feet inside a frame.
export const HERO_FEET_Y = DOLL_FEET_Y;

export interface HeroTextures {
  sheet: string;
  face: string;
}

function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, pixels: Uint8ClampedArray): Phaser.Textures.CanvasTexture {
  const texture = scene.textures.createCanvas(key, w, h)!;
  texture.context.putImageData(new ImageData(new Uint8ClampedArray(pixels), w, h), 0, 0);
  texture.refresh();
  return texture;
}

// Draws (once) the sheet and portrait of a look; returns their texture keys.
export function lookTextures(scene: Phaser.Scene, look: Look): HeroTextures {
  const id = lookKey(look);
  const sheet = `hero-${id}`;
  const face = `hero-face-${id}`;
  if (!scene.textures.exists(sheet)) {
    const texture = canvasTexture(scene, sheet, SHEET_W, SHEET_H, renderSheet(look));
    SHEET_VIEWS.forEach((_, row) => {
      SHEET_COLUMNS.forEach((__, col) => {
        texture.add(row * COLUMNS + col, 0, col * DOLL_W, row * DOLL_H, DOLL_W, DOLL_H);
      });
    });
  }
  if (!scene.textures.exists(face)) canvasTexture(scene, face, FACE_W, FACE_H, renderFace(look));
  return { sheet, face };
}

// The hero as currently equipped.
export function heroTextures(scene: Phaser.Scene, character: Pick<Character, 'race' | 'class' | 'equipment'>): HeroTextures {
  return lookTextures(scene, heroLook(character));
}

export function idleFrame(facing: Facing): number {
  return ROWS[facing] * COLUMNS + 1;
}

// Per facing: the walk (stepA, idle, stepB, idle) and a slow breathing
// loop for standing still (idle, breathe). Registered once per sheet.
export function ensureHeroAnimations(scene: Phaser.Scene, sheet: string): void {
  (Object.keys(ROWS) as Facing[]).forEach((facing) => {
    const row = ROWS[facing] * COLUMNS;
    if (!scene.anims.exists(`${sheet}-walk-${facing}`)) {
      scene.anims.create({
        key: `${sheet}-walk-${facing}`,
        frames: [row, row + 1, row + 2, row + 1].map((frame) => ({ key: sheet, frame })),
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!scene.anims.exists(`${sheet}-idle-${facing}`)) {
      scene.anims.create({
        key: `${sheet}-idle-${facing}`,
        frames: [
          { key: sheet, frame: row + 1, duration: 900 },
          { key: sheet, frame: row + 3, duration: 600 },
        ],
        repeat: -1,
      });
    }
  });
}

// Facing from a velocity; keeps the previous facing while standing still.
export function facingFrom(vx: number, vy: number, previous: Facing): Facing {
  if (Math.abs(vx) < 1 && Math.abs(vy) < 1) return previous;
  if (Math.abs(vx) > Math.abs(vy)) return vx < 0 ? 'left' : 'right';
  return vy < 0 ? 'up' : 'down';
}
