import Phaser from 'phaser';
import { Character, getEffectiveStats } from '../game/character';
import { Item, EquipSlot, RARITY_LABELS, RARITY_COLORS, equipSlotLabel, describeItemStats } from '../game/item';
import { ReturnContext, ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
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
  private returnScene: ReturnSceneKey = 'Village';
  private returnX?: number;
  private returnY?: number;

  private slotTexts: Partial<Record<EquipSlot, Phaser.GameObjects.Text>> = {};
  private statsText!: Phaser.GameObjects.Text;

  private detailContext?: EquipSlot;
  private detailBg!: Phaser.GameObjects.Rectangle;
  private detailTitle!: Phaser.GameObjects.Text;
  private detailStats!: Phaser.GameObjects.Text;
  private detailActionButton!: Phaser.GameObjects.Text;
  private detailCloseButton!: Phaser.GameObjects.Text;

  constructor() {
    super('Inventory');
  }

  init(data: ReturnContext): void {
    this.returnScene = data?.returnScene ?? 'Village';
    this.returnX = data?.x;
    this.returnY = data?.y;
  }

  async create(): Promise<void> {
    const { width } = this.scale;
    const save = await SaveManager.load();
    this.character = save!.character!;

    addCrispText(this, width / 2, 14, 'Équipement', { fontSize: '16px', color: GOLD }).setOrigin(0.5);

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

    addCrispText(this, 12, 246, 'Astuce : équipe des objets depuis le Sac.', {
      fontSize: '9px',
      color: MUTED,
      wordWrap: { width: width - 24 },
    });

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
  }

  private goBack(): void {
    this.scene.start(this.returnScene, returnSceneStartData(this.returnScene, this.returnX, this.returnY));
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
      if (equipped) this.showDetail(slot, equipped);
    });
    this.slotTexts[slot] = text;
  }

  private slotLabel(slot: EquipSlot, item?: Item): string {
    return `${equipSlotLabel(slot)}\n${item ? item.name : 'Vide'}`;
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

  // Detail overlay for an equipped slot: view its stats and unequip it.
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

    this.detailActionButton = addCrispText(this, 20, 272, 'Déséquiper', {
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

  private showDetail(slot: EquipSlot, item: Item): void {
    this.detailContext = slot;

    const lines = describeItemStats(item);
    this.detailTitle.setText(`${item.name} (${RARITY_LABELS[item.rarity]})`).setColor(RARITY_COLORS[item.rarity]);
    this.detailStats.setText(lines.length ? lines.join('\n') : 'Aucun bonus de statistique.');

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
    const slot = this.detailContext;
    this.hideDetail();
    await this.unequip(slot);
  }
}
