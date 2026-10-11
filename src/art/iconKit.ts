// The kit the item icons are drawn with: materials picked from an item's
// palier and name, small drawing helpers, and builders for each kind of
// object (a sword from its blade, guard, grip and pommel; a boot from its
// height, cuff and toe…) that itemIcons.ts puts together per item.

import { Pixmap, RGB, Ramp, lit, mix, ramp } from './pixmap';
import { Pt, part } from './shape';

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
export function variant(spec: IconSpec, n: number): number {
  let h = 0;
  for (const ch of spec.baseId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % n;
}

export interface Materials {
  metal: Ramp;
  leather: Ramp;
  cloth: Ramp;
  wood: Ramp;
  accent: Ramp; // trims, guards, settings
  gem: RGB;
}

export const IRON = ramp([138, 144, 158], 0.4);
export const STEEL = ramp([168, 178, 194], 0.4);
export const MITHRIL = ramp([164, 206, 222], 0.3);
export const SHADOW = ramp([92, 80, 116], 0.4);
export const DARK = ramp([62, 56, 70], 0.3);
export const BRONZE = ramp([190, 132, 70]);
export const GOLD = ramp([232, 184, 64]);
export const SILVER = ramp([200, 206, 218], 0.3);
export const LEATHER = ramp([150, 100, 62]);
export const DARK_LEATHER = ramp([104, 72, 52]);
export const MARSH = ramp([104, 128, 84]);
export const REED = ramp([176, 160, 104]);
export const WOOD = ramp([146, 100, 62]);
export const DARK_WOOD = ramp([96, 66, 46]);
export const BONE = ramp([214, 204, 176], 0.5);
export const CLOTH_BLUE = ramp([70, 104, 170]);
export const CLOTH_RED = ramp([168, 56, 58]);
export const CLOTH_GREY = ramp([128, 124, 120], 0.4);
export const CLOTH_PURPLE = ramp([110, 70, 140]);
export const CLOTH_GREEN = ramp([70, 120, 80]);
export const LINEN = ramp([206, 196, 170], 0.4);
export const ICE = ramp([150, 214, 240], 0.2);
export const RUST: RGB = [150, 80, 46];
export const STRING: RGB = [226, 220, 200];
export const SKIN: RGB = [226, 178, 140];
export const EMBER: RGB = [255, 120, 40];
export const HOLY: RGB = [255, 244, 190];
export const VIOLET: RGB = [180, 120, 240];
export const STAR: RGB = [130, 210, 250];

export function has(spec: IconSpec, ...words: string[]): boolean {
  const s = (spec.name + ' ' + spec.baseId).toLowerCase();
  return words.some((w) => s.includes(w));
}

export function materials(spec: IconSpec): Materials {
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
  if (has(spec, 'marais', 'marsh', 'bog', 'tourbi')) {
    leather = MARSH;
    cloth = MARSH;
    gem = [120, 200, 120];
  }
  if (has(spec, 'ombre', 'shadow', 'silenc', 'hidden')) {
    metal = SHADOW;
    leather = ramp([70, 60, 84], 0.4);
    cloth = CLOTH_PURPLE;
    accent = SILVER;
    gem = VIOLET;
  }
  if (has(spec, 'veilleur', 'watcher')) {
    metal = SILVER;
    cloth = CLOTH_BLUE;
    accent = SILVER;
    gem = STAR;
  }
  if (has(spec, 'ritu', 'sceau', 'seal', 'sacr')) {
    accent = GOLD;
    gem = [255, 210, 110];
  }
  if (has(spec, 'garde', 'guard', 'garrison', 'garnison')) {
    cloth = CLOTH_BLUE;
    accent = GOLD;
  }
  if (has(spec, 'archiv', 'mage', 'arcan')) cloth = CLOTH_PURPLE;
  if (has(spec, 'contreband', 'smuggl')) cloth = CLOTH_RED;
  if (spec.stat && STAT_GEMS[spec.stat]) gem = STAT_GEMS[spec.stat];
  return { metal, leather, cloth, wood, accent, gem };
}

// ------------------------------------------------------------ helpers

export function px(pm: Pixmap, x: number, y: number, c: RGB, alpha = 255): void {
  pm.set(Math.round(x), Math.round(y), c, alpha);
}

// A straight run from (x0, y0) to (x1, y1), w pixels thick, lit along its
// width (light from the top left).
export function bar(pm: Pixmap, x0: number, y0: number, x1: number, y1: number, w: number, r: Ramp, bias = 0): void {
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

export function disc(pm: Pixmap, cx: number, cy: number, rx: number, ry: number, r: Ramp, bias = 0): void {
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

// A thin ring (an ellipse's edge), lit from the top left.
export function hoop(pm: Pixmap, cx: number, cy: number, rx: number, ry: number, r: Ramp, thick = 1, bias = 0): void {
  for (let a = 0; a < Math.PI * 2; a += 0.04) {
    for (let k = 0; k < thick; k++) {
      const x = cx + Math.cos(a) * (rx - k * 0.9);
      const y = cy + Math.sin(a) * (ry - k * 0.9);
      px(pm, x - 0.5, y - 0.5, lit(r, -Math.cos(a) * 0.4 - Math.sin(a) * 0.6 - k * 0.4 + bias));
    }
  }
}

export function gemAt(pm: Pixmap, x: number, y: number, c: RGB): void {
  pm.set(x, y, mix(c, [255, 255, 255], 0.5));
  pm.set(x + 1, y, mix(c, [20, 20, 40], 0.2));
  pm.set(x, y + 1, mix(c, [20, 20, 40], 0.35));
  pm.set(x + 1, y + 1, mix(c, [20, 20, 40], 0.55));
}

export function glint(pm: Pixmap, x: number, y: number, c: RGB = [255, 255, 255]): void {
  pm.set(x, y, c);
}

// A polygon with volume (shape.ts), with an edge that suits small icons.
export function poly(pm: Pixmap, pts: Pt[], r: Ramp, bias = 0, round = 1.6): void {
  part(pm, pts, r, { round, bias: bias + 0.15 });
}

// Clears what's under a mask (a notch, a cut-out).
export function erase(pm: Pixmap, x: number, y: number): void {
  pm.set(x, y, [0, 0, 0], 0);
}

// Runs of pixels on what's already drawn: stitching, rivets, runes…
export function dots(pm: Pixmap, pts: [number, number][], c: RGB, onlyFilled = true): void {
  for (const [x, y] of pts) if (!onlyFilled || pm.filled(x, y)) pm.set(x, y, c);
}

// Lights up the tone of everything drawn in a region by `amount` (+/-).
export function tint(pm: Pixmap, c: RGB, k: number, keep: (x: number, y: number) => boolean = () => true): void {
  for (let y = 0; y < ICON; y++) for (let x = 0; x < ICON; x++) if (pm.filled(x, y) && keep(x, y)) pm.set(x, y, mix(pm.get(x, y)!, c, k));
}

// --------------------------------------------------- the diagonal frame
// Swords, daggers, axes and staves lie across the icon, grip at the bottom
// left: they're drawn in their own frame, u along the length (towards the
// top right), v across it (towards the bottom right, the shaded side).

const S = Math.SQRT1_2;
export type Frame = (u: number, v: number) => Pt;
export function diag(hx: number, hy: number, angle = 45): Frame {
  if (angle === 45) return (u, v) => [hx + (u + v) * S, hy + (-u + v) * S];
  const a = (angle * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return (u, v) => [hx + u * c + v * s, hy - u * s + v * c];
}
export const inFrame = (f: Frame, pts: [number, number][]): Pt[] => pts.map(([u, v]) => f(u, v));

// ---------------------------------------------------------------- swords

export type Guard = 'cross' | 'swept' | 'disc' | 'wing' | 'shell' | 'bar' | 'prongs' | 'none';
export type Tip = 'point' | 'clip' | 'round' | 'needle' | 'leaf' | 'wavy' | 'broad' | 'hook';
export interface SwordOpts {
  len: number;
  w: number;
  tip?: Tip;
  blade?: Ramp;
  guard?: Guard;
  guardR?: Ramp;
  grip?: Ramp;
  gripLen?: number;
  pommel?: 'round' | 'gem' | 'ring' | 'crescent' | 'feather' | 'none';
  fuller?: boolean;
  hx?: number;
  hy?: number;
}

export function bladeShape(tip: Tip, len: number, w: number): [number, number][] {
  const h = w / 2;
  switch (tip) {
    case 'clip':
      return [[0, -h], [len * 0.62, -h - 0.4], [len, -h + 0.2], [len - 1.2, h + 0.6], [len * 0.55, h + 0.9], [0, h]];
    case 'round':
      return [[0, -h], [len - h, -h], [len, -h * 0.4], [len, h * 0.4], [len - h, h], [0, h]];
    case 'needle':
      return [[0, -h], [len, 0], [0, h]];
    case 'leaf':
      return [[0, -h * 0.7], [len * 0.5, -h - 0.5], [len, 0], [len * 0.5, h + 0.5], [0, h * 0.7]];
    case 'broad':
      return [[0, -h - 0.3], [len - h - 0.6, -h], [len, 0], [len - h - 0.6, h], [0, h + 0.3]];
    case 'hook':
      return [[0, -h], [len * 0.55, -h - 0.3], [len - 0.4, -h - 1.8], [len + 0.4, -h - 3.6], [len * 0.72, h - 0.6], [0, h]];
    case 'wavy': {
      const top: [number, number][] = [];
      const bot: [number, number][] = [];
      for (let u = 0; u <= len - w; u += 1) {
        const s = Math.sin(u * 1.4) * 0.55;
        top.push([u, -h + s]);
        bot.unshift([u, h + s]);
      }
      return [...top, [len, 0], ...bot];
    }
    default:
      return [[0, -h], [len - w, -h], [len, 0], [len - w, h], [0, h]];
  }
}

export function sword(pm: Pixmap, m: Materials, o: SwordOpts): void {
  const f = diag(o.hx ?? 5, o.hy ?? 13);
  const blade = o.blade ?? m.metal;
  const guardR = o.guardR ?? m.accent;
  const grip = o.grip ?? m.leather;
  const gl = o.gripLen ?? 3.2;
  // Grip first, wrapped.
  poly(pm, inFrame(f, [[-gl, -0.95], [0, -0.95], [0, 0.95], [-gl, 0.95]]), grip, 0, 1);
  for (let u = -gl + 0.8; u < 0; u += 1.4) px(pm, ...f(u, 0.2), grip[3]);
  poly(pm, inFrame(f, bladeShape(o.tip ?? 'point', o.len, o.w)), blade, 0.15, 1.2);
  if (o.fuller) for (let u = 1.2; u < o.len - o.w - 1; u += 0.5) px(pm, ...f(u, 0.15), lit(blade, -0.55));
  // Edge catches the light.
  for (let u = 1; u < o.len - 1; u += 0.5) {
    const [x, y] = f(u, -o.w / 2 + 0.25);
    if (pm.filled(Math.round(x), Math.round(y))) px(pm, x, y, lit(blade, 0.85));
  }
  const g = guardR;
  switch (o.guard ?? 'cross') {
    case 'cross':
      poly(pm, inFrame(f, [[-0.9, -3], [0.7, -3], [0.7, 3], [-0.9, 3]]), g, 0.1, 1);
      break;
    case 'bar':
      poly(pm, inFrame(f, [[-0.7, -2.2], [0.6, -2.2], [0.6, 2.2], [-0.7, 2.2]]), g, 0, 1);
      break;
    case 'swept':
      poly(pm, inFrame(f, [[-0.9, -1.2], [0.8, -2.4], [2.2, -3.6], [1.2, -2], [0.8, 0], [1.2, 2], [2.2, 3.6], [0.8, 2.4], [-0.9, 1.2]]), g, 0.1, 1);
      break;
    case 'wing':
      poly(pm, inFrame(f, [[-0.8, -1], [0.4, -3.8], [2.6, -3.4], [0.8, -1.2], [0.8, 1.2], [2.6, 3.4], [0.4, 3.8], [-0.8, 1]]), g, 0.1, 1);
      break;
    case 'disc':
      disc(pm, ...f(0, 0), 1.9, 1.9, g, 0.15);
      break;
    case 'shell':
      poly(pm, inFrame(f, [[-0.6, -3.4], [1.2, -3], [1.8, 0], [1.2, 3], [-0.6, 3.4], [-1.2, 0]]), g, 0.1, 2.2);
      break;
    case 'prongs':
      poly(pm, inFrame(f, [[-0.8, -3], [2.6, -3.2], [2.6, -2.2], [0.6, -1.6], [0.6, 1.6], [2.6, 2.2], [2.6, 3.2], [-0.8, 3]]), g, 0.1, 1);
      break;
    default:
  }
  const [px0, py0] = f(-gl - 0.9, 0);
  switch (o.pommel ?? 'round') {
    case 'round':
      disc(pm, px0, py0, 1.3, 1.3, g, 0.2);
      break;
    case 'gem':
      disc(pm, px0, py0, 1.5, 1.5, g, 0.2);
      gemAt(pm, Math.round(px0 - 0.5), Math.round(py0 - 0.5), m.gem);
      break;
    case 'ring':
      hoop(pm, px0 - 0.3, py0 + 0.3, 1.8, 1.8, g);
      break;
    case 'crescent':
      poly(pm, [[px0 - 2.4, py0 - 0.4], [px0 - 0.6, py0 + 0.2], [px0 + 0.4, py0 + 2.4], [px0 - 0.4, py0 + 0.6], [px0 - 0.4, py0 + 0.6]], g, 0.1, 1);
      disc(pm, px0, py0, 1, 1, g, 0.2);
      break;
    case 'feather':
      for (let k = 0; k < 4; k++) {
        bar(pm, px0 - k * 0.8, py0 + k * 0.8, px0 - k * 0.8 - 1.6, py0 + k * 0.8 - 0.8, 1, ramp([220, 214, 230], 0.3), 0.3 - k * 0.2);
        bar(pm, px0 - k * 0.8, py0 + k * 0.8, px0 - k * 0.8 + 0.8, py0 + k * 0.8 + 1.6, 1, ramp([200, 194, 214], 0.3), -0.1 - k * 0.2);
      }
      break;
    default:
  }
}

// ------------------------------------------------------------------ axes

export type AxeHead = 'small' | 'wedge' | 'beard' | 'crescent' | 'double' | 'halberd' | 'tomahawk' | 'hook';
export interface AxeOpts {
  head: AxeHead;
  size?: number; // 1 = a hand axe
  shaft?: Ramp;
  head_?: Ramp;
  len?: number; // shaft length
  back?: 'spike' | 'hammer' | 'none';
  wrap?: Ramp;
}

export function axeOf(pm: Pixmap, m: Materials, o: AxeOpts): void {
  const len = o.len ?? 15;
  const f = diag(3, 16);
  const shaft = o.shaft ?? m.wood;
  const metal = o.head_ ?? m.metal;
  const s = o.size ?? 1;
  poly(pm, inFrame(f, [[0, -0.9], [len, -0.9], [len, 0.9], [0, 0.9]]), shaft, 0, 1);
  if (o.wrap) poly(pm, inFrame(f, [[0.5, -1.05], [4, -1.05], [4, 1.05], [0.5, 1.05]]), o.wrap, 0, 1);
  const hu = len - 3; // where the head sits along the shaft
  // The head in the frame, around (hu, 0): the cutting edge on the shaded
  // side (v > 0), scaled by the axe's size.
  const shape: Record<AxeHead, [number, number][]> = {
    small: [[-1.4, 0.8], [-2.6, 3.6], [-2.2, 4.6], [2.2, 4.6], [2.6, 3.6], [1.4, 0.8]],
    wedge: [[-1.6, 0.8], [-2.4, 4.4], [2.4, 4.4], [1.6, 0.8]],
    beard: [[-1, 0.8], [-5, 3.2], [-5.2, 4.6], [2.2, 4.8], [2.4, 3.4], [1.4, 0.8]],
    crescent: [[-1.2, 0.8], [-3.6, 2.6], [-4.4, 5], [-1, 4.4], [1, 4.4], [4.4, 5], [3.6, 2.6], [1.2, 0.8]],
    double: [[-1.2, 0.8], [-3.6, 2.6], [-4.2, 4.8], [4.2, 4.8], [3.6, 2.6], [1.2, 0.8]],
    halberd: [[-2.4, 0.8], [-4.4, 4.2], [-3.4, 4.8], [2.4, 4.8], [3.6, 3.8], [1.4, 0.8]],
    tomahawk: [[-0.8, 0.8], [-1.8, 3.4], [-2.8, 4.6], [0.8, 4.4], [1.2, 2.4], [0.8, 0.8]],
    hook: [[-1, 0.8], [-5.4, 2.4], [-5.6, 4.2], [-3, 3.4], [2.4, 4.8], [2.4, 3], [1.4, 0.8]],
  };
  const sc = s * 1.3;
  const at = (pts: [number, number][], side = 1): [number, number][] => pts.map(([du, v]) => [hu + du * sc * 0.85, side * (v <= 0.8 ? v : 0.8 + (v - 0.8) * sc)]);
  const head = { [o.head]: at(shape[o.head]) } as Record<AxeHead, [number, number][]>;
  poly(pm, inFrame(f, head[o.head]), metal, 0.1, 1.4);
  // The cutting edge, bright.
  const edge = head[o.head].filter(([, v]) => v > 0.8 + 2.2 * sc);
  for (let i = 1; i < edge.length; i++) {
    const [u0, v0] = edge[i - 1];
    const [u1, v1] = edge[i];
    for (let t = 0; t <= 1; t += 0.2) {
      const [x, y] = f(u0 + (u1 - u0) * t, v0 + (v1 - v0) * t - 0.5);
      if (pm.filled(Math.round(x), Math.round(y))) px(pm, x, y, lit(metal, 0.9));
    }
  }
  if (o.head === 'double') poly(pm, inFrame(f, at(shape.double, -1)), metal, 0.3, 1.4);
  if (o.head === 'halberd') poly(pm, inFrame(f, [[len - 0.6, -0.8], [len + 3.4, 0], [len - 0.6, 0.8]]), metal, 0.3, 1);
  if (o.back === 'spike') poly(pm, inFrame(f, [[hu - 1, -0.8], [hu, -3.2 * sc], [hu + 1, -0.8]]), metal, 0.3, 1);
  if (o.back === 'hammer') poly(pm, inFrame(f, [[hu - 1.4, -0.8], [hu - 1.4, -2.6 * sc], [hu + 1.4, -2.6 * sc], [hu + 1.4, -0.8]]), metal, 0.2, 1);
  // The eye and its collar.
  poly(pm, inFrame(f, [[hu - 1.3, -1.2], [hu + 1.3, -1.2], [hu + 1.3, 1.2], [hu - 1.3, 1.2]]), m.accent, 0.1, 1);
}

// ---------------------------------------------------------------- staves

// The shaft from the bottom left to (tx, ty), its head drawn by the item.
export function shaft(pm: Pixmap, r: Ramp, tx = 12, ty = 6, fx = 3, fy = 17, w = 2): void {
  bar(pm, fx, fy, tx, ty, w, r, 0.1);
  // A ferrule at the foot.
  px(pm, fx, fy, lit(r, -0.6));
}

export function orb(pm: Pixmap, cx: number, cy: number, rad: number, c: RGB, glow = true): void {
  if (glow) for (let y = -rad - 2; y <= rad + 2; y++) for (let x = -rad - 2; x <= rad + 2; x++) {
    const d = Math.hypot(x, y);
    if (d > rad + 0.5 && d < rad + 2 && !pm.filled(Math.round(cx + x), Math.round(cy + y))) px(pm, cx + x, cy + y, c, Math.round(90 * (1 - (d - rad) / 2)));
  }
  disc(pm, cx, cy, rad, rad, ramp(c, 0.2), 0.35);
  px(pm, cx - rad * 0.45, cy - rad * 0.45, mix(c, [255, 255, 255], 0.75));
}

// ------------------------------------------------------------------ bows

export interface BowOpts {
  limbs: Ramp;
  bend?: number; // how far the belly reaches from the string
  half?: number; // half the length
  recurve?: number; // tips curling forward
  w?: number;
  stringC?: RGB;
  grip?: Ramp;
  sx?: number; // where the string runs
  bands?: Ramp; // metal bands along the limbs
  tips?: Ramp; // horn or metal nocks
}

// Drawn upright (string on the left at x = sx, the belly bowing right,
// y = 9 the middle) and turned to lie across the icon, top limb to the top
// right. Returns the limb's middle line and the turn, so the item can
// decorate in the same upright coordinates.
export interface Bow {
  pts: [number, number][];
  at: (x: number, y: number) => Pt;
}
export function bowOf(pm: Pixmap, o: BowOpts): Bow {
  const sx = o.sx ?? 5;
  const bend = o.bend ?? 6;
  const half = o.half ?? 10;
  const rc = o.recurve ?? 0;
  const w = o.w ?? 2;
  const mid = sx + rc + bend / 2;
  const at = (x: number, y: number): Pt => {
    const lx = x - mid;
    const ly = y - 9;
    return [9 + (lx - ly) * S, 9 + (lx + ly) * S];
  };
  // The string first, tip to tip: the limbs go over it where they touch.
  const [ax, ay] = at(sx + rc, 9 - half);
  const [bx, by] = at(sx + rc, 9 + half);
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
  for (let i = 0; i <= n; i++) px(pm, ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n, o.stringC ?? STRING);
  const pts: [number, number][] = [];
  for (let t = -1; t <= 1.0001; t += 0.05) {
    // Recurved: near the tips the limb dips onto the string, then curls
    // back out.
    const dip = rc * Math.exp(-(((Math.abs(t) - 0.8) / 0.12) ** 2));
    pts.push([sx + rc + (1 - t * t) * bend - dip, 9 + t * half]);
  }
  for (let i = 1; i < pts.length; i++) {
    const t = (i / (pts.length - 1)) * 2 - 1;
    const thick = Math.abs(t) < 0.75 ? w : Math.max(1, w - 1);
    bar(pm, ...at(...pts[i - 1]), ...at(...pts[i]), thick, o.limbs, t < 0 ? 0.25 : -0.15);
  }
  const g = at(sx + rc + bend, 9);
  if (o.grip) bar(pm, ...at(sx + rc + bend, 7.6), ...at(sx + rc + bend, 10.4), w + 1, o.grip, 0);
  if (o.bands) for (const t of [-0.5, 0.5]) {
    const x = sx + rc + (1 - t * t) * bend;
    bar(pm, ...at(x - 1, 9 + t * half), ...at(x + 1.4, 9 + t * half), 1, o.bands, 0.3);
  }
  if (o.tips) for (const t of [-1, 1]) disc(pm, ...at(sx + rc + 0.3, 9 + t * half), 1.1, 1.1, o.tips, 0.2);
  void g;
  return { pts, at };
}

// ----------------------------------------------------------------- books

export function book(pm: Pixmap, cover: Ramp, corners?: Ramp, pages: RGB = [236, 228, 206]): void {
  // A thick closed book in three quarters: cover, spine on the left, the
  // block of pages along the right and bottom.
  poly(pm, [[3, 3], [13, 2], [14, 3], [14, 14], [4, 15], [3, 14]], cover, 0.1, 2);
  for (let y = 3; y <= 14; y++) pm.set(3, y, lit(cover, 0.5)); // spine catch light
  for (let y = 4; y <= 15; y++) pm.set(15, y - 1, pages);
  pm.hline(5, 15, 15, pages);
  pm.hline(5, 14, 16, mix(pages, [90, 80, 70], 0.4));
  pm.vline(15, 4, 14, pages);
  for (let y = 5; y <= 14; y += 2) pm.set(15, y, mix(pages, [120, 110, 100], 0.3));
  if (corners) for (const [x, y] of [[3, 3], [4, 3], [3, 4], [13, 2], [14, 3], [3, 14], [4, 15], [14, 14], [13, 14]] as [number, number][]) pm.set(x, y, lit(corners, y < 5 ? 0.4 : -0.1));
}

// --------------------------------------------------------------- shields

export function heater(pm: Pixmap, face: Ramp, rim?: Ramp): void {
  const pts: Pt[] = [[2.5, 2], [15.5, 2], [15.5, 8], [14, 12], [9, 16.6], [4, 12], [2.5, 8]];
  poly(pm, pts, face, 0.1, 2.4);
  if (rim) {
    for (let y = 2; y <= 16; y++) for (let x = 2; x <= 16; x++) {
      if (!pm.filled(x, y)) continue;
      const edge = !pm.filled(x - 1, y) || !pm.filled(x + 1, y) || !pm.filled(x, y - 1) || !pm.filled(x, y + 1);
      if (edge) pm.set(x, y, lit(rim, (9 - x) * 0.08 + (9 - y) * 0.05 + 0.1));
    }
  }
}

export function kite(pm: Pixmap, face: Ramp, rim?: Ramp): void {
  poly(pm, [[3, 3], [9, 1], [15, 3], [14.5, 9], [9, 17], [3.5, 9]], face, 0.1, 2.4);
  if (rim) for (let y = 1; y <= 17; y++) for (let x = 2; x <= 16; x++) {
    if (!pm.filled(x, y)) continue;
    if (!pm.filled(x - 1, y) || !pm.filled(x + 1, y) || !pm.filled(x, y - 1) || !pm.filled(x, y + 1)) pm.set(x, y, lit(rim, (9 - x) * 0.08 + (9 - y) * 0.05 + 0.1));
  }
}

export function roundShield(pm: Pixmap, face: Ramp, rim: Ramp, r = 7.4): void {
  disc(pm, 9, 9, r, r, rim, 0.1);
  disc(pm, 9, 9, r - 1.2, r - 1.2, face, 0.15);
}

// --------------------------------------------------------------- helmets

export function dome(pm: Pixmap, r: Ramp, cy = 9, rx = 6.5, ry = 6, cut = 12): void {
  disc(pm, 9, cy, rx, ry, r, 0.1);
  for (let y = cut; y < ICON; y++) for (let x = 0; x < ICON; x++) erase(pm, x, y);
}

// A hood: the cowl, its point, the dark opening, a fall on the shoulders.
export function hoodOf(pm: Pixmap, c: Ramp, inner: RGB = [30, 26, 34]): void {
  poly(pm, [[9, 1], [13.5, 4], [15, 9], [16, 16.5], [2, 16.5], [3, 9], [4.5, 4]], c, 0.1, 3);
  poly(pm, [[9, 6], [12, 8.5], [12.5, 13], [9, 15], [5.5, 13], [6, 8.5]], ramp(inner, 0.2), -0.6, 2);
  pm.hline(4, 14, 16, lit(c, -0.5));
}

// --------------------------------------------------------------- bodies

// A torso: shoulders, waist, an open neck; the item adds the rest.
export function torso(pm: Pixmap, r: Ramp, neck = 2.5, flare = 0): void {
  poly(pm, [[2, 5], [5, 2.5], [9 - neck, 2.5], [9, 5], [9 + neck, 2.5], [13, 2.5], [16, 5], [15, 9], [13.5, 10], [13.5 + flare, 16], [4.5 - flare, 16], [4.5, 10], [3, 9]], r, 0.1, 2.6);
}

export function robeOf(pm: Pixmap, r: Ramp): void {
  poly(pm, [[3, 4.5], [6, 2], [8, 2], [9, 4.5], [10, 2], [12, 2], [15, 4.5], [14.5, 8], [13, 8.5], [16, 17], [2, 17], [5, 8.5], [3.5, 8]], r, 0.1, 2.6);
  for (let y = 10; y <= 16; y += 1) {
    px(pm, 6 + (y - 10) * -0.3, y, lit(r, -0.45));
    px(pm, 12 + (y - 10) * 0.3, y, lit(r, -0.45));
  }
}

// A pair of trousers from the front: the waistband, the legs apart.
export function trousers(pm: Pixmap, r: Ramp, band?: Ramp, slim = 0): void {
  poly(pm, [[4, 3], [14, 3], [14.6 - slim, 16.5], [10.4, 16.5], [9.4, 7], [8.6, 7], [7.6, 16.5], [3.4 + slim, 16.5]], r, 0.1, 2.2);
  if (band) poly(pm, [[3.8, 2.4], [14.2, 2.4], [14.3, 4.6], [3.7, 4.6]], band, 0.1, 1);
  // The crease of each leg.
  for (let y = 7; y <= 15; y++) {
    px(pm, 5.5, y, lit(r, 0.35));
    px(pm, 12.5, y, lit(r, -0.35));
  }
}

export function skirt(pm: Pixmap, r: Ramp, band?: Ramp): void {
  poly(pm, [[4.5, 3], [13.5, 3], [16, 16.5], [2, 16.5]], r, 0.1, 2.4);
  if (band) poly(pm, [[4.2, 2.4], [13.8, 2.4], [13.9, 4.6], [4.1, 4.6]], band, 0.1, 1);
  for (const x0 of [6.5, 9, 11.5]) for (let y = 6; y <= 16; y++) px(pm, x0 + (x0 - 9) * (y - 6) * 0.08, y, lit(r, -0.4));
}

// A boot from the side, toe to the right. `top`: where the shaft starts.
export interface BootOpts {
  top?: number;
  toe?: 'round' | 'point' | 'curl' | 'square';
  heel?: boolean;
  sole?: RGB;
  wide?: number; // a flared top (bucket boots)
}
export function bootOf(pm: Pixmap, r: Ramp, o: BootOpts = {}): void {
  const top = o.top ?? 2;
  const wd = o.wide ?? 0;
  const toe = o.toe ?? 'round';
  const pts: Pt[] = [[5 - wd, top], [11 + wd, top], [10.6, 9.5], [12.4, 11], [15, 12], [16.2, 13.4]];
  if (toe === 'point') pts.push([17.2, 15.2], [15, 15.6]);
  else if (toe === 'curl') pts.push([16.8, 13], [17.4, 11.6], [17.6, 13.8], [16.6, 15.6]);
  else if (toe === 'square') pts.push([16.4, 15.6]);
  else pts.push([16.4, 15], [15.6, 15.6]);
  pts.push([4.6, 15.6], [4.4, 11]);
  poly(pm, pts, r, 0.1, 2.2);
  const sole = o.sole ?? [52, 40, 34];
  for (let x = 4; x <= 16; x++) if (pm.filled(x, 15)) pm.set(x, 16, sole);
  if (o.heel !== false) {
    pm.hline(4, 7, 16, sole);
    pm.hline(5, 7, 17, mix(sole, [0, 0, 0], 0.2));
  }
  // The ankle crease.
  px(pm, 10, 10, lit(r, -0.5));
  px(pm, 11, 11, lit(r, -0.4));
}

// A glove from the back: four fingers up, the thumb out to the right.
export interface GloveOpts {
  fingerless?: boolean;
  plate?: boolean;
  cuffTall?: number;
  claws?: RGB;
}
export function gloveOf(pm: Pixmap, r: Ramp, cuff: Ramp, o: GloveOpts = {}): void {
  const ct = o.cuffTall ?? 4;
  poly(pm, [[4, 17 - ct], [13, 17 - ct], [13.6, 17], [3.4, 17]], cuff, 0.1, 1.4);
  poly(pm, [[4, 7], [12.8, 7], [13, 13.4], [4, 13.4]], r, 0.1, 2);
  // Thumb.
  poly(pm, [[12, 8], [15.4, 6.6], [16.4, 8], [13.4, 11.8]], r, -0.1, 1.2);
  const fingers: [number, number][] = [[4, 4], [6.2, 2.4], [8.4, 2], [10.6, 3.2]];
  fingers.forEach(([fx, top]) => {
    const t = o.fingerless ? 5.4 : top;
    poly(pm, [[fx, t], [fx + 2.2, t], [fx + 2.2, 8], [fx, 8]], r, 0, 1);
    if (o.fingerless) for (let y = Math.round(top); y < 5; y++) for (let x = Math.round(fx); x <= Math.round(fx + 1.2); x++) pm.set(x, y, lit(ramp(SKIN, 0.4), y === Math.round(top) ? 0.3 : -0.1));
    if (o.claws) {
      px(pm, fx + 0.5, top - 1, o.claws);
      px(pm, fx + 1, top - 2, mix(o.claws, [255, 255, 255], 0.4));
    }
  });
  if (o.plate) for (const y of [6, 9, 11]) for (let x = 4; x <= 13; x++) if (pm.filled(x, y)) pm.set(x, y, lit(r, -0.55));
}

// A finger ring seen from above the stone.
export function band(pm: Pixmap, r: Ramp, thick = 2, cy = 11.5): void {
  hoop(pm, 9.5, cy, 5.4, 4.2, r, thick);
}

// A pendant's chain or cord, from the top corners down to (9, bottom).
export function chain(pm: Pixmap, r: Ramp, bottom = 9, beads?: RGB): void {
  for (let t = 0; t <= 1; t += 0.03) {
    const x = 2.5 + t * 13;
    const y = 1.5 + Math.sin(t * Math.PI) * (bottom - 1.5);
    pm.set(Math.round(x), Math.round(y), Math.round(t * 30) % 2 ? r[1] : r[3]);
  }
  if (beads) for (const t of [0.22, 0.34, 0.66, 0.78]) px(pm, 2.5 + t * 13, 1.5 + Math.sin(t * Math.PI) * (bottom - 1.5), beads);
}
