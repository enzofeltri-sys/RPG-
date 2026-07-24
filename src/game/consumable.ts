import { Character } from './character';

export type ConsumableId = 'health_potion' | 'health_potion_greater';

interface ConsumableDefinition {
  id: ConsumableId;
  name: string;
  description: string;
  healAmount: number;
}

export const CONSUMABLES: Record<ConsumableId, ConsumableDefinition> = {
  health_potion: {
    id: 'health_potion',
    name: 'Potion de soin',
    description: 'Restaure 25 PV.',
    healAmount: 25,
  },
  health_potion_greater: {
    id: 'health_potion_greater',
    name: 'Potion de soin supérieure',
    description: 'Restaure 50 PV.',
    healAmount: 50,
  },
};

// Heals and consumes one unit; no-op (returns false) if the character has none.
export function useConsumable(character: Character, id: ConsumableId): boolean {
  const count = character.consumables[id] ?? 0;
  if (count <= 0) return false;

  const def = CONSUMABLES[id];
  character.hp = Math.min(character.maxHp, character.hp + def.healAmount);
  character.consumables[id] = count - 1;
  return true;
}
