// The heavy part of a zone's ground, kept free of Phaser so it can run in
// a worker (world/groundWorker.ts), in the game as a fallback, or in the
// mockup scripts: the ground itself, then everything settled into it
// (trampled earth, contact shading, strewn straw…), then which grass tufts
// and meadow flowers actually land on grass.

import { GroundMaterial, GroundSpec, renderGround } from './ground';
import { Pixmap, RGB } from './pixmap';
import { TuftSpot, occlude, scatter, strew, wear } from './settle';

export type GroundOp =
  | { op: 'wear'; cx: number; cy: number; rx: number; ry: number; seed: number; mat?: GroundMaterial }
  | { op: 'occlude'; x0: number; x1: number; y: number; depth: number; strength: number }
  | { op: 'strew'; cx: number; cy: number; rx: number; ry: number; colors: RGB[]; n: number; seed: number }
  | { op: 'shadeSide'; x: number; y0: number; y1: number; dir: 1 | -1; width: number };

export type Blocker = { kind: 'rect'; x0: number; y0: number; x1: number; y1: number } | { kind: 'circle'; x: number; y: number; r: number };

export interface GroundJob {
  key: string;
  ground: GroundSpec;
  // Extra ground painted around the zone (seen when the screen is bigger
  // than the zone); everything else stays in zone coordinates.
  margin?: [number, number];
  ops: GroundOp[];
  tufts: TuftSpot[];
  meadow?: { n: number; seed: number; blockers: Blocker[] };
}

export interface GroundResult {
  key: string;
  w: number;
  h: number;
  margin: [number, number];
  pixels: Uint8ClampedArray;
  tufts: TuftSpot[];
  meadow: [number, number][];
}

function shifted(spec: GroundSpec, mx: number, my: number): GroundSpec {
  if (!mx && !my) return spec;
  return {
    ...spec,
    w: spec.w + mx * 2,
    h: spec.h + my * 2,
    shapes: (spec.shapes ?? []).map((s) =>
      s.kind === 'path' ? { ...s, points: s.points.map(([x, y]) => [x + mx, y + my] as [number, number]) } : { ...s, x: s.x + mx, y: s.y + my },
    ),
  };
}

export function runGroundJob(job: GroundJob): GroundResult {
  const [mx, my] = job.margin ?? [0, 0];
  const full = renderGround(shifted(job.ground, mx, my));
  // Settling works in zone coordinates on a view of the bigger picture.
  const map = {
    w: job.ground.w,
    h: job.ground.h,
    get: (x: number, y: number) => full.get(x + mx, y + my),
    set: (x: number, y: number, c: RGB, a?: number) => full.set(x + mx, y + my, c, a),
  } as unknown as Pixmap;
  const isGrass = (x: number, y: number): boolean => {
    const c = map.get(Math.round(x), Math.round(y));
    return !!c && c[1] > c[0] + 20 && c[1] > c[2] + 30;
  };
  // Meadow spots are picked on the untouched ground.
  let meadow: [number, number][] = [];
  if (job.meadow) {
    const { blockers } = job.meadow;
    const blocked = (px: number, py: number) =>
      blockers.some((b) => (b.kind === 'rect' ? px > b.x0 && px < b.x1 && py > b.y0 && py < b.y1 : Math.hypot(b.x - px, b.y - py) < b.r));
    meadow = scatter(4, 8, map.w - 8, map.h - 12, job.meadow.n, 22, job.meadow.seed, (px, py) => !isGrass(px, py) || !isGrass(px + 6, py) || blocked(px, py));
  }
  for (const o of job.ops) {
    if (o.op === 'wear') wear(map, o.cx, o.cy, o.rx, o.ry, o.seed, o.mat);
    else if (o.op === 'occlude') occlude(map, o.x0, o.x1, o.y, o.depth, o.strength);
    else if (o.op === 'strew') strew(map, o.cx, o.cy, o.rx, o.ry, o.colors, o.n, o.seed);
    else {
      for (let j = 0; j < o.width; j++) {
        const x = o.x + j * o.dir;
        for (let y = Math.max(0, o.y0); y < Math.min(map.h, o.y1); y++) {
          const c = map.get(x, y);
          if (!c) continue;
          const k = 0.5 * (1 - j / o.width);
          map.set(x, y, [Math.round(c[0] * (1 - k) + 16 * k), Math.round(c[1] * (1 - k) + 12 * k), Math.round(c[2] * (1 - k) + 20 * k)]);
        }
      }
    }
  }
  const tufts = job.tufts.filter((t) => isGrass(t.x, t.y));
  return { key: job.key, w: full.w, h: full.h, margin: [mx, my], pixels: full.data, tufts, meadow };
}
