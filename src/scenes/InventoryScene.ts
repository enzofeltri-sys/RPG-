import Phaser from 'phaser';
import { Character, getEffectiveStats } from '../game/character';
import {
  Item,
  EquipSlot,
  RARITY_LABELS,
  RARITY_COLORS,
  equipSlotLabel,
  isUpgrade,
  summarizeEquippedSets,
} from '../game/item';
import { ReturnContext, ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { SaveManager } from '../save/SaveManager';
import { addCrispText } from '../ui/text';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';
const SLOT_BG = '#1c2b1c';
const EQUIPPED_BG = '#2a3a2a';

// ring1/ring2 both accept any 'ring'-category item; the shield slot doubles
// as the dual-wield off-hand (see item.ts's ItemCategory comment) and so
// accepts 'shield'/'offhand' items AND one-handed melee weapons (sword/axe/
// dagger — not bow/staff, which need both hands), so a real sword or dagger
// can be dual-wielded, not just the dedicated 'offhand' items — every other
// slot's category matches its own name exactly.
function slotAccepts(slot: EquipSlot, item: Item): boolean {
  if (slot === 'ring1' || slot === 'ring2') return item.category === 'ring';
  if (slot === 'shield') {
    if (item.category === 'shield' || item.category === 'offhand') return true;
    return (
      item.category === 'weapon' &&
      (item.weaponType === 'sword' || item.weaponType === 'axe' || item.weaponType === 'dagger')
    );
  }
  return item.category === slot;
}

const CANDIDATE_ROW_H = 20;
const MAX_VISIBLE_CANDIDATES = 8;

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

  // Browsing a slot shows every item in the bag that fits it (plus whatever's
  // currently equipped there), not just the one piece already worn — lets the
  // player compare and swap directly instead of hunting through the Sac.
  private detailSlot?: EquipSlot;
  private detailBg!: Phaser.GameObjects.Rectangle;
  private detailTitle!: Phaser.GameObjects.Text;
  private detailRows: Phaser.GameObjects.GameObject[] = [];
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

    addCrispText(this, 12, 246, 'Astuce : touche un emplacement pour comparer et équiper.', {
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

    text.on('pointerdown', () => this.showSlotDetail(slot));
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

  private async equipInto(slot: EquipSlot, item: Item): Promise<void> {
    const previous = this.character.equipment[slot];
    this.character.equipment[slot] = item;
    this.character.inventory = this.character.inventory.filter((i) => i.id !== item.id);
    if (previous) this.character.inventory.push(previous);

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
    const sets = summarizeEquippedSets(this.character.equipment);
    if (sets.length > 0) {
      lines.push(`Panoplies : ${sets.join(' · ')}`);
    }
    this.statsText.setText(lines.join('\n'));
  }

  // Detail overlay for a slot: every candidate that fits it (whatever's
  // currently equipped, plus every matching item in the Sac), each row
  // tappable to equip/unequip directly — comparing and swapping without
  // leaving this screen. Buttons are kept top-level per the project's
  // Container-hit-testing rule.
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

  private showSlotDetail(slot: EquipSlot): void {
    this.detailSlot = slot;
    this.detailRows.forEach((row) => row.destroy());
    this.detailRows = [];

    this.detailTitle.setText(equipSlotLabel(slot)).setColor(GOLD);

    const equipped = this.character.equipment[slot];
    const candidates = this.character.inventory.filter((item) => slotAccepts(slot, item));

    let y = 82;
    if (equipped) {
      this.detailRows.push(this.renderCandidateRow(equipped, y, true, equipped));
      y += CANDIDATE_ROW_H;
    }

    if (!equipped && candidates.length === 0) {
      this.detailRows.push(
        addCrispText(this, 20, y, 'Aucun objet pour cet emplacement.', { fontSize: '9px', color: MUTED })
          .setDepth(901),
      );
    } else {
      candidates.slice(0, MAX_VISIBLE_CANDIDATES).forEach((item) => {
        this.detailRows.push(this.renderCandidateRow(item, y, false, equipped));
        y += CANDIDATE_ROW_H;
      });

      const overflow = candidates.length - MAX_VISIBLE_CANDIDATES;
      if (overflow > 0) {
        this.detailRows.push(
          addCrispText(this, 20, y, `+ ${overflow} de plus dans le Sac`, { fontSize: '9px', color: MUTED })
            .setDepth(901),
        );
      }
    }

    this.detailBg.setVisible(true);
    this.detailTitle.setVisible(true);
    this.detailCloseButton.setVisible(true);
  }

  // isEquipped rows unequip on tap; bag candidates equip into this.detailSlot
  // (not resolveEquipSlot's auto-pick — the player already chose which ring
  // slot etc. by tapping it) and show an upgrade/downgrade arrow against
  // whatever's currently worn there.
  private renderCandidateRow(item: Item, y: number, isEquipped: boolean, equipped?: Item): Phaser.GameObjects.Text {
    let suffix = isEquipped ? ' — Équipé' : '';
    if (!isEquipped && equipped) {
      if (isUpgrade(item, equipped)) suffix = ' ▲';
      else if (isUpgrade(equipped, item)) suffix = ' ▼';
    }

    const row = addCrispText(this, 20, y, `${item.name} (${RARITY_LABELS[item.rarity]})${suffix}`, {
      fontSize: '9px',
      color: RARITY_COLORS[item.rarity],
      backgroundColor: isEquipped ? EQUIPPED_BG : SLOT_BG,
      padding: { x: 6, y: 3 },
    })
      .setDepth(901)
      .setInteractive({ useHandCursor: true });

    if (isEquipped) {
      row.on('pointerdown', async () => {
        if (!this.detailSlot) return;
        await this.unequip(this.detailSlot);
        this.showSlotDetail(this.detailSlot);
      });
    } else {
      row.on('pointerdown', async () => {
        if (!this.detailSlot) return;
        await this.equipInto(this.detailSlot, item);
        this.showSlotDetail(this.detailSlot);
      });
    }

    return row;
  }

  private hideDetail(): void {
    this.detailSlot = undefined;
    this.detailRows.forEach((row) => row.destroy());
    this.detailRows = [];
    this.detailBg.setVisible(false);
    this.detailTitle.setVisible(false);
    this.detailCloseButton.setVisible(false);
  }
}
