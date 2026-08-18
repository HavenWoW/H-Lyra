// Covers creature_template query generation, above all that a full query writes
// every column so a save cannot silently reset one.

import { describe, expect, it } from 'vitest';
import {
  changedColumns,
  generateDiffQuery,
  generateFullQuery,
  isCreatureModified,
} from './creatureSqlGenerator';
import {
  CREATURE_TEMPLATE_COLUMNS,
  CREATURE_TEMPLATE_COLUMN_NAMES,
  createDefaultCreatureTemplate,
} from '../creatureTemplateSchema';

/** A row shaped like one returned by `SELECT * FROM creature_template`. */
const loadedRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  for (const column of CREATURE_TEMPLATE_COLUMNS) {
    row[column.name] = column.default;
  }
  row.entry = 19019;
  row.name = 'Thunderfury';
  return { ...row, ...overrides };
};

/** Column list from the INSERT part of a full query. */
const insertColumns = (sql: string): string[] => {
  const match = sql.match(/INSERT INTO `creature_template` \(([^)]*)\)/);
  if (!match) throw new Error('no INSERT column list found');
  return match[1].split(', ').map((name) => name.replace(/`/g, ''));
};

/** Value list from the INSERT part of a full query. */
const insertValues = (sql: string): string[] => {
  const match = sql.match(/VALUES \((.*)\);$/s);
  if (!match) throw new Error('no VALUES list found');
  // Split on commas that are not inside a quoted literal.
  return match[1].match(/(?:'(?:\\.|[^'\\])*'|[^,])+/g)!.map((part) => part.trim());
};

describe('generateFullQuery', () => {
  it('writes every column of the table, in table order', () => {
    // The full query is a DELETE + INSERT, so a missing column silently resets
    // that column to its table default. This is the guard against that.
    const sql = generateFullQuery(loadedRow());
    expect(insertColumns(sql)).toEqual(CREATURE_TEMPLATE_COLUMN_NAMES);
    expect(insertColumns(sql)).toHaveLength(81);
  });

  it('deletes the row before inserting it', () => {
    const sql = generateFullQuery(loadedRow());
    expect(sql.startsWith('DELETE FROM `creature_template` WHERE (`entry` = 19019);')).toBe(true);
  });

  it('round-trips a loaded row without changing any value', () => {
    const row = loadedRow({
      KillCredit1: 12345,
      gossip_menu_id: 4242,
      RegenHealth: 0,
      HealthModifierExtra: 2.5,
      VignetteID: -7,
      npcflag: 8796093022208,
      subname: '',
      femaleName: null,
      TitleAlt: 'Alt',
    });

    const values = insertValues(generateFullQuery(row));
    const byColumn = Object.fromEntries(
      CREATURE_TEMPLATE_COLUMN_NAMES.map((name, index) => [name, values[index]])
    );

    expect(byColumn.KillCredit1).toBe('12345');
    expect(byColumn.gossip_menu_id).toBe('4242');
    expect(byColumn.RegenHealth).toBe('0');
    expect(byColumn.HealthModifierExtra).toBe('2.5');
    expect(byColumn.VignetteID).toBe('-7');
    expect(byColumn.npcflag).toBe('8796093022208');
    expect(byColumn.subname).toBe("''");
    expect(byColumn.femaleName).toBe('NULL');
    expect(byColumn.TitleAlt).toBe("'Alt'");
  });

  it('keeps NULL and the empty string apart', () => {
    const values = insertValues(
      generateFullQuery(loadedRow({ subname: null, femaleName: '', IconName: null }))
    );
    const byColumn = Object.fromEntries(
      CREATURE_TEMPLATE_COLUMN_NAMES.map((name, index) => [name, values[index]])
    );
    expect(byColumn.subname).toBe('NULL');
    expect(byColumn.femaleName).toBe("''");
    expect(byColumn.IconName).toBe('NULL');
  });

  it('escapes text so a backslash cannot break the statement', () => {
    const sql = generateFullQuery(loadedRow({ name: "O'Brien\\Test" }));
    expect(sql).toContain("'O\\'Brien\\\\Test'");
  });

  it('falls back to the table default for a column the record lacks', () => {
    const partial = { entry: 5, name: 'Partial' };
    const values = insertValues(generateFullQuery(partial));
    const byColumn = Object.fromEntries(
      CREATURE_TEMPLATE_COLUMN_NAMES.map((name, index) => [name, values[index]])
    );
    expect(byColumn.speed_run).toBe('1.14286');
    expect(byColumn.InhabitType).toBe('3');
    expect(byColumn.RegenHealth).toBe('1');
    expect(byColumn.subname).toBe('NULL');
  });

  it('returns nothing without a primary key', () => {
    expect(generateFullQuery(null)).toBe('');
    expect(generateFullQuery({ name: 'x' })).toBe('');
  });
});

describe('generateDiffQuery', () => {
  it('emits only the columns that changed', () => {
    const original = loadedRow();
    const current = { ...original, minlevel: 60, maxlevel: 60 };
    const sql = generateDiffQuery(original, current);
    expect(sql).toBe(
      'UPDATE `creature_template` SET `minlevel` = 60, `maxlevel` = 60 WHERE (`entry` = 19019);'
    );
  });

  it('emits nothing when nothing changed', () => {
    const original = loadedRow();
    expect(generateDiffQuery(original, { ...original })).toBe('');
    expect(isCreatureModified(original, { ...original })).toBe(false);
  });

  it('ignores the string/number drift of a form input', () => {
    const original = loadedRow({ minlevel: 60 });
    expect(generateDiffQuery(original, { ...original, minlevel: '60' })).toBe('');
  });

  it('treats clearing a nullable column to NULL as a change', () => {
    const original = loadedRow({ subname: 'Guild Master' });
    expect(generateDiffQuery(original, { ...original, subname: null })).toBe(
      'UPDATE `creature_template` SET `subname` = NULL WHERE (`entry` = 19019);'
    );
    expect(generateDiffQuery(original, { ...original, subname: '' })).toBe(
      "UPDATE `creature_template` SET `subname` = '' WHERE (`entry` = 19019);"
    );
  });

  it('never writes the primary key in a SET clause', () => {
    const original = loadedRow();
    const current = { ...original, name: 'Renamed' };
    expect(changedColumns(original, current).some((column) => column.primaryKey)).toBe(false);
  });

  it('falls back to a full query for a record that does not exist yet', () => {
    const created = { ...createDefaultCreatureTemplate(90000), _isNew: true };
    const sql = generateDiffQuery({ ...created }, created);
    expect(sql.startsWith('DELETE FROM `creature_template`')).toBe(true);
    expect(isCreatureModified({ ...created }, created)).toBe(true);
  });
});

describe('createDefaultCreatureTemplate', () => {
  it('produces every column with its table default', () => {
    const record = createDefaultCreatureTemplate(42);
    expect(Object.keys(record)).toHaveLength(81);
    expect(record.entry).toBe(42);
    expect(record.speed_walk).toBe(1);
    expect(record.speed_run).toBe(1.14286);
    expect(record.InhabitType).toBe(3);
    expect(record.RegenHealth).toBe(1);
    expect(record.BaseVariance).toBe(1);
    expect(record.ManaModifierExtra).toBe(1);
    // The four nullable text columns default to NULL in the table.
    expect(record.femaleName).toBeNull();
    expect(record.subname).toBeNull();
    expect(record.TitleAlt).toBeNull();
    expect(record.IconName).toBeNull();
  });
});
