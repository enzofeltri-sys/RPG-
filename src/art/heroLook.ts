// Visible equipment: what you see is what you wear.
//
// With nothing equipped a hero wears their class clothes, plus the class's
// signature headgear (mage hat, archer and rogue hoods, cleric circlet);
// each equipped item replaces its layer. The item's family (leather, guard,
// marsh, steel, archivist, watcher, shadow, mithril, ritual, garrison…)
// gives the material, its category and weapon type give the shape, and an
// epic or legendary item gets a purple or gold trim. Rings don't show; an
// amulet adds a small glint at the neck.

import { CharClass, Character, Race } from '../game/character';
import { Item } from '../game/item';
import {
  BLUE,
  CHARCOAL,
  CLOTH_BROWN,
  DARK_LEATHER,
  FOREST,
  GOLD,
  GREEN,
  Gear,
  IRON,
  LEATHER,
  Look,
  MITHRIL,
  PURPLE,
  RED,
  STEEL,
  Tones,
  WHITE,
  WOOD,
} from './heroDoll';

const MARSH: Tones = [[150, 160, 96], [102, 114, 68], [62, 72, 48]];
const WATCH: Tones = [[156, 176, 206], [94, 112, 150], [52, 64, 98]];
const CRIMSON: Tones = [[226, 104, 100], [156, 44, 54], [92, 26, 38]];
const EMBER: Tones = [[255, 190, 110], [240, 120, 60], [170, 60, 40]];
const FROST: Tones = [[200, 240, 255], [110, 190, 232], [60, 120, 180]];

// Family keyword in the item id -> material and trim (first match wins).
const FAMILIES: [string, Tones, Tones | undefined][] = [
  ['mithril', MITHRIL, STEEL],
  ['shadow', CHARCOAL, PURPLE],
  ['ritual', CRIMSON, GOLD],
  ['watch', WATCH, STEEL],
  ['archivist', PURPLE, GOLD],
  ['garrison', IRON, RED],
  ['bregan', IRON, RED],
  ['guard', IRON, BLUE],
  ['sentry', IRON, BLUE],
  ['patrol', IRON, BLUE],
  ['militia', IRON, undefined],
  ['steel', STEEL, undefined],
  ['iron', IRON, undefined],
  ['marsh', MARSH, undefined],
  ['smuggler', DARK_LEATHER, RED],
  ['purified', WHITE, GOLD],
  ['order', STEEL, GOLD],
  ['sealed', STEEL, GOLD],
  ['blackened', CHARCOAL, RED],
  ['frost', FROST, undefined],
  ['flame', EMBER, undefined],
];

// Weapons made of plain wood whatever their family.
const WOODEN = ['branch', 'wicker', 'novice', 'gnarled', 'study', 'short_bow', 'hunting', 'reinforced_bow', 'composite'];
const METALS = [IRON, STEEL, MITHRIL, WATCH];

function family(baseId: string): { mat?: Tones; trim?: Tones } {
  const hit = FAMILIES.find(([k]) => baseId.includes(k));
  return hit ? { mat: hit[1], trim: hit[2] } : {};
}

export function itemGear(item: Item): Gear | undefined {
  const { baseId, category, rarity } = item;
  const fam = family(baseId);
  const mat = fam.mat;
  const trim = rarity === 'epic' ? PURPLE : rarity === 'legendary' ? GOLD : fam.trim;
  const metal = !!mat && METALS.includes(mat);
  switch (category) {
    case 'helmet':
      if (baseId.includes('hood')) return { shape: 'hood', mat: mat ?? DARK_LEATHER, trim };
      if (baseId.includes('circlet')) return { shape: 'circlet', mat: GOLD, trim: trim ?? BLUE };
      if (baseId === 'leather_helmet') return { shape: 'cap', mat: LEATHER, trim };
      if (baseId === 'iron_cap') return { shape: 'cap', mat: IRON, trim };
      return { shape: trim ? 'plumed' : 'helm', mat: mat ?? IRON, trim };
    case 'chest':
      if (baseId.includes('robe')) return { shape: 'robe', mat: mat ?? CLOTH_BROWN, trim: trim ?? GOLD };
      if (baseId.includes('chainmail')) return { shape: 'chain', mat: IRON, trim };
      if (baseId === 'leather_chest') return { shape: 'leather', mat: LEATHER, trim };
      if (baseId.includes('vest')) return { shape: 'jerkin', mat: mat ?? CLOTH_BROWN, trim };
      return { shape: 'plate', mat: mat ?? IRON, trim };
    case 'legs':
      return { shape: metal || baseId.includes('greaves') ? 'greaves' : 'pants', mat: mat ?? LEATHER, trim };
    case 'boots':
      return {
        shape: metal || baseId.includes('iron') ? 'sabatons' : 'boots',
        mat: mat ?? LEATHER,
        trim: rarity === 'epic' || rarity === 'legendary' ? trim : undefined,
      };
    case 'gloves':
      if (baseId.includes('gauntlets') || (mat && [IRON, MITHRIL, WATCH].includes(mat))) return { shape: 'gauntlets', mat: mat ?? IRON, trim };
      return { shape: 'gloves', mat: mat && mat !== STEEL ? mat : LEATHER, trim };
    case 'weapon':
    case 'offhand': {
      const type = item.weaponType ?? (baseId.includes('axe') || baseId.includes('hatchet') ? 'axe' : 'dagger');
      if (type === 'staff') {
        const orb = trim ?? (baseId.includes('frost') ? FROST : (mat ?? GREEN));
        return { shape: 'staff', mat: WOODEN.some((k) => baseId.includes(k)) || !mat ? WOOD : mat, trim: orb };
      }
      if (type === 'tome') return { shape: 'tome', mat: mat ?? RED, trim: trim ?? GOLD };
      if (type === 'bow') return { shape: 'bow', mat: !mat || mat === IRON || mat === STEEL ? WOOD : mat, trim };
      return { shape: type, mat: mat ?? STEEL, trim };
    }
    case 'shield':
      if (baseId.includes('buckler')) return { shape: 'shield', mat: mat ?? WOOD, trim: trim ?? IRON };
      return { shape: baseId.includes('tower') ? 'tower' : 'shield', mat: mat ?? WOOD, trim: trim ?? IRON };
    default:
      return undefined;
  }
}

// Class clothes with nothing equipped (no weapon, no armor).
export function baseLook(race: Race, cls: CharClass): Look {
  const boots: Gear | undefined = race === 'halfling' ? undefined : { shape: 'boots', mat: LEATHER };
  switch (cls) {
    case 'warrior':
      return { race, chest: { shape: 'tunic', mat: RED, trim: LEATHER }, legs: { shape: 'pants', mat: CHARCOAL }, boots };
    case 'mage':
      return {
        race,
        head: { shape: 'hat', mat: BLUE, trim: GOLD },
        chest: { shape: 'robe', mat: BLUE, trim: GOLD },
        legs: { shape: 'pants', mat: BLUE },
        boots,
      };
    case 'archer':
      return {
        race,
        head: { shape: 'hood', mat: GREEN },
        chest: { shape: 'tunic', mat: GREEN, trim: LEATHER },
        legs: { shape: 'pants', mat: CLOTH_BROWN },
        boots,
        gloves: { shape: 'bracers', mat: LEATHER },
        cape: { shape: 'cape', mat: FOREST },
      };
    case 'rogue':
      return {
        race,
        head: { shape: 'hood', mat: CHARCOAL },
        chest: { shape: 'jerkin', mat: DARK_LEATHER, trim: GOLD },
        legs: { shape: 'pants', mat: CHARCOAL },
        boots,
        cape: { shape: 'cape', mat: CHARCOAL },
        mask: { shape: 'mask', mat: RED },
      };
    default:
      return {
        race,
        head: { shape: 'circlet', mat: GOLD, trim: BLUE },
        chest: { shape: 'robe', mat: WHITE, trim: GOLD },
        legs: { shape: 'pants', mat: WHITE },
        boots,
      };
  }
}

// The hero as currently equipped.
export function heroLook(character: Pick<Character, 'race' | 'class' | 'equipment'>): Look {
  const look: Look = { ...baseLook(character.race, character.class) };
  const slots = ['helmet', 'chest', 'legs', 'boots', 'gloves', 'weapon', 'shield'] as const;
  slots.forEach((slot) => {
    const item = character.equipment[slot];
    const gear = item && itemGear(item);
    if (!gear) return;
    if (slot === 'helmet') {
      look.head = gear;
      // A helm covers the face; a hood or circlet keeps the rogue's mask.
      if (['helm', 'plumed', 'cap'].includes(gear.shape)) look.mask = undefined;
    } else if (slot === 'weapon') {
      look.main = gear;
      look.quiver = gear.shape === 'bow';
    } else if (slot === 'shield') {
      look.off = gear;
    } else {
      look[slot] = gear;
    }
  });
  if (character.equipment.amulet) look.amulet = true;
  return look;
}

// Stable texture key for a look: identical outfits share their texture.
export function lookKey(look: Look): string {
  const text = JSON.stringify(look);
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
