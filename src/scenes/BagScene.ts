import Phaser from 'phaser';
import { Character } from '../game/character';
import { Item, EquipSlot, isUpgrade } from '../game/item';
import { ConsumableId, CONSUMABLES, useConsumable } from '../game/consumable';
import { handRule, planHandEquip } from '../game/weapons';
import { materialLabel, isRareMaterial } from '../game/material';
import { ReturnContext, ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { SaveManager } from '../save/SaveManager';
import { preloadItemIcons, placeItemIcon } from '../entities/itemIcon';
import { INK, KitButton, PAL, addPanel, addScreenPanel, buttonRow, drawButton, panelText, preloadUiKit, toast } from '../ui/kit';
import { RARITY_INK, RARITY_STRIPE, itemCompareLines, itemTitle } from '../ui/itemText';
import { Action, DETAIL_TOP, LIST_TOP, Line, actionRow, detailPanel, pager, targetSlot } from '../ui/screen';

type BagTab = 'items' | 'materials' | 'consumables' | 'quest';

const TABS: { id: BagTab; label: string }[] = [
  { id: 'items', label: 'Objets' },
  { id: 'materials', label: 'Ressources' },
  { id: 'consumables', label: 'Potions' },
  { id: 'quest', label: 'Quête' },
];

const LEFT = 14;
const INNER_W = 188;
const LIST_Y = LIST_TOP;
const CELL = 32;
const GRID_COLS = 5;
const GRID_ROWS = 4;
const CELL_STEP_X = 39;
const CELL_STEP_Y = 38;
const ROW_STEP = 28;
const ROWS_PER_PAGE = 5;
const DETAIL_Y = DETAIL_TOP;

// Sac in UI style A: four tabs; items as an icon grid (rarity stripe, a
// green arrow on anything stronger than what's worn) with a full stat
// comparison in the detail panel; materials as a list; potions and quest
// items as rows with their description.
export class BagScene extends Phaser.Scene {
  private character!: Character;
  private returnScene: ReturnSceneKey = 'Village';
  private returnX?: number;
  private returnY?: number;
  private tab: BagTab = 'items';
  private page = 0;
  private selected?: string;
  private discardArmed = false;

  constructor() {
    super('Bag');
  }

  init(data: ReturnContext): void {
    this.returnScene = data?.returnScene ?? 'Village';
    this.returnX = data?.x;
    this.returnY = data?.y;
    this.tab = 'items';
    this.page = 0;
    this.selected = undefined;
    this.discardArmed = false;
  }

  preload(): void {
    preloadUiKit(this);
  }

  async create(): Promise<void> {
    const save = await SaveManager.load();
    this.character = save!.character!;
    await preloadItemIcons(this, this.character.inventory.map((i) => i.baseId));
    if (!this.scene.isActive()) return;
    this.render();
  }

  private goBack(): void {
    this.scene.start(this.returnScene, returnSceneStartData(this.returnScene, this.returnX, this.returnY));
  }

  private render(): void {
    this.children.removeAll(true);
    addScreenPanel(this);
    panelText(this, this.scale.width / 2, 14, 'Sac', 12).setOrigin(0.5, 0);
    buttonRow(TABS.length, LEFT, INNER_W, 4).forEach(({ x, w }, i) => {
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
          this.discardArmed = false;
          this.render();
        },
      });
    });
    if (this.tab === 'items') this.renderItems();
    else if (this.tab === 'materials') this.renderMaterials();
    else if (this.tab === 'consumables') this.renderConsumables();
    else this.renderQuestItems();
  }

  private select(id: string): void {
    this.selected = id;
    this.discardArmed = false;
    this.render();
  }

  private pager(total: number, perPage: number): void {
    this.page = pager(this, this.page, total, perPage, (page) => {
      this.page = page;
      this.selected = undefined;
      this.render();
    });
  }

  private empty(text: string): void {
    panelText(this, this.scale.width / 2, LIST_Y + 40, text, 9, INK.soft).setOrigin(0.5, 0);
  }

  private detail(title: Line, lines: Line[]): void {
    detailPanel(this, title, lines);
  }

  private actions(list: Action[]): void {
    actionRow(this, [...list, { label: 'Retour', onClick: () => this.goBack() }]);
  }

  // ---------------------------------------------------------------- items

  private renderItems(): void {
    const items = this.character.inventory;
    const perPage = GRID_COLS * GRID_ROWS;
    this.pager(items.length, perPage);
    if (items.length === 0) this.empty('Aucun objet.');
    items.slice(this.page * perPage, (this.page + 1) * perPage).forEach((item, i) => {
      const x = LEFT + (i % GRID_COLS) * CELL_STEP_X;
      const y = LIST_Y + Math.floor(i / GRID_COLS) * CELL_STEP_Y;
      const g = this.add.graphics();
      drawButton(g, x, y, CELL, CELL, item.id === this.selected ? 'pressed' : 'normal');
      const stripe = RARITY_STRIPE[item.rarity];
      if (stripe !== null) g.fillStyle(stripe, 1).fillRect(x + 4, y + CELL - 6, CELL - 8, 2);
      if (!placeItemIcon(this, item.baseId, x + CELL / 2, y + CELL / 2 - 1, 24)) {
        this.add.image(x + CELL / 2, y + CELL / 2 - 1, item.category === 'weapon' ? 'ui-icon-sword' : 'ui-icon-bag');
      }
      if (isUpgrade(item, this.character.equipment[this.resolveEquipSlot(item)])) this.upgradeArrow(g, x + CELL - 10, y + 2);
      this.add
        .zone(x, y, CELL, CELL)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.select(item.id));
    });

    const item = items.find((i) => i.id === this.selected);
    if (!item) {
      this.detail({ text: `${items.length} objet${items.length > 1 ? 's' : ''}`, color: INK.text }, [
        { text: 'Touche un objet pour le comparer à ce que tu portes.', color: INK.soft },
        { text: 'Flèche verte : plus de bonus au total que l\'objet porté.', color: INK.soft },
      ]);
      this.actions([]);
      return;
    }
    const lines = itemCompareLines(this.character, item);
    this.detail({ text: itemTitle(item), color: RARITY_INK[item.rarity] }, lines);
    this.actions([
      { label: 'Équiper', onClick: () => void this.equip(item) },
      { label: this.discardArmed ? 'Confirmer ?' : 'Jeter', onClick: () => void this.handleDiscard(item) },
    ]);
  }

  // Small green up arrow in a cell's corner.
  private upgradeArrow(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(PAL.k, 1).fillRect(x + 2, y, 4, 2).fillRect(x, y + 2, 8, 2).fillRect(x + 2, y + 4, 4, 4);
    g.fillStyle(PAL.H, 1).fillRect(x + 2, y + 2, 4, 2).fillRect(x + 2, y + 4, 2, 2);
  }

  private resolveEquipSlot(item: Item): EquipSlot {
    return targetSlot(this.character, item);
  }

  private async equip(item: Item): Promise<void> {
    const slot = this.resolveEquipSlot(item);
    const displaced = handRule(item)
      ? planHandEquip(this.character.equipment, item).displaced
      : [this.character.equipment[slot]].filter((i): i is Item => Boolean(i));
    displaced.forEach((old) => {
      (Object.keys(this.character.equipment) as EquipSlot[]).forEach((s) => {
        if (this.character.equipment[s]?.id === old.id) delete this.character.equipment[s];
      });
    });
    this.character.equipment[slot] = item;
    this.character.inventory = this.character.inventory.filter((i) => i.id !== item.id);
    this.character.inventory.push(...displaced);
    await SaveManager.saveCharacter(this.character);
    this.selected = undefined;
    this.render();
    const back = displaced.length > 0 ? ` · ${displaced.map((d) => d.name).join(', ')} dans le sac` : '';
    toast(this, this.scale.width / 2, DETAIL_Y - 12, `${item.name} équipé${back}.`, INK.text);
  }

  // Discarding is irreversible, so the first tap only arms a confirmation and
  // the second tap actually removes the item.
  private async handleDiscard(item: Item): Promise<void> {
    if (!this.discardArmed) {
      this.discardArmed = true;
      this.render();
      return;
    }
    this.character.inventory = this.character.inventory.filter((i) => i.id !== item.id);
    await SaveManager.saveCharacter(this.character);
    this.selected = undefined;
    this.discardArmed = false;
    this.render();
    toast(this, this.scale.width / 2, DETAIL_Y - 12, `${item.name} jeté.`, INK.text);
  }

  // ------------------------------------------------------------ materials

  private renderMaterials(): void {
    const entries = Object.entries(this.character.materials).filter(([, count]) => count > 0);
    const perPage = 18;
    this.pager(entries.length, perPage);
    if (entries.length === 0) this.empty('Aucune ressource.');
    const list = entries.slice(this.page * perPage, (this.page + 1) * perPage);
    if (list.length > 0) addPanel(this, LEFT, LIST_Y - 2, INNER_W, 278);
    list.forEach(([id, count], i) => {
      const y = LIST_Y + 10 + i * 14;
      const color = isRareMaterial(id) ? RARITY_INK.rare : INK.text;
      panelText(this, LEFT + 12, y, materialLabel(id), 9, color);
      panelText(this, LEFT + INNER_W - 12, y, `${count}`, 9, color).setOrigin(1, 0);
    });
    this.actions([]);
  }

  // ---------------------------------------------------------- consumables

  private renderConsumables(): void {
    const entries = (Object.entries(this.character.consumables) as [ConsumableId, number][]).filter(([, count]) => count > 0);
    this.pager(entries.length, ROWS_PER_PAGE);
    if (entries.length === 0) this.empty('Aucun consommable.');
    entries.slice(this.page * ROWS_PER_PAGE, (this.page + 1) * ROWS_PER_PAGE).forEach(([id, count], i) => {
      new KitButton(this, LEFT, LIST_Y + i * ROW_STEP, INNER_W, 24, CONSUMABLES[id].name, {
        icon: 'potion',
        size: 9,
        cost: `x${count}`,
        costSize: 10,
        state: id === this.selected ? 'pressed' : 'normal',
        onClick: () => this.select(id),
      });
    });

    const id = entries.find(([e]) => e === this.selected)?.[0];
    if (!id) {
      this.detail({ text: 'Potions et objets', color: INK.text }, [
        { text: `PV ${this.character.hp}/${this.character.maxHp}`, color: INK.text },
        ...(this.character.maxMp > 0 ? [{ text: `Mana ${this.character.mp}/${this.character.maxMp}`, color: INK.text }] : []),
        { text: 'Touche une potion pour la boire.', color: INK.soft },
      ]);
      this.actions([]);
      return;
    }
    const def = CONSUMABLES[id];
    const gauge = def.mana ? `Mana ${this.character.mp}/${this.character.maxMp}` : `PV ${this.character.hp}/${this.character.maxHp}`;
    this.detail({ text: def.name, color: INK.text }, [
      { text: def.description, color: INK.text },
      { text: def.combatOnly ? 'Utilisable seulement en combat.' : gauge, color: INK.soft },
    ]);
    this.actions([{ label: 'Utiliser', disabled: def.combatOnly, onClick: () => void this.useConsumable(id) }]);
  }

  private async useConsumable(id: ConsumableId): Promise<void> {
    const def = CONSUMABLES[id];
    if (def.combatOnly) {
      toast(this, this.scale.width / 2, DETAIL_Y - 12, `${def.name} : utilisable seulement en combat.`);
      return;
    }
    if (!useConsumable(this.character, id)) return;
    await SaveManager.saveCharacter(this.character);
    if (!this.character.consumables[id]) this.selected = undefined;
    this.render();
    const gauge = def.mana ? `Mana ${this.character.mp}/${this.character.maxMp}` : `PV ${this.character.hp}/${this.character.maxHp}`;
    toast(this, this.scale.width / 2, DETAIL_Y - 12, `${def.name} bue (${gauge}).`, INK.text);
  }

  // ---------------------------------------------------------------- quest

  // Quest items are view-only: they're released by whatever quest logic
  // grants/claims them, not by the player choosing to drop them.
  private renderQuestItems(): void {
    const items = this.character.questItems;
    this.pager(items.length, ROWS_PER_PAGE);
    if (items.length === 0) this.empty('Aucun objet de quête.');
    items.slice(this.page * ROWS_PER_PAGE, (this.page + 1) * ROWS_PER_PAGE).forEach((questItem, i) => {
      new KitButton(this, LEFT, LIST_Y + i * ROW_STEP, INNER_W, 24, questItem.name, {
        icon: 'scroll',
        size: 9,
        state: questItem.id === this.selected ? 'pressed' : 'normal',
        onClick: () => this.select(questItem.id),
      });
    });
    const questItem = items.find((q) => q.id === this.selected);
    if (questItem) this.detail({ text: questItem.name, color: INK.text }, [{ text: questItem.description, color: INK.text }]);
    else this.detail({ text: 'Objets de quête', color: INK.text }, [{ text: 'Ils partent quand la quête les réclame.', color: INK.soft }]);
    this.actions([]);
  }
}
