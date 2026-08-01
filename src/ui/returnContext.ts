// Scenes opened from the Menu overlay (Inventaire/Sac/Stats/Quêtes) need to send
// the player back to exactly where they were — the scene they came from, at the
// exact spot they stood — instead of always landing back at that scene's default
// spawn point.
export type ReturnSceneKey =
  | 'Village'
  | 'Field'
  | 'Dungeon'
  | 'Hamlet'
  | 'Forest'
  | 'Cave'
  | 'BanditCamp'
  | 'GoblinCamp'
  | 'Farm'
  | 'Shrine'
  | 'Road'
  | 'City'
  | 'Catacombs'
  | 'OldWell'
  | 'Faubourg'
  | 'Warehouse'
  | 'Archives'
  | 'RiverRoad'
  | 'HunterOutpost'
  | 'MarshLair'
  | 'SunkenRoad'
  | 'Vasenoire'
  | 'SunkenRuins'
  | 'ClandestineDock'
  | 'SealedSanctuary'
  | 'ShardSeekersCamp'
  | 'BrotherhoodTomb'
  | 'BlightedGrove'
  | 'SealChamber';

export interface ReturnContext {
  returnScene: ReturnSceneKey;
  x?: number;
  y?: number;
}

// Scenes with fixed (non-random) encounters track which ones are cleared
// across scene.start() round trips via a `resume` flag — any return trip
// into one of these must set that flag, or a fled/won fight's encounter zone
// respawns right under the player's feet (Dungeon: also re-locks the boss
// gate).
const RESUMABLE_SCENES = new Set<ReturnSceneKey>([
  'Dungeon',
  'Cave',
  'BanditCamp',
  'GoblinCamp',
  'Catacombs',
  'OldWell',
  'Faubourg',
  'Warehouse',
  'Archives',
  'MarshLair',
  'Farm',
  'Road',
  'SunkenRuins',
  'ClandestineDock',
  'SealedSanctuary',
  'ShardSeekersCamp',
  'BrotherhoodTomb',
  'BlightedGrove',
  'SealChamber',
]);

export function returnSceneStartData(returnScene: ReturnSceneKey, x?: number, y?: number): Record<string, unknown> {
  const data: Record<string, unknown> = { x, y };
  if (RESUMABLE_SCENES.has(returnScene)) data.resume = true;
  return data;
}
