import { Character } from './character';
import { Item, rollLootItem, sellPrice } from './item';

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

// Tier 1 only, common/rare only — the Village shop is the starting hub, and
// letting gold buy epic/legendary gear (or anything past palier 1) would
// undercut the loot-tier-by-zone progression built earlier (see
// DUNGEON_LOOT_TIER) and the farm/craft gates on higher-palier gear.
function generateStock(): Item[] {
  const items: Item[] = [];
  for (let i = 0; i < STOCK_SIZE; i++) {
    const item = rollLootItem({ guaranteed: true, tier: 1, rareChance: 0.25 });
    if (item) items.push(item);
  }
  return items;
}

// Regenerates and persists fresh stock onto the character if none exists
// yet or the refresh interval has elapsed; otherwise returns what's already
// there unchanged. Callers still need to SaveManager.saveCharacter()
// afterward if this mutated anything (same pattern as every other function
// here that mutates Character in place).
export function getMerchantStock(character: Character): Item[] {
  const now = Date.now();
  if (!character.merchantStock || now - character.merchantStock.refreshedAt >= REFRESH_INTERVAL_MS) {
    character.merchantStock = { items: generateStock(), refreshedAt: now };
  }
  return character.merchantStock.items;
}

export function merchantBuyPrice(item: Item): number {
  return sellPrice(item) * BUY_MARKUP;
}

export function msUntilMerchantRefresh(character: Character): number {
  if (!character.merchantStock) return 0;
  return Math.max(0, REFRESH_INTERVAL_MS - (Date.now() - character.merchantStock.refreshedAt));
}

// Removes the bought item from stock (sold out until next refresh) and
// deducts gold; no-op (returns false) if the character can't afford it or
// the item is no longer in stock (e.g. a stale UI after a refresh).
export function buyMerchantStockItem(character: Character, itemId: string): boolean {
  const stock = getMerchantStock(character);
  const item = stock.find((i) => i.id === itemId);
  if (!item) return false;
  const price = merchantBuyPrice(item);
  if (character.gold < price) return false;
  character.gold -= price;
  character.inventory.push(item);
  character.merchantStock!.items = stock.filter((i) => i.id !== itemId);
  return true;
}
