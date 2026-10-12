// The guardians: golems and constructs of stone, iron and crystal. Their
// volumes are bevelled polygons (part), which suits worked stone and metal.

import { RGB, Ramp, noise, ramp } from '../pixmap';
import { Pt, ScaledCanvas, furPart, part } from '../shape';
import { figure } from './humanoids';
import { BLIGHT_GLOW, Portrait, RUNE, canvas, cellNoise, crack, dotsAt, finish, glowEye, halo, limb, rimLight, tube } from './kit';

const STONE = ramp([124, 124, 116], 0.4);
const IRON = ramp([92, 96, 110], 0.4);

// La sentinelle corrompue: a golem of dressed stone in iron pauldrons, a
// great helm with a glowing slit, a halberd, a rune core cracked by blight.
export const corrupted_sentinel: Portrait = (k) => {
  const W = 56;
  const H = 72;
  const body = canvas(W, H, k);
  const stone = (x: number, y: number) => {
    const c = cellNoise(x, y);
    return c;
  };
  const shaft = ramp([124, 88, 56]);
  // Legs: stone pillars, iron greaves and feet.
  part(body, [[16, 46], [25, 46], [24, 64], [26, 69], [13, 69], [15, 63]], STONE, { round: 3, tex: stone });
  part(body, [[31, 46], [40, 46], [41, 63], [43, 69], [30, 69], [32, 64]], STONE, { round: 3, tex: stone, bias: -0.15 });
  part(body, [[14, 58], [25, 58], [25, 63], [14, 63]], IRON, { round: 2 });
  part(body, [[31, 58], [42, 58], [42, 63], [31, 63]], IRON, { round: 2, bias: -0.1 });
  // Torso: a broad block narrowing to the waist, a belt of iron.
  part(body, [[12, 22], [44, 22], [42, 38], [38, 48], [18, 48], [14, 38]], STONE, { round: 6, tex: stone });
  part(body, [[15, 42], [41, 42], [40, 46], [16, 46]], IRON, { round: 2 });
  // Pauldrons.
  part(body, [[3, 22], [8, 15], [17, 15], [20, 22], [16, 28], [5, 28]], IRON, { round: 4, bias: 0.1 });
  part(body, [[36, 22], [39, 15], [48, 15], [53, 22], [51, 28], [40, 28]], IRON, { round: 4, bias: -0.05 });
  // Arms.
  part(body, [[5, 27], [13, 27], [12, 42], [6, 42]], STONE, { round: 3, tex: stone });
  part(body, [[43, 27], [51, 27], [50, 42], [44, 42]], STONE, { round: 3, tex: stone, bias: -0.2 });
  // The halberd: shaft across, axe blade and spike at the top.
  limb(body, 3, 63, 49, 7, 2, shaft, 0.1);
  part(body, [[44, 3], [51, 1], [55, 5], [54, 12], [48, 13], [46, 8]], IRON, { round: 2, bias: 0.2 });
  part(body, [[48, 2], [50, -1], [52, 3]], IRON, { round: 1, bias: 0.4 });
  // Fists closing on the shaft.
  part(body, [[5, 41], [13, 41], [13, 47], [5, 47]], STONE, { round: 2, tex: stone });
  part(body, [[43, 41], [51, 41], [51, 47], [43, 47]], STONE, { round: 2, tex: stone, bias: -0.2 });
  // Head: a great helm with its crest and slit.
  part(body, [[20, 20], [19, 9], [23, 4], [33, 4], [37, 9], [36, 20]], IRON, { round: 4, bias: 0.05 });
  part(body, [[27, 4], [28, 0], [29, 4]], IRON, { round: 1, bias: 0.3 });
  body.hline(21, 35, 12, [20, 18, 26]);
  body.hline(22, 34, 13, [20, 18, 26]);
  body.vline(28, 14, 19, IRON[3]);
  // Moss in the joints.
  for (const [x, y] of [[16, 47], [17, 48], [39, 47], [14, 30], [41, 34], [25, 23]] as [number, number][]) body.set(x, y, [92, 134, 70]);
  // Corruption creeping from the core.
  crack(body, [[31, 30], [35, 26], [39, 24]], BLIGHT_GLOW);
  crack(body, [[25, 35], [21, 39]], BLIGHT_GLOW);
  return finish(body, [28, 69, 20, 3], [28, 69], (b) => {
    for (const x of [24, 32]) {
      halo(b, x + 0.5, 12.5, 4, RUNE, 150);
      b.set(x, 12, [230, 250, 255]);
    }
    halo(b, 28, 32, 7, RUNE, 130);
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0, 2], [0, -2], [2, 0], [-2, 0]] as [number, number][]) b.set(28 + dx, 32 + dy, dx === 0 && dy === 0 ? [240, 252, 255] : RUNE);
  });
};

// Shorthands: a stone part (dressed blocks), a plain part.
const stoneTex = (x: number, y: number) => cellNoise(x, y) + (32 - x) * 0.012;
const roughTex = (x: number, y: number) => (noise(x, y, 3, 17) - 0.5) * 0.5 + (32 - x) * 0.012;
const P = (b: ScaledCanvas, pts: Pt[], r: Ramp, round = 3, bias = 0, tex?: (x: number, y: number) => number) => part(b, pts, r, { round, bias, tex });

const MOSS: RGB = [104, 146, 76];
function moss(b: ScaledCanvas, pts: [number, number][]): void {
  for (const [x, y] of pts) {
    if (!b.filled(x, y)) continue;
    b.set(x, y, MOSS);
    if (b.filled(x, y + 1)) b.set(x, y + 1, [80, 116, 60]);
  }
}

// Le gardien du puits: a mossy golem rising out of the old well, its
// hands on the rim.
export const well_guardian: Portrait = (k) => {
  const b = canvas(64, 70, k);
  const stone = ramp([118, 126, 108], 0.4);
  const wall = ramp([128, 120, 108], 0.4);
  // The golem, from the waist up, inside the well.
  P(b, [[16, 22], [48, 22], [46, 36], [44, 52], [20, 52], [18, 36]], stone, 6, 0, stoneTex);
  P(b, [[24, 7], [40, 7], [42, 20], [38, 23], [26, 23], [22, 20]], stone, 4, 0.05, stoneTex);
  b.hline(26, 38, 14, [20, 24, 20]);
  // Arms reaching to the rim.
  P(b, [[9, 24], [18, 22], [19, 34], [16, 44], [7, 44], [6, 33]], stone, 4, 0.1, stoneTex);
  P(b, [[46, 22], [55, 24], [58, 33], [57, 44], [48, 44], [45, 34]], stone, 4, -0.15, stoneTex);
  // The well: the dark water behind, the rim, the wall in front.
  P(b, [[6, 44], [58, 44], [60, 49], [4, 49]], ramp([40, 50, 60], 0.3), 2, -0.3);
  P(b, [[4, 47], [60, 47], [61, 52], [61, 66], [53, 69.4], [11, 69.4], [3, 66], [3, 52]], wall, 4, 0, stoneTex);
  P(b, [[3, 46], [61, 46], [61.4, 50], [2.6, 50]], ramp([150, 142, 128], 0.4), 1.6, 0.2);
  // Fists on the rim.
  P(b, [[4, 41], [14, 41], [14.6, 48], [3.6, 48]], stone, 2, 0.15, stoneTex);
  P(b, [[50, 41], [60, 41], [60.4, 48], [49.6, 48]], stone, 2, -0.1, stoneTex);
  moss(b, [[17, 23], [18, 23], [19, 24], [24, 8], [25, 8], [40, 9], [44, 30], [45, 31], [20, 40], [6, 52], [7, 53], [30, 66], [31, 66], [56, 58], [10, 46], [11, 46], [48, 46], [26, 22], [27, 22]]);
  // Vines hanging over the wall.
  for (const [x, len] of [[12, 9], [34, 12], [52, 7]] as [number, number][]) for (let y = 50; y < 50 + len; y++) b.set(x + (y % 3 === 0 ? 1 : 0), y, y % 2 ? MOSS : [80, 116, 60]);
  rimLight(b, 64, 70, [220, 230, 210], 0.35);
  return finish(b, [32, 69, 30, 2], [32, 69], (bb) => {
    for (const x of [29, 35]) glowEye(bb, x, 14, [150, 255, 160], 3, false);
    halo(bb, 32, 46, 9, [120, 200, 220], 40);
  });
};

// Big stone plates rather than bricks: a joint every few rows.
const slabTex = (x: number, y: number) => {
  const by = Math.floor(y / 8);
  const joint = y % 8 === 0 || (x + (by % 2) * 5) % 11 === 0;
  return (joint ? -0.4 : (noise(x, y, 3, 31) - 0.5) * 0.35) + (32 - x) * 0.012;
};

// Le gardien déchu: a great golem of pale stone slabs, broken: a shoulder
// gone, a crack of dim light across the chest, a stone mace dragging.
export const fallen_guardian: Portrait = (k) => {
  const b = canvas(64, 72, k * 1.05);
  const stone = ramp([156, 156, 150], 0.35);
  const dark = ramp([110, 110, 108], 0.35);
  // Legs: thigh and shin slabs, square feet.
  P(b, [[19, 47], [29, 47], [28.6, 57], [19.4, 57]], stone, 3, 0.05, slabTex);
  P(b, [[19, 57], [28.6, 57], [29.4, 66], [31, 70], [16, 70], [18.4, 66]], stone, 3, 0, slabTex);
  P(b, [[35, 47], [45, 47], [44.6, 57], [35.4, 57]], stone, 3, -0.15, slabTex);
  P(b, [[35.4, 57], [44.6, 57], [45.6, 66], [48, 70], [34, 70], [35.6, 66]], stone, 3, -0.2, slabTex);
  // The mace, dragging on the ground at the right.
  tube(b, [[51, 46], [55, 56], [57, 61]], () => 1.4, dark, { bias: 0.1 });
  P(b, [[52, 60], [60, 58], [63, 64], [59, 70], [52, 69], [50, 64]], dark, 3, 0, roughTex);
  // The torso: two chest slabs, the belly, a waist of smaller stones.
  P(b, [[14, 22], [32, 20], [32, 36], [16, 36]], stone, 4, 0.1, slabTex);
  P(b, [[32, 20], [50, 22], [48, 36], [32, 36]], stone, 4, -0.1, slabTex);
  P(b, [[18, 36], [46, 36], [43, 46], [21, 46]], stone, 3, -0.05, slabTex);
  for (let x = 21; x <= 43; x += 4) P(b, [[x, 45], [x + 3.6, 45], [x + 3.2, 49], [x + 0.4, 49]], dark, 1, 0.05);
  // The right arm: a round shoulder, upper arm, forearm, fist on the mace.
  P(b, [[44, 18], [54, 18], [58, 24], [56, 30], [46, 30], [43, 24]], stone, 4, -0.05, slabTex);
  P(b, [[47, 29], [56, 29], [57, 38], [48, 38]], stone, 3, -0.15, slabTex);
  P(b, [[47.4, 38], [56.6, 38], [56, 46], [48, 46]], stone, 3, -0.2, slabTex);
  P(b, [[46.6, 44], [57.4, 44], [57, 50], [47, 50]], dark, 2, -0.05, roughTex);
  // The left: the shoulder broken off at the joint, the arm hanging by a
  // stump, raw stone where it broke.
  P(b, [[8, 32], [16, 30], [17, 40], [9, 40]], stone, 3, 0.05, slabTex);
  P(b, [[8.4, 40], [16.6, 40], [16, 48], [9, 48]], stone, 3, 0, slabTex);
  P(b, [[7.4, 46], [17.4, 46], [17, 53], [8, 53]], dark, 2, 0.1, roughTex);
  P(b, [[9, 22], [16, 20], [19, 24], [17, 31], [8, 31]], ramp([94, 92, 90], 0.3), 2, -0.25, roughTex);
  for (const [x, y] of [[7, 24], [6, 27], [10, 20]] as [number, number][]) b.set(x, y, dark[2]);
  // The head: a block with a T-shaped visor, sunk between the shoulders.
  P(b, [[25, 8], [39, 8], [40, 20], [24, 20]], stone, 4, 0.05, slabTex);
  b.hline(27, 37, 12, [24, 22, 26]);
  for (let y = 12; y <= 17; y++) b.set(32, y, [24, 22, 26]);
  // The crack across the chest, dim light in it.
  crack(b, [[20, 23], [24, 28], [28, 27], [31, 32], [36, 33], [40, 40]], [60, 58, 64]);
  crack(b, [[21, 23], [25, 28], [29, 28], [32, 33], [37, 34], [41, 41]], [190, 150, 220]);
  rimLight(b, 64, 72, [236, 236, 240], 0.35);
  return finish(b, [32, 70, 26, 2.5], [32, 70], (bb) => {
    glowEye(bb, 29, 12, [210, 180, 255], 3, false);
    glowEye(bb, 35, 12, [210, 180, 255], 3, false);
    halo(bb, 30, 30, 8, [190, 150, 220], 60);
  });
};

// Le gardien des éclats: a golem of blue crystal grown round a burning
// core, shards for shoulders and fists.
export const shard_warden: Portrait = (k) => {
  const b = canvas(64, 70, k * 1.05);
  const deep = ramp([52, 64, 150], 0.3);
  const shard = ramp([96, 130, 230], 0.25);
  const pale = ramp([170, 206, 255], 0.2);
  const S = (pts: Pt[], r: Ramp, bias = 0) => P(b, pts, r, 1.2, bias);
  // Legs of crystal.
  S([[20, 46], [28, 46], [27, 60], [29, 68], [18, 68], [20, 60]], deep, 0.05);
  S([[36, 46], [44, 46], [44, 60], [46, 68], [35, 68], [37, 60]], deep, -0.1);
  // The body, faceted, the core in it.
  S([[16, 24], [32, 18], [48, 24], [46, 40], [40, 50], [24, 50], [18, 40]], deep, 0);
  S([[20, 26], [32, 21], [32, 36], [22, 38]], shard, 0.2);
  S([[32, 21], [44, 26], [42, 38], [32, 36]], shard, -0.1);
  S([[22, 38], [32, 36], [42, 38], [38, 48], [26, 48]], deep, -0.1);
  // Facets: bright edges where the planes meet, darker planes between.
  for (const pts of [[[20, 26], [32, 21], [44, 26]], [[32, 21], [32, 36]], [[22, 38], [32, 36], [42, 38]], [[24, 50], [26, 48]], [[40, 50], [38, 48]]] as [number, number][][]) crack(b, pts, pale[0]);
  // Arms: clusters of shards, fists of crystal.
  S([[8, 26], [17, 24], [17, 36], [13, 46], [6, 44], [5, 34]], shard, 0.1);
  S([[47, 24], [56, 26], [59, 34], [58, 44], [51, 46], [47, 36]], shard, -0.15);
  S([[3, 42], [13, 42], [12, 51], [5, 52]], pale, 0.1);
  S([[51, 42], [61, 42], [60, 52], [53, 51]], shard, 0);
  // Arms and legs are clusters too: smaller shards along them.
  for (const [x, y, h, lean] of [[8, 34, 6, -4], [6, 40, 5, -5], [56, 32, 6, 4], [58, 38, 5, 5], [20, 54, 5, -3], [44, 54, 5, 3], [18, 62, 4, -4], [46, 62, 4, 4]] as [number, number, number, number][]) {
    S([[x - 1.8, y + 1.4], [x + lean, y - h * 0.4], [x + 1.8, y - 1.4]], pale, 0.2);
  }
  for (const pts of [[[8, 26], [13, 36], [9, 44]], [[56, 26], [52, 36], [55, 44]], [[24, 48], [23, 60]], [[40, 48], [41, 60]]] as [number, number][][]) crack(b, pts, pale[1]);
  // Shards bursting from the shoulders and the back.
  for (const [x, y, h, lean] of [[10, 25, 13, -3], [16, 22, 10, -1], [46, 22, 11, 2], [53, 25, 14, 4], [24, 20, 8, -2], [40, 20, 9, 2], [32, 17, 7, 0]] as [number, number, number, number][]) {
    S([[x - 2.4, y + 2], [x + lean, y - h], [x + 2.4, y + 2]], h > 10 ? pale : shard, 0.15);
  }
  // The head: a crown of crystal, no face but two lights.
  S([[24, 18], [26, 8], [30, 4], [34, 4], [38, 8], [40, 18], [32, 22]], shard, 0.1);
  S([[30, 4], [32, -1], [34, 4]], pale, 0.3);
  rimLight(b, 64, 70, [220, 240, 255], 0.45);
  return finish(b, [32, 68, 24, 2.5], [32, 68], (bb) => {
    halo(bb, 32, 32, 12, [140, 230, 255], 170);
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0, 2], [0, -2], [2, 0], [-2, 0]] as [number, number][]) bb.set(32 + dx, 32 + dy, dx === 0 && dy === 0 ? [255, 255, 255] : [190, 240, 255]);
    glowEye(bb, 29, 12, [190, 240, 255], 2.5, false);
    glowEye(bb, 34, 12, [190, 240, 255], 2.5, false);
  });
};

// Le gardien primordial: an old giant of earth and stone, hunched under a
// back like a hill, long arms on its fists, roots hanging, runes awake.
export const primordial_guardian: Portrait = (k) => {
  const W = 76;
  const H = 66;
  const b = canvas(W, H, k * 1.1);
  const earth = ramp([120, 110, 88], 0.45);
  const dark = ramp([84, 78, 64], 0.45);
  // Short thick legs behind the arms.
  P(b, [[24, 48], [34, 48], [33, 60], [35, 64], [22, 64], [24, 58]], dark, 3, 0, roughTex);
  P(b, [[44, 48], [54, 48], [54, 58], [56, 64], [43, 64], [45, 60]], dark, 3, -0.15, roughTex);
  // The back, a hill of stone; the chest under it.
  P(b, [[14, 30], [20, 14], [34, 5], [50, 5], [62, 14], [66, 30], [60, 46], [44, 52], [28, 52], [16, 44]], earth, 10, 0, roughTex);
  P(b, [[22, 34], [38, 30], [54, 34], [52, 48], [40, 52], [26, 48]], earth, 6, 0.1, stoneTex);
  // The head, small and low, sunk between the shoulders.
  P(b, [[28, 24], [32, 16], [42, 15], [47, 22], [45, 32], [37, 35], [30, 31]], dark, 4, 0.05, roughTex);
  P(b, [[30, 21], [44, 20], [44, 23], [30, 24]], ramp([60, 54, 46], 0.4), 1, -0.2); // the brow's shadow
  // Long arms down to the ground, fists of boulder.
  P(b, [[6, 24], [18, 18], [22, 30], [18, 46], [16, 56], [6, 56], [4, 44], [2, 34]], earth, 6, 0.1, roughTex);
  P(b, [[58, 18], [70, 24], [74, 34], [72, 44], [70, 56], [60, 56], [58, 46], [54, 30]], earth, 6, -0.15, roughTex);
  P(b, [[1, 52], [18, 52], [20, 62], [16, 65], [3, 65], [0, 60]], dark, 4, 0.05, roughTex);
  P(b, [[58, 52], [75, 52], [76, 60], [73, 65], [60, 65], [56, 62]], dark, 4, -0.1, roughTex);
  // Moss on top, roots hanging, a sapling growing out of the back.
  moss(b, [[30, 6], [31, 6], [32, 6], [44, 5], [45, 5], [50, 6], [24, 12], [25, 12], [58, 12], [59, 12], [8, 25], [9, 25], [66, 25], [36, 16], [37, 16]]);
  for (const [x, len] of [[20, 10], [26, 7], [56, 9], [62, 6]] as [number, number][]) tube(b, [[x, 40], [x - 1, 40 + len / 2], [x + 1, 40 + len]], () => 0.6, ramp([90, 70, 50], 0.5));
  tube(b, [[44, 6], [45, 1], [48, -2]], () => 0.8, ramp([100, 80, 60], 0.5));
  furPart(b, [[45, -2], [50, -4], [53, 0], [48, 2]], ramp([110, 160, 80], 0.5), { round: 1.5, tufts: 0.5, seed: 3 });
  // Runes along the arms and the back.
  const rune: RGB = [255, 170, 80];
  for (const pts of [[[8, 30], [10, 34], [8, 38]], [[66, 30], [64, 34], [66, 38]], [[34, 10], [38, 12], [42, 10]], [[24, 38], [28, 40]], [[50, 38], [46, 40]]] as [number, number][][]) crack(b, pts, rune);
  rimLight(b, W, H, [230, 226, 200], 0.35);
  return finish(b, [38, 64, 34, 2.5], [38, 64], (bb) => {
    glowEye(bb, 34, 25, [255, 190, 90], 3, false);
    glowEye(bb, 41, 25, [255, 190, 90], 3, false);
    for (const [x, y] of [[9, 34], [65, 34], [38, 12]] as [number, number][]) halo(bb, x, y, 5, rune, 80);
  });
};

// Le gardien oublié: a tall armour standing watch at the top of the tower,
// a lantern burning in its helm, a spear in its hand.
export const watchtower_guardian: Portrait = (k) =>
  figure(k * 1.12, {
    legs: ramp([70, 72, 84], 0.4), boots: ramp([62, 64, 76], 0.4), body: ramp([88, 90, 104], 0.4), style: 'plate', cloak: ramp([76, 70, 60], 0.4),
    head: 'greathelm', headR: ramp([92, 94, 108], 0.4), horns: ramp([200, 188, 160], 0.5), weapon: 'spear', weaponR: ramp([170, 176, 190], 0.4), offhand: 'lantern',
    pauldrons: ramp([96, 98, 112], 0.4), arms: ramp([80, 82, 96], 0.4),
    extra: (b) => {
      // Rust and moss: it has stood there a long time.
      dotsAt(b, [[20, 30], [21, 31], [33, 40], [34, 41], [24, 50], [36, 56]], [140, 90, 60]);
      dotsAt(b, [[18, 26], [19, 26], [40, 21], [41, 21]], MOSS);
    },
    glow: (b) => {
      // The light in the helm, a beam spilling from the slit.
      b.hline(22, 32, 11, [255, 230, 150]);
      halo(b, 27, 11.5, 9, [255, 210, 110], 120);
      halo(b, 40.5, 52.5, 6, [255, 210, 110], 100);
    },
  });

// Le gardien du Serment: bronze plate traced with blue runes, a red cloak,
// a horned helm, a sword still bright with the oath.
export const oath_guardian: Portrait = (k) =>
  figure(k * 1.1, {
    legs: ramp([110, 92, 70], 0.5), boots: ramp([92, 76, 58], 0.5), body: ramp([136, 112, 78], 0.5), style: 'plate', cloak: ramp([150, 40, 44], 0.6),
    head: 'greathelm', headR: ramp([128, 106, 76], 0.5), horns: ramp([60, 54, 52], 0.4), weapon: 'sword', weaponR: ramp([190, 220, 255], 0.3), offhand: 'none',
    pauldrons: ramp([146, 120, 84], 0.5), arms: ramp([120, 98, 72], 0.5), belt: ramp([80, 60, 50], 0.5),
    extra: (b) => {
      for (const pts of [[[24, 28], [26, 32], [24, 36]], [[30, 28], [28, 32], [30, 36]], [[12, 22], [15, 24]], [[39, 22], [42, 24]], [[22, 50], [21, 55]], [[35, 50], [36, 55]]] as [number, number][][]) crack(b, pts, RUNE);
    },
    glow: (b) => {
      b.hline(22, 32, 11, RUNE);
      halo(b, 27, 11.5, 6, RUNE, 110);
      halo(b, 7, 26, 7, [170, 220, 255], 80);
    },
  });

// Le gardien du Rite: black-violet plate with magenta runes, a crimson
// cloak, a crested helm, the ritual hammer.
export const rite_guardian: Portrait = (k) =>
  figure(k * 1.1, {
    legs: ramp([60, 50, 72], 0.4), boots: ramp([52, 44, 62], 0.4), body: ramp([74, 60, 90], 0.4), style: 'plate', cloak: ramp([140, 30, 54], 0.6),
    head: 'greathelm', headR: ramp([80, 64, 96], 0.4), crest: ramp([170, 40, 70], 0.6), weapon: 'hammer', weaponR: ramp([120, 100, 130], 0.4), offhand: 'none',
    pauldrons: ramp([84, 68, 100], 0.4), arms: ramp([66, 54, 80], 0.4), belt: ramp([140, 110, 60], 0.6),
    extra: (b) => {
      const m: RGB = [255, 80, 200];
      for (const pts of [[[25, 27], [27, 30], [25, 33], [27, 36]], [[13, 22], [16, 25]], [[40, 22], [43, 25]], [[3, 18], [6, 18]], [[9, 17], [11, 18]]] as [number, number][][]) crack(b, pts, m);
    },
    glow: (b) => {
      b.hline(22, 32, 11, [255, 120, 220]);
      halo(b, 27, 11.5, 6, [255, 80, 200], 110);
      halo(b, 7, 18, 7, [255, 80, 200], 70);
    },
  });

// Le gardien des Registres: a hooded keeper of the archive, eyes in the
// dark of the hood, a staff crowned with a skull, ledgers floating round.
export const record_keeper: Portrait = (k) =>
  figure(k * 1.05, {
    legs: ramp([60, 64, 58], 0.4), boots: ramp([52, 50, 48], 0.4), body: ramp([72, 78, 70], 0.4), style: 'robe', belt: ramp([120, 90, 50], 0.6),
    head: 'hood', headR: ramp([66, 72, 64], 0.4), eyes: [140, 255, 180], weapon: 'staff', offhand: 'none',
    extra: (b) => {
      // The skull on the staff.
      part(b, [[5, 8], [7, 5], [11, 5], [12.6, 8], [12, 12], [10, 13.6], [7, 13.6], [5.6, 12]], ramp([226, 214, 186], 0.5), { round: 2, bias: 0.15 });
      dotsAt(b, [[7, 9], [8, 9], [10, 9], [11, 9], [9, 11]], [40, 30, 30]);
      // Ledgers and loose pages floating.
      for (const [x, y, c] of [[42, 30, [110, 70, 50]], [46, 46, [70, 80, 110]], [2, 50, [100, 60, 60]]] as [number, number, RGB][]) {
        part(b, [[x, y], [x + 7, y - 1], [x + 8, y + 5], [x + 1, y + 6]], ramp(c, 0.5), { round: 1.2, bias: 0.1 });
        for (let i = 1; i < 7; i++) b.set(x + i, y + 5 - (i > 4 ? 1 : 0), [230, 220, 196]);
      }
      for (const [x, y] of [[48, 20], [44, 58], [8, 60], [50, 36]] as [number, number][]) part(b, [[x, y], [x + 4, y - 1], [x + 4.6, y + 3], [x + 0.6, y + 4]], ramp([230, 220, 190], 0.5), { round: 0.8, bias: 0.1 });
    },
    glow: (b) => {
      glowEye(b, 23, 15, [140, 255, 180], 3, false);
      glowEye(b, 28, 15, [140, 255, 180], 3, false);
      for (const [x, y] of [[9, 10], [45, 33], [49, 49]] as [number, number][]) halo(b, x, y, 6, [140, 255, 180], 60);
    },
  });

// Le grimoire corrompu: a book floating open, its pages fanned like gills,
// teeth along their edges, tendrils of blight, a rune burning on it.
export const corrupted_tome: Portrait = (k) => {
  const W = 60;
  const H = 62;
  const b = canvas(W, H, k);
  const cover = ramp([70, 44, 60], 0.4);
  const page = ramp([214, 200, 170], 0.5);
  // Tendrils curling out from behind the spine.
  for (const [pts, w] of [[[[30, 36], [20, 30], [12, 34], [6, 26]], 1.6], [[[30, 36], [42, 28], [50, 32], [56, 24]], 1.6], [[[30, 40], [22, 48], [14, 46], [10, 52]], 1.3], [[[30, 40], [40, 48], [48, 46], [52, 54]], 1.3], [[[30, 34], [30, 22], [26, 14]], 1.2]] as [[number, number][], number][]) {
    tube(b, pts, (t) => w - t * (w - 0.5), ramp([90, 50, 110], 0.4), { bias: 0.1 });
  }
  // Covers spread open, tilted towards us.
  P(b, [[4, 24], [30, 30], [30, 48], [6, 42]], cover, 2, 0.1, roughTex);
  P(b, [[30, 30], [56, 24], [54, 42], [30, 48]], cover, 2, -0.15, roughTex);
  // The pages fanned up, toothed along the edge.
  P(b, [[7, 23], [29, 28], [29, 44], [9, 39]], page, 2, 0.1);
  P(b, [[31, 28], [53, 23], [51, 39], [31, 44]], page, 2, -0.05);
  for (let x = 8; x <= 28; x += 3) part(b, [[x, 23 + (x - 7) * 0.23], [x + 1.4, 19.4 + (x - 7) * 0.23], [x + 2.8, 23.6 + (x - 7) * 0.23]], ramp([236, 228, 200], 0.4), { round: 0.8, bias: 0.25 });
  for (let x = 32; x <= 52; x += 3) part(b, [[x, 28 - (x - 31) * 0.23], [x + 1.4, 24.4 - (x - 31) * 0.23], [x + 2.8, 28.4 - (x - 31) * 0.23]], ramp([236, 228, 200], 0.4), { round: 0.8, bias: 0.15 });
  // Lines of a script, the rune.
  for (let y = 30; y <= 40; y += 3) {
    for (let x = 11; x <= 26; x += 2) b.set(x, y + Math.round((x - 11) * 0.2), [120, 90, 110]);
    for (let x = 34; x <= 49; x += 2) b.set(x, y + Math.round((49 - x) * 0.2) - 3, [120, 90, 110]);
  }
  for (const pts of [[[38, 30], [42, 34], [38, 38]], [[44, 30], [44, 38]], [[18, 32], [22, 36], [18, 40]]] as [number, number][][]) crack(b, pts, BLIGHT_GLOW);
  // Metal corners on the covers.
  dotsAt(b, [[5, 24], [6, 25], [6, 41], [7, 42], [54, 24], [55, 25], [53, 41], [52, 42]], ramp([200, 170, 90])[1]);
  rimLight(b, W, H, [236, 220, 240], 0.35);
  return finish(b, [30, 60, 14, 2], [30, 60], (bb) => {
    halo(bb, 41, 34, 9, BLIGHT_GLOW, 120);
    halo(bb, 20, 36, 7, BLIGHT_GLOW, 80);
  });
};

export const CONSTRUCT_PORTRAITS: Record<string, Portrait> = {
  corrupted_sentinel,
  well_guardian,
  fallen_guardian,
  shard_warden,
  primordial_guardian,
  watchtower_guardian,
  oath_guardian,
  rite_guardian,
  record_keeper,
  corrupted_tome,
};
