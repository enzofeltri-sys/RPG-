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

function applyStatus(statuses: MonsterStatuses, id: MonsterStatusId, value: number): void {
  const fresh: ActiveStatus =
    id === 'poisoned'
      ? { turns: 3, damage: Math.max(1, Math.ceil(value / 2)) }
      : id === 'burning'
        ? { turns: 2, damage: Math.max(1, value) }
        : { turns: id === 'weakened' || id === 'vulnerable' ? 2 : 1 };
  const current = statuses[id];
  statuses[id] = current
    ? { turns: Math.max(current.turns, fresh.turns), damage: Math.max(current.damage ?? 0, fresh.damage ?? 0) || undefined }
    : fresh;
}

// Rolls each elemental stat of the player's gear and applies the matching
// state on success. Returns the states newly applied (or refreshed).
export function rollElementStatuses(
  stats: CharacterStats,
  statuses: MonsterStatuses,
  rng: () => number = Math.random,
): MonsterStatusId[] {
  const applied: MonsterStatusId[] = [];
  for (const [stat, id] of ELEMENT_STATUS) {
    const value = stats[stat];
    if (value > 0 && rng() < statusChance(id, value)) {
      applyStatus(statuses, id, value);
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
