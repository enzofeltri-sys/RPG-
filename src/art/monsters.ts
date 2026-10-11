// The monsters of Vaeloria, drawn by the game like the rest of the world
// (pixmap.ts, the props' and paper doll's shading): light from the top
// left, five-tone ramps, a dark outline. Seen from the front three
// quarters, standing on the bottom of their frame. One frame per monster
// for now (combat shows it at twice the size).

import { OUTLINE, Pixmap, RGB, Ramp, hash2, lit, mix, noise, ramp } from './pixmap';
import { FurOpts, LIGHT as L, Pt, furPart, part } from './shape';

export interface MonsterArt {
  pm: Pixmap;
  anchorX: number; // feet
  anchorY: number;
}

// A shaded ovoid: the sphere's normal against the light picks the tone.
function blob(pm: Pixmap, cx: number, cy: number, rx: number, ry: number, r: Ramp, bias = 0, tex?: (x: number, y: number) => number): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      const nz = Math.sqrt(1 - d);
      const level = (dx * L[0] + dy * L[1] + nz * L[2]) * 1.25 - 0.35 + bias + (tex ? tex(x, y) : 0);
      pm.set(x, y, lit(r, level));
    }
  }
}

// A limb or a stroke: a thick line, shaded along its side.
function limb(pm: Pixmap, x0: number, y0: number, x1: number, y1: number, w: number, r: Ramp, bias = 0): void {
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

// Glowing eyes: a bright core and a soft rim.
function eye(pm: Pixmap, x: number, y: number, c: RGB): void {
  pm.set(x, y, mix(c, [255, 255, 255], 0.45));
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1]] as [number, number][]) if (!pm.get(x + dx, y + dy) || hash2(x + dx, y + dy, 7) < 0.5) pm.set(x + dx, y + dy, c, 150);
}

function shadow(pm: Pixmap, cx: number, cy: number, rx: number, ry: number): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1 && !pm.filled(x, y)) pm.set(x, y, [24, 20, 30], 70);
    }
  }
}

// Draws on a fresh layer, outlines it, then lays it over its shadow.
function compose(w: number, h: number, footX: number, footY: number, shadowR: [number, number], draw: (pm: Pixmap) => void): MonsterArt {
  const body = new Pixmap(w, h);
  draw(body);
  body.outline(OUTLINE);
  const pm = new Pixmap(w, h);
  shadow(pm, footX, footY, shadowR[0], shadowR[1]);
  pm.blit(body, 0, 0);
  return { pm, anchorX: footX, anchorY: footY };
}

// --------------------------------------------------------------- beasts

const FUR_DARK = ramp([86, 82, 100], 0.5);
const FUR_LIGHT = ramp([128, 122, 132], 0.5);
const BLIGHT_GLOW: RGB = [196, 96, 236];
const EMBER_EYE: RGB = [255, 74, 60];

// Le loup corrompu: lean, hackles up, the corruption showing in violet
// cracks along its flank, eyes like embers.
function corruptedWolf(): MonsterArt {
  return compose(40, 32, 20, 29, [15, 3], (pm) => {
    const fur = (x: number, y: number) => (noise(x, y * 2, 2, 11) - 0.5) * 0.5;
    // Far legs first, then the body over them.
    limb(pm, 27, 21, 28, 29, 2, FUR_DARK, -0.5);
    limb(pm, 12, 21, 12, 29, 2, FUR_DARK, -0.5);
    blob(pm, 31, 13, 2.5, 2, FUR_DARK, -0.1); // tail root
    limb(pm, 32, 13, 37, 8, 3, FUR_DARK, 0.1);
    blob(pm, 25, 18, 9, 6, FUR_DARK, 0, fur); // haunch and back
    blob(pm, 17, 17, 9, 6.5, FUR_DARK, 0.05, fur); // chest
    blob(pm, 14, 13, 5, 6, FUR_LIGHT, 0, fur); // ruff
    // Near legs.
    limb(pm, 23, 21, 22, 29, 3, FUR_DARK, 0.1);
    limb(pm, 16, 21, 16, 29, 3, FUR_DARK, 0.2);
    pm.hline(21, 23, 29, FUR_DARK[4]);
    pm.hline(15, 17, 29, FUR_DARK[4]);
    // Head, snout, ears.
    limb(pm, 8, 5, 6, 0, 3, FUR_DARK, 0.3);
    limb(pm, 14, 5, 15, 0, 3, FUR_DARK, -0.1);
    pm.set(6, 2, FUR_LIGHT[3]);
    pm.set(15, 2, FUR_LIGHT[3]);
    blob(pm, 11, 9, 6.5, 5.5, FUR_DARK, 0.1, fur);
    blob(pm, 6, 12, 4, 3, FUR_LIGHT, 0.15);
    blob(pm, 8, 14, 3, 1.5, FUR_LIGHT, 0.3); // jaw
    pm.set(2, 11, [30, 24, 30]);
    pm.set(3, 11, [30, 24, 30]);
    pm.set(2, 10, [60, 52, 60]);
    // Snarl: fangs, the dark mouth.
    pm.hline(4, 9, 13, [50, 20, 30]);
    pm.set(5, 14, [240, 232, 216]);
    pm.set(8, 14, [240, 232, 216]);
    pm.set(5, 12, [240, 232, 216]);
    eye(pm, 8, 8, EMBER_EYE);
    eye(pm, 12, 8, EMBER_EYE);
    pm.set(9, 7, FUR_DARK[4]); // brow
    pm.set(11, 7, FUR_DARK[4]);
    // Corruption: cracks of violet light across the flank.
    for (const [x0, y0, x1, y1] of [[20, 14, 24, 18], [24, 18, 22, 21], [26, 15, 29, 17]] as [number, number, number, number][]) {
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
      for (let i = 0; i <= n; i++) pm.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), BLIGHT_GLOW);
    }
  });
}

// ------------------------------------------------------------- undead

const WRAITH = ramp([108, 156, 160], 0.3);
const WRAITH_EYE: RGB = [170, 255, 240];

// Le spectre des marais: a drowned shape in tatters, fading into mist at
// the bottom, long arms reaching.
function bogWraith(): MonsterArt {
  const pm = new Pixmap(32, 40);
  const body = new Pixmap(32, 40);
  // The robe: wider toward the bottom, ragged hem.
  for (let y = 10; y <= 36; y++) {
    const t = (y - 10) / 26;
    const hw = 4 + t * 7 + Math.sin(y * 0.9) * 0.6;
    for (let x = Math.round(16 - hw); x <= Math.round(16 + hw); x++) {
      const nx = (x - 16) / hw;
      const rag = noise(x, 0, 2, 31) * 6;
      if (y > 30 + rag) continue;
      body.set(x, y, lit(WRAITH, -nx * 0.7 - t * 0.5 + 0.2 + (noise(x * 2, y, 2, 32) - 0.5) * 0.5));
    }
  }
  // Hood and the dark inside it.
  blob(body, 16, 9, 6, 6.5, WRAITH, 0.15);
  blob(body, 16, 10, 3.5, 4, ramp([30, 46, 52], 0.2), -0.6);
  // Arms reaching out, bony hands.
  limb(body, 10, 15, 4, 22, 2, WRAITH, 0.2);
  limb(body, 22, 15, 28, 21, 2, WRAITH, -0.2);
  for (const [x, y] of [[3, 23], [4, 24], [2, 22], [29, 22], [28, 23], [30, 21]] as [number, number][]) body.set(x, y, [196, 214, 200]);
  // Weeds caught in the rags.
  for (const [x, y] of [[12, 24], [12, 25], [19, 27], [20, 28], [15, 22]] as [number, number][]) body.set(x, y, [70, 110, 62]);
  body.outline(mix(OUTLINE, [40, 70, 80], 0.4));
  for (const x of [14, 17]) {
    body.set(x, 10, [240, 255, 252]);
    body.set(x + 1, 10, WRAITH_EYE);
    body.set(x, 11, [90, 170, 160]);
  }
  // Translucent: the whole body at partial alpha, the mist at the hem
  // fading out.
  for (let y = 0; y < 40; y++) {
    for (let x = 0; x < 32; x++) {
      const c = body.get(x, y);
      if (!c) continue;
      const fade = y > 26 ? Math.max(0, 1 - (y - 26) / 10) : 1;
      pm.set(x, y, c, Math.round(225 * fade));
    }
  }
  return { pm, anchorX: 16, anchorY: 37 };
}

// -------------------------------------------------------------- demons

const BLIGHT_FLESH = ramp([110, 62, 104], 0.6);
const BLIGHT_THORN = ramp([62, 44, 58], 0.3);

// Le rejeton corrompu: a heap of swollen violet flesh bristling with black
// thorns, veins glowing, one great eye.
function blightSpawn(): MonsterArt {
  return compose(36, 32, 18, 29, [14, 3], (pm) => {
    const lumps = (x: number, y: number) => (noise(x, y, 3, 41) - 0.5) * 0.6;
    blob(pm, 18, 20, 13, 9.5, BLIGHT_FLESH, 0, lumps);
    blob(pm, 11, 15, 6, 5.5, BLIGHT_FLESH, 0.1, lumps);
    blob(pm, 24, 14, 6.5, 6, BLIGHT_FLESH, 0, lumps);
    // Thorns.
    for (const [x0, y0, x1, y1] of [[8, 12, 4, 5], [13, 10, 13, 3], [22, 9, 25, 2], [28, 13, 33, 8], [30, 20, 35, 18], [5, 20, 1, 18]] as [number, number, number, number][]) {
      limb(pm, x0, y0, x1, y1, 2, BLIGHT_THORN, 0.1);
      pm.set(x1, y1, BLIGHT_THORN[0]);
    }
    // Glowing veins.
    for (const [x, y] of [[10, 22], [11, 23], [12, 23], [13, 24], [24, 21], [25, 22], [26, 22], [27, 23], [17, 25], [18, 26]] as [number, number][]) pm.set(x, y, BLIGHT_GLOW);
    // The eye, and a maw full of needles below it.
    blob(pm, 18, 15, 3.5, 3, ramp([236, 220, 160]), 0.2);
    pm.set(18, 15, [30, 10, 30]);
    pm.set(18, 14, [30, 10, 30]);
    pm.set(17, 15, [200, 40, 60]);
    for (let x = 12; x <= 24; x++) {
      const y = 21 + Math.round(Math.abs(x - 18) * -0.25);
      pm.set(x, y, [36, 10, 24]);
      pm.set(x, y + 1, [64, 18, 40]);
      if (x % 2 === 0) pm.set(x, y, [236, 226, 200]);
      if (x % 2 === 1 && x > 12 && x < 24) pm.set(x, y + 1, [236, 226, 200]);
    }
    // Short legs underneath.
    for (const x of [9, 15, 22, 27]) limb(pm, x, 26, x, 29, 2, BLIGHT_THORN, -0.2);
  });
}

// ------------------------------------------------------------ guardians

const SENTINEL_STONE = ramp([124, 124, 116], 0.4);
const SENTINEL_IRON = ramp([92, 96, 110], 0.4);
const RUNE: RGB = [120, 220, 255];

// La sentinelle corrompue: a guardian of stone and bound iron, a rune core
// in its chest, a halberd held across.
function corruptedSentinel(): MonsterArt {
  return compose(34, 42, 17, 39, [11, 3], (pm) => {
    const chips = (x: number, y: number) => (hash2(x >> 1, y >> 1, 51) - 0.5) * 0.35;
    // Legs.
    limb(pm, 13, 28, 12, 38, 4, SENTINEL_STONE, -0.2);
    limb(pm, 21, 28, 22, 38, 4, SENTINEL_STONE, -0.3);
    pm.hline(10, 15, 38, SENTINEL_IRON[3]);
    pm.hline(20, 25, 38, SENTINEL_IRON[3]);
    // Torso, shoulders, iron bands.
    blob(pm, 17, 21, 8, 9, SENTINEL_STONE, 0.05, chips);
    blob(pm, 8, 15, 4, 3.5, SENTINEL_IRON, 0.2);
    blob(pm, 26, 15, 4, 3.5, SENTINEL_IRON, -0.1);
    for (let x = 10; x <= 24; x++) pm.set(x, 25, lit(SENTINEL_IRON, (17 - x) / 10));
    // Arms; the halberd across the body.
    limb(pm, 7, 17, 6, 26, 3, SENTINEL_STONE, 0.1);
    limb(pm, 27, 17, 28, 26, 3, SENTINEL_STONE, -0.3);
    limb(pm, 4, 33, 30, 4, 1, ramp([120, 86, 56]), 0);
    for (let k = 0; k < 4; k++) pm.hline(28 - k, 31 + (k > 1 ? 0 : 1), 2 + k, lit(SENTINEL_IRON, 0.6 - k * 0.3));
    // Head: a helm with an eye slit.
    blob(pm, 17, 9, 5, 5, SENTINEL_IRON, 0.1);
    pm.hline(14, 20, 9, [24, 22, 30]);
    eye(pm, 15, 9, RUNE);
    eye(pm, 19, 9, RUNE);
    // The rune core, cracked with corruption.
    pm.set(17, 19, RUNE);
    pm.set(16, 20, RUNE);
    pm.set(18, 20, RUNE);
    pm.set(17, 21, RUNE);
    pm.set(17, 20, [230, 250, 255]);
    pm.set(19, 18, BLIGHT_GLOW);
    pm.set(20, 17, BLIGHT_GLOW);
  });
}

// ------------------------------------------------------ combat portraits
// The same monsters, large and detailed, for the combat screen (shown at
// about 64-72 game pixels): more shading steps, texture, a rim of light,
// glowing eyes with a halo.

function halo(pm: Pixmap, cx: number, cy: number, r: number, c: RGB, alpha: number): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d >= 1 || !pm.inside(x, y)) continue;
      const base = pm.get(x, y);
      const k = (1 - d) * (1 - d) * (alpha / 255);
      if (base) pm.set(x, y, mix(base, c, k));
      else pm.set(x, y, c, Math.round(k * 255));
    }
  }
}

function crack(pm: Pixmap, pts: [number, number][], c: RGB): void {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let k = 0; k <= n; k++) pm.set(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), c);
  }
}

// The corrupted wolf stalking towards the hero: three quarters, head low
// under the withers and facing out of the picture, the body going back
// and up to the left (its hindquarters further away, so smaller and
// higher), the coat broken by patches of blight.
function wolfPortrait(): MonsterArt {
  const W = 72;
  const H = 64;
  const body = new Pixmap(W, H);
  const coat = ramp([104, 100, 116], 0.5);
  const deep = ramp([66, 60, 78], 0.5);
  const pale = ramp([150, 146, 160], 0.4);
  // Legs and underside go dark, nearly violet: the light is on the back.
  const leg = ramp([70, 60, 86], 0.4);
  const farLeg = ramp([50, 42, 64], 0.4);
  const down = Math.PI / 2;
  const fur = (pts: Pt[], r: Ramp, o: FurOpts) => furPart(body, pts, r, o);
  // Far legs and the tail, in shadow.
  fur([[7, 22], [11, 24], [10.5, 33], [9.5, 40], [9.5, 47], [10.5, 50], [5.5, 50], [6.5, 46], [6.5, 38], [6, 30]], farLeg, { round: 2, dir: down, tufts: 0.3, seed: 3 });
  fur([[38, 40], [43, 40], [42, 48], [41.5, 53], [42.5, 56], [38, 56], [38.5, 52], [38, 46]], farLeg, { round: 2, dir: down, tufts: 0.3, seed: 5 });
  // The body.
  fur([[42, 16], [34, 12], [24, 9], [15, 8], [8, 10], [4, 16], [5, 22], [9, 26], [18, 27], [28, 31], [38, 38], [48, 42], [54, 36], [50, 24]], coat, { round: 9, dir: Math.PI, tufts: 0.6, seed: 6, clump: 0.28 });
  // The tail hangs low off the rump, bushy.
  for (const [x, y] of [[10, 9], [8, 12], [7, 16], [6, 20], [6, 24], [6, 28], [5, 32]] as [number, number][]) body.set(x, y, deep[4]); // the seam
  fur([[9, 8], [4, 11], [1, 17], [0, 26], [1, 34], [3, 38], [5, 31], [5, 23], [8, 16], [12, 12]], deep, { round: 3, dir: 1.9, tufts: 0.8, seed: 4, bias: 0.15 });
  // Muscle under the coat: the shoulder and the haunch catch the light.
  fur([[36, 14], [44, 16], [48, 24], [46, 32], [40, 34], [35, 27]], coat, { round: 5, dir: down, tufts: 0, seed: 21, bias: 0.3, clump: 0.25 });
  fur([[13, 10], [22, 10], [24, 16], [21, 21], [15, 21], [11, 16]], coat, { round: 5, dir: Math.PI, tufts: 0, seed: 22, bias: 0.25, clump: 0.25 });
  // Hackles up along the spine.
  for (let x = 13; x <= 42; x += 3) {
    const top = 8 + (x - 13) * 0.26;
    fur([[x - 1, top + 3], [x + 1.4, top - 2.8], [x + 3, top + 3]], coat, { round: 1, dir: -down, tufts: 0, seed: x, bias: 0.25 });
  }
  // The belly in shadow.
  for (let y = 20; y <= 47; y++) for (let x = 4; x <= 50; x++) {
    const c = body.get(x, y);
    if (c && !body.filled(x, y + 3)) body.set(x, y, mix(c, farLeg[3], body.filled(x, y + 1) && body.filled(x, y + 2) ? 0.35 : 0.65));
  }
  // Near hind leg: thigh, the knee forward, the hock back, the paw.
  fur([[13, 14], [21, 14], [25, 21], [24, 29], [21, 35], [20.5, 45], [22.5, 51], [18, 51], [18.5, 44], [16, 35], [12, 28], [10, 21]], leg, { round: 4, dir: down, tufts: 0.4, seed: 8 });
  // The ruff, thick round the neck, a pale bib.
  fur([[40, 18], [48, 16], [58, 20], [64, 28], [64, 38], [60, 46], [52, 50], [44, 48], [38, 38], [37, 26]], coat, { round: 6, dir: down, tufts: 0.8, seed: 9, bias: 0.1 });
  // The chest falls into shadow towards the legs.
  for (let y = 36; y <= 52; y++) for (let x = 36; x <= 66; x++) {
    const c = body.get(x, y);
    if (c) body.set(x, y, mix(c, farLeg[3], Math.min(0.7, (y - 36) / 18)));
  }
  fur([[50, 42], [57, 42], [56, 47], [53, 49], [49, 46]], pale, { round: 3, dir: down, tufts: 0.8, seed: 19, bias: -0.3 });
  // Near foreleg, stepping out.
  fur([[50, 44], [56, 44], [55.5, 51], [56, 56], [57, 58], [52, 58], [52, 55], [50.5, 50]], leg, { round: 3, dir: down, tufts: 0.3, seed: 10, bias: 0.05 });
  // Paws: broader than the leg, the toes split.
  for (const [px0, py, near] of [[50.5, 58, true], [17, 51, true], [36.5, 55, false], [4, 48, false]] as [number, number, boolean][]) {
    const r = near ? leg : farLeg;
    fur([[px0, py], [px0 + 7.4, py], [px0 + 8, py + 3.2], [px0 - 0.6, py + 3.2]], r, { round: 1.5, dir: down, tufts: 0, seed: px0, bias: 0.1 });
    for (const dx of [2.6, 5.2]) body.set(Math.round(px0 + dx), py + 3, r[4]);
  }
  // Head: ears up, the skull, cheeks of fur, the muzzle coming at us.
  const hy = 8; // the head hangs this much lower than a standing wolf's
  const at = (pts: [number, number][]): Pt[] => pts.map(([x, y]) => [x, y + hy]);
  fur(at([[45, 16], [46, 3], [52, 10]]), coat, { round: 2, dir: -down, tufts: 0.2, seed: 11, bias: 0.15 });
  fur(at([[58, 10], [64, 3], [65, 16]]), deep, { round: 2, dir: -down, tufts: 0.2, seed: 12 });
  fur(at([[46, 14], [51, 9], [59, 9], [64, 14], [65, 22], [63, 28], [57, 34], [52, 34], [47, 28], [45, 21]]), coat, { round: 5, dir: Math.PI * 0.75, tufts: 0.5, seed: 13, clump: 0.3, bias: -0.1 });
  fur(at([[44, 20], [48, 22], [49, 30], [45, 29]]), pale, { round: 2, dir: 2.4, tufts: 0.9, seed: 14 });
  fur(at([[66, 19], [62, 22], [62, 29], [67, 27]]), pale, { round: 2, dir: 0.7, tufts: 0.9, seed: 15, bias: -0.2 });
  fur(at([[52, 22], [59, 22], [60.5, 28], [58, 32.5], [53, 32.5], [50.5, 28]]), coat, { round: 3, dir: down, tufts: 0, seed: 16, clump: 0.2, bias: 0.25 });
  const dot = (pts: [number, number][], c: RGB) => { for (const [x, y] of pts) body.set(x, y + hy, c); };
  // The head's shadow on the ruff, under the jaw.
  for (let x = 48; x <= 62; x++) for (let y = 34 + hy; y <= 36 + hy; y++) {
    const c = body.get(x, y);
    if (c && !(y === 34 + hy && x > 52 && x < 58)) body.set(x, y, mix(c, farLeg[4], 0.5));
  }
  dot([[51, 28], [52, 29], [52, 30], [59, 28], [59, 29], [58, 30], [54, 23], [55, 24], [56, 24]], pale[1]); // pale lips, the bridge in the light
  dot([[47, 8], [47, 9], [48, 10], [48, 11], [62, 8], [62, 9], [61, 10], [61, 11]], [96, 70, 88]); // inside the ears
  // The mask: dark round the eyes, a dark blaze down the brow, pale brows.
  dot([[48, 19], [49, 19], [50, 18], [51, 19], [52, 20], [48, 20], [57, 20], [58, 19], [59, 18], [60, 19], [61, 19], [61, 20], [54, 11], [55, 11], [54, 12], [55, 12], [54, 13], [55, 14], [54, 15], [55, 16], [54, 17]], [56, 50, 66]);
  dot([[49, 17], [50, 16], [51, 16], [58, 16], [59, 16], [60, 17]], pale[0]);
  // Nose, and the lips drawn back off the fangs.
  dot([[54, 29], [56, 29], [57, 29], [54, 30], [55, 30], [56, 30], [57, 30], [55, 31], [56, 31]], [34, 28, 40]);
  dot([[55, 29]], [96, 90, 106]);
  dot([[53, 32], [54, 32], [55, 32], [56, 32], [57, 32], [58, 32]], [86, 24, 40]);
  dot([[53, 32], [58, 32], [53, 33], [58, 33]], [244, 238, 222]);
  dot([[55, 32], [56, 32]], [230, 224, 210]);
  // Claws.
  for (const [x, y] of [[52, 61], [54, 61], [56, 61], [18, 54], [20, 54], [22, 54], [38, 58], [41, 58], [5, 51], [8, 51]] as [number, number][]) body.set(x, y, [214, 208, 196]);
  // Blight: dark violet patches eating the coat, veins glowing in them.
  const blight = ramp([56, 38, 74], 0.4);
  for (let y = 0; y < 34; y++) for (let x = 0; x < 44; x++) {
    const c = body.get(x, y);
    if (!c || (x < 8 && y > 12)) continue;
    const n = noise(x * 0.45, y * 1.7, 4, 77) + (noise(x * 0.6, y * 2, 1.5, 78) - 0.5) * 0.3;
    if (n > 0.68) {
      const lum = (c[0] + c[1] + c[2]) / 3;
      body.set(x, y, lum > 140 ? blight[1] : lum > 110 ? blight[2] : lum > 85 ? blight[3] : blight[4]);
    }
  }
  crack(body, [[20, 14], [24, 18], [23, 23], [27, 27]], BLIGHT_GLOW);
  crack(body, [[32, 14], [35, 18], [39, 19]], BLIGHT_GLOW);
  crack(body, [[10, 20], [12, 25]], BLIGHT_GLOW);
  // Rim light where the light from the top left meets the edge.
  const rim: [number, number][] = [];
  for (let y = 1; y < H; y++) for (let x = 1; x < W; x++) if (body.filled(x, y) && !body.filled(x, y - 1) && !body.filled(x - 1, y - 1)) rim.push([x, y]);
  for (const [x, y] of rim) body.set(x, y, mix(body.get(x, y)!, [214, 210, 226], 0.45));
  body.outline(OUTLINE);
  // Eyes last, glowing over everything.
  for (const [ex, ey] of [[50, 20 + hy], [59, 20 + hy]] as [number, number][]) {
    halo(body, ex + 0.5, ey + 0.5, 3.5, EMBER_EYE, 150);
    body.set(ex, ey, [255, 236, 210]);
    body.set(ex + 1, ey, EMBER_EYE);
  }
  halo(body, 24, 20, 7, BLIGHT_GLOW, 60);
  const pm = new Pixmap(W, H);
  shadow(pm, 34, 60, 32, 3);
  pm.blit(body, 0, 0);
  return { pm, anchorX: 34, anchorY: 61 };
}

function sentinelPortrait(): MonsterArt {
  const W = 56;
  const H = 72;
  const body = new Pixmap(W, H);
  const stone = (x: number, y: number) => {
    const c = cellNoise(x, y);
    return c;
  };
  const shaft = ramp([124, 88, 56]);
  // Legs: stone pillars, iron greaves and feet.
  part(body, [[16, 46], [25, 46], [24, 64], [26, 69], [13, 69], [15, 63]], SENTINEL_STONE, { round: 3, tex: stone });
  part(body, [[31, 46], [40, 46], [41, 63], [43, 69], [30, 69], [32, 64]], SENTINEL_STONE, { round: 3, tex: stone, bias: -0.15 });
  part(body, [[14, 58], [25, 58], [25, 63], [14, 63]], SENTINEL_IRON, { round: 2 });
  part(body, [[31, 58], [42, 58], [42, 63], [31, 63]], SENTINEL_IRON, { round: 2, bias: -0.1 });
  // Torso: a broad block narrowing to the waist, a belt of iron.
  part(body, [[12, 22], [44, 22], [42, 38], [38, 48], [18, 48], [14, 38]], SENTINEL_STONE, { round: 6, tex: stone });
  part(body, [[15, 42], [41, 42], [40, 46], [16, 46]], SENTINEL_IRON, { round: 2 });
  // Pauldrons.
  part(body, [[3, 22], [8, 15], [17, 15], [20, 22], [16, 28], [5, 28]], SENTINEL_IRON, { round: 4, bias: 0.1 });
  part(body, [[36, 22], [39, 15], [48, 15], [53, 22], [51, 28], [40, 28]], SENTINEL_IRON, { round: 4, bias: -0.05 });
  // Arms.
  part(body, [[5, 27], [13, 27], [12, 42], [6, 42]], SENTINEL_STONE, { round: 3, tex: stone });
  part(body, [[43, 27], [51, 27], [50, 42], [44, 42]], SENTINEL_STONE, { round: 3, tex: stone, bias: -0.2 });
  // The halberd: shaft across, axe blade and spike at the top.
  limb(body, 3, 63, 49, 7, 2, shaft, 0.1);
  part(body, [[44, 3], [51, 1], [55, 5], [54, 12], [48, 13], [46, 8]], SENTINEL_IRON, { round: 2, bias: 0.2 });
  part(body, [[48, 2], [50, -1], [52, 3]], SENTINEL_IRON, { round: 1, bias: 0.4 });
  // Fists closing on the shaft.
  part(body, [[5, 41], [13, 41], [13, 47], [5, 47]], SENTINEL_STONE, { round: 2, tex: stone });
  part(body, [[43, 41], [51, 41], [51, 47], [43, 47]], SENTINEL_STONE, { round: 2, tex: stone, bias: -0.2 });
  // Head: a great helm with its crest and slit.
  part(body, [[20, 20], [19, 9], [23, 4], [33, 4], [37, 9], [36, 20]], SENTINEL_IRON, { round: 4, bias: 0.05 });
  part(body, [[27, 4], [28, 0], [29, 4]], SENTINEL_IRON, { round: 1, bias: 0.3 });
  body.hline(21, 35, 12, [20, 18, 26]);
  body.hline(22, 34, 13, [20, 18, 26]);
  body.vline(28, 14, 19, SENTINEL_IRON[3]);
  // Moss in the joints.
  for (const [x, y] of [[16, 47], [17, 48], [39, 47], [14, 30], [41, 34], [25, 23]] as [number, number][]) body.set(x, y, [92, 134, 70]);
  // Corruption creeping from the core.
  crack(body, [[31, 30], [35, 26], [39, 24]], BLIGHT_GLOW);
  crack(body, [[25, 35], [21, 39]], BLIGHT_GLOW);
  body.outline(OUTLINE);
  for (const x of [24, 32]) {
    halo(body, x + 0.5, 12.5, 4, RUNE, 150);
    body.set(x, 12, [230, 250, 255]);
  }
  halo(body, 28, 32, 7, RUNE, 130);
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0, 2], [0, -2], [2, 0], [-2, 0]] as [number, number][]) body.set(28 + dx, 32 + dy, dx === 0 && dy === 0 ? [240, 252, 255] : RUNE);
  const pm = new Pixmap(W, H);
  shadow(pm, 28, 69, 20, 3);
  pm.blit(body, 0, 0);
  return { pm, anchorX: 28, anchorY: 69 };
}

// Dressed stone: blocks with dark joints.
function cellNoise(x: number, y: number): number {
  const by = Math.floor(y / 5);
  const bx = Math.floor((x + (by % 2) * 3) / 7);
  const joint = y % 5 === 0 || (x + (by % 2) * 3) % 7 === 0;
  return joint ? -0.45 : (hash2(bx, by, 72) - 0.5) * 0.35;
}

export const MONSTER_PORTRAITS: Record<string, () => MonsterArt> = {
  corrupted_wolf: wolfPortrait,
  corrupted_sentinel: sentinelPortrait,
};

export const DRAWN_MONSTERS: Record<string, () => MonsterArt> = {
  corrupted_wolf: corruptedWolf,
  bog_wraith: bogWraith,
  blight_spawn: blightSpawn,
  corrupted_sentinel: corruptedSentinel,
};

export function renderMonster(id: string): MonsterArt | undefined {
  return DRAWN_MONSTERS[id]?.();
}
