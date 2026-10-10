import type { PropSpot, ZoneArt } from '../zonePlan';
import { Keepout, woods } from './scatterDecor';

// The goblin camp: a trampled clearing in the woods, hide huts around a
// fire, crooked totems, a ragged palisade, bones everywhere. The chief
// waits at the back (north), the trail leads south to the forest.
const GOBLIN_KEEP: Keepout = {
  roads: [{ points: [[130, 400], [128, 300], [132, 200], [130, 40]], clear: 16 }],
  spots: [
    [80, 100, 22],
    [190, 70, 22],
    [130, 30, 28],
    [190, 185, 20],
    [70, 128, 30],
    [190, 118, 30],
    [130, 150, 22],
    [90, 280, 16],
    [180, 320, 16],
    [130, 360, 22], // arrival from the forest
  ],
};

const GOBLIN_CAMP_PROPS: PropSpot[] = [
  { kind: 'hide_hut', x: 70, y: 152, seed: 1 },
  { kind: 'hide_hut', x: 190, y: 142, seed: 2 },
  { kind: 'campfire', x: 130, y: 156, seed: 1 },
  { kind: 'log', x: 106, y: 176, seed: 1 },
  { kind: 'totem', x: 90, y: 292, seed: 1 },
  { kind: 'totem', x: 180, y: 332, seed: 2 },
  { kind: 'totem', x: 100, y: 46, seed: 3 },
  { kind: 'totem', x: 160, y: 46, seed: 4 },
  { kind: 'barrel', x: 36, y: 166 },
  { kind: 'crate', x: 224, y: 160 },
  { kind: 'sacks', x: 218, y: 176 },
];

export const GOBLIN_CAMP: ZoneArt = {
  key: 'goblin-camp',
  ground: {
    w: 260,
    h: 400,
    base: 'forest',
    seed: 71,
    shapes: [
      { kind: 'ellipse', material: 'dirt', x: 30, y: 44, w: 200, h: 190, rough: 18 },
      { kind: 'path', material: 'dirt', width: 16, points: [[130, 400], [126, 330], [134, 260], [130, 200]] },
      { kind: 'ellipse', material: 'marsh', x: 196, y: 248, w: 40, h: 22, rough: 5 },
    ],
  },
  props: [...GOBLIN_CAMP_PROPS, ...woods(GOBLIN_KEEP, GOBLIN_CAMP_PROPS, [
    [{ x: 0, y: 10, w: 260, h: 390 }, 22, 30, [['tree', 3], ['pine', 3], ['big_tree', 1]], 72, 70],
    [{ x: 0, y: 10, w: 260, h: 390 }, 26, 18, [['bush', 3], ['fern', 4], ['rock_small', 2], ['stump', 1]], 73, 18],
  ])],
  dprops: [
    { kind: 'bones', x: 112, y: 210 },
    { kind: 'bones', x: 200, y: 96 },
    { kind: 'skulls', x: 52, y: 96 },
    { kind: 'rubble', x: 150, y: 230 },
  ],
  palisades: [
    { x: 46, y: 30, len: 72 },
    { x: 214, y: 30, len: 72 },
  ],
  meadow: { n: 6, seed: 71 },
  next: ['forest'],
  preview: { hero: [130, 250], npcs: [] },
};

// The bandit camp: canvas tents on a packed-earth clearing, a fire with
// log seats, stolen goods piled up, a stockade at the back where the chief
// waits. The road leads south back to the field.
const BANDIT_KEEP: Keepout = {
  roads: [{ points: [[130, 400], [130, 200], [130, 40]], clear: 16 }],
  spots: [
    [90, 100, 22],
    [180, 70, 22],
    [130, 30, 28],
    [190, 185, 20],
    [60, 138, 34],
    [200, 128, 34],
    [130, 150, 22],
    [130, 180, 16],
    [130, 360, 22], // arrival from the field
  ],
};

const BANDIT_CAMP_PROPS: PropSpot[] = [
  { kind: 'tent', x: 60, y: 164, seed: 1 },
  { kind: 'tent', x: 200, y: 154, seed: 2 },
  { kind: 'campfire', x: 130, y: 160, seed: 2 },
  { kind: 'log', x: 104, y: 178, seed: 3 },
  { kind: 'log', x: 152, y: 134, seed: 4 },
  // Stolen goods.
  { kind: 'crate', x: 80, y: 278 },
  { kind: 'crate', x: 90, y: 284 },
  { kind: 'barrel', x: 70, y: 286 },
  { kind: 'crate', x: 190, y: 318 },
  { kind: 'sacks', x: 204, y: 322 },
  { kind: 'wagon_cart', x: 210, y: 236, seed: 5 },
  { kind: 'barrel', x: 30, y: 210 },
  { kind: 'barrel', x: 38, y: 214 },
  // More of the band: a tent at the back, firewood, a rack of pelts.
  { kind: 'tent', x: 34, y: 98, seed: 3 },
  { kind: 'woodpile', x: 228, y: 96 },
  { kind: 'pelt_rack', x: 50, y: 228, seed: 2 },
  { kind: 'barrel', x: 226, y: 206 },
];

export const BANDIT_CAMP: ZoneArt = {
  key: 'bandit-camp',
  ground: {
    w: 260,
    h: 400,
    base: 'grass',
    seed: 81,
    shapes: [
      { kind: 'ellipse', material: 'dirt', x: 18, y: 34, w: 224, h: 220, rough: 18 },
      { kind: 'path', material: 'dirt', width: 16, points: [[130, 400], [134, 320], [128, 250]] },
    ],
  },
  props: [...BANDIT_CAMP_PROPS, ...woods(BANDIT_KEEP, BANDIT_CAMP_PROPS, [
    [{ x: 0, y: 10, w: 260, h: 390 }, 16, 32, [['tree', 3], ['pine', 2], ['big_tree', 1]], 82, 80],
    [{ x: 0, y: 10, w: 260, h: 390 }, 16, 22, [['bush', 3], ['rock_small', 2], ['stump', 2], ['boulder_large', 1]], 83, 40],
  ])],
  // Fire baskets either side of the stockade gate where the chief waits.
  dprops: [
    { kind: 'brazier', x: 104, y: 52 },
    { kind: 'brazier', x: 156, y: 52 },
  ],
  palisades: [
    { x: 50, y: 36, len: 80 },
    { x: 210, y: 36, len: 80 },
  ],
  meadow: { n: 12, seed: 81 },
  next: ['field'],
  preview: { hero: [130, 220], npcs: [['guard_generic', 190, 185]] },
};
