// Item editor, covering the item and item_sparse hotfix tables.

import React, { useState } from 'react';
import { ArrowLeft, Copy } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { WowIcon } from '../../../components/WowIcon';
import { SingleValueSelectorModal } from '../../../components/SingleValueSelectorModal';
import { FlagsSelectorModal } from '../../../components/FlagsSelectorModal';
import { SqlPreviewModal } from '../../../components/SqlPreviewModal';
import { SqlQueryBar } from '../../../components/SqlQueryBar';
import { ItemMiscellaneousCard } from './ItemMiscellaneousCard';
import { ItemFlagsTextsCard } from './ItemFlagsTextsCard';
import { ItemRequirementsStatsCard } from './ItemRequirementsStatsCard';
import { SelectorModalState, getQualityColor } from '../types';
import { generateDiffQuery, generateFullQuery, isItemModified } from '../utils/itemSqlGenerator';

interface ItemDetailEditorProps {
  item: any;
  setItem: React.Dispatch<React.SetStateAction<any>>;
  initialItem: any;
  setInitialItem: (item: any) => void;
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  onNavigateBack: () => void;
}

export const ItemDetailEditor: React.FC<ItemDetailEditorProps> = ({
  item,
  setItem,
  initialItem,
  setInitialItem,
  isDirty,
  setIsDirty,
  onNavigateBack,
}) => {
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [activeSelectorModal, setActiveSelectorModal] = useState<SelectorModalState | null>(null);

  // Derive dirty state dynamically: if the user changes fields back to initial values, isDirty becomes false
  React.useEffect(() => {
    if (initialItem && item) {
      const modified = isItemModified(initialItem, item);
      setIsDirty(modified);
    }
  }, [item, initialItem, setIsDirty]);

  const activeQueryText = queryMode === 'diff' ? generateDiffQuery(initialItem, item) : generateFullQuery(item);

  const handleCopySql = () => {
    const sql = activeQueryText || generateFullQuery(item);
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteQuery = async () => {
    const sql = activeQueryText;
    if (!sql) return;
    setSaving(true);
    try {
      await api.executeSql('hotfixes', sql);
      const saved = { ...item, _isNew: false, has_sql_override: true };
      setItem(saved);
      setInitialItem(JSON.parse(JSON.stringify(saved)));
      setIsDirty(false);
    } catch (e) {
      console.error('Execute failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    const sql = activeQueryText;
    if (!sql) return;
    setSaving(true);
    try {
      await api.executeSql('hotfixes', sql);
      navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      const saved = { ...item, _isNew: false, has_sql_override: true };
      setItem(saved);
      setInitialItem(JSON.parse(JSON.stringify(saved)));
      setIsDirty(false);
    } catch (e) {
      console.error('Execute & Copy failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleReload = () => {
    if (initialItem) {
      setItem(JSON.parse(JSON.stringify(initialItem)));
      setIsDirty(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-hidden select-none font-sans text-slate-800">
      {/* Top Header Bar */}
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
            <span className={`font-bold ${getQualityColor(item.Quality)} text-xs font-sans`}>
              {item.name || 'Unnamed Item'}
            </span>
            <span className="text-slate-500 font-mono text-xs">({item.entry})</span>
          </div>
          {isDirty && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-amber-100 text-amber-800 border border-amber-300">
              Unsaved Changes
            </span>
          )}
        </div>
      </div>

      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F0F2F5]">
        <SqlQueryBar
          name="item"
          queryMode={queryMode}
          setQueryMode={setQueryMode}
          activeQueryText={activeQueryText}
          saving={saving}
          copied={copied}
          onCopy={handleCopySql}
          onExecute={handleExecuteQuery}
          onExecuteAndCopy={handleExecuteAndCopy}
          onReload={handleReload}
        />

        <ItemMiscellaneousCard
          item={item}
          setItem={setItem}
          setIsDirty={setIsDirty}
          openSelector={setActiveSelectorModal}
        />

        <ItemFlagsTextsCard
          item={item}
          setItem={setItem}
          setIsDirty={setIsDirty}
          openSelector={setActiveSelectorModal}
        />

        <ItemRequirementsStatsCard
          item={item}
          setItem={setItem}
          setIsDirty={setIsDirty}
          openSelector={setActiveSelectorModal}
        />
      </div>

      <SqlPreviewModal
        isOpen={sqlModalOpen}
        onClose={() => setSqlModalOpen(false)}
        sqlQuery={activeQueryText || generateFullQuery(item)}
        title={`SQL Migration - Item [${item.entry}] ${item.name}`}
      />

      {/* Single Value Enum Selector Modal */}
      {activeSelectorModal && activeSelectorModal.type === 'single' && activeSelectorModal.options && (
        <SingleValueSelectorModal
          isOpen={true}
          onClose={() => setActiveSelectorModal(null)}
          title={activeSelectorModal.title}
          options={activeSelectorModal.options}
          selectedValue={item[activeSelectorModal.field] || 0}
          onSelect={(val) => {
            setItem((prev: any) => ({ ...prev, [activeSelectorModal.field]: val }));
            setIsDirty(true);
          }}
        />
      )}

      {/* Bitmask Flags Selector Modal */}
      {activeSelectorModal && activeSelectorModal.type === 'flags' && activeSelectorModal.flags && (
        <FlagsSelectorModal
          isOpen={true}
          onClose={() => setActiveSelectorModal(null)}
          title={activeSelectorModal.title}
          flags={activeSelectorModal.flags}
          currentValue={item[activeSelectorModal.field] ?? 0}
          isBigInt={activeSelectorModal.isBigInt}
          width={activeSelectorModal.width}
          signed={activeSelectorModal.signed}
          onSelect={(val) => {
            setItem((prev: any) => ({ ...prev, [activeSelectorModal.field]: val }));
            setIsDirty(true);
          }}
        />
      )}
    </div>
  );
};
