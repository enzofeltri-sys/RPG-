// Balancing simulator (DESIGN.md, gameplay pass step 7): plays thousands of
// fights with the real CombatEngine, for a typical character of each class
// at each point of the story, and prints win rates, fight length and HP lost.
//
//   npm run simulate              -> summary table
//   npm run simulate -- --detail  -> also every regular monster per zone
//   npm run simulate -- --difficulty=easy|hard
//
// The story path, the XP a player has at each zone and the gear they wear
// are modelled here (see ZONES, levelAt, gearProgression); the fights themselves use
// the game's own code, so the numbers move as soon as the rules do.

import { CharClass, Character, allocateStatPoint, createCharacter, grantXp } from '../../src/game/character';
import { CombatEngine } from '../../src/game/combatEngine';
import { EquipSlot, Item, ItemStats, WeaponType, rollLootItem } from '../../src/game/item';
import { BOSS_WEIGHTS, MONSTER_TUNING, createMonster, standardMonsterAttack, standardMonsterHp } from '../../src/game/monster';
import { ZONE_LEVEL } from '../../src/game/worldMap';
import { DIFFICULTY_RULES, Difficulty } from '../../src/game/difficulty';
import type { ReturnSceneKey } from '../../src/ui/returnContext';
import { handRule, handSlotAccepts } from '../../src/game/weapons';
import { monsterKit } from '../../src/game/monsterKit';
import { learnTalent, learnBlocker, talentPointsAvailable, toggleEquipSkill } from '../../src/game/talents';

interface Zone {
  name: string;
  scene: ReturnSceneKey;
  tier: 1 | 2 | 3;
  regulars: string[];
  boss?: string;
}

// Story order (main quest + the side dungeons on the way), with each zone's
// fixed encounters plus the route/replay fights a player typically does.
export const ZONES: Zone[] = [
  { name: 'Champ', scene: 'Field', tier: 1, regulars: ['corrupted_wolf', 'corrupted_wolf', 'corrupted_wolf'] },
  { name: 'Ferme', scene: 'Farm', tier: 1, regulars: ['field_rat', 'field_rat', 'field_rat'], boss: 'rat_king' },
  { name: 'Donjon', scene: 'Dungeon', tier: 1, regulars: ['cave_rat', 'corrupted_wolf'], boss: 'alpha_wolf' },
  { name: 'Forêt', scene: 'Forest', tier: 1, regulars: ['corrupted_wolf', 'goblin_scout', 'goblin_scout'] },
  { name: 'Camp bandit', scene: 'BanditCamp', tier: 1, regulars: ['bandit_thug', 'bandit_thug'], boss: 'bandit_leader' },
  { name: 'Camp gobelin', scene: 'GoblinCamp', tier: 1, regulars: ['goblin_brute', 'goblin_brute'], boss: 'goblin_chief' },
  { name: 'Grotte', scene: 'Cave', tier: 1, regulars: ['cave_spider', 'cave_spider'] },
  { name: 'Route', scene: 'Road', tier: 1, regulars: ['corrupted_boar', 'corrupted_boar', 'corrupted_boar'], boss: 'corrupted_boar_alpha' },
  { name: 'Vieux puits', scene: 'OldWell', tier: 2, regulars: ['cave_rat'], boss: 'well_guardian' },
  { name: 'Entrepôt', scene: 'Warehouse', tier: 2, regulars: ['smuggler_thug', 'smuggler_thug', 'smuggler_thug'], boss: 'smuggler_captain' },
  { name: 'Marais', scene: 'MarshLair', tier: 2, regulars: ['marsh_serpent', 'marsh_serpent', 'marsh_serpent'], boss: 'marsh_matriarch' },
  { name: 'Catacombes', scene: 'Catacombs', tier: 2, regulars: ['corrupted_knight', 'corrupted_knight', 'corrupted_knight'], boss: 'fallen_guardian' },
  { name: 'Ruines', scene: 'SunkenRuins', tier: 2, regulars: ['bog_wraith', 'bog_wraith', 'corrupted_sentinel'], boss: 'ruins_delver' },
  { name: 'Quai', scene: 'ClandestineDock', tier: 2, regulars: ['smuggler_thug', 'smuggler_thug'], boss: 'smuggler_lieutenant' },
  { name: 'Sanctuaire scellé', scene: 'SealedSanctuary', tier: 2, regulars: ['corrupted_sentinel', 'corrupted_sentinel'], boss: 'shard_warden' },
  { name: 'Camp des chercheurs', scene: 'ShardSeekersCamp', tier: 2, regulars: ['seeker_scout', 'seeker_scout'], boss: 'seeker_archivist' },
  { name: 'Archives', scene: 'Archives', tier: 2, regulars: ['corrupted_tome', 'archive_wisp'] },
  { name: 'Tombeau', scene: 'BrotherhoodTomb', tier: 2, regulars: ['corrupted_knight', 'corrupted_knight'], boss: 'demon_envoy' },
  { name: 'Bosquet', scene: 'BlightedGrove', tier: 2, regulars: ['blight_spawn', 'blight_spawn'], boss: 'corruption_heart' },
  { name: 'Chambre du sceau', scene: 'SealChamber', tier: 3, regulars: ['brotherhood_specter', 'brotherhood_specter'], boss: 'primordial_guardian' },
  { name: 'Guet silencieux', scene: 'SilentWatch', tier: 3, regulars: ['corrupted_sentinel', 'corrupted_sentinel'], boss: 'watchtower_guardian' },
  { name: 'Cœur du rempart', scene: 'WardCore', tier: 3, regulars: ['brotherhood_specter', 'brotherhood_specter'], boss: 'unnamed_vestige' },
  { name: 'Caveau', scene: 'WatchersVault', tier: 3, regulars: ['archive_wisp', 'archive_wisp'], boss: 'last_watcher' },
  { name: 'Sommeil brisé', scene: 'BrokenSleep', tier: 3, regulars: ['corrupted_knight', 'corrupted_knight'], boss: 'broken_sleeper' },
  { name: 'Racine', scene: 'CorruptedRoot', tier: 3, regulars: ['blight_spawn', 'blight_spawn'], boss: 'blight_root' },
  { name: 'Profondeurs', scene: 'SealDepths', tier: 3, regulars: ['corrupted_sentinel', 'corrupted_sentinel'], boss: 'seal_echo' },
  { name: 'Loge', scene: 'WatchersLodge', tier: 3, regulars: ['watcher_echo', 'watcher_echo'], boss: 'oath_guardian' },
  { name: 'Archive du rite', scene: 'RiteArchive', tier: 3, regulars: ['watcher_echo', 'watcher_echo'], boss: 'rite_guardian' },
  { name: 'Annexe', scene: 'RiteAnnex', tier: 3, regulars: ['watcher_echo', 'watcher_echo'], boss: 'veiled_scribe' },
  { name: 'Crypte', scene: 'AncestralCrypt', tier: 3, regulars: ['corrupted_knight', 'corrupted_knight'], boss: 'blood_keeper' },
  { name: 'Tombe oubliée', scene: 'ForgottenGrave', tier: 3, regulars: ['corrupted_knight', 'corrupted_knight'], boss: 'grave_warden' },
  { name: 'Archive de guilde', scene: 'GuildArchive', tier: 3, regulars: ['corrupted_knight', 'corrupted_knight'], boss: 'record_keeper' },
  { name: 'Relais corrompu', scene: 'CorruptedWaystation', tier: 3, regulars: ['corrupted_wolf', 'corrupted_wolf'], boss: 'blight_sentinel' },
  { name: 'Chapelle', scene: 'SunkenChapel', tier: 3, regulars: ['marsh_serpent', 'marsh_serpent'], boss: 'sunken_warden' },
  { name: 'Troisième autel', scene: 'ThirdAltar', tier: 3, regulars: ['corrupted_knight', 'corrupted_knight'], boss: 'ancestor_warden' },
  { name: 'Profondeurs du sanctuaire', scene: 'SanctuaryDepths', tier: 3, regulars: ['corrupted_sentinel', 'corrupted_sentinel'], boss: 'demon_king_echo' },
];

// Extra route/replay fights per zone, on top of its fixed encounters.
const EXTRA_FIGHTS_PER_ZONE = 2;

const CLASSES: CharClass[] = ['warrior', 'mage', 'cleric', 'archer', 'rogue'];
const CLASS_LABELS: Record<CharClass, string> = {
  warrior: 'Guerrier',
  mage: 'Mage',
  cleric: 'Clerc',
  archer: 'Archer',
  rogue: 'Voleur',
};

// ------------------------------------------------------------ progression

function zoneLevel(zone: Zone): number {
  return ZONE_LEVEL[zone.scene] ?? 1;
}

function spawn(zone: Zone, id: string) {
  return createMonster(id, 'normal', zoneLevel(zone), DIFFICULTY_RULES[DIFFICULTY]);
}

// Player level on entering each zone, and when reaching its boss.
export function levelAt(): { enter: number; boss: number }[] {
  const probe = createCharacter('human', 'warrior');
  return ZONES.map((zone) => {
    const enter = probe.level;
    const fights = [...zone.regulars, ...zone.regulars.slice(0, EXTRA_FIGHTS_PER_ZONE)];
    fights.forEach((id) => grantXp(probe, spawn(zone, id).xpReward));
    const boss = probe.level;
    if (zone.boss) grantXp(probe, spawn(zone, zone.boss).xpReward);
    return { enter, boss };
  });
}

// ------------------------------------------------------------ character

const STAT_SPLIT: Record<CharClass, ('strength' | 'intelligence' | 'agility' | 'vitality')[]> = {
  warrior: ['strength', 'strength', 'vitality'],
  mage: ['intelligence', 'intelligence', 'vitality'],
  cleric: ['intelligence', 'intelligence', 'vitality'],
  archer: ['agility', 'agility', 'vitality'],
  rogue: ['agility', 'agility', 'vitality'],
};

// Talent order each bot follows (a reasonable build, not the only one).
const TALENT_ORDER: Record<CharClass, string[]> = {
  warrior: ['weapon_mastery', 'armor_break', 'steel_skin', 'weapon_mastery', 'steel_skin', 'weapon_mastery', 'steel_skin', 'heavy_strike', 'shield_bash', 'chain_strikes', 'defensive_stance', 'execution', 'execution', 'armor_break', 'last_bastion', 'hot_blood', 'war_cry', 'bloodthirst', 'shield_bash'],
  mage: ['ignition', 'frost_bolt', 'ice_barrier', 'flame_wall', 'ignition', 'fireball', 'quick_mind', 'combustion', 'ignition', 'meteor', 'concentration', 'arcane_power', 'meteor', 'arcane_power', 'flame_wall', 'quick_mind', 'biting_cold', 'quick_mind', 'ice_heart'],
  cleric: ['smite', 'fervor', 'healing_hands', 'fervor', 'faith_shield', 'smite', 'regeneration', 'fervor', 'judgment', 'devotion', 'divine_wrath', 'devotion', 'heal', 'divine_wrath', 'purification', 'grace', 'healing_hands', 'healing_hands', 'devotion'],
  archer: ['lynx_eye', 'double_shot', 'lynx_eye', 'lynx_eye', 'killer', 'poison_arrow', 'double_shot', 'deadly_shot', 'sidestep', 'fallback', 'venom', 'deadly_shot', 'snare', 'sidestep', 'arrow_rain', 'perfect_aim', 'second_wind', 'sidestep', 'venom'],
  rogue: ['sharpened_blades', 'sneak_attack', 'sharpened_blades', 'sharpened_blades', 'opportunist', 'feint', 'low_blow', 'reflexes', 'coat_blade', 'blade_dance', 'toxins', 'reflexes', 'weak_spot', 'blade_dance', 'sneak_attack', 'deadly_venom', 'pickpocket', 'reflexes', 'vanish'],
};

const EQUIP_PRIORITY: Record<CharClass, string[]> = {
  warrior: ['heavy_strike', 'armor_break', 'shield_bash', 'execution', 'defensive_stance'],
  mage: ['fireball', 'flame_wall', 'meteor', 'ice_barrier', 'frost_bolt', 'concentration'],
  cleric: ['heal', 'smite', 'divine_wrath', 'faith_shield', 'regeneration'],
  archer: ['deadly_shot', 'double_shot', 'fallback', 'perfect_aim', 'poison_arrow'],
  rogue: ['low_blow', 'sneak_attack', 'blade_dance', 'feint'],
};

// Weapon types each bot keeps in the right hand, and what it holds in the left.
const RIGHT_TYPES: Record<CharClass, WeaponType[]> = {
  warrior: ['sword', 'axe'],
  mage: ['staff'],
  cleric: ['staff'],
  archer: ['bow'],
  rogue: ['dagger'],
};
const LEFT_KIND: Record<CharClass, 'shield' | 'tome' | 'melee' | null> = {
  warrior: 'shield',
  mage: 'tome',
  cleric: 'tome',
  archer: null,
  rogue: 'melee',
};

const MAIN_STAT: Record<CharClass, keyof ItemStats> = {
  warrior: 'strength',
  mage: 'intelligence',
  cleric: 'intelligence',
  archer: 'agility',
  rogue: 'agility',
};

// How much a bot values an item: its main stat counts double.
function score(cls: CharClass, item: Item): number {
  return (Object.keys(item.stats) as (keyof ItemStats)[]).reduce((sum, key) => {
    const value = item.stats[key] ?? 0;
    if (key === MAIN_STAT[cls]) return sum + 2 * value;
    if (key === 'vitality' || key === 'armor' || key.endsWith('Damage')) return sum + value;
    if (key === 'lifeSteal') return sum + 2 * value;
    return sum + 0.3 * value;
  }, 0);
}

function slotFor(cls: CharClass, item: Item, equipment: Partial<Record<EquipSlot, Item>>): EquipSlot | null {
  if (item.category === 'ring') {
    const a = equipment.ring1;
    const b = equipment.ring2;
    if (!a) return 'ring1';
    if (!b) return 'ring2';
    return score(cls, a) <= score(cls, b) ? 'ring1' : 'ring2';
  }
  if (handRule(item)) {
    if (item.weaponType && RIGHT_TYPES[cls].includes(item.weaponType) && handSlotAccepts('weapon', item)) return 'weapon';
    const left = LEFT_KIND[cls];
    if (!handSlotAccepts('shield', item)) return null;
    if (left === 'shield' && item.category === 'shield') return 'shield';
    if (left === 'tome' && item.weaponType === 'tome') return 'shield';
    if (left === 'melee' && (item.category === 'offhand' || item.weaponType === 'dagger')) return 'shield';
    return null;
  }
  return item.category as EquipSlot;
}

// Keeps the dropped item if it beats what the bot wears in that slot.
function considerLoot(cls: CharClass, equipment: Partial<Record<EquipSlot, Item>>, item: Item | null): void {
  if (!item) return;
  const slot = slotFor(cls, item, equipment);
  if (!slot) return;
  const current = equipment[slot];
  if (!current || score(cls, item) > score(cls, current)) equipment[slot] = item;
}

// One playthrough's gear: every fight rolls loot with the game's own odds
// (see CombatScene.victory); chests, the shop and crafting are left out, so
// this is a slightly under-geared player.
function gearProgression(cls: CharClass): Partial<Record<EquipSlot, Item>>[] {
  const equipment: Partial<Record<EquipSlot, Item>> = { ...createCharacter('human', cls).equipment };
  return ZONES.map((zone) => {
    const fights = zone.regulars.length + EXTRA_FIGHTS_PER_ZONE;
    for (let i = 0; i < fights; i++) considerLoot(cls, equipment, rollLootItem({ tier: zone.tier }));
    const beforeBoss = { ...equipment };
    if (zone.boss) {
      considerLoot(cls, equipment, rollLootItem({ guaranteed: true, rareChance: 0.5, epicChance: 0.15, tier: zone.tier }));
    }
    return beforeBoss;
  });
}

// Fire-resistant zones (demons) make the mage take Éclair de givre.
function equipPriority(charClass: CharClass, zone?: Zone): string[] {
  const list = EQUIP_PRIORITY[charClass];
  if (charClass === 'mage' && zone && resistsFire(zone)) return ['frost_bolt', 'ice_barrier', 'concentration', 'fireball'];
  return list;
}

function resistsFire(zone: Zone): boolean {
  return [...zone.regulars, ...(zone.boss ? [zone.boss] : [])].some((id) => monsterKit(id).type === 'demon');
}

function buildCharacter(
  charClass: CharClass,
  level: number,
  equipment: Partial<Record<EquipSlot, Item>>,
  zone?: Zone,
): Character {
  const c = createCharacter('human', charClass);
  let xp = 0;
  for (let l = 1; l < level; l++) xp += 100 * l;
  grantXp(c, xp);
  let i = 0;
  while (c.statPoints > 0) allocateStatPoint(c, STAT_SPLIT[charClass][i++ % 3]);
  // Learn in order; a talent still locked is retried on the next pass.
  for (let pass = 0; pass < 4 && talentPointsAvailable(c) > 0; pass++) {
    for (const id of TALENT_ORDER[charClass]) {
      if (talentPointsAvailable(c) <= 0) break;
      if (!learnBlocker(c, id)) learnTalent(c, id);
    }
  }
  c.equippedSkills = [];
  equipPriority(charClass, zone).forEach((id) => {
    if ((c.talents?.[id] ?? 0) > 0) toggleEquipSkill(c, id);
  });
  c.equipment = { ...equipment };
  c.hp = c.maxHp;
  c.mp = c.maxMp;
  return c;
}

// ------------------------------------------------------------ bot

const DEFENSIVE = ['shield_bash', 'defensive_stance', 'ice_barrier', 'faith_shield', 'fallback', 'feint', 'vanish'];

function can(e: CombatEngine, id: string): boolean {
  return (e.character.equippedSkills ?? []).includes(id) && e.skillAvailability(id).usable;
}

function chooseAndAct(e: CombatEngine, potions: { hp: number; mana: number; antidote: number }) {
  const c = e.character;
  const m = e.monster;
  const hpPct = c.hp / c.maxHp;
  const harmful = e.playerStatusLine();
  if (hpPct < 0.35 && potions.hp > 0 && (c.consumables.health_potion ?? 0) > 0) {
    potions.hp -= 1;
    return e.usePotion('health_potion');
  }
  if (potions.antidote > 0 && harmful.includes('Silence') && e.kind === 'mana' && (c.consumables.antidote ?? 0) > 0) {
    potions.antidote -= 1;
    return e.usePotion('antidote');
  }
  if (e.kind === 'mana' && c.mp < c.maxMp * 0.15 && potions.mana > 0 && (c.consumables.mana_potion ?? 0) > 0) {
    potions.mana -= 1;
    return e.usePotion('mana_potion');
  }
  if (e.monsterTelegraphing()) {
    const guard = DEFENSIVE.find((id) => can(e, id));
    if (guard) return e.useSkill(guard);
  }
  switch (c.class) {
    case 'warrior':
      if (m.hp < m.maxHp * 0.3 && can(e, 'execution')) return e.useSkill('execution');
      if (!e.statuses.vulnerable && m.hp > m.maxHp * 0.4 && can(e, 'armor_break')) return e.useSkill('armor_break');
      if (can(e, 'heavy_strike')) return e.useSkill('heavy_strike');
      break;
    case 'mage': {
      if (hpPct < 0.55 && e.fx.shield === 0 && can(e, 'ice_barrier')) return e.useSkill('ice_barrier');
      const fire = e.elementMultiplier('fire');
      const ice = e.elementMultiplier('ice');
      if (fire >= 1 && can(e, 'meteor')) return e.useSkill('meteor');
      if (ice > fire && can(e, 'frost_bolt')) return e.useSkill('frost_bolt');
      if (fire >= 1 && !e.statuses.burning && can(e, 'flame_wall')) return e.useSkill('flame_wall');
      if (fire >= 1 && can(e, 'fireball')) return e.useSkill('fireball');
      if (can(e, 'frost_bolt')) return e.useSkill('frost_bolt');
      break;
    }
    case 'cleric':
      if (hpPct < 0.45 && can(e, 'heal')) return e.useSkill('heal');
      if (can(e, 'divine_wrath')) return e.useSkill('divine_wrath');
      if (can(e, 'smite')) return e.useSkill('smite');
      break;
    case 'archer':
      if (can(e, 'deadly_shot')) return e.useSkill('deadly_shot');
      if (can(e, 'double_shot')) return e.useSkill('double_shot');
      if (!e.statuses.poisoned && can(e, 'poison_arrow')) return e.useSkill('poison_arrow');
      if (can(e, 'perfect_aim') && e.resource >= 30) e.useSkill('perfect_aim');
      break;
    case 'rogue':
      if (!e.fx.hasHit && can(e, 'sneak_attack')) return e.useSkill('sneak_attack');
      if (can(e, 'blade_dance')) return e.useSkill('blade_dance');
      if (!e.statuses.weakened && can(e, 'low_blow')) return e.useSkill('low_blow');
      if (can(e, 'sneak_attack')) return e.useSkill('sneak_attack');
      break;
  }
  return e.attack();
}

interface FightStats {
  wins: number;
  fights: number;
  turns: number;
  hpLost: number;
  potionsUsed: number;
}

function fight(
  c: Character,
  zone: Zone,
  monsterId: string,
  withPotions: boolean,
  stats: FightStats,
  scale = { hp: 1, attack: 1 },
): void {
  const monster = spawn(zone, monsterId);
  monster.maxHp = monster.hp = Math.max(1, Math.round(monster.maxHp * scale.hp));
  monster.attack = Math.max(1, Math.round(monster.attack * scale.attack));
  c.hp = c.maxHp;
  c.mp = c.maxMp;
  const potions = withPotions ? { hp: 3, mana: 2, antidote: 1 } : { hp: 0, mana: 0, antidote: 0 };
  c.consumables = { health_potion: potions.hp, mana_potion: potions.mana, antidote: potions.antidote };
  const e = new CombatEngine(c, monster);
  let turns = 0;
  let outcome: 'victory' | 'defeat' | 'timeout' = 'timeout';
  const monsterAct = () => {
    const r = e.monsterTurn();
    if (r.outcome !== 'ongoing') return r.outcome;
    while (e.consumePlayerStun()) {
      const again = e.monsterTurn();
      if (again.outcome !== 'ongoing') return again.outcome;
    }
    return 'ongoing';
  };
  if (e.monsterFirst) {
    const r = monsterAct();
    if (r !== 'ongoing') outcome = r;
  }
  while (outcome === 'timeout' && turns < 60) {
    turns += 1;
    let r = chooseAndAct(e, potions);
    while (!r.endsTurn && !r.victory) r = e.attack();
    if (r.victory) {
      outcome = 'victory';
      break;
    }
    const m = monsterAct();
    if (m !== 'ongoing') outcome = m;
  }
  stats.fights += 1;
  stats.turns += turns;
  stats.potionsUsed += (withPotions ? 3 : 0) - potions.hp;
  if (outcome === 'victory') {
    stats.wins += 1;
    stats.hpLost += 1 - Math.max(0, c.hp) / c.maxHp;
  }
}

function newStats(): FightStats {
  return { wins: 0, fights: 0, turns: 0, hpLost: 0, potionsUsed: 0 };
}

// ------------------------------------------------------------ report

const RUNS = Number(process.argv.find((a) => a.startsWith('--runs='))?.slice(7) ?? 150);
const DETAIL = process.argv.includes('--detail');
const DIFFICULTY = (process.argv.find((a) => a.startsWith('--difficulty='))?.slice(13) ?? 'normal') as Difficulty;
const BOSS_TURNS = Number(process.argv.find((a) => a.startsWith('--boss-turns='))?.slice(13) ?? 11);
const REGULAR_TURNS = Number(process.argv.find((a) => a.startsWith('--turns='))?.slice(8) ?? 5);

const pct = (n: number) => `${Math.round(n * 100)}%`.padStart(4);

// --measure: the player's side alone — damage per turn against a passive
// target, max HP and armor — per zone and class, to fit monster curves.
function measure(): void {
  const levels = levelAt();
  console.log('Zone (niveau) : dégâts/tour · PV max · armure, par classe');
  const sums = ZONES.map(() => CLASSES.map(() => ({ dpt: 0, hp: 0, armor: 0 })));
  CLASSES.forEach((cls, ci) => {
    for (let r = 0; r < RUNS; r++) {
      const gear = gearProgression(cls);
      ZONES.forEach((zone, zi) => {
        const c = buildCharacter(cls, levels[zi].enter, gear[zi]);
        const dummy = createMonster('well_guardian', 'normal');
        dummy.hp = dummy.maxHp = 1e9;
        dummy.attack = 0;
        const e = new CombatEngine(c, dummy);
        const potions = { hp: 0, mana: 0, antidote: 0 };
        for (let t = 0; t < 10; t++) {
          let res = chooseAndAct(e, potions);
          while (!res.endsTurn) res = e.attack();
          e.monsterTurn();
        }
        sums[zi][ci].dpt += (1e9 - dummy.hp) / 10;
        sums[zi][ci].hp += c.maxHp;
        sums[zi][ci].armor += e.armor();
      });
    }
  });
  ZONES.forEach((zone, zi) => {
    const cols = sums[zi].map((v) => `${Math.round(v.dpt / RUNS)}·${Math.round(v.hp / RUNS)}·${Math.round(v.armor / RUNS)}`.padEnd(13));
    console.log(`${zone.name.slice(0, 22).padEnd(22)} ${String(levels[zi].enter).padStart(2)} ${cols.join(' ')}`);
  });
}

function main(): void {
  const levels = levelAt();
  console.log(`Niveau en fin d'histoire : ${levels[levels.length - 1].boss} (${RUNS} parties simulées par classe)\n`);
  const results = ZONES.map(() => CLASSES.map(() => ({ reg: newStats(), boss: newStats() })));
  const detail = new Map<string, FightStats>();
  CLASSES.forEach((cls, ci) => {
    for (let r = 0; r < RUNS; r++) {
      const gear = gearProgression(cls);
      ZONES.forEach((zone, zi) => {
        const c = buildCharacter(cls, levels[zi].enter, gear[zi], zone);
        zone.regulars.forEach((id) => {
          fight(c, zone, id, false, results[zi][ci].reg);
          if (DETAIL) {
            const key = `${zone.name}|${CLASS_LABELS[cls]}|${id}`;
            if (!detail.has(key)) detail.set(key, newStats());
            fight(c, zone, id, false, detail.get(key)!);
          }
        });
        if (zone.boss) fight(buildCharacter(cls, levels[zi].boss, gear[zi], zone), zone, zone.boss, true, results[zi][ci].boss);
      });
    }
  });

  const colW = 9;
  console.log('MONSTRES NORMAUX — % victoires / % PV perdus (sans potion)      |  BOSS — % victoires (3 potions), tours moyens');
  console.log(
    `${'Zone'.padEnd(24)} Nv ${CLASSES.map((c) => CLASS_LABELS[c].padEnd(colW)).join(' ')} | ${'Boss'.padEnd(20)} Nv ${CLASSES.map((c) => CLASS_LABELS[c].slice(0, 6).padEnd(6)).join(' ')} tours`,
  );
  ZONES.forEach((zone, zi) => {
    const reg = results[zi].map(({ reg }) => `${pct(reg.wins / reg.fights)}/${pct(reg.hpLost / Math.max(1, reg.wins))}`.padEnd(colW));
    let right = '';
    if (zone.boss) {
      const boss = results[zi].map(({ boss }) => pct(boss.wins / boss.fights).padEnd(6));
      const turns = results[zi].reduce((sum, { boss }) => sum + boss.turns / boss.fights, 0) / CLASSES.length;
      right = `${zone.boss.slice(0, 20).padEnd(20)} ${String(levels[zi].boss).padStart(2)} ${boss.join(' ')} ${turns.toFixed(1)}`;
    }
    console.log(`${zone.name.slice(0, 24).padEnd(24)} ${String(levels[zi].enter).padStart(2)} ${reg.join(' ')} | ${right}`);
  });
  console.log('\nSYNTHÈSE — moyenne des zones, par palier : victoires contre les monstres normaux | contre les boss');
  CLASSES.forEach((cls, ci) => {
    const cols = ([1, 2, 3] as const).map((tier) => {
      const zs = ZONES.map((z, zi) => ({ z, zi })).filter(({ z }) => z.tier === tier);
      const reg = zs.reduce((sum, { zi }) => sum + results[zi][ci].reg.wins / results[zi][ci].reg.fights, 0) / zs.length;
      const bz = zs.filter(({ z }) => z.boss);
      const boss = bz.reduce((sum, { zi }) => sum + results[zi][ci].boss.wins / results[zi][ci].boss.fights, 0) / bz.length;
      return `palier ${tier} ${pct(reg)} | ${pct(boss)}`;
    });
    console.log(`  ${CLASS_LABELS[cls].padEnd(9)} ${cols.join('    ')}`);
  });
  if (DETAIL) {
    console.log('\nDétail par monstre normal :');
    detail.forEach((st, key) => {
      console.log(`  ${key.replace(/\|/g, ' · ')} : ${pct(st.wins / st.fights)} victoires, ${(st.turns / st.fights).toFixed(1)} tours, ${pct(st.hpLost / Math.max(1, st.wins))} PV perdus`);
    });
  }
}

// --tune: per zone, the HP scale giving ~4-turn regular fights and the
// attack scale giving ~85% wins (all classes together), then the boss scales
// giving ~9 turns and ~60% wins; prints the fitted curves.
function tune(): void {
  const levels = levelAt();
  const samples: { cls: CharClass; gear: Partial<Record<EquipSlot, Item>>[] }[] = [];
  CLASSES.forEach((cls) => {
    for (let r = 0; r < RUNS; r++) samples.push({ cls, gear: gearProgression(cls) });
  });
  const run = (zi: number, ids: string[], boss: boolean, scale: { hp: number; attack: number }) => {
    const st = newStats();
    samples.forEach(({ cls, gear }, i) => {
      const c = buildCharacter(cls, boss ? levels[zi].boss : levels[zi].enter, gear[zi], ZONES[zi]);
      fight(c, ZONES[zi], ids[i % ids.length], boss, st, scale);
    });
    return { win: st.wins / st.fights, turns: st.turns / st.fights };
  };
  const search = (lo: number, hi: number, f: (x: number) => number, target: number, increasing: boolean) => {
    for (let i = 0; i < 9; i++) {
      const mid = (lo + hi) / 2;
      const v = f(mid);
      if ((v < target) === increasing) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const points: { level: number; hp: number; attack: number }[] = [];
  const bossPoints: { level: number; hp: number; attack: number; name: string }[] = [];
  ZONES.forEach((zone, zi) => {
    const L = zoneLevel(zone);
    const ids = [...new Set(zone.regulars)];
    const hpScale = search(0.2, 8, (x) => run(zi, ids, false, { hp: x, attack: 0.01 }).turns, REGULAR_TURNS, true);
    const atkScale = search(0.2, 8, (x) => run(zi, ids, false, { hp: hpScale, attack: x }).win, 0.85, false);
    const avgShareHp = ids.reduce((sum, id) => sum + spawn(zone, id).maxHp, 0) / ids.length / standardMonsterHp(L);
    const avgShareAtk = ids.reduce((sum, id) => sum + spawn(zone, id).attack, 0) / ids.length / standardMonsterAttack(L);
    points.push({ level: L, hp: hpScale * avgShareHp * standardMonsterHp(L), attack: atkScale * avgShareAtk * standardMonsterAttack(L) });
    let line = `${zone.name.padEnd(24)} Nv ${String(L).padStart(2)}  normal: PV ×${hpScale.toFixed(2)} att ×${atkScale.toFixed(2)}`;
    if (zone.boss) {
      const b = [zone.boss];
      const bh = search(0.2, 12, (x) => run(zi, b, true, { hp: x, attack: 0.01 }).turns, 9, true);
      const ba = search(0.2, 8, (x) => run(zi, b, true, { hp: bh, attack: x }).win, 0.6, false);
      bossPoints.push({ level: L, hp: bh, attack: ba, name: zone.boss });
      line += `   boss ${zone.boss}: PV ×${bh.toFixed(2)} att ×${ba.toFixed(2)}`;
    }
    console.log(line);
  });
  // Least squares: hp = a + b·L + c·L², attack = d + e·L.
  const fit = (xs: number[][], ys: number[]) => {
    const n = xs[0].length;
    const A = Array.from({ length: n }, () => new Array(n + 1).fill(0));
    xs.forEach((row, k) => {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) A[i][j] += row[i] * row[j];
        A[i][n] += row[i] * ys[k];
      }
    });
    for (let i = 0; i < n; i++) {
      for (let k = i + 1; k < n; k++) {
        const f = A[k][i] / A[i][i];
        for (let j = i; j <= n; j++) A[k][j] -= f * A[i][j];
      }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = (A[i][n] - A[i].slice(i + 1, n).reduce((sum, v, j) => sum + v * x[i + 1 + j], 0)) / A[i][i];
    }
    return x;
  };
  const hpFit = fit(points.map((p) => [1, p.level, p.level * p.level]), points.map((p) => p.hp));
  const atkFit = fit(points.map((p) => [1, p.level]), points.map((p) => p.attack));
  console.log(`\nCourbe PV standard : ${hpFit.map((v) => v.toFixed(3)).join(', ')}`);
  console.log(`Courbe attaque standard : ${atkFit.map((v) => v.toFixed(3)).join(', ')}`);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  console.log(`Boss : PV ×${mean(bossPoints.map((p) => p.hp)).toFixed(2)} (moyenne), attaque ×${mean(bossPoints.map((p) => p.attack)).toFixed(2)}`);
  void MONSTER_TUNING;
}

// --tune-bosses: per boss, HP and attack searched together on real fights
// (attack for ~60% wins, HP for ~11 turns, two rounds), printed as the new
// BOSS_WEIGHT block for monster.ts.
function tuneBosses(): void {
  const levels = levelAt();
  const samples: { cls: CharClass; gear: Partial<Record<EquipSlot, Item>>[] }[] = [];
  CLASSES.forEach((cls) => {
    for (let r = 0; r < RUNS; r++) samples.push({ cls, gear: gearProgression(cls) });
  });
  const run = (zi: number, scale: { hp: number; attack: number }) => {
    const st = newStats();
    samples.forEach(({ cls, gear }) => {
      fight(buildCharacter(cls, levels[zi].boss, gear[zi], ZONES[zi]), ZONES[zi], ZONES[zi].boss!, true, st, scale);
    });
    return { win: st.wins / st.fights, turns: st.turns / st.fights };
  };
  const search = (lo: number, hi: number, f: (x: number) => number, target: number, increasing: boolean) => {
    for (let i = 0; i < 8; i++) {
      const mid = (lo + hi) / 2;
      if ((f(mid) < target) === increasing) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const lines: string[] = [];
  ZONES.forEach((zone, zi) => {
    if (!zone.boss || zone.boss === 'well_guardian') return;
    let h = 1;
    let a = 1;
    for (let round = 0; round < 2; round++) {
      a = search(0.3, 3, (x) => run(zi, { hp: h, attack: x }).win, 0.6, false);
      h = search(0.3, 4, (x) => run(zi, { hp: x, attack: a }).turns, BOSS_TURNS, true);
    }
    const check = run(zi, { hp: h, attack: a });
    const current = BOSS_WEIGHTS[zone.boss] ?? { hp: 1, attack: 1 };
    const clamp = (x: number) => Math.max(0.3, Math.min(4, Math.round(x * 10) / 10));
    lines.push(`  ${zone.boss}: { hp: ${clamp(current.hp * h)}, attack: ${clamp(current.attack * a)} },`);
    console.log(`${zone.boss.padEnd(22)} PV ×${h.toFixed(2)} att ×${a.toFixed(2)} -> ${pct(check.win)} en ${check.turns.toFixed(1)} tours`);
  });
  console.log('\nconst BOSS_WEIGHT = {\n' + lines.join('\n') + '\n};');
}

if (process.argv.includes('--measure')) measure();
else if (process.argv.includes('--tune-bosses')) tuneBosses();
else if (process.argv.includes('--tune')) tune();
else main();
