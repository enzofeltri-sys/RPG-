import type { ZoneArt } from '../zonePlan';
import { FOUR_24, THREE_30, d, enclosure } from './dungeonKit';

// The dungeons of Aiglemont and its surroundings. Most share one layout
// (220 x 420: two encounters, a gate at y 190, the boss at the top, a
// chest at the bottom right, wall blocks on alternate sides); each gets
// its own walls, floor, decor, barrier and light.

// Les Catacombes d'Aiglemont: the processional aisle under the city, piers
// full of burial niches, tombs and bone heaps, the Guardian's hall at the
// end with its rune circle between two braziers.
export const CATACOMBS: ZoneArt = {
  key: 'catacombs',
  ground: {
    w: 220,
    h: 620,
    base: 'stonefloor',
    seed: 301,
    shapes: [
      { kind: 'rect', material: 'aisle', x: 90, y: 0, w: 40, h: 620 },
      { kind: 'rect', material: 'aisle', x: 46, y: 26, w: 128, h: 92 },
    ],
  },
  walls: [
    { x: 7, y: 310, w: 14, h: 620, face: 0, solid: true },
    { x: 213, y: 310, w: 14, h: 620, face: 0, solid: true },
    { x: 110, y: 8, w: 220, h: 16, niches: true, face: 16 },
    { x: 20, y: 560, w: 30, h: 60, niches: true },
    { x: 200, y: 460, w: 30, h: 80, niches: true },
    { x: 20, y: 360, w: 30, h: 60, niches: true },
    { x: 200, y: 260, w: 30, h: 60, niches: true },
    { x: 20, y: 140, w: 30, h: 60, niches: true },
  ],
  dprops: [
    d('torch', 20, 586),
    d('torch', 200, 496),
    d('torch', 20, 386),
    d('torch', 200, 286),
    d('torch', 20, 166),
    d('runes', 110, 72),
    d('brazier', 62, 76),
    d('brazier', 158, 76),
    d('pillar', 52, 120),
    d('pillar', 168, 120),
    d('skulls', 30, 30),
    d('skulls', 192, 32),
    d('pillar', 76, 470),
    d('pillar', 144, 470),
    d('pillar', 76, 330),
    d('pillar', 144, 330),
    d('sarcophagus', 44, 470),
    d('candles', 56, 482),
    d('bones', 30, 494),
    d('sarcophagus', 180, 380),
    d('candles', 166, 390),
    d('skulls', 30, 604),
    d('skulls', 194, 512),
    d('bones', 48, 402),
    d('bones', 168, 302),
    d('urn', 186, 420),
    d('urn', 194, 426),
    d('urn', 36, 188),
    d('rubble', 44, 256),
    d('rubble', 176, 540),
    d('rubble', 180, 160),
    d('cobweb', 14, 20),
    d('cobweb', 14, 392),
    d('cobweb', 14, 592),
  ],
  props: [{ kind: 'mushroom', x: 22, y: 612 }],
  dark: {
    ambient: 0.42,
    lights: [{ x: 110, y: 640, r: 90, kind: 'cold' }],
  },
  next: ['city'],
  preview: { hero: [110, 440], gate: ['portcullis', 110, 220, 220] },
};

// Les Archives scellées: a reading hall behind the mages' tower. Stone
// floor with a worn red runner, bookcases (the scene's two blocks) and
// shelves along the walls, lecterns and heaps of scrolls; the sealed
// shelf at the far end; the stair down to the Watchers' vault, top left.
export const ARCHIVES: ZoneArt = {
  key: 'archives',
  ground: {
    w: 220,
    h: 300,
    base: 'stonefloor',
    seed: 311,
    shapes: [{ kind: 'rect', material: 'carpet', x: 96, y: 24, w: 28, h: 276 }],
  },
  walls: enclosure(300, 'crypt', [
    [20, 240, 30, 60],
    [200, 140, 30, 80],
  ]).map((w, i) => (i >= 3 ? { ...w, style: 'shelves' as const } : w)),
  dprops: [
    d('bookshelf', 26, 40),
    d('bookshelf', 50, 40),
    d('bookshelf', 170, 40),
    d('bookshelf', 194, 40),
    d('runes', 110, 64),
    d('candles', 80, 58),
    d('candles', 140, 58),
    d('lectern', 60, 110),
    d('table', 60, 196),
    d('scrolls', 160, 100),
    d('scrolls', 180, 270),
    d('lectern', 160, 70),
    d('bookshelf', 26, 300 - 14),
    d('torch', 20, 266),
    d('torch', 200, 166),
    d('cobweb', 14, 14),
  ],
  patches: [{ material: 'stairs', x: 24, y: 22, w: 24, h: 18 }],
  dark: { ambient: 0.5, lights: [{ x: 110, y: 320, r: 80, kind: 'cold' }] },
  next: ['city'],
  preview: { hero: [110, 160] },
};

// La Voûte des Veilleurs: older than the archives above it. Carved stone
// with runes, statues of watchers, collapsed shelves across the way, the
// last shelf glowing at the far end.
export const WATCHERS_VAULT: ZoneArt = {
  key: 'watchers-vault',
  ground: {
    w: 220,
    h: 420,
    base: 'stonefloor',
    seed: 321,
    shapes: [
      { kind: 'rect', material: 'aisle', x: 88, y: 0, w: 44, h: 420 },
      { kind: 'ellipse', material: 'aisle', x: 50, y: 30, w: 120, h: 80 },
    ],
  },
  walls: enclosure(420, 'carved', FOUR_24).map((w, i) => (i >= 3 ? { ...w, style: 'shelves' as const } : w)),
  dprops: [
    d('runes', 110, 70),
    d('bookshelf', 70, 36),
    d('bookshelf', 150, 36),
    d('statue', 50, 120),
    d('statue', 170, 120),
    d('statue', 60, 300),
    d('statue', 160, 220),
    d('scrolls', 56, 236),
    d('scrolls', 170, 410),
    d('lectern', 160, 330),
    d('candles', 74, 84),
    d('candles', 146, 84),
    d('rubble', 170, 158),
    d('cobweb', 14, 14),
    d('torch', 20, 386),
    d('torch', 200, 306),
    d('torch', 20, 166),
  ],
  dark: { ambient: 0.4, lights: [{ x: 110, y: 440, r: 80, kind: 'cold' }] },
  next: ['archives'],
  preview: { hero: [110, 300], gate: ['rubble', 110, 190, 220] },
};

// L'Entrepôt abandonné: the smugglers' storehouse. Plank floor, crates
// stacked to the beams (the scene's blocks), the captain's desk at the
// back, a trapdoor top right down to the guild's records.
export const WAREHOUSE: ZoneArt = {
  key: 'warehouse',
  ground: {
    w: 220,
    h: 420,
    base: 'planks',
    seed: 331,
    shapes: [{ kind: 'rect', material: 'stonefloor', x: 0, y: 0, w: 220, h: 30 }],
  },
  walls: [
    { x: 7, y: 210, w: 14, h: 420, face: 0, solid: true, style: 'crypt' },
    { x: 213, y: 210, w: 14, h: 420, face: 0, solid: true, style: 'crypt' },
    { x: 110, y: 6, w: 220, h: 12, face: 14, style: 'crypt' },
    ...THREE_30.map(([x, y, w, h]) => ({ x, y, w, h, style: 'crates' as const })),
  ],
  props: [
    { kind: 'crate', x: 40, y: 410 },
    { kind: 'crate', x: 48, y: 404 },
    { kind: 'barrel', x: 190, y: 330 },
    { kind: 'barrel', x: 198, y: 338 },
    { kind: 'sacks', x: 36, y: 230 },
    { kind: 'barrel', x: 180, y: 100 },
    { kind: 'crate', x: 40, y: 64 },
    { kind: 'sacks', x: 190, y: 220 },
  ],
  dprops: [
    d('table', 110, 52),
    d('chains', 60, 4),
    d('torch', 20, 386),
    d('torch', 200, 306),
    d('torch', 20, 166),
    d('cobweb', 14, 14),
    d('rubble', 60, 300),
  ],
  patches: [{ material: 'hatch', x: 200, y: 22, w: 22, h: 16 }],
  dark: { ambient: 0.48, lights: [{ x: 110, y: 440, r: 80, kind: 'cold' }] },
  next: ['faubourg'],
  preview: { hero: [110, 300], gate: ['crates', 110, 190, 220] },
};

// Les Registres de la Guilde: the merchants' notarial records under the
// warehouse. Shelves locked with chains, ledgers on tables, the register
// of successions on its lectern.
export const GUILD_ARCHIVE: ZoneArt = {
  key: 'guild-archive',
  ground: {
    w: 220,
    h: 420,
    base: 'stonefloor',
    seed: 341,
    shapes: [{ kind: 'rect', material: 'carpet', x: 98, y: 30, w: 24, h: 390 }],
  },
  walls: enclosure(420, 'crypt', FOUR_24).map((w, i) => (i >= 3 ? { ...w, style: 'shelves' as const } : w)),
  dprops: [
    d('lectern', 110, 66),
    d('candles', 84, 76),
    d('candles', 136, 76),
    d('bookshelf', 40, 34),
    d('bookshelf', 180, 34),
    d('table', 60, 230),
    d('table', 160, 150),
    d('scrolls', 160, 410),
    d('scrolls', 50, 300),
    d('torch', 20, 386),
    d('torch', 200, 306),
    d('torch', 20, 166),
    d('cobweb', 14, 14),
  ],
  dark: { ambient: 0.46, lights: [{ x: 110, y: 440, r: 80, kind: 'cold' }] },
  next: ['warehouse'],
  preview: { hero: [110, 300], gate: ['shelves', 110, 190, 220] },
};

// La Crypte des Aînés: the family crypt under the sealed house. Tomb piers
// with niches, sarcophagi, knights in stone keeping watch, a sealed slab
// across the way, the stair down to the third altar top right.
export const ANCESTRAL_CRYPT: ZoneArt = {
  key: 'ancestral-crypt',
  ground: {
    w: 220,
    h: 420,
    base: 'stonefloor',
    seed: 351,
    shapes: [
      { kind: 'rect', material: 'aisle', x: 90, y: 0, w: 40, h: 420 },
      { kind: 'rect', material: 'aisle', x: 50, y: 30, w: 120, h: 80 },
    ],
  },
  walls: enclosure(420, 'crypt', FOUR_24, { niches: true, backFace: 16 }),
  dprops: [
    d('sarcophagus', 110, 52),
    d('candles', 84, 64),
    d('candles', 136, 64),
    d('statue', 60, 110),
    d('statue', 160, 110),
    d('sarcophagus', 56, 250),
    d('sarcophagus', 164, 240),
    d('urn', 60, 400),
    d('skulls', 40, 214),
    d('bones', 170, 410),
    d('torch', 20, 386),
    d('torch', 200, 306),
    d('torch', 20, 166),
    d('cobweb', 14, 14),
  ],
  patches: [{ material: 'stairs', x: 196, y: 22, w: 26, h: 20 }],
  dark: { ambient: 0.4, lights: [{ x: 110, y: 440, r: 80, kind: 'cold' }] },
  next: ['city'],
  preview: { hero: [110, 300], gate: ['slab', 110, 190, 220] },
};

// Le Troisième Autel: deeper still, older, carved with runes that wake.
// The altar of the rite at the far end in its rune circle.
export const THIRD_ALTAR: ZoneArt = {
  key: 'third-altar',
  ground: {
    w: 220,
    h: 420,
    base: 'stonefloor',
    seed: 361,
    shapes: [
      { kind: 'rect', material: 'aisle', x: 88, y: 0, w: 44, h: 420 },
      { kind: 'ellipse', material: 'aisle', x: 40, y: 20, w: 140, h: 100 },
    ],
  },
  walls: enclosure(420, 'carved', FOUR_24, { backFace: 16 }),
  props: [{ kind: 'altar', x: 110, y: 60 }],
  dprops: [
    d('runes', 110, 78),
    d('brazier', 56, 80),
    d('brazier', 164, 80),
    d('pillar', 50, 130),
    d('pillar', 170, 130),
    d('statue', 60, 300),
    d('statue', 160, 220),
    d('bones', 50, 410),
    d('rubble', 170, 160),
    d('cobweb', 14, 14),
  ],
  dark: { ambient: 0.36, lights: [{ x: 110, y: 440, r: 70, kind: 'cold' }] },
  next: ['ancestral-crypt'],
  preview: { hero: [110, 300], gate: ['slab', 110, 190, 220] },
};

// La Chapelle engloutie: a chapel under the old quays, half flooded.
// Mossy masonry, standing water, broken pillars, rubble across the nave,
// daylight falling through the cracked vault.
export const SUNKEN_CHAPEL: ZoneArt = {
  key: 'sunken-chapel',
  ground: {
    w: 220,
    h: 420,
    base: 'stonefloor',
    seed: 371,
    shapes: [
      { kind: 'rect', material: 'aisle', x: 90, y: 0, w: 40, h: 420 },
      // The flood: standing water over the nave's slabs, deeper pools.
      { kind: 'ellipse', material: 'flooded', x: 20, y: 236, w: 90, h: 70, rough: 8 },
      { kind: 'ellipse', material: 'flooded', x: 120, y: 316, w: 90, h: 60, rough: 8 },
      { kind: 'ellipse', material: 'flooded', x: 120, y: 100, w: 90, h: 60, rough: 8 },
      { kind: 'ellipse', material: 'flooded', x: 20, y: 40, w: 70, h: 60, rough: 6 },
      { kind: 'ellipse', material: 'water', x: 146, y: 118, w: 40, h: 22, rough: 3 },
      { kind: 'ellipse', material: 'water', x: 40, y: 262, w: 30, h: 16, rough: 3 },
    ],
  },
  walls: enclosure(420, 'mossy', FOUR_24, { backFace: 16 }),
  props: [
    { kind: 'altar', x: 110, y: 52 },
    { kind: 'reeds', x: 44, y: 286, seed: 1 },
    { kind: 'reeds', x: 186, y: 352, seed: 2 },
    { kind: 'ruin_pillar', x: 60, y: 110, seed: 3 },
    { kind: 'ruin_pillar', x: 160, y: 220, seed: 4 },
    { kind: 'fern', x: 40, y: 410, seed: 2 },
    { kind: 'mushroom', x: 180, y: 410 },
  ],
  dprops: [
    d('pillar', 60, 330),
    d('pillar', 160, 100),
    d('puddle', 70, 380),
    d('rubble', 60, 200),
    d('rubble', 176, 160),
    d('candles', 80, 64),
    d('candles', 140, 64),
    d('cobweb', 14, 14),
  ],
  dark: {
    ambient: 0.5,
    lights: [
      { x: 110, y: 440, r: 80, kind: 'cold' },
      { x: 70, y: 280, r: 40, kind: 'cold' },
      { x: 150, y: 140, r: 40, kind: 'cold' },
    ],
  },
  next: ['faubourg'],
  preview: { hero: [110, 300], gate: ['rubble', 110, 190, 220] },
};

// La Racine corrompue: under the corrupted grove, the root that fed it.
// A cave of earth and roots, glowing pods, cracks bleeding violet light.
export const CORRUPTED_ROOT: ZoneArt = {
  key: 'corrupted-root',
  ground: {
    w: 220,
    h: 420,
    base: 'cave',
    seed: 381,
    shapes: [
      { kind: 'ellipse', material: 'blight', x: 30, y: 10, w: 160, h: 130, rough: 10 },
      { kind: 'ellipse', material: 'blight', x: 60, y: 220, w: 90, h: 60, rough: 8 },
      { kind: 'ellipse', material: 'blight', x: 120, y: 330, w: 70, h: 50, rough: 8 },
    ],
  },
  walls: enclosure(420, 'roots', FOUR_24),
  props: [
    { kind: 'blight_pod', x: 60, y: 100, seed: 1 },
    { kind: 'blight_pod', x: 166, y: 70, seed: 2 },
    { kind: 'blight_pod', x: 50, y: 300, seed: 3 },
    { kind: 'blight_pod', x: 170, y: 410, seed: 4 },
    { kind: 'blight_pod', x: 44, y: 176, seed: 5 },
    { kind: 'blight_pod', x: 176, y: 316, seed: 6 },
    { kind: 'thorns', x: 160, y: 160, seed: 1 },
    { kind: 'thorns', x: 60, y: 230, seed: 2 },
  ],
  dprops: [
    d('vein', 110, 70),
    d('vein', 90, 250),
    d('vein', 150, 350),
    d('bones', 60, 410),
    d('rubble', 160, 220),
  ],
  dark: { ambient: 0.42, lights: [{ x: 110, y: 440, r: 70, kind: 'cold' }], shade: [0.86, 0.8, 0.96] },
  next: ['blighted-grove'],
  preview: { hero: [110, 300], gate: ['roots', 110, 190, 220] },
};

// La Tanière des marais: the lair in the reeds north of the outpost. Mud
// and standing water, banks of reeds (the scene's blocks), dead trees, a
// knot of roots across the way, the matriarch's pool at the end.
export const MARSH_LAIR: ZoneArt = {
  key: 'marsh-lair',
  ground: {
    w: 220,
    h: 420,
    base: 'mud',
    seed: 391,
    shapes: [
      { kind: 'ellipse', material: 'marsh', x: 10, y: 220, w: 70, h: 120, rough: 10 },
      { kind: 'ellipse', material: 'marsh', x: 140, y: 120, w: 80, h: 110, rough: 10 },
      { kind: 'ellipse', material: 'marsh', x: 20, y: 60, w: 60, h: 60, rough: 8 },
      { kind: 'ellipse', material: 'grass', x: 150, y: 380, w: 70, h: 50, rough: 8 },
      { kind: 'ellipse', material: 'water', x: 60, y: 20, w: 100, h: 60, rough: 6 },
      { kind: 'ellipse', material: 'water', x: 150, y: 330, w: 50, h: 30, rough: 4 },
    ],
  },
  walls: [
    { x: 7, y: 210, w: 14, h: 420, face: 0, solid: true, style: 'reeds' },
    { x: 213, y: 210, w: 14, h: 420, face: 0, solid: true, style: 'reeds' },
    ...THREE_30.map(([x, y, w, h]) => ({ x, y, w, h, style: 'reeds' as const })),
  ],
  props: [
    { kind: 'dead_tree', x: 40, y: 96, seed: 1 },
    { kind: 'dead_tree', x: 184, y: 120, seed: 2 },
    { kind: 'dead_tree', x: 176, y: 404, seed: 3 },
    // Reeds at the foot of each bank, so the banks don't end in a line.
    { kind: 'reeds', x: 14, y: 394, seed: 6 },
    { kind: 'reeds', x: 32, y: 396, seed: 7 },
    { kind: 'reeds', x: 192, y: 314, seed: 8 },
    { kind: 'reeds', x: 206, y: 316, seed: 9 },
    { kind: 'reeds', x: 14, y: 174, seed: 10 },
    { kind: 'reeds', x: 32, y: 176, seed: 11 },
    { kind: 'reeds', x: 60, y: 260, seed: 1 },
    { kind: 'reeds', x: 160, y: 210, seed: 2 },
    { kind: 'reeds', x: 150, y: 350, seed: 3 },
    { kind: 'reeds', x: 70, y: 50, seed: 4 },
    { kind: 'reeds', x: 150, y: 40, seed: 5 },
    { kind: 'log', x: 60, y: 300, seed: 3 },
    { kind: 'mushroom', x: 40, y: 410 },
    { kind: 'fern', x: 186, y: 250, seed: 4 },
  ],
  dprops: [d('bones', 150, 90), d('bones', 60, 170)],
  dark: { ambient: 0.7, shade: [0.82, 0.92, 0.84] },
  next: ['hunter-outpost'],
  preview: { hero: [110, 300], gate: ['roots', 110, 190, 220] },
};

// Le Bosquet corrompu: the first patch of corruption on this side of the
// delta. A wood dying from the north: healthy floor at the entrance,
// blight beyond the brambles, black trees and glowing pods.
export const BLIGHTED_GROVE: ZoneArt = {
  key: 'blighted-grove',
  ground: {
    w: 220,
    h: 420,
    base: 'forest',
    seed: 401,
    shapes: [
      { kind: 'path', material: 'dirt', width: 16, points: [[110, 420], [106, 330], [114, 250], [110, 200]], rough: 2 },
      { kind: 'rect', material: 'blight', x: 0, y: 0, w: 220, h: 230, rough: 14 },
      { kind: 'ellipse', material: 'blight', x: 40, y: 250, w: 60, h: 40, rough: 8 },
    ],
  },
  walls: [
    { x: 7, y: 210, w: 14, h: 420, face: 0, solid: true, style: 'thicket' },
    { x: 213, y: 210, w: 14, h: 420, face: 0, solid: true, style: 'thicket' },
    { x: 20, y: 360, w: 24, h: 60, style: 'thicket' },
    { x: 200, y: 280, w: 24, h: 60, style: 'thicket' },
    { x: 20, y: 140, w: 24, h: 60, style: 'thicket' },
  ],
  props: [
    { kind: 'blight_tree', x: 50, y: 60, seed: 1 },
    { kind: 'blight_tree', x: 176, y: 110, seed: 2 },
    { kind: 'blight_tree', x: 166, y: 186, seed: 3 },
    { kind: 'blight_pod', x: 110, y: 40, seed: 1 },
    { kind: 'blight_pod', x: 56, y: 230, seed: 2 },
    { kind: 'thorns', x: 150, y: 50, seed: 3 },
    { kind: 'thorns', x: 60, y: 110, seed: 4 },
    { kind: 'dead_tree', x: 160, y: 250, seed: 4 },
    { kind: 'tree', x: 50, y: 300, seed: 5 },
    { kind: 'bush', x: 176, y: 340, seed: 6 },
    { kind: 'fern', x: 40, y: 410, seed: 7 },
    { kind: 'tree', x: 186, y: 408, seed: 8 },
    { kind: 'mushroom', x: 70, y: 380 },
  ],
  dprops: [d('vein', 110, 120), d('vein', 70, 180)],
  dark: { ambient: 0.74, shade: [0.88, 0.82, 0.96] },
  next: ['hunter-outpost'],
  preview: { hero: [110, 300], gate: ['brambles', 110, 190, 220] },
};

// La Halte corrompue: an old waystation off the trade road, where the
// corruption came back. A ruined rest stop overgrown with black thorns,
// the well at its heart gone black.
export const WAYSTATION: ZoneArt = {
  key: 'waystation',
  ground: {
    w: 220,
    h: 420,
    base: 'grass',
    seed: 411,
    shapes: [
      { kind: 'path', material: 'dirt', width: 18, points: [[110, 420], [104, 300], [112, 200], [110, 90]], rough: 2 },
      { kind: 'ellipse', material: 'blight', x: 20, y: 0, w: 180, h: 150, rough: 12 },
      { kind: 'ellipse', material: 'blight', x: 120, y: 200, w: 80, h: 70, rough: 10 },
      { kind: 'ellipse', material: 'flagstone', x: 70, y: 30, w: 80, h: 60 },
    ],
  },
  walls: [
    { x: 7, y: 210, w: 14, h: 420, face: 0, solid: true, style: 'thicket' },
    { x: 213, y: 210, w: 14, h: 420, face: 0, solid: true, style: 'thicket' },
    ...FOUR_24.map(([x, y, w, h]) => ({ x, y, w, h, style: 'thicket' as const })),
  ],
  props: [
    { kind: 'black_well', x: 110, y: 66, seed: 1 },
    { kind: 'ruin_pillar', x: 52, y: 60, seed: 1 },
    { kind: 'ruin_pillar', x: 168, y: 70, seed: 2 },
    { kind: 'thorns', x: 150, y: 120, seed: 1 },
    { kind: 'thorns', x: 60, y: 200, seed: 2 },
    { kind: 'blight_pod', x: 160, y: 236, seed: 3 },
    { kind: 'dead_tree', x: 56, y: 250, seed: 1 },
    { kind: 'wagon_cart', x: 60, y: 300, seed: 6 },
    { kind: 'trough', x: 170, y: 410 },
    { kind: 'bush', x: 40, y: 410, seed: 3 },
    { kind: 'signpost', x: 150, y: 330 },
  ],
  stoneWalls: [
    { x: 46, y: 116, len: 32 },
    { x: 176, y: 30, len: 28 },
  ],
  dprops: [d('vein', 90, 110), d('rubble', 140, 40)],
  dark: { ambient: 0.8, shade: [0.9, 0.85, 0.96] },
  next: ['road'],
  preview: { hero: [110, 300], gate: ['brambles', 110, 190, 220] },
};
