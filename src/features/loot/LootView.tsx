// Loot template browser.
//
// Covers every loot table the core reads, from creature and gameobject loot
// through to the profession tables such as milling, prospecting and
// disenchanting, plus reference loot.

import React, { useState } from 'react';
import { Gift, Search, Plus, Trash2, Code2, Play, Copy, Check, Layers } from 'lucide-react';
import { api } from '../../lib/ipc';
import { quoteSqlString } from '../../lib/sql';

interface LootRow {
  Entry: number;
  Item: number;
  Reference: number;
  Chance: number;
  QuestRequired: number;
  LootMode: number;
  GroupId: number;
  MinCount: number;
  MaxCount: number;
  Comment: string;
}

export const LootView: React.FC = () => {
  const [lootTable, setLootTable] = useState<string>('creature_loot_template');
  const [entry, setEntry] = useState<number>(3); // Sample: Flesh Eater
  const [rows, setRows] = useState<LootRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'sql'>('editor');
  const [copied, setCopied] = useState(false);

  const fetchLoot = async () => {
    setLoading(true);
    setStatusText(null);
    try {
      const query = `SELECT Entry, Item, Reference, Chance, QuestRequired, LootMode, GroupId, MinCount, MaxCount, IFNULL(Comment, '') FROM ${lootTable} WHERE Entry = ${entry} ORDER BY GroupId ASC, Chance DESC;`;
      const res = await api.executeSql('world', query);
      if (res.success && res.rows) {
        const loaded: LootRow[] = res.rows.map((r: any[]) => ({
          Entry: Number(r[0]) || entry,
          Item: Number(r[1]) || 0,
          Reference: Number(r[2]) || 0,
          Chance: parseFloat(r[3]) || 0,
          QuestRequired: Number(r[4]) || 0,
          LootMode: Number(r[5]) || 1,
          GroupId: Number(r[6]) || 0,
          MinCount: Number(r[7]) || 1,
          MaxCount: Number(r[8]) || 1,
          Comment: String(r[9] || ''),
        }));
        setRows(loaded);
        setStatusText(`Loaded ${loaded.length} loot drops for ${lootTable} (Entry ${entry}).`);
      } else {
        setRows([]);
        setStatusText(`No drops found in ${lootTable} for Entry ${entry}.`);
      }
    } catch (e: any) {
      setStatusText(`Error: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    setRows([
      ...rows,
      {
        Entry: entry,
        Item: 0,
        Reference: 0,
        Chance: 100,
        QuestRequired: 0,
        LootMode: 1,
        GroupId: 0,
        MinCount: 1,
        MaxCount: 1,
        Comment: '',
      },
    ]);
  };

  const removeRow = (idx: number) => {
    setRows(rows.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, field: keyof LootRow, val: any) => {
    const updated = [...rows];
    updated[idx] = { ...updated[idx], [field]: val };
    setRows(updated);
  };

  const generateSql = (): string => {
    let sql = `DELETE FROM \`${lootTable}\` WHERE \`Entry\` = ${entry};\n`;
    if (rows.length > 0) {
      sql += `INSERT INTO \`${lootTable}\` (\`Entry\`, \`Item\`, \`Reference\`, \`Chance\`, \`QuestRequired\`, \`LootMode\`, \`GroupId\`, \`MinCount\`, \`MaxCount\`, \`Comment\`) VALUES\n`;
      rows.forEach((r, idx) => {
        const delim = idx + 1 === rows.length ? ';' : ',';
        const cVal = r.Comment ? quoteSqlString(r.Comment) : 'NULL';
        sql += `(${r.Entry}, ${r.Item}, ${r.Reference}, ${r.Chance}, ${r.QuestRequired}, ${r.LootMode}, ${r.GroupId}, ${r.MinCount}, ${r.MaxCount}, ${cVal})${delim}\n`;
      });
    }
    return sql;
  };

  const executeApply = async () => {
    const sql = generateSql();
    setLoading(true);
    try {
      const res = await api.executeSql('world', sql);
      if (res.success) {
        setStatusText(`Successfully applied loot changes to ${lootTable}.`);
      } else {
        setStatusText(`Update failed: ${res.error}`);
      }
    } catch (e: any) {
      setStatusText(`Execution error: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const copySql = () => {
    navigator.clipboard.writeText(generateSql());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lootTablesList = [
    'creature_loot_template',
    'gameobject_loot_template',
    'item_loot_template',
    'reference_loot_template',
    'disenchant_loot_template',
    'fishing_loot_template',
    'milling_loot_template',
    'pickpocketing_loot_template',
    'prospecting_loot_template',
    'scrapping_loot_template',
    'skinning_loot_template',
    'spell_loot_template',
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-haven-darkest">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-haven-border bg-haven-darker">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-haven-textBright flex items-center gap-2">
              Loot Table Master
              <span className="text-xs px-2 py-0.5 bg-haven-panel border border-haven-border rounded text-purple-400">
                Matrix & Drop Rates
              </span>
            </h1>
            <p className="text-xs text-haven-textMuted">Unified matrix editor for Creature, GO, Item, Reference, Skinning, and Milling loot</p>
          </div>
        </div>

        {/* Search controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-haven-darkest border border-haven-border rounded-lg p-1 space-x-2">
            <select
              value={lootTable}
              onChange={(e) => setLootTable(e.target.value)}
              className="bg-transparent text-xs text-haven-textNormal px-2 py-1 focus:outline-none"
            >
              {lootTablesList.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <span className="text-haven-border">|</span>
            <input
              type="number"
              value={entry}
              onChange={(e) => setEntry(Number(e.target.value))}
              placeholder="Entry"
              className="haven-input w-24 text-center text-xs"
            />
            <button onClick={fetchLoot} disabled={loading} className="haven-button-primary text-xs px-3 py-1 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>Load</span>
            </button>
          </div>

          <div className="flex bg-haven-panel border border-haven-border rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1 text-xs font-medium rounded ${activeTab === 'editor' ? 'bg-haven-accent text-white' : 'text-haven-textMuted'}`}
            >
              Grid ({rows.length})
            </button>
            <button
              onClick={() => setActiveTab('sql')}
              className={`px-3 py-1 text-xs font-medium rounded ${activeTab === 'sql' ? 'bg-haven-accent text-white' : 'text-haven-textMuted'}`}
            >
              SQL
            </button>
          </div>

          <button onClick={executeApply} disabled={loading || rows.length === 0} className="haven-button-gold text-xs flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5" />
            <span>Apply</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'editor' ? (
        <div className="flex-1 overflow-auto p-6 space-y-3">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 haven-card text-haven-textMuted border-dashed">
              <Gift className="w-12 h-12 mb-3 text-haven-borderLight opacity-50" />
              <p className="text-sm font-medium">No loot drops loaded for Entry {entry}</p>
              <button onClick={addRow} className="haven-button-primary mt-4 flex items-center gap-1.5 text-xs">
                <Plus className="w-4 h-4" />
                <span>Add First Drop</span>
              </button>
            </div>
          ) : (
            <div className="haven-card overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-haven-dark border-b border-haven-border text-haven-textMuted uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Item ID</th>
                    <th className="p-3">Ref ID</th>
                    <th className="p-3">Chance %</th>
                    <th className="p-3">Quest?</th>
                    <th className="p-3">Group</th>
                    <th className="p-3">Min</th>
                    <th className="p-3">Max</th>
                    <th className="p-3">Comment / Item Note</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-haven-border/40">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-haven-darkest/40 transition-colors">
                      <td className="p-2.5">
                        <input
                          type="number"
                          value={r.Item}
                          onChange={(e) => updateRow(i, 'Item', Number(e.target.value))}
                          className="haven-input w-28 text-xs font-bold text-amber-300"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          value={r.Reference}
                          onChange={(e) => updateRow(i, 'Reference', Number(e.target.value))}
                          className="haven-input w-20 text-xs"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.01"
                          value={r.Chance}
                          onChange={(e) => updateRow(i, 'Chance', parseFloat(e.target.value) || 0)}
                          className="haven-input w-20 text-xs text-emerald-400 font-bold"
                        />
                      </td>
                      <td className="p-2.5">
                        <select
                          value={r.QuestRequired}
                          onChange={(e) => updateRow(i, 'QuestRequired', Number(e.target.value))}
                          className="haven-input w-16 text-xs"
                        >
                          <option value={0}>No</option>
                          <option value={1}>Yes</option>
                        </select>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          value={r.GroupId}
                          onChange={(e) => updateRow(i, 'GroupId', Number(e.target.value))}
                          className="haven-input w-16 text-xs"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          value={r.MinCount}
                          onChange={(e) => updateRow(i, 'MinCount', Number(e.target.value))}
                          className="haven-input w-16 text-xs"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          value={r.MaxCount}
                          onChange={(e) => updateRow(i, 'MaxCount', Number(e.target.value))}
                          className="haven-input w-16 text-xs"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={r.Comment}
                          onChange={(e) => updateRow(i, 'Comment', e.target.value)}
                          placeholder="Optional comment..."
                          className="haven-input w-full text-xs font-sans"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <button onClick={() => removeRow(i)} className="text-haven-textMuted hover:text-red-400 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rows.length > 0 && (
            <button onClick={addRow} className="haven-button-secondary w-full py-2 border-dashed flex items-center justify-center gap-2 text-xs">
              <Plus className="w-4 h-4 text-haven-accent" />
              <span>Add Loot Item</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-haven-textMuted uppercase flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-haven-accent" /> Generated Loot SQL
            </span>
            <button onClick={copySql} className="haven-button-secondary text-xs px-3 py-1 flex items-center gap-1.5">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy SQL'}</span>
            </button>
          </div>
          <textarea
            value={generateSql()}
            readOnly
            className="haven-input w-full flex-1 font-mono text-xs p-4 bg-haven-darker leading-relaxed"
          />
        </div>
      )}

      {statusText && (
        <div className="px-6 py-2 bg-haven-darker border-t border-haven-border text-xs text-haven-textMuted">
          {statusText}
        </div>
      )}
    </div>
  );
};
