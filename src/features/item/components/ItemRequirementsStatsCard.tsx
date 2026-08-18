// Requirement and stat columns of item_sparse.

import React from 'react';
import { InfoTooltip, SelectorButton } from './ItemTooltip';
import { SelectorModalState } from '../types';
import {
  ALLOWABLE_CLASSES,
  ALLOWABLE_RACES,
  STAT_TYPE,
  SOCKET_COLOR_OPTIONS,
} from '../../../constants/itemOptions';

interface ItemRequirementsStatsCardProps {
  item: any;
  setItem: React.Dispatch<React.SetStateAction<any>>;
  setIsDirty: (dirty: boolean) => void;
  openSelector: (config: SelectorModalState) => void;
}

export const ItemRequirementsStatsCard: React.FC<ItemRequirementsStatsCardProps> = ({
  item,
  setItem,
  setIsDirty,
  openSelector,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3.5 shadow-xs">
      <h2 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
        Requirements & Item Stats
      </h2>
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 sm:col-span-3 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>ItemLevel</span>
            <InfoTooltip text="The item level (iLvl), governing combat scaling and stat budget (bfa_hotfixes.item_sparse.ItemLevel)." />
          </label>
          <input
            type="number"
            value={item.ItemLevel || 1}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, ItemLevel: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-3 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>RequiredLevel</span>
            <InfoTooltip text="Minimum character level required to equip or use this item (bfa_hotfixes.item_sparse.RequiredLevel)." />
          </label>
          <input
            type="number"
            value={item.RequiredLevel || 1}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, RequiredLevel: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-3 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>AllowableClass</span>
            <SelectorButton
              onClick={() =>
                openSelector({
                  type: 'flags',
                  title: 'Allowable Class',
                  field: 'AllowableClass',
                  flags: ALLOWABLE_CLASSES,
                  currentValue: item.AllowableClass ?? -1,
                  width: 16,
                  signed: true,
                })
              }
            />
          </label>
          <input
            type="number"
            // Signed 16-bit column: -1 means "all classes". Bounding the input
            // keeps an out-of-range value from being silently clamped on save.
            min={-32768}
            max={32767}
            value={item.AllowableClass ?? -1}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, AllowableClass: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-3 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>AllowableRace</span>
            <SelectorButton
              onClick={() =>
                openSelector({
                  type: 'flags',
                  title: 'Allowable Race',
                  field: 'AllowableRace',
                  flags: ALLOWABLE_RACES,
                  currentValue: String(item.AllowableRace ?? -1),
                  isBigInt: true,
                  signed: true,
                })
              }
            />
          </label>
          <input
            type="text"
            value={String(item.AllowableRace ?? -1)}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, AllowableRace: e.target.value }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-3 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>RequiredSkill</span>
            <InfoTooltip text="Skill/profession ID required to equip or use (bfa_hotfixes.item_sparse.RequiredSkill)." />
          </label>
          <input
            type="number"
            value={item.RequiredSkill || 0}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, RequiredSkill: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-3 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>RequiredSkillRank</span>
            <InfoTooltip text="Minimum skill rank required in the specified profession (bfa_hotfixes.item_sparse.RequiredSkillRank)." />
          </label>
          <input
            type="number"
            value={item.RequiredSkillRank || 0}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, RequiredSkillRank: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-3 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>MinFactionID</span>
            <InfoTooltip text="Faction ID required for reputation requirement (bfa_hotfixes.item_sparse.MinFactionID)." />
          </label>
          <input
            type="number"
            value={item.RequiredReputationFaction || 0}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, RequiredReputationFaction: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-3 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>MinReputation</span>
            <InfoTooltip text="Minimum reputation standing rank required (bfa_hotfixes.item_sparse.MinReputation)." />
          </label>
          <input
            type="number"
            value={item.RequiredReputationRank || 0}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, RequiredReputationRank: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>
      </div>

      {/* Stat Modifiers Grid */}
      <div className="pt-2 border-t border-slate-200">
        <h3 className="text-xs font-bold text-slate-700 mb-2">Item Stat Modifiers (StatModifierBonusStat 1-4)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((statIdx) => (
            <div key={statIdx} className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">Stat #{statIdx}</span>
                <SelectorButton
                  onClick={() =>
                    openSelector({
                      type: 'single',
                      title: `Stat #${statIdx} Type`,
                      field: `stat_type${statIdx}`,
                      options: STAT_TYPE,
                      selectedValue: item[`stat_type${statIdx}`] || 0,
                    })
                  }
                />
              </div>
              <input
                type="number"
                value={item[`stat_type${statIdx}`] || 0}
                onChange={(e) => {
                  setItem((prev: any) => ({ ...prev, [`stat_type${statIdx}`]: Number(e.target.value) }));
                  setIsDirty(true);
                }}
                placeholder="Stat Type ID"
                className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2 py-1 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
              />
              <input
                type="number"
                value={item[`stat_value${statIdx}`] || 0}
                onChange={(e) => {
                  setItem((prev: any) => ({ ...prev, [`stat_value${statIdx}`]: Number(e.target.value) }));
                  setIsDirty(true);
                }}
                placeholder="Bonus Value"
                className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2 py-1 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200">
        <h3 className="text-xs font-bold text-slate-700 mb-2">Gem Sockets (SocketType 1-3 & Match Bonus)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[1, 2, 3].map((sIdx) => (
            <div key={sIdx} className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">Socket #{sIdx}</span>
                <SelectorButton
                  onClick={() =>
                    openSelector({
                      type: 'single',
                      title: `Socket #${sIdx} Color`,
                      field: `socketColor_${sIdx}`,
                      options: SOCKET_COLOR_OPTIONS,
                      selectedValue: item[`socketColor_${sIdx}`] || 0,
                    })
                  }
                />
              </div>
              <input
                type="number"
                value={item[`socketColor_${sIdx}`] || 0}
                onChange={(e) => {
                  setItem((prev: any) => ({ ...prev, [`socketColor_${sIdx}`]: Number(e.target.value) }));
                  setIsDirty(true);
                }}
                placeholder="Socket Color ID"
                className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2 py-1 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
              />
            </div>
          ))}
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">Socket Bonus</span>
              <InfoTooltip text="Enchantment ID granted when all socket colors match (bfa_hotfixes.item_sparse.SocketMatchEnchantmentId)." />
            </div>
            <input
              type="number"
              value={item.socketBonus || 0}
              onChange={(e) => {
                setItem((prev: any) => ({ ...prev, socketBonus: Number(e.target.value) }));
                setIsDirty(true);
              }}
              placeholder="Enchantment ID"
              className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2 py-1 rounded focus:outline-none focus:border-blue-500 font-mono mt-1 shadow-2xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
