import Phaser from 'phaser';
import { Character } from '../game/character';
import { Item, sellPrice } from '../game/item';
import { materialLabel } from '../game/material';
import { CONSUMABLES, ConsumableId } from '../game/consumable';
import {
  MerchantStockEntry,
  buyMerchantStockEntry,
  getMerchantStock,
  merchantEntryLabel,
  merchantEntryPrice,
  msUntilMerchantRefresh,
} from '../game/merchantStock';
import { SaveManager } from '../save/SaveManager';
import { ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { playCoin } from '../ui/sound';
import { preloadItemIcons, placeItemIcon } from '../entities/itemIcon';
import { INK, KitButton, addScreenPanel, buttonRow, drawButton, panelText, preloadUiKit, toast } from '../ui/kit';
import { RARITY_INK, RARITY_STRIPE, itemCompareLines, itemTitle, itemTypeLine, itemStatsLine } from '../ui/itemText';
import { Action, DETAIL_TOP, LIST_TOP, Line, SCREEN_INNER_W, SCREEN_LEFT, actionRow, detailPanel, pager } from '../ui/screen';

interface ShopEntry {
  id: string;
  label: string;
  price: number;
  icon: string;
  description: string;
  owned: (c: Character) => number;
  onBuy: (c: Character) => void;
}

function consumableEntry(id: ConsumableId, price: number): ShopEntry {
  return {
    id,
    label: CONSUMABLES[id].name,
    price,
    icon: 'potion',
    description: CONSUMABLES[id].description,
    owned: (c) => c.consumables[id] ?? 0,
    onBuy: (c) => (c.consumables[id] = (c.consumables[id] ?? 0) + 1),
  };
}

function materialEntry(id: string, price: number): ShopEntry {
  return {
    id,
    label: materialLabel(id),
    price,
    icon: 'bag',
    description: "Ressource d'artisanat, pour la Forge et l'Alchimie.",
    owned: (c) => c.materials[id] ?? 0,
    onBuy: (c) => (c.materials[id] = (c.materials[id] ?? 0) + 1),
  };
}

const SHOP_CATALOG: ShopEntry[] = [
  consumableEntry('health_potion', 15),
  consumableEntry('mana_potion', 20),
  consumableEntry('antidote', 10),
  consumableEntry('fire_bomb', 25),
  materialEntry('iron_ore', 4),
  materialEntry('herb', 3),
];

type MerchantTab = 'buy' | 'stock' | 'sell';

const TABS: { id: MerchantTab; label: string }[] = [
  { id: 'buy', label: 'Acheter' },
  { id: 'stock', label: 'Étal' },
  { id: 'sell', label: 'Vendre' },
];

const ROW_STEP = 28;
const ROWS_PER_PAGE = 5;
const CELL = 32;
const GRID_COLS = 5;
const GRID_ROWS = 4;

interface MerchantData {
  x?: number;
  y?: number;
  returnScene?: ReturnSceneKey;
}

// The merchant in UI style A, one screen with three tabs: the fixed shop
// (potions, bombs, basic materials), the rotating equipment stall (see
// merchantStock.ts, renewed every 15 minutes) and selling from the Sac.
export class MerchantScene extends Phaser.Scene {
  private character!: Character;
  private returnX?: number;
  private returnY?: number;
  private returnScene: ReturnSceneKey = 'Village';
  private tab: MerchantTab = 'buy';
  private page = 0;
  private selected?: string;

  constructor() {
    super('Merchant');
  }

  init(data: MerchantData): void {
    this.returnX = data?.x;
    this.returnY = data?.y;
    this.returnScene = data?.returnScene ?? 'Village';
    this.tab = 'buy';
    this.page = 0;
    this.selected = undefined;
  }

  preload(): void {
    preloadUiKit(this);
  }

  async create(): Promise<void> {
    const save = await SaveManager.load();
    this.character = save!.character!;
    const stock = getMerchantStock(this.character);
    await SaveManager.saveCharacter(this.character);
    const stockItems = stock.flatMap((e) => (e.kind === 'item' ? [e.item] : []));
    await preloadItemIcons(this, [...this.character.inventory, ...stockItems].map((i) => i.baseId));
    if (!this.scene.isActive()) return;
    this.render();
  }

  private goBack(): void {
    this.scene.start(this.returnScene, returnSceneStartData(this.returnScene, this.returnX, this.returnY));
  }

  private render(): void {
    this.children.removeAll(true);
    addScreenPanel(this);
    // Right of the title, short of the corner kept for the fullscreen button.
    panelText(this, SCREEN_LEFT + SCREEN_INNER_W - 26, 17, `Or ${this.character.gold}`, 9).setOrigin(1, 0);
    panelText(this, this.scale.width / 2, 14, 'Marchande', 12).setOrigin(0.5, 0);
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
    if (this.tab === 'buy') this.renderShop();
    else if (this.tab === 'stock') this.renderStock();
    else this.renderSell();
  }

  private select(id: string): void {
    this.selected = id;
    this.render();
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

  private empty(text: string): void {
    panelText(this, this.scale.width / 2, LIST_TOP + 40, text, 9, INK.soft).setOrigin(0.5, 0);
  }

  // ----------------------------------------------------------------- shop

  private renderShop(): void {
    this.pager(SHOP_CATALOG.length, ROWS_PER_PAGE);
    SHOP_CATALOG.slice(this.page * ROWS_PER_PAGE, (this.page + 1) * ROWS_PER_PAGE).forEach((entry, i) => {
      new KitButton(this, SCREEN_LEFT, LIST_TOP + i * ROW_STEP, SCREEN_INNER_W, 24, entry.label, {
        icon: entry.icon,
        size: 9,
        cost: `${entry.price} or`,
        costSize: 9,
        state: entry.id === this.selected ? 'pressed' : this.character.gold < entry.price ? 'disabled' : 'normal',
        onClick: () => this.select(entry.id),
      });
    });
    const entry = SHOP_CATALOG.find((e) => e.id === this.selected);
    if (!entry) {
      detailPanel(this, { text: 'Bienvenue !', color: INK.text }, [
        { text: 'Potions, bombes et ressources de base, toujours en stock.', color: INK.soft },
        { text: "L'équipement est sur l'Étal ; tu peux aussi vendre ce que tu ne portes pas.", color: INK.soft },
      ]);
      this.actions([]);
      return;
    }
    detailPanel(this, { text: entry.label, color: INK.text }, [
      { text: entry.description, color: INK.text },
      { text: `Prix : ${entry.price} or · tu en as ${entry.owned(this.character)}`, color: INK.soft },
    ]);
    this.actions([{ label: 'Acheter', disabled: this.character.gold < entry.price, onClick: () => void this.buyShop(entry) }]);
  }

  private async buyShop(entry: ShopEntry): Promise<void> {
    if (this.character.gold < entry.price) {
      this.say('Or insuffisant.', INK.danger);
      return;
    }
    this.character.gold -= entry.price;
    entry.onBuy(this.character);
    await SaveManager.saveCharacter(this.character);
    playCoin();
    this.render();
    this.say(`Acheté : ${entry.label}.`);
  }

  // ---------------------------------------------------------------- stall

  private renderStock(): void {
    const stock = getMerchantStock(this.character);
    this.pager(stock.length, ROWS_PER_PAGE);
    if (stock.length === 0) this.empty('Plus rien sur l’étal : repasse plus tard.');
    stock.slice(this.page * ROWS_PER_PAGE, (this.page + 1) * ROWS_PER_PAGE).forEach((entry, i) => {
      const index = this.page * ROWS_PER_PAGE + i;
      const price = merchantEntryPrice(entry);
      const y = LIST_TOP + i * ROW_STEP;
      new KitButton(this, SCREEN_LEFT, y, SCREEN_INNER_W, 24, merchantEntryLabel(entry, materialLabel), {
        icon: entry.kind === 'material' ? 'bag' : undefined,
        iconTexture: entry.kind === 'item' ? `item-icon-${entry.item.baseId}` : undefined,
        size: 9,
        cost: `${price} or`,
        costSize: 9,
        state: `${index}` === this.selected ? 'pressed' : this.character.gold < price ? 'disabled' : 'normal',
        onClick: () => this.select(`${index}`),
      });
      const stripe = entry.kind === 'item' ? RARITY_STRIPE[entry.item.rarity] : null;
      if (stripe !== null) this.add.graphics().fillStyle(stripe, 1).fillRect(SCREEN_LEFT + 2, y + 4, 2, 16);
    });

    const minutes = Math.ceil(msUntilMerchantRefresh(this.character) / 60000);
    const index = this.selected === undefined ? -1 : Number(this.selected);
    const entry: MerchantStockEntry | undefined = stock[index];
    if (!entry) {
      detailPanel(this, { text: "L'étal du jour", color: INK.text }, [
        { text: `Nouvel arrivage dans ${minutes} min.`, color: INK.soft },
        { text: "Touche un objet pour le comparer à ce que tu portes.", color: INK.soft },
      ]);
      this.actions([]);
      return;
    }
    const price = merchantEntryPrice(entry);
    if (entry.kind === 'item') {
      detailPanel(this, { text: itemTitle(entry.item), color: RARITY_INK[entry.item.rarity] }, [
        ...itemCompareLines(this.character, entry.item),
        { text: `Prix : ${price} or`, color: INK.soft },
      ]);
    } else {
      detailPanel(this, { text: merchantEntryLabel(entry, materialLabel), color: INK.text }, [
        { text: "Ressource rare d'artisanat.", color: INK.text },
        { text: `Prix : ${price} or · tu en as ${this.character.materials[entry.materialId] ?? 0}`, color: INK.soft },
      ]);
    }
    this.actions([{ label: 'Acheter', disabled: this.character.gold < price, onClick: () => void this.buyStock(index, entry) }]);
  }

  private async buyStock(index: number, entry: MerchantStockEntry): Promise<void> {
    const label = merchantEntryLabel(entry, materialLabel);
    if (!buyMerchantStockEntry(this.character, index)) {
      this.say('Or insuffisant.', INK.danger);
      return;
    }
    await SaveManager.saveCharacter(this.character);
    playCoin();
    this.selected = undefined;
    this.render();
    this.say(`Acheté : ${label}${entry.kind === 'item' ? ', dans le sac' : ''}.`);
  }

  // ----------------------------------------------------------------- sell

  private renderSell(): void {
    const items = this.character.inventory;
    const perPage = GRID_COLS * GRID_ROWS;
    this.pager(items.length, perPage);
    if (items.length === 0) this.empty('Rien à vendre : le sac est vide.');
    items.slice(this.page * perPage, (this.page + 1) * perPage).forEach((item, i) => {
      const x = SCREEN_LEFT + (i % GRID_COLS) * 39;
      const y = LIST_TOP + Math.floor(i / GRID_COLS) * 38;
      const g = this.add.graphics();
      drawButton(g, x, y, CELL, CELL, item.id === this.selected ? 'pressed' : 'normal');
      const stripe = RARITY_STRIPE[item.rarity];
      if (stripe !== null) g.fillStyle(stripe, 1).fillRect(x + 4, y + CELL - 6, CELL - 8, 2);
      if (!placeItemIcon(this, item.baseId, x + CELL / 2, y + CELL / 2 - 1, 24)) {
        this.add.image(x + CELL / 2, y + CELL / 2 - 1, item.category === 'weapon' ? 'ui-icon-sword' : 'ui-icon-bag');
      }
      this.add
        .zone(x, y, CELL, CELL)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.select(item.id));
    });
    const item = items.find((i) => i.id === this.selected);
    if (!item) {
      detailPanel(this, { text: 'Vendre', color: INK.text }, [
        { text: 'Seuls les objets du sac se vendent : retire d’abord ce que tu portes.', color: INK.soft },
      ]);
      this.actions([]);
      return;
    }
    const lines: Line[] = [
      { text: itemTypeLine(item), color: INK.soft },
      { text: itemStatsLine(item), color: INK.text },
      { text: `Prix de vente : ${sellPrice(item)} or`, color: INK.text },
    ];
    detailPanel(this, { text: itemTitle(item), color: RARITY_INK[item.rarity] }, lines);
    this.actions([{ label: 'Vendre', onClick: () => void this.sell(item) }]);
  }

  private async sell(item: Item): Promise<void> {
    this.character.inventory = this.character.inventory.filter((i) => i.id !== item.id);
    this.character.gold += sellPrice(item);
    await SaveManager.saveCharacter(this.character);
    playCoin();
    this.selected = undefined;
    this.render();
    this.say(`Vendu : ${item.name} (+${sellPrice(item)} or).`);
  }
}
