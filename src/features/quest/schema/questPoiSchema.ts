// Structural definition of the `quest_poi` table.
//
// The map blobs that guide the player, keyed by (QuestID, BlobIndex, Idx1) but
// written as a QuestID-scoped DELETE + INSERT. Column knowledge lives here so
// the POI tab does not embed it.

import { CollectionColumn } from '../../../lib/collectionSql';

export const QUEST_POI_TABLE = 'quest_poi';
export const QUEST_POI_SCOPE_COLUMN = 'QuestID';

export const QUEST_POI_COLUMNS: CollectionColumn[] = [
  { name: 'QuestID', kind: 'int' },
  { name: 'BlobIndex', kind: 'int' },
  { name: 'Idx1', kind: 'int' },
  { name: 'ObjectiveIndex', kind: 'int' },
  { name: 'QuestObjectiveID', kind: 'int' },
  { name: 'QuestObjectID', kind: 'int' },
  { name: 'MapID', kind: 'int' },
  { name: 'UiMapID', kind: 'int' },
  { name: 'Priority', kind: 'int' },
  { name: 'Flags', kind: 'int' },
  { name: 'WorldEffectID', kind: 'int' },
  { name: 'PlayerConditionID', kind: 'int' },
  { name: 'SpawnTrackingID', kind: 'int' },
  { name: 'AlwaysAllowMergingBlobs', kind: 'int' },
  { name: 'VerifiedBuild', kind: 'int' },
];
