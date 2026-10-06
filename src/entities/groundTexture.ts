import Phaser from 'phaser';

// Both sheets are Kenney CC0 packs (see asset/kenney_*.zip): 16x16 tiles with
// a 1px spacing and no margin, loaded as a Phaser spritesheet so a single
// frame index can be repeated via a TileSprite. Frame indices below were
// found by decoding the pack's own sample Tiled map (roguelike-rpg-pack)
// and, for the dungeon pack (no sample map), by visual inspection of the
// sheet — in both cases picked for being seamlessly tileable at 16x16.
const RPG_SHEET_KEY = 'tiles-rpg';
const RPG_SHEET_URL = `${import.meta.env.BASE_URL}tiles/roguelike-rpg.png`;
const DIRT_FRAME = 6;
const PLAZA_FRAME = 120;

const DUNGEON_SHEET_KEY = 'tiles-dungeon';
const DUNGEON_SHEET_URL = `${import.meta.env.BASE_URL}tiles/roguelike-dungeon.png`;
const STONE_FLOOR_FRAME = 307;

// Pipoya RPG Tileset 32x32 (see asset/tilesets/Pipoya RPG Tileset 32x32.zip).
// Unlike the Kenney sheets above, this isn't loaded as a spritesheet: Pipoya
// ships its ground tiles as RPG Maker "autotile" sheets (a grid of edge/corner
// variants for auto-tiling, not one tile per frame), so picking a frame index
// the way GRASS_FRAME/DIRT_FRAME do above doesn't apply. Instead, the one
// fully-interior (no transparency) block was found by scanning
// [A]_type3/[A]Grass1_pipo.png's 8x6 grid of 32x32 blocks for the single one
// with no transparent pixels — at column 6, row 1 — cropped out ahead of time
// into a standalone, already-seamless PNG.
//
// Lives under public/tiles/ (with the Kenney sheets), not public/game-assets/
// — the latter is excluded from the PWA precache (see vite.config.ts) since
// it's a staging area for raw extracted packs, most of which aren't wired
// into any scene. This one is, so it needs to actually be cached offline.
const PIPOYA_GRASS_KEY = 'tiles-pipoya-grass';
const PIPOYA_GRASS_URL = `${import.meta.env.BASE_URL}tiles/pipoya-ground-grass.png`;

async function loadSpritesheet(scene: Phaser.Scene, key: string, url: string): Promise<void> {
  if (scene.textures.exists(key)) return;
  await new Promise<void>((resolve) => {
    scene.load.spritesheet(key, url, { frameWidth: 16, frameHeight: 16, spacing: 1 });
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
    scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve());
    scene.load.start();
  });
}

async function loadImage(scene: Phaser.Scene, key: string, url: string): Promise<void> {
  if (scene.textures.exists(key)) return;
  await new Promise<void>((resolve) => {
    scene.load.image(key, url);
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
    scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve());
    scene.load.start();
  });
}

async function addTiledGround(
  scene: Phaser.Scene,
  width: number,
  height: number,
  sheetKey: string,
  sheetUrl: string,
  frame: number,
): Promise<Phaser.GameObjects.TileSprite | undefined> {
  await loadSpritesheet(scene, sheetKey, sheetUrl);
  if (!scene.scene.isActive() || !scene.textures.exists(sheetKey)) return undefined;
  // Depth pinned below everything else so callers can fire-and-forget this
  // (no need to await it before adding buildings/decor/the player) without
  // the tile layer popping in on top of them once its async load resolves.
  return scene.add.tileSprite(0, 0, width, height, sheetKey, frame).setOrigin(0, 0).setDepth(-1000);
}

export async function addGrassGround(
  scene: Phaser.Scene,
  width: number,
  height: number,
): Promise<Phaser.GameObjects.TileSprite | undefined> {
  await loadImage(scene, PIPOYA_GRASS_KEY, PIPOYA_GRASS_URL);
  if (!scene.scene.isActive() || !scene.textures.exists(PIPOYA_GRASS_KEY)) return undefined;
  return scene.add.tileSprite(0, 0, width, height, PIPOYA_GRASS_KEY).setOrigin(0, 0).setDepth(-1000);
}

export function addStoneFloor(
  scene: Phaser.Scene,
  width: number,
  height: number,
): Promise<Phaser.GameObjects.TileSprite | undefined> {
  return addTiledGround(scene, width, height, DUNGEON_SHEET_KEY, DUNGEON_SHEET_URL, STONE_FLOOR_FRAME);
}

export function addDirtGround(
  scene: Phaser.Scene,
  width: number,
  height: number,
): Promise<Phaser.GameObjects.TileSprite | undefined> {
  return addTiledGround(scene, width, height, RPG_SHEET_KEY, RPG_SHEET_URL, DIRT_FRAME);
}

export function addPlazaGround(
  scene: Phaser.Scene,
  width: number,
  height: number,
): Promise<Phaser.GameObjects.TileSprite | undefined> {
  return addTiledGround(scene, width, height, RPG_SHEET_KEY, RPG_SHEET_URL, PLAZA_FRAME);
}
