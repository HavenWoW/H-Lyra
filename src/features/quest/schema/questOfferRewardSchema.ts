// Structural definition of the `quest_offer_reward` table.
//
// One row per quest (ID = quest id): the emotes and text shown on the reward
// screen. RewardText is a nullable text column. Written as an ID-scoped
// DELETE + INSERT of zero or one row.

import { CollectionColumn } from '../../../lib/collectionSql';

export const QUEST_OFFER_REWARD_TABLE = 'quest_offer_reward';
export const QUEST_OFFER_REWARD_SCOPE_COLUMN = 'ID';

export const QUEST_OFFER_REWARD_COLUMNS: CollectionColumn[] = [
  { name: 'ID', kind: 'int' },
  { name: 'Emote1', kind: 'int' },
  { name: 'Emote2', kind: 'int' },
  { name: 'Emote3', kind: 'int' },
  { name: 'Emote4', kind: 'int' },
  { name: 'EmoteDelay1', kind: 'int' },
  { name: 'EmoteDelay2', kind: 'int' },
  { name: 'EmoteDelay3', kind: 'int' },
  { name: 'EmoteDelay4', kind: 'int' },
  { name: 'RewardText', kind: 'text', nullable: true },
  { name: 'VerifiedBuild', kind: 'int' },
];
