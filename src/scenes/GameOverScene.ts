import Phaser from 'phaser';
import { CLASSES, CharClass, RACES, Race } from '../game/character';
import { MAP_LOCATIONS } from '../game/worldMap';
import { addCrispText } from '../ui/text';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';

interface Epitaph {
  race: Race;
  charClass: CharClass;
  level: number;
  monster: string;
  scene: string;
  mode: string;
}

// Mort définitive (Nuzlocke, or Difficile + mort définitive): shown once the
// save has been wiped.
export class GameOverScene extends Phaser.Scene {
  private epitaph?: Epitaph;

  constructor() {
    super('GameOver');
  }

  init(data: Epitaph): void {
    this.epitaph = data;
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0b0c10');
    this.cameras.main.fadeIn(600);
    const e = this.epitaph;

    addCrispText(this, width / 2, height * 0.22, 'Votre aventure s’achève', {
      fontSize: '16px',
      color: GOLD,
    }).setOrigin(0.5);

    if (e) {
      const place = MAP_LOCATIONS.find((l) => l.key === e.scene)?.label ?? 'les terres de Vaeloria';
      addCrispText(
        this,
        width / 2,
        height * 0.42,
        [
          `${RACES[e.race].label} ${CLASSES[e.charClass].label}, niveau ${e.level}`,
          '',
          `Tombé face à : ${e.monster}`,
          `Lieu : ${place}`,
          '',
          `Mode : ${e.mode}`,
        ].join('\n'),
        { fontSize: '11px', color: MUTED, align: 'center', lineSpacing: 4, wordWrap: { width: width - 30 } },
      ).setOrigin(0.5);
    }

    const button = addCrispText(this, width / 2, height * 0.78, "Retour à l'écran titre", {
      fontSize: '12px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 10, y: 6 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => this.scene.start('Title'));
  }
}
