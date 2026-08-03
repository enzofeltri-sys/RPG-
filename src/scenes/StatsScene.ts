import Phaser from 'phaser';
import {
  Character,
  RACES,
  CLASSES,
  AllocatableStat,
  xpToNextLevel,
  getEffectiveStats,
  allocateStatPoint,
} from '../game/character';
import { ReturnContext, ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { SaveManager } from '../save/SaveManager';
import { addCrispText } from '../ui/text';
import { playCraftSuccess } from '../ui/sound';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';

const ALLOCATABLE_STATS: { stat: AllocatableStat; label: string }[] = [
  { stat: 'strength', label: 'Force' },
  { stat: 'intelligence', label: 'Intelligence' },
  { stat: 'agility', label: 'Agilité' },
  { stat: 'vitality', label: 'Vitalité' },
];

export class StatsScene extends Phaser.Scene {
  private character!: Character;
  private returnScene: ReturnSceneKey = 'Village';
  private returnX?: number;
  private returnY?: number;
  private pointsText!: Phaser.GameObjects.Text;

  constructor() {
    super('Stats');
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

    addCrispText(this, width / 2, 14, 'Statistiques', { fontSize: '16px', color: GOLD }).setOrigin(0.5);

    const raceLabel = RACES[this.character.race].label;
    const classLabel = CLASSES[this.character.class].label;

    addCrispText(
      this,
      12,
      36,
      [
        `${raceLabel} ${classLabel}`,
        `Niveau ${this.character.level}  (XP ${this.character.xp}/${xpToNextLevel(this.character.level)})`,
      ].join('\n'),
      { fontSize: '11px', color: GOLD, lineSpacing: 4 },
    );

    // The 4 allocatable stats show the base value (what a stat point
    // actually changes) — the effective, gear-boosted value goes in
    // parentheses so the player still sees the full picture without
    // conflating "what I invested" with "what my sword adds."
    let y = 76;
    ALLOCATABLE_STATS.forEach(({ stat, label }) => {
      this.renderStatRow(label, stat, y);
      y += 20;
    });

    this.pointsText = addCrispText(this, 12, y + 4, '', { fontSize: '10px', color: GOLD });
    this.refreshPointsText();
    y += 22;

    const stats = getEffectiveStats(this.character);
    const extraLines: string[] = [];
    if (stats.armor > 0 || stats.fireDamage > 0) {
      extraLines.push(`Armure ${stats.armor}   Dégâts de feu ${stats.fireDamage}`);
    }
    if (stats.poisonDamage > 0) {
      extraLines.push(`Dégâts de poison ${stats.poisonDamage}`);
    }
    if (stats.iceDamage > 0 || stats.electricDamage > 0) {
      extraLines.push(`Dégâts de glace ${stats.iceDamage}   Dégâts électriques ${stats.electricDamage}`);
    }
    if (stats.darkDamage > 0 || stats.earthDamage > 0) {
      extraLines.push(`Dégâts obscurs ${stats.darkDamage}   Dégâts de terre ${stats.earthDamage}`);
    }
    if (stats.lifeSteal > 0) {
      extraLines.push(`Vol de vie ${stats.lifeSteal}`);
    }

    addCrispText(
      this,
      12,
      y,
      [
        `PV ${this.character.hp}/${this.character.maxHp}`,
        `PM ${this.character.mp}/${this.character.maxMp}`,
        '',
        ...extraLines,
        extraLines.length > 0 ? '' : undefined,
        `Or : ${this.character.gold}`,
      ].filter((line): line is string => line !== undefined),
      { fontSize: '11px', color: GOLD, lineSpacing: 6 },
    );

    const backButton = addCrispText(this, width / 2, 362, 'Retour', {
      fontSize: '13px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 10, y: 6 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    backButton.on('pointerdown', () => this.goBack());
  }

  private renderStatRow(label: string, stat: AllocatableStat, y: number): void {
    const { width } = this.scale;
    const base = this.character.stats[stat];
    const effective = getEffectiveStats(this.character)[stat];
    const suffix = effective !== base ? ` (${effective})` : '';
    addCrispText(this, 12, y, `${label} : ${base}${suffix}`, { fontSize: '11px', color: GOLD });

    const button = addCrispText(this, width - 14, y - 2, '+', {
      fontSize: '12px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 8, y: 2 },
    })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    button.setAlpha(this.character.statPoints > 0 ? 1 : 0.4);
    button.on('pointerdown', () => this.handleAllocate(stat));
  }

  private refreshPointsText(): void {
    this.pointsText.setText(`Points de stat disponibles : ${this.character.statPoints}`);
  }

  private async handleAllocate(stat: AllocatableStat): Promise<void> {
    const success = allocateStatPoint(this.character, stat);
    if (!success) return;
    await SaveManager.saveCharacter(this.character);
    playCraftSuccess();
    this.scene.restart({ returnScene: this.returnScene, x: this.returnX, y: this.returnY });
  }

  private goBack(): void {
    this.scene.start(this.returnScene, returnSceneStartData(this.returnScene, this.returnX, this.returnY));
  }
}
