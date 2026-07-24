import { Character, grantXp } from './character';
import { Rarity, createItem } from './item';

export type QuestState = 'active' | 'completed' | 'turned_in';

export interface QuestProgress {
  state: QuestState;
  progress: number;
}

interface QuestObjective {
  type: 'defeat';
  monsterId: string;
  count: number;
}

interface QuestReward {
  xp: number;
  itemBaseId?: string;
  itemRarity?: Rarity;
}

export interface QuestDefinition {
  id: string;
  title: string;
  description: string;
  objective: QuestObjective;
  reward: QuestReward;
}

// Just enough of a quest engine to prove the mechanism end-to-end (accept,
// track progress, turn in for a reward) — real quest content and the story
// that motivates it come later (see DESIGN.md's roadmap). This one quest
// deliberately reuses the corrupted wolf, so it can be advanced either by
// Field's random encounters or the dungeon's wolf fight.
export const QUESTS: Record<string, QuestDefinition> = {
  wolves_threat: {
    id: 'wolves_threat',
    title: 'Menace dans les bois',
    description:
      "Des loups corrompus rôdent près du village et menacent les fermes. Éliminez-en 3, au Champ ou dans le Repaire du Loup.",
    objective: { type: 'defeat', monsterId: 'corrupted_wolf', count: 3 },
    reward: { xp: 60, itemBaseId: 'leather_gloves', itemRarity: 'common' },
  },
  crop_pests: {
    id: 'crop_pests',
    title: 'Rongeurs dans les récoltes',
    description:
      "Des rats des champs saccagent les récoltes depuis quelques nuits. Éliminez-en 3 pour protéger la ferme.",
    objective: { type: 'defeat', monsterId: 'field_rat', count: 3 },
    reward: { xp: 50, itemBaseId: 'leather_boots', itemRarity: 'common' },
  },
  bandit_camp_threat: {
    id: 'bandit_camp_threat',
    title: 'Bandits sur la route',
    description:
      "Une bande de bandits s'en prend aux voyageurs depuis leur camp à l'ouest du Champ. Éliminez-en 3 pour sécuriser la route.",
    objective: { type: 'defeat', monsterId: 'bandit_thug', count: 3 },
    reward: { xp: 70, itemBaseId: 'wooden_shield', itemRarity: 'common' },
  },
  goblin_camp_threat: {
    id: 'goblin_camp_threat',
    title: 'Repaire de gobelins',
    description:
      "Des gobelins ont établi un camp au nord de la Forêt et s'en prennent aux voyageurs. Éliminez-en 3 pour y mettre fin.",
    objective: { type: 'defeat', monsterId: 'goblin_brute', count: 3 },
    reward: { xp: 80, itemBaseId: 'simple_amulet', itemRarity: 'common' },
  },
  city_road_patrol: {
    id: 'city_road_patrol',
    title: 'Patrouille de la route commerciale',
    description:
      "Des sangliers corrompus attaquent les caravanes sur la route commerciale entre Valombre et Aiglemont. Éliminez-en 3 pour sécuriser le passage.",
    objective: { type: 'defeat', monsterId: 'corrupted_boar', count: 3 },
    reward: { xp: 100, itemBaseId: 'leather_chest', itemRarity: 'common' },
  },
};

export function getQuestProgress(character: Character, questId: string): QuestProgress | undefined {
  return character.quests[questId];
}

export function startQuest(character: Character, questId: string): void {
  if (character.quests[questId]) return;
  character.quests[questId] = { state: 'active', progress: 0 };
}

// Called after any monster kill; advances every active quest targeting that
// monster and flips it to 'completed' once its count is reached. Returns the
// quests that just completed, in case a caller wants to react to that.
export function advanceQuestsOnDefeat(character: Character, monsterId: string): QuestDefinition[] {
  const justCompleted: QuestDefinition[] = [];

  Object.values(QUESTS).forEach((quest) => {
    if (quest.objective.type !== 'defeat' || quest.objective.monsterId !== monsterId) return;
    const current = character.quests[quest.id];
    if (!current || current.state !== 'active') return;

    current.progress += 1;
    if (current.progress >= quest.objective.count) {
      current.state = 'completed';
      justCompleted.push(quest);
    }
  });

  return justCompleted;
}

// Grants the reward and marks the quest turned in; no-op (returns false) if
// the quest isn't actually completed yet.
export function turnInQuest(character: Character, questId: string): boolean {
  const current = character.quests[questId];
  const quest = QUESTS[questId];
  if (!current || !quest || current.state !== 'completed') return false;

  grantXp(character, quest.reward.xp);
  if (quest.reward.itemBaseId && quest.reward.itemRarity) {
    character.inventory.push(createItem(quest.reward.itemBaseId, quest.reward.itemRarity));
  }
  current.state = 'turned_in';
  return true;
}
