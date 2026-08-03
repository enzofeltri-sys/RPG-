import Phaser from 'phaser';
import { Character } from '../game/character';
import { getCraftableItems, CraftableItemInfo, RARITY_LABELS, RARITY_COLORS, Rarity } from '../game/item';
import { materialLabel } from '../game/material';
import { genericCraftCost, canCraftGeneric, craftGeneric } from '../game/recipe';
import { SaveManager } from '../save/SaveManager';
import { ReturnSceneKey } from '../ui/returnContext';
import { addCrispText } from '../ui/text';
import { playCraftSuccess } from '../ui/sound';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';
const OK_COLOR = '#5fbf6a';
const ROW_H = 20;
const LIST_TOP = 44;
const PAGE_SIZE = 8;

const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

interface FreeCraftData {
  x?: number;
  y?: number;
  page?: number;
  returnScene?: ReturnSceneKey;
}

// The generic "craft anything up to legendary" counterpart to CraftingScene's
// named recipes — see recipe.ts's genericCraftCost for why this exists as a
// formula instead of ~480 hand-authored recipe objects (121 craftable items
// × 4 rarities). A flat list here, unlike CraftingScene's one-recipe-per-page,
// since each row only needs a single line until the player taps into detail.
export class FreeCraftScene extends Phaser.Scene {
  private character!: Character;
  private returnX?: number;
  private returnY?: number;
  private returnScene: ReturnSceneKey = 'Village';
  private page = 0;
  private items: CraftableItemInfo[] = [];
  private listRows: Phaser.GameObjects.Text[] = [];
  private statusText!: Phaser.GameObjects.Text;

  private detailBg!: Phaser.GameObjects.Rectangle;
  private detailRows: Phaser.GameObjects.Text[] = [];
  private detailCloseButton!: Phaser.GameObjects.Text;

  constructor() {
    super('FreeCraft');
  }

  init(data: FreeCraftData): void {
    this.returnX = data?.x;
    this.returnY = data?.y;
    this.returnScene = data?.returnScene ?? 'Village';
    this.page = data?.page ?? 0;
  }

  async create(): Promise<void> {
    const { width } = this.scale;
    this.listRows = [];
    this.detailRows = [];
    const save = await SaveManager.load();
    this.character = save!.character!;
    this.items = getCraftableItems();

    addCrispText(this, width / 2, 14, 'Forge libre', { fontSize: '16px', color: GOLD }).setOrigin(0.5);
    addCrispText(this, width / 2, 30, 'Tous les objets, du commun au légendaire', {
      fontSize: '8px',
      color: MUTED,
    }).setOrigin(0.5);

    const totalPages = Math.max(1, Math.ceil(this.items.length / PAGE_SIZE));
    this.page = Phaser.Math.Clamp(this.page, 0, totalPages - 1);
    const pageItems = this.items.slice(this.page * PAGE_SIZE, this.page * PAGE_SIZE + PAGE_SIZE);

    pageItems.forEach((item, i) => {
      const row = addCrispText(this, 14, LIST_TOP + i * ROW_H, `${item.name} (P${item.tier})`, {
        fontSize: '11px',
        color: GOLD,
      }).setInteractive({ useHandCursor: true });
      row.on('pointerdown', () => this.showDetail(item));
      this.listRows.push(row);
    });

    addCrispText(this, width / 2, LIST_TOP + PAGE_SIZE * ROW_H + 6, `Page ${this.page + 1}/${totalPages}`, {
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

    this.statusText = addCrispText(this, width / 2, 322, '', { fontSize: '9px', color: OK_COLOR }).setOrigin(0.5);

    const backButton = addCrispText(this, width / 2, 362, 'Retour', {
      fontSize: '13px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 10, y: 6 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    backButton.on('pointerdown', () =>
      this.scene.start('Crafting', { x: this.returnX, y: this.returnY, returnScene: this.returnScene }),
    );

    this.buildDetailOverlay();
  }

  private goToPage(page: number): void {
    this.scene.start('FreeCraft', { x: this.returnX, y: this.returnY, page, returnScene: this.returnScene });
  }

  private buildDetailOverlay(): void {
    const { width, height } = this.scale;
    this.detailBg = this.add
      .rectangle(width / 2, height / 2, width - 16, height - 32, 0x0b0c10, 0.96)
      .setStrokeStyle(1, 0xe8d9b5)
      .setDepth(900)
      .setVisible(false);
    this.detailCloseButton = addCrispText(this, width / 2, height - 24, 'Fermer', {
      fontSize: '12px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 8, y: 5 },
    })
      .setOrigin(0.5)
      .setDepth(901)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.detailCloseButton.on('pointerdown', () => this.hideDetail());
  }

  private showDetail(item: CraftableItemInfo): void {
    this.detailRows.forEach((row) => row.destroy());
    this.detailRows = [];

    const { width } = this.scale;
    let y = 30;
    this.detailRows.push(
      addCrispText(this, width / 2, y, item.name, { fontSize: '14px', color: GOLD })
        .setOrigin(0.5)
        .setDepth(901),
    );
    y += 24;

    RARITIES.forEach((rarity) => {
      const cost = genericCraftCost(item.tier, rarity);
      const canAfford = canCraftGeneric(this.character, item.tier, rarity);
      const rarityLabel = addCrispText(this, 14, y, RARITY_LABELS[rarity], {
        fontSize: '11px',
        color: RARITY_COLORS[rarity],
      }).setDepth(901);
      y += rarityLabel.height + 3;

      const costLine = Object.entries(cost)
        .map(([materialId, count]) => `${materialLabel(materialId)} : ${this.character.materials[materialId] ?? 0}/${count}`)
        .join('   ');
      const costText = addCrispText(this, 14, y, costLine, {
        fontSize: '8px',
        color: canAfford ? OK_COLOR : MUTED,
        wordWrap: { width: width - 28 },
      }).setDepth(901);
      y += costText.height + 4;

      const button = addCrispText(this, 14, y, `Fabriquer (${RARITY_LABELS[rarity]})`, {
        fontSize: '9px',
        color: DARK,
        backgroundColor: GOLD,
        padding: { x: 5, y: 3 },
      })
        .setDepth(901)
        .setInteractive({ useHandCursor: true });
      button.setAlpha(canAfford ? 1 : 0.5);
      button.on('pointerdown', () => this.handleCraft(item, rarity));
      y += button.height + 8;

      this.detailRows.push(rarityLabel, costText, button);
    });

    this.detailBg.setVisible(true);
    this.detailCloseButton.setVisible(true);
    this.detailRows.forEach((row) => row.setVisible(true));
  }

  private hideDetail(): void {
    this.detailBg.setVisible(false);
    this.detailCloseButton.setVisible(false);
    this.detailRows.forEach((row) => row.destroy());
    this.detailRows = [];
  }

  private async handleCraft(item: CraftableItemInfo, rarity: Rarity): Promise<void> {
    const success = craftGeneric(this.character, item.baseId, item.tier, rarity);
    if (!success) {
      this.statusText.setColor(MUTED).setText('Matériaux insuffisants.');
      return;
    }
    await SaveManager.saveCharacter(this.character);
    playCraftSuccess();
    this.statusText.setColor(OK_COLOR).setText(`${item.name} (${RARITY_LABELS[rarity]}) fabriqué(e) !`);
    this.hideDetail();
    this.time.delayedCall(600, () =>
      this.scene.restart({ x: this.returnX, y: this.returnY, page: this.page, returnScene: this.returnScene }),
    );
  }
}
