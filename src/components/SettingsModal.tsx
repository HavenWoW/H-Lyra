// Connection and client-data settings, including the DB2 directory and locale.

import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  RefreshCw,
  X,
  Database,
  Globe,
  Check,
  Settings as SettingsIcon,
} from 'lucide-react';
import { api } from '../lib/ipc';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const [dataDirInput, setDataDirInput] = useState<string>('.\\ClientData');
  const [localeInput, setLocaleInput] = useState<string>('enUS');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const conf = await api.getDb2Config();
      if (conf) {
        setDataDirInput(conf.data_dir || '.\\ClientData');
        setLocaleInput(conf.locale || 'enUS');
      }
    } catch (e) {
      console.error('Failed to load DB2 config:', e);
    }
  };

  if (!isOpen) return null;

  const handleBrowse = async () => {
    try {
      const selected = await api.selectFolder();
      if (selected) {
        setDataDirInput(selected);
      }
    } catch (e) {
      console.error('Folder selection failed:', e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.setDb2Config(dataDirInput, localeInput);
      if (onConfigUpdated) onConfigUpdated();
      onClose();
    } catch (e) {
      console.error('Save DB2 config failed:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col font-sans max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200 text-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shadow-2xs">
              <SettingsIcon className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">Application Settings</h3>
              <p className="text-[11px] text-slate-500 font-mono">Server DB2 data configuration</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-700">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-900 leading-relaxed">
            <p className="font-semibold mb-0.5 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-blue-600" />
              <span>Native DB2 Binary Server Catalog</span>
            </p>
            <p className="text-[11.5px] text-blue-800">
              Point this at your server <code className="font-mono font-bold">data</code> folder, which contains the <code className="font-mono font-bold">dbc</code> folder.
            </p>
          </div>

          {/* Data Directory Input */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                <span>DB2 Data Folder Path</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal font-mono">Relative or Absolute Path</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={dataDirInput}
                onChange={(e) => setDataDirInput(e.target.value)}
                disabled={saving}
                placeholder=".\data or D:\HavenCore\data"
                className="flex-1 font-mono text-xs px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white"
              />
              <button
                type="button"
                onClick={handleBrowse}
                disabled={saving}
                className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
              >
                <FolderOpen className="w-3.5 h-3.5 text-slate-600" />
                <span>Browse...</span>
              </button>
            </div>
          </div>

          {/* Locale Selector */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>DBC / DB2 Locale</span>
            </label>
            <select
              value={localeInput}
              onChange={(e) => setLocaleInput(e.target.value)}
              disabled={saving}
              className="w-full font-mono text-xs px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white cursor-pointer"
            >
              <option value="enUS">enUS (English - Americas)</option>
              <option value="enGB">enGB (English - Europe)</option>
              <option value="deDE">deDE (German)</option>
              <option value="frFR">frFR (French)</option>
              <option value="esES">esES (Spanish)</option>
              <option value="ruRU">ruRU (Russian)</option>
              <option value="zhCN">zhCN (Simplified Chinese)</option>
              <option value="zhTW">zhTW (Traditional Chinese)</option>
              <option value="koKR">koKR (Korean)</option>
              <option value="ptBR">ptBR (Portuguese)</option>
              <option value="itIT">itIT (Italian)</option>
            </select>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-200 rounded font-medium cursor-pointer disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded font-semibold shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>{saving ? 'Loading DB2 Catalog...' : 'Save & Apply'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
