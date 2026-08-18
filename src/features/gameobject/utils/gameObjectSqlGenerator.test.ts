// Covers gameobject_template query generation: that a full query writes all 46
// columns in table order, that signed Data columns keep negative values, and
// that the NOT NULL text columns emit an empty string rather than NULL.

import { describe, expect, it } from 'vitest';
import {
  changedColumns,
  generateDiffQuery,
  generateFullQuery,
  isGameObjectModified,
} from './gameObjectSqlGenerator';
import {
  GAMEOBJECT_TEMPLATE_COLUMNS,
  GAMEOBJECT_TEMPLATE_COLUMN_NAMES,
  createDefaultGameObjectTemplate,
} from '../schema/gameObjectTemplateSchema';

/** A row shaped like one returned by `SELECT * FROM gameobject_template`. */
const loadedRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  for (const column of GAMEOBJECT_TEMPLATE_COLUMNS) {
    row[column.name] = column.default;
  }
  row.entry = 180000;
  row.type = 3;
  row.name = 'Battered Chest';
  return { ...row, ...overrides };
};

const insertColumns = (sql: string): string[] => {
  const match = sql.match(/INSERT INTO `gameobject_template` \(([^)]*)\)/);
  if (!match) throw new Error('no INSERT column list found');
  return match[1].split(', ').map((name) => name.replace(/`/g, ''));
};

const insertValues = (sql: string): string[] => {
  const match = sql.match(/VALUES \((.*)\);$/s);
  if (!match) throw new Error('no VALUES list found');
  return match[1].match(/(?:'(?:\\.|[^'\\])*'|[^,])+/g)!.map((part) => part.trim());
};

const valueByColumn = (sql: string): Record<string, string> =>
  Object.fromEntries(GAMEOBJECT_TEMPLATE_COLUMN_NAMES.map((name, i) => [name, insertValues(sql)[i]]));

describe('generateFullQuery', () => {
  it('writes every column of the table, in table order', () => {
    const sql = generateFullQuery(loadedRow());
    expect(insertColumns(sql)).toEqual(GAMEOBJECT_TEMPLATE_COLUMN_NAMES);
    expect(insertColumns(sql)).toHaveLength(46);
  });

  it('deletes the row before inserting it', () => {
    const sql = generateFullQuery(loadedRow());
    expect(sql.startsWith('DELETE FROM `gameobject_template` WHERE (`entry` = 180000);')).toBe(true);
  });

  it('keeps negative values on the signed Data and RequiredLevel columns', () => {
    // Transport SpawnMap uses NoValue = -1; destructible buildings store signed
    // offsets. Signedness must survive the round trip.
    const byColumn = valueByColumn(
      generateFullQuery(loadedRow({ Data5: -1, Data24: -1500, RequiredLevel: -1, VerifiedBuild: -1 }))
    );
    expect(byColumn.Data5).toBe('-1');
    expect(byColumn.Data24).toBe('-1500');
    expect(byColumn.RequiredLevel).toBe('-1');
    expect(byColumn.VerifiedBuild).toBe('-1');
  });

  it('writes an empty NOT NULL text column as an empty string, never NULL', () => {
    const byColumn = valueByColumn(
      generateFullQuery(loadedRow({ castBarCaption: '', IconName: '', unk1: '' }))
    );
    expect(byColumn.castBarCaption).toBe("''");
    expect(byColumn.IconName).toBe("''");
    expect(byColumn.unk1).toBe("''");
  });

  it('escapes text so a quote and a backslash cannot break the statement', () => {
    const sql = generateFullQuery(loadedRow({ name: "O'Brien\\Chest" }));
    expect(sql).toContain("'O\\'Brien\\\\Chest'");
  });

  it('formats the size float locale-independently', () => {
    const byColumn = valueByColumn(generateFullQuery(loadedRow({ size: 2.5 })));
    expect(byColumn.size).toBe('2.5');
  });

  it('returns nothing without a primary key', () => {
    expect(generateFullQuery(null)).toBe('');
    expect(generateFullQuery({ name: 'x' })).toBe('');
  });
});

describe('generateDiffQuery', () => {
  it('emits only the columns that changed', () => {
    const original = loadedRow();
    const current = { ...original, displayId: 42, Data1: 700 };
    expect(generateDiffQuery(original, current)).toBe(
      'UPDATE `gameobject_template` SET `displayId` = 42, `Data1` = 700 WHERE (`entry` = 180000);'
    );
  });

  it('emits nothing when nothing changed', () => {
    const original = loadedRow();
    expect(generateDiffQuery(original, { ...original })).toBe('');
    expect(isGameObjectModified(original, { ...original })).toBe(false);
  });

  it('ignores the string/number drift of a form input', () => {
    const original = loadedRow({ Data0: 1 });
    expect(generateDiffQuery(original, { ...original, Data0: '1' })).toBe('');
  });

  it('never writes the primary key in a SET clause', () => {
    const original = loadedRow();
    const current = { ...original, name: 'Renamed' };
    expect(changedColumns(original, current).some((column) => column.primaryKey)).toBe(false);
  });

  it('falls back to a full query for a record that does not exist yet', () => {
    const created = { ...createDefaultGameObjectTemplate(90000), _isNew: true };
    const sql = generateDiffQuery({ ...created }, created);
    expect(sql.startsWith('DELETE FROM `gameobject_template`')).toBe(true);
    expect(isGameObjectModified({ ...created }, created)).toBe(true);
  });
});

describe('createDefaultGameObjectTemplate', () => {
  it('produces every column with its table default', () => {
    const record = createDefaultGameObjectTemplate(7);
    expect(Object.keys(record)).toHaveLength(46);
    expect(record.entry).toBe(7);
    expect(record.type).toBe(0);
    expect(record.size).toBe(1);
    // Text columns default to an empty string, not null.
    expect(record.name).toBe('');
    expect(record.IconName).toBe('');
    expect(record.AIName).toBe('');
    expect(record.Data0).toBe(0);
    expect(record.Data33).toBe(0);
  });
});
