// SmartAI script editor: the ordered list of lines for one entry.

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { SqlQueryBar } from '../../../components/SqlQueryBar';
import { SmartAiLineEditor } from './SmartAiLineEditor';
import { SmartScriptRow } from '../types';
import { SMART_SOURCE_TYPES } from '../constants/smartAiOptions';
import { generateDiffQuery, generateFullQuery, isSmartAiModified } from '../utils/smartAiSqlGenerator';

interface SmartAiDetailEditorProps {
  entryorguid: number;
  sourceType: number;
  scripts: SmartScriptRow[];
  setScripts: React.Dispatch<React.SetStateAction<SmartScriptRow[]>>;
  initialScripts: SmartScriptRow[];
  setInitialScripts: (s: SmartScriptRow[]) => void;
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  onNavigateBack?: () => void;
  hideHeader?: boolean;
}

export const SmartAiDetailEditor: React.FC<SmartAiDetailEditorProps> = ({
  entryorguid,
  sourceType,
  scripts,
  setScripts,
  initialScripts,
  setInitialScripts,
  isDirty,
  setIsDirty,
  onNavigateBack,
  hideHeader = false,
}) => {
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Derive dirty state dynamically
  useEffect(() => {
    if (initialScripts && scripts) {
      const modified = isSmartAiModified(initialScripts, scripts);
      setIsDirty(modified);
    }
  }, [scripts, initialScripts, setIsDirty]);

  const activeQueryText = queryMode === 'diff'
    ? generateDiffQuery(entryorguid, sourceType, initialScripts, scripts)
    : generateFullQuery(entryorguid, sourceType, scripts);

  const handleCopySql = () => {
    const sql = activeQueryText || generateFullQuery(entryorguid, sourceType, scripts);
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteQuery = async () => {
    const sql = activeQueryText;
    if (!sql) return;
    setSaving(true);
    try {
      await api.executeSql('world', sql);
      setInitialScripts(JSON.parse(JSON.stringify(scripts)));
      setIsDirty(false);
    } catch (e) {
      console.error('Execute SmartAI SQL failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    const sql = activeQueryText;
    if (!sql) return;
    setSaving(true);
    try {
      await api.executeSql('world', sql);
      navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setInitialScripts(JSON.parse(JSON.stringify(scripts)));
      setIsDirty(false);
    } catch (e) {
      console.error('Execute & Copy SmartAI SQL failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleReload = () => {
    if (initialScripts) {
      setScripts(JSON.parse(JSON.stringify(initialScripts)));
      setIsDirty(false);
    }
  };

  const handleAddLine = () => {
    const nextId = scripts.length > 0 ? Math.max(...scripts.map((s) => s.id)) + 1 : 0;
    const newLine: SmartScriptRow = {
      entryorguid,
      source_type: sourceType,
      id: nextId,
      link: 0,
      event_type: 0, // UPDATE_IC
      event_phase_mask: 0,
      event_chance: 100,
      event_flags: 0,
      event_param1: 0,
      event_param2: 0,
      event_param3: 0,
      event_param4: 0,
      event_param5: 0,
      event_param_string: '',
      action_type: 0,
      action_param1: 0,
      action_param2: 0,
      action_param3: 0,
      action_param4: 0,
      action_param5: 0,
      action_param6: 0,
      target_type: 1, // SELF
      target_param1: 0,
      target_param2: 0,
      target_param3: 0,
      target_x: 0,
      target_y: 0,
      target_z: 0,
      target_o: 0,
      comment: `New SmartAI Event (${nextId})`,
    };
    setScripts([...scripts, newLine]);
    setIsDirty(true);
  };

  const handleDuplicateLine = (index: number) => {
    const original = scripts[index];
    const nextId = Math.max(...scripts.map((s) => s.id)) + 1;
    const dup = { ...original, id: nextId, comment: `${original.comment} (Copy)` };
    const copy = [...scripts];
    copy.splice(index + 1, 0, dup);
    setScripts(copy);
    setIsDirty(true);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const copy = [...scripts];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    // Renumber IDs sequentially
    copy.forEach((line, idx) => {
      line.id = idx;
    });
    setScripts(copy);
    setIsDirty(true);
  };

  const handleMoveDown = (index: number) => {
    if (index === scripts.length - 1) return;
    const copy = [...scripts];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    // Renumber IDs sequentially
    copy.forEach((line, idx) => {
      line.id = idx;
    });
    setScripts(copy);
    setIsDirty(true);
  };

  const handleDeleteLine = (index: number) => {
    const copy = scripts.filter((_, idx) => idx !== index);
    copy.forEach((line, idx) => {
      line.id = idx;
    });
    setScripts(copy);
    setIsDirty(true);
  };

  const handleUpdateLine = (index: number, updated: SmartScriptRow) => {
    const copy = [...scripts];
    copy[index] = updated;
    setScripts(copy);
    setIsDirty(true);
  };

  const sourceTypeName = SMART_SOURCE_TYPES[sourceType] || `SourceType_${sourceType}`;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-hidden select-none font-sans text-slate-800">
      {/* Top Sub-Header (omitted if embedded) */}
      {!hideHeader && (
        <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-xs flex-shrink-0">
          <div className="flex items-center gap-3">
            {onNavigateBack && (
              <button
                type="button"
                onClick={onNavigateBack}
                className="text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded flex items-center gap-1.5 font-medium font-sans transition-colors cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                <span>Select SmartAI</span>
              </button>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-500 font-sans">
              <span className="text-slate-500 font-sans text-xs">Editing:</span>
              <span className="font-bold text-slate-900 text-xs font-sans">
                {sourceTypeName}
              </span>
              <span className="text-slate-500 font-mono text-xs">({entryorguid})</span>
              <span className="text-slate-400 font-sans text-xs">/ {scripts.length} Lines</span>
            </div>
          </div>
          {isDirty && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
              ● Unsaved Changes
            </span>
          )}
        </div>
      )}

      {/* Main Scroll Canvas */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Top Dual SQL Query Bar */}
        <SqlQueryBar
          name="smart_ai"
          queryMode={queryMode}
          setQueryMode={setQueryMode}
          activeQueryText={activeQueryText}
          saving={saving}
          copied={copied}
          onCopy={handleCopySql}
          onExecute={handleExecuteQuery}
          onExecuteAndCopy={handleExecuteAndCopy}
          onReload={handleReload}
        />

        {/* Script Lines List */}
        {scripts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3 shadow-xs">
            <p className="text-xs text-slate-500 font-sans">No SmartAI lines configured for this script group.</p>
            <button
              type="button"
              onClick={handleAddLine}
              className="px-3.5 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Script Line</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {scripts.map((line, idx) => (
              <SmartAiLineEditor
                key={`${line.id}-${idx}`}
                script={line}
                index={idx}
                totalLines={scripts.length}
                onChange={(updated) => handleUpdateLine(idx, updated)}
                onDuplicate={() => handleDuplicateLine(idx)}
                onMoveUp={() => handleMoveUp(idx)}
                onMoveDown={() => handleMoveDown(idx)}
                onDelete={() => handleDeleteLine(idx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
