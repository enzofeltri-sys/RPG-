// Each gatherable/droppable resource has a common and a rare variant, stored
// as distinct ids (rather than a nested {id, rarity} shape) so the existing
// flat `character.materials: Record<string, number>` counters need no schema
// change — same pattern already proven for the equipment rarity ladder in
// item.ts, just without the stat-scaling machinery items need.
export type MaterialId = 'iron_ore' | 'herb' | 'leather' | 'iron_ore_rare' | 'herb_rare' | 'leather_rare';

export const MATERIAL_LABELS: Record<MaterialId, string> = {
  iron_ore: 'Fer brut',
  herb: 'Herbe médicinale',
  leather: 'Cuir',
  iron_ore_rare: 'Fer étincelant',
  herb_rare: 'Herbe rare',
  leather_rare: 'Cuir supérieur',
};

export function materialLabel(id: string): string {
  return MATERIAL_LABELS[id as MaterialId] ?? id;
}

// Drives the Sac's Ressources tab styling — a "supérieur"/rare material
// should read as obviously better at a glance, same idea as item rarity
// colors (see item.ts's RARITY_COLORS) without pulling in the full Rarity
// ladder for what's still just a two-tier system.
export function isRareMaterial(id: string): boolean {
  return id.endsWith('_rare');
}
