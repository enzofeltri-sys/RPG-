import Phaser from 'phaser';
import { centerFrame } from '../ui/screen';
import { Character, getEffectiveStats } from '../game/character';
import { Item, EquipSlot, equipSlotLabel, isUpgrade, summarizeEquippedSets } from '../game/item';
import { handSlotAccepts, isTwoHanded, planHandEquip } from '../game/weapons';
import { ReturnContext, ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { SaveManager } from '../save/SaveManager';
import { preloadItemIcons, placeItemIcon } from '../entities/itemIcon';
import { INK, KitButton, addPanel, addScreenPanel, buttonRow, drawButton, panelText, preloadUiKit, toast } from '../ui/kit';
import { RARITY_INK, RARITY_STRIPE, comparisonLine, itemSetLine, itemStatsLine, itemTitle, itemTypeLine } from '../ui/itemText';
import { HERO_FEET_Y, HERO_FRAME_H, heroTextures, idleFrame } from '../entities/heroSprite';

// ring1/ring2 both accept any 'ring'-category item; the two hands follow
// the hands rule (see weapons.ts) — every other slot's category matches its
// own name exactly.
function slotAccepts(slot: EquipSlot, item: Item): boolean {
  if (slot === 'ring1' || slot === 'ring2') return item.category === 'ring';
  if (slot === 'weapon' || slot === 'shield') return handSlotAccepts(slot, item);
  return item.category === slot;
}

// Slots around the hero, as on the mockup: left column then right column.
const LEFT_SLOTS: EquipSlot[] = ['helmet', 'weapon', 'chest', 'legs', 'boots'];
const RIGHT_SLOTS: EquipSlot[] = ['amulet', 'shield', 'gloves', 'ring1', 'ring2'];
const SHORT_LABELS: Record<EquipSlot, string> = {
  helmet: 'Casque',
  weapon: 'Main dr.',
  chest: 'Torse',
  legs: 'Jambes',
  boots: 'Bottes',
  amulet: 'Amulette',
  shield: 'Main g.',
  gloves: 'Gants',
  ring1: 'Anneau',
  ring2: 'Anneau',
};

const SLOT_W = 48;
const SLOT_H = 32;
const SLOT_TOP = 38;
const SLOT_STEP = 46;
const LEFT = 14;
const INNER_W = 188;
const DETAIL_Y = 270;
const DETAIL_H = 68;
const BUTTONS_Y = 344;
const ROWS_PER_PAGE = 7;

const ELEMENT_SHORT: [keyof ReturnType<typeof getEffectiveStats>, string][] = [
  ['fireDamage', 'Feu'],
  ['iceDamage', 'Glace'],
  ['electricDamage', 'Foudre'],
  ['poisonDamage', 'Poison'],
  ['darkDamage', 'Ombre'],
  ['earthDamage', 'Terre'],
  ['lifeSteal', 'Vol de vie'],
];

// Équipement in UI style A (docs/mockups/ui3_ecrans.png): the ten slots
// around the hero, the hero's stats under it, a detail panel for the
// selected slot, and a picker listing every item from the Sac that fits.
export class InventoryScene extends Phaser.Scene {
  private character!: Character;
  private returnScene: ReturnSceneKey = 'Village';
  private returnX?: number;
  private returnY?: number;
  private slot: EquipSlot = 'weapon';
  private picking = false;
  private pickedId?: string;
  private page = 0;

  constructor() {
    super('Inventory');
  }

  init(data: ReturnContext): void {
    this.returnScene = data?.returnScene ?? 'Village';
    this.returnX = data?.x;
    this.returnY = data?.y;
    this.slot = 'weapon';
    this.picking = false;
    this.pickedId = undefined;
    this.page = 0;
  }

  preload(): void {
    preloadUiKit(this);
  }

  async create(): Promise<void> {
    centerFrame(this);
    const save = await SaveManager.load();
    this.character = save!.character!;
    const worn = Object.values(this.character.equipment).filter((i): i is Item => Boolean(i));
    await preloadItemIcons(this, [...worn, ...this.character.inventory].map((i) => i.baseId));
    if (!this.scene.isActive()) return;
    this.render();
  }

  private goBack(): void {
    this.scene.start(this.returnScene, returnSceneStartData(this.returnScene, this.returnX, this.returnY));
  }

  private candidates(): Item[] {
    return this.character.inventory.filter((item) => slotAccepts(this.slot, item));
  }

  // The left hand is taken by a two-handed weapon in the right one.
  private blocked(slot: EquipSlot): boolean {
    return slot === 'shield' && !this.character.equipment.shield && isTwoHanded(this.character.equipment.weapon);
  }

  private render(): void {
    this.children.removeAll(true);
    addScreenPanel(this);
    panelText(this, this.scale.width / 2, 14, 'Équipement', 12).setOrigin(0.5, 0);
    LEFT_SLOTS.forEach((slot, i) => this.renderSlot(slot, LEFT, SLOT_TOP + i * SLOT_STEP));
    RIGHT_SLOTS.forEach((slot, i) => this.renderSlot(slot, LEFT + INNER_W - SLOT_W, SLOT_TOP + i * SLOT_STEP));
    // The hero from the front, at 3x so the outfit reads between the slots.
    this.add
      .image(this.scale.width / 2, 132, heroTextures(this, this.character).sheet, idleFrame('down'))
      .setOrigin(0.5, HERO_FEET_Y / HERO_FRAME_H)
      .setScale(3);
    this.renderStats();
    if (this.picking) this.renderPicker();
    else this.renderSlotDetail();
  }

  private renderSlot(slot: EquipSlot, x: number, y: number): void {
    const item = this.character.equipment[slot];
    const selected = slot === this.slot;
    const g = this.add.graphics();
    drawButton(g, x, y, SLOT_W, SLOT_H, this.blocked(slot) ? 'disabled' : selected ? 'pressed' : 'normal');
    if (item) {
      const stripe = RARITY_STRIPE[item.rarity];
      if (stripe !== null) g.fillStyle(stripe, 1).fillRect(x + 6, y + SLOT_H - 6, SLOT_W - 12, 2);
      if (!placeItemIcon(this, item.baseId, x + SLOT_W / 2, y + SLOT_H / 2 - 1, 24)) {
        // No icon drawn yet for this item (items step): a generic kit icon.
        this.add.image(x + SLOT_W / 2, y + SLOT_H / 2 - 1, item.category === 'weapon' ? 'ui-icon-sword' : 'ui-icon-bag');
      }
    } else if (this.blocked(slot)) {
      this.add.image(x + SLOT_W / 2, y + SLOT_H / 2, 'ui-icon-lock');
    }
    panelText(this, x + SLOT_W / 2, y + SLOT_H + 1, SHORT_LABELS[slot], 7, selected ? INK.text : INK.soft).setOrigin(0.5, 0);
    // Under the picker the slots are covered: they must not catch its taps.
    if (this.picking) return;
    this.add
      .zone(x, y, SLOT_W, SLOT_H)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.slot = slot;
        this.picking = false;
        this.render();
      });
  }

  // Short stat summary under the hero, between the two slot columns.
  private renderStats(): void {
    const s = getEffectiveStats(this.character);
    const lines = [`For ${s.strength} · Int ${s.intelligence}`, `Agi ${s.agility} · Vit ${s.vitality}`, `Armure ${s.armor}`];
    const extras = ELEMENT_SHORT.filter(([key]) => (s[key] as number) > 0).map(([key, label]) => `${label} +${s[key]}`);
    for (let i = 0; i < extras.length; i += 2) lines.push(extras.slice(i, i + 2).join(' · '));
    const text = panelText(this, this.scale.width / 2, 142, lines.join('\n'), 8, INK.text, { align: 'center', lineSpacing: 2 }).setOrigin(
      0.5,
      0,
    );
    const sets = summarizeEquippedSets(this.character.equipment);
    if (sets.length > 0) {
      panelText(this, this.scale.width / 2, text.y + text.height + 4, sets.join('\n'), 7, INK.soft, {
        align: 'center',
        wordWrap: { width: 88 },
      }).setOrigin(0.5, 0);
    }
  }

  // Detail panel lines, shrunk a notch when they would overflow.
  private renderDetail(title: { text: string; color: string }, lines: { text: string; color: string }[]): void {
    addPanel(this, LEFT, DETAIL_Y, INNER_W, DETAIL_H);
    const x = LEFT + 10;
    panelText(this, x, DETAIL_Y + 8, title.text, 9, title.color, { wordWrap: { width: INNER_W - 20 } });
    for (const size of [8, 7]) {
      let y = DETAIL_Y + 22;
      const texts = lines.map((line) => {
        const t = panelText(this, x, y, line.text, size, line.color, { wordWrap: { width: INNER_W - 20 } });
        y += t.height + (size === 8 ? 2 : 1);
        return t;
      });
      if (y <= DETAIL_Y + DETAIL_H - 6 || size === 7) break;
      texts.forEach((t) => t.destroy());
    }
  }

  private itemLines(item: Item): { text: string; color: string }[] {
    const lines = [
      { text: itemTypeLine(item), color: INK.soft },
      { text: itemStatsLine(item), color: INK.text },
    ];
    const set = itemSetLine(item, this.character);
    if (set) lines.push({ text: set, color: INK.soft });
    return lines;
  }

  private renderSlotDetail(): void {
    const item = this.character.equipment[this.slot];
    const count = this.candidates().length;
    const fits = count === 0 ? 'Aucun objet du sac ne va ici.' : `${count} objet${count > 1 ? 's' : ''} du sac ${count > 1 ? 'vont' : 'va'} ici.`;
    if (item) {
      this.renderDetail({ text: itemTitle(item), color: RARITY_INK[item.rarity] }, this.itemLines(item));
    } else {
      const lines = [{ text: fits, color: INK.soft }];
      if (this.blocked(this.slot)) lines.unshift({ text: "Occupée par l'arme à deux mains.", color: INK.soft });
      this.renderDetail({ text: `${equipSlotLabel(this.slot)} : vide`, color: INK.text }, lines);
    }

    const buttons: { label: string; disabled?: boolean; onClick: () => void }[] = [
      {
        label: count > 0 ? `Changer (${count})` : 'Changer',
        disabled: count === 0,
        onClick: () => {
          if (count === 0) {
            toast(this, this.scale.width / 2, DETAIL_Y - 14, fits);
            return;
          }
          this.picking = true;
          this.pickedId = undefined;
          this.page = 0;
          this.render();
        },
      },
    ];
    if (item) buttons.push({ label: 'Retirer', onClick: () => void this.unequip(this.slot) });
    buttons.push({ label: 'Retour', onClick: () => this.goBack() });
    this.renderButtons(buttons);
  }

  private renderPicker(): void {
    const candidates = this.candidates();
    const current = this.character.equipment[this.slot];
    const pages = Math.max(1, Math.ceil(candidates.length / ROWS_PER_PAGE));
    this.page = Math.min(this.page, pages - 1);

    addPanel(this, LEFT, 36, INNER_W, 228);
    panelText(this, LEFT + 10, 46, `${equipSlotLabel(this.slot)} · ${candidates.length} objet${candidates.length > 1 ? 's' : ''}`, 9);
    if (pages > 1) {
      panelText(this, LEFT + INNER_W - 54, 47, `${this.page + 1}/${pages}`, 8, INK.soft).setOrigin(1, 0);
      new KitButton(this, LEFT + INNER_W - 50, 42, 20, 18, '<', {
        size: 9,
        align: 'center',
        state: this.page === 0 ? 'disabled' : 'normal',
        onClick: () => this.turnPage(-1, pages),
      });
      new KitButton(this, LEFT + INNER_W - 28, 42, 20, 18, '>', {
        size: 9,
        align: 'center',
        state: this.page === pages - 1 ? 'disabled' : 'normal',
        onClick: () => this.turnPage(1, pages),
      });
    }
    candidates.slice(this.page * ROWS_PER_PAGE, (this.page + 1) * ROWS_PER_PAGE).forEach((item, i) => {
      const y = 64 + i * 28;
      new KitButton(this, LEFT + 8, y, INNER_W - 16, 24, item.name, {
        iconTexture: `item-icon-${item.baseId}`,
        size: 9,
        cost: isUpgrade(item, current) ? 'Mieux' : undefined,
        state: item.id === this.pickedId ? 'pressed' : 'normal',
        onClick: () => {
          this.pickedId = item.id;
          this.render();
        },
      });
      const stripe = RARITY_STRIPE[item.rarity];
      if (stripe !== null) this.add.graphics().fillStyle(stripe, 1).fillRect(LEFT + 10, y + 4, 2, 16);
    });

    const picked = candidates.find((i) => i.id === this.pickedId);
    if (picked) {
      this.renderDetail({ text: itemTitle(picked), color: RARITY_INK[picked.rarity] }, [
        ...this.itemLines(picked),
        comparisonLine(picked, current),
      ]);
    } else {
      this.renderDetail({ text: 'Choisis un objet', color: INK.text }, [
        { text: current ? `Actuel : ${itemTitle(current)}` : 'Emplacement vide pour le moment.', color: INK.soft },
        { text: '« Mieux » : plus de bonus au total que l\'actuel.', color: INK.soft },
      ]);
    }
    this.renderButtons([
      { label: 'Équiper', disabled: !picked, onClick: () => picked && void this.equipInto(this.slot, picked) },
      {
        label: 'Annuler',
        onClick: () => {
          this.picking = false;
          this.render();
        },
      },
    ]);
  }

  private turnPage(delta: number, pages: number): void {
    const next = this.page + delta;
    if (next < 0 || next >= pages) return;
    this.page = next;
    this.pickedId = undefined;
    this.render();
  }

  private renderButtons(buttons: { label: string; disabled?: boolean; onClick: () => void }[]): void {
    buttonRow(buttons.length, LEFT, INNER_W).forEach(({ x, w }, i) => {
      const b = buttons[i];
      new KitButton(this, x, BUTTONS_Y, w, 28, b.label, {
        size: 9,
        align: 'center',
        state: b.disabled ? 'disabled' : 'normal',
        onClick: b.onClick,
      });
    });
  }

  private async unequip(slot: EquipSlot): Promise<void> {
    const item = this.character.equipment[slot];
    if (!item) return;
    delete this.character.equipment[slot];
    this.character.inventory.push(item);
    await SaveManager.saveCharacter(this.character);
    this.render();
  }

  private async equipInto(slot: EquipSlot, item: Item): Promise<void> {
    let target = slot;
    let displaced: Item[];
    const before = { weapon: this.character.equipment.weapon, shield: this.character.equipment.shield };
    if (slot === 'weapon' || slot === 'shield') {
      const plan = planHandEquip(this.character.equipment, item, slot);
      target = plan.slot;
      displaced = plan.displaced;
      if (displaced.includes(this.character.equipment.weapon!)) delete this.character.equipment.weapon;
      if (displaced.includes(this.character.equipment.shield!)) delete this.character.equipment.shield;
    } else {
      displaced = [this.character.equipment[slot]].filter((i): i is Item => Boolean(i));
    }
    this.character.equipment[target] = item;
    this.character.inventory = this.character.inventory.filter((i) => i.id !== item.id);
    this.character.inventory.push(...displaced);
    await SaveManager.saveCharacter(this.character);

    this.slot = target;
    this.picking = false;
    this.render();
    // A two-handed weapon (or a left-hand item next to one) also frees the
    // other hand: say so, since that item silently went back to the Sac.
    const other = target === 'weapon' ? before.shield : target === 'shield' ? before.weapon : undefined;
    if (other && displaced.includes(other)) {
      toast(this, this.scale.width / 2, DETAIL_Y - 14, `${other.name} rangé dans le sac.`, INK.text);
    }
  }
}
