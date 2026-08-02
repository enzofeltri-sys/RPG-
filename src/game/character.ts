import { EquipSlot, Item, ItemStats, getEquippedSetBonusStats } from './item';
import type { QuestProgress } from './quest';
import type { QuestItem } from './questItem';
import type { MainQuestStage } from './mainQuest';

export type Race = 'human' | 'elf';
export type CharClass = 'warrior' | 'mage';

export interface CharacterStats {
  strength: number;
  intelligence: number;
  agility: number;
  vitality: number;
  // Always 0 on the base race/class stat block below — these only ever come
  // from equipped gear, via getEffectiveStats().
  armor: number;
  fireDamage: number;
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
}

export const RACES: Record<Race, RaceDefinition> = {
  human: {
    id: 'human',
    label: 'Humain',
    description: "Royaumes fracturés depuis la Rupture, mais un tempérament robuste et polyvalent.",
    statBonuses: { strength: 1, intelligence: 1, agility: 1, vitality: 1, armor: 0, fireDamage: 0 },
    skills: ['Détermination — une fois par combat, survit à un coup fatal avec 1 PV.'],
  },
  elf: {
    id: 'elf',
    label: 'Elfe',
    description: 'Gardiens reclus du savoir ancien : agiles et perspicaces, mais moins résistants.',
    statBonuses: { strength: -1, intelligence: 2, agility: 2, vitality: -1, armor: 0, fireDamage: 0 },
    skills: [
      'Vue perçante — chance de coup critique augmentée.',
      'Affinité naturelle — régénération de mana plus rapide.',
    ],
  },
};

export const CLASSES: Record<CharClass, ClassDefinition> = {
  warrior: {
    id: 'warrior',
    label: 'Guerrier',
    description: 'Combattant robuste, en première ligne au corps à corps.',
    baseStats: { strength: 8, intelligence: 3, agility: 5, vitality: 8, armor: 0, fireDamage: 0 },
  },
  mage: {
    id: 'mage',
    label: 'Mage',
    description: 'Lanceur de sorts fragile mais dévastateur à distance.',
    baseStats: { strength: 3, intelligence: 9, agility: 4, vitality: 4, armor: 0, fireDamage: 0 },
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

// Saves created before equipment/inventory/quests/economy (or armor/fireDamage
// stats) existed won't have these fields.
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
