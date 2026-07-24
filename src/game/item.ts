export type EquipSlot =
  | 'weapon'
  | 'shield'
  | 'helmet'
  | 'chest'
  | 'legs'
  | 'boots'
  | 'gloves'
  | 'ring1'
  | 'ring2'
  | 'amulet';

export type ItemCategory = EquipSlot | 'ring';

export type Rarity = 'common' | 'rare';

export interface ItemStats {
  strength?: number;
  intelligence?: number;
  agility?: number;
  vitality?: number;
}

export interface Item {
  id: string;
  baseId: string;
  name: string;
  category: ItemCategory;
  rarity: Rarity;
  stats: ItemStats;
}

interface ItemTemplate {
  baseId: string;
  name: string;
  category: ItemCategory;
  baseStats: ItemStats;
}

const TEMPLATES: ItemTemplate[] = [
  { baseId: 'short_sword', name: 'Épée courte', category: 'weapon', baseStats: { strength: 2 } },
  { baseId: 'wooden_shield', name: 'Bouclier en bois', category: 'shield', baseStats: { vitality: 2 } },
  { baseId: 'leather_helmet', name: 'Casque de cuir', category: 'helmet', baseStats: { vitality: 1 } },
  { baseId: 'leather_chest', name: 'Plastron de cuir', category: 'chest', baseStats: { vitality: 2 } },
  { baseId: 'leather_legs', name: 'Jambières de cuir', category: 'legs', baseStats: { vitality: 1, agility: 1 } },
  { baseId: 'leather_boots', name: 'Bottes de cuir', category: 'boots', baseStats: { agility: 2 } },
  { baseId: 'leather_gloves', name: 'Gants de cuir', category: 'gloves', baseStats: { strength: 1 } },
  { baseId: 'simple_ring', name: 'Anneau simple', category: 'ring', baseStats: { intelligence: 1 } },
  { baseId: 'simple_amulet', name: 'Amulette simple', category: 'amulet', baseStats: { intelligence: 2 } },
];

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Commun',
  rare: 'Rare',
};

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9aa0a6',
  rare: '#4fa3e3',
};

const RARITY_MULTIPLIER: Record<Rarity, number> = {
  common: 1,
  rare: 2,
};

const SLOT_LABELS: Record<EquipSlot, string> = {
  weapon: 'Arme',
  shield: 'Bouclier',
  helmet: 'Casque',
  chest: 'Torse',
  legs: 'Jambes',
  boots: 'Bottes',
  gloves: 'Gants',
  ring1: 'Anneau 1',
  ring2: 'Anneau 2',
  amulet: 'Amulette',
};

export function equipSlotLabel(slot: EquipSlot): string {
  return SLOT_LABELS[slot];
}

let nextItemId = 1;

function scaleStats(stats: ItemStats, multiplier: number): ItemStats {
  const scaled: ItemStats = {};
  (Object.keys(stats) as (keyof ItemStats)[]).forEach((key) => {
    const base = stats[key];
    if (base !== undefined) {
      scaled[key] = Math.max(1, Math.round(base * multiplier));
    }
  });
  return scaled;
}

export function createItem(baseId: string, rarity: Rarity): Item {
  const template = TEMPLATES.find((t) => t.baseId === baseId);
  if (!template) {
    throw new Error(`Unknown item template: ${baseId}`);
  }
  return {
    id: `item-${nextItemId++}`,
    baseId: template.baseId,
    name: template.name,
    category: template.category,
    rarity,
    stats: scaleStats(template.baseStats, RARITY_MULTIPLIER[rarity]),
  };
}

// Loot roll for the current single test monster: modest drop chance, mostly
// common with a smaller chance of rare. Real per-dungeon loot tables (with the
// very rare unique drops described in the design doc) come with actual dungeons.
export function rollLootItem(): Item | null {
  if (Math.random() > 0.4) return null;
  const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
  const rarity: Rarity = Math.random() < 0.2 ? 'rare' : 'common';
  return createItem(template.baseId, rarity);
}
