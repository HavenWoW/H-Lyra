// SQL generation for `creature_template`.
//
// Binds the table's schema to the shared, table-agnostic generators in
// `src/lib/tableSql.ts`. Both generators are driven by the column metadata in
// `creatureTemplateSchema`, so they can never fall behind the table: every
// column the schema declares is written by the full query, in table order.
//
// This matters because the full query is a DELETE followed by an INSERT. Any
// column the INSERT omits silently reverts to its table default, so an
// incomplete column list is data loss rather than a cosmetic gap.

import {
  CREATURE_TEMPLATE_COLUMNS,
  CREATURE_TEMPLATE_PRIMARY_KEY,
  CreatureColumn,
} from '../creatureTemplateSchema';
import {
  TableSqlConfig,
  changedColumns as sharedChangedColumns,
  generateDiffQuery as sharedDiffQuery,
  generateFullQuery as sharedFullQuery,
  isRecordModified,
} from '../../../lib/tableSql';

const CONFIG: TableSqlConfig = {
  table: 'creature_template',
  columns: CREATURE_TEMPLATE_COLUMNS,
  primaryKey: [CREATURE_TEMPLATE_PRIMARY_KEY],
};

/** Columns whose value differs between the two records. */
export function changedColumns(
  original: Record<string, unknown> | null | undefined,
  current: Record<string, unknown> | null | undefined
): CreatureColumn[] {
  return sharedChangedColumns(CONFIG, original, current) as CreatureColumn[];
}

/** True when any column differs, or the record has never been saved. */
export function isCreatureModified(
  original: Record<string, unknown> | null | undefined,
  current: Record<string, unknown> | null | undefined
): boolean {
  return isRecordModified(CONFIG, original, current);
}

/** An UPDATE touching only the columns that actually changed. */
export function generateDiffQuery(
  original: Record<string, unknown> | null | undefined,
  current: Record<string, unknown> | null | undefined
): string {
  return sharedDiffQuery(CONFIG, original, current);
}

/** A DELETE plus a complete INSERT, covering every column in table order. */
export function generateFullQuery(current: Record<string, unknown> | null | undefined): string {
  return sharedFullQuery(CONFIG, current);
}
