export type EquipSlot =
  | 'weapon'
  | 'shield'
  | 'helmet'
  | 'chest'
  | 'legs'
  | 'boots'
  | 'gloves'
  | 'ring1'
  | 'ring2'
  | 'amulet';

export type ItemCategory = EquipSlot | 'ring';

// 'legendary' only drops from a 'legendary'-tier monster encounter (see
// EncounterTier in monster.ts — itself already a ~1% roll), so getting one
// means clearing two rare rolls in a row. 'unique' (per VISION.md's full
// rarity ladder) comes later — the signature items already fill that role
// narratively, just not under that literal name yet.
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ItemStats {
  strength?: number;
  intelligence?: number;
  agility?: number;
  vitality?: number;
  armor?: number;
  fireDamage?: number;
}

const STAT_LABELS: Record<keyof ItemStats, string> = {
  strength: 'Force',
  intelligence: 'Intelligence',
  agility: 'Agilité',
  vitality: 'Vitalité',
  armor: 'Armure',
  fireDamage: 'Dégâts de feu',
};

export interface Item {
  id: string;
  baseId: string;
  name: string;
  category: ItemCategory;
  rarity: Rarity;
  stats: ItemStats;
}

// A stat line's 3 possible base values — one is picked uniformly at random,
// independently per line, every time an item is created (see
// rollStatLines/createItem below). Two items from the same template and
// rarity can therefore end up with different stats, e.g. two "Épée courte"
// commons don't always deal the exact same damage.
type StatRoll = [number, number, number];

interface ItemTemplate {
  baseId: string;
  name: string;
  category: ItemCategory;
  baseStatRolls: Partial<Record<keyof ItemStats, StatRoll>>;
  // Extra stat lines only rolled when the item comes out rare (or above) —
  // the "special effect" flavor described in DESIGN.md's loot rules, e.g. a
  // sword that only catches fire once it's a rare drop. Same independent
  // 3-variant roll per line as baseStatRolls.
  rareOnlyStatRolls?: Partial<Record<keyof ItemStats, StatRoll>>;
  // A further stat line, on top of rareOnlyStatRolls, only rolled when the
  // item comes out legendary — stacks with the rare-tier line rather than
  // replacing it, so a legendary item has strictly every line a lower
  // rarity of the same template could have, plus this one.
  legendaryOnlyStatRolls?: Partial<Record<keyof ItemStats, StatRoll>>;
  // Never appears in the general rollLootItem() pool — granted directly by a
  // specific hard-dungeon boss (see CombatScene's SIGNATURE_REWARDS), so it
  // stays a genuinely special, exclusive find rather than diluting the
  // common loot table.
  signature?: boolean;
}

// Palier 1 (région de départ) — 4 objets nommés par emplacement au lieu d'un
// seul, chacun avec un profil de stats distinct plutôt qu'une simple
// reteinte du même objet. Les paliers 2 et 3 suivront le même gabarit une
// fois celui-ci validé en jeu (voir DESIGN.md).
const TEMPLATES: ItemTemplate[] = [
  // --- Armes ---
  {
    baseId: 'short_sword',
    name: 'Épée courte',
    category: 'weapon',
    baseStatRolls: { strength: [1, 2, 3] },
    rareOnlyStatRolls: { fireDamage: [2, 3, 4] },
    legendaryOnlyStatRolls: { strength: [1, 2, 2] },
  },
  {
    baseId: 'dagger_thief',
    name: 'Dague de voleur',
    category: 'weapon',
    baseStatRolls: { agility: [1, 2, 3] },
    rareOnlyStatRolls: { fireDamage: [1, 2, 2] },
    legendaryOnlyStatRolls: { agility: [1, 2, 2] },
  },
  {
    baseId: 'broken_sword',
    name: 'Épée cassée',
    category: 'weapon',
    baseStatRolls: { strength: [1, 1, 2] },
    rareOnlyStatRolls: { fireDamage: [2, 3, 4] },
    legendaryOnlyStatRolls: { fireDamage: [1, 2, 2] },
  },
  {
    baseId: 'apprentice_blade',
    name: "Lame d'apprenti",
    category: 'weapon',
    baseStatRolls: { strength: [1, 2, 2], intelligence: [1, 1, 2] },
    rareOnlyStatRolls: { fireDamage: [1, 2, 3] },
    legendaryOnlyStatRolls: { intelligence: [1, 1, 2] },
  },

  // --- Boucliers ---
  {
    baseId: 'wooden_shield',
    name: 'Bouclier en bois',
    category: 'shield',
    baseStatRolls: { vitality: [1, 2, 3], armor: [2, 3, 4] },
    legendaryOnlyStatRolls: { armor: [1, 2, 2] },
  },
  {
    baseId: 'buckler',
    name: 'Rondache légère',
    category: 'shield',
    baseStatRolls: { agility: [1, 2, 2], armor: [1, 2, 3] },
    rareOnlyStatRolls: { agility: [1, 1, 2] },
    legendaryOnlyStatRolls: { armor: [1, 1, 2] },
  },
  {
    baseId: 'tower_shield',
    name: 'Bouclier-tour',
    category: 'shield',
    baseStatRolls: { vitality: [2, 3, 4], armor: [3, 4, 5] },
    rareOnlyStatRolls: { armor: [1, 2, 2] },
    legendaryOnlyStatRolls: { vitality: [1, 2, 2] },
  },
  {
    baseId: 'reinforced_shield',
    name: 'Bouclier renforcé',
    category: 'shield',
    baseStatRolls: { armor: [3, 4, 5] },
    rareOnlyStatRolls: { vitality: [1, 2, 2] },
    legendaryOnlyStatRolls: { armor: [1, 1, 2] },
  },

  // --- Casques ---
  {
    baseId: 'leather_helmet',
    name: 'Casque de cuir',
    category: 'helmet',
    baseStatRolls: { vitality: [1, 1, 2], armor: [1, 2, 3] },
    legendaryOnlyStatRolls: { armor: [1, 1, 2] },
  },
  {
    baseId: 'rogue_hood',
    name: 'Capuche renforcée',
    category: 'helmet',
    baseStatRolls: { agility: [1, 2, 2], armor: [1, 1, 2] },
    rareOnlyStatRolls: { agility: [1, 1, 2] },
    legendaryOnlyStatRolls: { armor: [1, 1, 2] },
  },
  {
    baseId: 'iron_cap',
    name: 'Calotte de fer',
    category: 'helmet',
    baseStatRolls: { armor: [2, 3, 4], vitality: [1, 1, 1] },
    rareOnlyStatRolls: { armor: [1, 1, 2] },
    legendaryOnlyStatRolls: { vitality: [1, 1, 2] },
  },
  {
    baseId: 'simple_circlet',
    name: 'Diadème simple',
    category: 'helmet',
    baseStatRolls: { intelligence: [1, 2, 2], armor: [1, 1, 2] },
    rareOnlyStatRolls: { intelligence: [1, 1, 2] },
    legendaryOnlyStatRolls: { armor: [1, 1, 2] },
  },

  // --- Torses ---
  {
    baseId: 'leather_chest',
    name: 'Plastron de cuir',
    category: 'chest',
    baseStatRolls: { vitality: [1, 2, 3], armor: [2, 3, 4] },
    legendaryOnlyStatRolls: { armor: [1, 2, 2] },
  },
  {
    baseId: 'padded_vest',
    name: 'Gilet matelassé',
    category: 'chest',
    baseStatRolls: { agility: [1, 2, 2], armor: [1, 2, 3] },
    legendaryOnlyStatRolls: { agility: [1, 1, 2] },
  },
  {
    baseId: 'light_chainmail',
    name: 'Cotte de mailles légère',
    category: 'chest',
    baseStatRolls: { vitality: [2, 3, 4], armor: [3, 4, 5] },
    rareOnlyStatRolls: { armor: [1, 2, 2] },
    legendaryOnlyStatRolls: { vitality: [1, 1, 2] },
  },
  {
    baseId: 'simple_robe',
    name: 'Robe simple',
    category: 'chest',
    baseStatRolls: { intelligence: [1, 2, 3], armor: [1, 1, 2] },
    rareOnlyStatRolls: { intelligence: [1, 1, 2] },
    legendaryOnlyStatRolls: { armor: [1, 1, 2] },
  },

  // --- Jambes ---
  {
    baseId: 'leather_legs',
    name: 'Jambières de cuir',
    category: 'legs',
    baseStatRolls: { vitality: [1, 1, 2], agility: [1, 1, 2], armor: [1, 2, 3] },
    legendaryOnlyStatRolls: { armor: [1, 1, 2] },
  },
  {
    baseId: 'studded_legs',
    name: 'Jambières cloutées',
    category: 'legs',
    baseStatRolls: { vitality: [1, 2, 3], armor: [2, 3, 4] },
    legendaryOnlyStatRolls: { vitality: [1, 1, 2] },
  },
  {
    baseId: 'light_leggings',
    name: 'Chausses légères',
    category: 'legs',
    baseStatRolls: { agility: [2, 3, 4], armor: [1, 1, 2] },
    legendaryOnlyStatRolls: { agility: [1, 1, 2] },
  },
  {
    baseId: 'robe_legs',
    name: 'Bas de robe',
    category: 'legs',
    baseStatRolls: { intelligence: [1, 2, 2], armor: [1, 1, 2] },
    legendaryOnlyStatRolls: { intelligence: [1, 1, 2] },
  },

  // --- Bottes ---
  {
    baseId: 'leather_boots',
    name: 'Bottes de cuir',
    category: 'boots',
    baseStatRolls: { agility: [1, 2, 3], armor: [1, 1, 2] },
    legendaryOnlyStatRolls: { agility: [1, 1, 2] },
  },
  {
    baseId: 'swift_boots',
    name: 'Bottes légères',
    category: 'boots',
    baseStatRolls: { agility: [2, 3, 4] },
    rareOnlyStatRolls: { agility: [1, 1, 2] },
    legendaryOnlyStatRolls: { armor: [1, 1, 2] },
  },
  {
    baseId: 'iron_boots',
    name: 'Bottes ferrées',
    category: 'boots',
    baseStatRolls: { vitality: [1, 2, 2], armor: [2, 3, 4] },
    legendaryOnlyStatRolls: { vitality: [1, 1, 2] },
  },
  {
    baseId: 'travelers_boots',
    name: 'Bottes de voyageur',
    category: 'boots',
    baseStatRolls: { agility: [1, 2, 2], vitality: [1, 2, 2] },
    legendaryOnlyStatRolls: { agility: [1, 1, 2] },
  },

  // --- Gants ---
  {
    baseId: 'leather_gloves',
    name: 'Gants de cuir',
    category: 'gloves',
    baseStatRolls: { strength: [1, 1, 2], armor: [1, 1, 2] },
    legendaryOnlyStatRolls: { strength: [1, 1, 2] },
  },
  {
    baseId: 'thief_gloves',
    name: 'Gants de voleur',
    category: 'gloves',
    baseStatRolls: { agility: [1, 2, 3] },
    rareOnlyStatRolls: { agility: [1, 1, 2] },
    legendaryOnlyStatRolls: { fireDamage: [1, 1, 2] },
  },
  {
    baseId: 'scholar_gloves',
    name: "Gants d'étude",
    category: 'gloves',
    baseStatRolls: { intelligence: [1, 2, 3] },
    legendaryOnlyStatRolls: { intelligence: [1, 1, 2] },
  },
  {
    baseId: 'iron_gauntlets',
    name: 'Gantelets de fer',
    category: 'gloves',
    baseStatRolls: { strength: [2, 3, 4], armor: [1, 2, 3] },
    legendaryOnlyStatRolls: { armor: [1, 1, 2] },
  },

  // --- Anneaux ---
  {
    baseId: 'simple_ring',
    name: 'Anneau simple',
    category: 'ring',
    baseStatRolls: { intelligence: [1, 1, 2] },
    legendaryOnlyStatRolls: { intelligence: [1, 1, 2] },
  },
  {
    baseId: 'strength_ring',
    name: 'Anneau de force',
    category: 'ring',
    baseStatRolls: { strength: [1, 2, 3] },
    legendaryOnlyStatRolls: { strength: [1, 1, 2] },
  },
  {
    baseId: 'agility_ring',
    name: "Anneau d'agilité",
    category: 'ring',
    baseStatRolls: { agility: [1, 2, 3] },
    legendaryOnlyStatRolls: { agility: [1, 1, 2] },
  },
  {
    baseId: 'vitality_ring',
    name: 'Anneau de vitalité',
    category: 'ring',
    baseStatRolls: { vitality: [1, 2, 3] },
    legendaryOnlyStatRolls: { vitality: [1, 1, 2] },
  },

  // --- Amulettes ---
  {
    baseId: 'simple_amulet',
    name: 'Amulette simple',
    category: 'amulet',
    baseStatRolls: { intelligence: [1, 2, 3] },
    legendaryOnlyStatRolls: { intelligence: [1, 1, 2] },
  },
  {
    baseId: 'flame_amulet',
    name: 'Amulette de flamme',
    category: 'amulet',
    baseStatRolls: { intelligence: [1, 1, 2] },
    rareOnlyStatRolls: { fireDamage: [2, 3, 4] },
    legendaryOnlyStatRolls: { intelligence: [1, 1, 2] },
  },
  {
    baseId: 'ward_amulet',
    name: 'Amulette de protection',
    category: 'amulet',
    baseStatRolls: { armor: [1, 2, 3], vitality: [1, 1, 2] },
    legendaryOnlyStatRolls: { armor: [1, 1, 2] },
  },
  {
    baseId: 'swift_amulet',
    name: 'Amulette véloce',
    category: 'amulet',
    baseStatRolls: { agility: [1, 2, 3], intelligence: [1, 1, 2] },
    legendaryOnlyStatRolls: { agility: [1, 1, 2] },
  },

  // --- Palier 2 (Aiglemont / Terres Noyées) ---
  // 4 familles par emplacement, mêmes noms d'un slot à l'autre pour rester
  // lisible : Garde (Aiglemont, tank vitalité/armure), Marais (Terres
  // Noyées, agilité), Acier (matériau générique, armure/force lourde),
  // Archiviste (tour des mages, intelligence). Stats nettement au-dessus du
  // palier 1 (voir DESIGN.md) ; alimente pour l'instant le même pool de
  // loot général, faute de segmentation par région/acte.

  // --- Armes (palier 2) ---
  {
    baseId: 'guard_sword',
    name: 'Épée de la garde',
    category: 'weapon',
    baseStatRolls: { strength: [3, 4, 5] },
    rareOnlyStatRolls: { fireDamage: [3, 4, 5] },
    legendaryOnlyStatRolls: { strength: [2, 2, 3] },
  },
  {
    baseId: 'marsh_dagger',
    name: 'Dague des marais',
    category: 'weapon',
    baseStatRolls: { agility: [3, 4, 5] },
    rareOnlyStatRolls: { fireDamage: [2, 3, 3] },
    legendaryOnlyStatRolls: { agility: [2, 2, 3] },
  },
  {
    baseId: 'steel_greatsword',
    name: 'Épée à deux mains en acier',
    category: 'weapon',
    baseStatRolls: { strength: [5, 6, 7] },
    rareOnlyStatRolls: { fireDamage: [2, 3, 4] },
    legendaryOnlyStatRolls: { strength: [2, 3, 3] },
  },
  {
    baseId: 'archivist_wand',
    name: "Bâton d'archiviste",
    category: 'weapon',
    baseStatRolls: { intelligence: [3, 4, 5] },
    rareOnlyStatRolls: { fireDamage: [3, 4, 5] },
    legendaryOnlyStatRolls: { intelligence: [2, 2, 3] },
  },

  // --- Boucliers (palier 2) ---
  {
    baseId: 'guard_shield',
    name: 'Bouclier de la garde',
    category: 'shield',
    baseStatRolls: { vitality: [3, 4, 5], armor: [4, 5, 6] },
    legendaryOnlyStatRolls: { armor: [2, 2, 3] },
  },
  {
    baseId: 'marsh_buckler',
    name: 'Targe des marais',
    category: 'shield',
    baseStatRolls: { agility: [3, 4, 4], armor: [3, 4, 5] },
    rareOnlyStatRolls: { agility: [2, 2, 3] },
    legendaryOnlyStatRolls: { armor: [2, 2, 3] },
  },
  {
    baseId: 'steel_tower_shield',
    name: 'Bouclier-tour en acier',
    category: 'shield',
    baseStatRolls: { vitality: [4, 5, 6], armor: [5, 6, 7] },
    rareOnlyStatRolls: { armor: [2, 3, 3] },
    legendaryOnlyStatRolls: { vitality: [2, 3, 3] },
  },
  {
    baseId: 'smuggler_shield',
    name: 'Bouclier du contrebandier',
    category: 'shield',
    baseStatRolls: { armor: [5, 6, 7] },
    rareOnlyStatRolls: { vitality: [2, 3, 3] },
    legendaryOnlyStatRolls: { armor: [2, 2, 3] },
  },

  // --- Casques (palier 2) ---
  {
    baseId: 'guard_helm',
    name: 'Heaume de la garde',
    category: 'helmet',
    baseStatRolls: { vitality: [3, 3, 4], armor: [3, 4, 5] },
    legendaryOnlyStatRolls: { armor: [2, 2, 3] },
  },
  {
    baseId: 'marsh_hood',
    name: 'Capuche des marais',
    category: 'helmet',
    baseStatRolls: { agility: [3, 4, 4], armor: [2, 3, 4] },
    rareOnlyStatRolls: { agility: [2, 2, 3] },
    legendaryOnlyStatRolls: { armor: [2, 2, 3] },
  },
  {
    baseId: 'steel_helm',
    name: "Heaume d'acier",
    category: 'helmet',
    baseStatRolls: { armor: [5, 6, 7], vitality: [2, 2, 3] },
    rareOnlyStatRolls: { armor: [2, 3, 3] },
    legendaryOnlyStatRolls: { vitality: [2, 2, 3] },
  },
  {
    baseId: 'archivist_circlet',
    name: "Diadème d'archiviste",
    category: 'helmet',
    baseStatRolls: { intelligence: [3, 4, 5], armor: [2, 3, 4] },
    rareOnlyStatRolls: { intelligence: [2, 2, 3] },
    legendaryOnlyStatRolls: { armor: [2, 2, 3] },
  },

  // --- Torses (palier 2) ---
  {
    baseId: 'guard_chest',
    name: 'Plastron de la garde',
    category: 'chest',
    baseStatRolls: { vitality: [3, 4, 5], armor: [4, 5, 6] },
    legendaryOnlyStatRolls: { armor: [2, 2, 3] },
  },
  {
    baseId: 'marsh_vest',
    name: 'Veste des marais',
    category: 'chest',
    baseStatRolls: { agility: [3, 4, 4], armor: [3, 4, 5] },
    legendaryOnlyStatRolls: { agility: [2, 2, 3] },
  },
  {
    baseId: 'steel_chest',
    name: "Cuirasse d'acier",
    category: 'chest',
    baseStatRolls: { vitality: [4, 5, 6], armor: [5, 6, 7] },
    rareOnlyStatRolls: { armor: [2, 3, 3] },
    legendaryOnlyStatRolls: { vitality: [2, 2, 3] },
  },
  {
    baseId: 'archivist_robe',
    name: "Robe d'archiviste",
    category: 'chest',
    baseStatRolls: { intelligence: [3, 4, 5], armor: [2, 3, 4] },
    rareOnlyStatRolls: { intelligence: [2, 2, 3] },
    legendaryOnlyStatRolls: { armor: [2, 2, 3] },
  },

  // --- Jambes (palier 2) ---
  {
    baseId: 'guard_legs',
    name: 'Jambières de la garde',
    category: 'legs',
    baseStatRolls: { vitality: [3, 3, 4], armor: [3, 4, 5] },
    legendaryOnlyStatRolls: { armor: [2, 2, 3] },
  },
  {
    baseId: 'marsh_leggings',
    name: 'Chausses des marais',
    category: 'legs',
    baseStatRolls: { agility: [4, 5, 6], armor: [2, 2, 3] },
    legendaryOnlyStatRolls: { agility: [2, 2, 3] },
  },
  {
    baseId: 'steel_legs',
    name: "Jambières d'acier",
    category: 'legs',
    baseStatRolls: { vitality: [4, 5, 6], armor: [4, 5, 6] },
    legendaryOnlyStatRolls: { vitality: [2, 2, 3] },
  },
  {
    baseId: 'archivist_legs',
    name: "Bas d'archiviste",
    category: 'legs',
    baseStatRolls: { intelligence: [3, 4, 4], armor: [2, 2, 3] },
    legendaryOnlyStatRolls: { intelligence: [2, 2, 3] },
  },

  // --- Bottes (palier 2) ---
  {
    baseId: 'guard_boots',
    name: 'Bottes de la garde',
    category: 'boots',
    baseStatRolls: { vitality: [3, 3, 4], armor: [3, 3, 4] },
    legendaryOnlyStatRolls: { vitality: [2, 2, 3] },
  },
  {
    baseId: 'marsh_boots',
    name: 'Bottes des marais',
    category: 'boots',
    baseStatRolls: { agility: [4, 5, 6] },
    rareOnlyStatRolls: { agility: [2, 2, 3] },
    legendaryOnlyStatRolls: { armor: [2, 2, 3] },
  },
  {
    baseId: 'steel_boots',
    name: "Bottes d'acier",
    category: 'boots',
    baseStatRolls: { vitality: [3, 4, 4], armor: [4, 5, 6] },
    legendaryOnlyStatRolls: { vitality: [2, 2, 3] },
  },
  {
    baseId: 'smuggler_boots',
    name: 'Bottes du contrebandier',
    category: 'boots',
    baseStatRolls: { agility: [3, 4, 4], vitality: [3, 4, 4] },
    legendaryOnlyStatRolls: { agility: [2, 2, 3] },
  },

  // --- Gants (palier 2) ---
  {
    baseId: 'guard_gloves',
    name: 'Gants de la garde',
    category: 'gloves',
    baseStatRolls: { strength: [3, 4, 4], armor: [3, 3, 4] },
    legendaryOnlyStatRolls: { strength: [2, 2, 3] },
  },
  {
    baseId: 'marsh_gloves',
    name: 'Gants des marais',
    category: 'gloves',
    baseStatRolls: { agility: [4, 5, 6] },
    rareOnlyStatRolls: { agility: [2, 2, 3] },
    legendaryOnlyStatRolls: { fireDamage: [2, 2, 3] },
  },
  {
    baseId: 'steel_gauntlets_2',
    name: "Gantelets d'acier renforcés",
    category: 'gloves',
    baseStatRolls: { strength: [4, 5, 6], armor: [3, 4, 5] },
    legendaryOnlyStatRolls: { armor: [2, 2, 3] },
  },
  {
    baseId: 'archivist_gloves',
    name: "Gants d'archiviste",
    category: 'gloves',
    baseStatRolls: { intelligence: [4, 5, 6] },
    legendaryOnlyStatRolls: { intelligence: [2, 2, 3] },
  },

  // --- Anneaux (palier 2) ---
  {
    baseId: 'guard_ring',
    name: 'Anneau de la garde',
    category: 'ring',
    baseStatRolls: { vitality: [3, 4, 5] },
    legendaryOnlyStatRolls: { vitality: [2, 2, 3] },
  },
  {
    baseId: 'marsh_ring',
    name: 'Anneau des marais',
    category: 'ring',
    baseStatRolls: { agility: [3, 4, 5] },
    legendaryOnlyStatRolls: { agility: [2, 2, 3] },
  },
  {
    baseId: 'steel_ring',
    name: "Anneau d'acier",
    category: 'ring',
    baseStatRolls: { strength: [3, 4, 5] },
    legendaryOnlyStatRolls: { strength: [2, 2, 3] },
  },
  {
    baseId: 'archivist_ring',
    name: "Anneau d'archiviste",
    category: 'ring',
    baseStatRolls: { intelligence: [3, 4, 5] },
    legendaryOnlyStatRolls: { intelligence: [2, 2, 3] },
  },

  // --- Amulettes (palier 2) ---
  {
    baseId: 'watch_amulet',
    name: 'Amulette du guet',
    category: 'amulet',
    baseStatRolls: { vitality: [3, 4, 4], armor: [2, 3, 4] },
    legendaryOnlyStatRolls: { armor: [2, 2, 3] },
  },
  {
    baseId: 'marsh_amulet',
    name: 'Amulette des marais',
    category: 'amulet',
    baseStatRolls: { agility: [3, 4, 4], intelligence: [2, 2, 3] },
    legendaryOnlyStatRolls: { agility: [2, 2, 3] },
  },
  {
    baseId: 'steel_amulet',
    name: "Amulette d'acier",
    category: 'amulet',
    baseStatRolls: { strength: [2, 2, 3] },
    rareOnlyStatRolls: { fireDamage: [3, 4, 5] },
    legendaryOnlyStatRolls: { strength: [2, 2, 3] },
  },
  {
    baseId: 'archivist_amulet',
    name: "Amulette d'archiviste",
    category: 'amulet',
    baseStatRolls: { intelligence: [4, 5, 6] },
    legendaryOnlyStatRolls: { intelligence: [2, 2, 3] },
  },

  // --- Palier 3 (donjons tardifs de l'Acte 3) ---
  // Même schéma que les paliers 1 et 2, un cran de puissance de plus.
  // Quatre familles cousines du thème de fin d'Acte 3 : Veilleur (Ordre
  // des Veilleurs, tank vitalité/armure), Ombre (agilité), Mithril
  // (matériau précieux, armure/force lourde), Rituel (arcane du sceau,
  // intelligence).

  // --- Armes (palier 3) ---
  {
    baseId: 'watcher_blade',
    name: 'Lame du Veilleur',
    category: 'weapon',
    baseStatRolls: { strength: [5, 6, 7] },
    rareOnlyStatRolls: { fireDamage: [4, 5, 6] },
    legendaryOnlyStatRolls: { strength: [3, 3, 4] },
  },
  {
    baseId: 'shadow_dagger',
    name: "Dague de l'Ombre",
    category: 'weapon',
    baseStatRolls: { agility: [5, 6, 7] },
    rareOnlyStatRolls: { fireDamage: [3, 4, 5] },
    legendaryOnlyStatRolls: { agility: [3, 3, 4] },
  },
  {
    baseId: 'mithril_sword',
    name: 'Épée de mithril',
    category: 'weapon',
    baseStatRolls: { strength: [7, 8, 9] },
    rareOnlyStatRolls: { fireDamage: [3, 4, 5] },
    legendaryOnlyStatRolls: { strength: [3, 4, 4] },
  },
  {
    baseId: 'ritual_staff',
    name: 'Bâton rituel',
    category: 'weapon',
    baseStatRolls: { intelligence: [5, 6, 7] },
    rareOnlyStatRolls: { fireDamage: [4, 5, 6] },
    legendaryOnlyStatRolls: { intelligence: [3, 3, 4] },
  },

  // --- Boucliers (palier 3) ---
  {
    baseId: 'watcher_shield',
    name: 'Bouclier du Veilleur',
    category: 'shield',
    baseStatRolls: { vitality: [5, 6, 7], armor: [6, 7, 8] },
    legendaryOnlyStatRolls: { armor: [3, 3, 4] },
  },
  {
    baseId: 'shadow_buckler',
    name: "Targe de l'Ombre",
    category: 'shield',
    baseStatRolls: { agility: [5, 6, 6], armor: [4, 5, 6] },
    rareOnlyStatRolls: { agility: [3, 3, 4] },
    legendaryOnlyStatRolls: { armor: [3, 3, 4] },
  },
  {
    baseId: 'mithril_shield',
    name: 'Bouclier de mithril',
    category: 'shield',
    baseStatRolls: { vitality: [6, 7, 8], armor: [7, 8, 9] },
    rareOnlyStatRolls: { armor: [3, 4, 4] },
    legendaryOnlyStatRolls: { vitality: [3, 4, 4] },
  },
  {
    baseId: 'ritual_ward',
    name: 'Égide rituelle',
    category: 'shield',
    baseStatRolls: { armor: [7, 8, 9] },
    rareOnlyStatRolls: { vitality: [3, 4, 4] },
    legendaryOnlyStatRolls: { armor: [3, 3, 4] },
  },

  // --- Casques (palier 3) ---
  {
    baseId: 'watcher_helm',
    name: 'Heaume du Veilleur',
    category: 'helmet',
    baseStatRolls: { vitality: [5, 5, 6], armor: [5, 6, 7] },
    legendaryOnlyStatRolls: { armor: [3, 3, 4] },
  },
  {
    baseId: 'shadow_hood',
    name: "Capuche de l'Ombre",
    category: 'helmet',
    baseStatRolls: { agility: [5, 6, 6], armor: [3, 4, 5] },
    rareOnlyStatRolls: { agility: [3, 3, 4] },
    legendaryOnlyStatRolls: { armor: [3, 3, 4] },
  },
  {
    baseId: 'mithril_helm',
    name: 'Heaume de mithril',
    category: 'helmet',
    baseStatRolls: { armor: [7, 8, 9], vitality: [3, 3, 4] },
    rareOnlyStatRolls: { armor: [3, 4, 4] },
    legendaryOnlyStatRolls: { vitality: [3, 3, 4] },
  },
  {
    baseId: 'ritual_circlet',
    name: 'Diadème rituel',
    category: 'helmet',
    baseStatRolls: { intelligence: [5, 6, 7], armor: [3, 4, 5] },
    rareOnlyStatRolls: { intelligence: [3, 3, 4] },
    legendaryOnlyStatRolls: { armor: [3, 3, 4] },
  },

  // --- Torses (palier 3) ---
  {
    baseId: 'watcher_chest',
    name: 'Plastron du Veilleur',
    category: 'chest',
    baseStatRolls: { vitality: [5, 6, 7], armor: [6, 7, 8] },
    legendaryOnlyStatRolls: { armor: [3, 3, 4] },
  },
  {
    baseId: 'shadow_vest',
    name: "Veste de l'Ombre",
    category: 'chest',
    baseStatRolls: { agility: [5, 6, 6], armor: [4, 5, 6] },
    legendaryOnlyStatRolls: { agility: [3, 3, 4] },
  },
  {
    baseId: 'mithril_chest',
    name: 'Cuirasse de mithril',
    category: 'chest',
    baseStatRolls: { vitality: [6, 7, 8], armor: [7, 8, 9] },
    rareOnlyStatRolls: { armor: [3, 4, 4] },
    legendaryOnlyStatRolls: { vitality: [3, 3, 4] },
  },
  {
    baseId: 'ritual_robe',
    name: 'Robe rituelle',
    category: 'chest',
    baseStatRolls: { intelligence: [5, 6, 7], armor: [3, 4, 5] },
    rareOnlyStatRolls: { intelligence: [3, 3, 4] },
    legendaryOnlyStatRolls: { armor: [3, 3, 4] },
  },

  // --- Jambes (palier 3) ---
  {
    baseId: 'watcher_legs',
    name: 'Jambières du Veilleur',
    category: 'legs',
    baseStatRolls: { vitality: [5, 5, 6], armor: [5, 6, 7] },
    legendaryOnlyStatRolls: { armor: [3, 3, 4] },
  },
  {
    baseId: 'shadow_leggings',
    name: "Chausses de l'Ombre",
    category: 'legs',
    baseStatRolls: { agility: [6, 7, 8], armor: [3, 3, 4] },
    legendaryOnlyStatRolls: { agility: [3, 3, 4] },
  },
  {
    baseId: 'mithril_legs',
    name: 'Jambières de mithril',
    category: 'legs',
    baseStatRolls: { vitality: [6, 7, 8], armor: [6, 7, 8] },
    legendaryOnlyStatRolls: { vitality: [3, 3, 4] },
  },
  {
    baseId: 'ritual_legs',
    name: 'Bas rituels',
    category: 'legs',
    baseStatRolls: { intelligence: [5, 6, 6], armor: [3, 3, 4] },
    legendaryOnlyStatRolls: { intelligence: [3, 3, 4] },
  },

  // --- Bottes (palier 3) ---
  {
    baseId: 'watcher_boots',
    name: 'Bottes du Veilleur',
    category: 'boots',
    baseStatRolls: { vitality: [5, 5, 6], armor: [5, 5, 6] },
    legendaryOnlyStatRolls: { vitality: [3, 3, 4] },
  },
  {
    baseId: 'shadow_boots',
    name: "Bottes de l'Ombre",
    category: 'boots',
    baseStatRolls: { agility: [6, 7, 8] },
    rareOnlyStatRolls: { agility: [3, 3, 4] },
    legendaryOnlyStatRolls: { armor: [3, 3, 4] },
  },
  {
    baseId: 'mithril_boots',
    name: 'Bottes de mithril',
    category: 'boots',
    baseStatRolls: { vitality: [5, 6, 6], armor: [6, 7, 8] },
    legendaryOnlyStatRolls: { vitality: [3, 3, 4] },
  },
  {
    baseId: 'ritual_boots',
    name: 'Bottes rituelles',
    category: 'boots',
    baseStatRolls: { agility: [5, 6, 6], intelligence: [3, 3, 4] },
    legendaryOnlyStatRolls: { agility: [3, 3, 4] },
  },

  // --- Gants (palier 3) ---
  {
    baseId: 'watcher_gloves',
    name: 'Gants du Veilleur',
    category: 'gloves',
    baseStatRolls: { strength: [5, 6, 6], armor: [5, 5, 6] },
    legendaryOnlyStatRolls: { strength: [3, 3, 4] },
  },
  {
    baseId: 'shadow_gloves',
    name: "Gants de l'Ombre",
    category: 'gloves',
    baseStatRolls: { agility: [6, 7, 8] },
    rareOnlyStatRolls: { agility: [3, 3, 4] },
    legendaryOnlyStatRolls: { fireDamage: [3, 3, 4] },
  },
  {
    baseId: 'mithril_gauntlets',
    name: 'Gantelets de mithril',
    category: 'gloves',
    baseStatRolls: { strength: [6, 7, 8], armor: [5, 6, 7] },
    legendaryOnlyStatRolls: { armor: [3, 3, 4] },
  },
  {
    baseId: 'ritual_gloves',
    name: 'Gants rituels',
    category: 'gloves',
    baseStatRolls: { intelligence: [6, 7, 8] },
    legendaryOnlyStatRolls: { intelligence: [3, 3, 4] },
  },

  // --- Anneaux (palier 3) ---
  {
    baseId: 'watcher_ring',
    name: 'Anneau du Veilleur',
    category: 'ring',
    baseStatRolls: { vitality: [5, 6, 7] },
    legendaryOnlyStatRolls: { vitality: [3, 3, 4] },
  },
  {
    baseId: 'shadow_ring',
    name: "Anneau de l'Ombre",
    category: 'ring',
    baseStatRolls: { agility: [5, 6, 7] },
    legendaryOnlyStatRolls: { agility: [3, 3, 4] },
  },
  {
    baseId: 'mithril_ring',
    name: 'Anneau de mithril',
    category: 'ring',
    baseStatRolls: { strength: [5, 6, 7] },
    legendaryOnlyStatRolls: { strength: [3, 3, 4] },
  },
  {
    baseId: 'ritual_ring',
    name: 'Anneau rituel',
    category: 'ring',
    baseStatRolls: { intelligence: [5, 6, 7] },
    legendaryOnlyStatRolls: { intelligence: [3, 3, 4] },
  },

  // --- Amulettes (palier 3) ---
  {
    baseId: 'watcher_amulet',
    name: 'Amulette du Veilleur',
    category: 'amulet',
    baseStatRolls: { vitality: [5, 6, 6], armor: [3, 4, 5] },
    legendaryOnlyStatRolls: { armor: [3, 3, 4] },
  },
  {
    baseId: 'shadow_amulet',
    name: "Amulette de l'Ombre",
    category: 'amulet',
    baseStatRolls: { agility: [5, 6, 6], intelligence: [3, 3, 4] },
    legendaryOnlyStatRolls: { agility: [3, 3, 4] },
  },
  {
    baseId: 'mithril_amulet',
    name: 'Amulette de mithril',
    category: 'amulet',
    baseStatRolls: { strength: [3, 3, 4] },
    rareOnlyStatRolls: { fireDamage: [4, 5, 6] },
    legendaryOnlyStatRolls: { strength: [3, 3, 4] },
  },
  {
    baseId: 'ritual_amulet',
    name: 'Amulette rituelle',
    category: 'amulet',
    baseStatRolls: { intelligence: [6, 7, 8] },
    legendaryOnlyStatRolls: { intelligence: [3, 3, 4] },
  },

  // --- Objets signature (jamais dans le loot commun, voir plus haut) ---
  {
    baseId: 'guardian_amulet',
    name: 'Amulette du Gardien déchu',
    category: 'amulet',
    baseStatRolls: { intelligence: [2, 3, 4], vitality: [1, 2, 3] },
    rareOnlyStatRolls: { armor: [2, 3, 4] },
    signature: true,
  },
  {
    baseId: 'shard_pendant',
    name: "Pendentif d'éclat scellé",
    category: 'amulet',
    baseStatRolls: { intelligence: [2, 3, 4], vitality: [2, 3, 4] },
    rareOnlyStatRolls: { armor: [1, 2, 3] },
    signature: true,
  },
  {
    baseId: 'seeker_signet',
    name: "Sceau de l'Archiviste",
    category: 'ring',
    baseStatRolls: { intelligence: [1, 2, 3], agility: [1, 2, 3] },
    rareOnlyStatRolls: { armor: [1, 2, 3] },
    signature: true,
  },
  {
    baseId: 'purified_breastplate',
    name: 'Cuirasse purifiée',
    category: 'chest',
    baseStatRolls: { vitality: [3, 4, 5], armor: [1, 2, 3] },
    rareOnlyStatRolls: { armor: [1, 2, 3] },
    signature: true,
  },
  {
    baseId: 'sealed_blade',
    name: 'Lame du Sceau originel',
    category: 'weapon',
    baseStatRolls: { strength: [3, 4, 5], intelligence: [1, 2, 3] },
    rareOnlyStatRolls: { fireDamage: [3, 4, 5] },
    signature: true,
  },
  {
    baseId: 'watchtower_helm',
    name: 'Heaume de la Vigie oubliée',
    category: 'helmet',
    baseStatRolls: { vitality: [2, 3, 4], agility: [1, 2, 3] },
    rareOnlyStatRolls: { armor: [1, 2, 3] },
    signature: true,
  },
  {
    baseId: 'eternal_watch_greaves',
    name: 'Grèves de la Veille éternelle',
    category: 'legs',
    baseStatRolls: { agility: [2, 3, 4], vitality: [1, 2, 3] },
    rareOnlyStatRolls: { armor: [2, 3, 4] },
    signature: true,
  },
  {
    baseId: 'last_watcher_boots',
    name: 'Bottes du Dernier Veilleur',
    category: 'boots',
    baseStatRolls: { agility: [2, 3, 4], vitality: [2, 3, 4] },
    rareOnlyStatRolls: { armor: [1, 2, 3] },
    signature: true,
  },
  {
    baseId: 'broken_sleep_aegis',
    name: 'Égide du Sommeil brisé',
    category: 'shield',
    baseStatRolls: { vitality: [3, 4, 5], armor: [2, 3, 4] },
    rareOnlyStatRolls: { armor: [1, 2, 3] },
    signature: true,
  },
  {
    baseId: 'corrupted_root_gloves',
    name: 'Gants de la Racine-mère',
    category: 'gloves',
    baseStatRolls: { strength: [2, 3, 4], vitality: [2, 3, 4] },
    rareOnlyStatRolls: { armor: [1, 2, 3] },
    signature: true,
  },
];

// Panoplies (équipement sets) — built entirely from existing signature
// items already thematically grouped by dungeon/story arc, not a new loot
// pipeline. Bonuses stay modest and cumulative (a lower threshold stays
// active once a higher one is reached) so a set is a genuine alternative
// build, never a strict upgrade over freely mixed best-in-slot gear.
export interface ItemSetBonus {
  pieces: number;
  stats: ItemStats;
}

export interface ItemSet {
  id: string;
  label: string;
  baseIds: string[];
  bonuses: ItemSetBonus[];
}

export const ITEM_SETS: ItemSet[] = [
  {
    id: 'watchers_order',
    label: "Ordre des Veilleurs",
    baseIds: ['watchtower_helm', 'eternal_watch_greaves', 'last_watcher_boots'],
    bonuses: [
      { pieces: 2, stats: { armor: 2 } },
      { pieces: 3, stats: { vitality: 3 } },
    ],
  },
  {
    id: 'blighted_grove',
    label: 'Bosquet corrompu',
    baseIds: ['purified_breastplate', 'corrupted_root_gloves'],
    bonuses: [{ pieces: 2, stats: { vitality: 2, armor: 1 } }],
  },
];

const SET_BY_BASE_ID = new Map<string, ItemSet>();
ITEM_SETS.forEach((set) => set.baseIds.forEach((baseId) => SET_BY_BASE_ID.set(baseId, set)));

function countEquippedPerSet(equipment: Partial<Record<EquipSlot, Item>>): Map<string, number> {
  const counts = new Map<string, number>();
  Object.values(equipment).forEach((item) => {
    if (!item) return;
    const set = SET_BY_BASE_ID.get(item.baseId);
    if (!set) return;
    counts.set(set.id, (counts.get(set.id) ?? 0) + 1);
  });
  return counts;
}

// Sums every set-bonus threshold currently met by the character's equipped
// gear — the only place set bonuses actually apply stats, consumed by
// getEffectiveStats() in character.ts.
export function getEquippedSetBonusStats(equipment: Partial<Record<EquipSlot, Item>>): ItemStats {
  const counts = countEquippedPerSet(equipment);
  const total: ItemStats = {};
  ITEM_SETS.forEach((set) => {
    const equipped = counts.get(set.id) ?? 0;
    set.bonuses.forEach((bonus) => {
      if (equipped < bonus.pieces) return;
      (Object.keys(bonus.stats) as (keyof ItemStats)[]).forEach((key) => {
        total[key] = (total[key] ?? 0) + (bonus.stats[key] ?? 0);
      });
    });
  });
  return total;
}

// One line per set with at least one piece equipped, e.g. "Ordre des
// Veilleurs 2/3" — surfaced in the Équipement screen's stats summary.
export function summarizeEquippedSets(equipment: Partial<Record<EquipSlot, Item>>): string[] {
  const counts = countEquippedPerSet(equipment);
  return ITEM_SETS.filter((set) => (counts.get(set.id) ?? 0) > 0).map(
    (set) => `${set.label} ${counts.get(set.id)}/${set.baseIds.length}`,
  );
}

// Full per-threshold breakdown for a single item's detail view — which
// panoplie it belongs to, current progress, and which bonus tiers are
// active vs. still locked.
export function describeItemSetDetail(baseId: string, equipment: Partial<Record<EquipSlot, Item>>): string[] {
  const set = SET_BY_BASE_ID.get(baseId);
  if (!set) return [];
  const counts = countEquippedPerSet(equipment);
  const equipped = counts.get(set.id) ?? 0;
  const lines = [`Panoplie : ${set.label} (${equipped}/${set.baseIds.length} équipées)`];
  set.bonuses.forEach((bonus) => {
    const active = equipped >= bonus.pieces;
    const statsText = (Object.keys(bonus.stats) as (keyof ItemStats)[])
      .map((key) => `${STAT_LABELS[key]} +${bonus.stats[key]}`)
      .join(', ');
    lines.push(`${active ? '✓' : '·'} ${bonus.pieces} pièces : ${statsText}`);
  });
  return lines;
}

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Commun',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
};

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9aa0a6',
  rare: '#4fa3e3',
  epic: '#a855f7',
  legendary: '#ff8c1a',
};

const RARITY_MULTIPLIER: Record<Rarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 5,
};

const RARITY_SELL_PRICE: Record<Rarity, number> = {
  common: 10,
  rare: 25,
  epic: 60,
  legendary: 150,
};

export function sellPrice(item: Item): number {
  return RARITY_SELL_PRICE[item.rarity];
}

const SLOT_LABELS: Record<EquipSlot, string> = {
  weapon: 'Arme',
  shield: 'Bouclier',
  helmet: 'Casque',
  chest: 'Torse',
  legs: 'Jambes',
  boots: 'Bottes',
  gloves: 'Gants',
  ring1: 'Anneau 1',
  ring2: 'Anneau 2',
  amulet: 'Amulette',
};

export function equipSlotLabel(slot: EquipSlot): string {
  return SLOT_LABELS[slot];
}

// Short square-icon labels standing in for real art (increment 10) — used by
// the Sac's icon grid so items read at a glance instead of as full names.
const CATEGORY_ICONS: Record<ItemCategory, string> = {
  weapon: 'ARM',
  shield: 'BOU',
  helmet: 'CAS',
  chest: 'TOR',
  legs: 'JAM',
  boots: 'BOT',
  gloves: 'GAN',
  ring1: 'ANN',
  ring2: 'ANN',
  ring: 'ANN',
  amulet: 'AMU',
};

export function categoryIcon(category: ItemCategory): string {
  return CATEGORY_ICONS[category];
}

let nextItemId = 1;

function scaleStats(stats: ItemStats, multiplier: number): ItemStats {
  const scaled: ItemStats = {};
  (Object.keys(stats) as (keyof ItemStats)[]).forEach((key) => {
    const base = stats[key];
    if (base !== undefined) {
      scaled[key] = Math.max(1, Math.round(base * multiplier));
    }
  });
  return scaled;
}

// Picks one of a stat line's 3 possible values, uniformly at random.
function rollStatLine(options: StatRoll): number {
  return options[Math.floor(Math.random() * options.length)];
}

// Rolls every stat line in a template's roll table independently — each
// line gets its own random pick, not one pick shared across the whole item.
function rollStatLines(rolls: Partial<Record<keyof ItemStats, StatRoll>> | undefined): ItemStats {
  const result: ItemStats = {};
  if (!rolls) return result;
  (Object.keys(rolls) as (keyof ItemStats)[]).forEach((key) => {
    const options = rolls[key];
    if (options) result[key] = rollStatLine(options);
  });
  return result;
}

export function createItem(baseId: string, rarity: Rarity): Item {
  const template = TEMPLATES.find((t) => t.baseId === baseId);
  if (!template) {
    throw new Error(`Unknown item template: ${baseId}`);
  }
  const rolledBase = rollStatLines(template.baseStatRolls);
  const stats = scaleStats(rolledBase, RARITY_MULTIPLIER[rarity]);
  if (rarity !== 'common' && template.rareOnlyStatRolls) {
    const rolledExtra = rollStatLines(template.rareOnlyStatRolls);
    (Object.keys(rolledExtra) as (keyof ItemStats)[]).forEach((key) => {
      stats[key] = (stats[key] ?? 0) + (rolledExtra[key] ?? 0);
    });
  }
  // Stacks on top of the rare-tier line above, not instead of it — a
  // legendary item has every line a lower rarity of the same template
  // could roll, plus this one.
  if (rarity === 'legendary' && template.legendaryOnlyStatRolls) {
    const rolledLegendary = rollStatLines(template.legendaryOnlyStatRolls);
    (Object.keys(rolledLegendary) as (keyof ItemStats)[]).forEach((key) => {
      stats[key] = (stats[key] ?? 0) + (rolledLegendary[key] ?? 0);
    });
  }
  return {
    id: `item-${nextItemId++}`,
    baseId: template.baseId,
    name: template.name,
    category: template.category,
    rarity,
    stats,
  };
}

// Human-readable stat lines for a single item, e.g. ["Force +2", "Armure +3"].
export function describeItemStats(item: Item): string[] {
  return (Object.keys(item.stats) as (keyof ItemStats)[])
    .filter((key) => item.stats[key])
    .map((key) => `${STAT_LABELS[key]} +${item.stats[key]}`);
}

// Stat-by-stat comparison against the item currently occupying the slot (if
// any), so the player can see exactly what equipping `next` would change.
export function compareItemStats(next: Item, current?: Item): string[] {
  const keys = new Set<keyof ItemStats>([
    ...(Object.keys(next.stats) as (keyof ItemStats)[]),
    ...(current ? (Object.keys(current.stats) as (keyof ItemStats)[]) : []),
  ]);
  const lines: string[] = [];
  keys.forEach((key) => {
    const nextValue = next.stats[key] ?? 0;
    const currentValue = current?.stats[key] ?? 0;
    if (nextValue === 0 && currentValue === 0) return;
    const diff = nextValue - currentValue;
    const diffLabel = diff > 0 ? `+${diff}` : `${diff}`;
    lines.push(`${STAT_LABELS[key]} : ${currentValue} → ${nextValue} (${diffLabel})`);
  });
  return lines;
}

// Total stat weight of an item — rarity is already baked in here since rare
// items roll with scaled-up (and sometimes bonus) stats, so this single
// number captures both "stats" and "rareté" per the comparison the Sac shows.
function powerScore(item: Item): number {
  return Object.values(item.stats).reduce((sum: number, value) => sum + (value ?? 0), 0);
}

// Whether `next` would be a strict upgrade over `current` (or over nothing,
// i.e. an empty slot) — drives the "meilleur objet" highlight in the Sac.
export function isUpgrade(next: Item, current?: Item): boolean {
  return powerScore(next) > (current ? powerScore(current) : 0);
}

interface LootOptions {
  // Boss fights guarantee a drop instead of rolling the base chance.
  guaranteed?: boolean;
  // Base chance of rolling rare instead of common, when a drop happens.
  rareChance?: number;
  // Chance of rolling epic instead of rare/common — 0 by default, so only
  // hard-dungeon bosses that explicitly opt in can drop one from the pool
  // (on top of any signature reward they grant directly).
  epicChance?: number;
  // Chance of rolling legendary instead of epic/rare/common — 0 by default.
  // Only ever set above 0 for a 'legendary'-tier monster encounter (see
  // EncounterTier in monster.ts), itself already a ~1% roll, so a
  // legendary item means clearing two rare rolls back to back.
  legendaryChance?: number;
}

const LOOTABLE_TEMPLATES = TEMPLATES.filter((t) => !t.signature);

// Modest drop chance, mostly common with a smaller chance of rare/epic/
// legendary — bosses pass { guaranteed: true } for a sure drop with better
// odds. Real per-dungeon loot tables come as more dungeons are added;
// difficulty tiers currently differ via these chances, not separate tables.
export function rollLootItem(options: LootOptions = {}): Item | null {
  const { guaranteed = false, rareChance = 0.2, epicChance = 0, legendaryChance = 0 } = options;
  if (!guaranteed && Math.random() > 0.4) return null;
  const template = LOOTABLE_TEMPLATES[Math.floor(Math.random() * LOOTABLE_TEMPLATES.length)];
  const roll = Math.random();
  const rarity: Rarity =
    roll < legendaryChance
      ? 'legendary'
      : roll < legendaryChance + epicChance
        ? 'epic'
        : roll < legendaryChance + epicChance + rareChance
          ? 'rare'
          : 'common';
  return createItem(template.baseId, rarity);
}
