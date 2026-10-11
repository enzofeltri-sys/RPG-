import { Character } from './character';
import { MainQuestStage, storyIndex } from './mainQuest';
import type { ReturnSceneKey } from '../ui/returnContext';

// Les pierres de passage: menhirs the Watchers raised by the places that
// mattered, which the hero's mark wakes. Once awake, a stone can be
// travelled to from anywhere outdoors (the Carte), or from another stone.
export interface Waystone {
  id: string; // the zone's key (world/zones), where its prop stands
  label: string;
  scene: ReturnSceneKey;
  // Where the hero arrives: just in front of the stone.
  arrive: [number, number];
  // Older saves: awake already once the story has gone this far (the hero
  // has been there).
  reachedBy?: MainQuestStage;
}

export const WAYSTONES: Waystone[] = [
  { id: 'basse-combe', label: 'Basse-Combe', scene: 'Hamlet', arrive: [160, 214] },
  { id: 'valombre', label: 'Valombre', scene: 'Village', arrive: [186, 272], reachedBy: 'dungeon' },
  { id: 'shrine', label: 'Sanctuaire', scene: 'Shrine', arrive: [160, 186], reachedBy: 'dungeon' },
  { id: 'city', label: 'Aiglemont', scene: 'City', arrive: [222, 204], reachedBy: 'complete' },
  { id: 'hunter-outpost', label: 'Relais des chasseurs', scene: 'HunterOutpost', arrive: [40, 230], reachedBy: 'crossing_marshes' },
  { id: 'vasenoire', label: 'Vasenoire', scene: 'Vasenoire', arrive: [96, 240], reachedBy: 'vasenoire_arrival' },
];

export const WAYSTONE_BY_ZONE = new Map(WAYSTONES.map((w) => [w.id, w]));

// Outdoor places one can travel from (not dungeons, not indoors).
export const TRAVEL_FROM = new Set<ReturnSceneKey>([
  'Hamlet', 'Village', 'Farm', 'Field', 'Forest', 'Shrine', 'BanditCamp', 'GoblinCamp', 'ForgottenGrave',
  'Road', 'City', 'Faubourg', 'RiverRoad', 'HunterOutpost', 'SunkenRoad', 'Vasenoire',
] as ReturnSceneKey[]);

export function isWaystoneAwake(character: Character, id: string): boolean {
  if (id === 'basse-combe') return true;
  if (character.waystones?.includes(id)) return true;
  const stone = WAYSTONE_BY_ZONE.get(id);
  return !!stone?.reachedBy && storyIndex(character) >= storyIndex({ mainQuestStage: stone.reachedBy } as Character);
}

export function awakeWaystones(character: Character): Waystone[] {
  return WAYSTONES.filter((w) => isWaystoneAwake(character, w.id));
}

// Wakes a stone; false if it was already awake.
export function wakeWaystone(character: Character, id: string): boolean {
  if (isWaystoneAwake(character, id)) return false;
  character.waystones = [...(character.waystones ?? []), id];
  return true;
}
