import type { ZoneArt } from '../zonePlan';
import { FOUR_24, d, enclosure } from './dungeonKit';

// The start region's deepest places, opened late in the story: the
// Watchers' lodge and its archives under the shrine, the depths under the
// original Seal, the rift behind its chamber.

// La Loge des Veilleurs: where the Order of Watchers met. A timber hall
// on a plank floor, beams holding up the roof (the scene's blocks), a
// door shut for generations, the round table at the end; stairs down to
// the rite's archives top left.
export const WATCHERS_LODGE: ZoneArt = {
  key: 'watchers-lodge',
  ground: {
    w: 220,
    h: 420,
    base: 'planks',
    seed: 801,
    shapes: [
      { kind: 'rect', material: 'carpet', x: 96, y: 110, w: 28, h: 310 },
      { kind: 'ellipse', material: 'carpet', x: 50, y: 30, w: 120, h: 70 },
    ],
  },
  walls: enclosure(420, 'timber', FOUR_24, { backFace: 18 }),
  dprops: [
    d('round_table', 110, 46),
    d('candles', 56, 50),
    d('candles', 164, 50),
    d('bookshelf', 40, 34),
    d('bookshelf', 180, 34),
    d('hearth', 160, 26),
    d('table', 60, 250),
    d('scrolls', 160, 230),
    d('cobweb', 14, 14),
  ],
  props: [{ kind: 'crate', x: 40, y: 410 }, { kind: 'barrel', x: 190, y: 330 }],
  patches: [{ material: 'stairs', x: 22, y: 24, w: 24, h: 18 }],
  dark: { ambient: 0.48, lights: [{ x: 110, y: 440, r: 70, kind: 'cold' }, { x: 160, y: 14, r: 70, kind: 'fire' }] },
  next: ['shrine'],
  preview: { hero: [70, 300], gate: ['door', 110, 190, 220] },
};

// Les Archives du Rite: the instructions of the sealing rite. Old carved
// stone, shelves locked with chains, lecterns and candles; stairs down to
// the sealed annex top right.
export const RITE_ARCHIVE: ZoneArt = {
  key: 'rite-archive',
  ground: {
    w: 220,
    h: 420,
    base: 'stonefloor',
    seed: 811,
    shapes: [{ kind: 'rect', material: 'carpet', x: 98, y: 20, w: 24, h: 400 }],
  },
  walls: enclosure(420, 'carved', FOUR_24, { backFace: 16 }).map((w, i) => (i >= 3 ? { ...w, style: 'shelves' as const } : w)),
  dprops: [
    d('lectern', 110, 38),
    d('candles', 66, 60),
    d('candles', 154, 60),
    d('bookshelf', 40, 34),
    d('bookshelf', 64, 34),
    d('bookshelf', 156, 34),
    d('table', 160, 150),
    d('scrolls', 60, 240),
    d('lectern', 160, 330),
    d('cobweb', 14, 14),
  ],
  patches: [{ material: 'stairs', x: 198, y: 24, w: 24, h: 18 }],
  dark: { ambient: 0.44, lights: [{ x: 110, y: 440, r: 70, kind: 'cold' }] },
  next: ['watchers-lodge'],
  preview: { hero: [70, 300], gate: ['shelves', 110, 190, 220] },
};

// L'Annexe scellée: shelves behind a ward at the far end of the rite's
// archives, the Order's register on its lectern in a circle of runes.
export const RITE_ANNEX: ZoneArt = {
  key: 'rite-annex',
  ground: {
    w: 220,
    h: 420,
    base: 'stonefloor',
    seed: 821,
    shapes: [{ kind: 'rect', material: 'aisle', x: 90, y: 0, w: 40, h: 420 }],
  },
  walls: enclosure(420, 'carved', FOUR_24, { backFace: 16 }).map((w, i) => (i >= 3 ? { ...w, style: 'shelves' as const } : w)),
  dprops: [
    d('runes', 110, 74),
    d('lectern', 110, 38),
    d('bookshelf', 50, 34),
    d('bookshelf', 170, 34),
    d('scrolls', 60, 120),
    d('scrolls', 160, 260),
    d('candles', 60, 300),
    d('cobweb', 14, 14),
    d('cobweb', 14, 300),
  ],
  dark: { ambient: 0.38, lights: [{ x: 110, y: 440, r: 60, kind: 'cold' }] },
  next: ['rite-archive'],
  preview: { hero: [70, 300], gate: ['runes', 110, 190, 220] },
};

// Sous le Sceau originel: the heart of the rite, under the Seal's own
// chamber. A great hall of carved stone, the barrier of the rite across
// it, the Seal's heart in its circle between braziers and columns.
export const SANCTUARY_DEPTHS: ZoneArt = {
  key: 'sanctuary-depths',
  ground: {
    w: 220,
    h: 420,
    base: 'stonefloor',
    seed: 831,
    shapes: [
      { kind: 'rect', material: 'aisle', x: 86, y: 0, w: 48, h: 420 },
      { kind: 'ellipse', material: 'aisle', x: 30, y: 10, w: 160, h: 130 },
    ],
  },
  walls: enclosure(420, 'carved', FOUR_24, { backFace: 16 }),
  props: [{ kind: 'altar', x: 110, y: 36 }],
  dprops: [
    d('runes', 110, 74),
    d('brazier', 50, 80),
    d('brazier', 170, 80),
    d('pillar', 44, 136),
    d('pillar', 176, 136),
    d('pillar', 70, 300),
    d('pillar', 150, 240),
    d('statue', 60, 230),
    d('statue', 160, 330),
    d('candles', 80, 110),
    d('candles', 140, 110),
  ],
  dark: { ambient: 0.34, lights: [{ x: 110, y: 440, r: 60, kind: 'cold' }, { x: 110, y: 196, r: 50, kind: 'magic' }] },
  next: ['shrine'],
  preview: { hero: [70, 300], gate: ['runes', 110, 190, 220] },
};

// La Faille du Sceau: the rift behind the Seal's chamber, at the source of
// it all. A cave split open, crystals growing from the walls, light
// frozen across the way, the source glowing at the end.
export const SEAL_DEPTHS: ZoneArt = {
  key: 'seal-depths',
  ground: {
    w: 220,
    h: 420,
    base: 'cave',
    seed: 841,
    shapes: [{ kind: 'ellipse', material: 'stonefloor', x: 50, y: 20, w: 120, h: 100, rough: 8 }],
  },
  walls: enclosure(420, 'rock', FOUR_24),
  props: [
    { kind: 'crystal_glow', x: 50, y: 70 },
    { kind: 'crystal_glow', x: 170, y: 60 },
    { kind: 'crystal_glow', x: 60, y: 250 },
    { kind: 'crystal_glow', x: 160, y: 330 },
    { kind: 'crystal_glow', x: 160, y: 150 },
    { kind: 'boulder_large', x: 50, y: 300, seed: 2 },
    { kind: 'rock_small', x: 170, y: 220, seed: 3 },
    { kind: 'rock_small', x: 60, y: 410, seed: 4 },
  ],
  dprops: [d('runes', 110, 72), d('rubble', 60, 180), d('rubble', 170, 400)],
  dark: {
    ambient: 0.36,
    lights: [
      { x: 110, y: 440, r: 60, kind: 'cold' },
      { x: 50, y: 64, r: 40, kind: 'cold' },
      { x: 170, y: 54, r: 40, kind: 'cold' },
      { x: 60, y: 244, r: 40, kind: 'cold' },
      { x: 160, y: 324, r: 40, kind: 'cold' },
      { x: 160, y: 144, r: 40, kind: 'cold' },
      { x: 110, y: 180, r: 60, kind: 'fire' },
    ],
  },
  next: ['seal-chamber'],
  preview: { hero: [70, 300], gate: ['light', 110, 190, 220] },
};
