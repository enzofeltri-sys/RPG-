// The ground of a zone, drawn by the game: a base material, then paths,
// plazas and ponds laid over it, with organic edges (grass spills over the
// paths, banks get a darker rim). Each material has a 5-tone ramp and its
// own texture: fine grass blades and clumps, pebbly dirt, rounded cobbles
// and natural slabs (Voronoi cells), rippled water. One texture per scene,
// generated once.

import { Pixmap, RGB, Ramp, cell, hash2, lit, mix, noise, ramp } from './pixmap';

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

const GRASS = ramp([96, 156, 70]);
const DIRT = ramp([166, 126, 84]);
const COBBLE = ramp([150, 146, 140], 0.6);
const SLAB = ramp([158, 154, 146], 0.6);
const FLOOR = ramp([98, 94, 108], 0.5);
const SAND = ramp([214, 190, 138]);
const WATER = ramp([70, 136, 192], 0.4);
const MARSH = ramp([92, 110, 66]);
const PLANK = ramp([150, 102, 64]);
const MOSS: RGB = [92, 126, 70];
const FLOWERS: RGB[] = [
  [252, 252, 244],
  [252, 226, 110],
  [240, 120, 110],
  [196, 166, 240],
];

function grass(x: number, y: number, seed: number): RGB {
  // Soft light: broad patches and a finer variation.
  const level = (noise(x, y, 52, seed) - 0.5) * 0.9 + (noise(x, y, 13, seed + 1) - 0.5) * 0.45;
  // Mostly the mid green; lighter and darker patches blend in with a
  // sparse dither instead of hard-edged blobs.
  const dither = (hash2(x, y, seed + 13) - 0.5) * 0.35;
  const v = level * 0.75 + dither;
  let c = v > 0.3 ? GRASS[1] : v < -0.3 ? GRASS[3] : GRASS[2];
  // Blades: in each 3x4 cell, a short stroke, dark at the root, lit at the tip.
  const bx = Math.floor(x / 3);
  const by = Math.floor(y / 4);
  const h = hash2(bx, by, seed + 2);
  if (h < 0.6) {
    const col = bx * 3 + Math.floor(hash2(bx, by, seed + 3) * 3);
    const tip = by * 4 + Math.floor(hash2(bx, by, seed + 4) * 2);
    if (x === col && y === tip) return mix(c, GRASS[0], 0.5);
    if (x === col && y === tip + 1) return mix(c, GRASS[3], 0.55);
  }
  // Clumps: a darker tuft with lit tips, one per 12x10 cell at most.
  const kx = Math.floor(x / 12);
  const ky = Math.floor(y / 10);
  if (hash2(kx, ky, seed + 5) < 0.2) {
    const cx = kx * 12 + 3 + Math.floor(hash2(kx, ky, seed + 6) * 6);
    const cy = ky * 10 + 3 + Math.floor(hash2(kx, ky, seed + 7) * 5);
    const dx = x - cx;
    const dy = y - cy;
    if (dy === 0 && Math.abs(dx) <= 2) return GRASS[3];
    if (dy === -1 && Math.abs(dx) <= 1) return GRASS[2];
    if (dy === -2 && (dx === -1 || dx === 1)) return GRASS[1];
    if (dy === -3 && dx === 0) return GRASS[0];
  }
  // Flowers, in loose meadows.
  const fx = Math.floor(x / 9);
  const fy = Math.floor(y / 9);
  if (hash2(fx, fy, seed + 8) > 0.93 && noise(x, y, 70, seed + 9) > 0.48) {
    const px = fx * 9 + 2 + Math.floor(hash2(fx, fy, seed + 10) * 5);
    const py = fy * 9 + 2 + Math.floor(hash2(fx, fy, seed + 11) * 5);
    const dx = x - px;
    const dy = y - py;
    const petal = FLOWERS[Math.floor(hash2(fx, fy, seed + 12) * FLOWERS.length)];
    if (dx === 0 && dy === 0) return [252, 210, 90];
    if (Math.abs(dx) + Math.abs(dy) === 1) return dy === 1 ? mix(petal, GRASS[3], 0.3) : petal;
    if (dx === 0 && dy === 2) return GRASS[3]; // stem
  }
  return c;
}

function dirt(x: number, y: number, seed: number, r: Ramp = DIRT): RGB {
  const level = (noise(x, y, 16, seed) - 0.5) * 0.7 + (noise(x, y, 4, seed + 1) - 0.5) * 0.35 + (hash2(x, y, seed + 2) - 0.5) * 0.18;
  let c = level > 0.28 ? r[1] : level < -0.28 ? r[3] : r[2];
  // Pebbles: a lit pixel over a shaded one.
  const p = cell(x, y, 5, seed + 2);
  if (hash2(p.id, 1, seed) < 0.1 && p.d1 < 0.16) c = p.dy < 0 ? r[0] : r[3];
  return c;
}

// Rounded stones: lit from the top left, mortar between them.
function stones(x: number, y: number, seed: number, r: Ramp, size: number, stretch: number, relief: number, mortar: RGB): RGB {
  const s = cell(x, y, size, seed, stretch);
  if (s.d2 - s.d1 < 0.09) return mortar;
  const tone = (hash2(s.id, 2, seed) - 0.5) * 0.5;
  const level = (-s.dx * 0.55 - s.dy * 0.75) * relief + tone;
  // Rim on the lower right of each stone.
  if (s.d2 - s.d1 < 0.16 && s.dx + s.dy > 0.2) return r[3];
  return lit(r, level);
}

function slabs(x: number, y: number, seed: number, r: Ramp): RGB {
  const s = cell(x, y, 13, seed, 1.35);
  if (s.d2 - s.d1 < 0.06) return hash2(x, y, seed + 3) < 0.25 ? MOSS : r[4];
  const tone = (hash2(s.id, 2, seed) - 0.5) * 0.6;
  let level = (-s.dx * 0.25 - s.dy * 0.35) * 0.8 + tone + (hash2(x, y, seed + 4) - 0.5) * 0.25;
  if (s.d2 - s.d1 < 0.12 && s.dy < 0) level += 0.5; // lit top edge
  // A hairline crack on some slabs.
  if (hash2(s.id, 5, seed) > 0.88 && Math.abs(s.dx * 0.8 - s.dy) < 0.05 && s.d1 < 0.45) return r[4];
  return lit(r, level);
}

function water(x: number, y: number, seed: number): RGB {
  const level = (noise(x, y, 24, seed) - 0.5) * 0.7;
  let c = lit(WATER, level * 0.6);
  // Ripples: short horizontal glints, with a shaded line beneath.
  const rx = Math.floor(x / 7);
  const ry = Math.floor(y / 5);
  if (hash2(rx, ry, seed + 1) < 0.22) {
    const gy = ry * 5 + 2;
    const gx = rx * 7 + Math.floor(hash2(rx, ry, seed + 2) * 3);
    if (y === gy && x >= gx && x < gx + 3) c = WATER[0];
    if (y === gy + 1 && x >= gx + 1 && x < gx + 4) c = WATER[3];
  }
  return c;
}

function planks(x: number, y: number, seed: number): RGB {
  const bh = 5;
  const row = Math.floor(y / bh);
  const len = 22 + Math.floor(hash2(row, 1, seed) * 10);
  const off = Math.floor(hash2(row, 2, seed) * len);
  const lx = (x + off) % len;
  const ly = y % bh;
  if (ly === 0 || lx === 0) return PLANK[4];
  if ((lx === 2 || lx === len - 2) && ly === 2) return [70, 60, 60];
  const board = Math.floor((x + off) / len);
  const tone = (hash2(board, row, seed) - 0.5) * 0.5;
  const grain = hash2(x, row, seed + 3) < 0.1 ? -0.5 : 0;
  return lit(PLANK, (ly === 1 ? 0.4 : ly === bh - 1 ? -0.35 : 0) + tone + grain);
}

function crop(x: number, y: number, seed: number): RGB {
  // Tilled rows of leafy plants.
  const ly = y % 7;
  const plant = Math.floor(x / 5);
  const lx = x % 5;
  if (ly >= 1 && ly <= 4 && hash2(plant, Math.floor(y / 7), seed) < 0.85) {
    const dx = lx - 2;
    const dy = ly - 2.5;
    if (dx * dx * 0.6 + dy * dy < 3) return lit(GRASS, -dx * 0.4 - dy * 0.5);
  }
  if (ly === 6) return DIRT[3];
  return dirt(x, y, seed, DIRT);
}

function material(m: GroundMaterial, x: number, y: number, seed: number): RGB {
  switch (m) {
    case 'grass':
      return grass(x, y, seed);
    case 'dirt':
      return dirt(x, y, seed + 11);
    case 'cobble':
      return stones(x, y, seed + 13, COBBLE, 6, 1.25, 1, COBBLE[4]);
    case 'flagstone':
      return slabs(x, y, seed + 17, SLAB);
    case 'stonefloor':
      return slabs(x, y, seed + 19, FLOOR);
    case 'sand':
      return dirt(x, y, seed + 23, SAND);
    case 'water':
      return water(x, y, seed + 29);
    case 'marsh':
      return noise(x, y, 14, seed + 31) > 0.7 ? water(x, y, seed + 31) : dirt(x, y, seed + 31, MARSH);
    case 'planks':
      return planks(x, y, seed + 37);
    case 'crop':
      return crop(x, y, seed + 41);
  }
}

// Darker rim where a material borders another (path edges, pond banks…).
const RIM: Partial<Record<GroundMaterial, RGB>> = {
  dirt: DIRT[3],
  cobble: COBBLE[4],
  flagstone: SLAB[4],
  water: [38, 72, 112],
  sand: SAND[3],
  marsh: MARSH[4],
  planks: PLANK[4],
  crop: DIRT[4],
};

export function renderGround(spec: GroundSpec): Pixmap {
  const { w, h, base } = spec;
  const seed = spec.seed ?? 1;
  const shapes = spec.shapes ?? [];
  const pm = new Pixmap(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = base;
      let edge = Infinity; // depth inside the shape giving m
      let outside = Infinity; // distance to the nearest shape seen from outside
      // Organic edges: shapes are nudged by low-frequency noise.
      const wobble = (noise(x, y, 9, seed + 51) - 0.5) * 3.2 + (noise(x, y, 3, seed + 52) - 0.5) * 1.2;
      shapes.forEach((s) => {
        const d = shapeDist(s, x, y) + (s.kind === 'path' || s.kind === 'ellipse' ? wobble : 0);
        if (d < 0) {
          m = s.material;
          edge = -d;
        } else outside = Math.min(outside, d);
      });
      let c = material(m, x, y, seed);
      if (m !== base) {
        // Grass spilling over the edge of a path, then a shaded rim.
        if (base === 'grass' && m !== 'water' && edge < 1.6 && hash2(x, y, seed + 60) < 0.45) c = grass(x, y, seed) === GRASS[1] ? GRASS[2] : GRASS[3];
        else if (edge < 1.1 && RIM[m]) c = RIM[m]!;
        else if (edge < 2.2 && m === 'water') c = mix(c, WATER[3], 0.6);
      } else if (base === 'grass' && outside < 2) c = mix(c, GRASS[4], 0.22); // grass shade along edges
      pm.set(x, y, c);
    }
  }
  return pm;
}
