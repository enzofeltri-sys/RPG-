import { scatter } from '../../art/settle';
import type { PropKind } from '../../art/props';
import type { PropSpot } from '../zonePlan';

// Fills an area with natural decor (woods, rough ground) while keeping
// the zone playable: nothing on the roads (polylines with a clearance)
// or around the spots the scene uses (NPCs, markers, exits…).

export interface Keepout {
  roads?: { points: [number, number][]; clear: number }[];
  spots?: [number, number, number][]; // x, y, radius
}

function segDist(px: number, py: number, a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / len)) : 0;
  return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy);
}

export function blocked(x: number, y: number, k: Keepout, extra = 0): boolean {
  for (const r of k.roads ?? []) {
    for (let i = 1; i < r.points.length; i++) if (segDist(x, y, r.points[i - 1], r.points[i]) < r.clear + extra) return true;
  }
  return (k.spots ?? []).some(([sx, sy, sr]) => Math.hypot(sx - x, sy - y) < sr + extra);
}

// A mix of kinds with weights, scattered at a minimum spacing.
export function fill(
  area: { x: number; y: number; w: number; h: number },
  n: number,
  spacing: number,
  kinds: [PropKind, number][],
  seed: number,
  keep: Keepout,
  margin = 0,
): PropSpot[] {
  const total = kinds.reduce((s, [, w]) => s + w, 0);
  return scatter(area.x, area.y, area.w, area.h, n, spacing, seed, (px, py) => blocked(px, py, keep, margin)).map(([x, y], i) => {
    let r = ((i * 7919 + seed * 31) % 1000) / 1000 * total;
    let kind = kinds[0][0];
    for (const [k, w] of kinds) {
      if (r < w) {
        kind = k;
        break;
      }
      r -= w;
    }
    return { kind, x, y, seed: (i % 9) + 1 + seed };
  });
}
