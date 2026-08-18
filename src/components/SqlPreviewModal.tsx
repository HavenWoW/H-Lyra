// Read-only preview of a generated statement, for reviewing before running it.

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Play,
  Terminal,
  Code2,
  AlertCircle,
  Database
} from 'lucide-react';
import { api } from '../lib/ipc';

interface SqlPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sqlQuery: string;
  title?: string;
  targetDb?: 'world' | 'hotfixes' | 'characters' | 'auth';
  onExecuted?: () => void;
}

export const SqlPreviewModal: React.FC<SqlPreviewModalProps> = ({
  isOpen,
  onClose,
  sqlQuery,
  title = 'Generated SQL Query',
  targetDb = 'world',
  onExecuted,
}) => {
  const [copied, setCopied] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([sqlQuery], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `haven_${targetDb}_${Date.now()}.sql`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleExecute = async () => {
    setExecuting(true);
    setExecutionResult(null);
    setIsError(false);

    try {
      const res = await api.executeSql(targetDb, sqlQuery);
      if (res.success) {
        setExecutionResult(`Query executed successfully (${res.affected_rows} rows affected, ${res.execution_time_ms.toFixed(2)} ms)`);
        setIsError(false);
        if (onExecuted) onExecuted();
      } else {
        setExecutionResult(res.error || 'Execution failed with unknown error');
        setIsError(true);
      }
    } catch (err: any) {
      setExecutionResult(err?.message || String(err));
      setIsError(true);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-haven-darker border border-haven-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-haven-border bg-haven-darkest/70 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-haven-accent">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">{title}</h3>
              <span className="text-[10px] text-haven-textMuted font-mono">Target: {targetDb}_db</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-haven-textMuted hover:text-white hover:bg-haven-panel transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SQL Code View */}
        <div className="p-4 flex-1 overflow-y-auto bg-haven-darkest/95 font-mono text-xs text-blue-200 leading-relaxed border-b border-haven-border selection:bg-blue-600/40">
          <pre className="whitespace-pre-wrap select-text font-mono">{sqlQuery || '-- No changes detected'}</pre>
        </div>

        {/* Execution Output */}
        {executionResult && (
          <div
            className={`p-3 text-xs font-mono flex items-center space-x-2 border-b border-haven-border ${
              isError
                ? 'bg-red-950/60 text-red-300 border-red-800/50'
                : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
            }`}
          >
            {isError ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <Check className="w-4 h-4 flex-shrink-0" />}
            <span className="truncate">{executionResult}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-3 bg-haven-dark flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="haven-button-secondary py-1.5 px-3 text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Query'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="haven-button-secondary py-1.5 px-3 text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .sql</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-haven-textMuted hover:text-white transition-colors"
            >
              Close
            </button>

            <button
              onClick={handleExecute}
              disabled={executing || !sqlQuery}
              className="haven-button-primary py-1.5 px-4 text-xs font-semibold"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{executing ? 'Executing...' : 'Execute to Database'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
