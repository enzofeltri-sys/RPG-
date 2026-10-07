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
];
