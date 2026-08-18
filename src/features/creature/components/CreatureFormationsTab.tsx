// Editor for creature_formations: group movement, giving each member a leader, a
// follow distance and an angle.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Copy, Check } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { CreatureFormationRow } from '../types';

import { SqlQueryBar } from '../../../components/SqlQueryBar';

interface CreatureFormationsTabProps {
  creatureEntry: number;
}

export const CreatureFormationsTab: React.FC<CreatureFormationsTabProps> = ({ creatureEntry }) => {
  const [formations, setFormations] = useState<CreatureFormationRow[]>([]);
  const [initialFormations, setInitialFormations] = useState<CreatureFormationRow[]>([]);
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    loadFormations();
  }, [creatureEntry]);

  const loadFormations = async () => {
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT cf.leaderGUID, cf.memberGUID, cf.dist, cf.angle, cf.groupAI, cf.point_1, cf.point_2 FROM \`creature_formations\` cf JOIN \`creature\` c ON (cf.leaderGUID = c.guid OR cf.memberGUID = c.guid) WHERE c.id = ${creatureEntry} LIMIT 50;`
      );
      if (res && res.success && res.rows) {
        const list = res.rows.map((r: any[]) => ({
          leaderGUID: Number(r[0]),
          memberGUID: Number(r[1]) || 0,
          dist: Number(r[2]) || 0,
          angle: Number(r[3]) || 0,
          groupAI: Number(r[4]) || 0,
          point_1: Number(r[5]) || 0,
          point_2: Number(r[6]) || 0,
        }));
        setFormations(list);
        setInitialFormations(JSON.parse(JSON.stringify(list)));
      } else {
        setFormations([]);
        setInitialFormations([]);
      }
      setIsDirty(false);
    } catch {
      setFormations([]);
      setInitialFormations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormations([
      ...formations,
      {
        leaderGUID: 0,
        memberGUID: 0,
        dist: 5.0,
        angle: 0,
        groupAI: 0,
        point_1: 0,
        point_2: 0,
      },
    ]);
    setIsDirty(true);
  };

  const handleUpdate = (index: number, field: keyof CreatureFormationRow, value: any) => {
    const updated = [...formations];
    updated[index] = { ...updated[index], [field]: value };
    setFormations(updated);
    setIsDirty(true);
  };

  const handleRemove = (index: number) => {
    setFormations(formations.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const generateFullQuery = () => {
    if (formations.length === 0) {
      return '';
    }

    const queries = formations.map(
      f => `DELETE FROM \`creature_formations\` WHERE \`memberGUID\` = ${f.memberGUID};
INSERT INTO \`creature_formations\` (\`leaderGUID\`, \`memberGUID\`, \`dist\`, \`angle\`, \`groupAI\`, \`point_1\`, \`point_2\`)
VALUES (${f.leaderGUID}, ${f.memberGUID}, ${f.dist}, ${f.angle}, ${f.groupAI}, ${f.point_1}, ${f.point_2});`
    );

    return queries.join('\n\n');
  };

  const generateDiffQuery = () => {
    const statements: string[] = [];
    const initialMap = new Map(initialFormations.map(f => [f.memberGUID, f]));
    const currentMap = new Map(formations.map(f => [f.memberGUID, f]));

    for (const [memberGUID] of initialMap) {
      if (!currentMap.has(memberGUID)) {
        statements.push(`DELETE FROM \`creature_formations\` WHERE \`memberGUID\` = ${memberGUID};`);
      }
    }

    for (const [memberGUID, f] of currentMap) {
      const init = initialMap.get(memberGUID);
      if (!init) {
        statements.push(`INSERT INTO \`creature_formations\` (\`leaderGUID\`, \`memberGUID\`, \`dist\`, \`angle\`, \`groupAI\`, \`point_1\`, \`point_2\`) VALUES (${f.leaderGUID}, ${f.memberGUID}, ${f.dist}, ${f.angle}, ${f.groupAI}, ${f.point_1}, ${f.point_2});`);
      } else {
        const isModified =
          init.leaderGUID !== f.leaderGUID ||
          init.dist !== f.dist ||
          init.angle !== f.angle ||
          init.groupAI !== f.groupAI ||
          init.point_1 !== f.point_1 ||
          init.point_2 !== f.point_2;

        if (isModified) {
          statements.push(`UPDATE \`creature_formations\` SET \`leaderGUID\` = ${f.leaderGUID}, \`dist\` = ${f.dist}, \`angle\` = ${f.angle}, \`groupAI\` = ${f.groupAI}, \`point_1\` = ${f.point_1}, \`point_2\` = ${f.point_2} WHERE \`memberGUID\` = ${memberGUID};`);
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
      setInitialFormations(JSON.parse(JSON.stringify(formations)));
      setIsDirty(false);
    } catch (e) {
      console.error('Save formations failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    await handleExecute();
    handleCopySql();
  };

  const handleReload = () => {
    setFormations(JSON.parse(JSON.stringify(initialFormations)));
    setIsDirty(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 font-sans select-none text-slate-800">
      {/* Top Query Action Bar */}
      <SqlQueryBar
        name="creature_formations"
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
          <h2 className="text-base text-slate-800 font-semibold">Formations</h2>
          <p className="text-xs text-slate-500 font-mono">
            Table: <code className="text-blue-600 font-bold">creature_formations</code> (GUID Linked)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAdd}
            className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Formation Link</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded p-8 text-center text-slate-500 text-sm">
          Loading formations...
        </div>
      ) : formations.length === 0 ? (
        <div className="w-full space-y-3 pt-1">
          <div className="w-full bg-[#F1F3F5] border border-[#E2E8F0] rounded py-3 text-center text-[13px] text-slate-700 font-sans shadow-2xs">
            No active formation pairs linked to creature {creatureEntry} spawns
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Leader GUID</th>
                <th className="py-2.5 px-3">Member GUID</th>
                <th className="py-2.5 px-3">Distance</th>
                <th className="py-2.5 px-3">Angle</th>
                <th className="py-2.5 px-3">Group AI</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {formations.map((f, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={f.leaderGUID}
                      onChange={(e) => handleUpdate(idx, 'leaderGUID', Number(e.target.value) || 0)}
                      className="w-32 px-2 py-1 border border-slate-300 rounded font-bold text-blue-600 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={f.memberGUID}
                      onChange={(e) => handleUpdate(idx, 'memberGUID', Number(e.target.value) || 0)}
                      className="w-32 px-2 py-1 border border-slate-300 rounded font-bold text-slate-700 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={f.dist}
                      step="0.5"
                      onChange={(e) => handleUpdate(idx, 'dist', Number(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-slate-300 rounded text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={f.angle}
                      step="0.1"
                      onChange={(e) => handleUpdate(idx, 'angle', Number(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-slate-300 rounded text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={f.groupAI}
                      onChange={(e) => handleUpdate(idx, 'groupAI', Number(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-slate-300 rounded text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="text-red-500 hover:text-red-700 p-1 rounded transition-colors cursor-pointer"
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
