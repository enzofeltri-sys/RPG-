import Phaser from 'phaser';
import { Character, getEffectiveStats } from '../game/character';
import {
  Item,
  EquipSlot,
  RARITY_LABELS,
  RARITY_COLORS,
  equipSlotLabel,
  describeItemStats,
  compareItemStats,
} from '../game/item';
import { SaveManager } from '../save/SaveManager';
import { addCrispText } from '../ui/text';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';
const SLOT_BG = '#1c2b1c';

const SLOT_ORDER: EquipSlot[] = [
  'weapon',
  'shield',
  'helmet',
  'chest',
  'legs',
  'boots',
  'gloves',
  'ring1',
  'ring2',
  'amulet',
];

interface DetailContext {
  item: Item;
  fromSlot?: EquipSlot;
}

export class InventoryScene extends Phaser.Scene {
  private character!: Character;
  private slotTexts: Partial<Record<EquipSlot, Phaser.GameObjects.Text>> = {};
  private inventoryTexts: Phaser.GameObjects.Text[] = [];
  private statsText!: Phaser.GameObjects.Text;

  private detailContext?: DetailContext;
  private detailBg!: Phaser.GameObjects.Rectangle;
  private detailTitle!: Phaser.GameObjects.Text;
  private detailStats!: Phaser.GameObjects.Text;
  private detailActionButton!: Phaser.GameObjects.Text;
  private detailCloseButton!: Phaser.GameObjects.Text;

  constructor() {
    super('Inventory');
  }

  async create(): Promise<void> {
    const { width } = this.scale;
    const save = await SaveManager.load();
    this.character = save!.character!;

    addCrispText(this, width / 2, 14, 'Inventaire', { fontSize: '16px', color: GOLD }).setOrigin(0.5);

    SLOT_ORDER.forEach((slot, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 12 + col * 104;
      const y = 38 + row * 34;
      this.renderSlot(slot, x, y);
    });

    this.statsText = addCrispText(this, 12, 206, '', {
      fontSize: '10px',
      color: GOLD,
      lineSpacing: 4,
    });
    this.refreshStats();

    addCrispText(this, 12, 246, 'Objets non équipés :', { fontSize: '10px', color: MUTED });
    this.renderInventoryList();

    const backButton = addCrispText(this, width / 2, 362, 'Retour', {
      fontSize: '13px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 10, y: 6 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    backButton.on('pointerdown', () => this.scene.start('Village'));

    this.createDetailOverlay();
  }

  private renderSlot(slot: EquipSlot, x: number, y: number): void {
    const item = this.character.equipment[slot];
    const text = addCrispText(this, x, y, this.slotLabel(slot, item), {
      fontSize: '8px',
      color: item ? RARITY_COLORS[item.rarity] : MUTED,
      backgroundColor: SLOT_BG,
      padding: { x: 4, y: 3 },
      align: 'center',
      wordWrap: { width: 92 },
    }).setInteractive({ useHandCursor: true });

    text.on('pointerdown', () => {
      const equipped = this.character.equipment[slot];
      if (equipped) this.showDetail(equipped, slot);
    });
    this.slotTexts[slot] = text;
  }

  private slotLabel(slot: EquipSlot, item?: Item): string {
    return `${equipSlotLabel(slot)}\n${item ? item.name : 'Vide'}`;
  }

  private renderInventoryList(): void {
    this.inventoryTexts.forEach((t) => t.destroy());
    this.inventoryTexts = [];

    if (this.character.inventory.length === 0) {
      this.inventoryTexts.push(addCrispText(this, 12, 262, 'Aucun objet.', { fontSize: '9px', color: MUTED }));
      return;
    }

    const MAX_VISIBLE = 5;
    this.character.inventory.slice(0, MAX_VISIBLE).forEach((item, index) => {
      const y = 262 + index * 18;
      const text = addCrispText(this, 12, y, `${item.name} (${RARITY_LABELS[item.rarity]})`, {
        fontSize: '9px',
        color: RARITY_COLORS[item.rarity],
        backgroundColor: SLOT_BG,
        padding: { x: 6, y: 3 },
      }).setInteractive({ useHandCursor: true });

      text.on('pointerdown', () => this.showDetail(item));
      this.inventoryTexts.push(text);
    });

    const overflow = this.character.inventory.length - MAX_VISIBLE;
    if (overflow > 0) {
      this.inventoryTexts.push(
        addCrispText(this, 12, 262 + MAX_VISIBLE * 18, `+ ${overflow} de plus`, {
          fontSize: '9px',
          color: MUTED,
        }),
      );
    }
  }

  // Where equip() would place this item — used both to actually equip it and
  // to know which currently-equipped item to compare it against.
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
    this.refreshAll();
  }

  private async unequip(slot: EquipSlot): Promise<void> {
    const item = this.character.equipment[slot];
    if (!item) return;
    delete this.character.equipment[slot];
    this.character.inventory.push(item);

    await SaveManager.saveCharacter(this.character);
    this.refreshAll();
  }

  private refreshAll(): void {
    SLOT_ORDER.forEach((slot) => {
      const item = this.character.equipment[slot];
      const text = this.slotTexts[slot];
      if (!text) return;
      text.setText(this.slotLabel(slot, item));
      text.setColor(item ? RARITY_COLORS[item.rarity] : MUTED);
    });
    this.refreshStats();
    this.renderInventoryList();
  }

  private refreshStats(): void {
    const stats = getEffectiveStats(this.character);
    const lines = [
      `Force ${stats.strength}   Int ${stats.intelligence}`,
      `Agilité ${stats.agility}   Vit ${stats.vitality}`,
    ];
    if (stats.armor > 0 || stats.fireDamage > 0) {
      lines.push(`Armure ${stats.armor}   Dégâts de feu ${stats.fireDamage}`);
    }
    this.statsText.setText(lines.join('\n'));
  }

  // Detail/comparison overlay: tapping any item (equipped or not) opens this
  // instead of acting immediately, so stats can be checked before committing.
  // Buttons are kept top-level per the project's Container-hit-testing rule.
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

    this.detailActionButton = addCrispText(this, 20, 272, 'Équiper', {
      fontSize: '11px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 8, y: 5 },
    })
      .setDepth(901)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.detailActionButton.on('pointerdown', () => this.handleDetailAction());

    this.detailCloseButton = addCrispText(this, 20, 300, 'Fermer', {
      fontSize: '11px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 8, y: 5 },
    })
      .setDepth(901)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.detailCloseButton.on('pointerdown', () => this.hideDetail());
  }

  private showDetail(item: Item, fromSlot?: EquipSlot): void {
    this.detailContext = { item, fromSlot };

    const lines = fromSlot ? describeItemStats(item) : compareItemStats(item, this.character.equipment[this.resolveEquipSlot(item)]);

    this.detailTitle.setText(`${item.name} (${RARITY_LABELS[item.rarity]})`).setColor(RARITY_COLORS[item.rarity]);
    this.detailStats.setText(lines.length ? lines.join('\n') : 'Aucun bonus de statistique.');
    this.detailActionButton.setText(fromSlot ? 'Déséquiper' : 'Équiper');

    this.detailBg.setVisible(true);
    this.detailTitle.setVisible(true);
    this.detailStats.setVisible(true);
    this.detailActionButton.setVisible(true);
    this.detailCloseButton.setVisible(true);
  }

  private hideDetail(): void {
    this.detailContext = undefined;
    this.detailBg.setVisible(false);
    this.detailTitle.setVisible(false);
    this.detailStats.setVisible(false);
    this.detailActionButton.setVisible(false);
    this.detailCloseButton.setVisible(false);
  }

  private async handleDetailAction(): Promise<void> {
    if (!this.detailContext) return;
    const { item, fromSlot } = this.detailContext;
    this.hideDetail();
    if (fromSlot) {
      await this.unequip(fromSlot);
    } else {
      await this.equip(item);
    }
  }
}
