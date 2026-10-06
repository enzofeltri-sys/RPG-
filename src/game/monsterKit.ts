// Monster identities (DESIGN.md, gameplay pass, monsters step): a type with
// a weakness and a resistance, a speed for the opening turn, and abilities
// drawn from a shared library. Bosses add a telegraphed heavy blow, a rage
// under 30% HP and, for the biggest ones, a second phase at 50% HP.
// CombatEngine reads all of this by monster id.

export type MonsterType = 'beast' | 'humanoid' | 'undead' | 'demon' | 'guardian';

// Elements an attack can carry: the six gear elements, plus Light for the
// Clerc's Lumière spells.
export type AttackElement = 'fire' | 'ice' | 'electric' | 'poison' | 'dark' | 'earth' | 'light';

export const ELEMENT_LABELS: Record<AttackElement, string> = {
  fire: 'Feu',
  ice: 'Glace',
  electric: 'Foudre',
  poison: 'Poison',
  dark: 'Ombre',
  earth: 'Terre',
  light: 'Lumière',
};

export interface TypeTraits {
  label: string;
  weak: AttackElement[];
  resist: AttackElement[];
  // Share of physical (non-spell) damage ignored.
  physicalResist: number;
  // Opening-turn speed before the attack-based bonus (see monsterSpeed).
  speed: number;
}

export const TYPE_TRAITS: Record<MonsterType, TypeTraits> = {
  beast: { label: 'Bête', weak: ['fire'], resist: ['ice'], physicalResist: 0, speed: 8 },
  humanoid: { label: 'Humanoïde', weak: ['poison'], resist: [], physicalResist: 0, speed: 6 },
  undead: { label: 'Spectre', weak: ['fire', 'light'], resist: ['poison'], physicalResist: 0.3, speed: 5 },
  demon: { label: 'Démon', weak: ['ice'], resist: ['fire'], physicalResist: 0, speed: 7 },
  guardian: { label: 'Gardien', weak: ['electric'], resist: ['poison'], physicalResist: 0.2, speed: 3 },
};

export const WEAKNESS_MULTIPLIER = 1.3;
export const RESISTANCE_MULTIPLIER = 0.5;

export type AbilityId =
  // inflict a state on the player
  | 'poison'
  | 'rend'
  | 'fire_breath'
  | 'war_cry'
  | 'blind'
  | 'silence'
  | 'stun_blow'
  // other actions
  | 'double_attack'
  | 'life_drain'
  | 'heal'
  | 'shell'
  | 'curse'
  | 'mana_burn'
  | 'charge'
  // passives
  | 'evasion'
  | 'thorns'
  | 'regeneration'
  | 'frenzy';

export const PASSIVE_ABILITIES: AbilityId[] = ['evasion', 'thorns', 'regeneration', 'frenzy'];

export const ABILITY_LABELS: Record<AbilityId, string> = {
  poison: 'Morsure venimeuse',
  rend: 'Lacération',
  fire_breath: 'Souffle de feu',
  war_cry: "Cri d'intimidation",
  blind: 'Éclat aveuglant',
  silence: 'Silence',
  stun_blow: 'Coup assommant',
  double_attack: 'Double attaque',
  life_drain: 'Drain de vie',
  heal: 'Soin',
  shell: 'Carapace',
  curse: 'Malédiction',
  mana_burn: 'Siphon',
  charge: 'Charge',
  evasion: 'Insaisissable',
  thorns: 'Épines',
  regeneration: 'Régénération',
  frenzy: 'Frénésie',
};

// Abilities an elite/legendary variant may pick up on top of its own.
export const ELITE_BONUS_POOL: AbilityId[] = ['double_attack', 'rend', 'poison', 'war_cry', 'frenzy', 'evasion'];

export interface MonsterAbility {
  id: AbilityId;
  // Flavor name shown in the log, defaults to ABILITY_LABELS.
  label?: string;
}

export interface MonsterKit {
  type: MonsterType;
  abilities: MonsterAbility[];
  // Bosses only: what changes at 50% HP.
  phase2?: { message: string; add?: MonsterAbility[] };
}

const a = (id: AbilityId, label?: string): MonsterAbility => ({ id, label });

export const MONSTER_KITS: Record<string, MonsterKit> = {
  // ---- regular monsters
  corrupted_wolf: { type: 'beast', abilities: [a('rend', 'Crocs déchirants')] },
  cave_rat: { type: 'beast', abilities: [a('poison', 'Morsure infectée')] },
  goblin_scout: { type: 'humanoid', abilities: [a('blind', 'Poignée de sable')] },
  cave_spider: { type: 'beast', abilities: [a('poison', 'Crochets venimeux')] },
  field_rat: { type: 'beast', abilities: [a('evasion')] },
  bandit_thug: { type: 'humanoid', abilities: [a('double_attack', 'Coups de gourdin')] },
  goblin_brute: { type: 'humanoid', abilities: [a('charge', 'Ruée brutale')] },
  corrupted_boar: { type: 'beast', abilities: [a('charge', 'Charge de défenses')] },
  smuggler_thug: { type: 'humanoid', abilities: [a('rend', 'Coup de couteau')] },
  marsh_serpent: { type: 'beast', abilities: [a('poison', 'Morsure du marais')] },
  corrupted_tome: { type: 'guardian', abilities: [a('silence', 'Pages hurlantes')] },
  archive_wisp: { type: 'undead', abilities: [a('curse', 'Flamme spectrale')] },
  corrupted_knight: { type: 'demon', abilities: [a('shell', 'Parade noire')] },
  well_guardian: { type: 'guardian', abilities: [a('shell', 'Posture de pierre')] },
  bog_wraith: { type: 'undead', abilities: [a('life_drain', 'Étreinte glacée')] },
  corrupted_sentinel: { type: 'guardian', abilities: [a('double_attack', 'Doubles lames')] },
  seeker_scout: { type: 'humanoid', abilities: [a('poison', 'Fléchette empoisonnée')] },
  blight_spawn: { type: 'demon', abilities: [a('thorns', 'Ronces corrompues')] },
  brotherhood_specter: { type: 'undead', abilities: [a('silence', 'Murmure du tombeau')] },
  watcher_echo: { type: 'undead', abilities: [a('blind', 'Éclat du Veilleur')] },

  // ---- bosses, Acte 1
  rat_king: { type: 'beast', abilities: [a('poison', 'Morsure infectée'), a('double_attack', 'Assaut de la nuée')] },
  bandit_leader: { type: 'humanoid', abilities: [a('blind', 'Sable aux yeux'), a('rend', 'Lame dentelée')] },
  goblin_chief: { type: 'humanoid', abilities: [a('war_cry', 'Cri de guerre gobelin'), a('heal', 'Potion volée')] },
  corrupted_boar_alpha: { type: 'beast', abilities: [a('charge', 'Charge furieuse'), a('stun_blow', 'Coup de boutoir')] },
  alpha_wolf: { type: 'beast', abilities: [a('rend', 'Crocs de l\'alpha'), a('frenzy', 'Hurlement de meute')] },
  // ---- bosses, Acte 2
  marsh_matriarch: { type: 'beast', abilities: [a('poison', 'Venin de la matriarche'), a('blind', 'Crachat acide')] },
  smuggler_captain: { type: 'humanoid', abilities: [a('double_attack', 'Sabre et dague'), a('fire_breath', 'Grenade incendiaire')] },
  fallen_guardian: { type: 'guardian', abilities: [a('shell', 'Rempart déchu'), a('stun_blow', 'Masse du gardien')] },
  ruins_delver: { type: 'humanoid', abilities: [a('blind', 'Poussière des ruines'), a('evasion')] },
  smuggler_lieutenant: { type: 'humanoid', abilities: [a('rend', 'Lame crantée'), a('poison', 'Lame enduite')] },
  shard_warden: { type: 'guardian', abilities: [a('mana_burn', "Siphon d'éclat"), a('shell', 'Bouclier de cristal')] },
  seeker_archivist: { type: 'humanoid', abilities: [a('curse', 'Sort interdit'), a('silence', 'Mot de silence')] },
  demon_envoy: {
    type: 'demon',
    abilities: [a('fire_breath', 'Flammes infernales'), a('curse', 'Pacte maudit'), a('life_drain', 'Festin d\'âme')],
  },
  corruption_heart: {
    type: 'demon',
    abilities: [a('regeneration', 'Pulsation'), a('thorns', 'Chair épineuse'), a('curse', 'Onde de corruption')],
    phase2: { message: 'Le Cœur de corruption se met à battre plus vite !', add: [a('poison', 'Spores')] },
  },
  primordial_guardian: {
    type: 'guardian',
    abilities: [a('stun_blow', 'Poing primordial'), a('shell', 'Carapace runique'), a('thorns', 'Runes tranchantes')],
    phase2: { message: 'Les runes du Gardien primordial s\'embrasent !', add: [a('fire_breath', 'Souffle runique')] },
  },
  // ---- bosses, Acte 3 (once a +15 HP / +2 attack sequence; now each one plays differently)
  watchtower_guardian: { type: 'guardian', abilities: [a('double_attack', 'Hallebarde tournoyante'), a('blind', 'Faisceau de la tour')] },
  unnamed_vestige: { type: 'undead', abilities: [a('silence', 'Nom oublié'), a('life_drain', 'Soif sans nom')] },
  last_watcher: { type: 'undead', abilities: [a('curse', 'Regard du Veilleur'), a('blind', 'Lanterne'), a('evasion')] },
  broken_sleeper: { type: 'undead', abilities: [a('stun_blow', 'Réveil brutal'), a('regeneration', 'Sommeil réparateur')] },
  blight_root: {
    type: 'demon',
    abilities: [a('poison', 'Spores'), a('thorns', 'Racines épineuses'), a('regeneration', 'Sève corrompue')],
  },
  seal_echo: { type: 'undead', abilities: [a('silence', 'Écho du sceau'), a('mana_burn', 'Fêlure')] },
  oath_guardian: { type: 'guardian', abilities: [a('shell', 'Serment de pierre'), a('war_cry', 'Rappel du serment')] },
  rite_guardian: { type: 'guardian', abilities: [a('curse', 'Rite inversé'), a('stun_blow', 'Marteau rituel')] },
  veiled_scribe: { type: 'undead', abilities: [a('silence', 'Encre muette'), a('curse', 'Glyphe'), a('blind', 'Voile')] },
  blood_keeper: { type: 'demon', abilities: [a('rend', 'Saignée'), a('life_drain', 'Calice'), a('frenzy', 'Ivresse du sang')] },
  grave_warden: { type: 'undead', abilities: [a('war_cry', 'Glas'), a('life_drain', 'Main du tombeau')] },
  record_keeper: { type: 'guardian', abilities: [a('mana_burn', 'Rature'), a('silence', 'Index scellé')] },
  blight_sentinel: { type: 'demon', abilities: [a('thorns', 'Écorce maudite'), a('poison', 'Sève acide'), a('shell', 'Écorce durcie')] },
  sunken_warden: { type: 'undead', abilities: [a('curse', 'Courant noir'), a('double_attack', 'Tridents'), a('war_cry', 'Chant des noyés')] },
  ancestor_warden: {
    type: 'undead',
    abilities: [a('stun_blow', 'Bâton des aïeux'), a('silence', 'Veillée'), a('life_drain', 'Héritage')],
  },
  demon_king_echo: {
    type: 'demon',
    abilities: [a('fire_breath', 'Brasier royal'), a('curse', 'Sceau brisé'), a('war_cry', 'Ordre du Roi')],
    phase2: {
      message: "L'Écho du Roi Démon se déchire et révèle sa vraie forme !",
      add: [a('regeneration', 'Écho éternel'), a('silence', 'Couronne de silence')],
    },
  },
};

export function monsterKit(id: string): MonsterKit {
  return MONSTER_KITS[id] ?? { type: 'beast', abilities: [] };
}

// Beasts are quick, guardians slow; stronger monsters (higher attack, i.e.
// later zones) are quicker too, so Agilité keeps mattering all game.
export function monsterSpeed(type: MonsterType, attack: number, isBoss: boolean): number {
  return TYPE_TRAITS[type].speed + Math.floor(attack / 5) + (isBoss ? 2 : 0);
}
