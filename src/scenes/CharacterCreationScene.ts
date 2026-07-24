import Phaser from 'phaser';
import { RACES, CLASSES, Race, CharClass, computeStats, createCharacter } from '../game/character';
import { SaveManager } from '../save/SaveManager';
import { addCrispText } from '../ui/text';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';

export class CharacterCreationScene extends Phaser.Scene {
  private race: Race = 'human';
  private charClass: CharClass = 'warrior';
  private raceButtons: Record<Race, Phaser.GameObjects.Text> = {} as Record<Race, Phaser.GameObjects.Text>;
  private classButtons: Record<CharClass, Phaser.GameObjects.Text> = {} as Record<CharClass, Phaser.GameObjects.Text>;
  private statsText!: Phaser.GameObjects.Text;
  private skillsText!: Phaser.GameObjects.Text;

  constructor() {
    super('CharacterCreation');
  }

  create(): void {
    const { width } = this.scale;

    addCrispText(this, width / 2, 14, 'Création de personnage', {
      fontSize: '16px',
      color: GOLD,
    }).setOrigin(0.5);

    addCrispText(this, 14, 32, 'Race', { fontSize: '11px', color: MUTED });
    (Object.keys(RACES) as Race[]).forEach((race, i) => {
      this.raceButtons[race] = this.createOption(14 + i * 105, 46, RACES[race].label, () => {
        this.race = race;
        this.refresh();
      });
    });

    addCrispText(this, 14, 84, 'Classe', { fontSize: '11px', color: MUTED });
    (Object.keys(CLASSES) as CharClass[]).forEach((charClass, i) => {
      this.classButtons[charClass] = this.createOption(14 + i * 105, 98, CLASSES[charClass].label, () => {
        this.charClass = charClass;
        this.refresh();
      });
    });

    this.statsText = addCrispText(this, 14, 140, ' ', {
      fontSize: '11px',
      color: GOLD,
      lineSpacing: 5,
    });

    this.skillsText = addCrispText(this, 14, 200, ' ', {
      fontSize: '9px',
      color: MUTED,
      wordWrap: { width: width - 28 },
      lineSpacing: 4,
    });

    const startButton = addCrispText(this, width / 2, 328, "Commencer l'aventure", {
      fontSize: '13px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 8, y: 6 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startButton.on('pointerdown', () => this.confirm());

    this.refresh();
  }

  private createOption(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Text {
    const text = addCrispText(this, x, y, label, {
      fontSize: '12px',
      color: GOLD,
      backgroundColor: '#1c2b1c',
      padding: { x: 8, y: 5 },
    }).setInteractive({ useHandCursor: true });

    text.on('pointerdown', onClick);
    return text;
  }

  private refresh(): void {
    (Object.keys(this.raceButtons) as Race[]).forEach((race) => {
      const selected = race === this.race;
      this.raceButtons[race].setBackgroundColor(selected ? GOLD : '#1c2b1c');
      this.raceButtons[race].setColor(selected ? DARK : GOLD);
    });
    (Object.keys(this.classButtons) as CharClass[]).forEach((charClass) => {
      const selected = charClass === this.charClass;
      this.classButtons[charClass].setBackgroundColor(selected ? GOLD : '#1c2b1c');
      this.classButtons[charClass].setColor(selected ? DARK : GOLD);
    });

    const stats = computeStats(this.race, this.charClass);
    const maxHp = 20 + stats.vitality * 4;
    const maxMp = 10 + stats.intelligence * 3;
    this.statsText.setText(
      [
        `Force ${stats.strength}   Intelligence ${stats.intelligence}`,
        `Agilité ${stats.agility}   Vitalité ${stats.vitality}`,
        `PV ${maxHp}   PM ${maxMp}`,
      ].join('\n'),
    );

    const raceSkills = RACES[this.race].skills.join('\n');
    this.skillsText.setText(`${RACES[this.race].description}\n\n${raceSkills}`);
  }

  private async confirm(): Promise<void> {
    const character = createCharacter(this.race, this.charClass);
    await SaveManager.saveCharacter(character);
    this.scene.start('Village');
  }
}
