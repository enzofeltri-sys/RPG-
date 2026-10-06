import { CharacterStats } from './character';

// States the player can inflict on a monster. Each one is consumed when it
// takes effect rather than on a global clock: damage-over-time ticks at the
// start of the monster's turn, stun when the monster would act, frozen and
// weakened on the monster's next attack(s), vulnerable on the player's next
// hit(s). That keeps every "N tours" in the descriptions literally true.
export type MonsterStatusId = 'poisoned' | 'burning' | 'frozen' | 'stunned' | 'weakened' | 'vulnerable';

export interface ActiveStatus {
  turns: number;
  damage?: number;
}

export type MonsterStatuses = Partial<Record<MonsterStatusId, ActiveStatus>>;

export const STATUS_LABELS: Record<MonsterStatusId, string> = {
  poisoned: 'Empoisonné',
  burning: 'Brûlure',
  frozen: 'Gelé',
  stunned: 'Étourdi',
  weakened: 'Affaibli',
  vulnerable: 'Vulnérable',
};

const STATUS_ADJECTIVES: Record<MonsterStatusId, string> = {
  poisoned: 'empoisonné',
  burning: 'en feu',
  frozen: 'gelé',
  stunned: 'étourdi',
  weakened: 'affaibli',
  vulnerable: 'vulnérable',
};

export const FROZEN_ATTACK_MULTIPLIER = 0.8;
export const WEAKENED_ATTACK_MULTIPLIER = 0.75;
export const VULNERABLE_DAMAGE_MULTIPLIER = 1.2;

const ELEMENT_STATUS: [keyof CharacterStats, MonsterStatusId][] = [
  ['poisonDamage', 'poisoned'],
  ['fireDamage', 'burning'],
  ['iceDamage', 'frozen'],
  ['electricDamage', 'stunned'],
  ['darkDamage', 'weakened'],
  ['earthDamage', 'vulnerable'],
];

// ~15% at 1 point of the element, +2% per extra point, capped at 40%. Stun
// skips a whole monster turn, so it is rarer and capped lower.
export function statusChance(id: MonsterStatusId, value: number): number {
  if (value <= 0) return 0;
  if (id === 'stunned') return Math.min(0.2, 0.07 + value * 0.01);
  return Math.min(0.4, 0.13 + value * 0.02);
}

// Talent bonuses on states the player inflicts (Venin, Ignition, Froid
// mordant — see talents.ts). Applied to gear-triggered states and to the
// ones skills inflict alike.
export interface StatusMods {
  poisonDamage: number;
  poisonTurns: number;
  burnDamage: number;
  freezeTurns: number;
}

export const NO_STATUS_MODS: StatusMods = { poisonDamage: 0, poisonTurns: 0, burnDamage: 0, freezeTurns: 0 };

// A fresh application refreshes the duration and keeps the stronger tick.
export function applyStatus(statuses: MonsterStatuses, id: MonsterStatusId, fresh: ActiveStatus): void {
  const current = statuses[id];
  statuses[id] = current
    ? { turns: Math.max(current.turns, fresh.turns), damage: Math.max(current.damage ?? 0, fresh.damage ?? 0) || undefined }
    : fresh;
}

// Base poison/burn/freeze before talent bonuses, from the strength of the
// source (an element's value on gear, or a stat for skills).
export function poisonStatus(power: number, mods: StatusMods, baseTurns = 3): ActiveStatus {
  return { turns: baseTurns + mods.poisonTurns, damage: Math.max(1, Math.ceil(power / 2)) + mods.poisonDamage };
}

export function burnStatus(power: number, mods: StatusMods, baseTurns = 2): ActiveStatus {
  return { turns: baseTurns, damage: Math.max(1, power) + mods.burnDamage };
}

export function freezeStatus(mods: StatusMods): ActiveStatus {
  return { turns: 1 + mods.freezeTurns };
}

function gearStatus(id: MonsterStatusId, value: number, mods: StatusMods): ActiveStatus {
  if (id === 'poisoned') return poisonStatus(value, mods);
  if (id === 'burning') return burnStatus(value, mods);
  if (id === 'frozen') return freezeStatus(mods);
  return { turns: id === 'weakened' || id === 'vulnerable' ? 2 : 1 };
}

// Rolls each elemental stat of the player's gear and applies the matching
// state on success. Returns the states newly applied (or refreshed).
export function rollElementStatuses(
  stats: CharacterStats,
  statuses: MonsterStatuses,
  rng: () => number = Math.random,
  mods: StatusMods = NO_STATUS_MODS,
): MonsterStatusId[] {
  const applied: MonsterStatusId[] = [];
  for (const [stat, id] of ELEMENT_STATUS) {
    const value = stats[stat];
    if (value > 0 && rng() < statusChance(id, value)) {
      applyStatus(statuses, id, gearStatus(id, value, mods));
      applied.push(id);
    }
  }
  return applied;
}

// Uses one charge of a state; removes it once spent.
export function consumeStatus(statuses: MonsterStatuses, id: MonsterStatusId): boolean {
  const status = statuses[id];
  if (!status) return false;
  status.turns -= 1;
  if (status.turns <= 0) delete statuses[id];
  return true;
}

// Poison/burn damage dealt at the start of the monster's turn.
export function tickDamageOverTime(statuses: MonsterStatuses): { total: number; parts: string[] } {
  let total = 0;
  const parts: string[] = [];
  for (const id of ['poisoned', 'burning'] as const) {
    const status = statuses[id];
    if (!status) continue;
    const damage = status.damage ?? 1;
    total += damage;
    parts.push(`${id === 'poisoned' ? 'Poison' : 'Brûlure'} : -${damage} PV.`);
    consumeStatus(statuses, id);
  }
  return { total, parts };
}

export function describeApplied(monsterName: string, applied: MonsterStatusId[]): string {
  if (applied.length === 0) return '';
  return ` ${monsterName} : ${applied.map((id) => STATUS_ADJECTIVES[id]).join(', ')} !`;
}

export function statusLine(statuses: MonsterStatuses): string {
  return (Object.keys(statuses) as MonsterStatusId[])
    .map((id) => `${STATUS_LABELS[id]} (${statuses[id]!.turns})`)
    .join(' · ');
}
