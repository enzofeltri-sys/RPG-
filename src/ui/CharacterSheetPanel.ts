import Phaser from 'phaser';
import { Character, RACES, CLASSES } from '../game/character';
import { ReturnSceneKey, returnSceneStartData } from './returnContext';
import { addCrispText } from './text';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';

// Unregisters the service worker and clears every Cache Storage entry, then
// reloads — the "vider le cache et forcer le rafraîchissement" escape hatch
// for when a PWA update doesn't take effect on its own (see main.ts's
// controllerchange handling for the normal, automatic update path).
async function clearCacheAndReload(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
  window.location.reload();
}

export class CharacterSheetPanel {
  private readonly container: Phaser.GameObjects.Container;
  private readonly quitButton: Phaser.GameObjects.Text;
  private readonly inventoryButton: Phaser.GameObjects.Text;
  private readonly bagButton: Phaser.GameObjects.Text;
  private readonly statsButton: Phaser.GameObjects.Text;
  private readonly questsButton: Phaser.GameObjects.Text;
  private readonly optionsButton: Phaser.GameObjects.Text;
  private readonly optionsInfoText: Phaser.GameObjects.Text;
  private readonly clearCacheButton: Phaser.GameObjects.Text;
  private readonly backFromOptionsButton: Phaser.GameObjects.Text;
  private readonly mainViewObjects: Phaser.GameObjects.GameObject[];
  private readonly optionsViewObjects: Phaser.GameObjects.GameObject[];
  private visible = false;

  // returnScene/getPlayerPosition let the panel send the player to Inventaire,
  // Sac, Stats or Quêtes and have "Retour" land back at this exact spot in this
  // exact scene, instead of always resetting to the Village's default spawn.
  constructor(
    scene: Phaser.Scene,
    character: Character,
    returnScene: ReturnSceneKey,
    getPlayerPosition: () => { x: number; y: number },
    onToggle?: (open: boolean) => void,
  ) {
    const button = addCrispText(scene, 10, 10, 'Menu', {
      fontSize: '13px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 8, y: 6 },
    })
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true });

    const raceLabel = RACES[character.race].label;
    const classLabel = CLASSES[character.class].label;

    const panelBg = scene.add
      .rectangle(10, 44, 190, 326, 0x0b0c10, 0.97)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xe8d9b5);

    const headerText = addCrispText(scene, 20, 58, `${raceLabel} ${classLabel} — Niveau ${character.level}`, {
      fontSize: '11px',
      color: GOLD,
    })
      .setScrollFactor(0)
      .setDepth(1001)
      .setVisible(false);

    const navigateTo = (sceneKey: string): void => {
      const pos = getPlayerPosition();
      scene.scene.start(sceneKey, { returnScene, ...returnSceneStartData(returnScene, pos.x, pos.y) });
    };

    // Kept outside the container: interactive children of a Phaser Container are
    // unreliable for pointer hit-testing, so these buttons are separate top-level
    // objects toggled in lockstep with the panel instead of being nested inside it.
    // Laid out as a 3x2 grid.
    this.inventoryButton = this.makeNavButton(scene, 20, 90, 'Inventaire', () => navigateTo('Inventory'));
    this.bagButton = this.makeNavButton(scene, 115, 90, 'Sac', () => navigateTo('Bag'));
    this.statsButton = this.makeNavButton(scene, 20, 120, 'Stats', () => navigateTo('Stats'));
    this.questsButton = this.makeNavButton(scene, 115, 120, 'Quêtes', () => navigateTo('Quests'));
    this.optionsButton = this.makeNavButton(scene, 20, 150, 'Options', () => this.showOptions());
    this.quitButton = this.makeNavButton(scene, 115, 150, 'Quitter', () => scene.scene.start('Title'));

    this.optionsInfoText = addCrispText(
      scene,
      20,
      54,
      "Vide le cache local et force le téléchargement de la dernière version du jeu. Utile si une mise à jour ne s'affiche pas.",
      {
        fontSize: '10px',
        color: GOLD,
        lineSpacing: 5,
        wordWrap: { width: 170 },
      },
    )
      .setScrollFactor(0)
      .setDepth(1001)
      .setVisible(false);

    this.clearCacheButton = addCrispText(scene, 20, 150, 'Vider le cache et rafraîchir', {
      fontSize: '10px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 6, y: 5 },
      wordWrap: { width: 160 },
      align: 'center',
    })
      .setScrollFactor(0)
      .setDepth(1001)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.clearCacheButton.on('pointerdown', () => clearCacheAndReload());

    this.backFromOptionsButton = addCrispText(scene, 20, 200, 'Retour', {
      fontSize: '10px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 6, y: 5 },
    })
      .setScrollFactor(0)
      .setDepth(1001)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.backFromOptionsButton.on('pointerdown', () => this.showMain());

    this.mainViewObjects = [
      headerText,
      this.inventoryButton,
      this.bagButton,
      this.statsButton,
      this.questsButton,
      this.quitButton,
      this.optionsButton,
    ];
    this.optionsViewObjects = [this.optionsInfoText, this.clearCacheButton, this.backFromOptionsButton];

    this.container = scene.add.container(0, 0, [panelBg]).setScrollFactor(0).setDepth(999);
    this.container.setVisible(false);

    button.on('pointerdown', () => {
      this.visible = !this.visible;
      this.container.setVisible(this.visible);
      if (this.visible) {
        this.showMain();
      } else {
        this.setViewVisible(this.mainViewObjects, false);
        this.setViewVisible(this.optionsViewObjects, false);
      }
      onToggle?.(this.visible);
    });
  }

  private makeNavButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const button = addCrispText(scene, x, y, label, {
      fontSize: '10px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 6, y: 5 },
    })
      .setScrollFactor(0)
      .setDepth(1001)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    button.on('pointerdown', onClick);
    return button;
  }

  private showMain(): void {
    this.setViewVisible(this.mainViewObjects, true);
    this.setViewVisible(this.optionsViewObjects, false);
  }

  private showOptions(): void {
    this.setViewVisible(this.mainViewObjects, false);
    this.setViewVisible(this.optionsViewObjects, true);
  }

  private setViewVisible(objects: Phaser.GameObjects.GameObject[], visible: boolean): void {
    objects.forEach((obj) => (obj as Phaser.GameObjects.Text).setVisible(visible));
  }
}
