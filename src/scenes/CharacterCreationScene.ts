import Phaser from 'phaser';
import { RACES, CLASSES, Race, CharClass, computeStats, createCharacter } from '../game/character';
import { SaveManager } from '../save/SaveManager';
import { addCrispText } from '../ui/text';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';

// 3 columns keep 5 race/class options within the 216px game width — a
// single row (the original 2-race/2-class layout) no longer fits once Nain/
// Orc/Halfling and Archer/Voleur/Clerc were added.
const GRID_COLS = 3;
const GRID_COL_W = 68;
const GRID_ROW_H = 22;
const GRID_MARGIN_X = 10;

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

    addCrispText(this, width / 2, 12, 'Création de personnage', {
      fontSize: '14px',
      color: GOLD,
    }).setOrigin(0.5);

    const raceRows = Math.ceil((Object.keys(RACES) as Race[]).length / GRID_COLS);
    const raceGridTop = 40;
    addCrispText(this, 12, raceGridTop - 12, 'Race', { fontSize: '10px', color: MUTED });
    (Object.keys(RACES) as Race[]).forEach((race, i) => {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      this.raceButtons[race] = this.createOption(
        GRID_MARGIN_X + col * GRID_COL_W,
        raceGridTop + row * GRID_ROW_H,
        RACES[race].label,
        () => {
          this.race = race;
          this.refresh();
        },
      );
    });

    const classGridTop = raceGridTop + raceRows * GRID_ROW_H + 18;
    addCrispText(this, 12, classGridTop - 12, 'Classe', { fontSize: '10px', color: MUTED });
    const classRows = Math.ceil((Object.keys(CLASSES) as CharClass[]).length / GRID_COLS);
    (Object.keys(CLASSES) as CharClass[]).forEach((charClass, i) => {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      this.classButtons[charClass] = this.createOption(
        GRID_MARGIN_X + col * GRID_COL_W,
        classGridTop + row * GRID_ROW_H,
        CLASSES[charClass].label,
        () => {
          this.charClass = charClass;
          this.refresh();
        },
      );
    });

    const infoTop = classGridTop + classRows * GRID_ROW_H + 14;
    this.statsText = addCrispText(this, 12, infoTop, ' ', {
      fontSize: '10px',
      color: GOLD,
      lineSpacing: 4,
    });

    this.skillsText = addCrispText(this, 12, infoTop + 48, ' ', {
      fontSize: '9px',
      color: MUTED,
      wordWrap: { width: width - 24 },
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
      fontSize: '10px',
      color: GOLD,
      backgroundColor: '#1c2b1c',
      padding: { x: 5, y: 4 },
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
    this.skillsText.setText(
      `${CLASSES[this.charClass].description}\n${RACES[this.race].description}\n\n${raceSkills}`,
    );
  }

  private async confirm(): Promise<void> {
    const character = createCharacter(this.race, this.charClass);
    await SaveManager.saveCharacter(character);
    this.scene.start('Hamlet');
  }
}
