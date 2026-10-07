// Renders zones exactly as the game paints them (world/zonePlan.ts and
// the same ground job), for design reviews: the whole map at 1x and the
// phone view around the hero at 2x.
//
// Usage: npm run zoneart -- <out-prefix> [zone-key ...]

import { writeFileSync } from 'fs';
import { createCharacter } from '../../src/game/character';
import { DOLL_FEET_Y, DOLL_H, DOLL_W, Look, renderFrame } from '../../src/art/heroDoll';
import { heroLook } from '../../src/art/heroLook';
import { NPC_LOOKS } from '../../src/art/npcLooks';
import { runGroundJob } from '../../src/art/groundJob';
import { GateKind, renderBarrier, renderWallBlock } from '../../src/art/buildings';
import { renderBridge, renderFence, renderFlowerBed, renderIronFence, renderPalisade, renderPatch, renderStoneWall } from '../../src/art/props';
import { renderTuft, softenBase } from '../../src/art/settle';
import { Pixmap } from '../../src/art/pixmap';
import { BAYER, ZoneArt, buildingArt, dpropArt, dpropDepth, dpropOffGround, lightMap, plan, propArt } from '../../src/world/zonePlan';
import { ALL_ZONES } from '../../src/world/zones';
import { encodePng } from './png';

function render(art: ZoneArt): Pixmap {
  const job = plan(art);
  const r = runGroundJob(job);
  // The zone itself (the margin around it is for bigger screens).
  const map = new Pixmap(art.ground.w, art.ground.h);
  const [mx, my] = r.margin;
  for (let y = 0; y < map.h; y++) map.data.set(r.pixels.subarray(((y + my) * r.w + mx) * 4, ((y + my) * r.w + mx + map.w) * 4), y * map.w * 4);
  const draws: { depth: number; draw: () => void }[] = [];
  const at = (pm: Pixmap, x: number, y: number, depth: number) => draws.push({ depth, draw: () => map.blit(pm, Math.round(x), Math.round(y)) });
  Object.values(art.buildings ?? {}).forEach((b) => {
    const a = buildingArt(b.kind, b.w, b.h);
    const bottom = b.y + b.h / 2;
    at(a.pm, b.x - a.anchorX, bottom - a.anchorY, bottom - 8);
  });
  (art.props ?? []).forEach((p, i) => {
    const a = propArt(p.kind, p.seed ?? i + 1);
    at(a.pm, p.x - a.anchorX, p.y - a.anchorY, p.y - 8);
  });
  (art.fences ?? []).forEach((f) => {
    const a = renderFence(f.len);
    at(softenBase(a.pm, a.anchorY), f.x - a.anchorX, f.y - a.anchorY, f.y - 8);
  });
  (art.ironFences ?? []).forEach((f) => {
    const a = renderIronFence(f.len);
    at(softenBase(a.pm, a.anchorY), f.x - a.anchorX, f.y - a.anchorY, f.y - 8);
  });
  const g = art.preview?.gate;
  if (g) {
    const a = renderBarrier(g[0], g[3]);
    at(a.pm, g[1] - a.anchorX, g[2] + 8 - a.anchorY, g[2]);
  }
  (art.palisades ?? []).forEach((s, i) => {
    const a = renderPalisade(s.len, i + 1);
    at(softenBase(a.pm, a.anchorY), s.x - a.anchorX, s.y - a.anchorY, s.y - 8);
  });
  (art.stoneWalls ?? []).forEach((s, i) => {
    const a = renderStoneWall(s.len, i + 1);
    at(softenBase(a.pm, a.anchorY), s.x - a.anchorX, s.y - a.anchorY, s.y - 8);
  });
  (art.beds ?? []).forEach((b, i) => {
    const a = renderFlowerBed(b.w, b.h, i + 1);
    at(softenBase(a.pm, a.anchorY), b.x - a.anchorX, b.y - a.anchorY, b.y - 8);
  });
  (art.patches ?? []).forEach((pt) => {
    const a = renderPatch(pt.material, pt.w, pt.h);
    at(a.pm, pt.x - a.anchorX, pt.y - a.anchorY, -850);
  });
  (art.bridges ?? []).forEach((br) => at(renderBridge(br.w, br.h).pm, br.x - 2, br.y - 4, -800));
  (art.walls ?? []).forEach((wl, i) => {
    const a = renderWallBlock(wl.w, wl.h, { niches: wl.niches, face: wl.face, seed: 61 + i, style: wl.style });
    const bottom = wl.y + wl.h / 2;
    at(a.pm, wl.x - a.anchorX, bottom - a.anchorY, wl.face === 0 ? -500 : bottom - 8);
  });
  (art.dprops ?? []).forEach((d) => {
    const a = dpropArt(d.kind);
    const pm = dpropOffGround(d.kind) ? a.pm : softenBase(a.pm, a.anchorY);
    at(pm, d.x - a.anchorX, d.y - a.anchorY, dpropDepth(d.kind, d.y));
  });
  r.tufts.forEach((t) => {
    const a = renderTuft((t.seed % 24) + 1, t.tall);
    at(a.pm, t.x - 4, t.y - a.pm.h, t.y - 8 + 0.5);
  });
  r.meadow.forEach(([x, y], i) => {
    const a = propArt(i % 3 === 0 ? 'tall_grass' : 'flowers', (i % 8) + 1);
    at(a.pm, x - a.anchorX, y - a.anchorY, y - 8);
  });
  const person = (look: Look, x: number, y: number) => {
    const shadow = new Pixmap(14, 5);
    shadow.ellipse(0, 0, 14, 5, () => [34, 28, 41]);
    for (let i = 3; i < shadow.data.length; i += 4) if (shadow.data[i]) shadow.data[i] = 90;
    const frame = new Pixmap(DOLL_W, DOLL_H);
    frame.data.set(renderFrame(look, 'down', 0));
    draws.push({ depth: y, draw: () => { map.blit(shadow, x - 7, y + 6); map.blit(frame, Math.round(x - DOLL_W / 2), Math.round(y + 8 - DOLL_FEET_Y)); } });
  };
  if (art.preview) {
    (art.preview.npcs ?? []).forEach(([id, x, y]) => NPC_LOOKS[id] && person(NPC_LOOKS[id], x, y));
    person(heroLook(createCharacter('human', 'warrior')), art.preview.hero[0], art.preview.hero[1]);
  }
  draws.sort((a, b) => a.depth - b.depth).forEach((d) => d.draw());
  if (art.dark) {
    const lm = lightMap(art);
    const amb = art.dark.ambient;
    const [hx, hy] = art.preview?.hero ?? [-999, -999];
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const o = (y * map.w + x) * 4;
        const d = Math.hypot(x - hx, (y - hy) * 1.1) / 58;
        const add = d < 1 ? (1 - amb) * Math.min(1, Math.floor(Math.pow(1 - d, 1.4) * 6 + BAYER[(y % 4) * 4 + (x % 4)] / 16) / 6) : 0;
        for (let k = 0; k < 3; k++) map.data[o + k] = (map.data[o + k] * Math.min(1, lm[o + k] / 255 + add)) | 0;
      }
    }
  }
  return map;
}

function scaled(src: Pixmap, x0: number, y0: number, w: number, h: number, z: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * z * h * z * 4);
  for (let y = 0; y < h * z; y++) {
    for (let x = 0; x < w * z; x++) {
      const s = ((y0 + Math.floor(y / z)) * src.w + x0 + Math.floor(x / z)) * 4;
      out.set(src.data.subarray(s, s + 4), (y * w * z + x) * 4);
    }
  }
  return out;
}

const prefix = process.argv[2] ?? 'zone';
const only = process.argv.slice(3);
ALL_ZONES.filter((z) => !only.length || only.includes(z.key)).forEach((art) => {
  const t = Date.now();
  const map = render(art);
  writeFileSync(`${prefix}_${art.key}_map.png`, encodePng(map.w, map.h, map.data));
  const [hx, hy] = art.preview?.hero ?? [map.w / 2, map.h / 2];
  const vw = Math.min(216, map.w);
  const vh = Math.min(384, map.h);
  const vx = Math.max(0, Math.min(map.w - vw, Math.round(hx - 108)));
  const vy = Math.max(0, Math.min(map.h - vh, Math.round(hy - 192)));
  writeFileSync(`${prefix}_${art.key}_view.png`, encodePng(vw * 2, vh * 2, scaled(map, vx, vy, vw, vh, 2)));
  console.log(art.key, Date.now() - t, 'ms');
});
