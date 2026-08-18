// Editor for gameobject: world spawns, giving each one a position, map and
// respawn timer.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Copy, Check } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { GameObjectSpawnRow } from '../types';
import { SqlQueryBar } from '../../../components/SqlQueryBar';

interface GameObjectSpawnsTabProps {
  goEntry: number;
}

export const GameObjectSpawnsTab: React.FC<GameObjectSpawnsTabProps> = ({ goEntry }) => {
  const [spawns, setSpawns] = useState<GameObjectSpawnRow[]>([]);
  const [initialSpawns, setInitialSpawns] = useState<GameObjectSpawnRow[]>([]);
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    loadSpawns();
  }, [goEntry]);

  const loadSpawns = async () => {
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT guid, id, map, position_x, position_y, position_z, orientation, rotation0, rotation1, rotation2, rotation3, spawntimesecs, animprogress, state FROM \`gameobject\` WHERE \`id\` = ${goEntry} LIMIT 50;`
      );
      if (res && res.success && res.rows) {
        const list = res.rows.map((r: any[]) => ({
          guid: Number(r[0]),
          id: Number(r[1]),
          map: Number(r[2]) || 0,
          position_x: Number(r[3]) || 0,
          position_y: Number(r[4]) || 0,
          position_z: Number(r[5]) || 0,
          orientation: Number(r[6]) || 0,
          rotation0: Number(r[7]) || 0,
          rotation1: Number(r[8]) || 0,
          rotation2: Number(r[9]) || 0,
          rotation3: Number(r[10]) || 1,
          spawntimesecs: Number(r[11]) || 300,
          animprogress: Number(r[12]) || 0,
          state: Number(r[13]) || 1,
        }));
        setSpawns(list);
        setInitialSpawns(JSON.parse(JSON.stringify(list)));
      } else {
        setSpawns([]);
        setInitialSpawns([]);
      }
      setIsDirty(false);
    } catch {
      setSpawns([]);
      setInitialSpawns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSpawn = () => {
    const tempGuid = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
    setSpawns([
      ...spawns,
      {
        guid: tempGuid,
        id: goEntry,
        map: 0,
        position_x: 0,
        position_y: 0,
        position_z: 0,
        orientation: 0,
        rotation0: 0,
        rotation1: 0,
        rotation2: 0,
        rotation3: 1,
        spawntimesecs: 300,
        animprogress: 0,
        state: 1,
      },
    ]);
    setIsDirty(true);
  };

  const handleRemoveSpawn = (guid: number) => {
    setSpawns(spawns.filter((s) => s.guid !== guid));
    setIsDirty(true);
  };

  const handleChangeSpawn = (guid: number, field: keyof GameObjectSpawnRow, value: any) => {
    setSpawns(spawns.map((s) => (s.guid === guid ? { ...s, [field]: value } : s)));
    setIsDirty(true);
  };

  const generateFullQuery = () => {
    if (spawns.length === 0) return `DELETE FROM \`gameobject\` WHERE \`id\` = ${goEntry};`;
    const inserts = spawns
      .map(
        (s) =>
          `(${s.guid}, ${goEntry}, ${s.map}, ${s.position_x}, ${s.position_y}, ${s.position_z}, ${s.orientation}, ${s.rotation0}, ${s.rotation1}, ${s.rotation2}, ${s.rotation3}, ${s.spawntimesecs}, ${s.animprogress}, ${s.state})`
      )
      .join(',\n  ');
    return `DELETE FROM \`gameobject\` WHERE \`id\` = ${goEntry};
INSERT INTO \`gameobject\` (\`guid\`, \`id\`, \`map\`, \`position_x\`, \`position_y\`, \`position_z\`, \`orientation\`, \`rotation0\`, \`rotation1\`, \`rotation2\`, \`rotation3\`, \`spawntimesecs\`, \`animprogress\`, \`state\`) VALUES
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
      setInitialSpawns(JSON.parse(JSON.stringify(spawns)));
      setIsDirty(false);
    } catch (e) {
      console.error('Save spawns failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    await handleExecute();
    handleCopySql();
  };

  const handleReload = () => {
    setSpawns(JSON.parse(JSON.stringify(initialSpawns)));
    setIsDirty(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 font-sans select-none text-slate-800">
      <SqlQueryBar
        name="game_object_spawns"
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
            <h2 className="text-sm font-bold text-slate-800">World Spawns (gameobject)</h2>
            <p className="text-xs text-slate-500 font-mono">bfa_world.gameobject [id: {goEntry}]</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddSpawn}
              className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Spawn</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading spawns...</div>
        ) : spawns.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-slate-500">No world spawns placed for this GameObject.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="py-2 px-3 w-24">GUID</th>
                  <th className="py-2 px-3 w-20">Map</th>
                  <th className="py-2 px-3 w-28">Pos X</th>
                  <th className="py-2 px-3 w-28">Pos Y</th>
                  <th className="py-2 px-3 w-28">Pos Z</th>
                  <th className="py-2 px-3 w-24">Orientation</th>
                  <th className="py-2 px-3 w-24">SpawnTime</th>
                  <th className="py-2 px-3 w-20">State</th>
                  <th className="py-2 px-3 w-16 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {spawns.map((s) => (
                  <tr key={s.guid} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono text-slate-500">{s.guid}</td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={s.map}
                        onChange={(e) => handleChangeSpawn(s.guid, 'map', Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={s.position_x}
                        onChange={(e) => handleChangeSpawn(s.guid, 'position_x', Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={s.position_y}
                        onChange={(e) => handleChangeSpawn(s.guid, 'position_y', Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={s.position_z}
                        onChange={(e) => handleChangeSpawn(s.guid, 'position_z', Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={s.orientation}
                        onChange={(e) => handleChangeSpawn(s.guid, 'orientation', Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={s.spawntimesecs}
                        onChange={(e) => handleChangeSpawn(s.guid, 'spawntimesecs', Number(e.target.value) || 300)}
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={s.state}
                        onChange={(e) => handleChangeSpawn(s.guid, 'state', Number(e.target.value) || 1)}
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveSpawn(s.guid)}
                        className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 cursor-pointer"
                        title="Remove Spawn"
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
