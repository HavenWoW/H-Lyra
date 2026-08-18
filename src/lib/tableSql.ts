// Shared, table-agnostic SQL generation for schema-driven editors.
//
// Both generators are driven by a table's column metadata, so they can never
// fall behind the table: every column the schema declares is written by the
// full query, in table order.
//
// This matters because the full query is a DELETE followed by an INSERT. Any
// column the INSERT omits silently reverts to its table default, so an
// incomplete column list is data loss rather than a cosmetic gap. A per-table
// generator binds its own `TableSqlConfig` and re-exports these functions.

import { TableColumn, columnFormat } from './tableSchema';
import { formatSqlValue, formatSqlInt, sqlValuesEqual } from './sql';

export interface TableSqlConfig {
  /** Table name, written verbatim into the statements. */
  table: string;
  /** Every column, in table order. */
  columns: TableColumn[];
  /** One or more primary-key columns; composite keys are supported. */
  primaryKey: string[];
}

type Record_ = Record<string, unknown> & { _isNew?: boolean };

/**
 * Reads a column out of a record, falling back to the table default when the
 * record has no value for it.
 *
 * A record loaded with `SELECT *` always carries every column, but a record
 * built in the editor before a reload may not.
 */
const valueOf = (record: Record<string, unknown>, column: TableColumn): unknown =>
  Object.prototype.hasOwnProperty.call(record, column.name)
    ? record[column.name]
    : column.default;

/** Columns that may appear in a SET clause: everything but the primary key. */
const updatableColumns = (config: TableSqlConfig): TableColumn[] => {
  const keys = new Set(config.primaryKey);
  return config.columns.filter((column) => !keys.has(column.name));
};

/** True when every primary-key column carries a usable value. */
const hasKey = (config: TableSqlConfig, record: Record<string, unknown>): boolean =>
  config.primaryKey.every((name) => {
    const value = record[name];
    return value !== undefined && value !== null && value !== '';
  });

/**
 * `\`k1\` = v1 AND \`k2\` = v2` for the record's primary-key columns.
 *
 * The key value is formatted through its column so a text key is quoted and an
 * integer key keeps full precision.
 */
const whereClause = (config: TableSqlConfig, record: Record<string, unknown>): string => {
  const byName = new Map(config.columns.map((column) => [column.name, column]));
  return config.primaryKey
    .map((name) => {
      const column = byName.get(name);
      const value = record[name];
      const rendered = column ? formatSqlValue(value, columnFormat(column)) : formatSqlInt(value);
      return `\`${name}\` = ${rendered}`;
    })
    .join(' AND ');
};

/** Columns whose value differs between the two records. */
export function changedColumns(
  config: TableSqlConfig,
  original: Record<string, unknown> | null | undefined,
  current: Record<string, unknown> | null | undefined
): TableColumn[] {
  if (!original || !current) return [];
  return updatableColumns(config).filter(
    (column) =>
      !sqlValuesEqual(valueOf(original, column), valueOf(current, column), columnFormat(column))
  );
}

/** True when any column differs, or the record has never been saved. */
export function isRecordModified(
  config: TableSqlConfig,
  original: Record_ | null | undefined,
  current: Record_ | null | undefined
): boolean {
  if (!original || !current) return false;
  if (original._isNew || current._isNew) return true;
  return changedColumns(config, original, current).length > 0;
}

/**
 * An UPDATE touching only the columns that actually changed.
 *
 * Returns an empty string when nothing changed, which the editor uses to
 * disable Execute.
 */
export function generateDiffQuery(
  config: TableSqlConfig,
  original: Record_ | null | undefined,
  current: Record_ | null | undefined
): string {
  if (!original || !current) return '';
  if (!hasKey(config, current)) return '';

  if (current._isNew) return generateFullQuery(config, current);

  const changes = changedColumns(config, original, current).map(
    (column) => `\`${column.name}\` = ${formatSqlValue(valueOf(current, column), columnFormat(column))}`
  );

  if (changes.length === 0) return '';

  return `UPDATE \`${config.table}\` SET ${changes.join(', ')} WHERE (${whereClause(config, current)});`;
}

/**
 * A DELETE plus a complete INSERT.
 *
 * Every column of the table is written, so a record round-tripped through this
 * query is byte-identical to the one that was loaded.
 */
export function generateFullQuery(
  config: TableSqlConfig,
  current: Record_ | null | undefined
): string {
  if (!current) return '';
  if (!hasKey(config, current)) return '';

  const names = config.columns.map((column) => `\`${column.name}\``);
  const values = config.columns.map((column) =>
    formatSqlValue(valueOf(current, column), columnFormat(column))
  );

  return (
    `DELETE FROM \`${config.table}\` WHERE (${whereClause(config, current)});\n` +
    `INSERT INTO \`${config.table}\` (${names.join(', ')})\n` +
    `VALUES (${values.join(', ')});`
  );
}
