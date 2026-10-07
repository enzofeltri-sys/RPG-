import Phaser from 'phaser';
import { CharClass, Race } from '../game/character';

// The playable heroes drawn by tools/art/heroes.py (build_heroes.py): one
// sheet per race/class of 24x32 frames, 4 columns (stepA, idle, stepB,
// breathe) x 4 rows (down, left, right, up), at the world's pixel size; plus
// a 32x26 portrait for the interface.

export type Facing = 'down' | 'left' | 'right' | 'up';

const ROWS: Record<Facing, number> = { down: 0, left: 1, right: 2, up: 3 };
const COLUMNS = 4;
export const HERO_FRAME_W = 24;
export const HERO_FRAME_H = 32;
// Bottom row of the boots inside a frame (feet stand on the body's bottom).
export const HERO_FEET_Y = 30;

export function heroSheetKey(race: Race, charClass: CharClass): string {
  return `hero-${race}_${charClass}`;
}

export function heroFaceKey(race: Race, charClass: CharClass): string {
  return `hero-face-${race}_${charClass}`;
}

export function idleFrame(facing: Facing): number {
  return ROWS[facing] * COLUMNS + 1;
}

// Loads the sheet and portrait (once; textures are shared by every scene).
export function preloadHero(scene: Phaser.Scene, race: Race, charClass: CharClass): void {
  const base = `${import.meta.env.BASE_URL}sprites/heroes/${race}_${charClass}`;
  const sheet = heroSheetKey(race, charClass);
  if (!scene.textures.exists(sheet)) {
    scene.load.spritesheet(sheet, `${base}.png`, { frameWidth: HERO_FRAME_W, frameHeight: HERO_FRAME_H });
  }
  const face = heroFaceKey(race, charClass);
  if (!scene.textures.exists(face)) scene.load.image(face, `${base}_face.png`);
}

// Same, for scenes that only learn the race/class after loading the save.
export async function loadHero(scene: Phaser.Scene, race: Race, charClass: CharClass): Promise<void> {
  if (scene.textures.exists(heroSheetKey(race, charClass)) && scene.textures.exists(heroFaceKey(race, charClass))) return;
  await new Promise<void>((resolve) => {
    preloadHero(scene, race, charClass);
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
    scene.load.start();
  });
}

// Per facing: the walk (stepA, idle, stepB, idle) and a slow breathing
// loop for standing still (idle, breathe). Registered once per sheet.
export function ensureHeroAnimations(scene: Phaser.Scene, race: Race, charClass: CharClass): void {
  const sheet = heroSheetKey(race, charClass);
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
