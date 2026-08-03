import { Character } from './character';
import { Item, Rarity, rollLootItem, sellPrice } from './item';
import { MaterialId } from './material';
import { getStoryTier } from './mainQuest';

// A real-world timer, not a story/level one — the shop is meant to feel
// like "come back later and see something different," independent of how
// far the player has progressed. Checked on each visit rather than via a
// background interval, since nothing needs to happen while the shop scene
// isn't open.
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
const STOCK_SIZE = 10;
// Buying costs more than selling nets — otherwise farming loot to resell
// and rebuy would be a free money-printer. Kept as a flat multiplier on
// the same sellPrice() everything else already uses, so there's only one
// place that defines what a rarity is "worth."
const BUY_MARKUP = 3;

export type MerchantStockEntry =
  | { kind: 'item'; item: Item }
  | { kind: 'material'; materialId: MaterialId; quantity: number };

// Each slot mostly rolls a normal palier-1 common/rare item (matching the
// original design), but has a small independent chance of rolling
// something well above what the starting hub would normally offer — epic
// gear (any palier), a rare legendary fluke, or a bundle of a scarcer
// crafting material. Kept low enough, and priced high enough (materials
// below, items via the same sellPrice() scaling everything else uses), that
// it stays an exciting rare treat rather than a reliable way to skip the
// farm/craft gates on higher-palier gear.
const EPIC_CHANCE = 0.12;
const LEGENDARY_CHANCE = 0.03;
const MATERIAL_CHANCE = 0.05;

const STOCK_MATERIALS: { materialId: MaterialId; price: number }[] = [
  { materialId: 'steel_ingot', price: 15 },
  { materialId: 'steel_ingot_rare', price: 40 },
  { materialId: 'mithril_shard', price: 30 },
  { materialId: 'mithril_shard_rare', price: 80 },
];

// storyTier caps every roll at what the save has actually unlocked (see
// getStoryTier in mainQuest.ts, same palier boundaries as
// DUNGEON_LOOT_TIER) — a fresh Acte 1 character never sees palier 3 gear
// here, and the stock's top palier rises automatically as the main quest
// advances, instead of being either stuck at palier 1 forever or fully
// random regardless of progress.
function rollStockEntry(storyTier: 1 | 2 | 3): MerchantStockEntry | null {
  const roll = Math.random();
  if (roll < MATERIAL_CHANCE) {
    const pick = STOCK_MATERIALS[Math.floor(Math.random() * STOCK_MATERIALS.length)];
    return { kind: 'material', materialId: pick.materialId, quantity: 1 };
  }
  // Epic/legendary rolls draw from a random palier up to storyTier, not a
  // fixed one — the point is an occasional glimpse of the best gear
  // currently reachable, never gear from an act not yet unlocked.
  if (roll < MATERIAL_CHANCE + LEGENDARY_CHANCE) {
    const tier = (Math.floor(Math.random() * storyTier) + 1) as 1 | 2 | 3;
    const item = rollLootItem({ guaranteed: true, legendaryChance: 1, tier });
    return item ? { kind: 'item', item } : null;
  }
  if (roll < MATERIAL_CHANCE + LEGENDARY_CHANCE + EPIC_CHANCE) {
    const tier = (Math.floor(Math.random() * storyTier) + 1) as 1 | 2 | 3;
    const item = rollLootItem({ guaranteed: true, epicChance: 1, tier });
    return item ? { kind: 'item', item } : null;
  }
  const item = rollLootItem({ guaranteed: true, tier: storyTier, rareChance: 0.25 });
  return item ? { kind: 'item', item } : null;
}

function generateStock(storyTier: 1 | 2 | 3): MerchantStockEntry[] {
  const entries: MerchantStockEntry[] = [];
  for (let i = 0; i < STOCK_SIZE; i++) {
    const entry = rollStockEntry(storyTier);
    if (entry) entries.push(entry);
  }
  return entries;
}

// True for saves written before this entries-based shape existed (the
// original shipped version stored `{ items: Item[] }` directly) — treated
// as stale so it regenerates into the new shape rather than crashing.
function hasCurrentShape(stock: unknown): stock is { entries: MerchantStockEntry[]; refreshedAt: number } {
  return !!stock && typeof stock === 'object' && 'entries' in stock;
}

// Regenerates and persists fresh stock onto the character if none exists
// yet, is in the old pre-entries shape, or the refresh interval has
// elapsed; otherwise returns what's already there unchanged. Callers still
// need to SaveManager.saveCharacter() afterward if this mutated anything
// (same pattern as every other function here that mutates Character in
// place).
export function getMerchantStock(character: Character): MerchantStockEntry[] {
  const now = Date.now();
  const current = character.merchantStock;
  if (!hasCurrentShape(current) || now - current.refreshedAt >= REFRESH_INTERVAL_MS) {
    character.merchantStock = { entries: generateStock(getStoryTier(character)), refreshedAt: now };
  }
  return (character.merchantStock as { entries: MerchantStockEntry[] }).entries;
}

export function merchantEntryPrice(entry: MerchantStockEntry): number {
  if (entry.kind === 'material') {
    return STOCK_MATERIALS.find((m) => m.materialId === entry.materialId)!.price * entry.quantity;
  }
  return sellPrice(entry.item) * BUY_MARKUP;
}

export function merchantEntryLabel(entry: MerchantStockEntry, materialLabel: (id: string) => string): string {
  if (entry.kind === 'material') {
    return `${materialLabel(entry.materialId)} (x${entry.quantity})`;
  }
  return entry.item.name;
}

export function merchantEntryRarity(entry: MerchantStockEntry): Rarity | null {
  return entry.kind === 'item' ? entry.item.rarity : null;
}

export function msUntilMerchantRefresh(character: Character): number {
  if (!hasCurrentShape(character.merchantStock)) return 0;
  return Math.max(0, REFRESH_INTERVAL_MS - (Date.now() - character.merchantStock.refreshedAt));
}

// Removes the bought entry from stock (sold out until next refresh) and
// deducts gold; no-op (returns false) if the character can't afford it or
// the entry is no longer in stock (e.g. a stale UI after a refresh).
export function buyMerchantStockEntry(character: Character, index: number): boolean {
  const stock = getMerchantStock(character);
  const entry = stock[index];
  if (!entry) return false;
  const price = merchantEntryPrice(entry);
  if (character.gold < price) return false;
  character.gold -= price;
  if (entry.kind === 'material') {
    character.materials[entry.materialId] = (character.materials[entry.materialId] ?? 0) + entry.quantity;
  } else {
    character.inventory.push(entry.item);
  }
  (character.merchantStock as { entries: MerchantStockEntry[] }).entries = stock.filter((_, i) => i !== index);
  return true;
}
