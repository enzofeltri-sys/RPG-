export interface Monster {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  xpReward: number;
}

export function createTestMonster(): Monster {
  return {
    name: 'Loup corrompu',
    hp: 18,
    maxHp: 18,
    attack: 4,
    xpReward: 40,
  };
}
