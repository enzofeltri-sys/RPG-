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
import { Pixmap, mix } from '../../src/art/pixmap';
import { PROP_SETTLE, TuftSpot, fringe, occlude, renderTuft, scatter, softenBase, strew, tuftsAround, vary, wear } from '../../src/art/settle';
import { encodePng } from './png';

type Item =
  | { kind: 'building'; type: BuildingKind; x: number; y: number; w: number; h: number }
  | { kind: 'prop'; type: PropKind; x: number; y: number; seed?: number }
  | { kind: 'fence'; x: number; y: number; len: number }
  | { kind: 'swall'; x: number; y: number; len: number }
  | { kind: 'bed'; x: number; y: number; w: number; h: number }
  | { kind: 'patch'; material: 'crop' | 'water' | 'planks' | 'marsh'; x: number; y: number; w: number; h: number }
  | { kind: 'wall'; x: number; y: number; w: number; h: number; niches?: boolean; face?: number }
  | { kind: 'gate'; x: number; y: number; w: number }
  | { kind: 'dprop'; type: DungeonPropKind; x: number; y: number }
  | { kind: 'person'; look: Look; x: number; y: number; view?: 'down' | 'left' | 'right' | 'up' };

interface Zone {
  ground: GroundSpec;
  items: Item[];
  hero: { x: number; y: number };
  // Dark places: ambient light (0..1); torches and the hero light around them.
  ambient?: number;
  // Wild flowers and tall grass spread over the open grass.
  meadow?: { n: number; seed: number };
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// Darkness with pools of light: warm around flames, violet around the
// runes, a softer neutral one around the hero. The falloff is smooth but
// quantized to a few steps with an ordered dither between them, like old
// games; unlit areas lean cold.
function light(map: Pixmap, zone: Zone): void {
  if (zone.ambient === undefined) return;
  const amb = zone.ambient;
  const lights: { x: number; y: number; r: number; tint: [number, number, number] }[] = [];
  zone.items.forEach((it) => {
    if (it.kind !== 'dprop') return;
    if (it.type === 'torch') lights.push({ x: it.x, y: it.y - 12, r: 82, tint: [1.22, 1.02, 0.8] });
    if (it.type === 'brazier') lights.push({ x: it.x, y: it.y - 14, r: 84, tint: [1.25, 1.0, 0.76] });
    if (it.type === 'candles') lights.push({ x: it.x, y: it.y - 8, r: 36, tint: [1.18, 1.02, 0.84] });
    if (it.type === 'runes') lights.push({ x: it.x, y: it.y, r: 46, tint: [1.05, 0.88, 1.3] });
  });
  lights.push({ x: zone.hero.x, y: zone.hero.y, r: 58, tint: [1, 1, 1.04] });
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      let level = amb;
      let tr = 0.88;
      let tg = 0.94;
      let tb = 1.12; // cold shadows
      let best = 0;
      const dith = BAYER[(y % 4) * 4 + (x % 4)] / 16;
      for (const l of lights) {
        const d = Math.hypot(x - l.x, (y - l.y) * 1.1) / l.r;
        if (d >= 1) continue;
        const k = Math.pow(1 - d, 1.4);
        const q = Math.min(1, Math.floor(k * 6 + dith) / 6);
        const lv = amb + (1 - amb) * q;
        if (lv > level) level = lv;
        if (q > best) {
          best = q;
          tr = 0.88 + (l.tint[0] - 0.88) * Math.min(1, q * 1.6);
          tg = 0.94 + (l.tint[1] - 0.94) * Math.min(1, q * 1.6);
          tb = 1.12 + (l.tint[2] - 1.12) * Math.min(1, q * 1.6);
        }
      }
      const o = (y * map.w + x) * 4;
      map.data[o] = Math.min(255, map.data[o] * level * tr);
      map.data[o + 1] = Math.min(255, map.data[o + 1] * level * tg);
      map.data[o + 2] = Math.min(255, map.data[o + 2] * level * tb);
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
      { kind: 'rect', material: 'crop', x: 68, y: 250, w: 58, h: 34 },
      { kind: 'ellipse', material: 'dirt', x: 206, y: 226, w: 168, h: 98 },
      { kind: 'ellipse', material: 'cobble', x: 236, y: 250, w: 104, h: 54 },
      { kind: 'ellipse', material: 'flagstone', x: 206, y: 524, w: 68, h: 50 },
    ],
  },
  items: [
    { kind: 'building', type: 'cottage', x: 120, y: 160, w: 70, h: 50 },
    { kind: 'building', type: 'stone_house', x: 300, y: 210, w: 60, h: 60 },
    { kind: 'building', type: 'blacksmith_shop', x: 190, y: 360, w: 90, h: 50 },
    { kind: 'building', type: 'inn_building', x: 340, y: 460, w: 60, h: 70 },
    // North-west grove: an old tree with a bush and a mushroom at its foot.
    { kind: 'prop', type: 'big_tree', x: 26, y: 84, seed: 1 },
    { kind: 'prop', type: 'tree', x: 62, y: 60, seed: 5 },
    { kind: 'prop', type: 'bush', x: 40, y: 92, seed: 1 },
    { kind: 'prop', type: 'mushroom', x: 12, y: 96 },
    { kind: 'prop', type: 'stump', x: 84, y: 98, seed: 2 },
    // North-east grove.
    { kind: 'prop', type: 'big_tree', x: 452, y: 98, seed: 2 },
    { kind: 'prop', type: 'tree', x: 420, y: 70, seed: 7 },
    { kind: 'prop', type: 'berry_bush', x: 434, y: 110, seed: 2 },
    { kind: 'prop', type: 'rock_small', x: 470, y: 120, seed: 4 },
    // West pines.
    { kind: 'prop', type: 'pine', x: 18, y: 214, seed: 6 },
    { kind: 'prop', type: 'pine', x: 38, y: 196, seed: 4 },
    { kind: 'prop', type: 'bush', x: 48, y: 222, seed: 9 },
    // East: a tree by the field wall, pines at the edge with a boulder.
    { kind: 'prop', type: 'tree', x: 432, y: 330, seed: 3 },
    { kind: 'prop', type: 'flower_bush', x: 446, y: 338, seed: 4 },
    { kind: 'prop', type: 'pine', x: 462, y: 404, seed: 5 },
    { kind: 'prop', type: 'pine', x: 444, y: 420, seed: 8 },
    { kind: 'prop', type: 'boulder_large', x: 448, y: 520, seed: 3 },
    { kind: 'prop', type: 'rock_small', x: 466, y: 530, seed: 6 },
    // South-west corner.
    { kind: 'prop', type: 'tree', x: 26, y: 604, seed: 6 },
    { kind: 'prop', type: 'bush', x: 46, y: 614, seed: 3 },
    { kind: 'prop', type: 'log', x: 84, y: 566, seed: 2 },
    { kind: 'prop', type: 'stump', x: 410, y: 602, seed: 4 },
    // The cottage: a vegetable garden with its scarecrow, hay, firewood
    // stacked against the wall, a flower bed by the door.
    { kind: 'fence', x: 97, y: 252, len: 62 },
    { kind: 'prop', type: 'scarecrow', x: 124, y: 280, seed: 1 },
    { kind: 'prop', type: 'haystack', x: 54, y: 300, seed: 2 },
    { kind: 'prop', type: 'apple_tree', x: 160, y: 300, seed: 8 },
    { kind: 'prop', type: 'woodpile', x: 160, y: 186 },
    { kind: 'bed', x: 102, y: 196, w: 24, h: 9 },
    { kind: 'bed', x: 318, y: 252, w: 18, h: 7 },
    { kind: 'bed', x: 360, y: 503, w: 16, h: 7 },
    { kind: 'prop', type: 'lamppost', x: 214, y: 186 },
    // The stone house: a barrel and a crate by the wall, flowers at the corner.
    { kind: 'prop', type: 'barrel', x: 278, y: 242 },
    { kind: 'prop', type: 'crate', x: 268, y: 246 },
    { kind: 'prop', type: 'flower_bush', x: 334, y: 244, seed: 6 },
    // The square.
    { kind: 'prop', type: 'market_stall', x: 260, y: 306, seed: 1 },
    { kind: 'prop', type: 'market_stall', x: 346, y: 266, seed: 3 },
    { kind: 'prop', type: 'sacks', x: 364, y: 272 },
    { kind: 'prop', type: 'bench', x: 214, y: 286 },
    // The smithy: a water trough and spare wood.
    { kind: 'prop', type: 'trough', x: 136, y: 392 },
    { kind: 'prop', type: 'barrel', x: 228, y: 390 },
    { kind: 'prop', type: 'wagon_cart', x: 300, y: 404, seed: 2 },
    // The inn: barrels and a crate by the wall, a bench at the door.
    { kind: 'prop', type: 'barrel', x: 376, y: 496 },
    { kind: 'prop', type: 'barrel', x: 385, y: 500 },
    { kind: 'prop', type: 'crate', x: 394, y: 494 },
    { kind: 'prop', type: 'bench', x: 318, y: 506 },
    { kind: 'prop', type: 'lamppost', x: 222, y: 448 },
    // The well, the field wall, the signpost at the north road.
    { kind: 'prop', type: 'well', x: 240, y: 560, seed: 1 },
    { kind: 'swall', x: 392, y: 182, len: 56 },
    { kind: 'prop', type: 'signpost', x: 262, y: 34 },
    npc('merchant_generic', 300, 270),
    npc('villager_wanderer', 70, 270, 'right'),
    npc('villager_wanderer', 400, 150, 'left'),
    npc('brasque_merchant', 60, 470),
    npc('guard_generic', 100, 340),
  ],
  meadow: { n: 34, seed: 3 },
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
      // The processional aisle, widening into the Guardian's hall.
      { kind: 'rect', material: 'aisle', x: 90, y: 0, w: 40, h: 620 },
      { kind: 'rect', material: 'aisle', x: 46, y: 26, w: 128, h: 92 },
      { kind: 'ellipse', material: 'water', x: 150, y: 342, w: 18, h: 8 },
    ],
  },
  items: [
    // Side walls seen from above, the back wall of the hall with niches.
    { kind: 'wall', x: 5, y: 310, w: 10, h: 620, face: 0 },
    { kind: 'wall', x: 215, y: 310, w: 10, h: 620, face: 0 },
    { kind: 'wall', x: 110, y: 10, w: 220, h: 20, niches: true, face: 16 },
    // The scene's wall blocks become piers full of burial niches.
    { kind: 'wall', x: 20, y: 560, w: 30, h: 60, niches: true },
    { kind: 'wall', x: 200, y: 460, w: 30, h: 80, niches: true },
    { kind: 'wall', x: 20, y: 360, w: 30, h: 60, niches: true },
    { kind: 'wall', x: 200, y: 260, w: 30, h: 60, niches: true },
    { kind: 'wall', x: 20, y: 140, w: 30, h: 60, niches: true },
    { kind: 'gate', x: 110, y: 220, w: 220 },
    // Torches on the piers and on the back wall.
    { kind: 'dprop', type: 'torch', x: 20, y: 586 },
    { kind: 'dprop', type: 'torch', x: 200, y: 496 },
    { kind: 'dprop', type: 'torch', x: 20, y: 386 },
    { kind: 'dprop', type: 'torch', x: 200, y: 286 },
    { kind: 'dprop', type: 'torch', x: 20, y: 166 },
    // The Guardian's hall: a rune circle between two braziers.
    { kind: 'dprop', type: 'runes', x: 110, y: 72 },
    { kind: 'dprop', type: 'brazier', x: 62, y: 76 },
    { kind: 'dprop', type: 'brazier', x: 158, y: 76 },
    { kind: 'dprop', type: 'pillar', x: 52, y: 120 },
    { kind: 'dprop', type: 'pillar', x: 168, y: 120 },
    { kind: 'dprop', type: 'skulls', x: 30, y: 30 },
    { kind: 'dprop', type: 'skulls', x: 192, y: 32 },
    // Pillars along the aisle.
    { kind: 'dprop', type: 'pillar', x: 76, y: 470 },
    { kind: 'dprop', type: 'pillar', x: 144, y: 470 },
    { kind: 'dprop', type: 'pillar', x: 76, y: 330 },
    { kind: 'dprop', type: 'pillar', x: 144, y: 330 },
    // Tombs with candles and scattered bones.
    { kind: 'dprop', type: 'sarcophagus', x: 40, y: 470 },
    { kind: 'dprop', type: 'candles', x: 52, y: 480 },
    { kind: 'dprop', type: 'bones', x: 30, y: 492 },
    { kind: 'dprop', type: 'sarcophagus', x: 182, y: 380 },
    { kind: 'dprop', type: 'candles', x: 168, y: 388 },
    { kind: 'dprop', type: 'sarcophagus', x: 184, y: 590 },
    { kind: 'dprop', type: 'candles', x: 194, y: 602 },
    // Bone heaps at the foot of the piers, urns, rubble, cobwebs.
    { kind: 'dprop', type: 'skulls', x: 28, y: 600 },
    { kind: 'dprop', type: 'skulls', x: 194, y: 510 },
    { kind: 'dprop', type: 'bones', x: 46, y: 400 },
    { kind: 'dprop', type: 'bones', x: 168, y: 300 },
    { kind: 'dprop', type: 'urn', x: 186, y: 420 },
    { kind: 'dprop', type: 'urn', x: 194, y: 426 },
    { kind: 'dprop', type: 'urn', x: 36, y: 186 },
    { kind: 'dprop', type: 'rubble', x: 44, y: 256 },
    { kind: 'dprop', type: 'rubble', x: 176, y: 540 },
    { kind: 'dprop', type: 'rubble', x: 180, y: 160 },
    { kind: 'dprop', type: 'cobweb', x: 10, y: 22 },
    { kind: 'dprop', type: 'cobweb', x: 10, y: 392 },
    { kind: 'dprop', type: 'cobweb', x: 10, y: 592 },
    { kind: 'prop', type: 'treasure_chest_closed', x: 160, y: 590 },
    { kind: 'prop', type: 'mushroom', x: 20, y: 610 },
  ],
  hero: { x: 110, y: 480 },
  ambient: 0.42,
};

const isGrass = (map: Pixmap, x: number, y: number): boolean => {
  const c = map.get(x, y);
  return !!c && c[1] > c[0] + 20 && c[1] > c[2] + 30;
};

function drawZone(zone: Zone, heroLookValue: Look): Pixmap {
  const map = renderGround(zone.ground);
  const draws: { y: number; draw: () => void }[] = [];
  const tufts: TuftSpot[] = [];
  const blit = (pm: Pixmap, x: number, y: number) => map.blit(pm, Math.round(x), Math.round(y));
  const items = [...zone.items];
  // Meadow: flowers and tall grass where there is open grass, away from
  // everything else, spread naturally rather than on a grid.
  if (zone.meadow) {
    // Keep clear of buildings (and the space in front of them) and props.
    const blocked = (px: number, py: number) =>
      items.some((it) => {
        if (it.kind === 'building') return px > it.x - it.w / 2 - 10 && px < it.x + it.w / 2 + 10 && py > it.y - it.h / 2 - 10 && py < it.y + it.h / 2 + 22;
        if (it.kind === 'fence' || it.kind === 'swall') return px > it.x - it.len / 2 - 6 && px < it.x + it.len / 2 + 6 && Math.abs(py - it.y) < 12;
        if (it.kind === 'patch' || it.kind === 'bed') return Math.abs(px - it.x) < it.w / 2 + 8 && Math.abs(py - it.y) < it.h / 2 + 8;
        return 'x' in it && Math.hypot(it.x - px, it.y - py) < 20;
      });
    const pts = scatter(4, 8, zone.ground.w - 8, zone.ground.h - 12, zone.meadow.n, 22, zone.meadow.seed, (px, py) => !isGrass(map, Math.round(px), Math.round(py)) || !isGrass(map, Math.round(px) + 6, Math.round(py)) || blocked(px, py));
    pts.forEach(([px, py], i) => items.push({ kind: 'prop', type: i % 3 === 0 ? 'tall_grass' : 'flowers', x: px, y: py, seed: i + 1 }));
  }
  items.forEach((it, idx) => {
    if (it.kind === 'building') {
      const art = renderBuilding(it.type, it.w, it.h);
      const bottom = it.y + it.h / 2;
      const ox = it.x - art.anchorX;
      // Settle: shade along the foot of the walls, worn earth at the door,
      // tufts along the walls (not in the doorway).
      occlude(map, Math.round(ox + art.wallX0), Math.round(ox + art.wallX1), Math.round(bottom + 1), 3, 0.4);
      if (art.doorX !== undefined) wear(map, ox + art.doorX, bottom + 6, 10, 6, idx + 3);
      else wear(map, it.x, bottom + 5, it.w * 0.45, 6, idx + 3);
      const skip: [number, number] | undefined = art.doorX !== undefined ? [ox + art.doorX - 9, ox + art.doorX + 9] : [ox + art.wallX0 + 4, ox + art.wallX1 - 4];
      tufts.push(...fringe(Math.round(ox + art.wallX0), Math.round(ox + art.wallX1), Math.round(bottom), idx * 7 + 1, skip, 0.8));
      const pm = softenBase(art.pm, art.anchorY + 1);
      draws.push({ y: bottom, draw: () => blit(pm, ox, bottom - art.anchorY) });
    } else if (it.kind === 'prop') {
      const seed = it.seed ?? idx + 1;
      const art = renderProp(it.type, seed);
      const st = PROP_SETTLE[it.type] ?? {};
      if (st.wear) wear(map, it.x, it.y - st.wear[1] * 0.2, st.wear[0], st.wear[1], idx + 11, st.wear[2]);
      if (st.strew) strew(map, it.x, it.y, st.strew[0], st.strew[1], st.strew[2], st.strew[3], idx + 13);
      if (st.tufts) tufts.push(...tuftsAround(it.x, it.y, st.tufts[0], idx * 5 + seed, st.tufts[1]));
      const pm = softenBase(st.vary ? vary(art.pm, seed * 31 + idx) : art.pm, art.anchorY);
      draws.push({ y: it.y, draw: () => blit(pm, it.x - art.anchorX, it.y - art.anchorY) });
    } else if (it.kind === 'wall') {
      const art = renderWallBlock(it.w, it.h, { niches: it.niches, face: it.face, seed: 61 + idx });
      const bottom = it.y + it.h / 2;
      const x0 = Math.round(it.x - art.anchorX);
      if (it.face === 0) {
        // A wall seen side-on: shade the floor along its inner edge.
        const inner = it.x < zone.ground.w / 2 ? x0 + it.w : x0 - 1;
        const dir = it.x < zone.ground.w / 2 ? 1 : -1;
        for (let j = 0; j < 8; j++) for (let y = Math.max(0, Math.round(it.y - it.h / 2)); y < Math.min(map.h, bottom); y++) {
          const c = map.get(inner + j * dir, y);
          if (c) map.set(inner + j * dir, y, mix(c, [16, 12, 20], 0.5 * (1 - j / 8)));
        }
        draws.push({ y: -500, draw: () => blit(art.pm, x0, bottom - art.anchorY) });
      } else {
        occlude(map, x0, x0 + it.w - 1, Math.round(bottom + 1), 5, 0.55);
        strew(map, it.x, bottom + 3, it.w / 2 + 2, 3, [[70, 64, 70], [104, 96, 100], [52, 46, 54]], Math.round(it.w / 2), idx);
        draws.push({ y: bottom, draw: () => blit(art.pm, x0, bottom - art.anchorY) });
      }
    } else if (it.kind === 'gate') {
      const art = renderGate(it.w);
      const bottom = it.y + 8;
      draws.push({ y: bottom, draw: () => blit(art.pm, it.x - art.anchorX, bottom - art.anchorY) });
    } else if (it.kind === 'dprop') {
      const art = renderDungeonProp(it.type);
      // Cobwebs and torches hang on walls: drawn above the floor props.
      const order = it.type === 'cobweb' || it.type === 'torch' ? it.y + 1000 : it.type === 'runes' ? -900 : it.y;
      if (it.type === 'sarcophagus' || it.type === 'pillar' || it.type === 'urn') occlude(map, Math.round(it.x - art.anchorX + 1), Math.round(it.x - art.anchorX + art.pm.w - 3), Math.round(it.y + 1), 3, 0.4);
      draws.push({ y: order, draw: () => blit(art.pm, it.x - art.anchorX, it.y - art.anchorY) });
    } else if (it.kind === 'fence' || it.kind === 'swall') {
      const art = it.kind === 'fence' ? renderFence(it.len) : renderStoneWall(it.len, idx);
      const x0 = it.x - art.anchorX;
      occlude(map, Math.round(x0), Math.round(x0 + it.len - 1), Math.round(it.y + 1), 2, 0.3);
      if (it.kind === 'fence') for (let px = 1; px < it.len - 1; px += 8) tufts.push(...tuftsAround(x0 + px + 1, it.y, 2, idx * 3 + px, 1));
      else tufts.push(...fringe(Math.round(x0), Math.round(x0 + it.len - 1), it.y, idx, undefined, 0.6));
      draws.push({ y: it.y, draw: () => blit(art.pm, x0, it.y - art.anchorY) });
    } else if (it.kind === 'bed') {
      // Flower beds stand on their base line like props, tufts around them.
      const art = renderFlowerBed(it.w, it.h, idx);
      tufts.push(...tuftsAround(it.x, it.y, it.w / 2, idx * 9, Math.round(it.w / 8)));
      const pm = softenBase(art.pm, art.anchorY);
      draws.push({ y: it.y, draw: () => blit(pm, it.x - art.anchorX, it.y - art.anchorY) });
    } else if (it.kind === 'patch') {
      const art = renderPatch(it.material, it.w, it.h);
      draws.push({ y: -1000 + it.y, draw: () => blit(art.pm, it.x - art.anchorX, it.y - art.anchorY) });
    } else {
      draws.push({ y: it.y + 8, draw: () => drawPerson(map, it.look, it.x, it.y, it.view ?? 'down') });
    }
  });
  // Tufts only grow on grass, and sit just in front of what they hide.
  tufts.forEach((t) => {
    if (!isGrass(map, t.x, t.y)) return;
    const art = renderTuft(t.seed, t.tall);
    draws.push({ y: t.y + 0.5, draw: () => blit(art.pm, t.x - art.anchorX, t.y - art.anchorY) });
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
