import { scatter } from '../../art/settle';
import { GroundSpec, materialAt } from '../../art/ground';
import type { PropKind } from '../../art/props';
import type { PropSpot } from '../zonePlan';

// Fills an area with natural decor (woods, rough ground) while keeping
// the zone playable: nothing on the roads (polylines with a clearance)
// or around the spots the scene uses (NPCs, markers, exits…).

export interface Keepout {
  roads?: { points: [number, number][]; clear: number }[];
  spots?: [number, number, number][]; // x, y, radius
  // The zone's ground: nothing but water plants and drowned things in the
  // water.
  ground?: GroundSpec;
}

const WET = new Set<PropKind>(['reeds', 'swamp_tree', 'sunken_ruin', 'dead_tree']);

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

// How far a kind spreads at its foot (trunk and roots, a bush's base…).
const FOOT: Partial<Record<PropKind, number>> = {
  big_tree: 12,
  tree: 9,
  apple_tree: 9,
  pine: 8,
  swamp_tree: 10,
  dead_tree: 7,
  blight_tree: 9,
  bush: 7,
  berry_bush: 7,
  flower_bush: 7,
  fern: 6,
  boulder_large: 10,
  rock_small: 5,
  stump: 6,
  log: 11,
  mushroom: 4,
  reeds: 6,
  tall_grass: 4,
  thorns: 9,
  sunken_ruin: 12,
};
export function footOf(kind: PropKind): number {
  return FOOT[kind] ?? 8;
}

export type Layer = [area: { x: number; y: number; w: number; h: number }, n: number, spacing: number, kinds: [PropKind, number][], seed: number, margin?: number];

// Natural decor in layers (big trees first, then the undergrowth…): each
// layer keeps clear of the hand-placed props and of the layers before it.
export function woods(keep: Keepout, placed: PropSpot[], layers: Layer[]): PropSpot[] {
  const out: PropSpot[] = [];
  layers.forEach(([area, n, spacing, kinds, seed, margin]) => out.push(...fill(area, n, spacing, kinds, seed, keep, margin ?? 0, [...placed, ...out])));
  return out;
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
  taken: PropSpot[] = [],
): PropSpot[] {
  const total = kinds.reduce((s, [, w]) => s + w, 0);
  // Never on top of something already there: each kind's footprint.
  const reach = Math.max(...kinds.map(([k]) => footOf(k)));
  const crowded = (px: number, py: number) => taken.some((t) => Math.hypot(t.x - px, (t.y - py) * 1.4) < footOf(t.kind) + reach);
  return scatter(area.x, area.y, area.w, area.h, n, spacing, seed, (px, py) => blocked(px, py, keep, margin) || crowded(px, py)).map(([x, y], i) => {
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
  }).filter((p) => {
    if (!keep.ground || WET.has(p.kind)) return true;
    const m = materialAt(keep.ground, p.x, p.y);
    return m !== 'water' && m !== 'bog';
  });
}
