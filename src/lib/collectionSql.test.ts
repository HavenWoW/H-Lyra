// Covers the scoped DELETE + multi-row INSERT used by the quest collection
// sub-tables, above all that text is escaped through the shared path and that
// every declared column is written for every row.

import { describe, expect, it } from 'vitest';
import {
  CollectionColumn,
  collectionChanged,
  generateCollectionReplace,
  generateScopedReplace,
} from './collectionSql';

const columns: CollectionColumn[] = [
  { name: 'ID', kind: 'int' },
  { name: 'QuestID', kind: 'int' },
  { name: 'Flags2', kind: 'int' },
  { name: 'ProgressBarWeight', kind: 'float' },
  { name: 'Description', kind: 'text', nullable: true },
];

describe('generateCollectionReplace', () => {
  it('clears the collection with a lone DELETE when there are no rows', () => {
    expect(generateCollectionReplace('quest_objectives', { column: 'QuestID', value: 42 }, columns, [])).toBe(
      'DELETE FROM `quest_objectives` WHERE `QuestID` = 42;'
    );
  });

  it('writes every declared column for every row, so nothing is silently reset', () => {
    const sql = generateCollectionReplace('quest_objectives', { column: 'QuestID', value: 42 }, columns, [
      { ID: 1, QuestID: 42, Flags2: 8, ProgressBarWeight: 0.5, Description: 'Kill them' },
    ]);
    expect(sql).toContain(
      'INSERT INTO `quest_objectives` (`ID`, `QuestID`, `Flags2`, `ProgressBarWeight`, `Description`)'
    );
    expect(sql).toContain("(1, 42, 8, 0.5, 'Kill them')");
  });

  it('escapes a description that contains a quote and a backslash', () => {
    const sql = generateCollectionReplace('quest_objectives', { column: 'QuestID', value: 42 }, columns, [
      { ID: 1, QuestID: 42, Flags2: 0, ProgressBarWeight: 0, Description: "O'Brien\\x" },
    ]);
    expect(sql).toContain("'O\\'Brien\\\\x'");
  });

  it('keeps NULL and the empty string apart in a nullable text column', () => {
    const sql = generateCollectionReplace('quest_objectives', { column: 'QuestID', value: 42 }, columns, [
      { ID: 1, QuestID: 42, Flags2: 0, ProgressBarWeight: 0, Description: null },
      { ID: 2, QuestID: 42, Flags2: 0, ProgressBarWeight: 0, Description: '' },
    ]);
    expect(sql).toContain('(1, 42, 0, 0, NULL)');
    expect(sql).toContain("(2, 42, 0, 0, '')");
  });
});

const veColumns: CollectionColumn[] = [
  { name: 'ID', kind: 'int' },
  { name: 'Index', kind: 'int' },
  { name: 'VisualEffect', kind: 'int' },
  { name: 'VerifiedBuild', kind: 'int' },
];

describe('generateScopedReplace', () => {
  it('emits nothing when the scope is empty, so unrelated rows are never deleted', () => {
    // A quest with no objectives owns no visual effects; the generator must not
    // produce a DELETE that could match another quest's objective ids.
    expect(generateScopedReplace('quest_visual_effect', 'ID', [], veColumns, [])).toBe('');
    expect(
      generateScopedReplace('quest_visual_effect', 'ID', [], veColumns, [
        { ID: 5, Index: 0, VisualEffect: 1, VerifiedBuild: 0 },
      ])
    ).toBe('');
  });

  it('scopes the DELETE to exactly the given ids, de-duplicated', () => {
    const sql = generateScopedReplace('quest_visual_effect', 'ID', [10, 11, 10], veColumns, []);
    expect(sql).toBe('DELETE FROM `quest_visual_effect` WHERE `ID` IN (10, 11);');
  });

  it('quotes the reserved Index column and writes every row', () => {
    const sql = generateScopedReplace('quest_visual_effect', 'ID', [10], veColumns, [
      { ID: 10, Index: 0, VisualEffect: 42, VerifiedBuild: 0 },
      { ID: 10, Index: 1, VisualEffect: 43, VerifiedBuild: 0 },
    ]);
    expect(sql).toContain('DELETE FROM `quest_visual_effect` WHERE `ID` IN (10);');
    expect(sql).toContain('INSERT INTO `quest_visual_effect` (`ID`, `Index`, `VisualEffect`, `VerifiedBuild`)');
    expect(sql).toContain('(10, 0, 42, 0)');
    expect(sql).toContain('(10, 1, 43, 0)');
  });
});

describe('collectionChanged', () => {
  it('is false for identical collections, tolerating string/number drift', () => {
    const original = [{ ID: 1, QuestID: 42, Flags2: 8, ProgressBarWeight: 0.5, Description: 'x' }];
    const current = [{ ID: '1', QuestID: '42', Flags2: '8', ProgressBarWeight: '0.5', Description: 'x' }];
    expect(collectionChanged(columns, original, current)).toBe(false);
  });

  it('is true when a row is added, removed or edited', () => {
    const original = [{ ID: 1, QuestID: 42, Flags2: 8, ProgressBarWeight: 0.5, Description: 'x' }];
    expect(collectionChanged(columns, original, [])).toBe(true);
    expect(
      collectionChanged(columns, original, [
        { ID: 1, QuestID: 42, Flags2: 9, ProgressBarWeight: 0.5, Description: 'x' },
      ])
    ).toBe(true);
  });
});
