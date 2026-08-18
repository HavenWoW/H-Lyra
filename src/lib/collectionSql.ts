// Shared SQL generation for the quest sub-tables that hold a *collection* of
// rows keyed to one parent (quest_objectives, quest_poi, quest_poi_points,
// quest_offer_reward, ... all "everything for this quest" tables).
//
// The write strategy is a scoped DELETE followed by a multi-row INSERT, the
// same shape HavenCore's own SQL uses. Centralising it means one correct
// implementation of escaping and NULL handling instead of a hand-rolled
// `.replace(/'/g, ...)` in every tab, which a single quote or trailing
// backslash in a description would break.

import { SqlValueKind, formatSqlValue } from './sql';

export interface CollectionColumn {
  name: string;
  kind: SqlValueKind;
  /** Nullable columns render an absent value as NULL rather than '' or 0. */
  nullable?: boolean;
}

export interface CollectionScope {
  /** Column the rows are keyed by, e.g. `QuestID`. */
  column: string;
  value: number;
}

/** `INSERT INTO ... VALUES ...` covering every column for every row. */
const insertBlock = (table: string, columns: CollectionColumn[], rows: Record<string, unknown>[]): string => {
  const names = columns.map((column) => `\`${column.name}\``).join(', ');
  const tuples = rows
    .map((row) => {
      const values = columns
        .map((column) => formatSqlValue(row[column.name], { kind: column.kind, nullable: !!column.nullable }))
        .join(', ');
      return `  (${values})`;
    })
    .join(',\n');
  return `INSERT INTO \`${table}\` (${names})\nVALUES\n${tuples};`;
};

/**
 * DELETE every row for the scope, then INSERT the given rows.
 *
 * With no rows only the DELETE is emitted, which clears the collection. Every
 * column is written for every row, so a loaded-then-saved collection is
 * byte-identical; a column the editor never surfaces still has to be carried in
 * the row objects so it survives the round trip.
 */
export function generateCollectionReplace(
  table: string,
  scope: CollectionScope,
  columns: CollectionColumn[],
  rows: Record<string, unknown>[]
): string {
  const del = `DELETE FROM \`${table}\` WHERE \`${scope.column}\` = ${scope.value};`;
  if (rows.length === 0) return del;
  return `${del}\n${insertBlock(table, columns, rows)}`;
}

/**
 * Replace the rows whose scope column falls within a *set* of values.
 *
 * For tables keyed indirectly — quest_visual_effect rows belong to a quest
 * through their objective ids, not to the quest directly — the DELETE must be
 * scoped by exactly the ids that belong to the parent, never a blanket delete.
 * An **empty scope produces no statement at all**, so a quest with no
 * objectives can never delete another quest's visual effects.
 */
export function generateScopedReplace(
  table: string,
  scopeColumn: string,
  scopeValues: number[],
  columns: CollectionColumn[],
  rows: Record<string, unknown>[]
): string {
  const unique = [...new Set(scopeValues)];
  if (unique.length === 0) return '';
  const del = `DELETE FROM \`${table}\` WHERE \`${scopeColumn}\` IN (${unique.join(', ')});`;
  if (rows.length === 0) return del;
  return `${del}\n${insertBlock(table, columns, rows)}`;
}

/** True when two collections differ, comparing only the given columns. */
export function collectionChanged(
  columns: CollectionColumn[],
  original: Record<string, unknown>[],
  current: Record<string, unknown>[]
): boolean {
  if (original.length !== current.length) return true;
  return current.some((row, index) =>
    columns.some((column) => {
      const a = formatSqlValue(row[column.name], { kind: column.kind, nullable: !!column.nullable });
      const b = formatSqlValue(original[index]?.[column.name], {
        kind: column.kind,
        nullable: !!column.nullable,
      });
      return a !== b;
    })
  );
}
