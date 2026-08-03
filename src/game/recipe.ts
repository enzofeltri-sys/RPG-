import { Character } from './character';
import { MaterialId } from './material';
import { ConsumableId } from './consumable';
import { Rarity, createItem } from './item';

// Generic, formula-based crafting — every lootable item (see item.ts's
// getCraftableItems(), which is exactly the loot pool minus signature/
// craftOnly uniques) can be crafted at any of the 4 rarities through this
// table instead of one hand-authored RecipeDefinition per item/rarity pair
// (121 items × 4 rarities would be 484 static objects — unmaintainable,
// and would blow up a paginated recipe list). Cost scales by the item's
// palier (which material family) and target rarity (2 materials at
// common, up to the 5-resource ceiling at legendary), mirroring the
// hand-tuned "artisan" recipes above closely enough that the two systems
// feel like one continuous design rather than two different rulesets.
export const GENERIC_CRAFT_COST: Record<1 | 2 | 3, Record<Rarity, Partial<Record<MaterialId, number>>>> = {
  1: {
    common: { iron_ore: 2, leather: 1 },
    rare: { iron_ore: 2, iron_ore_rare: 1, leather: 1 },
    epic: { iron_ore: 3, iron_ore_rare: 2, leather: 2, leather_rare: 1 },
    legendary: { iron_ore: 4, iron_ore_rare: 3, leather: 3, leather_rare: 2, herb: 2 },
  },
  2: {
    common: { steel_ingot: 2, iron_ore: 1 },
    rare: { steel_ingot: 3, steel_ingot_rare: 1, iron_ore: 1 },
    epic: { steel_ingot: 4, steel_ingot_rare: 2, iron_ore: 2, leather: 1 },
    legendary: { steel_ingot: 5, steel_ingot_rare: 3, iron_ore: 3, leather: 2, herb: 1 },
  },
  3: {
    common: { mithril_shard: 2, steel_ingot: 1 },
    rare: { mithril_shard: 3, mithril_shard_rare: 1, steel_ingot: 1 },
    epic: { mithril_shard: 4, mithril_shard_rare: 2, steel_ingot: 2, steel_ingot_rare: 1 },
    legendary: { mithril_shard: 6, mithril_shard_rare: 3, steel_ingot: 4, steel_ingot_rare: 2, iron_ore: 3 },
  },
};

export function genericCraftCost(tier: 1 | 2 | 3, rarity: Rarity): Partial<Record<MaterialId, number>> {
  return GENERIC_CRAFT_COST[tier][rarity];
}

export function canCraftGeneric(character: Character, tier: 1 | 2 | 3, rarity: Rarity): boolean {
  const cost = genericCraftCost(tier, rarity);
  return (Object.entries(cost) as [MaterialId, number][]).every(
    ([materialId, count]) => (character.materials[materialId] ?? 0) >= count,
  );
}

// Deducts materials and grants baseId at the given rarity; no-op (returns
// false) if the character doesn't have what genericCraftCost requires.
export function craftGeneric(character: Character, baseId: string, tier: 1 | 2 | 3, rarity: Rarity): boolean {
  if (!canCraftGeneric(character, tier, rarity)) return false;
  const cost = genericCraftCost(tier, rarity);
  (Object.entries(cost) as [MaterialId, number][]).forEach(([materialId, count]) => {
    character.materials[materialId] = (character.materials[materialId] ?? 0) - count;
  });
  character.inventory.push(createItem(baseId, rarity));
  return true;
}

interface RecipeDefinitionBase {
  id: string;
  name: string;
  description: string;
  station: 'forge' | 'alchemy';
  materials: Partial<Record<MaterialId, number>>;
}

interface ItemRecipe extends RecipeDefinitionBase {
  resultType: 'item';
  resultItemBaseId: string;
  resultItemRarity: Rarity;
}

interface ConsumableRecipe extends RecipeDefinitionBase {
  resultType: 'consumable';
  resultConsumableId: ConsumableId;
}

export type RecipeDefinition = ItemRecipe | ConsumableRecipe;

export const RECIPES: Record<string, RecipeDefinition> = {
  // Every recipe needs at least 2 distinct materials, scaling up to 5 for
  // the legendary "artisan" line below — a single-material recipe reads as
  // a resource sink rather than an actual crafting choice.
  forge_short_sword: {
    id: 'forge_short_sword',
    name: 'Épée courte',
    description: "Forger une épée courte à partir de fer brut, la garde enveloppée de cuir.",
    station: 'forge',
    materials: { iron_ore: 2, leather: 1 },
    resultType: 'item',
    resultItemBaseId: 'short_sword',
    resultItemRarity: 'common',
  },
  brew_health_potion: {
    id: 'brew_health_potion',
    name: 'Potion de soin',
    description: "Préparer une potion de soin à partir d'herbes médicinales, en fiole de cuir.",
    station: 'alchemy',
    materials: { herb: 2, leather: 1 },
    resultType: 'consumable',
    resultConsumableId: 'health_potion',
  },
  // Upgraded recipes — each still needs the common material alongside its
  // rare counterpart, so both tiers stay worth gathering/dropping rather than
  // the rare variant simply replacing the common one outright.
  forge_short_sword_rare: {
    id: 'forge_short_sword_rare',
    name: 'Épée courte (qualité supérieure)',
    description: 'Forger une épée courte de qualité rare à partir de fer étincelant.',
    station: 'forge',
    materials: { iron_ore: 2, iron_ore_rare: 1 },
    resultType: 'item',
    resultItemBaseId: 'short_sword',
    resultItemRarity: 'rare',
  },
  forge_leather_gloves_rare: {
    id: 'forge_leather_gloves_rare',
    name: 'Gants de cuir (qualité supérieure)',
    description: 'Travailler du cuir supérieur en gants de qualité rare.',
    station: 'forge',
    materials: { leather: 2, leather_rare: 1 },
    resultType: 'item',
    resultItemBaseId: 'leather_gloves',
    resultItemRarity: 'rare',
  },
  brew_health_potion_greater: {
    id: 'brew_health_potion_greater',
    name: 'Potion de soin supérieure',
    description: 'Préparer une potion de soin supérieure à partir d’herbe rare.',
    station: 'alchemy',
    materials: { herb: 2, herb_rare: 1 },
    resultType: 'consumable',
    resultConsumableId: 'health_potion_greater',
  },
  // "Artisan" line — the only way to obtain these 4 items (see item.ts's
  // craftOnly flag): never dropped, never rolled. A full commun→légendaire
  // arc per item (4 recipes each, one per rarity) rather than just the
  // epic/légendaire pair originally shipped — a fresh character can start
  // this line with palier-1 materials on day one, then reforge the same
  // item all the way to légendaire once the harder materials are farmable.
  craft_artisan_blade_common: {
    id: 'craft_artisan_blade_common',
    name: "Lame de l'artisan (premier essai)",
    description: "Un premier essai de la lame de l'artisan, au fer brut et au cuir.",
    station: 'forge',
    materials: { iron_ore: 3, leather: 1 },
    resultType: 'item',
    resultItemBaseId: 'artisan_blade',
    resultItemRarity: 'common',
  },
  craft_artisan_amulet_common: {
    id: 'craft_artisan_amulet_common',
    name: "Amulette de l'artisan (premier essai)",
    description: "Un premier essai de l'amulette de l'artisan, au fer brut et au cuir.",
    station: 'forge',
    materials: { iron_ore: 3, leather: 1 },
    resultType: 'item',
    resultItemBaseId: 'artisan_amulet',
    resultItemRarity: 'common',
  },
  craft_artisan_ring_common: {
    id: 'craft_artisan_ring_common',
    name: "Anneau de l'artisan (premier essai)",
    description: "Un premier essai de l'anneau de l'artisan, au fer brut et au cuir.",
    station: 'forge',
    materials: { iron_ore: 2, leather: 1 },
    resultType: 'item',
    resultItemBaseId: 'artisan_ring',
    resultItemRarity: 'common',
  },
  craft_artisan_gloves_common: {
    id: 'craft_artisan_gloves_common',
    name: "Gants de l'artisan (premier essai)",
    description: "Un premier essai des gants de l'artisan, au fer brut et au cuir.",
    station: 'forge',
    materials: { iron_ore: 2, leather: 1 },
    resultType: 'item',
    resultItemBaseId: 'artisan_gloves',
    resultItemRarity: 'common',
  },
  craft_artisan_blade_rare: {
    id: 'craft_artisan_blade_rare',
    name: "Lame de l'artisan (qualité supérieure)",
    description: "Reforger la lame de l'artisan avec du fer étincelant et un cœur d'acier trempé.",
    station: 'forge',
    materials: { iron_ore: 2, iron_ore_rare: 1, steel_ingot: 1 },
    resultType: 'item',
    resultItemBaseId: 'artisan_blade',
    resultItemRarity: 'rare',
  },
  craft_artisan_amulet_rare: {
    id: 'craft_artisan_amulet_rare',
    name: "Amulette de l'artisan (qualité supérieure)",
    description: "Reforger l'amulette de l'artisan avec du fer étincelant et un cœur d'acier trempé.",
    station: 'forge',
    materials: { iron_ore: 2, iron_ore_rare: 1, steel_ingot: 1 },
    resultType: 'item',
    resultItemBaseId: 'artisan_amulet',
    resultItemRarity: 'rare',
  },
  craft_artisan_ring_rare: {
    id: 'craft_artisan_ring_rare',
    name: "Anneau de l'artisan (qualité supérieure)",
    description: "Reforger l'anneau de l'artisan avec du fer étincelant et un cœur d'acier trempé.",
    station: 'forge',
    materials: { iron_ore: 2, iron_ore_rare: 1, steel_ingot: 1 },
    resultType: 'item',
    resultItemBaseId: 'artisan_ring',
    resultItemRarity: 'rare',
  },
  craft_artisan_gloves_rare: {
    id: 'craft_artisan_gloves_rare',
    name: "Gants de l'artisan (qualité supérieure)",
    description: "Reforger les gants de l'artisan avec du fer étincelant et un cœur d'acier trempé.",
    station: 'forge',
    materials: { iron_ore: 2, iron_ore_rare: 1, steel_ingot: 1 },
    resultType: 'item',
    resultItemBaseId: 'artisan_gloves',
    resultItemRarity: 'rare',
  },
  // Costs real farming across two dungeon tiers (steel_ingot from Acte 2,
  // mithril_shard from Acte 3), capped at 3 distinct materials per recipe
  // (well under the 5-resource ceiling) with quantities high enough that
  // gathering them takes real playtime, not a lucky single kill.
  craft_artisan_blade: {
    id: 'craft_artisan_blade',
    name: "Lame de l'artisan",
    description: "Forger une lame d'exception en combinant mithril raffiné et acier trempé.",
    station: 'forge',
    materials: { mithril_shard: 4, mithril_shard_rare: 2, steel_ingot: 3 },
    resultType: 'item',
    resultItemBaseId: 'artisan_blade',
    resultItemRarity: 'epic',
  },
  craft_artisan_amulet: {
    id: 'craft_artisan_amulet',
    name: "Amulette de l'artisan",
    description: "Sertir un éclat de mithril pur dans une monture d'acier trempé.",
    station: 'forge',
    materials: { mithril_shard: 4, mithril_shard_rare: 2, steel_ingot: 3 },
    resultType: 'item',
    resultItemBaseId: 'artisan_amulet',
    resultItemRarity: 'epic',
  },
  craft_artisan_ring: {
    id: 'craft_artisan_ring',
    name: "Anneau de l'artisan",
    description: 'Couler un anneau fin à partir de mithril raffiné.',
    station: 'forge',
    materials: { mithril_shard: 3, mithril_shard_rare: 2, steel_ingot: 2 },
    resultType: 'item',
    resultItemBaseId: 'artisan_ring',
    resultItemRarity: 'epic',
  },
  craft_artisan_gloves: {
    id: 'craft_artisan_gloves',
    name: "Gants de l'artisan",
    description: "Doubler des gants d'acier trempé avec du mithril pur.",
    station: 'forge',
    materials: { mithril_shard: 3, mithril_shard_rare: 2, steel_ingot: 2 },
    resultType: 'item',
    resultItemBaseId: 'artisan_gloves',
    resultItemRarity: 'epic',
  },
  // Legendary upgrade of the artisan line — the top of the common→légendaire
  // crafting range, at the 5-material ceiling. Deliberately spans all three
  // material tiers (iron_ore from Acte 1 through mithril_shard_rare from
  // Acte 3) so the finished piece reflects the whole journey, not just the
  // latest zone, and gates it behind a heavier grind than the epic version
  // (more mithril_shard, plus a steel_ingot_rare requirement the epic
  // recipe doesn't have) — genuinely late-game, not a strict upgrade path
  // available the moment Acte 3 opens up.
  craft_artisan_blade_legendary: {
    id: 'craft_artisan_blade_legendary',
    name: "Lame de l'artisan (légendaire)",
    description: "Reforger la lame de l'artisan avec du mithril pur en abondance et un cœur d'acier trempé.",
    station: 'forge',
    materials: { mithril_shard: 6, mithril_shard_rare: 3, steel_ingot: 4, steel_ingot_rare: 2, iron_ore: 3 },
    resultType: 'item',
    resultItemBaseId: 'artisan_blade',
    resultItemRarity: 'legendary',
  },
  craft_artisan_amulet_legendary: {
    id: 'craft_artisan_amulet_legendary',
    name: "Amulette de l'artisan (légendaire)",
    description: "Reforger l'amulette de l'artisan avec du mithril pur en abondance et un cœur d'acier trempé.",
    station: 'forge',
    materials: { mithril_shard: 6, mithril_shard_rare: 3, steel_ingot: 4, steel_ingot_rare: 2, iron_ore: 3 },
    resultType: 'item',
    resultItemBaseId: 'artisan_amulet',
    resultItemRarity: 'legendary',
  },
  craft_artisan_ring_legendary: {
    id: 'craft_artisan_ring_legendary',
    name: "Anneau de l'artisan (légendaire)",
    description: "Reforger l'anneau de l'artisan avec du mithril pur en abondance et un cœur d'acier trempé.",
    station: 'forge',
    materials: { mithril_shard: 6, mithril_shard_rare: 3, steel_ingot: 4, steel_ingot_rare: 2, iron_ore: 3 },
    resultType: 'item',
    resultItemBaseId: 'artisan_ring',
    resultItemRarity: 'legendary',
  },
  craft_artisan_gloves_legendary: {
    id: 'craft_artisan_gloves_legendary',
    name: "Gants de l'artisan (légendaire)",
    description: "Reforger les gants de l'artisan avec du mithril pur en abondance et un cœur d'acier trempé.",
    station: 'forge',
    materials: { mithril_shard: 6, mithril_shard_rare: 3, steel_ingot: 4, steel_ingot_rare: 2, iron_ore: 3 },
    resultType: 'item',
    resultItemBaseId: 'artisan_gloves',
    resultItemRarity: 'legendary',
  },
};

export function canCraft(character: Character, recipeId: string): boolean {
  const recipe = RECIPES[recipeId];
  if (!recipe) return false;
  return (Object.entries(recipe.materials) as [MaterialId, number][]).every(
    ([materialId, count]) => (character.materials[materialId] ?? 0) >= count,
  );
}

// Deducts materials and grants the result; no-op (returns false) if the
// character doesn't have the required materials.
export function craft(character: Character, recipeId: string): boolean {
  const recipe = RECIPES[recipeId];
  if (!recipe || !canCraft(character, recipeId)) return false;

  (Object.entries(recipe.materials) as [MaterialId, number][]).forEach(([materialId, count]) => {
    character.materials[materialId] = (character.materials[materialId] ?? 0) - count;
  });

  if (recipe.resultType === 'item') {
    character.inventory.push(createItem(recipe.resultItemBaseId, recipe.resultItemRarity));
  } else {
    character.consumables[recipe.resultConsumableId] = (character.consumables[recipe.resultConsumableId] ?? 0) + 1;
  }

  return true;
}
