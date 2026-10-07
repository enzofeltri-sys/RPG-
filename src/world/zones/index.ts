import type { ZoneArt } from '../zonePlan';
import { BASSE_COMBE } from './basseCombe';
import { FARM } from './farm';
import { FIELD } from './field';
import { FOREST } from './forest';
import { BANDIT_CAMP, GOBLIN_CAMP } from './camps';
import { CAVE, FORGOTTEN_GRAVE, OLD_WELL, SEAL_CHAMBER, WOLF_DEN } from './underground';
import { SHRINE } from './shrine';
import { VALOMBRE } from './valombre';
import { CITY, FAUBOURG, HUNTER_OUTPOST, RIVER_ROAD, ROAD } from './aiglemont';
import {
  ANCESTRAL_CRYPT,
  ARCHIVES,
  BLIGHTED_GROVE,
  CATACOMBS,
  CORRUPTED_ROOT,
  GUILD_ARCHIVE,
  MARSH_LAIR,
  SUNKEN_CHAPEL,
  THIRD_ALTAR,
  WAREHOUSE,
  WATCHERS_VAULT,
  WAYSTATION,
} from './aiglemontDepths';
import { INTERIORS } from './interiors';
import { RITE_ANNEX, RITE_ARCHIVE, SANCTUARY_DEPTHS, SEAL_DEPTHS, WATCHERS_LODGE } from './startDepths';
import {
  BROKEN_SLEEP,
  BROTHERHOOD_TOMB,
  CLANDESTINE_DOCK,
  SEALED_SANCTUARY,
  SHARD_SEEKERS_CAMP,
  SILENT_WATCH,
  SUNKEN_ROAD,
  SUNKEN_RUINS,
  VASENOIRE,
  WARD_CORE,
} from './terresNoyees';

// Every zone drawn by the game, for the painter's neighbor drawing and the
// mockup script.
export const ALL_ZONES: ZoneArt[] = [
  // The start region.
  VALOMBRE,
  BASSE_COMBE,
  FARM,
  SHRINE,
  FIELD,
  FOREST,
  GOBLIN_CAMP,
  BANDIT_CAMP,
  CAVE,
  WOLF_DEN,
  OLD_WELL,
  FORGOTTEN_GRAVE,
  SEAL_CHAMBER,
  WATCHERS_LODGE,
  RITE_ARCHIVE,
  RITE_ANNEX,
  SANCTUARY_DEPTHS,
  SEAL_DEPTHS,
  ...Object.values(INTERIORS),
  // Aiglemont and its surroundings.
  ROAD,
  CITY,
  FAUBOURG,
  RIVER_ROAD,
  HUNTER_OUTPOST,
  CATACOMBS,
  ARCHIVES,
  WATCHERS_VAULT,
  WAREHOUSE,
  GUILD_ARCHIVE,
  ANCESTRAL_CRYPT,
  THIRD_ALTAR,
  SUNKEN_CHAPEL,
  CORRUPTED_ROOT,
  MARSH_LAIR,
  BLIGHTED_GROVE,
  WAYSTATION,
  // Les Terres Noyées.
  SUNKEN_ROAD,
  VASENOIRE,
  CLANDESTINE_DOCK,
  SUNKEN_RUINS,
  SEALED_SANCTUARY,
  SHARD_SEEKERS_CAMP,
  BROTHERHOOD_TOMB,
  BROKEN_SLEEP,
  SILENT_WATCH,
  WARD_CORE,
];
