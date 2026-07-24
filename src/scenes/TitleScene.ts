import Phaser from 'phaser';
import { SaveManager } from '../save/SaveManager';
import { addCrispText } from '../ui/text';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  async create(): Promise<void> {
    document.getElementById('boot-status')?.remove();

    const { width, height } = this.scale;

    addCrispText(this, width / 2, height * 0.28, 'Le Sceau\nde Vaeloria', {
      fontSize: '27px',
      color: '#e8d9b5',
      align: 'center',
    }).setOrigin(0.5);

    const hasSave = await SaveManager.hasSave();

    this.createButton(width / 2, height * 0.55, 'Nouvelle partie', async () => {
      await SaveManager.createNewGame();
      this.scene.start('CharacterCreation');
    });

    if (hasSave) {
      this.createButton(width / 2, height * 0.63, 'Continuer', async () => {
        await SaveManager.load();
        this.scene.start('Village');
      });
    }
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    const text = addCrispText(this, x, y, label, {
      fontSize: '15px',
      color: '#0b0c10',
      backgroundColor: '#e8d9b5',
      padding: { x: 10, y: 6 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    text.on('pointerdown', onClick);
  }
}
