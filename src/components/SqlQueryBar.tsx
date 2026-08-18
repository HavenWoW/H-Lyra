// The diff/full query bar shared by every SQL-backed editor.

import React from 'react';
import { Copy, Play, RefreshCw } from 'lucide-react';

/**
 * The diff/full query bar shared by every SQL-backed editor.
 *
 * `name` scopes the radio group so several bars can coexist on one page.
 */
interface SqlQueryBarProps {
  name: string;
  queryMode: 'diff' | 'full';
  setQueryMode: (mode: 'diff' | 'full') => void;
  activeQueryText: string;
  saving: boolean;
  copied: boolean;
  onCopy: () => void;
  onExecute: () => void;
  onExecuteAndCopy: () => void;
  onReload: () => void;
  /** Shown next to the buttons when an execute fails. */
  error?: string | null;
}

export const SqlQueryBar: React.FC<SqlQueryBarProps> = ({
  name,
  queryMode,
  setQueryMode,
  activeQueryText,
  saving,
  copied,
  onCopy,
  onExecute,
  onExecuteAndCopy,
  onReload,
  error,
}) => {
  const nothingToRun = !activeQueryText;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5 shadow-xs select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs font-semibold">
          <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-slate-900">
            <input
              type="radio"
              name={`${name}_query_mode`}
              checked={queryMode === 'diff'}
              onChange={() => setQueryMode('diff')}
              className="w-3.5 h-3.5 text-blue-600 border-slate-300 focus:ring-0 cursor-pointer"
            />
            <span>Diff-query</span>
          </label>

          <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-slate-900">
            <input
              type="radio"
              name={`${name}_query_mode`}
              checked={queryMode === 'full'}
              onChange={() => setQueryMode('full')}
              className="w-3.5 h-3.5 text-blue-600 border-slate-300 focus:ring-0 cursor-pointer"
            />
            <span>Full-query</span>
          </label>
        </div>

        {queryMode === 'diff' && nothingToRun && (
          <span className="text-[11px] text-slate-400 font-sans">No changes</span>
        )}
      </div>

      {/* Query Preview Box */}
      <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-md p-3.5 px-4 text-[12.5px] font-mono text-slate-800 overflow-auto whitespace-pre min-h-[48px] max-h-[180px] select-text shadow-2xs">
        {activeQueryText ? (
          <code className="text-slate-800 leading-relaxed font-mono">{activeQueryText}</code>
        ) : null}
      </div>

      {error && (
        <div className="text-[11.5px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-2.5 py-1.5 font-mono select-text">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={onCopy}
          disabled={nothingToRun}
          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Copy className="w-3.5 h-3.5 text-slate-500" />
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>

        <button
          type="button"
          onClick={onExecute}
          disabled={saving || nothingToRun}
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{saving ? 'Executing...' : 'Execute'}</span>
        </button>

        <button
          type="button"
          onClick={onExecuteAndCopy}
          disabled={saving || nothingToRun}
          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Execute &amp; copy</span>
          <Copy className="w-3 h-3 text-emerald-200 ml-0.5" />
        </button>

        <button
          type="button"
          onClick={onReload}
          disabled={saving}
          className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer ml-auto disabled:opacity-40 disabled:cursor-not-allowed"
          title="Discard local edits and re-read the row from the database"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reload</span>
        </button>
      </div>
    </div>
  );
};
