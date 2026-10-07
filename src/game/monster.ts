// A small, per-encounter chance that a regular (non-boss) monster spawns as a
// tougher, better-rewarding variant of itself — same identity and place in
// the world, not a new monster to design — rather than every field/dungeon
// encounter always being the plain version. Bosses are already the toughest,
// best-rewarding version of themselves by design, so tier variance is
// deliberately skipped for them.
export type EncounterTier = 'normal' | 'elite' | 'legendary';

const ELITE_CHANCE = 0.04;
const LEGENDARY_CHANCE = 0.01;

const TIER_LABELS: Record<EncounterTier, string> = {
  normal: '',
  elite: ' élite',
  legendary: ' légendaire',
};

const TIER_STAT_MULTIPLIER: Record<EncounterTier, { hp: number; attack: number; xp: number; gold: number }> = {
  normal: { hp: 1, attack: 1, xp: 1, gold: 1 },
  elite: { hp: 1.6, attack: 1.3, xp: 1.5, gold: 1.5 },
  legendary: { hp: 2.5, attack: 1.7, xp: 2.5, gold: 2.5 },
};

// eliteMultiplier raises both chances (Difficile mode, see difficulty.ts).
export function rollEncounterTier(isBoss: boolean, eliteMultiplier = 1): EncounterTier {
  if (isBoss) return 'normal';
  const roll = Math.random();
  if (roll < LEGENDARY_CHANCE * eliteMultiplier) return 'legendary';
  if (roll < (LEGENDARY_CHANCE + ELITE_CHANCE) * eliteMultiplier) return 'elite';
  return 'normal';
}

// Difficulty adjustments applied on top of the level curve.
export interface MonsterModifiers {
  monsterHp: number;
  monsterAttack: number;
  eliteChance: number;
}

export interface Monster {
  id: string;
  name: string;
  // Level of the zone it's fought in (see createMonster).
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  xpReward: number;
  goldReward: number;
  isBoss: boolean;
  tier: EncounterTier;
}

interface MonsterTemplate {
  id: string;
  name: string;
  maxHp: number;
  attack: number;
  xpReward: number;
  goldReward: number;
  isBoss?: boolean;
}

const TEMPLATES: Record<string, MonsterTemplate> = {
  corrupted_wolf: { id: 'corrupted_wolf', name: 'Loup corrompu', maxHp: 18, attack: 3, xpReward: 40, goldReward: 8 },
  cave_rat: { id: 'cave_rat', name: 'Rat des cavernes', maxHp: 14, attack: 3, xpReward: 25, goldReward: 5 },
  goblin_scout: { id: 'goblin_scout', name: 'Gobelin éclaireur', maxHp: 16, attack: 4, xpReward: 30, goldReward: 6 },
  cave_spider: { id: 'cave_spider', name: 'Araignée des cavernes', maxHp: 20, attack: 5, xpReward: 35, goldReward: 7 },
  field_rat: { id: 'field_rat', name: 'Rat des champs', maxHp: 10, attack: 3, xpReward: 18, goldReward: 4 },
  rat_king: {
    id: 'rat_king',
    name: 'Roi des rats',
    maxHp: 26,
    attack: 5,
    xpReward: 50,
    goldReward: 14,
    isBoss: true,
  },
  bandit_thug: { id: 'bandit_thug', name: 'Bandit', maxHp: 20, attack: 5, xpReward: 35, goldReward: 10 },
  bandit_leader: {
    id: 'bandit_leader',
    name: 'Chef des bandits',
    maxHp: 40,
    attack: 8,
    xpReward: 90,
    goldReward: 25,
    isBoss: true,
  },
  goblin_brute: { id: 'goblin_brute', name: 'Gobelin brutal', maxHp: 24, attack: 6, xpReward: 45, goldReward: 12 },
  goblin_chief: {
    id: 'goblin_chief',
    name: 'Chef des gobelins',
    maxHp: 44,
    attack: 9,
    xpReward: 95,
    goldReward: 26,
    isBoss: true,
  },
  corrupted_boar: { id: 'corrupted_boar', name: 'Sanglier corrompu', maxHp: 28, attack: 7, xpReward: 55, goldReward: 15 },
  corrupted_boar_alpha: {
    id: 'corrupted_boar_alpha',
    name: 'Sanglier alpha corrompu',
    maxHp: 48,
    attack: 10,
    xpReward: 100,
    goldReward: 28,
    isBoss: true,
  },
  alpha_wolf: {
    id: 'alpha_wolf',
    name: 'Loup alpha corrompu',
    maxHp: 70,
    attack: 8,
    xpReward: 150,
    goldReward: 40,
    isBoss: true,
  },
  smuggler_thug: {
    id: 'smuggler_thug',
    name: 'Contrebandier',
    maxHp: 26,
    attack: 6,
    xpReward: 50,
    goldReward: 14,
  },
  marsh_serpent: { id: 'marsh_serpent', name: 'Serpent des marais', maxHp: 24, attack: 6, xpReward: 45, goldReward: 12 },
  marsh_matriarch: {
    id: 'marsh_matriarch',
    name: 'Matriarche des marais',
    maxHp: 50,
    attack: 10,
    xpReward: 120,
    goldReward: 35,
    isBoss: true,
  },
  corrupted_tome: {
    id: 'corrupted_tome',
    name: 'Grimoire corrompu',
    maxHp: 16,
    attack: 4,
    xpReward: 28,
    goldReward: 6,
  },
  archive_wisp: { id: 'archive_wisp', name: 'Feu-follet des archives', maxHp: 20, attack: 5, xpReward: 35, goldReward: 8 },
  smuggler_captain: {
    id: 'smuggler_captain',
    name: 'Capitaine des contrebandiers',
    maxHp: 45,
    attack: 9,
    xpReward: 110,
    goldReward: 30,
    isBoss: true,
  },
  corrupted_knight: {
    id: 'corrupted_knight',
    name: 'Chevalier corrompu',
    maxHp: 34,
    attack: 8,
    xpReward: 70,
    goldReward: 20,
  },
  well_guardian: { id: 'well_guardian', name: 'Gardien du puits', maxHp: 22, attack: 5, xpReward: 45, goldReward: 12 },
  fallen_guardian: {
    id: 'fallen_guardian',
    name: 'Gardien déchu',
    maxHp: 100,
    attack: 11,
    xpReward: 260,
    goldReward: 75,
    isBoss: true,
  },
  // Terres Noyées (Acte 2) — first monster of the new region, own identity
  // rather than reusing marsh_serpent, same precedent as marsh_serpent
  // itself being région 3's first biome-specific monster.
  bog_wraith: { id: 'bog_wraith', name: 'Spectre des tourbières', maxHp: 30, attack: 8, xpReward: 65, goldReward: 18 },
  ruins_delver: {
    id: 'ruins_delver',
    name: 'Pilleur des ruines',
    maxHp: 58,
    attack: 12,
    xpReward: 140,
    goldReward: 40,
    isBoss: true,
  },
  // Same smuggler network as Faubourg (smuggler_thug/smuggler_captain,
  // Acte 1) rather than a brand new faction — the delta operation answers to
  // the same people, tying the two acts together instead of introducing an
  // unrelated antagonist this late.
  smuggler_lieutenant: {
    id: 'smuggler_lieutenant',
    name: 'Lieutenant des contrebandiers',
    maxHp: 65,
    attack: 13,
    xpReward: 155,
    goldReward: 45,
    isBoss: true,
  },
  // Ambient guardian shared by SunkenRoad (alternating with bog_wraith) and
  // the sealed sanctuary's approach — same "something is actively watching
  // the ruins" identity in both places, tougher than a plain wraith.
  corrupted_sentinel: {
    id: 'corrupted_sentinel',
    name: 'Sentinelle corrompue',
    maxHp: 34,
    attack: 9,
    xpReward: 70,
    goldReward: 20,
  },
  shard_warden: {
    id: 'shard_warden',
    name: 'Gardien des éclats',
    maxHp: 85,
    attack: 14,
    xpReward: 210,
    goldReward: 60,
    isBoss: true,
  },
  // Les Chercheurs d'éclats — la faction rivale évoquée par Yenn, révélée
  // pour la première fois avec un visage plutôt qu'un simple nom.
  seeker_scout: {
    id: 'seeker_scout',
    name: 'Éclaireur des Chercheurs',
    maxHp: 40,
    attack: 10,
    xpReward: 85,
    goldReward: 24,
  },
  seeker_archivist: {
    id: 'seeker_archivist',
    name: 'Archiviste des Chercheurs',
    maxHp: 95,
    attack: 15,
    xpReward: 230,
    goldReward: 65,
    isBoss: true,
  },
  // Envoyé pour le tombeau de la confrérie fondatrice — la première créature
  // du jeu directement au service du Roi Démon plutôt que d'une faction
  // humaine, et le combat le plus dur à ce jour.
  demon_envoy: {
    id: 'demon_envoy',
    name: 'Émissaire du Roi Démon',
    maxHp: 110,
    attack: 17,
    xpReward: 300,
    goldReward: 80,
    isBoss: true,
  },
  // Première manifestation concrète de l'éclat volé au tombeau — pas une
  // faction, juste la corruption elle-même qui prend forme là où elle
  // s'installe, au Relais des chasseurs.
  blight_spawn: {
    id: 'blight_spawn',
    name: 'Rejeton corrompu',
    maxHp: 50,
    attack: 12,
    xpReward: 100,
    goldReward: 28,
  },
  corruption_heart: {
    id: 'corruption_heart',
    name: 'Cœur de la corruption',
    maxHp: 100,
    attack: 15,
    xpReward: 260,
    goldReward: 70,
    isBoss: true,
  },
  // Gardiens du site originel du scellement, sous le petit sanctuaire — les
  // esprits inquiets de la confrérie fondatrice elle-même, pas une faction
  // hostile ni une créature du Roi Démon.
  brotherhood_specter: {
    id: 'brotherhood_specter',
    name: 'Spectre de la confrérie',
    maxHp: 48,
    attack: 10,
    xpReward: 115,
    goldReward: 30,
  },
  // Le combat le plus dur du jeu à ce jour — pas un serviteur, mais la magie
  // du scellement originel elle-même, devenue instable depuis le vol de
  // l'éclat majeur.
  primordial_guardian: {
    id: 'primordial_guardian',
    name: 'Gardien primordial',
    maxHp: 130,
    attack: 19,
    xpReward: 350,
    goldReward: 100,
    isBoss: true,
  },
  // La vieille vigie que la silhouette du sanctuaire remontait le delta pour
  // atteindre — un poste d'observation de la confrérie fondatrice, laissé à
  // l'abandon depuis des générations. Son gardien ne distingue plus l'ami de
  // l'ennemi : il garde encore, aveuglément, contre toute intrusion.
  watchtower_guardian: {
    id: 'watchtower_guardian',
    name: 'Gardien oublié',
    maxHp: 145,
    attack: 21,
    xpReward: 380,
    goldReward: 110,
    isBoss: true,
  },
  // Ce que le réseau de vigies de la confrérie fondatrice surveillait vraiment
  // — jamais nommé dans les textes retrouvés jusqu'ici, jamais lié au Roi
  // Démon ni à aucune faction connue. Les vigies faiblissent, et lui remue.
  unnamed_vestige: {
    id: 'unnamed_vestige',
    name: 'Vestige innommé',
    maxHp: 160,
    attack: 23,
    xpReward: 410,
    goldReward: 120,
    isBoss: true,
  },
  // Le dernier gardien connu de l'Ordre des Veilleurs — celui qui n'a jamais
  // douté, contrairement à ce que dit le vieux dicton d'Aldric, et qui garde
  // encore la voûte scellée des Archives depuis que tous les autres se sont
  // tus.
  last_watcher: {
    id: 'last_watcher',
    name: 'Dernier Veilleur',
    maxHp: 175,
    attack: 25,
    xpReward: 440,
    goldReward: 130,
    isBoss: true,
  },
  // Ce que le vol de l'éclat majeur, au tombeau de la confrérie fondatrice
  // (fin d'Acte 2), a réellement dérangé — pas seulement libéré un émissaire
  // du Roi Démon en surface, mais troublé quelque chose de bien plus profond,
  // jamais découvert jusqu'ici faute d'être redescendu si loin dans le
  // tombeau.
  broken_sleeper: {
    id: 'broken_sleeper',
    name: 'Dormeur brisé',
    maxHp: 190,
    attack: 27,
    xpReward: 470,
    goldReward: 140,
    isBoss: true,
  },
  // Ce que corruption_heart n'était qu'un symptôme de — la racine qui
  // alimentait tout le bosquet corrompu, jamais atteinte quand ce cœur a été
  // vaincu. Un autre maillon de la même chaîne que Sélène vient de recouper.
  blight_root: {
    id: 'blight_root',
    name: 'Racine-mère corrompue',
    maxHp: 205,
    attack: 29,
    xpReward: 500,
    goldReward: 150,
    isBoss: true,
  },
  // Une fissure vivante, trouvée derrière la chambre du primordial_guardian
  // lui-même — pas le Roi Démon, seulement la contrainte du sceau qui cède
  // un peu plus, ici, à la source de toute la chaîne. Comme demon_envoy, ne
  // porte aucune récompense signature : tous les emplacements d'équipement
  // ont déjà la leur, et cette rencontre reste volontairement un symptôme
  // de plus, pas une conclusion.
  seal_echo: {
    id: 'seal_echo',
    name: 'Écho du Sceau',
    maxHp: 220,
    attack: 31,
    xpReward: 530,
    goldReward: 160,
    isBoss: true,
  },
  // Gardiens spectraux de la Loge des Veilleurs — pas les esprits de la
  // confrérie fondatrice (brotherhood_specter, ailleurs), mais des échos
  // plus tardifs, laissés par l'ordre lui-même à mesure qu'il s'éteignait.
  watcher_echo: { id: 'watcher_echo', name: 'Écho de veilleur', maxHp: 60, attack: 15, xpReward: 130, goldReward: 34 },
  // Une épreuve, pas un ennemi au sens strict — un dispositif qui teste
  // quiconque entre dans la loge, ami comme inconnu, sans jamais chercher à
  // tuer. Le dernier obstacle avant la première rencontre en personne avec
  // la silhouette.
  oath_guardian: {
    id: 'oath_guardian',
    name: 'Gardien du Serment',
    maxHp: 235,
    attack: 33,
    xpReward: 560,
    goldReward: 170,
    isBoss: true,
  },
  // Le dernier gardien de la loge, posté devant ce que l'Ordre a laissé de
  // plus précieux : les instructions du rite de scellement lui-même, pas
  // seulement son souvenir.
  rite_guardian: {
    id: 'rite_guardian',
    name: 'Gardien du Rite',
    maxHp: 250,
    attack: 35,
    xpReward: 590,
    goldReward: 180,
    isBoss: true,
  },
  // Gardien des rayonnages scellés, plus profonds encore que la salle du
  // Gardien du Rite — celui qui tenait le registre des membres de l'Ordre,
  // jamais consulté depuis trois siècles.
  veiled_scribe: {
    id: 'veiled_scribe',
    name: 'Scribe voilé',
    maxHp: 265,
    attack: 37,
    xpReward: 620,
    goldReward: 190,
    isBoss: true,
  },
  // Gardien d'une crypte familiale scellée dans le vieux quartier
  // d'Aiglemont, jamais reliée jusqu'ici à la quête — jusqu'à ce que le nom
  // du registre corresponde à un acte de propriété jamais mis à jour depuis
  // des générations.
  blood_keeper: {
    id: 'blood_keeper',
    name: 'Gardien du Sang',
    maxHp: 280,
    attack: 39,
    xpReward: 650,
    goldReward: 200,
    isBoss: true,
  },
  // Gardien d'un vieux cimetière à l'écart de Valombre, que les enfants
  // évitent sans qu'on ait besoin de le leur dire — une tombe entretenue en
  // secret depuis bien plus longtemps que quiconque au village ne s'en
  // souvient.
  grave_warden: {
    id: 'grave_warden',
    name: 'Gardien de la Tombe',
    maxHp: 295,
    attack: 41,
    xpReward: 680,
    goldReward: 210,
    isBoss: true,
  },
  // Gardien des registres notariaux de la guilde des marchands, plus
  // profonds que l'entrepôt lui-même — la seule trace civile, pas
  // religieuse ni secrète, d'une transmission de titre et de propriété.
  record_keeper: {
    id: 'record_keeper',
    name: 'Gardien des Registres',
    maxHp: 310,
    attack: 43,
    xpReward: 710,
    goldReward: 220,
    isBoss: true,
  },
  // La corruption ressurgit près de la route commerciale, comme si elle
  // réagissait à l'approche de la silhouette — la première fois que les
  // deux fils de l'enquête (l'identité et le sceau qui se brise) se
  // recroisent depuis le tout début de l'Acte 3.
  blight_sentinel: {
    id: 'blight_sentinel',
    name: 'Sentinelle corrompue',
    maxHp: 325,
    attack: 45,
    xpReward: 740,
    goldReward: 230,
    isBoss: true,
  },
  // Gardien d'une chapelle engloutie sous les vieux quais du Faubourg,
  // bâtie à la même époque que le Sceau originel — le premier site
  // confirmé, et non plus seulement théorisé, d'un rite pensé pour
  // plusieurs mains à plusieurs endroits.
  sunken_warden: {
    id: 'sunken_warden',
    name: 'Gardien englouti',
    maxHp: 340,
    attack: 47,
    xpReward: 770,
    goldReward: 240,
    isBoss: true,
  },
  // Gardien du troisième site du rite, plus profond encore que la Crypte
  // des Aînés elle-même — la famille pensait avoir déjà tout trouvé, sans
  // jamais chercher au-delà du caveau déjà pillé une fois.
  ancestor_warden: {
    id: 'ancestor_warden',
    name: 'Gardien des Aïeux',
    maxHp: 355,
    attack: 49,
    xpReward: 800,
    goldReward: 250,
    isBoss: true,
  },
  // The true final encounter — not the Roi Démon itself (still fully
  // contained), but as much of it as leaks through the seal once the rite
  // begins at all three sites at once. A clear step above every prior boss
  // rather than one more +15hp increment in the sequence above, to read as
  // the climax rather than just another dungeon's guardian.
  demon_king_echo: {
    id: 'demon_king_echo',
    name: 'Écho du Roi Démon',
    maxHp: 450,
    attack: 58,
    xpReward: 1000,
    goldReward: 320,
    isBoss: true,
  },
};

// Level-based stats (DESIGN.md, balancing step). Each template above was
// written by hand for the zone it first appears in (NATIVE_LEVEL); its
// numbers are read as proportions of a "standard" regular monster of that
// level (TEMPLATE_SCALE). A monster's real stats follow MONSTER_CURVE at the
// level of the zone it's fought in, so a wolf met in an Acte 3 dungeon is an
// Acte 3 wolf, and every monster keeps its identity (a boar stays tougher
// than a rat).
export const NATIVE_LEVEL: Record<string, number> = {
  corrupted_wolf: 1,
  field_rat: 2,
  rat_king: 2,
  cave_rat: 3,
  alpha_wolf: 3,
  goblin_scout: 4,
  bandit_thug: 4,
  bandit_leader: 4,
  goblin_brute: 5,
  goblin_chief: 5,
  cave_spider: 5,
  corrupted_boar: 5,
  corrupted_boar_alpha: 5,
  well_guardian: 6,
  smuggler_thug: 6,
  smuggler_captain: 6,
  marsh_serpent: 7,
  marsh_matriarch: 7,
  corrupted_knight: 7,
  fallen_guardian: 7,
  bog_wraith: 8,
  corrupted_sentinel: 8,
  ruins_delver: 8,
  smuggler_lieutenant: 9,
  shard_warden: 9,
  seeker_scout: 10,
  seeker_archivist: 10,
  corrupted_tome: 10,
  archive_wisp: 10,
  demon_envoy: 10,
  blight_spawn: 11,
  brotherhood_specter: 11,
  corruption_heart: 11,
  primordial_guardian: 11,
  watchtower_guardian: 12,
  unnamed_vestige: 13,
  last_watcher: 13,
  broken_sleeper: 14,
  blight_root: 14,
  watcher_echo: 15,
  seal_echo: 15,
  oath_guardian: 15,
  rite_guardian: 16,
  veiled_scribe: 17,
  blood_keeper: 17,
  grave_warden: 18,
  record_keeper: 18,
  blight_sentinel: 19,
  sunken_warden: 19,
  ancestor_warden: 20,
  demon_king_echo: 20,
};

// The scale the templates were written in.
const TEMPLATE_SCALE = {
  hp: (level: number) => 16 + 3 * level,
  attack: (level: number) => 3.5 + 0.8 * level,
  xp: (level: number) => 33 + 6.5 * level,
};

// A standard regular monster at each level, tuned with the simulator
// (scripts/balance/simulate.ts) against a typical character of that level.
// Mutable only so the simulator's tuner can search it.
export const MONSTER_TUNING = {
  hpBase: 65,
  hpPerLevel: 25,
  hpPerLevelSq: 0.25,
  attackBase: 3.5,
  attackPerLevel: 5.6,
  attackPerLevelSq: 0.1,
  // Every boss, relative to a standard regular monster of its level.
  bossHp: 1,
  bossAttack: 0.7,
};

// Per-boss adjustment from the simulator, so each boss lands near the same
// win rate despite its abilities (regenerating bosses get fewer HP, frenzy
// and drain bosses a weaker hit…). 1 when absent.
export const BOSS_WEIGHTS: Record<string, { hp: number; attack: number }> = {
  rat_king: { hp: 1.4, attack: 1.3 },
  alpha_wolf: { hp: 1.5, attack: 0.8 },
  bandit_leader: { hp: 1.4, attack: 1.2 },
  goblin_chief: { hp: 0.8, attack: 1.5 },
  corrupted_boar_alpha: { hp: 1.4, attack: 1.2 },
  smuggler_captain: { hp: 1.5, attack: 1.2 },
  marsh_matriarch: { hp: 1.5, attack: 1.2 },
  fallen_guardian: { hp: 1.3, attack: 1.5 },
  ruins_delver: { hp: 1.2, attack: 1.5 },
  smuggler_lieutenant: { hp: 1.4, attack: 1.2 },
  shard_warden: { hp: 1.2, attack: 1.5 },
  seeker_archivist: { hp: 1.4, attack: 1.2 },
  demon_envoy: { hp: 1.4, attack: 1.2 },
  corruption_heart: { hp: 0.9, attack: 0.9 },
  primordial_guardian: { hp: 1.5, attack: 1 },
  watchtower_guardian: { hp: 1.2, attack: 1.5 },
  unnamed_vestige: { hp: 1.3, attack: 1.2 },
  last_watcher: { hp: 1.5, attack: 1.1 },
  broken_sleeper: { hp: 1, attack: 1.1 },
  blight_root: { hp: 1, attack: 0.9 },
  seal_echo: { hp: 1.5, attack: 1.2 },
  oath_guardian: { hp: 1.4, attack: 1.4 },
  rite_guardian: { hp: 1.6, attack: 1 },
  veiled_scribe: { hp: 1.6, attack: 1.1 },
  blood_keeper: { hp: 1.5, attack: 0.8 },
  grave_warden: { hp: 1.5, attack: 1.2 },
  record_keeper: { hp: 1.4, attack: 1.1 },
  blight_sentinel: { hp: 1.4, attack: 1.1 },
  sunken_warden: { hp: 1.7, attack: 1.1 },
  ancestor_warden: { hp: 1.6, attack: 1.1 },
  demon_king_echo: { hp: 1.2, attack: 0.9 },
};

export function standardMonsterHp(level: number): number {
  const t = MONSTER_TUNING;
  return t.hpBase + t.hpPerLevel * level + t.hpPerLevelSq * level * level;
}

export function standardMonsterAttack(level: number): number {
  const t = MONSTER_TUNING;
  return t.attackBase + t.attackPerLevel * level + t.attackPerLevelSq * level * level;
}

// tier defaults to a fresh roll (skipped for bosses) — callers can pass an
// explicit tier to force a specific outcome, e.g. for deterministic tests.
// Bosses stay 'normal' even if a caller passes an explicit tier: they're
// already the toughest, best-rewarding version of themselves by design, so
// this invariant is enforced here rather than trusted to every call site.
// level defaults to the monster's native level.
export function createMonster(id: string, tier?: EncounterTier, level?: number, mods?: MonsterModifiers): Monster {
  const template = TEMPLATES[id];
  if (!template) {
    throw new Error(`Unknown monster template: ${id}`);
  }
  const isBoss = Boolean(template.isBoss);
  const resolvedTier = isBoss ? 'normal' : (tier ?? rollEncounterTier(false, mods?.eliteChance ?? 1));
  const mult = TIER_STAT_MULTIPLIER[resolvedTier];
  const native = NATIVE_LEVEL[id] ?? 1;
  const at = Math.max(1, Math.round(level ?? native));
  // Regular monsters keep their hand-made proportions, compressed (square
  // root) so a weak one isn't trivial and a tough one isn't a wall.
  const weight = BOSS_WEIGHTS[id] ?? { hp: 1, attack: 1 };
  const hpShare = isBoss
    ? MONSTER_TUNING.bossHp * weight.hp
    : Math.sqrt(template.maxHp / TEMPLATE_SCALE.hp(native));
  const attackShare = isBoss
    ? MONSTER_TUNING.bossAttack * weight.attack
    : Math.sqrt(template.attack / TEMPLATE_SCALE.attack(native));
  const rewardScale = TEMPLATE_SCALE.xp(at) / TEMPLATE_SCALE.xp(native);
  const maxHp = Math.max(1, Math.round(hpShare * standardMonsterHp(at) * mult.hp * (mods?.monsterHp ?? 1)));
  return {
    id: template.id,
    name: template.name + TIER_LABELS[resolvedTier],
    level: at,
    hp: maxHp,
    maxHp,
    attack: Math.max(1, Math.round(attackShare * standardMonsterAttack(at) * mult.attack * (mods?.monsterAttack ?? 1))),
    xpReward: Math.round(template.xpReward * rewardScale * mult.xp),
    goldReward: Math.round(template.goldReward * rewardScale * mult.gold),
    isBoss,
    tier: resolvedTier,
  };
}


// Every monster id, for the Randomizer's pools (see difficulty.ts).
export function monsterIds(): { id: string; isBoss: boolean }[] {
  return Object.values(TEMPLATES).map((t) => ({ id: t.id, isBoss: Boolean(t.isBoss) }));
}
