// Item search and selection, backed by the effective item catalog.

import React, { useState } from 'react';
import {
  Search,
  Settings,
  HardDrive,
  Database,
  Layers,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';
import { EntityCreateCard } from '../../../components/EntityCreateCard';
import { WowIcon } from '../../../components/WowIcon';
import { ITEM_CLASS_LABELS, ITEM_SUBCLASS_LABELS, getQualityColor } from '../types';

interface ItemSelectScreenProps {
  catalogStats: any;
  searchId: string;
  setSearchId: (id: string) => void;
  searchName: string;
  setSearchName: (name: string) => void;
  searchLimit: number;
  setSearchLimit: (limit: number) => void;
  filterQuality?: number;
  setFilterQuality: (q?: number) => void;
  filterClass?: number;
  setFilterClass: (c?: number) => void;
  searchResults: any[] | null;
  searching: boolean;
  onSearch: () => void;
  onSelectExistingItem: (row: any) => void;
  onCreateNewItem: (selectedId: number) => void;
  onOpenDb2Settings: () => void;
  getSearchQueryInfo: () => { hasWhere: boolean; whereText: string; limit: number };
}

export const ItemSelectScreen: React.FC<ItemSelectScreenProps> = ({
  catalogStats,
  searchId,
  setSearchId,
  searchName,
  setSearchName,
  searchLimit,
  setSearchLimit,
  filterQuality,
  setFilterQuality,
  filterClass,
  setFilterClass,
  searchResults,
  searching,
  onSearch,
  onSelectExistingItem,
  onCreateNewItem,
  onOpenDb2Settings,
  getSearchQueryInfo,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<string>('entry');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const qInfo = getSearchQueryInfo();
  const PAGE_SIZE = 14;

  const rawList = searchResults || [];
  const sortedList = [...rawList].sort((a, b) => {
    if (sortColumn === 'class') {
      const labelA = a.class !== null && a.class !== undefined ? (ITEM_CLASS_LABELS[a.class] || String(a.class)) : '';
      const labelB = b.class !== null && b.class !== undefined ? (ITEM_CLASS_LABELS[b.class] || String(b.class)) : '';
      return sortDirection === 'asc'
        ? labelA.localeCompare(labelB)
        : labelB.localeCompare(labelA);
    } else if (sortColumn === 'subclass') {
      const labelA = a.class !== null && a.subclass !== null ? (ITEM_SUBCLASS_LABELS[a.class]?.[a.subclass] || String(a.subclass)) : '';
      const labelB = b.class !== null && b.subclass !== null ? (ITEM_SUBCLASS_LABELS[b.class]?.[b.subclass] || String(b.subclass)) : '';
      return sortDirection === 'asc'
        ? labelA.localeCompare(labelB)
        : labelB.localeCompare(labelA);
    } else if (sortColumn === 'name') {
      const nameA = String(a.name || '');
      const nameB = String(b.name || '');
      return sortDirection === 'asc'
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    }

    let valA: number = 0;
    let valB: number = 0;
    if (sortColumn === 'Quality') {
      valA = Number(a.Quality ?? a.quality ?? 0);
      valB = Number(b.Quality ?? b.quality ?? 0);
    } else if (sortColumn === 'ItemLevel') {
      valA = Number(a.ItemLevel ?? a.item_level ?? 0);
      valB = Number(b.ItemLevel ?? b.item_level ?? 0);
    } else if (sortColumn === 'RequiredLevel') {
      valA = Number(a.RequiredLevel ?? a.required_level ?? 0);
      valB = Number(b.RequiredLevel ?? b.required_level ?? 0);
    } else if (sortColumn === 'entry') {
      valA = Number(a.entry ?? a.id ?? 0);
      valB = Number(b.entry ?? b.id ?? 0);
    } else if (sortColumn === 'displayid') {
      valA = Number(a.displayid ?? a.display_id ?? 0);
      valB = Number(b.displayid ?? b.display_id ?? 0);
    }

    return sortDirection === 'asc'
      ? (valA > valB ? 1 : valA < valB ? -1 : 0)
      : (valA < valB ? 1 : valA > valB ? -1 : 0);
  });

  const totalPages = Math.max(1, Math.ceil(sortedList.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const currentRows = sortedList.slice(startIndex, startIndex + PAGE_SIZE);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const renderSortHeader = (label: string, column: string, width: string = '10%', align: 'center' | 'left' = 'center') => {
    const isSorted = sortColumn === column;
    return (
      <th
        style={{ width }}
        onClick={() => handleSort(column)}
        className={`py-2.5 ${align === 'left' ? 'px-4 text-left' : 'px-3 text-center'} cursor-pointer hover:bg-slate-200/80 transition-colors select-none group`}
      >
        <div className={`inline-flex items-center ${align === 'left' ? 'justify-start' : 'justify-center'} gap-1.5`}>
          <span>{label}</span>
          {isSorted ? (
            sortDirection === 'asc' ? (
              <ChevronUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
            )
          ) : (
            <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 opacity-60" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 select-none font-sans">
      {/* Card 1: Create New */}
      <EntityCreateCard
        entityTable="item_sparse"
        entityIdField="ID"
        customStartingId={200000}
        dbType="hotfixes"
        onSelect={onCreateNewItem}
      />

      {/* Card 2: Select existing */}
      <div className="bg-white border border-[#E2E8F0] rounded p-4 space-y-3 shadow-xs flex-1 flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <h2 className="text-base text-slate-700 font-normal font-sans">Select existing</h2>

          {/* Live DB2 & Hotfix Catalog Statistics Badge */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded text-slate-600">
              <HardDrive className="w-3.5 h-3.5 text-blue-500" />
              <span>DB2 base: <strong className="text-slate-800">{catalogStats.db2_base_items.toLocaleString()}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded text-slate-600">
              <Database className="w-3.5 h-3.5 text-purple-500" />
              <span>SQL hotfixes: <strong className="text-slate-800">{catalogStats.sql_hotfix_items.toLocaleString()}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-blue-50/70 border border-blue-200 px-2.5 py-1 rounded text-blue-800">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Effective catalog: <strong className="text-blue-900">{catalogStats.effective_items_count.toLocaleString()}</strong></span>
            </div>
            <button
              type="button"
              onClick={onOpenDb2Settings}
              className="flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors cursor-pointer"
              title="Configure HavenCore Server DB2 Data Directory"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>DB2 Settings</span>
            </button>
          </div>
        </div>

        {/* Search Inputs Row */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
            placeholder="Item ID"
            className="w-44 px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:border-blue-500 focus:outline-none placeholder:text-slate-400 font-sans"
          />
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
            placeholder="Item name"
            className="w-64 px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:border-blue-500 focus:outline-none placeholder:text-slate-400 font-sans"
          />
          <input
            type="number"
            value={searchLimit}
            onChange={(e) => setSearchLimit(Number(e.target.value) || 50)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
            placeholder="50"
            className="w-24 px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:border-blue-500 focus:outline-none font-sans"
          />
          <select
            value={filterQuality === undefined ? '' : filterQuality}
            onChange={(e) => setFilterQuality(e.target.value === '' ? undefined : Number(e.target.value))}
            className="w-32 px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:border-blue-500 focus:outline-none font-sans text-slate-700"
          >
            <option value="">Any Quality</option>
            <option value="0">Poor</option>
            <option value="1">Common</option>
            <option value="2">Uncommon</option>
            <option value="3">Rare</option>
            <option value="4">Epic</option>
            <option value="5">Legendary</option>
            <option value="6">Artifact</option>
            <option value="7">Heirloom</option>
          </select>
          <select
            value={filterClass === undefined ? '' : filterClass}
            onChange={(e) => setFilterClass(e.target.value === '' ? undefined : Number(e.target.value))}
            className="w-32 px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:border-blue-500 focus:outline-none font-sans text-slate-700"
          >
            <option value="">Any Class</option>
            <option value="0">Consumable</option>
            <option value="1">Container</option>
            <option value="2">Weapon</option>
            <option value="3">Gem</option>
            <option value="4">Armor</option>
            <option value="5">Reagent</option>
            <option value="6">Projectile</option>
            <option value="7">Trade Goods</option>
            <option value="9">Recipe</option>
            <option value="11">Quiver</option>
            <option value="12">Quest</option>
            <option value="13">Key</option>
            <option value="15">Miscellaneous</option>
            <option value="16">Glyph</option>
            <option value="17">Battle Pets</option>
            <option value="18">WoW Token</option>
          </select>
          <button
            type="button"
            onClick={onSearch}
            disabled={searching}
            className="bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white text-xs font-semibold px-4 py-1.5 rounded flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </div>

        {/* SQL Query Snippet */}
        <div className="bg-[#F8FAFC] border border-[#CBD5E1] text-[12.5px] font-mono p-3 px-4 rounded text-slate-800 select-text flex items-center flex-wrap gap-1.5 leading-relaxed shadow-2xs">
          <span className="text-red-600 font-semibold">SELECT</span>
          <span>s.ID, s.Display, s.OverallQualityID, s.ItemLevel, i.ClassID</span>
          <span className="text-red-600 font-semibold">FROM</span>
          <span className="text-slate-800 font-semibold">item_sparse</span>
          <span>s</span>
          <span className="text-blue-600 font-semibold">LEFT JOIN</span>
          <span className="text-slate-800 font-semibold">item</span>
          <span>i</span>
          <span className="text-blue-600 font-semibold">ON</span>
          <span>s.ID = i.ID</span>
          {qInfo.hasWhere && (
            <>
              <span className="text-red-600 font-semibold">WHERE</span>
              <span>{qInfo.whereText}</span>
            </>
          )}
          <span className="text-blue-600 font-semibold">LIMIT</span>
          <span>{qInfo.limit}</span>
        </div>

        {/* Results Area (Only shown after search) */}
        {searchResults !== null && (
          sortedList.length === 0 ? (
            <div className="w-full space-y-3 pt-1">
              <div className="w-full bg-[#F1F3F5] border border-[#E2E8F0] rounded py-2.5 text-center text-[13px] text-slate-700 font-sans shadow-2xs">
                No data to display
              </div>
              <div className="text-center text-[13px] text-slate-700 font-sans select-none pt-1">
                0 selected / 0 total
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 border border-[#E2E8F0] rounded overflow-hidden">
              <div className="flex-1 overflow-auto">
                <table className="w-full text-[13.5px] text-left border-collapse font-sans table-fixed">
                <thead className="bg-[#F8FAFC] border-b border-[#CBD5E1] text-slate-700 font-semibold sticky top-0 select-none text-[13px]">
                  <tr>
                    <th style={{ width: '44px' }} className="py-2.5 px-2 text-center"></th>
                    {renderSortHeader('ID', 'entry', '11%', 'center')}
                    {renderSortHeader('Name', 'name', '23%', 'left')}
                    {renderSortHeader('DisplayId', 'displayid', '11%', 'center')}
                    {renderSortHeader('Class', 'class', '11%', 'center')}
                    {renderSortHeader('Subclass', 'subclass', '11%', 'center')}
                    {renderSortHeader('Quality', 'Quality', '11%', 'center')}
                    {renderSortHeader('ItemLevel', 'ItemLevel', '11%', 'center')}
                    {renderSortHeader('RequiredLevel', 'RequiredLevel', '11%', 'center')}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] bg-white">
                  {currentRows.map((row) => (
                    <tr
                      key={row.entry}
                      onClick={() => onSelectExistingItem(row)}
                      className="cursor-pointer transition-colors hover:bg-blue-50/80"
                    >
                      <td className="py-2 px-2 text-center">
                        <div className="flex items-center justify-center">
                          <WowIcon
                            itemId={row.entry}
                            displayId={row.displayid}
                            classId={row.class}
                            className="w-7 h-7"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-700 text-center text-[13.5px]">{row.entry}</td>
                      <td className="py-2 px-4 font-bold text-left text-[13.5px] truncate">
                        <span className={getQualityColor(row.Quality)}>{row.name}</span>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600 text-center text-[13.5px]">{row.displayid}</td>
                      <td className="py-2 px-3 text-slate-700 text-center font-medium text-[13px] truncate" title={`Class ID: ${row.class ?? 'None'}`}>
                        {row.class !== null && row.class !== undefined ? (ITEM_CLASS_LABELS[row.class] || `Class ${row.class}`) : '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-700 text-center font-medium text-[13px] truncate" title={`Subclass ID: ${row.subclass ?? 'None'}`}>
                        {row.class !== null && row.class !== undefined && row.subclass !== null && row.subclass !== undefined
                          ? (ITEM_SUBCLASS_LABELS[row.class]?.[row.subclass] || `Subclass ${row.subclass}`)
                          : '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-700 text-center text-[13.5px]">{row.Quality}</td>
                      <td className="py-2 px-3 font-bold text-slate-900 text-center text-[13.5px]">{row.ItemLevel}</td>
                      <td className="py-2 px-3 text-slate-700 text-center text-[13.5px]">{row.RequiredLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer with Count & Pagination */}
            <div className="py-2 px-4 border-t border-[#E2E8F0] bg-white flex items-center justify-between text-xs text-slate-600 font-sans select-none">
              <div className="font-normal text-slate-700 text-xs">
                0 selected / {sortedList.length} total
              </div>

            {totalPages > 1 && (
              <div className="flex items-center space-x-1">
                {/* First Page */}
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="px-2 py-1 rounded text-[#8261a7] hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold font-mono transition-colors cursor-pointer"
                  title="First Page"
                >
                  |&#9664;
                </button>
                {/* Prev Page */}
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 rounded text-[#8261a7] hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold font-mono transition-colors cursor-pointer"
                  title="Previous Page"
                >
                  &#9664;
                </button>

                {/* Page Numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    return (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 2 && page <= currentPage + 2)
                    );
                  })
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && page - prev > 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-[28px] h-7 px-2 rounded text-xs transition-colors font-semibold cursor-pointer ${
                            currentPage === page
                              ? 'bg-[#8261a7] text-white shadow-xs font-bold'
                              : 'text-[#8261a7] hover:bg-purple-50 font-normal'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}

                {/* Next Page */}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2 py-1 rounded text-[#8261a7] hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold font-mono transition-colors cursor-pointer"
                  title="Next Page"
                >
                  &#9654;
                </button>
                {/* Last Page */}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-2 py-1 rounded text-[#8261a7] hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold font-mono transition-colors cursor-pointer"
                  title="Last Page"
                >
                  &#9654;|
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
};
