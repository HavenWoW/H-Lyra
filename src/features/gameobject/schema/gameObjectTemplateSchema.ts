// Structural definition of the `gameobject_template` table.
//
// Single source of truth for the GameObject Template editor: it drives the
// typed record, the new-record defaults, the Identity/Scripting/Advanced cards,
// and both the diff and full query generators. Columns are in table order so a
// generated INSERT is deterministic.
//
// The 46 columns match `gameobject_template` exactly. Unlike quest, **every text
// column is `NOT NULL DEFAULT ''`** — there is no nullable text and no NULL vs
// empty-string distinction here. `Data0`..`Data33`, `RequiredLevel` and
// `VerifiedBuild` are signed `int` and must preserve negative values. The
// meaning of the Data columns depends on `type`; they are declared here so the
// query covers them, but rendered by the dedicated Data card, not a FieldCard.

import { SqlColumnFormat } from '../../../lib/sql';
import {
  TableColumn,
  EditorKind,
  text as textColumn,
  int as intColumn,
  float as floatColumn,
  columnFormat as sharedColumnFormat,
  columnsForGroup as sharedColumnsForGroup,
  createDefaultRecord,
} from '../../../lib/tableSchema';
import { GAMEOBJECT_TYPE_OPTIONS } from '../../../constants/gameObjectOptions';

/** Card the column is rendered in. `data` columns use the dedicated Data card. */
export type GameObjectFieldGroup = 'identity' | 'scripting' | 'advanced' | 'data';

/** A `gameobject_template` column, grouped by this table's cards. */
export type GameObjectColumn = TableColumn<GameObjectFieldGroup>;

export type GameObjectEditorKind = EditorKind;

const text = (
  name: string,
  label: string,
  group: GameObjectFieldGroup,
  sqlType: string,
  extra: Partial<GameObjectColumn> = {}
): GameObjectColumn => textColumn(name, label, group, sqlType, false, '', extra);

const int = (
  name: string,
  label: string,
  group: GameObjectFieldGroup,
  sqlType: string,
  signed: boolean,
  defaultValue: number,
  extra: Partial<GameObjectColumn> = {}
): GameObjectColumn => intColumn(name, label, group, sqlType, signed, defaultValue, extra);

const float = (
  name: string,
  label: string,
  group: GameObjectFieldGroup,
  defaultValue: number,
  extra: Partial<GameObjectColumn> = {}
): GameObjectColumn => floatColumn(name, label, group, defaultValue, extra);

/** The 34 polymorphic Data columns, in table order. Meaning depends on `type`. */
const dataColumns: GameObjectColumn[] = Array.from({ length: 34 }, (_, i) =>
  int(`Data${i}`, `Data${i}`, 'data', 'int', true, 0)
);

/** Every column of `gameobject_template`, in table order. */
export const GAMEOBJECT_TEMPLATE_COLUMNS: GameObjectColumn[] = [
  int('entry', 'Entry', 'identity', 'mediumint unsigned', false, 0, { primaryKey: true }),
  int('type', 'Type', 'identity', 'tinyint unsigned', false, 0, {
    editor: 'enum',
    options: GAMEOBJECT_TYPE_OPTIONS,
    hint: 'Selects what every Data column below means',
  }),
  int('displayId', 'Display ID', 'identity', 'mediumint unsigned', false, 0, {
    hint: 'GameObjectDisplayInfo.db2 id',
  }),
  text('name', 'Name', 'identity', 'varchar(100)', { wide: true }),
  text('IconName', 'Cursor Icon', 'identity', 'varchar(100)', {
    widget: 'iconName',
    hint: 'Client cursor shown on hover, for example Directions or Speak',
  }),
  text('castBarCaption', 'Cast Bar Caption', 'identity', 'varchar(100)'),
  text('unk1', 'unk1', 'identity', 'varchar(100)'),
  float('size', 'Size', 'identity', 1),
  ...dataColumns,
  int('RequiredLevel', 'Required Level', 'identity', 'int', true, 0),
  text('AIName', 'AI Name', 'scripting', 'char(64)'),
  text('ScriptName', 'Script Name', 'scripting', 'varchar(64)'),
  int('VerifiedBuild', 'Verified Build', 'advanced', 'int', true, 0, { coreLoaded: false }),
];

/** Column lookup by name. */
export const GAMEOBJECT_TEMPLATE_COLUMN_MAP: Record<string, GameObjectColumn> = Object.fromEntries(
  GAMEOBJECT_TEMPLATE_COLUMNS.map((column) => [column.name, column])
);

/** Ordered column names, matching the table definition. */
export const GAMEOBJECT_TEMPLATE_COLUMN_NAMES: string[] = GAMEOBJECT_TEMPLATE_COLUMNS.map(
  (column) => column.name
);

export const GAMEOBJECT_TEMPLATE_PRIMARY_KEY = 'entry';

/** Value-formatting descriptor for a column, for the shared SQL helpers. */
export const columnFormat = (column: GameObjectColumn): SqlColumnFormat =>
  sharedColumnFormat(column);

interface GameObjectFieldGroupDef {
  id: GameObjectFieldGroup;
  title: string;
  note?: string;
}

/** Cards shown in the template editor (the Data card is rendered separately). */
export const GAMEOBJECT_TEMPLATE_GROUPS: GameObjectFieldGroupDef[] = [
  { id: 'identity', title: 'Identity' },
  { id: 'scripting', title: 'Scripting' },
  { id: 'advanced', title: 'Advanced', note: 'VerifiedBuild is not read by HavenCore.' },
];

/** Columns belonging to one card, in table order. */
export const columnsForGroup = (group: GameObjectFieldGroup): GameObjectColumn[] =>
  sharedColumnsForGroup(GAMEOBJECT_TEMPLATE_COLUMNS, group);

/** A new record populated from the table defaults. */
export const createDefaultGameObjectTemplate = (entry: number): Record<string, unknown> =>
  createDefaultRecord(GAMEOBJECT_TEMPLATE_COLUMNS, GAMEOBJECT_TEMPLATE_PRIMARY_KEY, entry);
