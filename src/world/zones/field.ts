import type { GroundSpec } from '../../art/ground';
import type { PropSpot, ZoneArt } from '../zonePlan';
import { Keepout, woods } from './scatterDecor';

// Le Champ: pasture and ploughland crossed by a stream, four roads meeting
// at the plank bridge. Sheep graze in a fenced pasture west of the
// crossroads, a strip of crops lies past the stream behind its wall, groves
// close the edges; iron ore and wild herbs can be gathered (the scene's
// gather nodes).
const ROADS: [number, number][][] = [
  [[280, 480], [284, 400], [278, 300], [280, 210]],
  [[280, 176], [270, 110], [250, 50], [246, 0]],
  [[278, 296], [180, 300], [90, 296], [0, 300]],
  [[282, 330], [380, 338], [480, 340]],
];

const FIELD_GROUND: GroundSpec = {
  w: 480,
  h: 480,
  base: 'grass',
  seed: 51,
  shapes: [
    // The stream (collision: y 180..204 except the bridge x 240..320).
    { kind: 'path', material: 'water', width: 25, points: [[0, 193], [120, 191], [240, 192], [360, 193], [480, 192]] },
    // Roads: south to Basse-Combe, north to the wolf's den, west to the
    // bandits, east to the forest.
    { kind: 'path', material: 'dirt', width: 16, points: ROADS[0] },
    { kind: 'path', material: 'dirt', width: 16, points: ROADS[1] },
    { kind: 'path', material: 'dirt', width: 10, points: ROADS[2] },
    { kind: 'path', material: 'dirt', width: 10, points: ROADS[3] },
    // The muddy bank by the ore.
    { kind: 'ellipse', material: 'dirt', x: 70, y: 362, w: 44, h: 30 },
    // The crops, and the trodden gate of the pasture.
    { kind: 'rect', material: 'crop', x: 326, y: 100, w: 104, h: 46 },
    { kind: 'ellipse', material: 'dirt', x: 236, y: 272, w: 22, h: 14 },
  ],
};

const FIELD_PROPS: PropSpot[] = [
  // Trees (where the scene had them).
  { kind: 'big_tree', x: 50, y: 72, seed: 1 },
  { kind: 'tree', x: 420, y: 72, seed: 2 },
  { kind: 'bush', x: 440, y: 84, seed: 1 },
  { kind: 'tree', x: 60, y: 272, seed: 4 },
  { kind: 'tree', x: 430, y: 270, seed: 5 },
  { kind: 'apple_tree', x: 300, y: 270, seed: 6 },
  { kind: 'tree', x: 150, y: 452, seed: 7 },
  { kind: 'pine', x: 20, y: 140, seed: 2 },
  { kind: 'pine', x: 462, y: 150, seed: 3 },
  { kind: 'bush', x: 180, y: 456, seed: 4 },
  // Rocks.
  { kind: 'rock_small', x: 150, y: 96, seed: 1 },
  { kind: 'boulder_large', x: 210, y: 140, seed: 2 },
  { kind: 'rock_small', x: 180, y: 326, seed: 3 },
  { kind: 'rock_small', x: 400, y: 446, seed: 4 },
  // Gathering spots.
  { kind: 'ore_rock', x: 90, y: 388, seed: 5 },
  { kind: 'herb_patch', x: 350, y: 406, seed: 2 },
  { kind: 'herb_patch', x: 364, y: 414, seed: 6 },
  // Reeds along the stream.
  { kind: 'reeds', x: 30, y: 180, seed: 1 },
  { kind: 'reeds', x: 120, y: 182, seed: 2 },
  { kind: 'reeds', x: 200, y: 214, seed: 3 },
  { kind: 'reeds', x: 360, y: 212, seed: 4 },
  { kind: 'reeds', x: 440, y: 182, seed: 5 },
  { kind: 'reeds', x: 90, y: 214, seed: 6 },
  // By the bridge: a log to sit on.
  { kind: 'log', x: 330, y: 232, seed: 3 },
  // The pasture: hay for the sheep, a trough.
  { kind: 'haystack', x: 222, y: 240, seed: 3 },
  { kind: 'trough', x: 120, y: 244 },
  // The crops: a scarecrow, a cart at the corner.
  { kind: 'scarecrow', x: 384, y: 132, seed: 2 },
  { kind: 'wagon_cart', x: 298, y: 152, seed: 3 },
  { kind: 'tree', x: 312, y: 70, seed: 3 },
];

const FIELD_KEEP: Keepout = {
  ground: FIELD_GROUND,
  roads: ROADS.map((points) => ({ points, clear: 16 })),
  spots: [
    [180, 256, 82], // the pasture
    [376, 128, 66], // the crops
    [90, 380, 24], [350, 404, 28], // gather nodes
    [280, 254, 16], // signpost
    [280, 192, 46], // the bridge
    [40, 300, 24], [240, 40, 24], [440, 340, 24], [240, 440, 24], // arrivals
  ],
};

export const FIELD: ZoneArt = {
  key: 'field',
  ground: FIELD_GROUND,
  bridges: [{ x: 240, y: 179, w: 80, h: 26 }],
  props: [...FIELD_PROPS, ...woods(FIELD_KEEP, FIELD_PROPS, [
    // Groves closing the edges, broken where the roads leave.
    [{ x: 0, y: 0, w: 480, h: 34 }, 7, 36, [['tree', 4], ['pine', 2], ['big_tree', 1]], 511, 8],
    [{ x: 0, y: 446, w: 480, h: 34 }, 7, 36, [['tree', 4], ['pine', 2], ['big_tree', 1]], 512, 8],
    [{ x: 0, y: 34, w: 30, h: 412 }, 6, 36, [['tree', 3], ['pine', 3]], 513, 8],
    [{ x: 450, y: 34, w: 30, h: 412 }, 6, 36, [['tree', 3], ['pine', 3]], 514, 8],
    // Bushes, tall grass and flowers in the meadow.
    [{ x: 0, y: 0, w: 480, h: 480 }, 30, 26, [['bush', 3], ['flower_bush', 2], ['berry_bush', 1], ['tall_grass', 5], ['flowers', 5], ['rock_small', 1]], 515, 4],
  ])],
  // The pasture, fenced all round (a gate on the road side), and the
  // crops' wall.
  fences: [
    { x: 172, y: 226, len: 128 },
    { x: 108, y: 254, len: 56, vertical: true },
    { x: 236, y: 241, len: 30, vertical: true },
    { x: 140, y: 282, len: 64 },
    { x: 220, y: 282, len: 32 },
  ],
  stoneWalls: [{ x: 378, y: 160, len: 112 }],
  meadow: { n: 40, seed: 51 },
  next: ['basse-combe', 'forest', 'bandit-camp'],
  preview: { hero: [280, 300], npcs: [['villager_wanderer', 166, 244], ['villager_wanderer', 196, 268]] },
};
