import type { Character } from './character';
import { monsterIds } from './monster';

// Difficulty modes (DESIGN.md, gameplay pass step 8), chosen at character
// creation. Facile/Normal/Difficile can be switched later from Options;
// a character with permadeath (Nuzlocke, or Difficile + mort définitive)
// and the Randomizer option are fixed for good, so neither can be dodged
// right before a boss.

export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Facile',
  normal: 'Normal',
  hard: 'Difficile',
};

interface DifficultyRules {
  monsterHp: number;
  monsterAttack: number;
  // Multiplies the elite / legendary encounter chances.
  eliteChance: number;
  defeatGoldLoss: number;
  // Defeat also wipes the XP earned toward the next level.
  defeatLosesXp: boolean;
}

export const DIFFICULTY_RULES: Record<Difficulty, DifficultyRules> = {
  easy: { monsterHp: 0.9, monsterAttack: 0.85, eliteChance: 1, defeatGoldLoss: 0, defeatLosesXp: false },
  normal: { monsterHp: 1, monsterAttack: 1, eliteChance: 1, defeatGoldLoss: 0.2, defeatLosesXp: false },
  hard: { monsterHp: 1.12, monsterAttack: 1.08, eliteChance: 1.5, defeatGoldLoss: 0.3, defeatLosesXp: true },
};

// Share of max HP recovered after every victory (all modes).
export const VICTORY_HEAL = 0.25;

export function difficultyOf(character: Character): Difficulty {
  return character.difficulty ?? 'normal';
}

// The mode name shown to the player: Nuzlocke is Normal with permadeath.
export function modeLabel(character: Character): string {
  const difficulty = difficultyOf(character);
  if (character.permadeath && difficulty === 'normal') return 'Nuzlocke';
  const base = DIFFICULTY_LABELS[difficulty];
  return character.permadeath ? `${base} · mort définitive` : base;
}

export function canChangeDifficulty(character: Character): boolean {
  return !character.permadeath;
}

// ------------------------------------------------------------ randomizer

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededIndex(seed: number, key: string, length: number): number {
  return hash(`${seed}:${key}`) % length;
}

// The final boss stays the final boss; every other monster is drawn from
// its own pool (regulars stay regulars, bosses stay bosses). The zone's
// level then scales whatever was drawn (see createMonster).
const FIXED_MONSTERS = new Set(['demon_king_echo']);

export function randomizedMonsterId(character: Character, scene: string, originalId: string): string {
  const seed = character.randomizerSeed;
  if (seed === undefined || FIXED_MONSTERS.has(originalId)) return originalId;
  const all = monsterIds();
  const original = all.find((m) => m.id === originalId);
  if (!original) return originalId;
  const pool = all.filter((m) => m.isBoss === original.isBoss && !FIXED_MONSTERS.has(m.id)).map((m) => m.id);
  return pool[seededIndex(seed, `${scene}:${originalId}`, pool.length)];
}

// Deterministic shuffle of a list of keys, the same for a whole playthrough
// (used for the bosses' unique rewards).
export function seededShuffle<T>(seed: number, salt: string, items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = seededIndex(seed, `${salt}:${i}`, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function newRandomizerSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
