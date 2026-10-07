// Exports a PNG preview of the heroes drawn by the game (src/art/heroDoll.ts
// and heroLook.ts), for design reviews: every race/class with its starting
// equipment, front view, at 3x. The game itself draws heroes on the fly.
//
// Usage: npm run heroes -- [out.png]   (default: heroes.png)

import { writeFileSync } from 'fs';
import { CharClass, Race, createCharacter } from '../../src/game/character';
import { DOLL_H, DOLL_W, renderFrame } from '../../src/art/heroDoll';
import { heroLook } from '../../src/art/heroLook';
import { encodePng } from './png';

const RACES: Race[] = ['human', 'elf', 'dwarf', 'orc', 'halfling'];
const CLASSES: CharClass[] = ['warrior', 'mage', 'archer', 'rogue', 'cleric'];
const Z = 3;
const PAD = 6;
const BG = [120, 176, 72];

const cellW = DOLL_W * Z + PAD;
const cellH = DOLL_H * Z + PAD;
const width = CLASSES.length * cellW + PAD;
const height = RACES.length * cellH + PAD;
const img = new Uint8Array(width * height * 4);
for (let i = 0; i < width * height; i++) img.set([...BG, 255], i * 4);

RACES.forEach((race, ri) => {
  CLASSES.forEach((cls, ci) => {
    const frame = renderFrame(heroLook(createCharacter(race, cls)), 'down', 0);
    for (let y = 0; y < DOLL_H * Z; y++) {
      for (let x = 0; x < DOLL_W * Z; x++) {
        const s = (Math.floor(y / Z) * DOLL_W + Math.floor(x / Z)) * 4;
        if (!frame[s + 3]) continue;
        const d = ((PAD + ri * cellH + y) * width + PAD + ci * cellW + x) * 4;
        img.set(frame.subarray(s, s + 4), d);
      }
    }
  });
});

const png = encodePng(width, height, img);
const out = process.argv[2] ?? 'heroes.png';
writeFileSync(out, png);
console.log(`${out}: ${width}x${height}`);
