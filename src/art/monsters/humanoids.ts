// The people who fight the hero: bandits, smugglers, the Seekers, a ruin
// delver, a knight lost to the blight, and the goblins. One figure (legs,
// body, arms, head) standing in three quarters, dressed and armed per
// monster; cloth and leather are bevelled polygons with a weave of noise.

import { RGB, Ramp, mix, noise, ramp } from '../pixmap';
import { FurOpts, Pt, ScaledCanvas, furPart, part } from '../shape';
import { BLIGHT_GLOW, BONE_WHITE, EMBER_EYE, Portrait, canvas, crack, dotsAt, finish, glowEye, halo, rimLight, tube } from './kit';

const W = 56;
const H = 72;

export const SKIN = ramp([214, 160, 124], 0.6);
const SKIN_DARK = ramp([170, 120, 92], 0.6);
const LEATHER = ramp([120, 82, 54], 0.6);
const DARK_LEATHER = ramp([82, 58, 44], 0.5);
const CLOTH_BROWN = ramp([110, 90, 70], 0.5);
const STEEL = ramp([170, 176, 190], 0.4);
const IRON = ramp([110, 112, 124], 0.4);
const GOLD = ramp([224, 178, 70], 0.6);
const WOOD = ramp([130, 92, 60], 0.6);
const BLACK_CLOTH = ramp([58, 54, 64], 0.4);

// Cloth: a faint weave and folds running down.
const cloth = (x: number, y: number) => (noise(x * 1.6, y * 0.4, 2, 5) - 0.5) * 0.35;
const worn = (x: number, y: number) => (noise(x, y, 2.5, 9) - 0.5) * 0.4;

type Weapon = 'sword' | 'dagger' | 'cutlass' | 'club' | 'pick' | 'greatsword' | 'none';
type Offhand = 'torch' | 'dagger' | 'book' | 'pistol' | 'none';
type Head = 'bare' | 'hood' | 'horned' | 'tricorn' | 'greathelm' | 'bandana';

interface Figure {
  skin?: Ramp;
  legs: Ramp;
  boots: Ramp;
  body: Ramp;
  style: 'tunic' | 'vest' | 'coat' | 'robe' | 'plate';
  trim?: Ramp; // straps, buttons, edges
  belt?: Ramp;
  cloak?: Ramp; // hangs behind, from the shoulders
  head: Head;
  headR?: Ramp; // the hood's or the helm's material
  hair?: Ramp;
  beard?: Ramp;
  mask?: Ramp; // a scarf over the mouth
  eyes?: RGB; // eyes that glow out of the shadow
  weapon: Weapon;
  weaponR?: Ramp;
  offhand: Offhand;
  arms?: Ramp; // sleeves (else the body's colour)
  bracers?: Ramp;
  pauldrons?: Ramp;
  extra?: (b: ScaledCanvas) => void; // drawn last, before the glow
  glow?: (b: ScaledCanvas) => void;
}

// The light falls from the left: everything darkens a little to the right.
const side = (x: number) => (26 - x) * 0.022;
const lightCloth = (x: number, y: number) => cloth(x, y) + side(x);
const lightWorn = (x: number, y: number) => worn(x, y) + side(x);

// A fighter's stance, turned a little towards the hero (our left): the near
// leg forward, the far one braced behind, the weapon arm raised, the off
// hand ready. The near side of the body is the bigger.
function figure(k: number, f: Figure): ReturnType<Portrait> {
  const b = canvas(W, H, k);
  const P = (pts: Pt[], r: Ramp, round = 3, bias = 0, tex: (x: number, y: number) => number = lightCloth) => part(b, pts, r, { round, bias, tex });
  const skin = f.skin ?? SKIN;
  const arms = f.arms ?? f.body;
  // The cloak first, behind everything.
  if (f.cloak) P([[14, 23], [40, 22], [46, 44], [49, 66], [43, 63], [37, 67], [29, 64], [21, 67], [14, 64], [8, 67], [10, 44]], f.cloak, 6, -0.3);
  // The far arm (our right), bent, the hand forward at the hip.
  P([[36, 23], [42, 25], [43.5, 32], [42, 38], [37.5, 37], [36, 30]], arms, 3, -0.15);
  P([[37.5, 35.5], [42.5, 37], [41, 43], [37.6, 45.4], [35, 42.6]], arms, 2.5, -0.2);
  if (f.bracers) P([[37, 38.5], [42.2, 38.8], [40.8, 43.4], [37.4, 45], [35.4, 42.4]], f.bracers, 1.4, -0.2);
  // Legs: the near one stepping forward, the far one braced.
  P([[28, 44.5], [36, 43.5], [38.2, 51], [38.4, 57], [39, 61], [33.6, 61], [32.4, 55], [29.4, 50]], f.legs, 3, -0.15);
  P([[18, 44], [27.5, 45], [25.6, 51], [21.6, 56], [20.6, 61], [14.2, 61], [14.4, 55], [16, 50]], f.legs, 3, 0.05);
  P([[33.4, 58], [39.4, 58], [40.4, 64], [45, 66.4], [45, 69], [34.6, 69], [34, 63]], f.boots, 2.5, -0.15, lightWorn);
  P([[14, 58], [21, 58], [20.6, 63], [21.6, 68.6], [10.6, 69], [11, 66.2], [13.6, 63]], f.boots, 2.5, 0.05, lightWorn);
  b.hline(14, 20, 58, f.boots[0]);
  b.hline(34, 39, 58, f.boots[1]);
  // The body.
  if (f.style === 'robe') P([[15, 24], [39, 23], [40, 40], [46, 67], [10, 67], [15, 40]], f.body, 5, 0);
  else if (f.style === 'coat') {
    P([[15, 24], [39, 23], [38, 40], [42, 59], [31, 57], [27, 56], [23, 57], [11, 59], [16, 40]], f.body, 5, 0);
    crack(b, [[27, 40], [27, 56]], f.body[4]);
  } else P([[15, 25], [20, 22], [34, 21], [39, 24], [37.4, 34], [35.4, 46], [18.6, 46], [16.6, 35]], f.body, 5, 0, f.style === 'plate' ? side : lightCloth);
  // Folds where the cloth gathers at the waist and the shoulder.
  if (f.style !== 'plate') {
    crack(b, [[20, 30], [22, 36]], f.body[3]);
    crack(b, [[33, 29], [32, 35]], f.body[4]);
  }
  if (f.style === 'plate') {
    for (let y = 26; y <= 38; y++) b.set(25, y, f.body[0]);
    for (const y of [40, 43]) b.hline(19, 35, y, f.body[4]);
  }
  if (f.style === 'vest' && f.trim) {
    P([[21, 24], [31, 23], [30, 41], [22, 41]], f.trim, 2, 0.15);
    crack(b, [[17, 26], [35, 44]], DARK_LEATHER[3]);
    crack(b, [[18, 26], [36, 44]], DARK_LEATHER[1]);
  }
  if (f.belt) {
    P([[18, 43], [36, 42.4], [36, 45.8], [18, 46.4]], f.belt, 1.2, 0.1);
    P([[23, 42.6], [27, 42.4], [27, 46.4], [23, 46.6]], GOLD, 1, 0.2);
  }
  if (f.pauldrons) P([[34, 24], [36, 19], [43, 19], [46, 24], [44, 29], [38, 29]], f.pauldrons, 3, -0.1, side);
  // The near arm (our left), raised with the weapon.
  P([[13, 23], [20, 24.6], [18.4, 32], [14, 37], [9, 35], [10, 28]], arms, 3, 0.1);
  P([[9, 33.6], [14.4, 35.6], [13.6, 41], [9.4, 42.6], [7, 39.4]], arms, 2.5, 0.05);
  if (f.bracers) P([[8.4, 35.4], [14, 37.4], [13.4, 41.2], [9.4, 42.6], [7, 39.4]], f.bracers, 1.4, 0.05);
  if (f.pauldrons) P([[8, 26], [11, 19], [19, 19], [21, 25], [17, 30], [10, 31]], f.pauldrons, 3, 0.15, side);
  // The weapon in the near hand, then the hands.
  weapon(b, f.weapon, f.weaponR ?? STEEL);
  const handR = f.style === 'plate' ? f.body : skin;
  P([[7.6, 39.6], [13, 39.6], [13, 44.4], [8, 44.4]], handR, 2, 0.1, side);
  P([[35.4, 42.4], [40.4, 42.4], [40, 47], [35.6, 47]], handR, 2, -0.1, side);
  offhand(b, f.offhand);
  // Neck and head, turned towards the hero.
  P([[24, 19], [30, 19], [30, 24], [24, 24]], skin, 2, -0.25, side);
  head(b, f, skin);
  f.extra?.(b);
  rimLight(b, W, H, [236, 228, 214], 0.35);
  return finish(b, [27, 69, 17, 2.5], [27, 69], f.glow);
}

function head(b: ScaledCanvas, f: Figure, skin: Ramp): void {
  const P = (pts: Pt[], r: Ramp, round = 3, bias = 0, tex: (x: number, y: number) => number = side) => part(b, pts, r, { round, bias, tex });
  const hair = (x: number, y: number) => (noise(x * 2, y * 0.5, 1.5, 3) - 0.5) * 0.5 + side(x);
  const face = () => {
    // Three quarters to our left: the nose breaks the outline on the left,
    // the far eye smaller, an ear on the right.
    P([[22, 9], [24, 4.4], [29, 3], [33, 5.4], [34, 11], [33.4, 17], [30, 21], [25, 21], [22, 18], [21, 14.6], [20.4, 13.4], [21.6, 12]], skin, 3, 0.1);
    P([[32.4, 11], [34.6, 10.4], [35, 14.6], [33, 15.4]], skin, 1, -0.15);
    if (!f.eyes) {
      dotsAt(b, [[23, 12], [24, 12], [28, 12], [29, 12]], [40, 30, 30]);
      dotsAt(b, [[23, 11], [24, 10], [28, 10], [29, 11]], skin[4]); // brows
      dotsAt(b, [[22, 14], [22, 15], [23, 16]], skin[3]); // the nose's shadow
      dotsAt(b, [[23, 18], [24, 18], [25, 18], [26, 18]], skin[4]);
    }
    if (f.beard) P([[21.6, 15], [24, 18.4], [29, 18.4], [33.4, 15], [33, 21], [30, 25.4], [25, 25.4], [22, 21]], f.beard, 2.5, 0.05, hair);
    if (f.mask) P([[21.4, 15], [33.4, 15], [33, 20.4], [27, 22.6], [22, 20.4]], f.mask, 2, 0);
  };
  switch (f.head) {
    case 'bare':
      face();
      if (f.hair) P([[21, 11], [22, 5], [26, 2.4], [31, 2.6], [34.4, 6.4], [34.4, 11], [32, 7], [24, 7]], f.hair, 2, 0.1, hair);
      break;
    case 'bandana': {
      face();
      const r = f.headR ?? ramp([170, 50, 50]);
      P([[21, 10], [22, 5], [26, 2.4], [31, 2.6], [34.4, 6.4], [34.4, 10], [27, 7.6]], r, 2, 0.1);
      P([[33.4, 7.6], [37.4, 8.6], [38.6, 13], [35.4, 11]], r, 1.2, -0.1);
      break;
    }
    case 'hood': {
      const r = f.headR ?? f.body;
      P([[17.6, 22], [18.6, 9], [22, 3], [27, 1.2], [32, 2.6], [36, 8], [37, 22], [32.4, 25], [22, 25]], r, 5, 0.05, lightCloth);
      P([[21.6, 8.6], [31.4, 8.6], [32, 18], [29.6, 22], [24, 22], [21.4, 18]], ramp([34, 28, 34], 0.2), 2, -0.4);
      if (!f.eyes) {
        P([[23, 13.6], [30, 13.6], [29.6, 21], [24, 21]], skin, 2, -0.45);
        dotsAt(b, [[23, 15], [24, 15], [28, 15], [29, 15]], [30, 24, 26]);
      }
      if (f.mask) P([[22, 16.4], [31.4, 16.4], [31, 21.6], [27, 23], [22.4, 21.6]], f.mask, 2, 0);
      if (f.beard) P([[22.6, 18], [30.6, 18], [30.6, 24], [28.6, 29], [24.6, 29], [22.6, 24]], f.beard, 2.5, 0.1, hair);
      break;
    }
    case 'horned': {
      face();
      const r = f.headR ?? IRON;
      P([[20.6, 12], [21.4, 5.6], [25, 2], [31, 2.2], [34.4, 5.6], [34.6, 12], [27, 10.4]], r, 3, 0.15);
      P([[24.4, 5.6], [26.4, 5.6], [26, 16], [24, 16]], r, 1, 0.2); // the nasal
      tube(b, [[21.6, 7.6], [17, 5.6], [15, 1], [16.6, -1.4]], (t) => 1.9 - t * 1.2, ramp([226, 214, 186], 0.5));
      tube(b, [[33.6, 7.6], [38, 5.6], [40, 1], [38.6, -1.4]], (t) => 1.7 - t * 1.1, ramp([200, 188, 160], 0.5));
      break;
    }
    case 'tricorn': {
      face();
      const r = f.headR ?? BLACK_CLOTH;
      P([[14.6, 8.4], [21, 3.6], [27, 1], [33, 3.4], [39.4, 7.4], [33, 8.6], [27, 7.2], [21, 8.8]], r, 2, 0.1, lightCloth);
      for (let x = 15; x <= 39; x++) if (b.filled(x, 8) && !b.filled(x, 9)) b.set(x, 8, GOLD[1]);
      break;
    }
    case 'greathelm': {
      const r = f.headR ?? IRON;
      P([[20.6, 22], [20, 8], [23, 2.6], [31, 2.6], [34.4, 8], [34, 22]], r, 4, 0.05);
      b.hline(21, 33, 11, [16, 12, 22]);
      b.hline(22, 32, 12, [16, 12, 22]);
      for (let y = 3; y <= 21; y++) if (y !== 11 && y !== 12) b.set(25, y, r[0]);
      for (const [x, y] of [[29, 15], [31, 15], [29, 17], [31, 17]] as [number, number][]) b.set(x, y, [16, 12, 22]);
      break;
    }
  }
}

function weapon(b: ScaledCanvas, w: Weapon, r: Ramp): void {
  const P = (pts: Pt[], rr: Ramp, round = 1.5, bias = 0) => part(b, pts, rr, { round, bias });
  // The near hand grips at about (10, 42); blades rise from it.
  switch (w) {
    case 'sword':
      tube(b, [[9.4, 39], [7, 26], [5.6, 15]], (t) => 1.7 - t * 0.9, r, { bias: 0.25 });
      P([[5, 38], [14.6, 37], [14.6, 39], [5, 40]], GOLD, 1, 0.1);
      tube(b, [[10.6, 44], [11, 47]], () => 1, DARK_LEATHER);
      b.set(11, 48, GOLD[0]);
      break;
    case 'greatsword':
      // Held point down in front, both hands on the grip.
      tube(b, [[12, 44], [16, 56], [19, 68]], (t) => 2.6 - t * 1.4, r, { bias: 0.2 });
      P([[6, 42], [18, 44], [17.6, 46], [5.6, 44]], r, 1, 0.1);
      tube(b, [[9.4, 37], [11, 42]], () => 1.2, DARK_LEATHER);
      break;
    case 'cutlass':
      tube(b, [[9.6, 39], [7, 31], [7, 23], [9, 17]], (t) => 1.5 + Math.sin(t * Math.PI) * 0.6 - t * 0.6, r, { bias: 0.25 });
      tube(b, [[6, 41], [6, 37], [10, 36.4], [14, 38]], () => 0.8, GOLD); // the basket
      break;
    case 'dagger':
      tube(b, [[9.6, 39], [8.6, 33], [8.2, 30]], (t) => 1.4 - t * 0.9, r, { bias: 0.25 });
      P([[6.6, 38.6], [13, 38], [13, 39.6], [6.6, 40.2]], DARK_LEATHER, 1, 0.1);
      break;
    case 'club':
      tube(b, [[10.4, 44], [8, 32], [5, 18]], (t) => 1.4 + t * 2.4, WOOD, { bias: 0.15 });
      for (const [x, y] of [[3, 19], [7, 18], [4, 24], [8, 23], [5, 28]] as [number, number][]) b.set(x, y, IRON[0]);
      break;
    case 'pick':
      tube(b, [[10.4, 46], [8.6, 32], [7.6, 22]], () => 1.1, WOOD, { bias: 0.1 });
      tube(b, [[0.6, 26], [7.6, 21.6], [15, 21], [17, 23]], (t) => 1.5 - Math.abs(t - 0.45) * 1.4, IRON, { bias: 0.25 });
      break;
    default:
  }
}

function offhand(b: ScaledCanvas, o: Offhand): void {
  const P = (pts: Pt[], r: Ramp, round = 1.5, bias = 0) => part(b, pts, r, { round, bias });
  // The far hand is at about (38, 45).
  switch (o) {
    case 'torch':
      tube(b, [[38, 47], [41.5, 34], [44.6, 22]], () => 1.2, WOOD);
      P([[43, 23.6], [47.4, 23.6], [47.4, 20.4], [43, 20.4]], DARK_LEATHER, 1);
      break;
    case 'dagger':
      tube(b, [[38.6, 47], [41, 53], [42, 55]], (t) => 1.3 - t * 0.8, STEEL, { bias: 0.1 });
      break;
    case 'book':
      P([[36, 39], [45, 37.6], [46, 49], [37, 50.4]], ramp([110, 50, 50], 0.5), 1.4, 0.05);
      P([[45, 38], [46.4, 38], [47, 49], [46, 49]], ramp([230, 220, 196], 0.5), 0.5, 0.1);
      dotsAt(b, [[41, 43], [40, 44], [41, 45], [42, 44]], GOLD[1]);
      break;
    case 'pistol':
      P([[37, 44], [47, 41.6], [47.4, 44], [39, 46.4]], IRON, 1, 0.15);
      P([[36, 44.4], [39, 44.4], [38.4, 49.4], [35.6, 48.4]], WOOD, 1, 0);
      break;
    default:
  }
}

// ---------------------------------------------------------------- bandits

// Le bandit: a hood, a scarf over the face, a leather vest, a short sword.
export const bandit_thug: Portrait = (k) =>
  figure(k, {
    legs: CLOTH_BROWN, boots: DARK_LEATHER, body: ramp([132, 112, 92], 0.5), style: 'vest', trim: LEATHER, belt: DARK_LEATHER,
    head: 'hood', headR: ramp([92, 74, 62], 0.5), mask: ramp([70, 60, 56], 0.4), weapon: 'sword', offhand: 'none', bracers: DARK_LEATHER,
  });

// Le chef bandit: a horned helm, a red cape, mail under leather, a beard,
// and the sword of a man who used to be a soldier.
export const bandit_leader: Portrait = (k) =>
  figure(k * 1.08, {
    legs: DARK_LEATHER, boots: ramp([62, 46, 38], 0.5), body: IRON, style: 'plate', belt: LEATHER, cloak: ramp([150, 44, 44], 0.6),
    head: 'horned', beard: ramp([120, 80, 52], 0.6), weapon: 'sword', offhand: 'none', pauldrons: IRON, arms: DARK_LEATHER, bracers: LEATHER,
    extra: (b) => {
      // Mail showing at the hips; scars.
      for (let x = 18; x <= 38; x += 2) for (let y = 44; y <= 48; y += 2) if (b.filled(x, y)) b.set(x, y, IRON[3]);
      dotsAt(b, [[31, 10], [32, 11], [32, 12]], ramp([200, 120, 110])[2]);
    },
  });

// ------------------------------------------------------------- smugglers

// Le contrebandier: all in black, a deep hood, a mask, a long knife.
export const smuggler_thug: Portrait = (k) =>
  figure(k, {
    legs: BLACK_CLOTH, boots: ramp([46, 40, 46], 0.4), body: ramp([66, 62, 72], 0.4), style: 'tunic', belt: DARK_LEATHER, cloak: ramp([44, 42, 52], 0.4),
    head: 'hood', headR: ramp([48, 46, 56], 0.4), mask: ramp([30, 28, 36], 0.3), weapon: 'dagger', offhand: 'dagger', bracers: DARK_LEATHER,
  });

// Le lieutenant: bare-headed, a red bandana, a laced vest, a cutlass and a
// pistol in his belt-hand.
export const smuggler_lieutenant: Portrait = (k) =>
  figure(k, {
    legs: ramp([90, 74, 60], 0.5), boots: DARK_LEATHER, body: ramp([200, 190, 170], 0.4), style: 'vest', trim: ramp([128, 54, 44], 0.6), belt: DARK_LEATHER,
    head: 'bandana', headR: ramp([170, 48, 46], 0.6), beard: ramp([80, 56, 40], 0.5), weapon: 'cutlass', offhand: 'pistol', bracers: LEATHER,
  });

// Le capitaine: a tricorn, a long coat with gold, a black cape, a cutlass.
export const smuggler_capitain_coat = ramp([118, 70, 46], 0.6);
export const smuggler_captain: Portrait = (k) =>
  figure(k * 1.08, {
    legs: ramp([200, 186, 150], 0.4), boots: ramp([50, 40, 36], 0.4), body: smuggler_capitain_coat, style: 'coat', belt: DARK_LEATHER, cloak: BLACK_CLOTH,
    head: 'tricorn', beard: ramp([60, 44, 36], 0.4), weapon: 'cutlass', weaponR: STEEL, offhand: 'pistol',
    extra: (b) => {
      // Gold buttons and cuffs, a white cravat.
      for (const y of [28, 32, 36]) dotsAt(b, [[24, y], [30, y]], GOLD[0]);
      for (const [x, y] of [[8, 39], [9, 39], [10, 39], [11, 39], [12, 39], [36, 41], [37, 41], [38, 41], [39, 41]] as [number, number][]) b.set(x, y, GOLD[1]);
      part(b, [[24, 21], [28, 21], [27.5, 27], [24.5, 27]], ramp([236, 232, 220], 0.4), { round: 1, bias: 0.1 });
    },
  });

// ---------------------------------------------------------------- seekers

// L'éclaireur des Chercheurs: a brown hood with only the red of the eyes in
// it, the Seekers' sign on the chest, darts.
export const seeker_scout: Portrait = (k) =>
  figure(k, {
    legs: ramp([80, 66, 56], 0.5), boots: DARK_LEATHER, body: ramp([104, 86, 70], 0.5), style: 'robe', belt: DARK_LEATHER,
    head: 'hood', headR: ramp([96, 78, 64], 0.5), eyes: [255, 50, 50], weapon: 'dagger', offhand: 'none', bracers: DARK_LEATHER,
    extra: (b) => {
      // The sign: a broken circle round a shard.
      for (const [x, y] of [[24, 30], [25, 29], [27, 29], [28, 30], [29, 32], [28, 34], [24, 34], [23, 32], [26, 31], [26, 32], [26, 33]] as [number, number][]) b.set(x, y, [170, 50, 54]);
    },
    glow: (b) => {
      glowEye(b, 23, 15, [255, 50, 50], 3, false);
      glowEye(b, 28, 15, [255, 50, 50], 3, false);
    },
  });

// L'archiviste des Chercheurs: old, hooded, a long grey beard, a heavy
// book of forbidden rites and scrolls at his belt.
export const seeker_archivist: Portrait = (k) =>
  figure(k * 1.05, {
    legs: ramp([80, 66, 70], 0.4), boots: DARK_LEATHER, body: ramp([96, 70, 84], 0.5), style: 'robe', belt: ramp([120, 90, 50], 0.6),
    head: 'hood', headR: ramp([84, 62, 74], 0.5), beard: ramp([196, 196, 200], 0.3), skin: SKIN_DARK, weapon: 'none', offhand: 'book',
    extra: (b) => {
      // Scrolls rolled at the belt; a glow of the forbidden spell in his hand.
      for (const x of [29, 32]) part(b, [[x, 44], [x + 2.4, 44], [x + 2.4, 53], [x, 53]], ramp([226, 210, 170], 0.5), { round: 1, bias: 0.05 });
    },
    glow: (b) => {
      halo(b, 10, 38, 5, [200, 120, 255], 140);
      b.set(10, 37, [240, 220, 255]);
    },
  });

// --------------------------------------------------------------- others

// Le pilleur de ruines: a hood, a pack on his back, a pick in one hand and a
// torch in the other.
export const ruins_delver: Portrait = (k) =>
  figure(k, {
    legs: ramp([96, 84, 66], 0.5), boots: DARK_LEATHER, body: ramp([120, 100, 74], 0.5), style: 'tunic', belt: DARK_LEATHER,
    head: 'hood', headR: ramp([110, 92, 70], 0.5), mask: ramp([150, 140, 120], 0.4), weapon: 'pick', offhand: 'torch', bracers: LEATHER,
    extra: (b) => {
      // The pack's straps, a rope coil at the hip.
      crack(b, [[19, 24], [21, 42]], DARK_LEATHER[3]);
      crack(b, [[34, 23], [33, 42]], DARK_LEATHER[3]);
      tube(b, [[28, 47], [32, 49], [30, 53], [26, 51], [28, 47]], () => 1, ramp([190, 170, 120], 0.5));
    },
    glow: (b) => {
      // The flame.
      halo(b, 45, 16, 9, [255, 160, 60], 130);
      part(b, [[42.6, 20.6], [44, 15], [45.4, 10.6], [47, 15], [48, 20.6]], ramp([255, 170, 60], 0.3), { round: 1.6, bias: 0.3 });
      part(b, [[44.4, 20.4], [45.4, 15], [46.6, 20.4]], ramp([255, 240, 170], 0.3), { round: 1, bias: 0.5 });
    },
  });

// Le chevalier corrompu: black plate cracked with violet light, a great
// helm, a greatsword point down, a cape in tatters.
export const corrupted_knight: Portrait = (k) =>
  figure(k * 1.06, {
    legs: ramp([64, 60, 74], 0.4), boots: ramp([56, 52, 66], 0.4), body: ramp([72, 68, 84], 0.4), style: 'plate', cloak: ramp([50, 40, 56], 0.4),
    head: 'greathelm', headR: ramp([70, 66, 82], 0.4), weapon: 'greatsword', weaponR: ramp([120, 114, 136], 0.4), offhand: 'none', pauldrons: ramp([78, 72, 90], 0.4),
    arms: ramp([66, 62, 78], 0.4),
    extra: (b) => {
      // Greaves over the legs, the cape torn at the hem.
      crack(b, [[28, 27], [31, 31], [30, 36], [33, 39]], BLIGHT_GLOW);
      crack(b, [[19, 30], [21, 34]], BLIGHT_GLOW);
      crack(b, [[40, 25], [42, 29]], BLIGHT_GLOW);
      crack(b, [[34, 48], [35, 53]], BLIGHT_GLOW);
    },
    glow: (b) => {
      b.hline(22, 32, 11, [200, 120, 255]);
      halo(b, 27, 11.5, 6, BLIGHT_GLOW, 110);
      halo(b, 30, 33, 6, BLIGHT_GLOW, 60);
    },
  });

// ---------------------------------------------------------------- goblins

const GOBLIN = ramp([118, 140, 80], 0.6);
const GOBLIN_DARK = ramp([92, 112, 66], 0.6);

interface Goblin {
  skin: Ramp;
  bulk: number; // 1 a scout, more for a brute
  body: Ramp;
  hood?: Ramp;
  skullHelm?: boolean;
  fur?: Ramp; // a fur mantle
  weapon: 'dagger' | 'club' | 'axe';
}

// Goblins: short, hunched, knees bent wide, a big head thrust forward with
// long ears and a hooked nose; limbs drawn as tubes, wiry.
function goblin(k: number, g: Goblin): ReturnType<Portrait> {
  const GW = 64;
  const GH = 60;
  const b = canvas(GW, GH, k);
  const s = g.bulk;
  const X = (x: number) => 32 + (x - 28) * s;
  const pts = (p: [number, number][]): Pt[] => p.map(([x, y]) => [X(x), y]);
  const P = (p: [number, number][], r: Ramp, round = 3, bias = 0, tex: (x: number, y: number) => number = side) => part(b, pts(p), r, { round, bias, tex });
  const limb = (p: [number, number][], w0: number, w1: number, r: Ramp, bias = 0) => tube(b, pts(p), (t) => (w0 + (w1 - w0) * t) * (0.8 + s * 0.2), r, { bias });
  const skin = g.skin;
  const dark = mix(skin[3], [20, 30, 20], 0.2);
  void dark;
  // The far arm, hanging, claws loose.
  limb([[38, 25], [43, 32], [42, 39]], 2.6, 2, skin, -0.25);
  P([[39.4, 38], [44.4, 38], [44, 43], [40, 43]], skin, 1.6, -0.2);
  // Legs bent wide, big flat feet with claws.
  limb([[32, 39], [38, 46], [37, 54]], 3.2, 2.4, skin, -0.2);
  limb([[24, 39], [18, 46], [19, 54]], 3.2, 2.4, skin, 0.05);
  P([[32, 53.4], [42, 53.4], [43, 57.6], [31.6, 57.6]], GOBLIN_DARK, 1.2, -0.15);
  P([[13, 53.4], [23, 53.4], [23.6, 57.6], [12, 57.6]], GOBLIN_DARK, 1.2, 0);
  for (const x of [13, 16, 32, 35]) b.set(Math.round(X(x)), 57, BONE_WHITE);
  // The body, hunched, a pot belly; the rag or hide round the loins.
  P([[18, 25], [25, 20], [34, 21], [39, 26], [39.6, 33], [36.6, 41], [20, 41], [17, 34]], skin, 5, 0);
  P([[21, 31], [33, 30], [36, 36], [33, 40.6], [23, 40.6], [20, 36]], skin, 4, 0.12); // the belly
  P([[19, 36.4], [37, 36.4], [37.4, 42], [33, 46.6], [28, 43], [23, 46.6], [18.6, 42]], g.body, 3, 0, lightWorn);
  if (g.fur) furPart(b, pts([[11, 22], [21, 17], [34, 17], [45, 22], [46, 29], [38, 27], [28, 29], [18, 27], [10, 29]]), g.fur, { round: 4, dir: Math.PI / 2, tufts: 0.8, seed: 61, bias: 0.1 } as FurOpts);
  if (g.bulk > 1.2 && !g.fur) {
    // The brute's shoulder plate, spiked.
    P([[12, 22], [20, 18], [24, 23], [20, 29], [13, 29]], IRON, 2.5, 0.15);
    for (const [x, y] of [[14, 19], [18, 17], [21, 19]] as [number, number][]) part(b, pts([[x - 1.2, y + 2], [x, y - 3], [x + 1.2, y + 2]]), IRON, { round: 1, bias: 0.35 });
  }
  // The weapon arm: raised over the head with a club or an axe, low and
  // forward with a knife.
  const raised = g.weapon !== 'dagger';
  const hand: [number, number] = raised ? [6.6, 19] : [11, 42];
  const elbow: [number, number] = raised ? [7.6, 30] : [10, 34];
  limb([[18, 25], elbow, hand], 2.8, 2.2, skin, 0.1);
  if (g.weapon === 'dagger') tube(b, pts([[11, 42], [7.6, 47], [5.6, 50]]), (t) => 1.5 - t * 1, STEEL, { bias: 0.25 });
  if (g.weapon === 'club') {
    tube(b, pts([[6.8, 21], [6, 11], [5.6, 1.6]]), (t) => 1.6 + t * 2.8, WOOD, { bias: 0.15 });
    for (const [x, y] of [[3.6, 4], [7.6, 3], [4, 8], [7.6, 7], [5.6, 1]] as [number, number][]) b.set(Math.round(X(x)), y, IRON[0]);
  }
  if (g.weapon === 'axe') {
    tube(b, pts([[6.8, 22], [6.6, 11], [6.4, 1.6]]), () => 1.3, WOOD, { bias: 0.1 });
    part(b, pts([[7.4, 2.6], [12.6, -0.4], [14.6, 6], [12.6, 11], [7.4, 8.6]]), IRON, { round: 2, bias: 0.15 });
  }
  P([[hand[0] - 3, hand[1] - 2.6], [hand[0] + 3, hand[1] - 2.6], [hand[0] + 2.6, hand[1] + 2.6], [hand[0] - 2.6, hand[1] + 2.6]], skin, 1.6, 0.1);
  // The head, big and low, thrust forward.
  P([[34, 11], [42, 7], [50, 5.6], [44, 13], [35, 16.6]], skin, 2, -0.1);
  P([[21, 11], [12, 6], [4.6, 4.6], [10.6, 12], [19, 16.6]], skin, 2, 0.2);
  for (const [x, y] of [[11, 8], [13, 9], [15, 10], [43, 9], [45, 8], [41, 10]] as [number, number][]) b.set(Math.round(X(x)), y, ramp([190, 120, 110])[2]); // inside the ears
  P([[19, 14], [20, 8], [25, 4], [31, 4], [35, 8], [36, 14], [34, 21], [29, 25], [24, 25], [20, 21]], skin, 4, 0.05);
  P([[22.6, 13], [24, 13.6], [22.6, 17.4], [18.6, 20.4], [17.4, 19], [20, 16.6]], skin, 1.4, 0.3); // the hooked nose
  for (const x of [22, 23, 24, 25, 26, 27, 28, 29, 30]) b.set(Math.round(X(x)), x < 23 || x > 29 ? 21 : 22, [60, 30, 30]);
  for (const x of [23, 26, 29]) b.set(Math.round(X(x)), 22, [236, 226, 180]);
  for (const x of [22, 30]) b.set(Math.round(X(x)), 20, [236, 226, 180]); // tusks
  for (const x of [21, 22, 23, 28, 29, 30]) b.set(Math.round(X(x)), x === 21 || x === 30 ? 10 : 9, skin[4]); // heavy brows
  if (g.hood) P([[18, 20], [19, 9], [23, 2.6], [28, 1], [33, 2.6], [37, 9], [38, 20], [34.6, 12], [21.4, 12]], g.hood, 4, 0.05, lightCloth);
  if (g.skullHelm) {
    P([[19.6, 9], [21.6, 2.6], [28, 0.6], [34.4, 2.6], [36.4, 9], [33, 11], [23, 11]], ramp([224, 212, 182], 0.5), 3, 0.15);
    for (const [x, y] of [[24, 6], [25, 6], [25, 7], [31, 6], [32, 6], [31, 7]] as [number, number][]) b.set(Math.round(X(x)), y, [40, 30, 30]);
    tube(b, pts([[21, 4], [15, 1.4], [12, -1.4]]), (t) => 1.8 - t * 1.2, ramp([214, 200, 170], 0.5));
    tube(b, pts([[35, 4], [41, 1.4], [44, -1.4]]), (t) => 1.8 - t * 1.2, ramp([194, 180, 150], 0.5));
    // A necklace of teeth.
    for (const x of [22, 25, 28, 31, 34]) b.set(Math.round(X(x)), x === 28 ? 31 : 30, BONE_WHITE);
  }
  rimLight(b, GW, GH, [236, 240, 200], 0.35);
  return finish(b, [32, 57, 15 * s, 2.5], [32, 57], (bb) => {
    glowEye(bb, Math.round(X(23)), 13, [255, 210, 60], 2.5, false);
    glowEye(bb, Math.round(X(29)), 13, [255, 210, 60], 2.5, false);
  });
}

// L'éclaireur gobelin: small, in a ragged hood, a rusty knife.
export const goblin_scout: Portrait = (k) =>
  goblin(k * 0.92, { skin: GOBLIN, bulk: 1, body: ramp([110, 92, 66], 0.5), hood: ramp([104, 84, 60], 0.5), weapon: 'dagger' });

// Le gobelin brutal: twice as wide, a studded club.
export const goblin_brute: Portrait = (k) =>
  goblin(k * 1.08, { skin: ramp([108, 128, 76], 0.6), bulk: 1.3, body: ramp([96, 76, 58], 0.5), weapon: 'club' });

// Le chef gobelin: a helm made of a horned skull, a fur mantle, an axe.
export const goblin_chief: Portrait = (k) =>
  goblin(k * 1.15, { skin: ramp([112, 136, 78], 0.6), bulk: 1.18, body: ramp([120, 60, 50], 0.5), skullHelm: true, fur: ramp([120, 100, 80], 0.5), weapon: 'axe' });

export const HUMANOID_PORTRAITS: Record<string, Portrait> = {
  bandit_thug,
  bandit_leader,
  smuggler_thug,
  smuggler_lieutenant,
  smuggler_captain,
  seeker_scout,
  seeker_archivist,
  ruins_delver,
  corrupted_knight,
  goblin_scout,
  goblin_brute,
  goblin_chief,
};

void [EMBER_EYE];
