// One smart_scripts line: its event, action and target with their parameters.

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { SmartScriptRow } from '../types';
import {
  SMART_EVENT_TYPES,
  SMART_ACTION_TYPES,
  SMART_TARGET_TYPES,
  SMART_EVENT_PARAM_NAMES,
  SMART_ACTION_PARAM_NAMES,
  SMART_TARGET_PARAM_NAMES,
} from '../constants/smartAiOptions';

interface SmartAiLineEditorProps {
  script: SmartScriptRow;
  index: number;
  totalLines: number;
  onChange: (updated: SmartScriptRow) => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

export const SmartAiLineEditor: React.FC<SmartAiLineEditorProps> = ({
  script,
  index,
  totalLines,
  onChange,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(true);

  const handleFieldChange = (field: keyof SmartScriptRow, val: any) => {
    onChange({ ...script, [field]: val });
  };

  const eventName = SMART_EVENT_TYPES[script.event_type] || `EVENT_${script.event_type}`;
  const actionName = SMART_ACTION_TYPES[script.action_type] || `ACTION_${script.action_type}`;
  const targetName = SMART_TARGET_TYPES[script.target_type] || `TARGET_${script.target_type}`;

  const eventParamNames = SMART_EVENT_PARAM_NAMES[script.event_type] || ['param1', 'param2', 'param3', 'param4'];
  const actionParamNames = SMART_ACTION_PARAM_NAMES[script.action_type] || ['param1', 'param2', 'param3', 'param4', 'param5', 'param6'];
  const targetParamNames = SMART_TARGET_PARAM_NAMES[script.target_type] || ['param1', 'param2', 'param3'];

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden select-none font-sans">
      {/* Header Bar */}
      <div className="bg-slate-50 px-3.5 py-2.5 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-6 h-6 rounded bg-slate-200 text-slate-700 font-bold font-mono text-xs flex items-center justify-center flex-shrink-0">
            {script.id}
          </span>
          <div className="flex items-center gap-2 text-xs font-semibold truncate">
            <span className="text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {eventName}
            </span>
            <span className="text-slate-400">➔</span>
            <span className="text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {actionName}
            </span>
            <span className="text-slate-400">➔</span>
            <span className="text-purple-700 font-mono bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              {targetName}
            </span>
            {script.link > 0 && (
              <span className="text-amber-700 font-mono text-[11px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                Link: {script.link}
              </span>
            )}
          </div>
        </div>

        {/* Line Action Buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Move Up"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === totalLines - 1}
            className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Move Down"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="p-1 text-slate-500 hover:text-blue-600 cursor-pointer"
            title="Duplicate Line"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
            title="Delete Line"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer ml-1"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Form Body */}
      {expanded && (
        <div className="p-3.5 space-y-3.5 text-xs text-slate-800">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">comment</label>
            <input
              type="text"
              value={script.comment || ''}
              onChange={(e) => handleFieldChange('comment', e.target.value)}
              placeholder="Descriptive comment for this event line..."
              className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2.5 py-1 rounded focus:border-blue-500 focus:outline-none font-sans"
            />
          </div>

          {/* Section 1: Event Details */}
          <div className="border border-blue-100 bg-blue-50/20 rounded p-2.5 space-y-2">
            <h4 className="text-[11px] font-bold text-blue-900 uppercase">1. Event Configuration</h4>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-12 sm:col-span-4 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">event_type</label>
                <select
                  value={script.event_type}
                  onChange={(e) => handleFieldChange('event_type', Number(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded focus:border-blue-500 focus:outline-none"
                >
                  {Object.entries(SMART_EVENT_TYPES).map(([val, label]) => (
                    <option key={val} value={val}>{val}: {label}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-4 sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">phase_mask</label>
                <input
                  type="number"
                  value={script.event_phase_mask}
                  onChange={(e) => handleFieldChange('event_phase_mask', Number(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono"
                />
              </div>

              <div className="col-span-4 sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">chance %</label>
                <input
                  type="number"
                  value={script.event_chance}
                  onChange={(e) => handleFieldChange('event_chance', Number(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono"
                />
              </div>

              <div className="col-span-4 sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">flags</label>
                <input
                  type="number"
                  value={script.event_flags}
                  onChange={(e) => handleFieldChange('event_flags', Number(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono"
                />
              </div>

              <div className="col-span-4 sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">link</label>
                <input
                  type="number"
                  value={script.link}
                  onChange={(e) => handleFieldChange('link', Number(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono"
                />
              </div>

              {/* Event Params 1 - 5 */}
              {Array.from({ length: 5 }, (_, i) => {
                const labelName = eventParamNames[i] || (i === 4 ? 'param5' : `param${i + 1}`);
                return (
                  <div key={i} className="col-span-4 sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-semibold text-slate-600 font-mono truncate block" title={labelName}>
                      {labelName}
                    </label>
                    <input
                      type="number"
                      value={script[`event_param${i + 1}` as keyof SmartScriptRow] as number}
                      onChange={(e) => handleFieldChange(`event_param${i + 1}` as keyof SmartScriptRow, Number(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono"
                    />
                  </div>
                );
              })}

              <div className="col-span-12 sm:col-span-2 space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 font-mono">param_string</label>
                <input
                  type="text"
                  value={script.event_param_string || ''}
                  onChange={(e) => handleFieldChange('event_param_string', e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Action Details */}
          <div className="border border-emerald-100 bg-emerald-50/20 rounded p-2.5 space-y-2">
            <h4 className="text-[11px] font-bold text-emerald-900 uppercase">2. Action Configuration</h4>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-12 sm:col-span-6 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">action_type</label>
                <select
                  value={script.action_type}
                  onChange={(e) => handleFieldChange('action_type', Number(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded focus:border-blue-500 focus:outline-none"
                >
                  {Object.entries(SMART_ACTION_TYPES).map(([val, label]) => (
                    <option key={val} value={val}>{val}: {label}</option>
                  ))}
                </select>
              </div>

              {/* Action Params 1 - 6 */}
              {Array.from({ length: 6 }, (_, i) => {
                const labelName = actionParamNames[i] || `param${i + 1}`;
                return (
                  <div key={i} className="col-span-4 sm:col-span-1 space-y-1">
                    <label className="text-[10px] font-semibold text-slate-600 font-mono truncate block" title={labelName}>
                      {labelName}
                    </label>
                    <input
                      type="number"
                      value={script[`action_param${i + 1}` as keyof SmartScriptRow] as number}
                      onChange={(e) => handleFieldChange(`action_param${i + 1}` as keyof SmartScriptRow, Number(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-1.5 py-1 rounded font-mono"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Target Details */}
          <div className="border border-purple-100 bg-purple-50/20 rounded p-2.5 space-y-2">
            <h4 className="text-[11px] font-bold text-purple-900 uppercase">3. Target Configuration</h4>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-12 sm:col-span-5 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">target_type</label>
                <select
                  value={script.target_type}
                  onChange={(e) => handleFieldChange('target_type', Number(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded focus:border-blue-500 focus:outline-none"
                >
                  {Object.entries(SMART_TARGET_TYPES).map(([val, label]) => (
                    <option key={val} value={val}>{val}: {label}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-4 sm:col-span-1 space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 font-mono truncate block" title={targetParamNames[0] || 'param1'}>
                  {targetParamNames[0] || 'param1'}
                </label>
                <input
                  type="number"
                  value={script.target_param1}
                  onChange={(e) => handleFieldChange('target_param1', Number(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-1.5 py-1 rounded font-mono"
                />
              </div>

              <div className="col-span-4 sm:col-span-1 space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 font-mono truncate block" title={targetParamNames[1] || 'param2'}>
                  {targetParamNames[1] || 'param2'}
                </label>
                <input
                  type="number"
                  value={script.target_param2}
                  onChange={(e) => handleFieldChange('target_param2', Number(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-1.5 py-1 rounded font-mono"
                />
              </div>

              <div className="col-span-4 sm:col-span-1 space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 font-mono truncate block" title={targetParamNames[2] || 'param3'}>
                  {targetParamNames[2] || 'param3'}
                </label>
                <input
                  type="number"
                  value={script.target_param3}
                  onChange={(e) => handleFieldChange('target_param3', Number(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-1.5 py-1 rounded font-mono"
                />
              </div>

              <div className="col-span-3 sm:col-span-1 space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 font-mono">target_x</label>
                <input
                  type="number"
                  step="0.1"
                  value={script.target_x}
                  onChange={(e) => handleFieldChange('target_x', Number(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-1.5 py-1 rounded font-mono"
                />
              </div>

              <div className="col-span-3 sm:col-span-1 space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 font-mono">target_y</label>
                <input
                  type="number"
                  step="0.1"
                  value={script.target_y}
                  onChange={(e) => handleFieldChange('target_y', Number(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-1.5 py-1 rounded font-mono"
                />
              </div>

              <div className="col-span-3 sm:col-span-1 space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 font-mono">target_z</label>
                <input
                  type="number"
                  step="0.1"
                  value={script.target_z}
                  onChange={(e) => handleFieldChange('target_z', Number(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-1.5 py-1 rounded font-mono"
                />
              </div>

              <div className="col-span-3 sm:col-span-1 space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 font-mono">target_o</label>
                <input
                  type="number"
                  step="0.1"
                  value={script.target_o}
                  onChange={(e) => handleFieldChange('target_o', Number(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-1.5 py-1 rounded font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
