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
  | 'complete';

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
// dialogue that advances it) — 'dungeon' and 'complete' below intentionally
// have none: 'dungeon' is just accepting the quest, and 'complete' is the
// story beat itself, not a fetch-quest payout.
const STAGE_REWARDS: Partial<Record<MainQuestStage, StageReward>> = {
  aiglemont: { xp: 60, itemBaseId: 'simple_ring', itemRarity: 'rare' },
  complete: { xp: 120, itemBaseId: 'simple_amulet', itemRarity: 'rare' },
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

// Called from CombatScene.victory() on every kill — advances 'dungeon' ->
// 'revelation' the moment the Repaire du Loup's boss falls, regardless of
// which scene the fight happened in. No-op (and no reward — the payoff comes
// from the following dialogue) if the stage doesn't match.
export function advanceMainQuestOnBossDefeat(character: Character, monsterId: string): boolean {
  if (monsterId !== 'alpha_wolf') return false;
  if (getMainQuestStage(character) !== 'dungeon') return false;
  character.mainQuestStage = 'revelation';
  return true;
}
