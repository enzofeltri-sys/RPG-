// What every monster drawing is made with: the canvas (a design grid traced
// at any size, so one drawing gives the combat portrait and the map
// sprite), glows, cracks, the shadow on the ground, and the finishing
// pass (outline, light, shadow).

import { OUTLINE, Pixmap, RGB, Ramp, hash2, lit, mix, noise, ramp } from '../pixmap';
import { ScaledCanvas } from '../shape';

export interface MonsterArt {
  pm: Pixmap;
  anchorX: number; // feet, in the pixmap's pixels
  anchorY: number;
}

// A monster drawn at k times its design size.
export type Portrait = (k: number) => MonsterArt;

export const canvas = (w: number, h: number, k: number) => new ScaledCanvas(w, h, k);

export const BLIGHT_GLOW: RGB = [196, 96, 236];
export const EMBER_EYE: RGB = [255, 74, 60];
export const RUNE: RGB = [120, 220, 255];
export const BONE_WHITE: RGB = [244, 238, 222];

// A soft light: blends towards c, strongest in the middle.
export function halo(pm: Pixmap, cx: number, cy: number, r: number, c: RGB, alpha: number): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d >= 1) continue;
      const base = pm.get(x, y);
      const k = (1 - d) * (1 - d) * (alpha / 255);
      if (base) pm.set(x, y, mix(base, c, k));
      else pm.set(x, y, c, Math.round(k * 255));
    }
  }
}

// A glowing eye: a white-hot core, the colour, a halo.
export function glowEye(pm: Pixmap, x: number, y: number, c: RGB, r = 3.5, wide = true): void {
  halo(pm, x + 0.5, y + 0.5, r, c, 150);
  pm.set(x, y, [255, 236, 210]);
  if (wide) pm.set(x + 1, y, c);
}

// A line of single pixels (a crack, a vein, a seam).
export function crack(pm: Pixmap, pts: [number, number][], c: RGB): void {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let k = 0; k <= n; k++) pm.set(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), c);
  }
}

export function dotsAt(pm: Pixmap, pts: [number, number][], c: RGB): void {
  for (const [x, y] of pts) pm.set(x, y, c);
}

// A thick line, shaded along its side.
export function limb(pm: Pixmap, x0: number, y0: number, x1: number, y1: number, w: number, r: Ramp, bias = 0): void {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    for (let k = 0; k < w; k++) {
      const side = w === 1 ? 0 : (k / (w - 1)) * 2 - 1;
      pm.set(Math.round(x - (w - 1) / 2 + k), Math.round(y), lit(r, -side * 0.6 + bias));
    }
  }
}

// The shadow on the ground under the feet.
export function shadow(pm: Pixmap, cx: number, cy: number, rx: number, ry: number): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1 && !pm.filled(x, y)) pm.set(x, y, [24, 20, 30], 70);
    }
  }
}

// Dressed stone: blocks with dark joints (a texture for part()).
export function cellNoise(x: number, y: number): number {
  const by = Math.floor(y / 5);
  const bx = Math.floor((x + (by % 2) * 3) / 7);
  const joint = y % 5 === 0 || (x + (by % 2) * 3) % 7 === 0;
  return joint ? -0.45 : (hash2(bx, by, 72) - 0.5) * 0.35;
}

// Blight eating a coat or a hide: patches recoloured in dark violet tones
// (keeping their light), streaked the way of the fur.
export function blightPatches(pm: Pixmap, w: number, h: number, threshold = 0.66, seed = 77, keep: (x: number, y: number) => boolean = () => true): void {
  const blight = ramp([56, 38, 74], 0.4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = pm.get(x, y);
    if (!c || !keep(x, y)) continue;
    const n = noise(x * 0.45, y * 1.7, 4, seed) + (noise(x * 0.6, y * 2, 1.5, seed + 1) - 0.5) * 0.3;
    if (n > threshold) {
      const lum = (c[0] + c[1] + c[2]) / 3;
      pm.set(x, y, lum > 140 ? blight[1] : lum > 110 ? blight[2] : lum > 85 ? blight[3] : blight[4]);
    }
  }
}

// Light from the top left catching the edges facing it.
export function rimLight(pm: Pixmap, w: number, h: number, c: RGB = [214, 210, 226], k = 0.45): void {
  const rim: [number, number][] = [];
  for (let y = 1; y < h; y++) for (let x = 1; x < w; x++) if (pm.filled(x, y) && !pm.filled(x, y - 1) && !pm.filled(x - 1, y - 1)) rim.push([x, y]);
  for (const [x, y] of rim) pm.set(x, y, mix(pm.get(x, y)!, c, k));
}

// Outline, then what glows over the outline, then the shadow under it all.
export function finish(
  body: ScaledCanvas,
  ground: [number, number, number, number],
  feet: [number, number],
  glow?: (body: ScaledCanvas) => void,
): MonsterArt {
  body.outline(OUTLINE);
  glow?.(body);
  const pm = new ScaledCanvas(body.designW, body.designH, body.k);
  shadow(pm, ...ground);
  pm.blit(body, 0, 0);
  return { pm, anchorX: Math.round(feet[0] * body.k), anchorY: Math.round(feet[1] * body.k) };
}
