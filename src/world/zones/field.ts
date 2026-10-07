import type { ZoneArt } from '../zonePlan';

// Le Champ: open pasture and meadow crossed by a stream, four roads
// meeting at the plank bridge. Sheep graze in a half-fenced pasture; iron
// ore and wild herbs can be gathered (the scene's gather nodes).
export const FIELD: ZoneArt = {
  key: 'field',
  ground: {
    w: 480,
    h: 480,
    base: 'grass',
    seed: 51,
    shapes: [
      // The stream (collision: y 180..204 except the bridge x 240..320).
      { kind: 'path', material: 'water', width: 25, points: [[0, 193], [120, 191], [240, 192], [360, 193], [480, 192]] },
      // Roads: south to Basse-Combe, north to the wolf's den, west to the
      // bandits, east to the forest.
      { kind: 'path', material: 'dirt', width: 16, points: [[280, 480], [284, 400], [278, 300], [280, 210]] },
      { kind: 'path', material: 'dirt', width: 16, points: [[280, 176], [270, 110], [250, 50], [246, 0]] },
      { kind: 'path', material: 'dirt', width: 10, points: [[278, 296], [180, 300], [90, 296], [0, 300]] },
      { kind: 'path', material: 'dirt', width: 10, points: [[282, 330], [380, 338], [480, 340]] },
      // The muddy bank by the herbs.
      { kind: 'ellipse', material: 'dirt', x: 70, y: 362, w: 44, h: 30 },
    ],
  },
  bridges: [{ x: 240, y: 179, w: 80, h: 26 }],
  props: [
    // Trees (where the scene had them) and hedges.
    { kind: 'big_tree', x: 50, y: 72, seed: 1 },
    { kind: 'tree', x: 420, y: 72, seed: 2 },
    { kind: 'bush', x: 440, y: 84, seed: 1 },
    { kind: 'tree', x: 330, y: 112, seed: 3 },
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
    // By the bridge: a lone bench for travellers.
    { kind: 'log', x: 330, y: 232, seed: 3 },
    { kind: 'haystack', x: 140, y: 250, seed: 3 },
  ],
  // The sheep's pasture, half-fenced.
  fences: [
    { x: 250, y: 254, len: 48 },
    { x: 370, y: 296, len: 40 },
  ],
  stoneWalls: [{ x: 120, y: 420, len: 56 }],
  meadow: { n: 40, seed: 51 },
  next: ['basse-combe', 'forest', 'bandit-camp'],
  preview: { hero: [280, 300] },
};
