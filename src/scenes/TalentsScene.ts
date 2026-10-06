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
import { addCrispText } from '../ui/text';
import { playCraftSuccess } from '../ui/sound';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';
const LEARNABLE = '#9fd08a';
const ROW_BG = '#1c2b1c';
const ROW_BG_SELECTED = '#3a4a2a';

interface TalentsData extends ReturnContext {
  branch?: number;
  selected?: string;
}

// Provisional talents screen (it takes UI style A at the interface step):
// the starting skill, one tab per branch, a detail panel, and the 4
// equipped combat skills.
export class TalentsScene extends Phaser.Scene {
  private character!: Character;
  private returnScene: ReturnSceneKey = 'Village';
  private returnX?: number;
  private returnY?: number;
  private branch = 0;
  private selected?: string;
  private message = '';

  constructor() {
    super('Talents');
  }

  init(data: TalentsData): void {
    this.returnScene = data?.returnScene ?? 'Village';
    this.returnX = data?.x;
    this.returnY = data?.y;
    this.branch = data?.branch ?? 0;
    this.selected = data?.selected;
  }

  async create(): Promise<void> {
    const { width } = this.scale;
    const save = await SaveManager.load();
    this.character = save!.character!;
    const charClass = this.character.class;
    const starter = STARTER_SKILL[charClass];
    if (!this.selected) this.selected = starter;

    addCrispText(this, width / 2, 12, 'Talents', { fontSize: '16px', color: GOLD }).setOrigin(0.5);
    addCrispText(
      this,
      width / 2,
      31,
      `${CLASSES[charClass].label} · ${RESOURCE_LABELS[CLASS_RESOURCE[charClass]]} · Niveau ${this.character.level}`,
      { fontSize: '9px', color: MUTED },
    ).setOrigin(0.5);
    const points = talentPointsAvailable(this.character);
    addCrispText(this, width / 2, 45, `Points de talent : ${points}`, {
      fontSize: '10px',
      color: points > 0 ? LEARNABLE : GOLD,
    }).setOrigin(0.5);

    this.renderRow(TALENTS[starter], 64, 'Départ');

    BRANCH_NAMES[charClass].forEach((name, i) => {
      const x = 12 + i * 66;
      const active = i === this.branch;
      const tab = addCrispText(this, x, 84, name, {
        fontSize: '9px',
        color: active ? DARK : GOLD,
        backgroundColor: active ? GOLD : ROW_BG,
        padding: { x: 3, y: 4 },
        fixedWidth: 60,
        align: 'center',
      }).setInteractive({ useHandCursor: true });
      tab.on('pointerdown', () => this.reopen({ branch: i, selected: branchTalents(charClass, i)[0].id }));
    });

    branchTalents(charClass, this.branch).forEach((def, i) => {
      this.renderRow(def, 112 + i * 22, `Nv ${TIER_LEVELS[def.tier]}`);
    });

    this.renderDetail(TALENTS[this.selected] ?? TALENTS[starter]);
    this.renderEquipped();

    const backButton = addCrispText(this, width / 2, 368, 'Retour', {
      fontSize: '13px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 10, y: 6 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    backButton.on('pointerdown', () =>
      this.scene.start(this.returnScene, returnSceneStartData(this.returnScene, this.returnX, this.returnY)),
    );
  }

  private reopen(changes: { branch?: number; selected?: string }): void {
    this.scene.restart({
      returnScene: this.returnScene,
      x: this.returnX,
      y: this.returnY,
      branch: changes.branch ?? this.branch,
      selected: changes.selected ?? this.selected,
    });
  }

  private renderRow(def: TalentDef, y: number, tag: string): void {
    const rank = talentRank(this.character, def.id);
    const max = maxRank(def);
    const learnable = !learnBlocker(this.character, def.id);
    const rankLabel = def.kind === 'active' ? (rank === 0 ? '' : rank === 2 ? '★' : '✓') : `${rank}/${max}`;
    const kindLabel = def.kind === 'active' ? 'A' : 'P';
    const color = rank > 0 ? GOLD : learnable ? LEARNABLE : MUTED;
    const row = addCrispText(this, 12, y, `${tag.padEnd(6)} ${kindLabel}  ${def.name}`, {
      fontSize: '9px',
      color,
      backgroundColor: def.id === this.selected ? ROW_BG_SELECTED : ROW_BG,
      padding: { x: 4, y: 3 },
      fixedWidth: 192,
    }).setInteractive({ useHandCursor: true });
    row.on('pointerdown', () => this.reopen({ selected: def.id }));
    addCrispText(this, 200, y + 3, rankLabel, { fontSize: '9px', color }).setOrigin(1, 0);
  }

  private renderDetail(def: TalentDef): void {
    const { width } = this.scale;
    const rank = talentRank(this.character, def.id);
    const lines: string[] = [];
    if (def.kind === 'active') {
      const shownRank = Math.max(1, rank);
      const cost = (def as ActiveTalent).cost[shownRank - 1];
      const resource = RESOURCE_LABELS[CLASS_RESOURCE[def.charClass]].toLowerCase();
      lines.push(`Compétence active · ${cost === 0 ? 'gratuite' : `${cost} de ${resource}`}${rank === 2 ? ' · améliorée' : ''}`);
      lines.push(def.describe(def.values[shownRank - 1]));
      if (def.requires) lines.push(REQUIREMENT_LABELS[def.requires]);
      if (rank < 2) lines.push(`Amélioration : ${def.upgrade}`);
    } else {
      lines.push(`Talent passif · rang ${rank}/${def.maxRank}`);
      lines.push(def.describe(Math.max(1, rank)));
      if (rank > 0 && rank < def.maxRank) lines.push(`Rang suivant : ${def.describe(rank + 1)}`);
    }
    const blocker = learnBlocker(this.character, def.id);
    if (this.message) lines.push(this.message);
    else if (blocker && rank < maxRank(def)) lines.push(blocker);

    addCrispText(this, 12, 204, def.name, { fontSize: '11px', color: GOLD });
    addCrispText(this, 12, 220, lines.join('\n'), {
      fontSize: '9px',
      color: GOLD,
      lineSpacing: 3,
      wordWrap: { width: width - 24 },
    });

    const learnLabel = rank === 0 ? 'Apprendre' : def.kind === 'active' ? 'Améliorer' : 'Rang +1';
    if (rank < maxRank(def)) {
      const button = this.addButton(def.kind === 'active' && rank > 0 ? 60 : width / 2, 338, learnLabel, () =>
        this.handleLearn(def.id),
      );
      button.setAlpha(blocker ? 0.45 : 1);
    }
    if (def.kind === 'active' && rank > 0) {
      const equipped = (this.character.equippedSkills ?? []).includes(def.id);
      this.addButton(rank < maxRank(def) ? 156 : width / 2, 338, equipped ? 'Retirer' : 'Équiper', () =>
        this.handleEquip(def.id),
      );
    }
  }

  private renderEquipped(): void {
    const { width } = this.scale;
    const equipped = this.character.equippedSkills ?? [];
    const names = equipped.map((id) => TALENTS[id]?.name ?? id).join(', ') || 'aucune';
    addCrispText(this, 12, 300, `En combat (${equipped.length}/${MAX_EQUIPPED_SKILLS}) : ${names}`, {
      fontSize: '9px',
      color: MUTED,
      wordWrap: { width: width - 24 },
    });
  }

  private addButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Text {
    const button = addCrispText(this, x, y, label, {
      fontSize: '11px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 8, y: 5 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', onClick);
    return button;
  }

  private async handleLearn(id: string): Promise<void> {
    const blocker = learnBlocker(this.character, id);
    if (blocker) {
      this.message = blocker;
      this.reopenKeepingMessage();
      return;
    }
    learnTalent(this.character, id);
    await SaveManager.saveCharacter(this.character);
    playCraftSuccess();
    this.reopen({ selected: id });
  }

  private async handleEquip(id: string): Promise<void> {
    const result = toggleEquipSkill(this.character, id);
    if (result === 'full') {
      this.message = `Déjà ${MAX_EQUIPPED_SKILLS} compétences en combat : retires-en une d'abord.`;
      this.reopenKeepingMessage();
      return;
    }
    await SaveManager.saveCharacter(this.character);
    this.reopen({ selected: id });
  }

  // The blocker message is already the last line of the detail panel; a
  // full restart would lose it, so only the panel's text is redrawn.
  private reopenKeepingMessage(): void {
    const message = this.message;
    this.children.removeAll(true);
    this.message = message;
    void this.create().then(() => {
      this.message = '';
    });
  }
}
