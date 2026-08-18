// Loot template editor for items that contain loot.

import React, { useState, useEffect } from 'react';
import { Gift, Plus, Trash2, Copy, ArrowLeft, AlertCircle } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { WowIcon } from '../../../components/WowIcon';
import { SqlQueryBar } from '../../../components/SqlQueryBar';
import { InfoTooltip } from './ItemTooltip';
import { quoteSqlString } from '../../../lib/sql';

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

interface ItemLootViewProps {
  item: any;
  lootType: 'loot' | 'disenchant' | 'prospecting' | 'milling' | 'scrapping';
  onNavigateBack: () => void;
  onSetDirty?: (isDirty: boolean) => void;
}

const TABLE_MAP: Record<string, { table: string; label: string; desc: string }> = {
  loot: {
    table: 'item_loot_template',
    label: 'Item Loot (Container / Lockbox)',
    desc: 'Loot drops obtained when opening this container or item.',
  },
  disenchant: {
    table: 'disenchant_loot_template',
    label: 'Disenchant Loot',
    desc: 'Materials generated when disenchanting this item.',
  },
  prospecting: {
    table: 'prospecting_loot_template',
    label: 'Prospecting Loot',
    desc: 'Gems and materials produced when prospecting this ore.',
  },
  milling: {
    table: 'milling_loot_template',
    label: 'Milling Loot',
    desc: 'Pigments generated when milling this herb.',
  },
  scrapping: {
    table: 'scrapping_loot_template',
    label: 'Scrapping Loot',
    desc: 'Materials returned from the BFA Scrapper (Scrap-O-Matic 1000).',
  },
};

export const ItemLootView: React.FC<ItemLootViewProps> = ({
  item,
  lootType,
  onNavigateBack,
  onSetDirty,
}) => {
  const currentConfig = TABLE_MAP[lootType] || TABLE_MAP.loot;
  const lootTable = currentConfig.table;

  const [rows, setRows] = useState<LootRow[]>([]);
  const [originalRows, setOriginalRows] = useState<LootRow[]>([]);

  const isLootDirty = JSON.stringify(rows) !== JSON.stringify(originalRows);
  useEffect(() => {
    onSetDirty?.(isLootDirty);
  }, [isLootDirty, onSetDirty]);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  const fetchLoot = async () => {
    if (!item || !item.entry) return;
    setLoading(true);
    setStatusText(null);
    try {
      const query = `SELECT \`Entry\`, \`Item\`, \`Reference\`, \`Chance\`, \`QuestRequired\`, \`LootMode\`, \`GroupId\`, \`MinCount\`, \`MaxCount\`, IFNULL(\`Comment\`, '') FROM \`${lootTable}\` WHERE \`Entry\` = ${item.entry} ORDER BY \`GroupId\` ASC, \`Chance\` DESC;`;
      const res = await api.executeSql('world', query);
      if (res.success && res.rows && res.rows.length > 0) {
        const loaded: LootRow[] = res.rows.map((r: any[]) => ({
          Entry: Number(r[0]) || item.entry,
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
        setOriginalRows(JSON.parse(JSON.stringify(loaded)));
        setSelectedRowIndex(null);
        setStatusText(`Loaded ${loaded.length} drop(s) from ${lootTable}.`);
      } else {
        setRows([]);
        setOriginalRows([]);
        setSelectedRowIndex(null);
        setStatusText(`No drops configured in ${lootTable} for Item ${item.entry}.`);
      }
    } catch (e: any) {
      console.error(e);
      setStatusText(`Error fetching loot: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoot();
  }, [item?.entry, lootTable]);

  const addRow = () => {
    const newRow: LootRow = {
      Entry: item.entry,
      Item: 0,
      Reference: 0,
      Chance: 100,
      QuestRequired: 0,
      LootMode: 1,
      GroupId: 0,
      MinCount: 1,
      MaxCount: 1,
      Comment: `Drop for ${item.name || item.entry}`,
    };
    const nextList = [...rows, newRow];
    setRows(nextList);
    setSelectedRowIndex(null);
  };

  const duplicateSelectedRow = () => {
    if (selectedRowIndex === null || !rows[selectedRowIndex]) return;
    const source = rows[selectedRowIndex];
    const duplicated: LootRow = { ...source };
    const nextList = [...rows, duplicated];
    setRows(nextList);
    setSelectedRowIndex(null);
  };

  const removeSelectedRow = () => {
    if (selectedRowIndex === null || !rows[selectedRowIndex]) return;
    const nextList = rows.filter((_, idx) => idx !== selectedRowIndex);
    setRows(nextList);
    if (nextList.length === 0) {
      setSelectedRowIndex(null);
    } else if (selectedRowIndex >= nextList.length) {
      setSelectedRowIndex(nextList.length - 1);
    }
  };

  const updateSelectedField = (field: keyof LootRow, val: any) => {
    if (selectedRowIndex === null || !rows[selectedRowIndex]) return;
    const next = [...rows];
    next[selectedRowIndex] = { ...next[selectedRowIndex], [field]: val };
    setRows(next);
  };

  const generateSql = (mode: 'diff' | 'full' = queryMode): string => {
    if (mode === 'diff') {
      const isIdentical = JSON.stringify(rows) === JSON.stringify(originalRows);
      if (isIdentical) {
        return '';
      }
    }

    let sql = `DELETE FROM \`${lootTable}\` WHERE \`Entry\` = ${item.entry};\n`;
    if (rows.length > 0) {
      sql += `INSERT INTO \`${lootTable}\` (\`Entry\`, \`Item\`, \`Reference\`, \`Chance\`, \`QuestRequired\`, \`LootMode\`, \`GroupId\`, \`MinCount\`, \`MaxCount\`, \`Comment\`) VALUES\n`;
      rows.forEach((r, idx) => {
        const delim = idx + 1 === rows.length ? ';' : ',';
        const commentEscaped = r.Comment ? quoteSqlString(r.Comment) : 'NULL';
        sql += `(${r.Entry}, ${r.Item}, ${r.Reference}, ${r.Chance}, ${r.QuestRequired}, ${r.LootMode}, ${r.GroupId}, ${r.MinCount}, ${r.MaxCount}, ${commentEscaped})${delim}\n`;
      });
    }
    return sql;
  };

  const activeQueryText = generateSql(queryMode);

  const handleCopySql = () => {
    const sql = activeQueryText || generateSql('full');
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecute = async () => {
    const sql = activeQueryText || generateSql('full');
    if (!sql) return;
    setSaving(true);
    try {
      await api.executeSql('world', sql);
      setOriginalRows(JSON.parse(JSON.stringify(rows)));
      setStatusText(`Successfully saved ${rows.length} drop(s) to ${lootTable}.`);
    } catch (e: any) {
      setStatusText(`Execute failed: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    await handleExecute();
    handleCopySql();
  };

  const currentRow = selectedRowIndex !== null ? rows[selectedRowIndex] : null;
  const isFieldsDisabled = selectedRowIndex === null || !currentRow;

  const isDisenchantMissingReq =
    lootType === 'disenchant' && (!item.DisenchantID || item.DisenchantID === 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-hidden select-none font-sans text-slate-800">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-xs flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateBack}
            className="text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded flex items-center gap-1.5 font-medium font-sans transition-colors cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Select Item</span>
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-sans">
            <span className="text-slate-500 font-sans text-xs">Editing:</span>
            <WowIcon
              itemId={item.entry}
              displayId={item.displayid}
              classId={item.class}
              className="w-5 h-5 rounded shadow-2xs border border-slate-300 flex-shrink-0"
            />
            <span className="font-bold text-slate-900 text-xs font-sans">{item.name || 'Unnamed Item'}</span>
            <span className="text-slate-500 font-mono text-xs">({item.entry})</span>
            <span className="text-slate-400 font-sans text-xs">/ {currentConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Prerequisite Alert Banner */}
        {isDisenchantMissingReq && (
          <div className="bg-[#E7F6FD] border border-[#BCE4FA] text-[#0C5460] text-xs px-4 py-3 rounded-lg flex items-center gap-2 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-[#17A2B8] flex-shrink-0" />
            <span>
              You have to set the field <strong>DisenchantID</strong> of <strong>item_sparse</strong> in order to enable this feature.
            </span>
          </div>
        )}

        {/* Unified Query Bar with Diff/Full toggle */}
        <SqlQueryBar
          name="item_loot"
          queryMode={queryMode}
          setQueryMode={setQueryMode}
          activeQueryText={activeQueryText}
          saving={saving}
          copied={copied}
          onCopy={handleCopySql}
          onExecute={handleExecute}
          onExecuteAndCopy={handleExecuteAndCopy}
          onReload={fetchLoot}
        />

        {/* Unified Card Container */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-6 shadow-xs">
          {/* Top Fields in Uniform 6-column Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-center gap-1 select-none">
                <span>Item</span>
                <InfoTooltip text="Item ID that will drop from this container or action." />
              </label>
              <input
                type="number"
                disabled={isFieldsDisabled}
                value={currentRow ? currentRow.Item : ''}
                onChange={(e) => updateSelectedField('Item', Number(e.target.value))}
                placeholder={isFieldsDisabled ? '' : '0'}
                className={`w-full text-xs px-2.5 py-1.5 rounded font-mono text-center border ${
                  isFieldsDisabled
                    ? 'bg-[#eaedf1] text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-center gap-1 select-none">
                <span>Reference</span>
                <InfoTooltip text="Reference to reference_loot_template. If set, Item must be 0." />
              </label>
              <input
                type="number"
                disabled={isFieldsDisabled}
                value={currentRow ? currentRow.Reference : ''}
                onChange={(e) => updateSelectedField('Reference', Number(e.target.value))}
                placeholder={isFieldsDisabled ? '' : '0'}
                className={`w-full text-xs px-2.5 py-1.5 rounded font-mono text-center border ${
                  isFieldsDisabled
                    ? 'bg-[#eaedf1] text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-center gap-1 select-none">
                <span>Chance</span>
                <InfoTooltip text="Drop chance percentage (0 - 100%). Negative value indicates quest drop chance." />
              </label>
              <input
                type="number"
                step="0.01"
                disabled={isFieldsDisabled}
                value={currentRow ? currentRow.Chance : ''}
                onChange={(e) => updateSelectedField('Chance', parseFloat(e.target.value) || 0)}
                placeholder={isFieldsDisabled ? '' : '100'}
                className={`w-full text-xs px-2.5 py-1.5 rounded font-mono text-center border ${
                  isFieldsDisabled
                    ? 'bg-[#eaedf1] text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-center gap-1 select-none">
                <span>QuestRequired</span>
                <InfoTooltip text="1 if item only drops for players on the required quest, otherwise 0." />
              </label>
              <input
                type="number"
                disabled={isFieldsDisabled}
                value={currentRow ? currentRow.QuestRequired : ''}
                onChange={(e) => updateSelectedField('QuestRequired', Number(e.target.value))}
                placeholder={isFieldsDisabled ? '' : '0'}
                className={`w-full text-xs px-2.5 py-1.5 rounded font-mono text-center border ${
                  isFieldsDisabled
                    ? 'bg-[#eaedf1] text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-center gap-1 select-none">
                <span>LootMode</span>
                <InfoTooltip text="Bitmask for dungeon/raid difficulties or modes (default 1)." />
              </label>
              <input
                type="number"
                disabled={isFieldsDisabled}
                value={currentRow ? currentRow.LootMode : ''}
                onChange={(e) => updateSelectedField('LootMode', Number(e.target.value))}
                placeholder={isFieldsDisabled ? '' : '1'}
                className={`w-full text-xs px-2.5 py-1.5 rounded font-mono text-center border ${
                  isFieldsDisabled
                    ? 'bg-[#eaedf1] text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-center gap-1 select-none">
                <span>GroupId</span>
                <InfoTooltip text="Loot group ID. Maximum 1 item drops from each group (>0)." />
              </label>
              <input
                type="number"
                disabled={isFieldsDisabled}
                value={currentRow ? currentRow.GroupId : ''}
                onChange={(e) => updateSelectedField('GroupId', Number(e.target.value))}
                placeholder={isFieldsDisabled ? '' : '0'}
                className={`w-full text-xs px-2.5 py-1.5 rounded font-mono text-center border ${
                  isFieldsDisabled
                    ? 'bg-[#eaedf1] text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-center gap-1 select-none">
                <span>MinCount</span>
                <InfoTooltip text="Minimum quantity of items dropped." />
              </label>
              <input
                type="number"
                disabled={isFieldsDisabled}
                value={currentRow ? currentRow.MinCount : ''}
                onChange={(e) => updateSelectedField('MinCount', Number(e.target.value))}
                placeholder={isFieldsDisabled ? '' : '1'}
                className={`w-full text-xs px-2.5 py-1.5 rounded font-mono text-center border ${
                  isFieldsDisabled
                    ? 'bg-[#eaedf1] text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-center gap-1 select-none">
                <span>MaxCount</span>
                <InfoTooltip text="Maximum quantity of items dropped." />
              </label>
              <input
                type="number"
                disabled={isFieldsDisabled}
                value={currentRow ? currentRow.MaxCount : ''}
                onChange={(e) => updateSelectedField('MaxCount', Number(e.target.value))}
                placeholder={isFieldsDisabled ? '' : '1'}
                className={`w-full text-xs px-2.5 py-1.5 rounded font-mono text-center border ${
                  isFieldsDisabled
                    ? 'bg-[#eaedf1] text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs'
                }`}
              />
            </div>

            {/* Comment (spanning remaining 4 columns) */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-4 space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-center gap-1 select-none">
                <span>Comment</span>
                <InfoTooltip text="Optional description / comment for this drop." />
              </label>
              <input
                type="text"
                disabled={isFieldsDisabled}
                value={currentRow ? currentRow.Comment : ''}
                onChange={(e) => updateSelectedField('Comment', e.target.value)}
                placeholder={isFieldsDisabled ? '' : 'Drop comment...'}
                className={`w-full text-xs px-2.5 py-1.5 rounded border text-center ${
                  isFieldsDisabled
                    ? 'bg-[#eaedf1] text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs'
                }`}
              />
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-2 select-none pt-1">
            <button
              type="button"
              disabled={selectedRowIndex === null}
              onClick={removeSelectedRow}
              className="bg-[#DC3545] hover:bg-[#BB2D3B] text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete selected row</span>
            </button>

            <button
              type="button"
              onClick={addRow}
              className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add new row</span>
            </button>

            <button
              type="button"
              disabled={selectedRowIndex === null}
              onClick={duplicateSelectedRow}
              className="bg-[#6C757D] hover:bg-[#5C636A] text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate selected row</span>
            </button>
          </div>

          {/* Unified Table or Empty State matching SQL editor */}
          {rows.length === 0 ? (
            <div className="w-full space-y-3 pt-2">
              <div className="w-full bg-[#F1F3F5] border border-[#E2E8F0] rounded py-2.5 text-center text-[13px] text-slate-700 font-sans shadow-2xs">
                No data to display
              </div>
              <div className="text-center text-[13px] text-slate-700 font-sans select-none pt-1">
                0 selected / 0 total
              </div>
            </div>
          ) : (
            <div className="w-full overflow-x-auto select-none pt-2">
              <table className="w-full text-[13px] border-collapse font-sans">
                <thead>
                  <tr className="text-slate-800 font-semibold select-none">
                    <th style={{ width: '4%' }} className="py-2.5 px-2 text-center"></th>
                    <th style={{ width: '12%' }} className="py-2.5 px-3 text-center">Item ID &#8597;</th>
                    <th style={{ width: '22%' }} className="py-2.5 px-3 text-center">Comment / Name &#8597;</th>
                    <th style={{ width: '10%' }} className="py-2.5 px-3 text-center">Reference &#8597;</th>
                    <th style={{ width: '10%' }} className="py-2.5 px-3 text-center">Chance (%) &#8597;</th>
                    <th style={{ width: '10%' }} className="py-2.5 px-3 text-center">QuestReq &#8597;</th>
                    <th style={{ width: '10%' }} className="py-2.5 px-3 text-center">LootMode &#8597;</th>
                    <th style={{ width: '8%' }} className="py-2.5 px-3 text-center">GroupId &#8597;</th>
                    <th style={{ width: '8%' }} className="py-2.5 px-3 text-center">MinCount &#8597;</th>
                    <th style={{ width: '8%' }} className="py-2.5 px-3 text-center">MaxCount &#8597;</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const isSelected = selectedRowIndex === idx;
                    return (
                      <tr
                        key={idx}
                        onClick={() => setSelectedRowIndex(idx)}
                        className={`cursor-pointer border-t border-slate-100 transition-colors ${
                          isSelected
                            ? 'bg-slate-50 font-medium'
                            : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <td className="py-2.5 px-2 text-center">
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full border border-slate-300 bg-white flex items-center justify-center mx-auto shadow-2xs text-slate-700">
                              <span className="text-[10px] font-bold font-mono leading-none">&#9654;</span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-center font-bold text-slate-900">
                          {row.Item}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-800 truncate" title={row.Comment}>
                          {row.Comment || `Drop #${row.Item}`}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-center text-slate-700">
                          {row.Reference}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-center text-slate-700">
                          {row.Chance}%
                        </td>
                        <td className="py-2.5 px-3 font-mono text-center text-slate-700">
                          {row.QuestRequired}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-center text-slate-700">
                          {row.LootMode}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-center text-slate-700">
                          {row.GroupId}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-center text-slate-700">
                          {row.MinCount}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-center text-slate-700">
                          {row.MaxCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Centered Table Footer */}
              <div className="border-t border-slate-200 mt-2.5 pt-2 pb-0.5 text-center text-[13px] text-slate-700 font-sans select-none">
                {selectedRowIndex !== null ? 1 : 0} selected / {rows.length} total
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

