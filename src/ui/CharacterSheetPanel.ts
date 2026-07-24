import Phaser from 'phaser';
import { Character, RACES, CLASSES, xpToNextLevel } from '../game/character';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';

export class CharacterSheetPanel {
  private readonly container: Phaser.GameObjects.Container;
  private visible = false;

  constructor(scene: Phaser.Scene, character: Character) {
    const button = scene.add
      .text(10, 10, 'Fiche', {
        fontFamily: 'Georgia, serif',
        fontSize: '10px',
        color: DARK,
        backgroundColor: GOLD,
        padding: { x: 6, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true });

    const raceLabel = RACES[character.race].label;
    const classLabel = CLASSES[character.class].label;
    const { stats } = character;

    const panelBg = scene.add
      .rectangle(10, 40, 150, 128, 0x0b0c10, 0.97)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xe8d9b5);

    const panelText = scene.add.text(
      18,
      48,
      [
        `${raceLabel} ${classLabel}`,
        `Niveau ${character.level}  (XP ${character.xp}/${xpToNextLevel(character.level)})`,
        '',
        `Force ${stats.strength}   Int ${stats.intelligence}`,
        `Agilité ${stats.agility}   Vit ${stats.vitality}`,
        '',
        `PV ${character.hp}/${character.maxHp}`,
        `PM ${character.mp}/${character.maxMp}`,
      ].join('\n'),
      {
        fontFamily: 'Georgia, serif',
        fontSize: '8px',
        color: GOLD,
        lineSpacing: 3,
      },
    );

    this.container = scene.add.container(0, 0, [panelBg, panelText]).setScrollFactor(0).setDepth(999);
    this.container.setVisible(false);

    button.on('pointerdown', () => {
      this.visible = !this.visible;
      this.container.setVisible(this.visible);
    });
  }
}
