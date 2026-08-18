// Editor for gameobject_questitem: quest items obtainable from the object.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Copy, Check } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { GameObjectQuestItemRow } from '../types';
import { SelectorButton } from './GameObjectTooltip';
import { EntitySelectorModal, SelectorType } from '../../../components/EntitySelectorModal';

import { SqlQueryBar } from '../../../components/SqlQueryBar';

interface GameObjectQuestItemsTabProps {
  goEntry: number;
}

export const GameObjectQuestItemsTab: React.FC<GameObjectQuestItemsTabProps> = ({ goEntry }) => {
  const [items, setItems] = useState<GameObjectQuestItemRow[]>([]);
  const [initialItems, setInitialItems] = useState<GameObjectQuestItemRow[]>([]);
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
    idx: number;
  } | null>(null);

  useEffect(() => {
    loadQuestItems();
  }, [goEntry]);

  const loadQuestItems = async () => {
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT GameObjectEntry, Idx, ItemId, VerifiedBuild FROM \`gameobject_questitem\` WHERE \`GameObjectEntry\` = ${goEntry} ORDER BY \`Idx\` ASC;`
      );
      if (res && res.success && res.rows) {
        const list = res.rows.map((r: any[]) => ({
          GameObjectEntry: Number(r[0]),
          Idx: Number(r[1]) || 0,
          ItemId: Number(r[2]) || 0,
          VerifiedBuild: Number(r[3]) || 35662,
        }));
        setItems(list);
        setInitialItems(JSON.parse(JSON.stringify(list)));
      } else {
        setItems([]);
        setInitialItems([]);
      }
      setIsDirty(false);
    } catch {
      setItems([]);
      setInitialItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    const nextIdx = items.length > 0 ? Math.max(...items.map((i) => i.Idx)) + 1 : 0;
    setItems([...items, { GameObjectEntry: goEntry, Idx: nextIdx, ItemId: 0, VerifiedBuild: 35662 }]);
    setIsDirty(true);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((i) => i.Idx !== idx));
    setIsDirty(true);
  };

  const handleChangeItemId = (idx: number, newItemId: number) => {
    setItems(items.map((i) => (i.Idx === idx ? { ...i, ItemId: newItemId } : i)));
    setIsDirty(true);
  };

  const generateFullQuery = () => {
    if (items.length === 0) {
      return `DELETE FROM \`gameobject_questitem\` WHERE \`GameObjectEntry\` = ${goEntry};`;
    }
    const values = items
      .map((i) => `(${goEntry}, ${i.Idx}, ${i.ItemId}, ${i.VerifiedBuild || 35662})`)
      .join(',\n  ');
    return `DELETE FROM \`gameobject_questitem\` WHERE \`GameObjectEntry\` = ${goEntry};
INSERT INTO \`gameobject_questitem\` (\`GameObjectEntry\`, \`Idx\`, \`ItemId\`, \`VerifiedBuild\`) VALUES
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
      setInitialItems(JSON.parse(JSON.stringify(items)));
      setIsDirty(false);
    } catch (e) {
      console.error('Save quest items failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    await handleExecute();
    handleCopySql();
  };

  const handleReload = () => {
    setItems(JSON.parse(JSON.stringify(initialItems)));
    setIsDirty(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 font-sans select-none text-slate-800">
      {/* Top Query Action Bar */}
      <SqlQueryBar
        name="game_object_quest_items"
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
            <h2 className="text-sm font-bold text-slate-800">GameObject Quest Items</h2>
            <p className="text-xs text-slate-500 font-mono">bfa_world.gameobject_questitem [GameObjectEntry: {goEntry}]</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Quest Item</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading quest items...</div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-slate-500">No quest items registered for this GameObject.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="py-2 px-3 w-16 text-center">Idx</th>
                  <th className="py-2 px-3 w-48">Item ID</th>
                  <th className="py-2 px-3 w-32">VerifiedBuild</th>
                  <th className="py-2 px-3 w-16 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {items.map((row) => (
                  <tr key={row.Idx} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono text-center text-slate-500">{row.Idx}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={row.ItemId}
                          onChange={(e) => handleChangeItemId(row.Idx, Number(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono font-bold text-blue-600 focus:border-blue-500 focus:outline-none"
                        />
                        <SelectorButton
                          onClick={() =>
                            setEntityModal({
                              open: true,
                              type: 'item',
                              title: 'Select Quest Item',
                              idx: row.Idx,
                            })
                          }
                        />
                      </div>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600">{row.VerifiedBuild || 35662}</td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(row.Idx)}
                        className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 cursor-pointer"
                        title="Remove Item"
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
          initialValue={items.find((i) => i.Idx === entityModal.idx)?.ItemId || 0}
          onSelect={(id) => {
            handleChangeItemId(entityModal.idx, id);
          }}
        />
      )}
    </div>
  );
};
