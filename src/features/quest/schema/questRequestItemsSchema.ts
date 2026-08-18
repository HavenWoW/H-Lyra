// Structural definition of the `quest_request_items` table.
//
// One row per quest (ID = quest id): the emotes and text shown on the
// "return items" screen. CompletionText is a nullable text column. Written as
// an ID-scoped DELETE + INSERT of zero or one row.

import { CollectionColumn } from '../../../lib/collectionSql';

export const QUEST_REQUEST_ITEMS_TABLE = 'quest_request_items';
export const QUEST_REQUEST_ITEMS_SCOPE_COLUMN = 'ID';

export const QUEST_REQUEST_ITEMS_COLUMNS: CollectionColumn[] = [
  { name: 'ID', kind: 'int' },
  { name: 'EmoteOnComplete', kind: 'int' },
  { name: 'EmoteOnIncomplete', kind: 'int' },
  { name: 'EmoteOnCompleteDelay', kind: 'int' },
  { name: 'EmoteOnIncompleteDelay', kind: 'int' },
  { name: 'CompletionText', kind: 'text', nullable: true },
  { name: 'VerifiedBuild', kind: 'int' },
];
