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

export function rollEncounterTier(isBoss: boolean): EncounterTier {
  if (isBoss) return 'normal';
  const roll = Math.random();
  if (roll < LEGENDARY_CHANCE) return 'legendary';
  if (roll < LEGENDARY_CHANCE + ELITE_CHANCE) return 'elite';
  return 'normal';
}

export interface Monster {
  id: string;
  name: string;
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
  corrupted_wolf: { id: 'corrupted_wolf', name: 'Loup corrompu', maxHp: 18, attack: 4, xpReward: 40, goldReward: 8 },
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
    maxHp: 55,
    attack: 13,
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
};

// tier defaults to a fresh roll (skipped for bosses) — callers can pass an
// explicit tier to force a specific outcome, e.g. for deterministic tests.
// Bosses stay 'normal' even if a caller passes an explicit tier: they're
// already the toughest, best-rewarding version of themselves by design, so
// this invariant is enforced here rather than trusted to every call site.
export function createMonster(id: string, tier?: EncounterTier): Monster {
  const template = TEMPLATES[id];
  if (!template) {
    throw new Error(`Unknown monster template: ${id}`);
  }
  const isBoss = Boolean(template.isBoss);
  const resolvedTier = isBoss ? 'normal' : (tier ?? rollEncounterTier(false));
  const mult = TIER_STAT_MULTIPLIER[resolvedTier];
  const maxHp = Math.round(template.maxHp * mult.hp);
  return {
    id: template.id,
    name: template.name + TIER_LABELS[resolvedTier],
    hp: maxHp,
    maxHp,
    attack: Math.round(template.attack * mult.attack),
    xpReward: Math.round(template.xpReward * mult.xp),
    goldReward: Math.round(template.goldReward * mult.gold),
    isBoss,
    tier: resolvedTier,
  };
}

// Kept for the Field's random encounters, which only ever fight this one test monster.
export function createTestMonster(): Monster {
  return createMonster('corrupted_wolf');
}
