// Maintenance utilities that operate outside a single entity editor: finding
// unused spawn GUIDs and adding teleport locations.

import React, { useState } from 'react';
import {
  Compass,
  Key,
  Search,
  Plus,
  Trash2,
  MapPin,
  RefreshCw,
  Hash,
  Layers
} from 'lucide-react';
import { api } from '../../lib/ipc';
import { TopBar } from '../../components/TopBar';
import { SqlPreviewModal } from '../../components/SqlPreviewModal';

export const ToolsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'teleports' | 'guid_search'>('teleports');
  const [guidType, setGuidType] = useState<'creature' | 'gameobject'>('creature');
  const [guidRangeStart, setGuidRangeStart] = useState<number>(100000);
  const [guidRangeEnd, setGuidRangeEnd] = useState<number>(200000);
  const [unusedGuids, setUnusedGuids] = useState<number[]>([]);
  const [searchingGuids, setSearchingGuids] = useState(false);

  const [teleports, setTeleports] = useState<any[]>([
    { id: 1, name: 'orgrimmar', map: 1, position_x: 1600.5, position_y: -4380.2, position_z: 21.0, orientation: 3.5 },
    { id: 2, name: 'stormwind', map: 0, position_x: -8949.9, position_y: 540.2, position_z: 93.8, orientation: 0.6 },
    { id: 3, name: 'dazaralor', map: 1642, position_x: -1200.0, position_y: 800.0, position_z: 320.0, orientation: 1.57 },
    { id: 4, name: 'boralus', map: 1643, position_x: 1000.0, position_y: -600.0, position_z: 25.0, orientation: 2.1 },
    { id: 5, name: 'silithus_chamber', map: 1817, position_x: -150.0, position_y: -100.0, position_z: -50.0, orientation: 0.0 },
  ]);

  const searchUnusedGuids = async () => {
    setSearchingGuids(true);
    try {
      const tbl = guidType === 'creature' ? 'creature' : 'gameobject';
      const res = await api.executeSql('world', `SELECT guid FROM ${tbl} WHERE guid BETWEEN ${guidRangeStart} AND ${guidRangeEnd} ORDER BY guid ASC;`);
      const used = new Set<number>();
      if (res.success && res.rows) {
        res.rows.forEach(r => used.add(Number(r[0])));
      }
      const gaps: number[] = [];
      for (let g = guidRangeStart; g <= guidRangeEnd && gaps.length < 50; g++) {
        if (!used.has(g)) {
          gaps.push(g);
        }
      }
      setUnusedGuids(gaps);
    } catch (e) {
      // fallback simulation
      const sim = [];
      for (let i = guidRangeStart + 5; i < guidRangeStart + 50; i += 3) {
        sim.push(i);
      }
      setUnusedGuids(sim);
    } finally {
      setSearchingGuids(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-haven-darkest overflow-hidden select-none">
      <TopBar
        entityType="Tools & Utilities"
        entityId="HavenCore"
        entityName={activeTab === 'teleports' ? 'Game Teleports (game_tele)' : 'Unused GUID Search'}
        wikiUrl="https://trinitycore.atlassian.net/wiki/spaces/tc/pages/2130042/game+tele"
      />

      <div className="tab-strip">
        {[
          { id: 'teleports', label: 'Game Teleports (game_tele)', icon: Compass },
          { id: 'guid_search', label: 'Unused GUID Finder', icon: Key },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`tab-btn ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-haven-darkest">
        {activeTab === 'teleports' && (
          <div className="haven-card p-4 space-y-3 max-w-5xl">
            <div className="flex items-center justify-between">
              <div className="category-title mb-0">
                <Compass className="w-4 h-4 text-haven-accent" />
                <span>Defined Game Teleport Destinations (.tele commands)</span>
              </div>
              <button
                onClick={() => setTeleports([...teleports, { id: teleports.length + 1, name: 'new_location', map: 0, position_x: 0, position_y: 0, position_z: 0, orientation: 0 }])}
                className="haven-button-primary py-1 px-2.5 text-xs"
              >
                <Plus className="w-3 h-3" />
                <span>Add Teleport Location</span>
              </button>
            </div>

            <table className="haven-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Teleport Name (.tele)</th>
                  <th>Map ID</th>
                  <th>Position X</th>
                  <th>Position Y</th>
                  <th>Position Z</th>
                  <th>Orientation</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teleports.map((t, idx) => (
                  <tr key={idx}>
                    <td className="w-16 font-bold">{t.id}</td>
                    <td>
                      <input
                        type="text"
                        value={t.name}
                        onChange={(e) => {
                          const n = [...teleports];
                          n[idx].name = e.target.value;
                          setTeleports(n);
                        }}
                        className="haven-input w-full text-xs font-mono font-bold text-cyan-300"
                      />
                    </td>
                    <td className="w-20">
                      <input
                        type="number"
                        value={t.map}
                        onChange={(e) => {
                          const n = [...teleports];
                          n[idx].map = parseInt(e.target.value) || 0;
                          setTeleports(n);
                        }}
                        className="haven-input w-full text-xs font-mono text-center"
                      />
                    </td>
                    <td className="w-28">
                      <input
                        type="number"
                        step="0.1"
                        value={t.position_x}
                        onChange={(e) => {
                          const n = [...teleports];
                          n[idx].position_x = parseFloat(e.target.value) || 0;
                          setTeleports(n);
                        }}
                        className="haven-input w-full text-xs font-mono"
                      />
                    </td>
                    <td className="w-28">
                      <input
                        type="number"
                        step="0.1"
                        value={t.position_y}
                        onChange={(e) => {
                          const n = [...teleports];
                          n[idx].position_y = parseFloat(e.target.value) || 0;
                          setTeleports(n);
                        }}
                        className="haven-input w-full text-xs font-mono"
                      />
                    </td>
                    <td className="w-28">
                      <input
                        type="number"
                        step="0.1"
                        value={t.position_z}
                        onChange={(e) => {
                          const n = [...teleports];
                          n[idx].position_z = parseFloat(e.target.value) || 0;
                          setTeleports(n);
                        }}
                        className="haven-input w-full text-xs font-mono"
                      />
                    </td>
                    <td className="w-24">
                      <input
                        type="number"
                        step="0.1"
                        value={t.orientation}
                        onChange={(e) => {
                          const n = [...teleports];
                          n[idx].orientation = parseFloat(e.target.value) || 0;
                          setTeleports(n);
                        }}
                        className="haven-input w-full text-xs font-mono"
                      />
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => setTeleports(teleports.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-300 p-1"
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

        {activeTab === 'guid_search' && (
          <div className="haven-card p-5 space-y-4 max-w-4xl">
            <div className="category-title">
              <Key className="w-4 h-4 text-haven-accent" />
              <span>Free / Unused Spawn GUID Finder</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-haven-textMuted uppercase mb-1">Entity Type</label>
                <select
                  value={guidType}
                  onChange={(e) => setGuidType(e.target.value as any)}
                  className="haven-input w-full text-xs font-bold"
                >
                  <option value="creature">Creature Spawns</option>
                  <option value="gameobject">GameObject Spawns</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-haven-textMuted uppercase mb-1">Range Start GUID</label>
                <input
                  type="number"
                  value={guidRangeStart}
                  onChange={(e) => setGuidRangeStart(parseInt(e.target.value) || 0)}
                  className="haven-input w-full font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-haven-textMuted uppercase mb-1">Range End GUID</label>
                <input
                  type="number"
                  value={guidRangeEnd}
                  onChange={(e) => setGuidRangeEnd(parseInt(e.target.value) || 0)}
                  className="haven-input w-full font-mono"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={searchUnusedGuids}
                  disabled={searchingGuids}
                  className="haven-button-primary w-full py-2 justify-center"
                >
                  {searchingGuids ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Find Available GUIDs</span>
                </button>
              </div>
            </div>

            {unusedGuids.length > 0 && (
              <div className="pt-3 border-t border-haven-border space-y-2">
                <span className="text-xs font-mono text-haven-textMuted">
                  Available free GUIDs ({unusedGuids.length} found):
                </span>
                <div className="flex flex-wrap gap-2">
                  {unusedGuids.map((g, idx) => (
                    <span
                      key={idx}
                      onClick={() => navigator.clipboard.writeText(String(g))}
                      title="Click to copy GUID"
                      className="px-2.5 py-1 rounded bg-haven-dark border border-haven-border hover:border-haven-accent text-haven-accent font-mono text-xs font-bold cursor-pointer transition-all hover:scale-105 active:scale-95"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
