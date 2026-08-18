// Resolves which database a free-form SQL statement should run against.
//
// Routing keys off the statement's target table (the identifier after FROM,
// INTO, UPDATE or JOIN), never off arbitrary tokens: a world table such as
// `creature_template` carries a `faction` column, and matching the whole SQL
// text for the word "faction" would wrongly route it to the hotfixes database.

export type TargetDb = 'world' | 'hotfixes';

/**
 * Tables that live in the `bfa_hotfixes` client-data database (the DB2-backed
 * catalog). Everything else — creature/gameobject/quest templates and their
 * sub-tables, loot, spawns — lives in the world database.
 */
export const HOTFIXES_TABLES: ReadonlySet<string> = new Set([
  'item',
  'item_sparse',
  'item_effect',
  'item_appearance',
  'item_modified_appearance',
  'item_extended_cost',
  'item_set',
  'spell_name',
  'spell_misc',
  'spell_duration',
  'spell_cast_times',
  'spell_radius',
  'spell_range',
  'currency_types',
  'hotfix_data',
  'gameobject_display_info',
  'creature_display_info',
  'faction_template',
  'faction',
  'sound_kit',
  'emotes_text',
]);

/** Strips backticks/quotes/brackets and any `db.` qualifier, then lowercases. */
const normalizeTable = (raw: string): string =>
  raw
    .replace(/[`"[\]]/g, '')
    .split('.')
    .pop()!
    .toLowerCase();

/**
 * Picks the database for a statement (or batch of statements) by inspecting the
 * tables it targets. Returns `hotfixes` when any targeted table is a hotfixes
 * table, otherwise `world` (the safe default for the world-database editors).
 */
export function resolveTargetDb(sql: string): TargetDb {
  // Capture the token right after a table-position keyword. The token stops at
  // whitespace, an opening paren, a comma or a semicolon, so it covers
  // `table`, `db.table` and backtick-quoted forms while ignoring column names,
  // which never sit in a table position.
  const clause = /\b(?:from|into|update|join)\s+([^\s(;,]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = clause.exec(sql)) !== null) {
    if (HOTFIXES_TABLES.has(normalizeTable(match[1]))) {
      return 'hotfixes';
    }
  }
  return 'world';
}
