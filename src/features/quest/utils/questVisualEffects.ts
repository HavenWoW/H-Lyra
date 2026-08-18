// Save composition for quest_visual_effect.
//
// Visual effects belong to a quest through their objective id (the row's `ID`
// column is a `quest_objectives.ID`). Saving them safely is the delicate part:
// the DELETE must be scoped to exactly the objective ids that belong to this
// quest — the ones it has now plus the ones it had before an edit, so a removed
// objective's rows are cleared — and never a blanket delete that could match
// another quest's objectives. When the quest has no objectives at all the set is
// empty and the shared generator emits no statement.

import { generateScopedReplace } from '../../../lib/collectionSql';
import {
  QUEST_VISUAL_EFFECT_TABLE,
  QUEST_VISUAL_EFFECT_SCOPE_COLUMN,
  QUEST_VISUAL_EFFECT_COLUMNS,
} from '../schema/questVisualEffectSchema';

export interface VisualEffectRow {
  /** The owning objective's id (quest_objectives.ID). */
  ID: number;
  Index: number;
  VisualEffect: number;
  VerifiedBuild: number;
}

/**
 * Objective ids whose visual effects the save is allowed to delete: the union
 * of the objective ids currently in the editor and those loaded from the
 * database, so a removed objective's rows are still cleared.
 */
export function visualEffectScopeIds(
  initialObjectiveIds: number[],
  currentObjectiveIds: number[]
): number[] {
  return [...new Set([...initialObjectiveIds, ...currentObjectiveIds])];
}

/**
 * The visual-effect rows that may be written: only those whose objective still
 * exists in the editor, so a row can never be inserted for a deleted objective.
 */
export function visualEffectsForObjectives(
  rows: VisualEffectRow[],
  currentObjectiveIds: number[]
): VisualEffectRow[] {
  const present = new Set(currentObjectiveIds);
  return rows.filter((row) => present.has(row.ID));
}

/**
 * The scoped DELETE + INSERT for a quest's visual effects. Returns an empty
 * string when the quest owns no objective ids, so nothing is deleted.
 */
export function generateVisualEffectSql(
  initialObjectiveIds: number[],
  currentObjectiveIds: number[],
  rows: VisualEffectRow[]
): string {
  const scopeIds = visualEffectScopeIds(initialObjectiveIds, currentObjectiveIds);
  const writable = visualEffectsForObjectives(rows, currentObjectiveIds);
  return generateScopedReplace(
    QUEST_VISUAL_EFFECT_TABLE,
    QUEST_VISUAL_EFFECT_SCOPE_COLUMN,
    scopeIds,
    QUEST_VISUAL_EFFECT_COLUMNS,
    writable as unknown as Record<string, unknown>[]
  );
}
