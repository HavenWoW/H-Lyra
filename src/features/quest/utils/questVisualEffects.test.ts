// Tests for visual-effect save composition safety.
//
// The critical invariant: a quest with no objectives owns no visual effects, so
// the save must emit no DELETE that could accidentally delete another quest's
// objective rows. This is guaranteed by the empty-scope-emits-nothing rule in
// generateScopedReplace, which we verify here at the tab level.

import { describe, expect, it } from 'vitest';
import {
  visualEffectScopeIds,
  visualEffectsForObjectives,
  generateVisualEffectSql,
  VisualEffectRow,
} from './questVisualEffects';

describe('questVisualEffects safety', () => {
  it('scopes to the union of initial and current objective ids', () => {
    const scope = visualEffectScopeIds([10, 11], [11, 12]);
    expect(new Set(scope)).toEqual(new Set([10, 11, 12]));
  });

  it('filters rows to only those belonging to current objectives', () => {
    const rows: VisualEffectRow[] = [
      { ID: 10, Index: 0, VisualEffect: 1, VerifiedBuild: 0 },
      { ID: 11, Index: 0, VisualEffect: 2, VerifiedBuild: 0 },
      { ID: 12, Index: 0, VisualEffect: 3, VerifiedBuild: 0 },
    ];
    const writable = visualEffectsForObjectives(rows, [11, 12]);
    expect(writable).toHaveLength(2);
    expect(writable[0].ID).toBe(11);
    expect(writable[1].ID).toBe(12);
  });

  it('emits nothing when the quest owns no objectives (empty-scope safety)', () => {
    const sql = generateVisualEffectSql([], [], []);
    expect(sql).toBe('');
  });

  it('emits a scoped DELETE when initial objectives are removed', () => {
    const sql = generateVisualEffectSql([10, 11], [11], []);
    // Scope is union([10, 11], [11]) = [10, 11], so both get deleted.
    expect(sql).toContain('DELETE FROM `quest_visual_effect` WHERE `ID` IN (');
    expect(sql).toContain('10');
    expect(sql).toContain('11');
  });

  it('never writes a row for an objective that no longer exists', () => {
    const rows: VisualEffectRow[] = [
      { ID: 10, Index: 0, VisualEffect: 1, VerifiedBuild: 0 },
      { ID: 11, Index: 0, VisualEffect: 2, VerifiedBuild: 0 },
    ];
    const sql = generateVisualEffectSql([10, 11], [11], rows);
    // 10 is deleted but 11 is still there; only 11's row is written.
    expect(sql).toContain('VALUES\n  (11, 0, 2, 0)');
    // Sanity check: no INSERT for id 10.
    const lines = sql.split('\n');
    const valueLines = lines.filter((l) => l.trim().startsWith('('));
    expect(valueLines).toHaveLength(1);
    expect(valueLines[0]).toContain('(11,');
  });
});
