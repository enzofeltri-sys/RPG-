import Phaser from 'phaser';
import { Character, RACES, CLASSES, xpToNextLevel, getEffectiveStats } from '../game/character';
import { ReturnContext, ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { SaveManager } from '../save/SaveManager';
import { addCrispText } from '../ui/text';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';

export class StatsScene extends Phaser.Scene {
  private character!: Character;
  private returnScene: ReturnSceneKey = 'Village';
  private returnX?: number;
  private returnY?: number;

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
    const stats = getEffectiveStats(this.character);

    const statLines = [
      `Force ${stats.strength}   Int ${stats.intelligence}`,
      `Agilité ${stats.agility}   Vit ${stats.vitality}`,
    ];
    if (stats.armor > 0 || stats.fireDamage > 0) {
      statLines.push(`Armure ${stats.armor}   Dégâts de feu ${stats.fireDamage}`);
    }

    addCrispText(
      this,
      12,
      44,
      [
        `${raceLabel} ${classLabel}`,
        `Niveau ${this.character.level}  (XP ${this.character.xp}/${xpToNextLevel(this.character.level)})`,
        '',
        ...statLines,
        '',
        `PV ${this.character.hp}/${this.character.maxHp}`,
        `PM ${this.character.mp}/${this.character.maxMp}`,
        '',
        `Or : ${this.character.gold}`,
        `Points de stat : ${this.character.statPoints}`,
      ].join('\n'),
      {
        fontSize: '11px',
        color: GOLD,
        lineSpacing: 6,
      },
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

  private goBack(): void {
    this.scene.start(this.returnScene, returnSceneStartData(this.returnScene, this.returnX, this.returnY));
  }
}
