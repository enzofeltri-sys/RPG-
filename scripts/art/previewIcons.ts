// Preview sheet of the item icons drawn by the game (art/itemIcons.ts).
// Usage: esbuild-bundle, then node out.mjs <png> [all | category,category…]
import { writeFileSync } from 'fs';
import { encodePng } from './png';
import { renderItemIcon, ICON_PX as ICON } from '../../src/art/itemIcons';
import { itemIconSpecs } from '../../src/game/item';
const all = itemIconSpecs();
const cats = process.argv[3] && process.argv[3] !== 'all' ? process.argv[3].split(',') : null;
const pick = cats ? all.filter((s) => cats.includes(s.category) || cats.includes(s.weaponType ?? '')) : process.argv[3] === 'all' ? all : ['short_sword','iron_sword','leather_helmet','leather_chest','wooden_shield','simple_ring','simple_amulet','leather_boots','leather_gloves','leather_legs'].map((id)=>all.find((s)=>s.baseId===id)!).filter(Boolean).concat(all.filter((s)=>s.tier===2).slice(0,8), all.filter((s)=>s.tier===3).slice(0,14));
const Z = 3, cols = 8, cell = ICON * Z + 8;
const rows = Math.ceil(pick.length / cols);
const W = cols * cell, H = rows * cell;
const out = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < out.length; i += 4) { out[i] = 60; out[i + 1] = 56; out[i + 2] = 66; out[i + 3] = 255; }
pick.forEach((s, k) => { const pm = renderItemIcon(s); const ox = (k % cols) * cell + 4, oy = Math.floor(k / cols) * cell + 4;
  for (let y = 0; y < ICON; y++) for (let x = 0; x < ICON; x++) { const o = (y * ICON + x) * 4; if (!pm.data[o + 3]) continue; for (let j = 0; j < Z; j++) for (let i = 0; i < Z; i++) { const d = ((oy + y * Z + j) * W + ox + x * Z + i) * 4; out[d] = pm.data[o]; out[d + 1] = pm.data[o + 1]; out[d + 2] = pm.data[o + 2]; } } });
writeFileSync(process.argv[2], encodePng(W, H, out));
console.log(pick.map((s) => s.name).join(' | '));
