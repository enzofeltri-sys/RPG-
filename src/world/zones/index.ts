import type { ZoneArt } from '../zonePlan';
import { BASSE_COMBE } from './basseCombe';
import { FARM } from './farm';
import { FIELD } from './field';
import { FOREST } from './forest';
import { BANDIT_CAMP, GOBLIN_CAMP } from './camps';
import { CAVE, FORGOTTEN_GRAVE, OLD_WELL, SEAL_CHAMBER, WOLF_DEN } from './underground';
import { SHRINE } from './shrine';
import { VALOMBRE } from './valombre';

// Every zone drawn by the game, for the painter's neighbor drawing and the
// mockup script.
export const ALL_ZONES: ZoneArt[] = [VALOMBRE, BASSE_COMBE, FARM, SHRINE, FIELD, FOREST, GOBLIN_CAMP, BANDIT_CAMP, CAVE, WOLF_DEN, OLD_WELL, FORGOTTEN_GRAVE, SEAL_CHAMBER];
