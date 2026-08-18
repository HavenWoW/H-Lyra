// Editor for creature_trainer: which trainer list the creature offers.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { CreatureTrainerItem } from '../types';
import { SqlQueryBar } from '../../../components/SqlQueryBar';

interface CreatureTrainerTabProps {
  creatureEntry: number;
}

export const CreatureTrainerTab: React.FC<CreatureTrainerTabProps> = ({ creatureEntry }) => {
  const [trainers, setTrainers] = useState<CreatureTrainerItem[]>([]);
  const [initialTrainers, setInitialTrainers] = useState<CreatureTrainerItem[]>([]);
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    loadTrainerInfo();
  }, [creatureEntry]);

  const loadTrainerInfo = async () => {
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT CreatureId, TrainerId, MenuId, OptionIndex FROM \`creature_trainer\` WHERE \`CreatureId\` = ${creatureEntry};`
      );
      if (res && res.success && res.rows) {
        const list = res.rows.map((r: any[]) => ({
          CreatureId: Number(r[0]),
          TrainerId: Number(r[1]) || 0,
          MenuId: Number(r[2]) || 0,
          OptionIndex: Number(r[3]) || 0,
        }));
        setTrainers(list);
        setInitialTrainers(JSON.parse(JSON.stringify(list)));
      } else {
        setTrainers([]);
        setInitialTrainers([]);
      }
      setIsDirty(false);
    } catch {
      setTrainers([]);
      setInitialTrainers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setTrainers([
      ...trainers,
      {
        CreatureId: creatureEntry,
        TrainerId: 0,
        MenuId: 0,
        OptionIndex: 0,
      },
    ]);
    setIsDirty(true);
  };

  const handleUpdate = (index: number, field: keyof CreatureTrainerItem, value: any) => {
    const updated = [...trainers];
    updated[index] = { ...updated[index], [field]: value };
    setTrainers(updated);
    setIsDirty(true);
  };

  const handleRemove = (index: number) => {
    setTrainers(trainers.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const generateFullQuery = () => {
    if (trainers.length === 0) {
      return `DELETE FROM \`creature_trainer\` WHERE \`CreatureId\` = ${creatureEntry};`;
    }

    const values = trainers
      .map(t => `  (${creatureEntry}, ${t.TrainerId || 0}, ${t.MenuId || 0}, ${t.OptionIndex || 0})`)
      .join(',\n');

    return `DELETE FROM \`creature_trainer\` WHERE \`CreatureId\` = ${creatureEntry};
INSERT INTO \`creature_trainer\`
  (\`CreatureId\`, \`TrainerId\`, \`MenuId\`, \`OptionIndex\`)
VALUES
${values};`;
  };

  const generateDiffQuery = () => {
    const statements: string[] = [];
    const initialMap = new Map(initialTrainers.map(t => [t.TrainerId, t]));
    const currentMap = new Map(trainers.map(t => [t.TrainerId, t]));

    for (const [trainerId] of initialMap) {
      if (!currentMap.has(trainerId)) {
        statements.push(`DELETE FROM \`creature_trainer\` WHERE \`CreatureId\` = ${creatureEntry} AND \`TrainerId\` = ${trainerId};`);
      }
    }

    for (const [trainerId, t] of currentMap) {
      const init = initialMap.get(trainerId);
      if (!init) {
        statements.push(`INSERT INTO \`creature_trainer\` (\`CreatureId\`, \`TrainerId\`, \`MenuId\`, \`OptionIndex\`) VALUES (${creatureEntry}, ${t.TrainerId || 0}, ${t.MenuId || 0}, ${t.OptionIndex || 0});`);
      } else {
        const isModified =
          init.MenuId !== t.MenuId ||
          init.OptionIndex !== t.OptionIndex;

        if (isModified) {
          statements.push(`UPDATE \`creature_trainer\` SET \`MenuId\` = ${t.MenuId || 0}, \`OptionIndex\` = ${t.OptionIndex || 0} WHERE \`CreatureId\` = ${creatureEntry} AND \`TrainerId\` = ${trainerId};`);
        }
      }
    }

    return statements.join('\n');
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
      setInitialTrainers(JSON.parse(JSON.stringify(trainers)));
      setIsDirty(false);
    } catch (e) {
      console.error('Save trainers failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    await handleExecute();
    handleCopySql();
  };

  const handleReload = () => {
    setTrainers(JSON.parse(JSON.stringify(initialTrainers)));
    setIsDirty(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 font-sans select-none text-slate-800">
      {/* Top Query Action Bar */}
      <SqlQueryBar
        name="creature_trainer"
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
          <h2 className="text-base text-slate-800 font-semibold">Trainer Spells & Specs</h2>
          <p className="text-xs text-slate-500 font-mono">
            Table: <code className="text-blue-600 font-bold">creature_trainer</code> (CreatureID: {creatureEntry})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAdd}
            className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Trainer Spell</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded p-8 text-center text-slate-500 text-sm">
          Loading trainer links...
        </div>
      ) : trainers.length === 0 ? (
        <div className="w-full space-y-3 pt-1">
          <div className="w-full bg-[#F1F3F5] border border-[#E2E8F0] rounded py-3 text-center text-[13px] text-slate-700 font-sans shadow-2xs">
            No trainer menus or spells linked to creature {creatureEntry}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Trainer ID</th>
                <th className="py-2.5 px-3">Gossip Menu ID</th>
                <th className="py-2.5 px-3">Option Index</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {trainers.map((t, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={t.TrainerId}
                      onChange={(e) => handleUpdate(idx, 'TrainerId', Number(e.target.value) || 0)}
                      className="w-32 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs font-bold text-blue-600"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={t.MenuId}
                      onChange={(e) => handleUpdate(idx, 'MenuId', Number(e.target.value) || 0)}
                      className="w-32 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={t.OptionIndex}
                      onChange={(e) => handleUpdate(idx, 'OptionIndex', Number(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="text-red-500 hover:text-red-700 p-1 rounded transition-colors cursor-pointer"
                      title="Remove trainer link"
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
