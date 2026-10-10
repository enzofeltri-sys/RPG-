// Checks every zone drawn by the game for things that don't sit right:
// props standing on each other, inside a building or a wall, in front of a
// door, in the water or in the middle of a road; scenery covering the
// scene's own people, monsters, chests, signposts, exits, arrival points or
// barrier. The scene side (who stands where) comes from a JSON extracted
// from the scenes' code.
//
// Usage: npm run audit -- <scene-objects.json>

import { readFileSync } from 'fs';
import { materialAt, onPath } from '../../src/art/ground';
import { buildingArt, dpropArt, dpropOffGround, obstacles, propArt } from '../../src/world/zonePlan';
import { ALL_ZONES } from '../../src/world/zones';
import type { Pixmap } from '../../src/art/pixmap';

interface SceneObj {
  kind: string;
  x: number;
  y: number;
  r: number;
}
interface SceneInfo {
  zones: (string | null)[];
  objs: SceneObj[];
  gateY: number | null;
  exitZones: [number, number, number, number][];
  spawns: [number, number][];
}

const scenes: Record<string, SceneInfo> = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const byZone = new Map<string, { scene: string; info: SceneInfo }>();
Object.entries(scenes).forEach(([scene, info]) => info.zones.forEach((z) => z && byZone.set(z, { scene, info })));

// Half-width of what touches the ground: the widest opaque run in the few
// rows just above the anchor.
function footRadius(pm: Pixmap, anchorY: number): number {
  let best = 0;
  for (let y = Math.max(0, anchorY - 3); y <= Math.min(pm.h - 1, anchorY); y++) {
    let x0 = -1;
    let x1 = -1;
    for (let x = 0; x < pm.w; x++) {
      if (pm.data[(y * pm.w + x) * 4 + 3] !== 255) continue;
      if (x0 < 0) x0 = x;
      x1 = x;
    }
    if (x0 >= 0) best = Math.max(best, (x1 - x0 + 1) / 2);
  }
  return Math.max(2, best);
}

const NATURAL = new Set(['tree', 'big_tree', 'apple_tree', 'pine', 'bush', 'berry_bush', 'flower_bush', 'rock_small', 'boulder_large', 'fern', 'mushroom', 'reeds', 'tall_grass', 'flowers', 'dead_tree', 'swamp_tree', 'stump', 'log', 'thorns', 'blight_tree', 'sunken_ruin', 'standing_stone', 'ruin_pillar', 'gravestone', 'herb_patch', 'ore_rock', 'blight_pod']);
const PATHS = new Set(['dirt', 'cobble', 'paving', 'planks', 'flagstone']);
const ON_WATER = new Set(['reeds', 'rowboat', 'swamp_tree', 'sunken_ruin', 'dead_tree', 'mooring_post']);
const PILES = new Set(['crate', 'barrel', 'sacks']);

interface Thing {
  what: string;
  x: number;
  y: number;
  rx: number;
}

function inRect(x: number, y: number, r: [number, number, number, number], m = 0): boolean {
  return x > r[0] - m && x < r[2] + m && y > r[1] - m && y < r[3] + m;
}

let total = 0;
for (const art of ALL_ZONES) {
  const found: string[] = [];
  const say = (msg: string) => found.push(msg);
  const scene = byZone.get(art.key);
  const things: Thing[] = [];
  (art.props ?? []).forEach((p, i) => {
    const a = propArt(p.kind, p.seed ?? i + 1);
    things.push({ what: `${p.kind}@${p.x},${p.y}`, x: p.x, y: p.y, rx: footRadius(a.pm, a.anchorY) });
  });
  const standing = (art.dprops ?? []).filter((d) => !dpropOffGround(d.kind));
  standing.forEach((d) => {
    const a = dpropArt(d.kind);
    things.push({ what: `${d.kind}@${d.x},${d.y}`, x: d.x, y: d.y, rx: footRadius(a.pm, a.anchorY) });
  });
  const rects: { what: string; r: [number, number, number, number]; door?: [number, number] }[] = [];
  Object.entries(art.buildings ?? {}).forEach(([name, b]) => {
    const a = buildingArt(b.kind, b.w, b.h);
    const bottom = b.y + b.h / 2;
    const door = a.doorX !== undefined ? ([b.x - a.anchorX + a.doorX, bottom + 4] as [number, number]) : undefined;
    rects.push({ what: `building ${name}`, r: [b.x - b.w / 2, b.y - b.h / 2, b.x + b.w / 2, bottom], door });
  });
  (art.walls ?? []).forEach((w) => rects.push({ what: `wall@${w.x},${w.y}`, r: [w.x - w.w / 2, w.y - w.h / 2, w.x + w.w / 2, w.y + w.h / 2] }));
  (art.solids ?? []).forEach((s) => rects.push({ what: `solid@${s.x},${s.y}`, r: [s.x - s.w / 2, s.y - s.h / 2, s.x + s.w / 2, s.y + s.h / 2] }));
  (art.patches ?? []).filter((p) => p.material === 'hatch' || p.material === 'stairs').forEach((p) => rects.push({ what: `${p.material}@${p.x},${p.y}`, r: [p.x - p.w / 2, p.y - p.h / 2, p.x + p.w / 2, p.y + p.h / 2] }));

  // Thing on thing.
  for (let i = 0; i < things.length; i++) {
    for (let j = i + 1; j < things.length; j++) {
      const a = things[i];
      const b = things[j];
      const pile = PILES.has(a.what.split('@')[0]) && PILES.has(b.what.split('@')[0]);
      const d = Math.hypot(a.x - b.x, (a.y - b.y) * 1.8);
      if (d < (a.rx + b.rx) * (pile ? 0.45 : 0.8)) say(`overlap: ${a.what} and ${b.what}`);
    }
  }
  // Things in buildings, walls, solids, in front of doors.
  things.forEach((t) => {
    rects.forEach((r) => {
      const hung = /^(torch|cobweb|chains)/.test(t.what);
      const afloat = t.what.startsWith('rowboat') && r.what.startsWith('solid');
      if (!hung && !afloat && inRect(t.x, t.y, r.r, -1)) say(`${t.what} inside ${r.what}`);
      if (r.door && Math.abs(t.x - r.door[0]) < 8 + t.rx && t.y > r.door[1] - 4 && t.y < r.door[1] + 12) say(`${t.what} blocks the door of ${r.what}`);
    });
    const kind = t.what.split('@')[0];
    const m = materialAt(art.ground, t.x, t.y);
    if ((m === 'water' || m === 'bog') && !ON_WATER.has(kind)) say(`${t.what} stands in ${m}`);
    if (PATHS.has(m) && NATURAL.has(kind) && onPath(art.ground, t.x, t.y)) say(`${t.what} grows on the ${m} path`);
  });
  if (scene) {
    const { info } = scene;
    const objs = info.objs;
    things.forEach((t) => {
      objs.forEach((o) => {
        // A gathering spot is its own herb patch or ore rock; a boss stands
        // in front of what's behind him (only what's in front counts).
        if (o.kind === 'gather' && /^(ore_rock|herb_patch)/.test(t.what)) return;
        if (o.kind === 'boss' && t.y < o.y - o.r + 4) return;
        if (Math.hypot(t.x - o.x, (t.y - o.y) * 1.2) < o.r + t.rx + 2) say(`${t.what} on the scene's ${o.kind} at ${o.x},${o.y}`);
      });
      info.spawns.forEach(([sx, sy]) => {
        if (Math.hypot(t.x - sx, t.y - sy - 8) < t.rx + 8) say(`${t.what} on an arrival point ${sx},${sy}`);
      });
      if (info.gateY !== null && Math.abs(t.y - (info.gateY + 8)) < 10) say(`${t.what} on the barrier line (y ${info.gateY})`);
      info.exitZones.forEach((z) => {
        if (NATURAL.has(t.what.split('@')[0]) || PILES.has(t.what.split('@')[0])) {
          if (inRect(t.x, t.y, [z[0] - z[2] / 2, z[1] - z[3] / 2, z[0] + z[2] / 2, z[1] + z[3] / 2], 2) && z[2] < 60 && z[3] < 60) say(`${t.what} on a trigger zone ${z.join(',')}`);
        }
      });
    });
    objs.forEach((o) => {
      rects.forEach((r) => {
        if (inRect(o.x, o.y, r.r, o.kind === 'wanderer' ? 0 : 4)) say(`scene ${o.kind} at ${o.x},${o.y} inside ${r.what}`);
      });
      const m = materialAt(art.ground, o.x, o.y + 8);
      if ((m === 'water' || m === 'bog') && o.kind !== 'boss' && o.kind !== 'encounter') say(`scene ${o.kind} at ${o.x},${o.y} stands in ${m}`);
    });
  }
  // Passers-by on their fixed rounds don't walk through solid decor.
  const solid = obstacles(art);
  (art.walkers ?? []).forEach((w) => {
    for (let i = 1; i < w.path.length; i++) {
      const [ax, ay] = w.path[i - 1];
      const [bx, by] = w.path[i];
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 2);
      const hit = solid.find((o) => {
        for (let k = 0; k <= n; k++) {
          const x = ax + ((bx - ax) * k) / n;
          const y = ay + ((by - ay) * k) / n;
          if (Math.abs(x - o.x) < o.w / 2 + 5 && Math.abs(y - o.y) < o.h / 2 + 2) return true;
        }
        return false;
      });
      if (hit) say(`${w.look}'s round crosses an obstacle at ${Math.round(hit.x)},${Math.round(hit.y)}`);
    }
  });
  if (found.length) {
    console.log(`\n== ${art.key}${scene ? ` (${scene.scene})` : ''}`);
    found.forEach((f) => console.log('  ' + f));
    total += found.length;
  }
}
console.log(`\n${total} findings`);

