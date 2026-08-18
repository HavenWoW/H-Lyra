// SQL generation for `gameobject_template`.
//
// Binds the table's schema to the shared, table-agnostic generators in
// `src/lib/tableSql.ts`. Both generators are driven by the column metadata in
// `gameObjectTemplateSchema`, so the full query always covers all 46 columns in
// table order and the shared escaping / signedness rules apply uniformly.

import {
  GAMEOBJECT_TEMPLATE_COLUMNS,
  GAMEOBJECT_TEMPLATE_PRIMARY_KEY,
  GameObjectColumn,
} from '../schema/gameObjectTemplateSchema';
import {
  TableSqlConfig,
  changedColumns as sharedChangedColumns,
  generateDiffQuery as sharedDiffQuery,
  generateFullQuery as sharedFullQuery,
  isRecordModified,
} from '../../../lib/tableSql';

const CONFIG: TableSqlConfig = {
  table: 'gameobject_template',
  columns: GAMEOBJECT_TEMPLATE_COLUMNS,
  primaryKey: [GAMEOBJECT_TEMPLATE_PRIMARY_KEY],
};

/** Columns whose value differs between the two records. */
export function changedColumns(
  original: Record<string, unknown> | null | undefined,
  current: Record<string, unknown> | null | undefined
): GameObjectColumn[] {
  return sharedChangedColumns(CONFIG, original, current) as GameObjectColumn[];
}

/** True when any column differs, or the record has never been saved. */
export function isGameObjectModified(
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
