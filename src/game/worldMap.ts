import type { ReturnSceneKey } from '../ui/returnContext';
import type { MainQuestStage } from './mainQuest';

// Schematic, not to-scale — the map exists to show relative position and
// point toward active quests, not to double as a real overworld layout.
// Split into tabs (see MapScene) purely to fit each region's node count on
// screen without needing a scrollable/pannable canvas.
export type MapRegion = 'start' | 'aiglemont' | 'terresnoyees';

export interface MapLocation {
  key: ReturnSceneKey;
  label: string;
  region: MapRegion;
  x: number;
  y: number;
}

export const MAP_LOCATIONS: MapLocation[] = [
  // Région de départ
  { key: 'Hamlet', label: 'Basse-Combe', region: 'start', x: 40, y: 55 },
  { key: 'Farm', label: 'Ferme', region: 'start', x: 100, y: 55 },
  { key: 'Shrine', label: 'Sanctuaire', region: 'start', x: 160, y: 55 },
  { key: 'Field', label: 'Le Champ', region: 'start', x: 40, y: 110 },
  { key: 'Dungeon', label: 'Repaire du Loup', region: 'start', x: 100, y: 110 },
  { key: 'BanditCamp', label: 'Camp bandits', region: 'start', x: 160, y: 110 },
  { key: 'Forest', label: 'Forêt', region: 'start', x: 40, y: 165 },
  { key: 'GoblinCamp', label: 'Camp gobelins', region: 'start', x: 100, y: 165 },
  { key: 'OldWell', label: 'Vieux puits', region: 'start', x: 160, y: 165 },
  { key: 'Cave', label: 'Grotte', region: 'start', x: 40, y: 220 },
  { key: 'Village', label: 'Valombre', region: 'start', x: 100, y: 220 },

  // Aiglemont et alentours (Actes 2+)
  { key: 'Road', label: 'Route commerciale', region: 'aiglemont', x: 40, y: 55 },
  { key: 'City', label: 'Aiglemont', region: 'aiglemont', x: 100, y: 55 },
  { key: 'Catacombs', label: 'Catacombes', region: 'aiglemont', x: 160, y: 55 },
  { key: 'Archives', label: 'Archives scellées', region: 'aiglemont', x: 40, y: 110 },
  { key: 'Faubourg', label: 'Faubourg', region: 'aiglemont', x: 100, y: 110 },
  { key: 'Warehouse', label: 'Entrepôt', region: 'aiglemont', x: 160, y: 110 },
  { key: 'RiverRoad', label: 'Route fluviale', region: 'aiglemont', x: 40, y: 165 },
  { key: 'HunterOutpost', label: 'Relais chasseurs', region: 'aiglemont', x: 100, y: 165 },
  { key: 'MarshLair', label: 'Tanière marais', region: 'aiglemont', x: 160, y: 165 },

  // Terres Noyées (Acte 2)
  { key: 'SunkenRoad', label: 'Route engloutie', region: 'terresnoyees', x: 70, y: 55 },
  { key: 'Vasenoire', label: 'Vasenoire', region: 'terresnoyees', x: 140, y: 55 },
  { key: 'SunkenRuins', label: 'Ruines englouties', region: 'terresnoyees', x: 70, y: 110 },
  { key: 'ClandestineDock', label: 'Quai clandestin', region: 'terresnoyees', x: 140, y: 110 },
  { key: 'SealedSanctuary', label: 'Sanctuaire scellé', region: 'terresnoyees', x: 140, y: 165 },
  { key: 'ShardSeekersCamp', label: 'Camp des Chercheurs', region: 'terresnoyees', x: 140, y: 220 },
];

export const MAP_CONNECTIONS: [ReturnSceneKey, ReturnSceneKey][] = [
  ['Hamlet', 'Field'],
  ['Hamlet', 'Farm'],
  ['Hamlet', 'Shrine'],
  ['Field', 'Dungeon'],
  ['Field', 'BanditCamp'],
  ['Field', 'Forest'],
  ['Forest', 'GoblinCamp'],
  ['Forest', 'OldWell'],
  ['Forest', 'Cave'],
  ['Cave', 'Village'],
  ['Village', 'Road'],
  ['Road', 'City'],
  ['City', 'Catacombs'],
  ['City', 'Archives'],
  ['City', 'Faubourg'],
  ['Faubourg', 'Warehouse'],
  ['Faubourg', 'RiverRoad'],
  ['RiverRoad', 'HunterOutpost'],
  ['HunterOutpost', 'MarshLair'],
  ['HunterOutpost', 'SunkenRoad'],
  ['SunkenRoad', 'Vasenoire'],
  ['SunkenRoad', 'SunkenRuins'],
  ['Vasenoire', 'ClandestineDock'],
  ['ClandestineDock', 'SealedSanctuary'],
  ['SealedSanctuary', 'ShardSeekersCamp'],
];

// Where the main quest currently points, per stage — mirrors the location
// named in QuestLogScene's MAIN_QUEST_STATUS descriptions. 'debriefed' and
// 'seekers_defeated' have no entry: those chapters are closed, nothing left
// to point at for now.
export const MAIN_QUEST_LOCATION: Partial<Record<MainQuestStage, ReturnSceneKey>> = {
  not_started: 'Hamlet',
  dungeon: 'Dungeon',
  revelation: 'Hamlet',
  aiglemont: 'City',
  complete: 'City',
  catacombs: 'Catacombs',
  trail_found: 'City',
  debriefed: 'City',
  faubourg_lead: 'Warehouse',
  shard_confirmed: 'City',
  shards_beyond: 'City',
  trail_west: 'HunterOutpost',
  river_lead: 'City',
  act1_complete: 'City',
  crossing_marshes: 'Vasenoire',
  limaneux_lead: 'ClandestineDock',
  network_exposed: 'Vasenoire',
  smugglers_unmasked: 'City',
  network_reported: 'City',
  sealed_vault_lead: 'ClandestineDock',
  vault_uncovered: 'City',
  shard_cache_found: 'City',
  rival_hunters_lead: 'Vasenoire',
  rival_hunters_confirmed: 'City',
  threat_acknowledged: 'City',
  chercheurs_lead: 'SealedSanctuary',
  seekers_confronted: 'City',
};

// Home scene of each side quest's giver/turn-in NPC.
export const QUEST_LOCATIONS: Record<string, ReturnSceneKey> = {
  wolves_threat: 'Hamlet',
  crop_pests: 'Farm',
  crop_pests_king: 'Farm',
  bandit_camp_threat: 'BanditCamp',
  bandit_camp_threat_leader: 'BanditCamp',
  goblin_camp_threat: 'GoblinCamp',
  goblin_camp_threat_leader: 'GoblinCamp',
  city_road_patrol: 'City',
  city_road_patrol_alpha: 'City',
  faubourg_smugglers: 'Faubourg',
  faubourg_smugglers_leader: 'Faubourg',
  marsh_patrol: 'HunterOutpost',
  marsh_patrol_matriarch: 'HunterOutpost',
  shrine_pilgrims: 'Shrine',
  vasenoire_ruins: 'Vasenoire',
  vasenoire_ruins_leader: 'Vasenoire',
  vasenoire_fisherman: 'Vasenoire',
  sunkenroad_sentinels: 'SunkenRoad',
};
