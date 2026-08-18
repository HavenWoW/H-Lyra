// Editor for creature_addon: per-spawn addon, overriding the template addon for
// one guid.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Copy, Check } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { CreatureSpawnAddon } from '../types';
import { SqlQueryBar } from '../../../components/SqlQueryBar';
import { quoteSqlString } from '../../../lib/sql';

interface CreatureSpawnAddonTabProps {
  creatureEntry: number;
}

export const CreatureSpawnAddonTab: React.FC<CreatureSpawnAddonTabProps> = ({ creatureEntry }) => {
  const [spawnAddons, setSpawnAddons] = useState<CreatureSpawnAddon[]>([]);
  const [initialSpawnAddons, setInitialSpawnAddons] = useState<CreatureSpawnAddon[]>([]);
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    loadSpawnAddons();
  }, [creatureEntry]);

  const loadSpawnAddons = async () => {
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT ca.guid, ca.path_id, ca.mount, ca.bytes1, ca.bytes2, ca.emote, ca.aiAnimKit, ca.movementAnimKit, ca.meleeAnimKit, ca.visibilityDistanceType, ca.auras FROM \`creature_addon\` ca JOIN \`creature\` c ON ca.guid = c.guid WHERE c.id = ${creatureEntry} LIMIT 50;`
      );
      if (res && res.success && res.rows) {
        const list = res.rows.map((r: any[]) => ({
          guid: Number(r[0]),
          path_id: Number(r[1]) || 0,
          mount: Number(r[2]) || 0,
          bytes1: Number(r[3]) || 0,
          bytes2: Number(r[4]) || 0,
          emote: Number(r[5]) || 0,
          aiAnimKit: Number(r[6]) || 0,
          movementAnimKit: Number(r[7]) || 0,
          meleeAnimKit: Number(r[8]) || 0,
          visibilityDistanceType: Number(r[9]) || 0,
          auras: r[10] ? String(r[10]) : '',
        }));
        setSpawnAddons(list);
        setInitialSpawnAddons(JSON.parse(JSON.stringify(list)));
      } else {
        setSpawnAddons([]);
        setInitialSpawnAddons([]);
      }
      setIsDirty(false);
    } catch {
      setSpawnAddons([]);
      setInitialSpawnAddons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (index: number, field: keyof CreatureSpawnAddon, value: any) => {
    const updated = [...spawnAddons];
    updated[index] = { ...updated[index], [field]: value };
    setSpawnAddons(updated);
    setIsDirty(true);
  };

  const handleRemove = (index: number) => {
    setSpawnAddons(spawnAddons.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const generateFullQuery = () => {
    if (spawnAddons.length === 0) {
      return '';
    }

    const queries = spawnAddons.map(sa => {
      const safeAuras = sa.auras ? quoteSqlString(sa.auras) : 'NULL';
      return `DELETE FROM \`creature_addon\` WHERE \`guid\` = ${sa.guid};
INSERT INTO \`creature_addon\`
  (\`guid\`, \`path_id\`, \`mount\`, \`bytes1\`, \`bytes2\`, \`emote\`, \`aiAnimKit\`, \`movementAnimKit\`, \`meleeAnimKit\`, \`visibilityDistanceType\`, \`auras\`)
VALUES
  (${sa.guid}, ${sa.path_id || 0}, ${sa.mount || 0}, ${sa.bytes1 || 0}, ${sa.bytes2 || 0}, ${sa.emote || 0}, ${sa.aiAnimKit || 0}, ${sa.movementAnimKit || 0}, ${sa.meleeAnimKit || 0}, ${sa.visibilityDistanceType || 0}, ${safeAuras});`;
    });

    return queries.join('\n\n');
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
      setInitialSpawnAddons(JSON.parse(JSON.stringify(spawnAddons)));
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
    setSpawnAddons(JSON.parse(JSON.stringify(initialSpawnAddons)));
    setIsDirty(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 font-sans select-none text-slate-800">
      {/* Top Query Action Bar */}
      <SqlQueryBar
        name="creature_spawn_addon"
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
          <h2 className="text-base text-slate-800 font-semibold">Spawn Addon Properties</h2>
          <p className="text-xs text-slate-500 font-mono">
            Table: <code className="text-blue-600 font-bold">creature_addon</code> (Linked by creature spawn GUID)
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded p-8 text-center text-slate-500 text-sm">
          Loading spawn addon records...
        </div>
      ) : spawnAddons.length === 0 ? (
        <div className="w-full space-y-3 pt-1">
          <div className="w-full bg-[#F1F3F5] border border-[#E2E8F0] rounded py-3 text-center text-[13px] text-slate-700 font-sans shadow-2xs">
            No spawn-specific addon overrides found for creature {creatureEntry} spawns
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {spawnAddons.map((sa, idx) => (
            <div key={idx} className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800">Spawn GUID: #{sa.guid}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="text-red-500 hover:text-red-700 p-1 rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1">Path ID</label>
                  <input
                    type="number"
                    value={sa.path_id}
                    onChange={(e) => handleUpdate(idx, 'path_id', Number(e.target.value) || 0)}
                    className="w-full px-2 py-1 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Mount ID</label>
                  <input
                    type="number"
                    value={sa.mount}
                    onChange={(e) => handleUpdate(idx, 'mount', Number(e.target.value) || 0)}
                    className="w-full px-2 py-1 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Emote</label>
                  <input
                    type="number"
                    value={sa.emote}
                    onChange={(e) => handleUpdate(idx, 'emote', Number(e.target.value) || 0)}
                    className="w-full px-2 py-1 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Auras</label>
                  <input
                    type="text"
                    value={sa.auras}
                    onChange={(e) => handleUpdate(idx, 'auras', e.target.value)}
                    placeholder="e.g. 12345"
                    className="w-full px-2 py-1 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
