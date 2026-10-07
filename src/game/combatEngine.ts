import { Character, CharacterStats, RACES, getEffectiveStats } from './character';
import type { Monster } from './monster';
import type { Item, WeaponType } from './item';
import {
  BARE_SPELL_PROFILE,
  OFFHAND_HIT_MULTIPLIER,
  SHIELD_BLOCK_CHANCE,
  SPELL_STAT_SCALING,
  TOME_SPELL_BONUS,
  WEAPON_STAT_SCALING,
  WEAPON_PROFILES,
  WeaponProfile,
  isMeleeHandItem,
  weaponProfile,
} from './weapons';
import { CONSUMABLES, ConsumableId, bombBurnDamage, bombDamage, useConsumable } from './consumable';
import {
  ActiveStatus,
  FROZEN_ATTACK_MULTIPLIER,
  MonsterStatusId,
  MonsterStatuses,
  StatusMods,
  VULNERABLE_DAMAGE_MULTIPLIER,
  WEAKENED_ATTACK_MULTIPLIER,
  applyStatus,
  burnStatus,
  consumeStatus,
  describeApplied,
  freezeStatus,
  poisonStatus,
  rollElementStatuses,
  statusLine,
  tickDamageOverTime,
} from './combatStatus';
import {
  ABILITY_LABELS,
  AttackElement,
  ELEMENT_LABELS,
  ELITE_BONUS_POOL,
  MonsterAbility,
  MonsterKit,
  PASSIVE_ABILITIES,
  RESISTANCE_MULTIPLIER,
  TYPE_TRAITS,
  TypeTraits,
  WEAKNESS_MULTIPLIER,
  monsterKit,
  monsterSpeed,
} from './monsterKit';
import {
  ActiveTalent,
  CLASS_RESOURCE,
  ENDURANCE_REGEN_PER_TURN,
  MANA_REGEN_PER_TURN,
  RAGE_MAX,
  RAGE_PER_ATTACK,
  RAGE_PER_HIT_TAKEN,
  REQUIREMENT_LABELS,
  RESOURCE_LABELS,
  ResourceKind,
  TALENTS,
  enduranceMax,
  talentRank,
} from './talents';

// The whole fight's rules, with no rendering: CombatScene drives it and
// shows the log lines it returns. Kept free of Phaser so the balancing step
// can simulate thousands of fights headlessly. Every random roll goes
// through `rng`, which tests can replace.
//
// Durations follow one rule: an offensive bonus lasts for the player's next
// N actions, a defensive one for the monster's next N attacks. Monster states
// are consumed when they act (see combatStatus.ts).

// Combat tuning (Normal difficulty — the other modes come after balancing).
export const BASE_CRIT_CHANCE = 0.05;
export const CRIT_MULTIPLIER = 1.5;
export const KILLER_CRIT_MULTIPLIER = 1.8;
export const DEFEAT_GOLD_LOSS = 0.2;

// 1% per point of Agilité plus talent bonuses, capped so dodging can never
// become the whole strategy (Pas de côté raises the cap to 40%).
export function dodgeChance(agility: number, bonus = 0, cap = 0.3): number {
  return Math.min(cap, Math.max(0, agility) * 0.01 + bonus);
}

export function fleeChance(agility: number): number {
  return Math.min(0.9, 0.5 + Math.max(0, agility) * 0.02);
}

export interface PlayerEffects {
  shield: number;
  // The current shield comes from Barrière de glace (for Cœur de glace).
  iceShield: boolean;
  stance: number;
  berserk: number;
  blessing: number;
  overload: number;
  huntersShadow: number;
  regenTurns: number;
  regenPct: number;
  coatedBlade: number;
  nextCrit: boolean;
  guaranteedDodge: boolean;
  chainDiscount: boolean;
  lastBastionUsed: boolean;
  graceUsed: boolean;
  determinationUsed: boolean;
  hasHit: boolean;
}

function freshEffects(): PlayerEffects {
  return {
    shield: 0,
    iceShield: false,
    stance: 0,
    berserk: 0,
    blessing: 0,
    overload: 0,
    huntersShadow: 0,
    regenTurns: 0,
    regenPct: 0,
    coatedBlade: 0,
    nextCrit: false,
    guaranteedDodge: false,
    chainDiscount: false,
    lastBastionUsed: false,
    graceUsed: false,
    determinationUsed: false,
    hasHit: false,
  };
}

export interface ActionResult {
  log: string;
  victory: boolean;
  // False for free actions (Visée parfaite): the monster doesn't act after.
  endsTurn: boolean;
  // Something got hit — the scene plays the hit sound.
  hit: boolean;
}

export interface MonsterTurnResult {
  log: string;
  outcome: 'ongoing' | 'victory' | 'defeat';
  hit: boolean;
}

export interface SkillAvailability {
  cost: number;
  usable: boolean;
  reason?: string;
}

// States monsters inflict on the player. Damage-over-time ticks at the
// start of the player's turn; the others are spent by player actions
// (Affaibli on damaging ones, Aveuglé and Silence on any), Étourdi skips the
// player's next turn. They all end with the fight.
export type PlayerStatusId = 'poisoned' | 'burning' | 'bleeding' | 'weakened' | 'blinded' | 'silenced' | 'stunned';

export const PLAYER_STATUS_LABELS: Record<PlayerStatusId, string> = {
  poisoned: 'Empoisonné',
  burning: 'Brûlure',
  bleeding: 'Saignement',
  weakened: 'Affaibli',
  blinded: 'Aveuglé',
  silenced: 'Silence',
  stunned: 'Étourdi',
};

const PLAYER_STATUS_VERBS: Record<PlayerStatusId, string> = {
  poisoned: 'vous êtes empoisonné',
  burning: 'vous brûlez',
  bleeding: 'vous saignez',
  weakened: 'vous êtes affaibli',
  blinded: 'vous êtes aveuglé',
  silenced: 'vous êtes réduit au silence',
  stunned: 'vous êtes étourdi',
};

export type PlayerStatuses = Partial<Record<PlayerStatusId, ActiveStatus>>;

const PLAYER_BLIND_MISS = 0.25;
const PLAYER_WEAKENED_MULTIPLIER = 0.75;
const MONSTER_EVASION = 0.15;
const THORNS_SHARE = 0.15;
const MONSTER_REGEN = 0.05;
const BOSS_ENRAGE_MULTIPLIER = 1.3;
const PHASE2_ATTACK_MULTIPLIER = 1.15;
const TELEGRAPH_EVERY = 4;
const MAGIC_RESIST_PER_INT = 0.01;
const MAGIC_RESIST_CAP = 0.4;

// Monster states and the element that makes a monster immune to them.
const STATUS_ELEMENT: Record<MonsterStatusId, AttackElement> = {
  poisoned: 'poison',
  burning: 'fire',
  frozen: 'ice',
  stunned: 'electric',
  weakened: 'dark',
  vulnerable: 'earth',
};

const GEAR_ELEMENTS: [keyof CharacterStats, AttackElement][] = [
  ['fireDamage', 'fire'],
  ['iceDamage', 'ice'],
  ['electricDamage', 'electric'],
  ['poisonDamage', 'poison'],
  ['darkDamage', 'dark'],
  ['earthDamage', 'earth'],
];

const SPELL_NAMES: Record<string, string> = {
  fire: 'Trait de feu',
  ice: 'Éclat de givre',
  electric: 'Étincelle',
  poison: 'Dard toxique',
  dark: "Trait d'ombre",
  earth: 'Projection de pierre',
};

interface MonsterEffects {
  turn: number;
  telegraph: boolean;
  // Carapace: halves the player's next action's damage.
  shell: number;
  healsLeft: number;
  frenzy: number;
  enraged: boolean;
  phase2: boolean;
  lastStunTurn: number;
}

interface MonsterHitOptions {
  magic?: boolean;
  label?: string;
}

interface MonsterHitResult {
  landed: boolean;
  damage: number;
  defeat: boolean;
  victory: boolean;
}

interface StrikeOptions {
  spell: boolean;
  // Element of the action itself (skill or staff), on top of the gear's.
  element?: AttackElement;
  // Châtiment: replaces the Light weakness bonus against spectres.
  vsUndead?: number;
  hits?: number;
  forceCrit?: boolean;
  // Roll gear states on every hit instead of once per action (Pluie de flèches).
  gearPerHit?: boolean;
  light?: boolean;
  // Basic attack with a weapon in each hand: a second hit from the left one.
  offhand?: boolean;
}

interface StrikeResult {
  missed?: 'blind' | 'evasion';
  thorns?: number;
  total: number;
  crits: number;
  hits: number;
  applied: MonsterStatusId[];
  healed: number;
}

const OFFENSIVE_BUFFS = ['berserk', 'blessing', 'overload'] as const;
type OffensiveBuff = (typeof OFFENSIVE_BUFFS)[number];

export class CombatEngine {
  readonly kind: ResourceKind;
  statuses: MonsterStatuses = {};
  fx: PlayerEffects = freshEffects();
  // Rage and endurance live only for the fight; mana is the character's mp.
  private pool = 0;
  private poolMax = 0;
  private freshBuffs = new Set<OffensiveBuff>();
  playerStatuses: PlayerStatuses = {};
  readonly kit: MonsterKit;
  readonly traits: TypeTraits;
  readonly abilities: MonsterAbility[];
  // The monster is quicker than the player and opens the fight.
  readonly monsterFirst: boolean;
  private mfx: MonsterEffects = {
    turn: 0,
    telegraph: false,
    shell: 0,
    healsLeft: 2,
    frenzy: 0,
    enraged: false,
    phase2: false,
    lastStunTurn: -10,
  };

  constructor(
    readonly character: Character,
    readonly monster: Monster,
    private readonly rng: () => number = Math.random,
  ) {
    this.kind = CLASS_RESOURCE[character.class];
    if (this.kind === 'rage') {
      this.poolMax = RAGE_MAX;
      // Elfe, Affinité naturelle.
      this.pool = character.race === 'elf' ? 10 : 0;
    } else if (this.kind === 'endurance') {
      this.poolMax = enduranceMax(this.stats().vitality);
      this.pool = this.poolMax;
    }
    this.kit = monsterKit(monster.id);
    this.traits = TYPE_TRAITS[this.kit.type];
    this.abilities = [...this.kit.abilities];
    // Elite and legendary variants pick up extra abilities.
    const extra = monster.tier === 'legendary' ? 2 : monster.tier === 'elite' ? 1 : 0;
    const pool = ELITE_BONUS_POOL.filter((id) => !this.abilities.some((ab) => ab.id === id));
    for (let i = 0; i < extra && pool.length > 0; i++) {
      const [picked] = pool.splice(Math.floor(this.rng() * pool.length), 1);
      this.abilities.push({ id: picked });
    }
    this.monsterFirst = monsterSpeed(this.kit.type, monster.attack, monster.isBoss) > this.stats().agility;
  }

  private hasAbility(id: string): boolean {
    return this.abilities.some((ab) => ab.id === id);
  }

  // Weakness / resistance multiplier for one element against this monster.
  elementMultiplier(element: AttackElement): number {
    if (this.traits.weak.includes(element)) return WEAKNESS_MULTIPLIER;
    if (this.traits.resist.includes(element)) return RESISTANCE_MULTIPLIER;
    return 1;
  }

  // Applies a state to the monster unless its type resists the matching element.
  private inflict(id: MonsterStatusId, status: ActiveStatus): boolean {
    if (this.traits.resist.includes(STATUS_ELEMENT[id])) return false;
    applyStatus(this.statuses, id, status);
    return true;
  }

  private rollGear(stats: CharacterStats): MonsterStatusId[] {
    const before = new Set(Object.keys(this.statuses));
    const applied = rollElementStatuses(stats, this.statuses, this.rng, this.statusMods());
    return applied.filter((id) => {
      if (!this.traits.resist.includes(STATUS_ELEMENT[id])) return true;
      if (!before.has(id)) delete this.statuses[id];
      return false;
    });
  }

  monsterInfoLine(): string {
    const weak = this.traits.weak.map((e) => ELEMENT_LABELS[e]).join(', ');
    const resist = this.traits.resist.map((e) => ELEMENT_LABELS[e]).join(', ');
    const physical = this.traits.physicalResist > 0 ? ' et physique' : '';
    return `${this.traits.label} · faible : ${weak || 'rien'} · résiste : ${resist || 'rien'}${physical}`;
  }

  // ------------------------------------------------------------- resource

  get resource(): number {
    return this.kind === 'mana' ? this.character.mp : this.pool;
  }

  get resourceMax(): number {
    return this.kind === 'mana' ? this.character.maxMp : this.poolMax;
  }

  private set resource(value: number) {
    const clamped = Math.max(0, Math.min(this.resourceMax, Math.round(value)));
    if (this.kind === 'mana') this.character.mp = clamped;
    else this.pool = clamped;
  }

  get resourceLabel(): string {
    return RESOURCE_LABELS[this.kind];
  }

  // ---------------------------------------------------------------- stats

  private rank(id: string): number {
    return talentRank(this.character, id);
  }

  private stats(): CharacterStats {
    return getEffectiveStats(this.character);
  }

  private randInt(min: number, max: number): number {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }

  armor(): number {
    return (
      this.stats().armor + this.rank('devotion') + (this.fx.blessing > 0 ? 3 : 0)
    );
  }

  critChance(): number {
    // Elfe, Vue perçante.
    return BASE_CRIT_CHANCE + 0.05 * this.rank('lynx_eye') + (this.character.race === 'elf' ? 0.05 : 0);
  }

  private critMultiplier(): number {
    return this.rank('killer') > 0 ? KILLER_CRIT_MULTIPLIER : CRIT_MULTIPLIER;
  }

  playerDodgeChance(): number {
    // Halfling, Pas légers: +5%.
    const bonus =
      0.03 * (this.rank('sidestep') + this.rank('reflexes')) + (this.character.race === 'halfling' ? 0.05 : 0);
    const cap = this.rank('sidestep') > 0 ? 0.4 : 0.3;
    return dodgeChance(this.stats().agility, bonus, cap) + (this.fx.huntersShadow > 0 ? 0.2 : 0);
  }

  private statusMods(): StatusMods {
    return {
      poisonDamage: this.rank('venom'),
      poisonTurns: this.rank('venom'),
      burnDamage: this.rank('ignition'),
      freezeTurns: this.rank('biting_cold'),
    };
  }

  private rightHand(): Item | undefined {
    return this.character.equipment.weapon;
  }

  private leftHand(): Item | undefined {
    return this.character.equipment.shield;
  }

  // The basic attack comes from the right hand; with it empty, from what the
  // left holds (a tome's spell, or a one-handed weapon). Shields don't attack.
  private attackWeapon(): Item | undefined {
    const right = this.rightHand();
    if (right) return right;
    const left = this.leftHand();
    return left && left.category !== 'shield' ? left : undefined;
  }

  private weaponType(): WeaponType | undefined {
    return this.rightHand()?.weaponType;
  }

  // A staff or tome makes the basic attack a spell (Mage/Clerc's weapon spell).
  private basicIsSpell(): boolean {
    return weaponProfile(this.attackWeapon()).spell;
  }

  private hasTome(): boolean {
    return this.leftHand()?.weaponType === 'tome';
  }

  // Spell skills use the staff's damage range, else the tome's, else a bare spell.
  private spellProfile(): WeaponProfile {
    if (this.rightHand()?.weaponType === 'staff') return WEAPON_PROFILES.staff;
    if (this.hasTome()) return WEAPON_PROFILES.tome;
    return BARE_SPELL_PROFILE;
  }

  private dualWielding(): boolean {
    return isMeleeHandItem(this.rightHand()) && isMeleeHandItem(this.leftHand());
  }

  // The staff/tome attack carries the casting item's strongest element and
  // is named after it.
  private weaponElement(): AttackElement | undefined {
    const item = this.attackWeapon();
    let best: AttackElement | undefined;
    let bestValue = 0;
    GEAR_ELEMENTS.forEach(([stat, element]) => {
      const value = (item?.stats[stat as keyof typeof item.stats] as number | undefined) ?? 0;
      if (value > bestValue) {
        bestValue = value;
        best = element;
      }
    });
    return best;
  }

  spellName(): string {
    const element = this.weaponElement();
    return element ? SPELL_NAMES[element] : 'Trait arcanique';
  }

  // A hit's two parts: the weapon/spell core, which skills, crits and
  // bonuses multiply, and the gear's flat elemental damage, added once per
  // hit and only affected by the monster's weaknesses and resistances.
  private damageParts(spell: boolean, weapon?: Item): { core: number; elemental: number } {
    const stats = this.stats();
    const profile = spell ? this.spellProfile() : weaponProfile(weapon ?? this.attackWeapon());
    const scaling = profile.spell ? SPELL_STAT_SCALING : WEAPON_STAT_SCALING;
    const core = this.randInt(profile.min, profile.max) + Math.floor(stats[profile.scaling] * scaling);
    const elemental = GEAR_ELEMENTS.reduce(
      (sum, [stat, element]) => sum + stats[stat] * this.elementMultiplier(element),
      0,
    );
    return { core: spell ? core : core * (1 - this.traits.physicalResist), elemental };
  }

  private damageMultiplier(spell: boolean, weapon?: Item): number {
    let m = 1;
    if (!spell) {
      const type = (weapon ?? this.attackWeapon())?.weaponType;
      m *= 1 + 0.07 * this.rank('weapon_mastery');
      if (type === 'dagger') m *= 1 + 0.05 * this.rank('sharpened_blades');
      // Racial weapon affinity.
      const affinity = RACES[this.character.race].weaponAffinity ?? [];
      if (type && affinity.includes(type)) m *= 1.1;
    } else {
      m *= 1 + 0.08 * this.rank('arcane_power') + 0.08 * this.rank('fervor');
      if (this.hasTome()) m *= 1 + TOME_SPELL_BONUS;
      if (this.fx.overload > 0) m *= 1.2;
    }
    if (this.statuses.burning && this.rank('combustion') > 0) m *= 1.15;
    if (
      this.rank('opportunist') > 0 &&
      (this.statuses.stunned || this.statuses.frozen || this.statuses.weakened)
    ) {
      m *= 1.25;
    }
    if (this.fx.berserk > 0) m *= 1.5;
    if (this.fx.blessing > 0) m *= 1.25;
    // Orc, Rage de sang.
    if (this.character.race === 'orc' && this.character.hp < this.character.maxHp * 0.3) m *= 1.2;
    return m;
  }

  // Heals from skills and talents, boosted by Mains guérisseuses.
  private heal(amount: number): number {
    const boosted = Math.round(amount * (1 + 0.07 * this.rank('healing_hands')));
    const before = this.character.hp;
    this.character.hp = Math.min(this.character.maxHp, this.character.hp + Math.max(0, boosted));
    return this.character.hp - before;
  }

  // Vol à la tire (+25%) and the Halfling's Chanceux (+20%) add up.
  goldReward(): number {
    const bonus = (this.rank('pickpocket') > 0 ? 0.25 : 0) + (this.character.race === 'halfling' ? 0.2 : 0);
    return Math.round(this.monster.goldReward * (1 + bonus));
  }

  // ------------------------------------------------------------ striking

  private strike(mult: number, options: StrikeOptions): StrikeResult {
    const stats = this.stats();
    const hits = options.hits ?? 1;
    // Weapon attacks can miss (Aveuglé, an elusive monster); spells never do.
    if (!options.spell) {
      if (this.playerStatuses.blinded && this.rng() < PLAYER_BLIND_MISS) {
        this.fx.nextCrit = false;
        return { missed: 'blind', total: 0, crits: 0, hits: 0, applied: [], healed: 0 };
      }
      if (this.hasAbility('evasion') && this.rng() < MONSTER_EVASION) {
        this.fx.nextCrit = false;
        return { missed: 'evasion', total: 0, crits: 0, hits: 0, applied: [], healed: 0 };
      }
    }
    const weakened = this.consumePlayerStatus('weakened');
    const actionElement = options.element ? this.actionElementMultiplier(options) : 1;
    const shell = this.mfx.shell > 0 ? 0.5 : 1;
    const vulnerable = consumeStatus(this.statuses, 'vulnerable');
    const forcedCrit = Boolean(options.forceCrit) || this.fx.nextCrit;
    this.fx.nextCrit = false;
    const wasPoisoned = Boolean(this.statuses.poisoned);
    const applied = new Set<MonsterStatusId>();
    let total = 0;
    let crits = 0;
    let landed = 0;

    const hitOnce = (mult: number, weapon: Item | undefined) => {
      const weaponCrit = options.spell ? 0 : weaponProfile(weapon).crit;
      const crit = forcedCrit || this.rng() < this.critChance() + weaponCrit;
      const parts = this.damageParts(options.spell, weapon);
      const damage = Math.max(
        1,
        Math.round(
          (parts.core *
            mult *
            this.damageMultiplier(options.spell, weapon) *
            (crit ? this.critMultiplier() : 1) *
            (vulnerable ? VULNERABLE_DAMAGE_MULTIPLIER : 1) *
            actionElement *
            (weakened ? PLAYER_WEAKENED_MULTIPLIER : 1) +
            parts.elemental) *
            shell,
        ),
      );
      this.monster.hp -= damage;
      total += damage;
      landed += 1;
      if (crit) crits += 1;
    };

    for (let i = 0; i < hits && this.monster.hp > 0; i++) {
      hitOnce(mult, undefined);
      if (options.gearPerHit && this.monster.hp > 0) {
        this.rollGear(stats).forEach((id) => applied.add(id));
      }
    }
    if (options.offhand && this.monster.hp > 0) hitOnce(mult * OFFHAND_HIT_MULTIPLIER, this.leftHand());

    if (this.monster.hp > 0) {
      if (!options.gearPerHit) {
        this.rollGear(stats).forEach((id) => applied.add(id));
      }
      if (this.fx.coatedBlade > 0) {
        this.fx.coatedBlade -= 1;
        if (this.inflict('poisoned', this.skillPoison())) applied.add('poisoned');
      }
      if (crits > 0 && this.rank('weak_spot') > 0 && this.inflict('vulnerable', { turns: 2 })) {
        applied.add('vulnerable');
      }
      if (wasPoisoned && this.rank('snare') > 0 && this.rng() < 0.2 && this.inflict('stunned', { turns: 1 })) {
        applied.add('stunned');
      }
      if (options.light && this.rank('judgment') > 0 && this.rng() < 0.15 && this.inflict('stunned', { turns: 1 })) {
        applied.add('stunned');
      }
    }

    // Épines: weapon hits cost the attacker a share of the damage dealt.
    let thorns = 0;
    if (!options.spell && total > 0 && this.hasAbility('thorns')) {
      thorns = Math.max(1, Math.round(total * THORNS_SHARE));
      this.character.hp = Math.max(1, this.character.hp - thorns);
    }

    let healed = 0;
    if (stats.lifeSteal > 0) {
      const before = this.character.hp;
      this.character.hp = Math.min(this.character.maxHp, this.character.hp + stats.lifeSteal);
      healed += this.character.hp - before;
    }
    const thirst = this.rank('bloodthirst');
    if (thirst > 0) {
      const before = this.character.hp;
      this.character.hp = Math.min(this.character.maxHp, this.character.hp + Math.round(total * 0.05 * thirst));
      healed += this.character.hp - before;
    }
    this.fx.hasHit = true;
    return { total, crits, hits: landed, applied: [...applied], healed, thorns };
  }

  private actionElementMultiplier(options: StrikeOptions): number {
    if (options.vsUndead && this.kit.type === 'undead') return options.vsUndead;
    return this.elementMultiplier(options.element!);
  }

  private skillPoison() {
    const stats = this.stats();
    return poisonStatus(Math.max(3, stats.agility / 2) + stats.poisonDamage, this.statusMods());
  }

  private skillBurn(turns: number) {
    const stats = this.stats();
    return burnStatus(Math.max(2, Math.ceil(stats.intelligence / 4)) + stats.fireDamage, this.statusMods(), turns);
  }

  private describeStrike(result: StrikeResult, extra: MonsterStatusId[] = []): string {
    if (result.missed === 'blind') return 'Aveuglé, vous frappez dans le vide !';
    if (result.missed === 'evasion') return `${this.monster.name} esquive votre attaque !`;
    const critPart =
      result.crits === 0 ? '' : result.hits > 1 ? `${result.crits} coup${result.crits > 1 ? 's' : ''} critique${result.crits > 1 ? 's' : ''} ! ` : 'Coup critique ! ';
    const hitsPart = result.hits > 1 ? ` en ${result.hits} coups` : '';
    const healPart = result.healed > 0 ? ` Vous récupérez ${result.healed} PV.` : '';
    const applied = [...new Set([...result.applied, ...extra])];
    const thornsPart = result.thorns ? ` Les épines vous blessent (-${result.thorns} PV).` : '';
    return `${critPart}Vous infligez ${result.total} dégâts${hitsPart}.${healPart}${describeApplied(this.monster.name, applied)}${thornsPart}`;
  }

  // Ends a player action: offensive bonuses tick down, except the one this
  // very action just granted.
  private endAction(): void {
    OFFENSIVE_BUFFS.forEach((buff) => {
      if (this.fx[buff] > 0 && !this.freshBuffs.has(buff)) this.fx[buff] -= 1;
    });
    this.freshBuffs.clear();
    this.consumePlayerStatus('blinded');
    this.consumePlayerStatus('silenced');
    if (this.mfx.shell > 0) this.mfx.shell -= 1;
  }

  private consumePlayerStatus(id: PlayerStatusId): boolean {
    const status = this.playerStatuses[id];
    if (!status) return false;
    status.turns -= 1;
    if (status.turns <= 0) delete this.playerStatuses[id];
    return true;
  }

  // Étourdi: the player loses this turn (the scene then runs the monster's).
  consumePlayerStun(): boolean {
    if (!this.consumePlayerStatus('stunned')) return false;
    this.endAction();
    return true;
  }

  private clearPlayerStatuses(): boolean {
    const had = Object.keys(this.playerStatuses).length > 0;
    this.playerStatuses = {};
    return had;
  }

  private grantBuff(buff: OffensiveBuff, turns: number): void {
    this.fx[buff] = turns;
    this.freshBuffs.add(buff);
  }

  // ------------------------------------------------------------- actions

  attack(): ActionResult {
    const spell = this.basicIsSpell();
    const result = this.strike(1, {
      spell,
      offhand: !spell && this.dualWielding(),
      element: spell ? this.weaponElement() : undefined,
    });
    if (this.kind === 'rage') this.resource = this.resource + RAGE_PER_ATTACK;
    this.endAction();
    const prefix = spell ? `${this.spellName()} : ` : '';
    return { log: prefix + this.describeStrike(result), victory: this.monster.hp <= 0, endsTurn: true, hit: true };
  }

  skillCost(id: string): number {
    const def = TALENTS[id] as ActiveTalent | undefined;
    if (!def || def.kind !== 'active') return 0;
    let cost = def.cost[Math.max(0, this.rank(id) - 1)];
    if (this.kind === 'mana' && this.fx.overload > 0) cost = Math.ceil(cost / 2);
    if (this.kind === 'rage' && this.fx.chainDiscount) cost = Math.max(0, cost - 10);
    return cost;
  }

  skillAvailability(id: string): SkillAvailability {
    const def = TALENTS[id];
    const cost = this.skillCost(id);
    if (!def || def.kind !== 'active' || this.rank(id) === 0) return { cost, usable: false, reason: 'Compétence non apprise.' };
    if (this.playerStatuses.silenced) return { cost, usable: false, reason: 'Vous êtes réduit au silence.' };
    if (def.requires === 'shield' && this.character.equipment.shield?.category !== 'shield') {
      return { cost, usable: false, reason: REQUIREMENT_LABELS.shield };
    }
    if (def.requires === 'bow' && this.weaponType() !== 'bow') return { cost, usable: false, reason: REQUIREMENT_LABELS.bow };
    if (def.requires === 'dual' && !this.dualWielding()) {
      return { cost, usable: false, reason: REQUIREMENT_LABELS.dual };
    }
    if (id === 'deadly_venom' && !this.statuses.poisoned) {
      return { cost, usable: false, reason: `${this.monster.name} n'est pas empoisonné.` };
    }
    if (this.resource < cost) return { cost, usable: false, reason: `Pas assez de ${this.resourceLabel.toLowerCase()}.` };
    return { cost, usable: true };
  }

  useSkill(id: string): ActionResult {
    const availability = this.skillAvailability(id);
    if (!availability.usable) {
      return { log: availability.reason ?? '', victory: false, endsTurn: false, hit: false };
    }
    const def = TALENTS[id] as ActiveTalent;
    const v = def.values[this.rank(id) - 1];
    this.resource = this.resource - availability.cost;
    if (this.kind === 'rage') this.fx.chainDiscount = false;
    const stats = this.stats();
    const name = this.monster.name;
    let log = '';
    let hit = false;
    let endsTurn = true;

    switch (id) {
      // Guerrier
      case 'heavy_strike': {
        const r = this.strike(v.mult, { spell: false });
        if (this.rank('chain_strikes') > 0) this.fx.chainDiscount = true;
        log = this.describeStrike(r);
        hit = true;
        break;
      }
      case 'armor_break': {
        const r = this.strike(v.mult, { spell: false });
        const ok = !r.missed && this.monster.hp > 0 && this.inflict('vulnerable', { turns: 2 });
        log = this.describeStrike(r, ok ? ['vulnerable'] : []);
        hit = true;
        break;
      }
      case 'execution': {
        const low = this.monster.hp < this.monster.maxHp * 0.3;
        const r = this.strike(low ? v.low : v.high, { spell: false });
        log = (low ? 'Exécution ! ' : '') + this.describeStrike(r);
        hit = true;
        break;
      }
      case 'shield_bash': {
        const r = this.strike(v.mult, { spell: false });
        // A stun also breaks a boss's wind-up (see monsterTurn).
        const ok = !r.missed && this.monster.hp > 0 && this.inflict('stunned', { turns: 1 });
        log = this.describeStrike(r, ok ? ['stunned'] : []);
        hit = true;
        break;
      }
      case 'defensive_stance':
        this.fx.stance = v.turns;
        log = 'Vous adoptez une posture défensive.';
        break;
      case 'war_cry':
        log = this.inflict('weakened', { turns: v.turns })
          ? `Votre cri de guerre fait reculer ${name.toLowerCase()} : affaibli !`
          : `${name} ne se laisse pas impressionner.`;
        break;
      case 'berserk':
        this.grantBuff('berserk', v.turns);
        log = 'Vous entrez en furie !';
        break;

      // Mage
      case 'fireball': {
        const r = this.strike(v.mult, { spell: true, element: 'fire' });
        const burn = this.monster.hp > 0 && this.rng() < 0.5 && this.inflict('burning', this.skillBurn(2));
        log = this.describeStrike(r, burn ? ['burning'] : []);
        hit = true;
        break;
      }
      case 'flame_wall': {
        const r = this.strike(v.mult, { spell: true, element: 'fire' });
        const ok = this.monster.hp > 0 && this.inflict('burning', this.skillBurn(3));
        log = this.describeStrike(r, ok ? ['burning'] : []);
        hit = true;
        break;
      }
      case 'meteor': {
        log = this.describeStrike(this.strike(v.mult, { spell: true, element: 'fire' }));
        hit = true;
        break;
      }
      case 'frost_bolt': {
        const r = this.strike(v.mult, { spell: true, element: 'ice' });
        const ok = this.monster.hp > 0 && this.inflict('frozen', freezeStatus(this.statusMods()));
        log = this.describeStrike(r, ok ? ['frozen'] : []);
        hit = true;
        break;
      }
      case 'ice_barrier': {
        const amount = Math.round(this.character.maxHp * v.hpPct + 1.5 * stats.intelligence);
        this.fx.shield = Math.max(this.fx.shield, amount);
        this.fx.iceShield = true;
        log = `Une barrière de glace vous entoure (${this.fx.shield}).`;
        break;
      }
      case 'concentration': {
        const before = this.resource;
        this.resource = before + this.character.maxMp * v.manaPct;
        log = `Vous vous concentrez : +${this.resource - before} de mana.`;
        break;
      }
      case 'overload':
        this.grantBuff('overload', v.turns);
        log = 'Vos sorts entrent en surcharge !';
        break;

      // Clerc
      case 'heal':
        log = `Vous récupérez ${this.heal(this.character.maxHp * v.hpPct)} PV.`;
        break;
      case 'smite':
        log = this.describeStrike(this.strike(v.mult, { spell: true, light: true, element: 'light', vsUndead: 2 }));
        hit = true;
        break;
      case 'divine_wrath': {
        const r = this.strike(v.mult, { spell: true, light: true, element: 'light' });
        const healed = this.heal(r.total * 0.15);
        log = this.describeStrike(r) + (healed > 0 ? ` La lumière vous rend ${healed} PV.` : '');
        hit = true;
        break;
      }
      case 'regeneration':
        this.fx.regenTurns = 4;
        this.fx.regenPct = v.hpPct;
        log = 'Une douce chaleur vous enveloppe.';
        break;
      case 'purification': {
        const cleansed = this.clearPlayerStatuses();
        const healed = this.heal(this.character.maxHp * v.hpPct);
        log = cleansed ? `Vos maux se dissipent. Vous récupérez ${healed} PV.` : `Vous récupérez ${healed} PV.`;
        break;
      }
      case 'faith_shield': {
        const amount = Math.round(v.flat + v.perInt * stats.intelligence);
        if (amount >= this.fx.shield) {
          this.fx.shield = amount;
          this.fx.iceShield = false;
        }
        log = `Un bouclier de foi vous protège (${this.fx.shield}).`;
        break;
      }
      case 'blessing':
        this.grantBuff('blessing', v.turns);
        log = 'Une bénédiction vous renforce.';
        break;

      // Archer
      case 'perfect_aim':
        this.fx.nextCrit = true;
        log = 'Vous prenez le temps de viser : votre prochaine attaque sera critique.';
        endsTurn = false;
        break;
      case 'double_shot':
        log = this.describeStrike(this.strike(v.mult, { spell: false, hits: 2 }));
        hit = true;
        break;
      case 'deadly_shot':
        log = this.describeStrike(this.strike(v.mult, { spell: false, forceCrit: true }));
        hit = true;
        break;
      case 'poison_arrow': {
        const r = this.strike(v.mult, { spell: false, element: 'poison' });
        const ok = !r.missed && this.monster.hp > 0 && this.inflict('poisoned', this.skillPoison());
        log = this.describeStrike(r, ok ? ['poisoned'] : []);
        hit = true;
        break;
      }
      case 'arrow_rain':
        log = this.describeStrike(this.strike(v.mult, { spell: false, hits: 3, gearPerHit: true }));
        hit = true;
        break;
      case 'fallback':
        this.fx.guaranteedDodge = true;
        log = 'Vous reculez, prêt à esquiver.';
        break;
      case 'hunters_shadow':
        this.fx.huntersShadow = v.turns;
        log = "Vous vous fondez dans l'ombre du chasseur.";
        break;

      // Voleur
      case 'low_blow': {
        const r = this.strike(v.mult, { spell: false });
        const ok = !r.missed && this.monster.hp > 0 && this.inflict('weakened', { turns: 2 });
        log = this.describeStrike(r, ok ? ['weakened'] : []);
        hit = true;
        break;
      }
      case 'sneak_attack': {
        const first = !this.fx.hasHit;
        const r = this.strike(first ? v.first : v.other, { spell: false });
        log = (first ? 'Attaque surprise ! ' : '') + this.describeStrike(r);
        hit = true;
        break;
      }
      case 'blade_dance':
        log = this.describeStrike(this.strike(v.mult, { spell: false, hits: 4 }));
        hit = true;
        break;
      case 'coat_blade':
        this.fx.coatedBlade = v.turns;
        log = 'Vous enduisez votre lame de poison.';
        break;
      case 'deadly_venom': {
        const poison = this.statuses.poisoned!;
        const damage = Math.max(1, Math.round((poison.damage ?? 1) * poison.turns * v.mult));
        delete this.statuses.poisoned;
        this.monster.hp -= damage;
        log = `Le venin fait effet d'un coup : ${damage} dégâts !`;
        hit = true;
        break;
      }
      case 'feint':
        this.fx.guaranteedDodge = true;
        this.fx.nextCrit = true;
        log = 'Vous feintez : prochain coup esquivé, prochaine attaque critique.';
        break;
      case 'vanish': {
        this.fx.guaranteedDodge = true;
        const before = this.resource;
        this.resource = before + v.regain;
        log = `Vous disparaissez dans l'ombre (+${this.resource - before} d'endurance).`;
        break;
      }
    }

    if (endsTurn) this.endAction();
    return { log, victory: this.monster.hp <= 0, endsTurn, hit };
  }

  usePotion(id: ConsumableId): ActionResult {
    const def = CONSUMABLES[id];
    if (id === 'fire_bomb') return this.throwBomb();
    if (id === 'antidote') {
      const count = this.character.consumables.antidote ?? 0;
      if (count <= 0) return { log: '', victory: false, endsTurn: false, hit: false };
      this.character.consumables.antidote = count - 1;
      const cured = this.clearPlayerStatuses();
      this.endAction();
      return {
        log: cured ? "L'antidote dissipe vos maux." : "Vous buvez l'antidote, sans effet.",
        victory: false,
        endsTurn: true,
        hit: false,
      };
    }
    const hpBefore = this.character.hp;
    const mpBefore = this.character.mp;
    if (!useConsumable(this.character, id)) return { log: '', victory: false, endsTurn: false, hit: false };
    this.endAction();
    const gain = def.mana ? `+${this.character.mp - mpBefore} de mana` : `+${this.character.hp - hpBefore} PV`;
    return { log: `Vous buvez une ${def.name.toLowerCase()} (${gain}).`, victory: false, endsTurn: true, hit: false };
  }

  // Fixed damage (no stats, no crit) so every class can use it.
  private throwBomb(): ActionResult {
    const count = this.character.consumables.fire_bomb ?? 0;
    if (count <= 0) return { log: '', victory: false, endsTurn: false, hit: false };
    this.character.consumables.fire_bomb = count - 1;
    const level = this.character.level;
    const damage = Math.max(1, Math.round(bombDamage(level) * this.elementMultiplier('fire')));
    this.monster.hp -= damage;
    let statusPart = '';
    if (
      this.monster.hp > 0 &&
      this.inflict('burning', { turns: 2, damage: bombBurnDamage(level) + this.statusMods().burnDamage })
    ) {
      statusPart = describeApplied(this.monster.name, ['burning']);
    }
    this.endAction();
    return {
      log: `La bombe explose : ${damage} dégâts.${statusPart}`,
      victory: this.monster.hp <= 0,
      endsTurn: true,
      hit: true,
    };
  }

  // Bosses can't be fled (checked by the caller, which doesn't spend the turn).
  tryFlee(): boolean {
    const fled = this.rng() < fleeChance(this.stats().agility);
    if (!fled) this.endAction();
    return fled;
  }

  // ---------------------------------------------------------- monster turn

  monsterTurn(): MonsterTurnResult {
    const parts: string[] = [];
    const name = this.monster.name;
    const mfx = this.mfx;
    mfx.turn += 1;

    const dot = tickDamageOverTime(this.statuses);
    parts.push(...dot.parts);
    if (dot.total > 0) {
      this.monster.hp -= dot.total;
      if (this.monster.hp <= 0) {
        parts.push(`${name} succombe !`);
        return { log: parts.join(' '), outcome: 'victory', hit: true };
      }
    }

    if (this.hasAbility('regeneration') && this.monster.hp < this.monster.maxHp) {
      const before = this.monster.hp;
      this.monster.hp = Math.min(this.monster.maxHp, this.monster.hp + Math.ceil(this.monster.maxHp * MONSTER_REGEN));
      parts.push(`${name} se régénère (+${this.monster.hp - before}).`);
    }
    if (this.kit.phase2 && !mfx.phase2 && this.monster.hp <= this.monster.maxHp * 0.5) {
      mfx.phase2 = true;
      this.abilities.push(...(this.kit.phase2.add ?? []));
      parts.push(this.kit.phase2.message);
    }
    if (this.monster.isBoss && !mfx.enraged && this.monster.hp < this.monster.maxHp * 0.3) {
      mfx.enraged = true;
      parts.push(`${name} entre dans une rage folle !`);
    }
    if (this.hasAbility('frenzy')) mfx.frenzy = Math.min(5, mfx.frenzy + 1);

    if (consumeStatus(this.statuses, 'stunned')) {
      parts.push(`${name} est étourdi et ne peut pas agir.`);
      if (mfx.telegraph) {
        mfx.telegraph = false;
        parts.push('Son élan est brisé !');
      }
      return this.endMonsterTurn(parts, false);
    }

    // ---- choose the action
    if (mfx.telegraph) {
      mfx.telegraph = false;
      const r = this.monsterHit(parts, 2, { label: 'Coup dévastateur' });
      return this.afterMonsterHit(parts, r);
    }
    const charge = this.abilities.find((ab) => ab.id === 'charge');
    if (charge && mfx.turn === 1) {
      const r = this.monsterHit(parts, 1.8, { label: charge.label ?? ABILITY_LABELS.charge });
      return this.afterMonsterHit(parts, r);
    }
    if (this.monster.isBoss && mfx.turn % TELEGRAPH_EVERY === TELEGRAPH_EVERY - 1) {
      mfx.telegraph = true;
      parts.push(`${name} prend son élan… (coup dévastateur au prochain tour)`);
      return this.endMonsterTurn(parts, false);
    }
    const heal = this.abilities.find((ab) => ab.id === 'heal');
    if (heal && mfx.healsLeft > 0 && this.monster.hp < this.monster.maxHp * 0.5 && this.rng() < 0.6) {
      mfx.healsLeft -= 1;
      const before = this.monster.hp;
      this.monster.hp = Math.min(this.monster.maxHp, this.monster.hp + Math.round(this.monster.maxHp * 0.25));
      parts.push(`${name} utilise ${heal.label ?? ABILITY_LABELS.heal} (+${this.monster.hp - before} PV).`);
      return this.endMonsterTurn(parts, false);
    }
    const chance = mfx.phase2 ? 0.5 : this.monster.isBoss ? 0.4 : 0.3;
    const usable = this.abilities.filter((ab) => this.abilityUsable(ab));
    if (usable.length > 0 && this.rng() < chance) {
      const ability = usable[Math.floor(this.rng() * usable.length)];
      return this.useMonsterAbility(parts, ability);
    }
    const r = this.monsterHit(parts, 1, {});
    return this.afterMonsterHit(parts, r);
  }

  private abilityUsable(ability: MonsterAbility): boolean {
    if (PASSIVE_ABILITIES.includes(ability.id)) return false;
    switch (ability.id) {
      case 'charge':
      case 'heal':
        return false;
      case 'poison':
        return !this.playerStatuses.poisoned;
      case 'fire_breath':
        return true;
      case 'war_cry':
        return !this.playerStatuses.weakened;
      case 'blind':
        return !this.playerStatuses.blinded;
      case 'silence':
        return !this.playerStatuses.silenced;
      case 'stun_blow':
        return this.mfx.turn - this.mfx.lastStunTurn >= 3;
      case 'shell':
        return this.mfx.shell === 0;
      default:
        return true;
    }
  }

  private useMonsterAbility(parts: string[], ability: MonsterAbility): MonsterTurnResult {
    const label = ability.label ?? ABILITY_LABELS[ability.id];
    const name = this.monster.name;
    const attack = this.monster.attack;
    switch (ability.id) {
      case 'poison': {
        const r = this.monsterHit(parts, 1, { label });
        if (r.landed) this.inflictPlayer(parts, 'poisoned', { turns: 3, damage: Math.max(1, Math.round(attack * 0.2)) });
        return this.afterMonsterHit(parts, r);
      }
      case 'rend': {
        const r = this.monsterHit(parts, 1, { label });
        if (r.landed) {
          // Bleeding stacks up to 3 times.
          const tick = Math.max(1, Math.round(attack * 0.12));
          const current = this.playerStatuses.bleeding;
          const damage = Math.min(tick * 3, (current?.damage ?? 0) + tick);
          this.inflictPlayer(parts, 'bleeding', { turns: 3, damage });
        }
        return this.afterMonsterHit(parts, r);
      }
      case 'fire_breath': {
        const r = this.monsterHit(parts, 1.2, { label, magic: true });
        if (r.landed) this.inflictPlayer(parts, 'burning', { turns: 2, damage: Math.max(1, Math.round(attack * 0.3)) });
        return this.afterMonsterHit(parts, r);
      }
      case 'war_cry':
        parts.push(`${name} utilise ${label} !`);
        this.inflictPlayer(parts, 'weakened', { turns: 2 });
        return this.endMonsterTurn(parts, false);
      case 'blind': {
        const r = this.monsterHit(parts, 0.7, { label });
        if (r.landed) this.inflictPlayer(parts, 'blinded', { turns: 2 });
        return this.afterMonsterHit(parts, r);
      }
      case 'silence': {
        const r = this.monsterHit(parts, 0.6, { label, magic: true });
        if (r.landed) this.inflictPlayer(parts, 'silenced', { turns: this.monster.isBoss ? 2 : 1 });
        return this.afterMonsterHit(parts, r);
      }
      case 'stun_blow': {
        this.mfx.lastStunTurn = this.mfx.turn;
        const r = this.monsterHit(parts, 0.9, { label });
        if (r.landed) this.inflictPlayer(parts, 'stunned', { turns: 1 });
        return this.afterMonsterHit(parts, r);
      }
      case 'double_attack': {
        parts.push(`${name} utilise ${label} !`);
        const first = this.monsterHit(parts, 0.6, {});
        if (first.defeat || first.victory) return this.afterMonsterHit(parts, first);
        const second = this.monsterHit(parts, 0.6, {});
        return this.afterMonsterHit(parts, second);
      }
      case 'life_drain': {
        const r = this.monsterHit(parts, 1, { label });
        if (r.landed && r.damage > 0) {
          const before = this.monster.hp;
          this.monster.hp = Math.min(this.monster.maxHp, this.monster.hp + Math.ceil(r.damage / 2));
          parts.push(`${name} récupère ${this.monster.hp - before} PV.`);
        }
        return this.afterMonsterHit(parts, r);
      }
      case 'shell':
        this.mfx.shell = 1;
        parts.push(`${name} utilise ${label} : votre prochaine action fera moitié moins de dégâts.`);
        return this.endMonsterTurn(parts, false);
      case 'curse': {
        const r = this.monsterHit(parts, 1.3, { label, magic: true });
        return this.afterMonsterHit(parts, r);
      }
      case 'mana_burn': {
        const r = this.monsterHit(parts, 0.5, { label, magic: true });
        if (r.landed) {
          const before = this.resource;
          this.resource = before - (this.kind === 'rage' ? 20 : 15);
          const lost = before - this.resource;
          if (lost > 0) parts.push(`Vous perdez ${lost} de ${this.resourceLabel.toLowerCase()}.`);
        }
        return this.afterMonsterHit(parts, r);
      }
      default: {
        const r = this.monsterHit(parts, 1, {});
        return this.afterMonsterHit(parts, r);
      }
    }
  }

  private inflictPlayer(parts: string[], id: PlayerStatusId, status: ActiveStatus): void {
    const current = this.playerStatuses[id];
    this.playerStatuses[id] = current
      ? { turns: Math.max(current.turns, status.turns), damage: Math.max(current.damage ?? 0, status.damage ?? 0) || undefined }
      : status;
    parts.push(`${PLAYER_STATUS_VERBS[id].charAt(0).toUpperCase()}${PLAYER_STATUS_VERBS[id].slice(1)} !`);
  }

  private monsterAttackMultiplier(): number {
    return (
      (1 + 0.1 * this.mfx.frenzy) *
      (this.mfx.enraged ? BOSS_ENRAGE_MULTIPLIER : 1) *
      (this.mfx.phase2 ? PHASE2_ATTACK_MULTIPLIER : 1)
    );
  }

  // One monster blow: dodge, block, armor or magic resistance, the player's
  // defensive effects, shields, rage, and the last-chance talents.
  private monsterHit(parts: string[], mult: number, options: MonsterHitOptions): MonsterHitResult {
    const name = this.monster.name;
    const intro = options.label ? `${name} utilise ${options.label} : ` : '';
    const frozen = consumeStatus(this.statuses, 'frozen');
    const weakened = consumeStatus(this.statuses, 'weakened');
    const stance = this.fx.stance > 0;
    if (stance) this.fx.stance -= 1;
    const dodgeRoll = this.playerDodgeChance();
    const shadow = this.fx.huntersShadow > 0;
    if (shadow) this.fx.huntersShadow -= 1;

    // Spells can't be dodged by chance, but Repli/Feinte/Disparition still work.
    const dodged = this.fx.guaranteedDodge || (!options.magic && this.rng() < dodgeRoll);
    this.fx.guaranteedDodge = false;
    if (dodged) {
      parts.push(`${intro}Vous esquivez : ${name.toLowerCase()} frappe dans le vide !`);
      if (shadow) {
        const riposte = this.strike(1, { spell: this.basicIsSpell(), element: this.basicIsSpell() ? this.weaponElement() : undefined });
        parts.push(`Riposte : ${this.describeStrike(riposte)}`);
        if (this.monster.hp <= 0) return { landed: false, damage: 0, defeat: false, victory: true };
      }
      return { landed: false, damage: 0, defeat: false, victory: false };
    }
    if (!options.magic && this.leftHand()?.category === 'shield' && this.rng() < SHIELD_BLOCK_CHANCE) {
      parts.push(`${intro}Vous bloquez le coup avec votre bouclier !`);
      return { landed: false, damage: 0, defeat: false, victory: false };
    }

    const toxins = this.rank('toxins') > 0 && Boolean(this.statuses.poisoned);
    const raw =
      (this.monster.attack + this.randInt(-1, 2)) *
      mult *
      this.monsterAttackMultiplier() *
      (frozen ? FROZEN_ATTACK_MULTIPLIER : 1) *
      (weakened ? WEAKENED_ATTACK_MULTIPLIER : 1) *
      (toxins ? 0.9 : 1);
    let damage: number;
    if (options.magic) {
      // Magic ignores armor; Intelligence resists it.
      const resist = Math.min(MAGIC_RESIST_CAP, this.stats().intelligence * MAGIC_RESIST_PER_INT);
      damage = Math.max(1, Math.round(raw * (1 - resist)));
    } else {
      // Armor can cancel at most 60% of the monster's attack, so stacking it
      // never makes a fully-geared player unkillable.
      const effectiveArmor = Math.min(this.armor(), this.monster.attack * mult * 0.6);
      damage = Math.max(1, Math.round((raw - effectiveArmor) * (1 - 0.05 * this.rank('steel_skin'))));
    }
    if (stance) damage = Math.max(1, Math.round(damage / 2));
    if (this.fx.berserk > 0) damage = Math.round(damage * 1.25);
    // Nain, Sang-froid des tréfonds.
    if (this.character.race === 'dwarf') damage = Math.max(1, Math.round(damage * 0.9));

    const absorbed = Math.min(this.fx.shield, damage);
    let frozenByBarrier = false;
    if (absorbed > 0) {
      this.fx.shield -= absorbed;
      damage -= absorbed;
      if (this.fx.iceShield && this.rank('ice_heart') > 0) {
        frozenByBarrier = this.inflict('frozen', freezeStatus(this.statusMods()));
      }
      if (this.fx.shield <= 0) this.fx.iceShield = false;
    }

    this.character.hp = Math.max(0, this.character.hp - damage);
    parts.push(
      absorbed > 0
        ? `${intro || `${name} frappe : `}${absorbed} absorbés, ${damage} dégâts.`
        : intro
          ? `${intro}${damage} dégâts.`
          : `${name} vous inflige ${damage} dégâts.`,
    );
    if (frozenByBarrier) parts.push(`${name} est gelé par la barrière !`);
    if (this.kind === 'rage') this.resource = this.resource + RAGE_PER_HIT_TAKEN + 5 * this.rank('hot_blood');

    const defeat = !this.survive(parts);
    return { landed: damage > 0, damage, defeat, victory: false };
  }

  // Grâce, then Détermination, then Dernier rempart. False if the player falls.
  private survive(parts: string[]): boolean {
    if (this.character.hp <= 0 && this.rank('grace') > 0 && !this.fx.graceUsed) {
      this.fx.graceUsed = true;
      this.character.hp = Math.max(1, Math.round(this.character.maxHp * 0.3));
      parts.push('Grâce : une lumière vous retient !');
    }
    if (this.character.hp <= 0 && this.character.race === 'human' && !this.fx.determinationUsed) {
      this.fx.determinationUsed = true;
      this.character.hp = 1;
      parts.push('Détermination : vous tenez debout avec 1 PV !');
    }
    if (this.character.hp <= 0) return false;
    if (this.rank('last_bastion') > 0 && !this.fx.lastBastionUsed && this.character.hp < this.character.maxHp * 0.25) {
      this.fx.lastBastionUsed = true;
      this.fx.shield = Math.max(this.fx.shield, Math.round(this.character.maxHp * 0.2));
      this.fx.iceShield = false;
      parts.push(`Dernier rempart (${this.fx.shield}) !`);
    }
    return true;
  }

  private afterMonsterHit(parts: string[], r: MonsterHitResult): MonsterTurnResult {
    if (r.victory) return { log: parts.join(' '), outcome: 'victory', hit: true };
    if (r.defeat) return { log: parts.join(' '), outcome: 'defeat', hit: true };
    return this.endMonsterTurn(parts, true);
  }

  private endMonsterTurn(parts: string[], hit: boolean): MonsterTurnResult {
    const alive = this.startPlayerTurn(parts);
    return { log: parts.join(' '), outcome: alive ? 'ongoing' : 'defeat', hit };
  }

  // Start of the player's turn: damage-over-time, resource regeneration and
  // heal-over-time. False if a damage-over-time state finishes the player.
  private startPlayerTurn(parts: string[]): boolean {
    let suffered = 0;
    const dots: [PlayerStatusId, string][] = [
      ['poisoned', 'Poison'],
      ['burning', 'Brûlure'],
      ['bleeding', 'Saignement'],
    ];
    for (const [id, label] of dots) {
      const status = this.playerStatuses[id];
      if (!status) continue;
      const damage = status.damage ?? 1;
      suffered += damage;
      parts.push(`${label} : -${damage} PV.`);
      this.consumePlayerStatus(id);
    }
    if (suffered > 0) {
      this.character.hp = Math.max(0, this.character.hp - suffered);
      if (!this.survive(parts)) return false;
    }

    // Elfe, Affinité naturelle: +1 mana or +2 endurance per turn.
    const elf = this.character.race === 'elf';
    if (this.kind === 'mana') {
      this.resource =
        this.resource +
        MANA_REGEN_PER_TURN +
        this.rank('quick_mind') +
        (this.rank('sacred_aura') > 0 ? 1 : 0) +
        (elf ? 1 : 0);
    } else if (this.kind === 'endurance') {
      this.resource =
        this.resource + ENDURANCE_REGEN_PER_TURN + (this.rank('second_wind') > 0 ? 4 : 0) + (elf ? 2 : 0);
    }
    let healed = 0;
    if (this.fx.regenTurns > 0) {
      this.fx.regenTurns -= 1;
      healed += this.heal(this.character.maxHp * this.fx.regenPct);
    }
    if (this.rank('sacred_aura') > 0) healed += this.heal(this.character.maxHp * 0.02);
    if (healed > 0) parts.push(`+${healed} PV.`);
    return true;
  }

  // ------------------------------------------------------------- display

  // The boss announced its heavy blow for its next turn.
  monsterTelegraphing(): boolean {
    return this.mfx.telegraph;
  }

  monsterStatusLine(): string {
    const parts: string[] = [];
    if (this.mfx.telegraph) parts.push('Prend son élan !');
    if (this.mfx.enraged) parts.push('Enragé');
    if (this.mfx.shell > 0) parts.push('Carapace');
    if (this.mfx.frenzy > 0) parts.push(`Frénésie +${this.mfx.frenzy * 10} %`);
    const states = statusLine(this.statuses);
    if (states) parts.push(states);
    return parts.join(' · ');
  }

  playerStatusLine(): string {
    return (Object.keys(this.playerStatuses) as PlayerStatusId[])
      .map((id) => `${PLAYER_STATUS_LABELS[id]} (${this.playerStatuses[id]!.turns})`)
      .join(' · ');
  }

  playerEffectsLine(): string {
    const fx = this.fx;
    const parts: string[] = [];
    if (fx.shield > 0) parts.push(`Bouclier ${fx.shield}`);
    if (fx.stance > 0) parts.push(`Posture (${fx.stance})`);
    if (fx.berserk > 0) parts.push(`Berserk (${fx.berserk})`);
    if (fx.blessing > 0) parts.push(`Bénédiction (${fx.blessing})`);
    if (fx.overload > 0) parts.push(`Surcharge (${fx.overload})`);
    if (fx.huntersShadow > 0) parts.push(`Ombre (${fx.huntersShadow})`);
    if (fx.regenTurns > 0) parts.push(`Régénération (${fx.regenTurns})`);
    if (fx.coatedBlade > 0) parts.push(`Lame enduite (${fx.coatedBlade})`);
    if (fx.nextCrit) parts.push('Critique prêt');
    if (fx.guaranteedDodge) parts.push('Esquive prête');
    return parts.join(' · ');
  }
}
