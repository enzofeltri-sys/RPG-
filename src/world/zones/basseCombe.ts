import type { ZoneArt } from '../zonePlan';

// Basse-Combe, the home hamlet: three cottages strung along a dirt lane,
// gardens and firewood, trees framing the lane, a dry-stone wall closing
// the south. The x=120 lane stays clear from the south edge to the north
// exit; the west and east edges lead to the farm and the shrine.
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
    ],
  },
  buildings: {
    thibault: { kind: 'cottage', x: 50, y: 90, w: 44, h: 36 },
    solange: { kind: 'stone_house', x: 190, y: 90, w: 44, h: 36 },
    fauvette: { kind: 'cottage', x: 190, y: 300, w: 40, h: 32 },
  },
  props: [
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
  ],
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
