import Phaser from 'phaser';
import { RACES, CLASSES, Race, CharClass, computeStats } from '../game/character';
import {
  ActiveTalent,
  BRANCH_NAMES,
  CLASS_RESOURCE,
  RAGE_MAX,
  RESOURCE_LABELS,
  STARTER_SKILL,
  TALENTS,
  enduranceMax,
  manaMax,
} from '../game/talents';
import { INK, KitButton, addScreenPanel, buttonRow, panelText, preloadUiKit } from '../ui/kit';
import { SCREEN_INNER_W, SCREEN_LEFT, actionRow, detailPanel } from '../ui/screen';

// Création de personnage in UI style A: race and class pickers, the
// resulting stats, then everything the choice implies (class, starting
// skill, talent branches, race traits) in a parchment panel.
export class CharacterCreationScene extends Phaser.Scene {
  private race: Race = 'human';
  private charClass: CharClass = 'warrior';

  constructor() {
    super('CharacterCreation');
  }

  preload(): void {
    preloadUiKit(this);
  }

  create(): void {
    this.render();
  }

  private picker<T extends string>(top: number, label: string, options: Record<T, { label: string }>, current: T, pick: (v: T) => void): number {
    panelText(this, SCREEN_LEFT + 2, top, label, 8, INK.soft);
    const keys = Object.keys(options) as T[];
    const cols = buttonRow(3, SCREEN_LEFT, SCREEN_INNER_W, 4);
    keys.forEach((key, i) => {
      const { x, w } = cols[i % 3];
      new KitButton(this, x, top + 12 + Math.floor(i / 3) * 24, w, 20, options[key].label, {
        size: 9,
        align: 'center',
        state: key === current ? 'pressed' : 'normal',
        onClick: () => {
          pick(key);
          this.render();
        },
      });
    });
    return top + 12 + Math.ceil(keys.length / 3) * 24;
  }

  private render(): void {
    this.children.removeAll(true);
    addScreenPanel(this);
    panelText(this, this.scale.width / 2, 14, 'Création du personnage', 12).setOrigin(0.5, 0);
    let y = this.picker(32, 'Race', RACES, this.race, (r) => (this.race = r));
    y = this.picker(y + 4, 'Classe', CLASSES, this.charClass, (c) => (this.charClass = c));

    const stats = computeStats(this.race, this.charClass);
    const maxHp = 20 + stats.vitality * 4;
    const resource = CLASS_RESOURCE[this.charClass];
    const resourceLine =
      resource === 'mana'
        ? `Mana ${manaMax(stats.intelligence)}`
        : resource === 'rage'
          ? `Rage 0 à ${RAGE_MAX}`
          : `Endurance ${enduranceMax(stats.vitality)}`;
    panelText(this, this.scale.width / 2, y + 4, `Force ${stats.strength} · Intelligence ${stats.intelligence} · Agilité ${stats.agility}`, 8).setOrigin(0.5, 0);
    panelText(this, this.scale.width / 2, y + 16, `Vitalité ${stats.vitality} · PV ${maxHp} · ${resourceLine}`, 8).setOrigin(0.5, 0);

    const starter = TALENTS[STARTER_SKILL[this.charClass]] as ActiveTalent;
    const top = y + 32;
    detailPanel(
      this,
      { text: `${RACES[this.race].label} ${CLASSES[this.charClass].label}`, color: INK.text },
      [
        { text: CLASSES[this.charClass].description, color: INK.text },
        {
          text: `Départ : ${starter.name} (${starter.cost[0]} ${RESOURCE_LABELS[resource].toLowerCase()}) : ${starter.describe(starter.values[0])}`,
          color: INK.soft,
        },
        { text: `Talents : ${BRANCH_NAMES[this.charClass].join(', ')}.`, color: INK.soft },
        { text: RACES[this.race].description, color: INK.text },
        ...RACES[this.race].skills.map((skill) => ({ text: skill, color: INK.soft })),
      ],
      top,
      340 - top,
    );
    actionRow(this, [
      { label: 'Retour', onClick: () => this.scene.start('Title') },
      // The character itself is created after the mode is chosen (DifficultyScene).
      { label: 'Suivant', onClick: () => this.scene.start('Difficulty', { race: this.race, charClass: this.charClass }) },
    ]);
  }
}
