import Phaser from 'phaser';
import { BuildingKind } from '../art/buildings';
import { AnimalFrame, deer, sheep } from '../art/critters';
import { NPC_LOOKS } from '../art/npcLooks';
import { Pixmap, hash2 } from '../art/pixmap';
import { PatchKind, PropKind, renderPatch } from '../art/props';
import { buildingArt, propArt } from './zonePlan';
import { HERO_FEET_Y, HERO_FRAME_H, ensureHeroAnimations, idleFrame, lookTextures } from '../entities/heroSprite';

// Phaser side of the world art drawn by the game (art/buildings.ts,
// art/props.ts, art/npcLooks.ts): turns pictures into textures (drawn once
// per session, shared by every scene) and places them with the depth rule
// every moving thing already follows — a character's depth is the center
// of its 12x16 box, 8px above its feet, so anything standing on the
// ground at y gets depth y - 8.

export const FEET_TO_DEPTH = 8;

export function pixmapTexture(scene: Phaser.Scene, key: string, pm: Pixmap): string {
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, pm.w, pm.h)!;
    texture.context.putImageData(new ImageData(new Uint8ClampedArray(pm.data), pm.w, pm.h), 0, 0);
    texture.refresh();
  }
  return key;
}

// A building standing on its footprint (center x, y, size w x h).
export function placeBuilding(scene: Phaser.Scene, kind: BuildingKind, x: number, y: number, w: number, h: number): Phaser.GameObjects.Image {
  const art = buildingArt(kind, w, h);
  const key = pixmapTexture(scene, `bld-${kind}-${w}x${h}`, art.pm);
  const bottom = y + h / 2;
  return scene.add
    .image(Math.round(x - art.anchorX), Math.round(bottom - art.anchorY), key)
    .setOrigin(0, 0)
    .setDepth(bottom - FEET_TO_DEPTH)
    .setData('static', true);
}

export function placeProp(scene: Phaser.Scene, kind: PropKind, x: number, y: number, seed: number): Phaser.GameObjects.Image {
  const art = propArt(kind, seed);
  const key = pixmapTexture(scene, `prop-${kind}-${seed}`, art.pm);
  return scene.add
    .image(Math.round(x - art.anchorX), Math.round(y - art.anchorY), key)
    .setOrigin(0, 0)
    .setDepth(y - FEET_TO_DEPTH)
    .setData('static', true);
}

// A person of the world on the paper doll, standing (breathing) or walking
// when its box moves (see syncSpriteOverlay).
export function npcSprite(scene: Phaser.Scene, id: string, target: Phaser.GameObjects.Shape): Phaser.GameObjects.Sprite | undefined {
  const look = NPC_LOOKS[id];
  if (!look) return undefined;
  const { sheet } = lookTextures(scene, look);
  ensureHeroAnimations(scene, sheet);
  const sprite = scene.add
    .sprite(target.x, target.y, sheet, idleFrame('down'))
    .setOrigin(0.5, (HERO_FEET_Y - target.height / 2) / HERO_FRAME_H)
    .setDepth(target.y);
  sprite.anims.play(`${sheet}-idle-down`, true);
  // Not everyone breathes in step.
  sprite.anims.setProgress(hash2(Math.round(target.x), Math.round(target.y), 3));
  const shadow = scene.add.ellipse(target.x, target.y + target.height / 2, 14, 5, 0x221c29, 0.35).setDepth(target.y - 1);
  target.setData('shadow', shadow);
  target.setData('heroSheet', sheet);
  target.setData('facing', 'down');
  return sprite;
}

// Animals that wander (entities/wanderer.ts): a frame per stride and a
// head-down pose, flipped to face the way they go (see syncSpriteOverlay).
const ANIMALS: Record<string, (f: AnimalFrame) => Pixmap> = { sheep, deer };

export function animalTexture(scene: Phaser.Scene, name: string, frame: AnimalFrame): string {
  return pixmapTexture(scene, `animal-${name}-${frame}`, ANIMALS[name](frame));
}

function animalSprite(scene: Phaser.Scene, name: string, target: Phaser.GameObjects.Shape): Phaser.GameObjects.Image {
  (['a', 'b', 'graze'] as const).forEach((f) => animalTexture(scene, name, f));
  const bottom = target.y + target.height / 2;
  const image = scene.add.image(target.x, bottom, `animal-${name}-a`).setOrigin(0.5, 1).setDepth(target.y);
  const shadow = scene.add.ellipse(target.x, bottom, image.width - 2, 4, 0x221c29, 0.3).setDepth(target.y - 1);
  target.setData('shadow', shadow);
  target.setData('animal', name);
  return image;
}

// Old decor sprite keys mapped to the art drawn by the game.
const DECOR_PROPS: Record<string, PropKind> = {
  tree: 'tree',
  pipoya_tree: 'tree',
  bush: 'bush',
  pipoya_bush: 'bush',
  rock_small: 'rock_small',
  pipoya_rock: 'rock_small',
  boulder_large: 'boulder_large',
  mushroom: 'mushroom',
  crystal_glow: 'crystal_glow',
  treasure_chest_closed: 'treasure_chest_closed',
  treasure_chest_open: 'treasure_chest_open',
  market_stall: 'market_stall',
  merchant_stall: 'merchant_stall',
  well: 'well',
  wagon_cart: 'wagon_cart',
  scarecrow: 'scarecrow',
  signpost: 'signpost',
};

const DECOR_BUILDINGS: Record<string, BuildingKind> = {
  cottage: 'cottage',
  village_house: 'village_house',
  stone_house: 'stone_house',
  inn_building: 'inn_building',
  blacksmith_shop: 'blacksmith_shop',
  blacksmith_forge: 'blacksmith_shop',
  guard_barracks: 'guard_barracks',
  market_hall: 'market_hall',
  stone_tower: 'stone_tower',
};

const DECOR_PATCHES: Record<string, PatchKind> = {
  farm_field: 'crop',
  water_murky: 'marsh',
  lava_pool: 'lava',
  boardwalk_planks: 'planks',
};

// Used by attachSpriteOverlay: when an overlay key names something the game
// now draws itself, build that instead of loading the old picture. Returns
// the display object, or undefined to fall back to the picture.
export function drawnOverlay(scene: Phaser.Scene, target: Phaser.GameObjects.Shape, textureKey: string): Phaser.GameObjects.GameObject | undefined {
  const [prefix, ...rest] = textureKey.split('-');
  const name = rest.join('-');
  if (prefix === 'npc' && ANIMALS[name]) return animalSprite(scene, name, target);
  if (prefix === 'npc') return npcSprite(scene, name, target);
  if (prefix !== 'decor') return undefined;
  const seed = 1 + Math.floor(hash2(Math.round(target.x), Math.round(target.y), 17) * 997);
  const bottom = target.y + target.height / 2;
  const building = DECOR_BUILDINGS[name];
  if (building) return placeBuilding(scene, building, target.x, target.y, Math.round(target.width), Math.round(target.height));
  const prop = DECOR_PROPS[name];
  if (prop) return placeProp(scene, prop, target.x, bottom, seed);
  const patch = DECOR_PATCHES[name];
  if (patch) {
    const w = Math.round(target.width);
    const h = Math.round(target.height);
    const key = pixmapTexture(scene, `patch-${patch}-${w}x${h}`, renderPatch(patch, w, h).pm);
    return scene.add.image(target.x, target.y, key).setDepth(-900).setData('static', true);
  }
  return undefined;
}
