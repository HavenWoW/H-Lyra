// The Flags1 to FlagsCustom bitmasks of item_sparse, and its readable-page text
// columns.

import React from 'react';
import { InfoTooltip, SelectorButton } from './ItemTooltip';
import { SelectorModalState } from '../types';
import {
  ITEM_FLAGS,
  ITEM_FLAGS_EXTRA,
  ITEM_FLAGS_CUSTOM,
} from '../../../constants/itemOptions';

interface ItemFlagsTextsCardProps {
  item: any;
  setItem: React.Dispatch<React.SetStateAction<any>>;
  setIsDirty: (dirty: boolean) => void;
  openSelector: (config: SelectorModalState) => void;
}

export const ItemFlagsTextsCard: React.FC<ItemFlagsTextsCardProps> = ({
  item,
  setItem,
  setIsDirty,
  openSelector,
}) => {
  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Flags Card */}
      <div className="col-span-12 lg:col-span-6 bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
        <h2 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
          Flags
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center">
              <span>Flags1</span>
              <SelectorButton
                onClick={() =>
                  openSelector({
                    type: 'flags',
                    title: 'Flags',
                    field: 'Flags',
                    flags: ITEM_FLAGS,
                    currentValue: item.Flags || 0,
                    signed: true,
                  })
                }
              />
            </label>
            <input
              type="number"
              value={item.Flags || 0}
              onChange={(e) => {
                setItem((prev: any) => ({ ...prev, Flags: Number(e.target.value) }));
                setIsDirty(true);
              }}
              className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center">
              <span>Flags2</span>
              <SelectorButton
                onClick={() =>
                  openSelector({
                    type: 'flags',
                    title: 'FlagsExtra',
                    field: 'FlagsExtra',
                    flags: ITEM_FLAGS_EXTRA,
                    currentValue: item.FlagsExtra || 0,
                    signed: true,
                  })
                }
              />
            </label>
            <input
              type="number"
              value={item.FlagsExtra || 0}
              onChange={(e) => {
                setItem((prev: any) => ({ ...prev, FlagsExtra: Number(e.target.value) }));
                setIsDirty(true);
              }}
              className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center">
              <span>FlagsCustom</span>
              <SelectorButton
                onClick={() =>
                  openSelector({
                    type: 'flags',
                    title: 'FlagsCustom',
                    field: 'flagsCustom',
                    flags: ITEM_FLAGS_CUSTOM,
                    currentValue: item.flagsCustom || 0,
                  })
                }
              />
            </label>
            <input
              type="number"
              value={item.flagsCustom || 0}
              onChange={(e) => {
                setItem((prev: any) => ({ ...prev, flagsCustom: Number(e.target.value) }));
                setIsDirty(true);
              }}
              className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Texts Card */}
      <div className="col-span-12 lg:col-span-6 bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
        <h2 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
          Texts
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center">
              <span>PageText</span>
              <InfoTooltip text="ID of the text displayed when the item is opened as a readable book (bfa_hotfixes.item_sparse.PageID)." />
            </label>
            <input
              type="number"
              value={item.PageText || 0}
              onChange={(e) => {
                setItem((prev: any) => ({ ...prev, PageText: Number(e.target.value) }));
                setIsDirty(true);
              }}
              className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center">
              <span>PageMaterial</span>
              <InfoTooltip text="Background parchment style for readable page text (bfa_hotfixes.item_sparse.PageMaterialID)." />
            </label>
            <input
              type="number"
              value={item.PageMaterial || 0}
              onChange={(e) => {
                setItem((prev: any) => ({ ...prev, PageMaterial: Number(e.target.value) }));
                setIsDirty(true);
              }}
              className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center">
              <span>LanguageID</span>
              <InfoTooltip text="Language in which readable text is written (bfa_hotfixes.item_sparse.LanguageID)." />
            </label>
            <input
              type="number"
              value={item.LanguageID || 0}
              onChange={(e) => {
                setItem((prev: any) => ({ ...prev, LanguageID: Number(e.target.value) }));
                setIsDirty(true);
              }}
              className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
