// Editor for item_effect: the spells an item casts, layered over the DB2 base
// rows.

import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, Trash2, Copy, ArrowLeft } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { TABLE_HASH_ITEM_EFFECT } from '../../../constants/hotfixData';
import { WowIcon } from '../../../components/WowIcon';
import { SqlQueryBar } from '../../../components/SqlQueryBar';
import { InfoTooltip } from './ItemTooltip';

// Rows arriving from the Rust EffectiveItemRepository carry snake_case fields
// (serde default) plus provenance layers mirroring EffectiveItem.
interface ItemEffectRow {
  id: number;
  legacy_slot_index: number;
  trigger_type: number;
  charges: number;
  cooldown_msec: number;
  category_cooldown_msec: number;
  spell_category_id: number;
  spell_id: number;
  chr_specialization_id: number;
  parent_item_id: number;
  source_kind: 'Db2Base' | 'SqlOverride' | 'CustomSql' | 'Hybrid';
  source_badge: string;
  has_db2_base: boolean;
  has_sql_override: boolean;
  is_custom: boolean;
}

interface ItemEffectsViewProps {
  item: any;
  onNavigateBack: () => void;
  onSetDirty?: (isDirty: boolean) => void;
}

const TRIGGER_TYPES: { [key: number]: string } = {
  0: 'On Use',
  1: 'On Equip',
  2: 'Chance on Hit',
  4: 'Soulstone',
  5: 'Combat Use (No Delay)',
  6: 'Learn Spell',
};

export const ItemEffectsView: React.FC<ItemEffectsViewProps> = ({
  item,
  onNavigateBack,
  onSetDirty,
}) => {
  const [effects, setEffects] = useState<ItemEffectRow[]>([]);
  const [originalEffects, setOriginalEffects] = useState<ItemEffectRow[]>([]);

  const isEffectsDirty = JSON.stringify(effects) !== JSON.stringify(originalEffects);
  useEffect(() => {
    onSetDirty?.(isEffectsDirty);
  }, [isEffectsDirty, onSetDirty]);
  const [selectedEffectIndex, setSelectedEffectIndex] = useState<number | null>(null);
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [deletedDb2EffectIds, setDeletedDb2EffectIds] = useState<number[]>([]);

  const fetchEffects = async () => {
    if (!item || !item.entry) return;
    setLoading(true);
    setStatusText(null);
    setDeletedDb2EffectIds([]);
    try {
      // The EffectiveItemRepository owns the SQL fetch + DB2 merge; only the
      // parent item id is sent over IPC.
      const rows = await api.getItemEffects(item.entry);
      if (rows && rows.length > 0) {
        const loaded: ItemEffectRow[] = rows.map((r: any) => ({
          id: Number(r.id) || 0,
          legacy_slot_index: Number(r.legacy_slot_index) || 0,
          trigger_type: Number(r.trigger_type) || 0,
          charges: Number(r.charges) || 0,
          cooldown_msec: Number(r.cooldown_msec) ?? -1,
          category_cooldown_msec: Number(r.category_cooldown_msec) ?? -1,
          spell_category_id: Number(r.spell_category_id) || 0,
          spell_id: Number(r.spell_id) || 0,
          chr_specialization_id: Number(r.chr_specialization_id) || 0,
          parent_item_id: Number(r.parent_item_id) || item.entry,
          source_kind: r.source_kind ?? 'Db2Base',
          source_badge: r.source_badge ?? '',
          has_db2_base: Boolean(r.has_db2_base),
          has_sql_override: Boolean(r.has_sql_override),
          is_custom: Boolean(r.is_custom),
        }));
        setEffects(loaded);
        setOriginalEffects(JSON.parse(JSON.stringify(loaded)));
      } else {
        setEffects([]);
        setOriginalEffects([]);
      }
    } catch (e: any) {
      console.error('Failed to fetch item effects:', e);
      setStatusText(`Error: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEffects();
  }, [item?.entry]);

  const nextEffectId = async (): Promise<number> => {
    try {
      const next = await api.getNextEffectId();
      const maxExisting = effects.reduce((m, e) => Math.max(m, e.id || 0), 0);
      return Math.max(next, maxExisting + 1);
    } catch {
      const maxExisting = effects.reduce((m, e) => Math.max(m, e.id || 0), 0);
      return maxExisting > 0 ? maxExisting + 1 : 1;
    }
  };

  const addEffectRow = async () => {
    const nextSlot = effects.length;
    const nextId = await nextEffectId();
    const newRow: ItemEffectRow = {
      id: nextId,
      legacy_slot_index: nextSlot,
      trigger_type: 0,
      charges: 0,
      cooldown_msec: -1,
      category_cooldown_msec: -1,
      spell_category_id: 0,
      spell_id: 0,
      chr_specialization_id: 0,
      parent_item_id: item.entry,
      source_kind: 'CustomSql',
      source_badge: 'Custom SQL',
      has_db2_base: false,
      has_sql_override: true,
      is_custom: true,
    };
    const nextList = [...effects, newRow];
    setEffects(nextList);
    setSelectedEffectIndex(null);
  };

  const duplicateSelectedEffect = async () => {
    if (selectedEffectIndex === null || !effects[selectedEffectIndex]) return;
    const source = effects[selectedEffectIndex];
    const nextSlot = effects.length;
    const nextId = await nextEffectId();
    const duplicated: ItemEffectRow = {
      ...source,
      id: nextId,
      legacy_slot_index: nextSlot,
      source_kind: 'CustomSql',
      source_badge: 'Custom SQL',
      has_db2_base: false,
      has_sql_override: true,
      is_custom: true,
    };
    const nextList = [...effects, duplicated];
    setEffects(nextList);
    setSelectedEffectIndex(null);
  };

  const removeSelectedEffect = () => {
    if (selectedEffectIndex === null || !effects[selectedEffectIndex]) return;
    const target = effects[selectedEffectIndex];
    if (target.has_db2_base && target.id) {
      setDeletedDb2EffectIds((prev) => [...prev, target.id]);
    }
    const nextList = effects.filter((_, idx) => idx !== selectedEffectIndex);
    setEffects(nextList);
    if (nextList.length === 0) {
      setSelectedEffectIndex(null);
    } else if (selectedEffectIndex >= nextList.length) {
      setSelectedEffectIndex(nextList.length - 1);
    }
  };

  const updateSelectedField = (field: keyof ItemEffectRow, val: any) => {
    if (selectedEffectIndex === null || !effects[selectedEffectIndex]) return;
    const next = [...effects];
    next[selectedEffectIndex] = { ...next[selectedEffectIndex], [field]: val };
    setEffects(next);
  };

  const effectIdAt = (eff: ItemEffectRow, idx: number): number =>
    eff.id || idx + 1;

  const generateSql = (mode: 'diff' | 'full' = queryMode): string => {
    if (mode === 'diff') {
      const isIdentical =
        JSON.stringify(effects) === JSON.stringify(originalEffects) &&
        deletedDb2EffectIds.length === 0;
      if (isIdentical) {
        return '';
      }
    }

    const queries: string[] = [];

    // Safe deletion: only remove custom hotfix records, never official VerifiedBuild > 0 rows
    queries.push(`DELETE FROM \`item_effect\` WHERE \`ParentItemID\` = ${item.entry} AND \`VerifiedBuild\` <= 0;`);

    if (effects.length > 0) {
      const valueTuples = effects.map((eff, idx) =>
        `(${effectIdAt(eff, idx)}, ${eff.legacy_slot_index ?? idx}, ${eff.trigger_type || 0}, ${eff.charges || 0}, ${eff.cooldown_msec ?? -1}, ${eff.category_cooldown_msec ?? -1}, ${eff.spell_category_id || 0}, ${eff.spell_id || 0}, ${eff.chr_specialization_id || 0}, ${item.entry}, 0)`
      );
      queries.push(`INSERT INTO \`item_effect\` (\`ID\`, \`LegacySlotIndex\`, \`TriggerType\`, \`Charges\`, \`CoolDownMSec\`, \`CategoryCoolDownMSec\`, \`SpellCategoryID\`, \`SpellID\`, \`ChrSpecializationID\`, \`ParentItemID\`, \`VerifiedBuild\`) VALUES\n${valueTuples.join(',\n')};`);

      const hotfixTuples = effects.map((eff, idx) => {
        const effId = effectIdAt(eff, idx);
        return `(${effId}, ${TABLE_HASH_ITEM_EFFECT}, ${effId}, 0, 0)`;
      });
      queries.push(`REPLACE INTO \`hotfix_data\` (\`Id\`, \`TableHash\`, \`RecordId\`, \`Deleted\`, \`VerifiedBuild\`) VALUES\n${hotfixTuples.join(',\n')};`);
    }

    // Register deletions for DB2-backed effects so HavenCore engine erases them
    if (deletedDb2EffectIds.length > 0) {
      const deleteTuples = deletedDb2EffectIds.map((delId) =>
        `(${delId}, ${TABLE_HASH_ITEM_EFFECT}, ${delId}, 1, 0)`
      );
      queries.push(`REPLACE INTO \`hotfix_data\` (\`Id\`, \`TableHash\`, \`RecordId\`, \`Deleted\`, \`VerifiedBuild\`) VALUES\n${deleteTuples.join(',\n')};`);
    }

    return queries.join('\n\n');
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
      await api.executeSql('hotfixes', sql);
      setOriginalEffects(JSON.parse(JSON.stringify(effects)));
      setStatusText(`Successfully saved ${effects.length} item effect(s) to hotfixes.`);
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

  const currentEff = selectedEffectIndex !== null ? effects[selectedEffectIndex] : null;
  const isFieldsDisabled = selectedEffectIndex === null || !currentEff;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-hidden select-none font-sans text-slate-800">
      {/* Top Header */}
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
            <span className="text-slate-400 font-sans text-xs">/ Item Effects</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <SqlQueryBar
          name="item_effects"
          queryMode={queryMode}
          setQueryMode={setQueryMode}
          activeQueryText={activeQueryText}
          saving={saving}
          copied={copied}
          onCopy={handleCopySql}
          onExecute={handleExecute}
          onExecuteAndCopy={handleExecuteAndCopy}
          onReload={fetchEffects}
        />

        {/* Unified Card Container */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-6 shadow-xs">
          {/* Top Fields in Uniform 6-column Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-center gap-1 select-none">
                <span>SpellID</span>
                <InfoTooltip text="Spell ID attached to this item effect." />
              </label>
              <input
                type="number"
                disabled={isFieldsDisabled}
                value={currentEff ? currentEff.spell_id : ''}
                onChange={(e) => updateSelectedField('spell_id', Number(e.target.value))}
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
                <span>TriggerType</span>
                <InfoTooltip text="The trigger type determining when the spell is cast (On Equip, On Use, Chance on Hit, etc.)." />
              </label>
              <select
                disabled={isFieldsDisabled}
                value={currentEff ? currentEff.trigger_type : ''}
                onChange={(e) => updateSelectedField('trigger_type', Number(e.target.value))}
                className={`w-full text-xs px-2.5 py-1.5 rounded border text-center ${
                  isFieldsDisabled
                    ? 'bg-[#eaedf1] text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs'
                }`}
              >
                {Object.entries(TRIGGER_TYPES).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-center gap-1 select-none">
                <span>Charges</span>
                <InfoTooltip text="Number of charges (0 = infinite / not consumed, negative = consumed on use)." />
              </label>
              <input
                type="number"
                disabled={isFieldsDisabled}
                value={currentEff ? currentEff.charges : ''}
                onChange={(e) => updateSelectedField('charges', Number(e.target.value))}
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
                <span>CoolDownMSec</span>
                <InfoTooltip text="Cooldown in milliseconds (-1 for default spell cooldown)." />
              </label>
              <input
                type="number"
                disabled={isFieldsDisabled}
                value={currentEff ? currentEff.cooldown_msec : ''}
                onChange={(e) => updateSelectedField('cooldown_msec', Number(e.target.value))}
                placeholder={isFieldsDisabled ? '' : '-1'}
                className={`w-full text-xs px-2.5 py-1.5 rounded font-mono text-center border ${
                  isFieldsDisabled
                    ? 'bg-[#eaedf1] text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-center gap-1 select-none">
                <span>CategoryCoolDownMSec</span>
                <InfoTooltip text="Category cooldown in milliseconds (-1 for default)." />
              </label>
              <input
                type="number"
                disabled={isFieldsDisabled}
                value={currentEff ? currentEff.category_cooldown_msec : ''}
                onChange={(e) => updateSelectedField('category_cooldown_msec', Number(e.target.value))}
                placeholder={isFieldsDisabled ? '' : '-1'}
                className={`w-full text-xs px-2.5 py-1.5 rounded font-mono text-center border ${
                  isFieldsDisabled
                    ? 'bg-[#eaedf1] text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-center gap-1 select-none">
                <span>SpellCategoryID</span>
                <InfoTooltip text="Shared spell category ID for shared cooldowns." />
              </label>
              <input
                type="number"
                disabled={isFieldsDisabled}
                value={currentEff ? currentEff.spell_category_id : ''}
                onChange={(e) => updateSelectedField('spell_category_id', Number(e.target.value))}
                placeholder={isFieldsDisabled ? '' : '0'}
                className={`w-full text-xs px-2.5 py-1.5 rounded font-mono text-center border ${
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
              disabled={selectedEffectIndex === null}
              onClick={removeSelectedEffect}
              className="bg-[#DC3545] hover:bg-[#BB2D3B] text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete selected row</span>
            </button>

            <button
              type="button"
              onClick={addEffectRow}
              className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add new row</span>
            </button>

            <button
              type="button"
              disabled={selectedEffectIndex === null}
              onClick={duplicateSelectedEffect}
              className="bg-[#6C757D] hover:bg-[#5C636A] text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate selected row</span>
            </button>
          </div>

          {/* Unified Table or Empty State matching SQL editor */}
          {effects.length === 0 ? (
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
                    <th style={{ width: '10%' }} className="py-2.5 px-3 text-center">Slot &#8597;</th>
                    <th style={{ width: '16%' }} className="py-2.5 px-3 text-center">Spell ID &#8597;</th>
                    <th style={{ width: '22%' }} className="py-2.5 px-3 text-center">Trigger Type &#8597;</th>
                    <th style={{ width: '12%' }} className="py-2.5 px-3 text-center">Charges &#8597;</th>
                    <th style={{ width: '12%' }} className="py-2.5 px-3 text-center">Cooldown (ms) &#8597;</th>
                    <th style={{ width: '12%' }} className="py-2.5 px-3 text-center">Cat. Cooldown (ms) &#8597;</th>
                    <th style={{ width: '12%' }} className="py-2.5 px-3 text-center">Spell Category &#8597;</th>
                  </tr>
                </thead>
                <tbody>
                  {effects.map((eff, idx) => {
                    const isSelected = selectedEffectIndex === idx;
                    return (
                      <tr
                        key={idx}
                        onClick={() => setSelectedEffectIndex(idx)}
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
                        <td className="py-2.5 px-3 font-mono text-center text-slate-700">
                          #{eff.legacy_slot_index ?? idx}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-center text-slate-900 font-bold">
                          {eff.spell_id}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-800">
                          {TRIGGER_TYPES[eff.trigger_type] || `Trigger ${eff.trigger_type}`}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-center text-slate-700">
                          {eff.charges}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-center text-slate-700">
                          {eff.cooldown_msec}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-center text-slate-700">
                          {eff.category_cooldown_msec}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-center text-slate-700">
                          {eff.spell_category_id}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Centered Table Footer */}
              <div className="border-t border-slate-200 mt-2.5 pt-2 pb-0.5 text-center text-[13px] text-slate-700 font-sans select-none">
                {selectedEffectIndex !== null ? 1 : 0} selected / {effects.length} total
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
