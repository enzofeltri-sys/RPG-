import type { ZoneArt } from '../zonePlan';

// Valombre: four country houses around a packed-earth square, a vegetable
// garden, groves at the edges. Buildings match VillageScene's collision
// boxes (the scene builds them from here).
export const VALOMBRE: ZoneArt<'bertrand' | 'ombeline' | 'forge' | 'inn'> = {
  key: 'valombre',
  ground: {
    w: 480,
    h: 640,
    base: 'grass',
    seed: 7,
    shapes: [
      { kind: 'path', material: 'dirt', width: 22, points: [[240, 0], [236, 180], [244, 320], [238, 470], [240, 640]] },
      { kind: 'path', material: 'dirt', width: 12, points: [[120, 192], [180, 200], [236, 196]] },
      { kind: 'path', material: 'dirt', width: 12, points: [[190, 392], [238, 396]] },
      { kind: 'path', material: 'dirt', width: 12, points: [[340, 502], [240, 508]] },
      { kind: 'path', material: 'dirt', width: 10, points: [[110, 346], [238, 346]] },
      { kind: 'path', material: 'dirt', width: 10, points: [[64, 478], [150, 470], [238, 460]] },
      { kind: 'path', material: 'dirt', width: 10, points: [[240, 580], [330, 586], [420, 590], [420, 600]] },
      { kind: 'rect', material: 'crop', x: 68, y: 250, w: 58, h: 34 },
      { kind: 'ellipse', material: 'dirt', x: 206, y: 226, w: 168, h: 98 },
      { kind: 'ellipse', material: 'cobble', x: 236, y: 250, w: 104, h: 54 },
      { kind: 'ellipse', material: 'flagstone', x: 206, y: 524, w: 68, h: 50 },
    ],
  },
  buildings: {
    bertrand: { kind: 'cottage', x: 120, y: 160, w: 70, h: 50 },
    ombeline: { kind: 'stone_house', x: 300, y: 210, w: 60, h: 60 },
    forge: { kind: 'blacksmith_shop', x: 190, y: 360, w: 90, h: 50 },
    inn: { kind: 'inn_building', x: 340, y: 460, w: 60, h: 70 },
  },
  props: [
    // North-west grove: an old tree with a bush and a mushroom at its foot.
    { kind: 'big_tree', x: 26, y: 84, seed: 1 },
    { kind: 'tree', x: 62, y: 60, seed: 5 },
    { kind: 'bush', x: 40, y: 92, seed: 1 },
    { kind: 'mushroom', x: 12, y: 96 },
    { kind: 'stump', x: 84, y: 98, seed: 2 },
    // North-east grove.
    { kind: 'big_tree', x: 452, y: 98, seed: 2 },
    { kind: 'tree', x: 420, y: 70, seed: 7 },
    { kind: 'berry_bush', x: 434, y: 110, seed: 2 },
    { kind: 'rock_small', x: 470, y: 120, seed: 4 },
    // West pines.
    { kind: 'pine', x: 18, y: 214, seed: 6 },
    { kind: 'pine', x: 38, y: 196, seed: 4 },
    { kind: 'bush', x: 48, y: 222, seed: 9 },
    // East: a tree by the field wall, pines at the edge with a boulder.
    { kind: 'tree', x: 432, y: 330, seed: 3 },
    { kind: 'flower_bush', x: 446, y: 338, seed: 4 },
    { kind: 'pine', x: 462, y: 404, seed: 5 },
    { kind: 'pine', x: 444, y: 420, seed: 8 },
    { kind: 'boulder_large', x: 448, y: 520, seed: 3 },
    { kind: 'rock_small', x: 466, y: 530, seed: 6 },
    // South-west corner.
    { kind: 'tree', x: 26, y: 604, seed: 6 },
    { kind: 'bush', x: 46, y: 614, seed: 3 },
    { kind: 'log', x: 84, y: 566, seed: 2 },
    { kind: 'stump', x: 392, y: 612, seed: 4 },
    // The cottage: garden with its scarecrow, hay, firewood by the wall.
    { kind: 'scarecrow', x: 124, y: 280, seed: 1 },
    { kind: 'haystack', x: 40, y: 318, seed: 2 },
    { kind: 'apple_tree', x: 160, y: 300, seed: 8 },
    { kind: 'woodpile', x: 160, y: 186 },
    { kind: 'lamppost', x: 214, y: 186 },
    // The stone house: a barrel and a crate by the wall.
    { kind: 'barrel', x: 278, y: 242 },
    { kind: 'crate', x: 268, y: 246 },
    { kind: 'flower_bush', x: 334, y: 244, seed: 6 },
    // The square.
    { kind: 'market_stall', x: 284, y: 314, seed: 1 },
    { kind: 'market_stall', x: 346, y: 266, seed: 3 },
    { kind: 'sacks', x: 364, y: 272 },
    { kind: 'bench', x: 206, y: 286 },
    // The smithy: water trough, a barrel, a hay cart on the road.
    { kind: 'trough', x: 136, y: 392 },
    { kind: 'barrel', x: 228, y: 390 },
    { kind: 'wagon_cart', x: 300, y: 404, seed: 2 },
    // The inn: barrels and a crate by the wall, a bench at the door.
    { kind: 'barrel', x: 376, y: 496 },
    { kind: 'barrel', x: 385, y: 500 },
    { kind: 'crate', x: 394, y: 494 },
    { kind: 'bench', x: 318, y: 506 },
    { kind: 'lamppost', x: 222, y: 448 },
    // The well.
    { kind: 'well', x: 240, y: 560, seed: 1 },
  ],
  // The garden fence; two fence runs leave a gap toward the old cemetery.
  fences: [
    { x: 97, y: 252, len: 62 },
    { x: 396, y: 600, len: 26 },
    { x: 446, y: 600, len: 34 },
  ],
  stoneWalls: [{ x: 392, y: 182, len: 56 }],
  beds: [
    { x: 102, y: 196, w: 24, h: 9 },
    { x: 318, y: 252, w: 18, h: 7 },
    { x: 360, y: 503, w: 16, h: 7 },
  ],
  meadow: { n: 34, seed: 3 },
  next: ['basse-combe'],
  preview: {
    hero: [240, 420],
    npcs: [
      ['merchant_generic', 300, 270],
      ['villager_wanderer', 50, 280],
      ['villager_wanderer', 400, 150],
      ['brasque_merchant', 60, 470],
      ['guard_generic', 100, 340],
    ],
  },
};
