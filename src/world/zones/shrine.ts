import type { PropSpot, ZoneArt } from '../zonePlan';
import { Keepout, woods } from './scatterDecor';

// The little sanctuary: a sacred grove where a flagstone way leads up to
// an old altar between two broken columns; standing stones of a ruined
// circle lie along the way. The hermit lives by the altar. Exit south.
const SHRINE_PROPS: PropSpot[] = [
  { kind: 'altar', x: 100, y: 58 },
  { kind: 'ruin_pillar', x: 60, y: 82, seed: 1 },
  { kind: 'ruin_pillar', x: 140, y: 82, seed: 2 },
  // The ruined circle along the way (where the scene had its markers).
  { kind: 'standing_stone', x: 70, y: 232, seed: 1 },
  { kind: 'standing_stone', x: 150, y: 292, seed: 2 },
  { kind: 'standing_stone', x: 90, y: 352, seed: 3 },
  { kind: 'rock_small', x: 160, y: 226, seed: 2 },
  // The hermit's corner: a bench and a woodpile under a tree.
  { kind: 'bench', x: 170, y: 116 },
  { kind: 'woodpile', x: 196, y: 140 },
  // The sacred grove around.
  { kind: 'big_tree', x: 18, y: 54, seed: 4 },
  { kind: 'big_tree', x: 200, y: 66, seed: 6 },
  { kind: 'tree', x: 26, y: 150, seed: 2 },
  { kind: 'pine', x: 196, y: 200, seed: 3 },
  { kind: 'tree', x: 20, y: 280, seed: 9 },
  { kind: 'bush', x: 40, y: 300, seed: 5 },
  { kind: 'flower_bush', x: 186, y: 250, seed: 2 },
  { kind: 'tree', x: 200, y: 370, seed: 7 },
  { kind: 'pine', x: 18, y: 380, seed: 8 },
  { kind: 'mushroom', x: 34, y: 166 },
  { kind: 'log', x: 168, y: 336, seed: 4 },
];

const SHRINE_KEEP: Keepout = {
  roads: [{ points: [[110, 400], [108, 300], [112, 200], [104, 110], [100, 70]], clear: 16 }],
  spots: [
    [102, 62, 56], // the altar's terrace
    [140, 100, 18], [170, 116, 16], // the hermit, his bench
    [70, 232, 14], [150, 292, 14], [90, 352, 14], // standing stones
    [110, 360, 22], [180, 300, 20], [100, 88, 20], [150, 260, 20], // arrivals
  ],
};

export const SHRINE: ZoneArt = {
  key: 'shrine',
  ground: {
    w: 220,
    h: 400,
    base: 'grass',
    seed: 41,
    shapes: [
      { kind: 'path', material: 'flagstone', width: 18, points: [[110, 400], [108, 300], [112, 200], [104, 110], [100, 70]] },
      { kind: 'ellipse', material: 'flagstone', x: 52, y: 26, w: 100, h: 76 },
    ],
  },
  props: [...SHRINE_PROPS, ...woods(SHRINE_KEEP, SHRINE_PROPS, [
    // The grove thickens toward the edges.
    [{ x: 0, y: 0, w: 46, h: 400 }, 7, 30, [['tree', 3], ['big_tree', 1], ['pine', 2]], 411, 6],
    [{ x: 176, y: 0, w: 44, h: 400 }, 7, 30, [['tree', 3], ['big_tree', 1], ['pine', 2]], 412, 6],
    [{ x: 0, y: 0, w: 220, h: 400 }, 18, 22, [['bush', 2], ['fern', 3], ['flower_bush', 1], ['tall_grass', 3], ['flowers', 5], ['mushroom', 1]], 413, 4],
  ])],
  beds: [
    { x: 62, y: 104, w: 18, h: 7 },
    { x: 140, y: 104, w: 16, h: 7 },
  ],
  meadow: { n: 16, seed: 41 },
  next: ['basse-combe'],
  preview: {
    hero: [110, 260],
    npcs: [['shrine_hermit', 140, 100]],
  },
};
