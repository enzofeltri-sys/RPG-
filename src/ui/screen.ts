import Phaser from 'phaser';
import { safeTop } from './safeArea';
import { Character } from '../game/character';
import { EquipSlot, Item } from '../game/item';
import { handRule, planHandEquip } from '../game/weapons';
import { INK, KitButton, addPanel, buttonRow, panelText } from './kit';

// Building blocks shared by the list screens in UI style A (Sac, Marchande,
// Artisanat…): a parchment detail panel, a bottom action row and a pager.

export const SCREEN_LEFT = 14;
export const SCREEN_INNER_W = 188;
export const LIST_TOP = 62;
export const DETAIL_TOP = 214;
export const DETAIL_HEIGHT = 124;
export const ACTIONS_TOP = 344;

export interface Line {
  text: string;
  color: string;
}

export interface Action {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}

// Title plus lines, shrunk a notch (8 → 7px) when they would overflow.
export function detailPanel(
  scene: Phaser.Scene,
  title: Line,
  lines: Line[],
  top = DETAIL_TOP,
  height = DETAIL_HEIGHT,
): void {
  addPanel(scene, SCREEN_LEFT, top, SCREEN_INNER_W, height);
  const x = SCREEN_LEFT + 10;
  const wrap = { wordWrap: { width: SCREEN_INNER_W - 20 } };
  const head = panelText(scene, x, top + 8, title.text, 9, title.color, wrap);
  for (const size of [8, 7]) {
    let y = head.y + head.height + 4;
    const texts = lines.map((line) => {
      const t = panelText(scene, x, y, line.text, size, line.color, wrap);
      y += t.height + (size === 8 ? 2 : 1);
      return t;
    });
    if (y <= top + height - 8 || size === 7) break;
    texts.forEach((t) => t.destroy());
  }
}

// Evenly spread buttons on the bottom row.
export function actionRow(scene: Phaser.Scene, actions: Action[], top = ACTIONS_TOP): void {
  buttonRow(actions.length, SCREEN_LEFT, SCREEN_INNER_W).forEach(({ x, w }, i) => {
    const a = actions[i];
    new KitButton(scene, x, top, w, 28, a.label, {
      size: 9,
      align: 'center',
      state: a.disabled ? 'disabled' : 'normal',
      onClick: a.onClick,
    });
  });
}

// "< 1/3 >" at the left of the title row (the top-right corner stays clear
// for the fullscreen button, an HTML element over the canvas); returns the
// clamped page.
export function pager(scene: Phaser.Scene, page: number, total: number, perPage: number, onTurn: (page: number) => void): number {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(page, pages - 1);
  if (pages <= 1) return current;
  const left = SCREEN_LEFT;
  new KitButton(scene, left, 12, 18, 18, '<', {
    size: 9,
    align: 'center',
    state: current === 0 ? 'disabled' : 'normal',
    onClick: () => current > 0 && onTurn(current - 1),
  });
  panelText(scene, left + 29, 21, `${current + 1}/${pages}`, 8, INK.soft).setOrigin(0.5);
  new KitButton(scene, left + 40, 12, 18, 18, '>', {
    size: 9,
    align: 'center',
    state: current === pages - 1 ? 'disabled' : 'normal',
    onClick: () => current < pages - 1 && onTurn(current + 1),
  });
  return current;
}

// Which slot an item would go to if equipped now. Held items follow the
// hands rule (planHandEquip: right hand, then left; a two-handed weapon takes
// both); rings fill the free ring slot first.
export function targetSlot(character: Character, item: Item): EquipSlot {
  if (handRule(item)) return planHandEquip(character.equipment, item).slot;
  if (item.category !== 'ring') return item.category as EquipSlot;
  if (!character.equipment.ring1) return 'ring1';
  if (!character.equipment.ring2) return 'ring2';
  return 'ring1';
}

// Menus and fights are laid out in a 216x384 frame; on taller screens the
// camera centers that frame (the game fills the phone, the layout stays).
export const FRAME_H = 384;
export function centerFrame(scene: Phaser.Scene): number {
  const spare = Math.max(0, scene.scale.height - FRAME_H);
  // Centered, but never under the iPhone's status bar when there is room.
  const off = Math.min(spare, Math.max(Math.floor(spare / 2), safeTop()));
  scene.cameras.main.setScroll(0, -off);
  return off;
}
