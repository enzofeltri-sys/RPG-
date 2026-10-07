// Decor drawn by the game: trees, bushes, rocks, chests, stalls, wells,
// fences, haystacks… Same light (top left), 5-tone ramps and outline as
// the buildings. Foliage is built from many small leaf clumps shaded like
// little spheres, stones from faceted Voronoi cells. Each prop comes with
// an anchor: the point that sits on the ground at the prop's position
// (bottom center for upright props, center for flat ones).

import { OUTLINE, Pixmap, RGB, Ramp, cell, hash2, lit, mix, noise, ramp, seeded } from './pixmap';
import { renderGround } from './ground';

export interface PropArt {
  pm: Pixmap;
  anchorX: number;
  anchorY: number;
}

const LEAVES = ramp([66, 132, 62]);
const LEAVES_DARK = ramp([52, 108, 64]);
const NEEDLES = ramp([50, 112, 80], 0.6);
const BARK = ramp([112, 80, 58]);
const STONE = ramp([140, 136, 128], 0.5);
const MOSS = ramp([96, 138, 66]);
const WOOD = ramp([146, 100, 62]);
const WOOD_GREY = ramp([138, 120, 100], 0.5);
const STRAW = ramp([212, 172, 92]);
const IRON = ramp([104, 108, 122], 0.4);
const GOLD = ramp([232, 180, 60]);
const CLOTH_RED = ramp([184, 58, 60]);
const CLOTH_BLUE = ramp([70, 110, 180]);
const CANVAS = ramp([234, 226, 206], 0.4);
const WATER = ramp([62, 112, 150], 0.4);
const LINEN: RGB = [242, 236, 220];
const CLAY_P = ramp([170, 104, 70]);
const SHADOW: RGB = [20, 28, 20];
const FLOWERS: RGB[] = [
  [236, 92, 96],
  [248, 212, 92],
  [246, 244, 236],
  [178, 128, 220],
  [120, 170, 240],
  [250, 150, 70],
];

// ------------------------------------------------------------- helpers

// Light level of a sphere-like bump at the normalized offset (nx, ny):
// about 1 on the top left, -1.2 on the bottom right.
function sphere(nx: number, ny: number): number {
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  return (-0.45 * nx - 0.6 * ny + 0.66 * nz) * 1.8 - 0.75;
}

// A soft 2-px checker so tone changes are less blocky.
function dither(x: number, y: number, amount = 0.08): number {
  return (x + y) & 1 ? amount : -amount;
}

// Translucent ellipse shadow on the ground, a little offset to the right.
function groundShadow(pm: Pixmap, cx: number, cy: number, rx: number, ry: number, alpha = 76): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d > 1 || !pm.inside(x, y) || pm.filled(x, y)) continue;
      pm.set(x, y, SHADOW, Math.round(alpha * (d > 0.6 ? 0.7 : 1)));
    }
  }
}

// Selective outline: around opaque pixels only (soft shadows and glows
// stay soft), tinted by the color it borders so foliage gets a deep green
// edge and wood a deep brown one.
function outlineOpaque(pm: Pixmap, strength = 0.78): void {
  const solid = (x: number, y: number) => pm.inside(x, y) && pm.data[(y * pm.w + x) * 4 + 3] === 255;
  const add: [number, number, RGB][] = [];
  for (let y = 0; y < pm.h; y++) {
    for (let x = 0; x < pm.w; x++) {
      if (solid(x, y)) continue;
      for (const [dx, dy] of [
        [0, -1],
        [-1, 0],
        [1, 0],
        [0, 1],
      ]) {
        if (!solid(x + dx, y + dy)) continue;
        add.push([x, y, mix(pm.get(x + dx, y + dy)!, OUTLINE, strength)]);
        break;
      }
    }
  }
  add.forEach(([x, y, c]) => pm.set(x, y, c));
}

interface Clump {
  x: number;
  y: number;
  r: number;
}

// Leafy mass from clumps: a deep silhouette first, then each clump shaded
// as a small sphere (upper clumps first so the lower ones overlap them),
// a global light across the whole mass, leaf texture and ragged edges.
function foliage(pm: Pixmap, clumps: Clump[], r: Ramp, seed: number, box: { cx: number; cy: number; rx: number; ry: number }): void {
  const sorted = [...clumps].sort((a, b) => a.y - b.y);
  for (const c of sorted) {
    for (let y = Math.floor(c.y - c.r - 1); y <= Math.ceil(c.y + c.r + 1); y++) {
      for (let x = Math.floor(c.x - c.r - 1); x <= Math.ceil(c.x + c.r + 1); x++) {
        const d = Math.hypot(x - c.x, y - c.y) / (c.r + 1);
        if (d > 1 || (d > 0.86 && hash2(x, y, seed + 5) < 0.4)) continue;
        pm.set(x, y, r[4]);
      }
    }
  }
  for (const c of sorted) {
    for (let y = Math.floor(c.y - c.r); y <= Math.ceil(c.y + c.r); y++) {
      for (let x = Math.floor(c.x - c.r); x <= Math.ceil(c.x + c.r); x++) {
        const nx = (x - c.x) / c.r;
        const ny = (y - c.y) / c.r;
        const d = Math.hypot(nx, ny);
        if (d > 1 || (d > 0.8 && hash2(x, y, seed + 6) < 0.35)) continue;
        const local = sphere(nx * 0.95, ny * 0.95);
        const global = -((x - box.cx) / box.rx) * 0.25 - ((y - box.cy) / box.ry) * 0.35;
        // Leaf texture: small 2x2 leaf blobs rather than per-pixel noise.
        const leaf = (hash2(x >> 1, (y + (x >> 1)) >> 1, seed + 7) - 0.5) * 0.45;
        let level = local * 1.05 - 0.1 + global + leaf;
        if (d > 0.8 && ny > 0.25) level = Math.min(level, -0.5); // dark undercut
        pm.set(x, y, lit(r, level));
      }
    }
  }
  // Little two-pixel leaf highlights on the upper left of the top clumps.
  const rnd = seeded(seed * 13 + 1);
  for (const c of sorted) {
    if (c.y > box.cy + box.ry * 0.2) continue;
    const n = Math.round(c.r * 0.8);
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (1.05 + rnd() * 0.7);
      const rr = c.r * (0.3 + rnd() * 0.5);
      const x = Math.round(c.x + Math.cos(a) * rr);
      const y = Math.round(c.y + Math.sin(a) * rr);
      if (!pm.filled(x, y)) continue;
      pm.set(x, y, r[0]);
      if (pm.filled(x + 1, y)) pm.set(x + 1, y, r[1]);
    }
  }
}

// Clumps laid out in rows like a hand-drawn canopy: a back row near the
// crown, a wide middle row and a front row, jittered per seed.
function dome(seed: number, cx: number, cy: number, rx: number, ry: number, rows: [number, number, number][][]): Clump[] {
  const rnd = seeded(seed);
  const out: Clump[] = [];
  for (const row of rows) {
    for (const [u, v, r] of row) {
      out.push({ x: cx + (u + (rnd() - 0.5) * 0.12) * rx, y: cy + (v + (rnd() - 0.5) * 0.1) * ry, r: r * rx * (0.92 + rnd() * 0.16) });
    }
  }
  return out;
}

const TREE_ROWS: [number, number, number][][] = [
  [
    [-0.32, -0.55, 0.42],
    [0.3, -0.6, 0.4],
    [0, -0.7, 0.36],
  ],
  [
    [-0.58, -0.08, 0.42],
    [0.02, -0.18, 0.46],
    [0.58, -0.04, 0.42],
  ],
  [
    [-0.36, 0.42, 0.42],
    [0.36, 0.46, 0.42],
    [0, 0.56, 0.36],
  ],
];

const BUSH_ROWS: [number, number, number][][] = [
  [
    [-0.3, -0.35, 0.5],
    [0.3, -0.4, 0.48],
  ],
  [
    [-0.5, 0.25, 0.48],
    [0.05, 0.2, 0.52],
    [0.52, 0.3, 0.46],
  ],
];

function barkPixel(x: number, y: number, x0: number, x1: number): RGB {
  const k = (x - x0) / Math.max(1, x1 - x0); // 0 left .. 1 right
  const groove = hash2(x, Math.floor(y / 3), 91) < 0.25 ? -0.55 : 0;
  return lit(BARK, 0.55 - k * 1.5 + groove + (hash2(x, y, 92) - 0.5) * 0.3);
}

// ---------------------------------------------------------------- plants

function tree(size: number, seed: number, fruit = false): PropArt {
  const W = size + 6;
  const canopyH = Math.round(size * 0.9);
  const trunkH = Math.round(size * 0.32);
  const pad = Math.round(size * 0.16); // room for the crown clumps
  const H = canopyH + trunkH + pad;
  const pm = new Pixmap(W, H);
  const cx = W / 2;
  const base = H - 3;
  groundShadow(pm, cx + 3, base, size * 0.42, Math.max(3, size * 0.09));
  // Trunk with flared roots and a fork disappearing into the leaves.
  const tw = size > 36 ? 6 : 4;
  const tx0 = Math.round(cx - tw / 2);
  const fork = pad + canopyH - 10;
  for (let y = fork; y <= base; y++) {
    const flare = y >= base - 1 ? 2 : y >= base - 3 ? 1 : 0;
    for (let x = tx0 - flare; x < tx0 + tw + flare; x++) pm.set(x, y, barkPixel(x, y, tx0 - flare, tx0 + tw + flare - 1));
  }
  for (let i = 0; i < 6; i++) {
    pm.set(tx0 - 1 - Math.floor(i / 2), fork - i, barkPixel(tx0, fork - i, tx0, tx0 + tw));
    pm.set(tx0 + tw + Math.floor(i / 2), fork - i, barkPixel(tx0 + tw, fork - i, tx0, tx0 + tw));
  }
  // Canopy.
  const box = { cx, cy: pad + canopyH * 0.46, rx: size * 0.47, ry: canopyH * 0.44 };
  const clumps = dome(seed, box.cx, box.cy, box.rx, box.ry, TREE_ROWS);
  foliage(pm, clumps, LEAVES, seed, box);
  // The canopy's shadow on the trunk.
  const shadeFrom = Math.round(box.cy + box.ry - 1);
  for (let y = shadeFrom; y < shadeFrom + 6; y++) {
    for (let x = tx0 - 1; x < tx0 + tw + 1; x++) {
      const c = pm.get(x, y);
      if (c && pm.data[(y * pm.w + x) * 4 + 3] === 255) pm.set(x, y, mix(c, [30, 26, 36], 0.45 - (y - shadeFrom) * 0.07));
    }
  }
  if (fruit) {
    const rnd = seeded(seed + 77);
    for (let i = 0; i < size / 4; i++) {
      const a = rnd() * Math.PI * 2;
      const rr = rnd() * 0.8;
      const x = Math.round(box.cx + Math.cos(a) * box.rx * rr);
      const y = Math.round(box.cy + Math.sin(a) * box.ry * rr);
      if (!pm.filled(x, y)) continue;
      pm.set(x, y, CLOTH_RED[0]);
      pm.set(x + 1, y, CLOTH_RED[1]);
      pm.set(x, y + 1, CLOTH_RED[2]);
      pm.set(x + 1, y + 1, CLOTH_RED[3]);
    }
  }
  outlineOpaque(pm);
  return { pm, anchorX: Math.round(cx), anchorY: base };
}

function pine(size: number, seed: number): PropArt {
  const W = Math.round(size * 0.72) + 6;
  const H = size + 7;
  const pm = new Pixmap(W, H);
  const cx = W / 2 - 0.5;
  const base = H - 3;
  groundShadow(pm, cx + 3, base, W * 0.36, 3);
  for (let y = base - 8; y <= base; y++) {
    for (let x = Math.round(cx) - 1; x <= Math.round(cx) + 1; x++) pm.set(x, y, barkPixel(x, y, Math.round(cx) - 1, Math.round(cx) + 1));
  }
  pm.set(Math.round(cx) - 2, base, BARK[2]);
  pm.set(Math.round(cx) + 2, base, BARK[3]);
  // Tiers from the bottom up, so each upper tier overlaps the one below.
  const tiers = size > 40 ? 5 : 4;
  const crownH = base - 7;
  const edges: { y: number; half: number }[] = [];
  for (let t = tiers - 1; t >= 0; t--) {
    const top = Math.round((t / tiers) * crownH * 0.86);
    const bottom = Math.round(top + crownH * 0.34 + t * 1.2);
    const maxHalf = (W / 2 - 2) * (0.45 + 0.55 * ((t + 1) / tiers));
    if (t < tiers - 1) edges.push({ y: bottom, half: maxHalf });
    for (let y = top; y <= bottom + 1; y++) {
      const k = (y - top) / Math.max(1, bottom - top);
      const half = maxHalf * Math.pow(Math.min(1, k), 0.85);
      for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
        const nx = (x - cx) / Math.max(1, maxHalf);
        // Jagged bough tips along the lower edge.
        const notch = ((x % 3) + 3) % 3 !== 0;
        if (y === bottom + 1 && notch) continue;
        if (y === bottom && notch && Math.abs(nx) > 0.75) continue;
        // Needle sprays: short diagonal strokes going down and outwards.
        const spray = Math.abs(nx) > 0.25 && (((x - Math.round(cx)) * Math.sign(nx) - y * 2) % 7 + 7) % 7 === 0 ? 0.45 : 0;
        const needles = (hash2(x >> 1, y >> 1, seed) - 0.5) * 0.25 + spray;
        pm.set(x, y, lit(NEEDLES, -nx * 1.1 + (0.45 - k * 0.8) + needles));
      }
    }
  }
  // Each tier's shadow on the tier below, just under its jagged edge.
  for (const { y, half } of edges) {
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      for (let j = 2; j <= 3; j++) {
        const c = pm.get(x, y + j);
        if (c && pm.data[((y + j) * pm.w + x) * 4 + 3] === 255) pm.set(x, y + j, mix(c, [16, 34, 34], j === 2 ? 0.4 : 0.2));
      }
    }
  }
  outlineOpaque(pm);
  return { pm, anchorX: Math.round(cx), anchorY: base };
}

function bush(w: number, seed: number, kind: 'plain' | 'berries' | 'flowers' = 'plain'): PropArt {
  const H = Math.round(w * 0.8) + 3;
  const pm = new Pixmap(w + 4, H);
  const cx = (w + 4) / 2;
  const base = H - 2;
  groundShadow(pm, cx + 2, base, w * 0.5, 2.5);
  const box = { cx, cy: base - w * 0.36, rx: w * 0.5, ry: w * 0.36 };
  const clumps = dome(seed, box.cx, box.cy, box.rx, box.ry, BUSH_ROWS);
  foliage(pm, clumps, kind === 'plain' ? LEAVES : LEAVES_DARK, seed, box);
  if (kind !== 'plain') {
    const rnd = seeded(seed + 31);
    for (let i = 0; i < Math.round(w / 2.5); i++) {
      const x = Math.round(box.cx + (rnd() - 0.5) * box.rx * 1.6);
      const y = Math.round(box.cy + (rnd() - 0.6) * box.ry * 1.5);
      if (!pm.filled(x, y) || !pm.filled(x + 1, y + 1)) continue;
      if (kind === 'berries') {
        pm.set(x, y, [214, 52, 70]);
        pm.set(x + 1, y, [160, 30, 56]);
        pm.set(x, y + 1, [160, 30, 56]);
        pm.set(x, y - 1, [255, 170, 170]);
      } else {
        const c = FLOWERS[Math.floor(rnd() * 4)];
        pm.set(x - 1, y, mix(c, [0, 0, 0], 0.15));
        pm.set(x + 1, y, mix(c, [0, 0, 0], 0.15));
        pm.set(x, y - 1, mix(c, [255, 255, 255], 0.3));
        pm.set(x, y + 1, mix(c, [0, 0, 0], 0.3));
        pm.set(x, y, [250, 220, 100]);
      }
    }
  }
  outlineOpaque(pm);
  return { pm, anchorX: Math.round(cx), anchorY: base };
}

function tallGrass(seed: number): PropArt {
  const pm = new Pixmap(14, 12);
  const rnd = seeded(seed + 3);
  const G = ramp([96, 156, 70]);
  for (let i = 0; i < 9; i++) {
    const x0 = 2 + Math.floor(rnd() * 10);
    const h = 5 + Math.floor(rnd() * 6);
    const lean = rnd() < 0.5 ? -1 : 1;
    for (let j = 0; j < h; j++) {
      const x = x0 + (j > h * 0.6 ? lean : 0);
      pm.set(x, 10 - j, lit(G, (j / h) * 1.4 - 0.6 + (x0 % 2 ? 0.2 : -0.1)));
    }
  }
  return { pm, anchorX: 7, anchorY: 10 };
}

function wildFlowers(seed: number): PropArt {
  const pm = new Pixmap(14, 10);
  const rnd = seeded(seed + 9);
  const G = ramp([88, 148, 66]);
  for (let i = 0; i < 6; i++) {
    const x = 2 + Math.floor(rnd() * 10);
    const h = 3 + Math.floor(rnd() * 4);
    for (let j = 0; j < h; j++) pm.set(x, 8 - j, G[j < 2 ? 3 : 2]);
    pm.set(x - 1, 8 - Math.floor(h / 2), G[1]);
    const c = FLOWERS[Math.floor(rnd() * FLOWERS.length)];
    const fy = 8 - h;
    pm.set(x - 1, fy, c);
    pm.set(x + 1, fy, mix(c, [0, 0, 0], 0.2));
    pm.set(x, fy - 1, mix(c, [255, 255, 255], 0.25));
    pm.set(x, fy + 1, mix(c, [0, 0, 0], 0.3));
    pm.set(x, fy, [250, 222, 110]);
  }
  return { pm, anchorX: 7, anchorY: 8 };
}

function mushrooms(): PropArt {
  const pm = new Pixmap(16, 14);
  groundShadow(pm, 8, 11, 6, 1.6);
  const cap = (x: number, y: number, w: number, h: number) => {
    const sx = Math.round(x + w / 2) - 1;
    for (let j = 0; j < Math.round(h * 0.9); j++) {
      pm.set(sx, y + h - 1 + j, [236, 228, 206]);
      pm.set(sx + 1, y + h - 1 + j, [196, 184, 162]);
    }
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const nx = (i - w / 2 + 0.5) / (w / 2);
        const ny = (j - h + 0.5) / h;
        if (nx * nx + ny * ny > 1) continue;
        pm.set(x + i, y + j, j === h - 1 ? [120, 40, 46] : lit(CLOTH_RED, sphere(nx * 0.9, ny * 0.9 + 0.3) + 0.2));
      }
    }
    pm.set(x + Math.round(w * 0.3), y + 1, LINEN);
    pm.set(x + Math.round(w * 0.65), y + Math.round(h * 0.45), LINEN);
    if (w > 6) pm.set(x + Math.round(w * 0.2), y + Math.round(h * 0.6), LINEN);
  };
  cap(9, 6, 5, 3);
  cap(2, 2, 8, 5);
  outlineOpaque(pm);
  return { pm, anchorX: 8, anchorY: 11 };
}

// ---------------------------------------------------------------- stones

function rock(w: number, seed: number, mossy = true): PropArt {
  const h = Math.round(w * 0.7);
  const pm = new Pixmap(w + 4, h + 4);
  const cx = (w + 4) / 2;
  const base = h + 1;
  groundShadow(pm, cx + 2, base, w * 0.55, 2.5);
  const rx = w / 2;
  const ry = h / 2 + 1;
  const cy = base - ry + 1;
  for (let y = 0; y <= base; y++) {
    for (let x = 0; x < pm.w; x++) {
      const nx = (x - cx + 0.5) / rx;
      const ny = (y - cy) / ry;
      const wob = (noise(x, y, 4, seed) - 0.5) * 0.35;
      if (nx * nx + ny * ny > 1 + wob) continue;
      // Flat facets: each Voronoi cell tilts the surface its own way.
      const f = cell(x, y, Math.max(5, w * 0.32), seed + 3, 1.2);
      const tiltX = (hash2(f.id, 1, seed) - 0.5) * 0.8;
      const tiltY = (hash2(f.id, 2, seed) - 0.5) * 0.6;
      const sx = Math.max(-1, Math.min(1, nx * 0.85 + tiltX * 0.4));
      const sy = Math.max(-1, Math.min(1, ny * 0.85 + tiltY * 0.4));
      let level = sphere(sx, sy) * 0.8 + (hash2(x, y, seed + 1) - 0.5) * 0.2 + dither(x, y, 0.05);
      if (f.d2 - f.d1 < 0.06 && ny > -0.6) level -= 0.6; // facet edges
      let c = lit(STONE, level);
      if (mossy && ny < -0.15 && noise(x, y, 3, seed + 9) > 0.55) c = lit(MOSS, level + 0.2);
      if (y === base) c = STONE[4];
      pm.set(x, y, c);
    }
  }
  // A crack.
  let kx = Math.round(cx + w * 0.1);
  for (let y = Math.round(cy - ry * 0.3); y < Math.round(cy + ry * 0.4); y++) {
    if (pm.filled(kx, y)) pm.set(kx, y, STONE[4]);
    if (hash2(kx, y, seed) < 0.4) kx += 1;
  }
  // A pebble alongside.
  if (w > 16) {
    const px = Math.round(cx + rx) - 1;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if (!(j === 0 && (i === 0 || i === 3))) pm.set(px + i, base - 2 + j, lit(STONE, j === 0 ? 0.5 : i === 3 ? -0.6 : 0));
  }
  outlineOpaque(pm);
  return { pm, anchorX: Math.round(cx), anchorY: base };
}

function crystal(): PropArt {
  const pm = new Pixmap(18, 22);
  const C = ramp([96, 196, 226], 0.3);
  const solid = new Pixmap(18, 22);
  const shards: [number, number, number, number][] = [
    [9, 2, 16, 2],
    [5, 8, 10, 1],
    [13, 7, 11, 1],
    [7, 13, 6, 1],
  ];
  for (const [x, top, h, half] of shards) {
    for (let y = top; y < top + h; y++) {
      const hw = Math.min(half, y - top);
      const t = (y - top) / h;
      for (let i = -hw; i <= hw; i++) solid.set(x + i, y, lit(C, i < 0 ? 0.8 - t * 0.3 : i === 0 ? 0.3 - t * 0.5 : -0.6 - t * 0.4));
    }
    solid.set(x, top, [240, 255, 255]);
    if (half > 1) solid.set(x - 1, top + 3, [240, 255, 255]);
  }
  for (let x = 4; x < 15; x++) solid.set(x, 18, lit(STONE, x < 8 ? 0.3 : -0.4));
  outlineOpaque(solid);
  halo(pm, 9, 11, 11, [150, 230, 255], 150);
  pm.blit(solid, 0, 0);
  return { pm, anchorX: 9, anchorY: 18 };
}

// ---------------------------------------------------------------- objects

function chest(open: boolean): PropArt {
  const pm = new Pixmap(18, 18);
  groundShadow(pm, 10, 15, 8, 2);
  const x0 = 1;
  const x1 = 16;
  const bodyTop = 8;
  const bottom = 15;
  for (let y = bodyTop; y <= bottom; y++) {
    for (let x = x0; x <= x1; x++) pm.set(x, y, lit(WOOD, (x === x0 ? 0.5 : x === x1 ? -0.7 : 0.05) + ((y - bodyTop) % 3 === 0 ? -0.5 : 0) + (hash2(x, y, 5) - 0.5) * 0.2));
  }
  for (const bx of [x0 + 3, x1 - 3]) {
    for (let y = bodyTop; y <= bottom; y++) pm.set(bx, y, y === bodyTop ? IRON[0] : IRON[2]);
    pm.set(bx, bottom - 1, IRON[0]);
  }
  pm.hline(x0, x1, bottom, WOOD[4]);
  if (open) {
    // Lid thrown back, coins heaped inside, a few sparkles.
    for (let y = 1; y <= 5; y++) for (let x = x0; x <= x1; x++) pm.set(x, y, lit(WOOD, y === 1 ? 0.3 : y === 5 ? -0.8 : -0.3));
    for (let y = 6; y < bodyTop; y++) for (let x = x0 + 1; x < x1; x++) pm.set(x, y, [44, 30, 28]);
    for (let x = x0 + 2; x < x1 - 1; x++) {
      const hgt = 2 - Math.round(Math.abs(x - 8.5) / 4);
      for (let j = 0; j <= hgt; j++) pm.set(x, bodyTop - j, lit(GOLD, (x % 3 === 0 ? 0.8 : 0.1) - j * 0.2 + (x > 11 ? -0.5 : 0)));
    }
    pm.set(6, 4, [255, 252, 220]);
    pm.set(12, 5, [255, 252, 220]);
    for (const [x, y] of [[6, 3], [6, 5], [5, 4], [7, 4]]) pm.set(x, y, [255, 236, 170]);
  } else {
    // Domed lid.
    for (let y = 3; y < bodyTop; y++) {
      const ins = y === 3 ? 2 : y === 4 ? 1 : 0;
      for (let x = x0 + ins; x <= x1 - ins; x++) pm.set(x, y, lit(WOOD, (y === 3 ? 0.7 : y === 4 ? 0.35 : y === bodyTop - 1 ? -0.6 : 0) + (x === x0 + ins ? 0.3 : x === x1 - ins ? -0.6 : 0)));
    }
    for (const bx of [x0 + 3, x1 - 3]) for (let y = 3; y < bodyTop; y++) if (pm.filled(bx, y)) pm.set(bx, y, y < 5 ? IRON[0] : IRON[1]);
    // Lock plate.
    pm.rect(7, 6, 4, 4, GOLD[2]);
    pm.hline(7, 10, 6, GOLD[0]);
    pm.set(7, 7, GOLD[1]);
    pm.set(9, 8, [40, 28, 26]);
  }
  outlineOpaque(pm);
  return { pm, anchorX: 9, anchorY: 15 };
}

// A trestle stall with a scalloped striped awning, baskets on the counter
// and a crate below.
function stall(w: number, cloth: Ramp, seed: number): PropArt {
  const H = 30;
  const pm = new Pixmap(w + 4, H);
  const x0 = 1;
  const x1 = w;
  const base = H - 3;
  groundShadow(pm, (w + 4) / 2 + 2, base, w * 0.5, 3);
  // Posts.
  for (const px of [x0 + 1, x1 - 2]) {
    for (let y = 6; y <= base; y++) {
      pm.set(px, y, y < 14 ? WOOD[4] : WOOD[1]);
      pm.set(px + 1, y, y < 14 ? WOOD[4] : WOOD[3]);
    }
  }
  // Counter: top board lit, front planks.
  const cTop = base - 9;
  for (let y = cTop; y <= base - 1; y++) {
    for (let x = x0; x <= x1; x++) {
      const front = y > cTop + 1;
      pm.set(x, y, front ? lit(WOOD, (x - x0) % 6 === 0 ? -0.6 : x === x1 ? -0.5 : (hash2(Math.floor((x - x0) / 6), 1, seed) - 0.5) * 0.5) : y === cTop ? WOOD[0] : WOOD[1]);
    }
  }
  pm.hline(x0, x1, cTop + 2, WOOD[4]);
  // Baskets of goods on the counter.
  const rnd = seeded(seed + 4);
  const goods: [RGB, RGB][] = [
    [[222, 72, 60], [168, 40, 44]],
    [[140, 192, 92], [86, 140, 62]],
    [[236, 186, 100], [190, 134, 70]],
    [[246, 206, 80], [200, 150, 50]],
    [[160, 110, 200], [112, 72, 156]],
  ];
  for (let x = x0 + 2; x + 5 <= x1 - 1; x += 7) {
    const g = goods[Math.floor(rnd() * goods.length)];
    pm.hline(x, x + 5, cTop - 1, WOOD[3]);
    for (let i = 0; i < 6; i++) pm.set(x + i, cTop - 2, g[(i + x) % 2]);
    for (let i = 1; i < 5; i++) pm.set(x + i, cTop - 3, i === 1 ? mix(g[0], [255, 255, 255], 0.35) : g[i % 2]);
  }
  // Awning: stripes, sloping front, scalloped hem.
  const awnTop = 2;
  const awnBottom = 9;
  const stripeRamp = (x: number) => (Math.floor((x - x0 + 1) / 4) % 2 === 0 ? cloth : CANVAS);
  for (let y = awnTop; y <= awnBottom; y++) {
    const ins = Math.max(0, 2 - (y - awnTop));
    for (let x = x0 - 1 + ins; x <= x1 + 1 - ins; x++) {
      const k = (y - awnTop) / (awnBottom - awnTop);
      pm.set(x, y, lit(stripeRamp(x), 0.6 - k * 0.9 + ((x - x0 + 1) % 4 === 0 ? -0.15 : 0)));
    }
  }
  for (let x = x0 - 1; x <= x1 + 1; x++) {
    const sc = (x - x0 + 1) % 4;
    if (sc === 1 || sc === 2) {
      pm.set(x, awnBottom + 1, stripeRamp(x)[3]);
      pm.set(x, awnBottom + 2, stripeRamp(x)[4]);
    }
  }
  // A crate below the counter on the left.
  const kx = x0 + 3;
  for (let y = base - 5; y <= base; y++) for (let x = kx; x < kx + 7; x++) pm.set(x, y, lit(WOOD_GREY, y === base - 5 ? 0.6 : x === kx + 6 ? -0.6 : (x + y) % 6 === 0 ? -0.4 : 0));
  outlineOpaque(pm);
  return { pm, anchorX: Math.round((w + 4) / 2), anchorY: base };
}

// A round fieldstone wall seen from above-front: lit rim, a front face of
// stones, the dark water inside.
function stoneRing(pm: Pixmap, x0: number, y0: number, w: number, h: number, seed: number): void {
  const cx = x0 + w / 2 - 0.5;
  const rx = w / 2;
  const rimRy = h * 0.32;
  const rimCy = y0 + rimRy;
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const nx = (x - cx) / rx;
      if (Math.abs(nx) > 1) continue;
      const arc = Math.sqrt(1 - nx * nx);
      if (y < rimCy - arc * rimRy) continue;
      const frontY = rimCy + arc * rimRy;
      const inx = (x - cx) / (rx - 2.5);
      if (Math.abs(inx) < 1) {
        const ia = Math.sqrt(1 - inx * inx) * (rimRy - 1.5);
        if (y > rimCy - ia && y < rimCy + ia) {
          const d = y - (rimCy - ia);
          pm.set(x, y, d < 2 ? [24, 30, 40] : lit(WATER, -0.7 + (hash2(x, y, seed) < 0.1 ? 0.8 : 0)));
          continue;
        }
      }
      const f = cell(x, y, 4, seed + 11, 1.4);
      let level = -nx * 0.6 + (f.d2 - f.d1 < 0.12 ? -0.8 : (hash2(f.id, 1, 3) - 0.5) * 0.6);
      if (y <= frontY && y < rimCy + 1) level += 0.5; // rim top
      if (y > frontY) level -= 0.15 + (y - frontY) * 0.05; // front face
      if (y > y0 + h - 2) level -= 0.4;
      pm.set(x, y, lit(STONE, level));
    }
  }
}

function well(seed: number): PropArt {
  const pm = new Pixmap(28, 36);
  const base = 33;
  groundShadow(pm, 16, base, 12, 2.5);
  stoneRing(pm, 2, 21, 24, 13, seed);
  // Posts and the windlass with its crank.
  for (const px of [4, 22]) {
    for (let y = 8; y <= 27; y++) {
      pm.set(px, y, WOOD[1]);
      pm.set(px + 1, y, WOOD[3]);
    }
  }
  for (let x = 6; x <= 21; x++) {
    pm.set(x, 13, WOOD[1]);
    pm.set(x, 14, WOOD[3]);
  }
  for (let x = 11; x <= 16; x++) pm.set(x, 13, [180, 160, 120]); // rope coils
  pm.set(24, 13, IRON[1]);
  pm.set(25, 13, IRON[1]);
  pm.set(25, 14, IRON[2]);
  pm.set(25, 15, WOOD[2]);
  // Rope and bucket.
  for (let y = 15; y <= 21; y++) pm.set(14, y, [176, 156, 118]);
  for (let y = 22; y <= 25; y++) for (let x = 12; x <= 16; x++) pm.set(x, y, lit(WOOD, y === 22 ? 0.5 : x === 16 ? -0.6 : x === 12 ? 0.3 : 0));
  pm.hline(12, 16, 24, IRON[2]);
  // Little thatched roof.
  for (let y = 1; y <= 9; y++) {
    const ins = Math.max(0, 8 - y * 2);
    for (let x = 1 + ins; x <= 26 - ins; x++) {
      const strand = hash2(x, Math.floor(y / 3), seed + 2) - 0.5;
      pm.set(x, y, lit(STRAW, 0.5 - (y / 9) * 0.9 + strand * 0.7 + (x < 14 ? 0.15 : -0.15) + (y % 3 === 0 ? -0.35 : 0)));
    }
  }
  pm.hline(2, 25, 9, STRAW[4]);
  pm.hline(9, 18, 1, [150, 110, 64]);
  outlineOpaque(pm);
  return { pm, anchorX: 14, anchorY: base };
}

function spokedWheel(pm: Pixmap, cx: number, cy: number, r: number): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y);
      if (d > r + 0.3) continue;
      if (d > r - 1.2) pm.set(cx + x, cy + y, lit(WOOD, (-x / r) * 0.6 - (y / r) * 0.6 - 0.2));
      else if (d < 1.2) pm.set(cx + x, cy + y, IRON[1]);
      else if (x === 0 || y === 0 || Math.abs(Math.abs(x) - Math.abs(y)) < 0.5) pm.set(cx + x, cy + y, WOOD[2]);
    }
  }
}

function wagon(seed: number): PropArt {
  const pm = new Pixmap(36, 26);
  const base = 23;
  groundShadow(pm, 19, base, 16, 2.5);
  // Hay load.
  for (let y = 2; y <= 10; y++) {
    const ins = y < 4 ? 3 - (y - 2) : 0;
    for (let x = 5 + ins; x <= 26 - ins; x++) pm.set(x, y, lit(STRAW, 0.6 - (y - 2) * 0.12 + (hash2(x, y >> 1, seed) - 0.5) * 0.8 + (x > 22 ? -0.4 : 0)));
  }
  for (const [x, y] of [[6, 1], [12, 0], [19, 1], [24, 2], [9, 1]]) pm.set(x, y, STRAW[1]);
  // Bed: plank sides with stakes.
  for (let y = 9; y <= 16; y++) {
    for (let x = 3; x <= 28; x++) {
      const stake = (x - 3) % 6 === 0;
      pm.set(x, y, stake ? lit(WOOD, x === 3 ? 0.3 : -0.4) : lit(WOOD, (y === 9 ? 0.6 : (y - 9) % 3 === 2 ? -0.6 : 0) + (x > 25 ? -0.3 : 0)));
    }
  }
  // Shafts.
  for (let x = 29; x <= 35; x++) {
    pm.set(x, 14 + Math.floor((x - 29) / 3), WOOD[1]);
    pm.set(x, 15 + Math.floor((x - 29) / 3), WOOD[3]);
  }
  spokedWheel(pm, 9, 18, 5);
  spokedWheel(pm, 23, 18, 5);
  outlineOpaque(pm);
  return { pm, anchorX: 18, anchorY: base };
}

function scarecrow(seed: number): PropArt {
  const pm = new Pixmap(24, 34);
  const base = 31;
  groundShadow(pm, 13, base, 5, 1.6);
  for (let y = 8; y <= base; y++) {
    pm.set(11, y, WOOD[1]);
    pm.set(12, y, WOOD[3]);
  }
  for (let x = 2; x <= 21; x++) {
    pm.set(x, 13, WOOD[1]);
    pm.set(x, 14, WOOD[3]);
  }
  // Patched shirt with a tattered hem.
  const SHIRT = ramp([150, 98, 72]);
  for (let y = 12; y <= 22; y++) {
    const hw = y < 15 ? 8 : 4;
    for (let x = 12 - hw; x <= 11 + hw; x++) {
      if (y === 22 && x % 2 === 0) continue;
      pm.set(x, y, lit(SHIRT, (x < 9 ? 0.4 : x > 15 ? -0.5 : 0) + (y === 12 ? 0.3 : 0) + dither(x, y, 0.05)));
    }
  }
  for (let y = 16; y <= 18; y++) for (let x = 13; x <= 15; x++) pm.set(x, y, x === 15 ? [70, 110, 80] : [96, 140, 100]);
  pm.set(14, 17, [60, 46, 40]);
  pm.hline(8, 15, 19, [96, 70, 44]); // rope belt
  for (const [x, y] of [[2, 15], [3, 16], [21, 15], [20, 16], [9, 23], [13, 23], [11, 24]]) pm.set(x, y, STRAW[1]);
  // Sack head with a stitched face, straw hat.
  const SACK = ramp([204, 176, 128]);
  for (let y = 5; y <= 11; y++) for (let x = 8; x <= 15; x++) pm.set(x, y, lit(SACK, (x < 10 ? 0.4 : x > 13 ? -0.4 : 0.05) + (y === 11 ? -0.4 : 0)));
  pm.set(10, 8, [50, 36, 30]);
  pm.set(13, 8, [50, 36, 30]);
  pm.hline(10, 13, 10, [120, 80, 56]);
  pm.set(11, 10, [80, 56, 40]);
  const HAT = ramp([188, 150, 84]);
  for (let x = 5; x <= 18; x++) pm.set(x, 5, lit(HAT, x < 9 ? 0.4 : x > 15 ? -0.4 : 0));
  for (let y = 1; y <= 4; y++) for (let x = 8; x <= 15; x++) pm.set(x, y, lit(HAT, (y === 1 ? 0.5 : 0) + (x === 8 ? 0.3 : x === 15 ? -0.5 : 0)));
  pm.hline(8, 15, 4, [150, 50, 50]); // hat band
  // A crow perched on the arm.
  if (seed % 2 === 1) {
    pm.rect(18, 10, 3, 3, [40, 38, 48]);
    pm.set(17, 10, [70, 68, 84]);
    pm.set(16, 10, [230, 180, 60]);
    pm.set(21, 12, [40, 38, 48]);
  }
  outlineOpaque(pm);
  return { pm, anchorX: 12, anchorY: base };
}

function barrel(): PropArt {
  const pm = new Pixmap(14, 18);
  const base = 16;
  groundShadow(pm, 8, base, 6, 1.6);
  for (let y = 3; y <= base; y++) {
    const t = (y - 3) / (base - 3);
    const bulge = Math.round(Math.sin(t * Math.PI) * 1.2);
    const x0 = 2 - bulge;
    const x1 = 11 + bulge;
    for (let x = x0; x <= x1; x++) {
      const nx = (x - (x0 + x1) / 2) / ((x1 - x0) / 2);
      pm.set(x, y, lit(WOOD, -nx * 0.9 + 0.1 + ((x - 2) % 3 === 0 ? -0.35 : 0)));
    }
  }
  for (const hy of [5, 13]) {
    for (let x = 1; x <= 12; x++) {
      if (!pm.filled(x, hy)) continue;
      pm.set(x, hy, lit(IRON, -((x - 6.5) / 5.5) * 0.9 + 0.2));
    }
  }
  // Top: lid boards in an ellipse.
  for (let y = 0; y <= 4; y++) {
    for (let x = 2; x <= 11; x++) {
      const nx = (x - 6.5) / 5;
      const ny = (y - 2) / 2.2;
      const d = nx * nx + ny * ny;
      if (d > 1) continue;
      pm.set(x, y, d > 0.55 ? WOOD[3] : lit(WOOD, 0.5 + ((x - 2) % 3 === 0 ? -0.4 : 0)));
    }
  }
  outlineOpaque(pm);
  return { pm, anchorX: 7, anchorY: base };
}

function crate(): PropArt {
  const pm = new Pixmap(16, 17);
  const base = 15;
  groundShadow(pm, 9, base, 7, 1.6);
  // Top face (seen from above), then the framed front face.
  for (let y = 1; y <= 4; y++) for (let x = 2; x <= 14; x++) pm.set(x, y, lit(WOOD_GREY, 0.7 - (y - 1) * 0.12 + ((x - 2) % 4 === 0 ? -0.4 : 0)));
  for (let y = 5; y <= base; y++) {
    for (let x = 2; x <= 14; x++) {
      const frame = x <= 3 || x >= 13 || y <= 6 || y >= base - 1;
      pm.set(x, y, frame ? lit(WOOD, x <= 3 ? 0.4 : x >= 13 ? -0.6 : y <= 6 ? 0.2 : -0.4) : lit(WOOD_GREY, -0.1 + ((y - 7) % 3 === 2 ? -0.5 : 0)));
    }
  }
  for (let i = 0; i < 8; i++) {
    pm.set(4 + Math.round(i * 1.1), base - 2 - i, WOOD[1]);
    pm.set(5 + Math.round(i * 1.1), base - 2 - i, WOOD[3]);
  }
  for (const [x, y] of [[3, 6], [13, 6], [3, base - 1], [13, base - 1]]) pm.set(x, y, IRON[1]);
  outlineOpaque(pm);
  return { pm, anchorX: 8, anchorY: base };
}

function sacks(): PropArt {
  const pm = new Pixmap(18, 14);
  const base = 12;
  groundShadow(pm, 10, base, 8, 1.6);
  const SACK = ramp([196, 170, 124], 0.6);
  const sack = (x0: number, y0: number, w: number, h: number) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = (x - w / 2 + 0.5) / (w / 2);
        const ny = (y - h * 0.55) / (h * 0.55);
        if (nx * nx + ny * ny > 1.05 && y > 1) continue;
        if (y <= 1 && Math.abs(nx) > 0.35) continue; // tied neck
        pm.set(x0 + x, y0 + y, lit(SACK, sphere(nx * 0.9, ny * 0.8) * 0.8 + 0.1));
      }
    }
    pm.hline(x0 + Math.round(w / 2) - 1, x0 + Math.round(w / 2), y0 + 2, [120, 92, 60]);
  };
  sack(9, 3, 8, 10);
  sack(2, 1, 9, 12);
  outlineOpaque(pm);
  return { pm, anchorX: 9, anchorY: base };
}

function haystack(seed: number): PropArt {
  const pm = new Pixmap(26, 22);
  const base = 19;
  groundShadow(pm, 14, base, 12, 2.5);
  for (let y = 1; y <= base; y++) {
    for (let x = 1; x <= 24; x++) {
      const nx = (x - 12.5) / 11.5;
      const ny = (y - 13) / 12;
      if (nx * nx + ny * ny > 1) continue;
      const strand = (hash2(x, Math.floor(y / 2), seed) - 0.5) * 0.7 + (hash2(x, y, seed + 1) < 0.08 ? -0.6 : 0);
      pm.set(x, y, lit(STRAW, sphere(nx * 0.9, ny * 0.9) * 0.75 + strand + dither(x, y, 0.05)));
    }
  }
  // Loose strands around the foot and on top.
  const rnd = seeded(seed + 8);
  for (let i = 0; i < 10; i++) {
    const x = 2 + Math.floor(rnd() * 22);
    pm.set(x, base + (rnd() < 0.5 ? 0 : -1), STRAW[rnd() < 0.5 ? 1 : 3]);
  }
  pm.set(12, 1, STRAW[0]);
  pm.set(14, 1, STRAW[1]);
  // A pitchfork leaning on it.
  for (let i = 0; i < 14; i++) pm.set(19 + Math.floor(i / 4), base - 1 - i, WOOD[2]);
  pm.set(22, base - 15, IRON[1]);
  pm.set(21, base - 16, IRON[1]);
  pm.set(23, base - 16, IRON[1]);
  pm.set(22, base - 16, IRON[0]);
  outlineOpaque(pm);
  return { pm, anchorX: 13, anchorY: base };
}

function woodpile(): PropArt {
  const pm = new Pixmap(24, 16);
  const base = 13;
  groundShadow(pm, 13, base, 11, 1.8);
  const log = (x: number, y: number) => {
    // Round end of a log: rings, bark rim.
    for (let j = -2; j <= 2; j++) {
      for (let i = -2; i <= 2; i++) {
        const d = Math.hypot(i, j);
        if (d > 2.4) continue;
        pm.set(Math.round(x + i), y + j, d > 1.7 ? lit(BARK, -i * 0.3 - j * 0.3 - 0.2) : d < 0.8 ? [176, 128, 80] : [216, 176, 120]);
      }
    }
  };
  for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) log(4 + i * 5 + row * 2.5, base - 2 - row * 4);
  // A hatchet stuck in the top log.
  pm.vline(13, 1, 3, WOOD[2]);
  pm.rect(14, 2, 2, 2, IRON[1]);
  pm.set(14, 2, IRON[0]);
  outlineOpaque(pm);
  return { pm, anchorX: 12, anchorY: base };
}

function bench(): PropArt {
  const pm = new Pixmap(26, 14);
  const base = 12;
  groundShadow(pm, 14, base, 12, 1.6);
  for (let y = 0; y <= 2; y++) for (let x = 2; x <= 23; x++) pm.set(x, y, lit(WOOD, y === 0 ? 0.4 : -0.3));
  for (const px of [3, 22]) pm.vline(px, 0, 4, WOOD[3]);
  for (let y = 4; y <= 6; y++) for (let x = 1; x <= 24; x++) pm.set(x, y, lit(WOOD, y === 4 ? 0.6 : y === 6 ? -0.6 : 0.05 + (hash2(x >> 2, y, 3) - 0.5) * 0.3));
  for (const lx of [3, 20]) {
    for (let y = 7; y <= base; y++) {
      pm.set(lx, y, WOOD[2]);
      pm.set(lx + 1, y, WOOD[3]);
      pm.set(lx + 2, y, WOOD[4]);
    }
  }
  outlineOpaque(pm);
  return { pm, anchorX: 13, anchorY: base };
}

function trough(): PropArt {
  const pm = new Pixmap(26, 13);
  const base = 11;
  groundShadow(pm, 14, base, 12, 1.6);
  for (let y = 2; y <= base - 1; y++) {
    for (let x = 1; x <= 24; x++) {
      const inside = y <= 4 && x >= 3 && x <= 22;
      if (inside) pm.set(x, y, y === 2 ? [40, 54, 70] : lit(WATER, 0.1 + (hash2(x, y, 4) < 0.15 ? 0.7 : 0)));
      else pm.set(x, y, lit(WOOD_GREY, (y <= 2 ? 0.6 : y === 5 ? 0.2 : -0.25) + (x <= 2 ? 0.2 : x >= 23 ? -0.5 : 0) + ((y - 5) % 3 === 2 ? -0.4 : 0)));
    }
  }
  for (const lx of [3, 21]) pm.rect(lx, base, 2, 1, WOOD[3]);
  for (const bx of [6, 19]) pm.vline(bx, 5, base - 1, IRON[2]);
  outlineOpaque(pm);
  return { pm, anchorX: 13, anchorY: base };
}

function signpost(): PropArt {
  const pm = new Pixmap(22, 30);
  const base = 27;
  groundShadow(pm, 12, base, 4, 1.4);
  for (let y = 3; y <= base; y++) {
    pm.set(10, y, WOOD[1]);
    pm.set(11, y, WOOD[3]);
  }
  pm.set(10, 2, WOOD[0]);
  pm.set(11, 2, WOOD[2]);
  // Two arrow boards pointing different ways, with carved letters.
  const board = (y: number, right: boolean) => {
    for (let j = 0; j < 5; j++) {
      for (let i = 0; i < 14; i++) {
        const tip = right ? i - 11 : 2 - i;
        if (tip > 0 && Math.abs(j - 2) > 2 - tip) continue;
        const x = right ? 6 + i : 2 + i;
        pm.set(x, y + j, lit(WOOD_GREY, (j === 0 ? 0.6 : j === 4 ? -0.6 : 0.1) + (hash2(x, y, 6) - 0.5) * 0.3));
      }
    }
    for (let i = 3; i < 11; i += 2) pm.set((right ? 6 : 2) + i, y + 2, WOOD[4]);
  };
  board(5, true);
  board(12, false);
  outlineOpaque(pm);
  return { pm, anchorX: 11, anchorY: base };
}

function fallenLog(seed: number): PropArt {
  const pm = new Pixmap(30, 12);
  const base = 10;
  groundShadow(pm, 16, base, 14, 1.6);
  for (let y = 3; y <= base - 1; y++) {
    for (let x = 4; x <= 27; x++) {
      const ny = (y - 6) / 3.5;
      pm.set(x, y, lit(BARK, -ny * 0.9 + 0.1 + (hash2(Math.floor(x / 3), y, seed) < 0.2 ? -0.5 : 0)));
    }
  }
  // Cut end with rings.
  for (let y = 3; y <= base - 1; y++) {
    for (let x = 1; x <= 4; x++) {
      const d = Math.hypot((x - 2.5) * 1.6, y - 6);
      if (d > 3.8) continue;
      pm.set(x, y, d > 2.8 ? BARK[2] : d < 1 ? [170, 124, 78] : Math.round(d * 2) % 2 ? [214, 172, 116] : [196, 152, 98]);
    }
  }
  // Moss and a mushroom.
  for (let x = 10; x <= 20; x++) if (noise(x, 1, 3, seed) > 0.45) pm.set(x, 3, MOSS[1]);
  pm.set(22, 2, [220, 70, 70]);
  pm.set(23, 2, [180, 46, 50]);
  pm.set(22, 1, [240, 120, 110]);
  outlineOpaque(pm);
  return { pm, anchorX: 15, anchorY: base };
}

function stump(seed: number): PropArt {
  const pm = new Pixmap(18, 14);
  const base = 12;
  groundShadow(pm, 10, base, 8, 1.8);
  for (let y = 4; y <= base; y++) {
    const flare = y >= base - 1 ? 2 : y >= base - 2 ? 1 : 0;
    for (let x = 4 - flare; x <= 13 + flare; x++) pm.set(x, y, barkPixel(x, y, 4 - flare, 13 + flare));
  }
  for (let y = 1; y <= 5; y++) {
    for (let x = 4; x <= 13; x++) {
      const d = Math.hypot((x - 8.5) / 5, (y - 3) / 2.3);
      if (d > 1) continue;
      pm.set(x, y, d > 0.8 ? BARK[1] : Math.round(d * 6) % 2 ? [216, 174, 118] : [194, 148, 96]);
    }
  }
  pm.set(8, 3, [160, 112, 70]);
  if (seed % 2 === 0) {
    pm.set(14, base - 3, [222, 196, 150]);
    pm.set(15, base - 3, [196, 168, 120]);
    pm.set(14, base - 2, [240, 230, 210]);
  }
  outlineOpaque(pm);
  return { pm, anchorX: 9, anchorY: base };
}

// A weathered stone altar: a thick slab on a base, a carved band, candles
// and a few offerings (flowers, a bowl).
function altar(): PropArt {
  const pm = new Pixmap(34, 30);
  const base = 27;
  groundShadow(pm, 19, base, 15, 2.5);
  const AL = ramp([168, 162, 150], 0.5);
  // Base block.
  for (let y = 14; y <= base; y++) for (let x = 5; x <= 28; x++) {
    const f = cell(x, y, 5, 12, 1.6);
    pm.set(x, y, lit(AL, (x === 5 ? 0.4 : x === 28 ? -0.7 : -0.1) + (f.d2 - f.d1 < 0.1 ? -0.6 : (hash2(f.id, 1, 3) - 0.5) * 0.4) + (y > base - 2 ? -0.4 : 0)));
  }
  // Carved band with a sun sign.
  for (let x = 7; x <= 26; x++) pm.set(x, 18, AL[3]);
  for (let x = 7; x <= 26; x++) pm.set(x, 19, AL[1]);
  pm.set(16, 21, AL[4]);
  pm.set(17, 21, AL[4]);
  pm.set(16, 22, AL[4]);
  pm.set(17, 22, AL[4]);
  for (const [dx, dy] of [[-2, 0], [3, 0], [0, -2], [1, -2], [0, 3], [1, 3]]) pm.set(16 + dx, 21 + dy, AL[3]);
  // Top slab, overhanging, lit.
  for (let y = 9; y <= 13; y++) for (let x = 2; x <= 31; x++) pm.set(x, y, lit(AL, (y === 9 ? 0.7 : y === 13 ? -0.6 : 0.3) + (x === 2 ? 0.2 : x === 31 ? -0.5 : 0) + (hash2(x, y, 4) - 0.5) * 0.25));
  // Moss on the slab's edge.
  for (let x = 3; x < 12; x++) if (hash2(x, 1, 8) < 0.5) pm.set(x, 13, MOSS[2]);
  // Candles, a bowl, flowers.
  for (const [cx, hgt] of [[6, 5], [9, 3], [27, 4]] as [number, number][]) {
    for (let j = 0; j < hgt; j++) pm.set(cx, 8 - j, j === hgt - 1 ? [252, 244, 220] : [236, 226, 200]);
    pm.set(cx, 8 - hgt, [255, 220, 120]);
    pm.set(cx, 7 - hgt, [250, 160, 70]);
  }
  for (let x = 14; x <= 19; x++) pm.set(x, 8, x === 14 ? CLAY_P[1] : x === 19 ? CLAY_P[3] : CLAY_P[2]);
  pm.hline(15, 18, 7, [214, 180, 80]);
  pm.set(22, 8, [236, 92, 96]);
  pm.set(23, 7, [248, 212, 92]);
  pm.set(24, 8, [246, 244, 236]);
  pm.set(23, 8, LEAVES[2]);
  outlineOpaque(pm);
  return { pm, anchorX: 17, anchorY: base };
}

// A standing stone: a tall weathered menhir with lichen and a carved
// spiral, leaning slightly.
function standingStone(seed: number): PropArt {
  const pm = new Pixmap(18, 34);
  const base = 31;
  groundShadow(pm, 11, base, 7, 2);
  const MEN = ramp([138, 136, 128], 0.5);
  const lean = seed % 2 ? 1 : -1;
  for (let y = 2; y <= base; y++) {
    const t = (y - 2) / (base - 2);
    const hw = Math.round(3 + t * 3.5 + (y < 5 ? -1 : 0));
    const cx = 9 + Math.round((1 - t) * lean * 1.5);
    for (let x = cx - hw; x <= cx + hw; x++) {
      const nx = (x - cx) / hw;
      let c = lit(MEN, -nx * 0.9 + 0.15 + (y < 5 ? 0.4 : 0) + (noise(x, y, 3, seed) - 0.5) * 0.5);
      if (noise(x, y, 4, seed + 4) > 0.68) c = mix(c, [170, 182, 120], 0.45); // lichen
      if (y > base - 3) c = mix(c, MOSS[3], 0.4);
      pm.set(x, y, c);
    }
  }
  // Carved spiral.
  for (let a = 0; a < 12; a += 0.5) {
    const r = a * 0.28;
    const x = Math.round(9 + Math.cos(a) * r);
    const y = Math.round(16 + Math.sin(a) * r);
    if (pm.filled(x, y)) pm.set(x, y, MEN[4]);
  }
  outlineOpaque(pm);
  return { pm, anchorX: 9, anchorY: base };
}

// A broken column of a fallen sanctuary, ivy climbing it.
function ruinPillar(seed: number): PropArt {
  const pm = new Pixmap(16, 40);
  const base = 37;
  groundShadow(pm, 9, base, 7, 1.8);
  const COL = ramp([176, 170, 156], 0.5);
  const top = 6 + (seed % 3) * 3;
  for (let y = top; y <= base; y++) {
    const capital = y > base - 4;
    const x0 = capital ? 1 : 3;
    const x1 = capital ? 14 : 12;
    for (let x = x0; x <= x1; x++) {
      const nx = (x - (x0 + x1) / 2) / ((x1 - x0) / 2);
      const flute = !capital && (x - x0) % 3 === 0;
      pm.set(x, y, lit(COL, -nx * 0.9 + 0.2 + (flute ? -0.3 : 0) + (y === base - 3 ? 0.5 : 0)));
    }
  }
  // Broken, jagged top.
  for (let x = 3; x <= 12; x++) {
    const cut = Math.round(hash2(x, seed, 2) * 3);
    for (let j = 0; j < cut; j++) pm.data[((top + j) * pm.w + x) * 4 + 3] = 0;
    pm.set(x, top + cut, COL[0]);
  }
  // Ivy.
  for (let y = base - 2; y > top + 6; y--) {
    const x = 4 + Math.round(Math.sin(y / 3 + seed) * 2.5 + 3);
    if (hash2(x, y, seed) < 0.75) pm.set(x, y, LEAVES[hash2(y, x, 2) < 0.5 ? 1 : 3]);
    if (hash2(x, y, seed + 1) < 0.4) pm.set(x + 1, y, LEAVES[2]);
  }
  outlineOpaque(pm);
  return { pm, anchorX: 8, anchorY: base };
}

// Reeds and cattails for river banks.
function reeds(seed: number): PropArt {
  const pm = new Pixmap(16, 20);
  const rnd = seeded(seed + 61);
  const R = ramp([110, 150, 72]);
  for (let i = 0; i < 8; i++) {
    const x0 = 2 + Math.floor(rnd() * 12);
    const h = 8 + Math.floor(rnd() * 9);
    const lean = rnd() < 0.5 ? -1 : 1;
    for (let j = 0; j < h; j++) {
      const x = x0 + (j > h * 0.7 ? lean : 0);
      pm.set(x, 18 - j, lit(R, (j / h) * 1.2 - 0.6 + (i % 2 ? 0.2 : -0.1)));
    }
    if (rnd() < 0.45) {
      // A cattail head.
      const x = x0 + lean;
      for (let j = 0; j < 3; j++) pm.set(x, 18 - h + 1 + j, j === 0 ? [150, 96, 60] : [112, 70, 46]);
    }
  }
  return { pm, anchorX: 8, anchorY: 18 };
}

// A rock with veins of rusty iron ore and a few glinting flecks.
function oreRock(seed: number): PropArt {
  const art = rock(20, seed, false);
  const pm = art.pm;
  const ORE = ramp([170, 92, 60]);
  for (let y = 0; y < pm.h; y++) {
    for (let x = 0; x < pm.w; x++) {
      if (pm.data[(y * pm.w + x) * 4 + 3] !== 255) continue;
      const c = pm.get(x, y)!;
      if (c[0] + c[1] + c[2] < 150) continue; // keep the outline
      const vein = Math.abs(noise(x, y, 5, seed + 3) - 0.5) < 0.06;
      if (vein) pm.set(x, y, lit(ORE, (hash2(x, y, seed) - 0.5) * 0.8));
      else if (hash2(x, y, seed + 9) < 0.025) pm.set(x, y, [236, 220, 190]);
    }
  }
  return art;
}

// A clump of wild herbs: broad leaves, a few pale flower heads.
function herbPatch(seed: number): PropArt {
  const pm = new Pixmap(18, 14);
  groundShadow(pm, 10, 12, 8, 1.6, 50);
  const rnd = seeded(seed + 71);
  const H = ramp([96, 160, 90]);
  for (let i = 0; i < 9; i++) {
    const x = 3 + Math.floor(rnd() * 12);
    const y = 5 + Math.floor(rnd() * 6);
    // A leaf: a small lit oval with a midrib.
    for (let j = -1; j <= 1; j++) for (let k = -2; k <= 2; k++) if (Math.abs(k) + Math.abs(j) * 2 <= 3) pm.set(x + k, y + j, lit(H, -k * 0.3 - j * 0.5 + 0.1));
    pm.set(x, y, H[3]);
  }
  for (let i = 0; i < 4; i++) {
    const x = 4 + Math.floor(rnd() * 10);
    const y = 2 + Math.floor(rnd() * 3);
    pm.vline(x, y + 1, y + 4, H[3]);
    pm.set(x, y, [240, 240, 220]);
    pm.set(x - 1, y, [214, 222, 196]);
    pm.set(x + 1, y, [214, 222, 196]);
  }
  outlineOpaque(pm, 0.6);
  return { pm, anchorX: 9, anchorY: 12 };
}

// A fern: fronds arching out from the root, lit on top.
function fern(seed: number): PropArt {
  const pm = new Pixmap(20, 14);
  groundShadow(pm, 11, 12, 8, 1.6, 50);
  const F = ramp([84, 146, 70]);
  const rnd = seeded(seed + 91);
  const fronds = 5 + Math.floor(rnd() * 3);
  for (let i = 0; i < fronds; i++) {
    const a = Math.PI * (1.08 + (i / (fronds - 1)) * 0.84) + (rnd() - 0.5) * 0.15;
    const len = 6 + rnd() * 3;
    for (let t = 0; t <= len; t += 0.5) {
      const droop = (t / len) * (t / len) * 3;
      const x = Math.round(10 + Math.cos(a) * t);
      const y = Math.round(12 + Math.sin(a) * t * 0.8 + droop);
      pm.set(x, y, lit(F, 0.5 - (t / len) * 0.6 + (Math.cos(a) < 0 ? 0.2 : -0.2)));
      // Leaflets on both sides.
      if (Math.round(t * 2) % 3 === 0 && t > 1) {
        pm.set(x, y - 1, lit(F, 0.7 - (t / len) * 0.5));
        pm.set(x, y + 1, F[3]);
      }
    }
  }
  outlineOpaque(pm, 0.6);
  return { pm, anchorX: 10, anchorY: 12 };
}

// A canvas A-frame tent with an open flap, guy ropes and pegs.
function tent(seed: number): PropArt {
  const pm = new Pixmap(44, 34);
  const base = 31;
  groundShadow(pm, 24, base, 20, 3);
  const CAN = ramp(seed % 2 ? [196, 180, 140] : [168, 150, 120], 0.5);
  const cx = 22;
  const top = 3;
  for (let y = top; y <= base; y++) {
    const t = (y - top) / (base - top);
    const half = Math.round(2 + t * 18);
    for (let x = cx - half; x <= cx + half; x++) {
      const nx = (x - cx) / Math.max(1, half);
      // Left slope lit, right slope shaded; vertical seams.
      let level = nx < 0 ? 0.35 - t * 0.3 : -0.45 - t * 0.2;
      if (Math.abs(x - cx) % 7 === 3) level -= 0.25;
      if (y === base) level -= 0.4;
      pm.set(x, y, lit(CAN, level + (hash2(x, y, seed) - 0.5) * 0.12));
    }
    pm.set(cx, y, CAN[0]); // ridge seam
  }
  // Open flap: a dark triangle with the flap folded back.
  for (let y = 16; y <= base - 1; y++) {
    const w = Math.round(((y - 16) / (base - 17)) * 6);
    for (let x = cx - w; x <= cx + w; x++) pm.set(x, y, [36, 28, 28]);
    pm.set(cx + w + 1, y, CAN[0]);
    pm.set(cx + w + 2, y, CAN[1]);
  }
  // Ridge pole ends and guy ropes.
  pm.set(cx, top - 1, WOOD[1]);
  pm.set(cx, top - 2, WOOD[2]);
  for (let i = 0; i < 7; i++) {
    pm.set(cx - 18 - i, 18 + Math.round(i * 1.6), [150, 134, 100]);
    pm.set(cx + 18 + i, 18 + Math.round(i * 1.6), [120, 106, 82]);
  }
  pm.set(cx - 25, 29, WOOD[2]);
  pm.set(cx + 25, 29, WOOD[2]);
  outlineOpaque(pm);
  return { pm, anchorX: cx, anchorY: base };
}

// A goblin hut: hides stretched over bent poles, bones lashed on top.
function hideHut(seed: number): PropArt {
  const pm = new Pixmap(40, 32);
  const base = 29;
  groundShadow(pm, 22, base, 18, 3);
  const HIDE = ramp([140, 104, 74]);
  const cx = 20;
  for (let y = 6; y <= base; y++) {
    for (let x = 2; x <= 38; x++) {
      const nx = (x - cx) / 18;
      const ny = (y - base) / (base - 5);
      if (nx * nx + ny * ny > 1) continue;
      // Patches of hide with stitched seams.
      const f = cell(x, y, 7, seed + 5, 1.2);
      let level = sphere(nx * 0.9, ny * 0.9 + 0.4) * 0.7 + (hash2(f.id, 1, seed) - 0.5) * 0.5;
      if (f.d2 - f.d1 < 0.08) level = -0.9;
      pm.set(x, y, lit(HIDE, level));
    }
  }
  // Poles poking out of the top, a dark doorway.
  for (const [x0, dx] of [[16, -1], [24, 1], [20, 0]] as [number, number][]) for (let j = 0; j < 5; j++) pm.set(x0 + Math.round(j * dx * 0.5), 6 - j, WOOD[j < 2 ? 2 : 1]);
  for (let y = 19; y <= base; y++) {
    const w = Math.round(Math.sqrt(Math.max(0, 1 - ((y - base) / 11) ** 2)) * 5);
    for (let x = cx - w; x <= cx + w; x++) pm.set(x, y, [30, 24, 22]);
  }
  // A skull over the door.
  pm.rect(cx - 1, 15, 3, 2, BONE[1]);
  pm.set(cx - 1, 16, [40, 30, 34]);
  pm.set(cx + 1, 16, [40, 30, 34]);
  outlineOpaque(pm);
  return { pm, anchorX: cx, anchorY: base };
}

// A campfire: a ring of stones, crossed logs, flames, a warm glow.
function campfire(seed: number): PropArt {
  const pm = new Pixmap(28, 26);
  const t = new Pixmap(28, 26);
  const base = 22;
  for (let a = 0; a < 10; a++) {
    const ang = (a / 10) * Math.PI * 2;
    const x = Math.round(14 + Math.cos(ang) * 8);
    const y = Math.round(19 + Math.sin(ang) * 3.5);
    t.rect(x - 1, y - 1, 3, 2, lit(STONE, Math.sin(ang) < 0 ? -0.3 : 0.3));
    t.set(x - 1, y - 1, STONE[0]);
  }
  for (let i = 0; i < 9; i++) {
    t.set(9 + i, 18 + Math.round(i * 0.2), BARK[2]);
    t.set(18 - i, 18 + Math.round(i * 0.2), BARK[3]);
  }
  for (let x = 10; x <= 18; x++) t.set(x, 19, hash2(x, 1, seed) < 0.5 ? [252, 180, 80] : [200, 70, 40]);
  flame(t, 12, 17, 8);
  flame(t, 15, 17, 10);
  t.set(10, 5, [255, 220, 140]);
  t.set(18, 3, [255, 200, 120]);
  outlineOpaque(t, 0.7);
  halo(pm, 14, 13, 14, [255, 180, 90], 120);
  pm.blit(t, 0, 0);
  return { pm, anchorX: 14, anchorY: base };
}

// A goblin totem: a crooked stake with a horned skull and rags.
function totem(seed: number): PropArt {
  const pm = new Pixmap(16, 34);
  const base = 31;
  groundShadow(pm, 9, base, 4, 1.4);
  for (let y = 6; y <= base; y++) {
    const x = 7 + Math.round(Math.sin(y / 5 + seed) * 0.8);
    pm.set(x, y, WOOD[2]);
    pm.set(x + 1, y, WOOD[3]);
  }
  // Horned skull.
  for (let y = 3; y <= 7; y++) for (let x = 5; x <= 10; x++) if (!((y === 3 || y === 7) && (x === 5 || x === 10))) pm.set(x, y, lit(BONE, (x < 7 ? 0.5 : x > 9 ? -0.5 : 0.1)));
  pm.set(6, 5, [40, 30, 34]);
  pm.set(9, 5, [40, 30, 34]);
  pm.set(4, 2, BONE[2]);
  pm.set(3, 1, BONE[3]);
  pm.set(11, 2, BONE[2]);
  pm.set(12, 1, BONE[3]);
  // Rags and feathers tied on.
  for (let j = 0; j < 6; j++) pm.set(10 + (j % 2), 10 + j, j % 2 ? [150, 50, 50] : [118, 36, 40]);
  pm.set(5, 11, [60, 120, 70]);
  pm.set(5, 12, [60, 120, 70]);
  outlineOpaque(pm);
  return { pm, anchorX: 8, anchorY: base };
}

// A weathered gravestone: rounded headstone, cross or plain slab, leaning
// a little, lichen and a grassy mound in front.
function gravestone(seed: number): PropArt {
  const pm = new Pixmap(16, 22);
  const base = 19;
  groundShadow(pm, 9, base, 6, 1.6);
  const GS = ramp([150, 148, 140], 0.5);
  const kind = seed % 3;
  const lean = (seed >> 2) % 3 - 1;
  const put = (x: number, y: number, level: number) => {
    const sx = x + (y < base - 6 ? lean : 0);
    let c = lit(GS, level + (noise(sx, y, 3, seed) - 0.5) * 0.4);
    if (noise(sx, y, 4, seed + 3) > 0.7) c = mix(c, [168, 178, 122], 0.45);
    pm.set(sx, y, c);
  };
  if (kind === 1) {
    // A cross.
    for (let y = 3; y <= base; y++) for (let x = 7; x <= 9; x++) put(x, y, x === 7 ? 0.5 : x === 9 ? -0.5 : 0.1);
    for (let y = 7; y <= 9; y++) for (let x = 3; x <= 13; x++) put(x, y, y === 7 ? 0.5 : y === 9 ? -0.5 : 0.1);
  } else {
    const top = kind === 0 ? 5 : 8;
    for (let y = top; y <= base; y++) {
      for (let x = 3; x <= 13; x++) {
        if (kind === 0 && y < top + 3 && Math.hypot(x - 8, y - (top + 3)) > 5.5) continue;
        put(x, y, (x === 3 ? 0.5 : x === 13 ? -0.6 : 0.05) + (y === top ? 0.4 : 0));
      }
    }
    // Carved lines.
    for (let x = 6; x <= 10; x++) {
      pm.set(x + lean, top + 5, GS[4]);
      if (x % 2) pm.set(x + lean, top + 8, GS[3]);
    }
  }
  // Grassy mound.
  for (let x = 2; x <= 14; x++) pm.set(x, base, [72, 112, 58]);
  for (let x = 4; x <= 12; x++) pm.set(x, base + 1, [62, 96, 52]);
  outlineOpaque(pm);
  return { pm, anchorX: 8, anchorY: base + 1 };
}

// A dead tree: bare twisted branches, grey bark.
function deadTree(seed: number): PropArt {
  const pm = new Pixmap(34, 44);
  const base = 41;
  groundShadow(pm, 19, base, 10, 2.5);
  const DB = ramp([110, 100, 96], 0.5);
  const branch = (x: number, y: number, ang: number, len: number, wid: number, depth: number) => {
    let cx = x;
    let cy = y;
    for (let i = 0; i < len; i++) {
      cx += Math.cos(ang);
      cy += Math.sin(ang);
      ang += (hash2(Math.round(cx), Math.round(cy), seed) - 0.5) * 0.4;
      for (let k = 0; k < wid; k++) pm.set(Math.round(cx) + k, Math.round(cy), lit(DB, k === 0 ? 0.4 : k === wid - 1 ? -0.5 : 0));
    }
    if (depth > 0) {
      branch(cx, cy, ang - 0.6, len * 0.65, Math.max(1, wid - 1), depth - 1);
      branch(cx, cy, ang + 0.5, len * 0.6, Math.max(1, wid - 1), depth - 1);
    }
  };
  branch(16, base, -Math.PI / 2, 18, 4, 3);
  for (let x = 13; x <= 21; x++) pm.set(x, base, DB[2]);
  outlineOpaque(pm);
  return { pm, anchorX: 17, anchorY: base };
}

// Wrought-iron cemetery railings with spearhead tips.
export function renderIronFence(len: number): PropArt {
  const pm = new Pixmap(len, 22);
  const base = 20;
  const IR = ramp([70, 70, 84], 0.4);
  for (let x = 1; x < len - 1; x += 4) {
    for (let y = 4; y <= base; y++) pm.set(x, y, lit(IR, (hash2(x, y, 3) - 0.5) * 0.4 + 0.1));
    pm.set(x, 3, IR[0]);
    pm.set(x - 1, 4, IR[1]);
    pm.set(x + 1, 4, IR[2]);
  }
  for (const y of [7, base - 3]) for (let x = 0; x < len; x++) pm.set(x, y, lit(IR, -0.2));
  for (let x = 0; x < len; x += 24) for (let y = 2; y <= base; y++) {
    pm.set(x, y, IR[1]);
    pm.set(x + 1, y, IR[3]);
  }
  outlineOpaque(pm);
  return { pm, anchorX: Math.round(len / 2), anchorY: base };
}

// A palisade of sharpened logs (camp walls).
export function renderPalisade(len: number, seed = 1): PropArt {
  const pm = new Pixmap(len, 26);
  const base = 24;
  for (let x = 0; x + 3 < len; x += 4) {
    const h = 18 + Math.floor(hash2(x, 1, seed) * 4);
    for (let y = base - h; y <= base; y++) {
      const tipRow = y - (base - h);
      for (let i = 0; i < 4; i++) {
        if (tipRow < 2 && (i === 0 || i === 3)) continue;
        if (tipRow < 1 && i !== 1) continue;
        pm.set(x + i, y, tipRow < 2 ? WOOD[0] : lit(BARK, (i === 0 ? 0.4 : i === 3 ? -0.6 : 0) + (hash2(x + i, y >> 2, seed) - 0.5) * 0.4));
      }
    }
  }
  for (const ry of [base - 12, base - 5]) pm.hline(0, len - 1, ry, [120, 100, 70]);
  outlineOpaque(pm);
  return { pm, anchorX: Math.round(len / 2), anchorY: base };
}

// A plank bridge across a stream: boards with gaps, two side rails on
// posts. Flat (drawn under the characters walking on it).
export function renderBridge(w: number, h: number): PropArt {
  const pm = new Pixmap(w + 4, h + 8);
  const ox = 2;
  const oy = 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const board = Math.floor(x / 6);
      const gap = x % 6 === 5;
      const sag = Math.round(Math.sin((y / h) * Math.PI) * 0);
      pm.set(ox + x, oy + y + sag, gap ? [40, 32, 30] : lit(WOOD, (hash2(board, 1, 5) - 0.5) * 0.6 + (x % 6 === 0 ? 0.35 : 0) + (y === 0 ? 0.3 : y === h - 1 ? -0.5 : 0)));
    }
  }
  // Rails along the top and bottom edges, on posts.
  for (const ry of [oy - 1, oy + h - 1]) {
    for (let x = 0; x < w + 4; x++) {
      pm.set(x, ry - 2, lit(WOOD_GREY, 0.5));
      pm.set(x, ry - 1, lit(WOOD_GREY, -0.3));
    }
    for (let x = 0; x < w + 4; x += 10) {
      pm.rect(x, ry - 3, 2, 5, WOOD[2]);
      pm.set(x, ry - 3, WOOD[0]);
    }
  }
  outlineOpaque(pm);
  return { pm, anchorX: 0, anchorY: 0 };
}

// A rural lantern post: a wooden post, an iron arm and a hanging lantern.
function lamppost(): PropArt {
  const pm = new Pixmap(20, 34);
  const base = 31;
  const solid = new Pixmap(20, 34);
  for (let y = 3; y <= base; y++) {
    solid.set(6, y, WOOD[1]);
    solid.set(7, y, WOOD[2]);
    solid.set(8, y, WOOD[3]);
  }
  solid.hline(6, 8, 2, WOOD[0]);
  solid.hline(8, 14, 5, IRON[2]);
  solid.set(9, 6, IRON[2]);
  solid.set(10, 7, IRON[2]);
  // Lantern.
  solid.hline(11, 15, 7, IRON[1]);
  solid.hline(12, 14, 6, IRON[0]);
  for (let y = 8; y <= 13; y++) {
    solid.set(11, y, IRON[2]);
    solid.set(15, y, IRON[3]);
    for (let x = 12; x <= 14; x++) solid.set(x, y, y < 10 ? [255, 240, 180] : [250, 196, 90]);
  }
  solid.set(13, 9, [255, 255, 230]);
  solid.hline(11, 15, 14, IRON[2]);
  outlineOpaque(solid);
  groundShadow(solid, 8, base, 4, 1.4);
  halo(pm, 13, 11, 10, [255, 210, 120], 150);
  pm.blit(solid, 0, 0);
  return { pm, anchorX: 7, anchorY: base };
}

// A cottage-garden flower bed: an irregular mound of leafy clumps with
// flowers in drifts of a few colors, tall spikes at the back, a handful of
// fieldstones along the front. Anchor: bottom center of its footprint.
function flowerBed(w: number, h: number, seed: number): PropArt {
  const W = w + 6;
  const H = h + 12;
  const pm = new Pixmap(W, H);
  const rnd = seeded(seed * 7 + 21);
  const cx = W / 2;
  const base = H - 3;
  const cy = base - h / 2;
  const SOIL = ramp([104, 74, 52]);
  const inBed = (x: number, y: number) => {
    const nx = (x - cx) / (w / 2);
    const ny = (y - cy) / (h / 2);
    return nx * nx + ny * ny < 1 + (noise(x, y, 4, seed) - 0.5) * 0.5;
  };
  groundShadow(pm, cx + 2, base, w * 0.55, h * 0.45 + 1, 60);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inBed(x, y)) pm.set(x, y, lit(SOIL, (hash2(x, y, seed) - 0.5) * 0.6 - 0.3));
  // Three flower colors for this bed, laid in drifts.
  const palette = [0, 1, 2].map(() => FLOWERS[Math.floor(rnd() * FLOWERS.length)]);
  const drift = (x: number) => palette[Math.min(2, Math.floor(noise(x, seed, 7, seed + 3) * 3))];
  // Leafy clumps, back to front.
  const clumps: Clump[] = [];
  for (let i = 0; i < (w * h) / 10; i++) {
    const x = cx + (rnd() - 0.5) * w * 0.95;
    const y = cy + (rnd() - 0.5) * h * 0.9;
    if (inBed(Math.round(x), Math.round(y))) clumps.push({ x, y: y - 1, r: 1.8 + rnd() * 1.4 });
  }
  clumps.sort((p, q) => p.y - q.y);
  const LEAF = LEAVES_DARK;
  for (const c of clumps) {
    const back = c.y < cy - h * 0.15;
    // Tall flower spikes (foxgloves, hollyhocks) at the back.
    if (back && rnd() < 0.5) {
      const col = drift(Math.round(c.x) + 40);
      const len = 4 + Math.floor(rnd() * 4);
      const sx = Math.round(c.x);
      for (let j = 1; j <= len; j++) {
        const y = Math.round(c.y) - j;
        pm.set(sx, y, j % 2 ? mix(col, [255, 255, 255], j > len - 2 ? 0.3 : 0) : mix(col, [0, 0, 0], 0.18));
        if (j % 2 && j < len - 1) pm.set(sx + 1, y, mix(col, [0, 0, 0], 0.3));
      }
      pm.set(sx, Math.round(c.y) - len - 1, LEAF[1]);
    }
    for (let y = Math.floor(c.y - c.r); y <= Math.ceil(c.y + c.r); y++) {
      for (let x = Math.floor(c.x - c.r); x <= Math.ceil(c.x + c.r); x++) {
        const nx = (x - c.x) / c.r;
        const ny = (y - c.y) / c.r;
        if (nx * nx + ny * ny > 1) continue;
        pm.set(x, y, lit(LEAF, sphere(nx * 0.9, ny * 0.9) * 0.9 + (hash2(x, y, seed + 4) - 0.5) * 0.3));
      }
    }
    // Flowers on the upper half of the clump.
    const n = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const fx = Math.round(c.x + (rnd() - 0.5) * c.r * 1.4);
      const fy = Math.round(c.y - rnd() * c.r);
      const col = drift(fx);
      pm.set(fx, fy, col);
      pm.set(fx, fy - 1, mix(col, [255, 255, 255], 0.35));
      if (rnd() < 0.5) pm.set(fx + 1, fy, mix(col, [0, 0, 0], 0.25));
    }
  }
  // A few fieldstones along the front edge, with gaps.
  for (let x = Math.round(cx - w / 2) + 1; x < cx + w / 2 - 2; x += 3 + Math.floor(rnd() * 3)) {
    if (rnd() < 0.35) continue;
    let y = base;
    while (y > 0 && !inBed(x, y) && !inBed(x + 1, y)) y--;
    y += 1;
    pm.set(x, y - 1, lit(STONE, 0.6));
    pm.set(x + 1, y - 1, lit(STONE, 0.2));
    pm.set(x, y, lit(STONE, -0.1));
    pm.set(x + 1, y, lit(STONE, -0.6));
    if (rnd() < 0.5) pm.set(x + 2, y, lit(STONE, -0.3));
  }
  outlineOpaque(pm, 0.55);
  return { pm, anchorX: Math.round(cx), anchorY: base };
}

// Split-rail fence: rounded posts and two weathered rails, with a little
// irregularity so it looks hand-made.
function fence(len: number): PropArt {
  const pm = new Pixmap(len, 20);
  const base = 18;
  for (const ry of [6, 12]) {
    for (let x = 0; x < len; x++) {
      const sag = Math.round(Math.sin(((x % 8) / 8) * Math.PI) * 0.6);
      pm.set(x, ry + sag, lit(WOOD_GREY, 0.6 + (hash2(x >> 2, ry, 43) - 0.5) * 0.4));
      pm.set(x, ry + 1 + sag, lit(WOOD_GREY, -0.3));
    }
  }
  for (let x = 1; x < len - 1; x += 8) {
    const lean = hash2(x, 1, 41) < 0.3 ? 1 : 0;
    for (let y = 3 + lean; y <= base; y++) {
      pm.set(x, y, lit(WOOD_GREY, 0.45));
      pm.set(x + 1, y, lit(WOOD_GREY, -0.1 + (hash2(x, y >> 2, 42) < 0.2 ? -0.4 : 0)));
      pm.set(x + 2, y, lit(WOOD_GREY, -0.7));
    }
    pm.set(x + 1, 2 + lean, WOOD_GREY[1]);
  }
  outlineOpaque(pm);
  return { pm, anchorX: Math.round(len / 2), anchorY: base };
}

// Dry-stone field wall: stacked flat stones, a row of capstones, moss.
function stoneWall(len: number, seed: number): PropArt {
  const pm = new Pixmap(len, 16);
  const base = 14;
  for (let y = 3; y <= base; y++) {
    for (let x = 0; x < len; x++) {
      const cap = y <= 5;
      const f = cell(x, y, cap ? 3 : 4, seed + (cap ? 7 : 0), cap ? 0.8 : 1.6);
      let level = f.d2 - f.d1 < 0.12 ? -1 : -f.dx * 0.3 - f.dy * 0.6 + (hash2(f.id, 1, seed) - 0.5) * 0.6;
      if (cap) level += 0.35;
      if (y === base) level -= 0.5;
      let c = lit(STONE, level);
      if (y === 3 && noise(x, y, 4, seed) > 0.55) c = MOSS[1];
      if (y > base - 3 && noise(x, y, 3, seed + 2) > 0.62) c = lit(MOSS, level);
      pm.set(x, y, c);
    }
  }
  for (let x = 0; x < len; x++) if (hash2(x >> 1, 2, seed) < 0.35) pm.set(x, 2, lit(STONE, 0.4));
  outlineOpaque(pm);
  return { pm, anchorX: Math.round(len / 2), anchorY: base };
}

// Flat props drawn from ground materials (fields, ponds, boardwalks).
// A cellar hatch flush with the street: two oak leaves in a cut-stone
// frame, held shut by a chain and a padlock (flat, anchor at the center).
function cellarHatch(w: number, h: number): PropArt {
  const pm = new Pixmap(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const frame = x < 2 || y < 2 || x >= w - 2 || y >= h - 2;
      if (frame) {
        pm.set(x, y, lit(CUT_P, (y < 2 || x < 2 ? 0.3 : -0.4) + ((x + y) % 7 === 0 ? -0.4 : 0)));
        continue;
      }
      const lx = x - 2;
      const seam = lx % 4 === 0;
      const mid = x === Math.floor(w / 2);
      pm.set(x, y, mid ? [30, 22, 26] : lit(WOOD_GREY, (seam ? -0.55 : 0.05) + (y === 2 ? -0.4 : 0) + (hash2(lx >> 2, y >> 2, 380) - 0.5) * 0.3 - 0.2));
    }
  }
  // Iron straps, the chain across both leaves, a padlock.
  for (const sy of [4, h - 5]) pm.hline(3, w - 4, sy, IRON[3]);
  const cy = Math.floor(h / 2);
  for (let x = 3; x < w - 3; x++) pm.set(x, cy + ((x & 1) ? 0 : 1), (x & 1) ? [176, 178, 190] : [110, 112, 126]);
  pm.rect(Math.floor(w / 2) - 1, cy - 1, 3, 4, [170, 136, 64]);
  pm.set(Math.floor(w / 2), cy + 1, [60, 44, 30]);
  return { pm, anchorX: Math.round(w / 2), anchorY: Math.round(h / 2) };
}

// Stone steps going down into the dark between two low side walls,
// seen from above (flat, anchor at the center): the top step lit, each
// one below it darker.
function stairsDown(w: number, h: number): PropArt {
  const pm = new Pixmap(w, h);
  const side = 4;
  const steps = Math.max(3, Math.floor((h - 2) / 4));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < side || x >= w - side) {
        const outer = x === 0 || x === w - 1;
        pm.set(x, y, lit(CUT_P, (outer ? -0.6 : x < side ? 0.35 : -0.15) + (y % 5 === 0 ? -0.4 : 0)));
        continue;
      }
      const k = Math.min(steps - 1, Math.floor((y - 1) / 4));
      const ly = (y - 1) % 4;
      const dark = k / steps;
      let c = lit(CUT_P, (ly === 0 ? 0.5 : ly === 3 ? -0.6 : 0) - dark * 0.4);
      c = mix(c, [16, 12, 20], Math.min(0.92, dark * 1.05));
      if (y === 0) c = CUT_P[1];
      pm.set(x, y, c);
    }
  }
  // Shadow cast by the side walls onto the steps.
  for (let y = 1; y < h; y++) {
    const c = pm.get(side, y);
    if (c) pm.set(side, y, mix(c, [16, 12, 20], 0.5));
    const d = pm.get(w - side - 1, y);
    if (d) pm.set(w - side - 1, y, mix(d, [16, 12, 20], 0.3));
  }
  return { pm, anchorX: Math.round(w / 2), anchorY: Math.round(h / 2) };
}

export type PatchKind = 'crop' | 'water' | 'planks' | 'lava' | 'marsh' | 'hatch' | 'stairs';

function patch(material: PatchKind, w: number, h: number): PropArt {
  const pm = new Pixmap(w, h);
  if (material === 'hatch') return cellarHatch(w, h);
  if (material === 'stairs') return stairsDown(w, h);
  if (material === 'lava') {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x - w / 2 + 0.5) / (w / 2);
        const dy = (y - h / 2 + 0.5) / (h / 2);
        const d = dx * dx + dy * dy + (noise(x, y, 4, 3) - 0.5) * 0.3;
        if (d > 1) continue;
        const n = noise(x, y, 3, 4) + noise(x, y, 7, 5) * 0.5;
        pm.set(x, y, d > 0.82 ? [60, 40, 44] : d > 0.7 ? [140, 50, 40] : n > 0.95 ? [255, 236, 150] : n > 0.7 ? [252, 160, 60] : [214, 76, 44]);
      }
    }
    return { pm, anchorX: Math.round(w / 2), anchorY: Math.round(h / 2) };
  }
  const round = material === 'water' || material === 'marsh';
  const ground = renderGround({ w, h, base: material, seed: w * 31 + h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (round) {
        const dx = (x - w / 2 + 0.5) / (w / 2);
        const dy = (y - h / 2 + 0.5) / (h / 2);
        const d = dx * dx + dy * dy + (noise(x, y, 5, 6) - 0.5) * 0.25;
        if (d > 1) continue;
        // Muddy bank, then a dark rim under the water line.
        pm.set(x, y, d > 0.86 ? (dy < 0 ? [104, 84, 60] : [126, 104, 74]) : d > 0.76 && dy < 0.2 ? [30, 54, 78] : ground.get(x, y)!);
      } else {
        const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
        pm.set(x, y, edge ? (material === 'crop' ? [104, 76, 52] : WOOD[3]) : ground.get(x, y)!);
      }
    }
  }
  return { pm, anchorX: Math.round(w / 2), anchorY: Math.round(h / 2) };
}

// ------------------------------------------------------------- the town

const CUT_P = ramp([168, 162, 156], 0.5);

// A town fountain: a round basin of cut stone, a column with a bowl, water
// falling from it in thin streams, ripples in the basin.
function fountain(seed: number): PropArt {
  const pm = new Pixmap(46, 46);
  const base = 43;
  groundShadow(pm, 24, base - 1, 21, 3.5);
  const cx = 22.5;
  const cy = 32;
  const rx = 21;
  const ry = 8;
  const wall = 4;
  const inRim = (x: number, y: number, k = 0) => ((x - cx) / (rx - k)) ** 2 + ((y - cy) / (ry - k * 0.8)) ** 2 <= 1;
  // The curb: its top (a ring of cut stones) and its outer face in front.
  for (let y = 0; y <= base; y++) {
    for (let x = 0; x < pm.w; x++) {
      const nx = (x - cx) / rx;
      if (Math.abs(nx) > 1) continue;
      const front = cy + Math.sqrt(1 - nx * nx) * ry;
      if (inRim(x, y)) {
        const ang = Math.atan2((y - cy) / ry, nx);
        const joint = Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 22) !== Math.floor(((Math.atan2((y - cy) / ry, (x + 1 - cx) / rx) + Math.PI) / (Math.PI * 2)) * 22);
        pm.set(x, y, joint ? CUT_P[3] : lit(CUT_P, 0.45 - nx * 0.35 + (y > cy ? -0.15 : 0.1)));
      } else if (y > front && y <= front + wall) {
        const k = (y - front) / wall;
        pm.set(x, y, (x + Math.round(y / 5)) % 7 === 0 ? CUT_P[4] : lit(CUT_P, -0.05 - nx * 0.45 - k * 0.35));
      }
    }
  }
  // Water inside the curb, a shaded band under its far rim, ripples.
  for (let y = 0; y <= base; y++) {
    for (let x = 0; x < pm.w; x++) {
      if (!inRim(x, y, 3)) continue;
      const shade = !inRim(x, y - 2, 3);
      const r = Math.hypot((x - cx) / 1.0, (y - cy + 1) * 2.4);
      const ring = Math.abs(r - 9) < 0.6 || Math.abs(r - 14.5) < 0.6;
      pm.set(x, y, shade ? [30, 56, 78] : ring ? [176, 216, 236] : lit(WATER, 0.05 - (x - cx) / rx * 0.35 + (hash2(x >> 1, y, seed) < 0.06 ? 0.7 : 0)));
    }
  }
  // Column with a moulded base, rising from the water.
  for (let y = 13; y <= 31; y++) for (let x = 20; x <= 25; x++) pm.set(x, y, lit(CUT_P, x === 20 ? 0.5 : x === 25 ? -0.6 : 0.05 + ((y - 13) % 6 === 0 ? -0.35 : 0)));
  for (let x = 19; x <= 26; x++) pm.set(x, 31, lit(CUT_P, x === 19 ? 0.3 : x === 26 ? -0.7 : -0.2));
  // Upper bowl, filled, overflowing.
  pm.ellipse(12, 9, 22, 7, (dx, dy) => (dy < 0.15 && Math.abs(dx) < 0.8 ? lit(WATER, 0.25 + (dx < -0.3 ? 0.4 : 0)) : lit(CUT_P, -dx * 0.6 + (dy > 0.3 ? -0.45 : 0.3))));
  for (let x = 14; x <= 31; x++) pm.set(x, 15, lit(CUT_P, -0.65));
  pm.rect(21, 5, 4, 4, CUT_P[1]);
  pm.vline(24, 5, 8, CUT_P[3]);
  pm.rect(22, 3, 2, 2, CUT_P[0]);
  pm.set(22, 1, [220, 240, 255]);
  pm.set(23, 2, [176, 216, 236]);
  // Thin streams falling from the bowl's rim into the basin.
  for (const sx of [13, 16, 29, 32]) {
    const out = sx < 22 ? -1 : 1;
    for (let j = 0; j < 15; j++) {
      const x = sx + out * Math.floor(j / 5);
      pm.set(x, 15 + j, j % 4 === 0 ? [236, 248, 255] : [160, 206, 232], 220);
    }
    pm.set(sx + out * 3 - 1, 30, [236, 248, 255]);
    pm.set(sx + out * 3 + 1, 30, [236, 248, 255]);
  }
  outlineOpaque(pm);
  return { pm, anchorX: 23, anchorY: base };
}

// A town street lamp: a cast-iron post on a stone foot, a glass lantern.
function streetLamp(): PropArt {
  const pm = new Pixmap(16, 40);
  const solid = new Pixmap(16, 40);
  const base = 37;
  solid.rect(5, base - 2, 6, 3, CUT_P[2]);
  solid.hline(5, 10, base - 2, CUT_P[0]);
  for (let y = 12; y < base - 2; y++) {
    solid.set(7, y, IRON[1]);
    solid.set(8, y, IRON[3]);
  }
  solid.hline(6, 9, 20, IRON[1]);
  solid.hline(6, 9, base - 4, IRON[2]);
  // Lantern: a cap, four glass panes, a base.
  solid.hline(5, 10, 5, IRON[1]);
  solid.hline(6, 9, 4, IRON[0]);
  solid.set(7, 3, IRON[1]);
  for (let y = 6; y <= 10; y++) {
    solid.set(4, y, IRON[2]);
    solid.set(11, y, IRON[3]);
    for (let x = 5; x <= 10; x++) solid.set(x, y, x === 7 || x === 8 ? (y < 8 ? [255, 250, 210] : [255, 220, 130]) : y < 8 ? [252, 226, 150] : [240, 180, 90]);
  }
  solid.hline(4, 11, 11, IRON[2]);
  outlineOpaque(solid);
  groundShadow(solid, 8, base, 5, 1.4);
  halo(pm, 8, 8, 12, [255, 214, 130], 150);
  pm.blit(solid, 0, 0);
  return { pm, anchorX: 8, anchorY: base };
}

// The city's banner on a tall pole: red cloth, a golden eagle.
function bannerPole(seed: number): PropArt {
  const pm = new Pixmap(18, 50);
  const base = 47;
  groundShadow(pm, 8, base, 5, 1.4);
  for (let y = 3; y <= base; y++) {
    pm.set(6, y, WOOD[1]);
    pm.set(7, y, WOOD[3]);
  }
  pm.rect(5, 1, 4, 2, GOLD[1]);
  pm.hline(5, 15, 5, IRON[2]);
  const RED = ramp([176, 48, 52]);
  const sway = seed % 2;
  for (let j = 0; j < 24; j++) {
    for (let i = 0; i < 9; i++) {
      if (j >= 21 && i === 4) continue;
      if (j >= 22 && (i === 3 || i === 5)) continue;
      const fold = Math.sin((i + j * 0.3 + sway) * 0.9) * 0.35;
      pm.set(7 + i, 6 + j, j === 1 || j === 19 ? GOLD[1] : lit(RED, fold + (i === 0 ? 0.3 : i === 8 ? -0.4 : 0)));
    }
  }
  // Eagle: spread wings, head, tail.
  const ex = 11;
  const ey = 12;
  const G = GOLD[0];
  const D = GOLD[2];
  [[0, 0], [0, 1], [0, 2], [0, 3], [-1, 1], [1, 1], [-2, 0], [2, 0], [-3, 1], [3, 1], [-2, 2], [2, 2], [-1, 4], [1, 4], [0, -1]].forEach(([i, j]) => pm.set(ex + i, ey + j, j > 1 ? D : G));
  pm.set(ex + 1, ey - 1, [200, 120, 40]);
  outlineOpaque(pm);
  return { pm, anchorX: 7, anchorY: base };
}

// A small tree in a square stone planter (squares and boulevards).
function planter(seed: number): PropArt {
  const t = tree(22 + (seed % 2) * 3, seed);
  const W = Math.max(t.pm.w, 26);
  const pm = new Pixmap(W, t.pm.h + 6);
  const ox = Math.round((W - t.pm.w) / 2);
  pm.blit(t.pm, ox, 0);
  const base = t.pm.h + 4;
  const cx = ox + t.anchorX;
  for (let y = base - 7; y <= base; y++) {
    for (let x = cx - 9; x <= cx + 9; x++) {
      const topFace = y < base - 4;
      pm.set(x, y, topFace ? (Math.abs(x - cx) < 7 && y > base - 7 ? lit(ramp([110, 84, 60]), (hash2(x, y, seed) - 0.5) * 0.6) : lit(CUT_P, 0.45 - (x === cx + 9 ? 0.6 : 0))) : lit(CUT_P, (x === cx - 9 ? 0.2 : x === cx + 9 ? -0.7 : -0.2) + ((x - cx + 9) % 6 === 0 ? -0.35 : 0)));
    }
  }
  for (let y = base - 9; y <= base - 4; y++) for (let x = cx - 1; x <= cx + 1; x++) pm.set(x, y, barkPixel(x, y, cx - 1, cx + 1));
  outlineOpaque(pm);
  return { pm, anchorX: cx, anchorY: base };
}

// ------------------------------------------------------------ the quays

// A mooring post with a coil of rope.
function mooringPost(): PropArt {
  const pm = new Pixmap(12, 16);
  const base = 13;
  groundShadow(pm, 6, base, 5, 1.4);
  for (let y = 3; y <= base; y++) for (let x = 3; x <= 7; x++) pm.set(x, y, lit(WOOD_GREY, (x === 3 ? 0.4 : x === 7 ? -0.6 : 0) + (y === 3 ? 0.5 : 0)));
  const ROPE: RGB[] = [[214, 190, 140], [170, 146, 100]];
  for (let j = 0; j < 3; j++) pm.hline(2, 8, 6 + j * 2, ROPE[j % 2]);
  pm.set(9, 9, ROPE[0]);
  pm.set(10, 10, ROPE[1]);
  outlineOpaque(pm);
  return { pm, anchorX: 5, anchorY: base };
}

// A rowboat on the water, seen from above at an angle: pointed bow and
// stern, a lit gunwale, plank bottom with two thwarts, the tarred hull
// side showing below, a dark water line.
function rowboat(seed: number): PropArt {
  const L = 36;
  const W = 13;
  const pm = new Pixmap(L + 4, W + 8);
  const cy = 2 + W / 2;
  const HULL = ramp([86, 64, 52]);
  const half = (x: number) => (W / 2) * Math.pow(Math.max(0, Math.sin((Math.PI * (x - 2)) / L)), x > L / 2 ? 1.1 : 0.7);
  // Hull side below the gunwale (seen on the near side), then the boat.
  for (let x = 2; x <= L + 2; x++) {
    const h = half(x);
    if (h < 0.6) continue;
    const top = Math.round(cy - h);
    const bottom = Math.round(cy + h);
    for (let y = bottom; y <= bottom + 2; y++) pm.set(x, y, lit(HULL, -0.3 - (y - bottom) * 0.25));
    for (let y = top; y < bottom; y++) {
      const inner = h - Math.abs(y - cy);
      let c: RGB;
      if (inner < 1.2) c = lit(WOOD, y < cy ? 0.55 : 0.15); // gunwale
      else if (inner < 2.2) c = lit(WOOD_GREY, -0.6); // its shadow inside
      else c = lit(WOOD_GREY, 0.1 + ((y - top) % 3 === 0 ? -0.3 : 0) + (hash2(x >> 3, y, seed + 390) - 0.5) * 0.25);
      if (inner >= 2.2 && (Math.abs(x - 13) < 1 || Math.abs(x - 26) < 1)) c = lit(WOOD, 0.35); // thwarts
      pm.set(x, y, c);
    }
  }
  // An oar resting across, a coil of rope in the bow.
  for (let i = 0; i < 18; i++) pm.set(9 + i, Math.round(cy - 1 + i * 0.12), [206, 172, 120]);
  pm.rect(25, Math.round(cy) - 1, 4, 2, [196, 160, 110]);
  pm.set(31, Math.round(cy), [214, 190, 140]);
  pm.set(32, Math.round(cy) - 1, [170, 146, 100]);
  outlineOpaque(pm, 0.7);
  // Water line: a dark shadow and a glint along the hull.
  for (let x = 4; x <= L; x++) {
    const y = Math.round(cy + half(x)) + 3;
    if (!pm.filled(x, y)) pm.set(x, y, [20, 40, 58], 110);
    if (x % 5 === 2 && !pm.filled(x, y + 1)) pm.set(x, y + 1, [200, 230, 250], 160);
  }
  return { pm, anchorX: Math.round(L / 2) + 2, anchorY: Math.round(cy + W / 2) + 2 };
}

// Fishing nets hung to dry between two poles.
function netRack(seed: number): PropArt {
  const pm = new Pixmap(30, 26);
  const base = 23;
  groundShadow(pm, 15, base, 13, 1.6);
  for (const px of [3, 25]) for (let y = 3; y <= base; y++) {
    pm.set(px, y, WOOD[1]);
    pm.set(px + 1, y, WOOD[3]);
  }
  pm.hline(2, 27, 4, WOOD[2]);
  const NET: RGB = [184, 168, 126];
  for (let x = 5; x <= 24; x++) {
    const sag = Math.round(Math.sin(((x - 5) / 19) * Math.PI) * 4);
    const len = 10 + sag + Math.round(hash2(x, 1, seed) * 2);
    for (let y = 5; y < 5 + len; y++) if ((x + y) % 3 === 0 || (x - y + 99) % 3 === 0) pm.set(x, y, lit(ramp(NET), (hash2(x, y, seed) - 0.5) * 0.5));
    if ((x - 5) % 6 === 3) {
      pm.set(x, 5 + len, [222, 120, 60]);
      pm.set(x + 1, 5 + len, [190, 90, 46]);
    }
  }
  outlineOpaque(pm, 0.6);
  return { pm, anchorX: 15, anchorY: base };
}

// ----------------------------------------------------------- the hunters

// A hide stretched on a wooden frame to dry.
function peltRack(seed: number): PropArt {
  const pm = new Pixmap(22, 28);
  const base = 25;
  groundShadow(pm, 11, base, 9, 1.6);
  for (const px of [3, 17]) for (let y = 4; y <= base; y++) {
    pm.set(px, y, WOOD[1]);
    pm.set(px + 1, y, WOOD[3]);
  }
  pm.hline(2, 19, 5, WOOD[2]);
  pm.hline(2, 19, 21, WOOD[2]);
  const FUR = seed % 2 ? ramp([156, 116, 78]) : ramp([120, 108, 96], 0.6);
  pm.ellipse(5, 6, 12, 15, (dx, dy) => lit(FUR, -dx * 0.45 - dy * 0.3 + (hash2(Math.round(dx * 12), Math.round(dy * 15), 340 + seed) - 0.5) * 0.45));
  // Legs of the hide tied to the frame.
  for (const [x, y] of [[5, 7], [16, 7], [5, 19], [16, 19]]) pm.set(x, y, FUR[3]);
  for (let i = 0; i < 4; i++) pm.set(10 + (i & 1), 9 + i * 2, FUR[0]);
  outlineOpaque(pm);
  return { pm, anchorX: 11, anchorY: base };
}

// A milestone by the road: a squat round post of pale stone with a band
// of red paint and a carved notch for each league.
function milestone(seed: number): PropArt {
  const pm = new Pixmap(12, 16);
  const base = 13;
  groundShadow(pm, 7, base, 5, 1.4);
  for (let y = 3; y <= base; y++) {
    for (let x = 2; x <= 9; x++) {
      const nx = (x - 5.5) / 4;
      if (y === 3 && Math.abs(nx) > 0.6) continue;
      let c = lit(CUT_P, -nx * 0.8 + 0.15 + (y === 3 ? 0.5 : y === 4 ? 0.25 : 0) + (hash2(x, y, seed) - 0.5) * 0.15);
      if (y === 6 || y === 7) c = lit(CLOTH_RED, -nx * 0.7);
      pm.set(x, y, c);
    }
  }
  for (let i = 0; i < 1 + (seed % 3); i++) pm.set(4 + i * 2, 10, CUT_P[4]);
  pm.set(2, base - 1, MOSS[1]);
  pm.set(3, base, MOSS[2]);
  outlineOpaque(pm);
  return { pm, anchorX: 6, anchorY: base };
}

// --------------------------------------------------------- the corruption

const ROT = ramp([70, 58, 76], 0.6);
const VEIN: RGB = [190, 110, 240];

// A tree taken by the corruption: black twisted bark, violet veins that
// glow, a few withered leaves, pustules at the foot.
function blightTree(seed: number): PropArt {
  const pm = new Pixmap(40, 50);
  const base = 47;
  groundShadow(pm, 22, base, 13, 3);
  const branch = (x: number, y: number, ang: number, len: number, wid: number, depth: number) => {
    let cx = x;
    let cy = y;
    for (let i = 0; i < len; i++) {
      cx += Math.cos(ang);
      cy += Math.sin(ang);
      ang += (hash2(Math.round(cx), Math.round(cy), seed + 350) - 0.5) * 0.55;
      for (let k = 0; k < wid; k++) {
        const vein = wid > 2 && k === 1 && hash2(Math.round(cx), Math.round(cy), seed + 351) < 0.35;
        pm.set(Math.round(cx) + k - (wid >> 1), Math.round(cy), vein ? VEIN : lit(ROT, k === 0 ? 0.35 : k === wid - 1 ? -0.6 : -0.1));
      }
    }
    if (depth > 0) {
      branch(cx, cy, ang - 0.7, len * 0.62, Math.max(1, wid - 1), depth - 1);
      branch(cx, cy, ang + 0.55, len * 0.58, Math.max(1, wid - 1), depth - 1);
      if (depth > 1) branch(cx, cy, ang + 0.1, len * 0.5, Math.max(1, wid - 2), depth - 2);
    }
  };
  branch(20, base, -Math.PI / 2 + (hash2(seed, 1, 352) - 0.5) * 0.3, 16, 5, 3);
  // Roots clawing the ground.
  for (const [dx, a] of [[-1, Math.PI * 0.92], [1, Math.PI * 0.08], [0, Math.PI * 0.6]] as [number, number][]) {
    let x = 20 + dx * 2;
    let y = base - 1;
    for (let i = 0; i < 7; i++) {
      x += Math.cos(a);
      y += Math.sin(a) * 0.4;
      pm.set(Math.round(x), Math.round(y), ROT[3]);
    }
  }
  // Withered leaves clinging on, and pustules.
  const rnd = seeded(seed + 353);
  for (let i = 0; i < 14; i++) {
    const x = 4 + Math.floor(rnd() * 32);
    const y = 4 + Math.floor(rnd() * 22);
    if (pm.filled(x, y + 1) || pm.filled(x - 1, y)) pm.set(x, y, rnd() < 0.5 ? [112, 96, 60] : [92, 70, 86]);
  }
  for (const [px, py] of [[15, base - 2], [26, base - 1]]) {
    pm.ellipse(px - 2, py - 3, 5, 4, (dx, dy) => (dx * dx + dy * dy < 0.25 ? [236, 170, 255] : lit(ramp([150, 80, 190]), -dx * 0.5 - dy * 0.5)));
  }
  outlineOpaque(pm);
  return { pm, anchorX: 20, anchorY: base };
}

// A clump of corrupted brambles: black stems, thorns, sickly violet buds.
function thorns(seed: number): PropArt {
  const pm = new Pixmap(34, 26);
  const base = 23;
  groundShadow(pm, 18, base, 14, 2.4);
  const rnd = seeded(seed + 360);
  const CANE = ramp([86, 64, 92], 0.6);
  // Arching canes: up from the root, then curving over and down, 2 px
  // thick (lit on top), thorns on both sides, a few violet buds.
  for (let s = 0; s < 7; s++) {
    const rootX = 8 + rnd() * 18;
    const dir = rnd() < 0.5 ? -1 : 1;
    const span = 7 + rnd() * 8;
    const height = 9 + rnd() * 9;
    let prev: [number, number] | undefined;
    for (let t = 0; t <= 1.0001; t += 0.03) {
      const x = Math.round(rootX + dir * span * t);
      const y = Math.round(base - Math.sin(t * Math.PI * 0.85) * height);
      if (prev && prev[0] === x && prev[1] === y) continue;
      prev = [x, y];
      pm.set(x, y, lit(CANE, 0.35));
      pm.set(x, y + 1, lit(CANE, -0.45));
      if (Math.round(t * 100) % 12 === 0) {
        pm.set(x + dir, y - 1, CANE[0]);
        pm.set(x - dir, y + 2, CANE[3]);
      }
    }
    if (rnd() < 0.6 && prev) {
      pm.set(prev[0], prev[1] - 1, [214, 150, 250]);
      pm.set(prev[0] + 1, prev[1] - 1, VEIN);
    }
  }
  outlineOpaque(pm, 0.75);
  return { pm, anchorX: 17, anchorY: base };
}

// A cluster of glowing corrupted pods swelling out of the ground.
function blightPod(seed: number): PropArt {
  const pm = new Pixmap(24, 20);
  const t = new Pixmap(24, 20);
  const base = 17;
  const POD = ramp([150, 76, 186]);
  const rnd = seeded(seed + 370);
  const pods: [number, number, number][] = [[12, 12, 5], [6 + rnd() * 2, 14, 3], [17 + rnd() * 2, 14, 3.5]];
  pods.forEach(([px, py, r]) => {
    t.ellipse(Math.round(px - r), Math.round(py - r * 1.1), Math.round(r * 2), Math.round(r * 2.2), (dx, dy) => (dx * dx + (dy + 0.35) * (dy + 0.35) < 0.08 ? [246, 210, 255] : lit(POD, sphere(dx * 0.9, dy * 0.9) * 0.9)));
  });
  for (let x = 3; x <= 21; x++) t.set(x, base, ROT[3]);
  outlineOpaque(t, 0.7);
  halo(pm, 12, 11, 12, [190, 110, 240], 110);
  pm.blit(t, 0, 0);
  return { pm, anchorX: 12, anchorY: base };
}

// A well gone black: its stones charred, a dark sludge inside with a
// violet glow, thorns climbing the posts.
function blackWell(seed: number): PropArt {
  const pm = new Pixmap(28, 36);
  const base = 33;
  groundShadow(pm, 16, base, 12, 2.5);
  stoneRing(pm, 2, 21, 24, 13, seed);
  for (let y = 0; y < pm.h; y++) for (let x = 0; x < pm.w; x++) {
    const c = pm.get(x, y);
    if (!c || pm.data[(y * pm.w + x) * 4 + 3] !== 255) continue;
    pm.set(x, y, c[2] > c[0] + 20 ? mix([40, 20, 50], VEIN, hash2(x, y, seed) < 0.2 ? 0.6 : 0.15) : mix(c, [34, 30, 40], 0.45));
  }
  for (const px of [4, 22]) for (let y = 10; y <= 27; y++) {
    pm.set(px, y, ROT[1]);
    pm.set(px + 1, y, ROT[3]);
    if (hash2(px, y, seed) < 0.3) pm.set(px + (y % 2 ? -1 : 2), y, ROT[2]);
  }
  for (let x = 4; x <= 23; x++) pm.set(x, 10 + (x > 12 && x < 16 ? 1 : 0), ROT[2]); // broken beam
  outlineOpaque(pm);
  return { pm, anchorX: 14, anchorY: base };
}

export type PropKind =
  | 'tree'
  | 'big_tree'
  | 'apple_tree'
  | 'pine'
  | 'bush'
  | 'berry_bush'
  | 'flower_bush'
  | 'tall_grass'
  | 'flowers'
  | 'rock_small'
  | 'boulder_large'
  | 'mushroom'
  | 'crystal_glow'
  | 'treasure_chest_closed'
  | 'treasure_chest_open'
  | 'market_stall'
  | 'merchant_stall'
  | 'well'
  | 'wagon_cart'
  | 'scarecrow'
  | 'barrel'
  | 'crate'
  | 'sacks'
  | 'haystack'
  | 'woodpile'
  | 'bench'
  | 'trough'
  | 'signpost'
  | 'log'
  | 'lamppost'
  | 'stump'
  | 'altar'
  | 'standing_stone'
  | 'ruin_pillar'
  | 'reeds'
  | 'ore_rock'
  | 'herb_patch'
  | 'fern'
  | 'tent'
  | 'hide_hut'
  | 'campfire'
  | 'totem'
  | 'gravestone'
  | 'dead_tree'
  | 'fountain'
  | 'street_lamp'
  | 'banner_pole'
  | 'planter'
  | 'mooring_post'
  | 'rowboat'
  | 'net_rack'
  | 'pelt_rack'
  | 'milestone'
  | 'blight_tree'
  | 'thorns'
  | 'blight_pod'
  | 'black_well';

export function renderProp(kind: PropKind, seed = 1): PropArt {
  switch (kind) {
    // Sizes vary a little from one copy to the next.
    case 'tree':
      return tree(27 + (seed % 3) * 3, seed);
    case 'big_tree':
      return tree(43 + (seed % 3) * 3, seed);
    case 'apple_tree':
      return tree(30 + (seed % 2) * 3, seed, true);
    case 'pine':
      return pine(36 + (seed % 3) * 4, seed);
    case 'bush':
      return bush(14 + (seed % 3) * 2, seed);
    case 'berry_bush':
      return bush(18, seed, 'berries');
    case 'flower_bush':
      return bush(16, seed, 'flowers');
    case 'tall_grass':
      return tallGrass(seed);
    case 'flowers':
      return wildFlowers(seed);
    case 'rock_small':
      return rock(12, seed, false);
    case 'boulder_large':
      return rock(24, seed);
    case 'mushroom':
      return mushrooms();
    case 'crystal_glow':
      return crystal();
    case 'treasure_chest_closed':
      return chest(false);
    case 'treasure_chest_open':
      return chest(true);
    case 'market_stall':
      return stall(30, CLOTH_RED, seed);
    case 'merchant_stall':
      return stall(28, CLOTH_BLUE, seed + 1);
    case 'well':
      return well(seed);
    case 'wagon_cart':
      return wagon(seed);
    case 'scarecrow':
      return scarecrow(seed);
    case 'barrel':
      return barrel();
    case 'crate':
      return crate();
    case 'sacks':
      return sacks();
    case 'haystack':
      return haystack(seed);
    case 'woodpile':
      return woodpile();
    case 'bench':
      return bench();
    case 'trough':
      return trough();
    case 'signpost':
      return signpost();
    case 'log':
      return fallenLog(seed);
    case 'lamppost':
      return lamppost();
    case 'stump':
      return stump(seed);
    case 'altar':
      return altar();
    case 'standing_stone':
      return standingStone(seed);
    case 'ruin_pillar':
      return ruinPillar(seed);
    case 'reeds':
      return reeds(seed);
    case 'ore_rock':
      return oreRock(seed);
    case 'herb_patch':
      return herbPatch(seed);
    case 'fern':
      return fern(seed);
    case 'tent':
      return tent(seed);
    case 'hide_hut':
      return hideHut(seed);
    case 'campfire':
      return campfire(seed);
    case 'totem':
      return totem(seed);
    case 'gravestone':
      return gravestone(seed);
    case 'dead_tree':
      return deadTree(seed);
    case 'fountain':
      return fountain(seed);
    case 'street_lamp':
      return streetLamp();
    case 'banner_pole':
      return bannerPole(seed);
    case 'planter':
      return planter(seed);
    case 'mooring_post':
      return mooringPost();
    case 'rowboat':
      return rowboat(seed);
    case 'net_rack':
      return netRack(seed);
    case 'pelt_rack':
      return peltRack(seed);
    case 'milestone':
      return milestone(seed);
    case 'blight_tree':
      return blightTree(seed);
    case 'thorns':
      return thorns(seed);
    case 'blight_pod':
      return blightPod(seed);
    case 'black_well':
      return blackWell(seed);
  }
}

export function renderFence(len: number): PropArt {
  return fence(len);
}

export function renderStoneWall(len: number, seed = 1): PropArt {
  return stoneWall(len, seed);
}

export function renderFlowerBed(w: number, h: number, seed = 1): PropArt {
  return flowerBed(w, h, seed);
}

export function renderPatch(material: PatchKind, w: number, h: number): PropArt {
  return patch(material, w, h);
}

// ---------------------------------------------------------------- dungeons

export type DungeonPropKind =
  | 'torch'
  | 'bones'
  | 'sarcophagus'
  | 'cobweb'
  | 'pillar'
  | 'brazier'
  | 'urn'
  | 'rubble'
  | 'candles'
  | 'skulls'
  | 'runes'
  | 'bookshelf'
  | 'lectern'
  | 'scrolls'
  | 'chains'
  | 'statue'
  | 'table'
  | 'puddle'
  | 'vein'
  | 'bed'
  | 'hearth'
  | 'stool'
  | 'dining_table'
  | 'counter'
  | 'loom'
  | 'cat_basket'
  | 'pots';

const CRYPT = ramp([124, 118, 128], 0.4);
const BONE = ramp([226, 218, 194], 0.6);
const CLAY = ramp([170, 104, 70]);

function flame(pm: Pixmap, cx: number, bottom: number, h: number): void {
  for (let j = 0; j < h; j++) {
    const t = j / h; // 0 at the bottom
    const half = Math.max(0, Math.round((1 - t) * 2.2 - (t > 0.8 ? 1 : 0)));
    for (let i = -half; i <= half; i++) {
      const core = Math.abs(i) < half * 0.5 && t < 0.6;
      pm.set(cx + i + (t > 0.6 ? 1 : 0), bottom - j, core ? [255, 246, 200] : t < 0.35 ? [252, 196, 90] : [240, 116, 50]);
    }
  }
}

// Soft light around a point, under whatever is drawn later.
function halo(pm: Pixmap, cx: number, cy: number, r: number, c: RGB, alpha: number): void {
  for (let y = 0; y < pm.h; y++) {
    for (let x = 0; x < pm.w; x++) {
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d < 1 && !pm.filled(x, y)) pm.set(x, y, c, Math.round((1 - d) * (1 - d) * alpha));
    }
  }
}

const SHELF_P = ramp([112, 74, 50]);
const SPINES: RGB[] = [
  [150, 52, 50],
  [62, 92, 140],
  [70, 112, 72],
  [176, 136, 70],
  [110, 70, 120],
];
const PAPER = ramp([226, 214, 180], 0.6);

function moreDungeonProps(kind: DungeonPropKind): PropArt | undefined {
  if (kind === 'bookshelf') {
    // A free-standing bookcase, a few books fallen, one leaning.
    const pm = new Pixmap(24, 34);
    const base = 31;
    groundShadow(pm, 13, base, 11, 2);
    for (let y = 2; y <= base; y++) for (let x = 1; x <= 21; x++) {
      const side = x <= 2 || x >= 20;
      const ly = (y - 4) % 7;
      let c: RGB;
      if (y <= 3) c = lit(SHELF_P, y === 2 ? 0.5 : 0.2);
      else if (side) c = lit(SHELF_P, x <= 2 ? 0.25 : -0.55);
      else if (ly === 6 || y === base) c = lit(SHELF_P, -0.2);
      else if (ly === 0) c = [36, 26, 30];
      else {
        const b = Math.floor(x / 2) + Math.floor((y - 4) / 7) * 3;
        c = hash2(b, 1, 501) < 0.15 ? [36, 26, 30] : mix(SPINES[Math.floor(hash2(b, 2, 501) * SPINES.length)], x % 2 ? [20, 16, 22] : [255, 240, 210], 0.14);
        if (ly === 3 && hash2(b, 3, 501) < 0.5) c = [214, 180, 90];
      }
      pm.set(x, y, c);
    }
    outlineOpaque(pm);
    return { pm, anchorX: 12, anchorY: base };
  }
  if (kind === 'lectern') {
    // A reading stand with an open book and a candle stub.
    const pm = new Pixmap(18, 24);
    const t = new Pixmap(18, 24);
    const base = 21;
    for (let y = 11; y <= base; y++) {
      t.set(8, y, SHELF_P[1]);
      t.set(9, y, SHELF_P[3]);
    }
    t.hline(5, 12, base, SHELF_P[2]);
    for (let j = 0; j < 4; j++) t.hline(3 + j, 14 - j, 10 - j, lit(SHELF_P, -0.2 - j * 0.1));
    // The open book on the slope.
    for (let y = 5; y <= 9; y++) for (let x = 4; x <= 13; x++) t.set(x, y, x === 8 || x === 9 ? PAPER[3] : lit(PAPER, (x < 8 ? 0.3 : -0.1) + ((y + x) % 3 === 0 && y > 5 ? -0.4 : 0)));
    t.set(14, 7, [240, 230, 200]);
    t.set(14, 6, [255, 210, 120]);
    outlineOpaque(t, 0.7);
    halo(pm, 14, 6, 8, [255, 200, 120], 90);
    groundShadow(pm, 10, base, 6, 1.5);
    pm.blit(t, 0, 0);
    return { pm, anchorX: 9, anchorY: base };
  }
  if (kind === 'scrolls') {
    // Rolled scrolls and loose sheets heaped on the floor.
    const pm = new Pixmap(22, 12);
    const roll = (x: number, y: number, len: number) => {
      for (let i = 0; i < len; i++) {
        pm.set(x + i, y, lit(PAPER, 0.4));
        pm.set(x + i, y + 1, lit(PAPER, -0.1));
        pm.set(x + i, y + 2, lit(PAPER, -0.6));
      }
      pm.set(x + len, y + 1, PAPER[4]);
      pm.set(x - 1, y + 1, [150, 50, 50]);
    };
    for (let y = 7; y <= 10; y++) for (let x = 2; x <= 9; x++) pm.set(x, y, lit(PAPER, (x + y) % 4 === 0 ? -0.5 : 0.1));
    roll(5, 6, 10);
    roll(9, 8, 9);
    roll(3, 3, 8);
    outlineOpaque(pm, 0.6);
    return { pm, anchorX: 11, anchorY: 10 };
  }
  if (kind === 'chains') {
    // Chains and a manacle hanging from a ring in the wall.
    const pm = new Pixmap(14, 22);
    const C: RGB[] = [[150, 152, 166], [92, 94, 108]];
    for (const [x0, len] of [[4, 16], [9, 12]] as [number, number][]) {
      for (let j = 0; j < len; j++) pm.set(x0 + Math.round(Math.sin(j / 4) * 0.6), 2 + j, C[j & 1]);
    }
    pm.rect(3, 18, 4, 3, C[1]);
    pm.set(4, 19, [30, 26, 34]);
    pm.set(5, 19, [30, 26, 34]);
    pm.hline(3, 10, 1, C[0]);
    outlineOpaque(pm, 0.6);
    return { pm, anchorX: 6, anchorY: 0 };
  }
  if (kind === 'statue') {
    // A stone knight on a plinth, hands on the hilt of a sword.
    const pm = new Pixmap(20, 44);
    const base = 41;
    groundShadow(pm, 11, base, 9, 2);
    for (let y = base - 7; y <= base; y++) for (let x = 2; x <= 17; x++) pm.set(x, y, lit(CRYPT, (y === base - 7 ? 0.6 : 0) + (x === 2 ? 0.3 : x === 17 ? -0.6 : -0.1)));
    const body = (x: number, y: number, k: number) => pm.set(x, y, lit(CRYPT, k));
    for (let y = 8; y < base - 7; y++) {
      const half = y < 13 ? 3 : y < 26 ? 5 : 4;
      for (let x = 10 - half; x <= 9 + half; x++) body(x, y, (x - 9.5) / half * -0.7 + 0.1 + (y === 13 ? -0.3 : 0));
    }
    // Helm with a slit, pauldrons, the sword in front.
    for (let y = 3; y < 8; y++) for (let x = 7; x <= 12; x++) body(x, y, x < 9 ? 0.5 : x > 11 ? -0.5 : 0.1);
    pm.hline(8, 11, 5, CRYPT[4]);
    pm.hline(4, 15, 13, CRYPT[1]);
    for (let y = 14; y < base - 7; y++) pm.set(10, y, CRYPT[0]);
    pm.hline(7, 13, 17, CRYPT[0]);
    pm.set(5, 30, [96, 128, 80]);
    pm.set(6, 31, [96, 128, 80]);
    outlineOpaque(pm);
    return { pm, anchorX: 10, anchorY: base };
  }
  if (kind === 'table') {
    // A heavy table with ledgers, an inkwell and a candle.
    const pm = new Pixmap(30, 22);
    const t = new Pixmap(30, 22);
    const base = 19;
    for (let y = 6; y <= 11; y++) for (let x = 1; x <= 28; x++) t.set(x, y, lit(SHELF_P, (y === 6 ? 0.5 : 0.15) + (x === 28 ? -0.5 : 0) + (x % 7 === 0 ? -0.25 : 0)));
    for (let y = 12; y <= 13; y++) t.hline(1, 28, y, SHELF_P[3]);
    for (const lx of [2, 26]) for (let y = 14; y <= base; y++) {
      t.set(lx, y, SHELF_P[2]);
      t.set(lx + 1, y, SHELF_P[4]);
    }
    for (let y = 7; y <= 10; y++) for (let x = 4; x <= 12; x++) t.set(x, y, x === 8 ? PAPER[3] : lit(PAPER, x < 8 ? 0.2 : -0.1));
    t.rect(15, 7, 6, 3, [110, 50, 50]);
    t.hline(15, 20, 7, [150, 70, 64]);
    t.rect(22, 8, 2, 2, [30, 30, 40]);
    t.set(25, 6, [240, 230, 200]);
    t.set(25, 5, [255, 210, 120]);
    outlineOpaque(t, 0.7);
    halo(pm, 25, 5, 9, [255, 200, 120], 80);
    groundShadow(pm, 15, base, 13, 1.8);
    pm.blit(t, 0, 0);
    return { pm, anchorX: 15, anchorY: base };
  }
  if (kind === 'puddle') {
    // Standing water on the floor (flat).
    const pm = new Pixmap(30, 12);
    pm.ellipse(0, 0, 30, 12, (dx, dy) => (dx * dx + dy * dy > 0.8 ? [40, 46, 56] : dy < -0.2 && Math.abs(dx) < 0.5 && (Math.round(dx * 15) & 1) ? [150, 170, 190] : [60, 76, 92]));
    for (let i = 3; i < pm.data.length; i += 4) if (pm.data[i]) pm.data[i] = 200;
    return { pm, anchorX: 15, anchorY: 6 };
  }
  if (kind === 'vein') {
    // Cracks in the floor glowing with the corruption (flat).
    const pm = new Pixmap(40, 24);
    const crack = (x: number, y: number, ang: number, len: number, depth: number) => {
      let cx = x;
      let cy = y;
      for (let i = 0; i < len; i++) {
        cx += Math.cos(ang);
        cy += Math.sin(ang) * 0.6;
        ang += (hash2(Math.round(cx), Math.round(cy), 509) - 0.5) * 0.8;
        pm.set(Math.round(cx), Math.round(cy), i < len * 0.6 ? [214, 150, 252] : [150, 82, 200], 230);
      }
      if (depth > 0) {
        crack(cx, cy, ang - 0.8, len * 0.6, depth - 1);
        crack(cx, cy, ang + 0.7, len * 0.5, depth - 1);
      }
    };
    crack(20, 12, 0.2, 12, 2);
    crack(20, 12, Math.PI + 0.3, 11, 2);
    halo(pm, 20, 12, 16, [170, 90, 230], 70);
    return { pm, anchorX: 20, anchorY: 12 };
  }
  return undefined;
}

const QUILT = ramp([160, 70, 64]);
const STRAW_P = ramp([214, 180, 110]);

function homeProps(kind: DungeonPropKind): PropArt | undefined {
  if (kind === 'bed') {
    // A wooden bed, its head against the wall: pillow, a patchwork quilt.
    const pm = new Pixmap(24, 36);
    const base = 33;
    groundShadow(pm, 13, base, 11, 2);
    for (let y = 1; y <= base; y++) for (let x = 2; x <= 21; x++) {
      const frame = x <= 3 || x >= 20 || y <= 3 || y >= base - 1;
      if (frame) pm.set(x, y, lit(SHELF_P, x <= 3 || y <= 3 ? 0.3 : -0.5));
      else if (y <= 10) pm.set(x, y, lit(PAPER, (x < 8 ? 0.3 : 0) - (y === 10 ? 0.4 : 0)));
      else {
        const patch = (Math.floor(x / 4) + Math.floor(y / 5)) % 3;
        const r = patch === 0 ? QUILT : patch === 1 ? ramp([196, 160, 90]) : ramp([96, 120, 150]);
        pm.set(x, y, lit(r, (x === 4 ? 0.3 : x === 19 ? -0.4 : 0) + (y === 11 ? 0.4 : 0) - ((x + y) % 4 === 0 ? 0.15 : 0)));
      }
    }
    outlineOpaque(pm);
    return { pm, anchorX: 12, anchorY: base };
  }
  if (kind === 'hearth') {
    // A stone fireplace built into the back wall, a fire in it, a pot.
    const pm = new Pixmap(34, 34);
    const t = new Pixmap(34, 34);
    const base = 31;
    for (let y = 2; y <= base; y++) for (let x = 2; x <= 31; x++) {
      const s = cell(x, y, 5, 511, 1.4);
      t.set(x, y, s.d2 - s.d1 < 0.12 ? STONE[4] : lit(STONE, -s.dx * 0.4 - s.dy * 0.5 + (hash2(s.id, 1, 512) - 0.5) * 0.5));
    }
    // Mantel, opening, coals and flames.
    for (let x = 1; x <= 32; x++) {
      t.set(x, 10, lit(SHELF_P, 0.3));
      t.set(x, 11, SHELF_P[3]);
    }
    for (let y = 15; y <= base; y++) for (let x = 8; x <= 25; x++) {
      if (y === 15 && (x === 8 || x === 25)) continue;
      t.set(x, y, mix([24, 16, 18], [255, 140, 60], Math.max(0, (y - 20) / 14) * 0.6));
    }
    for (let x = 10; x <= 23; x++) t.set(x, base - 1, hash2(x, 2, 513) < 0.5 ? [255, 200, 90] : [214, 76, 44]);
    flame(t, 14, base - 2, 8);
    flame(t, 19, base - 2, 10);
    // A pot hanging over the fire, a pot on the mantel.
    t.vline(17, 16, 19, IRON[2]);
    for (let y = 20; y <= 23; y++) t.hline(14, 20, y, lit(IRON, y === 20 ? 0.3 : -0.3));
    t.rect(5, 7, 4, 3, CLAY_P[1]);
    t.rect(25, 6, 3, 4, ramp([150, 180, 120])[2]);
    outlineOpaque(t);
    halo(pm, 17, 24, 22, [255, 170, 80], 120);
    pm.blit(t, 0, 0);
    return { pm, anchorX: 17, anchorY: base };
  }
  if (kind === 'stool') {
    const pm = new Pixmap(10, 10);
    const base = 8;
    groundShadow(pm, 5, base, 4, 1.2);
    pm.ellipse(1, 1, 8, 4, (dx, dy) => lit(SHELF_P, -dx * 0.4 - dy * 0.5 + 0.2));
    for (const lx of [2, 7]) pm.vline(lx, 4, base, SHELF_P[3]);
    pm.vline(5, 5, base, SHELF_P[2]);
    outlineOpaque(pm);
    return { pm, anchorX: 5, anchorY: base };
  }
  if (kind === 'dining_table') {
    // A table laid with bread, mugs and a candle.
    const pm = new Pixmap(30, 22);
    const t = new Pixmap(30, 22);
    const base = 19;
    for (let y = 5; y <= 11; y++) for (let x = 1; x <= 28; x++) t.set(x, y, lit(SHELF_P, (y === 5 ? 0.5 : 0.15) + (x === 28 ? -0.5 : 0) + (x % 7 === 0 ? -0.25 : 0)));
    for (let y = 12; y <= 13; y++) t.hline(1, 28, y, SHELF_P[3]);
    for (const lx of [2, 26]) for (let y = 14; y <= base; y++) {
      t.set(lx, y, SHELF_P[2]);
      t.set(lx + 1, y, SHELF_P[4]);
    }
    // Bread, two mugs, a plate.
    t.ellipse(5, 6, 7, 4, (dx, dy) => lit(STRAW_P, -dx * 0.4 - dy * 0.6));
    for (const mx of [15, 20]) {
      t.rect(mx, 5, 3, 4, lit(WOOD_GREY, 0.2));
      t.hline(mx, mx + 2, 5, [246, 240, 220]);
      t.set(mx + 3, 6, WOOD_GREY[3]);
    }
    t.ellipse(8, 9, 6, 2, () => [214, 210, 200]);
    t.set(25, 6, [240, 230, 200]);
    t.set(25, 5, [255, 210, 120]);
    outlineOpaque(t, 0.7);
    halo(pm, 25, 5, 9, [255, 200, 120], 80);
    groundShadow(pm, 15, base, 13, 1.8);
    pm.blit(t, 0, 0);
    return { pm, anchorX: 15, anchorY: base };
  }
  if (kind === 'counter') {
    // The inn's counter: a long plank top, a front of boards, mugs and a
    // keg on it.
    const pm = new Pixmap(60, 22);
    const base = 19;
    groundShadow(pm, 31, base, 29, 2);
    for (let y = 4; y <= base; y++) for (let x = 1; x <= 58; x++) {
      if (y <= 7) pm.set(x, y, lit(SHELF_P, y === 4 ? 0.55 : 0.2));
      else pm.set(x, y, lit(SHELF_P, -0.25 + (x % 6 === 0 ? -0.45 : 0) + (y === 8 ? -0.4 : 0)));
    }
    for (const mx of [10, 16, 40]) {
      pm.rect(mx, 1, 3, 4, lit(WOOD_GREY, 0.2));
      pm.hline(mx, mx + 2, 1, [246, 240, 220]);
    }
    pm.ellipse(24, -1, 10, 8, (dx) => lit(WOOD, -dx * 0.6));
    pm.hline(24, 33, 1, IRON[2]);
    outlineOpaque(pm);
    return { pm, anchorX: 30, anchorY: base };
  }
  if (kind === 'loom') {
    // A weaver's loom with a half-woven blue and gold cloth.
    const pm = new Pixmap(28, 30);
    const base = 27;
    groundShadow(pm, 15, base, 12, 2);
    for (const px of [2, 24]) for (let y = 2; y <= base; y++) {
      pm.set(px, y, SHELF_P[1]);
      pm.set(px + 1, y, SHELF_P[3]);
    }
    pm.hline(2, 25, 3, SHELF_P[2]);
    pm.hline(2, 25, 20, SHELF_P[2]);
    for (let x = 5; x <= 22; x += 2) pm.vline(x, 4, 12, [226, 214, 186]);
    for (let y = 12; y <= 19; y++) for (let x = 4; x <= 23; x++) pm.set(x, y, (x + y) % 5 === 0 ? [214, 170, 70] : lit(ramp([70, 100, 170]), (y - 15) * -0.1 + (x % 2 ? 0.1 : -0.1)));
    pm.rect(8, 22, 12, 3, SHELF_P[2]);
    outlineOpaque(pm);
    return { pm, anchorX: 14, anchorY: base };
  }
  if (kind === 'cat_basket') {
    // A wicker basket with a sleeping cat curled in it.
    const pm = new Pixmap(16, 12);
    const base = 10;
    groundShadow(pm, 8, base, 7, 1.4);
    pm.ellipse(1, 3, 14, 8, (dx, dy) => (dy < -0.2 ? undefined : lit(STRAW_P, -dx * 0.5 + ((Math.round(dx * 7) + Math.round(dy * 4)) % 2 ? -0.3 : 0.1))));
    const C = ramp([226, 140, 60]); // a ginger cat
    pm.ellipse(3, 1, 10, 6, (dx, dy) => lit(C, -dx * 0.4 - dy * 0.6));
    pm.set(10, 2, C[0]);
    pm.set(12, 2, C[0]);
    outlineOpaque(pm, 0.7);
    return { pm, anchorX: 8, anchorY: base };
  }
  if (kind === 'pots') {
    // Clay pots of seedlings on a low plank.
    const pm = new Pixmap(24, 14);
    const base = 12;
    groundShadow(pm, 12, base, 11, 1.4);
    pm.hline(1, 22, base - 1, SHELF_P[2]);
    pm.hline(1, 22, base, SHELF_P[4]);
    for (const [px, h] of [[3, 5], [10, 6], [17, 5]] as [number, number][]) {
      for (let y = base - 5; y <= base - 2; y++) for (let x = px; x <= px + 4; x++) pm.set(x, y, lit(CLAY_P, x === px ? 0.4 : x === px + 4 ? -0.5 : 0));
      for (let j = 0; j < h; j++) pm.set(px + 2 + (j > 2 ? (j % 2 ? 1 : -1) : 0), base - 6 - j, LEAVES[j % 2 ? 1 : 2]);
      pm.set(px + 1, base - 9, LEAVES[0]);
      pm.set(px + 3, base - 8, px === 10 ? [222, 72, 60] : LEAVES[1]); // a first tomato
    }
    outlineOpaque(pm, 0.7);
    return { pm, anchorX: 12, anchorY: base };
  }
  return undefined;
}

export function renderDungeonProp(kind: DungeonPropKind): PropArt {
  const more = moreDungeonProps(kind) ?? homeProps(kind);
  if (more) return more;
  if (kind === 'candles') {
    // A cluster of melted candles on the floor, wax pooled at their feet.
    const pm = new Pixmap(20, 20);
    const t = new Pixmap(20, 20);
    const WAX = ramp([226, 214, 186], 0.6);
    for (let x = 4; x <= 15; x++) t.set(x, 17, lit(WAX, x < 8 ? 0.2 : -0.4));
    for (let x = 6; x <= 13; x++) t.set(x, 18, WAX[3]);
    for (const [cx, hgt] of [[6, 5], [9, 8], [12, 4], [14, 6]] as [number, number][]) {
      for (let j = 0; j < hgt; j++) {
        t.set(cx, 16 - j, WAX[1]);
        t.set(cx + 1, 16 - j, WAX[3]);
      }
      t.set(cx + 1, 17 - hgt + 2, WAX[0]); // drip
      t.set(cx, 16 - hgt, [60, 50, 50]); // wick
      t.set(cx, 15 - hgt, [255, 230, 150]);
      t.set(cx, 14 - hgt, [252, 180, 80]);
    }
    outlineOpaque(t, 0.7);
    halo(pm, 10, 9, 10, [255, 190, 110], 90);
    pm.blit(t, 0, 0);
    return { pm, anchorX: 10, anchorY: 18 };
  }
  if (kind === 'skulls') {
    // A heap of skulls and long bones against a wall.
    const pm = new Pixmap(22, 14);
    const skull = (x: number, y: number) => {
      for (let j = 0; j < 4; j++) {
        for (let i = 0; i < 4; i++) {
          if ((j === 0 || j === 3) && (i === 0 || i === 3)) continue;
          pm.set(x + i, y + j, lit(BONE, (i === 0 ? 0.5 : i === 3 ? -0.5 : 0.1) + (j === 0 ? 0.3 : j === 3 ? -0.4 : 0)));
        }
      }
      pm.set(x + 1, y + 2, [40, 30, 34]);
      pm.set(x + 2, y + 2, [40, 30, 34]);
    };
    for (let i = 0; i < 6; i++) pm.hline(2 + i, 18 - i, 12 - Math.floor(i / 2), BONE[i % 2 ? 2 : 3]);
    skull(3, 8);
    skull(8, 9);
    skull(13, 8);
    skull(6, 5);
    skull(11, 4);
    pm.hline(15, 20, 11, BONE[1]);
    pm.set(20, 10, BONE[0]);
    outlineOpaque(pm);
    return { pm, anchorX: 11, anchorY: 12 };
  }
  if (kind === 'runes') {
    // A faintly glowing circle of runes carved in the floor (flat).
    const pm = new Pixmap(56, 34);
    const cx = 27.5;
    const cy = 16.5;
    for (let y = 0; y < pm.h; y++) {
      for (let x = 0; x < pm.w; x++) {
        const nx = (x - cx) / 26;
        const ny = (y - cy) / 15.5;
        const d = Math.sqrt(nx * nx + ny * ny);
        const ang = Math.atan2(ny, nx);
        const ring = Math.abs(d - 0.95) < 0.045 || Math.abs(d - 0.72) < 0.05;
        const rune = d > 0.76 && d < 0.91 && Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 18) % 2 === 0 && hash2(Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 54), Math.round(d * 12), 7) < 0.55;
        const star = d < 0.72 && (Math.abs(Math.sin(ang * 2.5 + 0.3)) * d < 0.035 * 2.2 / Math.max(0.2, d) * 0.4);
        if (ring || rune || star) pm.set(x, y, [178, 120, 236], ring ? 170 : 130);
        else if (d < 1.1) pm.set(x, y, [120, 70, 190], Math.round(Math.max(0, 1.1 - d) * 40));
      }
    }
    return { pm, anchorX: 28, anchorY: 17 };
  }
  if (kind === 'torch') {
    // Wall sconce: iron bracket, pitch-wrapped head, a live flame, halo.
    const pm = new Pixmap(28, 32);
    const t = new Pixmap(28, 32);
    t.hline(12, 15, 22, IRON[2]);
    t.hline(11, 16, 23, IRON[3]);
    t.vline(13, 14, 21, WOOD[2]);
    t.vline(14, 14, 21, WOOD[3]);
    t.rect(12, 12, 4, 3, [70, 52, 44]);
    t.hline(12, 15, 13, [96, 70, 50]);
    flame(t, 13, 11, 8);
    outlineOpaque(t);
    halo(pm, 14, 9, 14, [255, 180, 90], 110);
    pm.blit(t, 0, 0);
    return { pm, anchorX: 14, anchorY: 23 };
  }
  if (kind === 'brazier') {
    const pm = new Pixmap(28, 30);
    const t = new Pixmap(28, 30);
    for (let y = 13; y <= 17; y++) {
      for (let x = 8; x <= 19; x++) {
        if (y === 17 && (x < 10 || x > 17)) continue;
        t.set(x, y, lit(IRON, (x < 11 ? 0.5 : x > 16 ? -0.6 : 0) + (y === 13 ? 0.4 : 0)));
      }
    }
    for (const lx of [10, 13, 17]) for (let y = 18; y <= 26; y++) t.set(lx + (y > 23 ? Math.sign(lx - 13) : 0), y, IRON[2]);
    for (let x = 9; x <= 18; x++) t.set(x, 12, hash2(x, 1, 2) < 0.5 ? [252, 196, 90] : [214, 76, 44]);
    flame(t, 11, 11, 7);
    flame(t, 15, 11, 9);
    outlineOpaque(t);
    groundShadow(t, 15, 26, 7, 1.6);
    halo(pm, 14, 9, 14, [255, 170, 80], 120);
    pm.blit(t, 0, 0);
    return { pm, anchorX: 14, anchorY: 26 };
  }
  if (kind === 'bones') {
    const pm = new Pixmap(20, 12);
    // Skull: dome, eye sockets, teeth.
    for (let y = 1; y <= 6; y++) {
      for (let x = 2; x <= 7; x++) {
        const nx = (x - 4.5) / 3;
        const ny = (y - 3.5) / 3;
        if (nx * nx + ny * ny > 1.1) continue;
        pm.set(x, y, lit(BONE, sphere(nx, ny) * 0.8));
      }
    }
    pm.set(3, 4, [40, 30, 34]);
    pm.set(6, 4, [40, 30, 34]);
    pm.set(4, 4, [70, 60, 60]);
    pm.hline(4, 6, 7, BONE[2]);
    pm.set(5, 7, BONE[4]);
    // Ribs and long bones.
    for (let i = 0; i < 4; i++) {
      pm.hline(10, 15, 3 + i * 2, BONE[1 + (i % 2)]);
      pm.set(10, 3 + i * 2, BONE[3]);
    }
    pm.vline(12, 2, 9, BONE[3]);
    for (let i = 0; i < 8; i++) pm.set(3 + i, 10 - Math.floor(i / 4), i % 3 ? BONE[1] : BONE[3]);
    pm.set(2, 10, BONE[0]);
    pm.set(11, 8, BONE[0]);
    outlineOpaque(pm);
    return { pm, anchorX: 10, anchorY: 10 };
  }
  if (kind === 'sarcophagus') {
    const pm = new Pixmap(20, 32);
    const base = 29;
    groundShadow(pm, 11, base, 9, 2);
    // Lid (top face) with a carved effigy, then the front panel.
    for (let y = 1; y <= 22; y++) {
      for (let x = 2; x <= 17; x++) pm.set(x, y, lit(CRYPT, (x === 2 || y === 1 ? 0.6 : 0.15) + (x === 17 ? -0.5 : 0) + (hash2(x, y, 9) - 0.5) * 0.25));
    }
    for (let y = 3; y <= 6; y++) for (let x = 8; x <= 11; x++) pm.set(x, y, lit(CRYPT, x === 8 ? 0.7 : x === 11 ? -0.4 : 0.35));
    for (let y = 7; y <= 19; y++) {
      const w = y < 10 ? 4 : y < 16 ? 3 : 2;
      for (let x = 6; x <= 13; x++) {
        if (Math.abs(x - 9.5) > w) continue;
        pm.set(x, y, lit(CRYPT, x - 9.5 < -w + 1 ? 0.7 : x - 9.5 > w - 1 ? -0.5 : 0.3));
      }
    }
    pm.vline(9, 8, 20, CRYPT[3]);
    pm.vline(10, 8, 20, CRYPT[0]);
    pm.hline(7, 12, 10, CRYPT[3]);
    pm.hline(8, 11, 12, CRYPT[1]);
    for (let y = 23; y <= base; y++) {
      for (let x = 2; x <= 17; x++) {
        const panel = x > 4 && x < 15 && y > 24 && y < base - 1;
        pm.set(x, y, lit(CRYPT, (y === 23 ? -0.6 : -0.25) + (panel ? -0.25 : 0) + (x === 2 ? 0.3 : x === 17 ? -0.6 : 0)));
      }
    }
    pm.hline(2, 17, 22, CRYPT[1]);
    pm.set(5, 1, [96, 128, 80]);
    pm.set(16, 21, [96, 128, 80]);
    outlineOpaque(pm);
    return { pm, anchorX: 10, anchorY: base };
  }
  if (kind === 'pillar') {
    const pm = new Pixmap(16, 44);
    const base = 41;
    groundShadow(pm, 9, base, 7, 1.6);
    for (let y = 4; y <= base; y++) {
      const cap = y < 8 || y > base - 4;
      const x0 = cap ? 1 : 3;
      const x1 = cap ? 14 : 12;
      for (let x = x0; x <= x1; x++) {
        const nx = (x - (x0 + x1) / 2) / ((x1 - x0) / 2);
        const flute = !cap && (x - x0) % 3 === 0;
        pm.set(x, y, lit(CRYPT, -nx * 0.9 + 0.15 + (flute ? -0.35 : 0) + (y === 4 || y === base - 3 ? 0.5 : 0)));
      }
    }
    let kx = 9;
    for (let y = 14; y < 24; y++) {
      pm.set(kx, y, CRYPT[4]);
      if (hash2(kx, y, 3) < 0.4) kx -= 1;
    }
    outlineOpaque(pm);
    return { pm, anchorX: 8, anchorY: base };
  }
  if (kind === 'urn') {
    const pm = new Pixmap(14, 18);
    const base = 16;
    groundShadow(pm, 8, base, 5, 1.4);
    for (let y = 1; y <= base; y++) {
      const t = (y - 1) / (base - 1);
      const hw = y <= 2 ? 3 : y <= 4 ? 2 : Math.round(2 + Math.sin(((t - 0.15) / 0.85) * Math.PI) * 3.5);
      for (let x = 7 - hw; x <= 6 + hw; x++) {
        const nx = (x - 6.5) / Math.max(1, hw);
        pm.set(x, y, lit(CLAY, -nx * 0.9 + 0.1 + (y === 1 ? 0.5 : 0) + (y === 9 ? -0.4 : 0)));
      }
    }
    pm.hline(4, 9, 9, [226, 190, 120]);
    outlineOpaque(pm);
    return { pm, anchorX: 7, anchorY: base };
  }
  if (kind === 'rubble') {
    const pm = new Pixmap(22, 12);
    const rnd = seeded(5);
    for (let i = 0; i < 7; i++) {
      const w = 3 + Math.floor(rnd() * 4);
      const x0 = 1 + Math.floor(rnd() * (20 - w));
      const y0 = 3 + Math.floor(rnd() * 6);
      for (let j = 0; j < Math.max(2, w - 2); j++) for (let k = 0; k < w; k++) pm.set(x0 + k, y0 + j, lit(CRYPT, (j === 0 ? 0.6 : 0) + (k === w - 1 ? -0.6 : 0) - j * 0.15));
    }
    outlineOpaque(pm);
    return { pm, anchorX: 11, anchorY: 10 };
  }
  // Cobweb for corners: radial threads and sagging spirals.
  const pm = new Pixmap(16, 16);
  const W2: RGB = [226, 226, 234];
  for (let a = 0; a <= 4; a++) {
    const ang = (a / 4) * (Math.PI / 2);
    for (let r = 0; r < 16; r++) pm.set(Math.round(Math.cos(ang) * r), Math.round(Math.sin(ang) * r), W2);
  }
  for (const r of [4, 8, 12]) {
    for (let k = 0; k <= 24; k++) {
      const ang = (k / 24) * (Math.PI / 2);
      const sag = Math.sin(((k % 6) / 6) * Math.PI) * 0.8;
      pm.set(Math.round(Math.cos(ang) * (r - sag)), Math.round(Math.sin(ang) * (r - sag)), W2);
    }
  }
  for (let i = 3; i < pm.data.length; i += 4) if (pm.data[i]) pm.data[i] = 140;
  return { pm, anchorX: 0, anchorY: 0 };
}
