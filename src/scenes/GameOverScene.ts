import Phaser from 'phaser';
import { CLASSES, CharClass, RACES, Race } from '../game/character';
import { MAP_LOCATIONS } from '../game/worldMap';
import { INK, KitButton, PAL, addPanel, panelText, preloadUiKit } from '../ui/kit';

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

  preload(): void {
    preloadUiKit(this);
  }

  // UI style A: a parchment epitaph on a dark backdrop, then back to the title.
  create(): void {
    const { width } = this.scale;
    this.cameras.main.setBackgroundColor(PAL.k);
    this.cameras.main.fadeIn(600);
    const e = this.epitaph;

    panelText(this, width / 2, 70, 'Votre aventure s’achève', 13, INK.light).setOrigin(0.5, 0);
    addPanel(this, 20, 104, width - 40, 150);
    panelText(this, width / 2, 116, 'Ci-gît', 11).setOrigin(0.5, 0);
    if (e) {
      const place = MAP_LOCATIONS.find((l) => l.key === e.scene)?.label ?? 'les terres de Vaeloria';
      panelText(this, width / 2, 138, `${RACES[e.race].label} ${CLASSES[e.charClass].label}, niveau ${e.level}`, 10).setOrigin(0.5, 0);
      panelText(
        this,
        width / 2,
        164,
        [`Tombé face à : ${e.monster}`, `Lieu : ${place}`, '', `Mode : ${e.mode}`].join('\n'),
        8,
        INK.soft,
        { align: 'center', lineSpacing: 3, wordWrap: { width: width - 70 } },
      ).setOrigin(0.5, 0);
    }
    new KitButton(this, 32, 290, width - 64, 30, "Retour à l'écran titre", {
      size: 10,
      align: 'center',
      onClick: () => this.scene.start('Title'),
    });
  }
}
