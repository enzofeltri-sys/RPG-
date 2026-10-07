import type { ZoneArt } from '../zonePlan';
import { BASSE_COMBE } from './basseCombe';
import { FARM } from './farm';
import { FIELD } from './field';
import { SHRINE } from './shrine';
import { VALOMBRE } from './valombre';

// Every zone drawn by the game, for the painter's neighbor drawing and the
// mockup script.
export const ALL_ZONES: ZoneArt[] = [VALOMBRE, BASSE_COMBE, FARM, SHRINE, FIELD];
