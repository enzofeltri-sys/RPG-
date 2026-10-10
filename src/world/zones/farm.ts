import type { ZoneArt } from '../zonePlan';

// The isolated farm: the farmhouse and its barn around a packed-earth
// yard, two fenced fields, hay everywhere. Rats come out of the barn (the
// rat king waits in front of it). Exit south, back to Basse-Combe.
export const FARM: ZoneArt<'farmhouse' | 'barn'> = {
  key: 'farm',
  ground: {
    w: 220,
    h: 400,
    base: 'grass',
    seed: 31,
    shapes: [
      { kind: 'path', material: 'dirt', width: 14, points: [[110, 400], [106, 330], [112, 250], [104, 160], [80, 112], [58, 92]] },
      { kind: 'ellipse', material: 'dirt', x: 84, y: 166, w: 100, h: 74 },
      { kind: 'path', material: 'dirt', width: 10, points: [[112, 230], [168, 216]] },
      { kind: 'rect', material: 'crop', x: 104, y: 36, w: 80, h: 58 },
      { kind: 'rect', material: 'crop', x: 22, y: 248, w: 80, h: 56 },
    ],
  },
  buildings: {
    farmhouse: { kind: 'cottage', x: 50, y: 70, w: 40, h: 32 },
    barn: { kind: 'barn', x: 172, y: 186, w: 56, h: 40 },
  },
  props: [
    // The farmhouse: firewood, a bench, a water barrel.
    { kind: 'woodpile', x: 80, y: 88 },
    { kind: 'barrel', x: 22, y: 92 },
    { kind: 'apple_tree', x: 18, y: 40, seed: 5 },
    // The yard: haystacks by the barn, a cart, a trough, sacks.
    { kind: 'haystack', x: 136, y: 214, seed: 1 },
    { kind: 'haystack', x: 206, y: 220, seed: 4 },
    { kind: 'wagon_cart', x: 70, y: 196, seed: 3 },
    { kind: 'trough', x: 112, y: 132 },
    { kind: 'sacks', x: 148, y: 206 },
    { kind: 'well', x: 40, y: 152, seed: 2 },
    // Field scarecrows and the hedges around.
    { kind: 'scarecrow', x: 62, y: 286, seed: 1 },
    { kind: 'scarecrow', x: 150, y: 74, seed: 2 },
    { kind: 'tree', x: 200, y: 30, seed: 6 },
    { kind: 'bush', x: 206, y: 112, seed: 2 },
    { kind: 'tree', x: 196, y: 300, seed: 2 },
    { kind: 'pine', x: 206, y: 372, seed: 3 },
    { kind: 'bush', x: 16, y: 344, seed: 4 },
    { kind: 'tree', x: 20, y: 382, seed: 7 },
    { kind: 'stump', x: 150, y: 372, seed: 3 },
    { kind: 'rock_small', x: 62, y: 360, seed: 5 },
  ],
  fences: [
    { x: 144, y: 100, len: 80 },
    { x: 62, y: 310, len: 80 },
  ],
  beds: [{ x: 32, y: 92, w: 14, h: 6 }],
  meadow: { n: 14, seed: 31 },
  ambience: { chickens: [[110, 196], [126, 184], [150, 236], [96, 214]] },
  next: ['basse-combe'],
  preview: {
    hero: [110, 280],
    npcs: [['farmer_generic', 170, 100]],
  },
};
