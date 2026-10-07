// The ground of a zone, drawn by the game: a base material, then paths,
// plazas and ponds laid over it, with organic edges (grass spills over the
// paths, banks get a darker rim). Each material has a 5-tone ramp and its
// own texture: fine grass blades and clumps, pebbly dirt, rounded cobbles
// and natural slabs (Voronoi cells), rippled water. One texture per scene,
// generated once.

import { Pixmap, RGB, Ramp, cell, hash2, lit, mix, noise, ramp } from './pixmap';

export type GroundMaterial = 'grass' | 'forest' | 'cave' | 'dirt' | 'cobble' | 'flagstone' | 'sand' | 'water' | 'marsh' | 'stonefloor' | 'aisle' | 'planks' | 'crop' | 'blight' | 'carpet' | 'paving' | 'mud';

export type GroundShape =
  | { kind: 'path'; material: GroundMaterial; points: [number, number][]; width: number; rough?: number }
  | { kind: 'rect'; material: GroundMaterial; x: number; y: number; w: number; h: number; rough?: number }
  | { kind: 'ellipse'; material: GroundMaterial; x: number; y: number; w: number; h: number; rough?: number };

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

export const GRASS = ramp([96, 156, 70]);
const DIRT = ramp([166, 126, 84]);
const COBBLE = ramp([150, 146, 140], 0.6);
const SLAB = ramp([158, 154, 146], 0.6);
const PAVING = ramp([196, 184, 160], 0.55);
const FLOOR = ramp([92, 88, 100], 0.5);
const AISLE = ramp([112, 106, 112], 0.5);
const SAND = ramp([214, 190, 138]);
const MUD = ramp([118, 100, 82], 0.7);
const WATER = ramp([58, 116, 150], 0.4);
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

// Forest floor: shaded grass and moss with patches of leaf litter, fallen
// leaves and twigs.
const FOREST = ramp([78, 128, 60]);
const LITTER = ramp([122, 96, 62]);
function forestFloor(x: number, y: number, seed: number): RGB {
  const patch = noise(x, y, 26, seed + 70) + (noise(x, y, 7, seed + 71) - 0.5) * 0.35;
  const v = (noise(x, y, 11, seed + 72) - 0.5) * 0.7 + (hash2(x, y, seed + 73) - 0.5) * 0.4;
  if (patch < 0.24) {
    // Leaf litter: browns with lighter leaves and dark gaps.
    const h = hash2(x, y, seed + 74);
    if (h < 0.06) return [196, 132, 64];
    if (h < 0.1) return [168, 76, 48];
    return lit(LITTER, v * 1.2);
  }
  let c = v > 0.25 ? FOREST[1] : v < -0.25 ? FOREST[3] : FOREST[2];
  if (patch < 0.32 && hash2(x, y, seed + 75) < (0.32 - patch) * 6) c = mix(c, LITTER[2], 0.55);
  // Blades and the odd fallen leaf.
  const bx = Math.floor(x / 3);
  const by = Math.floor(y / 4);
  if (hash2(bx, by, seed + 76) < 0.5) {
    const col = bx * 3 + Math.floor(hash2(bx, by, seed + 77) * 3);
    const tip = by * 4 + Math.floor(hash2(bx, by, seed + 78) * 2);
    if (x === col && y === tip) return mix(c, FOREST[0], 0.5);
    if (x === col && y === tip + 1) return mix(c, FOREST[4], 0.5);
  }
  if (hash2(x, y, seed + 79) < 0.012) return [190, 128, 60];
  // Twigs: short dark diagonals.
  const tx = Math.floor(x / 14);
  const ty = Math.floor(y / 12);
  if (hash2(tx, ty, seed + 80) < 0.18) {
    const ox = tx * 14 + 3 + Math.floor(hash2(tx, ty, seed + 81) * 7);
    const oy = ty * 12 + 3 + Math.floor(hash2(tx, ty, seed + 82) * 6);
    const k = x - ox;
    if (k >= 0 && k < 4 && y === oy + Math.floor(k / 2)) return [92, 66, 46];
  }
  return c;
}

// Cave floor: uneven rock in broad plates, gravel, cracks, damp patches.
const CAVE = ramp([92, 86, 92], 0.5);
function caveFloor(x: number, y: number, seed: number): RGB {
  const plate = cell(x, y, 17, seed + 90, 1.3);
  // Cracks between the plates, broken (not a paving's joints).
  if (plate.d2 - plate.d1 < 0.05 && noise(x, y, 5, seed + 95) > 0.45) return CAVE[4];
  let level = (-plate.dx * 0.2 - plate.dy * 0.3) * 0.7 + (hash2(plate.id, 1, seed) - 0.5) * 0.5 + (noise(x, y, 6, seed + 91) - 0.5) * 0.5;
  // Gravel.
  const g = cell(x, y, 3, seed + 92);
  if (g.d1 < 0.22 && hash2(g.id, 2, seed) < 0.3) level += g.dy < 0 ? 0.5 : -0.5;
  let c = lit(CAVE, level + (hash2(x, y, seed + 93) - 0.5) * 0.25);
  // Damp, darker patches with a cold sheen.
  if (noise(x, y, 30, seed + 94) > 0.68) c = mix(c, [40, 50, 66], 0.35);
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

function slabs(x: number, y: number, seed: number, r: Ramp, size = 13, stretch = 1.35): RGB {
  const s = cell(x, y, size, seed, stretch);
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

// Ground taken by the corruption: dark ashen soil, a net of cracks with
// violet veins glowing in some of them, dead grass, glinting specks.
const BLIGHT = ramp([92, 80, 88], 0.6);
function blight(x: number, y: number, seed: number): RGB {
  const level = (noise(x, y, 14, seed) - 0.5) * 0.7 + (noise(x, y, 4, seed + 1) - 0.5) * 0.4 + (hash2(x, y, seed + 2) - 0.5) * 0.2;
  let c = level > 0.25 ? BLIGHT[1] : level < -0.25 ? BLIGHT[3] : BLIGHT[2];
  const v = cell(x, y, 15, seed + 3, 1.2);
  if (v.d2 - v.d1 < 0.06 && noise(x, y, 6, seed + 4) > 0.42) {
    // A crack; the deeper ones glow.
    return noise(x, y, 23, seed + 5) > 0.62 ? (hash2(x, y, seed + 6) < 0.5 ? [196, 120, 244] : [150, 82, 200]) : [44, 34, 48];
  }
  // Dead grass: short pale strokes.
  const bx = Math.floor(x / 4);
  const by = Math.floor(y / 5);
  if (hash2(bx, by, seed + 7) < 0.3 && noise(x, y, 30, seed + 8) > 0.45) {
    const col = bx * 4 + Math.floor(hash2(bx, by, seed + 9) * 4);
    const tip = by * 5 + 1;
    if (x === col && (y === tip || y === tip + 1)) return y === tip ? [150, 138, 104] : [112, 100, 80];
  }
  if (hash2(x, y, seed + 10) < 0.006) c = [220, 170, 250];
  return c;
}

// A runner of red carpet with a woven diamond pattern (archives, halls).
const CARPET = ramp([150, 46, 52]);
function carpet(x: number, y: number, seed: number): RGB {
  const dx = ((x % 8) + 8) % 8;
  const dy = ((y % 8) + 8) % 8;
  const diamond = Math.abs(dx - 3.5) + Math.abs(dy - 3.5) === 3.5 || Math.abs(dx - 3.5) + Math.abs(dy - 3.5) === 3;
  const wear = noise(x, y, 18, seed) > 0.7 ? -0.35 : 0;
  if (diamond) return mix(CARPET[1], [214, 160, 70], 0.45 + wear * 0.5);
  return lit(CARPET, wear + (hash2(x, y, seed + 1) - 0.5) * 0.25 + ((x + y) & 1 ? 0.05 : -0.05));
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

export function groundPixel(m: GroundMaterial, x: number, y: number, seed: number): RGB {
  return material(m, x, y, seed);
}

function material(m: GroundMaterial, x: number, y: number, seed: number): RGB {
  switch (m) {
    case 'grass':
      return grass(x, y, seed);
    case 'forest':
      return forestFloor(x, y, seed);
    case 'cave':
      return caveFloor(x, y, seed);
    case 'dirt':
      return dirt(x, y, seed + 11);
    case 'cobble':
      return stones(x, y, seed + 13, COBBLE, 6, 1.25, 1, COBBLE[4]);
    case 'flagstone':
      return slabs(x, y, seed + 17, SLAB, 9, 1.3);
    case 'stonefloor':
      return slabs(x, y, seed + 19, FLOOR, 9, 1.3);
    case 'aisle':
      return slabs(x, y, seed + 21, AISLE, 12, 1.7);
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
    case 'blight':
      return blight(x, y, seed + 43);
    case 'carpet':
      return carpet(x, y, seed + 47);
    case 'mud':
      // Trodden mud of the quays: greyer and darker than country earth, with
      // wet hollows that catch the sky.
      {
        const n = noise(x, y, 13, seed + 57);
        if (n > 0.83) {
          // Puddle: a dark muddy rim, still water reflecting a pale sky.
          if (n < 0.845) return MUD[4];
          const above = noise(x, y - 2, 13, seed + 57) < 0.845;
          return above ? [78, 84, 92] : hash2(x >> 2, y, seed + 58) < 0.08 ? [168, 184, 196] : [104, 116, 128];
        }
        return dirt(x, y, seed + 59, MUD);
      }
    case 'paving':
      return slabs(x, y, seed + 53, PAVING, 10, 1.3);
  }
}

// Darker rim where a material borders another (path edges, pond banks…).
const RIM: Partial<Record<GroundMaterial, RGB>> = {
  dirt: DIRT[3],
  cobble: COBBLE[4],
  flagstone: SLAB[4],
  aisle: AISLE[4],
  cave: CAVE[4],
  water: [38, 72, 112],
  sand: SAND[3],
  marsh: MARSH[4],
  planks: PLANK[4],
  crop: DIRT[4],
  blight: BLIGHT[4],
  carpet: [206, 156, 66],
  paving: PAVING[4],
  mud: MUD[4],
};

// Paved materials: their stones are laid one by one, so the edge of a
// paved area follows the stones and frays out (stones missing near the
// edge, a few strays beyond it) instead of being cut along a curve.
const PAVED: Partial<Record<GroundMaterial, { size: number; stretch: number; seed: number; fray: number }>> = {
  cobble: { size: 6, stretch: 1.25, seed: 13, fray: 7 },
  flagstone: { size: 9, stretch: 1.3, seed: 17, fray: 8 },
  paving: { size: 10, stretch: 1.3, seed: 53, fray: 6 },
};

export function renderGround(spec: GroundSpec): Pixmap {
  const { w, h, base } = spec;
  const seed = spec.seed ?? 1;
  const shapes = spec.shapes ?? [];
  const pm = new Pixmap(w, h);
  const grassy = base === 'grass' || base === 'forest';
  const G = base === 'forest' ? FOREST : GRASS;
  const wobbleAt = (x: number, y: number) => (noise(x, y, 9, seed + 51) - 0.5) * 3.2 + (noise(x, y, 3, seed + 52) - 0.5) * 1.2;
  // Paved shapes get a broader, lumpier outline.
  const pavedWobble = (x: number, y: number) => (noise(x, y, 18, seed + 53) - 0.5) * 6 + wobbleAt(x, y);
  // Each shape only matters inside its bounding box, grown by how far its
  // edge can wobble or fray: skipping the rest keeps a big zone fast.
  const boxes = shapes.map((s) => {
    const paved = PAVED[s.material];
    const m = (paved ? paved.fray + paved.size * paved.stretch + 12 : 8) + (s.rough ?? 0);
    if (s.kind === 'path') {
      const xs = s.points.map((p) => p[0]);
      const ys = s.points.map((p) => p[1]);
      const r = s.width / 2 + m;
      return [Math.min(...xs) - r, Math.min(...ys) - r, Math.max(...xs) + r, Math.max(...ys) + r];
    }
    return [s.x - m, s.y - m, s.x + s.w + m, s.y + s.h + m];
  });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = base;
      let edge = Infinity; // depth inside the shape giving m
      let outside = Infinity; // distance to the nearest shape seen from outside
      let pavedEdge = Infinity; // how deep the stone under this pixel sits in its paving
      let wobble = NaN;
      for (let i = 0; i < shapes.length; i++) {
        const b = boxes[i];
        if (x < b[0] || y < b[1] || x > b[2] || y > b[3]) continue;
        const s = shapes[i];
        const paved = PAVED[s.material];
        if (paved) {
          // Far outside the paving (beyond its frayed edge and wobble): skip.
          if (shapeDist(s, x, y) > paved.fray + paved.size * paved.stretch + 8) continue;
          // Decide per stone, from where the stone's center sits.
          const c = cell(x, y, paved.size, seed + paved.seed, paved.stretch);
          const sx = x - (c.dx / 2) * paved.size * paved.stretch;
          const sy = y - (c.dy / 2) * paved.size;
          const depth = -(shapeDist(s, sx, sy) + pavedWobble(sx, sy));
          const keep = hash2(c.id, 7, seed);
          const inside = depth > 0 ? keep < 0.12 + Math.min(1, depth / paved.fray) : depth > -paved.fray * 0.7 && keep < 0.08;
          if (inside) {
            m = s.material;
            edge = Infinity;
            pavedEdge = depth;
          }
          continue;
        }
        if (Number.isNaN(wobble)) wobble = wobbleAt(x, y);
        // Rough shapes (clearings, ponds) get a broad lumpy outline too.
        const rough = s.rough ? (noise(x, y, 20, seed + 54 + i) - 0.5) * 2 * s.rough : 0;
        const d = shapeDist(s, x, y) + (s.kind === 'path' || s.kind === 'ellipse' ? wobble : 0) + rough;
        if (d < 0) {
          m = s.material;
          edge = -d;
          pavedEdge = Infinity;
        } else outside = Math.min(outside, d);
      }
      let c = material(m, x, y, seed);
      const paved = PAVED[m];
      if (paved && pavedEdge !== Infinity) {
        // Grass or earth creeping between the stones, more so near the edge.
        const pc = cell(x, y, paved.size, seed + paved.seed, paved.stretch);
        const gap = pc.d2 - pc.d1 < 0.1;
        const creep = Math.max(0, 1 - pavedEdge / (paved.fray * 1.6));
        if (gap && grassy && hash2(x, y, seed + 61) < 0.08 + creep * 0.6) c = hash2(x, y, seed + 62) < 0.5 ? G[2] : G[3];
        // Loose stones near the edge sit a little lower and darker.
        else if (pavedEdge < paved.fray * 0.5) c = mix(c, [40, 36, 30], 0.12);
      } else if (m !== base) {
        // Grass spilling over the edge of a path, then a shaded rim.
        if (grassy && m !== 'water' && edge < 1.6 && hash2(x, y, seed + 60) < 0.45) c = hash2(x, y, seed + 63) < 0.5 ? G[2] : G[3];
        else if (edge < 1.1 && RIM[m]) c = RIM[m]!;
        else if (edge < 2.2 && m === 'water') c = mix(c, WATER[3], 0.6);
      } else if (grassy && outside < 2) c = mix(c, G[4], 0.22); // grass shade along edges
      pm.set(x, y, c);
    }
  }
  return pm;
}
