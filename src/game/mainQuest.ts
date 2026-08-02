import { Character, grantXp } from './character';
import { Rarity, createItem } from './item';

// The single, story-critical quest thread (Acte 1 of DESIGN.md's trame
// principale) — deliberately not built on the generic QUESTS engine in
// quest.ts, which only models "defeat N monsters" side quests. There is only
// ever one of these, so a small explicit stage machine is simpler than
// generalizing that engine to cover talk/reach objectives it doesn't need
// anywhere else yet.
export type MainQuestStage =
  | 'not_started'
  | 'dungeon'
  | 'revelation'
  | 'aiglemont'
  | 'complete'
  | 'catacombs'
  | 'trail_found'
  | 'debriefed'
  | 'faubourg_lead'
  | 'shard_confirmed'
  | 'shards_beyond'
  | 'trail_west'
  | 'river_lead'
  // Was v1's terminal stage (a deliberate close to Acte 1) — now the launch
  // point into Acte 2 below instead of a dead end.
  | 'act1_complete'
  | 'crossing_marshes'
  | 'vasenoire_arrival'
  | 'delta_conspiracy'
  | 'limaneux_lead'
  | 'network_exposed'
  | 'smugglers_unmasked'
  | 'network_reported'
  | 'sealed_vault_lead'
  | 'vault_uncovered'
  | 'shard_cache_found'
  | 'rival_hunters_lead'
  | 'rival_hunters_confirmed'
  | 'threat_acknowledged'
  | 'chercheurs_lead'
  | 'seekers_confronted'
  | 'seekers_defeated'
  | 'brotherhood_tomb_hinted'
  | 'tomb_location_found'
  | 'tomb_raided'
  | 'act2_complete'
  | 'outpost_corruption_lead'
  | 'corruption_confirmed'
  | 'blighted_grove_lead'
  | 'grove_purified'
  | 'corruption_contained'
  | 'original_site_revealed'
  | 'shrine_lead'
  | 'seal_failing'
  | 'antagonist_glimpsed'
  | 'identity_search_started'
  | 'identity_hint_gathered'
  | 'upstream_lead'
  | 'watchtower_reached'
  | 'watchtower_cleared'
  | 'helm_inscription_studied'
  | 'ward_core_lead'
  | 'ward_core_reached'
  | 'ward_core_cleared'
  | 'hermit_lead'
  | 'hermit_confided'
  | 'watchers_vault_lead'
  | 'watchers_vault_reached'
  | 'watchers_vault_cleared'
  | 'silhouette_message_found'
  | 'tomb_depths_lead'
  | 'tomb_depths_reached'
  | 'tomb_depths_cleared'
  | 'grand_theory_formed'
  | 'grove_depths_lead'
  | 'grove_depths_reached'
  | 'grove_depths_cleared'
  | 'watcher_hypothesis_formed'
  | 'seal_depths_lead'
  | 'seal_depths_reached'
  | 'seal_depths_cleared'
  | 'second_token_found'
  | 'lodge_lead'
  | 'lodge_reached'
  | 'lodge_cleared'
  | 'reinforcement_plan_started';

export const MAIN_QUEST_TITLE = "L'Éveil de la Marque";

export function getMainQuestStage(character: Character): MainQuestStage {
  return character.mainQuestStage ?? 'not_started';
}

interface StageReward {
  xp: number;
  itemBaseId?: string;
  itemRarity?: Rarity;
}

// Reward granted the moment the character *enters* this stage (i.e. at the
// dialogue that advances it) — stages reached by accepting a dialogue offer
// or by a combat trigger intentionally have none; only a dialogue that
// *concludes* a beat pays out (mirrors 'aiglemont'/'complete' below).
const STAGE_REWARDS: Partial<Record<MainQuestStage, StageReward>> = {
  aiglemont: { xp: 60, itemBaseId: 'simple_ring', itemRarity: 'rare' },
  complete: { xp: 120, itemBaseId: 'simple_amulet', itemRarity: 'rare' },
  debriefed: { xp: 150, itemBaseId: 'simple_ring', itemRarity: 'epic' },
  shards_beyond: { xp: 180, itemBaseId: 'simple_amulet', itemRarity: 'epic' },
  river_lead: { xp: 220, itemBaseId: 'leather_chest', itemRarity: 'epic' },
  act1_complete: { xp: 260, itemBaseId: 'wooden_shield', itemRarity: 'epic' },
  vasenoire_arrival: { xp: 300, itemBaseId: 'leather_helmet', itemRarity: 'epic' },
  delta_conspiracy: { xp: 130, itemBaseId: 'short_sword', itemRarity: 'rare' },
  smugglers_unmasked: { xp: 220, itemBaseId: 'leather_chest', itemRarity: 'epic' },
  network_reported: { xp: 200, itemBaseId: 'simple_ring', itemRarity: 'epic' },
  shard_cache_found: { xp: 240, itemBaseId: 'leather_gloves', itemRarity: 'epic' },
  threat_acknowledged: { xp: 200, itemBaseId: 'leather_helmet', itemRarity: 'epic' },
  seekers_defeated: { xp: 260, itemBaseId: 'leather_legs', itemRarity: 'epic' },
  brotherhood_tomb_hinted: { xp: 280, itemBaseId: 'short_sword', itemRarity: 'epic' },
  act2_complete: { xp: 300, itemBaseId: 'leather_boots', itemRarity: 'epic' },
  corruption_confirmed: { xp: 150, itemBaseId: 'simple_ring', itemRarity: 'rare' },
  corruption_contained: { xp: 260, itemBaseId: 'simple_ring', itemRarity: 'epic' },
  original_site_revealed: { xp: 280, itemBaseId: 'leather_helmet', itemRarity: 'epic' },
  antagonist_glimpsed: { xp: 350, itemBaseId: 'wooden_shield', itemRarity: 'epic' },
  identity_hint_gathered: { xp: 240, itemBaseId: 'leather_gloves', itemRarity: 'rare' },
  watchtower_cleared: { xp: 380, itemBaseId: 'leather_boots', itemRarity: 'epic' },
  helm_inscription_studied: { xp: 260, itemBaseId: 'leather_gloves', itemRarity: 'epic' },
  ward_core_cleared: { xp: 410, itemBaseId: 'wooden_shield', itemRarity: 'epic' },
  hermit_confided: { xp: 280, itemBaseId: 'simple_amulet', itemRarity: 'epic' },
  watchers_vault_cleared: { xp: 440, itemBaseId: 'leather_helmet', itemRarity: 'epic' },
  silhouette_message_found: { xp: 300, itemBaseId: 'simple_ring', itemRarity: 'epic' },
  tomb_depths_cleared: { xp: 470, itemBaseId: 'leather_chest', itemRarity: 'epic' },
  grand_theory_formed: { xp: 320, itemBaseId: 'simple_amulet', itemRarity: 'rare' },
  grove_depths_cleared: { xp: 500, itemBaseId: 'leather_legs', itemRarity: 'epic' },
  watcher_hypothesis_formed: { xp: 350, itemBaseId: 'leather_gloves', itemRarity: 'epic' },
  seal_depths_cleared: { xp: 530, itemBaseId: 'simple_amulet', itemRarity: 'epic' },
  second_token_found: { xp: 380, itemBaseId: 'leather_boots', itemRarity: 'rare' },
  lodge_cleared: { xp: 560, itemBaseId: 'simple_ring', itemRarity: 'epic' },
  reinforcement_plan_started: { xp: 400, itemBaseId: 'simple_amulet', itemRarity: 'rare' },
};

export function advanceMainQuestStage(character: Character, next: MainQuestStage): void {
  character.mainQuestStage = next;
  const reward = STAGE_REWARDS[next];
  if (reward) {
    grantXp(character, reward.xp);
    if (reward.itemBaseId && reward.itemRarity) {
      character.inventory.push(createItem(reward.itemBaseId, reward.itemRarity));
    }
  }
}

// Called from CombatScene.victory() on every kill — advances the stage the
// moment the matching dungeon boss falls, regardless of which scene the
// fight happened in. No-op (and no reward — the payoff comes from the
// following dialogue) if the stage/monster don't match.
const BOSS_TRANSITIONS: Record<string, { fromStage: MainQuestStage; toStage: MainQuestStage }> = {
  alpha_wolf: { fromStage: 'dungeon', toStage: 'revelation' },
  fallen_guardian: { fromStage: 'catacombs', toStage: 'trail_found' },
  smuggler_captain: { fromStage: 'faubourg_lead', toStage: 'shard_confirmed' },
  smuggler_lieutenant: { fromStage: 'limaneux_lead', toStage: 'network_exposed' },
  shard_warden: { fromStage: 'sealed_vault_lead', toStage: 'vault_uncovered' },
  seeker_archivist: { fromStage: 'chercheurs_lead', toStage: 'seekers_confronted' },
  demon_envoy: { fromStage: 'tomb_location_found', toStage: 'tomb_raided' },
  corruption_heart: { fromStage: 'blighted_grove_lead', toStage: 'grove_purified' },
  primordial_guardian: { fromStage: 'shrine_lead', toStage: 'seal_failing' },
  watchtower_guardian: { fromStage: 'upstream_lead', toStage: 'watchtower_reached' },
  unnamed_vestige: { fromStage: 'ward_core_lead', toStage: 'ward_core_reached' },
  last_watcher: { fromStage: 'watchers_vault_lead', toStage: 'watchers_vault_reached' },
  broken_sleeper: { fromStage: 'tomb_depths_lead', toStage: 'tomb_depths_reached' },
  blight_root: { fromStage: 'grove_depths_lead', toStage: 'grove_depths_reached' },
  seal_echo: { fromStage: 'seal_depths_lead', toStage: 'seal_depths_reached' },
  oath_guardian: { fromStage: 'lodge_lead', toStage: 'lodge_reached' },
};

export function advanceMainQuestOnBossDefeat(character: Character, monsterId: string): boolean {
  const transition = BOSS_TRANSITIONS[monsterId];
  if (!transition) return false;
  if (getMainQuestStage(character) !== transition.fromStage) return false;
  character.mainQuestStage = transition.toStage;
  return true;
}
