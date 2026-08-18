// Free-form SQL console for queries the module editors do not cover.

import React, { useState, useEffect, useRef } from 'react';
import {
  Copy,
  Zap,
  Link,
  Check,
  AlertCircle,
  RefreshCw,
  Table
} from 'lucide-react';
import { api } from '../../lib/ipc';
import { resolveTargetDb } from './targetDb';
import type { QueryResult } from '../../types';

const DEFAULT_SQL = `SELECT \`entry\`, \`name\`, \`subname\`, \`minlevel\`, \`maxlevel\`, \`AIName\`, \`ScriptName\`\nFROM \`creature_template\`\nWHERE \`entry\` > 100\nORDER BY \`entry\` ASC\nLIMIT 100`;

let sessionSql: string = DEFAULT_SQL;
let sessionQueryResult: QueryResult | null = null;

export const SqlEditorView: React.FC = () => {
  const [sql, setSqlState] = useState<string>(sessionSql);
  const [targetDb, setTargetDb] = useState<'auto' | 'world' | 'hotfixes'>('auto');
  const [queryResult, setQueryResultState] = useState<QueryResult | null>(sessionQueryResult);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const setSql = (newSql: string) => {
    sessionSql = newSql;
    setSqlState(newSql);
  };

  const setQueryResult = (res: QueryResult | null) => {
    sessionQueryResult = res;
    setQueryResultState(res);
  };

  // Global F9 keyboard shortcut for execution
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        handleRunSql();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sql, targetDb]);

  const handleRunSql = async () => {
    if (!sql.trim()) return;
    setLoading(true);
    try {
      const effectiveDb = targetDb === 'auto' ? resolveTargetDb(sql) : targetDb;
      const res = await api.executeSql(effectiveDb, sql);
      setQueryResult(res);
    } catch (e: any) {
      setQueryResult({
        success: false,
        columns: [],
        rows: [],
        affected_rows: 0,
        execution_time_ms: 0,
        error: String(e),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenDoc = (e: React.MouseEvent) => {
    e.preventDefault();
    api.openUrl('https://www.w3schools.com/sql/sql_intro.asp');
  };

  const lineCount = sql.split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 5) }, (_, i) => i + 1);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 select-none">
      {/* Unified Single Card for SQL Editor & Results */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4 shadow-sm">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="text-sm font-normal text-slate-800 font-sans">SQL Editor</span>
            <div className="relative group flex items-center ml-1">
              <div
                className="w-4 h-4 rounded-full bg-[#1E293B] text-white flex items-center justify-center text-[10px] font-bold cursor-help font-serif select-none"
              >
                i
              </div>

              {/* Hover Tooltip matching reference screenshot */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 hidden group-hover:flex flex-col items-center z-50 pointer-events-none">
                <div className="w-2 h-2 bg-[#181818] rotate-45 -mb-1" />
                <div className="bg-[#181818] text-white text-xs px-3 py-1.5 rounded shadow-xl text-center leading-tight whitespace-nowrap font-sans font-normal border border-slate-700/50">
                  <div>A minimalistic SQL Editor to</div>
                  <div>run custom queries</div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenDoc}
            className="text-xs text-[#0D6EFD] hover:underline flex items-center gap-1 font-sans font-medium cursor-pointer"
          >
            <Link className="w-3.5 h-3.5" />
            <span>learn the SQL language</span>
          </button>
        </div>

        {/* Code Editor Box */}
        <div className="border border-[#CBD5E1] rounded overflow-hidden bg-[#F8FAFC] flex min-h-[140px] max-h-[calc(100vh-340px)] focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-400">
          {/* Gutter with line numbers & fold arrow in dedicated columns */}
          <div
            ref={gutterRef}
            className="bg-[#F1F5F9] border-r border-[#E2E8F0] py-2.5 px-1.5 font-mono text-xs text-slate-400 select-none w-10 flex-shrink-0 overflow-hidden"
          >
            {lineNumbers.map((n, idx) => (
              <div key={n} className="flex items-center justify-between h-6 leading-6">
                <span className="w-4 text-right text-slate-500 text-xs font-mono">{n}</span>
                <span className="w-3 text-center text-[9px] text-slate-400 font-mono select-none">
                  {idx === 0 ? '˅' : ''}
                </span>
              </div>
            ))}
          </div>

          <textarea
            ref={textareaRef}
            rows={Math.max(lineCount + 1, 5)}
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={(e) => {
              if (e.key === 'F9' || (e.ctrlKey && e.key === 'Enter')) {
                e.preventDefault();
                handleRunSql();
              }
            }}
            placeholder="SELECT * FROM `creature_template` LIMIT 100"
            className="w-full p-2.5 font-mono text-xs text-slate-800 bg-transparent focus:outline-none resize-none overflow-auto leading-6 whitespace-pre selection:bg-[#0D6EFD] selection:text-white"
            spellCheck={false}
          />
        </div>

        {/* Buttons Bar */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCopy}
              className="bg-[#4B5563] hover:bg-[#374151] text-white px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium select-none">
              <span>Database</span>
              <select
                value={targetDb}
                onChange={(e) => setTargetDb(e.target.value as 'auto' | 'world' | 'hotfixes')}
                title="Which database the statements run against. Auto routes by the target table."
                className="font-mono text-xs px-2 py-1.5 border border-[#CBD5E1] rounded bg-white text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="auto">Auto</option>
                <option value="world">World</option>
                <option value="hotfixes">Hotfixes</option>
              </select>
            </label>

            <button
              type="button"
              onClick={handleRunSql}
              disabled={loading}
              className="bg-[#0D6EFD] hover:bg-blue-700 text-white px-4 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Execute (F9)</span>
            </button>
          </div>
        </div>

        {/* Horizontal Divider */}
        <hr className="border-t border-[#E2E8F0]" />

        {/* Results Area */}
        {queryResult?.error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 font-mono text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="whitespace-pre-wrap">{queryResult.error}</div>
          </div>
        ) : queryResult && queryResult.success && (!queryResult.columns || queryResult.columns.length === 0) ? (
          (() => {
            const executedStatements = sql
              .split(';')
              .map((s) => s.trim())
              .filter((s) => s.length > 0 && !s.startsWith('--') && !s.startsWith('#'));

            const dmlCount = Math.max(executedStatements.length, 1);
            const dmlRows = Array.from({ length: dmlCount }, (_, idx) => ({
              fieldCount: 0,
              affectedRows: idx === 0 ? queryResult.affected_rows : 1,
              insertId: 0,
              info: '',
              serverStatus: idx < dmlCount - 1 ? 10 : 2,
              warningStatus: 0,
              changedRows: 0,
            }));

            return (
              <div className="space-y-3">
                <div className="overflow-x-auto min-w-0 border border-[#E2E8F0] rounded">
                  <table className="haven-table w-full text-center whitespace-nowrap">
                    <thead>
                      <tr className="select-none bg-[#F8FAFC] border-b border-[#CBD5E1]">
                        <th className="text-center font-semibold text-slate-700 py-2.5 px-4 text-xs font-sans">
                          <div className="inline-flex items-center justify-center gap-1">
                            <span>Field Count</span>
                            <span className="text-slate-400">&#8597;</span>
                          </div>
                        </th>
                        <th className="text-center font-semibold text-slate-700 py-2.5 px-4 text-xs font-sans">
                          <div className="inline-flex items-center justify-center gap-1">
                            <span>Affected Rows</span>
                            <span className="text-slate-400">&#8597;</span>
                          </div>
                        </th>
                        <th className="text-center font-semibold text-slate-700 py-2.5 px-4 text-xs font-sans">
                          <div className="inline-flex items-center justify-center gap-1">
                            <span>Insert Id</span>
                            <span className="text-slate-400">&#8597;</span>
                          </div>
                        </th>
                        <th className="text-center font-semibold text-slate-700 py-2.5 px-4 text-xs font-sans">
                          <div className="inline-flex items-center justify-center gap-1">
                            <span>Info</span>
                            <span className="text-slate-400">&#8597;</span>
                          </div>
                        </th>
                        <th className="text-center font-semibold text-slate-700 py-2.5 px-4 text-xs font-sans">
                          <div className="inline-flex items-center justify-center gap-1">
                            <span>Server Status</span>
                            <span className="text-slate-400">&#8597;</span>
                          </div>
                        </th>
                        <th className="text-center font-semibold text-slate-700 py-2.5 px-4 text-xs font-sans">
                          <div className="inline-flex items-center justify-center gap-1">
                            <span>Warning Status</span>
                            <span className="text-slate-400">&#8597;</span>
                          </div>
                        </th>
                        <th className="text-center font-semibold text-slate-700 py-2.5 px-4 text-xs font-sans">
                          <div className="inline-flex items-center justify-center gap-1">
                            <span>Changed Rows</span>
                            <span className="text-slate-400">&#8597;</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] bg-white">
                      {dmlRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-xs text-slate-700 text-center">{row.fieldCount}</td>
                          <td className="py-2.5 px-4 font-mono text-xs text-slate-700 text-center">{row.affectedRows}</td>
                          <td className="py-2.5 px-4 font-mono text-xs text-slate-700 text-center">{row.insertId}</td>
                          <td className="py-2.5 px-4 font-mono text-xs text-slate-700 text-center">{row.info}</td>
                          <td className="py-2.5 px-4 font-mono text-xs text-slate-700 text-center">{row.serverStatus}</td>
                          <td className="py-2.5 px-4 font-mono text-xs text-slate-700 text-center">{row.warningStatus}</td>
                          <td className="py-2.5 px-4 font-mono text-xs text-slate-700 text-center">{row.changedRows}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 text-center text-[13px] text-slate-700 font-sans select-none">
                  {dmlRows.length} total
                </div>
              </div>
            );
          })()
        ) : queryResult && queryResult.columns && queryResult.rows.length > 0 ? (
          <div className="space-y-3">
            <div className="overflow-x-auto overflow-y-auto max-h-[500px] min-w-0 border border-[#E2E8F0] rounded">
              <table className="haven-table min-w-max whitespace-nowrap">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#CBD5E1]">
                    {queryResult.columns.map((col, idx) => (
                      <th key={idx} className="whitespace-nowrap uppercase tracking-wider py-2.5 px-4 text-xs font-sans text-slate-700 font-semibold">
                        <div className="inline-flex items-center gap-1">
                          <span>{col}</span>
                          <span className="text-slate-400">&#8597;</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] bg-white">
                  {queryResult.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                      {row.map((cell: any, cIdx: number) => (
                        <td key={cIdx} className="whitespace-nowrap font-mono text-xs py-2 px-4 text-slate-700">
                          {cell === null ? (
                            <span className="text-slate-400 italic font-normal">NULL</span>
                          ) : (
                            String(cell)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Results Total Footer */}
            <div className="pt-2 text-center text-[13px] text-slate-700 font-sans select-none">
              {queryResult.rows.length} total ({queryResult.execution_time_ms} ms)
            </div>
          </div>
        ) : queryResult && queryResult.columns && queryResult.columns.length > 0 ? (
          <div className="space-y-3">
            <div className="overflow-x-auto min-w-0">
              <table className="haven-table min-w-max whitespace-nowrap">
                <thead>
                  <tr className="select-none">
                    {queryResult.columns.map((col, idx) => (
                      <th key={idx} className="whitespace-nowrap uppercase tracking-wider">{col} &#8597;</th>
                    ))}
                  </tr>
                </thead>
              </table>
            </div>
            <div className="w-full bg-[#F1F3F5] border border-[#E2E8F0] rounded py-2.5 text-center text-[13px] text-slate-700 font-sans shadow-2xs">
              No data to display
            </div>
            <div className="text-center text-[13px] text-slate-700 font-sans select-none pt-1">
              0 total ({queryResult.execution_time_ms} ms)
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-full bg-[#F1F3F5] border border-[#E2E8F0] rounded py-2.5 text-center text-[13px] text-slate-700 font-sans shadow-2xs">
              No data to display
            </div>
            <div className="text-center text-[13px] text-slate-700 font-sans select-none pt-1">
              0 total
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SqlEditorView;
