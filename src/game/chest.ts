import { Character } from './character';
import { Item, LOOT_ODDS, RARITY_LABELS, rollLootItem } from './item';
import { ReturnSceneKey } from '../ui/returnContext';
import { DUNGEON_LOOT_TIER } from './worldMap';


export function isChestOpened(character: Character, chestId: string): boolean {
  return Boolean(character.openedChests[chestId]);
}

// Returns null if the chest was already opened (no re-roll) — callers should
// check isChestOpened() first to show the right message instead of relying
// on this alone. `scene` picks the item palier (see DUNGEON_LOOT_TIER) so a
// chest's contents match where it actually sits in the story.
export function openChest(character: Character, chestId: string, scene: ReturnSceneKey): Item | null {
  if (character.openedChests[chestId]) return null;
  character.openedChests[chestId] = true;
  const tier = DUNGEON_LOOT_TIER[scene] ?? 1;
  const loot = rollLootItem({ ...LOOT_ODDS.chest, tier });
  if (loot) character.inventory.push(loot);
  return loot;
}

export function chestLootMessage(item: Item): string {
  return `Coffre ouvert : ${item.name} (${RARITY_LABELS[item.rarity]}) !`;
}
