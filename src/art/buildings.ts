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
  | 'stone_tower'
  | 'barn'
  | 'mausoleum'
  | 'town_house'
  | 'merchant_house'
  | 'old_house'
  | 'dock_shack'
  | 'storehouse'
  | 'lodge'
  | 'stilt_hut';

export interface BuildingArt {
  pm: Pixmap;
  // Where the footprint's bottom center sits inside the picture.
  anchorX: number;
  anchorY: number;
  // Where the walls meet the ground (picture x), and the door if any, so
  // the scene can settle the building: worn earth at the door, grass
  // tufts along the foot of the walls.
  wallX0: number;
  wallX1: number;
  doorX?: number;
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
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base, wallX0: p.wx0, wallX1: p.wx1, doorX };
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
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base, wallX0: p.wx0, wallX1: p.wx1, doorX };
}

// A plank barn with its gable to the yard: big braced double doors, a
// hay loft opening above them, a fieldstone footing, a thatched roof.
function barn(w: number, h: number): BuildingArt {
  const p = plan(w, h, Math.max(26, Math.min(32, Math.round(h * 0.6))), Math.max(26, Math.min(40, Math.round(h * 0.7) + 6)));
  const pm = new Pixmap(p.W, p.H);
  wall(pm, 'planks', p.wx0, p.wx1, p.wallTop, p.base, { plinth: 3 });
  // Corner posts.
  for (const px of [p.wx0, p.wx1 - 1]) for (let y = p.wallTop; y <= p.base - 3; y++) {
    pm.set(px, y, TIMBER[2]);
    pm.set(px + 1, y, TIMBER[3]);
  }
  // Double doors with X braces, one leaf ajar onto the dark inside.
  const doorX = Math.round((p.wx0 + p.wx1) / 2);
  const dw = Math.min(22, Math.round((p.wx1 - p.wx0) * 0.45));
  const dh = Math.min(22, p.base - p.wallTop - 4);
  const dx0 = doorX - Math.round(dw / 2);
  const dTop = p.base - dh + 1;
  for (let y = dTop - 1; y <= p.base; y++) for (let x = dx0 - 1; x <= dx0 + dw; x++) pm.set(x, y, TIMBER[3]);
  for (let y = dTop; y <= p.base; y++) {
    for (let x = dx0; x < dx0 + dw; x++) {
      const leaf = x < doorX ? 0 : 1;
      if (leaf === 1 && x > doorX + dw / 2 - 5) {
        pm.set(x, y, [34, 26, 26]); // ajar: the dark barn
        continue;
      }
      pm.set(x, y, lit(WOOD, ((x - dx0) % 4 === 0 ? -0.6 : 0.1) + (y === dTop ? -0.4 : 0) + (leaf ? -0.15 : 0.1)));
    }
  }
  const brace = (x0: number, x1: number) => {
    for (let i = 0; i <= dh - 3; i++) {
      const t = i / (dh - 3);
      pm.set(Math.round(x0 + (x1 - x0) * t), dTop + 1 + i, WOOD[0]);
      pm.set(Math.round(x1 - (x1 - x0) * t), dTop + 1 + i, WOOD[0]);
    }
    pm.hline(x0, x1, dTop + 1, WOOD[0]);
    pm.hline(x0, x1, p.base - 1, WOOD[3]);
  };
  brace(dx0 + 1, doorX - 2);
  // Hay spilling at the foot of the open leaf.
  for (let x = doorX + Math.round(dw / 2) - 6; x < dx0 + dw; x++) if (hash2(x, 3, 5) < 0.7) pm.set(x, p.base - (hash2(x, 4, 5) < 0.4 ? 1 : 0), [214, 176, 96]);
  finish(pm);
  // Thatched gable roof seen from the front, with a loft opening.
  gableRoof(pm, 0, p.W - 4, 2, p.wallTop + 2, 'thatch', false);
  const lx = doorX - 4;
  const ly = Math.round((2 + p.wallTop) / 2) + 2;
  for (let y = ly; y < ly + 7; y++) for (let x = lx; x < lx + 8; x++) pm.set(x, y, y < ly + 3 ? [34, 26, 26] : hash2(x, y, 7) < 0.6 ? [226, 190, 110] : [186, 146, 76]);
  pm.hline(lx - 1, lx + 8, ly - 1, TIMBER[2]);
  pm.vline(lx - 1, ly, ly + 6, TIMBER[2]);
  pm.vline(lx + 8, ly, ly + 6, TIMBER[3]);
  // Hoist beam.
  pm.hline(doorX - 1, doorX + 1, ly - 3, TIMBER[1]);
  pm.vline(doorX, ly - 2, ly - 1, TIMBER[2]);
  finish(pm);
  castShadow(pm, 4);
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base, wallX0: p.wx0, wallX1: p.wx1, doorX };
}

// A small family crypt: cut stone, an iron door, a carved cross, a slate
// roof, ivy and urns at the corners.
function mausoleum(w: number, h: number): BuildingArt {
  const p = plan(w, h, Math.max(22, Math.min(26, Math.round(h * 0.7))), Math.max(16, Math.min(24, Math.round(h * 0.6) + 4)));
  const pm = new Pixmap(p.W, p.H);
  wall(pm, 'cut', p.wx0, p.wx1, p.wallTop, p.base, { plinth: 3 });
  const doorX = Math.round((p.wx0 + p.wx1) / 2);
  // Iron door with studs, under a stone arch.
  const dh = Math.min(16, p.base - p.wallTop - 4);
  door(pm, doorX, p.base, dh, 10, true, true);
  for (let y = p.base - dh + 2; y <= p.base - 1; y++) for (let x = doorX - 4; x <= doorX + 4; x++) pm.set(x, y, lit(IRON, (x === doorX - 4 ? 0.3 : x === doorX + 4 ? -0.6 : -0.1) + ((x + y) % 4 === 0 ? 0.5 : 0)));
  // Carved cross above the door.
  pm.vline(doorX, p.wallTop + 2, p.wallTop + 6, CUT[4]);
  pm.hline(doorX - 2, doorX + 2, p.wallTop + 3, CUT[4]);
  ivy(pm, p.wx0 + 2, p.wallTop + 4, p.base, 9);
  hipRoof(pm, 0, p.W - 4, 2, p.wallTop + 2, 'slate');
  finish(pm);
  castShadow(pm, 4);
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base, wallX0: p.wx0, wallX1: p.wx1, doorX };
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
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base, wallX0: p.wx0, wallX1: p.wx1, doorX };
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
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base, wallX0: p.wx0, wallX1: p.wx1, doorX };
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
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base, wallX0: p.wx0, wallX1: p.wx1, doorX };
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
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base, wallX0: p.wx0, wallX1: p.wx1, doorX };
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
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base, wallX0: p.wx0, wallX1: p.wx1 };
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
  return { pm, anchorX: Math.round(cx), anchorY: base, wallX0: x0, wallX1: x1, doorX: Math.round(cx) + 1 };
}

// ------------------------------------------------------------ the town

// A striped canvas awning over a shop front, with its shadow on the wall.
function awning(pm: Pixmap, x0: number, x1: number, y: number, depth: number, colors: [Ramp, Ramp]): void {
  for (let j = 0; j < depth; j++) {
    for (let x = x0 - (j >> 1); x <= x1 + (j >> 1); x++) {
      const stripe = Math.floor((x - x0 + 40) / 3) % 2;
      const r = colors[stripe];
      pm.set(x, y + j, lit(r, j === 0 ? 0.45 : j === depth - 1 ? -0.5 : 0.1 - j * 0.08));
    }
  }
  // Scalloped valance.
  for (let x = x0 - (depth >> 1); x <= x1 + (depth >> 1); x++) {
    const stripe = Math.floor((x - x0 + 40) / 3) % 2;
    if ((x - x0 + 40) % 3 !== 2) pm.set(x, y + depth, colors[stripe][3]);
  }
  for (let x = x0; x <= x1; x++) {
    const c = pm.get(x, y + depth + 1);
    if (c) pm.set(x, y + depth + 1, mix(c, [30, 24, 34], 0.45));
  }
}

// A hanging shop sign on an iron bracket: a board with a painted emblem.
function shopSign(pm: Pixmap, x: number, y: number, emblem: 'boot' | 'loaf' | 'key' | 'book' | 'cup'): void {
  pm.hline(x, x + 9, y, IRON[2]);
  pm.set(x, y + 1, IRON[2]);
  pm.set(x + 3, y + 1, IRON[3]);
  pm.set(x + 8, y + 1, IRON[3]);
  for (let j = 0; j < 7; j++) for (let i = 0; i < 8; i++) pm.set(x + 2 + i, y + 2 + j, lit(WOOD, i === 0 ? 0.4 : i === 7 || j === 6 ? -0.5 : 0.05));
  const ex = x + 4;
  const ey = y + 4;
  const G: RGB = [238, 196, 80];
  const shapes: Record<typeof emblem, [number, number][]> = {
    boot: [[1, 0], [1, 1], [1, 2], [2, 2], [3, 2]],
    loaf: [[0, 1], [1, 0], [2, 0], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2]],
    key: [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [3, 2]],
    book: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2]],
    cup: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]],
  };
  shapes[emblem].forEach(([i, j]) => pm.set(ex + i, ey + j, emblem === 'loaf' ? [226, 170, 96] : G));
}

// A tall town house: a cut-stone shop floor, a jettied timber-framed floor
// above, a steep gable. The variant (from its size) picks the roof, the
// shutters and the trade.
function townHouse(w: number, h: number): BuildingArt {
  const v = Math.floor(hash2(w, h, 301) * 4);
  const lower = 21;
  const upper = 19;
  const p = plan(w, h, lower + upper, Math.max(24, Math.min(36, Math.round(h * 0.55) + 6)));
  const pm = new Pixmap(p.W, p.H);
  const split = p.base - lower + 1;
  wall(pm, 'cut', p.wx0 + 1, p.wx1 - 1, split, p.base, { plinth: 2 });
  wall(pm, 'daub', p.wx0 - 1, p.wx1 + 1, p.wallTop, split - 1, { frame: true });
  pm.hline(p.wx0 - 1, p.wx1 + 1, split - 1, TIMBER[3]);
  pm.hline(p.wx0 + 1, p.wx1 - 1, split, [40, 34, 40]);
  // Carved beam ends under the jetty.
  for (let x = p.wx0 + 3; x < p.wx1 - 1; x += 7) pm.set(x, split, TIMBER[2]);
  const doorLeft = v % 2 === 0;
  const doorX = doorLeft ? p.wx0 + 11 : p.wx1 - 11;
  door(pm, doorX, p.base, 16, 9, true, true);
  // The shop window: wide, warm, with a sill of goods.
  const sx0 = doorLeft ? doorX + 9 : p.wx0 + 5;
  const sx1 = doorLeft ? p.wx1 - 5 : doorX - 9;
  if (sx1 - sx0 >= 9) {
    window(pm, sx0, split + 5, sx1 - sx0, 8, true);
    pm.hline(sx0 - 1, sx1, split + 13, CUT[1]);
    pm.hline(sx0 - 1, sx1, split + 14, CUT[3]);
  }
  const SH = [SHUTTERS.blue, SHUTTERS.green, SHUTTERS.red, SHUTTERS.ochre][v];
  windowsRow(pm, p, p.wallTop + 6, -100, 0, 6, 7, { shutters: SH, boxes: v !== 2 });
  shopSign(pm, doorLeft ? doorX + 5 : doorX - 15, split + 1, (['boot', 'loaf', 'key', 'cup'] as const)[v]);
  if (v === 1 || v === 3) chimney(pm, p.wx1 - 14, 6, 14);
  gableRoof(pm, 0, p.W - 4, 2, p.wallTop + 2, v === 2 ? 'tiles' : 'slate', true);
  finish(pm);
  castShadow(pm, 4);
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base, wallX0: p.wx0, wallX1: p.wx1, doorX };
}

// A merchant's house all in cut stone: a tiled hip roof, a striped awning
// over the counter, shuttered windows with flower boxes above.
function merchantHouse(w: number, h: number): BuildingArt {
  const v = Math.floor(hash2(w, h, 302) * 3);
  const p = plan(w, h, 38, Math.max(20, Math.min(30, Math.round(h * 0.45) + 4)));
  const pm = new Pixmap(p.W, p.H);
  wall(pm, 'cut', p.wx0, p.wx1, p.wallTop, p.base, { plinth: 2 });
  // A moulded string course between the floors.
  const course = p.wallTop + 17;
  pm.hline(p.wx0, p.wx1, course, CUT[0]);
  pm.hline(p.wx0, p.wx1, course + 1, CUT[3]);
  const doorX = p.wx1 - 10;
  door(pm, doorX, p.base, 15, 9, true, true);
  windowsRow(pm, p, p.wallTop + 5, -100, 0, 6, 7, { shutters: [SHUTTERS.green, SHUTTERS.red, SHUTTERS.blue][v], boxes: true });
  // Counter under the awning.
  const cx0 = p.wx0 + 4;
  const cx1 = doorX - 9;
  const RED = ramp([182, 58, 54]);
  const CREAM = ramp([236, 226, 196], 0.6);
  const GREEN = ramp([70, 128, 84]);
  const BLUE = ramp([66, 104, 162], 0.5);
  awning(pm, cx0, cx1, course + 3, 5, [[RED, GREEN, BLUE][v], CREAM]);
  for (let y = course + 9; y <= p.base - 1; y++) for (let x = cx0; x <= cx1; x++) pm.set(x, y, y < p.base - 6 ? [44, 34, 40] : lit(WOOD, y === p.base - 6 ? 0.5 : -0.1 + ((x - cx0) % 5 === 0 ? -0.5 : 0)));
  // Goods on the counter: bolts of cloth, jars or loaves.
  for (let x = cx0 + 1; x < cx1 - 2; x += 4) {
    const k = hash2(x, v, 303);
    const c: RGB = v === 0 ? (k < 0.5 ? [196, 72, 70] : [86, 120, 180]) : v === 1 ? [226, 176, 96] : k < 0.5 ? [150, 186, 120] : [214, 196, 150];
    pm.hline(x, x + 2, p.base - 7, c);
    pm.hline(x, x + 2, p.base - 8, mix(c, [255, 255, 255], 0.3));
  }
  hipRoof(pm, 0, p.W - 4, 2, p.wallTop + 2, 'tiles');
  finish(pm);
  castShadow(pm, 4);
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base, wallX0: p.wx0, wallX1: p.wx1, doorX };
}

// Boards nailed across a window.
function boarded(pm: Pixmap, x: number, y: number, w: number, h: number): void {
  for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) pm.set(x + i, y + j, i === -1 || j === -1 || i === w || j === h ? TIMBER[3] : [28, 22, 28]);
  for (let i = -2; i <= w + 1; i++) {
    pm.set(x + i, y + Math.round((i + 2) * (h / (w + 4))), lit(WOOD, -0.1));
    pm.set(x + i, y + h - 1 - Math.round((i + 2) * (h / (w + 4))), lit(WOOD, 0.2));
  }
  pm.hline(x - 2, x + w + 1, y + (h >> 1), lit(WOOD, 0.35));
}

// An old house nobody has lived in for generations: soot-dark stone,
// sagging mossy shingles with a hole, boarded windows, a door held shut by
// chains and a padlock.
function oldHouse(w: number, h: number): BuildingArt {
  const p = plan(w, h, Math.max(26, Math.min(32, Math.round(h * 0.6))), Math.max(22, Math.min(32, Math.round(h * 0.55) + 4)));
  const pm = new Pixmap(p.W, p.H);
  wall(pm, 'field', p.wx0, p.wx1, p.wallTop, p.base);
  for (let y = p.wallTop; y <= p.base; y++) {
    for (let x = p.wx0; x <= p.wx1; x++) {
      const c = pm.get(x, y)!;
      // Soot and damp: darker, colder, streaked down from the eave.
      const streak = hash2(x, 1, 311) < 0.2 ? 0.18 : 0;
      pm.set(x, y, mix(c, [40, 42, 52], 0.32 + streak - ((y - p.wallTop) / (p.base - p.wallTop)) * 0.1));
    }
  }
  const doorX = Math.round((p.wx0 + p.wx1) / 2);
  door(pm, doorX, p.base, 17, 10, true, true);
  for (let y = p.base - 16; y <= p.base; y++) for (let x = doorX - 5; x <= doorX + 4; x++) {
    const c = pm.get(x, y);
    if (c) pm.set(x, y, mix(c, [36, 30, 34], 0.35));
  }
  // Chains across the door, a padlock in the middle.
  for (let i = -6; i <= 5; i++) {
    const y1 = p.base - 11 + Math.round(Math.abs(i) * 0.5);
    const LINK: RGB[] = [[176, 178, 190], [110, 112, 126]];
    pm.set(doorX + i, y1, LINK[i & 1]);
    pm.set(doorX + i, p.base - 5 - Math.round(Math.abs(i) * 0.5), LINK[(i + 1) & 1]);
  }
  pm.rect(doorX - 1, p.base - 10, 3, 3, [150, 120, 60]);
  pm.set(doorX, p.base - 11, IRON[1]);
  // A pale seal pasted on the door.
  pm.rect(doorX - 3, p.base - 15, 2, 3, [214, 200, 160]);
  pm.set(doorX - 3, p.base - 13, [150, 50, 50]);
  const ww = 7;
  boarded(pm, p.wx0 + 6, p.wallTop + 8, ww, 7);
  boarded(pm, p.wx1 - 6 - ww, p.wallTop + 8, ww, 7);
  ivy(pm, p.wx1 - 3, p.wallTop + 2, p.base, 13);
  ivy(pm, p.wx0 + 2, p.wallTop + 9, p.base, 17);
  hipRoof(pm, 0, p.W - 4, 2, p.wallTop + 2, 'shingles');
  // Sagging: a few shingle rows dip; a hole shows dark rafters.
  const hx = Math.round(p.W * 0.62);
  const hy = Math.round((2 + p.wallTop) / 2);
  for (let j = 0; j < 5; j++) for (let i = 0; i < 7 - Math.abs(j - 2); i++) pm.set(hx + i - j % 2, hy + j, (i + j) % 3 === 0 ? TIMBER[2] : [24, 18, 24]);
  for (let x = 4; x < p.W - 8; x++) if (noise(x, 3, 6, 312) > 0.6) pm.set(x, hy - 2 + Math.round(noise(x, 0, 9, 313) * 4), mix(SHINGLE[2], MOSS, 0.7));
  finish(pm);
  castShadow(pm, 4);
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base, wallX0: p.wx0, wallX1: p.wx1, doorX };
}

// A dock-side shack: tarred plank walls, a mossy shingle roof, fishing
// nets hung to dry, a lantern by the door.
function dockShack(w: number, h: number): BuildingArt {
  const p = plan(w, h, Math.max(20, Math.min(26, Math.round(h * 0.65))), Math.max(16, Math.min(26, Math.round(h * 0.6) + 2)));
  const pm = new Pixmap(p.W, p.H);
  wall(pm, 'planks', p.wx0, p.wx1, p.wallTop, p.base);
  for (let y = p.wallTop; y <= p.base; y++) for (let x = p.wx0; x <= p.wx1; x++) pm.set(x, y, mix(pm.get(x, y)!, [52, 46, 50], 0.38));
  for (const px of [p.wx0, p.wx1 - 1]) for (let y = p.wallTop; y <= p.base; y++) {
    pm.set(px, y, TIMBER[2]);
    pm.set(px + 1, y, TIMBER[3]);
  }
  const doorX = p.wx0 + 10;
  door(pm, doorX, p.base, Math.min(15, p.base - p.wallTop - 3), 8, false, false);
  window(pm, p.wx1 - 11, p.wallTop + 6, 5, 5, true);
  // A net draped on the wall: a mesh of knots, sagging, with floats.
  const nx0 = doorX + 7;
  const nx1 = Math.min(p.wx1 - 14, nx0 + 16);
  if (nx1 - nx0 > 6) {
    const NET: RGB = [176, 160, 120];
    for (let x = nx0; x <= nx1; x++) {
      const sag = Math.round(Math.sin(((x - nx0) / (nx1 - nx0)) * Math.PI) * 3);
      for (let y = p.wallTop + 4; y <= p.wallTop + 11 + sag; y++) if ((x + y) % 3 === 0 || (x - y + 60) % 3 === 0) pm.set(x, y, NET);
      if ((x - nx0) % 5 === 2) pm.set(x, p.wallTop + 12 + sag, [214, 120, 60]);
    }
    pm.hline(nx0 - 1, nx1 + 1, p.wallTop + 3, TIMBER[3]);
  }
  pm.set(doorX - 7, p.wallTop + 4, IRON[2]);
  for (let j = 5; j < 8; j++) for (let i = -1; i <= 1; i++) pm.set(doorX - 7 + i, p.wallTop + j, j === 5 || j === 7 ? IRON[3] : WARM[1]);
  hipRoof(pm, 0, p.W - 4, 2, p.wallTop + 2, 'shingles');
  finish(pm);
  castShadow(pm, 4);
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base, wallX0: p.wx0, wallX1: p.wx1, doorX };
}

// A storehouse on the quays: fieldstone footing, plank walls, wide doors
// under a hoist beam with its rope and hook, a loft door above.
function storehouse(w: number, h: number): BuildingArt {
  const p = plan(w, h, Math.max(30, Math.min(38, Math.round(h * 0.6))), Math.max(22, Math.min(32, Math.round(h * 0.5) + 4)));
  const pm = new Pixmap(p.W, p.H);
  wall(pm, 'planks', p.wx0, p.wx1, p.wallTop, p.base, { plinth: 6 });
  for (let y = p.wallTop; y <= p.base - 6; y++) for (let x = p.wx0; x <= p.wx1; x++) pm.set(x, y, mix(pm.get(x, y)!, [70, 60, 56], 0.25));
  for (let x = p.wx0; x <= p.wx1; x += 16) for (let y = p.wallTop; y <= p.base - 6; y++) {
    pm.set(x, y, TIMBER[2]);
    pm.set(x + 1, y, TIMBER[3]);
  }
  const doorX = Math.round((p.wx0 + p.wx1) / 2);
  const dw = 20;
  const dTop = p.base - 18;
  for (let y = dTop - 1; y <= p.base; y++) for (let x = doorX - dw / 2 - 1; x <= doorX + dw / 2; x++) pm.set(x, y, TIMBER[3]);
  for (let y = dTop; y <= p.base; y++) for (let x = doorX - dw / 2; x < doorX + dw / 2; x++) {
    const leaf = x < doorX;
    pm.set(x, y, lit(WOOD, ((x - doorX + 40) % 4 === 0 ? -0.6 : 0.05) + (y === dTop ? -0.4 : 0) + (leaf ? 0.1 : -0.15)));
  }
  pm.vline(doorX, dTop, p.base, TIMBER[4]);
  for (const sx of [doorX - dw / 2 + 1, doorX + 1]) {
    for (let i = 0; i < dw / 2 - 2; i++) pm.set(sx + i, dTop + 2 + Math.round(i * 1.5), WOOD[0]);
    pm.hline(sx, sx + dw / 2 - 3, dTop + 2, WOOD[0]);
  }
  pm.rect(doorX - 2, dTop + 8, 4, 2, IRON[2]); // the bar
  // Loft door and hoist.
  const ly = p.wallTop + 3;
  for (let y = ly; y < ly + 8; y++) for (let x = doorX - 4; x < doorX + 4; x++) pm.set(x, y, y === ly ? [24, 18, 24] : [34, 26, 30]);
  pm.hline(doorX - 5, doorX + 4, ly - 1, TIMBER[2]);
  for (let y = ly - 3; y < dTop - 4; y++) pm.set(doorX + 6, y, [196, 176, 130]);
  pm.hline(doorX - 1, doorX + 8, ly - 3, TIMBER[1]);
  pm.set(doorX + 5, dTop - 4, IRON[1]);
  pm.set(doorX + 6, dTop - 3, IRON[1]);
  pm.set(doorX + 7, dTop - 4, IRON[1]);
  window(pm, p.wx0 + 6, p.wallTop + 8, 5, 5, false);
  window(pm, p.wx1 - 11, p.wallTop + 8, 5, 5, false);
  hipRoof(pm, 0, p.W - 4, 2, p.wallTop + 2, 'shingles');
  finish(pm);
  castShadow(pm, 4);
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base, wallX0: p.wx0, wallX1: p.wx1, doorX };
}

// A hunters' lodge: walls of stacked logs with notched corners, antlers
// over the door, a pelt stretched on a frame, a shingle roof.
function lodge(w: number, h: number): BuildingArt {
  const p = plan(w, h, Math.max(22, Math.min(28, Math.round(h * 0.65))), Math.max(18, Math.min(28, Math.round(h * 0.6) + 2)));
  const pm = new Pixmap(p.W, p.H);
  const LOG = ramp([138, 96, 60]);
  for (let y = p.wallTop; y <= p.base; y++) {
    const ly = (p.base - y) % 4;
    for (let x = p.wx0; x <= p.wx1; x++) {
      let c = lit(LOG, ly === 3 ? 0.45 : ly === 2 ? 0.15 : ly === 1 ? -0.15 : -0.6);
      if (hash2(x >> 2, (p.base - y) >> 2, 321) < 0.1) c = mix(c, [60, 44, 34], 0.3);
      pm.set(x, y, c);
    }
    // Log ends at the corners.
    for (const ex of [p.wx0 - 1, p.wx1 + 1]) {
      const r: RGB = ly === 0 ? TIMBER[3] : ly === 3 ? [210, 172, 116] : [186, 146, 96];
      pm.set(ex, y, r);
      pm.set(ex + (ex < p.wx0 ? -1 : 1), y, ly === 0 ? TIMBER[3] : [170, 128, 84]);
    }
  }
  const doorX = Math.round((p.wx0 + p.wx1) / 2) - 4;
  door(pm, doorX, p.base, Math.min(13, p.base - p.wallTop - 7), 9, false, false);
  // Antlers above the door.
  const ay = p.base - 15;
  const BONE: RGB = [226, 214, 186];
  pm.rect(doorX - 1, ay, 3, 2, [150, 110, 70]);
  for (let i = 1; i <= 5; i++) {
    pm.set(doorX - 1 - i, ay - Math.round(i * 0.6), BONE);
    pm.set(doorX + 1 + i, ay - Math.round(i * 0.6), BONE);
  }
  for (const s of [-1, 1]) {
    pm.set(doorX + s * 4, ay - 3, BONE);
    pm.set(doorX + s * 6, ay - 5, BONE);
    pm.set(doorX + s * 3, ay - 2, BONE);
  }
  // A pelt on a frame, right of the door.
  const fx = doorX + 9;
  if (fx + 10 < p.wx1) {
    pm.hline(fx, fx + 10, p.wallTop + 4, TIMBER[2]);
    pm.hline(fx, fx + 10, p.base - 3, TIMBER[2]);
    pm.vline(fx, p.wallTop + 4, p.base - 3, TIMBER[2]);
    pm.vline(fx + 10, p.wallTop + 4, p.base - 3, TIMBER[3]);
    const FUR = ramp([150, 110, 74]);
    pm.ellipse(fx + 2, p.wallTop + 6, 7, p.base - p.wallTop - 10, (dx, dy) => lit(FUR, -dx * 0.4 - dy * 0.3 + (hash2(Math.round(dx * 9), Math.round(dy * 9), 322) - 0.5) * 0.4));
  }
  window(pm, p.wx0 + 5, p.wallTop + 7, 5, 5, true);
  hipRoof(pm, 0, p.W - 4, 2, p.wallTop + 2, 'shingles');
  chimney(pm, p.wx0 + 8, 1, 8);
  finish(pm);
  castShadow(pm, 4);
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base, wallX0: p.wx0, wallX1: p.wx1, doorX };
}

// A hut of the drowned lands, raised on stilts over the bog: grey plank
// walls on a deck, the stilts going down into the water with ripples
// round them, a ladder up to the door, a roof of bundled reeds.
function stiltHut(w: number, h: number): BuildingArt {
  const stilts = 7;
  const p = plan(w, h, Math.max(20, Math.min(26, Math.round(h * 0.55))) + stilts, Math.max(16, Math.min(26, Math.round(h * 0.55) + 2)));
  const pm = new Pixmap(p.W, p.H);
  const deck = p.base - stilts;
  // Stilts and the water round their feet.
  for (let x = p.wx0 + 1; x <= p.wx1 - 1; x += Math.max(6, Math.floor((p.wx1 - p.wx0) / 5))) {
    for (let y = deck + 1; y <= p.base; y++) {
      pm.set(x, y, lit(TIMBER, -0.1 - (y - deck) * 0.06));
      pm.set(x + 1, y, TIMBER[4]);
    }
    pm.set(x - 1, p.base, [150, 176, 160]);
    pm.set(x + 2, p.base, [150, 176, 160]);
  }
  // Cross-bracing between the stilts.
  for (let x = p.wx0 + 2; x < p.wx1 - 1; x++) pm.set(x, deck + 2 + ((x >> 2) & 1), TIMBER[3]);
  // The deck: a plank edge running past the walls.
  for (let x = p.wx0 - 2; x <= p.wx1 + 2; x++) {
    pm.set(x, deck - 1, lit(WOOD, 0.4));
    pm.set(x, deck, lit(WOOD, -0.3));
  }
  wall(pm, 'planks', p.wx0, p.wx1, p.wallTop, deck - 2);
  for (let y = p.wallTop; y <= deck - 2; y++) for (let x = p.wx0; x <= p.wx1; x++) pm.set(x, y, mix(pm.get(x, y)!, [110, 112, 106], 0.35));
  const doorX = Math.round((p.wx0 + p.wx1) / 2) + 4;
  door(pm, doorX, deck - 3, Math.min(13, deck - p.wallTop - 5), 8, false, false);
  // The ladder down to the water's edge.
  for (let y = deck + 1; y <= p.base; y++) {
    pm.set(doorX - 3, y, WOOD[2]);
    pm.set(doorX + 3, y, WOOD[3]);
    if ((y - deck) % 2 === 0) pm.hline(doorX - 2, doorX + 2, y, WOOD[1]);
  }
  window(pm, p.wx0 + 5, p.wallTop + 5, 5, 4, true);
  // Fish drying on a line under the eave.
  for (let x = p.wx1 - 12; x <= p.wx1 - 3; x += 3) {
    pm.set(x, p.wallTop + 3, [180, 186, 190]);
    pm.set(x, p.wallTop + 4, [140, 150, 156]);
  }
  hipRoof(pm, 0, p.W - 4, 2, p.wallTop + 2, 'thatch');
  for (let y = 2; y <= p.wallTop + 2; y++) for (let x = 0; x < p.W; x++) {
    const c = pm.get(x, y);
    if (c && pm.data[(y * pm.w + x) * 4 + 3] === 255) pm.set(x, y, mix(c, [120, 128, 96], 0.35)); // reeds, greyer than straw
  }
  finish(pm);
  castShadow(pm, 3);
  return { pm, anchorX: Math.round(p.W / 2) - 2, anchorY: p.base, wallX0: p.wx0, wallX1: p.wx1, doorX };
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
    case 'barn':
      return barn(w, h);
    case 'mausoleum':
      return mausoleum(w, h);
    case 'town_house':
      return townHouse(w, h);
    case 'merchant_house':
      return merchantHouse(w, h);
    case 'old_house':
      return oldHouse(w, h);
    case 'dock_shack':
      return dockShack(w, h);
    case 'storehouse':
      return storehouse(w, h);
    case 'lodge':
      return lodge(w, h);
    case 'stilt_hut':
      return stiltHut(w, h);
  }
}

// ---------------------------------------------------------------- dungeons

const CAP = ramp([40, 36, 50], 0.4);
const BRICK = ramp([128, 116, 112], 0.4);

// A dungeon wall block on its footprint: a dark stone cap on top and a lit
// face of rough stones along the bottom, rising above the footprint.
// Catacomb walls get burial niches in their face (skulls and bones in
// arched recesses); face 0 draws only the cap (walls seen side-on).
export type WallStyle = 'crypt' | 'rock' | 'mossy' | 'carved' | 'shelves' | 'crates' | 'thicket' | 'roots' | 'reeds' | 'timber';

const ROCK_CAP = ramp([58, 52, 56], 0.4);
const ROCK_FACE = ramp([112, 100, 96], 0.5);
const CARVED_CAP = ramp([44, 38, 62], 0.4);
const CARVED_FACE = ramp([92, 84, 118], 0.4);

// Wall blocks that are not masonry: bookcases, stacked crates, a corrupted
// thicket, a mass of roots, a bank of reeds. Same footprint contract as
// the stone blocks (a top seen from above, a face rising in front).
const SHELF_WOOD = ramp([112, 74, 50]);
const BOOKS: RGB[] = [
  [150, 52, 50],
  [62, 92, 140],
  [70, 112, 72],
  [176, 136, 70],
  [110, 70, 120],
  [190, 176, 150],
];
const CRATE_W = ramp([164, 122, 76]);
const THICK = ramp([66, 56, 72], 0.6);
const ROOT = ramp([106, 80, 60]);
const REED = ramp([110, 136, 66]);

function softWall(w: number, h: number, face: number, style: 'shelves' | 'crates' | 'thicket' | 'roots' | 'reeds' | 'timber', seed: number): BuildingArt {
  const rise = face ? 8 : 0;
  const H = h + rise;
  const pm = new Pixmap(w, H);
  const capBottom = H - face - 1;
  if (style === 'timber') {
    // A house's inside wall: a dark beam on top, whitewashed daub between
    // timber posts below, a skirting board, small windows letting in day.
    for (let y = 0; y <= capBottom; y++) for (let x = 0; x < w; x++) pm.set(x, y, lit(TIMBER, (y === 0 || x === 0 ? 0.3 : -0.2) + (hash2(x >> 2, y >> 1, seed) - 0.5) * 0.3));
    for (let y = capBottom + 1; y < H; y++) {
      for (let x = 0; x < w; x++) {
        const post = x % 24 < 2;
        let c = post ? TIMBER[x % 24 === 0 ? 2 : 3] : mix(daub(x, y), [255, 246, 226], 0.15);
        if (y - capBottom === 1) c = TIMBER[3];
        if (y >= H - 3) c = lit(TIMBER, y === H - 3 ? 0.2 : -0.3);
        if (y - capBottom <= 3 && !post) c = mix(c, [30, 24, 30], 0.25);
        pm.set(x, y, c);
      }
    }
    // Windows only in a long wall (not on a post).
    if (face >= 12 && w >= 60) {
      for (let x = 14; x + 8 < w; x += 48) {
        for (let j = 0; j < 7; j++) for (let i = 0; i < 8; i++) pm.set(x + i, capBottom + 4 + j, i === 0 || j === 0 || i === 7 || j === 6 || i === 4 || j === 3 ? TIMBER[2] : j < 3 ? [196, 226, 244] : [150, 196, 226]);
      }
    }
  } else if (style === 'shelves') {
    // Rows of bookcases seen from above and in front: each row shows its
    // plank top, then the spines of its books; the face rises in front.
    const spine = (x: number, y: number, row: number): RGB => {
      const ly = y % 7;
      if (x % 12 === 0 || x % 12 === 11) return lit(SHELF_WOOD, x % 12 === 0 ? 0.2 : -0.5);
      if (ly === 0) return lit(SHELF_WOOD, 0.35);
      if (ly === 6) return SHELF_WOOD[4];
      const book = Math.floor((x + row * 5) / 2);
      const tall = hash2(book, row, seed + 1);
      if ((ly === 1 && tall < 0.5) || tall > 0.92) return [30, 22, 26];
      const b = BOOKS[Math.floor(hash2(book, 3 + row, seed + 2) * BOOKS.length)];
      if (ly === 3 && hash2(book, 4 + row, seed) < 0.5) return [214, 180, 90]; // gilt band
      return mix(b, x % 2 ? [20, 16, 22] : [255, 240, 210], x % 2 ? 0.25 : 0.12);
    };
    for (let y = 0; y <= capBottom; y++) {
      const row = Math.floor(y / 11);
      const ly = y % 11;
      for (let x = 0; x < w; x++) {
        let c: RGB;
        if (ly < 3) c = lit(SHELF_WOOD, ly === 0 ? 0.5 : ly === 1 ? 0.2 : -0.1);
        else c = mix(spine(x, ly - 3, row), [18, 12, 16], 0.25 + (ly === 3 ? 0.3 : 0));
        pm.set(x, y, c);
      }
    }
    for (let y = capBottom + 1; y < H; y++) for (let x = 0; x < w; x++) {
      let c = spine(x, y - capBottom - 1, 99);
      if (y - capBottom <= 2) c = mix(c, [20, 14, 18], 0.3);
      pm.set(x, y, c);
    }
  } else if (style === 'crates') {
    // Crates stacked high: tops of the upper row seen from above, fronts
    // with plank seams and diagonal braces.
    const cs = 12;
    for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) {
      const top = y <= capBottom;
      const lx = x % cs;
      const ly = top ? y % cs : (y - capBottom - 1) % cs;
      const id = Math.floor(x / cs) + (top ? 0 : 50) + Math.floor((top ? y : y - capBottom) / cs) * 7;
      const tone = (hash2(id, 1, seed) - 0.5) * 0.4 - (top ? 0 : 0.2);
      let c: RGB;
      if (lx === 0 || ly === 0) c = lit(CRATE_W, tone + 0.5);
      else if (lx === cs - 1 || ly === cs - 1) c = lit(CRATE_W, tone - 0.7);
      else if (!top && (lx === ly || lx === cs - 1 - ly)) c = lit(CRATE_W, tone + 0.2);
      else c = lit(CRATE_W, tone + (ly % 4 === 0 ? -0.35 : 0));
      if (!top && y - capBottom <= 2) c = mix(c, [24, 18, 20], 0.35);
      pm.set(x, y, c);
    }
  } else if (style === 'thicket' || style === 'roots' || style === 'reeds') {
    // An organic mass: a dark tangle on top, a ragged outline, its foot.
    const R = style === 'thicket' ? THICK : style === 'roots' ? ROOT : REED;
    const ragged = (x: number, y: number) => Math.min(x, w - 1 - x, y) < 3 && noise(x, y, 4, seed + 9) * 3.2 > Math.min(x, w - 1 - x, y) + 0.4;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < w; x++) {
        if (ragged(x, y)) continue;
        const front = y > capBottom;
        let level: number;
        if (style === 'reeds') {
          // Stems: vertical strokes, lit tips, darker toward the water.
          // Clumps of stems: each column lit or in shade, tips catching
          // the light, gaps dark between the clumps.
          const clump = noise(x, y, 5, seed + 7);
          const stem = hash2(x, Math.floor(y / 7), seed) < 0.6;
          const tip = hash2(x, Math.floor((y + 3) / 7), seed + 8) < 0.12;
          level = clump < 0.3 ? -0.9 : (stem ? 0.3 : -0.45) + (tip ? 0.6 : 0) - (front ? (y - capBottom) / face : 0) * 0.6 + (hash2(x, y >> 2, seed + 1) - 0.5) * 0.25;
          if (!front && hash2(x, y, seed + 2) < 0.04) {
            pm.set(x, y, [120, 76, 48]); // cattail
            continue;
          }
        } else {
          // Twisted strands: a direction field gives long lit runs.
          const a = noise(x, y, 9, seed + 3) * Math.PI * 2;
          const strand = Math.sin(x * Math.cos(a) * 0.9 + y * Math.sin(a) * 0.9 + noise(x, y, 5, seed + 4) * 4);
          level = strand * 0.55 - 0.15 - (front ? (y - capBottom) / face : 0) * 0.5;
          if (style === 'thicket' && strand > 0.93 && hash2(x, y, seed + 5) < 0.25) {
            pm.set(x, y, [196, 120, 244]); // a glowing vein
            continue;
          }
          if (style === 'thicket' && hash2(x, y, seed + 6) < 0.03) level += 0.9; // thorn tips
        }
        if (y >= H - 2) level -= 0.5;
        pm.set(x, y, lit(R, level));
      }
    }
  }
  pm.outline(OUTLINE);
  return { pm, anchorX: Math.round(w / 2), anchorY: H - 1, wallX0: 0, wallX1: w - 1 };
}

export function renderWallBlock(w: number, h: number, opts: { niches?: boolean; face?: number; seed?: number; style?: WallStyle } = {}): BuildingArt {
  const seed = opts.seed ?? 61;
  const style = opts.style ?? 'crypt';
  if (style === 'shelves' || style === 'crates' || style === 'thicket' || style === 'roots' || style === 'reeds' || style === 'timber') {
    return softWall(w, h, opts.face ?? Math.min(18, Math.max(12, Math.round(h * 0.35))), style, seed);
  }
  const cap = style === 'rock' ? ROCK_CAP : style === 'carved' ? CARVED_CAP : CAP;
  const brick = style === 'rock' ? ROCK_FACE : style === 'carved' ? CARVED_FACE : BRICK;
  const face = opts.face ?? Math.min(18, Math.max(12, Math.round(h * 0.35)));
  const rise = face ? 8 : 0;
  const H = h + rise;
  const pm = new Pixmap(w, H);
  const capBottom = H - face - 1;
  // Rock masses have a ragged outline instead of a cut block.
  const ragged = (x: number, y: number) => {
    if (style !== 'rock') return false;
    const edge = Math.min(x, w - 1 - x, y);
    return edge < 3 && noise(x, y, 4, seed + 9) * 3 > edge + 0.6;
  };
  const capCell = style === 'rock' ? 9 : 7;
  for (let y = 0; y <= capBottom; y++) {
    for (let x = 0; x < w; x++) {
      if (ragged(x, y)) continue;
      const s = cell(x, y, capCell, seed, 1.3);
      let c = s.d2 - s.d1 < 0.08 ? cap[4] : lit(cap, -s.dx * 0.3 - s.dy * 0.4 + (hash2(s.id, 1, seed + 1) - 0.5) * 0.5);
      // Worn, lit rims along the top edges.
      if (style !== 'rock') {
        if (y === 0 || x === 0) c = style === 'carved' ? [120, 108, 150] : [128, 120, 132];
        else if (y === 1 || x === 1) c = cap[0];
      } else if (!ragged(x, y - 1) && (y === 0 || ragged(x, y - 1))) c = cap[0];
      if (x === w - 1) c = cap[4];
      if (style === 'mossy' && noise(x, y, 5, seed + 3) > 0.62) c = mix(c, [70, 104, 58], 0.6);
      pm.set(x, y, c);
    }
  }
  for (let y = capBottom + 1; y < H; y++) {
    for (let x = 0; x < w; x++) {
      if (style === 'rock' && Math.min(x, w - 1 - x) < 2 && noise(x, y, 3, seed + 4) > 0.55) continue;
      const s = cell(x, y, style === 'rock' ? 6 : 5, seed + 2, style === 'rock' ? 1.2 : 1.5);
      let c = s.d2 - s.d1 < 0.1 ? brick[4] : lit(brick, -s.dx * 0.5 - s.dy * 0.7 + (hash2(s.id, 1, seed + 3) - 0.5) * 0.5);
      if (y === capBottom + 1) c = brick[0];
      if (y - capBottom <= 3) c = mix(c, [255, 250, 230], 0.08);
      if (y >= H - 3) c = mix(c, [24, 20, 28], (y - (H - 4)) * 0.15); // grime at the foot
      if (x === w - 1) c = mix(c, [24, 20, 28], 0.3);
      if (style === 'mossy') {
        if (noise(x, y, 4, seed + 5) > 0.6) c = mix(c, [74, 112, 60], 0.55);
        if (hash2(x, 1, seed + 6) < 0.12 && y - capBottom < 8) c = mix(c, [40, 52, 46], 0.5); // damp streaks
      }
      pm.set(x, y, c);
    }
  }
  if (style === 'carved' && face >= 10) {
    // A band of carved runes glowing faintly violet.
    const by = capBottom + Math.round(face / 2);
    for (let x = 2; x < w - 2; x++) {
      pm.set(x, by - 2, brick[3]);
      pm.set(x, by + 2, brick[1]);
      const k = x % 6;
      const glyph = hash2(Math.floor(x / 6), 1, seed + 7);
      const on = (k === 1 || k === 3) && glyph < 0.8 ? true : k === 2 && glyph < 0.5;
      if (on) for (let j = -1; j <= 1; j++) if (hash2(x, j, seed + 8) < 0.75) pm.set(x, by + j, [190, 140, 250]);
    }
  }
  if (opts.niches && face >= 10) {
    // Rows of arched loculi, each holding a skull or a bundle of bones.
    const rows = face >= 16 ? 2 : 1;
    const nh = 5;
    for (let r = 0; r < rows; r++) {
      const ny = capBottom + 3 + r * (nh + 2);
      const count = Math.max(1, Math.floor((w - 3) / 8));
      const start = Math.floor((w - count * 8 + 2) / 2);
      for (let i = 0; i < count; i++) {
        const nx = start + i * 8 + (r % 2 ? 2 : 0);
        if (nx + 6 > w - 1) continue;
        for (let j = 0; j < nh; j++) {
          for (let k = 0; k < 6; k++) {
            if (j === 0 && (k === 0 || k === 5)) continue; // arched top
            pm.set(nx + k, ny + j, j === 0 ? [20, 16, 24] : [30, 24, 32]);
          }
        }
        pm.hline(nx, nx + 5, ny + nh, brick[0]); // sill
        const kind = hash2(i, r, seed + 5);
        const B: RGB = [214, 204, 178];
        const D: RGB = [150, 140, 120];
        if (kind < 0.55) {
          pm.hline(nx + 2, nx + 3, ny + 1, B);
          pm.hline(nx + 1, nx + 4, ny + 2, B);
          pm.set(nx + 2, ny + 2, [30, 24, 32]);
          pm.set(nx + 4, ny + 2, [30, 24, 32]);
          pm.hline(nx + 2, nx + 3, ny + 3, D);
          pm.hline(nx + 1, nx + 4, ny + 4, D);
        } else if (kind < 0.85) {
          pm.hline(nx + 1, nx + 4, ny + 3, B);
          pm.hline(nx + 1, nx + 4, ny + 4, D);
          pm.set(nx + 1, ny + 2, B);
          pm.set(nx + 4, ny + 2, D);
        }
      }
    }
  }
  pm.outline(OUTLINE);
  return { pm, anchorX: Math.round(w / 2), anchorY: H - 1, wallX0: 0, wallX1: w - 1 };
}

export type GateKind = 'portcullis' | 'rusty' | 'runes' | 'barricade' | 'brambles' | 'roots' | 'shelves' | 'crates' | 'rubble' | 'slab' | 'net' | 'rift' | 'door' | 'light';

// A barrier closing a passage of width w, standing on its base line: an
// iron portcullis, rusty graveyard railings, a veil of runes, or a wooden
// barricade of planks and stakes.
export function renderBarrier(kind: GateKind, w: number): BuildingArt {
  if (kind === 'portcullis') return renderGate(w);
  if (kind === 'brambles' || kind === 'roots' || kind === 'shelves' || kind === 'crates' || kind === 'rubble' || kind === 'slab') return heapBarrier(kind, w);
  if (kind === 'net') return netBarrier(w);
  if (kind === 'rift') return riftBarrier(w);
  if (kind === 'door') return doorBarrier(w);
  if (kind === 'light') return lightBarrier(w);
  const H = kind === 'runes' ? 34 : 28;
  const pm = new Pixmap(w, H);
  const post = 9;
  const postStyle = kind === 'runes' ? CARVED_FACE : kind === 'rusty' ? FIELD : WOOD;
  if (kind !== 'barricade') {
    for (const px of [0, w - post]) {
      for (let y = 0; y < H; y++) for (let x = px; x < px + post; x++) pm.set(x, y, kind === 'rusty' ? fieldstone(x, y) : lit(postStyle, (x === px ? 0.5 : x === px + post - 1 ? -0.6 : 0) + ((y + Math.floor(x / 3)) % 7 === 0 ? -0.4 : 0)));
      pm.hline(px, px + post - 1, 0, postStyle[0]);
    }
  }
  if (kind === 'rusty') {
    const RUST = ramp([126, 78, 56], 0.6);
    for (let x = post + 1; x < w - post - 1; x += 4) {
      const lean = hash2(x, 1, 3) < 0.15 ? 1 : 0;
      for (let y = 4; y < H; y++) pm.set(x + (y < 10 ? lean : 0), y, lit(RUST, (hash2(x, y, 4) - 0.5) * 0.8 + 0.1));
      pm.set(x, 3, RUST[1]);
      pm.set(x, 2, RUST[0]); // spike
    }
    for (const y of [8, H - 5]) for (let x = post; x < w - post; x++) pm.set(x, y, lit(RUST, (hash2(x, y, 5) - 0.5) * 0.6 - 0.2));
  } else if (kind === 'runes') {
    // A shimmering veil with runes hanging in it.
    for (let y = 2; y < H - 1; y++) {
      for (let x = post; x < w - post; x++) {
        const wave = Math.sin(x / 7 + y / 5) * 0.5 + 0.5;
        pm.set(x, y, [150, 100, 230], Math.round(50 + wave * 50));
      }
    }
    for (let x = post + 6; x < w - post - 6; x += 12) {
      const gy = 10 + Math.round(hash2(x, 2, 6) * 10);
      for (let j = 0; j < 6; j++) {
        pm.set(x + 1, gy + j, [230, 200, 255]);
        if (j % 2 === 0) pm.set(x + (hash2(x, j, 7) < 0.5 ? 0 : 2), gy + j, [210, 170, 255]);
      }
    }
    for (let x = post; x < w - post; x++) pm.set(x, H - 2, [190, 140, 250], 200);
  } else {
    // Barricade: planks nailed across stakes, a few crossed.
    for (let x = 2; x < w - 2; x += 14) {
      for (let y = 2; y < H; y++) {
        pm.set(x, y, BARK_W[1]);
        pm.set(x + 1, y, BARK_W[2]);
        pm.set(x + 2, y, BARK_W[3]);
      }
      pm.set(x + 1, 1, WOOD[0]);
    }
    for (const y of [7, 15]) {
      for (let x = 0; x < w; x++) {
        const off = Math.round(Math.sin(x / 23 + y) * 1.2);
        pm.set(x, y + off, lit(WOOD, 0.4 + (hash2(Math.floor(x / 18), y, 8) - 0.5) * 0.5));
        pm.set(x, y + off + 1, lit(WOOD, 0));
        pm.set(x, y + off + 2, lit(WOOD, -0.5));
      }
    }
    for (let x = 6; x < w - 20; x += 40) {
      for (let i = 0; i < 18; i++) {
        pm.set(x + i, 4 + Math.round(i * 1.1), WOOD[1]);
        pm.set(x + i, 5 + Math.round(i * 1.1), WOOD[3]);
      }
    }
  }
  if (kind !== 'runes') pm.outline(OUTLINE);
  return { pm, anchorX: Math.round(w / 2), anchorY: H - 1, wallX0: 0, wallX1: w - 1 };
}

const BARK_W = ramp([112, 80, 58]);

// Barriers that are heaps or walls of things across the passage: a hedge
// of corrupted brambles, a knot of roots, shelves pushed across and
// locked with chains, crates piled up, a fall of rubble, a sealed slab.
function heapBarrier(kind: 'brambles' | 'roots' | 'shelves' | 'crates' | 'rubble' | 'slab', w: number): BuildingArt {
  const H = kind === 'shelves' ? 34 : kind === 'slab' ? 30 : 26;
  const pm = new Pixmap(w, H);
  if (kind === 'brambles' || kind === 'roots') {
    const R = kind === 'brambles' ? THICK : ROOT;
    // Arching canes or roots, overlapping along the whole width.
    for (let k = 0; k < Math.round(w / 3); k++) {
      const x0 = hash2(k, 1, 401) * w;
      const span = 10 + hash2(k, 2, 401) * 18;
      const dir = hash2(k, 3, 401) < 0.5 ? -1 : 1;
      const height = (kind === 'roots' ? 10 : 14) + hash2(k, 4, 401) * (H - 16);
      const thick = kind === 'roots' ? 3 : 2;
      for (let t = 0; t <= 1; t += 0.02) {
        const x = Math.round(x0 + dir * span * t);
        const y = Math.round(H - 2 - Math.sin(t * Math.PI * (kind === 'roots' ? 1 : 0.85)) * height);
        for (let j = 0; j < thick; j++) pm.set(x, y + j, lit(R, j === 0 ? 0.4 : j === thick - 1 ? -0.55 : 0));
        if (kind === 'brambles' && Math.round(t * 50) % 5 === 0) pm.set(x + dir, y - 1, R[0]);
      }
      if (kind === 'brambles' && hash2(k, 5, 401) < 0.3) pm.set(Math.round(x0 + dir * span), H - 3, [196, 120, 244]);
    }
  } else if (kind === 'shelves') {
    // Bookcases dragged across the passage, chained together.
    for (let x = 0; x < w; x++) for (let y = 4; y < H; y++) {
      const lx = x % 22;
      const ly = (y - 4) % 7;
      let c: RGB;
      if (lx === 0 || lx === 21 || y === 4) c = lit(SHELF_WOOD, lx === 0 || y === 4 ? 0.35 : -0.5);
      else if (ly === 0) c = lit(SHELF_WOOD, 0.3);
      else if (ly === 6) c = SHELF_WOOD[4];
      else {
        const b = BOOKS[Math.floor(hash2(Math.floor(x / 2), Math.floor((y - 4) / 7), 402) * BOOKS.length)];
        c = hash2(Math.floor(x / 2), Math.floor((y - 4) / 7), 403) < 0.18 ? [30, 22, 26] : mix(b, x % 2 ? [20, 16, 22] : [255, 240, 210], 0.15);
      }
      pm.set(x, y, c);
    }
    for (let x = 0; x < w; x++) {
      const y = 14 + Math.round(Math.sin((x / 22) * Math.PI) * 3);
      pm.set(x, y, x % 2 ? [176, 178, 190] : [110, 112, 126]);
    }
    for (let x = 18; x < w; x += 44) {
      pm.rect(x, 14, 4, 5, [170, 136, 64]);
      pm.set(x + 1, 16, [60, 44, 30]);
    }
  } else if (kind === 'crates') {
    // A pile of crates and barrels, higher in the middle.
    const cs = 12;
    for (let x = 0; x + cs <= w + cs; x += cs - 1) {
      const rows = 1 + Math.round(hash2(x, 1, 404) * 1.4);
      for (let r = 0; r < rows; r++) {
        const bx = x + (r % 2) * 5;
        const by = H - (r + 1) * (cs - 1);
        for (let j = 0; j < cs; j++) for (let i = 0; i < cs; i++) {
          if (bx + i >= w) continue;
          const edge = i === 0 || j === 0 ? 0.45 : i === cs - 1 || j === cs - 1 ? -0.7 : 0;
          const brace = i === j || i === cs - 1 - j ? 0.2 : 0;
          pm.set(bx + i, by + j, lit(CRATE_W, edge + brace + (hash2(bx, r, 405) - 0.5) * 0.4 + (j % 4 === 0 ? -0.3 : 0)));
        }
      }
    }
  } else if (kind === 'rubble') {
    // Fallen masonry: blocks of every size heaped across the way.
    for (let k = 0; k < Math.round(w / 2.5); k++) {
      const bw = 4 + Math.floor(hash2(k, 1, 406) * 8);
      const bh = 3 + Math.floor(hash2(k, 2, 406) * 5);
      const bx = Math.floor(hash2(k, 3, 406) * (w - bw));
      const centre = 1 - Math.abs(bx + bw / 2 - w / 2) / (w / 2);
      const by = H - bh - Math.floor(hash2(k, 4, 406) * (6 + centre * 10));
      for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) pm.set(bx + i, by + j, lit(BRICK, (j === 0 ? 0.55 : 0) + (i === bw - 1 ? -0.6 : i === 0 ? 0.2 : 0) - j * 0.08 + (hash2(k, 5, 406) - 0.5) * 0.4));
    }
  } else {
    // A great slab standing across the way, carved with a sealed circle.
    for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) {
      const post = x < 8 || x >= w - 8;
      const s = cell(x, y, 7, 407, 1.3);
      let c = post ? cutStone(x, y, x < 8 ? 0 : w - 8, 0) : lit(CRYPT_SLAB, (y === 0 ? 0.6 : 0) + (x === 8 ? 0.3 : 0) + (s.d2 - s.d1 < 0.05 ? -0.4 : 0) + (hash2(x, y, 408) - 0.5) * 0.2 - (y / H) * 0.3);
      if (y >= H - 2) c = mix(c, [24, 20, 28], 0.4);
      pm.set(x, y, c);
    }
    const cx = Math.round(w / 2);
    const cy = Math.round(H / 2);
    for (let a = 0; a < 64; a++) {
      const ang = (a / 64) * Math.PI * 2;
      pm.set(Math.round(cx + Math.cos(ang) * 9), Math.round(cy + Math.sin(ang) * 9), CRYPT_SLAB[4]);
      if (a % 8 === 0) pm.set(Math.round(cx + Math.cos(ang) * 6), Math.round(cy + Math.sin(ang) * 6), [150, 50, 50]);
    }
    pm.vline(cx, cy - 5, cy + 5, CRYPT_SLAB[4]);
    pm.hline(cx - 5, cx + 5, cy, CRYPT_SLAB[4]);
  }
  pm.outline(OUTLINE);
  return { pm, anchorX: Math.round(w / 2), anchorY: H - 1, wallX0: 0, wallX1: w - 1 };
}

const CRYPT_SLAB = ramp([132, 126, 134], 0.4);

// A fishing net strung tight between poles across the way, floats along
// its top rope, weighted at the foot.
function netBarrier(w: number): BuildingArt {
  const H = 28;
  const pm = new Pixmap(w, H);
  const NET: RGB = [190, 174, 130];
  for (let x = 0; x < w; x++) {
    const sag = Math.round(Math.sin(((x % 44) / 44) * Math.PI) * 2);
    for (let y = 4 + sag; y < H - 2; y++) if ((x + y) % 4 === 0 || (x - y + 400) % 4 === 0) pm.set(x, y, mix(NET, [90, 80, 60], (y / H) * 0.4));
    pm.set(x, 3 + sag, [214, 196, 150]);
    if (x % 9 === 4) pm.set(x, 2 + sag, [222, 120, 60]);
    if (x % 7 === 3) pm.set(x, H - 2, [96, 98, 112]);
  }
  for (let x = 0; x < w; x += 44) for (let y = 0; y < H; y++) {
    pm.set(x, y, BARK_W[1]);
    pm.set(x + 1, y, BARK_W[2]);
    pm.set(x + 2, y, BARK_W[3]);
  }
  pm.outline(OUTLINE);
  return { pm, anchorX: Math.round(w / 2), anchorY: H - 1, wallX0: 0, wallX1: w - 1 };
}

// A wall of dressed stone across the way with a great oak double door,
// iron-bound, shut for a very long time (cobwebs across the gap).
function doorBarrier(w: number): BuildingArt {
  const H = 34;
  const pm = new Pixmap(w, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) pm.set(x, y, cutStone(x, y, 0, 0));
  const cx = Math.round(w / 2);
  const dw = 30;
  for (let y = 4; y < H; y++) {
    for (let x = cx - dw / 2; x < cx + dw / 2; x++) {
      if (y < 9 && Math.hypot(x - cx + 0.5, (y - 9) * 1.6) > dw / 2) continue; // arched top
      const lx = (x - (cx - dw / 2)) % 5;
      pm.set(x, y, lit(WOOD, (lx === 0 ? -0.6 : lx === 1 ? 0.2 : -0.05) + (x < cx ? 0.05 : -0.15) - (y < 7 ? 0.3 : 0)));
    }
  }
  pm.vline(cx, 5, H - 1, [30, 22, 26]);
  for (const by of [12, 24]) pm.hline(cx - dw / 2, cx + dw / 2 - 1, by, IRON[2]);
  pm.set(cx - 3, 18, IRON[0]);
  pm.set(cx + 2, 18, IRON[0]);
  // Cobwebs across the gap.
  for (let i = 0; i < 8; i++) pm.set(cx - 4 + i, 8 + Math.round(Math.abs(i - 3.5) * 0.6), [220, 220, 228]);
  pm.outline(OUTLINE);
  return { pm, anchorX: cx, anchorY: H - 1, wallX0: 0, wallX1: w - 1 };
}

// Light frozen in place across the way: a pale gold wall of light, still,
// with motes hanging in it, brighter at its core.
function lightBarrier(w: number): BuildingArt {
  const H = 36;
  const pm = new Pixmap(w, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < w; x++) {
      const core = 1 - Math.abs(y - H * 0.6) / (H * 0.6);
      const a = Math.round(40 + core * 110 + Math.sin(x / 5) * 10);
      pm.set(x, y, mix([255, 236, 170], [255, 255, 240], core), Math.max(0, Math.min(230, a)));
    }
  }
  for (let x = 3; x < w; x += 7) {
    const y = 4 + Math.round(hash2(x, 1, 511) * (H - 8));
    pm.set(x, y, [255, 255, 255]);
  }
  for (let x = 0; x < w; x++) pm.set(x, H - 1, [255, 220, 130], 240);
  return { pm, anchorX: Math.round(w / 2), anchorY: H - 1, wallX0: 0, wallX1: w - 1 };
}

// A gaping fissure across the floor, red light welling up from below
// (seen from above, flat, with its broken lips).
function riftBarrier(w: number): BuildingArt {
  const H = 22;
  const pm = new Pixmap(w, H);
  for (let x = 0; x < w; x++) {
    const mid = 11 + Math.round((noise(x, 0, 23, 501) - 0.5) * 8);
    const half = 3 + Math.round(noise(x, 1, 9, 502) * 4);
    for (let y = mid - half - 2; y <= mid + half + 1; y++) {
      const d = Math.abs(y - mid) / half;
      let c: RGB;
      if (d > 1) c = y < mid ? [70, 60, 64] : [40, 32, 36]; // broken lips
      else if (d > 0.6) c = [30, 14, 18];
      else c = mix([255, 120, 60], [140, 30, 30], d / 0.6 + (hash2(x, y, 503) - 0.5) * 0.3);
      pm.set(x, y, c);
    }
  }
  return { pm, anchorX: Math.round(w / 2), anchorY: H - 1, wallX0: 0, wallX1: w - 1 };
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
  return { pm, anchorX: Math.round(w / 2), anchorY: H - 1, wallX0: 0, wallX1: w - 1 };
}
