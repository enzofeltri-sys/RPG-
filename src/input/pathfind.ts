import Phaser from 'phaser';

// Finding a way around things for tap-to-move: a grid of 8px cells over
// the world, a cell blocked when the player standing there would overlap
// something solid he collides with (walls, buildings, decor, people
// standing still), A* across it, then the corners cut wherever the way is
// clear so he walks in straight lines rather than along the grid.

const CELL = 8;

interface Grid {
  cols: number;
  rows: number;
  x0: number;
  y0: number;
  blocked: Uint8Array;
}

type Body = Phaser.Physics.Arcade.Body;

// The fixed things the player collides with, as world rectangles.
export function playerObstacles(scene: Phaser.Scene, player: Phaser.GameObjects.GameObject): Phaser.Geom.Rectangle[] {
  const out: Phaser.Geom.Rectangle[] = [];
  const add = (o: unknown): void => {
    if (!o) return;
    if (Array.isArray(o)) {
      o.forEach(add);
      return;
    }
    const group = o as { getChildren?: () => unknown[] };
    if (typeof group.getChildren === 'function') {
      group.getChildren().forEach(add);
      return;
    }
    const body = (o as { body?: Phaser.Physics.Arcade.StaticBody | Body | null }).body;
    if (!body || !body.enable || !(body instanceof Phaser.Physics.Arcade.StaticBody)) return;
    out.push(new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height));
  };
  const has = (o: unknown) => o === player || (Array.isArray(o) && o.includes(player));
  scene.physics.world.colliders.getActive().forEach((c) => {
    if (c.overlapOnly || !c.active) return;
    if (has(c.object1)) add(c.object2);
    else if (has(c.object2)) add(c.object1);
  });
  return out;
}

function buildGrid(scene: Phaser.Scene, player: Phaser.GameObjects.GameObject & { body: Body }): { grid: Grid; ox: number; oy: number } {
  const bounds = scene.physics.world.bounds;
  const cols = Math.ceil(bounds.width / CELL);
  const rows = Math.ceil(bounds.height / CELL);
  const grid: Grid = { cols, rows, x0: bounds.x, y0: bounds.y, blocked: new Uint8Array(cols * rows) };
  const body = player.body;
  const pos = player as unknown as { x: number; y: number };
  // Where the body sits relative to the player's position.
  const ox = body.center.x - pos.x;
  const oy = body.center.y - pos.y;
  const hw = body.halfWidth - 1;
  const hh = body.halfHeight - 1;
  playerObstacles(scene, player).forEach((r) => {
    // Player positions whose body would overlap r.
    const left = r.left - hw - ox;
    const right = r.right + hw - ox;
    const top = r.top - hh - oy;
    const bottom = r.bottom + hh - oy;
    const c0 = Math.max(0, Math.ceil((left - grid.x0) / CELL - 0.5));
    const c1 = Math.min(cols - 1, Math.floor((right - grid.x0) / CELL - 0.5));
    const r0 = Math.max(0, Math.ceil((top - grid.y0) / CELL - 0.5));
    const r1 = Math.min(rows - 1, Math.floor((bottom - grid.y0) / CELL - 0.5));
    for (let y = r0; y <= r1; y++) for (let x = c0; x <= c1; x++) grid.blocked[y * cols + x] = 1;
  });
  // The world's edges: the body must stay inside.
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = grid.x0 + (x + 0.5) * CELL + ox;
      const py = grid.y0 + (y + 0.5) * CELL + oy;
      if (px - hw < bounds.left || px + hw > bounds.right || py - hh < bounds.top || py + hh > bounds.bottom) grid.blocked[y * cols + x] = 1;
    }
  }
  return { grid, ox, oy };
}

const cellOf = (g: Grid, x: number, y: number): [number, number] => [
  Phaser.Math.Clamp(Math.floor((x - g.x0) / CELL), 0, g.cols - 1),
  Phaser.Math.Clamp(Math.floor((y - g.y0) / CELL), 0, g.rows - 1),
];
const centerOf = (g: Grid, c: number, r: number): [number, number] => [g.x0 + (c + 0.5) * CELL, g.y0 + (r + 0.5) * CELL];
const free = (g: Grid, c: number, r: number) => c >= 0 && r >= 0 && c < g.cols && r < g.rows && !g.blocked[r * g.cols + c];

// The free cell nearest to (c, r), within a few cells; among equally near
// ones, the one on the side of (bc, br) (the side he comes from).
function nearestFree(g: Grid, c: number, r: number, reach: number, bc = c, br = r): [number, number] | null {
  if (free(g, c, r)) return [c, r];
  let best: [number, number] | null = null;
  let bestScore = Infinity;
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      if (!free(g, c + dx, r + dy)) continue;
      const score = Math.hypot(dx, dy) + 0.3 * Math.hypot(c + dx - bc, r + dy - br);
      if (score < bestScore) {
        best = [c + dx, r + dy];
        bestScore = score;
      }
    }
  }
  return best;
}

// Clear straight walk between two points (sampled finely along the way).
function clearLine(g: Grid, ax: number, ay: number, bx: number, by: number): boolean {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 3);
  for (let i = 1; i <= n; i++) {
    const [c, r] = cellOf(g, ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n);
    if (!free(g, c, r)) return false;
  }
  return true;
}

function astar(g: Grid, start: [number, number], goal: [number, number]): [number, number][] | null {
  const n = g.cols * g.rows;
  const cost = new Float32Array(n).fill(Infinity);
  const from = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const s = start[1] * g.cols + start[0];
  const t = goal[1] * g.cols + goal[0];
  const h = (i: number) => {
    const dx = Math.abs((i % g.cols) - goal[0]);
    const dy = Math.abs(Math.floor(i / g.cols) - goal[1]);
    return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
  };
  // A small binary heap of [priority, index].
  const heap: [number, number][] = [];
  const push = (p: number, i: number) => {
    heap.push([p, i]);
    let k = heap.length - 1;
    while (k > 0) {
      const up = (k - 1) >> 1;
      if (heap[up][0] <= heap[k][0]) break;
      [heap[up], heap[k]] = [heap[k], heap[up]];
      k = up;
    }
  };
  const pop = (): number => {
    const top = heap[0][1];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
    }
    return top;
  };
  cost[s] = 0;
  push(h(s), s);
  while (heap.length) {
    const i = pop();
    if (i === t) break;
    if (closed[i]) continue;
    closed[i] = 1;
    const c = i % g.cols;
    const r = Math.floor(i / g.cols);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nc = c + dx;
        const nr = r + dy;
        if (!free(g, nc, nr)) continue;
        // No squeezing diagonally between two blocked cells.
        if (dx && dy && (!free(g, c + dx, r) || !free(g, c, r + dy))) continue;
        const j = nr * g.cols + nc;
        const step = dx && dy ? 1.414 : 1;
        if (cost[i] + step < cost[j]) {
          cost[j] = cost[i] + step;
          from[j] = i;
          push(cost[j] + h(j), j);
        }
      }
    }
  }
  if (from[t] < 0 && s !== t) return null;
  const cells: [number, number][] = [];
  for (let i = t; i !== s; i = from[i]) cells.push([i % g.cols, Math.floor(i / g.cols)]);
  return cells.reverse();
}

// The waypoints from the player to (tx, ty), last one the place to stop,
// or null when there's no way (then walking straight is all one can do).
export function findPath(
  scene: Phaser.Scene,
  player: Phaser.GameObjects.GameObject & { body: Body; x: number; y: number },
  tx: number,
  ty: number,
): { x: number; y: number }[] | null {
  const { grid } = buildGrid(scene, player);
  const [pc, pr] = cellOf(grid, player.x, player.y);
  const start = nearestFree(grid, pc, pr, 2);
  const [gc, gr] = cellOf(grid, tx, ty);
  const goal = nearestFree(grid, gc, gr, 10, start?.[0], start?.[1]);
  if (!start || !goal) return null;
  const cells = astar(grid, start, goal);
  if (!cells) return null;
  const targetFree = free(grid, gc, gr);
  const points: [number, number][] = cells.map(([c, r]) => centerOf(grid, c, r));
  if (targetFree) points[points.length - 1] = [tx, ty];
  else if (!points.length) points.push(centerOf(grid, goal[0], goal[1]));
  // Cut the corners: from where we are, go straight to the farthest
  // waypoint in clear sight.
  const out: { x: number; y: number }[] = [];
  let ax = player.x;
  let ay = player.y;
  let i = 0;
  while (i < points.length) {
    let j = points.length - 1;
    while (j > i && !clearLine(grid, ax, ay, points[j][0], points[j][1])) j--;
    out.push({ x: points[j][0], y: points[j][1] });
    [ax, ay] = points[j];
    i = j + 1;
  }
  return out;
}
