// Item icons drawn by the game: every item has its own drawing, made with
// the kit (iconKit.ts) in the same style, light from the top left. Most
// are the classic thing done well (a sword, a heater shield, a leather
// boot); some are their own idea (a quill dagger, a lantern staff, a
// chained grimoire, a horn on a cord). Materials follow the palier and
// the family (Veilleur silver and blue, Ombre smoke, rituel gold, marais
// reeds), so a late piece looks late and a set looks like a set.

import { OUTLINE, Pixmap, RGB, lit, mix, ramp } from './pixmap';
import {
  BONE, BRONZE, CLOTH_BLUE, CLOTH_GREEN, CLOTH_GREY, CLOTH_PURPLE, CLOTH_RED, DARK, DARK_LEATHER, DARK_WOOD, EMBER, GOLD, HOLY, ICE,
  ICON, IRON, IconSpec, LEATHER, LINEN, MARSH, MITHRIL, Materials, REED, RUST, SHADOW, SILVER, STAR, STEEL, VIOLET, WOOD,
  axeOf, band, bar, book, glint, bootOf, bowOf, chain, diag, disc, dome, dots, erase, gemAt, gloveOf, has, heater, hoodOf, hoop, inFrame, kite,
  materials, orb, poly, px, robeOf, roundShield, shaft, skirt, sword, tint, torso, trousers,
} from './iconKit';

export { ICON };
export type { IconSpec };

type Draw = (pm: Pixmap, m: Materials) => void;

// The Watchers' four-pointed star, centred on (cx, cy), arms r long.
function star(pm: Pixmap, cx: number, cy: number, r: number): void {
  for (let k = -r; k <= r; k++) {
    const t = 1 - Math.abs(k) / (r + 1);
    pm.set(cx + k, cy, lit(SILVER, t * 0.8 - 0.1));
    pm.set(cx, cy + k, lit(SILVER, t * 0.8 - 0.1));
  }
  for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) pm.set(cx + dx, cy + dy, SILVER[2]);
  pm.set(cx, cy, [235, 250, 255]);
  pm.set(cx - 1, cy, STAR);
  pm.set(cx, cy - 1, STAR);
}

// ----------------------------------------------------------------- swords

const SWORDS: Record<string, Draw> = {
  short_sword: (pm, m) => sword(pm, m, { len: 10, w: 2.6, guard: 'cross', pommel: 'round' }),
  // A wooden practice sword, the grip wound with linen.
  apprentice_blade: (pm, m) => sword(pm, m, { len: 11, w: 2.8, tip: 'round', blade: WOOD, guard: 'bar', guardR: DARK_WOOD, grip: LINEN, pommel: 'none' }),
  militia_sword: (pm, m) => sword(pm, m, { len: 12, w: 2.4, guard: 'cross', guardR: IRON, grip: CLOTH_RED, pommel: 'round' }),
  broken_sword: (pm, m) => {
    sword(pm, m, { len: 6, w: 2.6, tip: 'round', guard: 'cross', pommel: 'round' });
    // The jagged snap, and the lost end lying beside it.
    const f = diag(5, 13);
    erase(pm, ...(f(6, -0.6).map(Math.round) as [number, number]));
    poly(pm, inFrame(diag(11, 5), [[0, -1.2], [3.2, -1.2], [4.4, 0], [3.2, 1.2], [0.6, 1.2]]), m.metal, 0.2, 1);
  },
  guard_sword: (pm, m) => sword(pm, m, { len: 13, w: 2.4, fuller: true, guard: 'swept', grip: CLOTH_BLUE, pommel: 'gem' }),
  // A falchion: the blade widening to a clipped point.
  patrol_sword: (pm, m) => sword(pm, m, { len: 12, w: 2.6, tip: 'clip', guard: 'bar', pommel: 'round' }),
  // A cutlass with a shell guard and a red tassel.
  smuggler_blade: (pm, m) => {
    const f = diag(5, 13, 40);
    sword(pm, m, { len: 12, w: 2.4, tip: 'clip', guard: 'shell', guardR: BRONZE, pommel: 'none' });
    bar(pm, ...f(-4.2, 0), ...f(-5.4, 3), 1, CLOTH_RED, 0.2);
    px(pm, ...f(-5.6, 3.6), CLOTH_RED[2]);
  },
  watcher_blade: (pm, m) => sword(pm, m, { len: 13, w: 2.4, fuller: true, guard: 'wing', guardR: SILVER, grip: CLOTH_BLUE, pommel: 'gem' }),
  mithril_sword: (pm, m) => {
    sword(pm, m, { len: 14, w: 2.4, fuller: true, guard: 'cross', guardR: GOLD, pommel: 'gem' });
    const f = diag(5, 13);
    for (const v of [-3, 3]) gemAt(pm, ...(f(0, v).map((n) => Math.round(n) - 0) as [number, number]), m.gem);
  },
  // The Order's broad blade: a cross hilt, a red ribbon, a gold cross.
  order_blade: (pm, m) => {
    sword(pm, m, { len: 13, w: 3.2, tip: 'broad', guard: 'cross', guardR: GOLD, grip: CLOTH_RED, pommel: 'round' });
    const f = diag(5, 13);
    const [cx, cy] = f(4, 0).map(Math.round);
    dots(pm, [[cx, cy], [cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]], GOLD[1]);
    bar(pm, ...f(-4.4, 0.4), ...f(-6, 2.6), 1, CLOTH_RED, 0);
  },
  garrison_blade: (pm, m) => {
    sword(pm, m, { len: 13, w: 2.6, fuller: true, guard: 'prongs', guardR: STEEL, grip: CLOTH_BLUE, pommel: 'round', blade: STEEL });
    const f = diag(5, 13);
    px(pm, ...f(0, 0), GOLD[0]);
  },
  // The artisan's own: a hammered blade, the forge marks showing.
  artisan_blade: (pm, m) => {
    sword(pm, m, { len: 12, w: 2.8, guard: 'bar', guardR: BRONZE, pommel: 'ring' });
    const f = diag(5, 13);
    for (const u of [3, 5.5, 8]) px(pm, ...f(u, 0.4), lit(m.metal, -0.5));
  },
  // L'Épée noircie: a black, jagged blade, cracked with embers.
  blackened_sword: (pm, m) => {
    sword(pm, m, { len: 13, w: 3, tip: 'clip', blade: ramp([60, 54, 62], 0.3), guard: 'swept', guardR: ramp([90, 40, 36]), grip: DARK, pommel: 'round' });
    const f = diag(5, 13);
    for (const [u, v] of [[3, 0.3], [4, -0.2], [6, 0.4], [8, -0.1], [9, 0.5], [11, 0]]) px(pm, ...f(u, v), EMBER);
    px(pm, ...f(13, -0.8), [255, 200, 120]);
  },
  // La Lame du Sceau originel: a pale blade, a rune of light down it.
  sealed_blade: (pm, m) => {
    sword(pm, m, { len: 14, w: 2.6, blade: ramp([226, 230, 236], 0.2), guard: 'wing', guardR: GOLD, grip: CLOTH_BLUE, pommel: 'gem' });
    const f = diag(5, 13);
    for (let u = 1.5; u < 11; u += 0.7) px(pm, ...f(u, 0.2), HOLY);
    px(pm, ...f(14.6, -0.6), [255, 255, 255]);
  },
  militia_greatsword: (pm, m) => sword(pm, m, { len: 14, w: 3, guard: 'bar', guardR: IRON, grip: LEATHER, gripLen: 4, pommel: 'round', hx: 5.5, hy: 12.5 }),
  steel_greatsword: (pm, m) => sword(pm, m, { len: 14, w: 3.4, fuller: true, guard: 'swept', grip: DARK_LEATHER, gripLen: 4, pommel: 'round', hx: 5.5, hy: 12.5 }),
  // A flamberge: the wavy blade of mithril.
  mithril_greatsword: (pm, m) => sword(pm, m, { len: 14, w: 3, tip: 'wavy', guard: 'wing', guardR: GOLD, grip: CLOTH_BLUE, gripLen: 4, pommel: 'gem', hx: 5.5, hy: 12.5 }),
};

// ---------------------------------------------------------------- daggers

const DAGGERS: Record<string, Draw> = {
  dagger_thief: (pm, m) => sword(pm, m, { len: 9, w: 2.4, tip: 'clip', blade: ramp([150, 154, 170], 0.4), guard: 'bar', guardR: BRONZE, grip: DARK, pommel: 'round', hx: 6, hy: 12 }),
  // Dull and chipped, a bloom of rust.
  dull_dagger: (pm, m) => {
    sword(pm, m, { len: 8, w: 2.4, tip: 'round', guard: 'bar', guardR: IRON, pommel: 'none', hx: 6, hy: 12 });
    const f = diag(6, 12);
    erase(pm, ...(f(4, -1.2).map(Math.round) as [number, number]));
    erase(pm, ...(f(6.4, -1.1).map(Math.round) as [number, number]));
    for (const [u, v] of [[2.5, 0.4], [5, 0.6], [5.5, -0.2]]) px(pm, ...f(u, v), RUST);
  },
  // A needle of a blade.
  belt_stiletto: (pm, m) => sword(pm, m, { len: 10, w: 1.8, tip: 'needle', guard: 'disc', grip: DARK_LEATHER, gripLen: 3.6, pommel: 'round', hx: 5.5, hy: 12.5 }),
  // A folding knife, half open on its pivot.
  switchblade_dagger: (pm, m) => {
    const h = diag(5, 14, 20);
    poly(pm, inFrame(h, [[0, -1.2], [7, -1.2], [7.6, 0], [7, 1.2], [0, 1.2]]), DARK_WOOD, 0, 1);
    for (const u of [1.5, 5.5]) px(pm, ...h(u, 0), BRONZE[1]);
    const [ox, oy] = h(7, 0);
    poly(pm, inFrame(diag(ox, oy, 70), [[0, -1], [6, -1], [7.6, 0.2], [6, 1.2], [0, 1]]), m.metal, 0.2, 1);
    disc(pm, ox, oy, 1.2, 1.2, BRONZE, 0.3);
  },
  // Leaf blade, reed-wrapped grip.
  marsh_dagger: (pm, m) => sword(pm, m, { len: 8, w: 2.8, tip: 'leaf', blade: ramp([150, 170, 150], 0.4), guard: 'none', grip: REED, gripLen: 4, pommel: 'round', guardR: MARSH, hx: 6, hy: 12 }),
  marsh_offhand_dagger: (pm, m) => {
    sword(pm, m, { len: 7, w: 2.4, tip: 'hook', blade: ramp([150, 170, 150], 0.4), guard: 'bar', guardR: MARSH, grip: REED, gripLen: 3.6, pommel: 'none', hx: 6, hy: 12 });
  },
  // A docker's hook knife.
  dock_dagger: (pm, m) => sword(pm, m, { len: 7, w: 2.4, tip: 'hook', guard: 'bar', guardR: IRON, grip: DARK_WOOD, gripLen: 4, pommel: 'ring', hx: 6, hy: 12.5 }),
  // A quill: a fine blade whose pommel is a feather.
  archivist_dagger: (pm, m) => sword(pm, m, { len: 9, w: 1.8, tip: 'needle', guard: 'disc', guardR: CLOTH_PURPLE, grip: CLOTH_PURPLE, pommel: 'feather', hx: 7, hy: 11 }),
  // A blade of ice, faceted.
  frost_dagger: (pm, m) => {
    sword(pm, m, { len: 9, w: 3, tip: 'point', blade: ICE, guard: 'prongs', guardR: SILVER, grip: DARK_LEATHER, pommel: 'round', hx: 6, hy: 12 });
    const f = diag(6, 12);
    for (const u of [2, 4, 6]) px(pm, ...f(u, 0.5), [255, 255, 255]);
    for (const [u, v] of [[9.5, -2], [7, 2.6]]) px(pm, ...f(u, v), [200, 240, 255]);
  },
  // A kris: the wavy dark blade.
  shadow_dagger: (pm, m) => sword(pm, m, { len: 9, w: 2.4, tip: 'wavy', blade: SHADOW, guard: 'bar', guardR: SILVER, grip: DARK, pommel: 'gem', hx: 6, hy: 12 }),
  watcher_dagger: (pm, m) => sword(pm, m, { len: 9, w: 2.2, fuller: true, guard: 'wing', guardR: SILVER, grip: CLOTH_BLUE, pommel: 'round', hx: 6, hy: 12 }),
  // An athame: curved blade, crescent pommel.
  ritual_dagger: (pm, m) => {
    sword(pm, m, { len: 9, w: 2.4, tip: 'wavy', blade: ramp([196, 190, 176], 0.4), guard: 'swept', guardR: GOLD, grip: CLOTH_RED, pommel: 'crescent', hx: 6, hy: 12 });
  },
  // A parrying dagger: the wide shell guard.
  offhand_dagger: (pm, m) => sword(pm, m, { len: 8, w: 2.2, guard: 'shell', guardR: IRON, pommel: 'round', hx: 6, hy: 12 }),
  // Twin daggers, side by side, the far one in shadow.
  shadow_offhand_dagger: (pm, m) => {
    const o = { len: 9, w: 2, tip: 'wavy', blade: SHADOW, guard: 'bar', guardR: SILVER, grip: DARK, gripLen: 2.6, pommel: 'round' } as const;
    sword(pm, m, { ...o, hx: 4, hy: 11 });
    tint(pm, [20, 16, 30], 0.35);
    sword(pm, m, { ...o, hx: 7, hy: 14 });
  },
  // Le Croc de l'Ombre: a curved fang of a blade, serrated.
  shadow_fang: (pm) => {
    poly(pm, [[11, 1.5], [13.6, 4], [13.4, 8], [11, 12], [8, 13], [9.6, 9], [10.6, 5]], BONE, 0.1, 1.6);
    for (const y of [5, 7, 9]) erase(pm, Math.round(13.4 - (y - 5) * 0.4), y);
    poly(pm, [[6, 12], [11, 12], [11, 13.6], [6, 13.6]], SILVER, 0.1, 1);
    bar(pm, 7, 17, 8.4, 14, 2, DARK, 0);
    px(pm, 10, 6, VIOLET);
  },
  garrison_offhand_dagger: (pm, m) => sword(pm, m, { len: 8, w: 2.2, guard: 'prongs', guardR: STEEL, blade: STEEL, grip: CLOTH_BLUE, pommel: 'gem', hx: 6, hy: 12 }),
};

// ------------------------------------------------------------------- axes

const AXES: Record<string, Draw> = {
  hatchet: (pm, m) => axeOf(pm, m, { head: 'small', len: 13 }),
  lumberjack_hatchet: (pm, m) => axeOf(pm, m, { head: 'wedge', len: 13, shaft: ramp([170, 70, 50]), size: 1.05 }),
  sentry_axe: (pm, m) => axeOf(pm, m, { head: 'beard', len: 14, wrap: LEATHER }),
  // A throwing axe: slim head, feathers tied below.
  throwing_hatchet: (pm, m) => {
    axeOf(pm, m, { head: 'tomahawk', len: 13, shaft: WOOD });
    const f = diag(3, 16);
    bar(pm, ...f(4.5, 0), ...f(3, 3.4), 1, ramp([210, 200, 190], 0.3), 0.3);
    bar(pm, ...f(5, 0.4), ...f(4.2, 3.8), 1, CLOTH_RED, 0);
  },
  steel_axe: (pm, m) => axeOf(pm, m, { head: 'crescent', len: 15, back: 'spike', wrap: DARK_LEATHER }),
  // A halberd's head on a long haft.
  sentinel_axe: (pm, m) => axeOf(pm, m, { head: 'halberd', len: 15, back: 'spike', size: 0.9 }),
  marsh_hatchet: (pm, m) => {
    // A billhook: a hooked blade for cutting reeds.
    axeOf(pm, m, { head: 'hook', len: 13, shaft: REED, head_: ramp([140, 150, 140], 0.4), wrap: MARSH });
  },
  mithril_axe: (pm, m) => axeOf(pm, m, { head: 'double', len: 15, size: 0.85, wrap: CLOTH_BLUE }),
  watcher_axe: (pm, m) => {
    axeOf(pm, m, { head: 'crescent', len: 15, head_: SILVER, wrap: CLOTH_BLUE });
    const f = diag(3, 16);
    px(pm, ...f(12.4, 3), [24, 22, 30]); // the pierced crescent
  },
  shadow_hatchet: (pm, m) => axeOf(pm, m, { head: 'hook', len: 13, head_: SHADOW, shaft: DARK, wrap: CLOTH_PURPLE }),
  offhand_hatchet: (pm, m) => axeOf(pm, m, { head: 'small', len: 12, wrap: LEATHER, size: 0.9 }),
  steel_offhand_axe: (pm, m) => axeOf(pm, m, { head: 'wedge', len: 12, back: 'hammer', size: 0.9 }),
  mithril_offhand_axe: (pm, m) => axeOf(pm, m, { head: 'double', len: 12, size: 0.7 }),
  // An old, notched hatchet, a strip of red cloth knotted on.
  last_refuge_hatchet: (pm, m) => {
    axeOf(pm, m, { head: 'small', len: 13, head_: IRON, shaft: DARK_WOOD });
    const f = diag(3, 16);
    erase(pm, ...(f(10.6, 4.6).map(Math.round) as [number, number]));
    erase(pm, ...(f(8.6, 4.4).map(Math.round) as [number, number]));
    bar(pm, ...f(6, -1), ...f(6, 1.4), 2, CLOTH_RED, 0);
    bar(pm, ...f(6, 1.4), ...f(4.6, 3.4), 1, CLOTH_RED, -0.2);
  },
  woodcutter_greataxe: (pm, m) => axeOf(pm, m, { head: 'wedge', len: 16, size: 1.2, shaft: WOOD }),
  steel_greataxe: (pm, m) => axeOf(pm, m, { head: 'double', len: 16, size: 1.05, wrap: DARK_LEATHER }),
  ritual_greataxe: (pm, m) => {
    axeOf(pm, m, { head: 'crescent', len: 16, size: 1.15, head_: ramp([196, 190, 176], 0.4), wrap: CLOTH_RED, back: 'spike' });
    const f = diag(3, 16);
    for (const [u, v] of [[11, 3], [13.4, 4], [14.6, 2.4]]) px(pm, ...f(u, v), GOLD[0]);
  },
};

// ----------------------------------------------------------------- staves

const STAVES: Record<string, Draw> = {
  novice_staff: (pm) => {
    shaft(pm, WOOD, 13, 4);
    disc(pm, 13.5, 3.5, 2, 2, WOOD, 0.3);
    bar(pm, 9, 9, 10, 8, 2, LINEN, 0);
  },
  // A cage of woven willow holding a stone.
  wicker_staff: (pm, m) => {
    shaft(pm, REED, 12, 6);
    orb(pm, 13, 4, 1.8, m.gem, false);
    hoop(pm, 13.5, 4.5, 3.4, 3.6, REED, 1);
    for (const [x, y] of [[13, 1], [11, 4], [15, 4], [13, 7]] as [number, number][]) px(pm, x, y, REED[1]);
  },
  gnarled_staff: (pm, m) => {
    for (let t = 0; t <= 1; t += 0.05) {
      const x = 4 + t * 9 + Math.sin(t * 9) * 0.8;
      const y = 17 - t * 13;
      bar(pm, x, y, x, y, 2, WOOD, Math.sin(t * 9) * 0.3);
    }
    bar(pm, 13, 4, 11, 1, 1, WOOD, 0.2);
    bar(pm, 13, 4, 16, 2, 1, WOOD, -0.2);
    orb(pm, 13.5, 2.5, 1.4, m.gem);
    dots(pm, [[6, 12], [7, 12]], MARSH[1], false);
  },
  // A walking cane, the crook at the top, a brass ferrule.
  study_cane: (pm) => {
    shaft(pm, DARK_WOOD, 11, 4);
    for (let a = 0; a <= Math.PI * 1.1; a += 0.1) px(pm, 13 + Math.cos(a + Math.PI) * -2.4, 4 - Math.sin(a) * 2.4, lit(DARK_WOOD, Math.cos(a) * 0.4));
    bar(pm, 3, 17, 4, 16, 2, BRONZE, 0.2);
    bar(pm, 10, 6, 11, 5, 2, BRONZE, 0.2);
  },
  // A lantern hung from a crook: the archivist reads in the dark.
  archivist_wand: (pm, m) => {
    shaft(pm, DARK_WOOD, 10, 3);
    bar(pm, 10, 3, 13, 2, 1, DARK_WOOD, 0.2);
    px(pm, 14, 3, IRON[1]);
    poly(pm, [[12, 5], [16, 5], [16, 10], [12, 10]], IRON, 0, 1);
    for (let y = 6; y <= 9; y++) for (let x = 13; x <= 15; x++) pm.set(x, y, y < 8 ? [255, 228, 140] : [250, 180, 80]);
    pm.vline(14, 6, 9, IRON[2]);
    px(pm, 14, 4, IRON[2]);
    void m;
  },
  guard_staff: (pm, m) => {
    shaft(pm, DARK_WOOD, 12, 6);
    bar(pm, 9, 6, 14, 10, 1, GOLD, 0.2); // crossbar
    bar(pm, 11, 7, 13, 5, 2, GOLD, 0.2);
    orb(pm, 14, 3.5, 2.2, m.gem);
  },
  // A short sceptre: twisted roots closing on a green light.
  marsh_scepter: (pm, m) => {
    shaft(pm, MARSH, 11, 7, 5, 16);
    orb(pm, 12.5, 4.5, 2.2, m.gem);
    for (const [x0, y0, x1, y1] of [[10, 7, 10, 3], [12, 7, 15, 3], [11, 6, 13, 1.5]] as number[][]) bar(pm, x0, y0, x1, y1, 1, DARK_WOOD, 0.1);
    dots(pm, [[6, 13], [7, 14]], [98, 140, 70], false);
  },
  // Steel, a ring of runes floating round its stone.
  enchanted_steel_staff: (pm, m) => {
    shaft(pm, STEEL, 12, 6);
    orb(pm, 13.5, 4, 1.8, m.gem);
    for (let a = 0; a < Math.PI * 2; a += 0.7) px(pm, 13.5 + Math.cos(a) * 3.6, 4 + Math.sin(a) * 2.2, [170, 220, 255]);
  },
  ritual_staff: (pm, m) => {
    shaft(pm, DARK_WOOD, 12, 6);
    bar(pm, 10, 7, 12, 5, 2, GOLD, 0.2);
    for (let a = -1.2; a <= 2.6; a += 0.12) px(pm, 13.5 + Math.cos(a) * 3, 3.5 - Math.sin(a) * 3, lit(GOLD, Math.sin(a) * 0.5));
    orb(pm, 13.5, 3.5, 1.4, m.gem, false);
  },
  // Topped with the Watchers' four-pointed star.
  watcher_staff: (pm, m) => {
    shaft(pm, ramp([150, 160, 180], 0.3), 12, 6);
    star(pm, 13, 4, 3);
    void m;
  },
  // A dark sceptre with an eye in its head.
  shadow_scepter: (pm, m) => {
    shaft(pm, DARK, 11, 7, 5, 16);
    poly(pm, [[9.5, 6], [12, 1.5], [16, 3], [15.5, 7.5], [11.5, 8.5]], SHADOW, 0.1, 1.5);
    disc(pm, 13, 5, 2, 1.4, ramp([230, 220, 240], 0.3), 0.3);
    pm.set(13, 5, [60, 20, 90]);
    pm.set(12, 5, VIOLET);
    void m;
  },
  mithril_staff: (pm, m) => {
    shaft(pm, MITHRIL, 12, 6);
    for (let y = 0; y <= 5; y++) for (let x = -1; x <= 1; x++) if (Math.abs(x) <= (y < 2 ? y * 0.5 : 1)) pm.set(13 + x, y, lit(ramp(m.gem, 0.2), -x * 0.6 + 0.2));
    bar(pm, 10, 6, 12, 4, 1, GOLD, 0.2);
    bar(pm, 14, 6, 16, 4, 1, GOLD, -0.1);
  },
};

// ------------------------------------------------------------------- bows

const BOWS: Record<string, Draw> = {
  // A short bow, an arrow nocked.
  short_bow: (pm, m) => {
    const { at } = bowOf(pm, { limbs: m.wood, bend: 4.5, half: 8, sx: 6, grip: LEATHER });
    bar(pm, ...at(3, 9), ...at(14.5, 9), 1, WOOD, 0.2);
    poly(pm, [at(14, 8), at(16.4, 9), at(14, 10)], IRON, 0.2, 1);
    for (const y of [8, 10]) bar(pm, ...at(3, y), ...at(4.6, y), 1, ramp([220, 220, 220], 0.3), 0.2);
  },
  // A crooked branch, twine for a string, a bud still on it.
  branch_bow: (pm) => {
    const { pts, at } = bowOf(pm, { limbs: ramp([120, 90, 60]), bend: 5.5, half: 9.5, stringC: [190, 170, 120] });
    for (const i of [6, 30]) px(pm, ...at(pts[i][0] + 1, pts[i][1]), WOOD[3]);
    const [bx, by] = at(pts[12][0] + 1.2, pts[12][1]);
    dots(pm, [[Math.round(bx), Math.round(by)], [Math.round(bx) + 1, Math.round(by) - 1], [Math.round(bx) + 1, Math.round(by)]], [110, 160, 80], false);
  },
  reinforced_bow: (pm, m) => { bowOf(pm, { limbs: m.wood, bend: 6, half: 10, grip: LEATHER, bands: IRON }); },
  // Recurved, horn at the tips.
  small_composite_bow: (pm) => { bowOf(pm, { limbs: ramp([140, 90, 60]), bend: 5, half: 8.6, recurve: 2, grip: CLOTH_RED, tips: BONE }); },
  // A hunter's bow: fur at the grip, a feather hanging.
  hunting_bow: (pm, m) => {
    const { at } = bowOf(pm, { limbs: m.wood, bend: 6, half: 10, grip: ramp([170, 140, 100], 0.5) });
    bar(pm, ...at(12.4, 10.4), ...at(13.6, 13.4), 1, ramp([200, 196, 186], 0.3), 0.2);
    px(pm, ...at(13.8, 14.2), [120, 80, 60]);
  },
  marsh_bow: (pm) => {
    const { pts, at } = bowOf(pm, { limbs: REED, bend: 5.5, half: 10, grip: MARSH, stringC: [200, 210, 170] });
    for (let i = 3; i < pts.length; i += 5) px(pm, ...at(...pts[i]), MARSH[2]);
  },
  garrison_longbow: (pm, m) => { bowOf(pm, { limbs: m.wood, bend: 4.6, half: 11.4, sx: 4, grip: CLOTH_BLUE, tips: STEEL }); },
  reinforced_composite_bow: (pm) => { bowOf(pm, { limbs: ramp([120, 80, 56]), bend: 5.4, half: 10, recurve: 2.4, grip: DARK_LEATHER, bands: STEEL, tips: STEEL }); },
  watcher_bow: (pm) => { bowOf(pm, { limbs: SILVER, bend: 4.6, half: 11.4, sx: 4, grip: CLOTH_BLUE, stringC: [200, 236, 255] }); },
  // A seal at the grip, gold-tipped.
  seal_bow: (pm, m) => {
    const { at } = bowOf(pm, { limbs: DARK_WOOD, bend: 5.4, half: 10, recurve: 2, tips: GOLD });
    const [cx, cy] = at(5 + 2 + 5.4, 9);
    disc(pm, cx, cy, 2.2, 2.2, GOLD, 0.2);
    gemAt(pm, Math.round(cx - 1), Math.round(cy - 1), m.gem);
  },
  mithril_bow: (pm) => { bowOf(pm, { limbs: MITHRIL, bend: 6, half: 10, recurve: 1.6, grip: CLOTH_BLUE, stringC: [190, 236, 255] }); },
  // A crescent of a bow, deep-curved, its string red.
  ritual_bow: (pm) => {
    const { pts, at } = bowOf(pm, { limbs: ramp([196, 190, 176], 0.4), bend: 8, half: 9.6, sx: 3, stringC: [220, 70, 70], grip: CLOTH_RED });
    for (const i of [7, 13, 27, 33]) px(pm, ...at(...pts[i]), GOLD[0]);
  },
};

// ------------------------------------------------------------------ tomes

const TOMES: Record<string, Draw> = {
  // The four elements quartered on the cover.
  elemental_grimoire: (pm, m) => {
    book(pm, ramp([110, 90, 70]), BRONZE);
    const q: [number, number, RGB][] = [[5, 4, [220, 90, 60]], [9, 4, [80, 140, 230]], [5, 9, [110, 180, 90]], [9, 9, [230, 200, 90]]];
    for (const [x0, y0, c] of q) for (let y = y0; y < y0 + 4; y++) for (let x = x0; x < x0 + 4; x++) pm.set(x, y, lit(ramp(c, 0.4), 0.2 - (y - y0) * 0.15));
    void m;
  },
  // Plain brown, a ribbon hanging out.
  spell_manual: (pm) => {
    book(pm, ramp([120, 84, 60]));
    pm.hline(6, 12, 5, ramp([120, 84, 60])[3]);
    pm.hline(6, 11, 7, ramp([120, 84, 60])[3]);
    bar(pm, 10, 15, 10, 17, 1, CLOTH_RED, 0);
  },
  flame_codex: (pm) => {
    book(pm, CLOTH_RED, GOLD);
    for (let y = 5; y <= 12; y++) {
      const t = (y - 5) / 7;
      const hw = Math.round(Math.sin(t * Math.PI * 0.9 + 0.2) * 2.6);
      for (let x = 9 - hw; x <= 9 + hw; x++) pm.set(x, y, t < 0.35 ? [255, 230, 120] : Math.abs(x - 9) < hw ? [255, 150, 50] : [220, 80, 40]);
    }
  },
  // A leather strap and buckle across it.
  leather_tome: (pm) => {
    book(pm, LEATHER);
    for (let y = 8; y <= 10; y++) pm.hline(3, 15, y, lit(DARK_LEATHER, y === 8 ? 0.3 : -0.2));
    poly(pm, [[11, 7], [14, 7], [14, 11], [11, 11]], BRONZE, 0.2, 1);
    px(pm, 12, 9, DARK_LEATHER[3]);
  },
  guard_grimoire: (pm, m) => {
    book(pm, CLOTH_BLUE, GOLD);
    poly(pm, [[6, 5], [12, 5], [12, 9], [9, 12.5], [6, 9]], GOLD, 0.1, 1.4);
    gemAt(pm, 8, 7, m.gem);
  },
  // Green, a vine grown over it.
  marsh_codex: (pm) => {
    book(pm, CLOTH_GREEN);
    for (let t = 0; t <= 1; t += 0.05) px(pm, 4 + t * 10, 13 - t * 9 + Math.sin(t * 12) * 1.2, MARSH[3]);
    dots(pm, [[6, 10], [9, 9], [11, 6], [12, 7]], [130, 180, 90]);
  },
  // Covers of riveted steel.
  steel_treatise: (pm) => {
    book(pm, STEEL);
    for (const [x, y] of [[5, 4], [12, 4], [5, 13], [12, 13]] as [number, number][]) pm.set(x, y, STEEL[0]);
    pm.hline(5, 12, 8, STEEL[3]);
    pm.hline(5, 12, 9, STEEL[1]);
  },
  // A scroll, rolled, sealed with wax.
  archivist_manuscript: (pm) => {
    const parch = ramp([230, 214, 176], 0.5);
    poly(pm, [[3, 5], [15, 5], [15, 13], [3, 13]], parch, 0.1, 2);
    for (const x of [3, 15]) disc(pm, x, 9, 1.6, 4.6, parch, x === 3 ? 0.3 : -0.2);
    for (const y of [7, 9, 11]) pm.hline(6, 12, y, mix(parch[2], [80, 60, 50], 0.35));
    disc(pm, 9, 13.5, 2, 2, ramp([170, 40, 50]), 0.2);
    bar(pm, 9, 15, 8, 17, 1, CLOTH_PURPLE, 0);
    bar(pm, 10, 15, 11, 17, 1, CLOTH_PURPLE, -0.2);
  },
  watcher_grimoire: (pm) => {
    book(pm, ramp([46, 70, 130]), SILVER);
    star(pm, 8, 8, 4);
  },
  // Black, an eye opening on it.
  shadow_codex: (pm) => {
    book(pm, ramp([56, 46, 70], 0.3), SILVER);
    disc(pm, 9, 8.5, 3.4, 2, ramp([220, 210, 230], 0.3), 0.2);
    disc(pm, 9, 8.5, 1.4, 1.6, ramp(VIOLET, 0.2), 0.2);
    px(pm, 9, 8, [30, 10, 50]);
  },
  mithril_codex: (pm, m) => {
    book(pm, MITHRIL, GOLD);
    for (let y = 5; y <= 12; y++) {
      const hw = y < 8 ? (y - 5) * 0.8 : (12 - y) * 0.6;
      for (let x = Math.round(9 - hw); x <= Math.round(9 + hw); x++) pm.set(x, y, lit(ramp(m.gem, 0.2), -(x - 9) * 0.4 + 0.2));
    }
  },
  // Bound in chains, a gold padlock.
  ritual_grimoire: (pm) => {
    book(pm, ramp([120, 40, 46]), GOLD);
    for (let t = 0; t <= 1; t += 0.06) {
      px(pm, 3 + t * 12, 3 + t * 12, Math.round(t * 16) % 2 ? IRON[1] : IRON[3]);
      px(pm, 15 - t * 12, 3 + t * 12, Math.round(t * 16) % 2 ? IRON[1] : IRON[3]);
    }
    poly(pm, [[7, 8], [11, 8], [11, 12], [7, 12]], GOLD, 0.2, 1);
    hoop(pm, 9.5, 8, 1.6, 1.8, GOLD);
    px(pm, 9, 10, GOLD[4]);
  },
};

// ---------------------------------------------------------------- shields

const SHIELDS: Record<string, Draw> = {
  // Round, of planks, an iron rim and boss.
  wooden_shield: (pm) => {
    roundShield(pm, WOOD, IRON);
    for (const x of [6, 9, 12]) for (let y = 3; y <= 15; y++) if (pm.filled(x, y) && pm.get(x, y)![0] > 90) pm.set(x, y, lit(WOOD, -0.55));
    disc(pm, 9, 9, 2, 2, IRON, 0.3);
  },
  buckler: (pm) => {
    roundShield(pm, LEATHER, STEEL, 6);
    disc(pm, 9, 9, 2.2, 2.2, STEEL, 0.4);
    glint(pm, 8, 8);
  },
  tower_shield: (pm) => {
    poly(pm, [[4, 1.5], [14, 1.5], [14.5, 16.5], [3.5, 16.5]], IRON, 0.1, 1.4);
    poly(pm, [[5, 2.5], [13, 2.5], [13.4, 15.5], [4.6, 15.5]], WOOD, 0.1, 2.4);
    for (const y of [6, 12]) pm.hline(4, 14, y, IRON[2]);
    for (const y of [6, 12]) for (const x of [5, 13]) pm.set(x, y, IRON[0]);
  },
  // A heater of wood held by iron bands.
  reinforced_shield: (pm) => {
    heater(pm, WOOD, IRON);
    for (const y of [6, 11]) for (let x = 3; x <= 15; x++) if (pm.filled(x, y)) pm.set(x, y, lit(IRON, y === 6 ? 0.2 : -0.1));
    dots(pm, [[5, 6], [9, 6], [13, 6], [6, 11], [12, 11]], IRON[0]);
  },
  guard_shield: (pm, m) => {
    heater(pm, CLOTH_BLUE, GOLD);
    for (let y = 3; y <= 15; y++) if (pm.filled(9, y)) pm.set(9, y, lit(GOLD, 0.2 - y * 0.03));
    for (let x = 4; x <= 14; x++) if (pm.filled(x, 7)) pm.set(x, 7, lit(GOLD, 0.1));
    gemAt(pm, 8, 6, m.gem);
  },
  // Woven reeds on a hoop.
  marsh_buckler: (pm) => {
    roundShield(pm, REED, DARK_WOOD, 6.6);
    for (let y = 3; y <= 15; y++) for (let x = 3; x <= 15; x++) {
      const c = pm.get(x, y);
      if (c && (x - 9) ** 2 + (y - 9) ** 2 < 28 && (Math.floor(x / 2) + Math.floor(y / 2)) % 2) pm.set(x, y, mix(c, [60, 50, 30], 0.3));
    }
    disc(pm, 9, 9, 1.6, 1.6, MARSH, 0.3);
  },
  steel_tower_shield: (pm) => {
    poly(pm, [[4, 1.5], [14, 1.5], [14.5, 14], [9, 17], [3.5, 14]], STEEL, 0.1, 3);
    for (let y = 3; y <= 15; y++) {
      pm.set(9, y, lit(STEEL, 0.6));
      pm.set(10, y, lit(STEEL, -0.4));
    }
    dots(pm, [[5, 3], [13, 3], [5, 13], [13, 13]], STEEL[4]);
  },
  // Round, painted in a smuggler's stripes, dented.
  smuggler_shield: (pm) => {
    roundShield(pm, WOOD, IRON);
    for (let y = 2; y <= 16; y++) for (let x = 2; x <= 16; x++) {
      if ((x - 9) ** 2 + (y - 9) ** 2 > 36) continue;
      if (Math.floor((x + y) / 3) % 2) pm.set(x, y, lit(CLOTH_RED, 0.3 - (y - 2) * 0.05));
    }
    disc(pm, 9, 9, 1.8, 1.8, IRON, 0.3);
    dots(pm, [[12, 5], [13, 6]], [50, 34, 30]);
  },
  watcher_shield: (pm) => {
    kite(pm, ramp([46, 70, 130]), SILVER);
    star(pm, 9, 7, 3);
  },
  // Dark, a spike for a boss.
  shadow_buckler: (pm) => {
    roundShield(pm, ramp([70, 60, 84], 0.4), SHADOW, 6.6);
    poly(pm, [[7, 10], [9, 3.5], [11, 10]], SILVER, 0.2, 1);
    disc(pm, 9, 10, 2, 1.6, SILVER, 0.2);
  },
  mithril_shield: (pm, m) => {
    kite(pm, MITHRIL, GOLD);
    for (let y = 3; y <= 14; y++) if (pm.filled(9, y)) pm.set(9, y, lit(GOLD, 0.1));
    gemAt(pm, 8, 7, m.gem);
  },
  // A gold-rimmed round ward, a sun on red.
  ritual_ward: (pm) => {
    roundShield(pm, ramp([140, 40, 46]), GOLD);
    disc(pm, 9, 9, 2.4, 2.4, GOLD, 0.3);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) px(pm, 9 + Math.cos(a) * 4.3 - 0.5, 9 + Math.sin(a) * 4.3 - 0.5, GOLD[1]);
  },
  // L'Égide du Sommeil brisé: a shield split by a crack of cold light.
  broken_sleep_aegis: (pm) => {
    heater(pm, ramp([70, 80, 110]), SILVER);
    for (const [x, y] of [[9, 2], [8, 4], [10, 6], [9, 8], [8, 10], [10, 12], [9, 14], [9, 15]] as [number, number][]) pm.set(x, y, [170, 230, 255]);
    for (const [x, y] of [[8, 3], [9, 5], [10, 7], [9, 9], [9, 11], [9, 13]] as [number, number][]) pm.set(x, y, [230, 250, 255]);
  },
  // L'Égide des trois sites: three stones in a triangle, joined by gold.
  threefold_ward: (pm) => {
    heater(pm, ramp([150, 40, 50]), GOLD);
    bar(pm, 9, 4.5, 5, 11.5, 1, GOLD, 0.2);
    bar(pm, 9, 4.5, 13, 11.5, 1, GOLD, 0);
    bar(pm, 5, 11.5, 13, 11.5, 1, GOLD, -0.2);
    gemAt(pm, 8, 4, [255, 210, 110]);
    gemAt(pm, 4, 11, [120, 210, 250]);
    gemAt(pm, 12, 11, VIOLET);
  },
};

// --------------------------------------------------------------- helmets

const HELMETS: Record<string, Draw> = {
  // A soft leather cap with ear flaps.
  leather_helmet: (pm) => {
    dome(pm, LEATHER, 9, 6.5, 6.5, 12);
    poly(pm, [[2.6, 9], [5.4, 9], [5.4, 15], [3.4, 15.5], [2.6, 13]], LEATHER, 0, 1.2);
    poly(pm, [[12.6, 9], [15.4, 9], [15.4, 13], [14.6, 15.5], [12.6, 15]], LEATHER, -0.2, 1.2);
    pm.hline(4, 14, 11, DARK_LEATHER[2]);
    for (let y = 4; y <= 10; y += 2) pm.set(9, y, LEATHER[3]);
  },
  rogue_hood: (pm) => hoodOf(pm, ramp([110, 84, 60])),
  // An iron skullcap, riveted, the dark of its inside showing.
  iron_cap: (pm) => {
    disc(pm, 9, 10, 6.6, 7, IRON, 0.1);
    for (let y = 13; y < ICON; y++) for (let x = 0; x < ICON; x++) erase(pm, x, y);
    disc(pm, 9, 12.6, 5.6, 1.4, ramp([40, 38, 46], 0.2), -0.4);
    pm.hline(3, 15, 11, IRON[3]);
    pm.hline(3, 15, 10, IRON[1]);
    for (const x of [4, 9, 14]) pm.set(x, 8, IRON[0]);
    for (let y = 4; y <= 9; y++) pm.set(9, y, lit(IRON, 0.5));
  },
  simple_circlet: (pm, m) => {
    hoop(pm, 9.5, 11, 7.2, 3.2, BRONZE, 2);
    poly(pm, [[7, 9], [9, 5], [11, 9]], BRONZE, 0.2, 1);
    gemAt(pm, 8, 7, m.gem);
  },
  // A nasal helm: pointed, cheeks down, a nose guard, a blue plume.
  guard_helm: (pm) => {
    poly(pm, [[9, 1.5], [13, 4], [14.6, 8], [14.6, 15.5], [3.4, 15.5], [3.4, 8], [5, 4]], STEEL, 0.1, 3);
    poly(pm, [[5.6, 10.4], [12.4, 10.4], [12.4, 16], [5.6, 16]], ramp([34, 30, 40], 0.2), -0.5, 1);
    poly(pm, [[8.2, 9], [9.8, 9], [9.8, 14.4], [8.2, 14.4]], STEEL, 0.25, 1);
    pm.hline(4, 14, 9, GOLD[1]);
    for (let y = 3; y <= 8; y++) pm.set(9, y, lit(STEEL, 0.6));
    bar(pm, 9, 1.5, 12, 0, 1, CLOTH_BLUE, 0.3);
    bar(pm, 10, 2, 14, 1, 1, CLOTH_BLUE, -0.1);
  },
  marsh_hood: (pm) => {
    hoodOf(pm, MARSH);
    dots(pm, [[4, 12], [5, 10], [13, 11], [14, 13]], [140, 170, 90]);
  },
  // A great helm: a bucket of steel, the eye slit, breathing holes.
  steel_helm: (pm) => {
    poly(pm, [[3.5, 3], [6, 1.5], [12, 1.5], [14.5, 3], [15, 16], [3, 16]], STEEL, 0.1, 3);
    for (let x = 4; x <= 14; x++) if (x !== 9) pm.set(x, 7, [24, 22, 30]);
    for (let y = 2; y <= 15; y++) if (y !== 7) {
      pm.set(9, y, lit(STEEL, 0.55));
      pm.set(10, y, lit(STEEL, -0.35));
    }
    dots(pm, [[12, 11], [13, 12], [12, 13], [13, 10]], [24, 22, 30]);
  },
  archivist_circlet: (pm, m) => {
    hoop(pm, 9.5, 11, 7.2, 3.2, BRONZE, 2);
    poly(pm, [[5.6, 9], [7, 6], [9, 4.4], [11, 6], [12.4, 9], [11, 8.6], [9, 6.6], [7, 8.6]], BRONZE, 0.2, 1);
    gemAt(pm, 8, 6, m.gem);
    dots(pm, [[3, 13], [3, 14], [15, 13], [15, 14]], BRONZE[2], false);
  },
  // A silver sallet, a blue crest over it, the star on the brow.
  watcher_helm: (pm) => {
    disc(pm, 9, 10, 6, 6.4, SILVER, 0.1);
    for (let y = 14; y < ICON; y++) for (let x = 0; x < ICON; x++) erase(pm, x, y);
    poly(pm, [[2.6, 11], [15.4, 11], [16, 14.4], [2, 14.4]], SILVER, -0.1, 1.4); // the flared tail
    for (let x = 4; x <= 14; x++) if (x !== 9) pm.set(x, 9, [24, 22, 30]);
    // The plume rising from the crown and falling back.
    poly(pm, [[8, 4.4], [8.4, 1.4], [10.4, 0.4], [14, 1.6], [16, 4.6], [13, 3], [10.6, 2.6], [10, 4.4]], CLOTH_BLUE, 0.2, 1.2);
    star(pm, 9, 6, 1);
  },
  // A dark hood, two eyes in it.
  shadow_hood: (pm) => {
    hoodOf(pm, ramp([70, 58, 90], 0.4), [16, 12, 22]);
    for (const x of [7, 11]) pm.set(x, 10, VIOLET);
  },
  // A bascinet: an ogive skull, a snouted visor.
  mithril_helm: (pm) => {
    poly(pm, [[9, 0.8], [12, 2.4], [14, 6], [14.8, 10], [14.6, 16], [3.4, 16], [3.2, 10], [4, 6], [6, 2.4]], MITHRIL, 0.1, 3);
    poly(pm, [[5, 8.4], [13, 8.4], [14, 11.4], [9, 16.4], [4, 11.4]], MITHRIL, -0.1, 2.2);
    for (const [x0, y] of [[6, 10], [7, 12]]) for (let x = x0; x <= 18 - x0; x++) if (x !== 9) pm.set(x, y, [24, 22, 30]);
    pm.hline(4, 14, 7, GOLD[1]);
  },
  // A crown of points, the middle one set with a stone.
  ritual_circlet: (pm, m) => {
    poly(pm, [[3, 9], [15, 9], [15, 13], [3, 13]], GOLD, 0.1, 1.4);
    for (const [x, h] of [[4, 5.5], [9, 3], [14, 5.5]]) poly(pm, [[x - 1.6, 9.5], [x, h], [x + 1.6, 9.5]], GOLD, 0.25, 1);
    gemAt(pm, 8, 6, m.gem);
    for (const x of [5, 13]) pm.set(x, 11, CLOTH_RED[1]);
  },
  // Le Heaume de la Vigie oubliée: tall, the slit glowing, a plume.
  watchtower_helm: (pm) => {
    poly(pm, [[4, 4], [6, 2.5], [12, 2.5], [14, 4], [14.6, 16], [3.4, 16]], SILVER, 0.1, 3);
    for (let x = 5; x <= 13; x++) pm.set(x, 8, [140, 220, 255]);
    for (let y = 9; y <= 15; y++) pm.set(9, y, lit(SILVER, 0.5));
    for (let y = 0; y <= 3; y++) pm.set(10 + (y > 1 ? 1 : 0), y, lit(CLOTH_BLUE, 0.3 - y * 0.15));
  },
  // A kettle hat: a wide brim against arrows.
  garrison_helm: (pm) => {
    dome(pm, STEEL, 9, 5, 6, 11);
    disc(pm, 9, 11.5, 8, 2.4, STEEL, -0.1);
    disc(pm, 9, 10.5, 5, 1.2, STEEL, 0.1);
    for (let x = 4; x <= 14; x++) if (pm.filled(x, 9)) pm.set(x, 9, lit(CLOTH_BLUE, 0.1));
    pm.set(9, 9, GOLD[1]);
  },
};

// --------------------------------------------------------------- bodies

const CHESTS: Record<string, Draw> = {
  leather_chest: (pm) => {
    torso(pm, LEATHER);
    for (let y = 6; y <= 13; y += 2) {
      pm.set(8, y, DARK_LEATHER[3]);
      pm.set(10, y, DARK_LEATHER[3]);
      pm.set(9, y + 1, LINEN[1]);
    }
    pm.hline(5, 13, 10, DARK_LEATHER[2]);
  },
  padded_vest: (pm) => {
    const pad = ramp([180, 156, 116], 0.5);
    torso(pm, pad, 2);
    for (let y = 5; y <= 15; y++) for (let x = 2; x <= 16; x++) if (pm.filled(x, y) && ((y % 3 === 0) || (x % 3 === 0 && y > 5))) pm.set(x, y, mix(pm.get(x, y)!, pad[4], 0.35));
  },
  light_chainmail: (pm) => {
    torso(pm, IRON, 2);
    for (let y = 3; y <= 16; y++) for (let x = 2; x <= 16; x++) if (pm.filled(x, y) && (x + y) % 2 === 0) pm.set(x, y, mix(pm.get(x, y)!, IRON[4], 0.45));
    pm.hline(5, 13, 16, LEATHER[2]);
  },
  // A plain linen robe with a rope belt.
  simple_robe: (pm) => {
    robeOf(pm, ramp([150, 134, 110], 0.5));
    bar(pm, 5, 9, 13, 9, 1, REED, 0.2);
    bar(pm, 11, 9, 12, 12, 1, REED, 0);
  },
  // Mail under a blue tabard with gold trim.
  guard_chest: (pm) => {
    torso(pm, STEEL);
    for (let y = 3; y <= 16; y++) for (let x = 2; x <= 16; x++) if (pm.filled(x, y) && (x + y) % 2 === 0) pm.set(x, y, mix(pm.get(x, y)!, STEEL[4], 0.4));
    poly(pm, [[6, 4.5], [8, 6], [10, 6], [12, 4.5], [12.4, 16], [5.6, 16]], CLOTH_BLUE, 0.1, 1.6);
    for (let y = 6; y <= 16; y++) {
      pm.set(6, y, GOLD[2]);
      pm.set(12, y, GOLD[3]);
    }
    poly(pm, [[8, 8.5], [10, 8.5], [10, 11], [9, 12], [8, 11]], GOLD, 0.2, 1);
  },
  // A vest with a fur collar.
  marsh_vest: (pm) => {
    torso(pm, MARSH, 3);
    for (let y = 5; y <= 16; y++) pm.set(9, y, [40, 46, 36]);
    for (const [x, y] of [[4, 3], [5, 3], [6, 4], [12, 4], [13, 3], [14, 3], [3, 4], [15, 4], [7, 5], [11, 5]] as [number, number][]) pm.set(x, y, lit(ramp([150, 124, 90], 0.5), (x + y) % 2 ? 0.3 : -0.1));
    dots(pm, [[5, 12], [13, 13], [6, 14]], [130, 170, 90]);
  },
  // A cuirass: the ridge, the plates at the waist.
  steel_chest: (pm) => {
    torso(pm, STEEL, 2.2);
    for (let y = 5; y <= 12; y++) {
      pm.set(9, y, lit(STEEL, 0.7));
      pm.set(10, y, lit(STEEL, -0.3));
    }
    for (const y of [13, 15]) for (let x = 4; x <= 14; x++) if (pm.filled(x, y)) pm.set(x, y, lit(STEEL, -0.55));
    dots(pm, [[4, 6], [14, 6]], STEEL[0]);
  },
  archivist_robe: (pm, m) => {
    robeOf(pm, CLOTH_PURPLE);
    for (let y = 5; y <= 16; y++) pm.set(9, y, GOLD[2]);
    pm.hline(5, 13, 9, GOLD[3]);
    poly(pm, [[10.5, 10], [13, 10], [13, 13], [10.5, 13]], ramp([120, 84, 60]), 0.1, 1); // a book at the belt
    gemAt(pm, 8, 3, m.gem);
  },
  watcher_chest: (pm) => {
    torso(pm, SILVER, 2.2);
    poly(pm, [[6.5, 6], [11.5, 6], [11.5, 11], [9, 13], [6.5, 11]], CLOTH_BLUE, 0.1, 1.4);
    star(pm, 9, 9, 2);
    for (const y of [14, 16]) for (let x = 4; x <= 14; x++) if (pm.filled(x, y)) pm.set(x, y, lit(SILVER, -0.5));
  },
  // Dark leather, straps crossing, silver buckles.
  shadow_vest: (pm) => {
    torso(pm, ramp([70, 60, 84], 0.4), 2.5);
    for (let t = 0; t <= 1; t += 0.08) {
      px(pm, 4 + t * 10, 5 + t * 10, DARK[3]);
      px(pm, 14 - t * 10, 5 + t * 10, DARK[3]);
    }
    dots(pm, [[9, 10], [6, 7], [12, 7]], SILVER[1]);
  },
  mithril_chest: (pm) => {
    torso(pm, MITHRIL, 2.2);
    for (let y = 5; y <= 12; y++) {
      pm.set(9, y, lit(MITHRIL, 0.7));
      pm.set(10, y, lit(MITHRIL, -0.3));
    }
    for (let x = 5; x <= 13; x++) if (pm.filled(x, 4)) pm.set(x, 4, GOLD[1]);
    for (const y of [13, 15]) for (let x = 4; x <= 14; x++) if (pm.filled(x, y)) pm.set(x, y, lit(GOLD, -0.2));
  },
  // A red robe, a gold stole hanging down the front.
  ritual_robe: (pm) => {
    robeOf(pm, ramp([150, 40, 46]));
    for (let y = 3; y <= 16; y++) {
      pm.set(7, y, lit(GOLD, 0.2 - y * 0.03));
      pm.set(11, y, lit(GOLD, -y * 0.03));
    }
    dots(pm, [[7, 8], [11, 8], [7, 12], [11, 12]], CLOTH_RED[3]);
  },
  // La Cuirasse purifiée: white plate with a sun.
  purified_breastplate: (pm) => {
    torso(pm, ramp([226, 224, 214], 0.3), 2.2);
    disc(pm, 9, 9, 2.5, 2.5, GOLD, 0.3);
    for (const [dx, dy] of [[0, -4], [0, 4], [-4, 0], [4, 0], [3, 3], [-3, 3], [3, -3], [-3, -3]] as [number, number][]) pm.set(9 + dx, 9 + dy, GOLD[1]);
  },
  // Plate, a blue half-tabard, the garrison's gold tower.
  garrison_cuirass: (pm) => {
    torso(pm, STEEL, 2.2);
    poly(pm, [[4.5, 10], [13.5, 10], [13.5, 16], [4.5, 16]], CLOTH_BLUE, 0.1, 1.4);
    poly(pm, [[7.5, 5], [10.5, 5], [10.5, 9], [7.5, 9]], GOLD, 0.2, 1);
    dots(pm, [[7, 4], [9, 4], [11, 4]], GOLD[2]);
    pm.set(9, 7, GOLD[4]);
  },
};

const LEGS: Record<string, Draw> = {
  leather_legs: (pm) => {
    trousers(pm, LEATHER, DARK_LEATHER);
    for (const x of [5, 12]) poly(pm, [[x - 1, 10], [x + 1.6, 10], [x + 1.6, 12.4], [x - 1, 12.4]], DARK_LEATHER, 0.1, 1);
  },
  studded_legs: (pm) => {
    trousers(pm, DARK_LEATHER, LEATHER);
    for (let y = 6; y <= 15; y += 3) for (const x of [5, 7, 11, 13]) if (pm.filled(x, y)) pm.set(x, y, IRON[0]);
  },
  // Slim linen leggings, tied at the waist.
  light_leggings: (pm) => {
    trousers(pm, LINEN, undefined, 0.8);
    pm.hline(4, 14, 3, LINEN[3]);
    bar(pm, 9, 3, 8, 6, 1, LEATHER, 0);
    bar(pm, 9, 3, 10, 6, 1, LEATHER, -0.2);
  },
  robe_legs: (pm) => skirt(pm, ramp([110, 120, 150], 0.4), LINEN),
  // Plate legs, blue tassets over the hips.
  guard_legs: (pm) => {
    trousers(pm, STEEL, GOLD);
    poly(pm, [[4, 4.5], [8.6, 4.5], [8.4, 9], [4, 8.4]], CLOTH_BLUE, 0.1, 1.2);
    poly(pm, [[9.4, 4.5], [14, 4.5], [14, 8.4], [9.6, 9]], CLOTH_BLUE, -0.1, 1.2);
    for (const x of [5, 12]) disc(pm, x + 0.5, 12, 1.6, 1.4, STEEL, 0.3);
  },
  // Wrapped tight with bands of cloth.
  marsh_leggings: (pm) => {
    trousers(pm, MARSH, DARK_LEATHER, 0.6);
    for (let y = 7; y <= 15; y += 2) for (let x = 3; x <= 15; x++) if (pm.filled(x, y) && x !== 9) pm.set(x, y + ((x % 3) ? 0 : 0), mix(pm.get(x, y)!, REED[1], 0.5));
  },
  steel_legs: (pm) => {
    trousers(pm, STEEL, DARK_LEATHER);
    for (const x of [5, 12]) disc(pm, x + 0.5, 11, 1.8, 1.6, STEEL, 0.4);
    for (const y of [7, 14]) for (let x = 3; x <= 15; x++) if (pm.filled(x, y) && pm.get(x, y)![2] > 40) pm.set(x, y, lit(STEEL, -0.5));
  },
  archivist_legs: (pm) => {
    skirt(pm, CLOTH_PURPLE, GOLD);
    for (let x = 2; x <= 16; x++) if (pm.filled(x, 16)) pm.set(x, 16, GOLD[2]);
  },
  watcher_legs: (pm) => {
    trousers(pm, SILVER, CLOTH_BLUE);
    for (const x of [5, 12]) {
      disc(pm, x + 0.5, 11, 1.8, 1.6, SILVER, 0.4);
      pm.set(x, 11, STAR);
    }
  },
  shadow_leggings: (pm) => {
    trousers(pm, ramp([70, 60, 84], 0.4), DARK, 0.6);
    for (let y = 8; y <= 15; y += 2) for (let x = 3; x <= 15; x++) if (pm.filled(x, y) && (x + y) % 3 === 0) pm.set(x, y, DARK[3]);
  },
  mithril_legs: (pm) => {
    trousers(pm, MITHRIL, GOLD);
    for (const x of [5, 12]) disc(pm, x + 0.5, 11, 1.8, 1.6, GOLD, 0.3);
  },
  ritual_legs: (pm) => {
    skirt(pm, ramp([150, 40, 46]), GOLD);
    for (let x = 2; x <= 16; x++) if (pm.filled(x, 16) && x % 2) pm.set(x, 16, GOLD[1]);
    for (let y = 6; y <= 15; y++) pm.set(9, y, GOLD[2]);
  },
  // Les Grèves de la Veille éternelle: a pair of greaves standing, a blue
  // light along their edge.
  eternal_watch_greaves: (pm) => {
    for (const x0 of [3, 10]) {
      poly(pm, [[x0, 2], [x0 + 5, 2], [x0 + 4.6, 12], [x0 + 5.6, 16.5], [x0 - 0.4, 16.5], [x0 + 0.4, 12]], SILVER, x0 === 3 ? 0.1 : -0.1, 2);
      disc(pm, x0 + 2.5, 6, 1.8, 1.6, SILVER, 0.4);
      for (let y = 8; y <= 15; y++) pm.set(x0 + 4, y, [150, 220, 255]);
    }
    pm.set(5, 6, STAR);
    pm.set(12, 6, STAR);
  },
  // Les Jambières du dernier repli: worn through and patched.
  last_refuge_legs: (pm) => {
    trousers(pm, DARK_LEATHER, LEATHER);
    poly(pm, [[4, 9], [7, 9], [7, 12], [4, 12]], LINEN, 0, 1);
    poly(pm, [[11, 12], [14, 12], [14, 15], [11, 15]], CLOTH_RED, 0, 1);
    dots(pm, [[4, 10], [6, 9], [11, 13], [13, 12], [14, 14]], [40, 30, 24]);
    erase(pm, 3, 16);
    erase(pm, 14, 16);
  },
};

// --------------------------------------------------------------- boots

const BOOTS: Record<string, Draw> = {
  leather_boots: (pm) => {
    bootOf(pm, LEATHER, { top: 3 });
    for (let x = 4; x <= 12; x++) for (const y of [3, 4]) if (pm.filled(x, y)) pm.set(x, y, lit(LEATHER, y === 3 ? 0.5 : -0.4));
  },
  // Low shoes, a little wing at the heel.
  swift_boots: (pm) => {
    bootOf(pm, ramp([170, 120, 74]), { top: 8, heel: false });
    for (let k = 0; k < 3; k++) bar(pm, 4 - k * 0.6, 10 + k, 1 - k * 0.4, 7 + k * 1.2, 1, ramp([236, 236, 244], 0.3), 0.3 - k * 0.2);
  },
  // Iron-capped, hobnailed.
  iron_boots: (pm) => {
    bootOf(pm, DARK_LEATHER, { top: 3, toe: 'square' });
    poly(pm, [[12, 11], [15, 12], [16.4, 13.4], [16.4, 15.6], [12, 15.6]], IRON, 0.2, 1.4);
    for (let x = 5; x <= 15; x += 2) pm.set(x, 16, IRON[1]);
    pm.hline(5, 11, 4, IRON[2]);
  },
  // Tall, laced, a strap at the ankle.
  travelers_boots: (pm) => {
    bootOf(pm, LEATHER, { top: 1 });
    for (let y = 3; y <= 9; y += 2) pm.set(10, y, LINEN[1]);
    pm.hline(5, 11, 1, LEATHER[0]);
    pm.hline(4, 11, 9, DARK_LEATHER[3]);
    pm.set(7, 9, BRONZE[0]);
  },
  guard_boots: (pm) => {
    bootOf(pm, DARK_LEATHER, { top: 2 });
    for (let x = 4; x <= 12; x++) for (const y of [2, 3, 4]) if (pm.filled(x, y)) pm.set(x, y, lit(CLOTH_BLUE, 0.3 - (y - 2) * 0.3));
    pm.set(8, 10, GOLD[0]);
    pm.set(9, 10, GOLD[2]);
  },
  // Waders, mud to the ankle.
  marsh_boots: (pm) => {
    bootOf(pm, MARSH, { top: 1, wide: 0.6 });
    for (let y = 11; y <= 16; y++) for (let x = 3; x <= 17; x++) if (pm.filled(x, y)) pm.set(x, y, mix(pm.get(x, y)!, [80, 60, 40], 0.5));
    dots(pm, [[7, 10], [11, 11], [6, 9]], [80, 60, 40]);
  },
  // Sabatons: the foot in overlapping plates.
  steel_boots: (pm) => {
    bootOf(pm, STEEL, { top: 3, toe: 'point' });
    for (const x of [11, 13, 15]) for (let y = 11; y <= 15; y++) if (pm.filled(x, y)) pm.set(x, y, lit(STEEL, -0.5));
    disc(pm, 8, 6, 2, 1.6, STEEL, 0.4);
  },
  // Bucket-topped, a buckle across.
  smuggler_boots: (pm) => {
    const r = ramp([120, 60, 50]);
    bootOf(pm, r, { top: 1, wide: 1.4 });
    for (let x = 3; x <= 13; x++) for (const y of [1, 2, 3]) if (pm.filled(x, y)) pm.set(x, y, lit(r, 0.4 - (y - 1) * 0.35));
    pm.hline(5, 11, 8, DARK[2]);
    pm.set(8, 8, BRONZE[0]);
  },
  // A silver greave over a blue boot.
  watcher_boots: (pm) => {
    bootOf(pm, ramp([56, 72, 120]), { top: 2 });
    poly(pm, [[4.6, 2], [9, 2], [8.6, 10], [5, 10]], SILVER, 0.2, 1.6);
    pm.set(6, 5, STAR);
  },
  // Soft and silent, wrapped.
  shadow_boots: (pm) => {
    const r = ramp([70, 60, 84], 0.4);
    bootOf(pm, r, { top: 4, heel: false, toe: 'point', sole: [40, 34, 46] });
    for (let y = 5; y <= 10; y += 2) for (let x = 4; x <= 11; x++) if (pm.filled(x, y) && (x + y) % 2) pm.set(x, y, r[3]);
  },
  mithril_boots: (pm) => {
    bootOf(pm, MITHRIL, { top: 3, toe: 'point' });
    pm.hline(5, 11, 3, GOLD[1]);
    pm.hline(5, 11, 4, GOLD[3]);
    for (const x of [12, 14]) for (let y = 12; y <= 15; y++) if (pm.filled(x, y)) pm.set(x, y, lit(MITHRIL, -0.5));
  },
  // Red, the toe curled, gold runes.
  ritual_boots: (pm) => {
    bootOf(pm, ramp([150, 40, 46]), { top: 4, toe: 'curl' });
    pm.hline(5, 11, 4, GOLD[1]);
    dots(pm, [[7, 7], [7, 9], [13, 13]], GOLD[0]);
  },
  // Les Bottes du Dernier Veilleur: tall, worn, the cuff torn.
  last_watcher_boots: (pm) => {
    bootOf(pm, ramp([70, 86, 120]), { top: 1 });
    for (const x of [5, 8, 10]) erase(pm, x, 1);
    poly(pm, [[4.8, 4], [9, 4], [8.6, 10], [5.2, 10]], SILVER, 0.1, 1.4);
    dots(pm, [[6, 12], [9, 13]], [50, 50, 60]);
  },
  // Les Bottes du passage secret: soft dark boots, a feather.
  hidden_path_boots: (pm) => {
    bootOf(pm, ramp([60, 56, 70], 0.3), { top: 5, heel: false });
    bar(pm, 11, 7, 15, 1, 1, ramp([220, 220, 230]), 0.2);
    bar(pm, 12, 7, 15.5, 2.5, 1, ramp([190, 190, 210]), -0.1);
  },
};

// --------------------------------------------------------------- gloves

const GLOVES: Record<string, Draw> = {
  leather_gloves: (pm) => gloveOf(pm, LEATHER, DARK_LEATHER),
  thief_gloves: (pm) => gloveOf(pm, DARK, DARK_LEATHER, { fingerless: true }),
  // Cloth gloves, ink on a fingertip.
  scholar_gloves: (pm) => {
    gloveOf(pm, LINEN, CLOTH_GREY, { cuffTall: 3 });
    dots(pm, [[8, 2], [9, 2], [8, 3]], [40, 50, 110]);
  },
  iron_gauntlets: (pm) => gloveOf(pm, IRON, IRON, { plate: true }),
  guard_gloves: (pm) => {
    gloveOf(pm, DARK_LEATHER, CLOTH_BLUE);
    pm.set(8, 15, GOLD[0]);
  },
  // Webbed between the fingers.
  marsh_gloves: (pm) => {
    gloveOf(pm, MARSH, REED);
    dots(pm, [[6, 5], [8, 5], [10, 5]], MARSH[3], false);
  },
  // Plate, spikes on the knuckles.
  steel_gauntlets_2: (pm) => {
    gloveOf(pm, STEEL, STEEL, { plate: true, cuffTall: 5 });
    for (const x of [5, 7, 9, 11]) pm.set(x, 7, STEEL[0]);
  },
  archivist_gloves: (pm, m) => {
    gloveOf(pm, CLOTH_PURPLE, GOLD, { cuffTall: 3 });
    pm.hline(8, 9, 5, GOLD[1]);
    pm.set(8, 5, m.gem);
  },
  watcher_gloves: (pm) => {
    gloveOf(pm, SILVER, CLOTH_BLUE, { plate: true });
    pm.set(8, 15, STAR);
  },
  // Dark, clawed.
  shadow_gloves: (pm) => gloveOf(pm, ramp([70, 60, 84], 0.4), SHADOW, { claws: [200, 200, 220] }),
  mithril_gauntlets: (pm) => gloveOf(pm, MITHRIL, GOLD, { plate: true }),
  ritual_gloves: (pm) => {
    gloveOf(pm, ramp([150, 40, 46]), GOLD);
    dots(pm, [[8, 9], [9, 10], [8, 11], [7, 10]], GOLD[0]);
  },
  // Les Gants de la Racine-mère: bark, a leaf, a vein of blight.
  corrupted_root_gloves: (pm) => {
    const bark = ramp([110, 80, 56]);
    gloveOf(pm, bark, ramp([80, 60, 44]));
    for (let y = 3; y <= 15; y += 2) for (let x = 4; x <= 13; x++) if (pm.filled(x, y) && (x + y) % 3 === 0) pm.set(x, y, bark[4]);
    dots(pm, [[13, 4], [14, 3]], MARSH[1], false);
    dots(pm, [[7, 10], [8, 11], [9, 11], [10, 12]], [196, 96, 236]);
  },
  // Les Gants du forgeron silencieux: dark leather, a hammer on the back.
  silent_smith_gloves: (pm) => {
    gloveOf(pm, ramp([66, 60, 70], 0.3), DARK_LEATHER);
    bar(pm, 7, 12, 10, 9, 1, WOOD, 0);
    bar(pm, 9, 8, 11, 10, 2, IRON, 0.3);
  },
  // Thick work gloves, patched.
  artisan_gloves: (pm) => {
    gloveOf(pm, ramp([170, 130, 84]), LEATHER, { cuffTall: 5 });
    poly(pm, [[6, 9], [9, 9], [9, 12], [6, 12]], DARK_LEATHER, 0, 1);
    dots(pm, [[6, 9], [8, 9], [6, 11], [9, 11]], LINEN[1]);
  },
};

// --------------------------------------------------------- rings & amulets

// A stone set in a ring: round, square or a cut crystal.
function stone(pm: Pixmap, cx: number, cy: number, c: RGB, cut: 'round' | 'square' | 'oval' | 'crystal' = 'round', r = 2.2): void {
  const g = ramp(c, 0.2);
  if (cut === 'square') poly(pm, [[cx - r, cy - r], [cx + r, cy - r], [cx + r, cy + r], [cx - r, cy + r]], g, 0.2, 1.2);
  else if (cut === 'crystal') poly(pm, [[cx, cy - r - 0.6], [cx + r, cy], [cx, cy + r + 0.6], [cx - r, cy]], g, 0.25, 1.4);
  else if (cut === 'oval') disc(pm, cx, cy, r * 0.75, r, g, 0.35);
  else disc(pm, cx, cy, r, r, g, 0.35);
  px(pm, cx - r * 0.45, cy - r * 0.45, mix(c, [255, 255, 255], 0.75));
}

function signetOf(pm: Pixmap, metal: typeof GOLD, mark: [number, number][]): void {
  band(pm, metal, 2, 12.5);
  poly(pm, [[5, 3], [13, 3], [14, 6], [13, 9], [5, 9], [4, 6]], metal, 0.15, 2);
  dots(pm, mark, metal[4]);
}

const RINGS: Record<string, Draw> = {
  simple_ring: (pm) => {
    band(pm, IRON, 2, 10);
    pm.set(7, 6, IRON[0]);
  },
  strength_ring: (pm, m) => {
    band(pm, BRONZE);
    stone(pm, 9.5, 5.5, m.gem, 'square', 2);
  },
  agility_ring: (pm, m) => {
    band(pm, SILVER, 1);
    stone(pm, 9.5, 6.5, m.gem, 'oval', 2);
  },
  // Leaves for prongs.
  vitality_ring: (pm, m) => {
    band(pm, GOLD);
    dots(pm, [[6, 6], [7, 5], [13, 6], [12, 5]], [100, 170, 80], false);
    stone(pm, 9.5, 5.5, m.gem, 'round', 2.2);
  },
  // A blue enamel shield for a face.
  guard_ring: (pm) => {
    band(pm, GOLD);
    poly(pm, [[6.5, 2.5], [12.5, 2.5], [12.5, 6], [9.5, 9], [6.5, 6]], GOLD, 0.1, 1);
    poly(pm, [[7.5, 3.5], [11.5, 3.5], [11.5, 5.6], [9.5, 7.6], [7.5, 5.6]], CLOTH_BLUE, 0.2, 1);
  },
  // A twist of living vine, a bud.
  marsh_ring: (pm) => {
    for (let a = 0; a < Math.PI * 2; a += 0.05) px(pm, 9.5 + Math.cos(a) * 5.4 - 0.5, 11.5 + Math.sin(a) * 4.2 - 0.5, Math.floor(a * 3) % 2 ? MARSH[1] : DARK_WOOD[1]);
    for (let a = 0; a < Math.PI * 2; a += 0.05) px(pm, 9.5 + Math.cos(a) * 4.4 - 0.5, 11.5 + Math.sin(a) * 3.3 - 0.5, Math.floor(a * 3 + 1) % 2 ? MARSH[2] : DARK_WOOD[2]);
    disc(pm, 9.5, 6, 1.6, 2, ramp([200, 120, 160]), 0.3);
    dots(pm, [[8, 7], [11, 7]], MARSH[1], false);
  },
  // Thick steel, riveted, no stone.
  steel_ring: (pm) => {
    band(pm, STEEL, 3, 10);
    for (const [x, y] of [[4, 9], [9, 6], [14, 9], [9, 13]] as [number, number][]) pm.set(x, y, STEEL[0]);
  },
  // A stone held in four claws.
  archivist_ring: (pm, m) => {
    band(pm, BRONZE);
    stone(pm, 9.5, 5.5, m.gem, 'round', 2);
    dots(pm, [[7, 3], [12, 3], [7, 8], [12, 8]], BRONZE[0], false);
  },
  watcher_ring: (pm) => {
    band(pm, SILVER);
    star(pm, 9, 5, 3);
  },
  shadow_ring: (pm) => {
    band(pm, SHADOW);
    stone(pm, 9.5, 6, VIOLET, 'oval', 2.2);
  },
  mithril_ring: (pm, m) => {
    band(pm, MITHRIL);
    stone(pm, 9.5, 5.5, m.gem, 'crystal', 2.6);
  },
  ritual_ring: (pm, m) => {
    band(pm, GOLD);
    stone(pm, 9.5, 6, m.gem, 'round', 2.2);
    dots(pm, [[4, 12], [15, 12], [9, 16], [6, 15], [13, 15]], CLOTH_RED[2]);
  },
  // Le Sceau de l'Archiviste: an eye engraved on it.
  seeker_signet: (pm) => signetOf(pm, BRONZE, [[7, 6], [8, 5], [9, 5], [10, 5], [11, 6], [8, 7], [9, 7], [10, 7], [9, 6]]),
  // Le Sceau de la garnison: a tower engraved on it.
  bregan_seal: (pm) => signetOf(pm, GOLD, [[7, 4], [9, 4], [11, 4], [8, 5], [9, 5], [10, 5], [8, 6], [10, 6], [8, 7], [9, 7], [10, 7]]),
  // A braided copper band, three small stones.
  artisan_ring: (pm, m) => {
    for (let a = 0; a < Math.PI * 2; a += 0.05) px(pm, 9.5 + Math.cos(a) * 5.2 - 0.5, 11.5 + Math.sin(a) * 4 - 0.5, Math.floor(a * 6) % 2 ? BRONZE[1] : BRONZE[3]);
    for (let a = 0; a < Math.PI * 2; a += 0.05) px(pm, 9.5 + Math.cos(a) * 4.3 - 0.5, 11.5 + Math.sin(a) * 3.1 - 0.5, Math.floor(a * 6 + 1) % 2 ? BRONZE[2] : BRONZE[4]);
    for (const x of [6, 9, 12]) gemAt(pm, x, x === 9 ? 6 : 7, m.gem);
  },
};

const AMULETS: Record<string, Draw> = {
  simple_amulet: (pm, m) => {
    chain(pm, LEATHER, 9);
    stone(pm, 9, 12, m.gem, 'round', 2.6);
    pm.hline(7, 11, 12, LEATHER[2]);
  },
  flame_amulet: (pm) => {
    chain(pm, BRONZE, 8);
    for (let y = 9; y <= 16; y++) {
      const t = (y - 9) / 7;
      const hw = Math.round(Math.sin(t * Math.PI) * 3);
      for (let x = 9 - hw; x <= 9 + hw; x++) pm.set(x, y, t < 0.4 ? [255, 230, 120] : Math.abs(x - 9) < hw ? [255, 150, 50] : [210, 70, 40]);
    }
    pm.set(9, 8, [255, 240, 160]);
  },
  // A little shield.
  ward_amulet: (pm, m) => {
    chain(pm, IRON, 8);
    poly(pm, [[5.5, 9], [12.5, 9], [12.5, 13], [9, 16.6], [5.5, 13]], STEEL, 0.1, 1.6);
    pm.vline(9, 10, 15, STEEL[3]);
    pm.hline(6, 12, 12, STEEL[3]);
    void m;
  },
  // A feather on a cord.
  swift_amulet: (pm) => {
    chain(pm, LEATHER, 8);
    poly(pm, [[9, 8], [11.6, 10], [12, 13], [9.6, 17], [7, 13.6], [7.4, 10]], ramp([236, 236, 244], 0.3), 0.1, 1.4);
    bar(pm, 9, 8, 9.6, 17, 1, LEATHER, 0.2);
  },
  // Amulette du guet: a little watch horn on a cord.
  watch_amulet: (pm) => {
    chain(pm, LEATHER, 8);
    // Curling from the mouthpiece (bottom left) up to the bell (right).
    for (let t = 0; t <= 1; t += 0.04) {
      const a = Math.PI * (0.85 - t * 0.75);
      const x = 9 + Math.cos(a) * 5;
      const y = 10.5 + Math.sin(a) * 5.4;
      disc(pm, x, y, 0.6 + t * 1.6, 0.6 + t * 1.6, BONE, 0.2 - t * 0.3);
    }
    disc(pm, 13.6, 9.6, 1.2, 1.6, ramp([70, 58, 50]), -0.4);
    for (const t of [0.35, 0.7]) {
      const a = Math.PI * (0.85 - t * 0.75);
      bar(pm, 9 + Math.cos(a) * 5, 10.5 + Math.sin(a) * 5.4 - 1.4, 9 + Math.cos(a) * 5, 10.5 + Math.sin(a) * 5.4 + 1.4, 1, BRONZE, 0.2);
    }
  },
  // A fang and green beads.
  marsh_amulet: (pm) => {
    chain(pm, LEATHER, 9, [110, 170, 90]);
    poly(pm, [[7.6, 9], [10.4, 9], [9.6, 14], [8.6, 16.8]], BONE, 0.2, 1);
  },
  // A medallion, a hammered cross.
  steel_amulet: (pm) => {
    chain(pm, STEEL, 8);
    disc(pm, 9, 12.5, 4, 4, STEEL, 0.2);
    pm.vline(9, 10, 15, STEEL[3]);
    pm.hline(7, 11, 12, STEEL[3]);
  },
  // A key.
  archivist_amulet: (pm) => {
    chain(pm, BRONZE, 7);
    hoop(pm, 9.5, 9.5, 2.2, 2.2, BRONZE, 2);
    bar(pm, 9, 11, 9, 16.5, 2, BRONZE, 0.2);
    dots(pm, [[10, 14], [11, 14], [10, 16], [11, 16]], BRONZE[1], false);
  },
  watcher_amulet: (pm) => {
    chain(pm, SILVER, 8);
    star(pm, 9, 13, 3);
  },
  // A dark drop, an eye in it.
  shadow_amulet: (pm) => {
    chain(pm, SILVER, 8);
    poly(pm, [[9, 8.4], [12.4, 13], [11.4, 16], [6.6, 16], [5.6, 13]], ramp([60, 50, 76], 0.3), 0.1, 2);
    disc(pm, 9, 13.5, 1.8, 1.2, ramp([220, 210, 230], 0.3), 0.2);
    pm.set(9, 13, VIOLET);
  },
  // A faceted crystal in a mithril cage.
  mithril_amulet: (pm, m) => {
    chain(pm, MITHRIL, 8);
    stone(pm, 9, 13, m.gem, 'crystal', 3);
    dots(pm, [[9, 9], [6, 13], [12, 13], [9, 17]], MITHRIL[0], false);
  },
  // A sun disc.
  ritual_amulet: (pm, m) => {
    chain(pm, GOLD, 8);
    disc(pm, 9, 13, 2.6, 2.6, GOLD, 0.3);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) px(pm, 9 + Math.cos(a) * 4 - 0.5, 13 + Math.sin(a) * 4 - 0.5, GOLD[1]);
    gemAt(pm, 8, 12, m.gem);
  },
  // L'Amulette du Gardien déchu: a broken shield badge.
  guardian_amulet: (pm) => {
    chain(pm, STEEL, 8);
    poly(pm, [[5, 9], [13, 9], [13, 13], [9, 17], [5, 13]], STEEL, 0.1, 1.6);
    for (const [x, y] of [[9, 9], [10, 11], [9, 13], [10, 15]] as [number, number][]) erase(pm, x, y);
  },
  // Le Pendentif d'éclat scellé: a crystal shard in a gold cage.
  shard_pendant: (pm) => {
    chain(pm, GOLD, 8);
    stone(pm, 9, 13, [150, 220, 255], 'crystal', 3);
    for (const y of [11, 14]) pm.hline(7, 11, y, GOLD[2]);
    pm.vline(9, 9, 17, GOLD[3]);
  },
  // Le Gage de la silhouette: a crescent moon on a fine chain.
  silhouette_keepsake: (pm) => {
    chain(pm, SILVER, 8);
    for (let y = 9; y <= 17; y++) for (let x = 4; x <= 14; x++) {
      const outer = (x - 9) ** 2 + (y - 13) ** 2 <= 16;
      const inner = (x - 11) ** 2 + (y - 12) ** 2 <= 10;
      if (outer && !inner) pm.set(x, y, lit(ramp([220, 226, 240], 0.2), -(x - 7) * 0.2 + 0.2));
    }
  },
  // A small hammer.
  artisan_amulet: (pm) => {
    chain(pm, LEATHER, 8);
    bar(pm, 9, 10, 9, 16.5, 1, WOOD, 0.1);
    poly(pm, [[6, 9], [12, 9], [12, 12], [6, 12]], IRON, 0.2, 1.2);
  },
};

// Everything that has its own drawing, by base id.
const FORMS: Record<string, Draw> = { ...SWORDS, ...DAGGERS, ...AXES, ...STAVES, ...BOWS, ...TOMES, ...SHIELDS, ...HELMETS, ...CHESTS, ...LEGS, ...BOOTS, ...GLOVES, ...RINGS, ...AMULETS };

// ------------------------------------------------------------ the classic
// For an item with no drawing of its own yet: the plain thing of its kind.

function classic(pm: Pixmap, spec: IconSpec, m: Materials): void {
  const t = spec.weaponType;
  if (spec.category === 'weapon' || spec.category === 'offhand') {
    if (t === 'dagger') sword(pm, m, { len: 8, w: 2.2, hx: 6, hy: 12 });
    else if (t === 'greatsword') sword(pm, m, { len: 14, w: 3, gripLen: 4, hx: 5.5, hy: 12.5 });
    else if (t === 'axe') axeOf(pm, m, { head: 'small', len: 13 });
    else if (t === 'greataxe') axeOf(pm, m, { head: 'double', len: 16 });
    else if (t === 'bow') bowOf(pm, { limbs: m.wood, grip: m.leather });
    else if (t === 'staff') {
      shaft(pm, m.wood);
      orb(pm, 13.5, 4, 2, m.gem);
    } else if (t === 'tome') book(pm, m.cloth === CLOTH_GREY ? CLOTH_RED : m.cloth, m.accent);
    else sword(pm, m, { len: 12, w: 2.4 });
  } else if (spec.category === 'shield') heater(pm, m.cloth === CLOTH_GREY ? m.wood : m.cloth, m.metal);
  else if (spec.category === 'helmet') {
    dome(pm, m.metal);
    pm.hline(3, 15, 11, m.metal[3]);
  } else if (spec.category === 'chest') torso(pm, m.leather);
  else if (spec.category === 'legs') trousers(pm, m.leather, m.accent);
  else if (spec.category === 'boots') bootOf(pm, m.leather);
  else if (spec.category === 'gloves') gloveOf(pm, m.leather, m.accent);
  else if (spec.category === 'ring') {
    band(pm, m.accent);
    orb(pm, 9.5, 6, 2, m.gem, false);
  } else if (spec.category === 'amulet') {
    chain(pm, m.accent);
    orb(pm, 9, 12, 2.6, m.gem, false);
  }
}

// --------------------------------------------------------------- motifs
// Families leave their mark on top of the drawing.

function motifs(pm: Pixmap, spec: IconSpec): void {
  const filled = (x: number, y: number) => pm.filled(x, y);
  // Le Veilleur: a small four-pointed star, where there's room.
  if (has(spec, 'veilleur', 'vigie', 'watcher')) {
    const spots: [number, number][] = [[15, 2], [2, 2], [15, 15], [2, 15]];
    const at = spots.find(([x, y]) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => !filled(x + dx, y + dy))) ?? spots[0];
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) pm.set(at[0] + dx, at[1] + dy, dx || dy ? STAR : [235, 250, 255]);
  }
  // L'Ombre: wisps of smoke curling off it.
  if (has(spec, 'ombre')) {
    for (const [x, y] of [[1, 5], [2, 4], [2, 6], [16, 13], [15, 14], [16, 15]] as [number, number][]) if (!filled(x, y)) pm.set(x, y, [150, 110, 200], 170);
  }
  // Mithril: a glint on the first edge the light meets.
  if (has(spec, 'mithril')) {
    outer: for (let s = 2; s < ICON * 2; s++) for (let x = 0; x <= s; x++) {
      const y = s - x;
      if (filled(x, y) && !filled(x - 1, y - 1)) {
        pm.set(x, y, [240, 252, 255]);
        break outer;
      }
    }
  }
}

// --------------------------------------------------------------- render

export function renderItemIcon(spec: IconSpec): Pixmap {
  const pm = new Pixmap(ICON, ICON);
  const m = materials(spec);
  const draw = FORMS[spec.baseId];
  if (draw) draw(pm, m);
  else classic(pm, spec, m);
  motifs(pm, spec);
  pm.outline(OUTLINE);
  return pm;
}


