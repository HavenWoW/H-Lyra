// Shared, table-agnostic schema descriptors for SQL-backed editors.
//
// One module per table declares every column once: name, SQL type, signedness,
// nullability, default, editor kind and the card it belongs to. That single
// declaration drives the typed record, the new-record defaults, the card
// layout, the diff generator and the full-query generator, so none of them can
// drift from the table.
//
// This module holds the pieces that are the same for every table. A per-table
// schema (creature_template, quest_template, ...) is just an array of
// `TableColumn` plus a primary key and a list of card groups.

import { SelectOption, FlagOption } from '../constants/itemOptions';
import { SelectorType } from '../components/EntitySelectorModal';
import { SqlColumnFormat, SqlValueKind } from './sql';

/** How a column is presented and edited. */
export type EditorKind = 'text' | 'int' | 'float' | 'enum' | 'flags' | 'bool' | 'entity';

/**
 * One column of a SQL table.
 *
 * `G` is the union of card-group ids for the owning table, so a schema keeps
 * compile-time checking that every column names a real card.
 */
export interface TableColumn<G extends string = string> {
  /** Column name exactly as spelled in the table. */
  name: string;
  /** Column type as declared in the table, for display and documentation. */
  sqlType: string;
  /** Physical shape used by the SQL value formatter. */
  kind: SqlValueKind;
  signed: boolean;
  nullable: boolean;
  /** Value the table falls back to; also the value used for a new record. */
  default: string | number | null;
  editor: EditorKind;
  group: G;
  label: string;
  /** Options for `enum` and `bool` editors. */
  options?: SelectOption[];
  /** Flag definitions for `flags` editors. */
  flags?: FlagOption[];
  /** Entity picker to use for `entity` editors. */
  entityType?: SelectorType;
  /** True when the value can exceed 32 bits and must use BigInt arithmetic. */
  bigint?: boolean;
  /** False when HavenCore's loader ignores the column. */
  coreLoaded: boolean;
  /** Primary key; never part of a SET clause. */
  primaryKey?: boolean;
  /** Optional specialised widget for a `text` column, e.g. the cursor picker. */
  widget?: 'iconName';
  /** Renders wider than a default field, for long labels such as a name. */
  wide?: boolean;
  hint?: string;
}

/** Builds a text column. Defaults to a core-loaded, non-key column. */
export const text = <G extends string>(
  name: string,
  label: string,
  group: G,
  sqlType: string,
  nullable: boolean,
  defaultValue: string | null,
  extra: Partial<TableColumn<G>> = {}
): TableColumn<G> => ({
  name,
  sqlType,
  kind: 'text',
  signed: false,
  nullable,
  default: defaultValue,
  editor: 'text',
  group,
  label,
  coreLoaded: true,
  ...extra,
});

/** Builds an integer column of any width. */
export const int = <G extends string>(
  name: string,
  label: string,
  group: G,
  sqlType: string,
  signed: boolean,
  defaultValue: number,
  extra: Partial<TableColumn<G>> = {}
): TableColumn<G> => ({
  name,
  sqlType,
  kind: 'int',
  signed,
  nullable: false,
  default: defaultValue,
  editor: 'int',
  group,
  label,
  coreLoaded: true,
  ...extra,
});

/** Builds a floating point column. */
export const float = <G extends string>(
  name: string,
  label: string,
  group: G,
  defaultValue: number,
  extra: Partial<TableColumn<G>> = {}
): TableColumn<G> => ({
  name,
  sqlType: 'float',
  kind: 'float',
  signed: true,
  nullable: false,
  default: defaultValue,
  editor: 'float',
  group,
  label,
  coreLoaded: true,
  ...extra,
});

/** Value-formatting descriptor for a column, for the shared SQL helpers. */
export const columnFormat = (column: TableColumn): SqlColumnFormat => ({
  kind: column.kind,
  nullable: column.nullable,
});

/** Ordered column names, matching the table definition. */
export const columnNames = (columns: TableColumn[]): string[] =>
  columns.map((column) => column.name);

/** Column lookup by name. */
export const columnMap = <G extends string>(
  columns: TableColumn<G>[]
): Record<string, TableColumn<G>> =>
  Object.fromEntries(columns.map((column) => [column.name, column]));

/** Columns belonging to one card, in table order. */
export const columnsForGroup = <G extends string>(
  columns: TableColumn<G>[],
  group: G
): TableColumn<G>[] => columns.filter((column) => column.group === group);

/**
 * A new record populated from the table defaults.
 *
 * Every column is present, so the record can be saved through a lossless full
 * query straight away.
 */
export const createDefaultRecord = (
  columns: TableColumn[],
  primaryKey: string,
  keyValue: number
): Record<string, unknown> => {
  const record: Record<string, unknown> = {};
  for (const column of columns) {
    record[column.name] = column.default;
  }
  record[primaryKey] = keyValue;
  return record;
};
