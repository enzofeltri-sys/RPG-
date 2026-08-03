import Phaser from 'phaser';
import { Character } from '../game/character';
import { materialLabel } from '../game/material';
import { RECIPES, RecipeDefinition, canCraft, craft } from '../game/recipe';
import { SaveManager } from '../save/SaveManager';
import { ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { addCrispText } from '../ui/text';
import { playCraftSuccess } from '../ui/sound';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';
const OK_COLOR = '#5fbf6a';

// One recipe per page: the "artisan" recipes (3 materials with longer
// French labels — see recipe.ts) wrap to more lines than the original
// 1-2-material recipes did, so a fixed 2-per-page budget risked the second
// block's text overlapping the fixed status/pagination/Retour row below.
// Dynamic per-recipe height (see renderRecipe) already prevents overlap
// within a page; keeping to 1 per page keeps that margin comfortable
// without needing to shrink fonts or descriptions.
const PAGE_SIZE = 1;

interface CraftingData {
  x?: number;
  y?: number;
  page?: number;
  returnScene?: ReturnSceneKey;
}

export class CraftingScene extends Phaser.Scene {
  private character!: Character;
  private statusText!: Phaser.GameObjects.Text;
  private craftButtons: Phaser.GameObjects.Text[] = [];
  private returnX?: number;
  private returnY?: number;
  private returnScene: ReturnSceneKey = 'Village';
  private page = 0;

  constructor() {
    super('Crafting');
  }

  init(data: CraftingData): void {
    this.returnX = data?.x;
    this.returnY = data?.y;
    this.returnScene = data?.returnScene ?? 'Village';
    this.page = data?.page ?? 0;
  }

  async create(): Promise<void> {
    const { width } = this.scale;
    // Phaser reuses the same Scene instance across scene.start()/restart()
    // calls, so this must be reset here — otherwise it keeps accumulating
    // destroyed buttons from every previous visit (harmless to real players,
    // who only ever click what's currently rendered, but sloppy bookkeeping).
    this.craftButtons = [];
    const save = await SaveManager.load();
    this.character = save!.character!;

    addCrispText(this, width / 2, 14, 'Artisanat', { fontSize: '16px', color: GOLD }).setOrigin(0.5);

    const allRecipes = Object.values(RECIPES);
    const totalPages = Math.max(1, Math.ceil(allRecipes.length / PAGE_SIZE));
    this.page = Phaser.Math.Clamp(this.page, 0, totalPages - 1);
    const pageRecipes = allRecipes.slice(this.page * PAGE_SIZE, this.page * PAGE_SIZE + PAGE_SIZE);

    let y = 40;
    pageRecipes.forEach((recipe) => {
      y += this.renderRecipe(recipe, y) + 14;
    });

    this.statusText = addCrispText(this, width / 2, 250, '', { fontSize: '10px', color: GOLD }).setOrigin(0.5);

    addCrispText(this, width / 2, 278, `Page ${this.page + 1}/${totalPages}`, {
      fontSize: '9px',
      color: MUTED,
    }).setOrigin(0.5);

    if (this.page > 0) {
      const prevButton = addCrispText(this, 50, 300, '◀ Précédent', {
        fontSize: '10px',
        color: DARK,
        backgroundColor: GOLD,
        padding: { x: 6, y: 5 },
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      prevButton.on('pointerdown', () => this.goToPage(this.page - 1));
    }

    if (this.page < totalPages - 1) {
      const nextButton = addCrispText(this, width - 50, 300, 'Suivant ▶', {
        fontSize: '10px',
        color: DARK,
        backgroundColor: GOLD,
        padding: { x: 6, y: 5 },
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      nextButton.on('pointerdown', () => this.goToPage(this.page + 1));
    }

    const freeCraftButton = addCrispText(this, width / 2, 330, 'Forge libre', {
      fontSize: '10px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 6, y: 5 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    freeCraftButton.on('pointerdown', () =>
      this.scene.start('FreeCraft', { x: this.returnX, y: this.returnY, returnScene: this.returnScene }),
    );

    const backButton = addCrispText(this, width / 2, 362, 'Retour', {
      fontSize: '13px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 10, y: 6 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    backButton.on('pointerdown', () =>
      this.scene.start(this.returnScene, returnSceneStartData(this.returnScene, this.returnX, this.returnY)),
    );
  }

  // Returns the total height used, measured from actual rendered text
  // heights rather than fixed offsets — a 3-material "artisan" recipe (see
  // recipe.ts) wraps its requirement line to more rows than the original
  // 1-2-material recipes did, and a fixed offset would either waste space
  // on short recipes or overlap the button on long ones.
  private renderRecipe(recipe: RecipeDefinition, startY: number): number {
    const { width } = this.scale;
    let y = startY;
    const stationLabel = recipe.station === 'forge' ? 'Forge' : 'Alchimie';
    const nameText = addCrispText(this, 12, y, `${recipe.name} (${stationLabel})`, {
      fontSize: '12px',
      color: GOLD,
    });
    y += nameText.height + 4;

    const descText = addCrispText(this, 12, y, recipe.description, {
      fontSize: '9px',
      color: MUTED,
      wordWrap: { width: width - 24 },
    });
    y += descText.height + 6;

    const requirementLines = Object.entries(recipe.materials)
      .map(([materialId, count]) => {
        const owned = this.character.materials[materialId] ?? 0;
        return `${materialLabel(materialId)} : ${owned}/${count}`;
      })
      .join('   ');
    const reqText = addCrispText(this, 12, y, requirementLines, {
      fontSize: '9px',
      color: canCraft(this.character, recipe.id) ? OK_COLOR : MUTED,
      wordWrap: { width: width - 24 },
    });
    y += reqText.height + 8;

    const button = addCrispText(this, 12, y, 'Fabriquer', {
      fontSize: '10px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 6, y: 5 },
    }).setInteractive({ useHandCursor: true });
    button.setAlpha(canCraft(this.character, recipe.id) ? 1 : 0.5);
    button.on('pointerdown', () => this.handleCraft(recipe.id));
    this.craftButtons.push(button);
    y += button.height;

    return y - startY;
  }

  private goToPage(page: number): void {
    this.scene.start('Crafting', { x: this.returnX, y: this.returnY, page, returnScene: this.returnScene });
  }

  private async handleCraft(recipeId: string): Promise<void> {
    const success = craft(this.character, recipeId);
    if (!success) {
      this.statusText.setText('Matériaux insuffisants.').setColor(MUTED);
      return;
    }
    await SaveManager.saveCharacter(this.character);
    playCraftSuccess();
    this.statusText.setText(`${RECIPES[recipeId].name} fabriqué(e) !`).setColor(OK_COLOR);
    this.time.delayedCall(600, () =>
      this.scene.restart({ x: this.returnX, y: this.returnY, page: this.page, returnScene: this.returnScene }),
    );
  }
}
