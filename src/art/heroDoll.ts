// Paper-doll drawing of the playable heroes, run by the game itself so a
// hero shows the gear it actually wears (see heroLook.ts for the mapping
// from items to layers). Pure code, no Phaser: frames come out as RGBA
// buffers, which heroSprite.ts turns into textures.
//
// A hero is drawn from a Look: the race gives the body (skin, height,
// build, face, hair, ears, beard, tusks) and each layer (head, chest, legs,
// boots, gloves, cape, main hand, off hand) is a piece of gear with a shape
// and a material. Everything is drawn at native resolution (1 art pixel = 1
// game pixel in the world, like the 16px ground tiles). Parts are layered,
// each part gets a darker edge where it covers the one beneath, and the
// whole silhouette gets a 1px dark outline.
//
// Views: down (front), up (back), left, right (mirror of left). Frames per
// view: stepA, idle, stepB (walk: stepA, idle, stepB, idle) and breathe
// (idle with the upper body one pixel lower, for standing still).

import { Race } from '../game/character';

export const DOLL_W = 24;
export const DOLL_H = 32;
const FEET_Y = 30; // last row of the feet
export const DOLL_FEET_Y = FEET_Y;

export type RGB = readonly [number, number, number];
export type Tones = readonly [RGB, RGB, RGB]; // light, mid, dark

const OUTLINE: RGB = [34, 28, 41];

// ------------------------------------------------------------------ colors

export const SKIN: Record<Race, Tones> = {
  human: [[248, 196, 152], [232, 164, 120], [190, 118, 86]],
  elf: [[252, 222, 194], [238, 196, 162], [198, 148, 118]],
  dwarf: [[242, 178, 136], [222, 142, 104], [172, 98, 74]],
  orc: [[178, 192, 112], [134, 150, 78], [88, 102, 54]], // olive, apart from cloth and grass greens
  halfling: [[250, 202, 152], [236, 170, 122], [194, 124, 88]],
};
export const HAIR: Record<Race, Tones> = {
  human: [[206, 134, 74], [158, 90, 50], [104, 54, 36]],
  elf: [[252, 242, 188], [232, 204, 126], [176, 144, 86]],
  dwarf: [[242, 130, 66], [198, 82, 42], [134, 48, 30]],
  orc: [[98, 88, 108], [62, 54, 72], [38, 32, 46]],
  halfling: [[188, 118, 66], [142, 82, 44], [96, 54, 32]],
};
export const IRON: Tones = [[214, 218, 226], [156, 160, 174], [102, 106, 122]];
export const STEEL: Tones = [[236, 240, 246], [182, 188, 202], [118, 124, 142]];
export const MITHRIL: Tones = [[222, 242, 252], [150, 198, 228], [84, 124, 170]];
export const GOLD: Tones = [[252, 236, 140], [238, 188, 60], [172, 112, 30]];
export const LEATHER: Tones = [[176, 120, 72], [124, 80, 48], [80, 50, 34]];
export const DARK_LEATHER: Tones = [[124, 92, 72], [86, 62, 50], [56, 40, 36]];
export const WOOD: Tones = [[194, 136, 80], [142, 94, 56], [94, 60, 38]];
export const RED: Tones = [[244, 118, 104], [198, 52, 58], [122, 28, 44]];
export const BLUE: Tones = [[110, 162, 230], [58, 102, 184], [34, 58, 116]];
export const GREEN: Tones = [[104, 184, 136], [58, 134, 100], [34, 86, 70]]; // hunter's teal, apart from the grass
export const FOREST: Tones = [[74, 132, 104], [44, 96, 78], [28, 62, 56]];
export const CHARCOAL: Tones = [[110, 106, 130], [74, 70, 94], [46, 44, 60]];
export const WHITE: Tones = [[252, 252, 244], [226, 222, 210], [170, 166, 166]];
export const PURPLE: Tones = [[200, 146, 236], [152, 94, 188], [92, 52, 128]];
export const CLOTH_BROWN: Tones = [[172, 132, 92], [128, 94, 64], [86, 62, 46]];
const EYE: RGB = [34, 28, 41];
const TUSK: RGB = [252, 248, 228];
const BLUSH: RGB = [240, 140, 122];
const GLOW: RGB = [244, 228, 255];
const STRING: RGB = [232, 228, 214];

// ------------------------------------------------------------------- races

interface Build {
  headW: number;
  headH: number;
  torsoW: number;
  torsoH: number;
  legsH: number;
  legW: number;
  headShape: readonly number[]; // inset per row, top to chin
}

const BUILDS: Record<Race, Build> = {
  human: { headW: 10, headH: 9, torsoW: 10, torsoH: 8, legsH: 8, legW: 4, headShape: [2, 1, 0, 0, 0, 0, 0, 1, 2] },
  elf: { headW: 9, headH: 9, torsoW: 8, torsoH: 8, legsH: 9, legW: 3, headShape: [2, 1, 0, 0, 0, 0, 1, 1, 2] },
  orc: { headW: 11, headH: 9, torsoW: 12, torsoH: 9, legsH: 8, legW: 5, headShape: [3, 1, 0, 0, 0, 0, 0, 0, 1] },
  dwarf: { headW: 10, headH: 9, torsoW: 12, torsoH: 7, legsH: 5, legW: 5, headShape: [2, 1, 0, 0, 0, 0, 0, 1, 2] },
  halfling: { headW: 10, headH: 9, torsoW: 8, torsoH: 6, legsH: 5, legW: 3, headShape: [3, 1, 0, 0, 0, 0, 0, 1, 3] },
};

// -------------------------------------------------------------------- looks

export interface Gear {
  shape: string;
  mat: Tones;
  trim?: Tones; // accent (rarity, class colors)
}

export interface Look {
  race: Race;
  head?: Gear;
  chest: Gear;
  legs: Gear;
  boots?: Gear; // none = bare feet
  gloves?: Gear;
  cape?: Gear;
  main?: Gear;
  off?: Gear;
  mask?: Gear;
  quiver?: boolean;
  amulet?: boolean; // a glint at the neck
}

// ------------------------------------------------------------------ canvas

type Shade = 'lr' | 'flat' | 'light' | 'dark';

class Part {
  readonly pixels = new Map<number, RGB>();

  constructor(readonly edge?: RGB) {}

  put(x: number, y: number, c: RGB): void {
    this.pixels.set(key(x, y), c);
  }

  // Fills x0..x1 on row y. 'lr': light left edge, dark right edge.
  span(y: number, x0: number, x1: number, tones: Tones, shade: Shade = 'lr'): void {
    for (let x = x0; x <= x1; x++) {
      let c = tones[1];
      if (shade === 'lr') {
        if (x === x0 && x1 > x0) c = tones[0];
        else if (x === x1 && x1 > x0) c = tones[2];
      } else if (shade === 'light') c = tones[0];
      else if (shade === 'dark') c = tones[2];
      this.put(x, y, c);
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= steps; i++) {
      const t = steps ? i / steps : 0;
      this.put(pyRound(x0 + (x1 - x0) * t), pyRound(y0 + (y1 - y0) * t), c);
    }
  }
}

// Pixel keys stay valid for coordinates a little outside the frame.
const OFF = 64;
function key(x: number, y: number): number {
  return (y + OFF) * 256 + (x + OFF);
}
function unkey(k: number): [number, number] {
  return [(k % 256) - OFF, Math.floor(k / 256) - OFF];
}

// Python's round (half to even), so lines land on the same pixels as the
// art tools' reference drawings.
function pyRound(v: number): number {
  const f = Math.floor(v);
  const d = v - f;
  if (d > 0.5) return f + 1;
  if (d < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

const div = (a: number, b: number): number => Math.floor(a / b);
const mod = (a: number, n: number): number => ((a % n) + n) % n;
const same = (a?: RGB, b?: RGB): boolean => a === b || (!!a && !!b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2]);

class Doll {
  private readonly parts: Part[] = [];

  part(edge?: RGB): Part {
    const p = new Part(edge);
    this.parts.push(p);
    return p;
  }

  render(): Uint8ClampedArray {
    const owner = new Map<number, number>();
    const color = new Map<number, RGB>();
    this.parts.forEach((p, i) => {
      p.pixels.forEach((c, k) => {
        const [x, y] = unkey(k);
        if (x >= 0 && x < DOLL_W && y >= 0 && y < DOLL_H) {
          owner.set(k, i);
          color.set(k, c);
        }
      });
    });
    const final = new Map(color);
    owner.forEach((i, k) => {
      const edge = this.parts[i].edge;
      if (!edge) return;
      const [x, y] = unkey(k);
      for (const [nx, ny] of [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ]) {
        const j = owner.get(key(nx, ny));
        if (j !== undefined && j < i && !same(this.parts[j].edge, edge)) {
          final.set(k, edge);
          break;
        }
      }
    });
    const px = new Uint8ClampedArray(DOLL_W * DOLL_H * 4);
    final.forEach((c, k) => {
      const [x, y] = unkey(k);
      const o = (y * DOLL_W + x) * 4;
      px[o] = c[0];
      px[o + 1] = c[1];
      px[o + 2] = c[2];
      px[o + 3] = 255;
    });
    const isOutline = (o: number) => px[o] === OUTLINE[0] && px[o + 1] === OUTLINE[1] && px[o + 2] === OUTLINE[2];
    for (let y = 0; y < DOLL_H; y++) {
      for (let x = 0; x < DOLL_W; x++) {
        const o = (y * DOLL_W + x) * 4;
        if (px[o + 3]) continue;
        for (const [nx, ny] of [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ]) {
          if (nx < 0 || nx >= DOLL_W || ny < 0 || ny >= DOLL_H) continue;
          const n = (ny * DOLL_W + nx) * 4;
          if (px[n + 3] && !isOutline(n)) {
            px[o] = OUTLINE[0];
            px[o + 1] = OUTLINE[1];
            px[o + 2] = OUTLINE[2];
            px[o + 3] = 255;
            break;
          }
        }
      }
    }
    return px;
  }
}

// ------------------------------------------------------------- the figure

interface Rows {
  legsTop: number;
  torsoTop: number;
  headTop: number;
}

type Hands = { main: [number, number]; off: [number, number] };

export type DollView = 'down' | 'up' | 'left' | 'right';

class Figure {
  private readonly b: Build;
  private readonly skin: Tones;
  private readonly hair: Tones;
  private readonly race: Race;

  constructor(private readonly look: Look) {
    this.race = look.race;
    this.b = BUILDS[look.race];
    this.skin = SKIN[look.race];
    this.hair = HAIR[look.race];
  }

  private rows(bob = 0): Rows {
    const b = this.b;
    const legsTop = FEET_Y - b.legsH + 1;
    const torsoTop = legsTop - b.torsoH + bob;
    return { legsTop, torsoTop, headTop: torsoTop - b.headH + 1 };
  }

  private robe(): boolean {
    return this.look.chest.shape === 'robe';
  }

  frame(view: DollView, step: number, breathe: boolean): Uint8ClampedArray {
    if (view === 'down') return this.front(step, false, breathe);
    if (view === 'up') return this.front(step, true, breathe);
    const side = this.side(step, breathe);
    return view === 'left' ? side : mirror(side);
  }

  // ================================================================ front

  private front(step: number, back: boolean, breathe: boolean): Uint8ClampedArray {
    const d = new Doll();
    const L = this.look;
    const cx = 12;
    const r = this.rows(step !== 0 || breathe ? 1 : 0);
    const tw = this.b.torsoW;
    const tl = cx - div(tw, 2); // torso left column
    const tr = tl + tw - 1; // torso right column

    if (!back) this.capeFrontPeek(d, r, tl, tr);
    this.legsFront(d, r, step);
    this.torsoFront(d, r, tl, tr, back);
    const hands = this.armsFront(d, r, tl, tr, step, back);
    this.headFront(d, r, back);
    if (back) {
      this.capeBack(d, r, tl, tr);
      if (L.quiver) this.quiverBack(d, r);
      this.heldBack(d, r, hands);
    } else {
      this.heldFront(d, r, hands);
    }
    return d.render();
  }

  // ------------------------------------------------------------- legs

  private feet(d: Doll, x0: number, w: number, bottom: number, side: number): void {
    const L = this.look;
    const p = d.part();
    if (!L.boots) {
      // Bare feet with toes.
      p.span(bottom, x0, x0 + w - 1, this.skin);
      p.put(x0 + (side > 0 ? w - 1 : 0), bottom, this.skin[0]);
      return;
    }
    const rows = L.boots.shape === 'sabatons' ? 3 : 2;
    for (let i = 0; i < rows; i++) p.span(bottom - i, x0, x0 + w - 1, L.boots.mat);
    if (L.boots.shape === 'sabatons') p.span(bottom - rows + 1, x0, x0 + w - 1, L.boots.mat, 'light');
    if (L.boots.trim) p.span(bottom - rows + 1, x0, x0 + w - 1, L.boots.trim, 'flat');
  }

  private legsFront(d: Doll, r: Rows, step: number): void {
    const L = this.look;
    const cx = 12;
    const lw = this.b.legW;
    const bootRows = !L.boots ? 0 : L.boots.shape === 'sabatons' ? 3 : 2;
    for (const [side, x0] of [
      [-1, cx - 1 - lw],
      [1, cx + 1],
    ]) {
      const lift = step !== 0 && side === step ? 1 : 0;
      const bottom = FEET_Y - lift;
      const p = d.part();
      for (let y = r.legsTop; y < bottom + 1 - Math.max(1, bootRows); y++) {
        p.span(y, x0, x0 + lw - 1, L.legs.mat);
        if (L.legs.shape === 'greaves' && y >= r.legsTop + 2) p.put(x0 + 1, y, L.legs.mat[0]);
      }
      this.feet(d, x0, lw, bottom, side);
    }
    if (this.robe()) this.skirtFront(d, r, step);
  }

  private skirtFront(d: Doll, r: Rows, step: number): void {
    const L = this.look;
    const cx = 12;
    const half = div(this.b.torsoW, 2);
    const p = d.part(L.chest.mat[2]);
    const hem = FEET_Y - 2;
    for (let y = r.legsTop - 1; y <= hem; y++) {
      const spread = div(y - r.legsTop + 1, 3);
      const sway = y >= hem - 1 ? step : 0; // the hem swings with the stride
      const x0 = cx - half - spread + sway;
      const x1 = cx + half - 1 + spread + sway;
      p.span(y, x0, x1, L.chest.mat);
      if (y === hem && L.chest.trim) p.span(y, x0, x1, L.chest.trim, 'flat');
    }
    if (L.chest.trim) {
      // Front panel trim down the middle.
      for (let y = r.legsTop - 1; y < hem; y++) p.put(cx - 1, y, L.chest.trim[1]);
    }
  }

  // ------------------------------------------------------------ torso

  private torsoFront(d: Doll, r: Rows, tl: number, tr: number, back: boolean): void {
    const cx = 12;
    const top = r.torsoTop;
    const bottom = r.legsTop - 1;
    const c = this.look.chest;
    const p = d.part(c.mat[2]);
    for (let y = top; y <= bottom; y++) {
      const inset = y === top ? 1 : 0;
      p.span(y, tl + inset, tr - inset, c.mat);
    }
    const det = d.part();
    const belt = bottom - 1;
    const shape = c.shape;
    if (shape === 'plate') {
      if (!back) {
        for (let y = top + 1; y < belt; y++) det.put(cx - 2, y, c.mat[0]); // breastplate highlight
        if (c.trim) {
          // Tabard down the front.
          for (let y = top + 2; y <= bottom; y++) det.span(y, cx - 2, cx + 1, c.trim);
          det.put(cx - 1, top + 4, GOLD[0]);
          det.put(cx, top + 4, GOLD[1]);
        }
      } else if (c.trim) {
        for (let y = top + 2; y <= bottom; y++) det.span(y, cx - 2, cx + 1, c.trim);
      }
      det.span(belt, tl + 1, tr - 1, LEATHER, 'flat');
      if (!back) det.span(belt, cx - 1, cx, GOLD, 'flat');
      // Pauldrons wider than the chest.
      const pa = d.part(c.mat[2]);
      for (const x0 of [tl - 1, tr - 1]) {
        pa.span(top, x0 + 1, x0 + 1, c.mat, 'light');
        pa.span(top + 1, x0, x0 + 2, c.mat);
        pa.span(top + 2, x0, x0 + 2, c.mat, 'dark');
      }
    } else if (shape === 'chain') {
      for (let y = top + 1; y < belt; y++) {
        for (let x = tl + 1; x < tr; x++) if (mod(x + y, 2) === 0) det.put(x, y, c.mat[2]);
      }
      det.span(belt, tl + 1, tr - 1, LEATHER, 'flat');
    } else if (shape === 'leather' || shape === 'jerkin') {
      if (!back) {
        // Lighter front panel with lacing.
        for (let y = top + 1; y < belt; y++) {
          det.span(y, cx - 2, cx + 1, c.mat, 'light');
          if (mod(y, 2) === 0) {
            det.put(cx - 1, y, c.mat[2]);
            det.put(cx, y, c.mat[2]);
          }
        }
      }
      det.span(belt, tl + 1, tr - 1, shape === 'leather' ? LEATHER : DARK_LEATHER, 'flat');
      if (c.trim && !back) {
        det.put(cx, belt, c.trim[1]);
        det.put(tr - 2, belt + 1, LEATHER[0]); // pouch
      }
    } else if (shape === 'tunic') {
      if (!back) {
        det.span(top, cx - 2, cx + 1, c.mat, 'light'); // collar
        det.put(cx - 1, top + 1, c.mat[2]);
      }
      det.span(belt, tl + 1, tr - 1, c.trim ?? LEATHER, 'flat');
      if (!back) det.put(cx, belt, GOLD[1]);
    } else if (shape === 'robe') {
      if (!back && c.trim) {
        for (let y = top + 1; y <= bottom; y++) det.put(cx - 1, y, c.trim[1]);
        // Collar.
        det.put(cx - 2, top, c.trim[0]);
        det.put(cx + 1, top, c.trim[0]);
      }
      det.span(belt, tl + 1, tr - 1, c.trim ?? c.mat, 'flat');
    }
    if (this.look.quiver && !back) {
      // Quiver strap across the chest.
      for (let i = 0; i < r.legsTop - top - 1; i++) det.put(tl + 1 + i, top + i, LEATHER[2]);
    }
    if (this.look.amulet && !back) {
      const a = d.part();
      a.put(cx, top + 1, GOLD[0]);
      a.put(cx, top + 2, GOLD[1]);
    }
  }

  // ------------------------------------------------------------- arms

  private armsFront(d: Doll, r: Rows, tl: number, tr: number, step: number, back: boolean): Hands {
    const L = this.look;
    const hands = {} as Hands;
    const sleeve = L.chest.mat;
    const wide = this.robe();
    for (const side of [-1, 1]) {
      const swing = step ? -step * side : 0;
      const x0 = side < 0 ? tl - 2 : tr + 1;
      const top = r.torsoTop + 1;
      const bottom = r.legsTop + swing;
      const p = d.part(sleeve[2]);
      for (let y = top; y < bottom; y++) p.span(y, x0, x0 + 1, sleeve);
      if (wide) {
        // Wide sleeve cuff.
        const cuffX = side < 0 ? x0 - 1 : x0 + 2;
        p.put(cuffX, bottom - 1, side > 0 ? sleeve[2] : sleeve[1]);
        if (L.chest.trim) p.span(bottom - 1, x0, x0 + 1, L.chest.trim, 'flat');
      }
      const hp = d.part();
      const g = L.gloves;
      if (!g) hp.span(bottom, x0, x0 + 1, this.skin);
      else if (g.shape === 'bracers') {
        hp.span(bottom, x0, x0 + 1, this.skin);
        hp.span(bottom - 1, x0, x0 + 1, g.mat, 'flat');
        hp.span(bottom - 2, x0, x0 + 1, g.mat);
      } else {
        hp.span(bottom, x0, x0 + 1, g.mat);
        hp.span(bottom - 1, x0, x0 + 1, g.mat, g.shape === 'gauntlets' ? 'light' : 'flat');
      }
      // Viewer's left is the hero's right hand from the front.
      const rightHand = side < 0 !== back;
      hands[rightHand ? 'main' : 'off'] = [x0, bottom];
    }
    return hands;
  }

  // ------------------------------------------------------------- head

  private headBox(r: Rows): [number, number, number, number] {
    const x0 = 12 - div(this.b.headW, 2);
    return [x0, x0 + this.b.headW - 1, r.headTop, r.headTop + this.b.headH - 1];
  }

  private headFront(d: Doll, r: Rows, back: boolean): void {
    const L = this.look;
    const b = this.b;
    const cx = 12;
    const [x0, x1, top, bot] = this.headBox(r);
    const head = d.part(this.skin[2]);
    b.headShape.forEach((inset, i) => head.span(top + i, x0 + inset, x1 - inset, this.skin));
    const eyeY = top + 5;
    const hood = L.head?.shape === 'hood';

    // Ears (behind the hair).
    const ear = d.part();
    if (this.race !== 'elf') {
      ear.put(x0 - 1, eyeY, this.skin[1]);
      ear.put(x1 + 1, eyeY, this.skin[2]);
    }

    this.hairFront(d, x0, x1, top, bot, back, hood);

    if (!back) {
      const face = d.part();
      for (const ex of [cx - 2, cx + 1]) {
        face.put(ex, eyeY, EYE);
        face.put(ex, eyeY - 1, EYE);
      }
      if (this.race === 'orc') for (const ex of [cx - 3, cx - 2, cx + 1, cx + 2]) face.put(ex, eyeY - 2, this.skin[2]); // heavy brow
      if (this.race === 'dwarf') for (const ex of [cx - 3, cx - 2, cx + 1, cx + 2]) face.put(ex, eyeY - 2, this.hair[1]); // bushy brows
      if (this.race === 'halfling') {
        face.put(cx - 3, eyeY + 1, BLUSH);
        face.put(cx + 2, eyeY + 1, BLUSH);
      }
      if (this.race !== 'dwarf' && !L.mask) {
        face.put(cx - 1, eyeY + 2, this.skin[2]); // mouth
        face.put(cx, eyeY + 2, this.skin[2]);
      }
      if (this.race === 'dwarf') this.beardFront(d, x0, x1, eyeY);
      if (L.mask) {
        const m = d.part(L.mask.mat[2]);
        for (let y = eyeY + 2; y <= bot; y++) {
          const inset = b.headShape[y - top];
          m.span(y, x0 + inset + 1, x1 - inset - 1, L.mask.mat);
        }
        m.put(x1, bot + 1, L.mask.mat[2]); // scarf tail
      }
    }

    this.headgearFront(d, r, back);

    // Race marks stay visible over hoods, helms and masks.
    const marks = d.part();
    if (this.race === 'elf') {
      for (const [side, ex] of [
        [-1, x0 - 1],
        [1, x1 + 1],
      ]) {
        marks.put(ex, eyeY, this.skin[1]);
        marks.put(ex + side, eyeY - 1, side < 0 ? this.skin[0] : this.skin[1]);
        marks.put(ex + 2 * side, eyeY - 2, side < 0 ? this.skin[0] : this.skin[2]);
      }
    }
    if (this.race === 'halfling' && !hood) {
      marks.put(x0 - 1, eyeY - 1, this.skin[0]);
      marks.put(x1 + 1, eyeY - 1, this.skin[2]);
    }
    if (this.race === 'orc' && !back) {
      for (const tx of [cx - 2, cx + 1]) {
        marks.put(tx, eyeY + 2, TUSK);
        marks.put(tx, eyeY + 1, TUSK);
      }
    }
  }

  private hairFront(d: Doll, x0: number, x1: number, top: number, bot: number, back: boolean, hidden: boolean): void {
    const hp = d.part(this.hair[2]);
    const h = this.hair;
    const race = this.race;
    const cx = 12;
    if (hidden) return;
    if (race === 'orc') {
      // Shaved sides, black topknot.
      for (let y = top - 3; y <= top; y++) hp.span(y, cx - 2, cx + 1, h);
      hp.put(cx - 1, top - 4, h[1]);
      hp.put(cx, top - 4, h[2]);
      if (back) for (let y = top + 1; y < top + 5; y++) hp.span(y, cx - 1, cx, h); // braid down the back
      return;
    }
    if (back) {
      const shape = this.b.headShape;
      for (let i = 0; i < this.b.headH - 1; i++) hp.span(top + i, x0 + shape[i], x1 - shape[i], h);
      if (race === 'elf') for (let y = bot; y < bot + 5; y++) hp.span(y, x0 + 1, x1 - 1, h);
      if (race === 'halfling') for (let x = x0 + 1; x < x1; x += 2) hp.put(x, top - 1, h[1]);
      return;
    }
    // Front: crown, then a fringe per race.
    hp.span(top, x0 + 2, x1 - 2, h);
    hp.span(top + 1, x0 + 1, x1 - 1, h);
    hp.span(top + 2, x0, x1, h);
    if (race === 'human') {
      // Side part, fringe swept to one side.
      hp.span(top + 3, x0, cx - 1, h);
      hp.put(x1, top + 3, h[2]);
      for (let y = top + 4; y < top + 6; y++) {
        hp.put(x0, y, h[1]);
        hp.put(x1, y, h[2]);
      }
    } else if (race === 'elf') {
      // Center part, long hair framing the face down to the shoulders.
      hp.put(cx - 1, top + 1, h[0]);
      hp.put(cx - 1, top + 2, h[0]);
      hp.put(x0 + 1, top + 3, h[1]);
      hp.put(x1 - 1, top + 3, h[1]);
      for (let y = top + 3; y < bot + 4; y++) {
        hp.put(x0, y, h[1]);
        hp.put(x1, y, h[2]);
        if (y > bot - 2) {
          hp.put(x0 - 1, y, h[1]);
          hp.put(x1 + 1, y, h[2]);
        }
      }
    } else if (race === 'dwarf') {
      // Bushy mane.
      hp.span(top + 1, x0, x1, h);
      hp.span(top + 2, x0 - 1, x1 + 1, h);
      for (let y = top + 3; y < top + 6; y++) {
        hp.put(x0 - 1, y, h[1]);
        hp.put(x0, y, h[1]);
        hp.put(x1, y, h[2]);
        hp.put(x1 + 1, y, h[2]);
      }
    } else if (race === 'halfling') {
      // Curls: a bumpy crown and curly sides.
      for (let x = x0 + 1; x < x1; x += 2) hp.put(x, top - 1, h[1]);
      hp.span(top + 3, x0, x1, h);
      hp.put(cx - 1, top + 3, this.skin[1]);
      hp.put(cx + 1, top + 3, this.skin[1]);
      for (let y = top + 3; y < top + 7; y++) {
        hp.put(x0 - mod(y, 2), y, h[1]);
        hp.put(x1 + mod(y, 2), y, h[2]);
      }
    }
  }

  private beardFront(d: Doll, x0: number, x1: number, eyeY: number): void {
    const h = this.hair;
    const cx = 12;
    const p = d.part(h[2]);
    p.span(eyeY + 1, x0 + 1, x1 - 1, h); // moustache
    const widths = [10, 10, 10, 8, 6, 4, 2];
    widths.forEach((w, i) => p.span(eyeY + 2 + i, cx - div(w, 2), cx - div(w, 2) + w - 1, h));
    p.put(cx - 1, eyeY + 2, this.skin[2]); // mouth in the beard
    p.put(cx, eyeY + 2, this.skin[2]);
    p.put(cx - 1, eyeY + 2 + widths.length - 2, GOLD[1]); // braid bead
  }

  private headgearFront(d: Doll, r: Rows, back: boolean): void {
    const g = this.look.head;
    if (!g) return;
    const cx = 12;
    const [x0, x1, top, bot] = this.headBox(r);
    const p = d.part(g.mat[2]);
    const m = g.mat;
    if (g.shape === 'helm' || g.shape === 'plumed') {
      p.span(top - 1, x0 + 2, x1 - 2, m, 'light');
      p.span(top, x0 + 1, x1 - 1, m);
      p.span(top + 1, x0, x1, m);
      p.span(top + 2, x0, x1, m, 'dark'); // rim
      if (back) {
        for (let y = top + 3; y < bot - 1; y++) p.span(y, x0, x1, m);
      } else {
        p.put(cx - 1, top + 3, m[1]); // nose guard
        p.put(cx, top + 3, m[2]);
        for (let y = top + 3; y < top + 6; y++) {
          p.put(x0, y, m[1]); // cheek guards
          p.put(x1, y, m[2]);
        }
      }
      if (g.shape === 'plumed' || g.trim) {
        const pl = d.part();
        const t = g.trim ?? RED;
        for (let i = 0; i < 4; i++) {
          const y = top - 4 + i;
          pl.put(cx - 1 + (i < 2 ? 1 : 0), y, i % 2 ? t[1] : t[0]);
          pl.put(cx + (i < 2 ? 1 : 0), y, t[2]);
        }
      }
    } else if (g.shape === 'cap') {
      p.span(top - 1, x0 + 2, x1 - 2, m, 'light');
      p.span(top, x0 + 1, x1 - 1, m);
      p.span(top + 1, x0, x1, m);
      p.span(top + 2, x0, x1, g.trim ?? m, 'dark');
    } else if (g.shape === 'hat') {
      for (let i = 0; i < 8; i++) {
        const y = top - 7 + i;
        const w = Math.min(1 + i, this.b.headW - 2);
        const lean = Math.max(0, 3 - i);
        p.span(y, cx - div(w, 2) + lean, cx - div(w, 2) + lean + w - 1, m);
      }
      p.span(top + 1, x0 - 1, x1 + 1, m);
      p.span(top + 2, x0 - 2, x1 + 2, m, 'dark'); // wide brim
      if (g.trim) {
        p.span(top, x0 + 1, x1 - 1, g.trim, 'flat');
        if (!back) p.put(cx, top - 3, g.trim[0]); // star
      }
    } else if (g.shape === 'hood') {
      p.span(top - 1, x0 + 2, x1 - 2, m, 'light');
      p.span(top, x0 + 1, x1 - 1, m);
      p.span(top + 1, x0, x1, m);
      p.span(top + 2, x0, x1, m);
      for (let y = top + 3; y <= bot; y++) {
        p.span(y, x0 - 1, x0, m, 'light');
        p.span(y, x1, x1 + 1, m, 'dark');
      }
      if (back) for (let y = top + 3; y <= bot; y++) p.span(y, x0 - 1, x1 + 1, m);
      // Cowl over the shoulders.
      p.span(bot + 1, x0 - 1, x1 + 1, m);
      p.put(back ? cx : cx - 1, bot + 2, m[2]);
    } else if (g.shape === 'circlet') {
      const band = top + 2;
      p.span(band, x0 + 1, x1 - 1, m, 'flat');
      if (!back && g.trim) {
        p.put(cx - 1, band, g.trim[0]);
        p.put(cx, band, g.trim[1]);
      }
    }
  }

  // ------------------------------------------------------------ capes

  private capeFrontPeek(d: Doll, r: Rows, tl: number, tr: number): void {
    const c = this.look.cape;
    if (!c) return;
    const p = d.part(c.mat[2]);
    for (let y = r.torsoTop + 1; y < r.legsTop + 3; y++) {
      p.put(tl - 1, y, c.mat[2]);
      p.put(tr + 1, y, c.mat[2]);
    }
  }

  private capeBack(d: Doll, r: Rows, tl: number, tr: number): void {
    const c = this.look.cape;
    if (!c) return;
    const p = d.part(c.mat[2]);
    for (let y = r.torsoTop; y < r.legsTop + 4; y++) {
      const spread = div(y - r.torsoTop, 4);
      p.span(y, tl - spread, tr + spread, c.mat);
    }
    p.span(r.legsTop + 4, tl, tr, c.mat, 'dark');
  }

  private quiverBack(d: Doll, r: Rows): void {
    const p = d.part(LEATHER[2]);
    const x = 13;
    for (let y = r.torsoTop - 1; y < r.legsTop; y++) p.span(y, x, x + 2, LEATHER);
    p.put(x, r.torsoTop - 2, RED[1]);
    p.put(x + 1, r.torsoTop - 3, WHITE[0]);
    p.put(x + 2, r.torsoTop - 2, RED[0]);
  }

  // ---------------------------------------------------------- weapons

  // A held item at hand (hx, hy); outward = -1 left / +1 right of the hand.
  private weapon(d: Doll, g: Gear, hx: number, hy: number, outward: number, r: Rows): void {
    const p = d.part();
    const m = g.mat;
    const bx = outward < 0 ? hx : hx + 1;
    const shape = g.shape;
    if (shape === 'sword' || shape === 'greatsword') {
      const length = shape === 'sword' ? 9 : 12;
      p.span(hy - 1, bx - 1, bx + 1, g.trim ?? GOLD, 'flat'); // guard
      p.put(bx, hy + 1, LEATHER[1]); // pommel
      for (let y = hy - 1 - length; y < hy - 1; y++) {
        p.put(bx, y, m[0]);
        if (shape === 'greatsword') p.put(bx + outward, y, m[2]);
      }
      p.put(bx, hy - 2 - length, m[1]);
    } else if (shape === 'axe' || shape === 'greataxe') {
      const length = shape === 'axe' ? 8 : 12;
      for (let y = hy - length; y < hy + 2; y++) p.put(bx, y, WOOD[1]);
      const head = d.part(m[2]);
      const hh = shape === 'axe' ? 4 : 5;
      for (let i = 0; i < hh; i++) {
        const y = hy - length + i;
        const reach = i > 0 && i < hh - 1 ? 3 : 2; // the blade's curve
        const [xa, xb] = outward > 0 ? [bx + 1, bx + reach] : [bx - reach, bx - 1];
        head.span(y, xa, xb, m);
        if (shape === 'greataxe') head.put(bx - outward, y, m[1]); // second, smaller blade
      }
    } else if (shape === 'dagger') {
      p.put(bx, hy + 1, LEATHER[1]);
      for (let i = 1; i < 4; i++) p.put(bx + outward * div(i, 2), hy + 1 + i, m[0]);
    } else if (shape === 'mace') {
      // Raised outward, clear of the body so it reads on any outfit.
      for (let i = 1; i < 5; i++) p.put(bx + outward * div(i, 2), hy - i, WOOD[1]);
      const mx = bx + outward * 3;
      const my = hy - 6;
      const head = d.part(m[2]);
      head.span(my, mx - 1, mx + 1, m);
      head.span(my + 1, mx - 1, mx + 1, m);
      head.put(mx, my - 1, (g.trim ?? m)[0]);
      head.put(mx + outward * 2, my, m[1]);
    } else if (shape === 'staff') {
      const orb = g.trim ?? PURPLE;
      const ty = r.headTop - 4;
      for (let y = ty + 2; y <= FEET_Y; y++) p.put(bx, y, m[1]);
      const head = d.part();
      head.span(ty, bx, bx, orb, 'light');
      head.span(ty + 1, bx - 1, bx + 1, orb);
      head.put(bx, ty + 1, GLOW);
      head.put(bx - 1, ty + 2, m[2]);
      head.put(bx + 1, ty + 2, m[2]);
    } else if (shape === 'bow') {
      const bxx = hx + (outward > 0 ? 2 : -1);
      for (let y = hy - 8; y < hy + 3; y++) p.put(bxx - outward, y, STRING);
      for (let i = 0; i < 13; i++) {
        const y = hy - 9 + i;
        const off = i > 2 && i < 10 ? 1 : 0;
        p.put(bxx + outward * off, y, off ? m[1] : m[2]);
      }
    } else if (shape === 'tome') {
      const book = d.part(m[2]);
      const x0 = outward < 0 ? hx - 1 : hx;
      for (let y = hy - 3; y < hy + 2; y++) book.span(y, x0, x0 + 2, m);
      book.put(x0, hy - 3, (g.trim ?? GOLD)[1]);
      book.put(x0 + 2, hy + 1, (g.trim ?? GOLD)[1]);
      for (let y = hy - 2; y < hy + 1; y++) book.put(x0 + (outward > 0 ? 3 : -1), y, WHITE[1]); // pages
    } else if (shape === 'shield' || shape === 'tower') {
      const sh = d.part(m[2]);
      const tall = shape === 'shield' ? 7 : 10;
      const sx = outward > 0 ? hx - 1 : hx - 3;
      const sy = r.torsoTop + 1;
      for (let i = 0; i < tall; i++) {
        const inset = shape === 'shield' && (i === 0 || i === tall - 1) ? 1 : 0;
        sh.span(sy + i, sx + inset, sx + 5 - inset, m);
      }
      const t = g.trim ?? GOLD;
      for (let i = 1; i < tall - 1; i++) sh.put(sx + 2, sy + i, t[1]);
      sh.span(sy + div(tall, 2), sx + 1, sx + 4, t, 'flat');
    }
  }

  private heldFront(d: Doll, r: Rows, hands: Hands): void {
    const L = this.look;
    if (L.main) {
      if (L.main.shape === 'bow') this.weapon(d, L.main, hands.off[0], hands.off[1], 1, r);
      else this.weapon(d, L.main, hands.main[0], hands.main[1], -1, r);
    }
    if (L.off) this.weapon(d, L.off, hands.off[0], hands.off[1], 1, r);
  }

  private heldBack(d: Doll, r: Rows, hands: Hands): void {
    const L = this.look;
    if (L.main) {
      if (L.main.shape === 'bow') this.weapon(d, L.main, hands.off[0], hands.off[1], -1, r);
      else this.weapon(d, L.main, hands.main[0], hands.main[1], 1, r);
    }
    if (L.off) {
      // The back of a shield is plain wood.
      const off = L.off.shape === 'shield' || L.off.shape === 'tower' ? { ...L.off, mat: WOOD, trim: IRON } : L.off;
      this.weapon(d, off, hands.off[0], hands.off[1], -1, r);
    }
  }

  // ================================================================= side

  // Facing left. Far limbs in shadow, near limbs in light.
  private side(step: number, breathe: boolean): Uint8ClampedArray {
    const d = new Doll();
    const L = this.look;
    const b = this.b;
    const cx = 12;
    const r = this.rows(step !== 0 || breathe ? 1 : 0);
    const depth = b.torsoW - 2;
    const x0 = cx - div(depth, 2);
    const x1 = x0 + depth - 1;
    const lw = b.legW;
    const c = L.chest;

    // Behind the body: cape, quiver, shield on the far arm.
    if (L.cape) {
      const p = d.part(L.cape.mat[2]);
      for (let y = r.torsoTop; y < r.legsTop + 3; y++) {
        p.span(y, x1 - 1, x1 + 1 + div(y - r.torsoTop, 4) + (step ? 1 : 0), L.cape.mat);
      }
    }
    if (L.quiver) {
      const q = d.part(LEATHER[2]);
      for (let y = r.torsoTop - 1; y < r.legsTop; y++) q.span(y, x1, x1 + 2, LEATHER);
      q.put(x1 + 1, r.torsoTop - 2, RED[1]);
      q.put(x1 + 2, r.torsoTop - 3, WHITE[0]);
    }
    if (L.off && (L.off.shape === 'shield' || L.off.shape === 'tower')) {
      const sh = d.part(L.off.mat[2]);
      const sy = r.torsoTop + 1;
      const tall = L.off.shape === 'shield' ? 7 : 10;
      for (let i = 0; i < tall; i++) {
        const inset = L.off.shape === 'shield' && (i === 0 || i === tall - 1) ? 1 : 0;
        sh.span(sy + i, x1 - 1 + inset, x1 + 2 - inset, L.off.mat);
      }
      sh.put(x1 + 1, sy + div(tall, 2), (L.off.trim ?? GOLD)[1]);
    }

    // Far arm (swings opposite to the near one).
    const far = d.part(c.mat[2]);
    const fax = cx + step;
    const hyFar = r.legsTop - 1;
    for (let y = r.torsoTop + 1; y < hyFar; y++) far.span(y, fax, fax + 1, c.mat, 'dark');
    const farHand = L.gloves ? L.gloves.mat[2] : this.skin[2];
    far.put(fax, hyFar, farHand);
    far.put(fax + 1, hyFar, farHand);

    // Legs: far one in shadow, stride of 2px each way, knee lift.
    const bootRows = !L.boots ? 0 : L.boots.shape === 'sabatons' ? 3 : 2;
    for (const [leg, off] of [
      [0, 2 * step],
      [1, -2 * step],
    ]) {
      const p = d.part(leg === 0 ? undefined : OUTLINE);
      const lx = cx - div(lw, 2) + off;
      const lift = step !== 0 && leg === 1 && off < 0 ? 1 : 0;
      const bottom = FEET_Y - lift;
      for (let y = r.legsTop; y <= bottom; y++) {
        const foot = y > bottom - Math.max(1, bootRows);
        const tones = foot ? (L.boots ? L.boots.mat : this.skin) : L.legs.mat;
        p.span(y, lx, lx + lw - 1, tones, leg === 0 ? 'dark' : 'lr');
      }
      const toe = L.boots ? L.boots.mat : this.skin;
      p.put(lx - 1, bottom, leg === 0 ? toe[2] : toe[1]);
    }

    if (this.robe()) {
      const sk = d.part(c.mat[2]);
      const hem = FEET_Y - 2;
      for (let y = r.legsTop - 1; y <= hem; y++) {
        const spread = div(y - r.legsTop + 1, 3);
        const sway = y >= hem - 1 ? -step : 0;
        sk.span(y, x0 - spread + sway, x1 + spread + sway, c.mat);
        if (y === hem && c.trim) sk.span(y, x0 - spread + sway, x1 + spread + sway, c.trim, 'flat');
      }
    }

    const torso = d.part(c.mat[2]);
    for (let y = r.torsoTop; y < r.legsTop; y++) torso.span(y, x0 + (y === r.torsoTop ? 1 : 0), x1, c.mat);
    const det = d.part();
    const belt = r.legsTop - 2;
    det.span(belt, x0, x1, (this.robe() ? c.trim : undefined) ?? LEATHER, 'flat');
    if (c.shape === 'plate') {
      if (c.trim) for (let y = r.torsoTop + 2; y < r.legsTop; y++) det.span(y, x0, x0 + 1, c.trim, 'flat');
      const pa = d.part(c.mat[2]);
      pa.span(r.torsoTop, cx - 1, cx + 1, c.mat, 'light');
      pa.span(r.torsoTop + 1, cx - 2, cx + 2, c.mat);
    } else if (c.shape === 'chain') {
      for (let y = r.torsoTop + 1; y < belt; y++) {
        for (let x = x0 + 1; x < x1; x++) if (mod(x + y, 2) === 0) det.put(x, y, c.mat[2]);
      }
    } else if (c.shape === 'leather' || c.shape === 'jerkin') {
      for (let y = r.torsoTop + 1; y < belt; y++) det.put(x0, y, c.mat[0]);
    } else if (c.shape === 'robe' && c.trim) {
      for (let y = r.torsoTop + 1; y < r.legsTop; y++) det.put(x0, y, c.trim[1]);
    }

    this.headSide(d, r);

    // Near arm with the main weapon.
    const arm = d.part(c.mat[2]);
    const ax = cx - 1 - step;
    const hy = r.legsTop;
    for (let y = r.torsoTop + 1; y < hy; y++) arm.span(y, ax, ax + 1, c.mat);
    const hand = d.part();
    const g = L.gloves;
    hand.span(hy, ax, ax + 1, !g || g.shape === 'bracers' ? this.skin : g.mat);
    if (g && g.shape === 'bracers') hand.span(hy - 1, ax, ax + 1, g.mat, 'flat');
    if (L.main) this.weaponSide(d, L.main, ax, hy, r, x0);
    return d.render();
  }

  private headSide(d: Doll, r: Rows): void {
    const L = this.look;
    const b = this.b;
    const cx = 12;
    const top = r.headTop;
    const hh = b.headH;
    const hw = b.headW - 1;
    const hx0 = cx - div(hw, 2) - 1;
    const hx1 = hx0 + hw - 1;
    const shape = b.headShape;
    const head = d.part(this.skin[2]);
    for (let i = 0; i < hh; i++) head.span(top + i, hx0 + shape[i], hx1 - shape[i], this.skin);
    const eyeY = top + 5;
    head.put(hx0 - 1, eyeY + 1, this.skin[1]); // nose
    const hood = L.head?.shape === 'hood';
    const hp = d.part(this.hair[2]);
    const h = this.hair;
    if (!hood) {
      if (this.race === 'orc') {
        for (let y = top - 3; y <= top; y++) hp.span(y, cx - 1, cx + 2, h);
        for (let y = top + 1; y < top + 5; y++) hp.put(hx1, y, h[1]);
      } else {
        hp.span(top, hx0 + 2, hx1 - 2, h);
        hp.span(top + 1, hx0 + 1, hx1 - 1, h);
        hp.span(top + 2, hx0 + 1, hx1, h);
        for (let y = top + 3; y < top + hh - 1; y++) hp.span(y, hx1 - 3, hx1, h);
        if (this.race === 'human') hp.put(hx0 + 1, top + 3, h[1]);
        if (this.race === 'elf') for (let y = top + hh - 1; y < top + hh + 4; y++) hp.span(y, hx1 - 3, hx1, h);
        if (this.race === 'dwarf') for (let y = top + 2; y < top + 6; y++) hp.put(hx1 + 1, y, h[2]);
        if (this.race === 'halfling') {
          for (let x = hx0 + 2; x < hx1; x += 2) hp.put(x, top - 1, h[1]);
          for (let y = top + 3; y < top + 7; y++) hp.put(hx1 + mod(y, 2), y, h[2]);
        }
      }
    }
    const face = d.part();
    face.put(hx0 + 1, eyeY, EYE);
    face.put(hx0 + 1, eyeY - 1, EYE);
    if (this.race !== 'dwarf' && !L.mask) face.put(hx0, eyeY + 2, this.skin[2]); // mouth
    if (this.race === 'orc') face.put(hx0 + 1, eyeY - 2, this.skin[2]);
    if (this.race === 'halfling') face.put(hx0 + 2, eyeY + 1, BLUSH);
    if (this.race === 'dwarf') {
      const beard = d.part(h[2]);
      for (let i = 0; i < 8; i++) {
        const w = i < 4 ? 5 : i < 6 ? 4 : 2;
        beard.span(eyeY + 1 + i, hx0 - 1, hx0 - 2 + w, h);
      }
      beard.put(hx0, eyeY + 7, GOLD[1]);
    }
    if (L.mask) {
      const m = d.part(L.mask.mat[2]);
      for (let y = eyeY + 2; y < top + hh; y++) m.span(y, hx0 - 1 + shape[y - top], hx1 - 4, L.mask.mat);
      m.put(hx1 - 2, eyeY + 3, L.mask.mat[2]);
    }
    const g = L.head;
    if (g) {
      const p = d.part(g.mat[2]);
      const m = g.mat;
      if (g.shape === 'helm' || g.shape === 'plumed') {
        p.span(top - 1, hx0 + 2, hx1 - 1, m, 'light');
        p.span(top, hx0 + 1, hx1, m);
        p.span(top + 1, hx0, hx1, m);
        p.span(top + 2, hx0, hx1, m, 'dark');
        for (let y = top + 3; y < top + hh - 2; y++) p.span(y, hx1 - 2, hx1, m);
        p.put(hx0, top + 3, m[1]);
        if (g.shape === 'plumed' || g.trim) {
          const t = g.trim ?? RED;
          const pl = d.part();
          for (let i = 0; i < 4; i++) pl.span(top - 4 + i, cx + div(i, 2), cx + 1 + div(i, 2), t);
          pl.span(top - 4, cx + 2, cx + 3, t);
        }
      } else if (g.shape === 'cap') {
        p.span(top - 1, hx0 + 2, hx1 - 1, m, 'light');
        p.span(top, hx0 + 1, hx1, m);
        p.span(top + 1, hx0, hx1, m);
        p.span(top + 2, hx0 - 1, hx1, g.trim ?? m, 'dark');
      } else if (g.shape === 'hat') {
        for (let i = 0; i < 8; i++) {
          const w = Math.min(1 + i, b.headW - 2);
          const lean = Math.max(0, 3 - i);
          p.span(top - 7 + i, cx - div(w, 2) + lean, cx - div(w, 2) + lean + w - 1, m);
        }
        p.span(top + 1, hx0 - 1, hx1 + 1, m);
        p.span(top + 2, hx0 - 2, hx1 + 2, m, 'dark');
        if (g.trim) p.span(top, hx0 + 1, hx1 - 1, g.trim, 'flat');
      } else if (g.shape === 'hood') {
        p.span(top - 1, hx0 + 2, hx1 - 1, m, 'light');
        p.span(top, hx0 + 1, hx1, m);
        p.span(top + 1, hx0, hx1 + 1, m);
        p.span(top + 2, hx0, hx1 + 1, m);
        for (let y = top + 3; y <= top + hh; y++) p.span(y, hx1 - 3, hx1 + 1, m);
        p.span(top + hh + 1, hx0 + 1, hx1 + 1, m);
      } else if (g.shape === 'circlet') {
        p.span(top + 2, hx0 + 1, hx1, m, 'flat');
        if (g.trim) p.put(hx0 + 1, top + 2, g.trim[0]);
      }
    }
    const marks = d.part();
    if (this.race === 'elf') {
      marks.put(hx1 - 3, eyeY, this.skin[1]);
      marks.put(hx1 - 2, eyeY - 1, this.skin[1]);
      marks.put(hx1 - 1, eyeY - 2, this.skin[0]);
      marks.put(hx1, eyeY - 3, this.skin[0]);
    } else if (this.race === 'halfling' && !hood) {
      marks.put(hx1 - 3, eyeY - 1, this.skin[1]);
    } else if ((!hood && !g) || g?.shape === 'circlet') {
      marks.put(hx1 - 3, eyeY, this.skin[2]);
    }
    if (this.race === 'orc') {
      marks.put(hx0, eyeY + 2, TUSK);
      marks.put(hx0, eyeY + 1, TUSK);
    }
  }

  private weaponSide(d: Doll, g: Gear, ax: number, hy: number, r: Rows, bodyFront: number): void {
    const p = d.part();
    const m = g.mat;
    const shape = g.shape;
    if (shape === 'sword' || shape === 'greatsword') {
      const length = shape === 'sword' ? 8 : 11;
      p.span(hy - 1, ax - 1, ax - 1, g.trim ?? GOLD, 'flat');
      p.put(ax - 1, hy, g.trim ? g.trim[1] : GOLD[1]);
      p.put(ax - 1, hy + 1, (g.trim ?? GOLD)[1]);
      for (let i = 2; i < 2 + length; i++) {
        const y = hy - (i > div(length, 2) + 1 ? 1 : 0);
        p.put(ax - i, y, i < 1 + length ? m[0] : m[1]);
        if (shape === 'greatsword') p.put(ax - i, y + 1, m[2]);
      }
    } else if (shape === 'axe' || shape === 'greataxe') {
      const length = shape === 'axe' ? 7 : 10;
      for (let i = 1; i < length; i++) p.put(ax - i, hy - div(i, 3), WOOD[1]);
      const head = d.part(m[2]);
      const tipx = ax - length;
      const tipy = hy - div(length - 1, 3);
      for (let y = tipy - 2; y < tipy + 2 + (shape === 'greataxe' ? 1 : 0); y++) head.span(y, tipx - 1, tipx, m);
    } else if (shape === 'dagger') {
      for (const [x, y] of [
        [ax - 1, hy + 1],
        [ax - 2, hy + 1],
        [ax - 3, hy + 2],
      ]) {
        p.put(x, y, m[0]);
      }
    } else if (shape === 'mace') {
      for (let y = hy - 4; y < hy + 2; y++) p.put(ax - 1, y, WOOD[1]);
      const head = d.part(m[2]);
      head.span(hy - 6, ax - 2, ax, m);
      head.span(hy - 5, ax - 2, ax, m);
      head.put(ax - 1, hy - 7, (g.trim ?? m)[0]);
    } else if (shape === 'staff') {
      const hx0 = 12 - div(this.b.headW - 1, 2) - 1;
      const tx = hx0 - 2;
      const ty = r.headTop - 2;
      p.line(ax, FEET_Y, tx, ty, m[1]);
      const orb = g.trim ?? PURPLE;
      const head = d.part();
      head.span(ty - 2, tx - 1, tx, orb);
      head.span(ty - 1, tx - 2, tx + 1, orb);
      head.put(tx - 1, ty - 1, GLOW);
    } else if (shape === 'bow') {
      const bx = bodyFront - 2;
      for (let y = hy - 8; y < hy + 3; y++) p.put(bx, y, STRING);
      for (let i = 0; i < 13; i++) {
        const off = i > 3 && i < 9 ? 2 : i > 1 && i < 11 ? 1 : 0;
        p.put(bx - off, hy - 9 + i, off < 2 ? m[1] : m[0]);
      }
      p.span(hy, bx, ax - 1, this.skin, 'flat');
    }
  }
}

function mirror(src: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < DOLL_H; y++) {
    for (let x = 0; x < DOLL_W; x++) {
      const s = (y * DOLL_W + x) * 4;
      const t = (y * DOLL_W + (DOLL_W - 1 - x)) * 4;
      out[t] = src[s];
      out[t + 1] = src[s + 1];
      out[t + 2] = src[s + 2];
      out[t + 3] = src[s + 3];
    }
  }
  return out;
}

// -------------------------------------------------------------- sheets

export const SHEET_VIEWS: DollView[] = ['down', 'left', 'right', 'up'];
// Columns of a sheet: stepA, idle, stepB, breathe.
export const SHEET_COLUMNS: [number, boolean][] = [
  [-1, false],
  [0, false],
  [1, false],
  [0, true],
];
export const SHEET_W = DOLL_W * SHEET_COLUMNS.length;
export const SHEET_H = DOLL_H * SHEET_VIEWS.length;
export const FACE_W = 32;
export const FACE_H = 26;

export function renderFrame(look: Look, view: DollView, step: number, breathe = false): Uint8ClampedArray {
  return new Figure(look).frame(view, step, breathe);
}

// The whole sheet (4 columns x 4 rows of frames), RGBA.
export function renderSheet(look: Look): Uint8ClampedArray {
  const fig = new Figure(look);
  const out = new Uint8ClampedArray(SHEET_W * SHEET_H * 4);
  SHEET_VIEWS.forEach((view, row) => {
    SHEET_COLUMNS.forEach(([step, breathe], col) => {
      const f = fig.frame(view, step, breathe);
      for (let y = 0; y < DOLL_H; y++) {
        const dst = ((row * DOLL_H + y) * SHEET_W + col * DOLL_W) * 4;
        out.set(f.subarray(y * DOLL_W * 4, (y + 1) * DOLL_W * 4), dst);
      }
    });
  });
  return out;
}

// Head and shoulders at 2x (the interface's pixel size), RGBA 32x26.
export function renderFace(look: Look): Uint8ClampedArray {
  const b = BUILDS[look.race];
  const headTop = FEET_Y - b.legsH + 1 - b.torsoH - b.headH + 1;
  const f = new Figure(look).frame('down', 0, false);
  const out = new Uint8ClampedArray(FACE_W * FACE_H * 4);
  for (let y = 0; y < FACE_H; y++) {
    for (let x = 0; x < FACE_W; x++) {
      const sx = 4 + div(x, 2);
      const sy = headTop - 1 + div(y, 2);
      if (sy < 0 || sy >= DOLL_H) continue;
      const s = (sy * DOLL_W + sx) * 4;
      out.set(f.subarray(s, s + 4), (y * FACE_W + x) * 4);
    }
  }
  return out;
}
