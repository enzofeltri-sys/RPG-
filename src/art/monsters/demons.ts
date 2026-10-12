// The blight and the Demon King's own: things of flesh, root and shadow
// grown from the corruption, the envoy and the keeper of blood, and the
// echo of the king himself.

import { RGB, Ramp, noise, ramp } from '../pixmap';
import { Pt, ScaledCanvas, furPart, part, real } from '../shape';
import { figure } from './humanoids';
import { BLIGHT_GLOW, Portrait, canvas, crack, dotsAt, finish, glowEye, halo, rimLight, tube } from './kit';

const P = (b: ScaledCanvas, pts: Pt[], r: Ramp, round = 3, bias = 0, tex?: (x: number, y: number) => number) => part(b, pts, r, { round, bias, tex });
const side = (cx: number) => (x: number) => (cx - x) * 0.016;
const flesh = (x: number, y: number) => (noise(x, y, 2.5, 41) - 0.5) * 0.4 + (30 - x) * 0.014;

// Le rejeton corrompu: a hunched thing of grey flesh, veins of blight
// under the skin, arms too long, a mouth too wide.
export const blight_spawn: Portrait = (k) => {
  const W = 62;
  const H = 58;
  const b = canvas(W, H, k);
  const skin = ramp([150, 124, 112], 0.5);
  const dark = ramp([108, 86, 82], 0.5);
  // Far limbs.
  tube(b, [[42, 30], [50, 40], [52, 52]], (t) => 3.4 - t * 1.6, dark, { bias: -0.2 });
  tube(b, [[38, 40], [44, 48], [42, 55]], (t) => 3.4 - t * 1.2, dark, { bias: -0.2 });
  // The hunched back and belly.
  P(b, [[16, 26], [22, 14], [34, 9], [46, 14], [50, 26], [46, 40], [34, 44], [22, 40]], skin, 9, 0, flesh);
  for (let x = 24; x <= 46; x += 4) P(b, [[x - 1.6, 14 - (x - 34) * (x - 34) * 0.01], [x, 9.6 - (x - 34) * (x - 34) * 0.01], [x + 1.6, 14 - (x - 34) * (x - 34) * 0.01]], dark, 1, 0.2); // knobs of spine
  // Near legs, crouched.
  tube(b, [[24, 38], [18, 46], [22, 55]], (t) => 4 - t * 1.6, skin, { bias: 0.05 });
  P(b, [[16, 53], [26, 53], [27, 56.6], [15, 56.6]], dark, 1.2, 0);
  // The near arm, long, behind the head, claws in the dirt.
  tube(b, [[26, 24], [17, 38], [13, 51]], (t) => 3.6 - t * 1.4, skin, { bias: 0.1 });
  for (const dx of [-3, -1, 1, 3]) tube(b, [[13, 51], [13 + dx * 1.2, 56]], () => 0.7, ramp([60, 44, 50], 0.3));
  // A shadow where the head meets the body.
  P(b, [[18, 18], [26, 16], [28, 26], [22, 30]], dark, 2, -0.3, flesh);
  // The head, low and forward, the jaw hanging open.
  P(b, [[4, 18], [8, 11], [16, 8], [23, 12], [24, 21], [18, 26], [8, 26]], skin, 4, 0.15, flesh);
  P(b, [[5, 25], [20, 25], [18, 33], [9, 33]], dark, 2, -0.05, flesh);
  for (let x = 6; x <= 19; x++) {
    b.set(x, 25, [70, 20, 30]);
    b.set(x, 26, [100, 30, 40]);
  }
  for (const x of [6, 8, 11, 14, 17, 19]) dotsAt(b, [[x, 25], [x, 26]], [236, 226, 196]);
  for (const x of [7, 10, 13, 16]) b.set(x, 27, [236, 226, 196]);
  dotsAt(b, [[9, 15], [10, 14], [15, 13], [16, 14]], skin[4]); // brows
  // Veins of blight under the skin.
  for (const pts of [[[30, 14], [32, 22], [28, 30], [32, 38]], [[40, 16], [38, 24], [42, 32]], [[16, 18], [20, 22]], [[14, 34], [12, 42]], [[46, 22], [48, 30]]] as [number, number][][]) crack(b, pts, [140, 70, 160]);
  rimLight(b, W, H, [236, 220, 220], 0.35);
  return finish(b, [30, 56, 24, 2.5], [30, 56], (bb) => {
    glowEye(bb, 9, 17, [255, 70, 90], 3, false);
    glowEye(bb, 15, 16, [255, 70, 90], 3, false);
  });
};

// L'émissaire du Roi Démon: tall, red-skinned, horned, in black robes with
// gold and a high collar, a hand lifted in its pact.
export const demon_envoy: Portrait = (k) =>
  figure(k * 1.12, {
    skin: ramp([170, 60, 60], 0.6), legs: ramp([40, 34, 44], 0.3), boots: ramp([36, 30, 40], 0.3), body: ramp([46, 40, 52], 0.3), style: 'robe', belt: ramp([210, 170, 70], 0.6),
    head: 'bare', weapon: 'staff', offhand: 'none', cloak: ramp([110, 30, 40], 0.6), arms: ramp([50, 44, 56], 0.3),
    extra: (b) => {
      const gold = ramp([214, 170, 70], 0.6);
      // Gold edging down the robe, the high collar behind the head.
      part(b, [[14, 24], [18, 12], [22, 20], [20, 26]], gold, { round: 1.4, bias: 0.15 });
      part(b, [[40, 24], [36, 12], [32, 20], [34, 26]], gold, { round: 1.4, bias: -0.05 });
      for (let y = 26; y <= 66; y++) {
        b.set(21, y, gold[1]);
        b.set(33, y, gold[2]);
      }
      // Horns curving back, the face of the envoy.
      tube(b, [[24, 6], [21, 2], [22, -2], [25, -3]], (t) => 1.8 - t * 1.1, ramp([60, 40, 40], 0.4));
      tube(b, [[31, 6], [35, 2], [36, -2], [34, -3]], (t) => 1.6 - t, ramp([50, 34, 34], 0.4));
      dotsAt(b, [[23, 18], [24, 19], [25, 19], [26, 19], [27, 18]], [60, 20, 20]);
      // The staff's head: a gold crescent round a black stone.
      for (let a = 0.3; a < Math.PI * 2 - 0.3; a += 0.15) b.set(Math.round(7.6 + Math.cos(a - Math.PI / 2) * 3), Math.round(11 + Math.sin(a - Math.PI / 2) * 3), gold[1]);
    },
    glow: (b) => {
      glowEye(b, 23, 12, [255, 200, 60], 2.5, false);
      glowEye(b, 28, 12, [255, 200, 60], 2.5, false);
      halo(b, 7.6, 11, 6, [255, 80, 60], 140);
      b.set(8, 11, [255, 200, 160]);
    },
  });

// Le cœur de la corruption: a heart the size of a man, swollen, beating,
// black veins over it, thorns growing out of the flesh, spores glowing.
export const corruption_heart: Portrait = (k) => {
  const W = 66;
  const H = 64;
  const b = canvas(W, H, k * 1.08);
  const meat = ramp([150, 50, 56], 0.6);
  const dark = ramp([90, 30, 40], 0.5);
  // Arteries rising from the top, cut and ragged.
  tube(b, [[24, 18], [22, 10], [18, 4]], (t) => 4 - t, dark, { bias: 0.1 });
  tube(b, [[38, 16], [40, 8], [46, 3]], (t) => 4.4 - t * 1.2, dark, { bias: -0.05 });
  tube(b, [[31, 16], [31, 8]], () => 3, meat, { bias: 0.1 });
  // The heart: two lobes and the point.
  P(b, [[8, 26], [12, 16], [22, 12], [32, 18], [42, 12], [54, 14], [60, 26], [56, 42], [44, 54], [33, 62], [22, 54], [12, 42]], meat, 12, 0, flesh);
  P(b, [[32, 18], [36, 30], [33, 46], [33, 60]], dark, 1, -0.1); // the groove
  crack(b, [[32, 18], [35, 30], [33, 44], [33, 58]], dark[4]);
  // Black veins over it.
  for (const pts of [[[14, 22], [20, 30], [18, 40], [24, 48]], [[26, 16], [24, 26], [28, 36]], [[48, 16], [44, 26], [50, 34], [46, 44]], [[56, 24], [52, 32]], [[38, 40], [42, 50]]] as [number, number][][]) tube(b, pts, (t) => 1.2 - t * 0.5, ramp([40, 20, 30], 0.3));
  // Thorns.
  for (const [x, y, dx, dy] of [[10, 30, -4, -1], [16, 18, -3, -3], [58, 22, 4, -2], [56, 38, 4, 1], [20, 50, -3, 3], [46, 50, 3, 3], [30, 14, -1, -4]] as [number, number, number, number][]) {
    part(b, [[x - dy * 0.4 - 1, y + dx * 0.4], [x + dx * 1.8, y + dy * 1.8], [x + dy * 0.4 + 1, y - dx * 0.4]], ramp([60, 44, 50], 0.3), { round: 1, bias: 0.2 });
  }
  rimLight(b, W, H, [255, 200, 200], 0.4);
  return finish(b, [33, 62, 24, 2.5], [33, 62], (bb) => {
    for (const [x, y] of [[20, 36], [44, 30], [38, 46], [26, 24], [50, 20]] as [number, number][]) {
      halo(bb, x, y, 4, [255, 120, 80], 140);
      bb.set(x, y, [255, 220, 160]);
    }
    halo(bb, 33, 34, 18, [255, 60, 60], 50);
  });
};

// La racine-mère corrompue: a knot of roots heaving up from the earth,
// thorned, writhing, red buds swollen along them, an eye in the heart.
export const blight_root: Portrait = (k) => {
  const W = 72;
  const H = 62;
  const b = canvas(W, H, k * 1.1);
  const bark = ramp([96, 74, 60], 0.5);
  const dark = ramp([64, 50, 44], 0.5);
  const thorn = ramp([50, 40, 40], 0.3);
  const ROOTS: [number, number][][] = [
    [[30, 50], [16, 44], [8, 32], [12, 18], [6, 8]],
    [[40, 50], [56, 46], [64, 34], [60, 20], [66, 8]],
    [[34, 48], [26, 34], [30, 20], [24, 6]],
    [[38, 48], [46, 34], [42, 20], [48, 4]],
    [[28, 54], [12, 56], [4, 50]],
    [[44, 54], [60, 56], [68, 50]],
  ];
  // The far roots first, darker.
  for (const r of ROOTS.slice(0, 2)) tube(b, r, (t) => 4 - t * 3, dark, { bias: -0.05, pattern: (a) => (Math.floor(a / 3) % 2 ? -0.15 : 0) });
  // The heart: a swollen knot with an eye.
  P(b, [[24, 42], [28, 32], [36, 28], [46, 32], [50, 42], [46, 54], [36, 58], [26, 54]], bark, 8, 0, flesh);
  for (const r of ROOTS.slice(2)) tube(b, r, (t) => 4.6 - t * 3.4, bark, { bias: 0.1, pattern: (a) => (Math.floor(a / 3) % 2 ? -0.15 : 0) });
  // Thorns along the roots.
  for (const r of ROOTS) for (let i = 1; i < r.length; i++) {
    const [x0, y0] = r[i - 1];
    const [x1, y1] = r[i];
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const nx = -(y1 - y0) / Math.hypot(x1 - x0, y1 - y0);
    const ny = (x1 - x0) / Math.hypot(x1 - x0, y1 - y0);
    part(b, [[mx - 1, my], [mx + nx * 4.4, my + ny * 4.4], [mx + 1, my + 0.6]], thorn, { round: 0.8, bias: 0.2 });
  }
  // The eye.
  P(b, [[30, 42], [37, 38], [44, 42], [37, 47]], ramp([230, 210, 180], 0.4), 2, 0.1);
  rimLight(b, W, H, [230, 210, 190], 0.35);
  return finish(b, [36, 59, 30, 2.5], [36, 59], (bb) => {
    // Swollen red buds, glowing.
    for (const [x, y] of [[12, 18], [60, 20], [26, 34], [46, 32], [8, 32], [64, 34], [24, 8], [48, 6], [12, 54], [60, 54]] as [number, number][]) {
      halo(bb, x, y, 3.4, [255, 60, 60], 160);
      bb.set(x, y, [255, 180, 150]);
    }
    halo(bb, 37, 42, 6, [255, 80, 60], 120);
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [0, -1], [1, -1]] as [number, number][]) bb.set(36 + dx, 42 + dy, dx === 0 && dy === 0 ? [255, 230, 140] : [200, 30, 30]);
  });
};

// Le gardien du Sang: black plate edged with crimson, a crimson cloak, a
// saw-toothed blade, the chalice of the blood it keeps.
export const blood_keeper: Portrait = (k) =>
  figure(k * 1.1, {
    legs: ramp([50, 40, 46], 0.4), boots: ramp([44, 34, 40], 0.4), body: ramp([60, 48, 56], 0.4), style: 'plate', cloak: ramp([140, 24, 36], 0.6),
    head: 'greathelm', headR: ramp([66, 52, 60], 0.4), crest: ramp([150, 30, 40], 0.6), weapon: 'sword', weaponR: ramp([150, 70, 76], 0.5), offhand: 'none',
    pauldrons: ramp([70, 54, 62], 0.4), arms: ramp([56, 44, 52], 0.4), belt: ramp([130, 30, 40], 0.6),
    extra: (b) => {
      const red: RGB = [200, 40, 50];
      for (const pts of [[[19, 25], [34, 25]], [[19, 43], [35, 43]], [[8, 26], [18, 26]], [[36, 26], [46, 26]]] as [number, number][][]) crack(b, pts, red);
      // Teeth along the blade.
      for (const [x, y] of [[4, 18], [5, 22], [5, 26], [6, 30], [6, 34]] as [number, number][]) b.set(x, y, [200, 190, 190]);
      // The chalice in the far hand.
      part(b, [[36, 40], [42, 40], [41, 44], [39.6, 45], [39.6, 49], [41.6, 50], [36.4, 50], [38.4, 49], [38.4, 45], [37, 44]], ramp([210, 170, 70], 0.6), { round: 1.2, bias: 0.15 });
      dotsAt(b, [[37, 40], [38, 40], [39, 40], [40, 40], [41, 40]], [160, 20, 30]);
    },
    glow: (b) => {
      b.hline(22, 32, 11, [255, 60, 60]);
      halo(b, 27, 11.5, 6, [255, 40, 40], 120);
      halo(b, 39, 40, 4, [255, 40, 40], 120);
    },
  });

// La sentinelle du fléau: a sentinel overgrown, its stone gone to black
// bark, violet crystal bursting from it, a staff of root in its hand.
export const blight_sentinel: Portrait = (k) => {
  const W = 60;
  const H = 72;
  const b = canvas(W, H, k * 1.05);
  const bark = ramp([70, 62, 74], 0.4);
  const dark = ramp([50, 44, 56], 0.4);
  const crystal = ramp([150, 90, 210], 0.3);
  const barkTex = (x: number, y: number) => (noise(x * 1.6, y * 0.4, 2, 51) - 0.5) * 0.6 + (30 - x) * 0.012;
  // The staff of root, held upright at our left.
  tube(b, [[8, 70], [7, 44], [9, 22], [6, 10], [9, 4]], (t) => 1.8 - t * 0.6, ramp([90, 70, 56], 0.5), { bias: 0.1 });
  // Legs.
  P(b, [[18, 46], [28, 46], [27, 62], [29, 70], [15, 70], [17, 62]], bark, 3, 0.05, barkTex);
  P(b, [[33, 46], [43, 46], [44, 62], [46, 70], [32, 70], [34, 62]], bark, 3, -0.15, barkTex);
  // Torso and arms of bark over stone.
  P(b, [[12, 22], [46, 22], [44, 38], [40, 48], [20, 48], [15, 38]], bark, 6, 0, barkTex);
  P(b, [[4, 24], [13, 22], [15, 34], [13, 44], [6, 44], [4, 34]], bark, 4, 0.1, barkTex);
  P(b, [[45, 22], [54, 24], [56, 34], [55, 44], [47, 44], [45, 34]], bark, 4, -0.15, barkTex);
  P(b, [[4, 42], [13, 42], [13, 48], [4, 48]], dark, 2, 0.1, barkTex);
  P(b, [[46, 42], [55, 42], [55, 48], [46, 48]], dark, 2, -0.1, barkTex);
  // The head: a helm grown over with bark, a crown of crystal.
  P(b, [[21, 20], [20, 8], [24, 3], [34, 3], [38, 8], [37, 20]], dark, 4, 0.05, barkTex);
  b.hline(22, 36, 12, [16, 12, 20]);
  for (const [x, y, h, lean] of [[28, 4, 9, 0], [24, 5, 6, -2], [33, 5, 7, 2], [10, 24, 8, -2], [49, 23, 9, 3], [20, 30, 6, -1], [40, 34, 7, 2], [30, 26, 5, 0]] as [number, number, number, number][]) {
    part(b, [[x - 2, y + 2], [x + lean, y - h], [x + 2, y + 2]], crystal, { round: 1, bias: 0.25 });
  }
  furPart(b, [[14, 46], [20, 44], [24, 48], [18, 50]], ramp([90, 120, 70], 0.5), { round: 1.5, tufts: 0.6, seed: 9 });
  rimLight(b, W, H, [220, 210, 240], 0.35);
  return finish(b, [30, 70, 22, 2.5], [30, 70], (bb) => {
    bb.hline(23, 35, 12, [220, 160, 255]);
    halo(bb, 29, 12.5, 7, BLIGHT_GLOW, 120);
    for (const [x, y] of [[28, 0], [49, 16], [10, 18]] as [number, number][]) halo(bb, x, y, 5, BLIGHT_GLOW, 90);
  });
};

// L'écho du Roi Démon: the king that was sealed, come back as a shape of
// cold blue fire: a crown of horns, a skull for a face, a mantle of shadow
// with lightning running in it.
export const demon_king_echo: Portrait = (k) => {
  const W = 76;
  const H = 84;
  const b = canvas(W, H, k * 1.08);
  const shade = ramp([40, 44, 80], 0.3);
  const cold = ramp([120, 150, 230], 0.2);
  const veil = (x: number, y: number) => (noise(x * 1.2, y * 0.3, 2.5, 61) - 0.5) * 0.5 + (38 - x) * 0.012;
  // The mantle, wide as wings, ragged.
  P(b, [[16, 26], [28, 20], [48, 20], [60, 26], [70, 48], [72, 76], [64, 70], [58, 80], [50, 72], [44, 82], [38, 74], [32, 82], [26, 72], [18, 80], [12, 70], [4, 76], [6, 48]], shade, 8, 0, veil);
  for (const pts of [[[24, 30], [18, 56], [16, 74]], [[38, 30], [38, 60], [38, 78]], [[52, 30], [58, 56], [60, 74]]] as [number, number][][]) crack(b, pts, shade[0]);
  // Arms of shadow, the hands claws of light.
  tube(b, [[20, 30], [10, 42], [6, 52]], (t) => 4 - t * 2, shade, { bias: 0.1 });
  tube(b, [[56, 30], [66, 42], [70, 52]], (t) => 4 - t * 2, shade, { bias: -0.15 });
  for (const [hx, s] of [[6, -1], [70, 1]] as [number, number][]) for (const d of [-2, 0, 2]) tube(b, [[hx, 52], [hx + s * 2 + d, 58]], () => 0.7, cold);
  // Shoulders of shadow rising in points.
  P(b, [[14, 30], [18, 18], [24, 12], [28, 24], [24, 32]], shade, 3, 0.15, veil);
  P(b, [[62, 30], [58, 18], [52, 12], [48, 24], [52, 32]], shade, 3, -0.05, veil);
  // The head: a long skull of cold fire, a crown of pale horns.
  const skull = ramp([84, 104, 180], 0.2);
  P(b, [[30, 24], [29, 13], [32, 7], [44, 7], [47, 13], [46, 24], [42, 33], [38, 35], [34, 33]], skull, 4, 0.1);
  // Slanted sockets, deep.
  for (const [x0, inward] of [[30, 1], [40, -1]] as [number, number][]) {
    for (let i = 0; i < 6; i++) {
      const top = 15 + (inward > 0 ? (i > 3 ? 1 : 0) : i < 2 ? 1 : 0);
      for (let y = top; y <= 19; y++) b.set(x0 + i, y, [8, 10, 26]);
    }
  }
  dotsAt(b, [[37, 22], [38, 21], [39, 22], [38, 23]], [8, 10, 26]); // the nose
  for (let x = 32; x <= 44; x++) dotsAt(b, [[x, 27], [x, 29]], [8, 10, 26]);
  for (const x of [32, 34, 36, 38, 40, 42, 44]) b.set(x, 28, [8, 10, 26]);
  dotsAt(b, [[32, 26], [44, 26], [33, 30], [43, 30]], skull[3]);
  for (const [x, h, lean] of [[29, 12, -7], [33, 16, -3], [38, 20, 0], [43, 16, 3], [47, 12, 7]] as [number, number, number][]) {
    part(b, [[x - 2.4, 10], [x + lean, 10 - h], [x + 2.4, 10]], ramp([176, 196, 236], 0.2), { round: 1.2, bias: 0.15 });
  }
  part(b, [[29, 11], [47, 11], [47, 8], [29, 8]], ramp([150, 170, 220], 0.2), { round: 1, bias: 0.1 });
  rimLight(b, W, H, [180, 210, 255], 0.5);
  return finish(b, [38, 82, 26, 2.5], [38, 82], (bb) => {
    const [p] = real(bb);
    void p;
    // Lightning running in the mantle, the eyes and the fire round it.
    for (const pts of [[[12, 48], [16, 54], [12, 60], [17, 66]], [[64, 46], [60, 54], [65, 60], [60, 68]], [[30, 40], [34, 46], [30, 52]], [[46, 40], [42, 48], [47, 54]]] as [number, number][][]) crack(bb, pts, [190, 220, 255]);
    glowEye(bb, 33, 17, [190, 240, 255], 1.6, false);
    glowEye(bb, 43, 17, [190, 240, 255], 1.6, false);
    halo(bb, 38, 20, 20, [110, 160, 255], 40);
    for (const [x, y] of [[6, 56], [70, 56]] as [number, number][]) halo(bb, x, y, 6, [150, 200, 255], 110);
  });
};

export const DEMON_PORTRAITS: Record<string, Portrait> = {
  blight_spawn,
  demon_envoy,
  corruption_heart,
  blight_root,
  blood_keeper,
  blight_sentinel,
  demon_king_echo,
};

void side;
