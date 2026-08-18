// Identity, class and display columns of item_sparse.

import React from 'react';
import { InfoTooltip, SelectorButton } from './ItemTooltip';
import { SelectorModalState } from '../types';
import {
  ITEM_CLASS,
  ITEM_SUBCLASS,
  ITEM_QUALITY,
  INVENTORY_TYPE,
  ITEM_MATERIAL,
  BAG_FAMILY,
  TOTEM_CATEGORY,
  ITEM_BONDING,
  ITEM_SHEAT,
} from '../../../constants/itemOptions';

interface ItemMiscellaneousCardProps {
  item: any;
  setItem: React.Dispatch<React.SetStateAction<any>>;
  setIsDirty: (dirty: boolean) => void;
  openSelector: (config: SelectorModalState) => void;
}

export const ItemMiscellaneousCard: React.FC<ItemMiscellaneousCardProps> = ({
  item,
  setItem,
  setIsDirty,
  openSelector,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3.5 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span>Miscellaneous</span>
        </h2>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>entry</span>
            <InfoTooltip text="Unique identifier for the item (bfa_hotfixes.item.ID and item_sparse.ID)." />
          </label>
          <input
            type="number"
            value={item.entry}
            disabled
            className="w-full bg-slate-100 border border-slate-200 text-slate-500 text-xs px-2.5 py-1.5 rounded font-mono cursor-not-allowed"
          />
        </div>

        <div className="col-span-12 sm:col-span-4 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>name</span>
            <InfoTooltip text="The name of the item displayed in client tooltips (bfa_hotfixes.item_sparse.Display)." />
          </label>
          <input
            type="text"
            value={item.name}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, name: e.target.value }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-medium shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-4 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>description</span>
            <InfoTooltip text="Flavor text or lore description displayed in yellow at the bottom of the tooltip (bfa_hotfixes.item_sparse.Description)." />
          </label>
          <input
            type="text"
            value={item.description || ''}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, description: e.target.value }));
              setIsDirty(true);
            }}
            placeholder="Flavor text or lore..."
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>ScriptName</span>
            <InfoTooltip text="Script hook name attached to this item in world database." />
          </label>
          <input
            type="text"
            value={item.ScriptName || ''}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, ScriptName: e.target.value }));
              setIsDirty(true);
            }}
            placeholder="item_example_script"
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>class</span>
            <SelectorButton
              onClick={() =>
                openSelector({
                  type: 'single',
                  title: 'Class',
                  field: 'class',
                  options: ITEM_CLASS,
                  selectedValue: item.class ?? 4,
                })
              }
            />
          </label>
          <input
            type="number"
            value={item.class ?? 4}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, class: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>subclass</span>
            <SelectorButton
              onClick={() =>
                openSelector({
                  type: 'single',
                  title: `Subclass (Class ${item.class ?? 0})`,
                  field: 'subclass',
                  options: ITEM_SUBCLASS[item.class ?? 0] || [],
                  selectedValue: item.subclass ?? 0,
                })
              }
            />
          </label>
          <input
            type="number"
            value={item.subclass ?? 0}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, subclass: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>SoundOverride</span>
            <InfoTooltip text="Sound override subclass ID (bfa_hotfixes.item.SoundOverrideSubclassID)." />
          </label>
          <input
            type="number"
            value={item.SoundOverride ?? 0}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, SoundOverride: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>displayid</span>
            <InfoTooltip text="Icon file data ID or item display info ID (bfa_hotfixes.item.IconFileDataID)." />
          </label>
          <input
            type="number"
            value={item.displayid || 0}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, displayid: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>Quality</span>
            <SelectorButton
              onClick={() =>
                openSelector({
                  type: 'single',
                  title: 'Quality',
                  field: 'Quality',
                  options: ITEM_QUALITY,
                  selectedValue: item.Quality || 1,
                })
              }
            />
          </label>
          <input
            type="number"
            value={item.Quality ?? 1}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, Quality: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>BuyCount</span>
            <InfoTooltip text="Number of items in the stack when purchased from vendor (bfa_hotfixes.item_sparse.VendorStackCount)." />
          </label>
          <input
            type="number"
            value={item.BuyCount || 1}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, BuyCount: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>BuyPrice</span>
            <InfoTooltip text="Price in copper to buy the item from a vendor (bfa_hotfixes.item_sparse.BuyPrice)." />
          </label>
          <input
            type="number"
            value={item.BuyPrice || 0}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, BuyPrice: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>SellPrice</span>
            <InfoTooltip text="Price in copper received when selling to a vendor (bfa_hotfixes.item_sparse.SellPrice)." />
          </label>
          <input
            type="number"
            value={item.SellPrice || 0}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, SellPrice: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>InventoryType</span>
            <SelectorButton
              onClick={() =>
                openSelector({
                  type: 'single',
                  title: 'Inventory Type',
                  field: 'InventoryType',
                  options: INVENTORY_TYPE,
                  selectedValue: item.InventoryType || 0,
                })
              }
            />
          </label>
          <input
            type="number"
            value={item.InventoryType ?? 0}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, InventoryType: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>maxcount</span>
            <InfoTooltip text="Maximum copies a player can hold simultaneously across inventory and bank (bfa_hotfixes.item_sparse.MaxCount). 0 for unlimited." />
          </label>
          <input
            type="number"
            value={item.maxcount || 0}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, maxcount: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>stackable</span>
            <InfoTooltip text="Maximum stack size per bag slot (bfa_hotfixes.item_sparse.Stackable)." />
          </label>
          <input
            type="number"
            value={item.stackable || 1}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, stackable: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>startquest</span>
            <InfoTooltip text="Quest ID started when right-clicking this item (bfa_hotfixes.item_sparse.StartQuestID)." />
          </label>
          <input
            type="number"
            value={item.startquest || 0}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, startquest: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>Material</span>
            <SelectorButton
              onClick={() =>
                openSelector({
                  type: 'single',
                  title: 'Material',
                  field: 'Material',
                  options: ITEM_MATERIAL,
                  selectedValue: item.Material ?? 0,
                })
              }
            />
          </label>
          <input
            type="number"
            value={item.Material ?? 0}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, Material: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>BagFamily</span>
            <SelectorButton
              onClick={() =>
                openSelector({
                  type: 'flags',
                  title: 'BagFamily',
                  field: 'BagFamily',
                  flags: BAG_FAMILY,
                  currentValue: item.BagFamily || 0,
                })
              }
            />
          </label>
          <input
            type="number"
            value={item.BagFamily || 0}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, BagFamily: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>ContainerSlots</span>
            <InfoTooltip text="Number of inventory slots if this item is a bag/container (bfa_hotfixes.item_sparse.ContainerSlots)." />
          </label>
          <input
            type="number"
            value={item.ContainerSlots || 0}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, ContainerSlots: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>TotemCategory</span>
            <SelectorButton
              onClick={() =>
                openSelector({
                  type: 'single',
                  title: 'Tools Category',
                  field: 'TotemCategory',
                  options: TOTEM_CATEGORY,
                  selectedValue: item.TotemCategory || 0,
                })
              }
            />
          </label>
          <input
            type="number"
            value={item.TotemCategory || 0}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, TotemCategory: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>duration</span>
            <InfoTooltip text="Duration of the item in seconds of ingame time. Set to 0 for permanent (bfa_hotfixes.item_sparse.DurationInInventory)." />
          </label>
          <input
            type="number"
            value={item.Duration || 0}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, Duration: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>ItemLimitCat.</span>
            <InfoTooltip text="Limit category ID restricting how many items from the same group can be equipped simultaneously (bfa_hotfixes.item_sparse.LimitCategory)." />
          </label>
          <input
            type="number"
            value={item.ItemLimitCategory || 0}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, ItemLimitCategory: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>itemset</span>
            <InfoTooltip text="Item set ID if this item is part of a multi-piece armor set (bfa_hotfixes.item_sparse.ItemSet)." />
          </label>
          <input
            type="number"
            value={item.itemset || 0}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, itemset: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>bonding</span>
            <SelectorButton
              onClick={() =>
                openSelector({
                  type: 'single',
                  title: 'Bonding',
                  field: 'bonding',
                  options: ITEM_BONDING,
                  selectedValue: item.bonding || 0,
                })
              }
            />
          </label>
          <input
            type="number"
            value={item.bonding ?? 0}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, bonding: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>

        <div className="col-span-12 sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center">
            <span>SheatheType</span>
            <SelectorButton
              onClick={() =>
                openSelector({
                  type: 'single',
                  title: 'Sheathe Type',
                  field: 'sheath',
                  options: ITEM_SHEAT,
                  selectedValue: item.sheath || 0,
                })
              }
            />
          </label>
          <input
            type="number"
            value={item.sheath ?? 0}
            onChange={(e) => {
              setItem((prev: any) => ({ ...prev, sheath: Number(e.target.value) }));
              setIsDirty(true);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
          />
        </div>
      </div>
    </div>
  );
};
