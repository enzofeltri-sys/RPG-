// The pure part of a zone's look (no Phaser): what a zone is made of
// (types), how its pieces settle into the ground (the ground job), and the
// fixed light of dark zones. Shared by the game (world/zoneArt.ts) and the
// mockup scripts.

import { BuildingArt, BuildingKind, GateKind, WallStyle, renderBuilding } from '../art/buildings';
import { GroundSpec } from '../art/ground';
import { Blocker, GroundJob, GroundOp } from '../art/groundJob';
import { Pixmap, RGB } from '../art/pixmap';
import { DungeonPropKind, PatchKind, PropArt, PropKind, renderDungeonProp, renderProp } from '../art/props';
import { PROP_SETTLE, TuftSpot, fringe, softenBase, tuftsAround, vary } from '../art/settle';
import type { AmbienceSpec, Walker } from './ambience';

const buildingArts = new Map<string, BuildingArt>();

export function buildingArt(kind: BuildingKind, w: number, h: number): BuildingArt {
  const key = `${kind}-${w}x${h}`;
  let art = buildingArts.get(key);
  if (!art) {
    art = renderBuilding(kind, w, h);
    art = { ...art, pm: softenBase(art.pm, art.anchorY + 1) };
    buildingArts.set(key, art);
  }
  return art;
}

const propArts = new Map<string, PropArt>();

// A prop's picture for one copy: its own seed (shape) and, for living or
// natural things, its own tint, with a soft foot.
export function propArt(kind: PropKind, seed: number): PropArt {
  const key = `${kind}-${seed}`;
  let art = propArts.get(key);
  if (!art) {
    art = renderProp(kind, seed);
    const pm = PROP_SETTLE[kind]?.vary ? vary(art.pm, seed * 31 + 7) : art.pm;
    art = { ...art, pm: softenBase(pm, art.anchorY) };
    propArts.set(key, art);
  }
  return art;
}

export interface BuildingSpot {
  kind: BuildingKind;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PropSpot {
  kind: PropKind;
  x: number; // where it stands on the ground
  y: number;
  seed?: number;
}

export interface ZoneArt<B extends string = string> {
  key: string;
  ground: GroundSpec;
  buildings?: Record<B, BuildingSpot>;
  props?: PropSpot[];
  // Wooden fences; a vertical one runs north-south, len long, centered on
  // (x, y).
  fences?: { x: number; y: number; len: number; vertical?: boolean }[];
  stoneWalls?: { x: number; y: number; len: number }[];
  palisades?: { x: number; y: number; len: number }[];
  beds?: { x: number; y: number; w: number; h: number }[];
  // Plank bridges (deck's top-left corner and size), flat under walkers.
  bridges?: { x: number; y: number; w: number; h: number }[];
  meadow?: { n: number; seed: number };
  // Dungeon pieces (walls with burial niches, torches, tombs…).
  walls?: { x: number; y: number; w: number; h: number; niches?: boolean; face?: number; style?: WallStyle; solid?: boolean }[];
  ironFences?: { x: number; y: number; len: number }[];
  dprops?: { kind: DungeonPropKind; x: number; y: number }[];
  // Dark places: ambient light (0..1) and fixed lights; the hero carries a
  // small light of his own.
  dark?: { ambient: number; lights?: ZoneLight[]; shade?: [number, number, number] };
  // Flat patches laid on the ground (a lava vent, a field of crops…).
  patches?: { material: PatchKind; x: number; y: number; w: number; h: number }[];
  // Invisible obstacles the zone itself adds (water, a fountain's basin):
  // center and size, like the scenes' collision boxes.
  solids?: { x: number; y: number; w: number; h: number }[];
  // A closed room smaller than the screen: no ground around it, only the
  // dark.
  enclosed?: boolean;
  // The zone's small life (world/ambience.ts): what it gets beyond what its
  // ground, decor and light already bring, and people walking about.
  ambience?: AmbienceSpec;
  walkers?: Walker[];
  // Zones to draw ahead of time while this one is shown (next door).
  next?: string[];
  // Mockups only (scripts/art/zoneart.ts): who stands where, as in the scene.
  preview?: { hero: [number, number]; npcs?: [string, number, number][]; gate?: [GateKind, number, number, number] };
}

export interface ZoneLight {
  x: number;
  y: number;
  r: number;
  kind: 'fire' | 'magic' | 'cold';
}

const STRAW_BITS: RGB[] = [
  [232, 200, 120],
  [206, 166, 86],
  [176, 136, 70],
];
const CHIPS: RGB[] = [
  [214, 176, 120],
  [170, 124, 80],
  [120, 86, 60],
];
const STREW: Partial<Record<PropKind, [number, number, RGB[], number]>> = {
  haystack: [17, 6, STRAW_BITS, 40],
  wagon_cart: [20, 6, STRAW_BITS, 22],
  scarecrow: [7, 3, STRAW_BITS, 6],
  woodpile: [14, 5, CHIPS, 18],
};

const DUST: RGB[] = [
  [70, 64, 70],
  [104, 96, 100],
  [52, 46, 54],
];

// Dungeon props lying flat on the floor (drawn under everyone) or hung on
// a wall (just in front of the wall face); the rest stand on their feet
// (only those get a soft contact shadow at the foot).
const FLAT_DPROPS = new Set<DungeonPropKind>(['runes', 'puddle', 'vein', 'ember']);
const HUNG_DPROPS = new Set<DungeonPropKind>(['torch', 'cobweb', 'chains']);
export function dpropOffGround(kind: DungeonPropKind): boolean {
  return FLAT_DPROPS.has(kind) || kind === 'cobweb' || kind === 'chains';
}
export function dpropDepth(kind: DungeonPropKind, y: number): number {
  return FLAT_DPROPS.has(kind) ? -900 : HUNG_DPROPS.has(kind) ? y + 12 : y - 8;
}

const dpropArts = new Map<DungeonPropKind, ReturnType<typeof renderDungeonProp>>();
export function dpropArt(kind: DungeonPropKind): ReturnType<typeof renderDungeonProp> {
  let a = dpropArts.get(kind);
  if (!a) {
    a = renderDungeonProp(kind);
    dpropArts.set(kind, a);
  }
  return a;
}

// ----------------------------------------------------------- collision

// What can be walked over (grass, flowers, small stones, things lying
// flat) and what stops people at its foot.
const WALK_OVER = new Set<PropKind>([
  'tall_grass', 'flowers', 'rock_small', 'mushroom', 'fern', 'reeds', 'herb_patch', 'rowboat',
  'crystal_glow', 'treasure_chest_closed', 'treasure_chest_open', 'signpost',
]);
const SOLID_DPROPS = new Set<DungeonPropKind>([
  'sarcophagus', 'pillar', 'brazier', 'urn', 'bookshelf', 'lectern', 'statue', 'table', 'round_table',
  'bed', 'hearth', 'dining_table', 'counter', 'loom', 'pots', 'cat_basket',
]);

// Half-width of what touches the ground: the widest opaque run in the few
// rows just above the anchor.
export function footRadius(pm: Pixmap, anchorY: number): number {
  let best = 0;
  for (let y = Math.max(0, anchorY - 3); y <= Math.min(pm.h - 1, anchorY); y++) {
    let x0 = -1;
    let x1 = -1;
    for (let x = 0; x < pm.w; x++) {
      if (pm.data[(y * pm.w + x) * 4 + 3] !== 255) continue;
      if (x0 < 0) x0 = x;
      x1 = x;
    }
    if (x0 >= 0) best = Math.max(best, (x1 - x0 + 1) / 2);
  }
  return Math.max(2, best);
}

export interface Obstacle {
  x: number; // center
  y: number;
  w: number;
  h: number;
}

// A box at the foot of a thing standing at (x, y): a little narrower than
// what touches the ground, a few pixels deep, so people brush past the
// edges of a canopy but not through a trunk.
function footBox(pm: Pixmap, anchorY: number, x: number, y: number): Obstacle {
  const w = Math.max(4, Math.min(44, Math.round(footRadius(pm, anchorY) * 2 * 0.8)));
  const h = Math.max(3, Math.min(10, Math.round(w * 0.4)));
  return { x, y: y - h / 2 + 1, w, h };
}

// Everything in a zone that people can't walk through, besides its walls
// and buildings: decor at its foot, fences, dry-stone walls, palisades.
export function obstacles(art: ZoneArt): Obstacle[] {
  const out: Obstacle[] = [];
  (art.props ?? []).forEach((p, idx) => {
    if (WALK_OVER.has(p.kind)) return;
    const a = propArt(p.kind, p.seed ?? idx + 1);
    out.push(footBox(a.pm, a.anchorY, p.x, p.y));
  });
  (art.dprops ?? []).forEach((d) => {
    if (!SOLID_DPROPS.has(d.kind)) return;
    const a = dpropArt(d.kind);
    out.push(footBox(a.pm, a.anchorY, d.x, d.y));
  });
  (art.fences ?? []).forEach((f) => out.push(f.vertical ? { x: f.x, y: f.y, w: 4, h: f.len } : { x: f.x, y: f.y - 2, w: f.len, h: 4 }));
  (art.ironFences ?? []).forEach((f) => out.push({ x: f.x, y: f.y - 2, w: f.len, h: 4 }));
  (art.stoneWalls ?? []).forEach((f) => out.push({ x: f.x, y: f.y - 3, w: f.len, h: 6 }));
  (art.palisades ?? []).forEach((f) => out.push({ x: f.x, y: f.y - 4, w: f.len, h: 8 }));
  return out;
}

// --------------------------------------------------------------- layout

// Everything about a zone that does not need the ground to exist: the
// ground job (with what settles into it) and the grass tufts to try.
// Ground painted around a zone for screens bigger than it: the game is
// 216 wide (zones are at least that) and up to 520 tall.
export function zoneMargin(art: ZoneArt): [number, number] {
  if (art.enclosed) return [0, 0];
  return [8, Math.max(8, Math.ceil((520 - art.ground.h) / 2) + 4)];
}

// Trodden earth only shows on soft ground (not on a paved town).
const SOFT = new Set(['grass', 'forest', 'dirt', 'sand', 'marsh', 'blight', 'cave', 'mud']);

// Where the posts of a north-south fence stand (their feet, top to bottom).
export function fencePosts(f: { y: number; len: number }): number[] {
  const n = Math.max(1, Math.round(f.len / 8));
  const y0 = Math.round(f.y - f.len / 2);
  return Array.from({ length: n + 1 }, (_, i) => y0 + Math.round((i * f.len) / n));
}

export function plan(art: ZoneArt): GroundJob {
  const ops: GroundOp[] = [];
  const soft = SOFT.has(art.ground.base);
  const tufts: TuftSpot[] = [];
  const blockers: Blocker[] = [];
  Object.values<BuildingSpot>(art.buildings ?? {}).forEach((b, idx) => {
    const a = buildingArt(b.kind, b.w, b.h);
    const bottom = b.y + b.h / 2;
    const ox = b.x - a.anchorX;
    ops.push({ op: 'occlude', x0: Math.round(ox + a.wallX0), x1: Math.round(ox + a.wallX1), y: Math.round(bottom + 1), depth: 3, strength: 0.4 });
    if (!soft) {
      // Paved: no trodden earth.
    } else if (a.doorX !== undefined) ops.push({ op: 'wear', cx: ox + a.doorX, cy: bottom + 6, rx: 10, ry: 6, seed: idx + 3 });
    else ops.push({ op: 'wear', cx: b.x, cy: bottom + 5, rx: b.w * 0.45, ry: 6, seed: idx + 3 });
    const skip: [number, number] = a.doorX !== undefined ? [ox + a.doorX - 9, ox + a.doorX + 9] : [ox + a.wallX0 + 4, ox + a.wallX1 - 4];
    tufts.push(...fringe(Math.round(ox + a.wallX0), Math.round(ox + a.wallX1), Math.round(bottom), idx * 7 + 1, skip, 0.8));
    blockers.push({ kind: 'rect', x0: b.x - b.w / 2 - 10, y0: b.y - b.h / 2 - 10, x1: b.x + b.w / 2 + 10, y1: bottom + 22 });
  });
  (art.props ?? []).forEach((p, idx) => {
    const seed = p.seed ?? idx + 1;
    const st = PROP_SETTLE[p.kind] ?? {};
    if (st.wear && soft) ops.push({ op: 'wear', cx: p.x, cy: p.y - st.wear[1] * 0.2, rx: st.wear[0], ry: st.wear[1], seed: idx + 11, mat: st.wear[2] });
    const sw = STREW[p.kind];
    if (sw) ops.push({ op: 'strew', cx: p.x, cy: p.y, rx: sw[0], ry: sw[1], colors: sw[2], n: sw[3], seed: idx + 13 });
    if (st.tufts) tufts.push(...tuftsAround(p.x, p.y, st.tufts[0], idx * 5 + seed, st.tufts[1]));
    blockers.push({ kind: 'circle', x: p.x, y: p.y, r: 20 });
  });
  (art.fences ?? []).forEach((f, idx) => {
    if (f.vertical) {
      fencePosts(f).forEach((py, i) => tufts.push(...tuftsAround(f.x, py, 2, idx * 3 + i, 1)));
      blockers.push({ kind: 'rect', x0: f.x - 8, y0: f.y - f.len / 2 - 12, x1: f.x + 8, y1: f.y + f.len / 2 + 12 });
      return;
    }
    const x0 = f.x - Math.round(f.len / 2);
    ops.push({ op: 'occlude', x0, x1: x0 + f.len - 1, y: Math.round(f.y + 1), depth: 2, strength: 0.3 });
    for (let px = 1; px < f.len - 1; px += 8) tufts.push(...tuftsAround(x0 + px + 1, f.y, 2, idx * 3 + px, 1));
    blockers.push({ kind: 'rect', x0: x0 - 6, y0: f.y - 12, x1: x0 + f.len + 6, y1: f.y + 12 });
  });
  (art.ironFences ?? []).forEach((f, idx) => {
    const x0 = f.x - Math.round(f.len / 2);
    ops.push({ op: 'occlude', x0, x1: x0 + f.len - 1, y: Math.round(f.y + 1), depth: 2, strength: 0.3 });
    for (let px = 1; px < f.len - 1; px += 12) tufts.push(...tuftsAround(x0 + px, f.y, 3, idx * 5 + px, 1));
    blockers.push({ kind: 'rect', x0: x0 - 6, y0: f.y - 12, x1: x0 + f.len + 6, y1: f.y + 12 });
  });
  (art.palisades ?? []).forEach((s) => {
    const x0 = s.x - Math.round(s.len / 2);
    ops.push({ op: 'occlude', x0, x1: x0 + s.len - 1, y: Math.round(s.y + 1), depth: 3, strength: 0.4 });
    blockers.push({ kind: 'rect', x0: x0 - 6, y0: s.y - 14, x1: x0 + s.len + 6, y1: s.y + 12 });
  });
  (art.stoneWalls ?? []).forEach((s, idx) => {
    const x0 = s.x - Math.round(s.len / 2);
    ops.push({ op: 'occlude', x0, x1: x0 + s.len - 1, y: Math.round(s.y + 1), depth: 2, strength: 0.3 });
    tufts.push(...fringe(x0, x0 + s.len - 1, s.y, idx + 50, undefined, 0.6));
    blockers.push({ kind: 'rect', x0: x0 - 6, y0: s.y - 12, x1: x0 + s.len + 6, y1: s.y + 12 });
  });
  (art.beds ?? []).forEach((b, idx) => {
    tufts.push(...tuftsAround(b.x, b.y, b.w / 2, idx * 9, Math.round(b.w / 8)));
    blockers.push({ kind: 'rect', x0: b.x - b.w / 2 - 8, y0: b.y - b.h - 8, x1: b.x + b.w / 2 + 8, y1: b.y + 8 });
  });
  (art.walls ?? []).forEach((wl, idx) => {
    const bottom = wl.y + wl.h / 2;
    const x0 = Math.round(wl.x - wl.w / 2);
    if (wl.face === 0) {
      const left = wl.x < art.ground.w / 2;
      ops.push({ op: 'shadeSide', x: left ? x0 + wl.w : x0 - 1, y0: Math.round(wl.y - wl.h / 2), y1: Math.round(bottom), dir: left ? 1 : -1, width: 8 });
    } else {
      ops.push({ op: 'occlude', x0, x1: x0 + wl.w - 1, y: Math.round(bottom + 1), depth: 5, strength: 0.55 });
      ops.push({ op: 'strew', cx: wl.x, cy: bottom + 3, rx: wl.w / 2 + 2, ry: 3, colors: DUST, n: Math.round(wl.w / 2), seed: idx + 70 });
    }
  });
  (art.dprops ?? []).forEach((d) => {
    if (d.kind !== 'sarcophagus' && d.kind !== 'pillar' && d.kind !== 'urn') return;
    const a = dpropArt(d.kind);
    ops.push({ op: 'occlude', x0: Math.round(d.x - a.anchorX + 1), x1: Math.round(d.x - a.anchorX + a.pm.w - 3), y: Math.round(d.y + 1), depth: 3, strength: 0.4 });
  });
  return {
    key: art.key,
    ground: art.ground,
    margin: zoneMargin(art),
    ops,
    tufts,
    meadow: art.meadow ? { ...art.meadow, blockers } : undefined,
  };
}

// ------------------------------------------------------------- lighting

export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const TINTS: Record<ZoneLight['kind'], [number, number, number]> = {
  fire: [1, 0.86, 0.62],
  magic: [0.86, 0.7, 1],
  cold: [0.8, 0.9, 1],
};
const SHADE: [number, number, number] = [0.84, 0.9, 1];

export function zoneLights(art: ZoneArt): ZoneLight[] {
  const lights = [...(art.dark?.lights ?? [])];
  (art.dprops ?? []).forEach((d) => {
    if (d.kind === 'torch') lights.push({ x: d.x, y: d.y - 12, r: 82, kind: 'fire' });
    if (d.kind === 'brazier') lights.push({ x: d.x, y: d.y - 14, r: 84, kind: 'fire' });
    if (d.kind === 'candles') lights.push({ x: d.x, y: d.y - 8, r: 36, kind: 'fire' });
    if (d.kind === 'runes') lights.push({ x: d.x, y: d.y, r: 46, kind: 'magic' });
    if (d.kind === 'vein') lights.push({ x: d.x, y: d.y, r: 34, kind: 'magic' });
    if (d.kind === 'ember') lights.push({ x: d.x, y: d.y, r: 38, kind: 'fire' });
    if (d.kind === 'lectern' || d.kind === 'table') lights.push({ x: d.x + 5, y: d.y - 12, r: 32, kind: 'fire' });
  });
  (art.props ?? []).forEach((p) => {
    if (p.kind === 'blight_pod') lights.push({ x: p.x, y: p.y - 6, r: 34, kind: 'magic' });
    if (p.kind === 'black_well') lights.push({ x: p.x, y: p.y - 8, r: 40, kind: 'magic' });
    if (p.kind === 'smithy') lights.push({ x: p.x - 4, y: p.y - 18, r: 56, kind: 'fire' });
    if (p.kind === 'street_lamp') lights.push({ x: p.x, y: p.y - 30, r: 60, kind: 'fire' });
  });
  return lights;
}

// Light in 0..1 steps with an ordered dither between them, like old games.
export function step(k: number, x: number, y: number): number {
  return Math.min(1, Math.floor(k * 6 + BAYER[(y % 4) * 4 + (x % 4)] / 16) / 6);
}

// The fixed light of a dark zone, as a picture multiplied over the world:
// cold where unlit, warm (or violet) around each light.
// margin: the same extra border as the zone's ground.
export function lightMap(art: ZoneArt, margin: [number, number] = [0, 0]): Uint8ClampedArray {
  const [mx, my] = margin;
  const w = art.ground.w + mx * 2;
  const h = art.ground.h + my * 2;
  const amb = art.dark!.ambient;
  const lights = zoneLights(art).map((l) => ({ ...l, x: l.x + mx, y: l.y + my }));
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let level = amb;
      const shade = art.dark!.shade ?? SHADE;
      let tint = shade;
      let best = 0;
      for (const l of lights) {
        const d = Math.hypot(x - l.x, (y - l.y) * 1.1) / l.r;
        if (d >= 1) continue;
        const q = step(Math.pow(1 - d, 1.4), x, y);
        const lv = amb + (1 - amb) * q;
        if (lv > level) level = lv;
        if (q > best) {
          best = q;
          const t = TINTS[l.kind];
          const k = Math.min(1, q * 1.6);
          tint = [shade[0] + (t[0] - shade[0]) * k, shade[1] + (t[1] - shade[1]) * k, shade[2] + (t[2] - shade[2]) * k];
        }
      }
      const o = (y * w + x) * 4;
      // Warm lights push the red up a little past neutral.
      out[o] = Math.min(255, level * tint[0] * 255 * (best > 0 ? 1.12 : 1));
      out[o + 1] = level * tint[1] * 255;
      out[o + 2] = level * tint[2] * 255;
      out[o + 3] = 255;
    }
  }
  return out;
}

