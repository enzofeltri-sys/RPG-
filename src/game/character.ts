import { EquipSlot, Item, ItemStats, getEquippedSetBonusStats, getWeaponType } from './item';
import type { QuestProgress } from './quest';
import type { QuestItem } from './questItem';
import type { MainQuestStage } from './mainQuest';
import type { MerchantStockEntry } from './merchantStock';

export type Race = 'human' | 'elf' | 'dwarf' | 'orc' | 'halfling';
export type CharClass = 'warrior' | 'mage' | 'archer' | 'rogue' | 'cleric';

export interface CharacterStats {
  strength: number;
  intelligence: number;
  agility: number;
  vitality: number;
  // Usually 0 on the base race/class stat block below (the dwarf's small
  // racial armor bonus is the one exception) — these mostly come from
  // equipped gear, via getEffectiveStats().
  armor: number;
  fireDamage: number;
  poisonDamage: number;
  iceDamage: number;
  electricDamage: number;
  darkDamage: number;
  earthDamage: number;
  // Flat HP restored to the attacker per hit landed — see CombatScene's
  // playerAttack(), applied after damage, capped at maxHp.
  lifeSteal: number;
}

export interface RaceDefinition {
  id: Race;
  label: string;
  description: string;
  statBonuses: CharacterStats;
  skills: string[];
}

export interface ClassDefinition {
  id: CharClass;
  label: string;
  description: string;
  baseStats: CharacterStats;
}

export interface Character {
  race: Race;
  class: CharClass;
  level: number;
  xp: number;
  stats: CharacterStats;
  statPoints: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  equipment: Partial<Record<EquipSlot, Item>>;
  inventory: Item[];
  quests: Record<string, QuestProgress>;
  gold: number;
  materials: Record<string, number>;
  consumables: Record<string, number>;
  questItems: QuestItem[];
  // Undefined on older saves and treated as 'not_started' — see mainQuest.ts.
  mainQuestStage?: MainQuestStage;
  // Keyed by chest id (see chest.ts) — presence means opened, never re-rolls.
  openedChests: Record<string, boolean>;
  // The Village shop's rotating stock — undefined until the first visit,
  // then regenerated on a real-world timer (see merchantStock.ts). Older
  // saves may still have the pre-entries `{ items: Item[] }` shape —
  // getMerchantStock() detects and discards it rather than trusting the
  // type here.
  merchantStock?: { entries: MerchantStockEntry[]; refreshedAt: number };
  // Real-world per-node cooldown for FieldScene's gather nodes, keyed by
  // GatherNode.id — last-gathered epoch ms. Undefined/missing entry means
  // never gathered (or an older save from before cooldowns existed), which
  // getGatherCooldownRemaining() (FieldScene.ts) already treats as "ready".
  gatherCooldowns?: Partial<Record<string, number>>;
}

export const RACES: Record<Race, RaceDefinition> = {
  human: {
    id: 'human',
    label: 'Humain',
    description: "Royaumes fracturés depuis la Rupture, mais un tempérament robuste et polyvalent.",
    statBonuses: { strength: 1, intelligence: 1, agility: 1, vitality: 1, armor: 0, fireDamage: 0, poisonDamage: 0, iceDamage: 0, electricDamage: 0, darkDamage: 0, earthDamage: 0, lifeSteal: 0 },
    skills: ['Détermination — une fois par combat, survit à un coup fatal avec 1 PV.'],
  },
  elf: {
    id: 'elf',
    label: 'Elfe',
    description: 'Gardiens reclus du savoir ancien : agiles et perspicaces, mais moins résistants.',
    statBonuses: { strength: -1, intelligence: 2, agility: 2, vitality: -1, armor: 0, fireDamage: 0, poisonDamage: 0, iceDamage: 0, electricDamage: 0, darkDamage: 0, earthDamage: 0, lifeSteal: 0 },
    skills: [
      'Vue perçante — chance de coup critique augmentée.',
      'Affinité naturelle — régénération de mana plus rapide.',
    ],
  },
  dwarf: {
    id: 'dwarf',
    label: 'Nain',
    description: 'Peuple des galeries profondes et des forges de pierre, taillé pour encaisser plutôt que pour esquiver.',
    statBonuses: { strength: 2, intelligence: -1, agility: -2, vitality: 3, armor: 1, fireDamage: 0, poisonDamage: 0, iceDamage: 0, electricDamage: 0, darkDamage: 0, earthDamage: 0, lifeSteal: 0 },
    skills: [
      'Peau de granit — armure de base légèrement accrue.',
      'Sang-froid des tréfonds — imperturbable, jamais mis en fuite.',
    ],
  },
  orc: {
    id: 'orc',
    label: 'Orc',
    description: "Descendants des clans bannis lors de la Rupture, plus habitués à la force brute qu'à la ruse.",
    statBonuses: { strength: 3, intelligence: -2, agility: -1, vitality: 3, armor: 0, fireDamage: 0, poisonDamage: 0, iceDamage: 0, electricDamage: 0, darkDamage: 0, earthDamage: 0, lifeSteal: 0 },
    skills: [
      'Carrure — force et vitalité naturellement élevées.',
      "Cuir épais — encaisse ce qu'un corps plus frêle ne pourrait pas.",
    ],
  },
  halfling: {
    id: 'halfling',
    label: 'Halfling',
    description: 'Petit peuple des collines et des routes marchandes, plus vif que costaud.',
    statBonuses: { strength: -2, intelligence: 1, agility: 3, vitality: -1, armor: 0, fireDamage: 0, poisonDamage: 0, iceDamage: 0, electricDamage: 0, darkDamage: 0, earthDamage: 0, lifeSteal: 0 },
    skills: [
      'Pas légers — toujours le premier à esquiver un coup.',
      'Chanceux — un œil qui repère toujours un peu plus dans un coffre.',
    ],
  },
};

export const CLASSES: Record<CharClass, ClassDefinition> = {
  warrior: {
    id: 'warrior',
    label: 'Guerrier',
    description: 'Combattant robuste, en première ligne au corps à corps.',
    baseStats: { strength: 8, intelligence: 3, agility: 5, vitality: 8, armor: 0, fireDamage: 0, poisonDamage: 0, iceDamage: 0, electricDamage: 0, darkDamage: 0, earthDamage: 0, lifeSteal: 0 },
  },
  mage: {
    id: 'mage',
    label: 'Mage',
    description: 'Lanceur de sorts fragile mais dévastateur à distance.',
    baseStats: { strength: 3, intelligence: 9, agility: 4, vitality: 4, armor: 0, fireDamage: 0, poisonDamage: 0, iceDamage: 0, electricDamage: 0, darkDamage: 0, earthDamage: 0, lifeSteal: 0 },
  },
  archer: {
    id: 'archer',
    label: 'Archer',
    description: "Combattant à distance, mortel à l'arc mais vulnérable de près.",
    baseStats: { strength: 4, intelligence: 3, agility: 9, vitality: 5, armor: 0, fireDamage: 0, poisonDamage: 0, iceDamage: 0, electricDamage: 0, darkDamage: 0, earthDamage: 0, lifeSteal: 0 },
  },
  rogue: {
    id: 'rogue',
    label: 'Voleur',
    description: 'Lame rapide et discrète, frappe fort avec une paire de dagues.',
    baseStats: { strength: 5, intelligence: 3, agility: 8, vitality: 5, armor: 0, fireDamage: 0, poisonDamage: 0, iceDamage: 0, electricDamage: 0, darkDamage: 0, earthDamage: 0, lifeSteal: 0 },
  },
  cleric: {
    id: 'cleric',
    label: 'Clerc',
    description: "Foi et savoir arcanique mêlés, plus résistant qu'un mage pur.",
    baseStats: { strength: 4, intelligence: 8, agility: 3, vitality: 6, armor: 0, fireDamage: 0, poisonDamage: 0, iceDamage: 0, electricDamage: 0, darkDamage: 0, earthDamage: 0, lifeSteal: 0 },
  },
};

export function computeStats(race: Race, charClass: CharClass): CharacterStats {
  const base = CLASSES[charClass].baseStats;
  const bonus = RACES[race].statBonuses;
  return {
    strength: base.strength + bonus.strength,
    intelligence: base.intelligence + bonus.intelligence,
    agility: base.agility + bonus.agility,
    vitality: base.vitality + bonus.vitality,
    armor: base.armor + bonus.armor,
    fireDamage: base.fireDamage + bonus.fireDamage,
    poisonDamage: base.poisonDamage + bonus.poisonDamage,
    iceDamage: base.iceDamage + bonus.iceDamage,
    electricDamage: base.electricDamage + bonus.electricDamage,
    darkDamage: base.darkDamage + bonus.darkDamage,
    earthDamage: base.earthDamage + bonus.earthDamage,
    lifeSteal: base.lifeSteal + bonus.lifeSteal,
  };
}

export function createCharacter(race: Race, charClass: CharClass): Character {
  const stats = computeStats(race, charClass);
  const maxHp = 20 + stats.vitality * 4;
  const maxMp = 10 + stats.intelligence * 3;
  return {
    race,
    class: charClass,
    level: 1,
    xp: 0,
    stats,
    statPoints: 0,
    hp: maxHp,
    maxHp,
    mp: maxMp,
    maxMp,
    equipment: {},
    inventory: [],
    quests: {},
    gold: 0,
    materials: {},
    consumables: {},
    questItems: [],
    mainQuestStage: 'not_started',
    openedChests: {},
  };
}

// Saves created before equipment/inventory/quests/economy (or armor/fireDamage/
// poisonDamage/ice/electric/dark/earth/lifeSteal stats) existed won't have
// these fields.
export function ensureCharacterDefaults(character: Character): Character {
  if (!character.equipment) character.equipment = {};
  if (!character.inventory) character.inventory = [];
  if (!character.quests) character.quests = {};
  if (character.gold === undefined) character.gold = 0;
  if (!character.materials) character.materials = {};
  if (!character.consumables) character.consumables = {};
  if (!character.questItems) character.questItems = [];
  if (!character.openedChests) character.openedChests = {};
  if (character.stats.armor === undefined) character.stats.armor = 0;
  if (character.stats.fireDamage === undefined) character.stats.fireDamage = 0;
  if (character.stats.poisonDamage === undefined) character.stats.poisonDamage = 0;
  if (character.stats.iceDamage === undefined) character.stats.iceDamage = 0;
  if (character.stats.electricDamage === undefined) character.stats.electricDamage = 0;
  if (character.stats.darkDamage === undefined) character.stats.darkDamage = 0;
  if (character.stats.earthDamage === undefined) character.stats.earthDamage = 0;
  if (character.stats.lifeSteal === undefined) character.stats.lifeSteal = 0;
  // Saves from before stat-point allocation existed never got this field, and
  // `undefined + 3` in grantXp's `character.statPoints += 3` silently produces
  // NaN forever after the first level-up (NaN + anything is still NaN) — the
  // NaN check catches a save that already leveled up once under that bug,
  // not just a save that never had the field at all.
  if (character.statPoints === undefined || Number.isNaN(character.statPoints)) character.statPoints = 0;

  // Backfills weaponType onto items saved before that field existed — their
  // Item objects were snapshotted by createItem() before it copied the
  // field from the template, so it's missing even though the template now
  // defines one (see item.ts's WeaponType/getWeaponType).
  const backfillWeaponType = (item: Item) => {
    if (!item.weaponType) {
      const weaponType = getWeaponType(item.baseId);
      if (weaponType) item.weaponType = weaponType;
    }
  };
  Object.values(character.equipment).forEach((item) => item && backfillWeaponType(item));
  character.inventory.forEach(backfillWeaponType);

  return character;
}

export function getEffectiveStats(character: Character): CharacterStats {
  const total: CharacterStats = { ...character.stats };
  Object.values(character.equipment).forEach((item) => {
    if (!item) return;
    (Object.keys(item.stats) as (keyof ItemStats)[]).forEach((key) => {
      total[key] = (total[key] ?? 0) + (item.stats[key] ?? 0);
    });
  });
  const setBonus = getEquippedSetBonusStats(character.equipment);
  (Object.keys(setBonus) as (keyof ItemStats)[]).forEach((key) => {
    total[key] = (total[key] ?? 0) + (setBonus[key] ?? 0);
  });
  return total;
}

export function xpToNextLevel(level: number): number {
  return 100 * level;
}

// Mutates and returns the character; also returns how many levels were gained
// (0 if the XP wasn't enough to level up).
export function grantXp(character: Character, xp: number): number {
  character.xp += xp;
  let levelsGained = 0;

  while (character.xp >= xpToNextLevel(character.level)) {
    character.xp -= xpToNextLevel(character.level);
    character.level += 1;
    character.statPoints += 3;
    character.maxHp += 5;
    character.maxMp += 3;
    character.hp = character.maxHp;
    character.mp = character.maxMp;
    levelsGained += 1;
  }

  return levelsGained;
}

export type AllocatableStat = 'strength' | 'intelligence' | 'agility' | 'vitality';

// Spends one of the character's banked statPoints (granted 3-per-level by
// grantXp above) into a base stat. One-way by design — no respec — matching
// how every other permanent choice in this game (race/class at creation)
// already works. Vitality/Intelligence also bump max HP/MP immediately
// (same +4/+3 per point used elsewhere: createCharacter's maxHp/maxMp
// formulas, grantXp's per-level gain) so the point feels effective right
// away rather than only mattering next level-up.
export function allocateStatPoint(character: Character, stat: AllocatableStat): boolean {
  if (character.statPoints <= 0) return false;
  character.statPoints -= 1;
  character.stats[stat] += 1;
  if (stat === 'vitality') {
    character.maxHp += 4;
    character.hp += 4;
  }
  if (stat === 'intelligence') {
    character.maxMp += 3;
    character.mp += 3;
  }
  return true;
}
