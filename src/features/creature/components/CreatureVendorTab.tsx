// Editor for npc_vendor: the vendor inventory, its stock limits and extended
// costs.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Copy, Check } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { CreatureVendorItem } from '../types';
import { SelectorButton } from './CreatureTooltip';
import { EntitySelectorModal, SelectorType } from '../../../components/EntitySelectorModal';

import { SqlQueryBar } from '../../../components/SqlQueryBar';

interface CreatureVendorTabProps {
  creatureEntry: number;
}

export const CreatureVendorTab: React.FC<CreatureVendorTabProps> = ({ creatureEntry }) => {
  const [items, setItems] = useState<CreatureVendorItem[]>([]);
  const [initialItems, setInitialItems] = useState<CreatureVendorItem[]>([]);
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
    loadVendorItems();
  }, [creatureEntry]);

  const loadVendorItems = async () => {
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT entry, slot, item, maxcount, incrtime, ExtendedCost, OverrideGoldCost, type, BonusListIDs, PlayerConditionID, IgnoreFiltering, VerifiedBuild FROM \`npc_vendor\` WHERE \`entry\` = ${creatureEntry} ORDER BY \`slot\` ASC;`
      );
      if (res && res.success && res.rows) {
        const list = res.rows.map((r: any[]) => ({
          entry: Number(r[0]),
          slot: Number(r[1]) || 0,
          item: Number(r[2]) || 0,
          maxcount: Number(r[3]) || 0,
          incrtime: Number(r[4]) || 0,
          ExtendedCost: Number(r[5]) || 0,
          OverrideGoldCost: Number(r[6]) ?? -1,
          type: Number(r[7]) || 1,
          BonusListIDs: r[8] ? String(r[8]) : '',
          PlayerConditionID: Number(r[9]) || 0,
          IgnoreFiltering: Number(r[10]) || 0,
          VerifiedBuild: Number(r[11]) || 35662,
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
    const nextSlot = items.length === 0 ? 0 : Math.max(...items.map(i => i.slot)) + 1;
    setItems([
      ...items,
      {
        entry: creatureEntry,
        slot: nextSlot,
        item: 0,
        maxcount: 0,
        incrtime: 0,
        ExtendedCost: 0,
        OverrideGoldCost: -1,
        type: 1,
        BonusListIDs: '',
        PlayerConditionID: 0,
        IgnoreFiltering: 0,
        VerifiedBuild: 35662,
      },
    ]);
    setIsDirty(true);
  };

  const handleUpdate = (index: number, field: keyof CreatureVendorItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
    setIsDirty(true);
  };

  const handleRemove = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const generateFullQuery = () => {
    if (items.length === 0) {
      return `DELETE FROM \`npc_vendor\` WHERE \`entry\` = ${creatureEntry};`;
    }

    const values = items
      .map(
        i =>
          `  (${creatureEntry}, ${i.slot}, ${i.item}, ${i.maxcount}, ${i.incrtime}, ${i.ExtendedCost}, ${i.OverrideGoldCost}, ${i.type}, ${i.BonusListIDs ? `'${i.BonusListIDs}'` : 'NULL'}, ${i.PlayerConditionID}, ${i.IgnoreFiltering}, ${i.VerifiedBuild || 35662})`
      )
      .join(',\n');

    return `DELETE FROM \`npc_vendor\` WHERE \`entry\` = ${creatureEntry};
INSERT INTO \`npc_vendor\`
  (\`entry\`, \`slot\`, \`item\`, \`maxcount\`, \`incrtime\`, \`ExtendedCost\`, \`OverrideGoldCost\`, \`type\`, \`BonusListIDs\`, \`PlayerConditionID\`, \`IgnoreFiltering\`, \`VerifiedBuild\`)
VALUES
${values};`;
  };

  const generateDiffQuery = () => {
    const statements: string[] = [];
    const initialMap = new Map(initialItems.map(i => [i.item, i]));
    const currentMap = new Map(items.map(i => [i.item, i]));

    for (const [itemId] of initialMap) {
      if (!currentMap.has(itemId)) {
        statements.push(`DELETE FROM \`npc_vendor\` WHERE \`entry\` = ${creatureEntry} AND \`item\` = ${itemId};`);
      }
    }

    for (const [itemId, i] of currentMap) {
      const init = initialMap.get(itemId);
      const safeBonus = i.BonusListIDs ? `'${i.BonusListIDs}'` : 'NULL';

      if (!init) {
        statements.push(`INSERT INTO \`npc_vendor\` (\`entry\`, \`slot\`, \`item\`, \`maxcount\`, \`incrtime\`, \`ExtendedCost\`, \`OverrideGoldCost\`, \`type\`, \`BonusListIDs\`, \`PlayerConditionID\`, \`IgnoreFiltering\`, \`VerifiedBuild\`) VALUES (${creatureEntry}, ${i.slot}, ${i.item}, ${i.maxcount}, ${i.incrtime}, ${i.ExtendedCost}, ${i.OverrideGoldCost}, ${i.type}, ${safeBonus}, ${i.PlayerConditionID}, ${i.IgnoreFiltering}, ${i.VerifiedBuild || 35662});`);
      } else {
        const isModified =
          init.slot !== i.slot ||
          init.maxcount !== i.maxcount ||
          init.incrtime !== i.incrtime ||
          init.ExtendedCost !== i.ExtendedCost ||
          init.OverrideGoldCost !== i.OverrideGoldCost ||
          init.type !== i.type ||
          init.BonusListIDs !== i.BonusListIDs ||
          init.PlayerConditionID !== i.PlayerConditionID ||
          init.IgnoreFiltering !== i.IgnoreFiltering ||
          init.VerifiedBuild !== i.VerifiedBuild;

        if (isModified) {
          statements.push(`UPDATE \`npc_vendor\` SET \`slot\` = ${i.slot}, \`maxcount\` = ${i.maxcount}, \`incrtime\` = ${i.incrtime}, \`ExtendedCost\` = ${i.ExtendedCost}, \`OverrideGoldCost\` = ${i.OverrideGoldCost}, \`type\` = ${i.type}, \`BonusListIDs\` = ${safeBonus}, \`PlayerConditionID\` = ${i.PlayerConditionID}, \`IgnoreFiltering\` = ${i.IgnoreFiltering}, \`VerifiedBuild\` = ${i.VerifiedBuild || 35662} WHERE \`entry\` = ${creatureEntry} AND \`item\` = ${itemId};`);
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
      setInitialItems(JSON.parse(JSON.stringify(items)));
      setIsDirty(false);
    } catch (e) {
      console.error('Save vendor items failed:', e);
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
        name="creature_vendor"
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
          <h2 className="text-base text-slate-800 font-semibold">Vendor Items</h2>
          <p className="text-xs text-slate-500 font-mono">
            Table: <code className="text-blue-600 font-bold">npc_vendor</code> (Entry: {creatureEntry})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddItem}
            className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded p-8 text-center text-slate-500 text-sm">
          Loading vendor inventory...
        </div>
      ) : items.length === 0 ? (
        <div className="w-full space-y-3 pt-1">
          <div className="w-full bg-[#F1F3F5] border border-[#E2E8F0] rounded py-3 text-center text-[13px] text-slate-700 font-sans shadow-2xs">
            No vendor items configured for creature {creatureEntry}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Slot</th>
                <th className="py-2.5 px-3">Item ID</th>
                <th className="py-2.5 px-3">Max Count</th>
                <th className="py-2.5 px-3">Incr Time</th>
                <th className="py-2.5 px-3">Extended Cost</th>
                <th className="py-2.5 px-3">Override Gold</th>
                <th className="py-2.5 px-3">Condition ID</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={item.slot}
                      onChange={(e) => handleUpdate(idx, 'slot', Number(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs font-mono"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={item.item}
                        onChange={(e) => handleUpdate(idx, 'item', Number(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs font-bold text-blue-600 font-mono"
                      />
                      <SelectorButton
                        onClick={() =>
                          setEntityModal({
                            open: true,
                            type: 'item',
                            title: 'Select Vendor Item',
                            index: idx,
                          })
                        }
                      />
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={item.maxcount}
                      onChange={(e) => handleUpdate(idx, 'maxcount', Number(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs font-mono"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={item.incrtime}
                      onChange={(e) => handleUpdate(idx, 'incrtime', Number(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs font-mono"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={item.ExtendedCost}
                      onChange={(e) => handleUpdate(idx, 'ExtendedCost', Number(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs font-mono"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={item.OverrideGoldCost}
                      onChange={(e) => handleUpdate(idx, 'OverrideGoldCost', Number(e.target.value) ?? -1)}
                      className="w-24 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs font-mono"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={item.PlayerConditionID}
                      onChange={(e) => handleUpdate(idx, 'PlayerConditionID', Number(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs font-mono"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="text-red-500 hover:text-red-700 p-1 rounded transition-colors cursor-pointer"
                      title="Remove item"
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

      {entityModal && entityModal.open && (
        <EntitySelectorModal
          isOpen={true}
          onClose={() => setEntityModal(null)}
          type={entityModal.type}
          title={entityModal.title}
          initialValue={items[entityModal.index]?.item || 0}
          onSelect={(id) => {
            handleUpdate(entityModal.index, 'item', id);
          }}
        />
      )}
    </div>
  );
};
