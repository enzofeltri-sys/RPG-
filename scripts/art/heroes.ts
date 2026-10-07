// Exports a PNG preview of the heroes drawn by the game (src/art/heroDoll.ts
// and heroLook.ts), for design reviews: every race/class with its starting
// equipment, front view, at 3x. The game itself draws heroes on the fly.
//
// Usage: npm run heroes -- [out.png]   (default: heroes.png)

import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';
import { CharClass, Race, createCharacter } from '../../src/game/character';
import { DOLL_H, DOLL_W, renderFrame } from '../../src/art/heroDoll';
import { heroLook } from '../../src/art/heroLook';

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

// Minimal PNG encoder (RGBA, no filtering).
const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf: Uint8Array): number {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type: string, data: Uint8Array): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(new Uint8Array(out.subarray(4, 8 + data.length))), 8 + data.length);
  return out;
}
const header = Buffer.alloc(13);
header.writeUInt32BE(width, 0);
header.writeUInt32BE(height, 4);
header.set([8, 6, 0, 0, 0], 8);
const raw = Buffer.alloc((width * 4 + 1) * height);
for (let y = 0; y < height; y++) Buffer.from(img.subarray(y * width * 4, (y + 1) * width * 4)).copy(raw, y * (width * 4 + 1) + 1);
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', header),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', new Uint8Array()),
]);
const out = process.argv[2] ?? 'heroes.png';
writeFileSync(out, png);
console.log(`${out}: ${width}x${height}`);
