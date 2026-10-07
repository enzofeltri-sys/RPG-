import type { CharacterStats } from './character';
import type { EquipSlot, Item, WeaponType } from './item';

// Weapon identity and the hands rule (DESIGN.md, gameplay pass, objects
// step). The 'weapon' equip slot is the right hand, 'shield' the left hand.

export interface WeaponProfile {
  label: string;
  scaling: keyof CharacterStats;
  min: number;
  max: number;
  // Added to the crit chance of this weapon's hits.
  crit: number;
  // Staff and tome attacks are spells (Intelligence, spell bonuses).
  spell: boolean;
}

export const WEAPON_PROFILES: Record<WeaponType, WeaponProfile> = {
  dagger: { label: 'Dague', scaling: 'agility', min: 2, max: 4, crit: 0.07, spell: false },
  sword: { label: 'Épée', scaling: 'strength', min: 3, max: 6, crit: 0.05, spell: false },
  axe: { label: 'Hache', scaling: 'strength', min: 2, max: 9, crit: 0, spell: false },
  bow: { label: 'Arc', scaling: 'agility', min: 4, max: 8, crit: 0, spell: false },
  greatsword: { label: 'Épée à deux mains', scaling: 'strength', min: 6, max: 11, crit: 0, spell: false },
  greataxe: { label: 'Grande hache', scaling: 'strength', min: 5, max: 13, crit: 0, spell: false },
  staff: { label: 'Bâton', scaling: 'intelligence', min: 3, max: 6, crit: 0, spell: true },
  tome: { label: 'Tome', scaling: 'intelligence', min: 2, max: 5, crit: 0, spell: true },
};

export const UNARMED_PROFILE: WeaponProfile = {
  label: 'Mains nues',
  scaling: 'strength',
  min: 1,
  max: 3,
  crit: 0,
  spell: false,
};

// Spell skills cast without a staff or tome.
export const BARE_SPELL_PROFILE: WeaponProfile = {
  label: 'Sort',
  scaling: 'intelligence',
  min: 2,
  max: 5,
  crit: 0,
  spell: true,
};

export const TOME_SPELL_BONUS = 0.1;
// Share of the scaling stat added to a hit: spells get a little less than
// weapons, since casters multiply nearly every action with a skill.
export const WEAPON_STAT_SCALING = 0.5;
export const SPELL_STAT_SCALING = 0.4;
export const SHIELD_BLOCK_CHANCE = 0.1;
export const OFFHAND_HIT_MULTIPLIER = 0.4;

export type HandRule = 'right' | 'left' | 'either' | 'both';

// Which hand(s) an item goes in, or null for anything that isn't held.
export function handRule(item: Item): HandRule | null {
  if (item.category === 'shield' || item.category === 'offhand') return 'left';
  if (item.category !== 'weapon') return null;
  switch (item.weaponType) {
    case 'staff':
      return 'right';
    case 'tome':
      return 'left';
    case 'bow':
    case 'greatsword':
    case 'greataxe':
      return 'both';
    default:
      return 'either';
  }
}

export function isTwoHanded(item: Item | undefined): boolean {
  return Boolean(item) && handRule(item!) === 'both';
}

// Sword, axe, dagger and the dedicated off-hand pieces: two of them make
// the basic attack strike twice.
export function isMeleeHandItem(item: Item | undefined): boolean {
  if (!item) return false;
  if (item.category === 'offhand') return true;
  return item.category === 'weapon' && (item.weaponType === 'sword' || item.weaponType === 'axe' || item.weaponType === 'dagger');
}

export function weaponProfile(item: Item | undefined): WeaponProfile {
  return item?.weaponType ? WEAPON_PROFILES[item.weaponType] : UNARMED_PROFILE;
}

export function handSlotAccepts(slot: 'weapon' | 'shield', item: Item): boolean {
  const rule = handRule(item);
  if (!rule) return false;
  return slot === 'weapon' ? rule !== 'left' : rule === 'left' || rule === 'either';
}

type Equipment = Partial<Record<EquipSlot, Item>>;

// Where an item goes and what it pushes out. `preferred` is the hand the
// player picked (Équipement screen); without it, a one-handed weapon fills
// the right hand, then the left one, then replaces the right.
export function planHandEquip(
  equipment: Equipment,
  item: Item,
  preferred?: 'weapon' | 'shield',
): { slot: 'weapon' | 'shield'; displaced: Item[] } {
  const rule = handRule(item)!;
  const right = equipment.weapon;
  const left = equipment.shield;
  let slot: 'weapon' | 'shield';
  if (rule === 'both' || rule === 'right') slot = 'weapon';
  else if (rule === 'left') slot = 'shield';
  else if (preferred) slot = preferred;
  else if (!right || isTwoHanded(right)) slot = 'weapon';
  else if (!left) slot = 'shield';
  else slot = 'weapon';

  const displaced: Item[] = [];
  if (slot === 'weapon') {
    if (right) displaced.push(right);
    if (rule === 'both' && left) displaced.push(left);
  } else {
    if (left) displaced.push(left);
    if (isTwoHanded(right)) displaced.push(right!);
  }
  return { slot, displaced };
}

// Brings saved equipment in line with the hands rule (saves from before it
// could hold a bow with a shield, a tome in the right hand…). Returns a
// sentence per item sent back to the bag.
export function enforceHandRules(equipment: Equipment, inventory: Item[]): string[] {
  const notes: string[] = [];
  const toBag = (item: Item, why: string) => {
    inventory.push(item);
    notes.push(`${item.name} rangé dans le sac (${why}).`);
  };
  const right = equipment.weapon;
  if (right && handRule(right) === 'left') {
    delete equipment.weapon;
    if (!equipment.shield) equipment.shield = right;
    else toBag(right, 'se tient en main gauche');
  }
  const left = equipment.shield;
  if (left && !handSlotAccepts('shield', left)) {
    delete equipment.shield;
    if (!equipment.weapon) equipment.weapon = left;
    else toBag(left, handRule(left) === 'both' ? 'arme à deux mains' : 'se tient en main droite');
  }
  if (isTwoHanded(equipment.weapon) && equipment.shield) {
    const extra = equipment.shield;
    delete equipment.shield;
    toBag(extra, `${equipment.weapon!.name} se tient à deux mains`);
  }
  return notes;
}
