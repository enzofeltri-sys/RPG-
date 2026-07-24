// Scenes opened from the Menu overlay (Inventaire/Sac/Stats/Quêtes) need to send
// the player back to exactly where they were — the scene they came from, at the
// exact spot they stood — instead of always landing back at that scene's default
// spawn point.
export type ReturnSceneKey = 'Village' | 'Field' | 'Dungeon' | 'Hamlet' | 'Forest' | 'Cave';

export interface ReturnContext {
  returnScene: ReturnSceneKey;
  x?: number;
  y?: number;
}

// DungeonScene and CaveScene both track cleared encounters across
// scene.start() round trips via a `resume` flag — any return trip into
// either must set that flag, or a fled/won fight's encounter zone respawns
// right under the player's feet (Dungeon: also re-locks the boss gate).
export function returnSceneStartData(returnScene: ReturnSceneKey, x?: number, y?: number): Record<string, unknown> {
  const data: Record<string, unknown> = { x, y };
  if (returnScene === 'Dungeon' || returnScene === 'Cave') data.resume = true;
  return data;
}
