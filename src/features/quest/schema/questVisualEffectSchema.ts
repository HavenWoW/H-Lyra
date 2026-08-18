// Structural definition of the `quest_visual_effect` table.
//
// A visual effect belongs to a quest *objective*, not to the quest directly:
// its `ID` column is a `quest_objectives.ID`, and the primary key is
// (`ID`, `Index`). The core loads it by joining onto quest_objectives. An editor
// therefore resolves a quest's objective ids first, loads the visual effects for
// those ids, and on save scopes the DELETE to exactly those ids so it can never
// touch another objective's rows.
//
// `Index` is a reserved word; the shared generator backtick-quotes it.

import { CollectionColumn } from '../../../lib/collectionSql';

export const QUEST_VISUAL_EFFECT_TABLE = 'quest_visual_effect';
/** The scope column is the objective id; deletes use an IN over a set of ids. */
export const QUEST_VISUAL_EFFECT_SCOPE_COLUMN = 'ID';

export const QUEST_VISUAL_EFFECT_COLUMNS: CollectionColumn[] = [
  { name: 'ID', kind: 'int' }, // quest_objectives.ID
  { name: 'Index', kind: 'int' },
  { name: 'VisualEffect', kind: 'int' },
  { name: 'VerifiedBuild', kind: 'int' },
];
