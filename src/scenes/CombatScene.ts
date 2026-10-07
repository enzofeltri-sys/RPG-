import Phaser from 'phaser';
import { crispIcon } from '../entities/itemIcon';
import { addMeadowBackdrop } from '../ui/backdrop';
import { centerFrame } from '../ui/screen';
import { CLASSES, Character, grantXp } from '../game/character';
import { Monster, EncounterTier, createMonster } from '../game/monster';
import { Item, Rarity, RARITY_LABELS, rollLootItem, createItem } from '../game/item';
import { advanceQuestsOnDefeat } from '../game/quest';
import { advanceMainQuestOnBossDefeat } from '../game/mainQuest';
import { ConsumableId } from '../game/consumable';
import { ActionResult, CombatEngine } from '../game/combatEngine';
import { DIFFICULTY_RULES, VICTORY_HEAL, difficultyOf, modeLabel, randomizedMonsterId, seededShuffle } from '../game/difficulty';
import { ResourceKind, TALENTS, talentPointsTotal } from '../game/talents';
import { materialLabel } from '../game/material';
import { SaveManager } from '../save/SaveManager';
import { ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { DUNGEON_LOOT_TIER, ZONE_LEVEL } from '../game/worldMap';
import { ChipRow, INK, KitBar, KitButton, PAL, addPanel, drawPanel, panelText, preloadUiKit, toast } from '../ui/kit';
import { playHit, playVictory, playLevelUp, playDefeat } from '../ui/sound';
import { HERO_FEET_Y, HERO_FRAME_H, heroTextures, idleFrame } from '../entities/heroSprite';
import { heroLook } from '../art/heroLook';
import type { PixelText } from '../ui/pixelFont';

// Reuses the same colors as item rarity (RARITY_COLORS) so the player reads
// "élite"/"légendaire" the same way they already read rare/épique loot,
// instead of learning a second color code.
const TIER_NAME_COLOR: Record<EncounterTier, string> = {
  normal: INK.text,
  elite: '#4fa3e3',
  legendary: '#a855f7',
};

const TIER_ENEMY_TINT: Record<EncounterTier, number> = {
  normal: 0x6b2b2b,
  elite: 0x2b4a6b,
  legendary: 0x4a2b6b,
};

const TIER_APPEARANCE_MESSAGE: Record<EncounterTier, string> = {
  normal: 'apparaît',
  elite: "bien plus puissant que la normale apparaît — l'air se charge d'une menace inhabituelle",
  legendary: 'monstrueux et rayonnant se dresse devant vous — une rencontre rarissime',
};

// A hard-dungeon boss can grant its own exclusive item on top of the normal
// loot roll — a guaranteed, always-the-same "special reward" distinct from
// the random pool (see item.ts's `signature` flag on ItemTemplate).
const SIGNATURE_REWARDS: Record<string, { baseId: string; rarity: Rarity }> = {
  fallen_guardian: { baseId: 'guardian_amulet', rarity: 'epic' },
  shard_warden: { baseId: 'shard_pendant', rarity: 'epic' },
  seeker_archivist: { baseId: 'seeker_signet', rarity: 'epic' },
  corruption_heart: { baseId: 'purified_breastplate', rarity: 'epic' },
  primordial_guardian: { baseId: 'sealed_blade', rarity: 'epic' },
  watchtower_guardian: { baseId: 'watchtower_helm', rarity: 'epic' },
  unnamed_vestige: { baseId: 'eternal_watch_greaves', rarity: 'epic' },
  last_watcher: { baseId: 'last_watcher_boots', rarity: 'epic' },
  broken_sleeper: { baseId: 'broken_sleep_aegis', rarity: 'epic' },
  blight_root: { baseId: 'corrupted_root_gloves', rarity: 'epic' },
  // Added so every equip slot has at least 2 signature items (see item.ts) —
  // assigned to existing Acte 2/3 bosses that had no unique reward yet, no
  // new dungeon needed. Still a guaranteed drop on a specific hard-dungeon
  // boss kill, same farm gate as every other signature item (re-enterable
  // dungeons mean it's re-farmable, not a one-shot).
  smuggler_captain: { baseId: 'garrison_blade', rarity: 'epic' },
  ruins_delver: { baseId: 'garrison_helm', rarity: 'epic' },
  demon_envoy: { baseId: 'garrison_cuirass', rarity: 'epic' },
  blight_sentinel: { baseId: 'last_refuge_legs', rarity: 'epic' },
  sunken_warden: { baseId: 'hidden_path_boots', rarity: 'epic' },
  ancestor_warden: { baseId: 'silent_smith_gloves', rarity: 'epic' },
  seal_echo: { baseId: 'garrison_offhand_dagger', rarity: 'epic' },
  oath_guardian: { baseId: 'last_refuge_hatchet', rarity: 'epic' },
};

// A low-stakes optional dungeon's final encounter always drops something —
// but without a real boss's higher rare/epic odds, since it's meant to stay
// a minor, "inutile" reward rather than compete with actual boss loot.
const GUARANTEED_LOOT_MONSTER_IDS = new Set<string>(['well_guardian', 'archive_wisp']);

// Beast-type monsters can additionally drop leather alongside their normal
// item loot — a modest chance on a regular kill, a better chance at the rare
// "cuir supérieur" variant when the beast is a boss.
const BEAST_MONSTER_IDS = new Set<string>(['corrupted_wolf', 'alpha_wolf', 'corrupted_boar', 'corrupted_boar_alpha']);
const BEAST_LEATHER_CHANCE = 0.25;
const BEAST_BOSS_RARE_LEATHER_CHANCE = 0.5;

// Farmable crafting materials tied to dungeon tier rather than monster
// identity (see grantMaterial in victory()) — lets the Acte 2/3 "artisan"
// recipes (see recipe.ts) require real, repeatable farming instead of
// relying on rare loot RNG.
const TIER_MATERIAL: Record<2 | 3, { common: string; rare: string; commonChance: number; rareChance: number }> = {
  2: { common: 'steel_ingot', rare: 'steel_ingot_rare', commonChance: 0.25, rareChance: 0.5 },
  3: { common: 'mithril_shard', rare: 'mithril_shard_rare', commonChance: 0.25, rareChance: 0.5 },
};


const COMBAT_POTIONS: ConsumableId[] = [
  'health_potion',
  'health_potion_greater',
  'mana_potion',
  'mana_potion_greater',
  'fire_bomb',
  'antidote',
];
const COMBAT_POTION_LABELS: Record<ConsumableId, string> = {
  health_potion: 'Potion de soin',
  health_potion_greater: 'Soin supérieur',
  mana_potion: 'Potion de mana',
  mana_potion_greater: 'Mana supérieure',
  fire_bomb: 'Bombe',
  antidote: 'Antidote',
};
const MANA_POTIONS: ConsumableId[] = ['mana_potion', 'mana_potion_greater'];

const RESOURCE_BAR: Record<ResourceKind, { label: string; fill: number; light: number }> = {
  rage: { label: 'Rage', fill: PAL.O, light: PAL.o },
  mana: { label: 'Mana', fill: PAL.u, light: PAL.i },
  endurance: { label: 'End.', fill: PAL.c, light: PAL.v },
};

// Screen layout (game pixels), from the validated style A mockup
// (docs/mockups/ui3_combat.png).
const MONSTER_CENTER = { x: 152, y: 114 };
const MONSTER_SIZE = 68;
const LOG = { x: 6, y: 270, w: 204, h: 48 };
const ACTIONS_Y = 320;

interface CombatData {
  returnScene?: ReturnSceneKey;
  monsterId?: string;
  x?: number;
  y?: number;
  // Forces a specific encounter tier instead of rolling one — used by tests;
  // real gameplay never passes this, so createMonster always rolls normally.
  tier?: EncounterTier;
}

type MenuView = 'main' | 'skills' | 'potions';

export class CombatScene extends Phaser.Scene {
  private character!: Character;
  private monster!: Monster;
  private engine!: CombatEngine;
  private returnScene: ReturnSceneKey = 'Field';
  private monsterId?: string;
  private originalMonsterId = 'corrupted_wolf';
  private tier?: EncounterTier;
  private returnX?: number;
  private returnY?: number;
  private busy = false;
  private ended = false;

  private logText!: PixelText;
  private logPanel!: Phaser.GameObjects.Graphics;
  private enemyHpBar!: KitBar;
  private enemyHpText!: PixelText;
  private playerHpBar!: KitBar;
  private playerHpText!: PixelText;
  private resourceBar!: KitBar;
  private resourceText!: PixelText;
  private monsterChips!: ChipRow;
  private playerChips!: ChipRow;
  private telegraphBanner: Phaser.GameObjects.GameObject[] = [];
  private menuObjects: { destroy(): void }[] = [];
  private menuButtons: KitButton[] = [];
  private menuView: MenuView = 'main';

  constructor() {
    super('Combat');
  }

  init(data: CombatData): void {
    this.returnScene = data?.returnScene ?? 'Field';
    this.monsterId = data?.monsterId;
    this.tier = data?.tier;
    this.returnX = data?.x;
    this.returnY = data?.y;
    this.busy = false;
    this.ended = false;
    this.menuButtons = [];
    this.menuObjects = [];
    this.telegraphBanner = [];
    this.menuView = 'main';
  }

  // Runs after init() (so this.monsterId is already set) and before
  // create() — Phaser guarantees the texture is ready by the time create()
  // reads it. Falls back to the wolf (random Field encounters) to match the same
  // fallback used below, so preload and create never disagree on which
  // sprite this encounter needs.
  preload(): void {
    const id = this.monsterId ?? 'corrupted_wolf';
    this.load.image(`monster-${id}`, `${import.meta.env.BASE_URL}sprites/monsters/${id}.png`);
    preloadUiKit(this);
  }

  async create(): Promise<void> {
    centerFrame(this);
    this.cameras.main.setBackgroundColor('#1a1410');
    this.cameras.main.fadeIn(250);

    const save = await SaveManager.load();
    this.character = save!.character!;
    // Randomizer: the zone's monster is swapped for another of the same kind
    // (regular or boss), while quests still count the original one.
    this.originalMonsterId = this.monsterId ?? 'corrupted_wolf';
    const shownId = randomizedMonsterId(this.character, this.returnScene, this.originalMonsterId);
    this.monster = createMonster(
      shownId,
      this.tier,
      ZONE_LEVEL[this.returnScene],
      DIFFICULTY_RULES[difficultyOf(this.character)],
    );
    this.engine = new CombatEngine(this.character, this.monster);
    const shownKey = `monster-${shownId}`;
    if (!this.textures.exists(shownKey)) {
      await new Promise<void>((resolve) => {
        this.load.image(shownKey, `${import.meta.env.BASE_URL}sprites/monsters/${shownId}.png`);
        this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
        this.load.start();
      });
    }

    addMeadowBackdrop(this);

    // Monster: panel top left, sprite on its platform top right.
    addPanel(this, 6, 8, 136, 66);
    const nameColor = this.monster.isBoss ? INK.danger : TIER_NAME_COLOR[this.monster.tier];
    const name = panelText(this, 14, 13, this.monster.name, 10, nameColor);
    if (name.width > 120) name.setNarrow();
    // A boss reads from its red name; the line stays short next to the HP.
    const kind = `Niv. ${this.monster.level} · ${this.engine.traits.label}`;
    panelText(this, 14, 29, kind, 8);
    this.enemyHpText = panelText(this, 134, 29, '', 8).setOrigin(1, 0);
    this.enemyHpBar = new KitBar(this, 14, 44, 120, PAL.x, PAL.y);
    const weakness = panelText(this, 14, 53, this.engine.monsterWeaknessLine(), 8, INK.soft, { wordWrap: { width: 124 } });
    if (weakness.height > 12) weakness.setNarrow();
    this.monsterChips = new ChipRow(this, 8, 78, true, 140);

    if (this.monster.tier !== 'normal') {
      this.add.ellipse(MONSTER_CENTER.x, MONSTER_CENTER.y, 84, 84, TIER_ENEMY_TINT[this.monster.tier], 0.35);
    }
    const monsterKey = `monster-${this.monster.id}`;
    if (this.textures.exists(monsterKey)) {
      // The painted monster redrawn at its display size (sharp pixels).
      this.add.image(MONSTER_CENTER.x, MONSTER_CENTER.y, crispIcon(this, monsterKey, MONSTER_SIZE));
    } else {
      // Missing sprite (shouldn't happen for a real monster id, but keeps a
      // fresh id added to monster.ts without matching art from crashing the
      // scene instead of just looking plain).
      this.add.rectangle(MONSTER_CENTER.x, MONSTER_CENTER.y, 64, 64, TIER_ENEMY_TINT[this.monster.tier]);
    }

    // Hero seen from behind (its own sprite at the interface's 2x), bottom
    // left, and the hero panel beside it.
    this.add
      .image(58, 264, heroTextures(this, this.character).sheet, idleFrame('up'))
      .setOrigin(0.5, HERO_FEET_Y / HERO_FRAME_H)
      .setScale(2);
    addPanel(this, 100, 180, 110, 86);
    panelText(this, 108, 186, CLASSES[this.character.class].label, 10);
    panelText(this, 202, 187, `Niv. ${this.character.level}`, 8).setOrigin(1, 0);
    panelText(this, 108, 202, 'PV', 8);
    this.playerHpBar = new KitBar(this, 128, 205, 74, PAL.h, PAL.H);
    this.playerHpText = panelText(this, 202, 213, '', 7).setOrigin(1, 0);
    const resource = RESOURCE_BAR[this.engine.kind];
    panelText(this, 108, 222, resource.label, 8);
    this.resourceBar = new KitBar(this, 128, 225, 74, resource.fill, resource.light);
    this.resourceText = panelText(this, 202, 233, '', 7).setOrigin(1, 0);
    this.playerChips = new ChipRow(this, 108, 244, false, 98);

    this.logPanel = addPanel(this, LOG.x, LOG.y, LOG.w, LOG.h);
    this.logText = panelText(this, 108, LOG.y + LOG.h / 2, '', 9, INK.text, {
      align: 'center',
      wordWrap: { width: LOG.w - 20 },
    }).setOrigin(0.5);
    this.setLog(`Un ${this.monster.name.toLowerCase()} ${TIER_APPEARANCE_MESSAGE[this.monster.tier]} !`);

    this.showMenu('main');
    this.refreshBars();

    if (this.engine.monsterFirst) {
      this.busy = true;
      this.disableMenu();
      this.setLog(`${this.logText.text} Il est plus rapide que vous !`);
      this.time.delayedCall(1100, () => this.enemyTurn());
    }
  }

  // The log keeps to its panel: long turns shrink the text a step or two.
  private setLog(message: string): void {
    const maxHeight = (this.logPanelHeight ?? LOG.h) - 12;
    for (const size of [9, 8, 7]) {
      this.logText.setFontSize(Math.round(size * 1.2));
      this.logText.setText(message);
      if (this.logText.height <= maxHeight) break;
    }
  }

  private logPanelHeight?: number;

  private resizeLog(height: number): void {
    this.logPanelHeight = height;
    this.logPanel.clear();
    drawPanel(this.logPanel, LOG.x, LOG.y, LOG.w, height);
    this.logText.setY(LOG.y + height / 2);
    this.logPanel.setVisible(true);
    this.logText.setVisible(true);
  }

  // ---------------------------------------------------------------- menus

  private clearMenu(): void {
    this.menuButtons.forEach((button) => button.destroy());
    this.menuObjects.forEach((o) => o.destroy());
    this.menuButtons = [];
    this.menuObjects = [];
  }

  private button(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    onClick: () => void,
    options: { icon?: string; size?: number; cost?: string; enabled?: boolean; align?: 'left' | 'center' } = {},
  ): KitButton {
    const button = new KitButton(this, x, y, w, h, label, {
      icon: options.icon,
      size: options.size,
      cost: options.cost,
      align: options.align,
      state: options.enabled === false ? 'disabled' : 'normal',
      onClick,
    });
    this.menuButtons.push(button);
    return button;
  }

  private ownedPotions(): ConsumableId[] {
    return COMBAT_POTIONS.filter(
      (id) => (this.character.consumables[id] ?? 0) > 0 && (!MANA_POTIONS.includes(id) || this.engine.kind === 'mana'),
    );
  }

  // Skills and items open in a panel that covers the log and the buttons.
  private submenuPanel(title: string): void {
    this.logPanel.setVisible(false);
    this.logText.setVisible(false);
    this.menuObjects.push(addPanel(this, 6, 270, 204, 114));
    this.menuObjects.push(panelText(this, 108, 276, title, 9).setOrigin(0.5, 0));
  }

  private showMenu(view: MenuView): void {
    this.clearMenu();
    this.menuView = view;
    if (this.ended) return;

    if (view === 'main') {
      this.logPanel.setVisible(true);
      this.logText.setVisible(true);
      this.button(6, ACTIONS_Y, 102, 28, 'Attaquer', () => this.playerAttack(), { icon: 'sword' });
      this.button(108, ACTIONS_Y, 102, 28, 'Compétences', () => this.showMenu('skills'), { icon: 'star', size: 9 });
      this.button(6, ACTIONS_Y + 32, 102, 28, 'Objets', () => this.openPotions(), {
        icon: 'potion',
        enabled: this.ownedPotions().length > 0,
      });
      this.button(108, ACTIONS_Y + 32, 102, 28, 'Fuir', () => this.flee(), { icon: 'run', enabled: !this.monster.isBoss });
      return;
    }

    if (view === 'skills') {
      this.submenuPanel('Compétences');
      const skills = this.character.equippedSkills ?? [];
      skills.forEach((id, i) => {
        const availability = this.engine.skillAvailability(id);
        const x = i % 2 === 0 ? 12 : 110;
        const y = 292 + Math.floor(i / 2) * 28;
        this.button(x, y, 94, 26, TALENTS[id].name, () => this.useSkill(id), {
          size: 8,
          cost: availability.cost > 0 ? `${availability.cost}` : '',
          enabled: availability.usable,
        });
      });
      if (skills.length === 0) {
        this.menuObjects.push(panelText(this, 108, 310, 'Aucune compétence équipée (menu Talents).', 8, INK.soft).setOrigin(0.5));
      }
      this.button(60, 350, 96, 24, 'Retour', () => this.showMenu('main'), { size: 9, align: 'center' });
      return;
    }

    this.submenuPanel('Objets');
    this.ownedPotions().forEach((id, i) => {
      const x = i % 2 === 0 ? 12 : 110;
      const y = 290 + Math.floor(i / 2) * 24;
      this.button(x, y, 94, 22, COMBAT_POTION_LABELS[id], () => this.usePotion(id), {
        size: 8,
        cost: `×${this.character.consumables[id]}`,
      });
    });
    this.button(60, 362, 96, 20, 'Retour', () => this.showMenu('main'), { size: 9, align: 'center' });
  }

  private openPotions(): void {
    if (this.busy || this.ended) return;
    if (this.ownedPotions().length === 0) {
      toast(this, 108, 150, "Vous n'avez aucun objet utilisable.");
      return;
    }
    this.showMenu('potions');
  }

  private disableMenu(): void {
    this.menuButtons.forEach((button) => button.setEnabled(false).setState('disabled'));
  }

  // --------------------------------------------------------------- display

  private refreshStatusLine(): void {
    this.monsterChips.set(this.engine.monsterChips());
    this.playerChips.set(this.engine.playerChips());
    this.refreshTelegraph();
  }

  // The boss's announced heavy blow, impossible to miss.
  private refreshTelegraph(): void {
    this.telegraphBanner.forEach((o) => o.destroy());
    this.telegraphBanner = [];
    if (!this.engine.monsterTelegraphing() || this.ended) return;
    const g = this.add.graphics();
    g.fillStyle(PAL.k, 1).fillRect(88, 156, 124, 22);
    g.fillStyle(PAL.X, 1).fillRect(90, 158, 120, 18);
    g.fillStyle(PAL.x, 1).fillRect(90, 158, 120, 2);
    const text = panelText(this, 150, 167, 'PREND SON ÉLAN !', 8, INK.gold, {
      shadow: { offsetX: 1, offsetY: 1, color: '#221c29', fill: true },
    }).setOrigin(0.5);
    this.telegraphBanner = [g, text];
  }

  private refreshBars(): void {
    this.enemyHpBar.set(this.monster.hp / this.monster.maxHp);
    this.enemyHpText.setText(`${Math.max(0, this.monster.hp)}/${this.monster.maxHp}`);
    this.playerHpBar.set(this.character.hp / this.character.maxHp);
    this.playerHpText.setText(`${Math.max(0, this.character.hp)}/${this.character.maxHp}`);
    this.resourceBar.set(this.engine.resource / Math.max(1, this.engine.resourceMax));
    this.resourceText.setText(`${this.engine.resource}/${this.engine.resourceMax}`);
    this.refreshStatusLine();
  }

  // --------------------------------------------------------------- actions

  private playerAttack(): void {
    this.runAction(() => this.engine.attack());
  }

  private useSkill(id: string): void {
    this.runAction(() => this.engine.useSkill(id));
  }

  private usePotion(id: ConsumableId): void {
    this.runAction(() => this.engine.usePotion(id));
  }

  private runAction(action: () => ActionResult): void {
    if (this.busy || this.ended) return;
    const result = action();
    if (!result.endsTurn) {
      // Unusable skill (a bubble explains why) or a free action.
      if (result.log) toast(this, 108, 150, result.log, result.hit ? INK.text : INK.danger);
      this.refreshBars();
      this.showMenu(this.menuView);
      return;
    }
    this.busy = true;
    this.disableMenu();
    this.setLog(result.log);
    this.refreshBars();
    if (result.hit) playHit();
    if (result.victory) {
      this.time.delayedCall(600, () => this.victory());
      return;
    }
    this.time.delayedCall(900, () => this.enemyTurn());
  }

  private enemyTurn(): void {
    const result = this.engine.monsterTurn();
    this.setLog(result.log);
    this.refreshBars();
    if (result.hit) playHit();
    if (result.outcome === 'victory') {
      this.time.delayedCall(600, () => this.victory());
      return;
    }
    if (result.outcome === 'defeat') {
      this.time.delayedCall(600, () => this.defeat());
      return;
    }
    if (this.engine.consumePlayerStun()) {
      this.time.delayedCall(900, () => {
        this.setLog('Vous êtes étourdi et perdez votre tour !');
        this.refreshBars();
        this.time.delayedCall(900, () => this.enemyTurn());
      });
      return;
    }
    this.busy = false;
    this.showMenu('main');
  }

  private async flee(): Promise<void> {
    if (this.busy || this.ended) return;
    if (this.monster.isBoss) {
      toast(this, 108, 150, 'Impossible de fuir face à un tel adversaire !');
      return;
    }
    this.busy = true;
    this.disableMenu();
    if (!this.engine.tryFlee()) {
      this.setLog('Vous ne parvenez pas à fuir !');
      this.time.delayedCall(900, () => this.enemyTurn());
      return;
    }
    this.setLog('Vous prenez la fuite.');
    // Without this save, fleeing reloaded the pre-fight save: HP lost and
    // potions drunk during the fight were silently handed back.
    await SaveManager.saveCharacter(this.character);
    this.time.delayedCall(500, () => this.leaveTo(this.returnScene));
  }

  private async victory(): Promise<void> {
    this.ended = true;
    this.clearMenu();
    this.engine.statuses = {};
    this.refreshStatusLine();
    const goldReward = this.engine.goldReward();
    const levelBefore = this.character.level;
    const levelsGained = grantXp(this.character, this.monster.xpReward);
    // A level-up already refilled everything; otherwise a victory restores
    // a quarter of max HP.
    const hpBeforeHeal = this.character.hp;
    if (levelsGained === 0) {
      this.character.hp = Math.min(this.character.maxHp, this.character.hp + Math.round(this.character.maxHp * VICTORY_HEAL));
    }
    const victoryHeal = this.character.hp - hpBeforeHeal;
    this.character.gold += goldReward;

    const lootTier = DUNGEON_LOOT_TIER[this.returnScene] ?? 1;
    const loot: Item | null = this.monster.isBoss
      ? rollLootItem({ guaranteed: true, rareChance: 0.5, epicChance: 0.15, tier: lootTier })
      : this.monster.tier === 'legendary'
        ? rollLootItem({ guaranteed: true, rareChance: 0.25, epicChance: 0.5, legendaryChance: 0.05, tier: lootTier })
        : this.monster.tier === 'elite'
          ? rollLootItem({ guaranteed: true, rareChance: 0.5, epicChance: 0.15, tier: lootTier })
          : GUARANTEED_LOOT_MONSTER_IDS.has(this.monster.id)
            ? rollLootItem({ guaranteed: true, rareChance: 0.3, tier: lootTier })
            : rollLootItem({ tier: lootTier });
    if (loot) {
      this.character.inventory.push(loot);
    }

    const signature = this.signatureReward();
    const signatureItem = signature ? createItem(signature.baseId, signature.rarity) : null;
    if (signatureItem) {
      this.character.inventory.push(signatureItem);
    }

    const materialDrops: string[] = [];
    const grantMaterial = (materialId: string | null) => {
      if (!materialId) return;
      this.character.materials[materialId] = (this.character.materials[materialId] ?? 0) + 1;
      materialDrops.push(materialId);
    };

    if (BEAST_MONSTER_IDS.has(this.monster.id)) {
      grantMaterial(
        this.monster.isBoss
          ? Math.random() < BEAST_BOSS_RARE_LEATHER_CHANCE
            ? 'leather_rare'
            : null
          : Math.random() < BEAST_LEATHER_CHANCE
            ? 'leather'
            : null,
      );
    }

    // Every fight in a tier-2/3 dungeon has a chance to drop that tier's
    // crafting material, independent of monster identity — ties farming
    // directly to "fight in the right zone" rather than a curated monster
    // list, which would otherwise miss reused monster ids that also appear
    // in earlier-tier zones (e.g. corrupted_knight spans tiers 2 and 3).
    const tierMaterial = TIER_MATERIAL[lootTier as 2 | 3];
    if (tierMaterial) {
      grantMaterial(
        this.monster.isBoss
          ? Math.random() < tierMaterial.rareChance
            ? tierMaterial.rare
            : null
          : Math.random() < tierMaterial.commonChance
            ? tierMaterial.common
            : null,
      );
    }

    const completedQuests = advanceQuestsOnDefeat(this.character, this.originalMonsterId);
    const mainQuestAdvanced = advanceMainQuestOnBossDefeat(this.character, this.originalMonsterId);

    await SaveManager.saveCharacter(this.character);
    this.refreshBars();

    const talentGain = talentPointsTotal(this.character.level) - talentPointsTotal(levelBefore);
    const levelPart =
      levelsGained > 0
        ? ` Niveau ${this.character.level} : +${3 * levelsGained} points de statistique` +
          (talentGain > 0 ? `, +${talentGain} point${talentGain > 1 ? 's' : ''} de talent !` : ' !')
        : '';
    const healPart = victoryHeal > 0 ? ` +${victoryHeal} PV.` : '';
    const xpPart = `Victoire ! +${this.monster.xpReward} XP, +${goldReward} or.${levelPart}${healPart}`;
    const lootPart = loot ? ` Butin : ${loot.name} (${RARITY_LABELS[loot.rarity]}).` : '';
    const signaturePart = signatureItem ? ` Récompense unique : ${signatureItem.name} !` : '';
    const materialPart =
      materialDrops.length > 0
        ? ` Ressource${materialDrops.length > 1 ? 's récupérées' : ' récupérée'} : ${materialDrops
            .map((id) => materialLabel(id))
            .join(', ')}.`
        : '';
    const questPart =
      completedQuests.length > 0 ? ` Quête "${completedQuests[0].title}" terminée !` : '';
    const mainQuestPart = mainQuestAdvanced ? ' La marque à votre poignet palpite soudain...' : '';
    this.setLog(xpPart + lootPart + signaturePart + materialPart + questPart + mainQuestPart);
    if (levelsGained > 0) {
      playLevelUp();
    } else {
      playVictory();
    }
    this.showContinue(() => this.leaveTo(this.returnScene));
  }

  private async defeat(): Promise<void> {
    this.ended = true;
    this.clearMenu();
    playDefeat();
    if (this.character.permadeath) {
      // Mort définitive: the save is gone, the run ends on its epitaph.
      const epitaph = {
        race: this.character.race,
        charClass: this.character.class,
        level: this.character.level,
        monster: this.monster.name,
        scene: this.returnScene,
        mode: modeLabel(this.character),
        // The outfit the hero fell in, for the epitaph's portrait.
        look: heroLook(this.character),
      };
      await SaveManager.deleteSave();
      this.setLog(`${this.monster.name} vous terrasse. Votre aventure s'achève ici.`);
      this.showContinue(() => {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('GameOver', epitaph));
      });
      return;
    }
    const rules = DIFFICULTY_RULES[difficultyOf(this.character)];
    this.character.hp = Math.max(1, Math.floor(this.character.maxHp * 0.2));
    const goldLost = Math.floor(this.character.gold * rules.defeatGoldLoss);
    this.character.gold -= goldLost;
    const xpLost = rules.defeatLosesXp ? this.character.xp : 0;
    if (rules.defeatLosesXp) this.character.xp = 0;
    await SaveManager.saveCharacter(this.character);
    const losses = [goldLost > 0 ? `${goldLost} pièces d'or` : '', xpLost > 0 ? `${xpLost} XP` : ''].filter(Boolean);
    this.setLog(
      losses.length > 0
        ? `Vous avez été vaincu... Vous perdez ${losses.join(' et ')} et êtes ramené au hameau.`
        : 'Vous avez été vaincu... et ramené au hameau.',
    );
    this.showContinue(() => this.leaveTo('Hamlet'));
  }

  // The zone's unique boss reward; the Randomizer shuffles which boss
  // carries which (fixed for the whole playthrough).
  private signatureReward(): { baseId: string; rarity: Rarity } | undefined {
    const seed = this.character.randomizerSeed;
    if (seed === undefined) return SIGNATURE_REWARDS[this.originalMonsterId];
    const keys = Object.keys(SIGNATURE_REWARDS);
    const index = keys.indexOf(this.originalMonsterId);
    if (index < 0) return undefined;
    const rewards = seededShuffle(seed, 'signature', keys.map((k) => SIGNATURE_REWARDS[k]));
    return rewards[index];
  }

  // End of the fight: a taller log for the rewards, one big button.
  private showContinue(onClick: () => void): void {
    this.clearMenu();
    this.refreshTelegraph();
    this.resizeLog(78);
    const button = new KitButton(this, 6, 352, 204, 28, 'Continuer', { size: 11, align: 'center', onClick });
    this.menuButtons.push(button);
  }

  private leaveTo(sceneKey: ReturnSceneKey): void {
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      // Only carry the pre-fight position back when returning to the same
      // scene the fight started in (Field/Dungeon) — on defeat we're sent to
      // a different scene entirely (Hamlet), where that position is
      // meaningless, so it falls back to that scene's own default spawn.
      // returnSceneStartData also sets resume:true for Dungeon, so a fight
      // round trip there doesn't wipe cleared-encounter progress.
      const data =
        sceneKey === this.returnScene
          ? returnSceneStartData(sceneKey, this.returnX, this.returnY)
          : returnSceneStartData(sceneKey);
      this.scene.start(sceneKey, data);
    });
  }
}
