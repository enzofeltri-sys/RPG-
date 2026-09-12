import Phaser from 'phaser';

// Both sheets are Kenney CC0 packs (see asset/kenney_*.zip): 16x16 tiles with
// a 1px spacing and no margin, loaded as a Phaser spritesheet so a single
// frame index can be repeated via a TileSprite. Frame indices below were
// found by decoding the pack's own sample Tiled map (roguelike-rpg-pack)
// and, for the dungeon pack (no sample map), by visual inspection of the
// sheet — in both cases picked for being seamlessly tileable at 16x16.
const RPG_SHEET_KEY = 'tiles-rpg';
const RPG_SHEET_URL = `${import.meta.env.BASE_URL}tiles/roguelike-rpg.png`;
const GRASS_FRAME = 62;
const DIRT_FRAME = 6;
const PLAZA_FRAME = 120;

const DUNGEON_SHEET_KEY = 'tiles-dungeon';
const DUNGEON_SHEET_URL = `${import.meta.env.BASE_URL}tiles/roguelike-dungeon.png`;
const STONE_FLOOR_FRAME = 307;

async function loadSpritesheet(scene: Phaser.Scene, key: string, url: string): Promise<void> {
  if (scene.textures.exists(key)) return;
  await new Promise<void>((resolve) => {
    scene.load.spritesheet(key, url, { frameWidth: 16, frameHeight: 16, spacing: 1 });
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

export function addGrassGround(
  scene: Phaser.Scene,
  width: number,
  height: number,
): Promise<Phaser.GameObjects.TileSprite | undefined> {
  return addTiledGround(scene, width, height, RPG_SHEET_KEY, RPG_SHEET_URL, GRASS_FRAME);
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
