// Preview of the combat portraits drawn by the game (art/monsters.ts),
// magnified, for design reviews. Usage: esbuild-bundle, then node out.mjs <png>
import { writeFileSync } from 'fs';
import { encodePng } from './png';
import { DRAWN_MONSTER_IDS, monsterPortrait } from '../../src/art/monsters';
const ids = process.argv[3] ? process.argv[3].split(',') : DRAWN_MONSTER_IDS;
const Z = 3, cell = 80 * Z;
const W = cell * ids.length, H = cell;
const out = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < out.length; i += 4) { out[i] = 40; out[i + 1] = 38; out[i + 2] = 48; out[i + 3] = 255; }
ids.forEach((id, k) => { const pm = monsterPortrait(id)!.pm; const ox = k * cell + (cell - pm.w * Z) / 2 | 0, oy = (cell - pm.h * Z) / 2 | 0;
  for (let y = 0; y < pm.h; y++) for (let x = 0; x < pm.w; x++) { const s = (y * pm.w + x) * 4; const a = pm.data[s + 3] / 255; if (!a) continue; for (let j = 0; j < Z; j++) for (let i = 0; i < Z; i++) { const d = ((oy + y * Z + j) * W + ox + x * Z + i) * 4; for (let c = 0; c < 3; c++) out[d + c] = out[d + c] * (1 - a) + pm.data[s + c] * a; } } });
writeFileSync(process.argv[2], encodePng(W, H, out));
