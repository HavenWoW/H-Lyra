// Routing must follow the target table, not any word in the SQL. The regression
// case is a world table (creature_template) that carries a `faction` column:
// the column name must not drag the statement into the hotfixes database.

import { describe, expect, it } from 'vitest';
import { resolveTargetDb } from './targetDb';

describe('resolveTargetDb', () => {
  it('routes a creature_template full query to world despite a faction column', () => {
    const sql =
      'DELETE FROM `creature_template` WHERE (`entry` = 6);\n' +
      'INSERT INTO `creature_template` (`entry`, `name`, `faction`, `type_flags`) ' +
      "VALUES (6, 'Kobold Vermin', 25, 0);";
    expect(resolveTargetDb(sql)).toBe('world');
  });

  it('routes a select from a hotfixes table to hotfixes', () => {
    expect(resolveTargetDb('SELECT * FROM item_sparse WHERE ID = 25;')).toBe('hotfixes');
  });

  it('routes an update of a hotfixes table to hotfixes', () => {
    expect(resolveTargetDb('UPDATE faction SET ReputationBase1 = 0 WHERE ID = 1;')).toBe('hotfixes');
  });

  it('resolves backtick-quoted and db-qualified table names', () => {
    expect(resolveTargetDb('SELECT * FROM `faction`;')).toBe('hotfixes');
    expect(resolveTargetDb('SELECT * FROM bfa_hotfixes.item_sparse;')).toBe('hotfixes');
    expect(resolveTargetDb('SELECT * FROM `bfa_hotfixes`.`item_effect`;')).toBe('hotfixes');
  });

  it('keeps gameobject and quest full queries on world', () => {
    expect(resolveTargetDb('INSERT INTO `gameobject_template` (`entry`, `faction`) VALUES (1, 2);')).toBe(
      'world'
    );
    expect(resolveTargetDb('INSERT INTO `quest_template` (`ID`, `RewardFactionID1`) VALUES (1, 2);')).toBe(
      'world'
    );
  });

  it('does not match a hotfixes name that only appears as a column', () => {
    expect(resolveTargetDb('SELECT `faction`, `item` FROM `creature_template`;')).toBe('world');
  });

  it('routes a JOIN onto hotfixes when a joined table is a hotfixes table', () => {
    const sql =
      'SELECT ft.ID FROM faction_template ft LEFT JOIN faction f ON f.ID = ft.Faction;';
    expect(resolveTargetDb(sql)).toBe('hotfixes');
  });

  it('defaults to world for an empty or table-less statement', () => {
    expect(resolveTargetDb('')).toBe('world');
    expect(resolveTargetDb('SELECT 1 + 1;')).toBe('world');
  });
});
