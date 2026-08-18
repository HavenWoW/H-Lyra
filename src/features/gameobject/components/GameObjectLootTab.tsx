// Editor for gameobject_loot_template: the loot table the object rolls.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Copy, Check } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { SelectorButton } from './GameObjectTooltip';
import { EntitySelectorModal, SelectorType } from '../../../components/EntitySelectorModal';
import { quoteSqlString } from '../../../lib/sql';

import { SqlQueryBar } from '../../../components/SqlQueryBar';

interface GameObjectLootTabProps {
  go: any;
}

interface LootItemRow {
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

export const GameObjectLootTab: React.FC<GameObjectLootTabProps> = ({ go }) => {
  const lootEntry = Number(go.Data1) > 0 ? Number(go.Data1) : Number(go.entry);
  const [lootItems, setLootItems] = useState<LootItemRow[]>([]);
  const [initialLootItems, setInitialLootItems] = useState<LootItemRow[]>([]);
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Entity selector modal
  const [entityModal, setEntityModal] = useState<{
    open: boolean;
    type: SelectorType;
    title: string;
    index: number;
  } | null>(null);

  useEffect(() => {
    loadLoot();
  }, [lootEntry]);

  const loadLoot = async () => {
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT Entry, Item, Reference, Chance, QuestRequired, LootMode, GroupId, MinCount, MaxCount, Comment FROM \`gameobject_loot_template\` WHERE \`Entry\` = ${lootEntry};`
      );
      if (res && res.success && res.rows) {
        const list = res.rows.map((r: any[]) => ({
          Entry: Number(r[0]),
          Item: Number(r[1]) || 0,
          Reference: Number(r[2]) || 0,
          Chance: Number(r[3]) || 0,
          QuestRequired: Number(r[4]) || 0,
          LootMode: Number(r[5]) || 0,
          GroupId: Number(r[6]) || 0,
          MinCount: Number(r[7]) || 1,
          MaxCount: Number(r[8]) || 1,
          Comment: r[9] ? String(r[9]) : '',
        }));
        setLootItems(list);
        setInitialLootItems(JSON.parse(JSON.stringify(list)));
      } else {
        setLootItems([]);
        setInitialLootItems([]);
      }
      setIsDirty(false);
    } catch {
      setLootItems([]);
      setInitialLootItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = () => {
    setLootItems([
      ...lootItems,
      {
        Entry: lootEntry,
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
    setIsDirty(true);
  };

  const handleRemoveRow = (index: number) => {
    setLootItems(lootItems.filter((_, idx) => idx !== index));
    setIsDirty(true);
  };

  const handleChangeRow = (index: number, field: keyof LootItemRow, value: any) => {
    setLootItems(
      lootItems.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
    setIsDirty(true);
  };

  const generateFullQuery = () => {
    if (lootItems.length === 0) {
      return `DELETE FROM \`gameobject_loot_template\` WHERE \`Entry\` = ${lootEntry};`;
    }
    const values = lootItems
      .map(
        (i) =>
          `(${lootEntry}, ${i.Item}, ${i.Reference}, ${i.Chance}, ${i.QuestRequired}, ${i.LootMode}, ${i.GroupId}, ${i.MinCount}, ${i.MaxCount}, ${quoteSqlString(i.Comment ?? '')})`
      )
      .join(',\n  ');
    return `DELETE FROM \`gameobject_loot_template\` WHERE \`Entry\` = ${lootEntry};
INSERT INTO \`gameobject_loot_template\` (\`Entry\`, \`Item\`, \`Reference\`, \`Chance\`, \`QuestRequired\`, \`LootMode\`, \`GroupId\`, \`MinCount\`, \`MaxCount\`, \`Comment\`) VALUES
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
      setInitialLootItems(JSON.parse(JSON.stringify(lootItems)));
      setIsDirty(false);
    } catch (e) {
      console.error('Save loot failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    await handleExecute();
    handleCopySql();
  };

  const handleReload = () => {
    setLootItems(JSON.parse(JSON.stringify(initialLootItems)));
    setIsDirty(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 font-sans select-none text-slate-800">
      {/* Top Query Action Bar */}
      <SqlQueryBar
        name="game_object_loot"
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
            <h2 className="text-sm font-bold text-slate-800">GameObject Loot Template</h2>
            <p className="text-xs text-slate-500 font-mono">bfa_world.gameobject_loot_template [Entry: {lootEntry}]</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Loot Row</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading loot items...</div>
        ) : lootItems.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-slate-500">No loot rows configured for this GameObject.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="py-2 px-3 w-36">Item ID</th>
                  <th className="py-2 px-3 w-24">Reference</th>
                  <th className="py-2 px-3 w-24">Chance %</th>
                  <th className="py-2 px-3 w-20">QuestReq</th>
                  <th className="py-2 px-3 w-20">LootMode</th>
                  <th className="py-2 px-3 w-20">Group</th>
                  <th className="py-2 px-3 w-20">Min</th>
                  <th className="py-2 px-3 w-20">Max</th>
                  <th className="py-2 px-3">Comment</th>
                  <th className="py-2 px-3 w-16 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {lootItems.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={row.Item}
                          onChange={(e) => handleChangeRow(idx, 'Item', Number(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono font-bold text-blue-600 focus:border-blue-500 focus:outline-none"
                        />
                        <SelectorButton
                          onClick={() =>
                            setEntityModal({
                              open: true,
                              type: 'item',
                              title: 'Select Loot Item',
                              index: idx,
                            })
                          }
                        />
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={row.Reference}
                        onChange={(e) => handleChangeRow(idx, 'Reference', Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={row.Chance}
                        onChange={(e) => handleChangeRow(idx, 'Chance', Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={row.QuestRequired}
                        onChange={(e) => handleChangeRow(idx, 'QuestRequired', Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={row.LootMode}
                        onChange={(e) => handleChangeRow(idx, 'LootMode', Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={row.GroupId}
                        onChange={(e) => handleChangeRow(idx, 'GroupId', Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={row.MinCount}
                        onChange={(e) => handleChangeRow(idx, 'MinCount', Number(e.target.value) || 1)}
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={row.MaxCount}
                        onChange={(e) => handleChangeRow(idx, 'MaxCount', Number(e.target.value) || 1)}
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.Comment}
                        onChange={(e) => handleChangeRow(idx, 'Comment', e.target.value)}
                        placeholder="Comment..."
                        className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 cursor-pointer"
                        title="Remove Loot Row"
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

      {entityModal && entityModal.open && (
        <EntitySelectorModal
          isOpen={true}
          onClose={() => setEntityModal(null)}
          type={entityModal.type}
          title={entityModal.title}
          initialValue={lootItems[entityModal.index]?.Item || 0}
          onSelect={(id) => {
            handleChangeRow(entityModal.index, 'Item', id);
          }}
        />
      )}
    </div>
  );
};
