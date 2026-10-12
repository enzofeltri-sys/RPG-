// The dead that will not rest: wisps, wraiths, specters and echoes that
// float and fade into smoke at the hem, and the wardens of tombs, chapels
// and drowned halls who still wear their armour.

import { RGB, Ramp, noise, ramp } from '../pixmap';
import { Pt, ScaledCanvas, part, real } from '../shape';
import { figure } from './humanoids';
import { BLIGHT_GLOW, Portrait, canvas, crack, dotsAt, finish, glowEye, halo, rimLight, tube } from './kit';

const W = 56;
const H = 72;
const P = (b: ScaledCanvas, pts: Pt[], r: Ramp, round = 3, bias = 0, tex?: (x: number, y: number) => number) => part(b, pts, r, { round, bias, tex });
const side = (x: number) => (26 - x) * 0.02;
const veil = (x: number, y: number) => (noise(x * 1.4, y * 0.35, 2.5, 13) - 0.5) * 0.45 + side(x);

// Fades everything drawn from y0 (opaque) down to y1 (gone), ragged, and
// makes the whole figure `alpha` see-through: smoke at the hem.
function fade(b: ScaledCanvas, y0: number, y1: number, alpha = 255): void {
  const [p, k] = real(b);
  for (let y = 0; y < p.h; y++) {
    const dy = y / k;
    for (let x = 0; x < p.w; x++) {
      const o = (y * p.w + x) * 4;
      if (!p.data[o + 3]) continue;
      const rag = (noise(x / k, 0, 2, 7) - 0.5) * 8;
      const t = Math.max(0, Math.min(1, (dy - y0 - rag) / (y1 - y0)));
      p.data[o + 3] = Math.round(p.data[o + 3] * (1 - t) * (alpha / 255));
    }
  }
}

interface Specter {
  robe: Ramp;
  hood?: Ramp; // else a bare, gaunt head
  face?: Ramp; // a face seen in the hood (else only the eyes)
  eyes: RGB;
  belt?: Ramp;
  alpha?: number; // see-through
  arms?: 'reach' | 'lantern' | 'folded';
  lantern?: RGB;
  void?: boolean; // nothing at all inside the hood
}

// A robed shape floating above the ground, the hood, the arms, the hem
// tearing into smoke.
function specter(k: number, s: Specter): ReturnType<Portrait> {
  const b = canvas(W, H, k);
  const robe = s.robe;
  // The far arm.
  if (s.arms === 'reach') tube(b, [[38, 26], [44, 32], [49, 30]], (t) => 3 - t * 1.4, robe, { bias: -0.2 });
  // The robe, wide sleeves, the hem in tatters.
  P(b, [[16, 22], [38, 22], [42, 36], [46, 52], [44, 62], [40, 58], [36, 66], [31, 60], [27, 68], [22, 60], [17, 66], [12, 58], [9, 62], [10, 50], [14, 36]], robe, 6, 0, veil);
  for (const pts of [[[20, 30], [18, 50]], [[27, 32], [27, 58]], [[34, 30], [38, 52]]] as [number, number][][]) crack(b, pts, robe[3]);
  if (s.belt) P(b, [[16, 40], [39, 39], [39.4, 42.4], [16, 43.4]], s.belt, 1.2, 0.1);
  // The near arm.
  if (s.arms === 'reach') {
    tube(b, [[17, 26], [10, 33], [5, 30]], (t) => 3.2 - t * 1.4, robe, { bias: 0.1 });
    for (const [dx, dy] of [[-4, -3], [-5, -1], [-5, 1], [-3, 2]] as [number, number][]) tube(b, [[5, 30], [5 + dx, 30 + dy]], () => 0.6, s.face ?? ramp([200, 210, 200], 0.3));
  } else if (s.arms === 'lantern') {
    tube(b, [[37, 26], [41, 36], [40, 42]], (t) => 3 - t, robe, { bias: -0.15 });
    tube(b, [[40, 42], [40, 46]], () => 0.5, ramp([120, 120, 130], 0.4));
    P(b, [[37, 46], [43, 46], [43, 54], [37, 54]], ramp([110, 112, 124], 0.4), 1, 0.1);
    P(b, [[38.4, 47.4], [41.6, 47.4], [41.6, 52.6], [38.4, 52.6]], ramp(s.lantern ?? [255, 220, 140], 0.3), 1, 0.4);
    tube(b, [[17, 26], [14, 36], [20, 42]], (t) => 3 - t, robe, { bias: 0.1 });
  } else {
    // Folded in the sleeves.
    P(b, [[16, 34], [38, 34], [36, 40], [18, 40]], robe, 2, 0.15, veil);
  }
  // The head.
  if (s.hood) {
    P(b, [[17, 24], [18, 10], [22, 3.6], [28, 2], [33, 3.6], [37, 10], [38, 24], [33, 26], [22, 26]], s.hood, 5, 0.05, veil);
    P(b, [[21.6, 9], [32.4, 9], [33, 19], [30, 23], [25, 23], [22, 19]], ramp([20, 16, 24], 0.2), 2, -0.5);
    if (s.face && !s.void) {
      // A gaunt face: hollow eyes, the cheeks fallen in.
      P(b, [[23.4, 12], [31, 12], [30.6, 21], [27, 23], [24, 21]], s.face, 2, -0.3);
      dotsAt(b, [[23, 14], [24, 14], [25, 14], [23, 15], [25, 15], [29, 14], [30, 14], [31, 14], [29, 15], [31, 15], [24, 19], [25, 20], [26, 20], [27, 20], [28, 19]], s.face[4]);
    }
  } else {
    // A gaunt bare head, hair streaming.
    P(b, [[22, 9], [25, 4], [31, 4], [34, 9], [34, 17], [30, 23], [26, 23], [22, 17]], s.face ?? robe, 3, 0.1);
    tube(b, [[33, 6], [38, 14], [40, 26]], (t) => 2 - t, robe, { bias: -0.1 });
    tube(b, [[23, 6], [19, 14], [18, 26]], (t) => 2 - t, robe, { bias: 0.1 });
    dotsAt(b, [[25, 19], [26, 20], [27, 20], [28, 20], [29, 19]], [20, 20, 26]);
  }
  rimLight(b, W, H, [230, 240, 250], 0.4);
  return finish(b, [27, 70, 12, 2], [27, 70], (bb) => {
    fade(bb, 46, 70, s.alpha ?? 255);
    if (!s.void) {
      glowEye(bb, 24, 15, s.eyes, 3, false);
      glowEye(bb, 30, 15, s.eyes, 3, false);
    }
    if (s.arms === 'lantern') halo(bb, 40, 50, 9, s.lantern ?? [255, 220, 140], 130);
  });
}

// Le feu-follet des archives: a flame of cold blue, flickering tongues,
// two dark eyes in its heart.
export const archive_wisp: Portrait = (k) => {
  const b = canvas(48, 60, k);
  const fire = ramp([120, 200, 240], 0.2);
  const pale = ramp([200, 240, 255], 0.2);
  for (const [pts, w] of [[[[22, 40], [16, 28], [18, 18], [14, 6]], 3], [[[26, 38], [30, 26], [28, 16], [33, 4]], 3], [[[24, 40], [24, 24], [22, 12]], 2.5], [[[28, 42], [36, 34], [38, 22]], 2.2], [[[20, 42], [10, 36], [8, 26]], 2.2]] as [[number, number][], number][]) {
    tube(b, pts, (t) => w * (1 - t * 0.85), fire, { bias: 0.2 });
  }
  P(b, [[14, 40], [18, 32], [24, 28], [32, 30], [36, 38], [34, 48], [24, 52], [15, 48]], fire, 6, 0.2);
  P(b, [[18, 40], [22, 34], [28, 34], [31, 40], [29, 46], [21, 46]], pale, 4, 0.35);
  dotsAt(b, [[21, 39], [22, 39], [27, 39], [28, 39], [24, 43], [25, 43]], [40, 70, 110]);
  return finish(b, [24, 58, 9, 2], [24, 58], (bb) => {
    fade(bb, 44, 56, 235);
    halo(bb, 24, 40, 14, [150, 220, 255], 110);
  });
};

// Le spectre des tourbières: a tattered grey-green shape, arms reaching,
// eyes of marsh-light.
export const bog_wraith: Portrait = (k) =>
  specter(k, { robe: ramp([128, 156, 146], 0.3), face: ramp([170, 196, 186], 0.3), eyes: [170, 255, 220], alpha: 220, arms: 'reach' });

// Le spectre de la confrérie: a monk of the brotherhood, hooded in brown,
// a rope at his waist, his pale face still there.
export const brotherhood_specter: Portrait = (k) =>
  specter(k, { robe: ramp([110, 88, 74], 0.5), hood: ramp([104, 82, 70], 0.5), face: ramp([150, 158, 168], 0.3), eyes: [120, 220, 255], belt: ramp([190, 170, 120], 0.5), alpha: 235, arms: 'folded' });

// L'écho de veilleur: a Watcher gone to blue light, a lantern still in hand.
export const watcher_echo: Portrait = (k) =>
  specter(k, { robe: ramp([120, 150, 220], 0.2), hood: ramp([110, 140, 214], 0.2), face: ramp([150, 176, 224], 0.2), eyes: [255, 255, 255], alpha: 200, arms: 'lantern', lantern: [200, 230, 255] });

// Le vestige innommé: a shade blacker than the dark, no face at all, a
// violet edge where the light can't get in.
export const unnamed_vestige: Portrait = (k) => {
  const art = specter(k * 1.1, { robe: ramp([40, 34, 48], 0.3), hood: ramp([36, 30, 44], 0.3), eyes: BLIGHT_GLOW, arms: 'reach', void: true });
  return art;
};

// Le dernier Veilleur: hooded in brown, eyes of gold in the dark of the
// hood, a lantern and the crook of his staff.
export const last_watcher: Portrait = (k) =>
  specter(k * 1.08, { robe: ramp([96, 70, 62], 0.5), hood: ramp([90, 66, 58], 0.5), eyes: [255, 210, 70], belt: ramp([150, 120, 70], 0.5), arms: 'lantern', lantern: [255, 210, 120] });

// L'écho du Sceau: a figure of white-blue light above the burning circle
// of the seal it was bound to.
export const seal_echo: Portrait = (k) => {
  const base = specter(k * 1.05, { robe: ramp([176, 214, 255], 0.2), face: ramp([226, 240, 255], 0.2), eyes: [255, 255, 255], alpha: 210, arms: 'reach' });
  // The seal on the ground under it: a ring of runes.
  const c = new (base.pm.constructor as typeof ScaledCanvas)((base.pm as ScaledCanvas).designW, (base.pm as ScaledCanvas).designH, (base.pm as ScaledCanvas).k);
  const ring: RGB = [140, 210, 255];
  for (let a = 0; a < Math.PI * 2; a += 0.02) {
    for (const r of [12, 15]) c.set(Math.round(27 + Math.cos(a) * r * 1.6), Math.round(66 + Math.sin(a) * r * 0.4), ring, r === 15 ? 200 : 150);
  }
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 5) c.set(Math.round(27 + Math.cos(a) * 13.5 * 1.6), Math.round(66 + Math.sin(a) * 13.5 * 0.4), [255, 255, 255]);
  c.blit(base.pm, 0, 0);
  return { pm: c, anchorX: base.anchorX, anchorY: base.anchorY };
};

// Le dormeur brisé: a sleeper of stone woken and splitting, the fire of its
// heart showing through every crack.
export const broken_sleeper: Portrait = (k) => {
  const b = canvas(66, 66, k * 1.08);
  const rock = ramp([110, 106, 94], 0.4);
  const dark = ramp([76, 72, 66], 0.4);
  const rough = (x: number, y: number) => (noise(x, y, 3, 23) - 0.5) * 0.5 + (33 - x) * 0.012;
  const ember: RGB = [255, 140, 50];
  // Legs, short and wide.
  P(b, [[20, 46], [30, 46], [29, 58], [31, 64], [18, 64], [20, 57]], dark, 3, 0, rough);
  P(b, [[36, 46], [46, 46], [46, 57], [48, 64], [35, 64], [37, 58]], dark, 3, -0.15, rough);
  // Body of boulders, the head sunk forward.
  P(b, [[14, 22], [24, 14], [42, 14], [52, 22], [50, 38], [44, 50], [22, 50], [16, 38]], rock, 8, 0, rough);
  P(b, [[26, 12], [40, 12], [42, 22], [36, 27], [30, 27], [24, 22]], dark, 4, 0.05, rough);
  // Arms of piled stones, fists like boulders.
  P(b, [[4, 20], [16, 18], [18, 30], [14, 42], [6, 42], [3, 30]], rock, 5, 0.1, rough);
  P(b, [[50, 18], [62, 20], [64, 30], [61, 42], [52, 42], [49, 30]], rock, 5, -0.15, rough);
  P(b, [[2, 40], [16, 40], [16, 52], [3, 52]], dark, 4, 0.05, rough);
  P(b, [[50, 40], [64, 40], [63, 52], [50, 52]], dark, 4, -0.1, rough);
  // The cracks, and the fire in them.
  for (const pts of [[[24, 20], [28, 28], [26, 34], [32, 40], [30, 46]], [[42, 18], [38, 26], [42, 32], [38, 38]], [[8, 24], [12, 30], [9, 36]], [[58, 24], [55, 30], [58, 36]], [[30, 16], [33, 20], [36, 16]], [[24, 50], [26, 56]], [[42, 50], [41, 56]]] as [number, number][][]) crack(b, pts, ember);
  rimLight(b, 66, 66, [230, 220, 200], 0.35);
  return finish(b, [33, 64, 30, 2.5], [33, 64], (bb) => {
    glowEye(bb, 30, 20, [255, 180, 80], 3, false);
    glowEye(bb, 36, 20, [255, 180, 80], 3, false);
    halo(bb, 30, 32, 10, ember, 80);
  });
};

// Le scribe voilé: veiled in black, a red stole, the book of glyphs open in
// one hand, the quill in the other dripping ink that glows.
export const veiled_scribe: Portrait = (k) =>
  figure(k * 1.04, {
    legs: ramp([40, 36, 44], 0.3), boots: ramp([36, 32, 40], 0.3), body: ramp([50, 46, 56], 0.3), style: 'robe', belt: ramp([36, 32, 40], 0.3),
    head: 'hood', headR: ramp([46, 42, 52], 0.3), eyes: [200, 160, 255], weapon: 'none', offhand: 'book',
    extra: (b) => {
      // The stole hanging down the front.
      part(b, [[24, 24], [28, 24], [28, 60], [24, 60]], ramp([150, 40, 44], 0.6), { round: 1.2, bias: 0.05 });
      // The quill.
      tube(b, [[10, 42], [6, 34], [4, 28]], (t) => 0.6 + t * 1.2, ramp([230, 226, 214], 0.4));
    },
    glow: (b) => {
      for (const [x, y] of [[23, 15], [28, 15]] as [number, number][]) glowEye(b, x, y, [200, 160, 255], 2.5, false);
      halo(b, 10, 46, 5, [200, 160, 255], 120);
      halo(b, 41, 43, 7, [200, 160, 255], 70);
    },
  });

// Le gardien de la tombe: a skeleton in its burial armour, a notched sword
// and the shield of its house, the tomb's bell rung for the hero.
export const grave_warden: Portrait = (k) =>
  figure(k * 1.06, {
    skin: ramp([214, 206, 182], 0.5), legs: ramp([200, 192, 168], 0.5), boots: ramp([80, 76, 70], 0.4), body: ramp([92, 96, 86], 0.4), style: 'plate',
    head: 'skull', headR: ramp([96, 100, 90], 0.4), arms: ramp([200, 192, 168], 0.5), weapon: 'sword', weaponR: ramp([150, 150, 140], 0.4), offhand: 'shield',
    pauldrons: ramp([100, 104, 94], 0.4), belt: ramp([70, 56, 46], 0.5),
    extra: (b) => {
      // Ribs between the plates, the bones of the legs.
      for (const y of [36, 38]) for (let x = 20; x <= 34; x += 2) if (b.filled(x, y)) b.set(x, y, [40, 34, 34]);
      dotsAt(b, [[22, 50], [22, 52], [33, 50], [33, 52]], [150, 140, 120]);
      dotsAt(b, [[39, 40], [40, 41], [41, 40], [40, 39], [40, 43]], [180, 160, 110]); // the house's sign
    },
    glow: (b) => {
      for (const [x, y] of [[23, 11], [28, 11]] as [number, number][]) glowEye(b, x, y, [150, 255, 200], 2.5, false);
    },
  });

// Le gardien englouti: a knight drowned in his armour, weed hanging from
// it, water running off, a trident.
export const sunken_warden: Portrait = (k) =>
  figure(k * 1.06, {
    legs: ramp([60, 84, 88], 0.3), boots: ramp([50, 70, 74], 0.3), body: ramp([66, 94, 100], 0.3), style: 'plate',
    head: 'greathelm', headR: ramp([70, 98, 104], 0.3), weapon: 'spear', weaponR: ramp([120, 150, 150], 0.3), offhand: 'none',
    pauldrons: ramp([74, 104, 110], 0.3), arms: ramp([62, 88, 94], 0.3),
    extra: (b) => {
      // Weed hanging from the shoulders and the helm, barnacles, drips.
      for (const [x, y0, len] of [[12, 22, 14], [16, 24, 10], [40, 22, 12], [44, 25, 9], [23, 6, 8], [31, 6, 10], [20, 44, 10], [36, 44, 8]] as [number, number, number][]) {
        for (let y = y0; y < y0 + len; y++) b.set(x + Math.round(Math.sin(y * 0.7)), y, y % 2 ? [92, 140, 80] : [70, 112, 60]);
      }
      dotsAt(b, [[20, 32], [33, 28], [26, 40], [36, 54]], [200, 196, 176]);
      // The trident's prongs on the spear.
      part(b, [[3, 9], [4, 2], [5.4, 9]], ramp([120, 150, 150], 0.3), { round: 0.8, bias: 0.2 });
      part(b, [[8, 9], [9.4, 2], [10.6, 9]], ramp([120, 150, 150], 0.3), { round: 0.8, bias: 0.1 });
    },
    glow: (b) => {
      b.hline(22, 32, 11, [120, 240, 230]);
      halo(b, 27, 11.5, 6, [120, 240, 230], 100);
      for (const [x, y] of [[14, 37], [42, 35], [27, 49], [9, 44]] as [number, number][]) b.set(x, y, [170, 220, 240]);
    },
  });

// Le gardien des aïeux: the ancestors' armour of bronze and turquoise,
// horned, the staff of the elders burning with their light.
export const ancestor_warden: Portrait = (k) =>
  figure(k * 1.12, {
    legs: ramp([120, 92, 60], 0.6), boots: ramp([100, 76, 50], 0.6), body: ramp([150, 114, 70], 0.6), style: 'plate', cloak: ramp([50, 110, 110], 0.4),
    head: 'greathelm', headR: ramp([156, 120, 74], 0.6), horns: ramp([150, 114, 70], 0.6), weapon: 'staff', offhand: 'none',
    pauldrons: ramp([164, 126, 80], 0.6), arms: ramp([130, 100, 64], 0.6), belt: ramp([60, 130, 130], 0.4),
    extra: (b) => {
      const tq: RGB = [90, 220, 210];
      for (const pts of [[[22, 26], [25, 29], [28, 26]], [[22, 32], [25, 35], [28, 32]], [[13, 22], [16, 22]], [[39, 21], [42, 21]], [[21, 52], [22, 56]], [[35, 52], [36, 56]]] as [number, number][][]) crack(b, pts, tq);
      // The staff's head: a ring with a stone.
      for (let a = 0; a < Math.PI * 2; a += 0.15) b.set(Math.round(7.6 + Math.cos(a) * 3), Math.round(11 + Math.sin(a) * 3), ramp([200, 160, 90])[1]);
    },
    glow: (b) => {
      b.hline(22, 32, 11, [120, 255, 240]);
      halo(b, 27, 11.5, 6, [90, 220, 210], 110);
      halo(b, 7.6, 11, 6, [90, 220, 210], 150);
      b.set(8, 11, [230, 255, 250]);
    },
  });

export const SPIRIT_PORTRAITS: Record<string, Portrait> = {
  archive_wisp,
  bog_wraith,
  brotherhood_specter,
  watcher_echo,
  unnamed_vestige,
  last_watcher,
  broken_sleeper,
  seal_echo,
  veiled_scribe,
  grave_warden,
  sunken_warden,
  ancestor_warden,
};
