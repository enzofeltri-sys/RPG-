// The beasts: wolves, rats, boars, the spider, serpents. Fur is drawn with
// furPart (clumps streaked the way the coat lies); light on the back, the
// legs and underside in shadow, blight eating the coat.

import { RGB, Ramp, mix, noise, ramp } from '../pixmap';
import { FurOpts, Pt, furPart } from '../shape';
import { BLIGHT_GLOW, EMBER_EYE, Portrait, canvas, crack, finish, glowEye, halo } from './kit';

// The corrupted wolf stalking towards the hero: three quarters, head low
// under the withers and facing out of the picture, the body going back
// and up to the left (its hindquarters further away, so smaller and
// higher), the coat broken by patches of blight.
export const corrupted_wolf: Portrait = (k) => {
  const W = 72;
  const H = 64;
  const body = canvas(W, H, k);
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
  return finish(body, [34, 60, 32, 3], [34, 61], (b) => {
    // Eyes last, glowing over everything.
    for (const [ex, ey] of [[50, 20 + hy], [59, 20 + hy]] as [number, number][]) glowEye(b, ex, ey, EMBER_EYE);
    halo(b, 24, 20, 7, BLIGHT_GLOW, 60);
  });
};

export const BEAST_PORTRAITS: Record<string, Portrait> = { corrupted_wolf };
