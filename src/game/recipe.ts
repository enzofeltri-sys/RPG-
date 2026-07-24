import { Character } from './character';
import { MaterialId } from './material';
import { ConsumableId } from './consumable';
import { createItem } from './item';

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
}

interface ConsumableRecipe extends RecipeDefinitionBase {
  resultType: 'consumable';
  resultConsumableId: ConsumableId;
}

export type RecipeDefinition = ItemRecipe | ConsumableRecipe;

// Just enough to validate the crafting loop (gather -> craft -> use/equip),
// per DESIGN.md's v1 scope: one forge recipe, one alchemy recipe. More
// recipes/materials come with content extension later.
export const RECIPES: Record<string, RecipeDefinition> = {
  forge_short_sword: {
    id: 'forge_short_sword',
    name: 'Épée courte',
    description: "Forger une épée courte à partir de fer brut.",
    station: 'forge',
    materials: { iron_ore: 3 },
    resultType: 'item',
    resultItemBaseId: 'short_sword',
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
    character.inventory.push(createItem(recipe.resultItemBaseId, 'common'));
  } else {
    character.consumables[recipe.resultConsumableId] = (character.consumables[recipe.resultConsumableId] ?? 0) + 1;
  }

  return true;
}
