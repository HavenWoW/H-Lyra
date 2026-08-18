// Editor for creature: world spawns, giving each one a position, map and respawn
// timer.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Copy, Check } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { SqlQueryBar } from '../../../components/SqlQueryBar';

export interface CreatureSpawnRow {
  guid: number;
  id: number;
  map: number;
  zoneId: number;
  areaId: number;
  position_x: number;
  position_y: number;
  position_z: number;
  orientation: number;
  spawntimesecs: number;
  spawndist: number;
  curhealth: number;
  curmana: number;
  MovementType: number;
  VerifiedBuild?: number;
}

interface CreatureSpawnsTabProps {
  creatureEntry: number;
}

export const CreatureSpawnsTab: React.FC<CreatureSpawnsTabProps> = ({ creatureEntry }) => {
  const [spawns, setSpawns] = useState<CreatureSpawnRow[]>([]);
  const [initialSpawns, setInitialSpawns] = useState<CreatureSpawnRow[]>([]);
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    loadSpawns();
  }, [creatureEntry]);

  const loadSpawns = async () => {
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT guid, id, map, zoneId, areaId, position_x, position_y, position_z, orientation, spawntimesecs, spawndist, curhealth, curmana, MovementType, VerifiedBuild FROM \`creature\` WHERE \`id\` = ${creatureEntry} ORDER BY \`guid\` ASC LIMIT 100;`
      );
      if (res && res.success && res.rows) {
        const list = res.rows.map((r: any[]) => ({
          guid: Number(r[0]),
          id: Number(r[1]) || creatureEntry,
          map: Number(r[2]) || 0,
          zoneId: Number(r[3]) || 0,
          areaId: Number(r[4]) || 0,
          position_x: Number(r[5]) || 0,
          position_y: Number(r[6]) || 0,
          position_z: Number(r[7]) || 0,
          orientation: Number(r[8]) || 0,
          spawntimesecs: Number(r[9]) || 120,
          spawndist: Number(r[10]) || 0,
          curhealth: Number(r[11]) || 1,
          curmana: Number(r[12]) || 0,
          MovementType: Number(r[13]) || 0,
          VerifiedBuild: Number(r[14]) || 35662,
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
    const randomGuid = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
    setSpawns([
      ...spawns,
      {
        guid: randomGuid,
        id: creatureEntry,
        map: 0,
        zoneId: 0,
        areaId: 0,
        position_x: 0,
        position_y: 0,
        position_z: 0,
        orientation: 0,
        spawntimesecs: 120,
        spawndist: 0,
        curhealth: 1,
        curmana: 0,
        MovementType: 0,
        VerifiedBuild: 35662,
      },
    ]);
    setIsDirty(true);
  };

  const handleUpdate = (index: number, field: keyof CreatureSpawnRow, value: any) => {
    const updated = [...spawns];
    updated[index] = { ...updated[index], [field]: value };
    setSpawns(updated);
    setIsDirty(true);
  };

  const handleRemove = (index: number) => {
    setSpawns(spawns.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const generateFullQuery = () => {
    if (spawns.length === 0) {
      return `DELETE FROM \`creature\` WHERE \`id\` = ${creatureEntry};`;
    }

    const values = spawns
      .map(
        s =>
          `  (${s.guid}, ${creatureEntry}, ${s.map || 0}, ${s.zoneId || 0}, ${s.areaId || 0}, '0', 0, 0, 0, -1, 0, 0, ${s.position_x || 0}, ${s.position_y || 0}, ${s.position_z || 0}, ${s.orientation || 0}, ${s.spawntimesecs || 120}, ${s.spawndist || 0}, 0, ${s.curhealth || 1}, ${s.curmana || 0}, ${s.MovementType || 0}, 0, 0, 0, 0, 0, '', ${s.VerifiedBuild || 35662})`
      )
      .join(',\n');

    return `DELETE FROM \`creature\` WHERE \`id\` = ${creatureEntry};
INSERT INTO \`creature\`
  (\`guid\`, \`id\`, \`map\`, \`zoneId\`, \`areaId\`, \`spawnDifficulties\`, \`phaseUseFlags\`, \`PhaseId\`, \`PhaseGroup\`, \`terrainSwapMap\`, \`modelid\`, \`equipment_id\`, \`position_x\`, \`position_y\`, \`position_z\`, \`orientation\`, \`spawntimesecs\`, \`spawndist\`, \`currentwaypoint\`, \`curhealth\`, \`curmana\`, \`MovementType\`, \`npcflag\`, \`unit_flags\`, \`unit_flags2\`, \`unit_flags3\`, \`dynamicflags\`, \`ScriptName\`, \`VerifiedBuild\`)
VALUES
${values};`;
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
      {/* Top Query Action Bar */}
      <SqlQueryBar
        name="creature_spawns"
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
          <h2 className="text-base text-slate-800 font-semibold">Creature World Spawns</h2>
          <p className="text-xs text-slate-500 font-mono">
            Table: <code className="text-blue-600 font-bold">creature</code> (id: {creatureEntry})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddSpawn}
            className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add World Spawn</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded p-8 text-center text-slate-500 text-sm">
          Loading creature spawns...
        </div>
      ) : spawns.length === 0 ? (
        <div className="w-full space-y-3 pt-1">
          <div className="w-full bg-[#F1F3F5] border border-[#E2E8F0] rounded py-3 text-center text-[13px] text-slate-700 font-sans shadow-2xs">
            No world spawns registered for creature {creatureEntry}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3 w-28">GUID</th>
                <th className="py-2.5 px-3 w-16">Map</th>
                <th className="py-2.5 px-3 w-24">Pos X</th>
                <th className="py-2.5 px-3 w-24">Pos Y</th>
                <th className="py-2.5 px-3 w-24">Pos Z</th>
                <th className="py-2.5 px-3 w-20">Orientation</th>
                <th className="py-2.5 px-3 w-20">Respawn (s)</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {spawns.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={s.guid}
                      onChange={(e) => handleUpdate(idx, 'guid', Number(e.target.value) || 0)}
                      className="w-24 px-1.5 py-1 border border-slate-300 rounded font-bold text-blue-600 focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={s.map}
                      onChange={(e) => handleUpdate(idx, 'map', Number(e.target.value) || 0)}
                      className="w-14 px-1.5 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="0.01"
                      value={s.position_x}
                      onChange={(e) => handleUpdate(idx, 'position_x', parseFloat(e.target.value) || 0)}
                      className="w-20 px-1.5 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="0.01"
                      value={s.position_y}
                      onChange={(e) => handleUpdate(idx, 'position_y', parseFloat(e.target.value) || 0)}
                      className="w-20 px-1.5 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="0.01"
                      value={s.position_z}
                      onChange={(e) => handleUpdate(idx, 'position_z', parseFloat(e.target.value) || 0)}
                      className="w-20 px-1.5 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="0.01"
                      value={s.orientation}
                      onChange={(e) => handleUpdate(idx, 'orientation', parseFloat(e.target.value) || 0)}
                      className="w-16 px-1.5 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={s.spawntimesecs}
                      onChange={(e) => handleUpdate(idx, 'spawntimesecs', Number(e.target.value) || 120)}
                      className="w-16 px-1.5 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
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

export default CreatureSpawnsTab;
