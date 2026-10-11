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

// ---------------------------------------------------------- other forms
// Items whose name says they're not the classic kind: a hood or a circlet
// rather than a helmet, a robe, a tower shield, a saber…

function saber(pm: Pixmap, m: Materials): void {
  // A curved blade, the edge bright, a knuckle guard.
  for (let t = 0; t <= 1; t += 0.04) {
    const x = 5 + t * 10 + Math.sin(t * Math.PI) * -1.5;
    const y = 13 - t * 11 + Math.sin(t * Math.PI) * -2;
    bar(pm, x, y, x + 0.5, y, 2, m.metal, 0.3 - t * 0.2);
  }
  for (let a = 0; a <= Math.PI; a += 0.2) px(pm, 4 + Math.cos(a) * 2.5, 15 - Math.sin(a) * 1.5, m.accent[1]);
  bar(pm, 3, 16, 5, 14, 2, m.leather, 0);
  px(pm, 2, 17, m.accent[2]);
}

function fang(pm: Pixmap, m: Materials): void {
  // A curved fang of a blade, serrated, on a wrapped grip.
  for (let y = 2; y <= 12; y++) {
    const t = (y - 2) / 10;
    const cx = 12 - t * 4 + Math.sin(t * 3) * 1.2;
    const hw = Math.max(0, t * 2.2);
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) pm.set(x, y, lit(BONE, (cx - x) * 0.3 + 0.2));
    if (y % 2 === 0 && t > 0.3) pm.set(Math.round(cx + hw + 1), y, BONE[1]); // teeth
  }
  bar(pm, 6, 13, 9, 13, 2, m.accent, 0.1);
  bar(pm, 6, 17, 7.5, 14, 2, m.leather, 0);
}

function brokenBlade(pm: Pixmap, m: Materials): void {
  bar(pm, 5, 13, 10, 8, 2, m.metal, 0.1);
  px(pm, 11, 7, m.metal[1]);
  px(pm, 10, 6, m.metal[3]);
  bar(pm, 3, 11, 7, 15, 2, m.accent, 0.1);
  bar(pm, 2, 16, 4, 14, 2, m.leather, 0);
  // The snapped-off tip lying beside it.
  bar(pm, 12, 4, 15, 1, 1, m.metal, 0.3);
}

function sickle(pm: Pixmap, m: Materials): void {
  for (let a = 0.2; a <= 2.9; a += 0.08) bar(pm, 10 + Math.cos(a) * 5, 8 - Math.sin(a) * 5, 10 + Math.cos(a) * 5, 8 - Math.sin(a) * 5, 2, m.metal, Math.sin(a) * 0.5);
  bar(pm, 6, 16, 13, 9, 2, m.wood, 0);
}

function gnarledStaff(pm: Pixmap, m: Materials): void {
  for (let t = 0; t <= 1; t += 0.05) {
    const x = 4 + t * 9 + Math.sin(t * 9) * 0.8;
    const y = 17 - t * 13;
    bar(pm, x, y, x, y, 2, m.wood, Math.sin(t * 9) * 0.3);
  }
  // A forked top holding a small light.
  bar(pm, 13, 4, 11, 1, 1, m.wood, 0.2);
  bar(pm, 13, 4, 16, 2, 1, m.wood, -0.2);
  disc(pm, 13.5, 2.5, 1.5, 1.5, ramp(m.gem, 0.2), 0.4);
  px(pm, 6, 12, MARSH[1]); // leaf
  px(pm, 7, 12, MARSH[2]);
}

function longbow(pm: Pixmap, m: Materials): void {
  for (let t = -1; t <= 1.0001; t += 0.04) {
    const x = 4 + (1 - t * t) * 6;
    const y = 9 + t * 8.5;
    bar(pm, x, y, x, y, 1, m.wood, t < 0 ? 0.3 : -0.2);
    bar(pm, x + 1, y, x + 1, y, 1, m.wood, -0.3);
  }
  for (let y = 1; y <= 17; y++) pm.set(4, y, [226, 220, 200]);
  bar(pm, 10, 8, 10, 10, 2, m.leather, 0);
}

function shortbow(pm: Pixmap, m: Materials): void {
  for (let t = -1; t <= 1.0001; t += 0.05) {
    const x = 6 + (1 - t * t) * 5 - Math.pow(Math.abs(t), 4) * 3;
    const y = 9 + t * 6;
    bar(pm, x, y, x, y, 2, m.wood, t < 0 ? 0.3 : -0.2);
  }
  for (let y = 3; y <= 15; y++) pm.set(6, y, [226, 220, 200]);
  // An arrow nocked.
  bar(pm, 3, 9, 14, 9, 1, WOOD, 0.2);
  px(pm, 15, 9, IRON[1]);
  px(pm, 3, 8, [220, 220, 220]);
  px(pm, 3, 10, [220, 220, 220]);
}

function hood(pm: Pixmap, m: Materials): void {
  const c = m.cloth === CLOTH_GREY ? m.leather : m.cloth;
  disc(pm, 9, 9, 7, 7.5, c, 0.1);
  for (let y = 15; y <= 17; y++) for (let x = 3; x <= 15; x++) pm.set(x, y, lit(c, -0.3));
  // The dark opening.
  disc(pm, 9, 10.5, 3.5, 4, ramp([30, 26, 34], 0.2), -0.5);
  pm.set(9, 1, c[0]);
}

function circlet(pm: Pixmap, m: Materials): void {
  for (let a = 0; a < Math.PI * 2; a += 0.04) {
    const x = 9 + Math.cos(a) * 7;
    const y = 10 + Math.sin(a) * 3;
    pm.set(Math.round(x), Math.round(y), lit(m.accent, Math.sin(a) < 0 ? 0.4 : -0.3));
  }
  // The front piece rising with its stone.
  for (let y = 4; y <= 8; y++) pm.hline(9 - (8 - y) * 0.5 | 0, 9 + ((8 - y) * 0.5 | 0), y, m.accent[1]);
  gemAt(pm, 8, 6, m.gem);
}

function skullcap(pm: Pixmap, m: Materials): void {
  disc(pm, 9, 11, 6.5, 6, m.metal, 0.1);
  for (let y = 12; y <= 17; y++) for (let x = 0; x < ICON; x++) pm.set(x, y, [0, 0, 0], 0);
  pm.hline(2, 16, 11, m.metal[3]);
  for (const x of [4, 9, 14]) pm.set(x, 8, m.metal[0]); // rivets
}

function robe(pm: Pixmap, m: Materials, v: number): void {
  const c = m.cloth === CLOTH_GREY ? [CLOTH_BLUE, CLOTH_RED, ramp([96, 110, 90])][v] : m.cloth;
  for (let y = 2; y <= 17; y++) {
    const hw = y < 5 ? 5 : Math.min(8, 4 + (y - 5) * 0.35);
    for (let x = Math.round(9 - hw); x <= Math.round(9 + hw); x++) {
      if (y < 5 && Math.abs(x - 9) < 2) continue;
      pm.set(x, y, lit(c, -(x - 9) * 0.1 - (y - 2) * 0.03 + 0.25));
    }
  }
  pm.vline(9, 5, 17, m.accent[1]); // trim down the front
  pm.hline(5, 13, 9, m.accent[2]); // sash
  gemAt(pm, 8, 4, m.gem);
}

function quilted(pm: Pixmap, m: Materials): void {
  chest(pm, { ...m, leather: ramp([176, 150, 110]) }, false, 0);
  for (let y = 6; y <= 15; y += 3) pm.hline(4, 14, y, ramp([176, 150, 110])[3]);
  for (let x = 5; x <= 13; x += 3) for (let y = 6; y <= 15; y++) if (y % 3 !== 0) pm.set(x, y, ramp([176, 150, 110])[3]);
}

function chainmail(pm: Pixmap, m: Materials): void {
  chest(pm, m, true, 0);
  for (let y = 4; y <= 16; y++) for (let x = 2; x <= 16; x++) if (pm.filled(x, y) && (x + y) % 2 === 0) pm.set(x, y, m.metal[3]);
}

function towerShield(pm: Pixmap, m: Materials): void {
  const face = m.cloth === CLOTH_GREY ? m.wood : m.cloth;
  for (let y = 1; y <= 17; y++) for (let x = 4; x <= 14; x++) {
    const edge = x === 4 || x === 14 || y === 1 || y === 17;
    pm.set(x, y, edge ? lit(m.metal, (9 - x) * 0.1 + 0.2) : lit(face, -(x - 9) * 0.1 + 0.2 - y * 0.02));
  }
  pm.hline(5, 13, 6, m.metal[2]);
  pm.hline(5, 13, 12, m.metal[2]);
  disc(pm, 9, 9, 1.6, 1.6, m.metal, 0.3);
}

function buckler(pm: Pixmap, m: Materials): void {
  const face = m.cloth === CLOTH_GREY ? m.leather : m.cloth;
  disc(pm, 9, 9, 6.5, 6.5, m.metal, 0.1);
  disc(pm, 9, 9, 5, 5, face, 0.15);
  disc(pm, 9, 9, 2, 2, m.metal, 0.4);
}

function signet(pm: Pixmap, m: Materials): void {
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    pm.set(Math.round(9 + Math.cos(a) * 5), Math.round(12 + Math.sin(a) * 3.5), lit(m.accent, -Math.sin(a) * 0.6));
    pm.set(Math.round(9 + Math.cos(a) * 4.2), Math.round(12 + Math.sin(a) * 2.8), lit(m.accent, -0.4));
  }
  // The flat seal face with its engraving.
  for (let y = 3; y <= 8; y++) for (let x = 5; x <= 13; x++) if ((x - 9) ** 2 / 20 + (y - 5.5) ** 2 / 7 <= 1) pm.set(x, y, lit(m.accent, 0.3 - (y - 3) * 0.12));
  pm.vline(9, 4, 7, m.accent[4]);
  pm.hline(7, 11, 5, m.accent[4]);
}

function flamePendant(pm: Pixmap, m: Materials): void {
  amuletChain(pm, m);
  for (let y = 9; y <= 16; y++) {
    const t = (y - 9) / 7;
    const hw = Math.round(Math.sin(t * Math.PI) * 3);
    for (let x = 9 - hw; x <= 9 + hw; x++) pm.set(x, y, t < 0.4 ? [255, 230, 120] : Math.abs(x - 9) < hw ? [255, 150, 50] : [210, 70, 40]);
  }
  pm.set(9, 8, [255, 240, 160]);
}

function amuletChain(pm: Pixmap, m: Materials): void {
  for (let t = 0; t <= 1; t += 0.04) {
    const x = 3 + t * 12;
    const y = 2 + Math.sin(t * Math.PI) * 7;
    pm.set(Math.round(x), Math.round(y), (t * 25) % 2 < 1 ? m.accent[1] : m.accent[3]);
  }
}

// ------------------------------------------------------------- uniques
// Pieces with a story get their own drawing.

const EMBER: RGB = [255, 120, 40];
const HOLY: RGB = [255, 244, 190];

const UNIQUES: Record<string, (pm: Pixmap, m: Materials) => void> = {
  // L'Épée noircie: a black, jagged blade, cracked with embers.
  blackened_sword: (pm, m) => {
    const dark = ramp([60, 54, 62], 0.3);
    blade(pm, { ...m, metal: dark, accent: ramp([90, 40, 36]) }, 14, 3, 0);
    for (const [x, y] of [[8, 9], [9, 8], [11, 7], [12, 5], [13, 4]] as [number, number][]) pm.set(x, y, EMBER);
    pm.set(15, 2, [255, 200, 120]);
  },
  // La Lame du Sceau originel: a pale, glowing blade, a rune down its
  // length, a halo at the pommel.
  sealed_blade: (pm, m) => {
    blade(pm, { ...m, metal: ramp([226, 230, 236], 0.2), accent: GOLD }, 14, 2, 2);
    for (let k = 0; k < 6; k++) pm.set(7 + k, 11 - k, HOLY);
    pm.set(15, 2, [255, 255, 255]);
  },
  // L'Égide du Sommeil brisé: a shield split by a crack of cold light.
  broken_sleep_aegis: (pm, m) => {
    shield(pm, { ...m, cloth: ramp([70, 80, 110]) }, 0);
    for (const [x, y] of [[9, 3], [8, 5], [10, 7], [9, 9], [8, 11], [10, 13], [9, 15]] as [number, number][]) pm.set(x, y, [170, 230, 255]);
  },
  // L'Égide des trois sites: three stones in a triangle, joined by gold.
  threefold_ward: (pm, m) => {
    shield(pm, { ...m, cloth: ramp([150, 40, 50]) }, 1);
    for (let y = 5; y <= 13; y++) for (let x = 3; x <= 15; x++) if (pm.filled(x, y) && (x === 9 || y === 7)) pm.set(x, y, lit(ramp([150, 40, 50]), 0));
    bar(pm, 9, 5, 5, 12, 1, GOLD, 0.2);
    bar(pm, 9, 5, 13, 12, 1, GOLD, 0);
    bar(pm, 5, 12, 13, 12, 1, GOLD, -0.2);
    gemAt(pm, 8, 4, [255, 210, 110]);
    gemAt(pm, 4, 11, [120, 210, 250]);
    gemAt(pm, 12, 11, [180, 120, 240]);
  },
  // Le Croc de l'Ombre.
  shadow_fang: (pm, m) => fang(pm, m),
  // Le Gage de la silhouette: a crescent moon on a fine chain.
  silhouette_keepsake: (pm, m) => {
    amuletChain(pm, { ...m, accent: SILVER });
    for (let y = 9; y <= 17; y++) for (let x = 4; x <= 14; x++) {
      const outer = (x - 9) ** 2 + (y - 13) ** 2 <= 16;
      const inner = (x - 11) ** 2 + (y - 12) ** 2 <= 10;
      if (outer && !inner) pm.set(x, y, lit(ramp([220, 226, 240], 0.2), -(x - 7) * 0.2 + 0.2));
    }
  },
  // Le Pendentif d'éclat scellé: a crystal shard in a gold cage.
  shard_pendant: (pm, m) => {
    amuletChain(pm, { ...m, accent: GOLD });
    for (let y = 9; y <= 16; y++) {
      const hw = y < 12 ? (y - 9) * 0.7 : (16 - y) * 0.6;
      for (let x = Math.round(9 - hw); x <= Math.round(9 + hw); x++) pm.set(x, y, lit(ramp([150, 220, 255], 0.2), -(x - 9) * 0.4 + 0.2));
    }
    for (const y of [10, 13]) pm.hline(7, 11, y, GOLD[2]);
    pm.vline(9, 8, 16, GOLD[3]);
  },
  // L'Amulette du Gardien déchu: a broken shield badge.
  guardian_amulet: (pm, m) => {
    amuletChain(pm, m);
    for (let y = 9; y <= 16; y++) {
      const hw = y < 13 ? 4 : 4 - (y - 12);
      for (let x = 9 - hw; x <= 9 + hw; x++) if (!(x === 9 + (y % 3) - 1 && y > 10)) pm.set(x, y, lit(STEEL, -(x - 9) * 0.15 + 0.2));
    }
    for (const [x, y] of [[9, 10], [10, 12], [9, 14]] as [number, number][]) pm.set(x, y, [30, 26, 34]);
  },
  // La Cuirasse purifiée: white plate with a sun.
  purified_breastplate: (pm, m) => {
    chest(pm, { ...m, metal: ramp([226, 224, 214], 0.3) }, true, 0);
    disc(pm, 9, 9, 2.5, 2.5, GOLD, 0.3);
    for (const [dx, dy] of [[0, -4], [0, 4], [-4, 0], [4, 0]] as [number, number][]) pm.set(9 + dx, 9 + dy, GOLD[1]);
  },
  // Les Gants de la Racine-mère: bark, roots for fingers, a leaf.
  corrupted_root_gloves: (pm, m) => {
    const bark = ramp([110, 80, 56]);
    gloves(pm, { ...m, leather: bark }, false, 0);
    for (let y = 5; y <= 15; y += 2) for (let x = 5; x <= 12; x++) if (pm.filled(x, y) && (x + y) % 3 === 0) pm.set(x, y, bark[4]);
    px(pm, 13, 4, MARSH[1]);
    px(pm, 14, 3, MARSH[0]);
    px(pm, 4, 15, [196, 96, 236]);
  },
  // Les Gants du forgeron silencieux: dark leather, a hammer on the back.
  silent_smith_gloves: (pm, m) => {
    gloves(pm, { ...m, leather: ramp([66, 60, 70], 0.3) }, false, 0);
    bar(pm, 7, 11, 10, 8, 1, WOOD, 0);
    bar(pm, 9, 7, 11, 9, 2, IRON, 0.3);
  },
  // Le Heaume de la Vigie oubliée: tall, the slit glowing, a plume.
  watchtower_helm: (pm, m) => {
    helmet(pm, { ...m, metal: SILVER }, 3, false, 0);
    pm.hline(6, 12, 10, [140, 220, 255]);
    for (let y = 0; y <= 4; y++) pm.set(10 + (y > 2 ? 1 : 0), y, lit(CLOTH_BLUE, 0.3 - y * 0.15));
  },
  // Les Bottes du passage secret: soft dark boots, a feather.
  hidden_path_boots: (pm, m) => {
    boots(pm, { ...m, leather: ramp([60, 56, 70], 0.3) }, false, 1);
    bar(pm, 11, 7, 14, 2, 1, ramp([220, 220, 230]), 0.2);
    px(pm, 12, 5, [190, 190, 210]);
  },
  // Le Sceau de la garnison / de l'Archiviste: signet rings.
  bregan_seal: (pm, m) => signet(pm, { ...m, accent: GOLD }),
};

// --------------------------------------------------------------- motifs
// Families leave their mark on top of the shape.

function motifs(pm: Pixmap, spec: IconSpec, m: Materials): void {
  const filled = (x: number, y: number) => pm.filled(x, y);
  // Le Veilleur: a small four-pointed star, blue.
  if (has(spec, 'veilleur', 'veille', 'vigie')) {
    const sx = spec.category === 'ring' || spec.category === 'amulet' ? 15 : 14;
    const sy = 3;
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) pm.set(sx + dx, sy + dy, dx || dy ? [130, 210, 250] : [235, 250, 255]);
  }
  // L'Ombre: wisps of smoke curling off it.
  if (has(spec, 'ombre')) {
    for (const [x, y] of [[2, 4], [3, 3], [3, 5], [15, 14], [16, 13], [14, 16]] as [number, number][]) if (!filled(x, y)) pm.set(x, y, [150, 110, 200], 170);
  }
  // Rituel: gold runes on the piece.
  if (has(spec, 'ritu')) {
    let n = 0;
    for (let y = 2; y < ICON - 2 && n < 4; y += 3) for (let x = 3; x < ICON - 3 && n < 4; x += 4) if (filled(x, y) && filled(x + 1, y)) {
      pm.set(x, y, [255, 214, 110]);
      n++;
    }
  }
  // Marais: reeds / moss caught on it.
  if (has(spec, 'marais', 'tourbi')) {
    for (const [x, y] of [[3, 15], [3, 14], [4, 16], [14, 4]] as [number, number][]) if (filled(x, y)) pm.set(x, y, [98, 140, 70]);
  }
  // Mithril: a glint.
  if (has(spec, 'mithril')) {
    for (let y = 1; y < ICON; y++) for (let x = 1; x < ICON; x++) if (filled(x, y) && !filled(x - 1, y - 1)) {
      pm.set(x, y, [240, 252, 255]);
      return;
    }
  }
  // Elemental: flames for fire, frost for ice, sparks for lightning.
  const el: Record<string, RGB> = { fireDamage: [255, 140, 50], iceDamage: [170, 230, 255], electricDamage: [255, 240, 120], poisonDamage: [160, 220, 70], darkDamage: [170, 110, 230] };
  if (spec.stat && el[spec.stat] && spec.category === 'weapon') {
    for (const [x, y] of [[13, 1], [15, 3], [11, 4]] as [number, number][]) if (!filled(x, y)) pm.set(x, y, el[spec.stat]);
  }
  void m;
}

function pickForm(spec: IconSpec): ((pm: Pixmap, m: Materials, v: number) => void) | undefined {
  const c = spec.category;
  const t = spec.weaponType;
  if (t === 'sword' && has(spec, 'contreband', 'quais', 'patrouille')) return saber;
  if (t === 'sword' && has(spec, 'cassée')) return brokenBlade;
  if (t === 'dagger' && has(spec, 'croc')) return fang;
  if ((t === 'axe' || c === 'offhand') && t === 'axe' && has(spec, 'marais')) return sickle;
  if (t === 'staff' && has(spec, 'noueux', 'osier', 'marais')) return gnarledStaff;
  if (t === 'bow' && has(spec, 'long')) return longbow;
  if (t === 'bow' && has(spec, 'court', 'branche', 'petit')) return shortbow;
  if (c === 'helmet' && has(spec, 'capuche')) return hood;
  if (c === 'helmet' && has(spec, 'diadème')) return circlet;
  if (c === 'helmet' && has(spec, 'calotte')) return skullcap;
  if (c === 'chest' && has(spec, 'robe')) return robe;
  if (c === 'chest' && has(spec, 'matelass')) return quilted;
  if (c === 'chest' && has(spec, 'maille')) return chainmail;
  if (c === 'legs' && has(spec, 'robe')) return (pm, m, v) => robe(pm, m, v);
  if (c === 'shield' && has(spec, 'tour')) return towerShield;
  if (c === 'shield' && has(spec, 'rondache', 'targe')) return buckler;
  if (c === 'ring' && has(spec, 'sceau')) return signet;
  if (c === 'amulet' && has(spec, 'flamme')) return flamePendant;
  return undefined;
}

export function renderItemIcon(spec: IconSpec): Pixmap {
  const pm = new Pixmap(ICON, ICON);
  const m = materials(spec);
  const unique = UNIQUES[spec.baseId];
  if (unique) {
    unique(pm, m);
    motifs(pm, spec, m);
    pm.outline(OUTLINE);
    return pm;
  }
  const form = pickForm(spec);
  if (form) {
    form(pm, m, variant(spec, 3));
    motifs(pm, spec, m);
    pm.outline(OUTLINE);
    return pm;
  }
  return classicIcon(pm, spec, m);
}

function classicIcon(pm: Pixmap, spec: IconSpec, m: Materials): Pixmap {
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
  motifs(pm, spec, m);
  pm.outline(OUTLINE);
  return pm;
}
