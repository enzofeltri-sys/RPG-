import Phaser from 'phaser';
import { SaveManager } from '../save/SaveManager';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  async create(): Promise<void> {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height * 0.3, 'Le Sceau de Vaeloria', {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        color: '#e8d9b5',
      })
      .setOrigin(0.5);

    const hasSave = await SaveManager.hasSave();

    this.createButton(width / 2, height * 0.55, 'Nouvelle partie', async () => {
      await SaveManager.createNewGame();
      this.showStatus('Partie créée. Le monde arrive au prochain incrément.');
    });

    if (hasSave) {
      this.createButton(width / 2, height * 0.68, 'Continuer', async () => {
        const data = await SaveManager.load();
        this.showStatus(`Sauvegarde chargée (créée le ${new Date(data!.createdAt).toLocaleDateString()}).`);
      });
    }
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: '#0b0c10',
        backgroundColor: '#e8d9b5',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    text.on('pointerdown', onClick);
  }

  private showStatus(message: string): void {
    this.children.getAll('name', 'status').forEach((obj) => obj.destroy());
    this.add
      .text(this.scale.width / 2, this.scale.height * 0.85, message, {
        fontFamily: 'Georgia, serif',
        fontSize: '9px',
        color: '#9aa0a6',
        align: 'center',
        wordWrap: { width: this.scale.width * 0.8 },
      })
      .setName('status')
      .setOrigin(0.5);
  }
}
