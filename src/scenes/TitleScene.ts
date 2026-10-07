import Phaser from 'phaser';
import { CLASSES, Character, RACES } from '../game/character';
import { modeLabel } from '../game/difficulty';
import { SaveManager } from '../save/SaveManager';
import { INK, KitButton, addPanel, panelText, preloadUiKit } from '../ui/kit';

export class TitleScene extends Phaser.Scene {
  private confirmNewGame = false;

  constructor() {
    super('Title');
  }

  // UI kit images are shared by every scene: loaded once, here.
  preload(): void {
    preloadUiKit(this);
  }

  async create(): Promise<void> {
    document.getElementById('boot-status')?.remove();
    this.confirmNewGame = false;
    const save = await SaveManager.load();
    this.render(save?.character);
  }

  // Title in UI style A: the meadow backdrop (a placeholder until the
  // decor step paints a proper title illustration), the name on a
  // parchment banner, and the two choices as kit buttons.
  private render(character?: Character): void {
    this.children.removeAll(true);
    const { width } = this.scale;
    this.add.image(0, 0, 'ui-battle-grass').setOrigin(0, 0);

    addPanel(this, 20, 64, width - 40, 92);
    panelText(this, width / 2, 80, 'Le Sceau', 20).setOrigin(0.5, 0);
    panelText(this, width / 2, 108, 'de Vaeloria', 20).setOrigin(0.5, 0);

    const buttonW = 152;
    const x = (width - buttonW) / 2;
    if (character) {
      new KitButton(this, x, 214, buttonW, 30, 'Continuer', {
        icon: 'door',
        size: 11,
        onClick: () => this.scene.start('Hamlet'),
      });
      addPanel(this, x, 248, buttonW, 30);
      panelText(this, width / 2, 254, `${RACES[character.race].label} ${CLASSES[character.class].label} · niveau ${character.level}`, 8).setOrigin(0.5, 0);
      panelText(this, width / 2, 265, modeLabel(character), 7, INK.soft).setOrigin(0.5, 0);
    }
    // With a save, a first tap only asks: a new adventure replaces it once
    // its mode is confirmed (DifficultyScene).
    new KitButton(this, x, character ? 290 : 230, buttonW, 30, this.confirmNewGame ? 'Remplacer la partie ?' : 'Nouvelle partie', {
      icon: 'star',
      size: this.confirmNewGame ? 9 : 11,
      onClick: () => {
        if (character && !this.confirmNewGame) {
          this.confirmNewGame = true;
          this.render(character);
          return;
        }
        this.scene.start('CharacterCreation');
      },
    });
    if (this.confirmNewGame) {
      addPanel(this, x, 324, buttonW, 34);
      panelText(this, width / 2, 331, "L'ancienne partie sera effacée au moment de commencer.", 7, INK.danger, {
        align: 'center',
        wordWrap: { width: buttonW - 16 },
      }).setOrigin(0.5, 0);
    }
  }
}
