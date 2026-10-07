import Phaser from 'phaser';
import { Character } from '../game/character';
import { CraftableItemInfo, RARITY_LABELS, Rarity, createItem, getCraftableItems } from '../game/item';
import { materialLabel } from '../game/material';
import { CONSUMABLES } from '../game/consumable';
import { RECIPES, RecipeDefinition, canCraft, canCraftGeneric, craft, craftGeneric, genericCraftCost } from '../game/recipe';
import { SaveManager } from '../save/SaveManager';
import { ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { playCraftSuccess } from '../ui/sound';
import { placeItemIcon, preloadItemIcons } from '../entities/itemIcon';
import { INK, KitButton, addPanel, addScreenPanel, buttonRow, drawButton, panelText, preloadUiKit, toast } from '../ui/kit';
import { GOOD_INK, RARITY_INK, itemTypeLine } from '../ui/itemText';
import { Action, DETAIL_HEIGHT, DETAIL_TOP, LIST_TOP, SCREEN_INNER_W, SCREEN_LEFT, actionRow, detailPanel, pager } from '../ui/screen';

type CraftTab = 'forge' | 'alchemy' | 'free';

const TABS: { id: CraftTab; label: string }[] = [
  { id: 'forge', label: 'Forge' },
  { id: 'alchemy', label: 'Alchimie' },
  { id: 'free', label: 'Forge libre' },
];

const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
const ROW_STEP = 28;
const ROWS_PER_PAGE = 5;
const FREE_LIST_TOP = LIST_TOP + 24;
const FREE_COLS = 5;
const FREE_ROWS = 3;
const CELL = 32;

interface CraftingData {
  x?: number;
  y?: number;
  returnScene?: ReturnSceneKey;
}

// Artisanat in UI style A, one screen with three tabs: the named forge and
// alchemy recipes, and the Forge libre (every lootable item, common to
// legendary, at the generic cost of its palier — see recipe.ts).
export class CraftingScene extends Phaser.Scene {
  private character!: Character;
  private returnX?: number;
  private returnY?: number;
  private returnScene: ReturnSceneKey = 'Village';
  private tab: CraftTab = 'forge';
  private page = 0;
  private selected?: string;
  private freeTier: 1 | 2 | 3 = 1;
  private freeRarity: Rarity = 'common';
  private craftable: CraftableItemInfo[] = [];
  private loadingIcons = false;

  constructor() {
    super('Crafting');
  }

  init(data: CraftingData): void {
    this.returnX = data?.x;
    this.returnY = data?.y;
    this.returnScene = data?.returnScene ?? 'Village';
    this.tab = 'forge';
    this.page = 0;
    this.selected = undefined;
    this.freeTier = 1;
    this.freeRarity = 'common';
  }

  preload(): void {
    preloadUiKit(this);
  }

  async create(): Promise<void> {
    const save = await SaveManager.load();
    this.character = save!.character!;
    this.craftable = getCraftableItems();
    const recipeItems = Object.values(RECIPES).flatMap((r) => (r.resultType === 'item' ? [r.resultItemBaseId] : []));
    await preloadItemIcons(this, recipeItems);
    if (!this.scene.isActive()) return;
    this.render();
  }

  private goBack(): void {
    this.scene.start(this.returnScene, returnSceneStartData(this.returnScene, this.returnX, this.returnY));
  }

  private render(): void {
    this.children.removeAll(true);
    addScreenPanel(this);
    panelText(this, this.scale.width / 2, 14, 'Artisanat', 12).setOrigin(0.5, 0);
    buttonRow(TABS.length, SCREEN_LEFT, SCREEN_INNER_W).forEach(({ x, w }, i) => {
      const tab = TABS[i];
      new KitButton(this, x, 34, w, 20, tab.label, {
        size: 8,
        align: 'center',
        state: tab.id === this.tab ? 'pressed' : 'normal',
        onClick: () => {
          if (tab.id === this.tab) return;
          this.tab = tab.id;
          this.page = 0;
          this.selected = undefined;
          this.render();
        },
      });
    });
    if (this.tab === 'free') this.renderFree();
    else this.renderRecipes(this.tab);
  }

  private pager(total: number, perPage: number): void {
    this.page = pager(this, this.page, total, perPage, (page) => {
      this.page = page;
      this.selected = undefined;
      this.render();
    });
  }

  private actions(list: Action[]): void {
    actionRow(this, [...list, { label: 'Retour', onClick: () => this.goBack() }]);
  }

  private say(message: string, color: string = INK.text): void {
    toast(this, this.scale.width / 2, DETAIL_TOP - 12, message, color);
  }

  private materialLines(cost: Partial<Record<string, number>>): { text: string; color: string }[] {
    return Object.entries(cost).map(([id, count]) => {
      const owned = this.character.materials[id] ?? 0;
      return { text: `${materialLabel(id)} : ${owned}/${count}`, color: owned >= (count ?? 0) ? GOOD_INK : INK.danger };
    });
  }

  // -------------------------------------------------------------- recipes

  private renderRecipes(station: 'forge' | 'alchemy'): void {
    const recipes = Object.values(RECIPES).filter((r) => r.station === station);
    this.pager(recipes.length, ROWS_PER_PAGE);
    recipes.slice(this.page * ROWS_PER_PAGE, (this.page + 1) * ROWS_PER_PAGE).forEach((recipe, i) => {
      const ready = canCraft(this.character, recipe.id);
      new KitButton(this, SCREEN_LEFT, LIST_TOP + i * ROW_STEP, SCREEN_INNER_W, 24, recipe.name, {
        icon: recipe.resultType === 'item' ? undefined : 'potion',
        iconTexture: recipe.resultType === 'item' ? `item-icon-${recipe.resultItemBaseId}` : undefined,
        size: 9,
        cost: ready ? 'Prêt' : undefined,
        state: recipe.id === this.selected ? 'pressed' : 'normal',
        onClick: () => {
          this.selected = recipe.id;
          this.render();
        },
      });
    });
    const recipe = recipes.find((r) => r.id === this.selected);
    if (!recipe) {
      detailPanel(this, { text: station === 'forge' ? 'La forge' : "L'alchimie", color: INK.text }, [
        { text: '« Prêt » : tu as tout ce qu’il faut.', color: INK.soft },
        { text: 'Les ressources se trouvent sur les monstres, chez la marchande et sur son étal.', color: INK.soft },
      ]);
      this.actions([]);
      return;
    }
    detailPanel(this, this.resultTitle(recipe), [
      ...this.resultLines(recipe),
      { text: recipe.description, color: INK.soft },
      ...this.materialLines(recipe.materials),
    ]);
    this.actions([{ label: 'Fabriquer', disabled: !canCraft(this.character, recipe.id), onClick: () => void this.craftRecipe(recipe) }]);
  }

  private resultTitle(recipe: RecipeDefinition): { text: string; color: string } {
    if (recipe.resultType === 'item') {
      return { text: `${recipe.name} (${RARITY_LABELS[recipe.resultItemRarity]})`, color: RARITY_INK[recipe.resultItemRarity] };
    }
    return { text: recipe.name, color: INK.text };
  }

  private resultLines(recipe: RecipeDefinition): { text: string; color: string }[] {
    if (recipe.resultType === 'item') return [{ text: itemTypeLine(createItem(recipe.resultItemBaseId, recipe.resultItemRarity)), color: INK.soft }];
    return [{ text: CONSUMABLES[recipe.resultConsumableId].description, color: INK.text }];
  }

  private async craftRecipe(recipe: RecipeDefinition): Promise<void> {
    if (!craft(this.character, recipe.id)) {
      this.say('Matériaux insuffisants.', INK.danger);
      return;
    }
    await SaveManager.saveCharacter(this.character);
    playCraftSuccess();
    this.render();
    this.say(`${recipe.name} fabriqué${recipe.resultType === 'item' ? ', dans le sac' : ''} !`);
  }

  // ----------------------------------------------------------- free forge

  private renderFree(): void {
    buttonRow(3, SCREEN_LEFT, SCREEN_INNER_W).forEach(({ x, w }, i) => {
      const tier = (i + 1) as 1 | 2 | 3;
      new KitButton(this, x, LIST_TOP, w, 18, `Palier ${tier}`, {
        size: 8,
        align: 'center',
        state: tier === this.freeTier ? 'pressed' : 'normal',
        onClick: () => {
          this.freeTier = tier;
          this.page = 0;
          this.selected = undefined;
          this.render();
        },
      });
    });
    const items = this.craftable.filter((c) => c.tier === this.freeTier);
    const perPage = FREE_COLS * FREE_ROWS;
    this.pager(items.length, perPage);
    const pageItems = items.slice(this.page * perPage, (this.page + 1) * perPage);
    const missing = pageItems.filter((c) => !this.textures.exists(`item-icon-${c.baseId}`));
    if (missing.length > 0 && !this.loadingIcons) {
      // Icons load per page; the screen redraws once they're in.
      this.loadingIcons = true;
      void preloadItemIcons(this, missing.map((c) => c.baseId)).then(() => {
        this.loadingIcons = false;
        if (this.scene.isActive()) this.render();
      });
    }
    pageItems.forEach((info, i) => {
      const x = SCREEN_LEFT + (i % FREE_COLS) * 39;
      const y = FREE_LIST_TOP + Math.floor(i / FREE_COLS) * 38;
      const g = this.add.graphics();
      drawButton(g, x, y, CELL, CELL, info.baseId === this.selected ? 'pressed' : 'normal');
      if (!placeItemIcon(this, info.baseId, x + CELL / 2, y + CELL / 2, 24)) {
        this.add.image(x + CELL / 2, y + CELL / 2, info.category === 'weapon' ? 'ui-icon-sword' : 'ui-icon-bag');
      }
      this.add
        .zone(x, y, CELL, CELL)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.selected = info.baseId;
          this.render();
        });
    });

    const info = items.find((c) => c.baseId === this.selected);
    if (!info) {
      detailPanel(this, { text: 'Forge libre', color: INK.text }, [
        { text: 'Tout objet trouvable, du commun au légendaire, au coût de son palier.', color: INK.soft },
        { text: 'Choisis un objet, puis sa rareté.', color: INK.soft },
        { text: `${items.length} objets au palier ${this.freeTier}.`, color: INK.soft },
      ]);
      this.actions([]);
      return;
    }
    this.renderFreeDetail(info);
  }

  // Detail with a rarity picker inside the panel and the matching cost.
  private renderFreeDetail(info: CraftableItemInfo): void {
    addPanel(this, SCREEN_LEFT, DETAIL_TOP, SCREEN_INNER_W, DETAIL_HEIGHT);
    const x = SCREEN_LEFT + 10;
    panelText(this, x, DETAIL_TOP + 8, info.name, 9, RARITY_INK[this.freeRarity]);
    panelText(this, x, DETAIL_TOP + 22, itemTypeLine(createItem(info.baseId, 'common')), 8, INK.soft);
    buttonRow(4, x, SCREEN_INNER_W - 20, 4).forEach(({ x: bx, w }, i) => {
      const rarity = RARITIES[i];
      new KitButton(this, bx, DETAIL_TOP + 36, w, 18, RARITY_LABELS[rarity], {
        size: 7,
        align: 'center',
        state: rarity === this.freeRarity ? 'pressed' : 'normal',
        onClick: () => {
          this.freeRarity = rarity;
          this.render();
        },
      });
    });
    this.materialLines(genericCraftCost(info.tier, this.freeRarity)).forEach((line, i) => {
      panelText(this, x, DETAIL_TOP + 60 + i * 12, line.text, 8, line.color);
    });
    const ready = canCraftGeneric(this.character, info.tier, this.freeRarity);
    this.actions([{ label: 'Fabriquer', disabled: !ready, onClick: () => void this.craftFree(info) }]);
  }

  private async craftFree(info: CraftableItemInfo): Promise<void> {
    if (!craftGeneric(this.character, info.baseId, info.tier, this.freeRarity)) {
      this.say('Matériaux insuffisants.', INK.danger);
      return;
    }
    await SaveManager.saveCharacter(this.character);
    playCraftSuccess();
    this.render();
    this.say(`${info.name} (${RARITY_LABELS[this.freeRarity]}) fabriqué, dans le sac !`);
  }
}
