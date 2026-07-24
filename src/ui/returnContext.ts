// Scenes opened from the Menu overlay (Inventaire/Sac/Stats/Quêtes) need to send
// the player back to exactly where they were — the scene they came from, at the
// exact spot they stood — instead of always landing back at that scene's default
// spawn point.
export type ReturnSceneKey = 'Village' | 'Field' | 'Dungeon' | 'Hamlet';

export interface ReturnContext {
  returnScene: ReturnSceneKey;
  x?: number;
  y?: number;
}

// DungeonScene tracks cleared encounters across scene.start() round trips via a
// `resume` flag (see DungeonScene) — any return trip into it must set that flag,
// or it wipes progress and re-locks the boss gate.
export function returnSceneStartData(returnScene: ReturnSceneKey, x?: number, y?: number): Record<string, unknown> {
  const data: Record<string, unknown> = { x, y };
  if (returnScene === 'Dungeon') data.resume = true;
  return data;
}
