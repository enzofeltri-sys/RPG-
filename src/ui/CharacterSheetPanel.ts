import Phaser from 'phaser';
import { Character, RACES, CLASSES, xpToNextLevel } from '../game/character';
import { MAX_LEVEL, talentPointsAvailable } from '../game/talents';
import { SaveManager } from '../save/SaveManager';
import { DIFFICULTY_LABELS, Difficulty, canChangeDifficulty, difficultyOf, modeLabel } from '../game/difficulty';
import { MAP_LOCATIONS } from '../game/worldMap';
import { ReturnSceneKey, returnSceneStartData } from './returnContext';
import { INK, KitBar, KitButton, PAL, addPanel, drawButton, drawPanel, panelText } from './kit';
import { addCrispText } from './text';

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

type Fixed = Phaser.GameObjects.GameObject & {
  setScrollFactor(x: number): unknown;
  setDepth(d: number): unknown;
  setVisible(v: boolean): unknown;
};

// The overworld menu (UI style A, docs/mockups/ui3_ecrans.png): a bag button
// in the corner (with a red badge when points are waiting), opening a
// parchment panel with the hero's portrait, level and XP, eight icon
// buttons, gold and location, and an Options view.
export class CharacterSheetPanel {
  private readonly scene: Phaser.Scene;
  private readonly mainObjects: Fixed[] = [];
  private readonly mainButtons: KitButton[] = [];
  private readonly optionObjects: Fixed[] = [];
  private readonly optionButtons: KitButton[] = [];
  private readonly panel: Phaser.GameObjects.Graphics;
  private visible = false;

  // returnScene/getPlayerPosition let the panel send the player to a menu
  // screen and have "Retour" land back at this exact spot in this exact scene.
  constructor(
    scene: Phaser.Scene,
    character: Character,
    returnScene: ReturnSceneKey,
    getPlayerPosition: () => { x: number; y: number },
    onToggle?: (open: boolean) => void,
  ) {
    this.scene = scene;
    const talentPoints = talentPointsAvailable(character);
    const unspent = character.statPoints > 0 || talentPoints > 0;

    // Corner button.
    const toggle = new KitButton(scene, 6, 6, 28, 28, '', { icon: 'bag', onClick: () => this.toggle(onToggle) })
      .setScrollFactor(0)
      .setDepth(1000);
    void toggle;
    if (unspent) this.badge(26, 2, '!', 1000);

    this.panel = this.fix(addPanel(scene, 10, 42, 196, 312), 999) as Phaser.GameObjects.Graphics;

    // Header: portrait, identity, XP.
    const frame = scene.add.graphics();
    drawPanel(frame, 20, 52, 40, 36);
    this.main(frame);
    this.main(scene.add.image(24, 57, 'ui-hero-face').setOrigin(0, 0));
    this.main(panelText(scene, 68, 54, `${RACES[character.race].label} ${CLASSES[character.class].label}`, 10));
    this.main(panelText(scene, 68, 70, `Niveau ${character.level} · ${modeLabel(character)}`, 8, INK.soft));
    const xpBar = new KitBar(scene, 68, 82, 128, PAL.p, PAL.P);
    xpBar.set(character.level >= MAX_LEVEL ? 1 : character.xp / xpToNextLevel(character.level));
    this.main(xpBar.graphics);

    const navigateTo = (sceneKey: string): void => {
      const pos = getPlayerPosition();
      scene.scene.start(sceneKey, { returnScene, ...returnSceneStartData(returnScene, pos.x, pos.y) });
    };
    const entries: { icon: string; label: string; badge?: number; onClick: () => void }[] = [
      { icon: 'sword', label: 'Équipement', onClick: () => navigateTo('Inventory') },
      { icon: 'bag', label: 'Sac', onClick: () => navigateTo('Bag') },
      { icon: 'heart', label: 'Stats', badge: character.statPoints, onClick: () => navigateTo('Stats') },
      { icon: 'star', label: 'Talents', badge: talentPoints, onClick: () => navigateTo('Talents') },
      { icon: 'scroll', label: 'Quêtes', onClick: () => navigateTo('Quests') },
      { icon: 'map', label: 'Carte', onClick: () => navigateTo('Map') },
      { icon: 'gear', label: 'Options', onClick: () => this.showOptions() },
      { icon: 'door', label: 'Quitter', onClick: () => scene.scene.start('Title') },
    ];
    entries.forEach((entry, i) => {
      const x = 20 + (i % 2) * 90;
      const y = 100 + Math.floor(i / 2) * 48;
      const button = new KitButton(scene, x, y, 86, 40, entry.label, { icon: entry.icon, size: 9, onClick: entry.onClick })
        .setScrollFactor(0)
        .setDepth(1001);
      this.mainButtons.push(button);
      if (entry.badge && entry.badge > 0) this.mainObjects.push(...this.badge(x + 70, y - 4, `${entry.badge}`, 1002));
    });

    const place = MAP_LOCATIONS.find((l) => l.key === returnScene)?.label ?? '';
    this.main(panelText(scene, 108, 300, `Or : ${character.gold}`, 9).setOrigin(0.5, 0));
    if (place) this.main(panelText(scene, 108, 318, place, 8, INK.soft).setOrigin(0.5, 0));

    this.buildOptions(scene, character);
    this.setMainVisible(false);
    this.setOptionsVisible(false);
    this.panel.setVisible(false);

    if (character.pendingNotice) this.showNotice(scene, character);
  }

  private fix<T extends Fixed>(obj: T, depth = 1001): T {
    obj.setScrollFactor(0);
    obj.setDepth(depth);
    return obj;
  }

  private main<T extends Fixed>(obj: T): T {
    this.mainObjects.push(this.fix(obj));
    return obj;
  }

  private badge(x: number, y: number, text: string, depth: number): Fixed[] {
    const g = this.scene.add.graphics();
    g.fillStyle(PAL.k, 1).fillRect(x, y, 18, 18);
    g.fillStyle(PAL.x, 1).fillRect(x + 2, y + 2, 14, 14);
    g.fillStyle(PAL.y, 1).fillRect(x + 2, y + 2, 14, 2);
    const label = addCrispText(this.scene, x + 9, y + 9, text, { fontSize: '8px', color: INK.light }).setOrigin(0.5);
    return [this.fix(g, depth), this.fix(label, depth)];
  }

  private buildOptions(scene: Phaser.Scene, character: Character): void {
    const add = (obj: Fixed) => this.optionObjects.push(this.fix(obj));
    add(panelText(scene, 108, 56, 'Options', 11).setOrigin(0.5, 0));
    add(
      panelText(scene, 24, 78, "Vide le cache local et force le téléchargement de la dernière version du jeu. Utile si une mise à jour ne s'affiche pas.", 8, INK.soft, {
        wordWrap: { width: 168 },
        lineSpacing: 2,
      }),
    );
    this.optionButtons.push(
      new KitButton(scene, 20, 140, 176, 28, 'Vider le cache et rafraîchir', { size: 9, align: 'center', onClick: () => void clearCacheAndReload() })
        .setScrollFactor(0)
        .setDepth(1001),
    );
    // Difficulty: Facile/Normal/Difficile switch freely; permadeath and the
    // Randomizer stay as chosen at creation.
    const modeText = panelText(scene, 24, 186, '', 9, INK.text, { wordWrap: { width: 168 }, lineSpacing: 2 });
    add(modeText);
    const refreshMode = () => {
      const lines = [`Mode : ${modeLabel(character)}${canChangeDifficulty(character) ? '' : ' (définitif)'}`];
      if (character.randomizerSeed !== undefined) lines.push('Randomizer actif');
      modeText.setText(lines.join('\n'));
    };
    refreshMode();
    if (canChangeDifficulty(character)) {
      const order: Difficulty[] = ['easy', 'normal', 'hard'];
      const modeButton: KitButton = new KitButton(scene, 20, 222, 176, 28, 'Changer la difficulté', {
        size: 9,
        align: 'center',
        onClick: () => {
          const next = order[(order.indexOf(difficultyOf(character)) + 1) % order.length];
          character.difficulty = next;
          refreshMode();
          void SaveManager.saveCharacter(character);
          modeButton.setLabel(`Difficulté : ${DIFFICULTY_LABELS[next]}`);
        },
      })
        .setScrollFactor(0)
        .setDepth(1001);
      this.optionButtons.push(modeButton);
    }
    this.optionButtons.push(
      new KitButton(scene, 20, 312, 176, 28, 'Retour', { size: 10, align: 'center', onClick: () => this.showMain() })
        .setScrollFactor(0)
        .setDepth(1001),
    );
  }

  private toggle(onToggle?: (open: boolean) => void): void {
    this.visible = !this.visible;
    this.panel.setVisible(this.visible);
    if (this.visible) this.showMain();
    else {
      this.setMainVisible(false);
      this.setOptionsVisible(false);
    }
    onToggle?.(this.visible);
  }

  private showMain(): void {
    this.setOptionsVisible(false);
    this.setMainVisible(true);
  }

  private showOptions(): void {
    this.setMainVisible(false);
    this.setOptionsVisible(true);
  }

  private setMainVisible(visible: boolean): void {
    this.mainObjects.forEach((o) => o.setVisible(visible));
    this.mainButtons.forEach((b) => b.setVisible(visible));
  }

  private setOptionsVisible(visible: boolean): void {
    this.optionObjects.forEach((o) => o.setVisible(visible));
    this.optionButtons.forEach((b) => b.setVisible(visible));
  }

  // One-off message left on the character (see Character.pendingNotice),
  // shown once at the top of the screen, then cleared from the save.
  private showNotice(scene: Phaser.Scene, character: Character): void {
    const text = addCrispText(scene, scene.scale.width / 2, 60, character.pendingNotice!, {
      fontSize: '9px',
      color: INK.text,
      align: 'center',
      wordWrap: { width: scene.scale.width - 50 },
    })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1003);
    const h = Math.ceil((text.height + 16) / 2) * 2;
    const g = scene.add.graphics().setScrollFactor(0).setDepth(1002);
    drawPanel(g, 14, 52, scene.scale.width - 28, h);
    delete character.pendingNotice;
    void SaveManager.saveCharacter(character);
    scene.time.delayedCall(6000, () => {
      g.destroy();
      text.destroy();
    });
  }
}

// Kept for scenes that draw a lone wooden button outside the kit classes.
export { drawButton };
