// Enumeration picker for columns that hold one value out of a fixed set.

import React, { useState, useEffect, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { SelectOption } from '../constants/itemOptions';

interface SingleValueSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  options: SelectOption[];
  selectedValue: number;
  onSelect: (value: number) => void;
}

export const SingleValueSelectorModal: React.FC<SingleValueSelectorModalProps> = ({
  isOpen,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
}) => {
  const [selected, setSelected] = useState<number>(selectedValue);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelected(selectedValue);
      setFilter('');
    }
  }, [isOpen, selectedValue]);

  const filteredOptions = useMemo(() => {
    if (!filter.trim()) return options;
    const term = filter.toLowerCase().trim();
    return options.filter(
      (opt) =>
        String(opt.value).includes(term) ||
        opt.name.toLowerCase().includes(term) ||
        (opt.comment && opt.comment.toLowerCase().includes(term))
    );
  }, [options, filter]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSelect(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-300 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-base font-bold text-slate-800 tracking-wide">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-white border-b border-slate-200 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 ml-1" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by name or value..."
            className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
            autoFocus
          />
          {filter && (
            <button
              type="button"
              onClick={() => setFilter('')}
              className="text-[11px] text-slate-500 hover:text-slate-800 px-1 font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Table View */}
        <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[380px] bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider sticky top-0 z-10">
                <th className="py-2 px-4 w-24 text-center">Value</th>
                <th className="py-2 px-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredOptions.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-slate-400 italic">
                    No options found
                  </td>
                </tr>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = selected === opt.value;
                  return (
                    <tr
                      key={opt.value}
                      onClick={() => setSelected(opt.value)}
                      onDoubleClick={() => {
                        setSelected(opt.value);
                        onSelect(opt.value);
                        onClose();
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-slate-200 text-slate-900 font-bold border-l-4 border-slate-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-600">
                        {opt.value}
                      </td>
                      <td className="py-2.5 px-4">
                        <span>{opt.name}</span>
                        {opt.comment && (
                          <span className="text-slate-500 text-[11px] ml-1.5 font-normal">
                            ({opt.comment})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs transition-colors cursor-pointer"
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
};
