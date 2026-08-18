// Covers quest_template query generation, above all that a full query writes
// every one of the 123 columns so a save cannot silently reset one, and that
// the 64-bit AllowableRaces mask survives a round trip exactly.

import { describe, expect, it } from 'vitest';
import {
  changedColumns,
  generateDiffQuery,
  generateFullQuery,
  isQuestModified,
} from './questSqlGenerator';
import {
  QUEST_TEMPLATE_COLUMNS,
  QUEST_TEMPLATE_COLUMN_NAMES,
  createDefaultQuestTemplate,
} from '../schema/questTemplateSchema';

/** A row shaped like one returned by `SELECT * FROM quest_template`. */
const loadedRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  for (const column of QUEST_TEMPLATE_COLUMNS) {
    row[column.name] = column.default;
  }
  row.ID = 48514;
  row.LogTitle = 'The Heart of Azeroth';
  return { ...row, ...overrides };
};

/** Column list from the INSERT part of a full query. */
const insertColumns = (sql: string): string[] => {
  const match = sql.match(/INSERT INTO `quest_template` \(([^)]*)\)/);
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

const valueByColumn = (sql: string): Record<string, string> =>
  Object.fromEntries(QUEST_TEMPLATE_COLUMN_NAMES.map((name, i) => [name, insertValues(sql)[i]]));

describe('generateFullQuery', () => {
  it('writes every column of the table, in table order', () => {
    // The full query is a DELETE + INSERT, so a missing column silently resets
    // that column to its table default. This is the guard against that, and the
    // reason the editor exists: the previous generator wrote only 57 columns.
    const sql = generateFullQuery(loadedRow());
    expect(insertColumns(sql)).toEqual(QUEST_TEMPLATE_COLUMN_NAMES);
    expect(insertColumns(sql)).toHaveLength(123);
  });

  it('deletes the row before inserting it', () => {
    const sql = generateFullQuery(loadedRow());
    expect(sql.startsWith('DELETE FROM `quest_template` WHERE (`ID` = 48514);')).toBe(true);
  });

  it('preserves the 64-bit AllowableRaces mask exactly', () => {
    // 2^64 - 1 is the all-races mask. It exceeds Number.MAX_SAFE_INTEGER, so it
    // only survives if it is carried as an exact-integer string end to end.
    const all = '18446744073709551615';
    const sql = generateFullQuery(loadedRow({ AllowableRaces: all }));
    expect(valueByColumn(sql).AllowableRaces).toBe(all);
  });

  it('round-trips signed columns, including negative values', () => {
    const row = loadedRow({
      QuestLevel: -1,
      QuestSortID: -375,
      RewardMoney: -5000,
      POIPriority: -2,
      PortraitGiverMount: -3,
      RewardFactionValue1: -9,
      RewardFactionOverride1: -42000,
      TreasurePickerID: -7,
      Expansion: -1,
      ManagedWorldStateID: -100,
      QuestSessionBonus: -1,
    });
    const byColumn = valueByColumn(generateFullQuery(row));
    expect(byColumn.QuestLevel).toBe('-1');
    expect(byColumn.QuestSortID).toBe('-375');
    expect(byColumn.RewardMoney).toBe('-5000');
    expect(byColumn.POIPriority).toBe('-2');
    expect(byColumn.PortraitGiverMount).toBe('-3');
    expect(byColumn.RewardFactionValue1).toBe('-9');
    expect(byColumn.RewardFactionOverride1).toBe('-42000');
    expect(byColumn.TreasurePickerID).toBe('-7');
    expect(byColumn.Expansion).toBe('-1');
    expect(byColumn.ManagedWorldStateID).toBe('-100');
    expect(byColumn.QuestSessionBonus).toBe('-1');
  });

  it('keeps NULL and the empty string apart on the text columns', () => {
    const byColumn = valueByColumn(
      generateFullQuery(loadedRow({ LogDescription: null, QuestDescription: '' }))
    );
    expect(byColumn.LogDescription).toBe('NULL');
    expect(byColumn.QuestDescription).toBe("''");
  });

  it('escapes text so a backslash cannot break the statement', () => {
    const sql = generateFullQuery(loadedRow({ LogTitle: "O'Brien\\Test" }));
    expect(sql).toContain("'O\\'Brien\\\\Test'");
  });

  it('formats floats locale-independently', () => {
    const byColumn = valueByColumn(generateFullQuery(loadedRow({ RewardXPMultiplier: 2.5 })));
    expect(byColumn.RewardXPMultiplier).toBe('2.5');
  });

  it('returns nothing without a primary key', () => {
    expect(generateFullQuery(null)).toBe('');
    expect(generateFullQuery({ LogTitle: 'x' })).toBe('');
  });
});

describe('generateDiffQuery', () => {
  it('emits only the columns that changed', () => {
    const original = loadedRow();
    const current = { ...original, MinLevel: 110, QuestLevel: 110 };
    expect(generateDiffQuery(original, current)).toBe(
      'UPDATE `quest_template` SET `QuestLevel` = 110, `MinLevel` = 110 WHERE (`ID` = 48514);'
    );
  });

  it('emits nothing when nothing changed', () => {
    const original = loadedRow();
    expect(generateDiffQuery(original, { ...original })).toBe('');
    expect(isQuestModified(original, { ...original })).toBe(false);
  });

  it('ignores the string/number drift of a form input', () => {
    const original = loadedRow({ MinLevel: 60 });
    expect(generateDiffQuery(original, { ...original, MinLevel: '60' })).toBe('');
  });

  it('treats an AllowableRaces mask change as a real edit', () => {
    const original = loadedRow({ AllowableRaces: '0' });
    expect(
      generateDiffQuery(original, { ...original, AllowableRaces: '18446744073709551615' })
    ).toBe(
      'UPDATE `quest_template` SET `AllowableRaces` = 18446744073709551615 WHERE (`ID` = 48514);'
    );
  });

  it('treats clearing a nullable text column to NULL as a change', () => {
    const original = loadedRow({ QuestDescription: 'text' });
    expect(generateDiffQuery(original, { ...original, QuestDescription: null })).toBe(
      'UPDATE `quest_template` SET `QuestDescription` = NULL WHERE (`ID` = 48514);'
    );
  });

  it('never writes the primary key in a SET clause', () => {
    const original = loadedRow();
    const current = { ...original, LogTitle: 'Renamed' };
    expect(changedColumns(original, current).some((column) => column.primaryKey)).toBe(false);
  });

  it('falls back to a full query for a record that does not exist yet', () => {
    const created = { ...createDefaultQuestTemplate(90000), _isNew: true };
    const sql = generateDiffQuery({ ...created }, created);
    expect(sql.startsWith('DELETE FROM `quest_template`')).toBe(true);
    expect(isQuestModified({ ...created }, created)).toBe(true);
  });
});

describe('createDefaultQuestTemplate', () => {
  it('produces every column with its table default', () => {
    const record = createDefaultQuestTemplate(42);
    expect(Object.keys(record)).toHaveLength(123);
    expect(record.ID).toBe(42);
    expect(record.QuestType).toBe(2);
    expect(record.QuestLevel).toBe(-1);
    expect(record.MaxScalingLevel).toBe(255);
    expect(record.RewardXPMultiplier).toBe(1);
    // The nine text columns default to NULL in the table.
    expect(record.LogTitle).toBeNull();
    expect(record.QuestCompletionLog).toBeNull();
  });
});
