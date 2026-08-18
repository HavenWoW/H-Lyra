// Structural definition of the `quest_poi_points` table.
//
// The polygon vertices for each POI blob, keyed by (QuestID, Idx1, Idx2) and
// written as a QuestID-scoped DELETE + INSERT. A blob's outline is the set of
// points sharing its Idx1.

import { CollectionColumn } from '../../../lib/collectionSql';

export const QUEST_POI_POINTS_TABLE = 'quest_poi_points';
export const QUEST_POI_POINTS_SCOPE_COLUMN = 'QuestID';

export const QUEST_POI_POINTS_COLUMNS: CollectionColumn[] = [
  { name: 'QuestID', kind: 'int' },
  { name: 'Idx1', kind: 'int' },
  { name: 'Idx2', kind: 'int' },
  { name: 'X', kind: 'int' },
  { name: 'Y', kind: 'int' },
  { name: 'VerifiedBuild', kind: 'int' },
];
