import type { CharClass, Character } from './character';

// Talent trees (DESIGN.md, gameplay pass step 2). Each class has one free
// starting skill plus 3 branches of 4 talents, unlocked in branch order at
// levels 1/5/10/15. Talent points: see talentPointsTotal. Passives have
// ranks; actives have 2 ranks (learn, then one upgrade). At most 4 active
// skills are equipped for combat.

export type ResourceKind = 'rage' | 'mana' | 'endurance';

export const CLASS_RESOURCE: Record<CharClass, ResourceKind> = {
  warrior: 'rage',
  mage: 'mana',
  cleric: 'mana',
  archer: 'endurance',
  rogue: 'endurance',
};

export const RESOURCE_LABELS: Record<ResourceKind, string> = {
  rage: 'Rage',
  mana: 'Mana',
  endurance: 'Endurance',
};

export const RAGE_MAX = 100;
export const RAGE_PER_ATTACK = 25;
export const RAGE_PER_HIT_TAKEN = 15;
export const MANA_REGEN_PER_TURN = 1;
export const ENDURANCE_REGEN_PER_TURN = 8;

export function enduranceMax(vitality: number): number {
  return 40 + 3 * Math.max(0, vitality);
}

export const MAX_LEVEL = 30;
export const MAX_EQUIPPED_SKILLS = 4;
export const TIER_LEVELS = [1, 5, 10, 15];

export type SkillRequirement = 'shield' | 'bow' | 'dual';

export const REQUIREMENT_LABELS: Record<SkillRequirement, string> = {
  shield: 'Demande un bouclier.',
  bow: 'Demande un arc.',
  dual: 'Demande deux armes.',
};

type Values = Record<string, number>;

interface BaseTalent {
  id: string;
  charClass: CharClass;
  // -1 = the free starting skill.
  branch: number;
  tier: number;
  name: string;
}

export interface ActiveTalent extends BaseTalent {
  kind: 'active';
  // [learned, upgraded]
  cost: [number, number];
  values: [Values, Values];
  requires?: SkillRequirement;
  describe: (v: Values) => string;
  // What the upgrade changes, shown before buying it.
  upgrade: string;
}

export interface PassiveTalent extends BaseTalent {
  kind: 'passive';
  maxRank: number;
  describe: (rank: number) => string;
}

export type TalentDef = ActiveTalent | PassiveTalent;

// French decimal comma for multipliers ("×1,8").
export function fmt(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

const pct = (n: number) => `${Math.round(n * 100)} %`;

function active(
  id: string,
  charClass: CharClass,
  branch: number,
  tier: number,
  name: string,
  cost: [number, number],
  values: [Values, Values],
  describe: (v: Values) => string,
  upgrade: string,
  requires?: SkillRequirement,
): ActiveTalent {
  return { id, charClass, branch, tier, name, kind: 'active', cost, values, describe, upgrade, requires };
}

function passive(
  id: string,
  charClass: CharClass,
  branch: number,
  tier: number,
  name: string,
  maxRank: number,
  describe: (rank: number) => string,
): PassiveTalent {
  return { id, charClass, branch, tier, name, kind: 'passive', maxRank, describe };
}

export const BRANCH_NAMES: Record<CharClass, [string, string, string]> = {
  warrior: ['Armes', 'Rempart', 'Furie'],
  mage: ['Feu', 'Givre', 'Arcanes'],
  cleric: ['Lumière', 'Soin', 'Foi'],
  archer: ['Précision', 'Pièges', 'Survie'],
  rogue: ['Assassinat', 'Poisons', 'Ombre'],
};

const TALENT_LIST: TalentDef[] = [
  // ---------------------------------------------------------------- Guerrier
  active('heavy_strike', 'warrior', -1, 0, 'Frappe lourde', [30, 30], [{ mult: 1.8 }, { mult: 2.1 }],
    (v) => `Dégâts ×${fmt(v.mult)}.`, 'Dégâts ×2,1.'),
  passive('weapon_mastery', 'warrior', 0, 0, 'Maîtrise des armes', 3,
    (r) => `+${5 * r} % de dégâts physiques.`),
  active('armor_break', 'warrior', 0, 1, 'Brise-armure', [40, 30], [{ mult: 1.2 }, { mult: 1.2 }],
    (v) => `Dégâts ×${fmt(v.mult)}, le monstre devient Vulnérable 2 tours.`, 'Coûte 30 de rage.'),
  passive('chain_strikes', 'warrior', 0, 2, 'Enchaînement', 1,
    () => 'Après une Frappe lourde, ta prochaine compétence coûte 10 de rage de moins.'),
  active('execution', 'warrior', 0, 3, 'Exécution', [60, 60], [{ low: 3, high: 1.5 }, { low: 3.5, high: 1.8 }],
    (v) => `Dégâts ×${fmt(v.low)} si le monstre a moins de 30 % de PV, sinon ×${fmt(v.high)}.`,
    'Dégâts ×3,5 / ×1,8.'),
  passive('steel_skin', 'warrior', 1, 0, "Peau d'acier", 3, (r) => `+${2 * r} d'armure.`),
  active('shield_bash', 'warrior', 1, 1, 'Coup de bouclier', [40, 30], [{ mult: 1 }, { mult: 1 }],
    () => 'Dégâts normaux, le monstre est Étourdi.', 'Coûte 30 de rage.', 'shield'),
  active('defensive_stance', 'warrior', 1, 2, 'Posture défensive', [25, 25], [{ turns: 2 }, { turns: 3 }],
    (v) => `Dégâts reçus divisés par 2 pendant les ${v.turns} prochaines attaques du monstre.`,
    'Dure 3 attaques.'),
  passive('last_bastion', 'warrior', 1, 3, 'Dernier rempart', 1,
    () => 'Une fois par combat, sous 25 % de PV, un bouclier absorbe 20 % de tes PV max.'),
  passive('hot_blood', 'warrior', 2, 0, 'Sang chaud', 3, (r) => `+${5 * r} de rage par coup reçu.`),
  active('war_cry', 'warrior', 2, 1, 'Cri de guerre', [20, 20], [{ turns: 3 }, { turns: 4 }],
    (v) => `Le monstre est Affaibli pendant ${v.turns} tours (il frappe 25 % moins fort).`, 'Dure 4 tours.'),
  passive('bloodthirst', 'warrior', 2, 2, 'Soif de sang', 2,
    (r) => `Tu récupères ${5 * r} % des dégâts que tu infliges.`),
  active('berserk', 'warrior', 2, 3, 'Berserk', [50, 40], [{ turns: 3 }, { turns: 3 }],
    (v) => `Pendant tes ${v.turns} prochaines actions : +50 % de dégâts infligés, +25 % de dégâts reçus.`,
    'Coûte 40 de rage.'),

  // -------------------------------------------------------------------- Mage
  active('fireball', 'mage', -1, 0, 'Boule de feu', [8, 8], [{ mult: 1.8 }, { mult: 2.1 }],
    (v) => `Sort : dégâts ×${fmt(v.mult)}, 50 % de chances de Brûlure.`, 'Dégâts ×2,1.'),
  passive('ignition', 'mage', 0, 0, 'Ignition', 3, (r) => `Tes brûlures font +${r} dégât${r > 1 ? 's' : ''} par tour.`),
  active('flame_wall', 'mage', 0, 1, 'Mur de flammes', [12, 9], [{ mult: 1.2 }, { mult: 1.2 }],
    (v) => `Sort : dégâts ×${fmt(v.mult)}, Brûlure garantie pendant 3 tours.`, 'Coûte 9 de mana.'),
  passive('combustion', 'mage', 0, 2, 'Combustion', 1, () => '+15 % de dégâts contre un monstre en Brûlure.'),
  active('meteor', 'mage', 0, 3, 'Météore', [25, 25], [{ mult: 3.2 }, { mult: 3.7 }],
    (v) => `Sort : dégâts ×${fmt(v.mult)}.`, 'Dégâts ×3,7.'),
  active('frost_bolt', 'mage', 1, 0, 'Éclair de givre', [8, 6], [{ mult: 1.3 }, { mult: 1.3 }],
    (v) => `Sort : dégâts ×${fmt(v.mult)}, Gel garanti.`, 'Coûte 6 de mana.'),
  passive('biting_cold', 'mage', 1, 1, 'Froid mordant', 2, (r) => `Le Gel dure ${r} tour${r > 1 ? 's' : ''} de plus.`),
  active('ice_barrier', 'mage', 1, 2, 'Barrière de glace', [10, 10], [{ hpPct: 0.15 }, { hpPct: 0.2 }],
    (v) => `Bouclier qui absorbe ${pct(v.hpPct)} de tes PV max + 2 × ton Intelligence.`, '20 % des PV max.'),
  passive('ice_heart', 'mage', 1, 3, 'Cœur de glace', 1, () => 'Un monstre qui frappe ta Barrière de glace est Gelé.'),
  passive('quick_mind', 'mage', 2, 0, 'Esprit vif', 3, (r) => `+${r} de mana par tour en combat.`),
  active('concentration', 'mage', 2, 1, 'Concentration', [0, 0], [{ manaPct: 0.25 }, { manaPct: 0.35 }],
    (v) => `Tu récupères ${pct(v.manaPct)} de ta mana max.`, '35 % de la mana max.'),
  passive('arcane_power', 'mage', 2, 2, 'Puissance arcanique', 2,
    (r) => `+${8 * r} % de dégâts à tes sorts, attaque au bâton ou au tome comprise.`),
  active('overload', 'mage', 2, 3, 'Surcharge', [15, 15], [{ turns: 3 }, { turns: 4 }],
    (v) => `Pendant tes ${v.turns} prochaines actions : sorts à moitié prix et +20 % de dégâts.`, 'Dure 4 actions.'),

  // ------------------------------------------------------------------- Clerc
  active('heal', 'cleric', -1, 0, 'Soin', [8, 8], [{ hpPct: 0.3 }, { hpPct: 0.4 }],
    (v) => `Rend ${pct(v.hpPct)} de tes PV max.`, 'Rend 40 % des PV max.'),
  active('smite', 'cleric', 0, 0, 'Châtiment', [8, 8], [{ mult: 1.5 }, { mult: 1.8 }],
    (v) => `Sort de Lumière : dégâts ×${fmt(v.mult)}.`, 'Dégâts ×1,8.'),
  passive('fervor', 'cleric', 0, 1, 'Ferveur', 3, (r) => `+${5 * r} % de dégâts à tes sorts.`),
  passive('judgment', 'cleric', 0, 2, 'Jugement', 1, () => 'Tes sorts de Lumière ont 15 % de chances d\'Étourdir.'),
  active('divine_wrath', 'cleric', 0, 3, 'Colère divine', [22, 22], [{ mult: 2.8 }, { mult: 3.2 }],
    (v) => `Sort de Lumière : dégâts ×${fmt(v.mult)}, tu te soignes de 25 % des dégâts infligés.`, 'Dégâts ×3,2.'),
  passive('healing_hands', 'cleric', 1, 0, 'Mains guérisseuses', 3, (r) => `+${10 * r} % à tous tes soins.`),
  active('regeneration', 'cleric', 1, 1, 'Régénération', [10, 10], [{ hpPct: 0.08 }, { hpPct: 0.1 }],
    (v) => `Rend ${pct(v.hpPct)} de tes PV max au début de tes 4 prochains tours.`, '10 % par tour.'),
  active('purification', 'cleric', 1, 2, 'Purification', [6, 6], [{ hpPct: 0.1 }, { hpPct: 0.2 }],
    (v) => `Retire tes états négatifs et rend ${pct(v.hpPct)} de tes PV max.`, 'Rend 20 % des PV max.'),
  passive('grace', 'cleric', 1, 3, 'Grâce', 1, () => 'Une fois par combat, un coup mortel te laisse à 30 % de tes PV.'),
  active('faith_shield', 'cleric', 2, 0, 'Bouclier de foi', [10, 10], [{ flat: 12, perInt: 2 }, { flat: 18, perInt: 3 }],
    (v) => `Bouclier qui absorbe ${v.flat} + ${v.perInt} × ton Intelligence.`, 'Absorbe 18 + 3 × Intelligence.'),
  passive('devotion', 'cleric', 2, 1, 'Dévotion', 3, (r) => `+${r} d'armure et +${5 * r} % de PV max.`),
  active('blessing', 'cleric', 2, 2, 'Bénédiction', [12, 12], [{ turns: 3 }, { turns: 4 }],
    (v) => `Pendant tes ${v.turns} prochaines actions : +25 % de dégâts et +3 d'armure.`, 'Dure 4 actions.'),
  passive('sacred_aura', 'cleric', 2, 3, 'Aura sacrée', 1, () => 'Chaque tour, tu récupères 3 % de tes PV max et 1 de mana.'),

  // ------------------------------------------------------------------ Archer
  active('perfect_aim', 'archer', -1, 0, 'Visée parfaite', [15, 10], [{}, {}],
    () => 'Action libre : ta prochaine attaque est un coup critique garanti. Toutes armes.', 'Coûte 10 d\'endurance.'),
  passive('lynx_eye', 'archer', 0, 0, 'Œil de lynx', 3, (r) => `+${4 * r} % de chances de coup critique.`),
  active('double_shot', 'archer', 0, 1, 'Double tir', [25, 25], [{ mult: 0.8 }, { mult: 0.95 }],
    (v) => `Deux tirs à ×${fmt(v.mult)}.`, 'Deux tirs à ×0,95.', 'bow'),
  passive('killer', 'archer', 0, 2, 'Tueur', 1, () => 'Tes coups critiques font ×1,8 au lieu de ×1,5.'),
  active('deadly_shot', 'archer', 0, 3, 'Tir mortel', [45, 35], [{ mult: 2.5 }, { mult: 2.5 }],
    (v) => `Dégâts ×${fmt(v.mult)}, coup critique garanti.`, 'Coûte 35 d\'endurance.', 'bow'),
  active('poison_arrow', 'archer', 1, 0, 'Flèche empoisonnée', [20, 15], [{ mult: 1 }, { mult: 1 }],
    () => 'Dégâts normaux, Poison garanti.', 'Coûte 15 d\'endurance.'),
  passive('venom', 'archer', 1, 1, 'Venin', 2, (r) => `Ton poison fait +${r} dégât${r > 1 ? 's' : ''} et dure ${r} tour${r > 1 ? 's' : ''} de plus.`),
  passive('snare', 'archer', 1, 2, 'Collet', 1, () => 'Toucher un monstre empoisonné : 20 % de chances de l\'Étourdir.'),
  active('arrow_rain', 'archer', 1, 3, 'Pluie de flèches', [40, 40], [{ mult: 0.7 }, { mult: 0.85 }],
    (v) => `3 tirs à ×${fmt(v.mult)}, chacun peut déclencher les états de ton équipement.`, '3 tirs à ×0,85.', 'bow'),
  passive('sidestep', 'archer', 2, 0, 'Pas de côté', 3,
    (r) => `+${3 * r} % d'esquive, plafond d'esquive porté à 40 %.`),
  active('fallback', 'archer', 2, 1, 'Repli', [15, 10], [{}, {}],
    () => 'Tu esquives à coup sûr le prochain coup.', 'Coûte 10 d\'endurance.'),
  passive('second_wind', 'archer', 2, 2, 'Second souffle', 1, () => '+4 d\'endurance par tour.'),
  active('hunters_shadow', 'archer', 2, 3, 'Ombre du chasseur', [35, 35], [{ turns: 3 }, { turns: 4 }],
    (v) => `Pendant les ${v.turns} prochaines attaques du monstre : +20 % d'esquive, chaque esquive déclenche une riposte.`,
    'Dure 4 attaques.'),

  // ------------------------------------------------------------------ Voleur
  active('low_blow', 'rogue', -1, 0, 'Coup bas', [15, 15], [{ mult: 1.4 }, { mult: 1.7 }],
    (v) => `Dégâts ×${fmt(v.mult)}, le monstre est Affaibli 2 tours.`, 'Dégâts ×1,7.'),
  passive('sharpened_blades', 'rogue', 0, 0, 'Lames affûtées', 3, (r) => `+${6 * r} % de dégâts avec une dague.`),
  active('sneak_attack', 'rogue', 0, 1, 'Frappe sournoise', [25, 25], [{ first: 2, other: 1.3 }, { first: 2.4, other: 1.5 }],
    (v) => `Dégâts ×${fmt(v.first)} si c'est ton premier coup du combat, sinon ×${fmt(v.other)}.`, 'Dégâts ×2,4 / ×1,5.'),
  passive('opportunist', 'rogue', 0, 2, 'Opportuniste', 1, () => '+25 % de dégâts contre un monstre Étourdi, Gelé ou Affaibli.'),
  active('blade_dance', 'rogue', 0, 3, 'Danse des lames', [40, 40], [{ mult: 0.5 }, { mult: 0.6 }],
    (v) => `4 coups à ×${fmt(v.mult)}, chacun peut être critique.`, '4 coups à ×0,6.', 'dual'),
  active('coat_blade', 'rogue', 1, 0, 'Enduire la lame', [15, 15], [{ turns: 3 }, { turns: 5 }],
    (v) => `Tes ${v.turns} prochaines attaques empoisonnent.`, 'Dure 5 attaques.'),
  passive('toxins', 'rogue', 1, 1, 'Toxines', 1, () => 'Un monstre empoisonné frappe 10 % moins fort.'),
  passive('weak_spot', 'rogue', 1, 2, 'Point faible', 1, () => 'Tes coups critiques rendent le monstre Vulnérable.'),
  active('deadly_venom', 'rogue', 1, 3, 'Venin mortel', [35, 35], [{ mult: 2 }, { mult: 2.5 }],
    (v) => `Inflige d'un coup ${v.mult === 2 ? 'le double' : `×${fmt(v.mult)}`} du poison qu'il reste au monstre. Demande un monstre empoisonné.`,
    '×2,5 le poison restant.'),
  active('feint', 'rogue', 2, 0, 'Feinte', [15, 10], [{}, {}],
    () => 'Tu esquives à coup sûr le prochain coup, et ta prochaine attaque est critique.', 'Coûte 10 d\'endurance.'),
  passive('reflexes', 'rogue', 2, 1, 'Réflexes', 3, (r) => `+${3 * r} % d'esquive.`),
  passive('pickpocket', 'rogue', 2, 2, 'Vol à la tire', 1, () => '+25 % d\'or à chaque victoire.'),
  active('vanish', 'rogue', 2, 3, 'Disparition', [30, 30], [{ regain: 30 }, { regain: 45 }],
    (v) => `Le prochain coup du monstre rate, et tu récupères ${v.regain} d'endurance.`, 'Récupère 45 d\'endurance.'),
];

export const TALENTS: Record<string, TalentDef> = Object.fromEntries(TALENT_LIST.map((t) => [t.id, t]));

export const STARTER_SKILL: Record<CharClass, string> = {
  warrior: 'heavy_strike',
  mage: 'fireball',
  cleric: 'heal',
  archer: 'perfect_aim',
  rogue: 'low_blow',
};

export function maxRank(def: TalentDef): number {
  return def.kind === 'active' ? 2 : def.maxRank;
}

export function talentsOf(charClass: CharClass): TalentDef[] {
  return TALENT_LIST.filter((t) => t.charClass === charClass);
}

export function branchTalents(charClass: CharClass, branch: number): TalentDef[] {
  return TALENT_LIST.filter((t) => t.charClass === charClass && t.branch === branch).sort((a, b) => a.tier - b.tier);
}

export function talentRank(character: Character, id: string): number {
  return character.talents?.[id] ?? 0;
}

// 1 point per level from 2 to 10, then 1 every 2 levels: 19 points at
// level 30, against 23-26 ranks per tree, so a full tree is out of reach and
// the build stays a choice.
export function talentPointsTotal(level: number): number {
  const capped = Math.min(level, MAX_LEVEL);
  if (capped <= 10) return Math.max(0, capped - 1);
  return 9 + Math.floor((capped - 10) / 2);
}

export function talentPointsSpent(character: Character): number {
  const starter = STARTER_SKILL[character.class];
  return Object.entries(character.talents ?? {}).reduce(
    (sum, [id, rank]) => sum + (id === starter ? Math.max(0, rank - 1) : rank),
    0,
  );
}

export function talentPointsAvailable(character: Character): number {
  return Math.max(0, talentPointsTotal(character.level) - talentPointsSpent(character));
}

// Why a talent can't be learned / upgraded right now, or null if it can.
export function learnBlocker(character: Character, id: string): string | null {
  const def = TALENTS[id];
  if (!def || def.charClass !== character.class) return 'Talent inconnu.';
  const rank = talentRank(character, id);
  if (rank >= maxRank(def)) return def.kind === 'active' ? 'Déjà amélioré.' : 'Rang maximum atteint.';
  if (rank === 0 && def.branch >= 0) {
    const level = TIER_LEVELS[def.tier];
    if (character.level < level) return `Disponible au niveau ${level}.`;
    if (def.tier > 0) {
      const previous = branchTalents(character.class, def.branch)[def.tier - 1];
      if (talentRank(character, previous.id) === 0) return `Apprends d'abord ${previous.name}.`;
    }
  }
  if (talentPointsAvailable(character) <= 0) return 'Aucun point de talent disponible.';
  return null;
}

// Dévotion raises max HP by a percentage; the stored maxHp keeps that bonus
// baked in (maxHp = round(base × multiplier)), so the base is recovered
// exactly by dividing and rounding back.
function hpMultiplier(rank: number): number {
  return 1 + 0.05 * rank;
}

function setMaxHp(character: Character, base: number, rank: number): void {
  const next = Math.round(base * hpMultiplier(rank));
  const delta = next - character.maxHp;
  character.maxHp = next;
  character.hp = Math.max(1, Math.min(next, character.hp + Math.max(0, delta)));
}

function rescaleMaxHp(character: Character, fromRank: number, toRank: number): void {
  if (fromRank === toRank) return;
  setMaxHp(character, Math.round(character.maxHp / hpMultiplier(fromRank)), toRank);
}

// Level-ups and Vitalité points add to the base, then the bonus re-applies.
export function addBaseMaxHp(character: Character, amount: number): void {
  const rank = talentRank(character, 'devotion');
  setMaxHp(character, Math.round(character.maxHp / hpMultiplier(rank)) + amount, rank);
}

export function learnTalent(character: Character, id: string): boolean {
  if (learnBlocker(character, id)) return false;
  const def = TALENTS[id];
  const rank = talentRank(character, id);
  character.talents = { ...(character.talents ?? {}), [id]: rank + 1 };
  if (id === 'devotion') rescaleMaxHp(character, rank, rank + 1);
  if (def.kind === 'active' && rank === 0) {
    const equipped = character.equippedSkills ?? [];
    if (equipped.length < MAX_EQUIPPED_SKILLS && !equipped.includes(id)) {
      character.equippedSkills = [...equipped, id];
    }
  }
  return true;
}

export function toggleEquipSkill(character: Character, id: string): 'equipped' | 'unequipped' | 'full' | 'invalid' {
  const def = TALENTS[id];
  if (!def || def.kind !== 'active' || talentRank(character, id) === 0) return 'invalid';
  const equipped = character.equippedSkills ?? [];
  if (equipped.includes(id)) {
    character.equippedSkills = equipped.filter((s) => s !== id);
    return 'unequipped';
  }
  if (equipped.length >= MAX_EQUIPPED_SKILLS) return 'full';
  character.equippedSkills = [...equipped, id];
  return 'equipped';
}

// Paid reset at the maître d'armes in Valombre.
export function respecCost(level: number): number {
  return 15 * level;
}

export function resetTalents(character: Character): void {
  const starter = STARTER_SKILL[character.class];
  rescaleMaxHp(character, talentRank(character, 'devotion'), 0);
  character.talents = { [starter]: 1 };
  character.equippedSkills = [starter];
}

// Older saves (and new characters) get the starter skill; ids from another
// class or removed talents are dropped. A tree holding more points than the
// level grants (the point rate changed) is reset for free.
export function ensureTalentDefaults(character: Character): void {
  const starter = STARTER_SKILL[character.class];
  const talents: Record<string, number> = {};
  Object.entries(character.talents ?? {}).forEach(([id, rank]) => {
    const def = TALENTS[id];
    if (def && def.charClass === character.class && rank > 0) talents[id] = Math.min(rank, maxRank(def));
  });
  if (!talents[starter]) talents[starter] = 1;
  character.talents = talents;
  if (talentPointsSpent(character) > talentPointsTotal(character.level)) {
    rescaleMaxHp(character, talentRank(character, 'devotion'), 0);
    character.talents = { [starter]: 1 };
    character.equippedSkills = [starter];
  }
  const equipped = (character.equippedSkills ?? [starter]).filter(
    (id, i, all) => TALENTS[id]?.kind === 'active' && talents[id] > 0 && all.indexOf(id) === i,
  );
  character.equippedSkills = equipped.slice(0, MAX_EQUIPPED_SKILLS);
}
