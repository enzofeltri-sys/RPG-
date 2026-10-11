// Shapes with volume, shared by the monsters and the item icons: a
// polygon filled and shaded as if bevelled, light from the top left.

import { Pixmap, Ramp, hash2, lit, noise } from './pixmap';

// Light from the top left, a little in front.
export const LIGHT: [number, number, number] = [-0.45, -0.65, 0.62];
const L = LIGHT;

export type Pt = [number, number];
function inside(pts: Pt[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function edgeDist(pts: Pt[], x: number, y: number): number {
  let best = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, ay] = pts[j];
    const [bx, by] = pts[i];
    const dx = bx - ax;
    const dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return best;
}
// A body part as a polygon, given volume: each pixel's height grows with
// its distance from the part's edge (rounded up to `round` pixels), its
// normal follows that slope, and the light picks the tone.
export interface PartOpts {
  round?: number; // how far in the surface keeps curving (px)
  bias?: number;
  tex?: (x: number, y: number) => number;
}
export function part(pm: Pixmap, pts: Pt[], r: Ramp, o: PartOpts = {}): void {
  const round = o.round ?? 4;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const h = (x: number, y: number) => (inside(pts, x, y) ? Math.sqrt(Math.min(1, edgeDist(pts, x, y) / round)) : 0);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      const cx = x + 0.5;
      const cy = y + 0.5;
      if (!inside(pts, cx, cy)) continue;
      const gx = h(cx + 1, cy) - h(cx - 1, cy);
      const gy = h(cx, cy + 1) - h(cx, cy - 1);
      // Normal from the slope; flat tops face the viewer.
      const nx = -gx;
      const ny = -gy;
      const nz = 0.9;
      const nl = Math.hypot(nx, ny, nz);
      const level = ((nx * L[0] + ny * L[1] + nz * L[2]) / nl) * 1.4 - 0.55 + (o.bias ?? 0) + (o.tex ? o.tex(x, y) : 0) - (cy - Math.min(...ys)) / (Math.max(...ys) - Math.min(...ys) + 1) * 0.25;
      pm.set(x, y, lit(r, level));
    }
  }
}

// Fur: the same volume as part(), but the tones break into clumps
// streaked along the way the fur lies (`dir`, radians, 0 = to the right,
// π/2 = down), and tufts poke out past the edge in that direction, so the
// coat reads as hair rather than as a smooth, inflated shape.
export interface FurOpts {
  round?: number;
  bias?: number;
  dir?: number;
  clump?: number; // how strongly the clumps break the shading
  tufts?: number; // 0..1, how many tufts stick out
  seed?: number;
}
export function furPart(pm: Pixmap, pts: Pt[], r: Ramp, o: FurOpts = {}): void {
  const round = o.round ?? 4;
  const dir = o.dir ?? Math.PI / 2;
  const cd = Math.cos(dir);
  const sd = Math.sin(dir);
  const seed = o.seed ?? 7;
  const clump = o.clump ?? 0.4;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minY = Math.min(...ys);
  const spanY = Math.max(...ys) - minY + 1;
  const h = (x: number, y: number) => (inside(pts, x, y) ? Math.sqrt(Math.min(1, edgeDist(pts, x, y) / round)) : 0);
  const streak = (x: number, y: number) => {
    const u = x * cd + y * sd;
    const v = -x * sd + y * cd;
    return noise(u * 0.22, v * 1.5, 1.1, seed) - 0.5;
  };
  const levelAt = (x: number, y: number) => {
    const gx = h(x + 1, y) - h(x - 1, y);
    const gy = h(x, y + 1) - h(x, y - 1);
    const nl = Math.hypot(gx, gy, 0.9);
    return ((-gx * L[0] - gy * L[1] + 0.9 * L[2]) / nl) * 1.3 - 0.5 + (o.bias ?? 0) - ((y - minY) / spanY) * 0.3 + streak(x, y) * clump * 2;
  };
  const x0 = Math.floor(Math.min(...xs)) - 2;
  const x1 = Math.ceil(Math.max(...xs)) + 2;
  const y0 = Math.floor(minY) - 2;
  const y1 = Math.ceil(Math.max(...ys)) + 2;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const cx = x + 0.5;
      const cy = y + 0.5;
      if (inside(pts, cx, cy)) {
        pm.set(x, y, lit(r, levelAt(cx, cy)));
        continue;
      }
      // A tuft: just outside, with the coat behind it along the fur.
      const t = o.tufts ?? 0.5;
      if (t > 0 && edgeDist(pts, cx, cy) < 1.6 && inside(pts, cx - cd * 2, cy - sd * 2) && hash2(x, y, seed) < t) {
        pm.set(x, y, lit(r, levelAt(cx - cd * 2, cy - sd * 2) - 0.3));
      }
    }
  }
}
