// A small RGBA drawing surface for the world art drawn by the game (ground,
// buildings, props), in the same spirit as heroDoll.ts: pure code, no
// Phaser, 1 art pixel = 1 game pixel.

export type RGB = readonly [number, number, number];
export type Tones = readonly [RGB, RGB, RGB]; // light, mid, dark

export const OUTLINE: RGB = [34, 28, 41];

export class Pixmap {
  readonly data: Uint8ClampedArray;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  set(x: number, y: number, c: RGB, alpha = 255): void {
    if (!this.inside(x, y)) return;
    const o = (y * this.w + x) * 4;
    this.data[o] = c[0];
    this.data[o + 1] = c[1];
    this.data[o + 2] = c[2];
    this.data[o + 3] = alpha;
  }

  filled(x: number, y: number): boolean {
    return this.inside(x, y) && this.data[(y * this.w + x) * 4 + 3] > 0;
  }

  get(x: number, y: number): RGB | undefined {
    if (!this.filled(x, y)) return undefined;
    const o = (y * this.w + x) * 4;
    return [this.data[o], this.data[o + 1], this.data[o + 2]];
  }

  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }

  hline(x0: number, x1: number, y: number, c: RGB): void {
    for (let x = x0; x <= x1; x++) this.set(x, y, c);
  }

  vline(x: number, y0: number, y1: number, c: RGB): void {
    for (let y = y0; y <= y1; y++) this.set(x, y, c);
  }

  // Filled ellipse inside the box (x, y, w, h); shade(dx, dy) in -1..1 picks the color.
  ellipse(x: number, y: number, w: number, h: number, color: (dx: number, dy: number) => RGB | undefined): void {
    const cx = x + w / 2 - 0.5;
    const cy = y + h / 2 - 0.5;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const dx = (x + i - cx) / (w / 2);
        const dy = (y + j - cy) / (h / 2);
        if (dx * dx + dy * dy > 1) continue;
        const c = color(dx, dy);
        if (c) this.set(x + i, y + j, c);
      }
    }
  }

  // Dark outline around everything drawn (4-neighbours).
  outline(c: RGB = OUTLINE): void {
    const add: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.filled(x, y)) continue;
        if (this.filled(x - 1, y) || this.filled(x + 1, y) || this.filled(x, y - 1) || this.filled(x, y + 1)) add.push(x, y);
      }
    }
    for (let i = 0; i < add.length; i += 2) this.set(add[i], add[i + 1], c);
  }

  // Draws another pixmap on top (transparent pixels skipped).
  blit(src: Pixmap, ox: number, oy: number): void {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const s = (y * src.w + x) * 4;
        const a = src.data[s + 3];
        if (!a) continue;
        if (!this.inside(ox + x, oy + y)) continue;
        const d = ((oy + y) * this.w + ox + x) * 4;
        if (a === 255) {
          this.data.set(src.data.subarray(s, s + 4), d);
        } else {
          // Alpha blend (shadows).
          const t = a / 255;
          for (let k = 0; k < 3; k++) this.data[d + k] = this.data[d + k] * (1 - t) + src.data[s + k] * t;
          this.data[d + 3] = Math.max(this.data[d + 3], a);
        }
      }
    }
  }
}

// Deterministic noise so the same scene always draws the same way.
export function hash2(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Smooth value noise in 0..1 at the given scale (in pixels).
export function noise(x: number, y: number, scale: number, seed = 0): number {
  const fx = x / scale;
  const fy = y / scale;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// A 5-tone ramp: highlight, light, mid, shade, deep. Lights lean warm and
// shades lean cool, like hand-picked pixel art palettes.
export type Ramp = readonly [RGB, RGB, RGB, RGB, RGB];

export function ramp(mid: RGB, warmth = 1): Ramp {
  const k = (c: RGB, f: number, dr: number, dg: number, db: number): RGB => [
    clamp(Math.round(c[0] * f + dr * warmth)),
    clamp(Math.round(c[1] * f + dg * warmth)),
    clamp(Math.round(c[2] * f + db * warmth)),
  ];
  return [k(mid, 1.32, 14, 10, -6), k(mid, 1.15, 8, 5, -4), mid, k(mid, 0.78, -4, 0, 10), k(mid, 0.56, -6, -2, 16)];
}

export function clamp(v: number): number {
  return Math.max(0, Math.min(255, v));
}

export function mix(a: RGB, b: RGB, k: number): RGB {
  return [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)];
}

// Picks a ramp tone from a light level in about -1 (deep) .. 1 (highlight).
export function lit(r: Ramp, level: number): RGB {
  if (level > 0.62) return r[0];
  if (level > 0.22) return r[1];
  if (level > -0.22) return r[2];
  if (level > -0.62) return r[3];
  return r[4];
}

export interface Cell {
  id: number; // stable id of the nearest seed
  d1: number; // distance to the nearest seed
  d2: number; // distance to the second nearest
  dx: number; // offset from the nearest seed, -1..1 over a cell
  dy: number;
}

// Jittered Voronoi cells (natural stones, cobbles, slabs): size in pixels,
// stretch > 1 widens cells horizontally.
export function cell(x: number, y: number, size: number, seed: number, stretch = 1): Cell {
  const fx = x / (size * stretch);
  const fy = y / size;
  const gx = Math.floor(fx);
  const gy = Math.floor(fy);
  let d1 = Infinity;
  let d2 = Infinity;
  let id = 0;
  let bx = 0;
  let by = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = gx + i;
      const cy = gy + j;
      const px = cx + 0.15 + hash2(cx, cy, seed) * 0.7;
      const py = cy + 0.15 + hash2(cx, cy, seed + 1) * 0.7;
      const d = Math.hypot(fx - px, fy - py);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        id = cx * 7919 + cy * 104729;
        bx = fx - px;
        by = fy - py;
      } else if (d < d2) d2 = d;
    }
  }
  return { id, d1, d2, dx: bx * 2, dy: by * 2 };
}
