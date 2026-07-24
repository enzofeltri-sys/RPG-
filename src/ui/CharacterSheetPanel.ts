import Phaser from 'phaser';
import { Character, RACES, CLASSES, xpToNextLevel, getEffectiveStats } from '../game/character';
import { addCrispText } from './text';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';

export class CharacterSheetPanel {
  private readonly container: Phaser.GameObjects.Container;
  private readonly quitButton: Phaser.GameObjects.Text;
  private readonly inventoryButton: Phaser.GameObjects.Text;
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
    const stats = getEffectiveStats(character);

    const panelBg = scene.add
      .rectangle(10, 44, 190, 300, 0x0b0c10, 0.97)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xe8d9b5);

    const statLines = [
      `Force ${stats.strength}   Int ${stats.intelligence}`,
      `Agilité ${stats.agility}   Vit ${stats.vitality}`,
    ];
    if (stats.armor > 0 || stats.fireDamage > 0) {
      statLines.push(`Armure ${stats.armor}   Dégâts de feu ${stats.fireDamage}`);
    }

    const panelText = addCrispText(
      scene,
      20,
      54,
      [
        `${raceLabel} ${classLabel}`,
        `Niveau ${character.level}  (XP ${character.xp}/${xpToNextLevel(character.level)})`,
        '',
        ...statLines,
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
    // unreliable for pointer hit-testing, so these buttons are separate top-level
    // objects toggled in lockstep with the panel instead of being nested inside it.
    this.inventoryButton = addCrispText(scene, 20, 278, 'Inventaire', {
      fontSize: '10px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 6, y: 5 },
    })
      .setScrollFactor(0)
      .setDepth(1001)
      .setInteractive({ useHandCursor: true });
    this.inventoryButton.setVisible(false);
    this.inventoryButton.on('pointerdown', () => scene.scene.start('Inventory'));

    this.quitButton = addCrispText(scene, 20, 306, 'Quitter vers le titre', {
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
      this.inventoryButton.setVisible(this.visible);
      onToggle?.(this.visible);
    });
  }
}
