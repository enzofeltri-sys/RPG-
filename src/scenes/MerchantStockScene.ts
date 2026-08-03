import Phaser from 'phaser';
import { Character } from '../game/character';
import { RARITY_COLORS, RARITY_LABELS } from '../game/item';
import { materialLabel } from '../game/material';
import {
  MerchantStockEntry,
  getMerchantStock,
  merchantEntryPrice,
  merchantEntryLabel,
  merchantEntryRarity,
  msUntilMerchantRefresh,
  buyMerchantStockEntry,
} from '../game/merchantStock';
import { SaveManager } from '../save/SaveManager';
import { ReturnSceneKey } from '../ui/returnContext';
import { addCrispText } from '../ui/text';
import { playCoin } from '../ui/sound';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';
const PAGE_SIZE = 4;

interface MerchantStockData {
  page?: number;
  returnScene?: ReturnSceneKey;
  x?: number;
  y?: number;
}

// A separate screen from MerchantScene (same pattern as CraftingScene ->
// FreeCraftScene) for the rotating equipment stock — up to 10 slots
// (mostly palier-1 common/rare items, with a small chance each of epic,
// legendary, or a scarce crafting material — see merchantStock.ts),
// refreshed on a 15-minute real-world timer, rather than the full item
// catalog always being purchasable.
export class MerchantStockScene extends Phaser.Scene {
  private character!: Character;
  private statusText!: Phaser.GameObjects.Text;
  private page = 0;
  private returnScene: ReturnSceneKey = 'Village';
  private returnX?: number;
  private returnY?: number;

  constructor() {
    super('MerchantStock');
  }

  init(data: MerchantStockData): void {
    this.page = data?.page ?? 0;
    this.returnScene = data?.returnScene ?? 'Village';
    this.returnX = data?.x;
    this.returnY = data?.y;
  }

  async create(): Promise<void> {
    const { width } = this.scale;
    const save = await SaveManager.load();
    this.character = save!.character!;

    const stock = getMerchantStock(this.character);
    await SaveManager.saveCharacter(this.character);

    addCrispText(this, width / 2, 14, 'Étal du marchand', { fontSize: '16px', color: GOLD }).setOrigin(0.5);
    addCrispText(this, width / 2, 32, `Or : ${this.character.gold}`, {
      fontSize: '11px',
      color: GOLD,
    }).setOrigin(0.5);

    const minutesLeft = Math.ceil(msUntilMerchantRefresh(this.character) / 60000);
    addCrispText(this, width / 2, 48, `Renouvellement dans ${minutesLeft} min`, {
      fontSize: '8px',
      color: MUTED,
    }).setOrigin(0.5);

    const totalPages = Math.max(1, Math.ceil(stock.length / PAGE_SIZE));
    this.page = Phaser.Math.Clamp(this.page, 0, totalPages - 1);
    const pageStart = this.page * PAGE_SIZE;
    const pageEntries = stock.slice(pageStart, pageStart + PAGE_SIZE);

    if (stock.length === 0) {
      addCrispText(this, 12, 70, 'Plus rien en stock — repassez plus tard.', { fontSize: '9px', color: MUTED });
    }

    pageEntries.forEach((entry, i) => {
      this.renderStockRow(entry, pageStart + i, 66 + i * 44);
    });

    addCrispText(this, width / 2, 66 + PAGE_SIZE * 44 + 4, `Page ${this.page + 1}/${totalPages}`, {
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

    this.statusText = addCrispText(this, width / 2, 322, '', { fontSize: '9px', color: MUTED }).setOrigin(0.5);

    const backButton = addCrispText(this, width / 2, 362, 'Retour', {
      fontSize: '13px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 10, y: 6 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    backButton.on('pointerdown', () =>
      this.scene.start('Merchant', { returnScene: this.returnScene, x: this.returnX, y: this.returnY }),
    );
  }

  private renderStockRow(entry: MerchantStockEntry, index: number, y: number): void {
    const price = merchantEntryPrice(entry);
    const label = merchantEntryLabel(entry, materialLabel);
    const rarity = merchantEntryRarity(entry);
    const nameLine = rarity ? `${label} (${RARITY_LABELS[rarity]})` : `${label} (ressource)`;
    addCrispText(this, 12, y, nameLine, {
      fontSize: '10px',
      color: rarity ? RARITY_COLORS[rarity] : GOLD,
    });
    const button = addCrispText(this, 12, y + 16, `Acheter — ${price} or`, {
      fontSize: '9px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 6, y: 3 },
    }).setInteractive({ useHandCursor: true });
    button.setAlpha(this.character.gold >= price ? 1 : 0.5);
    button.on('pointerdown', () => this.handleBuy(index, label));
  }

  private async handleBuy(index: number, label: string): Promise<void> {
    const success = buyMerchantStockEntry(this.character, index);
    if (!success) {
      this.statusText.setText('Or insuffisant ou objet déjà vendu.').setColor(MUTED);
      return;
    }
    await SaveManager.saveCharacter(this.character);
    playCoin();
    this.statusText.setText(`Acheté : ${label}.`).setColor(GOLD);
    this.time.delayedCall(500, () =>
      this.scene.restart({ page: this.page, returnScene: this.returnScene, x: this.returnX, y: this.returnY }),
    );
  }

  private goToPage(page: number): void {
    this.scene.start('MerchantStock', { page, returnScene: this.returnScene, x: this.returnX, y: this.returnY });
  }
}
