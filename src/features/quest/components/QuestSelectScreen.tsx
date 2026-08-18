// Quest search and selection.

import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { EntityCreateCard } from '../../../components/EntityCreateCard';
import { QuestSearchRow, QuestSortKey } from '../types';

interface QuestSelectScreenProps {
  searchId: string;
  setSearchId: (val: string) => void;
  searchTitle: string;
  setSearchTitle: (val: string) => void;
  searchLimit: number;
  setSearchLimit: (val: number) => void;
  searchResults: QuestSearchRow[] | null;
  searching: boolean;
  onSearch: () => void;
  onSelectExistingQuest: (id: number) => void;
  onCreateNewQuest: (id: number) => void;
  getSearchQueryInfo: () => { sql: string; whereSql: string; limit: number };
}

export const QuestSelectScreen: React.FC<QuestSelectScreenProps> = ({
  searchId,
  setSearchId,
  searchTitle,
  setSearchTitle,
  searchLimit,
  setSearchLimit,
  searchResults,
  searching,
  onSearch,
  onSelectExistingQuest,
  onCreateNewQuest,
  getSearchQueryInfo,
}) => {
  const [sortKey, setSortKey] = useState<QuestSortKey>('ID');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  const handleSort = (key: QuestSortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
    setCurrentPage(1);
  };

  const sortedList = useMemo(() => {
    const rawList = searchResults || [];
    return [...rawList].sort((a, b) => {
      const vA = a[sortKey] ?? '';
      const vB = b[sortKey] ?? '';
      if (typeof vA === 'number' && typeof vB === 'number') {
        return sortAsc ? vA - vB : vB - vA;
      }
      return sortAsc
        ? String(vA).localeCompare(String(vB))
        : String(vB).localeCompare(String(vA));
    });
  }, [searchResults, sortKey, sortAsc]);

  const totalPages = Math.ceil(sortedList.length / rowsPerPage) || 1;
  const currentRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedList.slice(start, start + rowsPerPage);
  }, [sortedList, currentPage, rowsPerPage]);

  const renderSortHeader = (label: string, field: QuestSortKey, width?: string, align: 'left' | 'center' = 'left') => {
    const isActive = sortKey === field;
    return (
      <th
        style={width ? { width } : undefined}
        onClick={() => handleSort(field)}
        className={`py-2.5 ${align === 'left' ? 'px-4 text-left' : 'px-3 text-center'} cursor-pointer hover:bg-slate-200/80 transition-colors select-none group`}
      >
        <div className={`inline-flex items-center ${align === 'left' ? 'justify-start' : 'justify-center'} gap-1.5`}>
          <span>{label}</span>
          {isActive ? (
            sortAsc ? (
              <ChevronUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
            )
          ) : (
            <ChevronsUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 opacity-60 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </th>
    );
  };

  const qInfo = getSearchQueryInfo();

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 select-none font-sans">
      {/* Card 1: Create New */}
      <EntityCreateCard
        entityTable="quest_template"
        entityIdField="ID"
        customStartingId={60000}
        onSelect={onCreateNewQuest}
      />

      {/* Card 2: Select existing */}
      <div className="bg-white border border-[#E2E8F0] rounded p-4 space-y-3 shadow-sm flex-1 flex flex-col">
        <h2 className="text-base text-slate-700 font-normal font-sans">Select existing</h2>

        {/* Search Inputs Row */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
            placeholder="ID"
            className="w-44 px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:border-blue-500 focus:outline-none placeholder:text-slate-400 font-sans font-mono"
          />
          <input
            type="text"
            value={searchTitle}
            onChange={(e) => setSearchTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
            placeholder="Quest Title"
            className="w-64 px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:border-blue-500 focus:outline-none placeholder:text-slate-400 font-sans"
          />
          <input
            type="number"
            value={searchLimit}
            onChange={(e) => setSearchLimit(Number(e.target.value) || 50)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
            placeholder="Limit"
            className="w-20 px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:border-blue-500 focus:outline-none font-sans font-mono"
          />

          <button
            type="button"
            onClick={onSearch}
            disabled={searching}
            className="bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white text-xs font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </div>

        {/* Query Preview Snippet */}
        <div className="bg-[#F8F9FA] border border-slate-200 rounded p-2.5 text-xs font-mono text-slate-700 break-all select-text">
          <span className="text-[#0D6EFD] font-bold">SELECT</span> `ID`, `LogTitle`, `QuestType`, `QuestLevel`, `MinLevel`, `QuestDescription` <span className="text-[#0D6EFD] font-bold">FROM</span> `quest_template`
          {qInfo.whereSql && (
            <>
              {' '}<span className="text-[#0D6EFD] font-bold">WHERE</span> {qInfo.whereSql.replace(' WHERE ', '')}
            </>
          )}
          {' '}<span className="text-[#0D6EFD] font-bold">LIMIT</span> {searchLimit || 50}
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
                      {renderSortHeader('ID', 'ID', '10%', 'center')}
                      {renderSortHeader('Title', 'LogTitle', '25%', 'left')}
                      {renderSortHeader('Type', 'QuestType', '8%', 'center')}
                      {renderSortHeader('Level', 'QuestLevel', '8%', 'center')}
                      {renderSortHeader('MinLevel', 'MinLevel', '8%', 'center')}
                      {renderSortHeader('Description', 'Description', '41%', 'left')}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] bg-white">
                    {currentRows.map((row) => (
                      <tr
                        key={row.ID}
                        onClick={() => onSelectExistingQuest(row.ID)}
                        className="cursor-pointer transition-colors hover:bg-blue-50/80"
                      >
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 text-center text-[13.5px]">
                          {row.ID}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 text-left text-[13.5px] truncate">
                          {row.LogTitle}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 text-center text-[13.5px]">
                          {row.QuestType}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 text-center text-[13.5px]">
                          {row.QuestLevel}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 text-center text-[13.5px]">
                          {row.MinLevel}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-left text-[13px] truncate">
                          {row.Description || ''}
                        </td>
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
                          Math.abs(page - currentPage) <= 2
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
          )
        )}
      </div>
    </div>
  );
};
