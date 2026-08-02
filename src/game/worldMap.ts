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
  { key: 'BrotherhoodTomb', label: 'Tombeau de la confrérie', region: 'terresnoyees', x: 70, y: 165 },

  // Première zone corrompue en dehors des Terres Noyées — la contamination
  // du tombeau remonte vers l'Aiglemont.
  { key: 'BlightedGrove', label: 'Bosquet corrompu', region: 'aiglemont', x: 100, y: 220 },

  // Le site originel du scellement, révélé caché sous le petit sanctuaire
  // de la région de départ.
  { key: 'SealChamber', label: 'Chambre du Scellement', region: 'start', x: 160, y: 220 },

  // Un poste d'observation de la confrérie fondatrice, en amont du delta —
  // le passage discret que la silhouette du sanctuaire empruntait.
  { key: 'SilentWatch', label: 'Vigie silencieuse', region: 'terresnoyees', x: 200, y: 55 },

  // Une chambre plus profonde sous la Vigie silencieuse elle-même, jamais
  // mentionnée dans les textes retrouvés jusqu'ici.
  { key: 'WardCore', label: 'Cœur du réseau', region: 'terresnoyees', x: 200, y: 110 },

  // Une voûte scellée sous les Archives d'Aiglemont — la première fois que
  // l'Ordre des Veilleurs est nommé comme tel dans le jeu.
  { key: 'WatchersVault', label: 'Voûte des Veilleurs', region: 'aiglemont', x: 40, y: 220 },

  // Une chambre plus profonde encore sous le tombeau de la confrérie
  // fondatrice, jamais atteinte lors du pillage de fin d'Acte 2 — ce que le
  // vol de l'éclat majeur a réellement dérangé.
  { key: 'BrokenSleep', label: 'Le Sommeil brisé', region: 'terresnoyees', x: 70, y: 220 },

  // Ce que corruption_heart n'était qu'un symptôme de, sous le bosquet
  // corrompu — jamais atteint quand ce cœur a été vaincu.
  { key: 'CorruptedRoot', label: 'La Racine corrompue', region: 'aiglemont', x: 160, y: 220 },

  // Une fissure trouvée derrière la chambre du primordial_guardian
  // lui-même, à la source de toute la chaîne théorisée par Sélène.
  { key: 'SealDepths', label: 'La Faille du Sceau', region: 'start', x: 200, y: 220 },

  // La loge où l'Ordre des Veilleurs se réunissait autrefois, révélée par
  // les marques gravées sur le fragment laissé au joueur.
  { key: 'WatchersLodge', label: 'La Loge des Veilleurs', region: 'start', x: 200, y: 165 },

  // Ce que la loge gardait de plus précieux : les instructions du rite de
  // scellement lui-même, plus profondes que la table ronde.
  { key: 'RiteArchive', label: 'Les Archives du Rite', region: 'start', x: 200, y: 110 },
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
  ['SunkenRuins', 'BrotherhoodTomb'],
  ['HunterOutpost', 'BlightedGrove'],
  ['Shrine', 'SealChamber'],
  ['Vasenoire', 'SilentWatch'],
  ['SilentWatch', 'WardCore'],
  ['Archives', 'WatchersVault'],
  ['BrotherhoodTomb', 'BrokenSleep'],
  ['BlightedGrove', 'CorruptedRoot'],
  ['SealChamber', 'SealDepths'],
  ['Shrine', 'WatchersLodge'],
  ['WatchersLodge', 'RiteArchive'],
];

// Where the main quest currently points, per stage — mirrors the location
// named in QuestLogScene's MAIN_QUEST_STATUS descriptions. Terminal stages
// with no further lead (currently 'rite_archive_cleared') have no entry:
// that chapter is closed, nothing left to point at for now.
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
  seekers_defeated: 'City',
  brotherhood_tomb_hinted: 'City',
  tomb_location_found: 'SunkenRuins',
  tomb_raided: 'City',
  act2_complete: 'City',
  outpost_corruption_lead: 'HunterOutpost',
  corruption_confirmed: 'HunterOutpost',
  blighted_grove_lead: 'HunterOutpost',
  grove_purified: 'City',
  corruption_contained: 'City',
  shrine_lead: 'Shrine',
  seal_failing: 'City',
  identity_search_started: 'Vasenoire',
  identity_hint_gathered: 'City',
  upstream_lead: 'Vasenoire',
  watchtower_reached: 'City',
  watchtower_cleared: 'City',
  helm_inscription_studied: 'City',
  ward_core_lead: 'SilentWatch',
  ward_core_reached: 'City',
  ward_core_cleared: 'City',
  hermit_lead: 'Shrine',
  hermit_confided: 'City',
  watchers_vault_lead: 'Archives',
  watchers_vault_reached: 'City',
  watchers_vault_cleared: 'City',
  silhouette_message_found: 'City',
  tomb_depths_lead: 'BrotherhoodTomb',
  tomb_depths_reached: 'City',
  tomb_depths_cleared: 'City',
  grand_theory_formed: 'City',
  grove_depths_lead: 'BlightedGrove',
  grove_depths_reached: 'City',
  grove_depths_cleared: 'City',
  watcher_hypothesis_formed: 'City',
  seal_depths_lead: 'SealChamber',
  seal_depths_reached: 'City',
  seal_depths_cleared: 'City',
  second_token_found: 'City',
  lodge_lead: 'Shrine',
  lodge_reached: 'City',
  lodge_cleared: 'City',
  reinforcement_plan_started: 'City',
  rite_archive_lead: 'WatchersLodge',
  rite_archive_reached: 'City',
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
