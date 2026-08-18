// Hotfix database browser for the item and spell DB2 overlay tables, for
// inspecting the SQL overrides applied over the client DB2 data.

import React, { useState } from 'react';
import { Layers, Search, Sparkles, Shield, Sword, Eye } from 'lucide-react';
import { api } from '../../lib/ipc';

export const HotfixesView: React.FC = () => {
  const [category, setCategory] = useState<'item' | 'spell'>('item');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchId, setSearchId] = useState<number>(19019); // Sample: Thunderfury
  const [results, setResults] = useState<any[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  const searchHotfixes = async () => {
    setLoading(true);
    setStatusText(null);
    setSelectedDetails(null);
    try {
      let query = '';
      if (category === 'item') {
        if (searchTerm.trim()) {
          query = `SELECT ID, Display, ItemLevel, RequiredLevel, OverallQualityID, InventoryType FROM item_sparse WHERE Display LIKE '%${searchTerm.trim()}%' LIMIT 30;`;
        } else {
          query = `SELECT ID, Display, ItemLevel, RequiredLevel, OverallQualityID, InventoryType FROM item_sparse WHERE ID = ${searchId} LIMIT 30;`;
        }
      } else {
        if (searchTerm.trim()) {
          query = `SELECT ID, Name FROM spell_name WHERE Name LIKE '%${searchTerm.trim()}%' LIMIT 30;`;
        } else {
          query = `SELECT ID, Name FROM spell_name WHERE ID = ${searchId} LIMIT 30;`;
        }
      }

      const res = await api.executeSql('hotfixes', query);
      if (res.success && res.rows) {
        setResults(res.rows);
        setStatusText(`Found ${res.rows.length} records in hotfixes.`);
        if (res.rows.length === 1) {
          inspectRecord(res.rows[0][0]);
        }
      } else {
        setResults([]);
        setStatusText('No matching records found.');
      }
    } catch (e: any) {
      setStatusText(`Search error: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const inspectRecord = async (id: number) => {
    setLoading(true);
    try {
      if (category === 'item') {
        const qSparse = `SELECT * FROM item_sparse WHERE ID = ${id};`;
        const resS = await api.executeSql('hotfixes', qSparse);
        const qEffects = `SELECT LegacySlotIndex, TriggerType, Charges, SpellID, CooldownMSec, ParentItemID FROM item_effect WHERE ParentItemID = ${id} ORDER BY LegacySlotIndex ASC;`;
        const resE = await api.executeSql('hotfixes', qEffects);
        const qAddon = `SELECT * FROM bfa_world.item_template_addon WHERE Id = ${id};`;
        const resA = await api.executeSql('world', qAddon);

        setSelectedDetails({
          sparse: resS.rows[0] ? { cols: resS.columns, data: resS.rows[0] } : null,
          effects: resE.rows || [],
          addon: resA.rows[0] || null,
        });
      } else {
        const qName = `SELECT * FROM spell_name WHERE ID = ${id};`;
        const resN = await api.executeSql('hotfixes', qName);
        const qEffects = `SELECT EffectIndex, Effect, EffectAura, SpellID, DifficultyID FROM spell_effect WHERE SpellID = ${id} ORDER BY EffectIndex ASC;`;
        const resE = await api.executeSql('hotfixes', qEffects);
        const qScript = `SELECT * FROM bfa_world.spell_script_names WHERE spell_id = ${id};`;
        const resS = await api.executeSql('world', qScript);

        setSelectedDetails({
          name: resN.rows[0] ? { cols: resN.columns, data: resN.rows[0] } : null,
          effects: resE.rows || [],
          scripts: resS.rows || [],
        });
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-haven-darkest">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-haven-border bg-haven-darker">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-haven-textBright flex items-center gap-2">
              Hotfixes & DB2 Inspector
              <span className="text-xs px-2 py-0.5 bg-haven-panel border border-haven-border rounded text-indigo-400">
                Client Ground-Truth
              </span>
            </h1>
            <p className="text-xs text-haven-textMuted">Query items, spells, DBC curves, bonus trees, and server overrides in real-time</p>
          </div>
        </div>

        {/* Search controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-haven-darkest border border-haven-border rounded-lg p-1 space-x-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="bg-transparent text-xs text-haven-textNormal px-2 py-1 focus:outline-none"
            >
              <option value="item">Items (`item_sparse`)</option>
              <option value="spell">Spells (`spell_name`)</option>
            </select>
            <span className="text-haven-border">|</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Name..."
              className="haven-input w-44 text-xs"
            />
            <input
              type="number"
              value={searchId}
              onChange={(e) => setSearchId(Number(e.target.value))}
              placeholder="ID"
              className="haven-input w-20 text-center text-xs"
            />
            <button onClick={searchHotfixes} disabled={loading} className="haven-button-primary text-xs px-3 py-1 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Left Results List */}
        <div className="w-96 haven-card p-4 overflow-auto space-y-2 flex-shrink-0">
          <h3 className="text-xs font-bold text-haven-textMuted uppercase mb-3">Matching DB2 Records ({results.length})</h3>
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => inspectRecord(r[0])}
              className="w-full text-left p-3 bg-haven-darkest hover:bg-haven-dark border border-haven-border rounded text-xs transition-all flex flex-col"
            >
              <div className="font-bold text-haven-textBright truncate">{r[1]}</div>
              <div className="text-[10px] text-haven-textMuted mt-1 flex justify-between font-mono">
                <span>ID: {r[0]}</span>
                {category === 'item' && <span>iLvl: {r[2]} | Req: {r[3]}</span>}
              </div>
            </button>
          ))}
          {results.length === 0 && (
            <p className="text-xs text-haven-textMuted text-center py-8">Search for an item or spell name to inspect DB2 structures.</p>
          )}
        </div>

        {/* Right Details Panel */}
        <div className="flex-1 haven-card p-6 overflow-auto">
          {selectedDetails ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-haven-textBright flex items-center gap-2">
                  <Eye className="w-5 h-5 text-haven-accent" />
                  {category === 'item' ? 'Item DB2 Breakdown' : 'Spell DB2 Breakdown'}
                </h2>
              </div>

              {/* Data fields */}
              {selectedDetails.sparse && (
                <div className="haven-card p-4 bg-haven-darkest/60">
                  <h4 className="text-xs font-bold text-haven-textMuted uppercase mb-3">Core Sparse Properties (`item_sparse`)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                    {selectedDetails.sparse.cols.slice(0, 16).map((col: string, idx: number) => (
                      <div key={idx} className="bg-haven-dark p-2 rounded border border-haven-border/40">
                        <span className="text-[10px] text-haven-textMuted block truncate">{col}</span>
                        <span className="text-haven-textBright font-bold truncate block">{String(selectedDetails.sparse.data[idx])}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedDetails.name && (
                <div className="haven-card p-4 bg-haven-darkest/60">
                  <h4 className="text-xs font-bold text-haven-textMuted uppercase mb-3">Core Spell Name (`spell_name`)</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    {selectedDetails.name.cols.map((col: string, idx: number) => (
                      <div key={idx} className="bg-haven-dark p-2 rounded border border-haven-border/40">
                        <span className="text-[10px] text-haven-textMuted block">{col}</span>
                        <span className="text-haven-textBright font-bold">{String(selectedDetails.name.data[idx])}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold text-haven-textMuted uppercase mb-3">Associated Effects ({selectedDetails.effects.length})</h4>
                <div className="space-y-2">
                  {selectedDetails.effects.map((eff: any[], i: number) => (
                    <div key={i} className="p-3 bg-haven-darkest rounded border border-haven-border/60 text-xs font-mono flex items-center justify-between">
                      <span className="text-amber-300 font-bold">{category === 'item' ? `Slot #${eff[0]}` : `Effect Index #${eff[0]}`}</span>
                      <span className="text-haven-textMuted">
                        {category === 'item'
                          ? `Trigger: ${eff[1]} | Charges: ${eff[2]} | Spell: ${eff[3]}`
                          : `Effect: ${eff[1]} | Aura: ${eff[2]} | Spell: ${eff[3]}`}
                      </span>
                    </div>
                  ))}
                  {selectedDetails.effects.length === 0 && <p className="text-xs text-haven-textMuted">No sub-effects declared.</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-haven-textMuted">
              <Layers className="w-12 h-12 mb-2 text-haven-borderLight opacity-50" />
              <p className="text-sm font-medium">No record selected</p>
              <p className="text-xs text-haven-textMuted">Select an item or spell from the left column to view DB2 parameters.</p>
            </div>
          )}
        </div>
      </div>

      {statusText && (
        <div className="px-6 py-2 bg-haven-darker border-t border-haven-border text-xs text-haven-textMuted">
          {statusText}
        </div>
      )}
    </div>
  );
};
