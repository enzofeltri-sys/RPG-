import { Character } from './character';
import { MaterialId } from './material';
import { ConsumableId } from './consumable';
import { Rarity, createItem } from './item';

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
  forge_short_sword: {
    id: 'forge_short_sword',
    name: 'Épée courte',
    description: "Forger une épée courte à partir de fer brut.",
    station: 'forge',
    materials: { iron_ore: 3 },
    resultType: 'item',
    resultItemBaseId: 'short_sword',
    resultItemRarity: 'common',
  },
  brew_health_potion: {
    id: 'brew_health_potion',
    name: 'Potion de soin',
    description: 'Préparer une potion de soin à partir d’herbes médicinales.',
    station: 'alchemy',
    materials: { herb: 2 },
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
