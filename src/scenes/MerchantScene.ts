import Phaser from 'phaser';
import { Character } from '../game/character';
import { Item, RARITY_COLORS, sellPrice } from '../game/item';
import { materialLabel } from '../game/material';
import { CONSUMABLES } from '../game/consumable';
import { SaveManager } from '../save/SaveManager';
import { ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { addCrispText } from '../ui/text';
import { playCoin } from '../ui/sound';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';
const SLOT_BG = '#1c2b1c';

interface ShopEntry {
  label: string;
  price: number;
  onBuy: (character: Character) => void;
}

const SHOP_CATALOG: ShopEntry[] = [
  { label: `${materialLabel('iron_ore')} (x1)`, price: 4, onBuy: (c) => (c.materials.iron_ore = (c.materials.iron_ore ?? 0) + 1) },
  { label: `${materialLabel('herb')} (x1)`, price: 3, onBuy: (c) => (c.materials.herb = (c.materials.herb ?? 0) + 1) },
  {
    label: CONSUMABLES.health_potion.name,
    price: 15,
    onBuy: (c) => (c.consumables.health_potion = (c.consumables.health_potion ?? 0) + 1),
  },
];

interface MerchantData {
  x?: number;
  y?: number;
  returnScene?: ReturnSceneKey;
}

export class MerchantScene extends Phaser.Scene {
  private character!: Character;
  private goldText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private sellTexts: Phaser.GameObjects.Text[] = [];
  private returnX?: number;
  private returnY?: number;
  private returnScene: ReturnSceneKey = 'Village';

  constructor() {
    super('Merchant');
  }

  init(data: MerchantData): void {
    this.returnX = data?.x;
    this.returnY = data?.y;
    this.returnScene = data?.returnScene ?? 'Village';
  }

  async create(): Promise<void> {
    const { width } = this.scale;
    const save = await SaveManager.load();
    this.character = save!.character!;

    addCrispText(this, width / 2, 14, 'Marchande', { fontSize: '16px', color: GOLD }).setOrigin(0.5);
    this.goldText = addCrispText(this, width / 2, 34, '', { fontSize: '11px', color: GOLD }).setOrigin(0.5);

    addCrispText(this, 12, 54, 'Vendre (objets non équipés) :', { fontSize: '9px', color: MUTED });
    this.renderSellList();

    addCrispText(this, 12, 196, 'Acheter :', { fontSize: '9px', color: MUTED });
    SHOP_CATALOG.forEach((entry, index) => {
      const y = 210 + index * 20;
      const text = addCrispText(this, 12, y, `${entry.label} — ${entry.price} or`, {
        fontSize: '9px',
        color: GOLD,
        backgroundColor: SLOT_BG,
        padding: { x: 6, y: 3 },
      }).setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this.handleBuy(entry));
    });

    this.statusText = addCrispText(this, width / 2, 288, '', { fontSize: '9px', color: MUTED }).setOrigin(0.5);

    const stockButton = addCrispText(this, width / 2, 326, 'Étal (équipement)', {
      fontSize: '9px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 6, y: 5 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    stockButton.on('pointerdown', () =>
      this.scene.start('MerchantStock', { returnScene: this.returnScene, x: this.returnX, y: this.returnY }),
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

    this.refreshGold();
  }

  private renderSellList(): void {
    this.sellTexts.forEach((t) => t.destroy());
    this.sellTexts = [];

    if (this.character.inventory.length === 0) {
      this.sellTexts.push(addCrispText(this, 12, 68, 'Aucun objet à vendre.', { fontSize: '9px', color: MUTED }));
      return;
    }

    const MAX_VISIBLE = 4;
    this.character.inventory.slice(0, MAX_VISIBLE).forEach((item, index) => {
      const y = 68 + index * 18;
      const text = addCrispText(this, 12, y, `${item.name} — ${sellPrice(item)} or`, {
        fontSize: '9px',
        color: RARITY_COLORS[item.rarity],
        backgroundColor: SLOT_BG,
        padding: { x: 6, y: 3 },
      }).setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this.handleSell(item));
      this.sellTexts.push(text);
    });

    const overflow = this.character.inventory.length - MAX_VISIBLE;
    if (overflow > 0) {
      this.sellTexts.push(
        addCrispText(this, 12, 68 + MAX_VISIBLE * 18, `+ ${overflow} de plus`, { fontSize: '9px', color: MUTED }),
      );
    }
  }

  private async handleSell(item: Item): Promise<void> {
    this.character.inventory = this.character.inventory.filter((i) => i.id !== item.id);
    this.character.gold += sellPrice(item);
    await SaveManager.saveCharacter(this.character);
    playCoin();
    this.statusText.setText(`Vendu : ${item.name} (+${sellPrice(item)} or).`).setColor(GOLD);
    this.renderSellList();
    this.refreshGold();
  }

  private async handleBuy(entry: ShopEntry): Promise<void> {
    if (this.character.gold < entry.price) {
      this.statusText.setText('Or insuffisant.').setColor(MUTED);
      return;
    }
    this.character.gold -= entry.price;
    entry.onBuy(this.character);
    await SaveManager.saveCharacter(this.character);
    playCoin();
    this.statusText.setText(`Acheté : ${entry.label}.`).setColor(GOLD);
    this.refreshGold();
  }

  private refreshGold(): void {
    this.goldText.setText(`Or : ${this.character.gold}`);
  }
}
