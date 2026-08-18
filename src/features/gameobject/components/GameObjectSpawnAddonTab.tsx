// Editor for gameobject_addon: per-spawn addon for one guid.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Copy, Check } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { GameObjectSpawnAddonRow } from '../types';

import { SqlQueryBar } from '../../../components/SqlQueryBar';

interface GameObjectSpawnAddonTabProps {
  goEntry: number;
}

export const GameObjectSpawnAddonTab: React.FC<GameObjectSpawnAddonTabProps> = ({ goEntry }) => {
  const [addons, setAddons] = useState<GameObjectSpawnAddonRow[]>([]);
  const [initialAddons, setInitialAddons] = useState<GameObjectSpawnAddonRow[]>([]);
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    loadSpawnAddons();
  }, [goEntry]);

  const loadSpawnAddons = async () => {
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT a.guid, a.parent_rotation0, a.parent_rotation1, a.parent_rotation2, a.parent_rotation3, a.invisibilityType, a.invisibilityValue, a.WorldEffectID FROM \`gameobject_addon\` a INNER JOIN \`gameobject\` g ON a.guid = g.guid WHERE g.id = ${goEntry} LIMIT 50;`
      );
      if (res && res.success && res.rows) {
        const list = res.rows.map((r: any[]) => ({
          guid: Number(r[0]),
          parent_rotation0: Number(r[1]) || 0,
          parent_rotation1: Number(r[2]) || 0,
          parent_rotation2: Number(r[3]) || 0,
          parent_rotation3: Number(r[4]) || 1,
          invisibilityType: Number(r[5]) || 0,
          invisibilityValue: Number(r[6]) || 0,
          WorldEffectID: Number(r[7]) || 0,
        }));
        setAddons(list);
        setInitialAddons(JSON.parse(JSON.stringify(list)));
      } else {
        setAddons([]);
        setInitialAddons([]);
      }
      setIsDirty(false);
    } catch {
      setAddons([]);
      setInitialAddons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    const tempGuid = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
    setAddons([
      ...addons,
      {
        guid: tempGuid,
        parent_rotation0: 0,
        parent_rotation1: 0,
        parent_rotation2: 0,
        parent_rotation3: 1,
        invisibilityType: 0,
        invisibilityValue: 0,
        WorldEffectID: 0,
      },
    ]);
    setIsDirty(true);
  };

  const handleRemove = (guid: number) => {
    setAddons(addons.filter((a) => a.guid !== guid));
    setIsDirty(true);
  };

  const handleChange = (guid: number, field: keyof GameObjectSpawnAddonRow, value: any) => {
    setAddons(addons.map((a) => (a.guid === guid ? { ...a, [field]: value } : a)));
    setIsDirty(true);
  };

  const generateFullQuery = () => {
    if (addons.length === 0) return `-- No spawn addons for GameObject ${goEntry}`;
    const inserts = addons
      .map(
        (a) =>
          `(${a.guid}, ${a.parent_rotation0}, ${a.parent_rotation1}, ${a.parent_rotation2}, ${a.parent_rotation3}, ${a.invisibilityType}, ${a.invisibilityValue}, ${a.WorldEffectID})`
      )
      .join(',\n  ');
    const guids = addons.map((a) => a.guid).join(',');
    return `DELETE FROM \`gameobject_addon\` WHERE \`guid\` IN (${guids});
INSERT INTO \`gameobject_addon\` (\`guid\`, \`parent_rotation0\`, \`parent_rotation1\`, \`parent_rotation2\`, \`parent_rotation3\`, \`invisibilityType\`, \`invisibilityValue\`, \`WorldEffectID\`) VALUES
  ${inserts};`;
  };

  // The collection is written as a scoped DELETE + INSERT, so the diff statement
  // is the same replace. It is only emitted once something has actually changed,
  // leaving the diff query empty for an untouched tab.
  const activeQueryText = queryMode === 'diff' && !isDirty ? '' : generateFullQuery();

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
      setInitialAddons(JSON.parse(JSON.stringify(addons)));
      setIsDirty(false);
    } catch (e) {
      console.error('Save spawn addons failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    await handleExecute();
    handleCopySql();
  };

  const handleReload = () => {
    setAddons(JSON.parse(JSON.stringify(initialAddons)));
    setIsDirty(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 font-sans select-none text-slate-800">
      <SqlQueryBar
        name="game_object_spawn_addon"
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

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Spawn Addon Properties</h2>
            <p className="text-xs text-slate-500 font-mono">bfa_world.gameobject_addon [GameObject ID: {goEntry}]</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAdd}
              className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Spawn Addon</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading spawn addons...</div>
        ) : addons.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-slate-500">No spawn addon records configured for this GameObject.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="py-2 px-3 w-28">GUID</th>
                  <th className="py-2 px-3 w-24">Rot0</th>
                  <th className="py-2 px-3 w-24">Rot1</th>
                  <th className="py-2 px-3 w-24">Rot2</th>
                  <th className="py-2 px-3 w-24">Rot3</th>
                  <th className="py-2 px-3 w-24">InvisType</th>
                  <th className="py-2 px-3 w-24">InvisVal</th>
                  <th className="py-2 px-3 w-28">WorldEffectID</th>
                  <th className="py-2 px-3 w-16 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {addons.map((a) => (
                  <tr key={a.guid} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono text-slate-500">{a.guid}</td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={a.parent_rotation0}
                        onChange={(e) => handleChange(a.guid, 'parent_rotation0', Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={a.parent_rotation1}
                        onChange={(e) => handleChange(a.guid, 'parent_rotation1', Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={a.parent_rotation2}
                        onChange={(e) => handleChange(a.guid, 'parent_rotation2', Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={a.parent_rotation3}
                        onChange={(e) => handleChange(a.guid, 'parent_rotation3', Number(e.target.value) || 1)}
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={a.invisibilityType}
                        onChange={(e) => handleChange(a.guid, 'invisibilityType', Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={a.invisibilityValue}
                        onChange={(e) => handleChange(a.guid, 'invisibilityValue', Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={a.WorldEffectID}
                        onChange={(e) => handleChange(a.guid, 'WorldEffectID', Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemove(a.guid)}
                        className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 cursor-pointer"
                        title="Remove Spawn Addon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
