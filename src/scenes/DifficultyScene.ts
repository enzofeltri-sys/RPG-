import Phaser from 'phaser';
import { CharClass, Race, createCharacter } from '../game/character';
import { Difficulty, newRandomizerSeed } from '../game/difficulty';
import { SaveManager } from '../save/SaveManager';
import { addCrispText } from '../ui/text';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';
const OPTION_BG = '#1c2b1c';

type Mode = Difficulty | 'nuzlocke';

const MODES: { id: Mode; label: string; description: string }[] = [
  {
    id: 'easy',
    label: 'Facile',
    description: 'Monstres moins robustes et moins forts. Une défaite ne coûte rien.',
  },
  {
    id: 'normal',
    label: 'Normal',
    description: "L'aventure telle qu'elle a été pensée. Une défaite coûte 20 % de votre or.",
  },
  {
    id: 'hard',
    label: 'Difficile',
    description:
      "Monstres plus robustes et plus forts, élites plus fréquentes. Une défaite coûte 30 % de l'or et l'expérience du niveau en cours.",
  },
  {
    id: 'nuzlocke',
    label: 'Nuzlocke',
    description: 'Comme Normal, mais la mort est définitive : une seule défaite et la partie est effacée.',
  },
];

interface DifficultyData {
  race: Race;
  charClass: CharClass;
}

// Second step of character creation: the mode, plus the options that can
// never be changed afterwards (mort définitive, Randomizer).
export class DifficultyScene extends Phaser.Scene {
  private race: Race = 'human';
  private charClass: CharClass = 'warrior';
  private mode: Mode = 'normal';
  private hardPermadeath = false;
  private randomizer = false;

  constructor() {
    super('Difficulty');
  }

  init(data: DifficultyData): void {
    this.race = data?.race ?? 'human';
    this.charClass = data?.charClass ?? 'warrior';
    this.mode = 'normal';
    this.hardPermadeath = false;
    this.randomizer = false;
  }

  create(): void {
    this.render();
  }

  private render(): void {
    this.children.removeAll(true);
    const { width } = this.scale;
    addCrispText(this, width / 2, 14, 'Mode de jeu', { fontSize: '14px', color: GOLD }).setOrigin(0.5);

    MODES.forEach((mode, i) => {
      const selected = mode.id === this.mode;
      const button = addCrispText(this, 12 + (i % 2) * 98, 38 + Math.floor(i / 2) * 26, mode.label, {
        fontSize: '11px',
        color: selected ? DARK : GOLD,
        backgroundColor: selected ? GOLD : OPTION_BG,
        padding: { x: 6, y: 5 },
        fixedWidth: 92,
        align: 'center',
      }).setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => {
        this.mode = mode.id;
        this.render();
      });
    });

    const current = MODES.find((m) => m.id === this.mode)!;
    addCrispText(this, 12, 96, current.description, {
      fontSize: '9px',
      color: MUTED,
      wordWrap: { width: width - 24 },
      lineSpacing: 3,
    });

    let y = 160;
    if (this.mode === 'hard') {
      this.toggle(y, 'Mort définitive', this.hardPermadeath, () => {
        this.hardPermadeath = !this.hardPermadeath;
        this.render();
      });
      addCrispText(this, 12, y + 22, 'Une seule défaite et la partie est effacée.', { fontSize: '8px', color: MUTED });
      y += 46;
    }
    this.toggle(y, 'Randomizer', this.randomizer, () => {
      this.randomizer = !this.randomizer;
      this.render();
    });
    addCrispText(
      this,
      12,
      y + 22,
      'Les monstres de chaque zone et les récompenses uniques des boss sont mélangés, toujours au niveau de la zone.',
      { fontSize: '8px', color: MUTED, wordWrap: { width: width - 24 }, lineSpacing: 2 },
    );

    addCrispText(this, width / 2, 300, 'Le mode Nuzlocke, la mort définitive et le Randomizer ne pourront plus être changés.', {
      fontSize: '8px',
      color: MUTED,
      align: 'center',
      wordWrap: { width: width - 30 },
    }).setOrigin(0.5);

    const start = addCrispText(this, width / 2, 336, "Commencer l'aventure", {
      fontSize: '13px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 8, y: 6 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    start.on('pointerdown', () => void this.confirm());

    const back = addCrispText(this, width / 2, 368, 'Retour', { fontSize: '10px', color: GOLD })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('CharacterCreation'));
  }

  private toggle(y: number, label: string, value: boolean, onClick: () => void): void {
    const text = addCrispText(this, 12, y, `${label} : ${value ? 'oui' : 'non'}`, {
      fontSize: '11px',
      color: value ? DARK : GOLD,
      backgroundColor: value ? GOLD : OPTION_BG,
      padding: { x: 6, y: 4 },
    }).setInteractive({ useHandCursor: true });
    text.on('pointerdown', onClick);
  }

  private async confirm(): Promise<void> {
    const character = createCharacter(this.race, this.charClass);
    character.difficulty = this.mode === 'nuzlocke' ? 'normal' : this.mode;
    character.permadeath = this.mode === 'nuzlocke' || (this.mode === 'hard' && this.hardPermadeath);
    if (this.randomizer) character.randomizerSeed = newRandomizerSeed();
    await SaveManager.saveCharacter(character);
    this.scene.start('Hamlet');
  }
}
