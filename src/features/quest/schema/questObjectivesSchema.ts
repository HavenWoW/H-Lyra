// Structural definition of the `quest_objectives` table.
//
// The column list lives here rather than inside the tab so schema knowledge is
// not embedded in a UI component. The tab renders its own bespoke list, but its
// SQL is generated from these columns through the shared collection helper.
//
// Rows are keyed by QuestID for the scoped DELETE + INSERT. `Order` is a
// reserved word; the generator backtick-quotes every column name. Flags2 and
// ProgressBarWeight are real stored data and must be carried so a save does not
// reset them.

import { CollectionColumn } from '../../../lib/collectionSql';

export const QUEST_OBJECTIVES_TABLE = 'quest_objectives';
export const QUEST_OBJECTIVES_SCOPE_COLUMN = 'QuestID';

export const QUEST_OBJECTIVES_COLUMNS: CollectionColumn[] = [
  { name: 'ID', kind: 'int' },
  { name: 'QuestID', kind: 'int' },
  { name: 'Type', kind: 'int' },
  { name: 'Order', kind: 'int' },
  { name: 'StorageIndex', kind: 'int' },
  { name: 'ObjectID', kind: 'int' },
  { name: 'Amount', kind: 'int' },
  { name: 'Flags', kind: 'int' },
  { name: 'Flags2', kind: 'int' },
  { name: 'ProgressBarWeight', kind: 'float' },
  { name: 'Description', kind: 'text', nullable: true },
  { name: 'VerifiedBuild', kind: 'int' },
];
