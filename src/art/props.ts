// Decor drawn by the game: trees, bushes, rocks, chests, stalls, wells,
// fences… Same palette and outline as the heroes and buildings. Each
// prop comes with an anchor: the point that sits on the ground at the
// prop's position (bottom center for upright props, center for flat ones).

import { OUTLINE, Pixmap, RGB, Tones, hash2, noise } from './pixmap';
import { renderGround } from './ground';

export interface PropArt {
  pm: Pixmap;
  anchorX: number;
  anchorY: number;
}

const LEAF: Tones = [
  [134, 196, 88],
  [86, 150, 66],
  [48, 100, 56],
];
const LEAF_DARK: RGB = [36, 74, 48];
const PINE: Tones = [
  [96, 160, 104],
  [56, 116, 82],
  [32, 76, 62],
];
const BARK: Tones = [
  [150, 104, 68],
  [110, 74, 48],
  [72, 48, 36],
];
const STONE: Tones = [
  [196, 194, 188],
  [150, 148, 148],
  [100, 98, 106],
];
const WOOD: Tones = [
  [188, 136, 86],
  [146, 98, 60],
  [96, 62, 40],
];
const IRON: Tones = [
  [196, 200, 210],
  [138, 142, 158],
  [86, 90, 108],
];
const GOLD: Tones = [
  [252, 236, 140],
  [238, 188, 60],
  [172, 112, 30],
];
const STRAW: Tones = [
  [240, 210, 128],
  [208, 168, 88],
  [156, 114, 60],
];
const RED: Tones = [
  [244, 118, 104],
  [198, 52, 58],
  [122, 28, 44],
];
const WHITE: RGB = [248, 246, 236];
const SHADOW: RGB = [24, 30, 20];


// Light from the top left: shade a round volume by its normal.
function shade(t: Tones, dx: number, dy: number, grain = 0): RGB {
  const lit = -dx * 0.6 - dy * 0.8 + grain;
  if (lit > 0.45) return t[0];
  if (lit < -0.35) return t[2];
  return t[1];
}

function groundShadow(pm: Pixmap, cx: number, cy: number, rx: number, ry: number): void {
  pm.ellipse(Math.round(cx - rx), Math.round(cy - ry), Math.round(rx * 2), Math.round(ry * 2), () => SHADOW);
  // Soften: shadows are drawn translucent by retinting their alpha.
  for (let y = 0; y < pm.h; y++) {
    for (let x = 0; x < pm.w; x++) {
      const o = (y * pm.w + x) * 4;
      if (pm.data[o] === SHADOW[0] && pm.data[o + 1] === SHADOW[1] && pm.data[o + 2] === SHADOW[2]) pm.data[o + 3] = 80;
    }
  }
}

// ------------------------------------------------------------------ plants

function tree(size: number, seed: number): PropArt {
  const W = size + 4;
  const trunkH = Math.round(size * 0.3);
  const H = size + trunkH;
  const canopy = new Pixmap(W, H);
  // Canopy: overlapping leaf clumps.
  const clumps: [number, number, number][] = [
    [0.5, 0.42, 0.42],
    [0.3, 0.55, 0.3],
    [0.7, 0.55, 0.3],
    [0.5, 0.25, 0.3],
    [0.35, 0.3, 0.25],
    [0.65, 0.32, 0.25],
  ];
  const cx0 = W / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < W; x++) {
      let best = Infinity;
      let nx = 0;
      let ny = 0;
      clumps.forEach(([u, v, r]) => {
        const dx = (x - u * W) / (r * size);
        const dy = (y - v * size) / (r * size);
        const d = dx * dx + dy * dy;
        if (d < best) {
          best = d;
          nx = dx;
          ny = dy;
        }
      });
      if (best > 1) continue;
      const grain = (noise(x, y, 3, seed) - 0.5) * 0.7;
      let c = shade(LEAF, nx, ny, grain);
      if (best > 0.8 && ny > 0.2) c = LEAF_DARK;
      canopy.set(x, y, c);
    }
  }
  // Trunk and roots below the canopy.
  const pm = new Pixmap(W, H);
  groundShadow(pm, cx0, H - 2, size * 0.36, 3);
  const tx = Math.round(cx0) - 2;
  for (let y = size - 6; y < H - 1; y++) {
    pm.set(tx, y, BARK[0]);
    pm.set(tx + 1, y, BARK[1]);
    pm.set(tx + 2, y, BARK[1]);
    pm.set(tx + 3, y, BARK[2]);
  }
  pm.set(tx - 1, H - 2, BARK[1]);
  pm.set(tx + 4, H - 2, BARK[2]);
  pm.blit(canopy, 0, 0);
  // Outline everything except the shadow.
  outlineOpaque(pm);
  return { pm, anchorX: Math.round(cx0), anchorY: H - 2 };
}

function pine(size: number, seed: number): PropArt {
  const W = Math.round(size * 0.8) + 4;
  const H = size + 6;
  const pm = new Pixmap(W, H);
  groundShadow(pm, W / 2, H - 2, W * 0.3, 2);
  const cx = W / 2 - 0.5;
  for (let y = H - 7; y < H - 1; y++) for (let x = Math.round(cx) - 1; x <= Math.round(cx) + 1; x++) pm.set(x, y, x <= cx ? BARK[1] : BARK[2]);
  const tiers = 3;
  for (let t = 0; t < tiers; t++) {
    const top = Math.round((t * (size - 6)) / (tiers + 0.5));
    const bottom = Math.round(top + (size - 6) * 0.55);
    for (let y = top; y <= bottom; y++) {
      const half = ((y - top) / (bottom - top)) * (W / 2 - 2) * (0.6 + 0.4 * ((t + 1) / tiers));
      for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
        const dx = (x - cx) / Math.max(1, half);
        let c = shade(PINE, dx, (y - bottom) / 6, (hash2(x, y, seed) - 0.5) * 0.4);
        if (y === bottom || y === bottom - 1) c = PINE[2];
        pm.set(x, y, c);
      }
    }
  }
  outlineOpaque(pm);
  return { pm, anchorX: Math.round(W / 2), anchorY: H - 2 };
}

function bush(w: number, seed: number, berries = false): PropArt {
  const H = Math.round(w * 0.75) + 2;
  const pm = new Pixmap(w + 2, H);
  groundShadow(pm, (w + 2) / 2, H - 2, w * 0.45, 2);
  const blob = new Pixmap(w + 2, H);
  blob.ellipse(1, 0, w, H - 2, (dx, dy) => shade(LEAF, dx, dy, (noise(dx * 9, dy * 9, 2, seed) - 0.5) * 0.6));
  if (berries) for (let i = 0; i < 5; i++) blob.set(3 + Math.floor(hash2(i, 1, seed) * (w - 4)), 2 + Math.floor(hash2(i, 2, seed) * (H - 6)), RED[1]);
  pm.blit(blob, 0, 0);
  outlineOpaque(pm);
  return { pm, anchorX: Math.round((w + 2) / 2), anchorY: H - 2 };
}

function mushroom(): PropArt {
  const pm = new Pixmap(12, 12);
  groundShadow(pm, 6, 10, 4, 1.5);
  pm.rect(5, 6, 3, 4, WHITE);
  pm.vline(7, 6, 9, [210, 204, 190]);
  pm.ellipse(1, 1, 10, 7, (dx, dy) => shade(RED, dx, dy));
  pm.set(4, 3, WHITE);
  pm.set(7, 2, WHITE);
  pm.set(8, 4, WHITE);
  outlineOpaque(pm);
  return { pm, anchorX: 6, anchorY: 10 };
}

// ------------------------------------------------------------------ stones

function rock(w: number, seed: number): PropArt {
  const H = Math.round(w * 0.7) + 2;
  const pm = new Pixmap(w + 2, H);
  groundShadow(pm, (w + 2) / 2, H - 2, w * 0.5, 2);
  const blob = new Pixmap(w + 2, H);
  blob.ellipse(1, 0, w, H - 2, (dx, dy) => {
    if (dy > 0.75 && Math.abs(dx) > 0.5) return undefined; // flatter base
    return shade(STONE, dx, dy, (hash2(Math.round(dx * 9), Math.round(dy * 9), seed) - 0.5) * 0.3);
  });
  // A crack.
  const cx = Math.round(w * 0.45);
  for (let i = 0; i < Math.round(H * 0.4); i++) blob.set(cx + (i % 2), 2 + i, STONE[2]);
  pm.blit(blob, 0, 0);
  outlineOpaque(pm);
  return { pm, anchorX: Math.round((w + 2) / 2), anchorY: H - 2 };
}

function crystal(): PropArt {
  const pm = new Pixmap(12, 16);
  const C: Tones = [
    [210, 250, 255],
    [120, 214, 236],
    [60, 140, 190],
  ];
  const shard = (x: number, top: number, h: number) => {
    for (let y = top; y < top + h; y++) {
      const half = y - top < 2 ? 0 : 1;
      for (let i = -half; i <= half; i++) pm.set(x + i, y, i < 0 ? C[0] : i > 0 ? C[2] : C[1]);
    }
  };
  shard(6, 1, 13);
  shard(3, 6, 8);
  shard(9, 5, 9);
  pm.set(6, 3, [255, 255, 255]);
  outlineOpaque(pm);
  return { pm, anchorX: 6, anchorY: 14 };
}

// ------------------------------------------------------------------ objects

function chest(open: boolean): PropArt {
  const pm = new Pixmap(16, 15);
  groundShadow(pm, 8, 13, 7, 1.5);
  const top = open ? 5 : 4;
  // Body.
  for (let y = top + 3; y < 13; y++) for (let x = 1; x < 15; x++) pm.set(x, y, x === 1 ? WOOD[0] : x === 14 ? WOOD[2] : WOOD[1]);
  pm.vline(4, top + 3, 12, IRON[1]);
  pm.vline(11, top + 3, 12, IRON[1]);
  if (open) {
    // Lid thrown back, dark inside, a glint of gold.
    pm.rect(1, 0, 14, 4, WOOD[2]);
    pm.hline(1, 14, 0, WOOD[1]);
    pm.rect(2, top + 1, 12, 3, [40, 28, 26]);
    pm.set(6, top + 2, GOLD[0]);
    pm.set(9, top + 2, GOLD[1]);
  } else {
    for (let y = top; y < top + 3; y++) for (let x = 1; x < 15; x++) pm.set(x, y, y === top ? WOOD[0] : WOOD[1]);
    pm.vline(4, top, top + 2, IRON[0]);
    pm.vline(11, top, top + 2, IRON[0]);
    pm.hline(1, 14, top + 3, WOOD[2]);
    pm.rect(7, top + 2, 2, 3, GOLD[1]);
    pm.set(7, top + 2, GOLD[0]);
  }
  outlineOpaque(pm);
  return { pm, anchorX: 8, anchorY: 13 };
}

function stall(w: number, canopy: Tones): PropArt {
  const H = Math.round(w * 0.8);
  const pm = new Pixmap(w, H);
  groundShadow(pm, w / 2, H - 2, w * 0.45, 2);
  const counterTop = Math.round(H * 0.55);
  // Posts.
  pm.vline(2, 4, H - 2, WOOD[1]);
  pm.vline(w - 3, 4, H - 2, WOOD[2]);
  // Counter with goods.
  pm.rect(1, counterTop, w - 2, H - counterTop - 2, WOOD[1]);
  pm.hline(1, w - 2, counterTop, WOOD[0]);
  const goods: RGB[] = [
    [220, 80, 70],
    [240, 200, 90],
    [120, 180, 90],
    [200, 140, 80],
  ];
  for (let x = 3; x < w - 3; x += 2) pm.set(x, counterTop - 1, goods[Math.floor(hash2(x, 3, w) * goods.length)]);
  // Striped canopy.
  for (let y = 0; y < Math.round(H * 0.35); y++) {
    for (let x = 0; x < w; x++) {
      const stripe = Math.floor(x / 4) % 2 === 0;
      let c: RGB = stripe ? canopy[1] : WHITE;
      if (y === 0) c = stripe ? canopy[0] : WHITE;
      if (y === Math.round(H * 0.35) - 1) c = stripe ? canopy[2] : [210, 206, 196];
      pm.set(x, y, c);
    }
  }
  outlineOpaque(pm);
  return { pm, anchorX: Math.round(w / 2), anchorY: H - 2 };
}

function well(): PropArt {
  const pm = new Pixmap(24, 28);
  groundShadow(pm, 12, 26, 10, 2);
  // Stone ring.
  pm.ellipse(2, 16, 20, 11, (dx, dy) => (dx * dx + dy * dy < 0.35 ? [30, 44, 60] : shade(STONE, dx, dy)));
  // Posts and little roof.
  pm.vline(3, 6, 20, WOOD[1]);
  pm.vline(20, 6, 20, WOOD[2]);
  for (let y = 0; y < 7; y++) {
    const ins = 6 - y;
    for (let x = 1 + Math.max(0, ins - 3); x <= 22 - Math.max(0, ins - 3); x++) pm.set(x, y, y === 6 ? [120, 44, 46] : y % 2 ? [180, 74, 62] : [222, 112, 88]);
  }
  pm.hline(4, 19, 9, WOOD[2]); // windlass
  pm.vline(12, 10, 15, [120, 110, 100]); // rope
  pm.rect(11, 15, 3, 3, WOOD[1]); // bucket
  outlineOpaque(pm);
  return { pm, anchorX: 12, anchorY: 26 };
}

function wagon(): PropArt {
  const pm = new Pixmap(28, 20);
  groundShadow(pm, 14, 18, 13, 2);
  pm.rect(2, 6, 22, 7, WOOD[1]);
  pm.hline(2, 23, 6, WOOD[0]);
  for (let x = 4; x < 24; x += 5) pm.vline(x, 7, 12, WOOD[2]);
  pm.rect(4, 2, 18, 4, STRAW[1]); // load of hay
  pm.hline(5, 20, 2, STRAW[0]);
  pm.hline(24, 27, 10, WOOD[2]); // shaft
  for (const wx of [5, 18]) pm.ellipse(wx, 11, 7, 7, (dx, dy) => (dx * dx + dy * dy < 0.15 ? IRON[1] : dx * dx + dy * dy > 0.6 ? WOOD[2] : WOOD[1]));
  outlineOpaque(pm);
  return { pm, anchorX: 14, anchorY: 18 };
}

function scarecrow(): PropArt {
  const pm = new Pixmap(20, 28);
  groundShadow(pm, 10, 26, 5, 1.5);
  pm.vline(10, 8, 26, WOOD[1]);
  pm.hline(2, 18, 12, WOOD[1]);
  pm.rect(7, 11, 7, 8, [150, 90, 70]); // patched shirt
  pm.set(9, 14, [110, 150, 90]);
  pm.rect(7, 4, 7, 7, STRAW[1]); // sack head
  pm.set(9, 7, [60, 40, 30]);
  pm.set(12, 7, [60, 40, 30]);
  pm.rect(5, 2, 11, 2, [120, 84, 50]); // hat brim
  pm.rect(7, 0, 7, 3, [120, 84, 50]);
  for (const x of [2, 3, 17, 18]) pm.set(x, 13, STRAW[0]);
  outlineOpaque(pm);
  return { pm, anchorX: 10, anchorY: 26 };
}

function barrel(): PropArt {
  const pm = new Pixmap(12, 15);
  groundShadow(pm, 6, 13, 5, 1.5);
  for (let y = 1; y < 13; y++) {
    const bulge = y > 3 && y < 10 ? 0 : 1;
    for (let x = 1 + bulge; x < 11 - bulge; x++) pm.set(x, y, x < 4 ? WOOD[0] : x > 8 ? WOOD[2] : WOOD[1]);
  }
  pm.hline(2, 9, 3, IRON[1]);
  pm.hline(2, 9, 10, IRON[1]);
  pm.ellipse(2, 0, 8, 3, () => WOOD[2]);
  outlineOpaque(pm);
  return { pm, anchorX: 6, anchorY: 13 };
}

function crate(): PropArt {
  const pm = new Pixmap(14, 14);
  groundShadow(pm, 7, 12, 6, 1.5);
  pm.rect(1, 1, 12, 11, WOOD[1]);
  pm.hline(1, 12, 1, WOOD[0]);
  pm.vline(1, 1, 11, WOOD[0]);
  pm.vline(12, 1, 11, WOOD[2]);
  for (let i = 0; i < 10; i++) pm.set(2 + i, 2 + i, WOOD[2]);
  outlineOpaque(pm);
  return { pm, anchorX: 7, anchorY: 12 };
}

function fence(len: number): PropArt {
  const pm = new Pixmap(len, 18);
  for (let x = 1; x < len - 1; x += 7) {
    pm.vline(x, 2, 16, WOOD[1]);
    pm.vline(x + 1, 2, 16, WOOD[2]);
    pm.set(x, 1, WOOD[0]);
  }
  for (const y of [5, 11]) {
    pm.hline(0, len - 1, y, WOOD[0]);
    pm.hline(0, len - 1, y + 1, WOOD[1]);
  }
  outlineOpaque(pm);
  return { pm, anchorX: Math.round(len / 2), anchorY: 16 };
}

function lamppost(): PropArt {
  const pm = new Pixmap(8, 26);
  groundShadow(pm, 4, 24, 3, 1);
  pm.vline(3, 6, 24, IRON[1]);
  pm.vline(4, 6, 24, IRON[2]);
  pm.rect(1, 1, 6, 6, IRON[2]);
  pm.rect(2, 2, 4, 4, [252, 220, 130]);
  pm.set(2, 2, [255, 248, 210]);
  outlineOpaque(pm);
  return { pm, anchorX: 4, anchorY: 24 };
}

function stump(): PropArt {
  const pm = new Pixmap(14, 10);
  groundShadow(pm, 7, 8, 6, 1.5);
  pm.rect(2, 3, 10, 5, BARK[1]);
  pm.vline(2, 3, 7, BARK[0]);
  pm.vline(11, 3, 7, BARK[2]);
  pm.ellipse(2, 0, 10, 5, (dx, dy) => (dx * dx + dy * dy < 0.25 ? [200, 160, 110] : [176, 136, 92]));
  outlineOpaque(pm);
  return { pm, anchorX: 7, anchorY: 8 };
}

// Flat props drawn from ground materials (fields, ponds, boardwalks).
function patch(material: 'crop' | 'water' | 'planks' | 'lava' | 'marsh', w: number, h: number): PropArt {
  const pm = new Pixmap(w, h);
  if (material === 'lava') {
    pm.ellipse(0, 0, w, h, (dx, dy) => {
      const d = dx * dx + dy * dy;
      if (d > 0.8) return [70, 40, 40];
      const n = noise(Math.round(dx * 20), Math.round(dy * 20), 3, 4);
      return n > 0.6 ? [255, 214, 110] : n > 0.35 ? [244, 120, 50] : [190, 60, 40];
    });
    return { pm, anchorX: Math.round(w / 2), anchorY: Math.round(h / 2) };
  }
  const shapeKind = material === 'water' || material === 'marsh' ? 'ellipse' : 'rect';
  const ground = renderGround({
    w,
    h,
    base: material,
    seed: w * 31 + h,
  });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (shapeKind === 'ellipse') {
        const dx = (x - w / 2 + 0.5) / (w / 2);
        const dy = (y - h / 2 + 0.5) / (h / 2);
        const d = dx * dx + dy * dy;
        if (d > 1) continue;
        pm.set(x, y, d > 0.8 ? [36, 70, 110] : ground.get(x, y)!);
      } else {
        const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
        pm.set(x, y, edge ? (material === 'crop' ? [112, 82, 56] : WOOD[2]) : ground.get(x, y)!);
      }
    }
  }
  return { pm, anchorX: Math.round(w / 2), anchorY: Math.round(h / 2) };
}

// Outline around opaque pixels only (translucent shadows stay soft).
function outlineOpaque(pm: Pixmap): void {
  const solid = (x: number, y: number) => pm.inside(x, y) && pm.data[(y * pm.w + x) * 4 + 3] === 255;
  const add: number[] = [];
  for (let y = 0; y < pm.h; y++) {
    for (let x = 0; x < pm.w; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) add.push(x, y);
    }
  }
  for (let i = 0; i < add.length; i += 2) pm.set(add[i], add[i + 1], OUTLINE);
}

export type PropKind =
  | 'tree'
  | 'big_tree'
  | 'pine'
  | 'bush'
  | 'berry_bush'
  | 'rock_small'
  | 'boulder_large'
  | 'mushroom'
  | 'crystal_glow'
  | 'treasure_chest_closed'
  | 'treasure_chest_open'
  | 'market_stall'
  | 'merchant_stall'
  | 'well'
  | 'wagon_cart'
  | 'scarecrow'
  | 'barrel'
  | 'crate'
  | 'lamppost'
  | 'stump';

export function renderProp(kind: PropKind, seed = 1): PropArt {
  switch (kind) {
    case 'tree':
      return tree(28, seed);
    case 'big_tree':
      return tree(44, seed);
    case 'pine':
      return pine(36, seed);
    case 'bush':
      return bush(16, seed);
    case 'berry_bush':
      return bush(18, seed, true);
    case 'rock_small':
      return rock(14, seed);
    case 'boulder_large':
      return rock(24, seed);
    case 'mushroom':
      return mushroom();
    case 'crystal_glow':
      return crystal();
    case 'treasure_chest_closed':
      return chest(false);
    case 'treasure_chest_open':
      return chest(true);
    case 'market_stall':
      return stall(30, RED);
    case 'merchant_stall':
      return stall(28, [
        [130, 170, 230],
        [70, 110, 190],
        [40, 64, 120],
      ]);
    case 'well':
      return well();
    case 'wagon_cart':
      return wagon();
    case 'scarecrow':
      return scarecrow();
    case 'barrel':
      return barrel();
    case 'crate':
      return crate();
    case 'lamppost':
      return lamppost();
    case 'stump':
      return stump();
  }
}

export function renderFence(len: number): PropArt {
  return fence(len);
}

export function renderPatch(material: 'crop' | 'water' | 'planks' | 'lava' | 'marsh', w: number, h: number): PropArt {
  return patch(material, w, h);
}

// ---------------------------------------------------------------- dungeons

export type DungeonPropKind = 'torch' | 'bones' | 'sarcophagus' | 'cobweb';

export function renderDungeonProp(kind: DungeonPropKind): PropArt {
  if (kind === 'torch') {
    // Wall torch with a warm halo.
    const pm = new Pixmap(24, 30);
    pm.ellipse(0, 0, 24, 24, (dx, dy) => {
      const d = dx * dx + dy * dy;
      return d < 1 ? [255, 190, 90] : undefined;
    });
    for (let y = 0; y < pm.h; y++) {
      for (let x = 0; x < pm.w; x++) {
        const o = (y * pm.w + x) * 4;
        if (!pm.data[o + 3]) continue;
        const d = Math.hypot(x - 11.5, y - 11.5) / 12;
        pm.data[o + 3] = Math.round(Math.max(0, 1 - d) * 70);
      }
    }
    const t = new Pixmap(24, 30);
    t.vline(11, 14, 22, IRON[2]);
    t.vline(12, 14, 22, IRON[1]);
    t.rect(10, 12, 4, 3, IRON[1]);
    t.rect(10, 8, 4, 4, [244, 120, 50]);
    t.rect(11, 6, 2, 4, [252, 196, 90]);
    t.set(11, 5, [255, 240, 180]);
    outlineOpaque(t);
    pm.blit(t, 0, 0);
    return { pm, anchorX: 12, anchorY: 22 };
  }
  if (kind === 'bones') {
    const pm = new Pixmap(16, 9);
    const B: RGB = [232, 226, 206];
    const D: RGB = [176, 168, 150];
    pm.rect(2, 1, 5, 4, B); // skull
    pm.set(3, 2, OUTLINE);
    pm.set(5, 2, OUTLINE);
    pm.hline(3, 5, 4, D);
    for (let i = 0; i < 7; i++) pm.set(8 + i, 6 - Math.floor(i / 3), i % 3 ? B : D);
    pm.hline(4, 9, 7, B);
    outlineOpaque(pm);
    return { pm, anchorX: 8, anchorY: 7 };
  }
  if (kind === 'sarcophagus') {
    const pm = new Pixmap(16, 26);
    groundShadow(pm, 8, 24, 8, 2);
    for (let y = 2; y < 24; y++) for (let x = 1; x < 15; x++) pm.set(x, y, x === 1 ? STONE[0] : x === 14 ? STONE[2] : y < 18 ? STONE[1] : STONE[2]);
    pm.hline(1, 14, 2, STONE[0]);
    pm.hline(2, 13, 18, STONE[2]);
    // Carved cross on the lid.
    pm.vline(7, 5, 14, STONE[2]);
    pm.vline(8, 5, 14, STONE[0]);
    pm.hline(5, 10, 8, STONE[2]);
    outlineOpaque(pm);
    return { pm, anchorX: 8, anchorY: 24 };
  }
  // Cobweb for corners.
  const pm = new Pixmap(14, 14);
  const W2: RGB = [220, 220, 228];
  for (let i = 0; i < 14; i++) {
    pm.set(i, 0, W2);
    pm.set(0, i, W2);
    pm.set(i, i, W2);
  }
  for (const r of [4, 8, 12]) for (let i = 0; i <= r; i++) pm.set(i, r - i, W2);
  for (let i = 3; i < pm.data.length; i += 4) if (pm.data[i]) pm.data[i] = 150;
  return { pm, anchorX: 0, anchorY: 0 };
}
