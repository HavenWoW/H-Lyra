// Structural definition of the `quest_details` table.
//
// One row per quest (ID = quest id), holding the emotes played when the quest
// is offered. Written as an ID-scoped DELETE + INSERT of zero or one row.

import { CollectionColumn } from '../../../lib/collectionSql';

export const QUEST_DETAILS_TABLE = 'quest_details';
export const QUEST_DETAILS_SCOPE_COLUMN = 'ID';

export const QUEST_DETAILS_COLUMNS: CollectionColumn[] = [
  { name: 'ID', kind: 'int' },
  { name: 'Emote1', kind: 'int' },
  { name: 'Emote2', kind: 'int' },
  { name: 'Emote3', kind: 'int' },
  { name: 'Emote4', kind: 'int' },
  { name: 'EmoteDelay1', kind: 'int' },
  { name: 'EmoteDelay2', kind: 'int' },
  { name: 'EmoteDelay3', kind: 'int' },
  { name: 'EmoteDelay4', kind: 'int' },
  { name: 'VerifiedBuild', kind: 'int' },
];
