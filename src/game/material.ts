// Each gatherable/droppable resource has a common and a rare variant, stored
// as distinct ids (rather than a nested {id, rarity} shape) so the existing
// flat `character.materials: Record<string, number>` counters need no schema
// change — same pattern already proven for the equipment rarity ladder in
// item.ts, just without the stat-scaling machinery items need.
// steel_ingot/mithril_shard (+ rare variants) are farmed by fighting in
// tier-2/tier-3 dungeons respectively (see CombatScene's TIER_MATERIAL) —
// they feed the craft-only "artisan" recipes in recipe.ts, deliberately not
// obtainable any other way so that farming a recipe's materials is the only
// path to those items.
export type MaterialId =
  | 'iron_ore'
  | 'herb'
  | 'leather'
  | 'iron_ore_rare'
  | 'herb_rare'
  | 'leather_rare'
  | 'steel_ingot'
  | 'steel_ingot_rare'
  | 'mithril_shard'
  | 'mithril_shard_rare';

export const MATERIAL_LABELS: Record<MaterialId, string> = {
  iron_ore: 'Fer brut',
  herb: 'Herbe médicinale',
  leather: 'Cuir',
  iron_ore_rare: 'Fer étincelant',
  herb_rare: 'Herbe rare',
  leather_rare: 'Cuir supérieur',
  steel_ingot: "Lingot d'acier trempé",
  steel_ingot_rare: "Lingot d'acier étincelant",
  mithril_shard: 'Éclat de mithril',
  mithril_shard_rare: 'Éclat de mithril pur',
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
