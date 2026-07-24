import Phaser from 'phaser';
import { Character } from '../game/character';
import { Item, EquipSlot, RARITY_LABELS, RARITY_COLORS, compareItemStats } from '../game/item';
import { ReturnContext, ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { SaveManager } from '../save/SaveManager';
import { addCrispText } from '../ui/text';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';
const SLOT_BG = '#1c2b1c';
const DISCARD_CONFIRM_COLOR = '#c0392b';

export class BagScene extends Phaser.Scene {
  private character!: Character;
  private returnScene: ReturnSceneKey = 'Village';
  private returnX?: number;
  private returnY?: number;

  private itemTexts: Phaser.GameObjects.Text[] = [];
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
    this.discardArmed = false;
  }

  async create(): Promise<void> {
    const { width } = this.scale;
    const save = await SaveManager.load();
    this.character = save!.character!;

    addCrispText(this, width / 2, 14, 'Sac', { fontSize: '16px', color: GOLD }).setOrigin(0.5);
    addCrispText(this, 12, 38, 'Objets non équipés :', { fontSize: '10px', color: MUTED });
    this.renderList();

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

  private renderList(): void {
    this.itemTexts.forEach((t) => t.destroy());
    this.itemTexts = [];

    if (this.character.inventory.length === 0) {
      this.itemTexts.push(addCrispText(this, 12, 56, 'Aucun objet.', { fontSize: '9px', color: MUTED }));
      return;
    }

    const MAX_VISIBLE = 12;
    this.character.inventory.slice(0, MAX_VISIBLE).forEach((item, index) => {
      const y = 56 + index * 20;
      const text = addCrispText(this, 12, y, `${item.name} (${RARITY_LABELS[item.rarity]})`, {
        fontSize: '9px',
        color: RARITY_COLORS[item.rarity],
        backgroundColor: SLOT_BG,
        padding: { x: 6, y: 3 },
      }).setInteractive({ useHandCursor: true });

      text.on('pointerdown', () => this.showDetail(item));
      this.itemTexts.push(text);
    });

    const overflow = this.character.inventory.length - MAX_VISIBLE;
    if (overflow > 0) {
      this.itemTexts.push(
        addCrispText(this, 12, 56 + MAX_VISIBLE * 20, `+ ${overflow} de plus`, { fontSize: '9px', color: MUTED }),
      );
    }
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

  private showDetail(item: Item): void {
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
