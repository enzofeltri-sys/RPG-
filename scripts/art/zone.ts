// Renders a zone mockup with the world art drawn by the game (ground,
// buildings, props, people), at the zone's real coordinates, for design
// reviews: the whole map at 1x, and what the phone shows around the hero
// at 3x.
//
// Usage: npm run zone -- <out-prefix>

import { writeFileSync } from 'fs';
import { createCharacter } from '../../src/game/character';
import { DOLL_FEET_Y, DOLL_H, DOLL_W, Look, renderFrame } from '../../src/art/heroDoll';
import { heroLook } from '../../src/art/heroLook';
import { NPC_LOOKS } from '../../src/art/npcLooks';
import { GroundSpec, renderGround } from '../../src/art/ground';
import { BuildingKind, renderBuilding, renderGate, renderWallBlock } from '../../src/art/buildings';
import { DungeonPropKind, PropKind, renderDungeonProp, renderFence, renderFlowerBed, renderPatch, renderProp, renderStoneWall } from '../../src/art/props';
import { Pixmap } from '../../src/art/pixmap';
import { encodePng } from './png';

type Item =
  | { kind: 'building'; type: BuildingKind; x: number; y: number; w: number; h: number }
  | { kind: 'prop'; type: PropKind; x: number; y: number; seed?: number }
  | { kind: 'fence'; x: number; y: number; len: number }
  | { kind: 'swall'; x: number; y: number; len: number }
  | { kind: 'bed'; x: number; y: number; w: number; h: number }
  | { kind: 'patch'; material: 'crop' | 'water' | 'planks' | 'marsh'; x: number; y: number; w: number; h: number }
  | { kind: 'wall'; x: number; y: number; w: number; h: number }
  | { kind: 'gate'; x: number; y: number; w: number }
  | { kind: 'dprop'; type: DungeonPropKind; x: number; y: number }
  | { kind: 'person'; look: Look; x: number; y: number; view?: 'down' | 'left' | 'right' | 'up' };

interface Zone {
  ground: GroundSpec;
  items: Item[];
  hero: { x: number; y: number };
  // Dark places: ambient light (0..1); torches and the hero light around them.
  ambient?: number;
}

// Darkness with warm light pools (torches) and a softer one around the hero.
function light(map: Pixmap, zone: Zone): void {
  if (zone.ambient === undefined) return;
  const lights: [number, number, number, boolean][] = zone.items
    .filter((it): it is Extract<Item, { kind: 'dprop' }> => it.kind === 'dprop' && (it.type === 'torch' || it.type === 'brazier'))
    .map((it) => [it.x, it.y - 12, it.type === 'brazier' ? 80 : 70, true]);
  lights.push([zone.hero.x, zone.hero.y, 56, false]);
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      let level = zone.ambient;
      let warm = 0;
      lights.forEach(([lx, ly, r, isWarm]) => {
        const d = Math.hypot(x - lx, y - ly) / r;
        if (d >= 1) return;
        // Banded falloff, like light in old games: a few distinct steps.
        const k = Math.ceil((1 - d) * 4) / 4;
        level = Math.max(level, zone.ambient! + (1 - zone.ambient!) * k);
        if (isWarm) warm = Math.max(warm, k);
      });
      const o = (y * map.w + x) * 4;
      map.data[o] = Math.min(255, map.data[o] * level * (1 + warm * 0.18));
      map.data[o + 1] = map.data[o + 1] * level * (1 + warm * 0.04);
      map.data[o + 2] = map.data[o + 2] * level * (1 - warm * 0.12);
    }
  }
}

const npc = (id: string, x: number, y: number, view: 'down' | 'left' | 'right' | 'up' = 'down'): Item => ({ kind: 'person', look: NPC_LOOKS[id], x, y, view });

// Valombre, from VillageScene's layout (buildings, NPCs, exits), plus the
// paths and small decor a village needs.
const VALOMBRE: Zone = {
  ground: {
    w: 480,
    h: 640,
    base: 'grass',
    seed: 7,
    shapes: [
      { kind: 'path', material: 'dirt', width: 22, points: [[240, 0], [236, 180], [244, 320], [238, 470], [240, 640]] },
      { kind: 'path', material: 'dirt', width: 12, points: [[120, 192], [180, 200], [236, 196]] },
      { kind: 'path', material: 'dirt', width: 12, points: [[190, 392], [238, 396]] },
      { kind: 'path', material: 'dirt', width: 12, points: [[340, 502], [240, 508]] },
      { kind: 'path', material: 'dirt', width: 10, points: [[110, 346], [238, 346]] },
      { kind: 'path', material: 'dirt', width: 10, points: [[64, 478], [150, 470], [238, 460]] },
      { kind: 'path', material: 'dirt', width: 10, points: [[240, 580], [330, 586], [420, 590], [430, 640]] },
      { kind: 'ellipse', material: 'dirt', x: 206, y: 226, w: 168, h: 98 },
      { kind: 'ellipse', material: 'cobble', x: 236, y: 250, w: 104, h: 54 },
      { kind: 'ellipse', material: 'flagstone', x: 214, y: 530, w: 52, h: 38 },
    ],
  },
  items: [
    { kind: 'building', type: 'cottage', x: 120, y: 160, w: 70, h: 50 },
    { kind: 'building', type: 'stone_house', x: 300, y: 210, w: 60, h: 60 },
    { kind: 'building', type: 'blacksmith_shop', x: 190, y: 360, w: 90, h: 50 },
    { kind: 'building', type: 'inn_building', x: 340, y: 460, w: 60, h: 70 },
    { kind: 'prop', type: 'big_tree', x: 20, y: 76, seed: 1 },
    { kind: 'prop', type: 'big_tree', x: 448, y: 104, seed: 2 },
    { kind: 'prop', type: 'tree', x: 430, y: 332, seed: 3 },
    { kind: 'prop', type: 'pine', x: 30, y: 200, seed: 4 },
    { kind: 'prop', type: 'pine', x: 456, y: 410, seed: 5 },
    { kind: 'prop', type: 'tree', x: 28, y: 600, seed: 6 },
    { kind: 'prop', type: 'bush', x: 200, y: 136, seed: 1 },
    { kind: 'prop', type: 'berry_bush', x: 60, y: 404, seed: 2 },
    { kind: 'prop', type: 'bush', x: 380, y: 546, seed: 3 },
    { kind: 'prop', type: 'market_stall', x: 260, y: 306 },
    { kind: 'prop', type: 'market_stall', x: 340, y: 256 },
    { kind: 'prop', type: 'well', x: 240, y: 560 },
    { kind: 'prop', type: 'barrel', x: 378, y: 486 },
    { kind: 'prop', type: 'barrel', x: 388, y: 492 },
    { kind: 'prop', type: 'crate', x: 244, y: 382 },
    { kind: 'prop', type: 'lamppost', x: 262, y: 150 },
    { kind: 'prop', type: 'lamppost', x: 218, y: 440 },
    { kind: 'prop', type: 'stump', x: 410, y: 600 },
    { kind: 'prop', type: 'rock_small', x: 150, y: 560, seed: 4 },
    { kind: 'fence', x: 120, y: 214, len: 40 },
    // Small rural decor (no collision): gardens, hay, benches, flowers.
    { kind: 'patch', material: 'crop', x: 96, y: 262, w: 60, h: 36 },
    { kind: 'fence', x: 96, y: 238, len: 64 },
    { kind: 'swall', x: 380, y: 178, len: 48 },
    { kind: 'bed', x: 104, y: 196, w: 22, h: 10 },
    { kind: 'prop', type: 'apple_tree', x: 150, y: 296, seed: 8 },
    { kind: 'prop', type: 'haystack', x: 60, y: 312, seed: 2 },
    { kind: 'prop', type: 'scarecrow', x: 126, y: 276, seed: 1 },
    { kind: 'prop', type: 'woodpile', x: 160, y: 196 },
    { kind: 'prop', type: 'bench', x: 278, y: 340 },
    { kind: 'prop', type: 'trough', x: 140, y: 392 },
    { kind: 'prop', type: 'sacks', x: 322, y: 290 },
    { kind: 'prop', type: 'signpost', x: 264, y: 30 },
    { kind: 'prop', type: 'wagon_cart', x: 300, y: 400, seed: 2 },
    { kind: 'prop', type: 'flower_bush', x: 372, y: 236, seed: 4 },
    { kind: 'prop', type: 'boulder_large', x: 450, y: 520, seed: 3 },
    { kind: 'prop', type: 'log', x: 80, y: 560, seed: 2 },
    { kind: 'prop', type: 'flowers', x: 180, y: 104, seed: 1 },
    { kind: 'prop', type: 'flowers', x: 320, y: 120, seed: 2 },
    { kind: 'prop', type: 'flowers', x: 110, y: 430, seed: 3 },
    { kind: 'prop', type: 'flowers', x: 400, y: 380, seed: 4 },
    { kind: 'prop', type: 'flowers', x: 300, y: 620, seed: 5 },
    { kind: 'prop', type: 'tall_grass', x: 70, y: 140, seed: 1 },
    { kind: 'prop', type: 'tall_grass', x: 420, y: 250, seed: 2 },
    { kind: 'prop', type: 'tall_grass', x: 360, y: 610, seed: 3 },
    { kind: 'prop', type: 'tall_grass', x: 130, y: 620, seed: 4 },
    { kind: 'prop', type: 'tall_grass', x: 200, y: 600, seed: 5 },
    { kind: 'prop', type: 'mushroom', x: 40, y: 110 },
    npc('merchant_generic', 300, 270),
    npc('villager_wanderer', 50, 280, 'right'),
    npc('villager_wanderer', 400, 150, 'left'),
    npc('brasque_merchant', 60, 470),
    npc('guard_generic', 100, 340),
  ],
  hero: { x: 240, y: 420 },
};


// The Catacombs of Aiglemont, from CatacombsScene's layout (walls, gate,
// chest), with the torches, tombs and bones a crypt needs.
const CATACOMBS: Zone = {
  ground: {
    w: 220,
    h: 620,
    base: 'stonefloor',
    seed: 11,
    shapes: [
      { kind: 'path', material: 'flagstone', width: 44, points: [[110, 0], [110, 620]] },
      { kind: 'ellipse', material: 'water', x: 150, y: 330, w: 26, h: 12 },
    ],
  },
  items: [
    { kind: 'wall', x: 20, y: 560, w: 30, h: 60 },
    { kind: 'wall', x: 200, y: 460, w: 30, h: 80 },
    { kind: 'wall', x: 20, y: 360, w: 30, h: 60 },
    { kind: 'wall', x: 200, y: 260, w: 30, h: 60 },
    { kind: 'wall', x: 20, y: 140, w: 30, h: 60 },
    { kind: 'gate', x: 110, y: 220, w: 220 },
    { kind: 'prop', type: 'treasure_chest_closed', x: 170, y: 586 },
    { kind: 'dprop', type: 'torch', x: 20, y: 548 },
    { kind: 'dprop', type: 'torch', x: 200, y: 446 },
    { kind: 'dprop', type: 'torch', x: 20, y: 348 },
    { kind: 'dprop', type: 'torch', x: 200, y: 248 },
    { kind: 'dprop', type: 'sarcophagus', x: 186, y: 560 },
    { kind: 'dprop', type: 'sarcophagus', x: 46, y: 470 },
    { kind: 'dprop', type: 'sarcophagus', x: 180, y: 330 },
    { kind: 'dprop', type: 'bones', x: 60, y: 520 },
    { kind: 'dprop', type: 'bones', x: 160, y: 400 },
    { kind: 'dprop', type: 'bones', x: 70, y: 290 },
    { kind: 'dprop', type: 'cobweb', x: 0, y: 0 },
    { kind: 'dprop', type: 'cobweb', x: 0, y: 228 },
    { kind: 'dprop', type: 'pillar', x: 70, y: 420 },
    { kind: 'dprop', type: 'pillar', x: 150, y: 420 },
    { kind: 'dprop', type: 'pillar', x: 70, y: 610 },
    { kind: 'dprop', type: 'brazier', x: 110, y: 300 },
    { kind: 'dprop', type: 'urn', x: 180, y: 500 },
    { kind: 'dprop', type: 'urn', x: 40, y: 400 },
    { kind: 'dprop', type: 'rubble', x: 150, y: 270 },
    { kind: 'dprop', type: 'rubble', x: 60, y: 580 },
    { kind: 'prop', type: 'rock_small', x: 150, y: 600, seed: 2 },
    { kind: 'prop', type: 'mushroom', x: 40, y: 600 },
  ],
  hero: { x: 110, y: 480 },
  ambient: 0.38,
};

function drawZone(zone: Zone, heroLookValue: Look): Pixmap {
  const map = renderGround(zone.ground);
  const draws: { y: number; draw: () => void }[] = [];
  zone.items.forEach((it) => {
    if (it.kind === 'building') {
      const art = renderBuilding(it.type, it.w, it.h);
      const bottom = it.y + it.h / 2;
      draws.push({ y: bottom, draw: () => map.blit(art.pm, Math.round(it.x - art.anchorX), Math.round(bottom - art.anchorY)) });
    } else if (it.kind === 'prop') {
      const art = renderProp(it.type, it.seed);
      draws.push({ y: it.y, draw: () => map.blit(art.pm, Math.round(it.x - art.anchorX), Math.round(it.y - art.anchorY)) });
    } else if (it.kind === 'wall') {
      const art = renderWallBlock(it.w, it.h);
      const bottom = it.y + it.h / 2;
      draws.push({ y: bottom, draw: () => map.blit(art.pm, Math.round(it.x - art.anchorX), Math.round(bottom - art.anchorY)) });
    } else if (it.kind === 'gate') {
      const art = renderGate(it.w);
      const bottom = it.y + 8;
      draws.push({ y: bottom, draw: () => map.blit(art.pm, Math.round(it.x - art.anchorX), Math.round(bottom - art.anchorY)) });
    } else if (it.kind === 'dprop') {
      const art = renderDungeonProp(it.type);
      // Cobwebs and torches hang on walls: drawn above the floor props.
      const order = it.type === 'cobweb' || it.type === 'torch' ? it.y + 1000 : it.y;
      draws.push({ y: order, draw: () => map.blit(art.pm, Math.round(it.x - art.anchorX), Math.round(it.y - art.anchorY)) });
    } else if (it.kind === 'fence' || it.kind === 'swall') {
      const art = it.kind === 'fence' ? renderFence(it.len) : renderStoneWall(it.len);
      draws.push({ y: it.y, draw: () => map.blit(art.pm, Math.round(it.x - art.anchorX), Math.round(it.y - art.anchorY)) });
    } else if (it.kind === 'bed' || it.kind === 'patch') {
      const art = it.kind === 'bed' ? renderFlowerBed(it.w, it.h) : renderPatch(it.material, it.w, it.h);
      draws.push({ y: -1000 + it.y, draw: () => map.blit(art.pm, Math.round(it.x - art.anchorX), Math.round(it.y - art.anchorY)) });
    } else {
      draws.push({ y: it.y + 8, draw: () => drawPerson(map, it.look, it.x, it.y, it.view ?? 'down') });
    }
  });
  draws.push({ y: zone.hero.y + 8, draw: () => drawPerson(map, heroLookValue, zone.hero.x, zone.hero.y, 'down') });
  draws.sort((a, b) => a.y - b.y).forEach((d) => d.draw());
  light(map, zone);
  return map;
}

// A character standing at (x, y), the center of its 12x16 collision box.
function drawPerson(map: Pixmap, look: Look, x: number, y: number, view: 'down' | 'left' | 'right' | 'up'): void {
  const shadow = new Pixmap(14, 5);
  shadow.ellipse(0, 0, 14, 5, () => [34, 28, 41]);
  for (let i = 3; i < shadow.data.length; i += 4) if (shadow.data[i]) shadow.data[i] = 90;
  map.blit(shadow, Math.round(x - 7), Math.round(y + 8 - 2));
  const frame = new Pixmap(DOLL_W, DOLL_H);
  frame.data.set(renderFrame(look, view, 0));
  map.blit(frame, Math.round(x - DOLL_W / 2), Math.round(y + 8 - DOLL_FEET_Y));
}

function scaled(src: Pixmap, x0: number, y0: number, w: number, h: number, z: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * z * h * z * 4);
  for (let y = 0; y < h * z; y++) {
    for (let x = 0; x < w * z; x++) {
      const sx = x0 + Math.floor(x / z);
      const sy = y0 + Math.floor(y / z);
      const s = (sy * src.w + sx) * 4;
      out.set(src.data.subarray(s, s + 4), (y * w * z + x) * 4);
    }
  }
  return out;
}

const prefix = process.argv[2] ?? 'zone';
const hero = heroLook(createCharacter('human', 'warrior'));
const zones: [string, Zone][] = [
  ['valombre', VALOMBRE],
  ['catacombes', CATACOMBS],
];
zones.forEach(([name, zone]) => {
  const map = drawZone(zone, hero);
  writeFileSync(`${prefix}_${name}_map.png`, encodePng(map.w, map.h, map.data));
  // The phone view: 216x384 around the hero, at 2x.
  const vw = Math.min(216, map.w);
  const vx = Math.max(0, Math.min(map.w - vw, zone.hero.x - 108));
  const vy = Math.max(0, Math.min(map.h - 384, zone.hero.y - 192));
  writeFileSync(`${prefix}_${name}_view.png`, encodePng(vw * 2, 384 * 2, scaled(map, vx, vy, vw, 384, 2)));
});
console.log('ok');
