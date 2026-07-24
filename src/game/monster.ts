export interface Monster {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  xpReward: number;
  isBoss: boolean;
}

interface MonsterTemplate {
  id: string;
  name: string;
  maxHp: number;
  attack: number;
  xpReward: number;
  isBoss?: boolean;
}

const TEMPLATES: Record<string, MonsterTemplate> = {
  corrupted_wolf: { id: 'corrupted_wolf', name: 'Loup corrompu', maxHp: 18, attack: 4, xpReward: 40 },
  cave_rat: { id: 'cave_rat', name: 'Rat des cavernes', maxHp: 14, attack: 3, xpReward: 25 },
  alpha_wolf: {
    id: 'alpha_wolf',
    name: 'Loup alpha corrompu',
    maxHp: 70,
    attack: 8,
    xpReward: 150,
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
