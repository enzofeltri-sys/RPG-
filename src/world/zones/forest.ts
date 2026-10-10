import type { ZoneArt } from '../zonePlan';
import { Keepout, woods } from './scatterDecor';

// The forest: dense woods on a shaded floor of moss and leaf litter, two
// trails crossing at the signpost (west: the field, east: the cave, north:
// the goblin camp, south: the old well). The woods never touch the trails
// or the spots where people and monsters wait.
const ROADS: Keepout['roads'] = [
  { points: [[0, 200], [80, 196], [160, 204], [200, 200], [260, 196], [340, 204], [400, 200]], clear: 18 },
  { points: [[200, 0], [196, 70], [204, 140], [200, 200], [196, 270], [204, 340], [200, 400]], clear: 18 },
];
const KEEP: Keepout = {
  roads: ROADS,
  spots: [
    [300, 30, 20], // villager
    [130, 180, 20], // guard
    [350, 350, 26], // wolf marker
    [300, 250, 26], // goblin marker
    [150, 220, 44], // deer's walk
    [200, 200, 36], // signpost
    [40, 200, 24], // arrivals: from the field…
    [40, 150, 24],
    [360, 150, 24], // …the cave
    [200, 30, 22], // …the goblin camp
    [200, 340, 22], // …the old well
  ],
};

export const FOREST: ZoneArt = {
  key: 'forest',
  ground: {
    w: 400,
    h: 400,
    base: 'forest',
    seed: 61,
    shapes: [
      { kind: 'path', material: 'dirt', width: 14, points: ROADS![0].points },
      { kind: 'path', material: 'dirt', width: 13, points: ROADS![1].points },
      { kind: 'ellipse', material: 'dirt', x: 176, y: 180, w: 48, h: 40 },
    ],
  },
  // Big trees first (spaced), then the understorey between them.
  props: woods(KEEP, [], [
    [{ x: 0, y: 6, w: 400, h: 394 }, 36, 30, [['big_tree', 3], ['tree', 4], ['pine', 3]], 61, 6],
    [{ x: 0, y: 6, w: 400, h: 394 }, 44, 18, [['bush', 4], ['berry_bush', 1], ['fern', 6]], 62, 2],
    [{ x: 0, y: 6, w: 400, h: 394 }, 16, 30, [['mushroom', 3], ['rock_small', 3], ['stump', 2], ['log', 2], ['boulder_large', 1]], 63, 4],
  ]),
  meadow: { n: 10, seed: 61 },
  next: ['field', 'goblin-camp'],
  preview: {
    hero: [200, 240],
    npcs: [
      ['villager_wanderer', 300, 30],
      ['guard_generic', 130, 180],
    ],
  },
};
