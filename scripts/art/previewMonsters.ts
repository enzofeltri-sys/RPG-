// Preview of the monsters drawn by the game (art/monsters.ts) beside the
// hero, for design reviews. Usage: esbuild-bundle, then node out.mjs <png> [scale]
import { writeFileSync } from 'fs';
import { encodePng } from './png';
import { renderMonster } from '../../src/art/monsters';
import { DOLL_H, DOLL_W, Look, renderFrame, LEATHER, DARK_LEATHER, IRON, CHARCOAL } from '../../src/art/heroDoll';
import { heroLook } from '../../src/art/heroLook';
import { createCharacter } from '../../src/game/character';
import { Pixmap } from '../../src/art/pixmap';
const RAG = [[150, 92, 74], [114, 62, 52], [78, 42, 40]] as const;
const bandit: Look = { race: 'human', head: { shape: 'hood', mat: RAG as any }, mask: { shape: 'mask', mat: CHARCOAL }, chest: { shape: 'leather', mat: DARK_LEATHER }, legs: { shape: 'pants', mat: LEATHER }, boots: { shape: 'boots', mat: LEATHER }, gloves: { shape: 'bracers', mat: LEATHER }, main: { shape: 'axe', mat: IRON } };
const doll = (look: Look) => { const pm = new Pixmap(DOLL_W, DOLL_H); pm.data.set(renderFrame(look, 'down', 0)); return pm; };
const items: [string, Pixmap][] = [
  ['héros', doll(heroLook(createCharacter('human', 'warrior')))],
  ['bandit', doll(bandit)],
  ...(['corrupted_wolf', 'bog_wraith', 'blight_spawn', 'corrupted_sentinel'].map((id) => [id, renderMonster(id)!.pm] as [string, Pixmap])),
];
const scale = Number(process.argv[3] ?? 4);
const cellW = 44 * scale, cellH = 46 * scale;
const W = cellW * items.length, H = cellH;
const out = new Uint8ClampedArray(W * H * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 4; const g = ((x >> 3) + (y >> 3)) % 2 ? [92, 140, 70] : [88, 134, 66]; out[o] = g[0]; out[o + 1] = g[1]; out[o + 2] = g[2]; out[o + 3] = 255; }
items.forEach(([, pm], k) => {
  const ox = k * cellW + Math.floor((cellW - pm.w * scale) / 2), oy = cellH - pm.h * scale - 6 * scale;
  for (let y = 0; y < pm.h; y++) for (let x = 0; x < pm.w; x++) { const s = (y * pm.w + x) * 4; const a = pm.data[s + 3] / 255; if (!a) continue; for (let j = 0; j < scale; j++) for (let i = 0; i < scale; i++) { const d = ((oy + y * scale + j) * W + ox + x * scale + i) * 4; for (let c = 0; c < 3; c++) out[d + c] = out[d + c] * (1 - a) + pm.data[s + c] * a; } }
});
writeFileSync(process.argv[2], encodePng(W, H, out));
