import Phaser from 'phaser';
import { Character, CharClass, CharacterStats, grantXp, getEffectiveStats } from '../game/character';
import { Monster, EncounterTier, createTestMonster, createMonster } from '../game/monster';
import { Item, Rarity, RARITY_LABELS, WeaponType, rollLootItem, createItem } from '../game/item';
import { advanceQuestsOnDefeat } from '../game/quest';
import { advanceMainQuestOnBossDefeat } from '../game/mainQuest';
import { CONSUMABLES, useConsumable } from '../game/consumable';
import { materialLabel } from '../game/material';
import { SaveManager } from '../save/SaveManager';
import { ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { DUNGEON_LOOT_TIER } from '../game/worldMap';
import { addCrispText } from '../ui/text';
import { playHit, playVictory, playLevelUp, playDefeat } from '../ui/sound';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';
const BAR_WIDTH = 160;

// Reuses the same colors as item rarity (RARITY_COLORS) so the player reads
// "élite"/"légendaire" the same way they already read rare/épique loot,
// instead of learning a second color code.
const TIER_NAME_COLOR: Record<EncounterTier, string> = {
  normal: GOLD,
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

// Which CharacterStats field a weapon's damage scales from, by WeaponType
// (see item.ts's WeaponType comment). A bow always hits with Agilité even
// in a Guerrier's hands — only the profile match below changes how much of
// that scaling actually lands.
const WEAPON_SCALING_STAT: Record<WeaponType, keyof CharacterStats> = {
  sword: 'strength',
  axe: 'strength',
  bow: 'agility',
  dagger: 'agility',
  staff: 'intelligence',
  tome: 'intelligence',
};

// Each class is fully trained on one or two related weapon types; anything
// else still works (no hard equip restriction — a mage CAN pick up a
// sword) but deals reduced damage, so "un archer avec une épée tape moins
// qu'avec un arc" holds without needing a dedicated equip-validation
// system. Warrior covers both sword and axe (same scaling stat, still two
// distinct weapon types — see item.ts's WeaponType comment on why they're
// split at all); mage/cleric likewise cover both staff and tome.
const CLASS_WEAPON_PROFILE: Record<CharClass, WeaponType[]> = {
  warrior: ['sword', 'axe'],
  mage: ['staff', 'tome'],
  archer: ['bow'],
  rogue: ['dagger'],
  cleric: ['staff', 'tome'],
};

// Applied to the weapon-derived portion of damage only (not the flat 2-5
// random base every class deals regardless of gear) when the equipped
// weapon's type isn't the wielder's class profile.
const OFF_PROFILE_WEAPON_MULTIPLIER = 0.7;

// Farmable crafting materials tied to dungeon tier rather than monster
// identity (see grantMaterial in victory()) — lets the Acte 2/3 "artisan"
// recipes (see recipe.ts) require real, repeatable farming instead of
// relying on rare loot RNG.
const TIER_MATERIAL: Record<2 | 3, { common: string; rare: string; commonChance: number; rareChance: number }> = {
  2: { common: 'steel_ingot', rare: 'steel_ingot_rare', commonChance: 0.25, rareChance: 0.5 },
  3: { common: 'mithril_shard', rare: 'mithril_shard_rare', commonChance: 0.25, rareChance: 0.5 },
};

interface CombatData {
  returnScene?: ReturnSceneKey;
  monsterId?: string;
  x?: number;
  y?: number;
  // Forces a specific encounter tier instead of rolling one — used by tests;
  // real gameplay never passes this, so createMonster always rolls normally.
  tier?: EncounterTier;
}

export class CombatScene extends Phaser.Scene {
  private character!: Character;
  private monster!: Monster;
  private returnScene: ReturnSceneKey = 'Field';
  private monsterId?: string;
  private tier?: EncounterTier;
  private returnX?: number;
  private returnY?: number;
  private busy = false;
  private ended = false;

  private logText!: Phaser.GameObjects.Text;
  private enemyHpFill!: Phaser.GameObjects.Rectangle;
  private enemyHpText!: Phaser.GameObjects.Text;
  private playerHpFill!: Phaser.GameObjects.Rectangle;
  private playerHpText!: Phaser.GameObjects.Text;
  private playerMpFill!: Phaser.GameObjects.Rectangle;
  private playerMpText!: Phaser.GameObjects.Text;
  private actionButtons: Phaser.GameObjects.Text[] = [];
  private continueButton?: Phaser.GameObjects.Text;
  private potionButton?: Phaser.GameObjects.Text;

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
    this.actionButtons = [];
    this.continueButton = undefined;
  }

  async create(): Promise<void> {
    const { width } = this.scale;
    this.cameras.main.setBackgroundColor('#1a1410');
    this.cameras.main.fadeIn(250);

    const save = await SaveManager.load();
    this.character = save!.character!;
    this.monster = this.monsterId ? createMonster(this.monsterId, this.tier) : createTestMonster();

    addCrispText(this, width / 2, 34, this.monster.name, {
      fontSize: '15px',
      color: TIER_NAME_COLOR[this.monster.tier],
    }).setOrigin(0.5);

    this.add.rectangle(width / 2, 90, 64, 64, TIER_ENEMY_TINT[this.monster.tier]).setStrokeStyle(1, 0x2e1414);

    const enemyBarX = width / 2 - BAR_WIDTH / 2;
    this.add.rectangle(enemyBarX, 136, BAR_WIDTH, 10, 0x33261f).setOrigin(0, 0.5);
    this.enemyHpFill = this.add.rectangle(enemyBarX, 136, BAR_WIDTH, 10, 0x8a3a3a).setOrigin(0, 0.5);
    this.enemyHpText = addCrispText(this, width / 2, 150, '', { fontSize: '9px', color: MUTED }).setOrigin(0.5);

    addCrispText(this, width / 2, 190, this.characterLabel(), {
      fontSize: '11px',
      color: GOLD,
    }).setOrigin(0.5);

    const playerBarX = width / 2 - BAR_WIDTH / 2;
    addCrispText(this, playerBarX, 208, 'PV', { fontSize: '9px', color: MUTED });
    this.add.rectangle(playerBarX + 24, 213, BAR_WIDTH - 24, 10, 0x1f2a1f).setOrigin(0, 0.5);
    this.playerHpFill = this.add.rectangle(playerBarX + 24, 213, BAR_WIDTH - 24, 10, 0x4a8a4a).setOrigin(0, 0.5);
    this.playerHpText = addCrispText(this, width / 2 + BAR_WIDTH / 2 + 6, 213, '', {
      fontSize: '9px',
      color: MUTED,
    }).setOrigin(0, 0.5);

    addCrispText(this, playerBarX, 228, 'PM', { fontSize: '9px', color: MUTED });
    this.add.rectangle(playerBarX + 24, 233, BAR_WIDTH - 24, 10, 0x1f1f2a).setOrigin(0, 0.5);
    this.playerMpFill = this.add.rectangle(playerBarX + 24, 233, BAR_WIDTH - 24, 10, 0x4a4a8a).setOrigin(0, 0.5);
    this.playerMpText = addCrispText(this, width / 2 + BAR_WIDTH / 2 + 6, 233, '', {
      fontSize: '9px',
      color: MUTED,
    }).setOrigin(0, 0.5);

    this.logText = addCrispText(
      this,
      width / 2,
      270,
      `Un ${this.monster.name.toLowerCase()} ${TIER_APPEARANCE_MESSAGE[this.monster.tier]} !`,
      {
        fontSize: '10px',
        color: GOLD,
        align: 'center',
        wordWrap: { width: width - 24 },
      },
    ).setOrigin(0.5);

    this.createActionButton(width / 2 - 55, 330, 'Attaquer', () => this.playerAttack());
    this.createActionButton(width / 2 + 55, 330, 'Fuir', () => this.flee());

    if ((this.character.consumables.health_potion ?? 0) > 0) {
      this.potionButton = this.createActionButton(width / 2, 302, 'Potion de soin', () => this.usePotion());
    }

    this.refreshBars();
  }

  private characterLabel(): string {
    return `Niveau ${this.character.level}`;
  }

  private createActionButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Text {
    const button = addCrispText(this, x, y, label, {
      fontSize: '12px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 10, y: 6 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on('pointerdown', onClick);
    this.actionButtons.push(button);
    return button;
  }

  private setActionsEnabled(enabled: boolean): void {
    this.actionButtons.forEach((button) => {
      button.input!.enabled = enabled;
      button.setAlpha(enabled ? 1 : 0.5);
    });
  }

  private hideActions(): void {
    this.actionButtons.forEach((button) => button.setVisible(false));
  }

  private refreshBars(): void {
    this.enemyHpFill.width = BAR_WIDTH * Math.max(0, this.monster.hp / this.monster.maxHp);
    this.enemyHpText.setText(`${Math.max(0, this.monster.hp)}/${this.monster.maxHp}`);

    const hpWidth = BAR_WIDTH - 24;
    this.playerHpFill.width = hpWidth * Math.max(0, this.character.hp / this.character.maxHp);
    this.playerHpText.setText(`${Math.max(0, this.character.hp)}/${this.character.maxHp}`);
    this.playerMpFill.width = hpWidth * Math.max(0, this.character.mp / this.character.maxMp);
    this.playerMpText.setText(`${Math.max(0, this.character.mp)}/${this.character.maxMp}`);
  }

  private playerAttack(): void {
    if (this.busy || this.ended) return;
    this.busy = true;
    this.setActionsEnabled(false);

    const stats = getEffectiveStats(this.character);
    const weaponType = this.character.equipment.weapon?.weaponType;
    // No weapon equipped falls back to a neutral Force scaling with no
    // profile penalty — bare fists don't punish a class for having nothing
    // equipped on top of already dealing no weapon-line stats.
    const scalingStat: keyof CharacterStats = weaponType ? WEAPON_SCALING_STAT[weaponType] : 'strength';
    const inProfile = !weaponType || CLASS_WEAPON_PROFILE[this.character.class].includes(weaponType);
    const weaponDamage = Math.floor(stats[scalingStat] / 2) * (inProfile ? 1 : OFF_PROFILE_WEAPON_MULTIPLIER);
    const baseDamage = Phaser.Math.Between(2, 5) + Math.round(weaponDamage);
    const elementalDamage =
      stats.fireDamage + stats.poisonDamage + stats.iceDamage + stats.electricDamage + stats.darkDamage + stats.earthDamage;
    const damage = baseDamage + elementalDamage;
    this.monster.hp -= damage;
    if (stats.lifeSteal > 0) {
      this.character.hp = Math.min(this.character.maxHp, this.character.hp + stats.lifeSteal);
    }
    this.refreshBars();
    playHit();
    const elementalParts: string[] = [];
    if (stats.fireDamage > 0) elementalParts.push(`${stats.fireDamage} de feu`);
    if (stats.poisonDamage > 0) elementalParts.push(`${stats.poisonDamage} de poison`);
    if (stats.iceDamage > 0) elementalParts.push(`${stats.iceDamage} de glace`);
    if (stats.electricDamage > 0) elementalParts.push(`${stats.electricDamage} électriques`);
    if (stats.darkDamage > 0) elementalParts.push(`${stats.darkDamage} obscurs`);
    if (stats.earthDamage > 0) elementalParts.push(`${stats.earthDamage} de terre`);
    const lifeStealPart = stats.lifeSteal > 0 ? ` Vous drainez ${stats.lifeSteal} PV.` : '';
    this.logText.setText(
      (elementalParts.length > 0
        ? `Vous infligez ${damage} dégâts (dont ${elementalParts.join(', ')}).`
        : `Vous infligez ${damage} dégâts.`) + lifeStealPart,
    );

    if (this.monster.hp <= 0) {
      this.time.delayedCall(600, () => this.victory());
      return;
    }

    this.time.delayedCall(900, () => this.enemyTurn());
  }

  private enemyTurn(): void {
    const armor = getEffectiveStats(this.character).armor;
    const rawAttack = this.monster.attack + Phaser.Math.Between(-1, 2);
    // Armor can mitigate at most 60% of the monster's base attack — a tier-3
    // character stacks armor from several equipped slots at once (helmet/
    // chest/legs/boots/shield/gloves all roll it), which under plain flat
    // subtraction could exceed any boss's attack stat outright and floor
    // every hit to the 1-damage minimum, making a fully-geared player
    // unkillable regardless of the fight. Capping how much of an attack
    // armor can ever cancel keeps the flat-subtraction feel identical to
    // before for any reasonable armor total (the cap only engages once
    // armor already exceeds 60% of the attack it's mitigating) while
    // guaranteeing late-game fights keep some real risk no matter how much
    // armor is stacked.
    const effectiveArmor = Math.min(armor, this.monster.attack * 0.6);
    const damage = Math.max(1, Math.round(rawAttack - effectiveArmor));
    this.character.hp = Math.max(0, this.character.hp - damage);
    this.refreshBars();
    playHit();
    this.logText.setText(`${this.monster.name} vous inflige ${damage} dégâts.`);

    if (this.character.hp <= 0) {
      this.time.delayedCall(600, () => this.defeat());
      return;
    }

    this.busy = false;
    this.setActionsEnabled(true);
  }

  private usePotion(): void {
    if (this.busy || this.ended) return;
    if ((this.character.consumables.health_potion ?? 0) <= 0) return;
    this.busy = true;
    this.setActionsEnabled(false);

    useConsumable(this.character, 'health_potion');
    this.refreshBars();
    this.logText.setText(`Vous buvez une ${CONSUMABLES.health_potion.name.toLowerCase()}.`);
    if ((this.character.consumables.health_potion ?? 0) <= 0) {
      this.potionButton?.setVisible(false);
    }

    this.time.delayedCall(900, () => this.enemyTurn());
  }

  private flee(): void {
    if (this.busy || this.ended) return;
    this.busy = true;
    this.setActionsEnabled(false);
    this.logText.setText('Vous prenez la fuite.');
    this.time.delayedCall(500, () => this.leaveTo(this.returnScene));
  }

  private async victory(): Promise<void> {
    this.ended = true;
    this.hideActions();
    const levelsGained = grantXp(this.character, this.monster.xpReward);
    this.character.gold += this.monster.goldReward;

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

    const signature = SIGNATURE_REWARDS[this.monster.id];
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

    const completedQuests = advanceQuestsOnDefeat(this.character, this.monster.id);
    const mainQuestAdvanced = advanceMainQuestOnBossDefeat(this.character, this.monster.id);

    await SaveManager.saveCharacter(this.character);
    this.refreshBars();

    const xpPart =
      levelsGained > 0
        ? `Victoire ! +${this.monster.xpReward} XP, +${this.monster.goldReward} or — niveau supérieur !`
        : `Victoire ! +${this.monster.xpReward} XP, +${this.monster.goldReward} or`;
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
    this.logText.setText(xpPart + lootPart + signaturePart + materialPart + questPart + mainQuestPart);
    if (levelsGained > 0) {
      playLevelUp();
    } else {
      playVictory();
    }
    this.showContinue(() => this.leaveTo(this.returnScene));
  }

  private async defeat(): Promise<void> {
    this.ended = true;
    this.hideActions();
    this.character.hp = Math.max(1, Math.floor(this.character.maxHp * 0.2));
    await SaveManager.saveCharacter(this.character);
    playDefeat();
    this.logText.setText('Vous avez été vaincu... et ramené au hameau.');
    this.showContinue(() => this.leaveTo('Hamlet'));
  }

  private showContinue(onClick: () => void): void {
    this.continueButton = addCrispText(this, this.scale.width / 2, 330, 'Continuer', {
      fontSize: '12px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 10, y: 6 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.continueButton.on('pointerdown', onClick);
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
