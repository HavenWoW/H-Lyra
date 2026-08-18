// Bitmask editor.
//
// Bits the supplied option list does not describe are preserved across an edit
// rather than cleared, and all arithmetic is done with BigInt so 64-bit columns
// such as npcflag stay correct above bit 31.

import React, { useState, useEffect, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { FlagOption } from '../constants/itemOptions';
import {
  composeFlagValue,
  flagValueToRecord,
  formatFlagHex,
  isAllBitsSet,
  isFlagBitSet,
  parseFlagValue,
  unknownFlagBits,
} from '../lib/flags';

interface FlagsSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  flags: FlagOption[];
  currentValue: number | string;
  onSelect: (value: number | string) => void;
  /** Set for 64-bit columns such as `npcflag`. Alias for `width = 64`. */
  isBigInt?: boolean;
  /** Storage width of the column; overrides `isBigInt` when given. */
  width?: 16 | 32 | 64;
  /** True for signed columns, so a fully set field is emitted as `-1`. */
  signed?: boolean;
}

export const FlagsSelectorModal: React.FC<FlagsSelectorModalProps> = ({
  isOpen,
  onClose,
  title,
  flags,
  currentValue,
  onSelect,
  isBigInt = false,
  width: widthProp,
  signed = false,
}) => {
  const [activeBits, setActiveBits] = useState<Record<number, boolean>>({});
  const [filter, setFilter] = useState<string>('');

  const width = widthProp ?? (isBigInt ? 64 : 32);

  // The value as loaded. Bits outside the supplied options are carried through
  // an edit untouched rather than being cleared.
  const originalValue = useMemo(
    () => parseFlagValue(currentValue, width),
    [currentValue, width]
  );
  const preservedBits = useMemo(
    () => unknownFlagBits(originalValue, flags),
    [originalValue, flags]
  );

  useEffect(() => {
    if (!isOpen) return;
    setFilter('');
    const bitsMap: Record<number, boolean> = {};
    flags.forEach((flag) => {
      bitsMap[flag.bit] = isFlagBitSet(originalValue, flag.bit);
    });
    setActiveBits(bitsMap);
  }, [isOpen, originalValue, flags]);

  const totalCalculatedValue = useMemo(() => {
    const selected = Object.entries(activeBits)
      .filter(([, active]) => active)
      .map(([bit]) => Number(bit));
    return flagValueToRecord(composeFlagValue(originalValue, flags, selected, width, signed));
  }, [activeBits, originalValue, flags, width, signed]);

  const toggleBit = (bit: number) => {
    setActiveBits((prev) => ({
      ...prev,
      [bit]: !prev[bit],
    }));
  };

  const selectAll = () => {
    const next: Record<number, boolean> = {};
    flags.forEach((f) => {
      next[f.bit] = true;
    });
    setActiveBits(next);
  };

  const clearAll = () => {
    const next: Record<number, boolean> = {};
    flags.forEach((f) => {
      next[f.bit] = false;
    });
    setActiveBits(next);
  };

  const filteredFlags = useMemo(() => {
    if (!filter.trim()) return flags;
    const term = filter.toLowerCase().trim();
    return flags.filter(
      (f) =>
        String(f.bit).includes(term) ||
        f.name.toLowerCase().includes(term) ||
        (f.comment && f.comment.toLowerCase().includes(term))
    );
  }, [flags, filter]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSelect(totalCalculatedValue);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-300 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-800 tracking-wide">
              Flags selection: <span className="text-blue-600">{title}</span>
            </h2>
            <div className="text-xs text-slate-600 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
              <span>
                Total value:{' '}
                <strong className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                  {String(totalCalculatedValue)}
                </strong>
              </span>
              {isAllBitsSet(originalValue, width) ? (
                <span
                  className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-300"
                  title="Every bit is set, which these columns use to mean no restriction."
                >
                  All bits set — no restriction
                </span>
              ) : (
                preservedBits !== 0n && (
                  <span
                    className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300"
                    title="Bits set in the database that have no description here. They are kept unchanged when you save."
                  >
                    Unlabelled bits kept: {formatFlagHex(preservedBits)}
                  </span>
                )
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-toolbar */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search flags..."
              className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Flags Table */}
        <div className="flex-1 overflow-y-auto min-h-[260px] max-h-[420px] bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider sticky top-0 z-10">
                <th className="py-2 px-3 w-12 text-center">Active</th>
                <th className="py-2 px-3 w-14 text-center">Bit</th>
                <th className="py-2 px-3 w-32 text-center">Value (2^Bit)</th>
                <th className="py-2 px-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredFlags.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                    No flags found
                  </td>
                </tr>
              ) : (
                filteredFlags.map((flag) => {
                  const isChecked = !!activeBits[flag.bit];
                  // Always computed with BigInt: a bit above 31 is not
                  // representable with JavaScript's bitwise operators.
                  const bitValue = (1n << BigInt(flag.bit)).toString();
                  return (
                    <tr
                      key={flag.bit}
                      onClick={() => toggleBit(flag.bit)}
                      className={`cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-blue-50/70 text-slate-900 font-medium'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleBit(flag.bit)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-600">
                        {flag.bit}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-emerald-700 text-[11.5px] font-semibold">
                        {isChecked ? `+${bitValue}` : bitValue}
                      </td>
                      <td className="py-2 px-4 text-slate-800">
                        <span>{flag.name}</span>
                        {flag.comment && (
                          <span className="text-slate-500 text-[11px] ml-1.5 font-normal">
                            ({flag.comment})
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
