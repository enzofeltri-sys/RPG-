import { Character } from './character';
import { Item, RARITY_LABELS, rollLootItem } from './item';

// Chests always yield something, with better rare/epic odds than a random
// monster kill — finding one off the beaten path (abandoned houses, dungeon
// corners) is meant to feel like a solid reward for exploring, distinct from
// combat loot.
const CHEST_RARE_CHANCE = 0.35;
const CHEST_EPIC_CHANCE = 0.08;

export function isChestOpened(character: Character, chestId: string): boolean {
  return Boolean(character.openedChests[chestId]);
}

// Returns null if the chest was already opened (no re-roll) — callers should
// check isChestOpened() first to show the right message instead of relying
// on this alone.
export function openChest(character: Character, chestId: string): Item | null {
  if (character.openedChests[chestId]) return null;
  character.openedChests[chestId] = true;
  const loot = rollLootItem({ guaranteed: true, rareChance: CHEST_RARE_CHANCE, epicChance: CHEST_EPIC_CHANCE });
  if (loot) character.inventory.push(loot);
  return loot;
}

export function chestLootMessage(item: Item): string {
  return `Coffre ouvert : ${item.name} (${RARITY_LABELS[item.rarity]}) !`;
}
