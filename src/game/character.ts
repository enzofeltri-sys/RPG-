export type Race = 'human' | 'elf';
export type CharClass = 'warrior' | 'mage';

export interface CharacterStats {
  strength: number;
  intelligence: number;
  agility: number;
  vitality: number;
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
}

export const RACES: Record<Race, RaceDefinition> = {
  human: {
    id: 'human',
    label: 'Humain',
    description: "Royaumes fracturés depuis la Rupture, mais un tempérament robuste et polyvalent.",
    statBonuses: { strength: 1, intelligence: 1, agility: 1, vitality: 1 },
    skills: ['Détermination — une fois par combat, survit à un coup fatal avec 1 PV.'],
  },
  elf: {
    id: 'elf',
    label: 'Elfe',
    description: 'Gardiens reclus du savoir ancien : agiles et perspicaces, mais moins résistants.',
    statBonuses: { strength: -1, intelligence: 2, agility: 2, vitality: -1 },
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
    baseStats: { strength: 8, intelligence: 3, agility: 5, vitality: 8 },
  },
  mage: {
    id: 'mage',
    label: 'Mage',
    description: 'Lanceur de sorts fragile mais dévastateur à distance.',
    baseStats: { strength: 3, intelligence: 9, agility: 4, vitality: 4 },
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
  };
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
