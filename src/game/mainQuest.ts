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
  | 'river_lead';

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
};

export function advanceMainQuestOnBossDefeat(character: Character, monsterId: string): boolean {
  const transition = BOSS_TRANSITIONS[monsterId];
  if (!transition) return false;
  if (getMainQuestStage(character) !== transition.fromStage) return false;
  character.mainQuestStage = transition.toStage;
  return true;
}
