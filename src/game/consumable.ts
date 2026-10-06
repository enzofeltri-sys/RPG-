import { Character } from './character';

export type ConsumableId = 'health_potion' | 'health_potion_greater' | 'mana_potion';

interface ConsumableDefinition {
  id: ConsumableId;
  name: string;
  description: string;
  healAmount: number;
  // Mana restored (Mage and Clerc only use mana — see talents.ts's CLASS_RESOURCE).
  manaAmount?: number;
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
  mana_potion: {
    id: 'mana_potion',
    name: 'Potion de mana',
    description: 'Restaure 20 de mana.',
    healAmount: 0,
    manaAmount: 20,
  },
};

// Heals and consumes one unit; no-op (returns false) if the character has none.
export function useConsumable(character: Character, id: ConsumableId): boolean {
  const count = character.consumables[id] ?? 0;
  if (count <= 0) return false;

  const def = CONSUMABLES[id];
  character.hp = Math.min(character.maxHp, character.hp + def.healAmount);
  if (def.manaAmount) character.mp = Math.min(character.maxMp, character.mp + def.manaAmount);
  character.consumables[id] = count - 1;
  return true;
}
