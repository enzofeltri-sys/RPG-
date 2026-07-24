import Phaser from 'phaser';
import { Character, getEffectiveStats } from '../game/character';
import { Item, EquipSlot, RARITY_LABELS, RARITY_COLORS, equipSlotLabel } from '../game/item';
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

export class InventoryScene extends Phaser.Scene {
  private character!: Character;
  private slotTexts: Partial<Record<EquipSlot, Phaser.GameObjects.Text>> = {};
  private inventoryTexts: Phaser.GameObjects.Text[] = [];
  private statsText!: Phaser.GameObjects.Text;

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

    text.on('pointerdown', () => this.unequip(slot));
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

      text.on('pointerdown', () => this.equip(item));
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

  private async equip(item: Item): Promise<void> {
    const slot: EquipSlot =
      item.category === 'ring'
        ? !this.character.equipment.ring1
          ? 'ring1'
          : !this.character.equipment.ring2
            ? 'ring2'
            : 'ring1'
        : item.category;

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
    this.statsText.setText(
      [`Force ${stats.strength}   Int ${stats.intelligence}`, `Agilité ${stats.agility}   Vit ${stats.vitality}`].join(
        '\n',
      ),
    );
  }
}
