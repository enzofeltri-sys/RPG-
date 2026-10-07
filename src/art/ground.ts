// The ground of a zone, drawn by the game: a base material, then paths,
// plazas and ponds laid over it, each edge made organic by a little noise
// and given a darker rim, each material with its own texture. One texture
// per scene, generated once.

import { Pixmap, RGB, hash2, noise } from './pixmap';

export type GroundMaterial = 'grass' | 'dirt' | 'cobble' | 'flagstone' | 'sand' | 'water' | 'marsh' | 'stonefloor' | 'planks' | 'crop';

export type GroundShape =
  | { kind: 'path'; material: GroundMaterial; points: [number, number][]; width: number }
  | { kind: 'rect'; material: GroundMaterial; x: number; y: number; w: number; h: number }
  | { kind: 'ellipse'; material: GroundMaterial; x: number; y: number; w: number; h: number };

export interface GroundSpec {
  w: number;
  h: number;
  base: GroundMaterial;
  shapes?: GroundShape[];
  seed?: number;
}

// --------------------------------------------------------------- shapes

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

// Signed distance: negative inside the shape.
function shapeDist(s: GroundShape, x: number, y: number): number {
  if (s.kind === 'path') {
    let d = Infinity;
    for (let i = 1; i < s.points.length; i++) {
      const [ax, ay] = s.points[i - 1];
      const [bx, by] = s.points[i];
      d = Math.min(d, segDist(x, y, ax, ay, bx, by));
    }
    if (s.points.length === 1) d = Math.hypot(x - s.points[0][0], y - s.points[0][1]);
    return d - s.width / 2;
  }
  if (s.kind === 'rect') {
    const dx = Math.max(s.x - x, x - (s.x + s.w - 1));
    const dy = Math.max(s.y - y, y - (s.y + s.h - 1));
    return Math.max(dx, dy);
  }
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  const nx = (x - cx) / (s.w / 2);
  const ny = (y - cy) / (s.h / 2);
  return (Math.sqrt(nx * nx + ny * ny) - 1) * Math.min(s.w, s.h) * 0.5;
}

// ------------------------------------------------------------ materials

const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];
const darker = (c: RGB, k = 0.8): RGB => [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)];

const GRASS: [RGB, RGB, RGB] = [
  [128, 186, 86],
  [100, 162, 72],
  [78, 138, 62],
];
const DIRT: [RGB, RGB, RGB] = [
  [196, 156, 104],
  [168, 128, 84],
  [132, 96, 64],
];
const STONE: [RGB, RGB, RGB] = [
  [178, 176, 168],
  [146, 144, 140],
  [104, 102, 104],
];
const SAND: [RGB, RGB, RGB] = [
  [236, 214, 160],
  [216, 190, 136],
  [184, 156, 108],
];
const WATER: [RGB, RGB, RGB] = [
  [124, 188, 220],
  [72, 140, 196],
  [44, 92, 152],
];
const MARSH: [RGB, RGB, RGB] = [
  [118, 136, 80],
  [90, 108, 64],
  [62, 76, 50],
];
const FLOOR: [RGB, RGB, RGB] = [
  [126, 122, 132],
  [98, 94, 106],
  [66, 62, 76],
];
const PLANK: [RGB, RGB, RGB] = [
  [184, 132, 82],
  [148, 100, 62],
  [104, 68, 44],
];
const MOSS: RGB = [96, 128, 70];
const FLOWERS: RGB[] = [
  [252, 252, 244],
  [252, 230, 110],
  [240, 120, 110],
  [190, 160, 236],
];

function grass(x: number, y: number, seed: number): RGB {
  // Soft patches: the three greens blend instead of forming blotches.
  const patch = noise(x, y, 46, seed);
  let c = patch < 0.42 ? mix(GRASS[1], GRASS[2], (0.42 - patch) * 1.3) : mix(GRASS[1], GRASS[0], Math.max(0, patch - 0.58) * 1.2);
  const fine = noise(x, y, 7, seed + 2);
  if (fine > 0.72) c = mix(c, GRASS[0], 0.22);
  else if (fine < 0.25) c = mix(c, GRASS[2], 0.22);
  // Tufts and flowers, one at most per 8x8 cell.
  const cx = Math.floor(x / 8);
  const cy = Math.floor(y / 8);
  const cell = hash2(cx, cy, seed + 5);
  const fx = cx * 8 + 1 + Math.floor(hash2(cx, cy, seed + 6) * 6);
  const fy = cy * 8 + 2 + Math.floor(hash2(cx, cy, seed + 7) * 5);
  const dx = x - fx;
  const dy = y - fy;
  if (cell < 0.22) {
    // A tuft: a little dark "v" with a lit tip.
    if ((dy === 0 && dx === 0) || (dy === -1 && Math.abs(dx) === 1)) return darker(c, 0.78);
    if (dy === -2 && dx === 1) return mix(c, GRASS[0], 0.6);
  } else if (cell > 0.94 && noise(x, y, 60, seed + 8) > 0.5) {
    // A small flower: colored petals round a yellow heart.
    const petal = FLOWERS[Math.floor(hash2(cx, cy, seed + 9) * FLOWERS.length)];
    if (dx === 0 && dy === 0) return [252, 214, 90];
    if (Math.abs(dx) + Math.abs(dy) === 1) return petal;
  }
  return c;
}

function speckled(base: [RGB, RGB, RGB], x: number, y: number, seed: number, rate = 0.08): RGB {
  const n = noise(x, y, 18, seed);
  const c = n < 0.4 ? mix(base[1], base[2], 0.35) : n > 0.65 ? mix(base[1], base[0], 0.35) : base[1];
  const h = hash2(x, y, seed + 2);
  if (h < rate / 2) return base[2];
  if (h > 1 - rate / 2) return base[0];
  return c;
}

// Irregular stones in staggered rows with dark joints.
function cobble(x: number, y: number, seed: number): RGB {
  const rowH = 5;
  const row = Math.floor(y / rowH);
  const off = (row % 2) * 3;
  const colW = 6 + Math.floor(hash2(row, 0, seed) * 2);
  const col = Math.floor((x + off) / colW);
  const lx = (x + off) % colW;
  const ly = y % rowH;
  if (lx === 0 || ly === 0) return STONE[2];
  const tone = hash2(col, row, seed);
  const c = tone < 0.3 ? mix(STONE[1], STONE[2], 0.3) : tone > 0.75 ? mix(STONE[1], STONE[0], 0.4) : STONE[1];
  if (ly === 1 && lx > 1) return mix(c, STONE[0], 0.5); // lit top edge
  return c;
}

// Large slabs with the odd crack and moss in the joints.
function flagstone(x: number, y: number, seed: number, base: [RGB, RGB, RGB]): RGB {
  const sw = 16;
  const sh = 12;
  const row = Math.floor(y / sh);
  const off = (row % 2) * 8;
  const col = Math.floor((x + off) / sw);
  const lx = (x + off) % sw;
  const ly = y % sh;
  if (lx === 0 || ly === 0) return hash2(x, y, seed + 5) < 0.12 ? MOSS : base[2];
  const tone = hash2(col, row, seed);
  let c = tone < 0.33 ? mix(base[1], base[2], 0.25) : tone > 0.7 ? mix(base[1], base[0], 0.3) : base[1];
  if (ly === 1) c = mix(c, base[0], 0.45);
  if (lx === sw - 1 || ly === sh - 1) c = mix(c, base[2], 0.4);
  // A short crack on the odd slab, each one placed differently.
  if (tone > 0.93) {
    const cx0 = 3 + Math.floor(hash2(col, row, seed + 1) * (sw - 8));
    const cy0 = 2 + Math.floor(hash2(col, row, seed + 2) * (sh - 6));
    const k = lx - cx0;
    if (k >= 0 && k < 4 && ly === cy0 + (k >> 1)) return base[2];
  }
  return c;
}

function water(x: number, y: number, seed: number): RGB {
  const n = noise(x, y, 22, seed);
  const c = n < 0.4 ? WATER[2] : WATER[1];
  // Small horizontal ripples.
  const r = hash2(Math.floor(x / 5), y, seed + 9);
  if (r < 0.06) return WATER[0];
  return mix(c, WATER[1], 0.3);
}

function planks(x: number, y: number, seed: number): RGB {
  const bh = 5;
  const row = Math.floor(y / bh);
  const len = 22 + Math.floor(hash2(row, 1, seed) * 10);
  const off = Math.floor(hash2(row, 2, seed) * len);
  const lx = (x + off) % len;
  const ly = y % bh;
  if (ly === 0 || lx === 0) return PLANK[2];
  if ((lx === 2 || lx === len - 2) && ly === 2) return [70, 60, 60]; // nails
  const grain = hash2(x, row, seed + 3) < 0.08 ? PLANK[2] : PLANK[1];
  return ly === 1 ? mix(grain, PLANK[0], 0.5) : grain;
}

function crop(x: number, y: number, seed: number): RGB {
  // Tilled rows with sprouts.
  const ly = y % 6;
  if (ly < 2) return DIRT[2];
  if (ly === 2 && hash2(x, y, seed) < 0.5) return [118, 176, 74];
  if (ly === 3 && hash2(x, y, seed + 1) < 0.35) return [86, 146, 62];
  return speckled(DIRT, x, y, seed, 0.04);
}

function material(m: GroundMaterial, x: number, y: number, seed: number): RGB {
  switch (m) {
    case 'grass':
      return grass(x, y, seed);
    case 'dirt':
      return speckled(DIRT, x, y, seed + 11);
    case 'cobble':
      return cobble(x, y, seed + 13);
    case 'flagstone':
      return flagstone(x, y, seed + 17, STONE);
    case 'stonefloor':
      return flagstone(x, y, seed + 19, FLOOR);
    case 'sand':
      return speckled(SAND, x, y, seed + 23, 0.05);
    case 'water':
      return water(x, y, seed + 29);
    case 'marsh':
      return noise(x, y, 14, seed + 31) > 0.72 ? mix(WATER[2], MARSH[2], 0.5) : speckled(MARSH, x, y, seed + 31);
    case 'planks':
      return planks(x, y, seed + 37);
    case 'crop':
      return crop(x, y, seed + 41);
  }
}

// Darker rim where a material borders another (path edges, pond banks…).
const RIM: Partial<Record<GroundMaterial, RGB>> = {
  dirt: DIRT[2],
  cobble: STONE[2],
  flagstone: STONE[2],
  water: [36, 70, 110],
  sand: SAND[2],
  marsh: MARSH[2],
  planks: PLANK[2],
  crop: [112, 82, 56],
};

export function renderGround(spec: GroundSpec): Pixmap {
  const { w, h, base } = spec;
  const seed = spec.seed ?? 1;
  const shapes = spec.shapes ?? [];
  const pm = new Pixmap(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = base;
      let edge = Infinity; // distance to the edge of the shape giving m
      let outside = Infinity; // distance to the nearest shape seen from outside
      // Organic edges: shapes are nudged by low-frequency noise.
      const wobble = (noise(x, y, 9, seed + 51) - 0.5) * 3;
      shapes.forEach((s) => {
        const d = shapeDist(s, x, y) + (s.kind === 'path' || s.kind === 'ellipse' ? wobble : 0);
        if (d < 0) {
          m = s.material;
          edge = -d;
        } else outside = Math.min(outside, d);
      });
      let c = material(m, x, y, seed);
      if (m !== base && edge < 1 && RIM[m]) c = RIM[m]!;
      else if (m === base && base === 'grass' && outside < 1.5) c = darker(c, 0.85); // grass shade along edges
      pm.set(x, y, c);
    }
  }
  return pm;
}
