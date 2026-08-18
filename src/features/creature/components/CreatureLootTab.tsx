// Loot editor for the creature, pickpocket and skinning loot ids, selected by
// the mode prop.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Copy, Check } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { SelectorButton } from './CreatureTooltip';
import { EntitySelectorModal, SelectorType } from '../../../components/EntitySelectorModal';

import { SqlQueryBar } from '../../../components/SqlQueryBar';
import { quoteSqlString } from '../../../lib/sql';

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
  Comment?: string;
}

interface CreatureLootTabProps {
  creature: any;
  handleFieldChange?: (field: string, value: any) => void;
  mode?: 'creature' | 'pickpocket' | 'skinning';
}

export const CreatureLootTab: React.FC<CreatureLootTabProps> = ({
  creature,
  handleFieldChange,
  mode = 'creature',
}) => {
  const [activeTable, setActiveTable] = useState<'creature' | 'pickpocket' | 'skinning'>(mode);
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
    setActiveTable(mode);
  }, [mode]);

  const lootId = activeTable === 'creature'
    ? (creature.lootid || creature.entry)
    : activeTable === 'pickpocket'
    ? (creature.pickpocketloot || creature.entry)
    : (creature.skinloot || creature.entry);

  const tableName = activeTable === 'creature'
    ? 'creature_loot_template'
    : activeTable === 'pickpocket'
    ? 'pickpocketing_loot_template'
    : 'skinning_loot_template';

  useEffect(() => {
    loadLootData();
  }, [lootId, activeTable]);

  const loadLootData = async () => {
    if (!lootId) {
      setLootItems([]);
      setInitialLootItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT Entry, Item, Reference, Chance, QuestRequired, LootMode, GroupId, MinCount, MaxCount, Comment FROM \`${tableName}\` WHERE \`Entry\` = ${lootId} ORDER BY \`Item\` ASC;`
      );
      if (res && res.success && res.rows) {
        const list = res.rows.map((r: any[]) => ({
          Entry: Number(r[0]),
          Item: Number(r[1]) || 0,
          Reference: Number(r[2]) || 0,
          Chance: Number(r[3]) || 0,
          QuestRequired: Number(r[4]) || 0,
          LootMode: Number(r[5]) || 1,
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

  const handleAddItem = () => {
    setLootItems([
      ...lootItems,
      {
        Entry: lootId,
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

  const handleUpdate = (index: number, field: keyof LootItemRow, value: any) => {
    const updated = [...lootItems];
    updated[index] = { ...updated[index], [field]: value };
    setLootItems(updated);
    setIsDirty(true);
  };

  const handleRemove = (index: number) => {
    setLootItems(lootItems.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const generateFullQuery = () => {
    if (lootItems.length === 0) {
      return `DELETE FROM \`${tableName}\` WHERE \`Entry\` = ${lootId};`;
    }

    const values = lootItems
      .map(
        i =>
          `  (${lootId}, ${i.Item}, ${i.Reference || 0}, ${i.Chance || 0}, ${i.QuestRequired || 0}, ${i.LootMode || 1}, ${i.GroupId || 0}, ${i.MinCount || 1}, ${i.MaxCount || 1}, ${i.Comment ? quoteSqlString(i.Comment) : 'NULL'})`
      )
      .join(',\n');

    return `DELETE FROM \`${tableName}\` WHERE \`Entry\` = ${lootId};
INSERT INTO \`${tableName}\`
  (\`Entry\`, \`Item\`, \`Reference\`, \`Chance\`, \`QuestRequired\`, \`LootMode\`, \`GroupId\`, \`MinCount\`, \`MaxCount\`, \`Comment\`)
VALUES
${values};`;
  };

  const generateDiffQuery = () => {
    const statements: string[] = [];

    // Map initial items by key: Item-Reference-GroupId
    const initialMap = new Map(initialLootItems.map(i => [`${i.Item}-${i.Reference || 0}-${i.GroupId || 0}`, i]));
    const currentMap = new Map(lootItems.map(i => [`${i.Item}-${i.Reference || 0}-${i.GroupId || 0}`, i]));

    // Deleted items
    for (const [key, item] of initialMap) {
      if (!currentMap.has(key)) {
        statements.push(`DELETE FROM \`${tableName}\` WHERE \`Entry\` = ${lootId} AND \`Item\` = ${item.Item} AND \`Reference\` = ${item.Reference || 0} AND \`GroupId\` = ${item.GroupId || 0};`);
      }
    }

    // Inserted or Modified items
    for (const [key, item] of currentMap) {
      const init = initialMap.get(key);
      const safeComment = item.Comment ? quoteSqlString(item.Comment) : 'NULL';

      if (!init) {
        statements.push(
          `INSERT INTO \`${tableName}\` (\`Entry\`, \`Item\`, \`Reference\`, \`Chance\`, \`QuestRequired\`, \`LootMode\`, \`GroupId\`, \`MinCount\`, \`MaxCount\`, \`Comment\`) VALUES (${lootId}, ${item.Item}, ${item.Reference || 0}, ${item.Chance || 0}, ${item.QuestRequired || 0}, ${item.LootMode || 1}, ${item.GroupId || 0}, ${item.MinCount || 1}, ${item.MaxCount || 1}, ${safeComment});`
        );
      } else {
        const isModified =
          init.Chance !== item.Chance ||
          init.QuestRequired !== item.QuestRequired ||
          init.LootMode !== item.LootMode ||
          init.MinCount !== item.MinCount ||
          init.MaxCount !== item.MaxCount ||
          init.Comment !== item.Comment;

        if (isModified) {
          statements.push(
            `UPDATE \`${tableName}\` SET \`Chance\` = ${item.Chance || 0}, \`QuestRequired\` = ${item.QuestRequired || 0}, \`LootMode\` = ${item.LootMode || 1}, \`MinCount\` = ${item.MinCount || 1}, \`MaxCount\` = ${item.MaxCount || 1}, \`Comment\` = ${safeComment} WHERE \`Entry\` = ${lootId} AND \`Item\` = ${item.Item} AND \`Reference\` = ${item.Reference || 0} AND \`GroupId\` = ${item.GroupId || 0};`
          );
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
        name="creature_loot"
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
          <h2 className="text-base text-slate-800 font-semibold">
            {activeTable === 'creature' ? 'Creature Loot Table' : activeTable === 'pickpocket' ? 'Pickpocketing Loot Table' : 'Skinning Loot Table'}
          </h2>
          <p className="text-xs text-slate-500 font-mono">
            Table: <code className="text-blue-600 font-bold">{tableName}</code> (Loot ID: {lootId})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddItem}
            className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Loot Item</span>
          </button>
        </div>
      </div>

      {/* Loot ID Config Card */}
      <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm space-y-3 text-xs">
        <h3 className="font-semibold text-slate-800 text-sm">Creature Template Loot IDs</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Creature Loot ID (`lootid`)</label>
            <input
              type="number"
              value={creature.lootid || 0}
              onChange={(e) => {
                if (handleFieldChange) handleFieldChange('lootid', Number(e.target.value) || 0);
                setIsDirty(true);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Pickpocket Loot ID (`pickpocketloot`)</label>
            <input
              type="number"
              value={creature.pickpocketloot || 0}
              onChange={(e) => {
                if (handleFieldChange) handleFieldChange('pickpocketloot', Number(e.target.value) || 0);
                setIsDirty(true);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Skinning Loot ID (`skinloot`)</label>
            <input
              type="number"
              value={creature.skinloot || 0}
              onChange={(e) => {
                if (handleFieldChange) handleFieldChange('skinloot', Number(e.target.value) || 0);
                setIsDirty(true);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Drops Table */}
      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded p-8 text-center text-slate-500 text-sm">
          Loading loot table entries...
        </div>
      ) : lootItems.length === 0 ? (
        <div className="w-full space-y-3 pt-1">
          <div className="w-full bg-[#F1F3F5] border border-[#E2E8F0] rounded py-3 text-center text-[13px] text-slate-700 font-sans shadow-2xs">
            No loot drops defined in {tableName} for ID {lootId}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Item ID</th>
                <th className="py-2.5 px-3">Reference</th>
                <th className="py-2.5 px-3">Chance %</th>
                <th className="py-2.5 px-3">Quest Req</th>
                <th className="py-2.5 px-3">Min Count</th>
                <th className="py-2.5 px-3">Max Count</th>
                <th className="py-2.5 px-3">Group ID</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {lootItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={item.Item}
                        onChange={(e) => handleUpdate(idx, 'Item', Number(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border border-slate-300 rounded font-bold text-blue-600 focus:border-blue-500 focus:outline-none text-xs font-mono"
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
                      value={item.Reference}
                      onChange={(e) => handleUpdate(idx, 'Reference', Number(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs font-mono"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="0.01"
                      value={item.Chance}
                      onChange={(e) => handleUpdate(idx, 'Chance', Number(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs font-mono"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={item.QuestRequired}
                      onChange={(e) => handleUpdate(idx, 'QuestRequired', Number(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs font-mono"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={item.MinCount}
                      onChange={(e) => handleUpdate(idx, 'MinCount', Number(e.target.value) || 1)}
                      className="w-16 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs font-mono"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={item.MaxCount}
                      onChange={(e) => handleUpdate(idx, 'MaxCount', Number(e.target.value) || 1)}
                      className="w-16 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs font-mono"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={item.GroupId}
                      onChange={(e) => handleUpdate(idx, 'GroupId', Number(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs font-mono"
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

      {entityModal && entityModal.open && (
        <EntitySelectorModal
          isOpen={true}
          onClose={() => setEntityModal(null)}
          type={entityModal.type}
          title={entityModal.title}
          initialValue={lootItems[entityModal.index]?.Item || 0}
          onSelect={(id) => {
            handleUpdate(entityModal.index, 'Item', id);
          }}
        />
      )}
    </div>
  );
};
