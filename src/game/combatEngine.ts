import { Character, CharacterStats, getEffectiveStats } from './character';
import type { Monster } from './monster';
import type { WeaponType } from './item';
import { CONSUMABLES, ConsumableId, useConsumable } from './consumable';
import {
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
  tickDamageOverTime,
} from './combatStatus';
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

// Which stat a weapon's damage scales from. Any class can wield any weapon:
// a bow hits with Agilité even in a Guerrier's hands.
export const WEAPON_SCALING_STAT: Record<WeaponType, keyof CharacterStats> = {
  sword: 'strength',
  axe: 'strength',
  bow: 'agility',
  dagger: 'agility',
  staff: 'intelligence',
  tome: 'intelligence',
};

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

interface StrikeOptions {
  spell: boolean;
  hits?: number;
  forceCrit?: boolean;
  // Roll gear states on every hit instead of once per action (Pluie de flèches).
  gearPerHit?: boolean;
  light?: boolean;
}

interface StrikeResult {
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

  constructor(
    readonly character: Character,
    readonly monster: Monster,
    private readonly rng: () => number = Math.random,
  ) {
    this.kind = CLASS_RESOURCE[character.class];
    if (this.kind === 'rage') {
      this.poolMax = RAGE_MAX;
      this.pool = 0;
    } else if (this.kind === 'endurance') {
      this.poolMax = enduranceMax(this.stats().vitality);
      this.pool = this.poolMax;
    }
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
      this.stats().armor + 2 * this.rank('steel_skin') + this.rank('devotion') + (this.fx.blessing > 0 ? 3 : 0)
    );
  }

  critChance(): number {
    return BASE_CRIT_CHANCE + 0.04 * this.rank('lynx_eye');
  }

  private critMultiplier(): number {
    return this.rank('killer') > 0 ? KILLER_CRIT_MULTIPLIER : CRIT_MULTIPLIER;
  }

  playerDodgeChance(): number {
    const bonus = 0.03 * (this.rank('sidestep') + this.rank('reflexes'));
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

  private weaponType(): WeaponType | undefined {
    return this.character.equipment.weapon?.weaponType;
  }

  // A staff or tome makes the basic attack a spell (Mage/Clerc's weapon spell).
  private basicIsSpell(): boolean {
    const type = this.weaponType();
    return type === 'staff' || type === 'tome';
  }

  private baseDamage(spell: boolean): number {
    const stats = this.stats();
    const type = this.weaponType();
    const scaling: keyof CharacterStats = spell ? 'intelligence' : type ? WEAPON_SCALING_STAT[type] : 'strength';
    const elemental =
      stats.fireDamage + stats.poisonDamage + stats.iceDamage + stats.electricDamage + stats.darkDamage + stats.earthDamage;
    return this.randInt(2, 5) + Math.floor(stats[scaling] / 2) + elemental;
  }

  private damageMultiplier(spell: boolean): number {
    let m = 1;
    if (!spell) {
      m *= 1 + 0.05 * this.rank('weapon_mastery');
      if (this.weaponType() === 'dagger') m *= 1 + 0.06 * this.rank('sharpened_blades');
    } else {
      m *= 1 + 0.08 * this.rank('arcane_power') + 0.05 * this.rank('fervor');
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
    return m;
  }

  // Heals from skills and talents, boosted by Mains guérisseuses.
  private heal(amount: number): number {
    const boosted = Math.round(amount * (1 + 0.1 * this.rank('healing_hands')));
    const before = this.character.hp;
    this.character.hp = Math.min(this.character.maxHp, this.character.hp + Math.max(0, boosted));
    return this.character.hp - before;
  }

  goldReward(): number {
    return Math.round(this.monster.goldReward * (this.rank('pickpocket') > 0 ? 1.25 : 1));
  }

  // ------------------------------------------------------------ striking

  private strike(mult: number, options: StrikeOptions): StrikeResult {
    const stats = this.stats();
    const hits = options.hits ?? 1;
    const vulnerable = consumeStatus(this.statuses, 'vulnerable');
    const forcedCrit = Boolean(options.forceCrit) || this.fx.nextCrit;
    this.fx.nextCrit = false;
    const wasPoisoned = Boolean(this.statuses.poisoned);
    const applied = new Set<MonsterStatusId>();
    const mods = this.statusMods();
    let total = 0;
    let crits = 0;
    let landed = 0;

    for (let i = 0; i < hits && this.monster.hp > 0; i++) {
      const crit = forcedCrit || this.rng() < this.critChance();
      const damage = Math.max(
        1,
        Math.round(
          this.baseDamage(options.spell) *
            mult *
            this.damageMultiplier(options.spell) *
            (crit ? this.critMultiplier() : 1) *
            (vulnerable ? VULNERABLE_DAMAGE_MULTIPLIER : 1),
        ),
      );
      this.monster.hp -= damage;
      total += damage;
      landed += 1;
      if (crit) crits += 1;
      if (options.gearPerHit && this.monster.hp > 0) {
        rollElementStatuses(stats, this.statuses, this.rng, mods).forEach((id) => applied.add(id));
      }
    }

    if (this.monster.hp > 0) {
      if (!options.gearPerHit) {
        rollElementStatuses(stats, this.statuses, this.rng, mods).forEach((id) => applied.add(id));
      }
      if (this.fx.coatedBlade > 0) {
        this.fx.coatedBlade -= 1;
        applyStatus(this.statuses, 'poisoned', this.skillPoison());
        applied.add('poisoned');
      }
      if (crits > 0 && this.rank('weak_spot') > 0) {
        applyStatus(this.statuses, 'vulnerable', { turns: 2 });
        applied.add('vulnerable');
      }
      if (wasPoisoned && this.rank('snare') > 0 && this.rng() < 0.2) {
        applyStatus(this.statuses, 'stunned', { turns: 1 });
        applied.add('stunned');
      }
      if (options.light && this.rank('judgment') > 0 && this.rng() < 0.15) {
        applyStatus(this.statuses, 'stunned', { turns: 1 });
        applied.add('stunned');
      }
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
    return { total, crits, hits: landed, applied: [...applied], healed };
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
    const critPart =
      result.crits === 0 ? '' : result.hits > 1 ? `${result.crits} coup${result.crits > 1 ? 's' : ''} critique${result.crits > 1 ? 's' : ''} ! ` : 'Coup critique ! ';
    const hitsPart = result.hits > 1 ? ` en ${result.hits} coups` : '';
    const healPart = result.healed > 0 ? ` Vous récupérez ${result.healed} PV.` : '';
    const applied = [...new Set([...result.applied, ...extra])];
    return `${critPart}Vous infligez ${result.total} dégâts${hitsPart}.${healPart}${describeApplied(this.monster.name, applied)}`;
  }

  // Ends a player action: offensive bonuses tick down, except the one this
  // very action just granted.
  private endAction(): void {
    OFFENSIVE_BUFFS.forEach((buff) => {
      if (this.fx[buff] > 0 && !this.freshBuffs.has(buff)) this.fx[buff] -= 1;
    });
    this.freshBuffs.clear();
  }

  private grantBuff(buff: OffensiveBuff, turns: number): void {
    this.fx[buff] = turns;
    this.freshBuffs.add(buff);
  }

  // ------------------------------------------------------------- actions

  attack(): ActionResult {
    const result = this.strike(1, { spell: this.basicIsSpell() });
    if (this.kind === 'rage') this.resource = this.resource + RAGE_PER_ATTACK;
    this.endAction();
    return { log: this.describeStrike(result), victory: this.monster.hp <= 0, endsTurn: true, hit: true };
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
    if (def.requires === 'shield' && this.character.equipment.shield?.category !== 'shield') {
      return { cost, usable: false, reason: REQUIREMENT_LABELS.shield };
    }
    if (def.requires === 'bow' && this.weaponType() !== 'bow') return { cost, usable: false, reason: REQUIREMENT_LABELS.bow };
    if (def.requires === 'dual') {
      const offhand = this.character.equipment.shield;
      const dual = Boolean(this.character.equipment.weapon) && Boolean(offhand) && offhand!.category !== 'shield';
      if (!dual) return { cost, usable: false, reason: REQUIREMENT_LABELS.dual };
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
        if (this.monster.hp > 0) applyStatus(this.statuses, 'vulnerable', { turns: 2 });
        log = this.describeStrike(r, this.monster.hp > 0 ? ['vulnerable'] : []);
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
        if (this.monster.hp > 0) applyStatus(this.statuses, 'stunned', { turns: 1 });
        log = this.describeStrike(r, this.monster.hp > 0 ? ['stunned'] : []);
        hit = true;
        break;
      }
      case 'defensive_stance':
        this.fx.stance = v.turns;
        log = 'Vous adoptez une posture défensive.';
        break;
      case 'war_cry':
        applyStatus(this.statuses, 'weakened', { turns: v.turns });
        log = `Votre cri de guerre fait reculer ${name.toLowerCase()} : affaibli !`;
        break;
      case 'berserk':
        this.grantBuff('berserk', v.turns);
        log = 'Vous entrez en furie !';
        break;

      // Mage
      case 'fireball': {
        const r = this.strike(v.mult, { spell: true });
        const burn = this.monster.hp > 0 && this.rng() < 0.5;
        if (burn) applyStatus(this.statuses, 'burning', this.skillBurn(2));
        log = this.describeStrike(r, burn ? ['burning'] : []);
        hit = true;
        break;
      }
      case 'flame_wall': {
        const r = this.strike(v.mult, { spell: true });
        if (this.monster.hp > 0) applyStatus(this.statuses, 'burning', this.skillBurn(3));
        log = this.describeStrike(r, this.monster.hp > 0 ? ['burning'] : []);
        hit = true;
        break;
      }
      case 'meteor': {
        log = this.describeStrike(this.strike(v.mult, { spell: true }));
        hit = true;
        break;
      }
      case 'frost_bolt': {
        const r = this.strike(v.mult, { spell: true });
        if (this.monster.hp > 0) applyStatus(this.statuses, 'frozen', freezeStatus(this.statusMods()));
        log = this.describeStrike(r, this.monster.hp > 0 ? ['frozen'] : []);
        hit = true;
        break;
      }
      case 'ice_barrier': {
        const amount = Math.round(this.character.maxHp * v.hpPct + 2 * stats.intelligence);
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
        log = this.describeStrike(this.strike(v.mult, { spell: true, light: true }));
        hit = true;
        break;
      case 'divine_wrath': {
        const r = this.strike(v.mult, { spell: true, light: true });
        const healed = this.heal(r.total * 0.25);
        log = this.describeStrike(r) + (healed > 0 ? ` La lumière vous rend ${healed} PV.` : '');
        hit = true;
        break;
      }
      case 'regeneration':
        this.fx.regenTurns = 4;
        this.fx.regenPct = v.hpPct;
        log = 'Une douce chaleur vous enveloppe.';
        break;
      case 'purification':
        log = `Vous êtes purifié et récupérez ${this.heal(this.character.maxHp * v.hpPct)} PV.`;
        break;
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
        const r = this.strike(v.mult, { spell: false });
        if (this.monster.hp > 0) applyStatus(this.statuses, 'poisoned', this.skillPoison());
        log = this.describeStrike(r, this.monster.hp > 0 ? ['poisoned'] : []);
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
        if (this.monster.hp > 0) applyStatus(this.statuses, 'weakened', { turns: 2 });
        log = this.describeStrike(r, this.monster.hp > 0 ? ['weakened'] : []);
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
    const hpBefore = this.character.hp;
    const mpBefore = this.character.mp;
    if (!useConsumable(this.character, id)) return { log: '', victory: false, endsTurn: false, hit: false };
    this.endAction();
    const def = CONSUMABLES[id];
    const gain = def.manaAmount
      ? `+${this.character.mp - mpBefore} de mana`
      : `+${this.character.hp - hpBefore} PV`;
    return { log: `Vous buvez une ${def.name.toLowerCase()} (${gain}).`, victory: false, endsTurn: true, hit: false };
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

    const dot = tickDamageOverTime(this.statuses);
    parts.push(...dot.parts);
    if (dot.total > 0) {
      this.monster.hp -= dot.total;
      if (this.monster.hp <= 0) {
        parts.push(`${name} succombe !`);
        return { log: parts.join(' '), outcome: 'victory', hit: true };
      }
    }

    if (consumeStatus(this.statuses, 'stunned')) {
      parts.push(`${name} est étourdi et ne peut pas agir.`);
      parts.push(...this.startPlayerTurn());
      return { log: parts.join(' '), outcome: 'ongoing', hit: false };
    }

    const frozen = consumeStatus(this.statuses, 'frozen');
    const weakened = consumeStatus(this.statuses, 'weakened');
    const stance = this.fx.stance > 0;
    if (stance) this.fx.stance -= 1;
    const dodgeRoll = this.playerDodgeChance();
    const shadow = this.fx.huntersShadow > 0;
    if (shadow) this.fx.huntersShadow -= 1;

    const dodged = this.fx.guaranteedDodge || this.rng() < dodgeRoll;
    this.fx.guaranteedDodge = false;
    if (dodged) {
      parts.push(`Vous esquivez l'attaque : ${name.toLowerCase()} frappe dans le vide !`);
      if (shadow) {
        const riposte = this.strike(1, { spell: this.basicIsSpell() });
        parts.push(`Riposte : ${this.describeStrike(riposte)}`);
        if (this.monster.hp <= 0) return { log: parts.join(' '), outcome: 'victory', hit: true };
      }
      parts.push(...this.startPlayerTurn());
      return { log: parts.join(' '), outcome: 'ongoing', hit: true };
    }

    const toxins = this.rank('toxins') > 0 && Boolean(this.statuses.poisoned);
    const raw =
      (this.monster.attack + this.randInt(-1, 2)) *
      (frozen ? FROZEN_ATTACK_MULTIPLIER : 1) *
      (weakened ? WEAKENED_ATTACK_MULTIPLIER : 1) *
      (toxins ? 0.9 : 1);
    // Armor can cancel at most 60% of the monster's attack, so stacking it
    // never makes a fully-geared player unkillable.
    const effectiveArmor = Math.min(this.armor(), this.monster.attack * 0.6);
    let damage = Math.max(1, Math.round(raw - effectiveArmor));
    if (stance) damage = Math.max(1, Math.round(damage / 2));
    if (this.fx.berserk > 0) damage = Math.round(damage * 1.25);

    const absorbed = Math.min(this.fx.shield, damage);
    let frozenByBarrier = false;
    if (absorbed > 0) {
      this.fx.shield -= absorbed;
      damage -= absorbed;
      if (this.fx.iceShield && this.rank('ice_heart') > 0) {
        applyStatus(this.statuses, 'frozen', freezeStatus(this.statusMods()));
        frozenByBarrier = true;
      }
      if (this.fx.shield <= 0) this.fx.iceShield = false;
    }

    this.character.hp = Math.max(0, this.character.hp - damage);
    parts.push(
      absorbed > 0
        ? `${name} frappe : ${absorbed} absorbés, ${damage} dégâts.`
        : `${name} vous inflige ${damage} dégâts.`,
    );
    if (frozenByBarrier) parts.push(`${name} est gelé par la barrière !`);

    if (this.kind === 'rage') this.resource = this.resource + RAGE_PER_HIT_TAKEN + 5 * this.rank('hot_blood');

    if (this.character.hp <= 0 && this.rank('grace') > 0 && !this.fx.graceUsed) {
      this.fx.graceUsed = true;
      this.character.hp = Math.max(1, Math.round(this.character.maxHp * 0.3));
      parts.push('Grâce : une lumière vous retient !');
    }
    if (this.character.hp <= 0) return { log: parts.join(' '), outcome: 'defeat', hit: true };

    if (
      this.rank('last_bastion') > 0 &&
      !this.fx.lastBastionUsed &&
      this.character.hp < this.character.maxHp * 0.25
    ) {
      this.fx.lastBastionUsed = true;
      this.fx.shield = Math.max(this.fx.shield, Math.round(this.character.maxHp * 0.2));
      this.fx.iceShield = false;
      parts.push(`Dernier rempart (${this.fx.shield}) !`);
    }

    parts.push(...this.startPlayerTurn());
    return { log: parts.join(' '), outcome: 'ongoing', hit: true };
  }

  // Resource regeneration and heal-over-time at the start of the player's turn.
  private startPlayerTurn(): string[] {
    const parts: string[] = [];
    if (this.kind === 'mana') {
      this.resource =
        this.resource + MANA_REGEN_PER_TURN + this.rank('quick_mind') + (this.rank('sacred_aura') > 0 ? 1 : 0);
    } else if (this.kind === 'endurance') {
      this.resource = this.resource + ENDURANCE_REGEN_PER_TURN + (this.rank('second_wind') > 0 ? 4 : 0);
    }
    let healed = 0;
    if (this.fx.regenTurns > 0) {
      this.fx.regenTurns -= 1;
      healed += this.heal(this.character.maxHp * this.fx.regenPct);
    }
    if (this.rank('sacred_aura') > 0) healed += this.heal(this.character.maxHp * 0.03);
    if (healed > 0) parts.push(`+${healed} PV.`);
    return parts;
  }

  // ------------------------------------------------------------- display

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
