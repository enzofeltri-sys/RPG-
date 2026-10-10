import type { PropSpot, ZoneArt } from '../zonePlan';
import { Keepout, woods } from './scatterDecor';

// Basse-Combe, the home hamlet: three cottages strung along a dirt lane,
// gardens and firewood, trees framing the lane, a dry-stone wall closing
// the south. The x=120 lane stays clear from the south edge to the north
// exit; the west and east edges lead to the farm and the shrine.
const HAMLET_PROPS: PropSpot[] = [
  // Trees behind the houses and framing the lane.
  { kind: 'tree', x: 16, y: 58, seed: 4 },
  { kind: 'apple_tree', x: 88, y: 54, seed: 3 },
  { kind: 'pine', x: 226, y: 52, seed: 2 },
  { kind: 'tree', x: 150, y: 50, seed: 8 },
  { kind: 'tree', x: 88, y: 230, seed: 1 },
  { kind: 'tree', x: 156, y: 236, seed: 5 },
  { kind: 'bush', x: 74, y: 238, seed: 2 },
  { kind: 'bush', x: 30, y: 196, seed: 6 },
  { kind: 'flower_bush', x: 210, y: 196, seed: 3 },
  // Thibault's cottage: firewood against the wall.
  { kind: 'woodpile', x: 82, y: 110 },
  // Solange the weaver: a bench by the door, a barrel.
  { kind: 'bench', x: 220, y: 118 },
  { kind: 'barrel', x: 164, y: 110 },
  // Gontrand's corner: a bench, a lantern, crates of books.
  { kind: 'bench', x: 26, y: 262 },
  { kind: 'crate', x: 70, y: 262 },
  { kind: 'lamppost', x: 82, y: 252 },
  // Grandmother Fauvette: her garden and firewood.
  { kind: 'scarecrow', x: 172, y: 362, seed: 2 },
  { kind: 'woodpile', x: 222, y: 318 },
  // The south edge: hedges and stones by the wall.
  { kind: 'bush', x: 16, y: 386, seed: 7 },
  { kind: 'pine', x: 226, y: 384, seed: 6 },
  { kind: 'rock_small', x: 60, y: 372, seed: 3 },
  { kind: 'stump', x: 200, y: 372, seed: 1 },
  // The well, a bucket-worn stone by it.
  { kind: 'well', x: 195, y: 222, seed: 2 },
  { kind: 'rock_small', x: 176, y: 228, seed: 5 },
  // Thibault's patch.
  { kind: 'scarecrow', x: 44, y: 188, seed: 3 },
];

const HAMLET_KEEP: Keepout = {
  roads: [
    { points: [[118, 400], [122, 320], [118, 220], [121, 120], [119, 0]], clear: 16 },
    { points: [[56, 114], [84, 124], [119, 132]], clear: 10 },
    { points: [[190, 114], [160, 126], [121, 136]], clear: 10 },
    { points: [[196, 322], [160, 326], [122, 330]], clear: 10 },
    { points: [[0, 160], [60, 156], [118, 162]], clear: 12 },
    { points: [[120, 168], [180, 166], [240, 160]], clear: 12 },
  ],
  spots: [
    [50, 90, 34], [190, 90, 34], [190, 300, 32], // houses
    [150, 130, 18], [50, 250, 18], [50, 150, 24], [70, 150, 24], [90, 150, 24], // people
    [150, 330, 16], // chest
    [40, 140, 20], [120, 40, 20], [200, 140, 20], [120, 370, 20], // arrivals
    [195, 216, 26], [35, 186, 24], [160, 357, 30], // well, gardens
    [150, 389, 22], [100, 372, 14], // hens
  ],
};

export const BASSE_COMBE: ZoneArt<'thibault' | 'solange' | 'fauvette'> = {
  key: 'basse-combe',
  ground: {
    w: 240,
    h: 400,
    base: 'grass',
    seed: 21,
    shapes: [
      { kind: 'path', material: 'dirt', width: 16, points: [[118, 400], [122, 320], [118, 220], [121, 120], [119, 0]] },
      { kind: 'path', material: 'dirt', width: 9, points: [[56, 114], [84, 124], [119, 132]] },
      { kind: 'path', material: 'dirt', width: 9, points: [[190, 114], [160, 126], [121, 136]] },
      { kind: 'path', material: 'dirt', width: 9, points: [[196, 322], [160, 326], [122, 330]] },
      { kind: 'path', material: 'dirt', width: 8, points: [[0, 160], [60, 156], [118, 162]] },
      { kind: 'path', material: 'dirt', width: 8, points: [[120, 168], [180, 166], [240, 160]] },
      { kind: 'rect', material: 'crop', x: 138, y: 344, w: 44, h: 26 },
      // Thibault's vegetable patch, the well everyone shares.
      { kind: 'rect', material: 'crop', x: 14, y: 176, w: 42, h: 20 },
      { kind: 'ellipse', material: 'flagstone', x: 172, y: 200, w: 46, h: 34 },
    ],
  },
  buildings: {
    thibault: { kind: 'cottage', x: 50, y: 90, w: 44, h: 36 },
    solange: { kind: 'stone_house', x: 190, y: 90, w: 44, h: 36 },
    fauvette: { kind: 'cottage', x: 190, y: 300, w: 40, h: 32 },
  },
  props: [...HAMLET_PROPS, ...woods(HAMLET_KEEP, HAMLET_PROPS, [
    // Trees at the edges, thinner where the lanes leave.
    [{ x: 0, y: 170, w: 22, h: 200 }, 4, 34, [['tree', 3], ['pine', 2]], 211, 8],
    [{ x: 220, y: 180, w: 20, h: 190 }, 4, 34, [['tree', 3], ['pine', 2]], 212, 8],
    [{ x: 0, y: 0, w: 240, h: 400 }, 16, 24, [['bush', 2], ['flower_bush', 2], ['tall_grass', 4], ['flowers', 5], ['rock_small', 1]], 213, 4],
  ])],
  stoneWalls: [
    { x: 52, y: 396, len: 104 },
    { x: 190, y: 396, len: 100 },
  ],
  beds: [
    { x: 30, y: 116, w: 20, h: 8 },
    { x: 170, y: 322, w: 16, h: 7 },
  ],
  meadow: { n: 16, seed: 21 },
  ambience: { chickens: [[150, 386], [166, 392], [100, 372]] },
  next: ['farm', 'valombre'],
  preview: {
    hero: [120, 300],
    npcs: [
      ['hamlet_mentor', 150, 130],
      ['villager_wanderer', 70, 150],
      ['gontrand_scholar', 50, 250],
    ],
  },
};
