import type { ZoneArt } from '../zonePlan';
import type { WallStyle } from '../../art/buildings';
import type { DungeonPropKind, PropKind } from '../../art/props';

// Pieces shared by the dungeon zones built on the common layout (220 wide,
// side walls, a back wall, the scene's wall blocks on alternate sides).

export type Block = [number, number, number, number]; // x, y, w, h (the scene's)

// Side walls seen from above (solid), the back wall with its face, the
// scene's own wall blocks.
export function enclosure(h: number, style: WallStyle, blocks: Block[], opts: { niches?: boolean; backFace?: number } = {}): NonNullable<ZoneArt['walls']> {
  return [
    { x: 7, y: h / 2, w: 14, h, face: 0, solid: true, style },
    { x: 213, y: h / 2, w: 14, h, face: 0, solid: true, style },
    { x: 110, y: 6, w: 220, h: 12, face: opts.backFace ?? 14, style, niches: opts.niches },
    ...blocks.map(([x, y, w, h2]) => ({ x, y, w, h: h2, style, niches: opts.niches })),
  ];
}

export const FOUR_24: Block[] = [
  [20, 360, 24, 60],
  [200, 280, 24, 60],
  [20, 140, 24, 60],
  [200, 360, 24, 60],
];
export const THREE_30: Block[] = [
  [20, 360, 30, 60],
  [200, 280, 30, 60],
  [20, 140, 30, 60],
];

export const d = (kind: DungeonPropKind, x: number, y: number) => ({ kind, x, y });

export const THREE_24: Block[] = [
  [20, 360, 24, 60],
  [200, 280, 24, 60],
  [20, 140, 24, 60],
];

// Floor clutter for the dungeons on the common layout: what lies about in
// each kind of place, scattered where it can't be in the way — off the
// central aisle, the gate line, the boss's dais, the chest, the entrance,
// the walls, and clear of what the zone already has. A few cobwebs hang on
// the west wall.
export type Clutter = 'crypt' | 'archive' | 'cave' | 'flooded' | 'roots' | 'lodge' | 'camp';

const CLUTTER: Record<Clutter, { floor: [DungeonPropKind, number][]; props?: [PropKind, number][]; webs: number }> = {
  crypt: { floor: [['bones', 3], ['skulls', 2], ['rubble', 3], ['urn', 2]], webs: 3 },
  archive: { floor: [['scrolls', 4], ['rubble', 2], ['urn', 1], ['bones', 1]], webs: 3 },
  cave: { floor: [['rubble', 3], ['bones', 2], ['puddle', 2]], props: [['rock_small', 3], ['mushroom', 2]], webs: 1 },
  flooded: { floor: [['puddle', 4], ['rubble', 3], ['bones', 1]], props: [['mushroom', 1], ['rock_small', 2]], webs: 2 },
  roots: { floor: [['vein', 2], ['rubble', 2], ['bones', 2]], props: [['mushroom', 3], ['rock_small', 1]], webs: 1 },
  lodge: { floor: [['pots', 2], ['scrolls', 2], ['rubble', 1]], webs: 2 },
  camp: { floor: [['pots', 2], ['bones', 1], ['rubble', 2]], props: [['rock_small', 1]], webs: 1 },
};

function pick<T>(kinds: [T, number][], r: number): T {
  const total = kinds.reduce((s, [, w]) => s + w, 0);
  let v = r * total;
  for (const [k, w] of kinds) {
    if (v < w) return k;
    v -= w;
  }
  return kinds[0][0];
}

export function dress(art: ZoneArt, theme: Clutter, n = 12): ZoneArt {
  const set = CLUTTER[theme];
  const { w, h } = art.ground;
  let seed = (art.ground.seed ?? 1) * 7919 + 13;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const taken: [number, number][] = [...(art.props ?? []), ...(art.dprops ?? [])].map((p) => [p.x, p.y]);
  const walls = (art.walls ?? []).filter((wl) => wl.h < h); // the scene's blocks and the back wall
  const free = (x: number, y: number) =>
    x > 24 && x < w - 24 && y > 26 && y < h - 14 &&
    Math.abs(x - w / 2) > 26 && // the aisle
    (y < 168 || y > 214) && // the gate line
    Math.hypot(x - w / 2, (y - 70) * 1.2) > 58 && // the boss's dais
    Math.hypot(x - 170, y - 380) > 26 && // the chest
    !(y > h - 40 && Math.abs(x - w / 2) < 46) && // the entrance
    !walls.some((wl) => x > wl.x - wl.w / 2 - 10 && x < wl.x + wl.w / 2 + 10 && y > wl.y - wl.h / 2 - 6 && y < wl.y + wl.h / 2 + 14) &&
    taken.every(([tx, ty]) => Math.hypot(tx - x, ty - y) > 20);
  const dprops: NonNullable<ZoneArt['dprops']> = [];
  const props: NonNullable<ZoneArt['props']> = [];
  for (let i = 0; i < 400 && dprops.length + props.length < n; i++) {
    const x = Math.round(rnd() * w);
    const y = Math.round(rnd() * h);
    if (!free(x, y)) continue;
    taken.push([x, y]);
    if (set.props && rnd() < 0.3) props.push({ kind: pick(set.props, rnd()), x, y, seed: 1 + (i % 7) });
    else dprops.push({ kind: pick(set.floor, rnd()), x, y });
  }
  // Cobwebs high on the west wall, away from the existing ones.
  for (let i = 0, made = 0; i < 40 && made < set.webs; i++) {
    const y = 40 + Math.round(rnd() * (h - 80));
    if (taken.some(([tx, ty]) => tx < 30 && Math.abs(ty - y) < 60) || walls.some((wl) => wl.x < 40 && Math.abs(wl.y - y) < wl.h / 2 + 10)) continue;
    taken.push([14, y]);
    dprops.push({ kind: 'cobweb', x: 14, y });
    made++;
  }
  return { ...art, props: [...(art.props ?? []), ...props], dprops: [...(art.dprops ?? []), ...dprops] };
}
