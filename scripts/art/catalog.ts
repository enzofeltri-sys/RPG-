// Exports the catalog of world art drawn by the game (buildings, props,
// dungeon pieces, people) as one PNG for design reviews, plus a JSON of
// what sits where so labels can be added.
//
// Usage: npm run catalog -- <out-prefix>

import { writeFileSync } from 'fs';
import { DOLL_H, DOLL_W, renderFrame } from '../../src/art/heroDoll';
import { NPC_LOOKS } from '../../src/art/npcLooks';
import { BuildingKind, renderBuilding, renderGate, renderWallBlock } from '../../src/art/buildings';
import { DungeonPropKind, PropKind, renderDungeonProp, renderFence, renderFlowerBed, renderPatch, renderProp, renderStoneWall } from '../../src/art/props';
import { Pixmap } from '../../src/art/pixmap';
import { encodePng } from './png';

const sheet = new Pixmap(600, 640);
sheet.rect(0, 0, 600, 640, [120, 176, 72]);
const labels: { text: string; x: number; y: number }[] = [];

let cx = 6;
let cy = 6;
let rowH = 0;
function place(pm: Pixmap, label: string): void {
  if (cx + pm.w > sheet.w - 6) {
    cx = 6;
    cy += rowH + 14;
    rowH = 0;
  }
  sheet.blit(pm, cx, cy);
  labels.push({ text: label, x: cx, y: cy + pm.h + 1 });
  cx += pm.w + 8;
  rowH = Math.max(rowH, pm.h);
}
function newRow(): void {
  cx = 6;
  cy += rowH + 16;
  rowH = 0;
}

const buildings: [BuildingKind, number, number][] = [
  ['cottage', 70, 50],
  ['village_house', 60, 50],
  ['stone_house', 60, 60],
  ['inn_building', 60, 70],
  ['blacksmith_shop', 90, 50],
  ['guard_barracks', 80, 60],
  ['market_hall', 100, 60],
  ['stone_tower', 50, 100],
];
buildings.forEach(([k, w, h]) => place(renderBuilding(k, w, h).pm, k));
newRow();
const props: PropKind[] = ['big_tree', 'tree', 'apple_tree', 'pine', 'bush', 'berry_bush', 'flower_bush', 'tall_grass', 'flowers', 'rock_small', 'boulder_large', 'mushroom', 'crystal_glow', 'treasure_chest_closed', 'treasure_chest_open', 'market_stall', 'merchant_stall', 'well', 'wagon_cart', 'scarecrow', 'barrel', 'crate', 'sacks', 'haystack', 'woodpile', 'bench', 'trough', 'signpost', 'log', 'lamppost', 'stump'];
props.forEach((k) => place(renderProp(k, 3).pm, k));
place(renderFence(40).pm, 'fence');
place(renderStoneWall(48).pm, 'stone_wall');
place(renderFlowerBed(28, 14).pm, 'flower_bed');
place(renderPatch('crop', 60, 40).pm, 'farm_field');
place(renderPatch('water', 34, 20).pm, 'water');
place(renderPatch('lava', 28, 18).pm, 'lava');
newRow();
place(renderWallBlock(30, 60).pm, 'wall');
place(renderGate(80).pm, 'gate');
(['torch', 'brazier', 'bones', 'sarcophagus', 'pillar', 'urn', 'rubble', 'cobweb'] as DungeonPropKind[]).forEach((k) => place(renderDungeonProp(k).pm, k));
newRow();
Object.entries(NPC_LOOKS).forEach(([id, look]) => {
  const pm = new Pixmap(DOLL_W, DOLL_H);
  pm.data.set(renderFrame(look, 'down', 0));
  place(pm, id);
});

const prefix = process.argv[2] ?? 'catalog';
const crop = cy + rowH + 18;
const out = new Pixmap(sheet.w, crop);
out.blit(sheet, 0, 0);
writeFileSync(`${prefix}.png`, encodePng(out.w, out.h, out.data));
writeFileSync(`${prefix}.json`, JSON.stringify(labels));
console.log('ok', out.w, out.h);
