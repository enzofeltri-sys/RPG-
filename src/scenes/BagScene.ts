import Phaser from 'phaser';
import { Character } from '../game/character';
import { Item, EquipSlot, RARITY_LABELS, RARITY_COLORS, compareItemStats } from '../game/item';
import { ConsumableId, CONSUMABLES, useConsumable } from '../game/consumable';
import { materialLabel } from '../game/material';
import { QuestItem } from '../game/questItem';
import { ReturnContext, ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { SaveManager } from '../save/SaveManager';
import { addCrispText } from '../ui/text';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';
const SLOT_BG = '#1c2b1c';
const TAB_ACTIVE_BG = '#e8d9b5';
const TAB_INACTIVE_BG = '#3a3428';
const DISCARD_CONFIRM_COLOR = '#c0392b';

type BagTab = 'items' | 'materials' | 'consumables' | 'quest';

const TABS: { id: BagTab; label: string; x: number }[] = [
  { id: 'items', label: 'Objets', x: 10 },
  { id: 'materials', label: 'Ress.', x: 62 },
  { id: 'consumables', label: 'Potions', x: 108 },
  { id: 'quest', label: 'Quête', x: 166 },
];

export class BagScene extends Phaser.Scene {
  private character!: Character;
  private returnScene: ReturnSceneKey = 'Village';
  private returnX?: number;
  private returnY?: number;

  private activeTab: BagTab = 'items';
  private tabButtons: Partial<Record<BagTab, Phaser.GameObjects.Text>> = {};
  private rowTexts: Phaser.GameObjects.Text[] = [];
  private statusText!: Phaser.GameObjects.Text;

  private detailContext?: Item;
  private discardArmed = false;

  private detailBg!: Phaser.GameObjects.Rectangle;
  private detailTitle!: Phaser.GameObjects.Text;
  private detailStats!: Phaser.GameObjects.Text;
  private equipButton!: Phaser.GameObjects.Text;
  private discardButton!: Phaser.GameObjects.Text;
  private closeButton!: Phaser.GameObjects.Text;

  constructor() {
    super('Bag');
  }

  init(data: ReturnContext): void {
    this.returnScene = data?.returnScene ?? 'Village';
    this.returnX = data?.x;
    this.returnY = data?.y;
    this.activeTab = 'items';
    this.discardArmed = false;
  }

  async create(): Promise<void> {
    const { width } = this.scale;
    const save = await SaveManager.load();
    this.character = save!.character!;

    addCrispText(this, width / 2, 14, 'Sac', { fontSize: '16px', color: GOLD }).setOrigin(0.5);
    this.createTabs();

    this.statusText = addCrispText(this, width / 2, 340, '', { fontSize: '9px', color: GOLD }).setOrigin(0.5);

    const backButton = addCrispText(this, width / 2, 362, 'Retour', {
      fontSize: '13px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 10, y: 6 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    backButton.on('pointerdown', () => this.goBack());

    this.createDetailOverlay();
    this.renderList();
  }

  private goBack(): void {
    this.scene.start(this.returnScene, returnSceneStartData(this.returnScene, this.returnX, this.returnY));
  }

  private createTabs(): void {
    TABS.forEach((tab) => {
      const button = addCrispText(this, tab.x, 32, tab.label, {
        fontSize: '8px',
        color: DARK,
        backgroundColor: tab.id === this.activeTab ? TAB_ACTIVE_BG : TAB_INACTIVE_BG,
        padding: { x: 4, y: 3 },
      }).setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => this.switchTab(tab.id));
      this.tabButtons[tab.id] = button;
    });
  }

  private switchTab(tab: BagTab): void {
    if (tab === this.activeTab) return;
    this.activeTab = tab;
    this.hideDetail();
    this.statusText.setText('');
    TABS.forEach((t) => {
      this.tabButtons[t.id]?.setBackgroundColor(t.id === this.activeTab ? TAB_ACTIVE_BG : TAB_INACTIVE_BG);
    });
    this.renderList();
  }

  private renderList(): void {
    this.rowTexts.forEach((t) => t.destroy());
    this.rowTexts = [];

    if (this.activeTab === 'items') this.renderItems();
    else if (this.activeTab === 'materials') this.renderMaterials();
    else if (this.activeTab === 'consumables') this.renderConsumables();
    else this.renderQuestItems();
  }

  private addEmptyRow(label: string): void {
    this.rowTexts.push(addCrispText(this, 12, 56, label, { fontSize: '9px', color: MUTED }));
  }

  private renderItems(): void {
    if (this.character.inventory.length === 0) {
      this.addEmptyRow('Aucun objet.');
      return;
    }

    const MAX_VISIBLE = 10;
    this.character.inventory.slice(0, MAX_VISIBLE).forEach((item, index) => {
      const y = 56 + index * 20;
      const text = addCrispText(this, 12, y, `${item.name} (${RARITY_LABELS[item.rarity]})`, {
        fontSize: '9px',
        color: RARITY_COLORS[item.rarity],
        backgroundColor: SLOT_BG,
        padding: { x: 6, y: 3 },
      }).setInteractive({ useHandCursor: true });

      text.on('pointerdown', () => this.showItemDetail(item));
      this.rowTexts.push(text);
    });

    const overflow = this.character.inventory.length - MAX_VISIBLE;
    if (overflow > 0) {
      this.rowTexts.push(
        addCrispText(this, 12, 56 + MAX_VISIBLE * 20, `+ ${overflow} de plus`, { fontSize: '9px', color: MUTED }),
      );
    }
  }

  private renderMaterials(): void {
    const entries = Object.entries(this.character.materials).filter(([, count]) => count > 0);
    if (entries.length === 0) {
      this.addEmptyRow('Aucune ressource.');
      return;
    }

    entries.forEach(([materialId, count], index) => {
      const y = 56 + index * 20;
      this.rowTexts.push(
        addCrispText(this, 12, y, `${materialLabel(materialId)} : ${count}`, {
          fontSize: '9px',
          color: GOLD,
          backgroundColor: SLOT_BG,
          padding: { x: 6, y: 3 },
        }),
      );
    });
  }

  private renderConsumables(): void {
    const entries = Object.entries(this.character.consumables).filter(([, count]) => count > 0);
    if (entries.length === 0) {
      this.addEmptyRow('Aucun consommable.');
      return;
    }

    entries.forEach(([id, count], index) => {
      const y = 56 + index * 20;
      const def = CONSUMABLES[id as ConsumableId];
      const text = addCrispText(this, 12, y, `${def.name} x${count} — Utiliser`, {
        fontSize: '9px',
        color: GOLD,
        backgroundColor: SLOT_BG,
        padding: { x: 6, y: 3 },
      }).setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this.handleUseConsumable(id as ConsumableId));
      this.rowTexts.push(text);
    });
  }

  private renderQuestItems(): void {
    if (this.character.questItems.length === 0) {
      this.addEmptyRow('Aucun objet de quête.');
      return;
    }

    this.character.questItems.forEach((questItem, index) => {
      const y = 56 + index * 20;
      const text = addCrispText(this, 12, y, questItem.name, {
        fontSize: '9px',
        color: GOLD,
        backgroundColor: SLOT_BG,
        padding: { x: 6, y: 3 },
      }).setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this.showQuestItemDetail(questItem));
      this.rowTexts.push(text);
    });
  }

  private async handleUseConsumable(id: ConsumableId): Promise<void> {
    const used = useConsumable(this.character, id);
    if (!used) return;
    await SaveManager.saveCharacter(this.character);
    this.statusText.setText(`${CONSUMABLES[id].name} utilisée (PV ${this.character.hp}/${this.character.maxHp}).`);
    this.renderList();
  }

  private resolveEquipSlot(item: Item): EquipSlot {
    if (item.category !== 'ring') return item.category;
    if (!this.character.equipment.ring1) return 'ring1';
    if (!this.character.equipment.ring2) return 'ring2';
    return 'ring1';
  }

  private async equip(item: Item): Promise<void> {
    const slot = this.resolveEquipSlot(item);
    const previous = this.character.equipment[slot];
    this.character.equipment[slot] = item;
    this.character.inventory = this.character.inventory.filter((i) => i.id !== item.id);
    if (previous) {
      this.character.inventory.push(previous);
    }

    await SaveManager.saveCharacter(this.character);
    this.hideDetail();
    this.renderList();
  }

  private async discard(item: Item): Promise<void> {
    this.character.inventory = this.character.inventory.filter((i) => i.id !== item.id);
    await SaveManager.saveCharacter(this.character);
    this.hideDetail();
    this.renderList();
  }

  private createDetailOverlay(): void {
    const { width } = this.scale;

    this.detailBg = this.add
      .rectangle(10, 48, width - 20, 276, 0x0b0c10, 0.97)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xe8d9b5)
      .setDepth(900)
      .setVisible(false);

    this.detailTitle = addCrispText(this, 20, 58, '', { fontSize: '12px', color: GOLD })
      .setDepth(901)
      .setVisible(false);

    this.detailStats = addCrispText(this, 20, 80, '', {
      fontSize: '9px',
      color: GOLD,
      lineSpacing: 6,
      wordWrap: { width: width - 40 },
    })
      .setDepth(901)
      .setVisible(false);

    this.equipButton = addCrispText(this, 20, 254, 'Équiper', {
      fontSize: '11px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 8, y: 5 },
    })
      .setDepth(901)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.equipButton.on('pointerdown', () => {
      if (this.detailContext) this.equip(this.detailContext);
    });

    this.discardButton = addCrispText(this, 20, 282, 'Jeter', {
      fontSize: '11px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 8, y: 5 },
    })
      .setDepth(901)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.discardButton.on('pointerdown', () => this.handleDiscardClick());

    this.closeButton = addCrispText(this, 20, 310, 'Fermer', {
      fontSize: '11px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 8, y: 5 },
    })
      .setDepth(901)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.closeButton.on('pointerdown', () => this.hideDetail());
  }

  private showItemDetail(item: Item): void {
    this.detailContext = item;
    this.discardArmed = false;

    const lines = compareItemStats(item, this.character.equipment[this.resolveEquipSlot(item)]);
    this.detailTitle.setText(`${item.name} (${RARITY_LABELS[item.rarity]})`).setColor(RARITY_COLORS[item.rarity]);
    this.detailStats.setText(lines.length ? lines.join('\n') : 'Aucun bonus de statistique.');
    this.resetDiscardButton();

    this.detailBg.setVisible(true);
    this.detailTitle.setVisible(true);
    this.detailStats.setVisible(true);
    this.equipButton.setVisible(true);
    this.discardButton.setVisible(true);
    this.closeButton.setVisible(true);
  }

  // Quest items are view-only: no Équiper/Jeter, just the description and a
  // way to close — they're released by whatever quest logic grants/claims
  // them, not by the player choosing to drop them.
  private showQuestItemDetail(questItem: QuestItem): void {
    this.detailContext = undefined;
    this.discardArmed = false;

    this.detailTitle.setText(questItem.name).setColor(GOLD);
    this.detailStats.setText(questItem.description);

    this.detailBg.setVisible(true);
    this.detailTitle.setVisible(true);
    this.detailStats.setVisible(true);
    this.equipButton.setVisible(false);
    this.discardButton.setVisible(false);
    this.closeButton.setVisible(true);
  }

  private hideDetail(): void {
    this.detailContext = undefined;
    this.discardArmed = false;
    this.detailBg.setVisible(false);
    this.detailTitle.setVisible(false);
    this.detailStats.setVisible(false);
    this.equipButton.setVisible(false);
    this.discardButton.setVisible(false);
    this.closeButton.setVisible(false);
  }

  // Discarding is irreversible, so the first tap only arms a confirmation and
  // the second tap actually removes the item — no separate confirm screen needed.
  private handleDiscardClick(): void {
    if (!this.detailContext) return;
    if (!this.discardArmed) {
      this.discardArmed = true;
      this.discardButton.setText('Confirmer le jet ?').setColor(DISCARD_CONFIRM_COLOR);
      return;
    }
    this.discard(this.detailContext);
  }

  private resetDiscardButton(): void {
    this.discardButton.setText('Jeter').setColor(DARK);
  }
}
