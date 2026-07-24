import Phaser from 'phaser';
import { Character, RACES, CLASSES, xpToNextLevel, getEffectiveStats } from '../game/character';
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
  private readonly optionsButton: Phaser.GameObjects.Text;
  private readonly optionsInfoText: Phaser.GameObjects.Text;
  private readonly clearCacheButton: Phaser.GameObjects.Text;
  private readonly backFromOptionsButton: Phaser.GameObjects.Text;
  private readonly mainViewObjects: Phaser.GameObjects.GameObject[];
  private readonly optionsViewObjects: Phaser.GameObjects.GameObject[];
  private visible = false;

  constructor(scene: Phaser.Scene, character: Character, onToggle?: (open: boolean) => void) {
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
    const stats = getEffectiveStats(character);

    const panelBg = scene.add
      .rectangle(10, 44, 190, 326, 0x0b0c10, 0.97)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xe8d9b5);

    const statLines = [
      `Force ${stats.strength}   Int ${stats.intelligence}`,
      `Agilité ${stats.agility}   Vit ${stats.vitality}`,
    ];
    if (stats.armor > 0 || stats.fireDamage > 0) {
      statLines.push(`Armure ${stats.armor}   Dégâts de feu ${stats.fireDamage}`);
    }

    const panelText = addCrispText(
      scene,
      20,
      54,
      [
        `${raceLabel} ${classLabel}`,
        `Niveau ${character.level}  (XP ${character.xp}/${xpToNextLevel(character.level)})`,
        '',
        ...statLines,
        '',
        `PV ${character.hp}/${character.maxHp}`,
        `PM ${character.mp}/${character.maxMp}`,
        '',
        `Points de stat : ${character.statPoints}`,
      ].join('\n'),
      {
        fontSize: '11px',
        color: GOLD,
        lineSpacing: 5,
      },
    )
      .setScrollFactor(0)
      .setDepth(1001)
      .setVisible(false);

    // Kept outside the container: interactive children of a Phaser Container are
    // unreliable for pointer hit-testing, so these buttons are separate top-level
    // objects toggled in lockstep with the panel instead of being nested inside it.
    this.inventoryButton = addCrispText(scene, 20, 278, 'Inventaire', {
      fontSize: '10px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 6, y: 5 },
    })
      .setScrollFactor(0)
      .setDepth(1001)
      .setInteractive({ useHandCursor: true });
    this.inventoryButton.setVisible(false);
    this.inventoryButton.on('pointerdown', () => scene.scene.start('Inventory'));

    this.quitButton = addCrispText(scene, 20, 306, 'Quitter vers le titre', {
      fontSize: '10px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 6, y: 5 },
    })
      .setScrollFactor(0)
      .setDepth(1001)
      .setInteractive({ useHandCursor: true });
    this.quitButton.setVisible(false);
    this.quitButton.on('pointerdown', () => scene.scene.start('Title'));

    this.optionsButton = addCrispText(scene, 20, 334, 'Options', {
      fontSize: '10px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 6, y: 5 },
    })
      .setScrollFactor(0)
      .setDepth(1001)
      .setInteractive({ useHandCursor: true });
    this.optionsButton.setVisible(false);
    this.optionsButton.on('pointerdown', () => this.showOptions());

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

    this.mainViewObjects = [panelText, this.inventoryButton, this.quitButton, this.optionsButton];
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
