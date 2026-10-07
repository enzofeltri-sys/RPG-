import Phaser from 'phaser';
import { GroundJob, GroundResult, runGroundJob } from '../art/groundJob';
import { renderBridge, renderFence, renderFlowerBed, renderIronFence, renderPalisade, renderPatch, renderStoneWall } from '../art/props';
import { GateKind, renderBarrier, renderWallBlock } from '../art/buildings';
import { renderTuft, softenBase } from '../art/settle';
import { FEET_TO_DEPTH, pixmapTexture, placeBuilding, placeProp } from './drawnArt';
import { ALL_ZONES } from './zones';
import { BuildingSpot, ZoneArt, zoneMargin, buildingArt, dpropArt, lightMap, plan, step } from './zonePlan';

export type { BuildingSpot, PropSpot, ZoneArt, ZoneLight } from './zonePlan';

// A zone's look, authored once per scene: its ground (base material and
// the paths, plazas and fields laid over it), its buildings (the scene
// keeps their collision boxes), the decor, and how all of it settles into
// the ground. paintZone() puts it on screen.

// ---------------------------------------------------------- ground jobs

const results = new Map<string, GroundResult>();
const pending = new Map<string, Promise<GroundResult>>();
let worker: Worker | undefined;
let workerFailed = false;
const waiting = new Map<string, (r: GroundResult) => void>();

function getWorker(): Worker | undefined {
  if (worker || workerFailed) return worker;
  try {
    worker = new Worker(new URL('./groundWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<GroundResult>) => {
      const done = waiting.get(e.data.key);
      waiting.delete(e.data.key);
      done?.(e.data);
    };
    worker.onerror = () => {
      workerFailed = true;
      worker = undefined;
    };
  } catch {
    workerFailed = true;
  }
  return worker;
}

function groundFor(job: GroundJob): Promise<GroundResult> {
  const cached = results.get(job.key);
  if (cached) return Promise.resolve(cached);
  let p = pending.get(job.key);
  if (!p) {
    const w = getWorker();
    p = new Promise<GroundResult>((resolve) => {
      if (w) {
        waiting.set(job.key, resolve);
        w.postMessage(job);
      } else {
        // No worker (old browser): draw it here, after the scene's first frame.
        setTimeout(() => resolve(runGroundJob(job)), 0);
      }
    }).then((r) => {
      results.set(job.key, r);
      pending.delete(job.key);
      return r;
    });
    pending.set(job.key, p);
  }
  return p;
}

const jobs = new Map<string, GroundJob>();

function jobFor(art: ZoneArt): GroundJob {
  let job = jobs.get(art.key);
  if (!job) {
    job = plan(art);
    jobs.set(art.key, job);
  }
  return job;
}

// Draws a zone's ground ahead of time (e.g. the zones next door), so
// entering it later shows it at once.
export function prewarmZone(art: ZoneArt): void {
  void groundFor(jobFor(art));
}

// A barrier the scene opens later (a gate across the passage at y, width
// w, centered on x): the scene destroys the returned image when it opens.
export function placeBarrier(scene: Phaser.Scene, kind: GateKind, x: number, y: number, w: number): Phaser.GameObjects.Image {
  const a = renderBarrier(kind, w);
  const key = pixmapTexture(scene, `barrier-${kind}-${w}`, a.pm);
  const bottom = y + 8;
  return scene.add
    .image(Math.round(x - a.anchorX), Math.round(bottom - a.anchorY), key)
    .setOrigin(0, 0)
    .setDepth(bottom - FEET_TO_DEPTH);
}

// Top of a building's picture (for a name label just above its roof).
export function buildingTop(spot: BuildingSpot): number {
  const a = buildingArt(spot.kind, spot.w, spot.h);
  return spot.y + spot.h / 2 - a.anchorY;
}

// ---------------------------------------------------------------- paint

function tuftKey(scene: Phaser.Scene, seed: number, tall: boolean): string {
  const variant = seed % 24;
  const key = `tuft-${variant}-${tall ? 't' : 's'}`;
  if (!scene.textures.exists(key)) pixmapTexture(scene, key, renderTuft(variant + 1, tall).pm);
  return key;
}

export interface PaintedZone {
  // The hero: his own light follows him (dark zones) and the zone's own
  // solid walls stop him.
  follow(target: { x: number; y: number }): void;
}

export function paintZone(scene: Phaser.Scene, art: ZoneArt): PaintedZone {
  const job = jobFor(art);
  // Until the ground arrives (first visit only), a plain base color.
  const [pmx, pmy] = zoneMargin(art);
  const placeholder = scene.add.rectangle(-pmx, -pmy, art.ground.w + pmx * 2, art.ground.h + pmy * 2, art.ground.base === 'grass' ? 0x5f9a46 : art.ground.base === 'forest' ? 0x4c7a3a : art.ground.base === 'dirt' ? 0x9a7650 : 0x4a4652).setOrigin(0, 0).setDepth(-1001);
  Object.values<BuildingSpot>(art.buildings ?? {}).forEach((b) => placeBuilding(scene, b.kind, b.x, b.y, b.w, b.h));
  (art.props ?? []).forEach((p, idx) => placeProp(scene, p.kind, p.x, p.y, p.seed ?? idx + 1));
  (art.fences ?? []).forEach((f) => {
    const a = renderFence(f.len);
    const key = pixmapTexture(scene, `fence-${f.len}`, softenBase(a.pm, a.anchorY));
    scene.add.image(Math.round(f.x - a.anchorX), Math.round(f.y - a.anchorY), key).setOrigin(0, 0).setDepth(f.y - FEET_TO_DEPTH);
  });
  (art.ironFences ?? []).forEach((f) => {
    const a = renderIronFence(f.len);
    const key = pixmapTexture(scene, `ironfence-${f.len}`, softenBase(a.pm, a.anchorY));
    scene.add.image(Math.round(f.x - a.anchorX), Math.round(f.y - a.anchorY), key).setOrigin(0, 0).setDepth(f.y - FEET_TO_DEPTH);
  });
  (art.palisades ?? []).forEach((s, idx) => {
    const a = renderPalisade(s.len, idx + 1);
    const key = pixmapTexture(scene, `palisade-${s.len}-${idx + 1}`, softenBase(a.pm, a.anchorY));
    scene.add.image(Math.round(s.x - a.anchorX), Math.round(s.y - a.anchorY), key).setOrigin(0, 0).setDepth(s.y - FEET_TO_DEPTH);
  });
  (art.stoneWalls ?? []).forEach((s, idx) => {
    const a = renderStoneWall(s.len, idx + 1);
    const key = pixmapTexture(scene, `swall-${s.len}-${idx + 1}`, softenBase(a.pm, a.anchorY));
    scene.add.image(Math.round(s.x - a.anchorX), Math.round(s.y - a.anchorY), key).setOrigin(0, 0).setDepth(s.y - FEET_TO_DEPTH);
  });
  (art.beds ?? []).forEach((b, idx) => {
    const a = renderFlowerBed(b.w, b.h, idx + 1);
    const key = pixmapTexture(scene, `bed-${art.key}-${idx}`, softenBase(a.pm, a.anchorY));
    scene.add.image(Math.round(b.x - a.anchorX), Math.round(b.y - a.anchorY), key).setOrigin(0, 0).setDepth(b.y - FEET_TO_DEPTH);
  });
  (art.patches ?? []).forEach((pt, idx) => {
    const key = pixmapTexture(scene, `patch-${art.key}-${idx}`, renderPatch(pt.material, pt.w, pt.h).pm);
    scene.add.image(pt.x, pt.y, key).setDepth(-850);
  });
  (art.bridges ?? []).forEach((br, idx) => {
    const a = renderBridge(br.w, br.h);
    const key = pixmapTexture(scene, `bridge-${art.key}-${idx}`, a.pm);
    scene.add.image(br.x - 2, br.y - 4, key).setOrigin(0, 0).setDepth(-800);
  });
  // Walls the zone itself makes solid (side walls the scene doesn't know).
  const solids: Phaser.GameObjects.Rectangle[] = [];
  (art.walls ?? []).forEach((wl) => {
    if (!wl.solid) return;
    const rect = scene.add.rectangle(wl.x, wl.y, wl.w, wl.h).setVisible(false);
    scene.physics.add.existing(rect, true);
    solids.push(rect);
  });
  (art.walls ?? []).forEach((wl, idx) => {
    const a = renderWallBlock(wl.w, wl.h, { niches: wl.niches, face: wl.face, seed: 61 + idx, style: wl.style });
    const key = pixmapTexture(scene, `wall-${art.key}-${idx}`, a.pm);
    const bottom = wl.y + wl.h / 2;
    scene.add
      .image(Math.round(wl.x - a.anchorX), Math.round(bottom - a.anchorY), key)
      .setOrigin(0, 0)
      .setDepth(wl.face === 0 ? -500 : bottom - FEET_TO_DEPTH);
  });
  (art.dprops ?? []).forEach((d) => {
    const a = dpropArt(d.kind);
    const key = pixmapTexture(scene, `dprop-${d.kind}`, d.kind === 'runes' || d.kind === 'cobweb' ? a.pm : softenBase(a.pm, a.anchorY));
    // Torches and cobwebs hang on walls: just in front of the wall face.
    const depth = d.kind === 'runes' ? -900 : d.kind === 'torch' || d.kind === 'cobweb' ? d.y + 12 : d.y - FEET_TO_DEPTH;
    scene.add.image(Math.round(d.x - a.anchorX), Math.round(d.y - a.anchorY), key).setOrigin(0, 0).setDepth(depth);
  });
  const lighting = art.dark ? addLighting(scene, art) : undefined;
  // Beyond a small dark zone's edges, the dark itself.
  if (art.dark) scene.cameras.main.setBackgroundColor(0x0e0c12);
  // Phaser reuses a scene's instance: a ground arriving after the player
  // already left (or re-entered) must not land in the wrong run.
  let alive = true;
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    alive = false;
  });
  void groundFor(job).then((r) => {
    if (!alive) return;
    const key = `ground-${art.key}`;
    if (!scene.textures.exists(key)) {
      const texture = scene.textures.createCanvas(key, r.w, r.h)!;
      texture.context.putImageData(new ImageData(new Uint8ClampedArray(r.pixels), r.w, r.h), 0, 0);
      texture.refresh();
    }
    scene.add.image(-r.margin[0], -r.margin[1], key).setOrigin(0, 0).setDepth(-1000);
    placeholder.destroy();
    r.tufts.forEach((t) => scene.add.image(t.x, t.y, tuftKey(scene, t.seed, t.tall)).setOrigin(4 / 9, 1).setDepth(t.y - FEET_TO_DEPTH + 0.5));
    r.meadow.forEach(([x, y], i) => placeProp(scene, i % 3 === 0 ? 'tall_grass' : 'flowers', x, y, (i % 8) + 1));
    (art.next ?? []).forEach((k) => {
      const nextArt = ZONES.get(k);
      if (nextArt) prewarmZone(nextArt);
    });
  });
  return {
    follow: (target) => {
      lighting?.follow(target);
      const body = target as unknown as Phaser.GameObjects.GameObject;
      if (solids.length && body.body) scene.physics.add.collider(body, solids);
    },
  };
}

// Zones known to the painter, for drawing neighbors ahead of time.
const ZONES = new Map<string, ZoneArt>(ALL_ZONES.map((z) => [z.key, z]));

const HERO_LIGHT_R = 58;

function heroLightKey(scene: Phaser.Scene, amb: number): string {
  const key = `herolight-${Math.round(amb * 100)}`;
  if (scene.textures.exists(key)) return key;
  const size = HERO_LIGHT_R * 2;
  const texture = scene.textures.createCanvas(key, size, size)!;
  const img = texture.context.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - HERO_LIGHT_R + 0.5, (y - HERO_LIGHT_R + 0.5) * 1.1) / HERO_LIGHT_R;
      const o = (y * size + x) * 4;
      const add = d < 1 ? (1 - amb) * step(Math.pow(1 - d, 1.4), x, y) * 255 : 0;
      img.data[o] = add;
      img.data[o + 1] = add;
      img.data[o + 2] = add * 1.04;
      img.data[o + 3] = 255;
    }
  }
  texture.context.putImageData(img, 0, 0);
  texture.refresh();
  return key;
}

function addLighting(scene: Phaser.Scene, art: ZoneArt): { follow(target: { x: number; y: number }): void } {
  const [mx, my] = zoneMargin(art);
  const w = art.ground.w + mx * 2;
  const h = art.ground.h + my * 2;
  const key = `light-${art.key}`;
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, w, h)!;
    texture.context.putImageData(new ImageData(new Uint8ClampedArray(lightMap(art, [mx, my])), w, h), 0, 0);
    texture.refresh();
  }
  const heroKey = heroLightKey(scene, art.dark!.ambient);
  const rt = scene.add.renderTexture(-mx, -my, w, h).setOrigin(0, 0).setDepth(800).setBlendMode(Phaser.BlendModes.MULTIPLY);
  let target: { x: number; y: number } | undefined;
  const redraw = () => {
    rt.clear();
    rt.stamp(key, undefined, 0, 0, { originX: 0, originY: 0 });
    if (target) rt.stamp(heroKey, undefined, Math.round(target.x) + mx, Math.round(target.y) + my, { blendMode: Phaser.BlendModes.ADD });
  };
  redraw();
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, redraw);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.POST_UPDATE, redraw));
  return {
    follow(t) {
      target = t;
    },
  };
}
