import type { ZoneArt } from '../zonePlan';
import type { WallStyle } from '../../art/buildings';
import type { DungeonPropKind } from '../../art/props';

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
