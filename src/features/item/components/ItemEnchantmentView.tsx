// Enchantment editor for the item.

import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { TABLE_HASH_ITEM_SPARSE } from '../../../constants/hotfixData';
import { SelectorButton } from './ItemTooltip';
import { SqlQueryBar } from '../../../components/SqlQueryBar';

import { generateDiffQuery, generateFullQuery } from '../utils/itemSqlGenerator';
import { WowIcon } from '../../../components/WowIcon';

interface ItemEnchantmentViewProps {
  item: any;
  onNavigateBack: () => void;
}

export const ItemEnchantmentView: React.FC<ItemEnchantmentViewProps> = ({
  item,
  onNavigateBack,
}) => {
  const [socketBonus, setSocketBonus] = useState<number>(item?.socketBonus || 0);
  const [gemProperties, setGemProperties] = useState<number>(item?.GemProperties || 0);
  const [statScalingFactor, setStatScalingFactor] = useState<number>(item?.StatScalingFactor || 0);
  const [originalItem, setOriginalItem] = useState<any>(item);
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setSocketBonus(item.socketBonus || 0);
      setGemProperties(item.GemProperties || 0);
      setStatScalingFactor(item.StatScalingFactor || 0);
      setOriginalItem(JSON.parse(JSON.stringify(item)));
    }
  }, [item?.entry]);

  const currentItem = {
    ...originalItem,
    socketBonus,
    GemProperties: gemProperties,
    StatScalingFactor: statScalingFactor,
  };

  const activeQueryText = queryMode === 'diff'
    ? generateDiffQuery(originalItem, currentItem)
    : generateFullQuery(currentItem);

  const handleCopySql = () => {
    const sql = activeQueryText || generateFullQuery(currentItem);
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecute = async () => {
    const sql = activeQueryText || generateFullQuery(currentItem);
    if (!sql) return;
    setSaving(true);
    try {
      await api.executeSql('hotfixes', sql);
      setOriginalItem(JSON.parse(JSON.stringify(currentItem)));
      setStatusText(`Successfully updated enchantment data for Item ${item.entry}.`);
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

  const handleReload = () => {
    if (originalItem) {
      setSocketBonus(originalItem.socketBonus || 0);
      setGemProperties(originalItem.GemProperties || 0);
      setStatScalingFactor(originalItem.StatScalingFactor || 0);
    }
  };

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
            <span className="font-bold text-slate-900 text-xs font-sans">
              {item?.name || 'Unknown Item'}
            </span>
            <span className="text-slate-500 font-mono text-xs">({item?.entry})</span>
            <span className="text-slate-400 font-sans text-xs">/ Sockets & Enchantments</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <SqlQueryBar
          name="item_enchantment"
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

        {/* Status Message */}
        {statusText && (
          <div className="text-xs font-mono px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded">
            {statusText}
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 shadow-xs">
          <h2 className="text-xs font-bold text-slate-700 border-b border-slate-200 pb-2 uppercase tracking-wide">
            Enchantment Properties
          </h2>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 sm:col-span-4 space-y-1">
              <label className="text-xs font-bold text-slate-700">
                SocketMatchEnchantmentId
              </label>
              <input
                type="number"
                value={socketBonus}
                onChange={(e) => setSocketBonus(Number(e.target.value))}
                placeholder="SpellItemEnchantment ID"
                className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
              />
              <span className="text-[11px] text-slate-500 block">
                Bonus enchantment triggered when matching socket colors.
              </span>
            </div>

            <div className="col-span-12 sm:col-span-4 space-y-1">
              <label className="text-xs font-bold text-slate-700">
                GemProperties
              </label>
              <input
                type="number"
                value={gemProperties}
                onChange={(e) => setGemProperties(Number(e.target.value))}
                placeholder="GemProperties ID"
                className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
              />
              <span className="text-[11px] text-slate-500 block">
                GemProperties ID if this item is a socketable gem.
              </span>
            </div>

            <div className="col-span-12 sm:col-span-4 space-y-1">
              <label className="text-xs font-bold text-slate-700">
                ScalingStatDistributionID
              </label>
              <input
                type="number"
                value={statScalingFactor}
                onChange={(e) => setStatScalingFactor(Number(e.target.value))}
                placeholder="ScalingStatDistribution ID"
                className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
              />
              <span className="text-[11px] text-slate-500 block">
                Heirloom / Scaling stat distribution ID.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
