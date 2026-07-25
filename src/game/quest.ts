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
  crop_pests_king: {
    id: 'crop_pests_king',
    title: 'Le roi des rats',
    description:
      "La fermière a repéré un nid bien plus important dans la remise du fond — un rat monstrueux y règne sur les autres. Éliminez-le pour en finir vraiment avec l'infestation.",
    objective: { type: 'defeat', monsterId: 'rat_king', count: 1 },
    reward: { xp: 60, itemBaseId: 'short_sword', itemRarity: 'rare' },
  },
  bandit_camp_threat: {
    id: 'bandit_camp_threat',
    title: 'Bandits sur la route',
    description:
      "Une bande de bandits s'en prend aux voyageurs depuis leur camp à l'ouest du Champ. Éliminez-en 3 pour sécuriser la route.",
    objective: { type: 'defeat', monsterId: 'bandit_thug', count: 3 },
    reward: { xp: 70, itemBaseId: 'wooden_shield', itemRarity: 'common' },
  },
  bandit_camp_threat_leader: {
    id: 'bandit_camp_threat_leader',
    title: 'Le chef des bandits',
    description:
      "Le garde vous confie que le chef des bandits se terre encore plus profondément dans le camp. Affrontez-le pour mettre fin à la menace pour de bon.",
    objective: { type: 'defeat', monsterId: 'bandit_leader', count: 1 },
    reward: { xp: 100, itemBaseId: 'leather_helmet', itemRarity: 'rare' },
  },
  goblin_camp_threat: {
    id: 'goblin_camp_threat',
    title: 'Repaire de gobelins',
    description:
      "Des gobelins ont établi un camp au nord de la Forêt et s'en prennent aux voyageurs. Éliminez-en 3 pour y mettre fin.",
    objective: { type: 'defeat', monsterId: 'goblin_brute', count: 3 },
    reward: { xp: 80, itemBaseId: 'simple_amulet', itemRarity: 'common' },
  },
  goblin_camp_threat_leader: {
    id: 'goblin_camp_threat_leader',
    title: 'Le chef des gobelins',
    description:
      "L'éclaireuse vous confie que les gobelins obéissent à un chef retranché plus profondément dans le camp. Affrontez-le pour disperser la bande pour de bon.",
    objective: { type: 'defeat', monsterId: 'goblin_chief', count: 1 },
    reward: { xp: 105, itemBaseId: 'leather_gloves', itemRarity: 'rare' },
  },
  faubourg_smugglers: {
    id: 'faubourg_smugglers',
    title: 'Contrebande au Faubourg',
    description:
      "Des contrebandiers déchargent des caisses suspectes au Faubourg des quais, à l'est d'Aiglemont. Éliminez-en 3 pour y mettre fin.",
    objective: { type: 'defeat', monsterId: 'smuggler_thug', count: 3 },
    reward: { xp: 85, itemBaseId: 'leather_legs', itemRarity: 'common' },
  },
  faubourg_smugglers_leader: {
    id: 'faubourg_smugglers_leader',
    title: 'Le capitaine des quais',
    description:
      "Les contrebandiers obéissaient à un supérieur, retranché dans un entrepôt au nord des quais. Affrontez-le pour couper court à ce trafic.",
    objective: { type: 'defeat', monsterId: 'smuggler_captain', count: 1 },
    reward: { xp: 130, itemBaseId: 'leather_chest', itemRarity: 'rare' },
  },
  marsh_patrol: {
    id: 'marsh_patrol',
    title: 'Patrouille des marais',
    description:
      "Des serpents des marais s'en prennent aux pièges et aux chasseurs le long de la route fluviale. Éliminez-en 3 pour sécuriser le relais.",
    objective: { type: 'defeat', monsterId: 'marsh_serpent', count: 3 },
    reward: { xp: 95, itemBaseId: 'wooden_shield', itemRarity: 'common' },
  },
  marsh_patrol_matriarch: {
    id: 'marsh_patrol_matriarch',
    title: 'La mère des marais',
    description:
      "Les serpents ne faisaient qu'obéir à leur instinct — quelque chose de bien plus gros les rassemble, tapi au fond des marais. Traquez-la.",
    objective: { type: 'defeat', monsterId: 'marsh_matriarch', count: 1 },
    reward: { xp: 140, itemBaseId: 'wooden_shield', itemRarity: 'rare' },
  },
  city_road_patrol: {
    id: 'city_road_patrol',
    title: 'Patrouille de la route commerciale',
    description:
      "Des sangliers corrompus attaquent les caravanes sur la route commerciale entre Valombre et Aiglemont. Éliminez-en 3 pour sécuriser le passage.",
    objective: { type: 'defeat', monsterId: 'corrupted_boar', count: 3 },
    reward: { xp: 100, itemBaseId: 'leather_chest', itemRarity: 'common' },
  },
  city_road_patrol_alpha: {
    id: 'city_road_patrol_alpha',
    title: 'Le sanglier alpha',
    description:
      "Le capitaine soupçonne qu'un sanglier bien plus imposant mène les autres depuis un fourré près de la route. Traquez-le pour mettre fin aux attaques pour de bon.",
    objective: { type: 'defeat', monsterId: 'corrupted_boar_alpha', count: 1 },
    reward: { xp: 110, itemBaseId: 'simple_ring', itemRarity: 'rare' },
  },
  shrine_pilgrims: {
    id: 'shrine_pilgrims',
    title: 'La route du sanctuaire',
    description:
      "Des gobelins éclaireurs harcèlent les pèlerins qui traversent la Forêt pour rejoindre le sanctuaire. Éliminez-en 3 pour sécuriser leur chemin.",
    objective: { type: 'defeat', monsterId: 'goblin_scout', count: 3 },
    reward: { xp: 65, itemBaseId: 'leather_boots', itemRarity: 'rare' },
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
