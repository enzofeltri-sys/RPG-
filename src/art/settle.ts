// Settling things into the ground so a scene does not look like sprites
// pasted on a lawn: trampled earth where people walk (doors, wells,
// benches), a contact shadow along the foot of walls, grass tufts that
// grow over the bottom edge of buildings and props, and small per-copy
// variations so two trees of the same kind are never identical.
//
// The ground parts (wear, occlusion) are painted into the ground picture;
// tufts are little sprites drawn just in front of what they hide.

import { GRASS, GroundMaterial, groundPixel } from './ground';
import { Pixmap, RGB, clamp, hash2, lit, mix, noise, seeded } from './pixmap';

const DRY: RGB = [150, 146, 84];

// Trampled ground: earth in the middle, broken patches of earth and dry,
// flattened grass towards a ragged edge.
export function wear(map: Pixmap, cx: number, cy: number, rx: number, ry: number, seed: number, mat: GroundMaterial = 'dirt'): void {
  for (let y = Math.floor(cy - ry - 2); y <= Math.ceil(cy + ry + 2); y++) {
    for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
      const cur = map.get(x, y);
      if (!cur) continue;
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const d = Math.sqrt(nx * nx + ny * ny) + (noise(x, y, 5, seed) - 0.5) * 0.55;
      if (d > 1) continue;
      const bare = d < 0.5 || hash2(x, y, seed + 1) < ((1 - d) / 0.5) * 0.75;
      map.set(x, y, bare ? groundPixel(mat, x, y, seed) : mix(cur, DRY, 0.3));
    }
  }
}

// Bits scattered on the ground around something: straw around a haystack
// or a hay cart, chips around a woodpile. Denser near the middle.
export function strew(map: Pixmap, cx: number, cy: number, rx: number, ry: number, colors: RGB[], n: number, seed: number): void {
  const rnd = seeded(seed * 19 + 3);
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd());
    const x = Math.round(cx + Math.cos(a) * rx * r);
    const y = Math.round(cy + Math.sin(a) * ry * r);
    if (!map.get(x, y)) continue;
    const c = colors[Math.floor(rnd() * colors.length)];
    map.set(x, y, c);
    if (rnd() < 0.5) map.set(x + (rnd() < 0.5 ? 1 : -1), y, mix(c, [40, 30, 20], 0.25));
  }
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

// Soft darkening of the ground just below a base line (where a wall or a
// fence meets the ground), fading out over a few rows, ragged at the ends.
export function occlude(map: Pixmap, x0: number, x1: number, y: number, depth = 3, strength = 0.38): void {
  for (let j = 0; j < depth; j++) {
    const k = strength * (1 - j / depth);
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      const edge = x < x0 + 2 || x > x1 - 2;
      const c = map.get(x, y + j);
      if (!c) continue;
      map.set(x, y + j, mix(c, [22, 30, 24], edge ? k * 0.5 : k));
    }
  }
}

// A grass tuft: a few blades of the ground's own green, sometimes with a
// flower. The anchor is its root (bottom center).
export function renderTuft(seed: number, tall = false): { pm: Pixmap; anchorX: number; anchorY: number } {
  const rnd = seeded(seed * 7 + 3);
  const W = 9;
  const H = tall ? 10 : 7;
  const pm = new Pixmap(W, H);
  const blades = 4 + Math.floor(rnd() * 3);
  for (let i = 0; i < blades; i++) {
    const x0 = 2 + Math.floor(rnd() * 5);
    const h = Math.max(2, Math.round((tall ? 5 : 3) + rnd() * (tall ? 4 : 3) - Math.abs(x0 - 4) * 0.6));
    const lean = x0 < 4 ? -1 : x0 > 4 ? 1 : 0;
    for (let j = 0; j < h; j++) {
      const x = x0 + (j >= h - 1 && h > 2 ? lean : 0);
      const t = j / h;
      pm.set(x, H - 1 - j, lit(GRASS, t * 1.5 - 0.75 + (i % 2 ? 0.15 : -0.1)));
    }
  }
  if (rnd() < 0.18) {
    const petal: RGB = [[246, 244, 236] as RGB, [248, 212, 92] as RGB, [236, 110, 110] as RGB][Math.floor(rnd() * 3)];
    const fx = 3 + Math.floor(rnd() * 3);
    pm.set(fx, 1, [250, 214, 100]);
    pm.set(fx - 1, 1, petal);
    pm.set(fx + 1, 1, petal);
    pm.set(fx, 0, petal);
  }
  return { pm, anchorX: 4, anchorY: H - 1 };
}

export interface TuftSpot {
  x: number;
  y: number;
  seed: number;
  tall: boolean;
}

// Tufts along a base line from x0 to x1 (skipping [skipFrom, skipTo], e.g.
// a door), irregularly spaced, denser and taller at the corners.
export function fringe(x0: number, x1: number, y: number, seed: number, skip?: [number, number], density = 0.55): TuftSpot[] {
  const out: TuftSpot[] = [];
  const rnd = seeded(seed * 31 + 7);
  let x = x0 + Math.floor(rnd() * 3);
  while (x <= x1) {
    const corner = x - x0 < 6 || x1 - x < 6;
    const inSkip = skip && x >= skip[0] && x <= skip[1];
    if (!inSkip && (corner || rnd() < density)) out.push({ x, y: y + 1 + Math.floor(rnd() * 2), seed: Math.floor(rnd() * 1000), tall: corner ? rnd() < 0.7 : rnd() < 0.25 });
    x += 3 + Math.floor(rnd() * 6);
  }
  return out;
}

// A few tufts scattered around a point (the foot of a tree, a post…).
export function tuftsAround(x: number, y: number, rx: number, seed: number, n: number): TuftSpot[] {
  const rnd = seeded(seed * 17 + 5);
  const out: TuftSpot[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ x: Math.round(x + (rnd() - 0.5) * 2 * rx), y: Math.round(y + 1 + rnd() * 2), seed: Math.floor(rnd() * 1000), tall: rnd() < 0.35 });
  }
  return out;
}

// A per-copy variation of a picture: a slight brightness and warmth shift
// (fresh or dry leaves, warmer or cooler stone), opaque pixels only.
export function vary(src: Pixmap, seed: number, amount = 1): Pixmap {
  const out = new Pixmap(src.w, src.h);
  out.data.set(src.data);
  const b = 1 + (hash2(seed, 1, 991) - 0.5) * 0.14 * amount;
  const warm = (hash2(seed, 2, 992) - 0.5) * 16 * amount;
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] !== 255) continue;
    out.data[i] = clamp(Math.round(out.data[i] * b + warm));
    out.data[i + 1] = clamp(Math.round(out.data[i + 1] * b + warm * 0.4));
    out.data[i + 2] = clamp(Math.round(out.data[i + 2] * b - warm * 0.6));
  }
  return out;
}

// Points spread naturally in a rectangle: never closer than minDist, never
// on a grid (dart throwing with a fixed number of tries).
export function scatter(x: number, y: number, w: number, h: number, n: number, minDist: number, seed: number, avoid: (px: number, py: number) => boolean = () => false): [number, number][] {
  const rnd = seeded(seed * 13 + 11);
  const pts: [number, number][] = [];
  for (let tries = 0; tries < n * 40 && pts.length < n; tries++) {
    const px = x + rnd() * w;
    const py = y + rnd() * h;
    if (avoid(px, py)) continue;
    if (pts.some(([qx, qy]) => Math.hypot(qx - px, qy - py) < minDist)) continue;
    pts.push([Math.round(px), Math.round(py)]);
  }
  return pts;
}

// How each prop sits in the ground: trampled earth under it (radii and
// material) and tufts around its foot (spread and count).
export interface PropSettle {
  wear?: [number, number, GroundMaterial?];
  strew?: [number, number, RGB[], number];
  tufts?: [number, number];
  vary?: boolean;
}

export const PROP_SETTLE: Record<string, PropSettle> = {
  tree: { tufts: [7, 3], vary: true },
  big_tree: { tufts: [9, 4], vary: true },
  apple_tree: { tufts: [7, 3], vary: true },
  pine: { tufts: [6, 2], vary: true },
  bush: { tufts: [6, 2], vary: true },
  berry_bush: { tufts: [6, 2], vary: true },
  flower_bush: { tufts: [6, 2], vary: true },
  rock_small: { tufts: [5, 1], vary: true },
  boulder_large: { tufts: [11, 3], vary: true },
  stump: { tufts: [7, 2], vary: true },
  log: { tufts: [12, 3], vary: true },
  haystack: { wear: [14, 5], strew: [17, 6, STRAW_BITS, 40], tufts: [12, 2], vary: true },
  well: { wear: [17, 8], tufts: [15, 3] },
  bench: { wear: [12, 5] },
  trough: { wear: [15, 6], tufts: [13, 2] },
  woodpile: { wear: [12, 4], strew: [14, 5, CHIPS, 18] },
  market_stall: { wear: [18, 7] },
  merchant_stall: { wear: [18, 7] },
  wagon_cart: { wear: [18, 6], strew: [20, 6, STRAW_BITS, 22], tufts: [16, 2] },
  signpost: { tufts: [4, 3] },
  lamppost: { tufts: [4, 2] },
  scarecrow: { strew: [7, 3, STRAW_BITS, 6], tufts: [5, 3] },
  barrel: { tufts: [5, 1] },
  crate: { tufts: [6, 1] },
  altar: { wear: [18, 6, 'flagstone'], tufts: [16, 3] },
  standing_stone: { tufts: [7, 3], vary: true },
  ruin_pillar: { tufts: [7, 3], vary: true },
  ore_rock: { wear: [12, 5, 'dirt'], tufts: [10, 2] },
  herb_patch: { tufts: [8, 2] },
  fern: { vary: true },
  tent: { wear: [22, 7], tufts: [20, 3] },
  hide_hut: { wear: [20, 7], tufts: [18, 3] },
  campfire: { wear: [14, 6], strew: undefined },
  totem: { tufts: [5, 2] },
  gravestone: { tufts: [6, 2], vary: true },
  dead_tree: { tufts: [8, 2], vary: true },
};

// The dark outline under the foot of a sprite reads like a sticker edge:
// below the base line, outline pixels that sit under the sprite become a
// soft translucent contact shadow instead.
export function softenBase(src: Pixmap, baseY: number): Pixmap {
  const out = new Pixmap(src.w, src.h);
  out.data.set(src.data);
  const dark = (o: number) => src.data[o + 3] === 255 && src.data[o] * 0.3 + src.data[o + 1] * 0.59 + src.data[o + 2] * 0.11 < 52;
  for (let y = Math.max(1, baseY); y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const o = (y * src.w + x) * 4;
      const above = ((y - 1) * src.w + x) * 4;
      if (!dark(o) || src.data[above + 3] !== 255 || dark(above)) continue;
      out.data[o] = 20;
      out.data[o + 1] = 28;
      out.data[o + 2] = 22;
      out.data[o + 3] = 120;
    }
  }
  return out;
}
