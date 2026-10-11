// Item icons drawn by the game: one pixel-art icon per item, its shape
// from its kind (category, weapon type), its materials from its palier and
// its name (steel, mithril, marsh, shadow, Watchers, ritual…), so every
// one of the items reads in the same style and a late piece looks late.

import { OUTLINE, Pixmap, RGB, Ramp, lit, mix, ramp } from './pixmap';

export const ICON = 18;

export interface IconSpec {
  baseId: string;
  name: string;
  category: string; // weapon, shield, helmet, chest, legs, boots, gloves, ring, amulet, offhand
  weaponType?: string;
  tier?: number;
  stat?: string; // the stat it gives most of: colors its gem
}

// Gems take the color of what the item gives.
const STAT_GEMS: Record<string, RGB> = {
  strength: [220, 64, 60],
  intelligence: [80, 140, 240],
  agility: [90, 200, 100],
  vitality: [236, 160, 60],
  armor: [200, 210, 224],
  fireDamage: [255, 130, 50],
  iceDamage: [140, 220, 255],
  poisonDamage: [170, 220, 60],
  electricDamage: [250, 230, 90],
  darkDamage: [170, 100, 230],
  earthDamage: [180, 130, 80],
  lifeSteal: [200, 30, 70],
};

// A stable small number per item, for shape variants.
function variant(spec: IconSpec, n: number): number {
  let h = 0;
  for (const ch of spec.baseId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % n;
}

interface Materials {
  metal: Ramp;
  leather: Ramp;
  cloth: Ramp;
  wood: Ramp;
  accent: Ramp; // trims, guards, settings
  gem: RGB;
}

const IRON = ramp([138, 144, 158], 0.4);
const STEEL = ramp([168, 178, 194], 0.4);
const MITHRIL = ramp([164, 206, 222], 0.3);
const SHADOW = ramp([92, 80, 116], 0.4);
const BRONZE = ramp([190, 132, 70]);
const GOLD = ramp([232, 184, 64]);
const SILVER = ramp([200, 206, 218], 0.3);
const LEATHER = ramp([150, 100, 62]);
const DARK_LEATHER = ramp([104, 72, 52]);
const MARSH = ramp([104, 128, 84]);
const WOOD = ramp([146, 100, 62]);
const DARK_WOOD = ramp([96, 66, 46]);
const BONE = ramp([214, 204, 176], 0.5);
const CLOTH_BLUE = ramp([70, 104, 170]);
const CLOTH_RED = ramp([168, 56, 58]);
const CLOTH_GREY = ramp([128, 124, 120], 0.4);
const CLOTH_PURPLE = ramp([110, 70, 140]);

function has(spec: IconSpec, ...words: string[]): boolean {
  const s = (spec.name + ' ' + spec.baseId).toLowerCase();
  return words.some((w) => s.includes(w));
}

function materials(spec: IconSpec): Materials {
  const tier = spec.tier ?? 2;
  let metal = tier >= 3 ? MITHRIL : tier === 2 ? STEEL : IRON;
  let leather = tier >= 2 ? DARK_LEATHER : LEATHER;
  let cloth = CLOTH_GREY;
  let wood = tier >= 2 ? DARK_WOOD : WOOD;
  let accent = tier >= 3 ? GOLD : BRONZE;
  let gem: RGB = tier >= 3 ? [120, 210, 250] : tier === 2 ? [90, 170, 120] : [200, 70, 70];
  if (has(spec, 'mithril')) metal = MITHRIL;
  if (has(spec, 'acier', 'steel')) metal = STEEL;
  if (has(spec, 'fer', 'iron')) metal = IRON;
  if (has(spec, 'marais', 'marsh', 'bog')) {
    leather = MARSH;
    cloth = MARSH;
    gem = [120, 200, 120];
  }
  if (has(spec, 'ombre', 'shadow', 'silenc', 'hidden', 'refuge')) {
    metal = SHADOW;
    leather = ramp([70, 60, 84], 0.4);
    cloth = CLOTH_PURPLE;
    accent = SILVER;
    gem = [180, 120, 240];
  }
  if (has(spec, 'veilleur', 'watch')) {
    metal = SILVER;
    cloth = CLOTH_BLUE;
    accent = SILVER;
    gem = [130, 220, 255];
  }
  if (has(spec, 'ritu', 'sceau', 'seal', 'sacr')) {
    accent = GOLD;
    gem = [255, 210, 110];
  }
  if (has(spec, 'garde', 'garrison', 'garnison')) {
    cloth = CLOTH_BLUE;
    accent = GOLD;
  }
  if (has(spec, 'sang', 'blood')) gem = [220, 40, 50];
  if (has(spec, 'os', 'bone', 'ancestr')) accent = BONE;
  if (has(spec, 'bois', 'wood')) metal = WOOD;
  if (has(spec, 'archiv', 'mage', 'arcan')) cloth = CLOTH_PURPLE;
  if (has(spec, 'contreband', 'smuggl')) cloth = CLOTH_RED;
  if (spec.stat && STAT_GEMS[spec.stat]) gem = STAT_GEMS[spec.stat];
  return { metal, leather, cloth, wood, accent, gem };
}

// ------------------------------------------------------------ helpers

function px(pm: Pixmap, x: number, y: number, c: RGB): void {
  pm.set(Math.round(x), Math.round(y), c);
}

// A straight run from (x0, y0) to (x1, y1), w pixels thick, lit along its
// width (light from the top left).
function bar(pm: Pixmap, x0: number, y0: number, x1: number, y1: number, w: number, r: Ramp, bias = 0): void {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  const nx = -(y1 - y0);
  const ny = x1 - x0;
  const nl = Math.hypot(nx, ny) || 1;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    for (let k = 0; k < w; k++) {
      const side = w === 1 ? 0 : (k / (w - 1)) * 2 - 1;
      const x = x0 + (x1 - x0) * t + (nx / nl) * (side * (w - 1)) / 2;
      const y = y0 + (y1 - y0) * t + (ny / nl) * (side * (w - 1)) / 2;
      px(pm, x, y, lit(r, -side * 0.7 + bias));
    }
  }
}

function disc(pm: Pixmap, cx: number, cy: number, rx: number, ry: number, r: Ramp, bias = 0): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      pm.set(x, y, lit(r, -dx * 0.5 - dy * 0.7 + Math.sqrt(1 - d) * 0.4 - 0.1 + bias));
    }
  }
}

function gemAt(pm: Pixmap, x: number, y: number, c: RGB): void {
  pm.set(x, y, c);
  pm.set(x + 1, y, mix(c, [20, 20, 40], 0.35));
  pm.set(x, y + 1, mix(c, [20, 20, 40], 0.35));
  pm.set(x + 1, y + 1, mix(c, [20, 20, 40], 0.55));
  pm.set(x, y, mix(c, [255, 255, 255], 0.5));
}

// --------------------------------------------------------------- shapes
// Each shape has three variants (v), picked per item, so two items of the
// same kind and palier still look different.

function blade(pm: Pixmap, m: Materials, len: number, width: number, v: number): void {
  // Diagonal: grip at the bottom left, point at the top right.
  const gx = 3;
  const gy = ICON - 4;
  const ex = gx + len * 0.7;
  const ey = gy - len * 0.7;
  bar(pm, gx + 2, gy - 2, ex, ey, width, m.metal, 0.2);
  px(pm, ex + 0.6, ey - 0.6, m.metal[0]);
  if (v === 1 && len > 9) bar(pm, gx + 4, gy - 4, ex - 2, ey + 2, 1, m.metal, -0.6); // fuller
  // Guard: straight, swept or a disc.
  if (v === 0) bar(pm, gx, gy - 5, gx + 5, gy, 2, m.accent, 0.1);
  else if (v === 1) {
    bar(pm, gx - 1, gy - 4, gx + 2, gy - 2, 1, m.accent, 0.3);
    bar(pm, gx + 2, gy - 2, gx + 4, gy + 1, 1, m.accent, -0.2);
    bar(pm, gx + 1, gy - 4, gx + 4, gy - 1, 2, m.accent, 0);
  } else disc(pm, gx + 2.5, gy - 2.5, 1.8, 1.8, m.accent, 0.1);
  bar(pm, gx - 1, gy + 1, gx + 1.6, gy - 1.6, 2, m.leather, 0);
  if (v === 2) gemAt(pm, gx - 2, gy + 1, m.gem);
  else px(pm, gx - 1.5, gy + 1.5, m.accent[1]);
}

function axe(pm: Pixmap, m: Materials, big: boolean, v: number): void {
  bar(pm, 3, ICON - 2, big ? 13 : 12, big ? 3 : 4, 2, m.wood, 0);
  const hx = big ? 12 : 11;
  const hy = big ? 5 : 6;
  const k = v === 0 ? 0.9 : v === 1 ? 1.1 : 0.75;
  for (let y = -4; y <= 4; y++) {
    const reach = Math.round(Math.sqrt(Math.max(0, 16 - y * y)) * (big ? 1.1 : k));
    for (let x = 0; x <= reach; x++) pm.set(hx + 1 + x, hy + y, lit(m.metal, (y < 0 ? 0.4 : -0.3) + (x === reach ? 0.5 : 0)));
    if (big || v === 2) for (let x = 0; x <= Math.round(reach * (big ? 0.7 : 0.4)); x++) pm.set(hx - 2 - x, hy + y, lit(m.metal, y < 0 ? 0.2 : -0.4));
  }
  bar(pm, hx - 1, hy - 1, hx, hy + 1, 1, m.accent, 0.2); // collar
}

function bow(pm: Pixmap, m: Materials, v: number): void {
  const bend = v === 0 ? 7 : v === 1 ? 6 : 8;
  for (let t = -1; t <= 1.0001; t += 0.05) {
    const x = 5 + (1 - t * t) * bend - (v === 1 ? Math.pow(Math.abs(t), 6) * 3 : 0);
    const y = 9 + t * 7.5;
    bar(pm, x, y, x, y, 2, m.wood, t < 0 ? 0.3 : -0.2);
  }
  for (let y = 2; y <= 16; y++) pm.set(5, y, [226, 220, 200]);
  bar(pm, 4 + bend, 8, 4 + bend, 10, 2, m.leather, 0);
  if (v === 2) gemAt(pm, 4 + bend, 6, m.gem);
}

function staff(pm: Pixmap, m: Materials, v: number): void {
  bar(pm, 4, ICON - 2, 12, 5, 2, m.wood, 0.1);
  bar(pm, 10, 7, 12, 5, 2, m.accent, 0.2);
  if (v === 0) {
    disc(pm, 13.5, 3.5, 2.6, 2.6, ramp(m.gem, 0.2), 0.3);
  } else if (v === 1) {
    // A crystal shard held in prongs.
    for (let y = 0; y <= 5; y++) for (let x = -1; x <= 1; x++) if (Math.abs(x) <= (y < 2 ? y * 0.5 : 1)) pm.set(13 + x, 1 + y, lit(ramp(m.gem, 0.2), -x * 0.6 + 0.2));
    px(pm, 11, 5, m.accent[1]);
    px(pm, 15, 5, m.accent[2]);
  } else {
    // A crescent around a small stone.
    for (let a = -1.2; a <= 2.6; a += 0.15) px(pm, 13.5 + Math.cos(a) * 3, 3.5 - Math.sin(a) * 3, lit(m.accent, Math.sin(a) * 0.5));
    disc(pm, 13.5, 3.5, 1.4, 1.4, ramp(m.gem, 0.2), 0.4);
  }
  px(pm, 12.5, 2.5, mix(m.gem, [255, 255, 255], 0.7));
}

function tome(pm: Pixmap, m: Materials, v: number): void {
  const covers = [m.cloth === CLOTH_GREY ? CLOTH_RED : m.cloth, CLOTH_BLUE, ramp([60, 110, 80])];
  const c = m.cloth === CLOTH_GREY ? covers[v] : m.cloth;
  for (let y = 3; y <= 15; y++) for (let x = 4; x <= 14; x++) pm.set(x, y, lit(c, (x === 4 ? 0.6 : 0) - (y - 3) * 0.06 + (x === 14 ? -0.5 : 0)));
  for (let y = 4; y <= 14; y++) pm.set(15, y, [236, 228, 206]); // pages
  pm.hline(5, 14, 15, [236, 228, 206]);
  for (const [x, y] of [[4, 3], [4, 15], [14, 3], [14, 15]] as [number, number][]) pm.set(x, y, m.accent[1]);
  if (v === 0) disc(pm, 9.5, 9, 2.5, 2.5, m.accent, 0.2);
  else if (v === 1) for (let d = 0; d <= 3; d++) { pm.hline(9 - d, 10 + d, 6 + d, m.accent[1]); pm.hline(9 - d, 10 + d, 12 - d, m.accent[2]); }
  else { pm.vline(9, 5, 13, m.accent[1]); pm.hline(6, 12, 8, m.accent[1]); }
  gemAt(pm, 9, 8, m.gem);
  if (v === 2) pm.vline(14, 8, 10, m.accent[0]); // clasp
}

function shield(pm: Pixmap, m: Materials, v: number): void {
  const face = m.cloth === CLOTH_GREY ? m.wood : m.cloth;
  const round = v === 2;
  for (let y = 2; y <= 16; y++) {
    const t = (y - 2) / 14;
    const hw = round ? Math.round(Math.sqrt(Math.max(0, 1 - (t * 2 - 1) ** 2)) * 7) : t < 0.5 ? 6 : Math.round(6 * Math.cos((t - 0.5) * Math.PI));
    for (let x = 9 - hw; x <= 9 + hw; x++) {
      const edge = x === 9 - hw || x === 9 + hw || (!round && y === 2) || (round && (y === 2 || y === 16));
      pm.set(x, y, edge ? lit(m.metal, (9 - x) * 0.1 + 0.2) : lit(face, -(x - 9) * 0.12 - t * 0.4 + 0.25));
    }
  }
  if (v === 0) {
    disc(pm, 9, 8, 2, 2, m.metal, 0.3);
    px(pm, 8.5, 7.5, m.metal[0]);
  } else if (v === 1) {
    pm.vline(9, 3, 14, m.accent[1]);
    pm.hline(4, 14, 7, m.accent[1]);
  } else {
    disc(pm, 9, 9, 2.4, 2.4, m.metal, 0.2);
    gemAt(pm, 9, 8, m.gem);
  }
}

function helmet(pm: Pixmap, m: Materials, tier: number, soft: boolean, v: number): void {
  const r = soft ? m.leather : m.metal;
  disc(pm, 9, 9, 6.5, 6, r, 0.1);
  for (let y = 12; y <= 17; y++) for (let x = 0; x < ICON; x++) pm.set(x, y, [0, 0, 0], 0);
  pm.hline(2, 16, 11, soft ? m.leather[3] : m.accent[2]);
  for (let y = 12; y <= 15; y++) {
    pm.set(3, y, lit(r, 0.2));
    pm.set(4, y, lit(r, 0));
    pm.set(14, y, lit(r, -0.2));
    pm.set(15, y, lit(r, -0.4));
  }
  if (soft) {
    pm.hline(4, 14, 7, r[3]);
    if (v === 1) for (let x = 5; x <= 13; x += 2) pm.set(x, 7, m.accent[1]);
  } else {
    if (tier >= 2 || v === 1) for (let y = 9; y <= 14; y++) pm.set(9, y, lit(r, -0.1));
    pm.hline(6, 8, 10, [24, 22, 30]);
    pm.hline(10, 12, 10, [24, 22, 30]);
  }
  if (v === 2) for (let y = 1; y <= 4; y++) pm.set(9, y, lit(m.cloth === CLOTH_GREY ? CLOTH_RED : m.cloth, 0.3 - y * 0.15)); // crest
  else if (tier >= 3) {
    pm.set(9, 2, m.accent[0]);
    pm.set(9, 3, m.accent[1]);
  }
}

function chest(pm: Pixmap, m: Materials, plate: boolean, v: number): void {
  const r = plate ? m.metal : v === 2 && m.cloth !== CLOTH_GREY ? m.cloth : m.leather;
  for (let y = 3; y <= 16; y++) {
    const hw = y < 6 ? 7 : y < 11 ? 6 : 5;
    for (let x = 9 - hw; x <= 9 + hw; x++) {
      if (y < 6 && Math.abs(x - 9) < (v === 1 ? 2 : 3)) continue; // neck
      pm.set(x, y, lit(r, -(x - 9) * 0.1 - (y - 3) * 0.05 + 0.3));
    }
  }
  pm.vline(9, 6, 15, r[3]);
  pm.hline(4, 14, 11, m.accent[2]);
  if (plate) {
    pm.set(6, 7, r[0]);
    pm.set(12, 7, r[1]);
  }
  if (v === 1) for (let y = 7; y <= 10; y += 1) pm.set(9, y, m.accent[1]); // laces / buckles
  if (v === 2) gemAt(pm, 8, 7, m.gem);
}

function legs(pm: Pixmap, m: Materials, plate: boolean, v: number): void {
  const r = plate ? m.metal : m.cloth === CLOTH_GREY ? m.leather : m.cloth;
  pm.hline(4, 14, 3, m.accent[2]);
  for (let y = 4; y <= 16; y++) {
    for (let x = 4; x <= 8; x++) pm.set(x, y, lit(r, -(x - 6) * 0.2 + 0.2));
    for (let x = 10; x <= 14; x++) pm.set(x, y, lit(r, -(x - 12) * 0.2 - 0.1));
  }
  for (let y = 4; y <= 6; y++) pm.set(9, y, r[2]);
  if (plate || v === 1) {
    pm.hline(4, 8, 10, plate ? r[0] : m.accent[1]);
    pm.hline(10, 14, 10, plate ? r[1] : m.accent[2]);
  }
  if (v === 2) gemAt(pm, 8, 3, m.gem);
}

function boots(pm: Pixmap, m: Materials, plate: boolean, v: number): void {
  const r = plate ? m.metal : m.leather;
  const top = v === 1 ? 6 : 3;
  for (let y = top; y <= 15; y++) for (let x = 6; x <= 11; x++) pm.set(x, y, lit(r, -(x - 8) * 0.2 + 0.2));
  for (let y = 12; y <= 15; y++) for (let x = 11; x <= 15; x++) pm.set(x, y, lit(r, -(y - 12) * 0.2));
  pm.hline(6, 15, 16, [44, 34, 30]);
  if (v === 2) for (let y = top; y <= top + 2; y++) pm.hline(5, 12, y, lit(r, 0.4 - (y - top) * 0.3)); // folded cuff
  else pm.hline(6, 11, top + 1, m.accent[1]);
  if (v === 0) pm.set(10, 10, m.accent[0]); // buckle
}

function gloves(pm: Pixmap, m: Materials, plate: boolean, v: number): void {
  const r = plate ? m.metal : m.leather;
  for (let y = 13; y <= 16; y++) for (let x = 5; x <= 12; x++) pm.set(x, y, lit(m.accent, y === 13 ? 0.3 : -0.2));
  for (let y = 7; y <= 12; y++) for (let x = 5; x <= 12; x++) pm.set(x, y, lit(r, -(x - 8) * 0.15 + 0.2 - (y - 7) * 0.05));
  [[5, 4], [7, 2], [9, 2], [11, 4]].forEach(([fx, top]) => {
    for (let y = top; y <= 7; y++) {
      pm.set(fx, y, lit(r, 0.35 - (y - top) * 0.06));
      pm.set(fx + 1, y, lit(r, -0.15));
    }
    pm.set(fx, top, r[0]);
  });
  for (let y = 8; y <= 11; y++) {
    pm.set(13, y, lit(r, -0.1));
    pm.set(14, y - 1, lit(r, -0.3));
  }
  if (plate) for (const y of [8, 10]) pm.hline(5, 12, y, r[3]);
  if (v === 2) gemAt(pm, 8, 9, m.gem);
  if (v === 1 && !plate) pm.hline(5, 12, 10, r[3]); // stitching
}

function ring(pm: Pixmap, m: Materials, v: number): void {
  const thick = v !== 1;
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    const x = 9 + Math.cos(a) * 5;
    const y = 11 + Math.sin(a) * 4;
    pm.set(Math.round(x), Math.round(y), lit(m.accent, -Math.cos(a) * 0.4 - Math.sin(a) * 0.6));
    if (thick) pm.set(Math.round(x + Math.cos(a) * -0.9), Math.round(y + Math.sin(a) * -0.9), lit(m.accent, -0.4));
  }
  if (v === 0) disc(pm, 9, 5, 2.8, 2.4, ramp(m.gem, 0.2), 0.2);
  else if (v === 1) {
    disc(pm, 9, 6, 2, 2, m.accent, 0.2);
    disc(pm, 9, 5.5, 1.3, 1.3, ramp(m.gem, 0.2), 0.3);
  } else {
    for (let y = 3; y <= 7; y++) pm.hline(7, 11, y, lit(ramp(m.gem, 0.2), 0.3 - (y - 3) * 0.2)); // square cut
    pm.set(7, 3, m.accent[1]);
    pm.set(11, 7, m.accent[2]);
  }
  px(pm, 8, 4, mix(m.gem, [255, 255, 255], 0.7));
}

function amulet(pm: Pixmap, m: Materials, v: number): void {
  for (let t = 0; t <= 1; t += 0.04) {
    const x = 3 + t * 12;
    const y = 2 + Math.sin(t * Math.PI) * 7;
    pm.set(Math.round(x), Math.round(y), (t * 25) % 2 < 1 ? m.accent[1] : m.accent[3]);
  }
  if (v === 0) {
    disc(pm, 9, 12, 3.6, 4, m.accent, 0.1);
    disc(pm, 9, 12, 2, 2.4, ramp(m.gem, 0.2), 0.3);
  } else if (v === 1) {
    // A drop.
    for (let y = 9; y <= 16; y++) {
      const hw = y < 12 ? (y - 9) * 0.8 : Math.sqrt(Math.max(0, 9 - (y - 13) ** 2));
      for (let x = Math.round(9 - hw); x <= Math.round(9 + hw); x++) pm.set(x, y, lit(ramp(m.gem, 0.2), -(x - 9) * 0.2 - (y - 12) * 0.1 + 0.2));
    }
    pm.set(9, 9, m.accent[1]);
  } else {
    // A rune disc.
    disc(pm, 9, 12, 4, 4, m.accent, 0.1);
    pm.vline(9, 9, 15, m.accent[3]);
    pm.hline(6, 12, 12, m.accent[3]);
    gemAt(pm, 9, 11, m.gem);
  }
  px(pm, 8, 11, mix(m.gem, [255, 255, 255], 0.7));
}

export function renderItemIcon(spec: IconSpec): Pixmap {
  const pm = new Pixmap(ICON, ICON);
  const m = materials(spec);
  const tier = spec.tier ?? 2;
  const v = variant(spec, 3);
  const heavy = has(spec, 'plaque', 'plate', 'cuirass', 'acier', 'steel', 'mithril', 'garde', 'garrison', 'chain', 'maille', 'grève', 'greave', 'gantelet', 'gauntlet', 'sabaton', 'harnois');
  const t = spec.weaponType;
  if (spec.category === 'weapon' || spec.category === 'offhand') {
    if (t === 'sword') blade(pm, m, 13, 2, v);
    else if (t === 'greatsword') blade(pm, m, 15, 3, v);
    else if (t === 'dagger') blade(pm, m, 8, 2, v);
    else if (t === 'axe') axe(pm, m, false, v);
    else if (t === 'greataxe') axe(pm, m, true, v);
    else if (t === 'bow') bow(pm, m, v);
    else if (t === 'staff') staff(pm, m, v);
    else if (t === 'tome') tome(pm, m, v);
    else blade(pm, m, 11, 2, v);
  } else if (spec.category === 'shield') shield(pm, m, v);
  else if (spec.category === 'helmet') helmet(pm, m, tier, has(spec, 'cuir', 'leather', 'capuche', 'hood', 'chapeau', 'hat'), v);
  else if (spec.category === 'chest') chest(pm, m, heavy, v);
  else if (spec.category === 'legs') legs(pm, m, heavy, v);
  else if (spec.category === 'boots') boots(pm, m, heavy, v);
  else if (spec.category === 'gloves') gloves(pm, m, heavy, v);
  else if (spec.category === 'ring') ring(pm, m, v);
  else if (spec.category === 'amulet') amulet(pm, m, v);
  pm.outline(OUTLINE);
  return pm;
}
