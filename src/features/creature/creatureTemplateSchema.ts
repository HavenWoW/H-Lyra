// Structural definition of the `creature_template` table.
//
// This is the single source of truth for the Creature Template editor: it
// drives the typed record, the new-record defaults, the card layout, and both
// the diff and full query generators. Adding a column here makes it appear in
// every one of those places at once, which is what keeps a DELETE + INSERT
// lossless.
//
// Column order matches the table definition exactly, so generated INSERT
// statements are deterministic and diffable.
//
// Types, nullability and defaults come from the table definition. `coreLoaded`
// records whether HavenCore's `ObjectMgr::LoadCreatureTemplate` actually reads
// the column; three columns exist in the table but are ignored by the core.

import { SqlColumnFormat } from '../../lib/sql';
import {
  TableColumn,
  EditorKind,
  text as textColumn,
  int as intColumn,
  float as floatColumn,
  columnFormat as sharedColumnFormat,
  columnsForGroup as sharedColumnsForGroup,
  createDefaultRecord,
} from '../../lib/tableSchema';
import {
  BOOLEAN_OPTIONS,
  CREATURE_FAMILY,
  CREATURE_FLAGS_EXTRA,
  CREATURE_MOVEMENT_TYPE,
  CREATURE_NPC_FLAGS,
  CREATURE_RANK,
  CREATURE_TYPE,
  CREATURE_TYPE_FLAGS,
  CREATURE_TYPE_FLAGS2,
  CREATURE_UNIT_CLASS,
  EXPANSIONS,
  INHABIT_TYPE_FLAGS,
  MECHANIC_IMMUNE_MASK,
  PLAYER_CLASSES,
  SPELL_SCHOOLS,
  TRAINER_TYPE,
  UNIT_DYN_FLAGS,
  UNIT_FLAGS,
  UNIT_FLAGS2,
  UNIT_FLAGS3,
} from '../../constants/creatureOptions';

/** How a column is presented and edited. */
export type CreatureEditorKind = EditorKind;

/** Card the column is rendered in. */
export type CreatureFieldGroup =
  | 'identity'
  | 'difficulty'
  | 'level'
  | 'factionFlags'
  | 'classification'
  | 'combat'
  | 'spells'
  | 'loot'
  | 'trainer'
  | 'modifiers'
  | 'aiMovement'
  | 'advanced';

/** A `creature_template` column: the shared descriptor, grouped by this table's cards. */
export type CreatureColumn = TableColumn<CreatureFieldGroup>;

const text = (
  name: string,
  label: string,
  group: CreatureFieldGroup,
  sqlType: string,
  nullable: boolean,
  defaultValue: string | null,
  extra: Partial<CreatureColumn> = {}
): CreatureColumn => textColumn(name, label, group, sqlType, nullable, defaultValue, extra);

const int = (
  name: string,
  label: string,
  group: CreatureFieldGroup,
  sqlType: string,
  signed: boolean,
  defaultValue: number,
  extra: Partial<CreatureColumn> = {}
): CreatureColumn => intColumn(name, label, group, sqlType, signed, defaultValue, extra);

const float = (
  name: string,
  label: string,
  group: CreatureFieldGroup,
  defaultValue: number,
  extra: Partial<CreatureColumn> = {}
): CreatureColumn => floatColumn(name, label, group, defaultValue, extra);

/** Every column of `creature_template`, in table order. */
export const CREATURE_TEMPLATE_COLUMNS: CreatureColumn[] = [
  int('entry', 'Entry', 'identity', 'mediumint unsigned', false, 0, { primaryKey: true }),

  int('difficulty_entry_1', 'Difficulty Entry 1', 'difficulty', 'mediumint unsigned', false, 0, {
    editor: 'entity',
    entityType: 'creature',
  }),
  int('difficulty_entry_2', 'Difficulty Entry 2', 'difficulty', 'mediumint unsigned', false, 0, {
    editor: 'entity',
    entityType: 'creature',
  }),
  int('difficulty_entry_3', 'Difficulty Entry 3', 'difficulty', 'mediumint unsigned', false, 0, {
    editor: 'entity',
    entityType: 'creature',
  }),
  int('KillCredit1', 'Kill Credit 1', 'difficulty', 'int unsigned', false, 0, {
    editor: 'entity',
    entityType: 'creature',
  }),
  int('KillCredit2', 'Kill Credit 2', 'difficulty', 'int unsigned', false, 0, {
    editor: 'entity',
    entityType: 'creature',
  }),

  text('name', 'Name', 'identity', 'char(200)', false, '0', { wide: true }),
  text('femaleName', 'Female Name', 'identity', 'char(200)', true, null),
  text('subname', 'Subname', 'identity', 'char(200)', true, null),
  text('TitleAlt', 'Alternate Title', 'identity', 'char(200)', true, null),
  text('IconName', 'Cursor Icon', 'identity', 'char(100)', true, null, {
    widget: 'iconName',
    hint: 'Client cursor shown on hover, for example Directions or Speak',
  }),
  int('gossip_menu_id', 'Gossip Menu', 'identity', 'mediumint unsigned', false, 0),

  int('minlevel', 'Min Level', 'level', 'smallint', true, 1),
  int('maxlevel', 'Max Level', 'level', 'smallint', true, 1),
  int('HealthScalingExpansion', 'Health Scaling Expansion', 'level', 'mediumint', true, 0, {
    editor: 'enum',
    options: EXPANSIONS,
  }),
  int('RequiredExpansion', 'Required Expansion', 'level', 'mediumint', true, 0, {
    editor: 'enum',
    options: EXPANSIONS,
  }),
  int('VignetteID', 'Vignette', 'identity', 'mediumint', true, 0),

  int('faction', 'Faction', 'factionFlags', 'smallint unsigned', false, 0, {
    editor: 'entity',
    entityType: 'faction_template',
  }),
  int('npcflag', 'NPC Flags', 'factionFlags', 'bigint unsigned', false, 0, {
    editor: 'flags',
    flags: CREATURE_NPC_FLAGS,
    bigint: true,
  }),

  float('speed_walk', 'Walk Speed', 'modifiers', 1),
  float('speed_run', 'Run Speed', 'modifiers', 1.14286),
  float('scale', 'Scale', 'modifiers', 1),

  int('rank', 'Rank', 'classification', 'tinyint unsigned', false, 0, {
    editor: 'enum',
    options: CREATURE_RANK,
  }),
  int('dmgschool', 'Damage School', 'combat', 'tinyint', true, 0, {
    editor: 'enum',
    options: SPELL_SCHOOLS,
  }),
  int('BaseAttackTime', 'Base Attack Time', 'combat', 'int unsigned', false, 0),
  int('RangeAttackTime', 'Ranged Attack Time', 'combat', 'int unsigned', false, 0),
  float('BaseVariance', 'Base Damage Variance', 'combat', 1),
  float('RangeVariance', 'Ranged Damage Variance', 'combat', 1),

  int('unit_class', 'Unit Class', 'classification', 'tinyint unsigned', false, 0, {
    editor: 'enum',
    options: CREATURE_UNIT_CLASS,
  }),
  int('unit_flags', 'Unit Flags', 'factionFlags', 'int unsigned', false, 0, {
    editor: 'flags',
    flags: UNIT_FLAGS,
  }),
  int('unit_flags2', 'Unit Flags 2', 'factionFlags', 'int unsigned', false, 0, {
    editor: 'flags',
    flags: UNIT_FLAGS2,
  }),
  int('unit_flags3', 'Unit Flags 3', 'factionFlags', 'int unsigned', false, 0, {
    editor: 'flags',
    flags: UNIT_FLAGS3,
  }),
  int('dynamicflags', 'Dynamic Flags', 'factionFlags', 'int unsigned', false, 0, {
    editor: 'flags',
    flags: UNIT_DYN_FLAGS,
  }),
  int('family', 'Family', 'classification', 'int unsigned', false, 0, {
    editor: 'enum',
    options: CREATURE_FAMILY,
  }),

  int('trainer_type', 'Trainer Type', 'trainer', 'tinyint', true, 0, {
    editor: 'enum',
    options: TRAINER_TYPE,
    coreLoaded: false,
  }),
  int('trainer_class', 'Trainer Class', 'trainer', 'tinyint unsigned', false, 0, {
    editor: 'enum',
    options: PLAYER_CLASSES,
  }),
  int('trainer_race', 'Trainer Race', 'trainer', 'tinyint unsigned', false, 0, {
    coreLoaded: false,
  }),

  int('type', 'Creature Type', 'classification', 'tinyint unsigned', false, 0, {
    editor: 'enum',
    options: CREATURE_TYPE,
  }),
  int('type_flags', 'Type Flags', 'factionFlags', 'int unsigned', false, 0, {
    editor: 'flags',
    flags: CREATURE_TYPE_FLAGS,
  }),
  int('type_flags2', 'Type Flags 2', 'factionFlags', 'int unsigned', false, 0, {
    editor: 'flags',
    flags: CREATURE_TYPE_FLAGS2,
  }),

  int('lootid', 'Loot Template', 'loot', 'mediumint unsigned', false, 0),
  int('pickpocketloot', 'Pickpocket Loot', 'loot', 'mediumint unsigned', false, 0),
  int('skinloot', 'Skinning Loot', 'loot', 'mediumint unsigned', false, 0),

  int('resistance1', 'Holy Resistance', 'combat', 'smallint', true, 0),
  int('resistance2', 'Fire Resistance', 'combat', 'smallint', true, 0),
  int('resistance3', 'Nature Resistance', 'combat', 'smallint', true, 0),
  int('resistance4', 'Frost Resistance', 'combat', 'smallint', true, 0),
  int('resistance5', 'Shadow Resistance', 'combat', 'smallint', true, 0),
  int('resistance6', 'Arcane Resistance', 'combat', 'smallint', true, 0),

  int('spell1', 'Spell 1', 'spells', 'mediumint unsigned', false, 0, {
    editor: 'entity',
    entityType: 'spell',
  }),
  int('spell2', 'Spell 2', 'spells', 'mediumint unsigned', false, 0, {
    editor: 'entity',
    entityType: 'spell',
  }),
  int('spell3', 'Spell 3', 'spells', 'mediumint unsigned', false, 0, {
    editor: 'entity',
    entityType: 'spell',
  }),
  int('spell4', 'Spell 4', 'spells', 'mediumint unsigned', false, 0, {
    editor: 'entity',
    entityType: 'spell',
  }),
  int('spell5', 'Spell 5', 'spells', 'mediumint unsigned', false, 0, {
    editor: 'entity',
    entityType: 'spell',
  }),
  int('spell6', 'Spell 6', 'spells', 'mediumint unsigned', false, 0, {
    editor: 'entity',
    entityType: 'spell',
  }),
  int('spell7', 'Spell 7', 'spells', 'mediumint unsigned', false, 0, {
    editor: 'entity',
    entityType: 'spell',
  }),
  int('spell8', 'Spell 8', 'spells', 'mediumint unsigned', false, 0, {
    editor: 'entity',
    entityType: 'spell',
  }),
  int('VehicleId', 'Vehicle', 'spells', 'mediumint unsigned', false, 0),

  int('mingold', 'Minimum Gold', 'loot', 'int unsigned', false, 0, { hint: 'In copper' }),
  int('maxgold', 'Maximum Gold', 'loot', 'int unsigned', false, 0, { hint: 'In copper' }),

  text('AIName', 'AI Name', 'aiMovement', 'char(64)', false, ''),
  int('MovementType', 'Movement Type', 'aiMovement', 'tinyint unsigned', false, 0, {
    editor: 'enum',
    options: CREATURE_MOVEMENT_TYPE,
  }),
  int('InhabitType', 'Inhabit Type', 'aiMovement', 'tinyint unsigned', false, 3, {
    editor: 'flags',
    flags: INHABIT_TYPE_FLAGS,
  }),

  float('HoverHeight', 'Hover Height', 'modifiers', 1),
  float('HealthModifier', 'Health Modifier', 'modifiers', 1),
  float('HealthModifierExtra', 'Health Modifier Extra', 'modifiers', 1),
  float('ManaModifier', 'Mana Modifier', 'modifiers', 1),
  float('ManaModifierExtra', 'Mana Modifier Extra', 'modifiers', 1),
  float('ArmorModifier', 'Armor Modifier', 'modifiers', 1),
  float('DamageModifier', 'Damage Modifier', 'modifiers', 1),
  float('ExperienceModifier', 'Experience Modifier', 'modifiers', 1),

  int('RacialLeader', 'Racial Leader', 'classification', 'tinyint unsigned', false, 0, {
    editor: 'bool',
    options: BOOLEAN_OPTIONS,
  }),
  int('movementId', 'Movement Definition', 'aiMovement', 'int unsigned', false, 0, {
    hint: 'References creature_movement_info',
  }),
  float('FadeRegionRadius', 'Fade Region Radius', 'advanced', 0),
  int('WidgetSetID', 'Widget Set', 'advanced', 'int', true, 0),
  int('WidgetSetUnitConditionID', 'Widget Set Unit Condition', 'advanced', 'int', true, 0),
  int('RegenHealth', 'Regenerate Health', 'modifiers', 'tinyint unsigned', false, 1, {
    editor: 'bool',
    options: BOOLEAN_OPTIONS,
  }),
  int('mechanic_immune_mask', 'Mechanic Immunity', 'combat', 'int unsigned', false, 0, {
    editor: 'flags',
    flags: MECHANIC_IMMUNE_MASK,
  }),
  int('flags_extra', 'Extra Flags', 'factionFlags', 'int unsigned', false, 0, {
    editor: 'flags',
    flags: CREATURE_FLAGS_EXTRA,
  }),
  text('ScriptName', 'Script Name', 'aiMovement', 'char(64)', false, ''),
  int('VerifiedBuild', 'Verified Build', 'advanced', 'int', true, 0, { coreLoaded: false }),
];

/** Column lookup by name. */
export const CREATURE_TEMPLATE_COLUMN_MAP: Record<string, CreatureColumn> = Object.fromEntries(
  CREATURE_TEMPLATE_COLUMNS.map((column) => [column.name, column])
);

/** Ordered column names, matching the table definition. */
export const CREATURE_TEMPLATE_COLUMN_NAMES: string[] = CREATURE_TEMPLATE_COLUMNS.map(
  (column) => column.name
);

export const CREATURE_TEMPLATE_PRIMARY_KEY = 'entry';

/** Value-formatting descriptor for a column, for the shared SQL helpers. */
export const columnFormat = (column: CreatureColumn): SqlColumnFormat => sharedColumnFormat(column);

/** Card titles, in display order. */
export const CREATURE_FIELD_GROUPS: { id: CreatureFieldGroup; title: string; note?: string }[] = [
  { id: 'identity', title: 'Identity' },
  { id: 'difficulty', title: 'Difficulty & Kill Credit' },
  { id: 'level', title: 'Level & Expansion' },
  { id: 'classification', title: 'Classification' },
  { id: 'factionFlags', title: 'Faction & Flags' },
  { id: 'combat', title: 'Combat & Resistances' },
  { id: 'spells', title: 'Spells & Vehicle' },
  { id: 'loot', title: 'Loot & Gold' },
  { id: 'modifiers', title: 'Modifiers & Speed' },
  { id: 'aiMovement', title: 'AI & Movement' },
  {
    id: 'trainer',
    title: 'Trainer',
    note: 'trainer_type and trainer_race exist in the table but are not read by HavenCore.',
  },
  {
    id: 'advanced',
    title: 'Advanced',
    note: 'VerifiedBuild is not read by HavenCore.',
  },
];

/** Columns belonging to one card, in table order. */
export const columnsForGroup = (group: CreatureFieldGroup): CreatureColumn[] =>
  sharedColumnsForGroup(CREATURE_TEMPLATE_COLUMNS, group);

/**
 * A new record populated from the table defaults.
 *
 * `name` uses an empty string rather than the table's literal `'0'` default,
 * because an unnamed creature is clearer than one called zero.
 */
export const createDefaultCreatureTemplate = (entry: number): Record<string, unknown> => {
  const record = createDefaultRecord(
    CREATURE_TEMPLATE_COLUMNS,
    CREATURE_TEMPLATE_PRIMARY_KEY,
    entry
  );
  record.name = '';
  return record;
};
