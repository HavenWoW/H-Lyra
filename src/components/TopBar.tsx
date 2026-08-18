// Title bar: window controls and the current database connection state.

import React from 'react';
import {
  Save,
  RotateCcw,
  Code2,
  Play,
  Copy,
  ExternalLink,
  Check,
  Sparkles,
  Database
} from 'lucide-react';
import { api } from '../lib/ipc';

interface TopBarProps {
  entityType: string;
  entityId: number | string;
  entityName?: string;
  isDirty?: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
  onGenerateSql?: () => void;
  onExecuteSql?: () => void;
  onCopySql?: () => void;
  wikiUrl?: string;
  extraActions?: React.ReactNode;
  saving?: boolean;
  copied?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  entityType,
  entityId,
  entityName,
  isDirty = false,
  onSave,
  onDiscard,
  onGenerateSql,
  onExecuteSql,
  onCopySql,
  wikiUrl,
  extraActions,
  saving = false,
  copied = false,
}) => {
  return (
    <div className="lyra-top-bar">
      {/* Entity Title & Dirty Badge */}
      <div className="flex items-center space-x-3 overflow-hidden">
        <div className="entity-badge truncate">
          <span className="text-haven-accent font-mono uppercase text-[11px]">[{entityType}]</span>
          <span className="text-white font-mono font-bold text-xs">{entityId}</span>
          {entityName && (
            <>
              <span className="text-haven-textMuted">•</span>
              <span className="text-haven-textBright font-sans truncate font-medium">{entityName}</span>
            </>
          )}
        </div>

        {isDirty && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-semibold flex items-center gap-1 animate-pulse">
            ● Unsaved Changes
          </span>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        {extraActions}

        {onDiscard && (
          <button
            type="button"
            onClick={onDiscard}
            disabled={!isDirty}
            title="Discard changes and reload original record"
            className="haven-button-secondary py-1 px-2.5 text-xs text-haven-textMuted disabled:opacity-30"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Discard</span>
          </button>
        )}

        {onGenerateSql && (
          <button
            type="button"
            onClick={onGenerateSql}
            title="Preview generated SQL query"
            className="haven-button-secondary py-1 px-2.5 text-xs"
          >
            <Code2 className="w-3.5 h-3.5 text-haven-accent" />
            <span>SQL</span>
          </button>
        )}

        {onCopySql && (
          <button
            type="button"
            onClick={onCopySql}
            title="Copy SQL update query to clipboard"
            className="haven-button-secondary py-1 px-2.5 text-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-haven-textMuted" />}
            <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
          </button>
        )}

        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            title="Save changes to HavenCore database (Ctrl+S)"
            className="haven-button-primary py-1 px-3 text-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save DB'}</span>
          </button>
        )}

        {onExecuteSql && (
          <button
            type="button"
            onClick={onExecuteSql}
            title="Execute query directly against database"
            className="haven-button-gold py-1 px-2.5 text-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Execute</span>
          </button>
        )}

        {wikiUrl && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              api.openUrl(wikiUrl);
            }}
            title="Open Documentation Wiki"
            className="p-1 text-slate-400 hover:text-blue-600 transition-colors ml-1 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
