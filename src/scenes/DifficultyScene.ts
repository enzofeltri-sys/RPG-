import Phaser from 'phaser';
import { CharClass, Race, createCharacter } from '../game/character';
import { Difficulty, newRandomizerSeed } from '../game/difficulty';
import { SaveManager } from '../save/SaveManager';
import { INK, KitButton, addScreenPanel, buttonRow, panelText, preloadUiKit } from '../ui/kit';
import { SCREEN_INNER_W, SCREEN_LEFT, actionRow, detailPanel } from '../ui/screen';

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

  preload(): void {
    preloadUiKit(this);
  }

  create(): void {
    this.render();
  }

  private render(): void {
    this.children.removeAll(true);
    addScreenPanel(this);
    panelText(this, this.scale.width / 2, 14, 'Mode de jeu', 12).setOrigin(0.5, 0);

    const cols = buttonRow(2, SCREEN_LEFT, SCREEN_INNER_W);
    MODES.forEach((mode, i) => {
      const { x, w } = cols[i % 2];
      new KitButton(this, x, 34 + Math.floor(i / 2) * 28, w, 24, mode.label, {
        size: 10,
        align: 'center',
        state: mode.id === this.mode ? 'pressed' : 'normal',
        onClick: () => {
          this.mode = mode.id;
          this.render();
        },
      });
    });
    const current = MODES.find((m) => m.id === this.mode)!;
    detailPanel(this, { text: current.label, color: INK.text }, [{ text: current.description, color: INK.text }], 92, 78);

    let y = 178;
    if (this.mode === 'hard') {
      this.toggle(y, 'Mort définitive', this.hardPermadeath, 'Une seule défaite et la partie est effacée.', () => {
        this.hardPermadeath = !this.hardPermadeath;
        this.render();
      });
      y += 54;
    }
    this.toggle(
      y,
      'Randomizer',
      this.randomizer,
      'Les monstres de chaque zone et les récompenses uniques des boss sont mélangés, toujours au niveau de la zone.',
      () => {
        this.randomizer = !this.randomizer;
        this.render();
      },
    );

    panelText(this, this.scale.width / 2, 306, 'Le mode Nuzlocke, la mort définitive et le Randomizer ne pourront plus être changés.', 7, INK.danger, {
      align: 'center',
      wordWrap: { width: SCREEN_INNER_W - 10 },
    }).setOrigin(0.5, 0);

    actionRow(this, [
      { label: 'Retour', onClick: () => this.scene.start('CharacterCreation') },
      { label: "Commencer", onClick: () => void this.confirm() },
    ]);
  }

  // An on/off option: a wooden switch (pressed when on) with its effect below.
  private toggle(y: number, label: string, value: boolean, effect: string, onClick: () => void): void {
    new KitButton(this, SCREEN_LEFT, y, SCREEN_INNER_W, 24, label, {
      size: 10,
      cost: value ? 'Oui' : 'Non',
      costSize: 10,
      state: value ? 'pressed' : 'normal',
      onClick,
    });
    panelText(this, SCREEN_LEFT + 4, y + 28, effect, 7, INK.soft, { wordWrap: { width: SCREEN_INNER_W - 8 }, lineSpacing: 1 });
  }

  private async confirm(): Promise<void> {
    const character = createCharacter(this.race, this.charClass);
    character.difficulty = this.mode === 'nuzlocke' ? 'normal' : this.mode;
    character.permadeath = this.mode === 'nuzlocke' || (this.mode === 'hard' && this.hardPermadeath);
    if (this.randomizer) character.randomizerSeed = newRandomizerSeed();
    // Only now does a new adventure replace the previous save (the title
    // screen no longer wipes it before creation, so backing out is safe).
    await SaveManager.createNewGame();
    await SaveManager.saveCharacter(character);
    this.scene.start('Hamlet');
  }
}
