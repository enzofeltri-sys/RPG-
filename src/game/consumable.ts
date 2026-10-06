import { Character } from './character';

export type ConsumableId =
  | 'health_potion'
  | 'health_potion_greater'
  | 'mana_potion'
  | 'mana_potion_greater'
  | 'fire_bomb'
  | 'antidote';

interface ConsumableDefinition {
  id: ConsumableId;
  name: string;
  description: string;
  // Potions restore the larger of a flat amount and a share of the max, so
  // they stay worth drinking as max HP/mana grow.
  heal?: { flat: number; pct: number };
  // Mana (Mage and Clerc only use mana — see talents.ts's CLASS_RESOURCE).
  mana?: { flat: number; pct: number };
  // Thrown in combat (see CombatEngine.usePotion), never usable outside.
  combatOnly?: boolean;
}

export const CONSUMABLES: Record<ConsumableId, ConsumableDefinition> = {
  health_potion: {
    id: 'health_potion',
    name: 'Potion de soin',
    description: 'Rend 25 PV ou 30 % des PV max (le plus grand).',
    heal: { flat: 25, pct: 0.3 },
  },
  health_potion_greater: {
    id: 'health_potion_greater',
    name: 'Potion de soin supérieure',
    description: 'Rend 50 PV ou 60 % des PV max (le plus grand).',
    heal: { flat: 50, pct: 0.6 },
  },
  mana_potion: {
    id: 'mana_potion',
    name: 'Potion de mana',
    description: 'Rend 20 de mana ou 30 % de la mana max (le plus grand).',
    mana: { flat: 20, pct: 0.3 },
  },
  mana_potion_greater: {
    id: 'mana_potion_greater',
    name: 'Potion de mana supérieure',
    description: 'Rend 40 de mana ou 60 % de la mana max (le plus grand).',
    mana: { flat: 40, pct: 0.6 },
  },
  fire_bomb: {
    id: 'fire_bomb',
    name: 'Bombe incendiaire',
    description: 'En combat : 12 + 2 × niveau dégâts, et Brûlure. Toutes classes.',
    combatOnly: true,
  },
  antidote: {
    id: 'antidote',
    name: 'Antidote',
    description: 'En combat : retire tous vos états négatifs (poison, brûlure, saignement, silence…).',
    combatOnly: true,
  },
};

export function restoreAmount(amount: { flat: number; pct: number }, max: number): number {
  return Math.max(amount.flat, Math.round(max * amount.pct));
}

export function bombDamage(level: number): number {
  return 12 + 2 * level;
}

export function bombBurnDamage(level: number): number {
  return 2 + Math.floor(level / 4);
}

// Drinks and consumes one potion; no-op (returns false) if the character has
// none, or for a combat-only item (bomb, antidote: see CombatEngine).
export function useConsumable(character: Character, id: ConsumableId): boolean {
  const count = character.consumables[id] ?? 0;
  const def = CONSUMABLES[id];
  if (count <= 0 || def.combatOnly) return false;

  if (def.heal) character.hp = Math.min(character.maxHp, character.hp + restoreAmount(def.heal, character.maxHp));
  if (def.mana) character.mp = Math.min(character.maxMp, character.mp + restoreAmount(def.mana, character.maxMp));
  character.consumables[id] = count - 1;
  return true;
}
