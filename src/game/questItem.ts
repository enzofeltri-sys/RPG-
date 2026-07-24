// Quest items: non-equippable, non-discardable objects tied to a quest's
// story (a key, a letter, a token to hand back to an NPC). No quest grants
// one yet (increment 7's quest only tracks kill counts) — this exists so the
// Sac's "Quête" filter has somewhere to read from once increment 9's quest
// content starts handing them out.
export interface QuestItem {
  id: string;
  name: string;
  description: string;
}
