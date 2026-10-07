import type { PropSpot, ZoneArt } from '../zonePlan';

// The start region's dark places. Each keeps its scene's layout (wall
// blocks, gate, encounters, boss) and gets its own look and light.

// La Grotte: a natural cave between the forest and Valombre. Rock masses
// line the walls, glowing crystals and a lava vent give the only light.
export const CAVE: ZoneArt = {
  key: 'cave',
  ground: {
    w: 220,
    h: 400,
    base: 'cave',
    seed: 91,
    shapes: [
      { kind: 'ellipse', material: 'water', x: 40, y: 250, w: 26, h: 12, rough: 3 },
    ],
  },
  walls: [
    { x: 7, y: 200, w: 14, h: 400, face: 0, solid: true, style: 'rock' },
    { x: 213, y: 200, w: 14, h: 400, face: 0, solid: true, style: 'rock' },
  ],
  props: [
    { kind: 'boulder_large', x: 26, y: 160, seed: 9 },
    { kind: 'boulder_large', x: 196, y: 300, seed: 10 },
    { kind: 'boulder_large', x: 30, y: 344, seed: 1 },
    { kind: 'rock_small', x: 170, y: 326, seed: 2 },
    { kind: 'rock_small', x: 40, y: 226, seed: 3 },
    { kind: 'boulder_large', x: 162, y: 206, seed: 4 },
    { kind: 'rock_small', x: 30, y: 96, seed: 5 },
    { kind: 'boulder_large', x: 172, y: 66, seed: 6 },
    { kind: 'rock_small', x: 155, y: 384, seed: 7 },
    { kind: 'rock_small', x: 45, y: 26, seed: 8 },
    { kind: 'crystal_glow', x: 55, y: 306 },
    { kind: 'crystal_glow', x: 150, y: 256 },
    { kind: 'crystal_glow', x: 55, y: 186 },
    { kind: 'crystal_glow', x: 145, y: 116 },
    { kind: 'crystal_glow', x: 60, y: 56 },
    { kind: 'mushroom', x: 186, y: 352 },
  ],
  patches: [{ material: 'lava', x: 175, y: 105, w: 30, h: 18 }],
  dprops: [
    { kind: 'bones', x: 160, y: 160 },
    { kind: 'rubble', x: 60, y: 120 },
    { kind: 'rubble', x: 166, y: 30 },
    { kind: 'cobweb', x: 14, y: 6 },
  ],
  dark: {
    ambient: 0.48,
    lights: [
      { x: 55, y: 300, r: 40, kind: 'cold' },
      { x: 150, y: 250, r: 40, kind: 'cold' },
      { x: 55, y: 180, r: 40, kind: 'cold' },
      { x: 145, y: 110, r: 40, kind: 'cold' },
      { x: 60, y: 50, r: 40, kind: 'cold' },
      { x: 175, y: 105, r: 56, kind: 'fire' },
      // Daylight at both ends.
      { x: 110, y: 410, r: 80, kind: 'cold' },
      { x: 110, y: -10, r: 80, kind: 'cold' },
    ],
  },
  next: ['valombre', 'forest'],
  preview: { hero: [110, 230] },
};

// Le Repaire du Loup: a cave den. Rock pillars (the scene's wall blocks),
// a barricade the pack defends, bones and a straw nest at the back.
export const WOLF_DEN: ZoneArt = {
  key: 'wolf-den',
  ground: {
    w: 220,
    h: 520,
    base: 'cave',
    seed: 101,
    shapes: [
      { kind: 'ellipse', material: 'dirt', x: 60, y: 30, w: 100, h: 80, rough: 8 },
    ],
  },
  walls: [
    { x: 7, y: 260, w: 14, h: 520, face: 0, solid: true, style: 'rock' },
    { x: 213, y: 260, w: 14, h: 520, face: 0, solid: true, style: 'rock' },
    { x: 110, y: 6, w: 220, h: 12, face: 14, style: 'rock' },
    { x: 20, y: 440, w: 30, h: 60, style: 'rock' },
    { x: 200, y: 340, w: 30, h: 80, style: 'rock' },
    { x: 20, y: 260, w: 30, h: 60, style: 'rock' },
    { x: 200, y: 120, w: 30, h: 60, style: 'rock' },
  ],
  props: [
    { kind: 'haystack', x: 74, y: 96, seed: 6 },
    { kind: 'boulder_large', x: 170, y: 470, seed: 2 },
    { kind: 'rock_small', x: 50, y: 360, seed: 3 },
    { kind: 'rock_small', x: 170, y: 240, seed: 4 },
    { kind: 'boulder_large', x: 40, y: 160, seed: 5 },
    { kind: 'dead_tree', x: 180, y: 506, seed: 3 },
  ],
  dprops: [
    { kind: 'bones', x: 140, y: 100 },
    { kind: 'bones', x: 60, y: 480 },
    { kind: 'bones', x: 160, y: 380 },
    { kind: 'skulls', x: 160, y: 60 },
    { kind: 'bones', x: 70, y: 230 },
    { kind: 'rubble', x: 150, y: 300 },
    { kind: 'rubble', x: 50, y: 330 },
    { kind: 'cobweb', x: 14, y: 20 },
  ],
  dark: {
    ambient: 0.46,
    lights: [
      // Daylight from the entrance, thin shafts through cracks above.
      { x: 110, y: 540, r: 110, kind: 'cold' },
      { x: 70, y: 380, r: 34, kind: 'cold' },
      { x: 150, y: 220, r: 34, kind: 'cold' },
      { x: 110, y: 80, r: 44, kind: 'cold' },
    ],
  },
  next: ['field'],
  preview: { hero: [110, 360], gate: ['barricade', 110, 190, 220] },
};

// Le Vieux Puits: the flooded chamber at the bottom of the old well. Mossy
// brick, damp floor, a pool under the shaft where daylight falls in.
export const OLD_WELL: ZoneArt = {
  key: 'old-well',
  ground: {
    w: 220,
    h: 300,
    base: 'stonefloor',
    seed: 111,
    shapes: [
      { kind: 'ellipse', material: 'water', x: 82, y: 40, w: 56, h: 34, rough: 3 },
      { kind: 'ellipse', material: 'marsh', x: 30, y: 150, w: 50, h: 30, rough: 6 },
      { kind: 'ellipse', material: 'marsh', x: 150, y: 200, w: 40, h: 22, rough: 5 },
    ],
  },
  walls: [
    { x: 7, y: 150, w: 14, h: 300, face: 0, solid: true, style: 'mossy' },
    { x: 213, y: 150, w: 14, h: 300, face: 0, solid: true, style: 'mossy' },
    { x: 110, y: 6, w: 220, h: 12, face: 14, style: 'mossy' },
    { x: 20, y: 240, w: 30, h: 60, style: 'mossy' },
    { x: 200, y: 140, w: 30, h: 80, style: 'mossy' },
  ],
  props: [
    { kind: 'reeds', x: 84, y: 62, seed: 1 },
    { kind: 'reeds', x: 136, y: 58, seed: 2 },
    { kind: 'mushroom', x: 40, y: 280 },
    { kind: 'rock_small', x: 170, y: 286, seed: 3 },
    { kind: 'fern', x: 46, y: 176, seed: 2 },
  ],
  dprops: [
    { kind: 'urn', x: 150, y: 96 },
    { kind: 'rubble', x: 60, y: 110 },
    { kind: 'bones', x: 160, y: 230 },
    { kind: 'cobweb', x: 14, y: 20 },
  ],
  dark: {
    ambient: 0.44,
    lights: [
      { x: 110, y: 56, r: 72, kind: 'cold' },
      { x: 110, y: 310, r: 70, kind: 'cold' },
    ],
  },
  next: ['forest'],
  preview: { hero: [110, 230] },
};

// Gravestones in rows where the scene has its (solid) grave blocks.
function graves(blocks: [number, number][]): PropSpot[] {
  return blocks.flatMap(([x, y], i) => [
    { kind: 'gravestone' as const, x, y: y - 12, seed: i * 3 + 1 },
    { kind: 'gravestone' as const, x, y: y + 8, seed: i * 3 + 2 },
    { kind: 'gravestone' as const, x, y: y + 28, seed: i * 3 + 3 },
  ]);
}

// Le Vieux Cimetière: an overgrown graveyard by night, rows of leaning
// stones, dead trees, wrought-iron railings, a rusty gate before the
// family crypt where the guardian waits.
export const FORGOTTEN_GRAVE: ZoneArt<'crypt'> = {
  key: 'forgotten-grave',
  ground: {
    w: 220,
    h: 420,
    base: 'grass',
    seed: 121,
    shapes: [
      { kind: 'path', material: 'dirt', width: 18, points: [[110, 420], [106, 320], [114, 220], [110, 60]], rough: 3 },
      { kind: 'ellipse', material: 'flagstone', x: 70, y: 40, w: 80, h: 60 },
    ],
  },
  buildings: { crypt: { kind: 'mausoleum', x: 110, y: 22, w: 64, h: 24 } },
  props: [
    ...graves([
      [20, 360],
      [200, 280],
      [20, 140],
      [200, 360],
    ]),
    { kind: 'gravestone', x: 56, y: 300, seed: 13 },
    { kind: 'gravestone', x: 164, y: 214, seed: 14 },
    { kind: 'gravestone', x: 60, y: 236, seed: 15 },
    { kind: 'gravestone', x: 160, y: 130, seed: 16 },
    { kind: 'dead_tree', x: 40, y: 92, seed: 1 },
    { kind: 'dead_tree', x: 186, y: 410, seed: 2 },
    { kind: 'dead_tree', x: 170, y: 76, seed: 3 },
    { kind: 'lamppost', x: 86, y: 106 },
    { kind: 'lamppost', x: 136, y: 300 },
    { kind: 'tall_grass', x: 70, y: 380, seed: 2 },
    { kind: 'bush', x: 30, y: 410, seed: 4 },
  ],
  meadow: { n: 8, seed: 121 },
  dark: {
    ambient: 0.52,
    shade: [0.68, 0.78, 1],
    lights: [
      { x: 92, y: 96, r: 44, kind: 'fire' },
      { x: 142, y: 290, r: 44, kind: 'fire' },
    ],
  },
  next: ['valombre'],
  preview: { hero: [110, 260], gate: ['rusty', 110, 190, 220] },
};

// La Chambre du Scellement: the hall where the seal was first made, deep
// under the shrine. Carved pillars with glowing runes, a veil of runes
// across the way, the seal circle at the back.
export const SEAL_CHAMBER: ZoneArt = {
  key: 'seal-chamber',
  ground: {
    w: 220,
    h: 420,
    base: 'stonefloor',
    seed: 131,
    shapes: [
      { kind: 'rect', material: 'aisle', x: 88, y: 0, w: 44, h: 420 },
      { kind: 'rect', material: 'aisle', x: 40, y: 24, w: 140, h: 100 },
    ],
  },
  walls: [
    { x: 6, y: 210, w: 12, h: 420, face: 0, solid: true, style: 'carved' },
    { x: 214, y: 210, w: 12, h: 420, face: 0, solid: true, style: 'carved' },
    { x: 110, y: 6, w: 220, h: 12, face: 16, style: 'carved' },
    { x: 20, y: 360, w: 24, h: 60, style: 'carved' },
    { x: 200, y: 280, w: 24, h: 60, style: 'carved' },
    { x: 20, y: 140, w: 24, h: 60, style: 'carved' },
    { x: 200, y: 360, w: 24, h: 60, style: 'carved' },
  ],
  dprops: [
    { kind: 'runes', x: 110, y: 74 },
    { kind: 'candles', x: 60, y: 84 },
    { kind: 'candles', x: 160, y: 84 },
    { kind: 'pillar', x: 54, y: 124 },
    { kind: 'pillar', x: 166, y: 124 },
    { kind: 'urn', x: 60, y: 300 },
    { kind: 'urn', x: 160, y: 230 },
    { kind: 'rubble', x: 196, y: 30 },
    { kind: 'skulls', x: 40, y: 250 },
    { kind: 'candles', x: 160, y: 400 },
  ],
  dark: {
    ambient: 0.4,
    lights: [{ x: 110, y: 430, r: 70, kind: 'cold' }],
  },
  next: ['shrine'],
  preview: { hero: [110, 260], gate: ['runes', 110, 190, 220] },
};
