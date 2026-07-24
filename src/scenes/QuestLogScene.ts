import Phaser from 'phaser';
import { Character } from '../game/character';
import { QUESTS, getQuestProgress } from '../game/quest';
import { ReturnContext, ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { SaveManager } from '../save/SaveManager';
import { addCrispText } from '../ui/text';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';
const ACTIVE_COLOR = '#4fa3e3';
const DONE_COLOR = '#5fbf6a';

export class QuestLogScene extends Phaser.Scene {
  private character!: Character;
  private returnScene: ReturnSceneKey = 'Village';
  private returnX?: number;
  private returnY?: number;

  constructor() {
    super('Quests');
  }

  init(data: ReturnContext): void {
    this.returnScene = data?.returnScene ?? 'Village';
    this.returnX = data?.x;
    this.returnY = data?.y;
  }

  async create(): Promise<void> {
    const { width } = this.scale;
    const save = await SaveManager.load();
    this.character = save!.character!;

    addCrispText(this, width / 2, 14, 'Quêtes', { fontSize: '16px', color: GOLD }).setOrigin(0.5);

    let y = 40;
    Object.values(QUESTS).forEach((quest) => {
      const progress = getQuestProgress(this.character, quest.id);

      let statusLabel: string;
      let color: string;
      if (!progress) {
        statusLabel = 'Non commencée';
        color = MUTED;
      } else if (progress.state === 'active') {
        statusLabel = `En cours (${progress.progress}/${quest.objective.count})`;
        color = ACTIVE_COLOR;
      } else {
        statusLabel = progress.state === 'completed' ? 'Terminée — récompense à récupérer' : 'Terminée';
        color = DONE_COLOR;
      }

      addCrispText(this, 12, y, quest.title, { fontSize: '12px', color: GOLD }).setOrigin(0, 0);
      y += 18;
      addCrispText(this, 12, y, statusLabel, { fontSize: '9px', color }).setOrigin(0, 0);
      y += 16;
      addCrispText(this, 12, y, quest.description, {
        fontSize: '9px',
        color: MUTED,
        wordWrap: { width: width - 24 },
        lineSpacing: 3,
      }).setOrigin(0, 0);
      y += 50;
    });

    if (Object.keys(QUESTS).length === 0) {
      addCrispText(this, 12, y, 'Aucune quête pour le moment.', { fontSize: '10px', color: MUTED });
    }

    const backButton = addCrispText(this, width / 2, 362, 'Retour', {
      fontSize: '13px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 10, y: 6 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    backButton.on('pointerdown', () => this.goBack());
  }

  private goBack(): void {
    this.scene.start(this.returnScene, returnSceneStartData(this.returnScene, this.returnX, this.returnY));
  }
}
