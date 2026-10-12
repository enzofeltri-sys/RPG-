// The monsters of Vaeloria, drawn by the game like the rest of the world:
// light from the top left, five-tone ramps, a dark outline. Each monster is
// one drawing on a design grid (monsters/*.ts), traced large for its combat
// portrait and small for its sprite on the map.

import { BEAST_PORTRAITS } from './monsters/beasts';
import { CONSTRUCT_PORTRAITS } from './monsters/constructs';
import type { MonsterArt, Portrait } from './monsters/kit';

export type { MonsterArt };

const PORTRAITS: Record<string, Portrait> = { ...BEAST_PORTRAITS, ...CONSTRUCT_PORTRAITS };

export function hasDrawnMonster(id: string): boolean {
  return id in PORTRAITS;
}

// The combat portrait (shown at its own size, about 64-72 game pixels).
export function monsterPortrait(id: string): MonsterArt | undefined {
  return PORTRAITS[id]?.(1);
}

// The sprite on the map: the same drawing traced small, at the scale that
// makes the creature its true size next to the hero (a man-sized monster
// about as tall as him, a rat a fraction of that).
const MAP_SCALE = 0.38;
const MAP_SCALE_OF: Record<string, number> = {
  field_rat: 0.3,
  cave_rat: 0.36,
  rat_king: 0.42,
  cave_spider: 0.34,
  marsh_serpent: 0.34,
  marsh_matriarch: 0.34,
  corrupted_boar: 0.36,
  corrupted_boar_alpha: 0.36,
};
export function monsterMapSprite(id: string): MonsterArt | undefined {
  return PORTRAITS[id]?.(MAP_SCALE_OF[id] ?? MAP_SCALE);
}

export const DRAWN_MONSTER_IDS = Object.keys(PORTRAITS);
