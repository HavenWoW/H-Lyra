// Application menu bar.

import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { api } from '../lib/ipc';

interface MenuBarProps {
  onZoomChange?: (newZoom: number) => void;
  onOpenSettings?: () => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({ onZoomChange, onOpenSettings }) => {
  const [activeMenu, setActiveMenu] = useState<'lyra' | 'edit' | 'window' | 'help' | null>(null);
  const [helpSubmenu, setHelpSubmenu] = useState<'lyra' | 'havencore' | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(1);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<any>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
        setHelpSubmenu(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleMenuEnter = (menu: 'lyra' | 'edit' | 'window' | 'help') => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    setActiveMenu(menu);
  };

  const handleMenuLeave = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
      setHelpSubmenu(null);
    }, 150);
  };

  const handleEditAction = (action: string) => {
    setActiveMenu(null);
    try {
      switch (action) {
        case 'undo':
          document.execCommand('undo');
          break;
        case 'redo':
          document.execCommand('redo');
          break;
        case 'cut':
          document.execCommand('cut');
          break;
        case 'copy':
          document.execCommand('copy');
          break;
        case 'paste':
          navigator.clipboard.readText().then((text) => {
            const activeEl = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
            if (activeEl && 'value' in activeEl) {
              const start = activeEl.selectionStart || 0;
              const end = activeEl.selectionEnd || 0;
              activeEl.value = activeEl.value.substring(0, start) + text + activeEl.value.substring(end);
            }
          }).catch(() => {});
          break;
        case 'delete':
          document.execCommand('delete');
          break;
        case 'selectAll':
          document.execCommand('selectAll');
          break;
      }
    } catch {
      // Browser fallback
    }
  };

  const handleWindowAction = (action: string) => {
    setActiveMenu(null);
    switch (action) {
      case 'reload':
        window.location.reload();
        break;
      case 'force_reload':
        window.location.href = window.location.origin;
        break;
      case 'devtools':
        api.toggleDevtools().catch(() => {});
        break;
      case 'zoom_in': {
        const next = Math.min(2.0, +(currentZoom + 0.1).toFixed(1));
        setCurrentZoom(next);
        document.body.style.zoom = String(next);
        if (onZoomChange) onZoomChange(next);
        break;
      }
      case 'zoom_out': {
        const next = Math.max(0.5, +(currentZoom - 0.1).toFixed(1));
        setCurrentZoom(next);
        document.body.style.zoom = String(next);
        if (onZoomChange) onZoomChange(next);
        break;
      }
      case 'actual_size':
        setCurrentZoom(1);
        document.body.style.zoom = '1';
        if (onZoomChange) onZoomChange(1);
        break;
      case 'fullscreen':
        api.toggleFullscreen().catch(() => {});
        break;
      case 'minimize':
        api.minimizeWindow().catch(() => {});
        break;
      case 'close':
        api.exitApp().catch(() => {});
        break;
    }
  };

  const handleHelpAction = (action: string) => {
    setActiveMenu(null);
    setHelpSubmenu(null);
    switch (action) {
      case 'lyra_repo':
        api.openUrl('https://github.com/Stefan2102/HavenTools');
        break;
      case 'lyra_bugs':
        api.openUrl('https://github.com/Stefan2102/HavenTools/issues');
        break;
      case 'havencore_repo':
        api.openUrl('https://github.com/HavenWoW/BFA-HavenCore');
        break;
      case 'havencore_bugs':
        api.openUrl('https://github.com/HavenWoW/BFA-HavenCore/issues');
        break;
      case 'discord':
        api.openUrl('https://discord.gg/havencore');
        break;
    }
  };

  return (
    <div
      ref={menuBarRef}
      className="h-7 bg-[#0B0F19] border-b border-[#1E293B] flex items-center justify-between px-3 text-xs text-slate-300 font-sans select-none flex-shrink-0 relative z-50"
    >
      <div className="flex items-center space-x-1">
        {/* Lyra Menu */}
        <div
          className="relative"
          onMouseEnter={() => handleMenuEnter('lyra')}
          onMouseLeave={handleMenuLeave}
        >
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === 'lyra' ? null : 'lyra')}
            className={`px-2.5 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors ${
              activeMenu === 'lyra' ? 'bg-[#1E293B] text-white' : 'text-slate-200 hover:bg-[#161F33] hover:text-white'
            }`}
          >
            Lyra
          </button>

          {activeMenu === 'lyra' && (
            <div className="absolute top-full left-0 pt-0.5 z-50">
              <div className="w-44 bg-[#111728] border border-slate-700 rounded-lg shadow-2xl py-1 text-xs text-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu(null);
                    if (onOpenSettings) onOpenSettings();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <span className="text-white font-medium">Settings...</span>
                  <span className="text-[10px] text-slate-300 group-hover:text-white font-mono">Ctrl+,</span>
                </button>

                <div className="border-t border-slate-700/80 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu(null);
                    api.exitApp();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <span className="text-white font-medium">Exit</span>
                  <span className="text-[10px] text-slate-300 group-hover:text-white font-mono">Alt+F4</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Edit Menu */}
        <div
          className="relative"
          onMouseEnter={() => handleMenuEnter('edit')}
          onMouseLeave={handleMenuLeave}
        >
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
            className={`px-2.5 py-0.5 rounded text-xs cursor-pointer transition-colors ${
              activeMenu === 'edit' ? 'bg-[#1E293B] text-white font-semibold' : 'text-slate-300 hover:bg-[#161F33] hover:text-white'
            }`}
          >
            Edit
          </button>

          {activeMenu === 'edit' && (
            <div className="absolute top-full left-0 pt-0.5 z-50">
              <div className="w-44 bg-[#111728] border border-slate-700 rounded-lg shadow-2xl py-1 text-xs text-slate-200">
                <button
                  type="button"
                  onClick={() => handleEditAction('undo')}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <span className="text-white font-medium">Undo</span>
                  <span className="text-[10px] text-slate-300 group-hover:text-white font-mono">Ctrl+Z</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleEditAction('redo')}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <span className="text-white font-medium">Redo</span>
                  <span className="text-[10px] text-slate-300 group-hover:text-white font-mono">Ctrl+Y</span>
                </button>

                <div className="border-t border-slate-700/80 my-1" />

                <button
                  type="button"
                  onClick={() => handleEditAction('cut')}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <span className="text-white font-medium">Cut</span>
                  <span className="text-[10px] text-slate-300 group-hover:text-white font-mono">Ctrl+X</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleEditAction('copy')}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <span className="text-white font-medium">Copy</span>
                  <span className="text-[10px] text-slate-300 group-hover:text-white font-mono">Ctrl+C</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleEditAction('paste')}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <span className="text-white font-medium">Paste</span>
                  <span className="text-[10px] text-slate-300 group-hover:text-white font-mono">Ctrl+V</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleEditAction('delete')}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <span className="text-white font-medium">Delete</span>
                  <span className="text-[10px] text-slate-300 group-hover:text-white font-mono">Del</span>
                </button>

                <div className="border-t border-slate-700/80 my-1" />

                <button
                  type="button"
                  onClick={() => handleEditAction('selectAll')}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <span className="text-white font-medium">Select All</span>
                  <span className="text-[10px] text-slate-300 group-hover:text-white font-mono">Ctrl+A</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Window Menu */}
        <div
          className="relative"
          onMouseEnter={() => handleMenuEnter('window')}
          onMouseLeave={handleMenuLeave}
        >
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === 'window' ? null : 'window')}
            className={`px-2.5 py-0.5 rounded text-xs cursor-pointer transition-colors ${
              activeMenu === 'window' ? 'bg-[#1E293B] text-white font-semibold' : 'text-slate-300 hover:bg-[#161F33] hover:text-white'
            }`}
          >
            Window
          </button>

          {activeMenu === 'window' && (
            <div className="absolute top-full left-0 pt-0.5 z-50">
              <div className="w-52 bg-[#111728] border border-slate-700 rounded-lg shadow-2xl py-1 text-xs text-slate-200">
                <button
                  type="button"
                  onClick={() => handleWindowAction('reload')}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <span className="text-white font-medium">Reload</span>
                  <span className="text-[10px] text-slate-300 group-hover:text-white font-mono">Ctrl+R</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleWindowAction('force_reload')}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <span className="text-white font-medium">Force Reload</span>
                  <span className="text-[10px] text-slate-300 group-hover:text-white font-mono">Ctrl+Shift+R</span>
                </button>

                <div className="border-t border-slate-700/80 my-1" />

                <button
                  type="button"
                  onClick={() => handleWindowAction('fullscreen')}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <span className="text-white font-medium">Toggle Full Screen</span>
                  <span className="text-[10px] text-slate-300 group-hover:text-white font-mono">F11</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleWindowAction('minimize')}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <span className="text-white font-medium">Minimize</span>
                  <span className="text-[10px] text-slate-300 group-hover:text-white font-mono">Ctrl+M</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleWindowAction('close')}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <span className="text-white font-medium">Close</span>
                  <span className="text-[10px] text-slate-300 group-hover:text-white font-mono">Ctrl+W</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Help Menu */}
        <div
          className="relative"
          onMouseEnter={() => handleMenuEnter('help')}
          onMouseLeave={handleMenuLeave}
        >
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
            className={`px-2.5 py-0.5 rounded text-xs cursor-pointer transition-colors ${
              activeMenu === 'help' ? 'bg-[#1E293B] text-white font-semibold' : 'text-slate-300 hover:bg-[#161F33] hover:text-white'
            }`}
          >
            Help
          </button>

          {activeMenu === 'help' && (
            <div className="absolute top-full left-0 pt-0.5 z-50">
              <div className="w-44 bg-[#111728] border border-slate-700 rounded-lg shadow-2xl py-1 text-xs text-slate-200">
                {/* Lyra Submenu */}
                <div
                  className="relative group"
                  onMouseEnter={() => setHelpSubmenu('lyra')}
                >
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer ${
                      helpSubmenu === 'lyra' ? 'bg-blue-600 text-white' : 'hover:bg-blue-600 hover:text-white'
                    }`}
                  >
                    <span className="text-white font-medium">Lyra</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {helpSubmenu === 'lyra' && (
                    <div className="absolute left-full top-0 pl-0.5 z-50">
                      <div className="w-44 bg-[#111728] border border-slate-700 rounded-lg shadow-2xl py-1 text-xs text-slate-200">
                        <button
                          type="button"
                          onClick={() => handleHelpAction('lyra_repo')}
                          className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between transition-colors cursor-pointer group"
                        >
                          <span className="text-white font-medium">Lyra Repository</span>
                          <span className="text-[10px] text-slate-300 group-hover:text-white font-mono">F1</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleHelpAction('lyra_bugs')}
                          className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span className="text-white font-medium">Report a Bug</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* HavenCore Submenu */}
                <div
                  className="relative group"
                  onMouseEnter={() => setHelpSubmenu('havencore')}
                >
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer ${
                      helpSubmenu === 'havencore' ? 'bg-blue-600 text-white' : 'hover:bg-blue-600 hover:text-white'
                    }`}
                  >
                    <span className="text-white font-medium">HavenCore</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {helpSubmenu === 'havencore' && (
                    <div className="absolute left-full top-0 pl-0.5 z-50">
                      <div className="w-48 bg-[#111728] border border-slate-700 rounded-lg shadow-2xl py-1 text-xs text-slate-200">
                        <button
                          type="button"
                          onClick={() => handleHelpAction('havencore_repo')}
                          className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span className="text-white font-medium">HavenCore Repository</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleHelpAction('havencore_bugs')}
                          className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span className="text-white font-medium">Report a Bug</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Discord link */}
                <div onMouseEnter={() => setHelpSubmenu(null)}>
                  <button
                    type="button"
                    onClick={() => handleHelpAction('discord')}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="text-white font-medium">Join our Discord</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuBar;
