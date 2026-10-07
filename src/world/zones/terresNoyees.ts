import type { ZoneArt } from '../zonePlan';
import { Keepout, fill } from './scatterDecor';
import { FOUR_24, THREE_24, THREE_30, d, enclosure } from './dungeonKit';

// Les Terres Noyées: the drowned delta. Each zone keeps its scene's layout
// (exits, NPCs, encounter spots) and gets its own look.

// La Route engloutie: the old road, half sunk, crossing the drowned lands
// on a causeway of broken flagstones. Bog all round, drowned ruins poking
// out, cypresses hung with moss; boardwalks to the ruins' entrance (south)
// and to a forgotten chest (north).
const CAUSEWAY: [number, number][] = [[0, 200], [70, 202], [140, 190], [200, 168], [270, 158], [340, 152], [400, 150]];
const SUNKEN_KEEP: Keepout = {
  roads: [
    { points: CAUSEWAY, clear: 20 },
    { points: [[262, 160], [270, 240], [280, 330]], clear: 12 },
    { points: [[330, 154], [346, 120], [350, 104]], clear: 12 },
  ],
  spots: [
    [90, 200, 36], // Odren's walk
    [200, 140, 24], // signpost
    [350, 100, 22], // chest
    [280, 355, 30], // ruins entrance
    [30, 180, 20],
    [370, 130, 20],
  ],
};

export const SUNKEN_ROAD: ZoneArt = {
  key: 'sunken-road',
  ground: {
    w: 400,
    h: 400,
    base: 'mud',
    seed: 701,
    shapes: [
      { kind: 'ellipse', material: 'bog', x: -30, y: 10, w: 190, h: 150, rough: 14 },
      { kind: 'ellipse', material: 'bog', x: 150, y: 210, w: 110, h: 100, rough: 12 },
      { kind: 'ellipse', material: 'bog', x: -20, y: 260, w: 170, h: 160, rough: 14 },
      { kind: 'ellipse', material: 'bog', x: 300, y: 190, w: 130, h: 120, rough: 12 },
      { kind: 'ellipse', material: 'bog', x: 190, y: 20, w: 120, h: 90, rough: 10 },
      { kind: 'ellipse', material: 'marsh', x: 220, y: 330, w: 120, h: 80, rough: 10 },
      // The causeway, the boardwalks off it.
      { kind: 'path', material: 'flagstone', width: 22, points: CAUSEWAY },
      { kind: 'path', material: 'planks', width: 10, points: [[262, 160], [270, 240], [280, 336]] },
      { kind: 'path', material: 'planks', width: 9, points: [[330, 154], [346, 120], [350, 108]] },
      { kind: 'ellipse', material: 'flagstone', x: 256, y: 334, w: 50, h: 34 },
    ],
  },
  props: [
    // The drowned ruins (where the scene had them).
    { kind: 'sunken_ruin', x: 80, y: 96, seed: 1 },
    { kind: 'sunken_ruin', x: 140, y: 66, seed: 2 },
    { kind: 'sunken_ruin', x: 316, y: 346, seed: 3 },
    { kind: 'sunken_ruin', x: 236, y: 376, seed: 4 },
    { kind: 'sunken_ruin', x: 190, y: 262, seed: 5 },
    { kind: 'sunken_ruin', x: 230, y: 92, seed: 6 },
    { kind: 'ruin_pillar', x: 256, y: 330, seed: 1 },
    { kind: 'ruin_pillar', x: 306, y: 326, seed: 2 },
    { kind: 'mooring_post', x: 344, y: 112 },
    ...fill({ x: 0, y: 4, w: 400, h: 396 }, 16, 30, [['swamp_tree', 4], ['dead_tree', 2], ['reeds', 4]], 701, SUNKEN_KEEP, 6),
    ...fill({ x: 0, y: 4, w: 400, h: 396 }, 22, 18, [['reeds', 5], ['fern', 1], ['rock_small', 1]], 702, SUNKEN_KEEP, 2),
  ],
  next: ['hunter-outpost', 'vasenoire'],
  preview: { hero: [200, 220], npcs: [['villager_wanderer', 90, 200]] },
};

// Vasenoire: the town on stilts. Huts raised over bog pools, boardwalks
// between them (north to the hidden quay, west to the drowned road, east
// to the discreet passage), the stall and the open-air forge on the main
// square of planks, boats tied up, fish and nets drying.
export const VASENOIRE: ZoneArt<'hutA' | 'hutB' | 'hutC' | 'hutD'> = {
  key: 'vasenoire',
  ground: {
    w: 240,
    h: 320,
    base: 'mud',
    seed: 711,
    shapes: [
      { kind: 'ellipse', material: 'bog', x: 10, y: 50, w: 100, h: 80, rough: 8 },
      { kind: 'ellipse', material: 'bog', x: 150, y: 40, w: 100, h: 80, rough: 8 },
      { kind: 'ellipse', material: 'bog', x: 140, y: 250, w: 110, h: 80, rough: 8 },
      { kind: 'ellipse', material: 'bog', x: -10, y: 260, w: 90, h: 70, rough: 8 },
      { kind: 'ellipse', material: 'bog', x: 180, y: 160, w: 70, h: 40, rough: 6 },
      // Boardwalks.
      { kind: 'path', material: 'planks', width: 16, points: [[120, 320], [120, 150], [118, 0]] },
      { kind: 'path', material: 'planks', width: 14, points: [[0, 150], [120, 150], [240, 150]] },
      { kind: 'rect', material: 'planks', x: 30, y: 160, w: 70, h: 30 },
      { kind: 'rect', material: 'planks', x: 150, y: 196, w: 70, h: 50 },
      { kind: 'path', material: 'planks', width: 8, points: [[120, 120], [70, 120]] },
      { kind: 'path', material: 'planks', width: 8, points: [[120, 110], [180, 110]] },
      { kind: 'path', material: 'planks', width: 8, points: [[120, 300], [170, 314]] },
      { kind: 'path', material: 'planks', width: 8, points: [[120, 300], [50, 316]] },
    ],
  },
  buildings: {
    hutA: { kind: 'stilt_hut', x: 56, y: 96, w: 50, h: 38 },
    hutB: { kind: 'stilt_hut', x: 186, y: 86, w: 44, h: 34 },
    hutC: { kind: 'stilt_hut', x: 192, y: 292, w: 46, h: 32 },
    hutD: { kind: 'stilt_hut', x: 40, y: 298, w: 40, h: 28 },
  },
  props: [
    { kind: 'merchant_stall', x: 50, y: 181, seed: 2 },
    { kind: 'smithy', x: 190, y: 243 },
    { kind: 'barrel', x: 210, y: 210 },
    { kind: 'rowboat', x: 92, y: 126, seed: 4 },
    { kind: 'rowboat', x: 210, y: 176, seed: 5 },
    { kind: 'mooring_post', x: 96, y: 52 },
    { kind: 'mooring_post', x: 182, y: 166 },
    { kind: 'net_rack', x: 90, y: 140, seed: 3 },
    { kind: 'net_rack', x: 152, y: 140, seed: 4 },
    { kind: 'lamppost', x: 132, y: 166 },
    { kind: 'lamppost', x: 106, y: 260 },
    { kind: 'crate', x: 30, y: 200 },
    { kind: 'sacks', x: 84, y: 196 },
    { kind: 'swamp_tree', x: 14, y: 40, seed: 1 },
    { kind: 'swamp_tree', x: 228, y: 30, seed: 2 },
    { kind: 'swamp_tree', x: 226, y: 320, seed: 3 },
    { kind: 'reeds', x: 20, y: 130, seed: 1 },
    { kind: 'reeds', x: 150, y: 60, seed: 2 },
    { kind: 'reeds', x: 230, y: 250, seed: 3 },
    { kind: 'reeds', x: 10, y: 250, seed: 4 },
    { kind: 'reeds', x: 150, y: 290, seed: 5 },
  ],
  next: ['sunken-road'],
  preview: {
    hero: [120, 220],
    npcs: [
      ['vasenoire_local_yenn', 170, 190],
      ['vasenoire_local_toma', 70, 260],
    ],
  },
};

// Le Quai clandestin: the smugglers' hidden quay by night. A plank deck
// over black water, crates stacked high, lanterns, a net strung across,
// the floating store at the end.
export const CLANDESTINE_DOCK: ZoneArt<'store'> = {
  key: 'clandestine-dock',
  ground: {
    w: 220,
    h: 420,
    base: 'bog',
    seed: 721,
    shapes: [{ kind: 'rect', material: 'planks', x: 18, y: 0, w: 184, h: 420 }],
  },
  walls: THREE_30.map(([x, y, w, h]) => ({ x, y, w, h, style: 'crates' as const })),
  buildings: { store: { kind: 'storehouse', x: 124, y: 26, w: 70, h: 30 } },
  solids: [
    { x: 9, y: 210, w: 18, h: 420 },
    { x: 211, y: 210, w: 18, h: 420 },
    { x: 124, y: 26, w: 70, h: 30 },
  ],
  props: [
    { kind: 'lamppost', x: 52, y: 250 },
    { kind: 'lamppost', x: 176, y: 330 },
    { kind: 'lamppost', x: 176, y: 110 },
    { kind: 'barrel', x: 40, y: 410 },
    { kind: 'barrel', x: 48, y: 404 },
    { kind: 'crate', x: 186, y: 228 },
    { kind: 'sacks', x: 40, y: 220 },
    { kind: 'mooring_post', x: 24, y: 300 },
    { kind: 'mooring_post', x: 198, y: 160 },
    { kind: 'rowboat', x: 12, y: 330, seed: 6 },
    { kind: 'net_rack', x: 50, y: 100, seed: 5 },
  ],
  patches: [{ material: 'stairs', x: 30, y: 22, w: 24, h: 18 }],
  dark: {
    ambient: 0.5,
    lights: [
      { x: 110, y: 440, r: 70, kind: 'cold' },
      { x: 58, y: 222, r: 50, kind: 'fire' },
      { x: 182, y: 302, r: 50, kind: 'fire' },
      { x: 182, y: 82, r: 50, kind: 'fire' },
    ],
  },
  next: ['vasenoire'],
  preview: { hero: [70, 300], gate: ['net', 110, 190, 220] },
};

// Les Ruines englouties: halls of a drowned town, knee-deep in water over
// their slabs, mossy walls, broken columns, light falling through the
// fallen vault; stairs down to the brotherhood's tomb top left.
export const SUNKEN_RUINS: ZoneArt = {
  key: 'sunken-ruins',
  ground: {
    w: 220,
    h: 420,
    base: 'flooded',
    seed: 731,
    shapes: [
      { kind: 'path', material: 'stonefloor', width: 34, points: [[110, 420], [104, 300], [114, 200], [110, 90]], rough: 4 },
      { kind: 'ellipse', material: 'stonefloor', x: 40, y: 30, w: 140, h: 90, rough: 6 },
      { kind: 'ellipse', material: 'water', x: 150, y: 330, w: 50, h: 30, rough: 4 },
      { kind: 'ellipse', material: 'water', x: 30, y: 240, w: 40, h: 26, rough: 4 },
    ],
  },
  walls: enclosure(420, 'mossy', THREE_30, { backFace: 16 }),
  props: [
    { kind: 'ruin_pillar', x: 60, y: 110, seed: 1 },
    { kind: 'ruin_pillar', x: 160, y: 110, seed: 2 },
    { kind: 'ruin_pillar', x: 60, y: 310, seed: 3 },
    { kind: 'sunken_ruin', x: 160, y: 236, seed: 7 },
    { kind: 'reeds', x: 50, y: 270, seed: 1 },
    { kind: 'reeds', x: 186, y: 350, seed: 2 },
    { kind: 'fern', x: 186, y: 410, seed: 3 },
  ],
  dprops: [d('rubble', 60, 200), d('rubble', 170, 160), d('pillar', 160, 400), d('cobweb', 14, 14), d('bones', 50, 400)],
  patches: [{ material: 'stairs', x: 30, y: 22, w: 24, h: 18 }],
  dark: {
    ambient: 0.52,
    lights: [
      { x: 110, y: 440, r: 80, kind: 'cold' },
      { x: 150, y: 300, r: 40, kind: 'cold' },
      { x: 70, y: 170, r: 40, kind: 'cold' },
      { x: 110, y: 60, r: 50, kind: 'cold' },
    ],
  },
  next: ['sunken-road'],
  preview: { hero: [70, 300], gate: ['rubble', 110, 190, 220] },
};

// Le Sanctuaire scellé: the founders' sanctuary under the quay. Carved
// stone and pale runes, statues on guard, the intact rune seal across the
// nave, the sealed reserve at the end; a stair up to the seekers' camp.
export const SEALED_SANCTUARY: ZoneArt = {
  key: 'sealed-sanctuary',
  ground: {
    w: 220,
    h: 420,
    base: 'stonefloor',
    seed: 741,
    shapes: [
      { kind: 'rect', material: 'aisle', x: 88, y: 0, w: 44, h: 420 },
      { kind: 'ellipse', material: 'aisle', x: 46, y: 26, w: 128, h: 90 },
    ],
  },
  walls: enclosure(420, 'carved', FOUR_24, { backFace: 16 }),
  dprops: [
    d('runes', 110, 70),
    d('statue', 56, 110),
    d('statue', 164, 110),
    d('statue', 60, 300),
    d('statue', 160, 230),
    d('candles', 76, 82),
    d('candles', 144, 82),
    d('urn', 50, 40),
    d('urn', 170, 400),
    d('cobweb', 14, 14),
  ],
  patches: [{ material: 'stairs', x: 190, y: 22, w: 26, h: 18 }],
  dark: { ambient: 0.4, lights: [{ x: 110, y: 440, r: 70, kind: 'cold' }, { x: 110, y: 200, r: 60, kind: 'magic' }] },
  next: ['clandestine-dock'],
  preview: { hero: [70, 300], gate: ['runes', 110, 190, 220] },
};

// Le Camp des Chercheurs: the shard seekers camped in a vault. Tents and a
// fire on the flagstones, crates of loot, a table covered with maps,
// shelves barricading the way to their archivist.
export const SHARD_SEEKERS_CAMP: ZoneArt = {
  key: 'shard-seekers-camp',
  ground: {
    w: 220,
    h: 420,
    base: 'stonefloor',
    seed: 751,
    shapes: [
      { kind: 'ellipse', material: 'dirt', x: 40, y: 230, w: 140, h: 120, rough: 10 },
      { kind: 'ellipse', material: 'dirt', x: 50, y: 30, w: 120, h: 90, rough: 8 },
    ],
  },
  walls: enclosure(420, 'crypt', []).concat(THREE_24.map(([x, y, w, h]) => ({ x, y, w, h, style: 'crates' as const }))),
  props: [
    { kind: 'tent', x: 60, y: 260, seed: 1 },
    { kind: 'campfire', x: 160, y: 300, seed: 1 },
    { kind: 'crate', x: 180, y: 400 },
    { kind: 'crate', x: 40, y: 410 },
    { kind: 'barrel', x: 190, y: 250 },
    { kind: 'sacks', x: 40, y: 330 },
    { kind: 'tent', x: 170, y: 60, seed: 2 },
  ],
  dprops: [
    d('table', 60, 90),
    d('scrolls', 150, 120),
    d('bookshelf', 40, 34),
    d('torch', 20, 386),
    d('torch', 200, 306),
    d('torch', 20, 166),
    d('cobweb', 14, 14),
  ],
  dark: { ambient: 0.46, lights: [{ x: 110, y: 440, r: 70, kind: 'cold' }, { x: 160, y: 290, r: 60, kind: 'fire' }] },
  next: ['sealed-sanctuary'],
  preview: { hero: [70, 300], gate: ['shelves', 110, 190, 220] },
};

// Le Tombeau de la confrérie: the founding brotherhood's tomb. Piers full
// of niches, rows of sarcophagi, knights in stone, the sealed funeral
// slab; the way down to the broken sleep top left.
export const BROTHERHOOD_TOMB: ZoneArt = {
  key: 'brotherhood-tomb',
  ground: {
    w: 220,
    h: 420,
    base: 'stonefloor',
    seed: 761,
    shapes: [
      { kind: 'rect', material: 'aisle', x: 90, y: 0, w: 40, h: 420 },
      { kind: 'rect', material: 'aisle', x: 46, y: 30, w: 128, h: 80 },
    ],
  },
  walls: enclosure(420, 'crypt', FOUR_24, { niches: true, backFace: 16 }),
  dprops: [
    d('sarcophagus', 72, 60),
    d('sarcophagus', 148, 60),
    d('brazier', 46, 96),
    d('brazier', 174, 96),
    d('sarcophagus', 56, 250),
    d('sarcophagus', 164, 240),
    d('sarcophagus', 56, 420 - 30),
    d('statue', 60, 310),
    d('statue', 160, 150),
    d('candles', 76, 262),
    d('skulls', 160, 410),
    d('torch', 20, 386),
    d('torch', 200, 306),
    d('cobweb', 14, 14),
  ],
  patches: [{ material: 'stairs', x: 22, y: 22, w: 24, h: 18 }],
  dark: { ambient: 0.38, lights: [{ x: 110, y: 440, r: 70, kind: 'cold' }] },
  next: ['sunken-ruins'],
  preview: { hero: [70, 300], gate: ['slab', 110, 190, 220] },
};

// Le Sommeil brisé: what the theft disturbed under the tomb. A cave
// split open, red light welling up from the cracks, broken tombs and
// bones, a gaping fissure across the way.
export const BROKEN_SLEEP: ZoneArt = {
  key: 'broken-sleep',
  ground: {
    w: 220,
    h: 420,
    base: 'cave',
    seed: 771,
    shapes: [{ kind: 'ellipse', material: 'stonefloor', x: 40, y: 20, w: 140, h: 110, rough: 8 }],
  },
  walls: enclosure(420, 'rock', FOUR_24),
  dprops: [
    d('ember', 110, 80),
    d('ember', 70, 260),
    d('ember', 150, 340),
    d('ember', 160, 130),
    d('sarcophagus', 60, 60),
    d('bones', 160, 70),
    d('bones', 50, 330),
    d('skulls', 170, 410),
    d('rubble', 160, 230),
    d('rubble', 60, 160),
  ],
  dark: { ambient: 0.36, lights: [{ x: 110, y: 440, r: 60, kind: 'cold' }, { x: 110, y: 186, r: 60, kind: 'fire' }], shade: [0.96, 0.82, 0.8] },
  next: ['brotherhood-tomb'],
  preview: { hero: [70, 300], gate: ['rift', 110, 190, 220] },
};

// La Vigie silencieuse: a ruined watch post of the founding brotherhood,
// up the delta. Its courtyard open to a grey sky, grass between the
// slabs, broken walls (the scene's blocks), the fallen portcullis, the
// stair up to the top of the watch; a stair down to the wards' heart.
export const SILENT_WATCH: ZoneArt = {
  key: 'silent-watch',
  ground: {
    w: 220,
    h: 420,
    base: 'grass',
    seed: 781,
    shapes: [
      { kind: 'rect', material: 'flagstone', x: -10, y: 0, w: 240, h: 420 },
      { kind: 'ellipse', material: 'dirt', x: 40, y: 220, w: 60, h: 46, rough: 8 },
      { kind: 'ellipse', material: 'dirt', x: 130, y: 310, w: 60, h: 46, rough: 8 },
    ],
  },
  walls: enclosure(420, 'mossy', FOUR_24, { backFace: 16 }),
  props: [
    { kind: 'ruin_pillar', x: 56, y: 100, seed: 4 },
    { kind: 'ruin_pillar', x: 164, y: 100, seed: 5 },
    { kind: 'standing_stone', x: 160, y: 230, seed: 3 },
    // Weeds taking back the courtyard.
    { kind: 'bush', x: 50, y: 300, seed: 3 },
    { kind: 'tall_grass', x: 170, y: 400, seed: 2 },
    { kind: 'tall_grass', x: 46, y: 236, seed: 3 },
    { kind: 'fern', x: 60, y: 250, seed: 4 },
    { kind: 'tall_grass', x: 150, y: 330, seed: 5 },
    { kind: 'fern', x: 170, y: 340, seed: 6 },
    { kind: 'tall_grass', x: 80, y: 150, seed: 7 },
    { kind: 'dead_tree', x: 170, y: 160, seed: 4 },
  ],
  dprops: [d('rubble', 60, 200), d('rubble', 160, 250), d('rubble', 80, 400), d('statue', 110, 40)],
  patches: [{ material: 'stairs', x: 22, y: 22, w: 24, h: 18 }],
  dark: { ambient: 0.72, shade: [0.86, 0.9, 0.98] },
  next: ['vasenoire'],
  preview: { hero: [70, 300], gate: ['portcullis', 110, 190, 220] },
};

// Le Cœur du réseau: the chamber under the watch where the wards met. A
// ring of standing stones round a dead rune circle, carved walls whose
// runes have gone dark, the nameless heart at the end.
export const WARD_CORE: ZoneArt = {
  key: 'ward-core',
  ground: {
    w: 220,
    h: 420,
    base: 'stonefloor',
    seed: 791,
    shapes: [{ kind: 'ellipse', material: 'aisle', x: 30, y: 10, w: 160, h: 130 }],
  },
  walls: enclosure(420, 'carved', FOUR_24, { backFace: 16 }),
  props: [
    { kind: 'standing_stone', x: 50, y: 80, seed: 1 },
    { kind: 'standing_stone', x: 170, y: 80, seed: 2 },
    { kind: 'standing_stone', x: 70, y: 130, seed: 3 },
    { kind: 'standing_stone', x: 150, y: 130, seed: 4 },
  ],
  dprops: [d('runes', 110, 70), d('urn', 50, 400), d('rubble', 160, 220), d('cobweb', 14, 14)],
  dark: { ambient: 0.34, lights: [{ x: 110, y: 440, r: 60, kind: 'cold' }], shade: [0.84, 0.86, 1] },
  next: ['silent-watch'],
  preview: { hero: [70, 300], gate: ['runes', 110, 190, 220] },
};
