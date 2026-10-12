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

// The sprite on the map: the same drawing traced `height` pixels tall
// (about a figure's height there; a boss stands taller).
export function monsterMapSprite(id: string, height: number): MonsterArt | undefined {
  const draw = PORTRAITS[id];
  if (!draw) return undefined;
  return draw(height / draw(1).pm.h);
}

export const DRAWN_MONSTER_IDS = Object.keys(PORTRAITS);
