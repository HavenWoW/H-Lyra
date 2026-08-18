// Client data settings: the DB2 directory, locale and per-table load status.

import React from 'react';
import { FolderOpen, HardDrive, RefreshCw, X } from 'lucide-react';
import { api } from '../../../lib/ipc';

interface ItemDb2ModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataDirInput: string;
  setDataDirInput: (dir: string) => void;
  localeInput: string;
  setLocaleInput: (loc: string) => void;
  handleSaveDb2Config: () => void;
  saving?: boolean;
}

export const ItemDb2Modal: React.FC<ItemDb2ModalProps> = ({
  isOpen,
  onClose,
  dataDirInput,
  setDataDirInput,
  localeInput,
  setLocaleInput,
  handleSaveDb2Config,
  saving = false,
}) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col font-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm">Server Data Directory</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs text-slate-700">
          <p className="text-slate-600 leading-relaxed">
            Select your HavenCore server's <code className="font-mono text-slate-800 font-semibold">data</code> directory (containing extracted <code className="font-mono text-slate-800">dbc\{localeInput}\Item.db2</code> and <code className="font-mono text-slate-800">ItemSparse.db2</code>) to load the base item catalog.
          </p>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Server Data Directory</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={dataDirInput}
                onChange={(e) => setDataDirInput(e.target.value)}
                disabled={saving}
                placeholder=".\data or C:\HavenCore\data"
                className="flex-1 font-mono text-xs px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-slate-50/50"
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

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800">DBC / DB2 Locale</label>
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
            </select>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-200 rounded font-medium cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveDb2Config}
            disabled={saving}
            className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded font-medium shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{saving ? 'Loading Catalog...' : 'Apply'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

