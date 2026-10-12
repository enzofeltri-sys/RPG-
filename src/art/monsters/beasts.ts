// The beasts: wolves, rats, boars, the spider, serpents. Fur is drawn with
// furPart (clumps streaked the way the coat lies); light on the back, the
// legs and underside in shadow, blight eating the coat.

import { RGB, Ramp, mix, noise, ramp } from '../pixmap';
import { FurOpts, Pt, furPart, part } from '../shape';
import { BLIGHT_GLOW, BONE_WHITE, EMBER_EYE, Portrait, blightPatches, canvas, crack, dotsAt, finish, glowEye, halo, rimLight, tube } from './kit';

// The corrupted wolf stalking towards the hero: three quarters, head low
// under the withers and facing out of the picture, the body going back
// and up to the left (its hindquarters further away, so smaller and
// higher), the coat broken by patches of blight.
interface WolfOpts {
  coat: Ramp;
  deep: Ramp;
  pale: Ramp;
  leg: Ramp; // legs and underside go dark, nearly violet: the light is on the back
  farLeg: Ramp;
  eye: RGB;
  blight: number; // how much of the coat the blight has eaten (patch threshold)
  alpha?: boolean; // the pack leader: a silver mane, a scar, a torn ear
}

const CORRUPTED_WOLF: WolfOpts = {
  coat: ramp([104, 100, 116], 0.5),
  deep: ramp([66, 60, 78], 0.5),
  pale: ramp([150, 146, 160], 0.4),
  leg: ramp([70, 60, 86], 0.4),
  farLeg: ramp([50, 42, 64], 0.4),
  eye: EMBER_EYE,
  blight: 0.68,
};

export const corrupted_wolf: Portrait = (k) => wolf(k, CORRUPTED_WOLF);

// L'alpha: bigger, nearly black, a mane of silver fur, an old scar across
// the eye and a torn ear; the blight has gone deeper into it.
export const alpha_wolf: Portrait = (k) =>
  wolf(k * 1.15, {
    coat: ramp([78, 72, 92], 0.5),
    deep: ramp([48, 42, 60], 0.5),
    pale: ramp([176, 172, 188], 0.3),
    leg: ramp([52, 44, 66], 0.4),
    farLeg: ramp([38, 32, 50], 0.4),
    eye: [255, 50, 70],
    blight: 0.6,
    alpha: true,
  });

function wolf(k: number, o: WolfOpts): ReturnType<Portrait> {
  const W = 72;
  const H = 64;
  const body = canvas(W, H, k);
  const { coat, deep, pale, leg, farLeg } = o;
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
  // The alpha's mane: a mass of silver fur round the neck and shoulders.
  if (o.alpha) fur([[38, 15], [47, 11], [57, 14], [66, 22], [67, 34], [62, 44], [54, 47], [46, 44], [40, 36], [36, 24]], pale, { round: 6, dir: down, tufts: 0.9, seed: 29, bias: -0.25, clump: 0.5 });
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
  fur(at(o.alpha ? [[45, 16], [46, 6], [48, 5], [49, 8], [52, 10]] : [[45, 16], [46, 3], [52, 10]]), coat, { round: 2, dir: -down, tufts: 0.2, seed: 11, bias: 0.15 });
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
  // The alpha's scar, through the brow and down the cheek.
  if (o.alpha) dot([[59, 14], [60, 15], [60, 16], [61, 17], [61, 21], [62, 22], [62, 23], [63, 24]], [150, 110, 120]);
  // Claws.
  for (const [x, y] of [[52, 61], [54, 61], [56, 61], [18, 54], [20, 54], [22, 54], [38, 58], [41, 58], [5, 51], [8, 51]] as [number, number][]) body.set(x, y, [214, 208, 196]);
  // Blight: dark violet patches eating the coat, veins glowing in them.
  const blight = ramp([56, 38, 74], 0.4);
  for (let y = 0; y < 34; y++) for (let x = 0; x < 44; x++) {
    const c = body.get(x, y);
    if (!c || (x < 8 && y > 12)) continue;
    const n = noise(x * 0.45, y * 1.7, 4, 77) + (noise(x * 0.6, y * 2, 1.5, 78) - 0.5) * 0.3;
    if (n > o.blight) {
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
  return finish(body, [34, 60, 32, 3], [34, 61], (b) => {
    // Eyes last, glowing over everything.
    for (const [ex, ey] of [[50, 20 + hy], [59, 20 + hy]] as [number, number][]) glowEye(b, ex, ey, o.eye);
    halo(b, 24, 20, 7, BLIGHT_GLOW, 60);
  });
}

// ------------------------------------------------------------------ rats

const PINK = ramp([196, 142, 140], 0.5);
const RAT_TAIL = ramp([176, 130, 128], 0.5);
const YELLOW_TOOTH: RGB = [236, 210, 120];

// Le rat des cavernes: hunched, the back arched, a naked tail curling
// behind; mange on its flank, an eye like a coal.
export const cave_rat: Portrait = (k) => {
  const W = 62;
  const H = 42;
  const body = canvas(W, H, k);
  const coat = ramp([112, 100, 94], 0.5);
  const deep = ramp([72, 64, 64], 0.5);
  const fur = (pts: Pt[], r: Ramp, o: FurOpts) => furPart(body, pts, r, o);
  tube(body, [[48, 33], [55, 36], [60, 32], [59, 25], [55, 22], [52, 24]], (t) => 2.2 - t * 1.6, RAT_TAIL, { pattern: (a) => (Math.floor(a / 2) % 2 ? -0.15 : 0.05) });
  fur([[40, 32], [47, 33], [48, 38], [39, 38]], deep, { round: 1.5, dir: Math.PI / 2, tufts: 0, seed: 1 });
  fur([[16, 22], [22, 14], [32, 10], [42, 11], [50, 17], [53, 25], [50, 33], [40, 36], [28, 36], [18, 33]], coat, { round: 8, dir: 0, tufts: 0.7, seed: 2, clump: 0.35 });
  fur([[36, 16], [46, 15], [52, 24], [49, 33], [40, 34], [35, 26]], coat, { round: 5, dir: 0.3, tufts: 0.3, seed: 3, bias: 0.25 });
  for (let y = 26; y <= 37; y++) for (let x = 14; x <= 52; x++) {
    const c = body.get(x, y);
    if (c && !body.filled(x, y + 2)) body.set(x, y, mix(c, deep[4], 0.5));
  }
  fur([[38, 33], [48, 34], [50, 38], [37, 38]], PINK, { round: 1.5, dir: 0, tufts: 0, seed: 4, bias: -0.1 });
  // Head low and forward, the snout to the left.
  fur([[21, 15], [14, 16], [8, 19], [3, 23], [1, 25], [4, 28], [10, 29], [17, 29], [23, 24]], coat, { round: 4, dir: 0, tufts: 0.5, seed: 5, clump: 0.3, bias: 0.05 });
  fur([[13, 13], [17, 8], [22, 10], [23, 16], [17, 17]], coat, { round: 2, dir: 0, tufts: 0, seed: 6, bias: 0.1 });
  dotsAt(body, [[17, 11], [18, 12], [19, 12], [18, 13], [17, 14], [19, 14]], PINK[1]); // inside the ear
  fur([[11, 28], [16, 28], [16, 34], [17, 37], [10, 37], [10, 33]], deep, { round: 2, dir: Math.PI / 2, tufts: 0.2, seed: 7 });
  fur([[9, 35], [17, 35], [18, 38], [8, 38]], PINK, { round: 1.2, dir: 0, tufts: 0, seed: 8 });
  dotsAt(body, [[0, 24], [0, 25], [1, 24]], [210, 120, 130]); // the nose
  dotsAt(body, [[3, 28], [4, 28], [3, 29]], YELLOW_TOOTH);
  // Mange: patches where the fur is gone, raw.
  dotsAt(body, [[30, 22], [31, 22], [31, 23], [26, 27], [27, 27], [44, 20]], [170, 110, 110]);
  crack(body, [[28, 14], [32, 18], [31, 22]], BLIGHT_GLOW);
  rimLight(body, W, H);
  // Whiskers, fine and pale.
  crack(body, [[4, 25], [0, 22]], [190, 186, 196]);
  crack(body, [[4, 26], [0, 27]], [190, 186, 196]);
  return finish(body, [30, 38, 26, 2.5], [30, 38], (b) => glowEye(b, 11, 21, EMBER_EYE, 3, false));
};

// Le rat des champs: small and tawny, sitting up to nibble a grain, the
// tail curled on the ground.
export const field_rat: Portrait = (k) => {
  const W = 42;
  const H = 46;
  const body = canvas(W, H, k);
  const coat = ramp([156, 116, 76], 0.6);
  const pale = ramp([214, 192, 156], 0.5);
  const fur = (pts: Pt[], r: Ramp, o: FurOpts) => furPart(body, pts, r, o);
  tube(body, [[24, 41], [31, 43], [37, 41], [39, 36], [36, 33]], (t) => 1.8 - t * 1.2, RAT_TAIL);
  fur([[13, 41], [10, 31], [13, 21], [19, 16], [26, 18], [29, 27], [30, 36], [27, 42]], coat, { round: 6, dir: Math.PI / 2, tufts: 0.6, seed: 11, clump: 0.3 });
  fur([[16, 25], [22, 23], [25, 31], [24, 39], [17, 40], [15, 32]], pale, { round: 4, dir: Math.PI / 2, tufts: 0.3, seed: 12, bias: 0.1 });
  fur([[22, 33], [30, 34], [31, 41], [24, 42]], coat, { round: 3, dir: 0.4, tufts: 0.2, seed: 13, bias: 0.2 }); // the haunch
  fur([[9, 40], [17, 41], [18, 44], [8, 44]], PINK, { round: 1.2, dir: 0, tufts: 0, seed: 14 });
  fur([[23, 41], [30, 41], [31, 44], [22, 44]], PINK, { round: 1.2, dir: 0, tufts: 0, seed: 15, bias: -0.15 });
  // Head tilted up, the nose twitching.
  fur([[13, 19], [11, 13], [13, 8], [18, 5], [24, 6], [27, 10], [25, 16], [19, 19]], coat, { round: 4, dir: Math.PI * 0.6, tufts: 0.4, seed: 16, bias: 0.1 });
  fur([[11, 13], [9, 10], [7, 8], [10, 7], [14, 8]], pale, { round: 1.5, dir: Math.PI, tufts: 0, seed: 17 });
  for (const [ex, ey] of [[15, 5], [24, 3]] as [number, number][]) {
    fur([[ex - 3, ey + 2], [ex - 2, ey - 2], [ex + 1, ey - 3], [ex + 3, ey], [ex + 2, ey + 3]], coat, { round: 2, dir: 0, tufts: 0, seed: ex, bias: 0.1 });
    dotsAt(body, [[ex, ey], [ex - 1, ey + 1], [ex, ey + 1]], PINK[1]);
  }
  dotsAt(body, [[7, 8], [6, 8]], [210, 120, 130]);
  // The forepaws holding a grain of wheat.
  dotsAt(body, [[13, 18], [14, 18], [17, 19], [18, 19]], PINK[1]);
  dotsAt(body, [[15, 17], [16, 17], [15, 16], [16, 18]], [230, 190, 90]);
  rimLight(body, W, H);
  crack(body, [[9, 9], [4, 7]], [220, 214, 200]);
  crack(body, [[9, 10], [4, 11]], [220, 214, 200]);
  return finish(body, [20, 43, 14, 2], [20, 43], (b) => {
    b.set(15, 10, [30, 20, 20]);
    b.set(15, 9, [220, 200, 200]);
  });
};

// Le roi des rats: huge and fat, sitting up on its throne of filth, a
// crown of bones between its ears, its tail coiled in front.
export const rat_king: Portrait = (k) => {
  const W = 66;
  const H = 66;
  const body = canvas(W, H, k);
  const coat = ramp([100, 88, 82], 0.5);
  const deep = ramp([64, 56, 54], 0.5);
  const pale = ramp([156, 138, 120], 0.5);
  const fur = (pts: Pt[], r: Ramp, o: FurOpts) => furPart(body, pts, r, o);
  fur([[18, 60], [12, 46], [14, 32], [22, 22], [34, 18], [46, 22], [54, 34], [56, 48], [50, 60]], coat, { round: 10, dir: Math.PI / 2, tufts: 0.8, seed: 21, clump: 0.18 });
  fur([[24, 56], [22, 42], [28, 32], [38, 30], [44, 40], [44, 54]], pale, { round: 6, dir: Math.PI / 2, tufts: 0.4, seed: 22, bias: -0.05, clump: 0.15 });
  for (let y = 40; y <= 62; y++) for (let x = 10; x <= 58; x++) {
    const c = body.get(x, y);
    if (c && (x < 18 || x > 50)) body.set(x, y, mix(c, deep[4], 0.35));
  }
  // Feet, and the tail coiled round in front of them.
  fur([[14, 57], [26, 57], [27, 62], [13, 62]], PINK, { round: 1.5, dir: 0, tufts: 0, seed: 23 });
  fur([[40, 57], [51, 57], [53, 62], [39, 62]], PINK, { round: 1.5, dir: 0, tufts: 0, seed: 24, bias: -0.15 });
  tube(body, [[54, 48], [61, 54], [58, 61], [44, 64], [28, 64], [16, 62], [9, 57]], (t) => 3.2 - t * 2, RAT_TAIL, { pattern: (a) => (Math.floor(a / 2.5) % 2 ? -0.15 : 0.05) });
  // Arms folded on the belly, claws out.
  fur([[21, 33], [28, 35], [31, 44], [25, 47], [19, 40]], coat, { round: 3, dir: Math.PI / 2, tufts: 0.3, seed: 25, bias: 0.15 });
  fur([[47, 33], [40, 35], [37, 44], [43, 47], [49, 40]], coat, { round: 3, dir: Math.PI / 2, tufts: 0.3, seed: 26, bias: -0.05 });
  dotsAt(body, [[26, 47], [28, 47], [30, 46], [38, 46], [40, 47], [42, 47]], BONE_WHITE);
  // Head: the ears, the skull, the snout coming at us.
  for (const [ex, flip] of [[21, 1], [47, -1]] as [number, number][]) {
    fur([[ex + flip * 5, 13], [ex, 8], [ex - flip * 1, 2], [ex + flip * 5, 3], [ex + flip * 7, 9]], coat, { round: 2.5, dir: 0, tufts: 0, seed: ex, bias: 0.1 });
    dotsAt(body, [[ex + flip * 2, 5], [ex + flip * 3, 6], [ex + flip * 2, 7], [ex + flip * 3, 8], [ex + flip * 4, 7]], PINK[1]);
  }
  fur([[24, 24], [22, 16], [26, 9], [34, 6], [42, 9], [46, 16], [44, 24], [38, 31], [30, 31]], coat, { round: 6, dir: Math.PI * 0.5, tufts: 0.5, seed: 27, clump: 0.3, bias: 0.05 });
  fur([[29, 20], [39, 20], [38, 27], [34, 30], [30, 27]], pale, { round: 3, dir: Math.PI / 2, tufts: 0, seed: 28, bias: 0.1, clump: 0.2 });
  dotsAt(body, [[33, 27], [34, 27], [35, 27], [34, 28]], [200, 110, 120]);
  dotsAt(body, [[33, 30], [33, 31], [33, 32], [35, 30], [35, 31], [35, 32]], YELLOW_TOOTH);
  // The crown: a band of bone and rusted iron, spikes of bone.
  part(body, [[26, 8], [42, 8], [42, 11], [26, 11]], ramp([150, 110, 70]), { round: 1, bias: 0.15 });
  for (const [x, h] of [[27, 3], [30, 5], [34, 7], [38, 5], [41, 3]] as [number, number][]) part(body, [[x - 1, 9], [x, 8 - h], [x + 1.2, 9]], ramp([226, 214, 186], 0.5), { round: 1, bias: 0.25 });
  // Scars, mange, a few drops of blight.
  dotsAt(body, [[41, 13], [42, 14], [42, 15], [43, 16], [16, 40], [17, 41], [50, 30]], [160, 106, 106]);
  for (const [x, y] of [[20, 30], [21, 31], [47, 44], [46, 45], [30, 50]] as [number, number][]) body.set(x, y, [140, 70, 150]); // blighted sores
  rimLight(body, W, H);
  return finish(body, [34, 63, 28, 3], [34, 63], (b) => {
    glowEye(b, 29, 15, EMBER_EYE, 3.5);
    glowEye(b, 38, 15, EMBER_EYE, 3.5);
  });
};

// ----------------------------------------------------------------- boars

interface BoarOpts {
  hide: Ramp;
  deep: Ramp;
  bristle: Ramp;
  eye: RGB;
  vein: RGB;
  alpha?: boolean; // black crystal spikes along the spine, burning veins
}

// Le sanglier corrompu: head down, charging to the left, the bristles up,
// tusks curling out of the jaw.
export const corrupted_boar: Portrait = (k) =>
  boar(k, { hide: ramp([96, 82, 76], 0.5), deep: ramp([60, 50, 50], 0.5), bristle: ramp([70, 60, 62], 0.5), eye: EMBER_EYE, vein: BLIGHT_GLOW });

// L'alpha: blacker and bigger, the blight grown into spikes of dark
// crystal along its back, veins of fire under the hide.
export const corrupted_boar_alpha: Portrait = (k) =>
  boar(k * 1.15, { hide: ramp([66, 50, 56], 0.5), deep: ramp([40, 30, 36], 0.5), bristle: ramp([50, 38, 46], 0.5), eye: [255, 90, 40], vein: [255, 76, 52], alpha: true });

function boar(k: number, o: BoarOpts): ReturnType<Portrait> {
  const W = 72;
  const H = 52;
  const body = canvas(W, H, k);
  const fur = (pts: Pt[], r: Ramp, f: FurOpts) => furPart(body, pts, r, f);
  const hoof = ramp([50, 42, 40], 0.4);
  // Far legs.
  fur([[20, 35], [25, 35], [24, 44], [25, 48], [20, 48]], o.deep, { round: 2, dir: Math.PI / 2, tufts: 0.2, seed: 31 });
  fur([[46, 34], [51, 34], [52, 44], [53, 48], [48, 48]], o.deep, { round: 2, dir: Math.PI / 2, tufts: 0.2, seed: 32 });
  // The body: a high hump over the shoulders, sloping to small hams.
  fur([[20, 20], [26, 10], [36, 6], [46, 9], [56, 15], [62, 24], [61, 33], [54, 38], [40, 40], [28, 39], [20, 34]], o.hide, { round: 10, dir: 0, tufts: 0.6, seed: 33, clump: 0.25 });
  fur([[48, 15], [58, 18], [62, 27], [59, 35], [50, 36], [46, 26]], o.hide, { round: 6, dir: 0.4, tufts: 0, seed: 34, bias: 0.2, clump: 0.2 }); // the ham
  fur([[24, 14], [34, 8], [42, 12], [40, 24], [30, 28], [24, 24]], o.hide, { round: 6, dir: Math.PI / 2, tufts: 0, seed: 39, bias: 0.25, clump: 0.2 }); // the shoulder
  for (let y = 28; y <= 41; y++) for (let x = 18; x <= 64; x++) {
    const c = body.get(x, y);
    if (c && !body.filled(x, y + 3)) body.set(x, y, mix(c, o.deep[4], 0.5));
  }
  // The ridge of bristles (or crystal), tallest on the hump.
  for (let x = 22; x <= 54; x += 3) {
    const top = 7 + Math.max(0, (x - 34) * 0.32) + Math.max(0, (30 - x) * 0.3);
    const h = x < 40 ? 4.5 : 3;
    if (o.alpha && x % 6 === 4) part(body, [[x - 1.6, top + 4], [x + 0.6, top - h - 3], [x + 2.6, top + 4]], ramp([70, 50, 96], 0.3), { round: 1.2, bias: 0.3 });
    else fur([[x - 1, top + 4], [x + 1, top - h], [x + 3, top + 4]], o.bristle, { round: 1, dir: -Math.PI / 2, tufts: 0.3, seed: x, bias: 0.15 });
  }
  // Near legs, short and thick, the hooves split.
  fur([[24, 35], [31, 35], [30, 43], [31, 46], [25, 46], [25, 42]], o.hide, { round: 3, dir: Math.PI / 2, tufts: 0.3, seed: 35, bias: 0.05 });
  fur([[50, 32], [58, 32], [58, 40], [57, 43], [58, 46], [52, 46], [52, 41]], o.hide, { round: 3, dir: Math.PI / 2, tufts: 0.3, seed: 36, bias: -0.05 });
  for (const [x, y] of [[24, 46], [51, 46], [19, 47], [47, 47]] as [number, number][]) {
    part(body, [[x, y], [x + 7, y], [x + 7.4, y + 3.4], [x - 0.4, y + 3.4]], hoof, { round: 1, bias: 0.1 });
    body.set(x + 3, y + 3, hoof[4]);
  }
  // The head, big and low, the snout a disc of hide, an ear laid back.
  fur([[31, 15], [22, 13], [12, 17], [5, 24], [2, 31], [4, 38], [12, 41], [22, 40], [31, 33]], o.hide, { round: 6, dir: 0, tufts: 0.4, seed: 37, clump: 0.25, bias: 0.1 });
  fur([[23, 15], [28, 6], [31, 15]], o.hide, { round: 1.5, dir: -Math.PI / 2, tufts: 0.2, seed: 38, bias: 0.15 });
  for (let y = 33; y <= 41; y++) for (let x = 3; x <= 31; x++) {
    const c = body.get(x, y);
    if (c) body.set(x, y, mix(c, o.deep[3], 0.35));
  }
  part(body, [[0, 30], [5, 29], [6.6, 33.5], [5, 38.4], [0.4, 38]], ramp([150, 118, 112], 0.5), { round: 1.6, bias: 0.15 });
  dotsAt(body, [[1, 32], [1, 35], [3, 32], [3, 35]], [50, 34, 36]);
  dotsAt(body, [[7, 39], [8, 40], [10, 40], [11, 40]], [60, 40, 40]); // the mouth
  // Tusks curling up from the jaw.
  tube(body, [[11, 39.5], [6, 39.5], [3, 35], [3.6, 29.5]], (t) => 1.5 - t * 0.7, ramp([234, 224, 196], 0.5));
  tube(body, [[15, 39.5], [13, 36.5], [12.5, 33]], (t) => 1.2 - t * 0.5, ramp([214, 204, 176], 0.5));
  blightPatches(body, W, 34, o.alpha ? 0.68 : 0.76, 37, (x) => x > 32);
  crack(body, [[36, 14], [39, 19], [38, 25], [43, 29]], o.vein);
  crack(body, [[48, 14], [51, 19], [56, 20]], o.vein);
  if (o.alpha) {
    crack(body, [[16, 22], [20, 26], [24, 26]], o.vein);
    crack(body, [[54, 24], [58, 28], [57, 32]], o.vein);
  }
  rimLight(body, W, H);
  return finish(body, [36, 50, 32, 2.5], [36, 50], (b) => {
    glowEye(b, 15, 23, o.eye, 3, false);
    if (o.alpha) halo(b, 40, 22, 9, o.vein, 50);
  });
}

// --------------------------------------------------------------- spider

// L'araignée des cavernes: seen from the front and above, the bulb of its
// abdomen behind, eight legs raised and splayed, a cluster of eyes.
export const cave_spider: Portrait = (k) => {
  const W = 80;
  const H = 54;
  const body = canvas(W, H, k);
  const chitin = ramp([82, 72, 68], 0.4);
  const hair = ramp([96, 84, 76], 0.5);
  const leg = ramp([70, 60, 58], 0.4);
  // Eight legs splayed round it: up to the knee, down to the ankle, a
  // short foot; the front pairs reach towards us, the back ones behind.
  const c = W / 2;
  const LEGS: [number, number][][] = [
    [[5, 34], [16, 18], [24, 40], [24, 48]],
    [[6, 32], [22, 14], [32, 30], [34, 38]],
    [[6, 30], [20, 8], [33, 18], [36, 26]],
    [[5, 28], [14, 4], [26, 8], [30, 14]],
  ];
  for (const i of [3, 2, 1, 0]) {
    for (const side of [-1, 1]) {
      const [base, knee, ankle, foot] = LEGS[i].map(([dx, y]) => [c + side * dx, y] as [number, number]);
      const lean = side < 0 ? 0.15 : -0.12;
      tube(body, [base, [(base[0] + knee[0]) / 2, (base[1] + knee[1]) / 2 - 1.5], knee], (t) => 2.2 - t * 0.5, leg, { bias: lean });
      tube(body, [knee, [(knee[0] + ankle[0]) / 2 + side * 1.5, (knee[1] + ankle[1]) / 2 - 1], ankle], (t) => 1.6 - t * 0.5, leg, { bias: lean - 0.05 });
      tube(body, [ankle, foot], (t) => 1.1 - t * 0.4, leg, { bias: lean - 0.1 });
      body.set(Math.round(knee[0]), Math.round(knee[1]) - 1, chitin[0]);
    }
  }
  // The abdomen, hairy, a blighted sign on its back.
  furPart(body, [[27, 12], [34, 5], [44, 4], [52, 10], [54, 20], [48, 28], [32, 28], [25, 20]], hair, { round: 9, dir: Math.PI / 2, tufts: 0.6, seed: 41, clump: 0.3 });
  for (const [x, y] of [[40, 8], [39, 9], [41, 9], [40, 10], [40, 12], [38, 14], [42, 14], [40, 16], [36, 18], [44, 18], [40, 19]] as [number, number][]) body.set(x, y, [150, 70, 160]);
  // The head and thorax, armoured.
  part(body, [[32, 27], [48, 27], [50, 35], [40, 43], [30, 35]], chitin, { round: 4, bias: 0.1 });
  // Fangs.
  tube(body, [[36, 41], [35, 45], [37, 48]], (t) => 1.6 - t * 0.9, ramp([40, 32, 34], 0.3));
  tube(body, [[44, 41], [45, 45], [43, 48]], (t) => 1.6 - t * 0.9, ramp([40, 32, 34], 0.3));
  rimLight(body, W, H, [200, 190, 200], 0.35);
  return finish(body, [40, 50, 34, 3], [40, 50], (b) => {
    glowEye(b, 37, 32, [255, 70, 70], 3, false);
    glowEye(b, 42, 32, [255, 70, 70], 3, false);
    for (const [x, y] of [[35, 30], [44, 30], [38, 29], [41, 29]] as [number, number][]) b.set(x, y, [220, 90, 90]);
  });
};

// --------------------------------------------------------------- serpents

interface SerpentOpts {
  scales: Ramp;
  belly: Ramp;
  eye: RGB;
  matriarch?: boolean; // a hood, ridges, moss
}

// Le serpent des marais: coiled, its head raised to strike, banded olive
// scales and a pale belly.
export const marsh_serpent: Portrait = (k) =>
  serpent(k, { scales: ramp([110, 124, 70], 0.6), belly: ramp([196, 186, 126], 0.5), eye: [255, 70, 50] });

// La matriarche: much bigger and darker, a hood spread wide, moss on her
// coils, eyes of yellow fire.
export const marsh_matriarch: Portrait = (k) =>
  serpent(k * 1.25, { scales: ramp([70, 98, 62], 0.5), belly: ramp([160, 162, 104], 0.5), eye: [255, 214, 60], matriarch: true });

function serpent(k: number, o: SerpentOpts): ReturnType<Portrait> {
  const W = 64;
  const H = 58;
  const body = canvas(W, H, k);
  const bands = (a: number, across: number) => (Math.floor(a / 4.5) % 2 ? -0.3 : 0.05) + (Math.abs(across) < 0.25 && Math.floor(a / 2.2) % 2 ? -0.25 : 0);
  // The coils, from the tail's tip at the back round to the neck.
  tube(
    body,
    [[50, 40], [42, 38], [26, 38], [13, 42], [10, 48], [17, 54], [33, 56], [49, 54], [56, 48], [50, 42], [38, 42], [29, 44], [27, 36], [26, 27], [24, 20]],
    (t) => (t < 0.12 ? 1 + t * 30 : t > 0.85 ? 5 - (t - 0.85) * 8 : 5),
    o.scales,
    { belly: o.belly, bellySide: -1, pattern: bands },
  );
  if (o.matriarch) {
    // The hood, spread behind the head, with its eye-marks.
    part(body, [[24, 24], [16, 18], [15, 10], [20, 5], [28, 5], [33, 10], [32, 18]], o.scales, { round: 4, bias: 0.05 });
    for (const [x, y] of [[19, 13], [29, 13]] as [number, number][]) dotsAt(body, [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]], [210, 190, 90]);
    for (const [x, y] of [[14, 50], [15, 51], [36, 56], [37, 55], [52, 50], [20, 40], [45, 39]] as [number, number][]) body.set(x, y, [120, 160, 80]);
  }
  // The head, wedge-shaped, looking left.
  part(body, [[30, 13], [24, 9], [16, 10], [10, 13], [9, 16], [14, 19], [24, 20], [30, 17]], o.scales, { round: 3, bias: 0.15 });
  part(body, [[10, 16], [14, 18.6], [24, 19.6], [25, 18], [14, 17]], o.belly, { round: 1, bias: 0 });
  dotsAt(body, [[18, 11], [21, 11], [24, 12]], o.scales[3]);
  // The tongue, forked.
  crack(body, [[9, 16], [5, 16]], [220, 60, 70]);
  dotsAt(body, [[4, 15], [4, 17]], [220, 60, 70]);
  rimLight(body, W, H, [230, 236, 200], 0.4);
  return finish(body, [33, 55, 26, 3], [33, 55], (b) => glowEye(b, 16, 13, o.eye, 3, false));
}

export const BEAST_PORTRAITS: Record<string, Portrait> = {
  corrupted_wolf,
  alpha_wolf,
  cave_rat,
  field_rat,
  rat_king,
  corrupted_boar,
  corrupted_boar_alpha,
  cave_spider,
  marsh_serpent,
  marsh_matriarch,
};
