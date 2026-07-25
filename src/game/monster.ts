export interface Monster {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  xpReward: number;
  goldReward: number;
  isBoss: boolean;
}

interface MonsterTemplate {
  id: string;
  name: string;
  maxHp: number;
  attack: number;
  xpReward: number;
  goldReward: number;
  isBoss?: boolean;
}

const TEMPLATES: Record<string, MonsterTemplate> = {
  corrupted_wolf: { id: 'corrupted_wolf', name: 'Loup corrompu', maxHp: 18, attack: 4, xpReward: 40, goldReward: 8 },
  cave_rat: { id: 'cave_rat', name: 'Rat des cavernes', maxHp: 14, attack: 3, xpReward: 25, goldReward: 5 },
  goblin_scout: { id: 'goblin_scout', name: 'Gobelin éclaireur', maxHp: 16, attack: 4, xpReward: 30, goldReward: 6 },
  cave_spider: { id: 'cave_spider', name: 'Araignée des cavernes', maxHp: 20, attack: 5, xpReward: 35, goldReward: 7 },
  field_rat: { id: 'field_rat', name: 'Rat des champs', maxHp: 10, attack: 3, xpReward: 18, goldReward: 4 },
  bandit_thug: { id: 'bandit_thug', name: 'Bandit', maxHp: 20, attack: 5, xpReward: 35, goldReward: 10 },
  bandit_leader: {
    id: 'bandit_leader',
    name: 'Chef des bandits',
    maxHp: 40,
    attack: 8,
    xpReward: 90,
    goldReward: 25,
    isBoss: true,
  },
  goblin_brute: { id: 'goblin_brute', name: 'Gobelin brutal', maxHp: 24, attack: 6, xpReward: 45, goldReward: 12 },
  goblin_chief: {
    id: 'goblin_chief',
    name: 'Chef des gobelins',
    maxHp: 44,
    attack: 9,
    xpReward: 95,
    goldReward: 26,
    isBoss: true,
  },
  corrupted_boar: { id: 'corrupted_boar', name: 'Sanglier corrompu', maxHp: 28, attack: 7, xpReward: 55, goldReward: 15 },
  alpha_wolf: {
    id: 'alpha_wolf',
    name: 'Loup alpha corrompu',
    maxHp: 70,
    attack: 8,
    xpReward: 150,
    goldReward: 40,
    isBoss: true,
  },
  smuggler_thug: {
    id: 'smuggler_thug',
    name: 'Contrebandier',
    maxHp: 26,
    attack: 6,
    xpReward: 50,
    goldReward: 14,
  },
  marsh_serpent: { id: 'marsh_serpent', name: 'Serpent des marais', maxHp: 24, attack: 6, xpReward: 45, goldReward: 12 },
  marsh_matriarch: {
    id: 'marsh_matriarch',
    name: 'Matriarche des marais',
    maxHp: 50,
    attack: 10,
    xpReward: 120,
    goldReward: 35,
    isBoss: true,
  },
  corrupted_tome: {
    id: 'corrupted_tome',
    name: 'Grimoire corrompu',
    maxHp: 16,
    attack: 4,
    xpReward: 28,
    goldReward: 6,
  },
  archive_wisp: { id: 'archive_wisp', name: 'Feu-follet des archives', maxHp: 20, attack: 5, xpReward: 35, goldReward: 8 },
  smuggler_captain: {
    id: 'smuggler_captain',
    name: 'Capitaine des contrebandiers',
    maxHp: 45,
    attack: 9,
    xpReward: 110,
    goldReward: 30,
    isBoss: true,
  },
  corrupted_knight: {
    id: 'corrupted_knight',
    name: 'Chevalier corrompu',
    maxHp: 34,
    attack: 8,
    xpReward: 70,
    goldReward: 20,
  },
  well_guardian: { id: 'well_guardian', name: 'Gardien du puits', maxHp: 22, attack: 5, xpReward: 45, goldReward: 12 },
  fallen_guardian: {
    id: 'fallen_guardian',
    name: 'Gardien déchu',
    maxHp: 100,
    attack: 11,
    xpReward: 260,
    goldReward: 75,
    isBoss: true,
  },
};

export function createMonster(id: string): Monster {
  const template = TEMPLATES[id];
  if (!template) {
    throw new Error(`Unknown monster template: ${id}`);
  }
  return { ...template, hp: template.maxHp, isBoss: Boolean(template.isBoss) };
}

// Kept for the Field's random encounters, which only ever fight this one test monster.
export function createTestMonster(): Monster {
  return createMonster('corrupted_wolf');
}
