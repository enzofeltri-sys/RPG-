import {
  Item,
  Rarity,
  RARITY_LABELS,
  compareItemStats,
  describeItemSetDetail,
  describeItemStats,
  equipSlotLabel,
  isCraftOnly,
  isUpgrade,
} from '../game/item';
import { SHIELD_BLOCK_CHANCE, WEAPON_PROFILES, handRule } from '../game/weapons';
import { Character } from '../game/character';
import { targetSlot } from './screen';

// Rarity colors readable on parchment (UI style A); the old RARITY_COLORS
// were tuned for the dark provisional screens.
export const RARITY_INK: Record<Rarity, string> = {
  common: '#482c22',
  rare: '#3260b0',
  epic: '#5c3480',
  legendary: '#ac701e',
};

// Stripe drawn on an item's slot or row to show its rarity at a glance.
export const RARITY_STRIPE: Record<Rarity, number | null> = {
  common: null,
  rare: 0x3260b0,
  epic: 0x985ebc,
  legendary: 0xeebc3c,
};

export const GOOD_INK = '#3e6e26';

const HANDS_LABEL = { right: 'main droite', left: 'main gauche', either: 'une main', both: 'deux mains' } as const;

export function itemTitle(item: Item): string {
  return `${item.name} (${RARITY_LABELS[item.rarity]})`;
}

// "Épée · une main · dégâts 3-6", "Bouclier · main gauche · blocage 10 %",
// "Casque"…
export function itemTypeLine(item: Item): string {
  const rule = handRule(item);
  if (item.category === 'weapon' && item.weaponType) {
    const profile = WEAPON_PROFILES[item.weaponType];
    const parts = [profile.label];
    if (rule && !profile.label.includes('deux mains')) parts.push(HANDS_LABEL[rule]);
    parts.push(`dégâts ${profile.min}-${profile.max}`);
    if (profile.crit > 0) parts.push(`crit. +${Math.round(profile.crit * 100)} %`);
    return parts.join(' · ');
  }
  if (item.category === 'shield') return `Bouclier · main gauche · blocage ${Math.round(SHIELD_BLOCK_CHANCE * 100)} %`;
  if (item.category === 'offhand') return 'Accessoire · main gauche';
  if (item.category === 'ring') return 'Anneau';
  return equipSlotLabel(item.category);
}

export function itemStatsLine(item: Item): string {
  return describeItemStats(item).join(' · ') || 'Aucun bonus';
}

// The set line only (the full bonus breakdown doesn't fit a detail panel).
export function itemSetLine(item: Item, character: Character): string | undefined {
  return describeItemSetDetail(item.baseId, character.equipment)[0];
}

export function comparisonLine(next: Item, current: Item | undefined): { text: string; color: string } {
  if (!current) return { text: '+ Emplacement vide', color: GOOD_INK };
  if (isUpgrade(next, current)) return { text: "+ Meilleure que l'actuelle", color: GOOD_INK };
  if (isUpgrade(current, next)) return { text: "− Moins bonne que l'actuelle", color: '#7a1c2c' };
  return { text: "= Équivalente à l'actuelle", color: '#764c2e' };
}

// Full detail for an item not worn yet: type, a per-stat comparison with
// what's in its slot, the overall verdict, set and craft notes.
export function itemCompareLines(character: Character, item: Item): { text: string; color: string }[] {
  const slot = targetSlot(character, item);
  const equipped = character.equipment[slot];
  const lines = [{ text: itemTypeLine(item), color: '#764c2e' }];
  const diffs = compareItemStats(item, equipped);
  if (diffs.length === 0) lines.push({ text: 'Aucun bonus.', color: '#482c22' });
  diffs.forEach((d) => lines.push({ text: d, color: d.includes('(+') ? GOOD_INK : d.includes('(-') ? '#7a1c2c' : '#482c22' }));
  lines.push(equipped ? comparisonLine(item, equipped) : { text: `+ ${equipSlotLabel(slot)} : vide pour l'instant`, color: GOOD_INK });
  const set = itemSetLine(item, character);
  if (set) lines.push({ text: set, color: '#764c2e' });
  if (isCraftOnly(item.baseId)) lines.push({ text: "Objet d'artisanat : uniquement à la Forge.", color: '#764c2e' });
  return lines;
}
