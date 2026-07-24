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
  armor?: number;
  fireDamage?: number;
}

const STAT_LABELS: Record<keyof ItemStats, string> = {
  strength: 'Force',
  intelligence: 'Intelligence',
  agility: 'Agilité',
  vitality: 'Vitalité',
  armor: 'Armure',
  fireDamage: 'Dégâts de feu',
};

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
  // Extra stats only granted when the item rolls rare (or above later on) —
  // the "special effect" flavor described in DESIGN.md's loot rules, e.g. a
  // sword that only catches fire once it's a rare drop.
  rareOnlyStats?: ItemStats;
}

const TEMPLATES: ItemTemplate[] = [
  {
    baseId: 'short_sword',
    name: 'Épée courte',
    category: 'weapon',
    baseStats: { strength: 2 },
    rareOnlyStats: { fireDamage: 3 },
  },
  { baseId: 'wooden_shield', name: 'Bouclier en bois', category: 'shield', baseStats: { vitality: 2, armor: 3 } },
  { baseId: 'leather_helmet', name: 'Casque de cuir', category: 'helmet', baseStats: { vitality: 1, armor: 2 } },
  { baseId: 'leather_chest', name: 'Plastron de cuir', category: 'chest', baseStats: { vitality: 2, armor: 3 } },
  {
    baseId: 'leather_legs',
    name: 'Jambières de cuir',
    category: 'legs',
    baseStats: { vitality: 1, agility: 1, armor: 2 },
  },
  { baseId: 'leather_boots', name: 'Bottes de cuir', category: 'boots', baseStats: { agility: 2, armor: 1 } },
  { baseId: 'leather_gloves', name: 'Gants de cuir', category: 'gloves', baseStats: { strength: 1, armor: 1 } },
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
  const stats = scaleStats(template.baseStats, RARITY_MULTIPLIER[rarity]);
  if (rarity !== 'common' && template.rareOnlyStats) {
    (Object.keys(template.rareOnlyStats) as (keyof ItemStats)[]).forEach((key) => {
      stats[key] = (stats[key] ?? 0) + (template.rareOnlyStats![key] ?? 0);
    });
  }
  return {
    id: `item-${nextItemId++}`,
    baseId: template.baseId,
    name: template.name,
    category: template.category,
    rarity,
    stats,
  };
}

// Human-readable stat lines for a single item, e.g. ["Force +2", "Armure +3"].
export function describeItemStats(item: Item): string[] {
  return (Object.keys(item.stats) as (keyof ItemStats)[])
    .filter((key) => item.stats[key])
    .map((key) => `${STAT_LABELS[key]} +${item.stats[key]}`);
}

// Stat-by-stat comparison against the item currently occupying the slot (if
// any), so the player can see exactly what equipping `next` would change.
export function compareItemStats(next: Item, current?: Item): string[] {
  const keys = new Set<keyof ItemStats>([
    ...(Object.keys(next.stats) as (keyof ItemStats)[]),
    ...(current ? (Object.keys(current.stats) as (keyof ItemStats)[]) : []),
  ]);
  const lines: string[] = [];
  keys.forEach((key) => {
    const nextValue = next.stats[key] ?? 0;
    const currentValue = current?.stats[key] ?? 0;
    if (nextValue === 0 && currentValue === 0) return;
    const diff = nextValue - currentValue;
    const diffLabel = diff > 0 ? `+${diff}` : `${diff}`;
    lines.push(`${STAT_LABELS[key]} : ${currentValue} → ${nextValue} (${diffLabel})`);
  });
  return lines;
}

interface LootOptions {
  // Boss fights guarantee a drop instead of rolling the base chance.
  guaranteed?: boolean;
  // Base chance of rolling rare instead of common, when a drop happens.
  rareChance?: number;
}

// Modest drop chance, mostly common with a smaller chance of rare — bosses
// pass { guaranteed: true } for a sure drop with better odds. Real per-dungeon
// loot tables (with the very rare unique drops described in DESIGN.md) come
// as more dungeons are added; this one pool covers the current single dungeon.
export function rollLootItem(options: LootOptions = {}): Item | null {
  const { guaranteed = false, rareChance = 0.2 } = options;
  if (!guaranteed && Math.random() > 0.4) return null;
  const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
  const rarity: Rarity = Math.random() < rareChance ? 'rare' : 'common';
  return createItem(template.baseId, rarity);
}
