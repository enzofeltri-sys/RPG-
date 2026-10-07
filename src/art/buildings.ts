// Buildings drawn by the game in a 3/4 top-down view, sized to the
// collision footprint each scene already uses (w x h, centered on the
// building's position). Villages get country houses (thatch and wood
// shingles, cob walls in a timber frame, fieldstone, shutters and flower
// boxes); the town keeps its cut stone. Every material uses a 5-tone ramp
// lit from the top left, and each building casts a soft shadow.

import { OUTLINE, Pixmap, RGB, Ramp, cell, hash2, lit, mix, noise, ramp } from './pixmap';

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

// ---------------------------------------------------------------- palette

const THATCH = ramp([200, 160, 82]);
const SHINGLE = ramp([142, 92, 62]);
const SLATE = ramp([104, 114, 138], 0.5);
const TILE = ramp([182, 82, 64]);
const DAUB = ramp([226, 210, 176], 0.7);
const TIMBER = ramp([104, 68, 46]);
const FIELD = ramp([150, 140, 124], 0.6);
const CUT = ramp([158, 154, 150], 0.5);
const WOOD = ramp([140, 94, 58]);
const GLASS = ramp([128, 186, 220], 0.4);
const WARM = ramp([240, 176, 92]);
const IRON = ramp([96, 98, 112], 0.4);
const LEAF = ramp([82, 140, 64]);
const MOSS: RGB = [104, 134, 72];
const FLOWER_COLORS: RGB[] = [
  [236, 92, 84],
  [252, 214, 96],
  [244, 244, 236],
  [214, 120, 196],
];
const SHADOW: RGB = [20, 26, 22];
const SHUTTERS: Record<string, Ramp> = {
  green: ramp([70, 120, 76]),
  blue: ramp([66, 104, 154], 0.5),
  red: ramp([160, 64, 58]),
  ochre: ramp([196, 150, 64]),
};

// ------------------------------------------------------------ materials

function thatch(x: number, y: number, top: number, bottom: number): RGB {
  // Bundled straw laid in wavy courses: fine vertical strands, each course
  // lit where it bulges and shaded under its ragged lip, the whole roof a
  // little lighter near the ridge. Weathered grey patches here and there.
  const k = (y - top) / Math.max(1, bottom - top);
  const wave = Math.round((noise(x, 0, 7, 71) - 0.5) * 3);
  const ly = y - top + wave;
  const course = Math.floor(ly / 6);
  const p = ((ly % 6) + 6) % 6;
  const strand = hash2(x, course, 72) * 0.6 + hash2(x >> 1, course, 76) * 0.4;
  let level = (strand - 0.5) * 0.9 + 0.3 - k * 0.55;
  if (p === 0) level += 0.3;
  if (p === 1) level += 0.15;
  if (p === 5) level -= hash2(x, course, 73) < 0.7 ? 0.95 : 0.35;
  if (p === 4 && hash2(x, course, 74) < 0.3) level -= 0.55;
  if (hash2(x, y, 75) < 0.02) level -= 0.6;
  let c = lit(THATCH, level);
  const weather = noise(x, y, 13, 77);
  if (weather > 0.76) c = mix(c, [158, 144, 112], 0.22);
  else if (weather < 0.14 && k > 0.55) c = mix(c, MOSS, 0.22);
  return c;
}

function shingles(x: number, y: number, rowTop: number, r: Ramp, mossy: boolean): RGB {
  const ly = y - rowTop;
  const row = Math.floor(ly / 4);
  const band = ly % 4;
  // Pieces of uneven width.
  let start = 0;
  let piece = 0;
  const off = Math.floor(hash2(row, 1, 11) * 5);
  const px = x + off;
  for (let i = 0; start <= px; i++) {
    piece = i;
    const width = 4 + Math.floor(hash2(i, row, 12) * 3);
    if (start + width > px) break;
    start += width;
  }
  if (px === start) return r[4];
  const tone = (hash2(piece, row, 13) - 0.5) * 0.55;
  let level = tone + (band === 0 ? 0.55 : band === 3 ? -0.6 : 0);
  if (mossy && band >= 2 && noise(x, y, 6, 14) > 0.7) return mix(lit(r, level), MOSS, 0.65);
  if (band === 3) level -= 0.15;
  return lit(r, level);
}

function tiles(x: number, y: number, rowTop: number): RGB {
  const ly = y - rowTop;
  const row = Math.floor(ly / 4);
  const off = (row % 2) * 3;
  const lx = (x + off) % 6;
  const band = ly % 4;
  if (band === 3) return lx === 0 || lx === 5 ? TILE[4] : TILE[3];
  const level = (lx === 1 ? 0.6 : lx >= 4 ? -0.45 : 0.05) + (band === 0 ? 0.2 : 0) + (hash2(Math.floor((x + off) / 6), row, 15) - 0.5) * 0.3;
  return lit(TILE, level);
}

function daub(x: number, y: number): RGB {
  const level = (noise(x, y, 5, 21) - 0.5) * 0.5 + (hash2(x, y, 22) - 0.5) * 0.25;
  return level > 0.2 ? DAUB[1] : level < -0.22 ? DAUB[3] : DAUB[2];
}

function fieldstone(x: number, y: number, r: Ramp = FIELD): RGB {
  const s = cell(x, y, 5, 23, 1.4);
  if (s.d2 - s.d1 < 0.1) return r[4];
  const tone = (hash2(s.id, 1, 24) - 0.5) * 0.7;
  let c = lit(r, -s.dx * 0.5 - s.dy * 0.7 + tone);
  // Warm and cool stones mixed in a dry wall.
  const hue = hash2(s.id, 2, 25);
  if (hue < 0.25) c = mix(c, [170, 132, 100], 0.25);
  else if (hue > 0.8) c = mix(c, [120, 132, 150], 0.2);
  return c;
}

function cutStone(x: number, y: number, x0: number, y0: number): RGB {
  const ly = y - y0;
  const row = Math.floor(ly / 5);
  const off = (row % 2) * 5;
  const lx = (x - x0 + off) % 10;
  if (ly % 5 === 0 || lx === 0) return CUT[4];
  const tone = (hash2(Math.floor((x - x0 + off) / 10), row, 26) - 0.5) * 0.55;
  return lit(CUT, tone + (ly % 5 === 1 ? 0.45 : ly % 5 === 4 ? -0.35 : 0) + (lx === 1 ? 0.25 : lx === 9 ? -0.3 : 0));
}

function planks(x: number, y: number, x0: number): RGB {
  const lx = (x - x0) % 5;
  if (lx === 0) return WOOD[4];
  const board = Math.floor((x - x0) / 5);
  const tone = (hash2(board, 1, 27) - 0.5) * 0.5 + (hash2(board, Math.floor(y / 6), 28) < 0.08 ? -0.6 : 0);
  return lit(WOOD, tone + (lx === 1 ? 0.35 : lx === 4 ? -0.3 : 0));
}

// ------------------------------------------------------------------ parts

type RoofKind = 'thatch' | 'shingles' | 'slate' | 'tiles';

function roofPixel(kind: RoofKind, x: number, y: number, top: number, bottom = top + 24): RGB {
  if (kind === 'thatch') return thatch(x, y, top, bottom);
  if (kind === 'shingles') return shingles(x, y, top, SHINGLE, true);
  if (kind === 'slate') return shingles(x, y, top, SLATE, false);
  return tiles(x, y, top);
}

function rampOf(kind: RoofKind): Ramp {
  return kind === 'thatch' ? THATCH : kind === 'shingles' ? SHINGLE : kind === 'slate' ? SLATE : TILE;
}

// Hip roof: narrows towards the ridge, hips lit on the left and shaded on
// the right, a thick eave at the bottom. Thatch gets a bound ridge cap
// (crossed liggers) and a fat rounded eave with drooping strands.
function hipRoof(pm: Pixmap, x0: number, x1: number, top: number, bottom: number, kind: RoofKind): void {
  const r = rampOf(kind);
  const height = bottom - top + 1;
  const inset = Math.min(9, Math.floor((x1 - x0) / 4));
  const edgeAt = (y: number) => {
    const k = (y - top) / Math.max(1, height - 1);
    return Math.round(inset * Math.pow(1 - k, 0.8));
  };
  for (let y = top; y <= bottom; y++) {
    const ins = edgeAt(y);
    const l = x0 + ins;
    const rr = x1 - ins;
    for (let x = l; x <= rr; x++) {
      let c = roofPixel(kind, x, y, top, bottom);
      const fromL = x - l;
      const fromR = rr - x;
      if (fromL < 3 && y - top > 1) c = mix(c, r[0], 0.35 - fromL * 0.1);
      if (fromR < 4 && y - top > 1) c = mix(c, r[4], 0.45 - fromR * 0.1);
      pm.set(x, y, c);
    }
  }
  if (kind === 'thatch') {
    // Ridge cap: a thicker band of straw pinned with crossed hazel liggers.
    const capH = 4;
    for (let y = top; y < top + capH; y++) {
      const ins = edgeAt(y);
      for (let x = x0 + ins + 1; x <= x1 - ins - 1; x++) {
        const ly = y - top;
        const cross = (x + ly) % 5 === 0 || (x - ly + 50) % 5 === 0;
        let c = cross ? r[1] : lit(r, (hash2(x, y, 78) - 0.5) * 0.5 - 0.1);
        if (!cross) c = mix(c, [128, 92, 52], 0.3);
        if (ly === 0) c = mix(c, r[0], 0.35);
        pm.set(x, y, c);
      }
    }
    // The cap's ragged lower edge (scalloped).
    for (let x = x0 + edgeAt(top + capH) + 1; x <= x1 - edgeAt(top + capH) - 1; x++) {
      const scallop = Math.abs(((x % 6) + 6) % 6 - 2.5) < 1.5 ? 1 : 0;
      pm.set(x, top + capH + scallop, r[4]);
      if (scallop) pm.set(x, top + capH, r[3]);
    }
    // Fat rounded eave: highlight on the bulge, deep shade under it.
    for (let x = x0; x <= x1; x++) {
      const corner = x === x0 || x === x1;
      pm.set(x, bottom - 3, mix(roofPixel(kind, x, bottom - 3, top, bottom), r[1], 0.35));
      pm.set(x, bottom - 2, lit(r, 0.35 + (hash2(x, 2, 79) - 0.5) * 0.7));
      pm.set(x, bottom - 1, lit(r, -0.35 + (hash2(x, 3, 79) - 0.5) * 0.4));
      if (!corner) pm.set(x, bottom, r[4]);
      else pm.data[(bottom * pm.w + x) * 4 + 3] = 0;
      const droop = hash2(x, 1, 31);
      if (!corner && droop < 0.4) pm.set(x, bottom + 1, droop < 0.15 ? r[3] : r[4]);
      if (!corner && droop < 0.08) pm.set(x, bottom + 2, r[4]);
    }
    return;
  }
  // Rounded ridge.
  pm.hline(x0 + inset, x1 - inset, top, r[3]);
  pm.hline(x0 + inset + 1, x1 - inset - 1, top + 1, r[0]);
  pm.hline(x0 + inset + 1, x1 - inset - 1, top + 2, r[1]);
  // Eave: a shaded lip.
  for (let x = x0; x <= x1; x++) {
    pm.set(x, bottom, r[3]);
    pm.set(x, bottom - 1, mix(roofPixel(kind, x, bottom - 1, top, bottom), r[3], 0.4));
  }
}

// Gable facing the street: the roof as a thick inverted V around a
// timber-framed gable triangle.
function gableRoof(pm: Pixmap, x0: number, x1: number, top: number, bottom: number, kind: RoofKind, gableTimber: boolean): void {
  const r = rampOf(kind);
  const cx = (x0 + x1) / 2;
  const half = (x1 - x0) / 2;
  const thick = 6;
  for (let y = top; y <= bottom; y++) {
    const k = (y - top) / Math.max(1, bottom - top);
    const spread = half * Math.min(1, k * 1.15 + 0.12);
    const l = Math.round(cx - spread);
    const rr = Math.round(cx + spread);
    for (let x = l; x <= rr; x++) {
      // Inside the roof thickness: roof; further in: the gable wall.
      const inner = spread - thick;
      const dist = Math.abs(x - cx);
      if (dist > inner || y < top + thick) {
        let c = roofPixel(kind, x, y, top);
        if (x < cx) c = mix(c, r[0], 0.18);
        else c = mix(c, r[4], 0.25);
        pm.set(x, y, c);
      } else {
        pm.set(x, y, gableTimber ? daub(x, y) : planks(x, y, x0));
      }
    }
    // Barge boards along both slopes.
    pm.set(Math.round(cx - spread + thick), y, TIMBER[3]);
    pm.set(Math.round(cx + spread - thick), y, TIMBER[4]);
  }
  if (gableTimber) {
    // King post and braces in the gable.
    const gTop = top + thick + 2;
    for (let y = gTop; y < bottom; y++) {
      pm.set(Math.round(cx), y, TIMBER[2]);
      pm.set(Math.round(cx) + 1, y, TIMBER[3]);
    }
    // Braces, 2 px thick, kept inside the gable triangle.
    const innerAt = (y: number) => half * Math.min(1, ((y - top) / Math.max(1, bottom - top)) * 1.15 + 0.12) - thick - 1;
    for (let i = 0; i < bottom - gTop - 2; i++) {
      const by = bottom - 1 - Math.floor(i / 1.2);
      const off = 2 + i;
      if (off >= innerAt(by) || off >= innerAt(by + 1)) break;
      pm.set(Math.round(cx) - off, by, TIMBER[2]);
      pm.set(Math.round(cx) - off, by + 1, TIMBER[3]);
      pm.set(Math.round(cx) + off, by, TIMBER[3]);
      pm.set(Math.round(cx) + off, by + 1, TIMBER[4]);
    }
    pm.hline(Math.round(cx - half + thick), Math.round(cx + half - thick), bottom, TIMBER[3]);
    // A small attic window.
    const wy = gTop + Math.max(2, Math.floor((bottom - gTop) / 2) - 3);
    if (bottom - gTop > 10) window(pm, Math.round(cx) - 3, wy, 6, 5, false);
  }
  // Eave shadow line at the very bottom.
  pm.hline(x0, x1, bottom, r[4]);
}

function window(pm: Pixmap, x: number, y: number, w: number, h: number, warm: boolean): void {
  const g = warm ? WARM : GLASS;
  // Deep frame.
  for (let j = -1; j <= h; j++) {
    for (let i = -1; i <= w; i++) {
      const frame = i === -1 || j === -1 || i === w || j === h;
      if (frame) pm.set(x + i, y + j, j === -1 ? TIMBER[3] : TIMBER[2]);
    }
  }
  const midX = Math.floor(w / 2);
  const midY = Math.floor(h / 2);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let c: RGB;
      if (i === midX || j === midY) c = TIMBER[1];
      else if (j === 0) c = g[3]; // shade under the lintel
      else if (!warm && (i + j) % 7 === 2 && i < midX) c = g[0]; // a reflection
      else c = i < midX ? g[1] : g[2];
      pm.set(x + i, y + j, c);
    }
  }
}

function shutters(pm: Pixmap, x: number, y: number, w: number, h: number, r: Ramp): void {
  for (const sx of [x - 4, x + w + 1]) {
    for (let j = -1; j <= h; j++) {
      for (let i = 0; i < 3; i++) pm.set(sx + i, y + j, lit(r, (i === 0 ? 0.4 : i === 2 ? -0.4 : 0) + (j === -1 ? 0.3 : 0)));
    }
    pm.hline(sx, sx + 2, y + Math.floor(h / 2), r[3]);
  }
}

function flowerBox(pm: Pixmap, x: number, y: number, w: number, seed: number): void {
  pm.hline(x - 1, x + w, y + 1, WOOD[1]);
  pm.hline(x - 1, x + w, y + 2, WOOD[3]);
  for (let i = -1; i <= w; i++) {
    const leaf = hash2(i, seed, 41) < 0.6;
    pm.set(x + i, y, leaf ? LEAF[hash2(i, seed, 42) < 0.5 ? 1 : 2] : LEAF[3]);
    if (hash2(i, seed, 43) < 0.4) pm.set(x + i, y - 1, FLOWER_COLORS[Math.floor(hash2(i, seed, 44) * FLOWER_COLORS.length)]);
  }
}

function door(pm: Pixmap, cx: number, bottom: number, height: number, width: number, arched: boolean, stoneFrame: boolean): void {
  const x = Math.round(cx - width / 2);
  const top = bottom - height + 1;
  // Frame.
  for (let j = -1; j < height; j++) {
    for (let i = -1; i <= width; i++) {
      if (i !== -1 && i !== width && j !== -1) continue;
      if (arched && j === -1 && (i <= 0 || i >= width - 1)) continue;
      pm.set(x + i, top + j, stoneFrame ? (j === -1 ? FIELD[1] : i === -1 ? FIELD[1] : FIELD[3]) : TIMBER[2]);
    }
  }
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      if (arched && j === 0 && (i === 0 || i === width - 1)) {
        pm.set(x + i, top + j, stoneFrame ? FIELD[2] : TIMBER[2]);
        continue;
      }
      const seam = i % 3 === 0;
      let level = seam ? -0.7 : i % 3 === 1 ? 0.25 : -0.05;
      if (j === 0) level -= 0.4; // recessed under the lintel
      pm.set(x + i, top + j, lit(WOOD, level));
    }
  }
  // Iron hinge straps and a ring handle.
  for (const hy of [top + 2, bottom - 3]) pm.hline(x, x + Math.floor(width / 2), hy, IRON[3]);
  pm.set(x + width - 2, top + Math.floor(height / 2), IRON[0]);
  pm.set(x + width - 2, top + Math.floor(height / 2) + 1, IRON[2]);
  // Doorstep.
  pm.hline(x - 1, x + width, bottom + 1, FIELD[1]);
  pm.hline(x - 1, x + width, bottom + 2, FIELD[3]);
}

function chimney(pm: Pixmap, x: number, top: number, height: number): void {
  for (let y = top; y < top + height; y++) for (let i = 0; i < 6; i++) pm.set(x + i, y, fieldstone(x + i + 40, y));
  pm.hline(x - 1, x + 6, top, FIELD[3]);
  pm.hline(x - 1, x + 6, top + 1, FIELD[1]);
  // Smoke: soft puffs drifting right.
  const puffs: [number, number, number][] = [
    [x + 2, top - 4, 3],
    [x + 5, top - 8, 4],
    [x + 9, top - 13, 5],
  ];
  puffs.forEach(([px, py, r]) => {
    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) {
        if (i * i + j * j > r * r) continue;
        if (!pm.inside(px + i, py + j) || pm.filled(px + i, py + j)) continue;
        pm.set(px + i, py + j, j < 0 ? [236, 234, 230] : [200, 200, 204], 120);
      }
    }
  });
}

function woodpile(pm: Pixmap, x: number, bottom: number): void {
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 3 - row; i++) {
      const lx = x + i * 4 + row * 2;
      const ly = bottom - 3 - row * 3;
      pm.set(lx, ly, WOOD[1]);
      pm.set(lx + 1, ly, WOOD[2]);
      pm.set(lx + 2, ly, WOOD[3]);
      pm.set(lx, ly + 1, WOOD[2]);
      pm.set(lx + 1, ly + 1, [214, 176, 120]); // log end
      pm.set(lx + 2, ly + 1, WOOD[3]);
      pm.set(lx + 1, ly + 2, WOOD[3]);
    }
  }
}

function ivy(pm: Pixmap, x: number, top: number, bottom: number, seed: number): void {
  for (let y = bottom; y >= top; y--) {
    const spread = Math.floor((y - top) / 3);
    for (let i = -1; i <= 1 + Math.floor(spread / 3); i++) {
      if (hash2(x + i, y, seed) < 0.45) pm.set(x + i + Math.round(Math.sin(y / 3) * 1.5), y, LEAF[hash2(i, y, seed + 1) < 0.5 ? 1 : 3]);
    }
  }
}

// Soft cast shadow to the right of and below the picture's solid pixels.
function castShadow(pm: Pixmap, depth: number): void {
  const solid = (x: number, y: number) => pm.inside(x, y) && pm.data[(y * pm.w + x) * 4 + 3] === 255;
  const add: number[] = [];
  for (let y = 0; y < pm.h; y++) {
    for (let x = 0; x < pm.w; x++) {
      if (pm.data[(y * pm.w + x) * 4 + 3]) continue;
      for (let k = 1; k <= depth; k++) {
        if (solid(x - k, y - Math.ceil(k / 2))) {
          add.push(x, y);
          break;
        }
      }
    }
  }
  for (let i = 0; i < add.length; i += 2) pm.set(add[i], add[i + 1], SHADOW, 72);
}

function finish(pm: Pixmap): void {
  // Outline only around opaque pixels (smoke stays soft).
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

// --------------------------------------------------------------- walls

type WallKind = 'daub' | 'field' | 'cut' | 'planks';

function wall(pm: Pixmap, kind: WallKind, x0: number, x1: number, top: number, bottom: number, opts: { frame?: boolean; plinth?: number } = {}): void {
  for (let y = top; y <= bottom; y++) {
    for (let x = x0; x <= x1; x++) {
      let c: RGB;
      if (kind === 'daub') c = daub(x, y);
      else if (kind === 'field') c = fieldstone(x, y);
      else if (kind === 'cut') c = cutStone(x, y, x0, top);
      else c = planks(x, y, x0);
      // Darker toward the eave, lit on the left corner.
      if (y - top < 3) c = mix(c, [30, 26, 36], 0.42 - (y - top) * 0.12);
      if (x === x0) c = mix(c, [255, 250, 230], 0.15);
      if (x === x1) c = mix(c, [30, 26, 36], 0.25);
      pm.set(x, y, c);
    }
  }
  const plinth = opts.plinth ?? 0;
  if (plinth) for (let y = bottom - plinth + 1; y <= bottom; y++) for (let x = x0; x <= x1; x++) pm.set(x, y, fieldstone(x, y));
  if (opts.frame) {
    // Timber frame: posts, sill and head beams, braces by the corners.
    const fb = bottom - plinth;
    const posts: number[] = [x0, x1];
    for (let x = x0 + 14; x < x1 - 6; x += 15) posts.push(x);
    posts.forEach((px) => {
      for (let y = top + 2; y <= fb; y++) {
        pm.set(px, y, TIMBER[px === x1 ? 3 : 2]);
        pm.set(px + 1, y, TIMBER[px === x1 ? 4 : 3]);
      }
    });
    pm.hline(x0, x1, top + 2, TIMBER[2]);
    pm.hline(x0, x1, top + 3, TIMBER[3]);
    pm.hline(x0, x1, fb, TIMBER[3]);
    const braceH = Math.min(8, fb - top - 6);
    for (let i = 0; i < braceH; i++) {
      pm.set(x0 + 2 + i, fb - 1 - i, TIMBER[2]);
      pm.set(x1 - 1 - i, fb - 1 - i, TIMBER[3]);
    }
  }
}

// ------------------------------------------------------------- buildings

interface Plan {
  W: number;
  H: number;
  wx0: number;
  wx1: number;
  wallTop: number;
  base: number; // last wall row (footprint bottom)
}

function plan(w: number, _h: number, wallH: number, roofH: number): Plan {
  const W = w + 8; // eaves overhang and the cast shadow
  const H = roofH + wallH + 6;
  const base = H - 5;
  return { W, H, wx0: 3, wx1: W - 6, wallTop: base - wallH + 1, base };
}

function windowsRow(pm: Pixmap, p: Plan, y: number, doorX: number, doorW: number, ww: number, wh: number, opts: { shutters?: Ramp; boxes?: boolean; warm?: boolean }): void {
  const slots: number[] = [];
  const gap = ww + 12;
  for (let x = p.wx0 + 6; x + ww <= doorX - doorW / 2 - 6; x += gap) slots.push(x);
  for (let x = p.wx1 - 5 - ww; x >= doorX + doorW / 2 + 6; x -= gap) slots.push(x);
  slots.forEach((x, i) => {
    if (opts.shutters) shutters(pm, x, y, ww, wh, opts.shutters);
    window(pm, x, y, ww, wh, !!opts.warm);
    if (opts.boxes) flowerBox(pm, x, y + wh + 1, ww, i + x);
  });
}

function cottage(w: number, h: number): BuildingArt {
  const p = plan(w, h, Math.max(24, Math.min(28, Math.round(h * 0.52))), Math.max(20, Math.min(34, Math.round(h * 0.55) + 4)));
  const pm = new Pixmap(p.W, p.H);
  wall(pm, 'daub', p.wx0, p.wx1, p.wallTop, p.base, { frame: true, plinth: 4 });
  const doorX = Math.round((p.wx0 + p.wx1) / 2) + 6;
  door(pm, doorX, p.base, Math.min(19, p.base - p.wallTop - 3), 10, false, false);
  windowsRow(pm, p, p.wallTop + 8, doorX, 10, 7, 6, { shutters: SHUTTERS.green, boxes: true });
  hipRoof(pm, 0, p.W - 4, 2, p.wallTop + 2, 'thatch');
  woodpile(pm, p.wx1 - 12, p.base + 1);
  finish(pm);
  castShadow(pm, 4);
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base };
}

function villageHouse(w: number, h: number): BuildingArt {
  const p = plan(w, h, Math.max(24, Math.min(28, Math.round(h * 0.52))), Math.max(24, Math.min(36, Math.round(h * 0.6) + 6)));
  const pm = new Pixmap(p.W, p.H);
  wall(pm, 'daub', p.wx0, p.wx1, p.wallTop, p.base, { frame: true, plinth: 4 });
  const doorX = Math.round((p.wx0 + p.wx1) / 2);
  door(pm, doorX, p.base, Math.min(19, p.base - p.wallTop - 3), 10, false, false);
  windowsRow(pm, p, p.wallTop + 8, doorX, 10, 7, 6, { shutters: SHUTTERS.blue, boxes: true });
  chimney(pm, p.wx1 - 12, 8, 14);
  gableRoof(pm, 0, p.W - 4, 2, p.wallTop + 2, 'shingles', true);
  finish(pm);
  castShadow(pm, 4);
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base };
}

function stoneCottage(w: number, h: number): BuildingArt {
  const p = plan(w, h, Math.max(24, Math.min(30, Math.round(h * 0.5))), Math.max(20, Math.min(32, Math.round(h * 0.5) + 4)));
  const pm = new Pixmap(p.W, p.H);
  wall(pm, 'field', p.wx0, p.wx1, p.wallTop, p.base);
  const doorX = Math.round((p.wx0 + p.wx1) / 2);
  door(pm, doorX, p.base, Math.min(19, p.base - p.wallTop - 3), 10, true, true);
  windowsRow(pm, p, p.wallTop + 8, doorX, 10, 6, 6, { shutters: SHUTTERS.red, boxes: true });
  ivy(pm, p.wx0 + 2, p.wallTop + 4, p.base, 5);
  chimney(pm, p.wx0 + 8, 10, 12);
  hipRoof(pm, 0, p.W - 4, 2, p.wallTop + 2, 'thatch');
  finish(pm);
  castShadow(pm, 4);
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base };
}

function inn(w: number, h: number): BuildingArt {
  // Two storeys: fieldstone below, a jettied timber-framed floor above.
  const lower = 22;
  const upper = 20;
  const p = plan(w, h, lower + upper, Math.max(22, Math.min(32, Math.round(h * 0.4) + 6)));
  const pm = new Pixmap(p.W, p.H);
  const split = p.base - lower + 1;
  wall(pm, 'field', p.wx0 + 1, p.wx1 - 1, split, p.base);
  wall(pm, 'daub', p.wx0 - 1, p.wx1 + 1, p.wallTop, split - 1, { frame: true });
  pm.hline(p.wx0 - 1, p.wx1 + 1, split - 1, TIMBER[3]); // jetty beam
  pm.hline(p.wx0 + 1, p.wx1 - 1, split, [40, 34, 40]); // its shadow
  const doorX = Math.round((p.wx0 + p.wx1) / 2);
  door(pm, doorX, p.base, 17, 12, true, true);
  windowsRow(pm, p, split + 6, doorX, 12, 7, 6, { warm: true });
  windowsRow(pm, p, p.wallTop + 6, -100, 0, 7, 7, { shutters: SHUTTERS.ochre, boxes: true });
  // Hanging sign with a tankard, and a lantern.
  const sx = doorX + 9;
  const sy = split + 3;
  pm.hline(sx, sx + 9, sy - 1, TIMBER[3]);
  for (let j = 0; j < 8; j++) for (let i = 0; i < 9; i++) pm.set(sx + 1 + i, sy + j, lit(WOOD, i === 0 ? 0.4 : i === 8 || j === 7 ? -0.5 : 0.1));
  for (let j = 2; j < 6; j++) for (let i = 3; i < 6; i++) pm.set(sx + 1 + i, sy + j, j === 2 ? [250, 250, 236] : [238, 188, 60]);
  pm.set(sx + 7, sy + 3, [238, 188, 60]);
  pm.set(sx + 7, sy + 4, [238, 188, 60]);
  const lx = doorX - 10;
  pm.set(lx, split + 2, IRON[2]);
  for (let j = 3; j < 7; j++) for (let i = -1; i <= 1; i++) pm.set(lx + i, split + j, j === 3 || j === 6 ? IRON[3] : WARM[1]);
  chimney(pm, p.wx0 + 10, 8, 12);
  gableRoof(pm, 0, p.W - 4, 2, p.wallTop + 2, 'shingles', true);
  finish(pm);
  castShadow(pm, 4);
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base };
}

// The dim back wall seen inside an open shed, optionally lit by a warm
// glow around (gx, gy).
function interior(pm: Pixmap, x0: number, x1: number, top: number, bottom: number, kind: WallKind, glow?: [number, number, number]): void {
  for (let y = top; y <= bottom; y++) {
    for (let x = x0; x <= x1; x++) {
      let c = kind === 'field' ? fieldstone(x + 31, y) : planks(x, y, x0);
      c = mix(c, [26, 20, 28], 0.62 - Math.max(0, 3 - (y - top)) * -0.08);
      if (glow) {
        const d = Math.hypot(x - glow[0], (y - glow[1]) * 1.3) / glow[2];
        if (d < 1) c = mix(c, [255, 150, 70], (1 - d) * 0.5);
      }
      pm.set(x, y, c);
    }
  }
  // Shadow under the roof.
  for (let x = x0; x <= x1; x++) {
    pm.set(x, top, [22, 16, 24]);
    pm.set(x, top + 1, mix(pm.get(x, top + 1) ?? [0, 0, 0], [22, 16, 24], 0.6));
  }
}

function post(pm: Pixmap, x: number, top: number, bottom: number): void {
  for (let y = top; y <= bottom; y++) {
    pm.set(x, y, TIMBER[1]);
    pm.set(x + 1, y, TIMBER[2]);
    pm.set(x + 2, y, TIMBER[3]);
  }
  pm.hline(x - 1, x + 3, bottom, FIELD[2]); // stone pad
}

function forge(w: number, h: number): BuildingArt {
  // A stone smithy with an open lean-to on the left: glowing hearth with
  // its hood, anvil on a stump, quench tub, tools hung on the back wall.
  const p = plan(w, h, 26, Math.max(20, Math.min(30, Math.round(h * 0.5) + 4)));
  const pm = new Pixmap(p.W, p.H);
  const shedW = Math.round((p.wx1 - p.wx0) * 0.45);
  const shedX1 = p.wx0 + shedW;
  const hx = p.wx0 + 4;
  interior(pm, p.wx0, shedX1, p.wallTop, p.base, 'field', [hx + 6, p.base - 6, 15]);
  // Hearth: stone block, coals, a tapered hood up into the roof.
  for (let y = p.base - 9; y <= p.base; y++) for (let x = hx; x < hx + 12; x++) pm.set(x, y, fieldstone(x, y));
  for (let x = hx; x < hx + 12; x++) pm.set(x, p.base - 9, FIELD[1]);
  for (let y = p.base - 8; y <= p.base - 5; y++) {
    for (let x = hx + 2; x < hx + 10; x++) {
      const hot = hash2(x, y, 81);
      pm.set(x, y, y === p.base - 8 ? (hot < 0.5 ? [255, 236, 150] : [252, 190, 80]) : hot < 0.3 ? [255, 210, 110] : hot < 0.7 ? [236, 110, 50] : [150, 50, 40]);
    }
  }
  for (let y = p.wallTop + 2; y < p.base - 9; y++) {
    const t = (y - p.wallTop) / (p.base - 9 - p.wallTop);
    const half = Math.round(2 + t * 4);
    for (let x = hx + 6 - half; x < hx + 6 + half; x++) {
      const edge = x === hx + 6 - half ? 0.25 : x === hx + 5 + half ? -0.45 : 0;
      pm.set(x, y, mix(mix(lit(FIELD, edge + (hash2(x, y >> 1, 84) - 0.5) * 0.4), [40, 32, 38], 0.45 - 0.25 * t), [255, 150, 70], 0.2 * t));
    }
    pm.set(hx + 5 - half, y, FIELD[4]);
    pm.set(hx + 6 + half, y, FIELD[4]);
  }
  // Sparks.
  for (const [sx, sy] of [[hx + 3, p.base - 11], [hx + 8, p.base - 13], [hx + 11, p.base - 12]]) pm.set(sx, sy, [255, 220, 120]);
  // Tools hung on the back wall: tongs and two hammers.
  const tx = hx + 15;
  if (tx + 8 < shedX1 - 4) {
    pm.hline(tx - 1, tx + 9, p.wallTop + 5, TIMBER[2]);
    pm.vline(tx, p.wallTop + 6, p.wallTop + 13, IRON[1]);
    pm.vline(tx + 2, p.wallTop + 6, p.wallTop + 13, IRON[2]);
    pm.set(tx + 1, p.wallTop + 8, IRON[1]);
    pm.vline(tx + 5, p.wallTop + 6, p.wallTop + 12, WOOD[2]);
    pm.hline(tx + 4, tx + 6, p.wallTop + 12, IRON[1]);
    pm.vline(tx + 8, p.wallTop + 6, p.wallTop + 11, WOOD[2]);
    pm.hline(tx + 7, tx + 9, p.wallTop + 11, IRON[2]);
  }
  // Anvil on a stump, and a quench tub.
  const ax = shedX1 - 13;
  pm.rect(ax + 2, p.base - 3, 4, 4, WOOD[3]);
  pm.hline(ax + 2, ax + 5, p.base - 3, [214, 176, 120]);
  pm.hline(ax, ax + 8, p.base - 7, IRON[0]);
  pm.hline(ax - 2, ax + 7, p.base - 6, IRON[1]);
  pm.hline(ax + 1, ax + 6, p.base - 5, IRON[3]);
  pm.rect(ax + 2, p.base - 4, 4, 1, IRON[3]);
  pm.set(ax - 2, p.base - 7, OUTLINE);
  const qx = shedX1 - 5;
  for (let y = p.base - 4; y <= p.base; y++) for (let x = qx - 2; x <= qx + 2; x++) pm.set(x, y, lit(WOOD, x === qx - 2 ? 0.4 : x === qx + 2 ? -0.5 : 0));
  pm.hline(qx - 2, qx + 2, p.base - 4, [70, 110, 140]);
  pm.hline(qx - 2, qx + 2, p.base - 2, IRON[2]);
  post(pm, p.wx0, p.wallTop, p.base);
  post(pm, shedX1 - 2, p.wallTop, p.base);
  // Stone workshop on the right.
  wall(pm, 'field', shedX1 + 1, p.wx1, p.wallTop, p.base);
  const doorX = Math.round((shedX1 + p.wx1) / 2) + 3;
  door(pm, doorX, p.base, 18, 10, true, true);
  window(pm, p.wx1 - 11, p.wallTop + 8, 6, 6, true);
  // Horseshoe over the door.
  pm.set(doorX - 1, p.wallTop + 3, IRON[1]);
  pm.set(doorX + 1, p.wallTop + 3, IRON[1]);
  pm.set(doorX - 1, p.wallTop + 4, IRON[2]);
  pm.set(doorX + 1, p.wallTop + 4, IRON[2]);
  pm.set(doorX, p.wallTop + 5, IRON[2]);
  chimney(pm, hx + 3, 4, 16);
  hipRoof(pm, 0, p.W - 4, 2, p.wallTop + 2, 'shingles');
  finish(pm);
  castShadow(pm, 4);
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base };
}

function banner(pm: Pixmap, x: number, top: number, len: number): void {
  const RED = ramp([168, 50, 54]);
  pm.hline(x - 1, x + 5, top - 1, IRON[2]); // pole
  pm.set(x - 2, top - 1, IRON[0]);
  pm.set(x + 6, top - 1, IRON[0]);
  for (let j = 0; j < len; j++) {
    for (let i = 0; i < 5; i++) {
      // Swallowtail end.
      if (j >= len - 2 && i === 2) continue;
      if (j === len - 1 && (i === 1 || i === 3)) continue;
      const fold = i === 0 ? 0.45 : i === 4 ? -0.45 : 0;
      pm.set(x + i, top + j, j === 1 || j === len - 4 ? [226, 178, 70] : lit(RED, fold));
    }
  }
  // A golden shield emblem.
  const ey = top + Math.floor(len / 2) - 2;
  pm.hline(x + 1, x + 3, ey, [238, 196, 80]);
  pm.hline(x + 1, x + 3, ey + 1, [214, 160, 56]);
  pm.set(x + 2, ey + 2, [170, 120, 40]);
}

function barracks(w: number, h: number): BuildingArt {
  const p = plan(w, h, 28, Math.max(22, Math.min(34, Math.round(h * 0.5) + 4)));
  const pm = new Pixmap(p.W, p.H);
  wall(pm, 'cut', p.wx0, p.wx1, p.wallTop, p.base, { plinth: 3 });
  const doorX = Math.round((p.wx0 + p.wx1) / 2);
  door(pm, doorX, p.base, 19, 12, true, true);
  windowsRow(pm, p, p.wallTop + 8, doorX, 34, 5, 8, { shutters: SHUTTERS.ochre });
  // Banners either side of the door, clear of the windows.
  banner(pm, doorX - 15, p.wallTop + 5, 15);
  banner(pm, doorX + 10, p.wallTop + 5, 15);
  // A rack of spears by the door.
  const rx = doorX + 20;
  if (rx + 4 < p.wx1 - 14) {
    for (let i = 0; i < 3; i++) {
      pm.vline(rx + i * 2, p.base - 16, p.base, WOOD[2]);
      pm.set(rx + i * 2, p.base - 17, IRON[0]);
      pm.set(rx + i * 2, p.base - 18, IRON[1]);
    }
    pm.hline(rx - 1, rx + 5, p.base - 6, TIMBER[3]);
  }
  hipRoof(pm, 0, p.W - 4, 2, p.wallTop + 2, 'slate');
  finish(pm);
  castShadow(pm, 4);
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base };
}

function marketHall(w: number, h: number): BuildingArt {
  // An open timber hall: plank back wall, goods hung from the beam,
  // counters with baskets of produce, sacks at the posts.
  const p = plan(w, h, 26, Math.max(22, Math.min(34, Math.round(h * 0.5) + 4)));
  const pm = new Pixmap(p.W, p.H);
  interior(pm, p.wx0, p.wx1, p.wallTop, p.base, 'planks');
  const step = Math.max(16, Math.floor((p.wx1 - p.wx0) / 4));
  const bays: number[] = [];
  for (let x = p.wx0; x <= p.wx1 - 8; x += step) bays.push(x);
  bays.forEach((bx, b) => {
    const bx1 = Math.min(p.wx1, bx + step);
    // Hanging goods: strings of onions, sausages, herb bunches.
    for (let x = bx + 5; x < bx1 - 3; x += 3) {
      const kind = (b + Math.floor(x / 3)) % 3;
      const len = 3 + Math.floor(hash2(x, b, 82) * 3);
      pm.vline(x, p.wallTop + 3, p.wallTop + 3, [120, 100, 80]);
      for (let j = 0; j < len; j++) {
        const y = p.wallTop + 4 + j;
        if (kind === 0) pm.set(x, y, j % 2 ? [214, 168, 96] : [236, 196, 120]);
        else if (kind === 1) pm.set(x, y, j === len - 1 ? [110, 46, 40] : [156, 70, 56]);
        else pm.set(x, y, j < 2 ? [96, 140, 70] : [70, 112, 56]);
      }
    }
    // Counter.
    const cTop = p.base - 7;
    for (let y = cTop; y <= p.base; y++) for (let x = bx + 3; x <= bx1 - 1; x++) pm.set(x, y, y === cTop ? WOOD[0] : y === cTop + 1 ? WOOD[1] : planks(x, y, bx + 3));
    // Baskets of produce on the counter.
    const goods: RGB[][] = [
      [[222, 72, 60], [180, 46, 44]], // apples
      [[132, 186, 88], [92, 146, 64]], // cabbages
      [[226, 176, 96], [186, 130, 70]], // loaves
      [[240, 196, 70], [206, 150, 50]], // cheese
      [[150, 100, 186], [112, 70, 150]], // plums
    ];
    for (let x = bx + 5; x + 5 < bx1; x += 7) {
      const g = goods[Math.floor(hash2(x, b, 83) * goods.length)];
      pm.hline(x, x + 4, cTop - 1, WOOD[3]); // basket rim
      pm.hline(x + 1, x + 3, cTop, WOOD[2]);
      for (let i = 0; i < 5; i++) {
        pm.set(x + i, cTop - 2, g[(i + x) % 2]);
        if (i > 0 && i < 4) pm.set(x + i, cTop - 3, i === 1 ? mix(g[0], [255, 255, 255], 0.3) : g[0]);
      }
    }
  });
  bays.forEach((bx) => post(pm, bx, p.wallTop, p.base));
  post(pm, p.wx1 - 2, p.wallTop, p.base);
  pm.hline(p.wx0, p.wx1, p.wallTop + 2, TIMBER[2]); // tie beam
  // Grain sacks against two posts.
  for (const sx of [bays[1] ?? p.wx0 + 20, p.wx1 - 2]) {
    for (let j = 0; j < 5; j++) for (let i = -2; i <= 2; i++) {
      if (j === 0 && Math.abs(i) === 2) continue;
      pm.set(sx + i + 4, p.base - 4 + j, lit(ramp([196, 172, 128]), i === -2 ? 0.4 : i === 2 ? -0.5 : j === 0 ? 0.3 : 0));
    }
  }
  hipRoof(pm, 0, p.W - 4, 2, p.wallTop + 2, 'tiles');
  finish(pm);
  castShadow(pm, 4);
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base };
}

function tower(w: number, h: number): BuildingArt {
  // A round watchtower: cylinder shading, a moulded string course, arrow
  // slits in stone surrounds, deep crenels and a pennant on top.
  const W = w + 6;
  const H = h + 22;
  const pm = new Pixmap(W, H);
  const x0 = 1;
  const x1 = w;
  const top = 14;
  const base = H - 5;
  const r = (x1 - x0) / 2;
  const cx = (x0 + x1) / 2;
  const shade = (x: number, c: RGB) => {
    const k = (x - cx) / r;
    return mix(c, k < -0.2 ? [255, 250, 230] : [24, 22, 34], k < -0.2 ? Math.min(0.3, (-k - 0.2) * 0.5) : Math.min(0.6, (k + 0.2) * 0.55));
  };
  const surface = (x: number) => Math.round(cx + Math.asin(Math.max(-1, Math.min(1, (x - cx) / r))) * r * 0.8);
  for (let y = top; y <= base; y++) {
    for (let x = x0; x <= x1; x++) {
      let c = cutStone(surface(x), y, x0, top);
      if (y > base - 6) c = fieldstone(surface(x), y);
      pm.set(x, y, shade(x, c));
    }
  }
  // String course under the parapet, and the battered foot.
  const course = top + 7;
  for (let x = x0 - 1; x <= x1 + 1; x++) {
    pm.set(x, course, shade(x, CUT[0]));
    pm.set(x, course + 1, shade(x, CUT[3]));
    pm.set(x, course + 2, shade(x, mix(CUT[4], [0, 0, 0], 0.3)));
  }
  // Parapet with crenels (merlons lit on the left face).
  for (let x = x0 - 1; x <= x1 + 1; x++) {
    const m = Math.floor((x - x0 + 1) / 5) % 2 === 0;
    const lx = (x - x0 + 1) % 5;
    const from = m ? top - 5 : top;
    for (let y = from; y < course; y++) pm.set(x, y, shade(x, lit(CUT, y === from ? 0.6 : lx === 0 ? 0.4 : lx === 4 ? -0.4 : 0.05)));
    if (!m) pm.set(x, top, shade(x, CUT[4]));
  }
  // Pennant.
  const px = Math.round(cx) + 2;
  pm.vline(px, top - 13, top - 5, WOOD[3]);
  pm.set(px, top - 14, [238, 196, 80]);
  for (let j = 0; j < 4; j++) for (let i = 1; i <= 6 - j * 1.5; i++) pm.set(px + i, top - 13 + j, j === 0 ? [206, 70, 70] : [168, 50, 54]);
  // Arrow slits.
  const slit = (sx: number, sy: number) => {
    for (let j = -1; j <= 7; j++) for (let i = -1; i <= 2; i++) pm.set(sx + i, sy + j, shade(sx + i, j === -1 || j === 7 ? CUT[0] : i === -1 ? CUT[1] : CUT[3]));
    pm.rect(sx, sy, 2, 7, [26, 22, 34]);
    pm.hline(sx - 1, sx + 2, sy + 3, [26, 22, 34]);
  };
  slit(Math.round(cx) - 5, course + 8);
  if (base - course > 50) slit(Math.round(cx) + 4, course + 28);
  door(pm, Math.round(cx) + 1, base, 16, 10, true, true);
  finish(pm);
  castShadow(pm, 4);
  return { pm, anchorX: Math.round(cx), anchorY: base };
}

export function renderBuilding(kind: BuildingKind, w: number, h: number): BuildingArt {
  switch (kind) {
    case 'cottage':
      return cottage(w, h);
    case 'village_house':
      return villageHouse(w, h);
    case 'stone_house':
      return stoneCottage(w, h);
    case 'inn_building':
      return inn(w, h);
    case 'blacksmith_shop':
      return forge(w, h);
    case 'guard_barracks':
      return barracks(w, h);
    case 'market_hall':
      return marketHall(w, h);
    case 'stone_tower':
      return tower(w, h);
  }
}

// ---------------------------------------------------------------- dungeons

const CAP = ramp([50, 46, 60], 0.4);
const BRICK = ramp([128, 116, 112], 0.4);

// A dungeon wall block on its footprint: a dark stone cap on top and a
// lit face of rough stones along the bottom, rising above the footprint.
export function renderWallBlock(w: number, h: number): BuildingArt {
  const rise = 8;
  const face = Math.min(16, Math.max(10, Math.round(h * 0.35)));
  const H = h + rise;
  const pm = new Pixmap(w, H);
  const capBottom = H - face - 1;
  for (let y = 0; y <= capBottom; y++) {
    for (let x = 0; x < w; x++) {
      const s = cell(x, y, 7, 61, 1.3);
      let c = s.d2 - s.d1 < 0.08 ? CAP[4] : lit(CAP, -s.dx * 0.3 - s.dy * 0.4 + (hash2(s.id, 1, 62) - 0.5) * 0.5);
      if (y === 0 || x === 0) c = CAP[1];
      if (x === w - 1) c = CAP[4];
      pm.set(x, y, c);
    }
  }
  for (let y = capBottom + 1; y < H; y++) {
    for (let x = 0; x < w; x++) {
      const s = cell(x, y, 5, 63, 1.5);
      let c = s.d2 - s.d1 < 0.1 ? BRICK[4] : lit(BRICK, -s.dx * 0.5 - s.dy * 0.7 + (hash2(s.id, 1, 64) - 0.5) * 0.5);
      if (y === capBottom + 1) c = BRICK[0];
      if (y - capBottom <= 3) c = mix(c, [255, 250, 230], 0.08);
      if (y >= H - 3 && hash2(x, y, 65) < 0.3) c = [86, 116, 70]; // moss at the foot
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
    for (let y = 0; y < H; y++) for (let x = px; x < px + post; x++) pm.set(x, y, cutStone(x, y, px, 0));
    pm.vline(px, 0, H - 1, CUT[1]);
    pm.vline(px + post - 1, 0, H - 1, CUT[4]);
  }
  pm.rect(post, 2, w - post * 2, 3, IRON[4]);
  for (let x = post + 2; x < w - post - 1; x += 5) {
    pm.vline(x, 2, H - 2, IRON[1]);
    pm.vline(x + 1, 2, H - 2, IRON[3]);
    pm.set(x, H - 1, IRON[0]);
  }
  for (const y of [10, 20]) {
    pm.hline(post, w - post - 1, y, IRON[3]);
    pm.hline(post, w - post - 1, y + 1, IRON[4]);
  }
  pm.outline(OUTLINE);
  return { pm, anchorX: Math.round(w / 2), anchorY: H - 1 };
}
