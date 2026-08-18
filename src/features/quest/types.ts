// Types for the quest module and its sub-tables.

// The selector-modal state is shared by every schema-driven editor.
export type { SelectorModalState } from '../../components/fields/types';

export interface QuestSearchRow {
  ID: number;
  LogTitle: string;
  QuestType: number;
  QuestLevel: number;
  MinLevel: number;
  Description: string;
}

export type QuestSortKey = keyof QuestSearchRow;

export interface QuestTemplateAddon {
  ID: number;
  MaxLevel: number;
  AllowableClasses: number;
  SourceSpellID: number;
  PrevQuestID: number;
  NextQuestID: number;
  ExclusiveGroup: number;
  RewardMailTemplateID: number;
  RewardMailDelay: number;
  RequiredSkillID: number;
  RequiredSkillPoints: number;
  RequiredMinRepFaction: number;
  RequiredMinRepValue: number;
  RequiredMaxRepFaction: number;
  RequiredMaxRepValue: number;
  ProvidedItemCount: number;
  SpecialFlags: number;
  ScriptName?: string;
  // Stored in quest_mail_sender, which the core reads via a LEFT JOIN on the
  // addon. Surfaced here so the mail sender is editable alongside the template.
  RewardMailSenderEntry?: number;
}

// Keyed by the real quest_objectives column names, so the whole row round-trips
// through the shared collection generator without a name-mapping step. Flags2
// and ProgressBarWeight are carried even though the UI does not always surface
// them, because the previous editor wrote them as a hardcoded 0 and destroyed
// them on every save.
export interface QuestObjectiveRow {
  ID: number;
  QuestID: number;
  Type: number;
  Order: number;
  StorageIndex: number;
  ObjectID: number;
  Amount: number;
  Flags: number;
  Flags2: number;
  ProgressBarWeight: number;
  Description: string | null;
  VerifiedBuild: number;
}

export interface QuestOfferRewardRow {
  ID: number;
  Emote1: number;
  Emote2: number;
  Emote3: number;
  Emote4: number;
  EmoteDelay1: number;
  EmoteDelay2: number;
  EmoteDelay3: number;
  EmoteDelay4: number;
  RewardText: string;
  VerifiedBuild?: number;
}

export interface QuestRequestItemsRow {
  ID: number;
  EmoteOnComplete: number;
  EmoteOnIncomplete: number;
  EmoteOnCompleteDelay: number;
  EmoteOnIncompleteDelay: number;
  CompletionText: string;
  VerifiedBuild?: number;
}

export interface QuestGreetingRow {
  ID: number;
  Type: number;
  GreetEmoteType: number;
  GreetEmoteDelay: number;
  Greeting: string;
  VerifiedBuild?: number;
}

export interface QuestRelationRow {
  id: number;
  quest: number;
  entityType: 'creature' | 'gameobject';
  relationType: 'starter' | 'ender';
}
