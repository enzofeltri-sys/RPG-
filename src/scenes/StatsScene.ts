import Phaser from 'phaser';
import {
  Character,
  RACES,
  CLASSES,
  AllocatableStat,
  xpToNextLevel,
  getEffectiveStats,
  allocateStatPoint,
} from '../game/character';
import { modeLabel } from '../game/difficulty';
import { CLASS_RESOURCE, MAX_LEVEL, RAGE_MAX, enduranceMax } from '../game/talents';
import { ReturnContext, ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { SaveManager } from '../save/SaveManager';
import { playCraftSuccess } from '../ui/sound';
import { INK, KitBar, KitButton, PAL, addPanel, addScreenPanel, drawPanel, panelText, preloadUiKit, toast } from '../ui/kit';
import { heroFaceKey, loadHero } from '../entities/heroSprite';

const LEFT = 14;
const INNER_W = 188;
const ROWS_Y = 146;
const ROW_H = 36;

// What one point actually does (see combatEngine.ts / character.ts).
const ALLOCATABLE_STATS: { stat: AllocatableStat; label: string; effect: (resource: string) => string }[] = [
  { stat: 'strength', label: 'Force', effect: () => 'Épées, haches, armes à deux mains.' },
  {
    stat: 'intelligence',
    label: 'Intelligence',
    effect: (resource) => `Sorts, résistance magique${resource === 'mana' ? ', +1 mana max' : ''}.`,
  },
  { stat: 'agility', label: 'Agilité', effect: () => 'Dagues, arcs, esquive, initiative, fuite.' },
  { stat: 'vitality', label: 'Vitalité', effect: (resource) => `+4 PV max${resource === 'endurance' ? ', +1 endurance max' : ''}.` },
];

const EXTRA_STATS: [keyof ReturnType<typeof getEffectiveStats>, string][] = [
  ['fireDamage', 'Feu'],
  ['iceDamage', 'Glace'],
  ['electricDamage', 'Foudre'],
  ['poisonDamage', 'Poison'],
  ['darkDamage', 'Ombre'],
  ['earthDamage', 'Terre'],
  ['lifeSteal', 'Vol de vie'],
];

// Statistiques in UI style A: identity and XP, the HP and class resource
// gauges, the four allocatable stats (base value, gear total, what a point
// does, a + button), then armor, elemental bonuses and gold.
export class StatsScene extends Phaser.Scene {
  private character!: Character;
  private returnScene: ReturnSceneKey = 'Village';
  private returnX?: number;
  private returnY?: number;

  constructor() {
    super('Stats');
  }

  init(data: ReturnContext): void {
    this.returnScene = data?.returnScene ?? 'Village';
    this.returnX = data?.x;
    this.returnY = data?.y;
  }

  preload(): void {
    preloadUiKit(this);
  }

  async create(): Promise<void> {
    const save = await SaveManager.load();
    this.character = save!.character!;
    await loadHero(this, this.character.race, this.character.class);
    this.render();
  }

  private render(): void {
    this.children.removeAll(true);
    const c = this.character;
    const stats = getEffectiveStats(c);
    addScreenPanel(this);
    panelText(this, this.scale.width / 2, 14, 'Statistiques', 12).setOrigin(0.5, 0);

    // Identity, level, XP.
    const frame = this.add.graphics();
    drawPanel(frame, LEFT, 34, 40, 36);
    this.add.image(LEFT + 4, 39, heroFaceKey(c.race, c.class)).setOrigin(0, 0);
    panelText(this, 62, 35, `${RACES[c.race].label} ${CLASSES[c.class].label}`, 10);
    const mode = `${modeLabel(c)}${c.randomizerSeed !== undefined ? ' · Randomizer' : ''}`;
    panelText(this, 62, 50, `Niveau ${c.level} · ${mode}`, 8, INK.soft);
    const maxed = c.level >= MAX_LEVEL;
    new KitBar(this, 62, 63, 140, PAL.p, PAL.P).set(maxed ? 1 : c.xp / xpToNextLevel(c.level));
    panelText(this, LEFT + INNER_W, 70, maxed ? 'Niveau maximum' : `XP ${c.xp}/${xpToNextLevel(c.level)}`, 7, INK.soft).setOrigin(1, 0);

    // Gauges.
    this.gauge(82, 'PV', `${c.hp}/${c.maxHp}`, c.hp / c.maxHp, PAL.h, PAL.H);
    const resource = CLASS_RESOURCE[c.class];
    if (resource === 'mana') this.gauge(106, 'Mana', `${c.mp}/${c.maxMp}`, c.mp / Math.max(1, c.maxMp), PAL.u, PAL.i);
    else if (resource === 'rage') this.gauge(106, 'Rage', `0/${RAGE_MAX} · se remplit en combat`, 0, PAL.O, PAL.o);
    else this.gauge(106, 'Endurance', `${enduranceMax(stats.vitality)} · pleine à chaque combat`, 1, PAL.c, PAL.v);

    // Allocatable stats.
    panelText(this, LEFT, 132, 'Caractéristiques', 9);
    const points = c.statPoints;
    panelText(this, LEFT + INNER_W, 133, `${points} point${points > 1 ? 's' : ''} à placer`, 8, points > 0 ? INK.danger : INK.soft).setOrigin(
      1,
      0,
    );
    addPanel(this, LEFT, ROWS_Y, INNER_W, ROW_H * 4 + 8);
    ALLOCATABLE_STATS.forEach((entry, i) => this.statRow(entry, ROWS_Y + 6 + i * ROW_H, stats[entry.stat]));

    // Armor, elemental bonuses, gold.
    const parts = [`Armure ${stats.armor}`];
    EXTRA_STATS.forEach(([key, label]) => {
      if ((stats[key] as number) > 0) parts.push(`${label} +${stats[key]}`);
    });
    parts.push(`Or ${c.gold}`);
    const extra = panelText(this, LEFT + 2, ROWS_Y + ROW_H * 4 + 14, parts.join(' · '), 8, INK.text, {
      wordWrap: { width: INNER_W - 4 },
      lineSpacing: 2,
    });
    if (extra.y + extra.height > 340) extra.setFontSize(Math.round(7 * 1.2));

    new KitButton(this, LEFT, 344, INNER_W, 28, 'Retour', { size: 10, align: 'center', onClick: () => this.goBack() });
  }

  private gauge(y: number, label: string, value: string, ratio: number, fill: number, light: number): void {
    panelText(this, LEFT, y, label, 8);
    panelText(this, LEFT + INNER_W, y, value, 8, INK.soft).setOrigin(1, 0);
    new KitBar(this, LEFT, y + 12, INNER_W, fill, light).set(ratio);
  }

  private statRow(entry: (typeof ALLOCATABLE_STATS)[number], y: number, effective: number): void {
    const base = this.character.stats[entry.stat];
    const x = LEFT + 10;
    panelText(this, x, y + 2, entry.label, 9);
    const value = panelText(this, LEFT + INNER_W - 40, y + 2, `${base}`, 10).setOrigin(1, 0);
    if (effective !== base) {
      panelText(this, value.x - value.width - 4, y + 3, `(${effective} équipé)`, 8, INK.soft).setOrigin(1, 0);
    }
    panelText(this, x, y + 16, entry.effect(CLASS_RESOURCE[this.character.class]), 7, INK.soft);
    const hasPoints = this.character.statPoints > 0;
    new KitButton(this, LEFT + INNER_W - 34, y + 2, 24, 24, '+', {
      size: 12,
      align: 'center',
      state: hasPoints ? 'normal' : 'disabled',
      onClick: () => void this.handleAllocate(entry.stat),
    });
  }

  private async handleAllocate(stat: AllocatableStat): Promise<void> {
    if (!allocateStatPoint(this.character, stat)) {
      toast(this, this.scale.width / 2, ROWS_Y - 6, 'Aucun point à placer : on en gagne à chaque niveau.');
      return;
    }
    await SaveManager.saveCharacter(this.character);
    playCraftSuccess();
    this.render();
  }

  private goBack(): void {
    this.scene.start(this.returnScene, returnSceneStartData(this.returnScene, this.returnX, this.returnY));
  }
}
