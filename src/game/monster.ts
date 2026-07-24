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
  goblin_brute: { id: 'goblin_brute', name: 'Gobelin brutal', maxHp: 24, attack: 6, xpReward: 45, goldReward: 12 },
  alpha_wolf: {
    id: 'alpha_wolf',
    name: 'Loup alpha corrompu',
    maxHp: 70,
    attack: 8,
    xpReward: 150,
    goldReward: 40,
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
