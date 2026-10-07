import Phaser from 'phaser';
import { Character, CLASSES } from '../game/character';
import {
  ActiveTalent,
  BRANCH_NAMES,
  CLASS_RESOURCE,
  MAX_EQUIPPED_SKILLS,
  REQUIREMENT_LABELS,
  RESOURCE_LABELS,
  STARTER_SKILL,
  TALENTS,
  TIER_LEVELS,
  TalentDef,
  branchTalents,
  learnBlocker,
  learnTalent,
  maxRank,
  talentPointsAvailable,
  talentRank,
  toggleEquipSkill,
} from '../game/talents';
import { ReturnContext, ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { SaveManager } from '../save/SaveManager';
import { playCraftSuccess } from '../ui/sound';
import { INK, KitButton, addPanel, addScreenPanel, buttonRow, panelText, preloadUiKit, toast } from '../ui/kit';

interface TalentsData extends ReturnContext {
  branch?: number;
  selected?: string;
}

const LEFT = 14;
const INNER_W = 188;
const DETAIL_Y = 220;
const DETAIL_H = 118;

// Talents screen in UI style A (docs/mockups/ui3_ecrans.png): the starting
// skill, one tab per branch, the branch's four tiers (greyed with a lock
// until the level is reached), a detail panel, and Learn / Equip / Back.
export class TalentsScene extends Phaser.Scene {
  private character!: Character;
  private returnScene: ReturnSceneKey = 'Village';
  private returnX?: number;
  private returnY?: number;
  private branch = 0;
  private selected = '';

  constructor() {
    super('Talents');
  }

  init(data: TalentsData): void {
    this.returnScene = data?.returnScene ?? 'Village';
    this.returnX = data?.x;
    this.returnY = data?.y;
    this.branch = data?.branch ?? 0;
    this.selected = data?.selected ?? '';
  }

  preload(): void {
    preloadUiKit(this);
  }

  async create(): Promise<void> {
    const save = await SaveManager.load();
    this.character = save!.character!;
    if (!TALENTS[this.selected]) this.selected = STARTER_SKILL[this.character.class];
    this.render();
  }

  // Everything is rebuilt from the in-memory character after each action,
  // so the screen never flashes empty while the save reloads.
  private render(): void {
    this.children.removeAll(true);
    const { width } = this.scale;
    const charClass = this.character.class;
    addScreenPanel(this);

    panelText(this, width / 2, 14, 'Talents', 12).setOrigin(0.5, 0);
    const points = talentPointsAvailable(this.character);
    const subtitle = `${CLASSES[charClass].label} · ${RESOURCE_LABELS[CLASS_RESOURCE[charClass]]} · `;
    const pointsLabel = `${points} point${points > 1 ? 's' : ''}`;
    const sub = panelText(this, 0, 32, subtitle, 8, INK.soft);
    const pts = panelText(this, 0, 32, pointsLabel, 8, points > 0 ? INK.danger : INK.soft);
    const left = Math.round((width - sub.width - pts.width) / 2);
    sub.setX(left);
    pts.setX(left + sub.width);

    const starter = TALENTS[STARTER_SKILL[charClass]];
    new KitButton(this, LEFT, 46, INNER_W, 22, starter.name, {
      icon: 'star',
      size: 9,
      cost: 'Départ',
      state: starter.id === this.selected ? 'pressed' : 'normal',
      onClick: () => this.select(starter.id),
    });
    this.equippedMark(starter, 46, 22, 44);

    buttonRow(3, LEFT, INNER_W).forEach(({ x, w }, i) => {
      new KitButton(this, x, 74, w, 20, BRANCH_NAMES[charClass][i], {
        size: 8,
        align: 'center',
        state: i === this.branch ? 'pressed' : 'normal',
        onClick: () => {
          this.branch = i;
          this.select(branchTalents(charClass, i)[0].id);
        },
      });
    });

    branchTalents(charClass, this.branch).forEach((def, i) => this.renderRow(def, 102 + i * 28));
    this.renderDetail(TALENTS[this.selected]);
  }

  private select(id: string): void {
    this.selected = id;
    this.render();
  }

  private renderRow(def: TalentDef, y: number): void {
    const rank = talentRank(this.character, def.id);
    const locked = this.character.level < TIER_LEVELS[def.tier];
    const state = locked ? 'disabled' : def.id === this.selected ? 'pressed' : 'normal';
    new KitButton(this, LEFT, y, INNER_W, 24, def.name, {
      size: 9,
      tag: `Niv ${TIER_LEVELS[def.tier]}`,
      cost: locked ? undefined : `${rank}/${maxRank(def)}`,
      costSize: 10,
      state,
      onClick: () => this.select(def.id),
    });
    if (locked) this.add.image(LEFT + INNER_W - 6, y + 12, 'ui-icon-lock').setOrigin(1, 0.5);
    else this.equippedMark(def, y, 24);
  }

  // A small sword left of the rank marks the skills taken into combat.
  private equippedMark(def: TalentDef, y: number, height: number, right = 30): void {
    if (!(this.character.equippedSkills ?? []).includes(def.id)) return;
    this.add.image(LEFT + INNER_W - right, y + height / 2, 'ui-icon-sword').setOrigin(1, 0.5);
  }

  private renderDetail(def: TalentDef): void {
    const rank = talentRank(this.character, def.id);
    const equipped = this.character.equippedSkills ?? [];
    const blocker = learnBlocker(this.character, def.id);
    addPanel(this, LEFT, DETAIL_Y, INNER_W, DETAIL_H);

    const lines: { text: string; color: string }[] = [];
    if (def.kind === 'active') {
      const shownRank = Math.max(1, rank);
      const cost = (def as ActiveTalent).cost[shownRank - 1];
      const resource = RESOURCE_LABELS[CLASS_RESOURCE[def.charClass]].toLowerCase();
      lines.push({
        text: `Active · ${cost === 0 ? 'gratuite' : `${cost} de ${resource}`}${rank === 2 ? ' · améliorée' : ''}`,
        color: INK.soft,
      });
      lines.push({ text: def.describe(def.values[shownRank - 1]), color: INK.text });
      if (def.requires) lines.push({ text: REQUIREMENT_LABELS[def.requires], color: INK.soft });
      if (rank < 2) lines.push({ text: `Amélioration : ${def.upgrade}`, color: INK.soft });
    } else {
      lines.push({ text: `Passif · rang ${rank}/${def.maxRank}`, color: INK.soft });
      lines.push({ text: def.describe(Math.max(1, rank)), color: INK.text });
      if (rank > 0 && rank < def.maxRank) lines.push({ text: `Rang suivant : ${def.describe(rank + 1)}`, color: INK.soft });
    }
    if (blocker && rank < maxRank(def)) lines.push({ text: blocker, color: INK.danger });

    const x = LEFT + 10;
    panelText(this, x, DETAIL_Y + 9, def.name, 10);
    const footer = panelText(this, x, DETAIL_Y + DETAIL_H - 18, `En combat : ${equipped.length}/${MAX_EQUIPPED_SKILLS}`, 7, INK.soft);
    // Long descriptions shrink a notch rather than spill out of the panel.
    for (const size of [8, 7]) {
      let y = DETAIL_Y + 26;
      const texts = lines.map((line) => {
        const t = panelText(this, x, y, line.text, size, line.color, { wordWrap: { width: INNER_W - 20 } });
        y += t.height + (size === 8 ? 4 : 2);
        return t;
      });
      if (y <= footer.y || size === 7) break;
      texts.forEach((t) => t.destroy());
    }

    const buttons: { label: string; disabled?: boolean; onClick: () => void }[] = [];
    if (rank < maxRank(def)) {
      buttons.push({
        label: rank === 0 ? 'Apprendre' : def.kind === 'active' ? 'Améliorer' : 'Rang +1',
        disabled: !!blocker,
        onClick: () => void this.handleLearn(def.id),
      });
    }
    if (def.kind === 'active' && rank > 0) {
      const isEquipped = equipped.includes(def.id);
      buttons.push({
        label: isEquipped ? 'Retirer' : 'Équiper',
        disabled: !isEquipped && equipped.length >= MAX_EQUIPPED_SKILLS,
        onClick: () => void this.handleEquip(def.id),
      });
    }
    buttons.push({
      label: 'Retour',
      onClick: () => this.scene.start(this.returnScene, returnSceneStartData(this.returnScene, this.returnX, this.returnY)),
    });
    buttonRow(buttons.length, LEFT, INNER_W).forEach(({ x: bx, w }, i) => {
      const b = buttons[i];
      new KitButton(this, bx, 344, w, 28, b.label, {
        size: 9,
        align: 'center',
        state: b.disabled ? 'disabled' : 'normal',
        onClick: b.onClick,
      });
    });
  }

  private async handleLearn(id: string): Promise<void> {
    const blocker = learnBlocker(this.character, id);
    if (blocker) {
      toast(this, this.scale.width / 2, DETAIL_Y - 14, blocker);
      return;
    }
    learnTalent(this.character, id);
    await SaveManager.saveCharacter(this.character);
    playCraftSuccess();
    this.render();
  }

  private async handleEquip(id: string): Promise<void> {
    const result = toggleEquipSkill(this.character, id);
    if (result === 'full') {
      toast(this, this.scale.width / 2, DETAIL_Y - 14, `Déjà ${MAX_EQUIPPED_SKILLS} compétences en combat : retires-en une d'abord.`);
      return;
    }
    await SaveManager.saveCharacter(this.character);
    this.render();
  }
}
