import Phaser from 'phaser';
import { Character, RACES, CLASSES, xpToNextLevel } from '../game/character';
import { addCrispText } from './text';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';

export class CharacterSheetPanel {
  private readonly container: Phaser.GameObjects.Container;
  private readonly quitButton: Phaser.GameObjects.Text;
  private visible = false;

  constructor(scene: Phaser.Scene, character: Character, onToggle?: (open: boolean) => void) {
    const button = addCrispText(scene, 10, 10, 'Menu', {
      fontSize: '13px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 8, y: 6 },
    })
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true });

    const raceLabel = RACES[character.race].label;
    const classLabel = CLASSES[character.class].label;
    const { stats } = character;

    const panelBg = scene.add
      .rectangle(10, 44, 190, 270, 0x0b0c10, 0.97)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xe8d9b5);

    const panelText = addCrispText(
      scene,
      20,
      54,
      [
        `${raceLabel} ${classLabel}`,
        `Niveau ${character.level}  (XP ${character.xp}/${xpToNextLevel(character.level)})`,
        '',
        `Force ${stats.strength}   Int ${stats.intelligence}`,
        `Agilité ${stats.agility}   Vit ${stats.vitality}`,
        '',
        `PV ${character.hp}/${character.maxHp}`,
        `PM ${character.mp}/${character.maxMp}`,
        '',
        `Points de stat : ${character.statPoints}`,
      ].join('\n'),
      {
        fontSize: '11px',
        color: GOLD,
        lineSpacing: 5,
      },
    );

    // Kept outside the container: interactive children of a Phaser Container are
    // unreliable for pointer hit-testing, so the quit button is a separate top-level
    // object toggled in lockstep with the panel instead of being nested inside it.
    this.quitButton = addCrispText(scene, 20, 278, 'Quitter vers le titre', {
      fontSize: '10px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 6, y: 5 },
    })
      .setScrollFactor(0)
      .setDepth(1001)
      .setInteractive({ useHandCursor: true });
    this.quitButton.setVisible(false);

    this.quitButton.on('pointerdown', () => scene.scene.start('Title'));

    this.container = scene.add.container(0, 0, [panelBg, panelText]).setScrollFactor(0).setDepth(999);
    this.container.setVisible(false);

    button.on('pointerdown', () => {
      this.visible = !this.visible;
      this.container.setVisible(this.visible);
      this.quitButton.setVisible(this.visible);
      onToggle?.(this.visible);
    });
  }
}
