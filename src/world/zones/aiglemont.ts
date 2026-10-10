import type { PropSpot, ZoneArt } from '../zonePlan';
import { Keepout, woods } from './scatterDecor';

// Aiglemont and its surroundings. Each zone keeps its scene's layout
// (exits, NPCs, encounter spots) and gets its own look.

// Aiglemont: the city-state. A paved square with its fountain at the
// crossing of two flagged avenues, the garrison, the mages' tower and the
// covered market, tall town houses all around (the scene gives every
// building a collision box), the forgotten alley in the south-east with
// the sealed house above the crypt, the stairs down to the catacombs.
export const CITY: ZoneArt<
  'garrison' | 'tower' | 'market' | 'nw' | 'n' | 'ne' | 'w' | 'sw' | 'sMid' | 'e' | 'crypt' | 'se'
> = {
  key: 'city',
  ground: {
    w: 520,
    h: 480,
    base: 'cobble',
    seed: 201,
    shapes: [
      // The two avenues and the square (flagstones over the cobbles).
      { kind: 'path', material: 'paving', width: 30, points: [[0, 272], [120, 268], [200, 246], [320, 246], [420, 258], [520, 254]] },
      { kind: 'path', material: 'paving', width: 30, points: [[256, 0], [258, 110], [260, 196]] },
      { kind: 'ellipse', material: 'paving', x: 150, y: 160, w: 226, h: 126 },
      // South: past the market to the catacomb stairs.
      { kind: 'path', material: 'paving', width: 22, points: [[200, 282], [196, 390], [250, 432], [262, 480]] },
      // The forgotten alley: an old muddy lane down to the sealed house.
      { kind: 'path', material: 'dirt', width: 16, points: [[424, 274], [438, 312], [468, 368], [470, 410]], rough: 2 },
    ],
  },
  buildings: {
    garrison: { kind: 'guard_barracks', x: 150, y: 100, w: 80, h: 60 },
    tower: { kind: 'stone_tower', x: 400, y: 130, w: 50, h: 100 },
    market: { kind: 'market_hall', x: 280, y: 340, w: 100, h: 60 },
    nw: { kind: 'town_house', x: 44, y: 82, w: 60, h: 50 },
    n: { kind: 'merchant_house', x: 336, y: 62, w: 54, h: 44 },
    ne: { kind: 'town_house', x: 480, y: 78, w: 56, h: 50 },
    w: { kind: 'town_house', x: 42, y: 172, w: 56, h: 48 },
    sw: { kind: 'merchant_house', x: 52, y: 392, w: 64, h: 50 },
    sMid: { kind: 'town_house', x: 140, y: 330, w: 52, h: 46 },
    e: { kind: 'town_house', x: 486, y: 168, w: 52, h: 46 },
    crypt: { kind: 'old_house', x: 470, y: 345, w: 50, h: 40 },
    se: { kind: 'town_house', x: 380, y: 418, w: 58, h: 48 },
  },
  props: [
    { kind: 'fountain', x: 262, y: 214, seed: 1 },
    // The square: trees in planters, benches, lamps.
    { kind: 'planter', x: 186, y: 176, seed: 2 },
    { kind: 'planter', x: 338, y: 182, seed: 3 },
    { kind: 'bench', x: 214, y: 232 },
    { kind: 'bench', x: 318, y: 226 },
    { kind: 'street_lamp', x: 112, y: 256 },
    { kind: 'street_lamp', x: 430, y: 240 },
    { kind: 'street_lamp', x: 232, y: 128 },
    { kind: 'street_lamp', x: 196, y: 410 },
    // Banners at the gates: north to the archives, west to the road.
    { kind: 'banner_pole', x: 226, y: 34, seed: 1 },
    { kind: 'banner_pole', x: 290, y: 34, seed: 2 },
    { kind: 'banner_pole', x: 16, y: 244, seed: 3 },
    { kind: 'banner_pole', x: 16, y: 312, seed: 4 },
    // The market: a second stall, goods stacked by the hall.
    { kind: 'merchant_stall', x: 190, y: 330, seed: 2 },
    { kind: 'barrel', x: 216, y: 372 },
    { kind: 'crate', x: 340, y: 370 },
    { kind: 'sacks', x: 348, y: 360 },
    { kind: 'market_stall', x: 350, y: 302, seed: 4 },
    { kind: 'crate', x: 372, y: 310 },
    // The old well of the west quarter.
    { kind: 'well', x: 70, y: 334, seed: 3 },
    { kind: 'flower_bush', x: 104, y: 352, seed: 7 },
    // By the houses.
    { kind: 'barrel', x: 86, y: 104 },
    { kind: 'barrel', x: 92, y: 110 },
    { kind: 'crate', x: 512, y: 112 },
    { kind: 'flower_bush', x: 14, y: 116, seed: 4 },
    { kind: 'planter', x: 92, y: 196, seed: 5 },
    { kind: 'crate', x: 96, y: 418 },
    { kind: 'barrel', x: 418, y: 444 },
    { kind: 'planter', x: 440, y: 202, seed: 6 },
    // The garrison: a cart unloading supplies.
    { kind: 'wagon_cart', x: 74, y: 140, seed: 4 },
    // The tower: a lone tree.
    { kind: 'tree', x: 456, y: 128, seed: 7 },
    // East gate: a cart waiting to leave for the quays.
    { kind: 'wagon_cart', x: 436, y: 300, seed: 5 },
  ],
  // The forgotten alley: rubble, the hatch over the crypt stairs.
  dprops: [
    { kind: 'rubble', x: 500, y: 384 },
    { kind: 'rubble', x: 440, y: 376 },
    { kind: 'cobweb', x: 446, y: 326 },
  ],
  patches: [
    { material: 'hatch', x: 470, y: 401, w: 22, h: 16 },
    { material: 'stairs', x: 262, y: 466, w: 34, h: 28 },
  ],
  ambience: {
    pigeons: [[204, 262], [212, 266], [220, 260], [326, 264], [334, 258], [118, 296]],
  },
  walkers: [
    { look: 'townsman', path: [[16, 272], [120, 268], [200, 242], [320, 242], [420, 256], [496, 252]] },
    { look: 'townswoman', path: [[258, 14], [258, 140], [220, 176], [178, 226]] },
    { look: 'burgher', path: [[300, 238], [360, 236], [420, 248], [424, 276]] },
  ],
  // The fountain's basin and the well's ring.
  solids: [
    { x: 262, y: 205, w: 42, h: 18 },
    { x: 70, y: 328, w: 24, h: 12 },
  ],
  next: ['road', 'faubourg'],
  preview: {
    hero: [260, 300],
    npcs: [
      ['city_captain', 150, 190],
      ['city_mage', 400, 220],
      ['merchant_generic', 280, 260],
      ['villager_wanderer', 500, 300],
      ['villager_wanderer', 150, 420],
    ],
  },
};

// The trade road between Valombre and Aiglemont: a rutted road dipping to
// the crossroads (the signpost), the track north to the old halt, a
// caravan stopped by the road with its guard, fields and hedges to the
// south, the alpha boar's trampled wallow in the south-west.
// A smooth dip from both gates down to the crossroads.
const ROAD_POINTS: [number, number][] = [[0, 112], [40, 118], [80, 134], [120, 156], [160, 178], [200, 194], [240, 200], [280, 194], [320, 178], [360, 156], [400, 134], [440, 118], [480, 112]];
const TRACK_POINTS: [number, number][] = [[240, 200], [236, 140], [244, 70], [240, 0]];
const ROAD_KEEP: Keepout = {
  roads: [
    { points: ROAD_POINTS, clear: 22 },
    { points: TRACK_POINTS, clear: 14 },
  ],
  spots: [
    [150, 60, 24], // guard
    [320, 60, 44], // traveler's walk
    [60, 250, 36], // alpha boar
    [240, 200, 30], // signpost
    [240, 20, 24], // to the old halt
    [30, 180, 20], // exit labels
    [450, 180, 20],
    [40, 110, 22], // arrivals
    [40, 200, 22],
    [440, 110, 22],
    [240, 60, 22],
  ],
};

const ROAD_PROPS: PropSpot[] = [
  // The caravan: two carts, crates, a fire, the horses' trough.
  { kind: 'wagon_cart', x: 104, y: 80, seed: 1 },
  { kind: 'wagon_cart', x: 196, y: 92, seed: 2 },
  { kind: 'crate', x: 128, y: 92 },
  { kind: 'crate', x: 136, y: 98 },
  { kind: 'sacks', x: 176, y: 74 },
  { kind: 'barrel', x: 82, y: 98 },
  { kind: 'campfire', x: 150, y: 86, seed: 1 },
  { kind: 'trough', x: 214, y: 70 },
  { kind: 'tree', x: 300, y: 118, seed: 8 },
  { kind: 'bush', x: 190, y: 140, seed: 9 },
  // Milestones.
  { kind: 'milestone', x: 60, y: 148, seed: 1 },
  { kind: 'milestone', x: 420, y: 148, seed: 2 },
  // Hedges and trees along the road, the fields with their fences.
  { kind: 'bush', x: 300, y: 214, seed: 1 },
  { kind: 'bush', x: 330, y: 196, seed: 2 },
  { kind: 'berry_bush', x: 178, y: 214, seed: 3 },
  { kind: 'apple_tree', x: 380, y: 222, seed: 4 },
  { kind: 'haystack', x: 400, y: 300, seed: 1 },
  { kind: 'scarecrow', x: 330, y: 274, seed: 2 },
  { kind: 'haystack', x: 234, y: 330, seed: 3 },
  // The wallow: an overturned cart, broken fence.
  { kind: 'log', x: 104, y: 278, seed: 2 },
  { kind: 'boulder_large', x: 18, y: 240, seed: 1 },
  // Rocks, as the scene had them.
  { kind: 'boulder_large', x: 440, y: 60, seed: 2 },
  { kind: 'boulder_large', x: 320, y: 360, seed: 3 },
  { kind: 'rock_small', x: 58, y: 376, seed: 4 },
  // Woods at the edges.
];

export const ROAD: ZoneArt = {
  key: 'road',
  ground: {
    w: 480,
    h: 400,
    base: 'grass',
    seed: 211,
    shapes: [
      { kind: 'path', material: 'dirt', width: 24, points: ROAD_POINTS },
      { kind: 'path', material: 'dirt', width: 10, points: TRACK_POINTS },
      // The caravan's halt, trodden bare.
      { kind: 'ellipse', material: 'dirt', x: 70, y: 58, w: 150, h: 54, rough: 6 },
      // The boar's wallow.
      { kind: 'ellipse', material: 'dirt', x: 24, y: 226, w: 74, h: 50, rough: 8 },
      { kind: 'ellipse', material: 'marsh', x: 40, y: 262, w: 26, h: 12, rough: 3 },
      // Fields south of the road.
      { kind: 'rect', material: 'crop', x: 270, y: 250, w: 110, h: 56 },
      { kind: 'rect', material: 'crop', x: 140, y: 300, w: 80, h: 44 },
    ],
  },
  props: [...ROAD_PROPS, ...woods(ROAD_KEEP, ROAD_PROPS, [
    [{ x: 0, y: 4, w: 70, h: 50 }, 4, 22, [['tree', 2], ['pine', 2], ['bush', 1]], 211, 6],
    [{ x: 270, y: 4, w: 210, h: 90 }, 9, 24, [['tree', 3], ['big_tree', 1], ['pine', 2], ['bush', 2]], 212, 8],
    [{ x: 0, y: 300, w: 140, h: 100 }, 7, 24, [['tree', 3], ['pine', 3], ['bush', 2]], 213, 6],
    [{ x: 380, y: 320, w: 100, h: 80 }, 6, 24, [['pine', 3], ['tree', 2], ['bush', 2]], 214, 6],
    [{ x: 250, y: 330, w: 130, h: 70 }, 4, 26, [['tree', 2], ['bush', 2], ['rock_small', 1]], 215, 6],
    // Wayside growth: hedges, tall grass and flowers along the verges.
    [{ x: 0, y: 4, w: 480, h: 396 }, 26, 24, [['bush', 2], ['flower_bush', 2], ['tall_grass', 5], ['flowers', 5], ['rock_small', 1]], 216, 4],
  ])],
  fences: [
    { x: 325, y: 248, len: 112 },
    { x: 180, y: 298, len: 82 },
    { x: 72, y: 290, len: 24 },
  ],
  meadow: { n: 36, seed: 211 },
  walkers: [{ look: 'porter', path: ROAD_POINTS.slice(1, -1).map(([x, y]): [number, number] => [x, y - 3]) }],
  next: ['city', 'valombre'],
  preview: {
    hero: [240, 230],
    npcs: [
      ['guard_generic', 150, 60],
      ['villager_wanderer', 320, 60],
    ],
  },
};

// Le Faubourg des quais: the docks outside the walls. Muddy lanes, a
// canal from the river crossing the whole district between two flagged
// quays (the scene can't walk on the water; a footbridge crosses it),
// boats moored along the north quay, tarred shacks, a storehouse by the
// lane north to the warehouse, nets drying, puddles.
export const FAUBOURG: ZoneArt<'store' | 'shackW' | 'shackE' | 'shackS'> = {
  key: 'faubourg',
  ground: {
    w: 260,
    h: 400,
    base: 'mud',
    seed: 221,
    shapes: [
      // Worn cobbled lanes: north-south to the warehouse and the city, west
      // to the drowned chapel, east to the river road.
      { kind: 'path', material: 'cobble', width: 24, points: [[130, 0], [128, 120], [132, 200], [130, 262]] },
      { kind: 'path', material: 'cobble', width: 22, points: [[130, 330], [128, 400]] },
      { kind: 'path', material: 'cobble', width: 20, points: [[0, 200], [80, 206], [132, 200], [200, 196], [260, 200]] },
      // The quays and the canal between them, edge to edge.
      { kind: 'rect', material: 'paving', x: -20, y: 262, w: 300, h: 24 },
      { kind: 'rect', material: 'water', x: -20, y: 286, w: 300, h: 30 },
      { kind: 'rect', material: 'paving', x: -20, y: 316, w: 300, h: 12 },
      // Puddles and scraps of grass at the edges.
      { kind: 'ellipse', material: 'marsh', x: 20, y: 228, w: 30, h: 14, rough: 3 },
      { kind: 'ellipse', material: 'marsh', x: 196, y: 238, w: 24, h: 10, rough: 2 },
      { kind: 'ellipse', material: 'grass', x: 196, y: 340, w: 70, h: 60, rough: 8 },
      { kind: 'ellipse', material: 'grass', x: -10, y: 336, w: 60, h: 80, rough: 8 },
    ],
  },
  walkers: [
    { look: 'docker', path: [[130, 44], [128, 200], [130, 256]] },
    { look: 'fishwife', path: [[12, 206], [80, 208], [132, 204], [250, 200]] },
  ],
  // The north quay's wall going down into the water, the footbridge.
  patches: [{ material: 'quay', x: 130, y: 288, w: 260, h: 6 }],
  bridges: [{ x: 114, y: 280, w: 32, h: 42 }],
  // The canal either side of the footbridge.
  solids: [
    { x: 57, y: 301, w: 114, h: 28 },
    { x: 203, y: 301, w: 114, h: 28 },
  ],
  buildings: {
    store: { kind: 'storehouse', x: 50, y: 42, w: 80, h: 50 },
    shackW: { kind: 'dock_shack', x: 60, y: 150, w: 46, h: 32 },
    shackE: { kind: 'dock_shack', x: 206, y: 140, w: 44, h: 32 },
    shackS: { kind: 'dock_shack', x: 214, y: 376, w: 40, h: 28 },
  },
  props: [
    // Boats moored along the north quay, their posts on the flagstones.
    { kind: 'rowboat', x: 54, y: 310, seed: 1 },
    { kind: 'rowboat', x: 196, y: 312, seed: 2 },
    { kind: 'rowboat', x: 238, y: 306, seed: 3 },
    { kind: 'mooring_post', x: 36, y: 282 },
    { kind: 'mooring_post', x: 84, y: 282 },
    { kind: 'mooring_post', x: 182, y: 282 },
    { kind: 'mooring_post', x: 224, y: 282 },
    // On the quays: nets, crates, barrels, sacks.
    { kind: 'net_rack', x: 58, y: 240, seed: 1 },
    { kind: 'crate', x: 100, y: 272 },
    { kind: 'crate', x: 92, y: 278 },
    { kind: 'barrel', x: 156, y: 272 },
    { kind: 'barrel', x: 163, y: 278 },
    { kind: 'sacks', x: 246, y: 274 },
    { kind: 'crate', x: 30, y: 326 },
    { kind: 'barrel', x: 236, y: 326 },
    // Along the lanes.
    { kind: 'lamppost', x: 104, y: 222 },
    { kind: 'lamppost', x: 150, y: 116 },
    { kind: 'lamppost', x: 112, y: 262 },
    { kind: 'barrel', x: 92, y: 160 },
    { kind: 'crate', x: 24, y: 168 },
    { kind: 'crate', x: 240, y: 156 },
    { kind: 'wagon_cart', x: 210, y: 46, seed: 3 },
    { kind: 'crate', x: 176, y: 34 },
    { kind: 'barrel', x: 100, y: 72 },
    { kind: 'sacks', x: 24, y: 80 },
    { kind: 'woodpile', x: 26, y: 116 },
    { kind: 'net_rack', x: 230, y: 242, seed: 2 },
    // Scrub at the edges.
    { kind: 'bush', x: 236, y: 352, seed: 3 },
    { kind: 'reeds', x: 26, y: 236, seed: 4 },
    { kind: 'reeds', x: 204, y: 246, seed: 5 },
    { kind: 'tree', x: 16, y: 386, seed: 6 },
    { kind: 'bush', x: 40, y: 396, seed: 7 },
  ],
  next: ['city', 'river-road'],
  preview: {
    hero: [130, 250],
    npcs: [['informant_faubourg', 190, 185]],
  },
};

// The river road: the road along the north bank of the river, willows
// and reeds on the banks, a fisherman's jetty, the far bank wooded (the
// scene blocks the river). A forgotten chest in the copse to the north.
const RIVER_ROAD_POINTS: [number, number][] = [[0, 200], [80, 196], [160, 186], [240, 190], [320, 198], [400, 200]];
const RIVER_POINTS: [number, number][] = [[0, 300], [90, 292], [200, 300], [300, 290], [400, 296]];
const RIVER_KEEP: Keepout = {
  roads: [
    { points: RIVER_ROAD_POINTS, clear: 22 },
    { points: RIVER_POINTS, clear: 30 },
  ],
  spots: [
    [90, 200, 36], // fisherman's walk
    [200, 140, 26], // signpost
    [350, 100, 22], // chest
    [30, 180, 20],
    [370, 180, 20],
    [40, 200, 22], // arrivals
    [360, 200, 22],
  ],
};

const RIVER_ROAD_PROPS: PropSpot[] = [
  // Reeds and willows along the north bank.
  { kind: 'reeds', x: 30, y: 274, seed: 1 },
  { kind: 'reeds', x: 150, y: 276, seed: 2 },
  { kind: 'reeds', x: 186, y: 278, seed: 3 },
  { kind: 'reeds', x: 262, y: 270, seed: 4 },
  { kind: 'reeds', x: 340, y: 272, seed: 5 },
  { kind: 'reeds', x: 60, y: 326, seed: 6 },
  { kind: 'reeds', x: 240, y: 330, seed: 7 },
  { kind: 'big_tree', x: 220, y: 258, seed: 4 },
  { kind: 'tree', x: 46, y: 256, seed: 5 },
  { kind: 'tree', x: 370, y: 254, seed: 6 },
  // The jetty: a boat tied up, a stool of a crate, a basket.
  { kind: 'rowboat', x: 132, y: 286, seed: 3 },
  { kind: 'mooring_post', x: 118, y: 268 },
  { kind: 'crate', x: 84, y: 262 },
  // By the road: rocks, a bench, the copse with the chest.
  { kind: 'boulder_large', x: 290, y: 150, seed: 5 },
  { kind: 'rock_small', x: 130, y: 230, seed: 6 },
  { kind: 'log', x: 260, y: 226, seed: 4 },
  // The far bank: woods.
];

export const RIVER_ROAD: ZoneArt = {
  key: 'river-road',
  ground: {
    w: 400,
    h: 400,
    base: 'grass',
    seed: 231,
    shapes: [
      { kind: 'path', material: 'dirt', width: 22, points: RIVER_ROAD_POINTS },
      // Muddy banks, then the river.
      { kind: 'path', material: 'sand', width: 58, points: RIVER_POINTS, rough: 4 },
      { kind: 'path', material: 'water', width: 44, points: RIVER_POINTS, rough: 3 },
      // A path down to the jetty.
      { kind: 'path', material: 'dirt', width: 10, points: [[96, 198], [100, 240], [104, 266]] },
    ],
  },
  bridges: [{ x: 92, y: 262, w: 22, h: 26 }],
  // The river.
  solids: [{ x: 200, y: 298, w: 400, h: 36 }],
  props: [...RIVER_ROAD_PROPS, ...woods(RIVER_KEEP, RIVER_ROAD_PROPS, [
    [{ x: 0, y: 4, w: 400, h: 150 }, 20, 26, [['tree', 4], ['big_tree', 1], ['pine', 2], ['bush', 3], ['berry_bush', 1]], 231, 8],
    [{ x: 0, y: 330, w: 400, h: 70 }, 14, 22, [['tree', 3], ['pine', 3], ['bush', 2]], 232, 0],
  ])],
  meadow: { n: 26, seed: 231 },
  walkers: [{ look: 'townsman', path: [[20, 198], [120, 192], [200, 186], [300, 192], [380, 198]] }],
  next: ['faubourg', 'hunter-outpost'],
  preview: {
    hero: [200, 220],
    npcs: [['villager_wanderer', 90, 200]],
  },
};

// The hunters' outpost: a clearing at the meeting of the river road, the
// marshes (north), the drowned lands (east) and the corrupted grove
// (south). A log lodge, a fire with log benches, hides drying, firewood.
// The ground turns to marsh in the north-east and sickens in the south.
const OUTPOST_KEEP: Keepout = {
  roads: [
    { points: [[0, 150], [110, 156], [220, 150]], clear: 16 },
    { points: [[110, 0], [112, 156], [110, 300]], clear: 16 },
  ],
  spots: [
    [160, 190, 26], // hunter
    [130, 172, 22], // fire
    [150, 100, 34], // lodge
    [80, 120, 14], // hides drying
    [196, 108, 14],
    [110, 262, 20], // arrivals
    [190, 40, 20],
    [40, 150, 20],
    [186, 150, 20],
  ],
};

const HUNTER_OUTPOST_PROPS: PropSpot[] = [
  { kind: 'campfire', x: 130, y: 178, seed: 2 },
  { kind: 'log', x: 70, y: 220, seed: 5 },
  { kind: 'log', x: 170, y: 230, seed: 6 },
  { kind: 'pelt_rack', x: 196, y: 108, seed: 1 },
  { kind: 'pelt_rack', x: 80, y: 120, seed: 2 },
  { kind: 'woodpile', x: 186, y: 128 },
  { kind: 'stump', x: 84, y: 194, seed: 3 },
  { kind: 'barrel', x: 126, y: 124 },
  // The marsh edge, the sickened south.
  { kind: 'reeds', x: 176, y: 28, seed: 1 },
  { kind: 'reeds', x: 204, y: 62, seed: 2 },
  { kind: 'reeds', x: 150, y: 14, seed: 3 },
  { kind: 'dead_tree', x: 196, y: 276, seed: 1 },
  { kind: 'thorns', x: 46, y: 282, seed: 1 },
  { kind: 'thorns', x: 160, y: 292, seed: 2 },
];

export const HUNTER_OUTPOST: ZoneArt<'lodge'> = {
  key: 'hunter-outpost',
  ground: {
    w: 220,
    h: 300,
    base: 'grass',
    seed: 241,
    shapes: [
      { kind: 'path', material: 'dirt', width: 14, points: [[0, 150], [60, 154], [110, 156], [170, 152], [220, 150]] },
      { kind: 'path', material: 'dirt', width: 12, points: [[110, 0], [108, 80], [112, 156], [108, 230], [110, 300]] },
      { kind: 'ellipse', material: 'dirt', x: 70, y: 124, w: 120, h: 88, rough: 6 },
      { kind: 'ellipse', material: 'marsh', x: 160, y: -20, w: 90, h: 70, rough: 8 },
      { kind: 'ellipse', material: 'marsh', x: 196, y: 40, w: 40, h: 40, rough: 6 },
      { kind: 'ellipse', material: 'blight', x: 40, y: 262, w: 140, h: 60, rough: 10 },
    ],
  },
  buildings: {
    lodge: { kind: 'lodge', x: 150, y: 100, w: 44, h: 34 },
  },
  props: [...HUNTER_OUTPOST_PROPS, ...woods(OUTPOST_KEEP, HUNTER_OUTPOST_PROPS, [
    [{ x: 0, y: 4, w: 90, h: 120 }, 7, 22, [['pine', 3], ['tree', 2], ['bush', 2], ['fern', 2]], 241, 4],
    [{ x: 0, y: 176, w: 80, h: 80 }, 4, 22, [['pine', 2], ['bush', 2], ['fern', 1]], 242, 4],
    [{ x: 140, y: 196, w: 80, h: 60 }, 3, 22, [['tree', 1], ['bush', 2], ['fern', 1]], 243, 4],
  ])],
  meadow: { n: 10, seed: 241 },
  next: ['river-road'],
  preview: {
    hero: [110, 170],
    npcs: [['hunter_outpost', 160, 190]],
  },
};
