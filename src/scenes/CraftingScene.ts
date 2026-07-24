import Phaser from 'phaser';
import { Character } from '../game/character';
import { materialLabel } from '../game/material';
import { RECIPES, canCraft, craft } from '../game/recipe';
import { SaveManager } from '../save/SaveManager';
import { addCrispText } from '../ui/text';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';
const OK_COLOR = '#5fbf6a';

interface CraftingData {
  x?: number;
  y?: number;
}

export class CraftingScene extends Phaser.Scene {
  private character!: Character;
  private statusText!: Phaser.GameObjects.Text;
  private craftButtons: Phaser.GameObjects.Text[] = [];
  private returnX?: number;
  private returnY?: number;

  constructor() {
    super('Crafting');
  }

  init(data: CraftingData): void {
    this.returnX = data?.x;
    this.returnY = data?.y;
  }

  async create(): Promise<void> {
    const { width } = this.scale;
    const save = await SaveManager.load();
    this.character = save!.character!;

    addCrispText(this, width / 2, 14, 'Artisanat', { fontSize: '16px', color: GOLD }).setOrigin(0.5);

    let y = 40;
    Object.values(RECIPES).forEach((recipe) => {
      const stationLabel = recipe.station === 'forge' ? 'Forge' : 'Alchimie';
      addCrispText(this, 12, y, `${recipe.name} (${stationLabel})`, { fontSize: '12px', color: GOLD });
      y += 18;
      addCrispText(this, 12, y, recipe.description, {
        fontSize: '9px',
        color: MUTED,
        wordWrap: { width: width - 24 },
      });
      y += 22;

      const requirementLines = Object.entries(recipe.materials)
        .map(([materialId, count]) => {
          const owned = this.character.materials[materialId] ?? 0;
          return `${materialLabel(materialId)} : ${owned}/${count}`;
        })
        .join('   ');
      addCrispText(this, 12, y, requirementLines, {
        fontSize: '9px',
        color: canCraft(this.character, recipe.id) ? OK_COLOR : MUTED,
      });
      y += 20;

      const button = addCrispText(this, 12, y, 'Fabriquer', {
        fontSize: '10px',
        color: DARK,
        backgroundColor: GOLD,
        padding: { x: 6, y: 5 },
      }).setInteractive({ useHandCursor: true });
      button.setAlpha(canCraft(this.character, recipe.id) ? 1 : 0.5);
      button.on('pointerdown', () => this.handleCraft(recipe.id));
      this.craftButtons.push(button);

      y += 40;
    });

    this.statusText = addCrispText(this, width / 2, y + 4, '', { fontSize: '10px', color: GOLD }).setOrigin(0.5);

    const backButton = addCrispText(this, width / 2, 362, 'Retour', {
      fontSize: '13px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 10, y: 6 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    backButton.on('pointerdown', () => this.scene.start('Village', { x: this.returnX, y: this.returnY }));
  }

  private async handleCraft(recipeId: string): Promise<void> {
    const success = craft(this.character, recipeId);
    if (!success) {
      this.statusText.setText('Matériaux insuffisants.').setColor(MUTED);
      return;
    }
    await SaveManager.saveCharacter(this.character);
    this.statusText.setText(`${RECIPES[recipeId].name} fabriqué(e) !`).setColor(OK_COLOR);
    this.time.delayedCall(600, () => this.scene.restart({ x: this.returnX, y: this.returnY }));
  }
}
