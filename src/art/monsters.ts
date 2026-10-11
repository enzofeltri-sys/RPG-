// The monsters of Vaeloria, drawn by the game like the rest of the world
// (pixmap.ts, the props' and paper doll's shading): light from the top
// left, five-tone ramps, a dark outline. Seen from the front three
// quarters, standing on the bottom of their frame. One frame per monster
// for now (combat shows it at twice the size).

import { OUTLINE, Pixmap, RGB, Ramp, hash2, lit, mix, noise, ramp } from './pixmap';
import { LIGHT as L, part } from './shape';

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

function wolfPortrait(): MonsterArt {
  const W = 72;
  const H = 60;
  const body = new Pixmap(W, H);
  const fur = (x: number, y: number) => (noise(x * 0.8, y * 2, 2, 61) - 0.5) * 0.45;
  const deep = ramp([62, 58, 74], 0.5);
  // Far legs and tail first.
  part(body, [[27, 40], [31, 40], [30, 48], [31, 55], [33, 57], [27, 57], [27, 50]], deep, { round: 2, tex: fur });
  part(body, [[43, 33], [50, 32], [51, 40], [48, 46], [49, 54], [51, 57], [45, 57], [45, 49], [44, 43]], deep, { round: 2, tex: fur });
  // The tail hangs low, bushy, its tip pale.
  part(body, [[56, 24], [62, 25], [67, 29], [69, 36], [68, 43], [64, 47], [63, 40], [60, 33], [56, 29]], FUR_DARK, { round: 4, tex: fur });
  part(body, [[63, 41], [68, 41], [67, 45], [64, 47]], FUR_LIGHT, { round: 2, tex: fur });
  // The body: chest forward, back, haunch, belly tucked.
  part(body, [[15, 31], [21, 24], [30, 21], [42, 21], [52, 22], [59, 25], [61, 31], [58, 37], [50, 37], [43, 35], [35, 38], [27, 44], [18, 42]], FUR_DARK, { round: 7, tex: fur });
  // Hackles: a jagged ridge of fur along the neck and back.
  for (let x = 20; x <= 44; x += 3) {
    const top = x < 30 ? 24 - (x - 20) * 0.3 : 21;
    part(body, [[x, top + 2], [x + 1.5, top - 3], [x + 3, top + 2]], FUR_DARK, { round: 1, bias: 0.2 });
  }
  // Ruff and chest.
  part(body, [[14, 31], [20, 26], [25, 30], [24, 42], [18, 44], [14, 40]], FUR_LIGHT, { round: 4, tex: fur });
  // Near legs: shoulder, foreleg, paw; thigh, hock, paw.
  part(body, [[18, 37], [25, 37], [24, 47], [23, 52], [25, 56], [27, 58], [19, 58], [19, 52], [18, 46]], FUR_DARK, { round: 3, tex: fur });
  // The hind leg: thigh, the knee forward, the hock back, the paw under.
  part(body, [[50, 28], [60, 28], [62, 34], [61, 42], [58, 48], [57, 55], [59, 58], [51, 58], [52, 55], [53, 49], [52, 44], [48, 38]], FUR_DARK, { round: 4, tex: fur });
  for (const x of [19, 51]) for (const dx of [1, 3, 5, 7]) body.set(x + dx, 58, [232, 228, 216]);
  // Head: low and forward, ears back, jaws open.
  part(body, [[11, 14], [12, 3], [17, 12]], FUR_DARK, { round: 1.5, bias: 0.1 });
  part(body, [[16, 13], [19, 4], [22, 14]], deep, { round: 1.5 });
  body.set(13, 7, [120, 70, 80]); // inside the ear
  // Skull, the stop at the brow, a long muzzle narrowing to the nose.
  part(body, [[24, 25], [22, 16], [17, 11], [11, 12], [8, 15], [2, 18], [0, 20], [1, 22], [6, 24], [12, 25], [18, 28], [22, 31]], FUR_DARK, { round: 4, tex: fur });
  part(body, [[1, 19], [7, 17], [11, 19], [11, 24], [5, 24], [0, 22]], FUR_LIGHT, { round: 2, bias: 0.15 }); // muzzle
  part(body, [[3, 26], [12, 26], [18, 29], [13, 32], [6, 29]], FUR_DARK, { round: 2, bias: -0.1 }); // lower jaw, dropped
  // Mouth: gums and teeth, the fangs longer.
  for (let x = 2; x <= 16; x++) {
    body.set(x, 24, [56, 16, 28]);
    body.set(x, 25, [120, 36, 52]);
  }
  for (const x of [4, 8, 12, 15]) body.set(x, 24, [246, 240, 226]);
  for (const x of [6, 10, 14]) body.set(x, 25, [246, 240, 226]);
  body.set(4, 25, [246, 240, 226]);
  body.set(5, 26, [246, 240, 226]);
  body.set(0, 19, [24, 18, 24]);
  body.set(1, 19, [24, 18, 24]);
  body.set(0, 18, [70, 64, 76]);
  body.hline(9, 13, 16, FUR_DARK[4]); // brow
  for (const [x, y] of [[4, 21], [6, 21], [8, 22]] as [number, number][]) body.set(x, y, FUR_DARK[3]); // a snarl's wrinkles
  // Corruption: veins of violet light across shoulder and flank.
  crack(body, [[30, 26], [34, 30], [32, 35], [36, 39]], BLIGHT_GLOW);
  crack(body, [[44, 25], [48, 29], [53, 28]], BLIGHT_GLOW);
  crack(body, [[19, 33], [22, 37]], BLIGHT_GLOW);
  body.outline(OUTLINE);
  halo(body, 12.5, 17.5, 4.5, EMBER_EYE, 150);
  body.set(12, 17, [255, 236, 210]);
  body.set(13, 17, EMBER_EYE);
  body.set(11, 17, [160, 30, 30]);
  halo(body, 33, 31, 7, BLIGHT_GLOW, 70);
  const pm = new Pixmap(W, H);
  shadow(pm, 38, 58, 30, 3);
  pm.blit(body, 0, 0);
  return { pm, anchorX: 38, anchorY: 58 };
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
