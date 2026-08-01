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

// 'epic' is the first step beyond rare, reserved for hard-dungeon boss
// rewards — légendaire/unique (per VISION.md's full rarity ladder) come
// later as more of that high-end content exists to place them in.
export type Rarity = 'common' | 'rare' | 'epic';

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
  // Never appears in the general rollLootItem() pool — granted directly by a
  // specific hard-dungeon boss (see CombatScene's SIGNATURE_REWARDS), so it
  // stays a genuinely special, exclusive find rather than diluting the
  // common loot table.
  signature?: boolean;
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
  {
    baseId: 'guardian_amulet',
    name: 'Amulette du Gardien déchu',
    category: 'amulet',
    baseStats: { intelligence: 3, vitality: 2 },
    rareOnlyStats: { armor: 3 },
    signature: true,
  },
  {
    baseId: 'shard_pendant',
    name: "Pendentif d'éclat scellé",
    category: 'amulet',
    baseStats: { intelligence: 3, vitality: 3 },
    rareOnlyStats: { armor: 2 },
    signature: true,
  },
  {
    baseId: 'seeker_signet',
    name: "Sceau de l'Archiviste",
    category: 'ring',
    baseStats: { intelligence: 2, agility: 2 },
    rareOnlyStats: { armor: 2 },
    signature: true,
  },
  {
    baseId: 'purified_breastplate',
    name: 'Cuirasse purifiée',
    category: 'chest',
    baseStats: { vitality: 4, armor: 2 },
    rareOnlyStats: { armor: 2 },
    signature: true,
  },
  {
    baseId: 'sealed_blade',
    name: 'Lame du Sceau originel',
    category: 'weapon',
    baseStats: { strength: 4, intelligence: 2 },
    rareOnlyStats: { fireDamage: 4 },
    signature: true,
  },
  {
    baseId: 'watchtower_helm',
    name: 'Heaume de la Vigie oubliée',
    category: 'helmet',
    baseStats: { vitality: 3, agility: 2 },
    rareOnlyStats: { armor: 2 },
    signature: true,
  },
  {
    baseId: 'eternal_watch_greaves',
    name: 'Grèves de la Veille éternelle',
    category: 'legs',
    baseStats: { agility: 3, vitality: 2 },
    rareOnlyStats: { armor: 3 },
    signature: true,
  },
  {
    baseId: 'last_watcher_boots',
    name: 'Bottes du Dernier Veilleur',
    category: 'boots',
    baseStats: { agility: 3, vitality: 3 },
    rareOnlyStats: { armor: 2 },
    signature: true,
  },
];

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Commun',
  rare: 'Rare',
  epic: 'Épique',
};

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9aa0a6',
  rare: '#4fa3e3',
  epic: '#a855f7',
};

const RARITY_MULTIPLIER: Record<Rarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
};

const RARITY_SELL_PRICE: Record<Rarity, number> = {
  common: 10,
  rare: 25,
  epic: 60,
};

export function sellPrice(item: Item): number {
  return RARITY_SELL_PRICE[item.rarity];
}

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

// Short square-icon labels standing in for real art (increment 10) — used by
// the Sac's icon grid so items read at a glance instead of as full names.
const CATEGORY_ICONS: Record<ItemCategory, string> = {
  weapon: 'ARM',
  shield: 'BOU',
  helmet: 'CAS',
  chest: 'TOR',
  legs: 'JAM',
  boots: 'BOT',
  gloves: 'GAN',
  ring1: 'ANN',
  ring2: 'ANN',
  ring: 'ANN',
  amulet: 'AMU',
};

export function categoryIcon(category: ItemCategory): string {
  return CATEGORY_ICONS[category];
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

// Total stat weight of an item — rarity is already baked in here since rare
// items roll with scaled-up (and sometimes bonus) stats, so this single
// number captures both "stats" and "rareté" per the comparison the Sac shows.
function powerScore(item: Item): number {
  return Object.values(item.stats).reduce((sum: number, value) => sum + (value ?? 0), 0);
}

// Whether `next` would be a strict upgrade over `current` (or over nothing,
// i.e. an empty slot) — drives the "meilleur objet" highlight in the Sac.
export function isUpgrade(next: Item, current?: Item): boolean {
  return powerScore(next) > (current ? powerScore(current) : 0);
}

interface LootOptions {
  // Boss fights guarantee a drop instead of rolling the base chance.
  guaranteed?: boolean;
  // Base chance of rolling rare instead of common, when a drop happens.
  rareChance?: number;
  // Chance of rolling epic instead of rare/common — 0 by default, so only
  // hard-dungeon bosses that explicitly opt in can drop one from the pool
  // (on top of any signature reward they grant directly).
  epicChance?: number;
}

const LOOTABLE_TEMPLATES = TEMPLATES.filter((t) => !t.signature);

// Modest drop chance, mostly common with a smaller chance of rare/epic —
// bosses pass { guaranteed: true } for a sure drop with better odds. Real
// per-dungeon loot tables come as more dungeons are added; difficulty tiers
// currently differ via rareChance/epicChance, not separate tables.
export function rollLootItem(options: LootOptions = {}): Item | null {
  const { guaranteed = false, rareChance = 0.2, epicChance = 0 } = options;
  if (!guaranteed && Math.random() > 0.4) return null;
  const template = LOOTABLE_TEMPLATES[Math.floor(Math.random() * LOOTABLE_TEMPLATES.length)];
  const roll = Math.random();
  const rarity: Rarity = roll < epicChance ? 'epic' : roll < epicChance + rareChance ? 'rare' : 'common';
  return createItem(template.baseId, rarity);
}
