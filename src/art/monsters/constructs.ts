// The guardians: golems and constructs of stone, iron and crystal. Their
// volumes are bevelled polygons (part), which suits worked stone and metal.

import { ramp } from '../pixmap';
import { part } from '../shape';
import { BLIGHT_GLOW, Portrait, RUNE, canvas, cellNoise, crack, finish, halo, limb } from './kit';

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

export const CONSTRUCT_PORTRAITS: Record<string, Portrait> = { corrupted_sentinel };
