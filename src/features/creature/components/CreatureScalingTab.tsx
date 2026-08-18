// Editor for creature_template_scaling: per-difficulty level scaling and content
// tuning.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Copy, Check } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { CreatureTemplateScaling } from '../types';
import { SqlQueryBar } from '../../../components/SqlQueryBar';

interface CreatureScalingTabProps {
  creatureEntry: number;
  creature: any;
  onFieldChange?: (field: string, val: any) => void;
}

export const CreatureScalingTab: React.FC<CreatureScalingTabProps> = ({
  creatureEntry,
  creature,
  onFieldChange,
}) => {
  const [scalings, setScalings] = useState<CreatureTemplateScaling[]>([]);
  const [initialScalings, setInitialScalings] = useState<CreatureTemplateScaling[]>([]);
  const [initialCreature, setInitialCreature] = useState<any>(JSON.parse(JSON.stringify(creature || {})));
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setInitialCreature(JSON.parse(JSON.stringify(creature || {})));
    loadScalings();
  }, [creatureEntry]);

  const loadScalings = async () => {
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT Entry, DifficultyID, LevelScalingMin, LevelScalingMax, LevelScalingDeltaMin, LevelScalingDeltaMax, ContentTuningID, VerifiedBuild FROM \`creature_template_scaling\` WHERE \`Entry\` = ${creatureEntry} ORDER BY \`DifficultyID\` ASC;`
      );
      if (res && res.success && res.rows) {
        const list = res.rows.map((r: any[]) => ({
          Entry: Number(r[0]),
          DifficultyID: Number(r[1]) || 0,
          LevelScalingMin: Number(r[2]) || 0,
          LevelScalingMax: Number(r[3]) || 0,
          LevelScalingDeltaMin: Number(r[4]) || 0,
          LevelScalingDeltaMax: Number(r[5]) || 0,
          ContentTuningID: Number(r[6]) || 0,
          VerifiedBuild: Number(r[7]) || 35662,
        }));
        setScalings(list);
        setInitialScalings(JSON.parse(JSON.stringify(list)));
      } else {
        setScalings([]);
        setInitialScalings([]);
      }
      setIsDirty(false);
    } catch {
      setScalings([]);
      setInitialScalings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddScaling = () => {
    const nextDiff = scalings.length === 0 ? 0 : Math.max(...scalings.map(s => s.DifficultyID)) + 1;
    setScalings([
      ...scalings,
      {
        Entry: creatureEntry,
        DifficultyID: nextDiff,
        LevelScalingMin: 120,
        LevelScalingMax: 120,
        LevelScalingDeltaMin: 0,
        LevelScalingDeltaMax: 0,
        ContentTuningID: 0,
        VerifiedBuild: 35662,
      },
    ]);
    setIsDirty(true);
  };

  const handleUpdate = (index: number, field: keyof CreatureTemplateScaling, value: any) => {
    const updated = [...scalings];
    updated[index] = { ...updated[index], [field]: value };
    setScalings(updated);
    setIsDirty(true);
  };

  const handleRemove = (index: number) => {
    const updated = scalings.filter((_, i) => i !== index);
    setScalings(updated);
    setIsDirty(true);
  };

  const generateFullQuery = () => {
    const diffSql = `UPDATE \`creature_template\` SET
  \`difficulty_entry_1\` = ${creature.difficulty_entry_1 || 0},
  \`difficulty_entry_2\` = ${creature.difficulty_entry_2 || 0},
  \`difficulty_entry_3\` = ${creature.difficulty_entry_3 || 0}
WHERE \`entry\` = ${creatureEntry};`;

    if (scalings.length === 0) {
      return `${diffSql}
DELETE FROM \`creature_template_scaling\` WHERE \`Entry\` = ${creatureEntry};`;
    }

    const values = scalings
      .map(
        s =>
          `  (${creatureEntry}, ${s.DifficultyID}, ${s.LevelScalingMin}, ${s.LevelScalingMax}, ${s.LevelScalingDeltaMin}, ${s.LevelScalingDeltaMax}, ${s.ContentTuningID}, ${s.VerifiedBuild || 35662})`
      )
      .join(',\n');

    return `${diffSql}

DELETE FROM \`creature_template_scaling\` WHERE \`Entry\` = ${creatureEntry};
INSERT INTO \`creature_template_scaling\`
  (\`Entry\`, \`DifficultyID\`, \`LevelScalingMin\`, \`LevelScalingMax\`, \`LevelScalingDeltaMin\`, \`LevelScalingDeltaMax\`, \`ContentTuningID\`, \`VerifiedBuild\`)
VALUES
${values};`;
  };

  const generateDiffQuery = () => {
    const statements: string[] = [];

    // Check creature_template difficulty entries
    const diffChanges: string[] = [];
    if ((creature.difficulty_entry_1 || 0) !== (initialCreature.difficulty_entry_1 || 0)) {
      diffChanges.push(`\`difficulty_entry_1\` = ${creature.difficulty_entry_1 || 0}`);
    }
    if ((creature.difficulty_entry_2 || 0) !== (initialCreature.difficulty_entry_2 || 0)) {
      diffChanges.push(`\`difficulty_entry_2\` = ${creature.difficulty_entry_2 || 0}`);
    }
    if ((creature.difficulty_entry_3 || 0) !== (initialCreature.difficulty_entry_3 || 0)) {
      diffChanges.push(`\`difficulty_entry_3\` = ${creature.difficulty_entry_3 || 0}`);
    }

    if (diffChanges.length > 0) {
      statements.push(`UPDATE \`creature_template\` SET
  ${diffChanges.join(',\n  ')}
WHERE \`entry\` = ${creatureEntry};`);
    }

    // Check creature_template_scaling diff
    const initialMap = new Map(initialScalings.map(s => [s.DifficultyID, s]));
    const currentMap = new Map(scalings.map(s => [s.DifficultyID, s]));

    for (const [diffId] of initialMap) {
      if (!currentMap.has(diffId)) {
        statements.push(`DELETE FROM \`creature_template_scaling\` WHERE \`Entry\` = ${creatureEntry} AND \`DifficultyID\` = ${diffId};`);
      }
    }

    for (const [diffId, s] of currentMap) {
      const init = initialMap.get(diffId);
      if (!init) {
        statements.push(`INSERT INTO \`creature_template_scaling\` (\`Entry\`, \`DifficultyID\`, \`LevelScalingMin\`, \`LevelScalingMax\`, \`LevelScalingDeltaMin\`, \`LevelScalingDeltaMax\`, \`ContentTuningID\`, \`VerifiedBuild\`) VALUES (${creatureEntry}, ${s.DifficultyID}, ${s.LevelScalingMin}, ${s.LevelScalingMax}, ${s.LevelScalingDeltaMin}, ${s.LevelScalingDeltaMax}, ${s.ContentTuningID}, ${s.VerifiedBuild || 35662});`);
      } else {
        const isModified =
          init.LevelScalingMin !== s.LevelScalingMin ||
          init.LevelScalingMax !== s.LevelScalingMax ||
          init.LevelScalingDeltaMin !== s.LevelScalingDeltaMin ||
          init.LevelScalingDeltaMax !== s.LevelScalingDeltaMax ||
          init.ContentTuningID !== s.ContentTuningID ||
          init.VerifiedBuild !== s.VerifiedBuild;

        if (isModified) {
          statements.push(`UPDATE \`creature_template_scaling\` SET \`LevelScalingMin\` = ${s.LevelScalingMin}, \`LevelScalingMax\` = ${s.LevelScalingMax}, \`LevelScalingDeltaMin\` = ${s.LevelScalingDeltaMin}, \`LevelScalingDeltaMax\` = ${s.LevelScalingDeltaMax}, \`ContentTuningID\` = ${s.ContentTuningID}, \`VerifiedBuild\` = ${s.VerifiedBuild || 35662} WHERE \`Entry\` = ${creatureEntry} AND \`DifficultyID\` = ${diffId};`);
        }
      }
    }

    return statements.join('\n\n');
  };

  const activeQueryText = queryMode === 'diff' ? generateDiffQuery() : generateFullQuery();

  const handleCopySql = () => {
    navigator.clipboard.writeText(activeQueryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecute = async () => {
    if (!activeQueryText) return;
    setSaving(true);
    try {
      await api.executeSql('world', activeQueryText);
      setInitialScalings(JSON.parse(JSON.stringify(scalings)));
      setIsDirty(false);
    } catch (e) {
      console.error('Save scaling failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    await handleExecute();
    handleCopySql();
  };

  const handleReload = () => {
    setScalings(JSON.parse(JSON.stringify(initialScalings)));
    setIsDirty(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 font-sans select-none text-slate-800">
      {/* Top Query Action Bar */}
      <SqlQueryBar
        name="creature_scaling"
        queryMode={queryMode}
        setQueryMode={setQueryMode}
        activeQueryText={activeQueryText}
        saving={saving}
        copied={copied}
        onCopy={handleCopySql}
        onExecute={handleExecute}
        onExecuteAndCopy={handleExecuteAndCopy}
        onReload={handleReload}
      />

      {/* Header card */}
      <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base text-slate-800 font-semibold">Scaling & Difficulty Entries</h2>
          <p className="text-xs text-slate-500 font-mono">
            Tables: <code className="text-blue-600 font-bold">creature_template_scaling</code> & <code className="text-blue-600 font-bold">creature_template.difficulty_entry_1-3</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddScaling}
            className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Difficulty Scaling</span>
          </button>
        </div>
      </div>

      {/* Difficulty Entries (Template Links) */}
      <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Difficulty Creature Template Overrides</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Difficulty Entry 1 (Heroic/Dungeon)</label>
            <input
              type="number"
              value={creature.difficulty_entry_1 || 0}
              onChange={(e) => {
                if (onFieldChange) onFieldChange('difficulty_entry_1', Number(e.target.value) || 0);
                setIsDirty(true);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Difficulty Entry 2 (Mythic/Raid)</label>
            <input
              type="number"
              value={creature.difficulty_entry_2 || 0}
              onChange={(e) => {
                if (onFieldChange) onFieldChange('difficulty_entry_2', Number(e.target.value) || 0);
                setIsDirty(true);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Difficulty Entry 3 (LFR/Alternate)</label>
            <input
              type="number"
              value={creature.difficulty_entry_3 || 0}
              onChange={(e) => {
                if (onFieldChange) onFieldChange('difficulty_entry_3', Number(e.target.value) || 0);
                setIsDirty(true);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Dynamic Scaling Table */}
      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded p-8 text-center text-slate-500 text-sm">
          Loading scaling records...
        </div>
      ) : scalings.length === 0 ? (
        <div className="w-full space-y-3 pt-1">
          <div className="w-full bg-[#F1F3F5] border border-[#E2E8F0] rounded py-3 text-center text-[13px] text-slate-700 font-sans shadow-2xs">
            No dynamic level scaling records configured for creature {creatureEntry}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Difficulty ID</th>
                <th className="py-2.5 px-3">Scaling Min</th>
                <th className="py-2.5 px-3">Scaling Max</th>
                <th className="py-2.5 px-3">Delta Min</th>
                <th className="py-2.5 px-3">Delta Max</th>
                <th className="py-2.5 px-3">Content Tuning ID</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {scalings.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={s.DifficultyID}
                      onChange={(e) => handleUpdate(idx, 'DifficultyID', Number(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={s.LevelScalingMin}
                      onChange={(e) => handleUpdate(idx, 'LevelScalingMin', Number(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={s.LevelScalingMax}
                      onChange={(e) => handleUpdate(idx, 'LevelScalingMax', Number(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={s.LevelScalingDeltaMin}
                      onChange={(e) => handleUpdate(idx, 'LevelScalingDeltaMin', Number(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={s.LevelScalingDeltaMax}
                      onChange={(e) => handleUpdate(idx, 'LevelScalingDeltaMax', Number(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={s.ContentTuningID}
                      onChange={(e) => handleUpdate(idx, 'ContentTuningID', Number(e.target.value) || 0)}
                      className="w-28 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="text-red-500 hover:text-red-700 p-1 rounded transition-colors cursor-pointer"
                      title="Remove scaling"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
