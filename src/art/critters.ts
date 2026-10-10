// The small life of the world, drawn by the game like the rest: animals
// and effects for world/ambience.ts. Each function returns one frame,
// anchored at its bottom center unless said otherwise.

import { OUTLINE, Pixmap, RGB, mix } from './pixmap';

const INK: RGB = OUTLINE;

function outlined(pm: Pixmap): Pixmap {
  pm.outline(INK);
  return pm;
}

// A butterfly seen from above: wings open (spread, colored) or closed (a
// thin upright pair), a dark body.
export function butterfly(color: RGB, open: boolean): Pixmap {
  const pm = new Pixmap(7, 5);
  const light = mix(color, [255, 255, 255], 0.35);
  if (open) {
    for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [0, 3], [1, 3]] as [number, number][]) {
      pm.set(1 + x, y, y < 2 ? light : color);
      pm.set(5 - x, y, y < 2 ? light : color);
    }
  } else {
    pm.set(2, 0, light);
    pm.set(4, 0, light);
    pm.set(2, 1, color);
    pm.set(4, 1, color);
  }
  pm.vline(3, 1, 3, [40, 30, 40]);
  return pm;
}

// A bird high up, wings up or down.
export function bird(up: boolean): Pixmap {
  const pm = new Pixmap(9, 4);
  const C: RGB = [52, 46, 58];
  if (up) {
    pm.set(0, 0, C);
    pm.set(1, 1, C);
    pm.set(2, 2, C);
    pm.set(3, 2, C);
    pm.set(4, 3, C);
    pm.set(5, 2, C);
    pm.set(6, 2, C);
    pm.set(7, 1, C);
    pm.set(8, 0, C);
  } else {
    pm.hline(1, 3, 2, C);
    pm.set(0, 3, C);
    pm.set(4, 2, C);
    pm.set(4, 3, C);
    pm.hline(5, 7, 2, C);
    pm.set(8, 3, C);
  }
  return pm;
}

// A falling leaf, tilted one way or the other.
export function leaf(color: RGB, tilt: boolean): Pixmap {
  const pm = new Pixmap(4, 3);
  const dark = mix(color, [40, 30, 20], 0.35);
  if (tilt) {
    pm.set(0, 0, color);
    pm.set(1, 0, color);
    pm.set(1, 1, color);
    pm.set(2, 1, dark);
    pm.set(3, 2, dark);
  } else {
    pm.set(3, 0, color);
    pm.set(2, 0, color);
    pm.set(2, 1, color);
    pm.set(1, 1, dark);
    pm.set(0, 2, dark);
  }
  return pm;
}

// A dragonfly: long blue body, glassy wings flickering.
export function dragonfly(wingsUp: boolean): Pixmap {
  const pm = new Pixmap(9, 5);
  pm.hline(1, 7, 2, [70, 150, 200]);
  pm.set(8, 2, [40, 90, 130]);
  pm.set(1, 2, [30, 60, 90]);
  const W: RGB = [210, 236, 250];
  const y = wingsUp ? 0 : 1;
  pm.hline(3, 4, y, W);
  pm.hline(5, 6, y, W);
  pm.hline(3, 4, 4 - y, W);
  pm.hline(5, 6, 4 - y, W);
  return pm;
}

// A pigeon on the cobbles: standing, pecking, or flying (two frames).
export function pigeon(frame: 'stand' | 'peck' | 'fly1' | 'fly2'): Pixmap {
  const pm = new Pixmap(8, 7);
  const B: RGB = [150, 152, 168];
  const D: RGB = [104, 106, 124];
  const N: RGB = [110, 150, 140];
  if (frame === 'stand' || frame === 'peck') {
    pm.rect(2, 3, 4, 2, B);
    pm.hline(2, 5, 5, D);
    pm.set(6, 4, D); // tail
    const hy = frame === 'peck' ? 4 : 1;
    const hx = frame === 'peck' ? 0 : 1;
    pm.rect(hx, hy, 2, 2, B);
    pm.set(hx + 1, hy + 1, N);
    pm.set(hx - 1, hy + 1, [200, 150, 90]); // beak
    pm.set(3, 6, [190, 110, 100]);
    pm.set(4, 6, [190, 110, 100]);
  } else {
    pm.rect(3, 3, 3, 2, B);
    pm.set(2, 3, B);
    pm.set(1, 3, [200, 150, 90]);
    const wy = frame === 'fly1' ? 0 : 5;
    pm.hline(2, 6, wy === 0 ? 1 : 5, D);
    pm.set(wy === 0 ? 1 : 1, wy === 0 ? 0 : 6, D);
    pm.set(7, wy === 0 ? 0 : 6, D);
  }
  return outlined(pm);
}

// A hen: standing, pecking or mid-step.
export function chicken(frame: 'stand' | 'peck' | 'walk'): Pixmap {
  const pm = new Pixmap(9, 9);
  const W: RGB = frame === 'walk' ? [236, 226, 206] : [246, 238, 220];
  const S: RGB = [200, 186, 160];
  pm.rect(3, 3, 5, 3, W);
  pm.hline(3, 7, 6, S);
  pm.set(7, 2, W);
  pm.set(8, 2, S); // tail
  const hy = frame === 'peck' ? 5 : 1;
  pm.rect(1, hy, 2, 2, W);
  pm.set(1, hy - 1, [220, 60, 60]); // comb
  pm.set(0, hy + 1, [236, 170, 60]); // beak
  pm.set(4, 7, [236, 170, 60]);
  pm.set(frame === 'walk' ? 6 : 5, 7, [236, 170, 60]);
  pm.set(4, 8, [236, 170, 60]);
  pm.set(frame === 'walk' ? 7 : 5, 8, [236, 170, 60]);
  return outlined(pm);
}

// A frog at the water's edge, sitting or mid-hop.
export function frog(hop: boolean): Pixmap {
  const pm = new Pixmap(7, 5);
  const G: RGB = [96, 150, 70];
  const D: RGB = [62, 100, 50];
  if (!hop) {
    pm.rect(1, 2, 5, 2, G);
    pm.hline(1, 5, 4, D);
    pm.set(1, 1, G);
    pm.set(5, 1, G);
    pm.set(1, 0, [30, 30, 30]);
    pm.set(5, 0, [30, 30, 30]);
  } else {
    pm.rect(2, 1, 3, 2, G);
    pm.set(1, 3, D);
    pm.set(0, 4, D);
    pm.set(5, 3, D);
    pm.set(6, 4, D);
    pm.set(2, 0, [30, 30, 30]);
    pm.set(4, 0, [30, 30, 30]);
  }
  return outlined(pm);
}

// A rat running along a wall, two strides.
export function rat(stride: boolean): Pixmap {
  const pm = new Pixmap(10, 5);
  const R: RGB = [110, 96, 92];
  const D: RGB = [76, 66, 66];
  pm.rect(3, 1, 5, 2, R);
  pm.hline(3, 7, 3, D);
  pm.rect(1, 2, 2, 1, R); // head
  pm.set(0, 2, [200, 150, 150]);
  pm.set(2, 1, [30, 24, 26]);
  for (let i = 0; i < 3; i++) pm.set(8 + Math.min(i, 1), 2 + Math.floor(i / 2), [180, 140, 140]); // tail
  pm.set(stride ? 3 : 4, 4, D);
  pm.set(stride ? 7 : 6, 4, D);
  return outlined(pm);
}

// A bat flapping across the dark.
export function bat(up: boolean): Pixmap {
  const pm = new Pixmap(11, 5);
  const C: RGB = [44, 38, 52];
  pm.rect(4, 1, 3, 3, C);
  pm.set(4, 0, C);
  pm.set(6, 0, C);
  if (up) {
    pm.hline(1, 3, 1, C);
    pm.hline(7, 9, 1, C);
    pm.set(0, 0, C);
    pm.set(10, 0, C);
  } else {
    pm.hline(1, 3, 3, C);
    pm.hline(7, 9, 3, C);
    pm.set(0, 4, C);
    pm.set(10, 4, C);
  }
  pm.set(4, 2, [200, 60, 60]);
  pm.set(6, 2, [200, 60, 60]);
  return pm;
}

// A soft round glow (for flames, lamps, fireflies, spores), centered.
export function glow(radius: number, color: RGB): Pixmap {
  const size = radius * 2 + 1;
  const pm = new Pixmap(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - radius, y - radius) / radius;
      if (d < 1) pm.set(x, y, color, Math.round((1 - d) * (1 - d) * 255));
    }
  }
  return pm;
}

// A puff of smoke, centered: soft, lighter on top.
export function puff(radius: number): Pixmap {
  const size = radius * 2 + 1;
  const pm = new Pixmap(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - radius, y - radius) / radius;
      if (d < 1) pm.set(x, y, y < radius ? [232, 230, 228] : [196, 196, 200], Math.round((1 - d * d) * 150));
    }
  }
  return pm;
}

// A glint of light on water, centered.
export function glint(): Pixmap {
  const pm = new Pixmap(5, 3);
  pm.hline(1, 3, 1, [250, 252, 255]);
  pm.set(2, 0, [220, 236, 250]);
  pm.set(0, 1, [200, 220, 236]);
  pm.set(4, 1, [200, 220, 236]);
  pm.set(2, 2, [200, 220, 236]);
  return pm;
}

// Animals that wander (entities/wanderer.ts), seen from the side and
// facing left: two strides and a head-down pose (grazing, sniffing).
export type AnimalFrame = 'a' | 'b' | 'graze';

// A sheep: a round fleece, dark face and legs.
export function sheep(frame: AnimalFrame): Pixmap {
  const pm = new Pixmap(16, 13);
  const LEG: RGB = [58, 50, 54];
  const legs = frame === 'b' ? [5, 7, 10, 12] : [4, 7, 10, 13];
  legs.forEach((x, i) => {
    const lift = frame === 'b' && i % 2 === 0 ? 1 : 0;
    pm.vline(x, 9, 11 - lift, LEG);
  });
  pm.ellipse(3, 2, 12, 8, (dx, dy) => {
    const k = dx * 0.3 + dy * 0.7;
    if (k < -0.45) return [250, 248, 240];
    if (k < 0.25) return [230, 226, 214];
    return [196, 190, 178];
  });
  // Curls in the fleece.
  for (const [x, y] of [[6, 4], [9, 3], [11, 5], [7, 7], [12, 7]] as [number, number][]) pm.set(x, y, [210, 204, 192]);
  const hy = frame === 'graze' ? 7 : 3;
  pm.rect(1, hy, 3, 3, [72, 62, 64]);
  pm.set(0, hy + 1, [72, 62, 64]);
  pm.set(3, hy - 1, [196, 190, 178]); // ear
  pm.set(1, hy + 1, [20, 16, 18]); // eye
  return outlined(pm);
}

// A roe deer: slim, russet, white rump, small antlers.
export function deer(frame: AnimalFrame): Pixmap {
  const pm = new Pixmap(18, 17);
  const B: RGB = [168, 112, 66];
  const L: RGB = [200, 148, 96];
  const D: RGB = [120, 78, 48];
  const LEG: RGB = [104, 70, 46];
  const legs = frame === 'b' ? [7, 9, 13, 15] : [6, 9, 13, 16];
  legs.forEach((x, i) => {
    const lift = frame === 'b' && i % 2 === 0 ? 1 : 0;
    pm.vline(x, 11, 15 - lift, LEG);
  });
  pm.ellipse(5, 6, 12, 6, (_dx, dy) => (dy < -0.35 ? L : dy < 0.45 ? B : D));
  pm.rect(15, 7, 2, 2, [244, 238, 226]); // rump
  const hy = frame === 'graze' ? 11 : 2;
  if (frame === 'graze') pm.rect(5, 8, 2, 4, B);
  else pm.rect(5, 4, 2, 3, B); // neck
  pm.rect(1, hy, 5, 3, B);
  pm.hline(1, 4, hy, L);
  pm.set(0, hy + 2, [40, 30, 30]); // nose
  pm.set(3, hy + 1, [20, 16, 18]); // eye
  pm.set(6, hy - 1, D); // ear
  if (frame !== 'graze') {
    pm.vline(4, 0, 1, [222, 204, 168]); // antlers
    pm.set(5, 0, [222, 204, 168]);
  }
  return outlined(pm);
}
