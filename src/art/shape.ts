// Shapes with volume, shared by the monsters and the item icons: a
// polygon filled and shaded as if bevelled, light from the top left.

import { Pixmap, Ramp, lit } from './pixmap';

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
