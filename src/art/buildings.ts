// Buildings drawn by the game in a 3/4 top-down view, sized to the
// collision footprint each scene already uses (w x h, centered on the
// building's position): the picture keeps the footprint's width plus the
// eaves, and its roof rises above the footprint.

import { OUTLINE, Pixmap, RGB, Tones, hash2 } from './pixmap';

export type BuildingKind =
  | 'cottage'
  | 'village_house'
  | 'stone_house'
  | 'inn_building'
  | 'blacksmith_shop'
  | 'guard_barracks'
  | 'market_hall'
  | 'stone_tower';

export interface BuildingArt {
  pm: Pixmap;
  // Where the footprint's bottom center sits inside the picture.
  anchorX: number;
  anchorY: number;
}

type Roof = 'thatch' | 'tiles' | 'slate' | 'shingles';
type Wall = 'plaster' | 'stone' | 'planks';

const ROOFS: Record<Roof, Tones> = {
  thatch: [
    [236, 204, 122],
    [204, 164, 84],
    [150, 110, 58],
  ],
  tiles: [
    [222, 112, 88],
    [180, 74, 62],
    [120, 44, 46],
  ],
  slate: [
    [146, 158, 180],
    [106, 116, 140],
    [68, 74, 98],
  ],
  shingles: [
    [176, 122, 80],
    [136, 88, 58],
    [92, 58, 42],
  ],
};
const PLASTER: Tones = [
  [244, 232, 204],
  [222, 206, 172],
  [176, 156, 124],
];
const STONE: Tones = [
  [188, 186, 180],
  [150, 148, 146],
  [104, 102, 108],
];
const WOOD: Tones = [
  [172, 120, 76],
  [128, 84, 52],
  [84, 54, 38],
];
const BEAM: RGB = [104, 66, 44];
const GLASS: Tones = [
  [196, 230, 246],
  [140, 196, 226],
  [84, 132, 176],
];
const WARM: RGB = [252, 210, 120];
const GOLD: RGB = [238, 188, 60];
const RED: Tones = [
  [244, 118, 104],
  [198, 52, 58],
  [122, 28, 44],
];
const SHADOW: RGB = [24, 30, 20];

interface Style {
  roof: Roof;
  wall: Wall;
  chimney?: boolean;
  shutters?: RGB;
}

const STYLES: Record<BuildingKind, Style> = {
  cottage: { roof: 'thatch', wall: 'plaster', shutters: [86, 132, 80] },
  village_house: { roof: 'tiles', wall: 'plaster', chimney: true, shutters: [70, 110, 160] },
  stone_house: { roof: 'slate', wall: 'stone', chimney: true },
  inn_building: { roof: 'tiles', wall: 'plaster', chimney: true, shutters: [150, 70, 60] },
  blacksmith_shop: { roof: 'slate', wall: 'stone', chimney: true },
  guard_barracks: { roof: 'slate', wall: 'stone' },
  market_hall: { roof: 'tiles', wall: 'planks' },
  stone_tower: { roof: 'slate', wall: 'stone' },
};

// ------------------------------------------------------------------ parts

function roofPixel(roof: Roof, t: Tones, x: number, y: number, rowFromTop: number): RGB {
  const band = rowFromTop % 4;
  if (roof === 'thatch') {
    if (band === 3) return t[2];
    const h = hash2(x, y, 3);
    if (h < 0.18) return t[2];
    if (h > 0.85 || band === 0) return t[0];
    return t[1];
  }
  // Tiles, slate and shingles: staggered rows.
  const row = Math.floor(rowFromTop / 4);
  const off = (row % 2) * (roof === 'tiles' ? 3 : 4);
  const len = roof === 'tiles' ? 6 : roof === 'slate' ? 8 : 5;
  const lx = (x + off) % len;
  if (band === 3) return t[2];
  if (lx === 0) return roof === 'tiles' ? t[2] : band === 0 ? t[1] : t[2];
  if (band === 0) return t[0];
  return hash2(Math.floor((x + off) / len), row, 5) < 0.2 ? mixc(t[1], t[2], 0.3) : t[1];
}

const mixc = (a: RGB, b: RGB, k: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * k),
  Math.round(a[1] + (b[1] - a[1]) * k),
  Math.round(a[2] + (b[2] - a[2]) * k),
];

// Hip roof: a trapezoid narrowing towards the ridge, eaves at the bottom.
function drawRoof(pm: Pixmap, x0: number, x1: number, top: number, bottom: number, roof: Roof): void {
  const t = ROOFS[roof];
  const height = bottom - top + 1;
  const inset = Math.min(6, Math.floor((x1 - x0) / 5));
  for (let y = top; y <= bottom; y++) {
    const k = (y - top) / Math.max(1, height - 1);
    const ins = Math.round(inset * (1 - k));
    for (let x = x0 + ins; x <= x1 - ins; x++) {
      let c = roofPixel(roof, t, x, y, y - top);
      // Light from the left: the left hip is lit, the right one shaded.
      if (x - (x0 + ins) < 2 && y - top > 1) c = mixc(c, t[0], 0.5);
      if (x1 - ins - x < 2 && y - top > 1) c = mixc(c, t[2], 0.5);
      pm.set(x, y, c);
    }
  }
  // Ridge cap and eave lip.
  pm.hline(x0 + inset, x1 - inset, top, t[2]);
  pm.hline(x0 + inset, x1 - inset, top + 1, t[0]);
  pm.hline(x0, x1, bottom, t[2]);
  pm.hline(x0 + 1, x1 - 1, bottom - 1, mixc(t[1], t[2], 0.4));
}

function wallPixel(wall: Wall, x: number, y: number, wx0: number, wy0: number): RGB {
  if (wall === 'plaster') {
    return hash2(x, y, 7) < 0.05 ? PLASTER[2] : hash2(x, y, 8) > 0.96 ? PLASTER[0] : PLASTER[1];
  }
  if (wall === 'stone') {
    const ly = y - wy0;
    const row = Math.floor(ly / 4);
    const off = (row % 2) * 4;
    const lx = (x - wx0 + off) % 8;
    if (ly % 4 === 0 || lx === 0) return STONE[2];
    const tone = hash2(Math.floor((x - wx0 + off) / 8), row, 9);
    const c = tone < 0.3 ? mixc(STONE[1], STONE[2], 0.25) : tone > 0.75 ? mixc(STONE[1], STONE[0], 0.4) : STONE[1];
    return ly % 4 === 1 ? mixc(c, STONE[0], 0.4) : c;
  }
  // Vertical planks.
  const lx = (x - wx0) % 4;
  if (lx === 0) return WOOD[2];
  return hash2(x, Math.floor(y / 3), 11) < 0.1 ? WOOD[2] : lx === 1 ? WOOD[0] : WOOD[1];
}

function drawWindow(pm: Pixmap, x: number, y: number, lit: boolean, shutters?: RGB): void {
  const ww = 8;
  const wh = 8;
  pm.rect(x - 1, y - 1, ww + 2, wh + 2, BEAM);
  for (let j = 0; j < wh; j++) {
    for (let i = 0; i < ww; i++) {
      let c = lit ? (j < 3 ? WARM : mixc(WARM, [214, 140, 70], 0.5)) : j < 2 ? GLASS[0] : i < 4 ? GLASS[1] : GLASS[2];
      if (i === 3 || j === 3) c = BEAM;
      pm.set(x + i, y + j, c);
    }
  }
  pm.hline(x - 2, x + ww + 1, y + wh + 1, PLASTER[0]); // sill
  if (shutters) {
    pm.rect(x - 4, y - 1, 3, wh + 2, shutters);
    pm.rect(x + ww + 1, y - 1, 3, wh + 2, mixc(shutters, [0, 0, 0], 0.25));
  }
}

function drawDoor(pm: Pixmap, cx: number, bottom: number, height: number, arched: boolean): void {
  const w = 10;
  const x = cx - w / 2;
  const top = bottom - height + 1;
  pm.rect(x - 1, top - 1, w + 2, height + 1, BEAM);
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < w; i++) {
      if (arched && j === 0 && (i === 0 || i === w - 1)) continue;
      pm.set(x + i, top + j, i % 3 === 0 ? WOOD[2] : j === 0 ? WOOD[0] : WOOD[1]);
    }
  }
  pm.set(x + w - 2, top + Math.floor(height / 2), GOLD);
  pm.hline(x - 1, x + w, bottom + 1, STONE[1]); // step
}

// ------------------------------------------------------------------ houses

function house(kind: BuildingKind, w: number, h: number): BuildingArt {
  const st = STYLES[kind];
  const W = w + 4;
  // Walls tall enough for a door the hero fits through (heroes are ~27px).
  const wallH = Math.max(24, Math.min(34, Math.round(h * 0.55)));
  // Roof about half the picture: tall enough to read, not so tall that
  // every house is all roof.
  const rise = Math.round(h * 0.12) + 4;
  const H = h + rise + 3;
  const pm = new Pixmap(W, H);
  const wallTop = H - 3 - wallH;
  const wx0 = 2;
  const wx1 = W - 3;

  // Front wall.
  for (let y = wallTop; y < H - 3; y++) {
    for (let x = wx0; x <= wx1; x++) pm.set(x, y, wallPixel(st.wall, x, y, wx0, wallTop));
  }
  if (st.wall === 'plaster') {
    // Timber frame: posts, top beam, sill beam.
    pm.hline(wx0, wx1, wallTop, BEAM);
    pm.hline(wx0, wx1, H - 4, BEAM);
    for (let x = wx0; x <= wx1; x += 14) pm.vline(x, wallTop, H - 4, BEAM);
    pm.vline(wx1, wallTop, H - 4, BEAM);
  }
  // Corner shading: light on the left, shade on the right.
  pm.vline(wx0, wallTop, H - 4, st.wall === 'plaster' ? BEAM : STONE[0]);
  pm.vline(wx1, wallTop, H - 4, st.wall === 'plaster' ? BEAM : STONE[2]);
  pm.hline(wx0, wx1, wallTop + 1, mixc(wallPixel(st.wall, wx0, wallTop, wx0, wallTop), [0, 0, 0], 0.35)); // eave shadow

  // Door and windows.
  const doorH = Math.min(20, wallH - 4);
  const doorX = Math.round(W / 2);
  drawDoor(pm, doorX, H - 4, doorH, st.wall === 'stone');
  const winY = wallTop + Math.max(5, Math.floor((wallH - 8) / 2) - 2);
  const lit = kind === 'inn_building' || kind === 'blacksmith_shop';
  const slots: number[] = [];
  for (let x = wx0 + 6; x + 8 <= doorX - 9; x += 16) slots.push(x);
  for (let x = wx1 - 13; x >= doorX + 9; x -= 16) slots.push(x);
  slots.forEach((x, i) => {
    if (kind === 'blacksmith_shop' && i === 0) {
      // The forge: a glowing opening instead of the first window.
      pm.rect(x - 1, winY - 1, 10, 10, STONE[2]);
      for (let j = 0; j < 8; j++) for (let k = 0; k < 8; k++) pm.set(x + k, winY + j, j > 5 ? [252, 160, 70] : j > 2 ? [240, 96, 40] : [120, 40, 30]);
      pm.set(x + 3, winY + 4, [255, 230, 140]);
      pm.set(x + 5, winY + 5, [255, 230, 140]);
      return;
    }
    drawWindow(pm, x, winY, lit, st.shutters);
  });

  // Roof (over the top of the wall).
  drawRoof(pm, 0, W - 1, 0, wallTop + 1, st.roof);
  if (st.chimney) {
    const cx = W - Math.max(10, Math.round(W * 0.25));
    pm.rect(cx, 0, 6, Math.max(6, Math.round(rise * 0.6)), STONE[1]);
    pm.vline(cx, 0, Math.max(6, Math.round(rise * 0.6)) - 1, STONE[0]);
    pm.vline(cx + 5, 0, Math.max(6, Math.round(rise * 0.6)) - 1, STONE[2]);
    pm.hline(cx - 1, cx + 6, 0, STONE[2]);
  }

  // Extras per kind.
  if (kind === 'inn_building') {
    // Hanging sign with a mug.
    const sx = doorX + 8;
    const sy = wallTop + 5;
    pm.hline(sx, sx + 8, sy - 1, BEAM);
    pm.rect(sx + 1, sy, 8, 7, WOOD[1]);
    pm.hline(sx + 1, sx + 8, sy, WOOD[0]);
    pm.rect(sx + 3, sy + 2, 3, 4, GOLD);
    pm.set(sx + 6, sy + 3, GOLD);
    pm.set(sx + 6, sy + 4, GOLD);
  }
  if (kind === 'guard_barracks') {
    // Red banner beside the door.
    const bx = doorX - 12;
    pm.rect(bx, wallTop + 3, 5, wallH - 8, RED[1]);
    pm.vline(bx, wallTop + 3, H - 9, RED[0]);
    pm.set(bx + 2, wallTop + 6, GOLD);
    pm.set(bx + 1, H - 8, RED[2]);
    pm.set(bx + 3, H - 8, RED[2]);
  }

  pm.outline(OUTLINE);
  // Soft shadow along the base.
  for (let x = 1; x < W; x++) pm.set(x, H - 2, SHADOW, 70);
  return { pm, anchorX: Math.round(W / 2), anchorY: H - 3 };
}

function marketHall(w: number, h: number): BuildingArt {
  const W = w + 4;
  const wallH = Math.max(22, Math.round(h * 0.5));
  const rise = Math.round(h * 0.12) + 4;
  const H = h + rise + 3;
  const pm = new Pixmap(W, H);
  const wallTop = H - 3 - wallH;
  // Open hall: dark interior, counters, wooden pillars.
  pm.rect(2, wallTop, W - 4, wallH, [60, 44, 40]);
  pm.rect(2, H - 10, W - 4, 6, WOOD[1]);
  pm.hline(2, W - 3, H - 10, WOOD[0]);
  const goods: RGB[] = [
    [220, 80, 70],
    [240, 200, 90],
    [120, 180, 90],
    [200, 140, 80],
  ];
  for (let x = 5; x < W - 5; x += 3) pm.set(x, H - 11, goods[Math.floor(hash2(x, 1, 2) * goods.length)]);
  for (let x = 2; x <= W - 4; x += Math.max(12, Math.floor((W - 6) / 4))) {
    pm.rect(x, wallTop, 3, wallH, WOOD[1]);
    pm.vline(x, wallTop, H - 4, WOOD[0]);
  }
  pm.rect(W - 5, wallTop, 3, wallH, WOOD[1]);
  drawRoof(pm, 0, W - 1, 0, wallTop + 1, 'tiles');
  pm.outline(OUTLINE);
  for (let x = 1; x < W; x++) pm.set(x, H - 2, SHADOW, 70);
  return { pm, anchorX: Math.round(W / 2), anchorY: H - 3 };
}

function tower(w: number, h: number): BuildingArt {
  const W = w + 2;
  const H = h + 12;
  const pm = new Pixmap(W, H);
  const r = (W - 2) / 2;
  const cx = W / 2 - 0.5;
  const top = 6;
  // Round body: blocks shaded by the curve.
  for (let y = top; y < H - 3; y++) {
    for (let x = 1; x < W - 1; x++) {
      const k = (x - cx) / r; // -1..1
      let c = wallPixel('stone', x, y, 1, top);
      if (k < -0.6) c = mixc(c, STONE[0], 0.4);
      if (k > 0.5) c = mixc(c, STONE[2], 0.5);
      pm.set(x, y, c);
    }
  }
  // Crenellations.
  for (let x = 1; x < W - 1; x++) {
    pm.set(x, top, STONE[2]);
    if (Math.floor((x - 1) / 4) % 2 === 0) for (let y = top - 4; y < top; y++) pm.set(x, y, x % 4 === 1 ? STONE[0] : STONE[1]);
  }
  // Arrow slits and an arched door.
  for (let y = top + 10; y < H - 24; y += 18) {
    pm.rect(Math.round(cx) - 1, y, 2, 6, [40, 36, 48]);
  }
  drawDoor(pm, Math.round(cx) + 1, H - 4, 12, true);
  pm.outline(OUTLINE);
  for (let x = 1; x < W; x++) pm.set(x, H - 2, SHADOW, 70);
  return { pm, anchorX: Math.round(W / 2), anchorY: H - 3 };
}

export function renderBuilding(kind: BuildingKind, w: number, h: number): BuildingArt {
  if (kind === 'market_hall') return marketHall(w, h);
  if (kind === 'stone_tower') return tower(w, h);
  return house(kind, w, h);
}

// ---------------------------------------------------------------- dungeons

const CAP: Tones = [
  [96, 92, 108],
  [70, 66, 82],
  [48, 44, 60],
];
const BRICK: Tones = [
  [150, 144, 156],
  [114, 108, 122],
  [76, 70, 86],
];

// A dungeon wall block on its footprint: a dark stone cap on top and a
// lit brick face along the bottom, rising a little above the footprint.
export function renderWallBlock(w: number, h: number): BuildingArt {
  const rise = 8;
  const face = Math.min(14, Math.max(8, Math.round(h * 0.35)));
  const H = h + rise;
  const pm = new Pixmap(w, H);
  const capBottom = H - face - 1;
  // Cap: large top-lit stones.
  for (let y = 0; y <= capBottom; y++) {
    const row = Math.floor(y / 6);
    const off = (row % 2) * 5;
    for (let x = 0; x < w; x++) {
      const lx = (x + off) % 10;
      const ly = y % 6;
      const tone = hash2(Math.floor((x + off) / 10), row, 13);
      let c = tone < 0.35 ? mixc(CAP[1], CAP[2], 0.3) : tone > 0.75 ? mixc(CAP[1], CAP[0], 0.3) : CAP[1];
      if (lx === 0 || ly === 0) c = CAP[2];
      else if (ly === 1) c = mixc(c, CAP[0], 0.45);
      if (y === 0 || x === 0) c = CAP[0];
      if (x === w - 1) c = CAP[2];
      pm.set(x, y, c);
    }
  }
  for (let y = capBottom + 1; y < H; y++) {
    const ly = y - capBottom - 1;
    const row = Math.floor(ly / 4);
    const off = (row % 2) * 4;
    for (let x = 0; x < w; x++) {
      const lx = (x + off) % 8;
      let c: RGB = ly % 4 === 0 || lx === 0 ? BRICK[2] : hash2(Math.floor((x + off) / 8), row, 15) < 0.3 ? mixc(BRICK[1], BRICK[2], 0.3) : BRICK[1];
      if (ly % 4 === 1 && lx !== 0) c = mixc(c, BRICK[0], 0.4);
      if (ly === 0) c = BRICK[0];
      // Moss creeping up from the floor.
      if (ly >= face - 2 && hash2(x, y, 16) < 0.25) c = [86, 116, 70];
      pm.set(x, y, c);
    }
  }
  pm.outline(OUTLINE);
  return { pm, anchorX: Math.round(w / 2), anchorY: H - 1 };
}

// An iron portcullis between two stone posts, on a footprint of width w.
export function renderGate(w: number): BuildingArt {
  const H = 30;
  const pm = new Pixmap(w, H);
  const post = 8;
  for (const px of [0, w - post]) {
    for (let y = 0; y < H; y++) for (let x = px; x < px + post; x++) pm.set(x, y, wallPixel('stone', x, y, px, 0));
    pm.vline(px, 0, H - 1, STONE[0]);
    pm.vline(px + post - 1, 0, H - 1, STONE[2]);
  }
  const iron: Tones = [
    [150, 156, 172],
    [96, 102, 120],
    [56, 60, 76],
  ];
  pm.rect(post, 2, w - post * 2, 3, iron[2]);
  for (let x = post + 2; x < w - post - 1; x += 5) {
    pm.vline(x, 2, H - 2, iron[1]);
    pm.vline(x + 1, 2, H - 2, iron[2]);
    pm.set(x, H - 1, iron[0]); // spikes
  }
  for (const y of [10, 20]) pm.hline(post, w - post - 1, y, iron[2]);
  pm.outline(OUTLINE);
  return { pm, anchorX: Math.round(w / 2), anchorY: H - 1 };
}
