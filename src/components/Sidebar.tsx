// Module navigation.
//
// Each module expands into the sub-views its editor provides, and a dot marks
// any sub-view with unsaved changes.

import React from 'react';
import {
  Activity,
  Users,
  BookOpen,
  Box,
  Sword,
  Coins,
  Radio,
  MessageSquare,
  Scale,
  Zap,
  GraduationCap,
  Sparkles,
  Code2,
  ChevronRight,
  Circle,
  Power,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUp,
  Brain,
  Settings as SettingsIcon,
} from 'lucide-react';
import type { DbConfig } from '../types';

export type NavModule =
  | 'dashboard'
  | 'sqleditor'
  | 'creatures'
  | 'quests'
  | 'gameobjects'
  | 'items'
  | 'smartai';

interface SidebarProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  activeModule: NavModule;
  setActiveModule: (module: NavModule) => void;
  activeSubItem: string;
  setActiveSubItem: (subItem: string) => void;
  expandedSections: { [key: string]: boolean };
  toggleSection: (section: string) => void;
  selectedEntities: {
    creature?: any;
    quest?: any;
    gameobject?: any;
    item?: any;
    smartai?: any;
  };
  dbConfig: DbConfig;
  onDisconnect: () => void;
  onCollapseAll?: () => void;
  onOpenSettings?: () => void;
  dirtySubItems?: string[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  sidebarCollapsed,
  setSidebarCollapsed,
  activeModule,
  setActiveModule,
  activeSubItem,
  setActiveSubItem,
  expandedSections,
  toggleSection,
  selectedEntities,
  dbConfig,
  onDisconnect,
  onCollapseAll,
  onOpenSettings,
  dirtySubItems = [],
}) => {
  const handleEntityClick = (moduleName: NavModule) => {
    toggleSection(moduleName);
  };

  return (
    <div
      className={`${
        sidebarCollapsed ? 'w-16' : 'w-64'
      } bg-[#0F172A] border-r border-[#1E293B] flex flex-col flex-shrink-0 transition-all duration-200 z-10 select-none font-sans`}
    >
      {/* Profile Card & Connection Info */}
      {!sidebarCollapsed ? (
        <div className="p-3 border-b border-[#1E293B] space-y-2.5 bg-[#0B1120]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-900 border border-blue-400/30 p-1 flex items-center justify-center shadow-md shadow-blue-950/40 flex-shrink-0">
              <img src="/assets/img/lyra.png" alt="Lyra" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white truncate font-mono">{dbConfig.user}</span>
                <div className="flex items-center space-x-1 text-[11px] text-emerald-400 font-mono">
                  <Circle className="w-1.5 h-1.5 fill-emerald-400 text-emerald-400 animate-pulse" />
                  <span>Online</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 font-mono truncate">{dbConfig.host}:{dbConfig.port}</div>
            </div>
          </div>

          {/* Dual Database Badge Chips */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <span
              className="flex-1 text-center bg-[#1E293B]/80 border border-[#334155]/60 text-slate-300 text-[10.5px] font-mono px-2 py-0.5 rounded truncate"
              title={`World Database: ${dbConfig.world_db}`}
            >
              {dbConfig.world_db}
            </span>
            <span
              className="flex-1 text-center bg-[#1E293B]/80 border border-[#334155]/60 text-slate-300 text-[10.5px] font-mono px-2 py-0.5 rounded truncate"
              title={`Hotfixes Database: ${dbConfig.hotfixes_db}`}
            >
              {dbConfig.hotfixes_db}
            </span>
          </div>

          {/* Disconnect Button */}
          <button
            type="button"
            onClick={onDisconnect}
            className="w-full bg-[#1E293B] hover:bg-red-950/60 hover:border-red-600/60 border border-[#334155] text-slate-200 hover:text-red-300 py-1.5 px-3 rounded-lg text-xs font-mono flex items-center justify-between transition-all cursor-pointer"
          >
            <span>Disconnect</span>
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="p-3 border-b border-[#1E293B] flex flex-col items-center gap-2 bg-[#0B1120]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-900 border border-blue-400/40 p-1 flex items-center justify-center">
            <img src="/assets/img/lyra.png" alt="Lyra" className="w-full h-full object-contain" />
          </div>
          <button
            type="button"
            onClick={onDisconnect}
            className="p-1.5 rounded-lg bg-[#1E293B] hover:bg-red-900/60 text-slate-200 hover:text-red-300 transition-all cursor-pointer"
            title="Disconnect"
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Modules List */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        <button
          type="button"
          onClick={() => {
            setActiveModule('dashboard');
            setActiveSubItem('');
          }}
          className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg transition-all text-left cursor-pointer hover:bg-[#1E293B]/60 ${
            activeModule === 'dashboard'
              ? 'text-white font-semibold'
              : 'text-slate-300 hover:text-white font-medium text-sm'
          }`}
        >
          <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
            activeModule === 'dashboard' ? 'bg-white/10 text-white' : 'text-slate-400'
          }`}>
            <Activity className="w-4 h-4" />
          </div>
          {!sidebarCollapsed && <span className="text-sm">Dashboard</span>}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveModule('sqleditor');
            setActiveSubItem('');
          }}
          className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg transition-all text-left cursor-pointer hover:bg-[#1E293B]/60 ${
            activeModule === 'sqleditor'
              ? 'text-white font-semibold'
              : 'text-slate-300 hover:text-white font-medium text-sm'
          }`}
        >
          <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
            activeModule === 'sqleditor' ? 'bg-white/10 text-white' : 'text-slate-400'
          }`}>
            <Code2 className="w-4 h-4" />
          </div>
          {!sidebarCollapsed && <span className="text-sm">SQL Editor</span>}
        </button>

        <button
          type="button"
          onClick={onCollapseAll}
          className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg transition-all text-left cursor-pointer hover:bg-[#1E293B]/60 text-slate-300 hover:text-white font-medium text-sm"
          title="Collapse All"
        >
          <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 transition-colors text-slate-400">
            <ChevronsUp className="w-4 h-4" />
          </div>
          {!sidebarCollapsed && <span className="text-sm">Collapse All</span>}
        </button>

        {/* Creature */}
        <div className="rounded-lg overflow-hidden transition-colors">
          <button
            type="button"
            onClick={() => handleEntityClick('creatures')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left cursor-pointer hover:bg-[#1E293B]/60 ${
              activeModule === 'creatures'
                ? 'text-white font-semibold'
                : 'text-slate-300 hover:text-white font-medium text-sm'
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                activeModule === 'creatures' ? 'bg-white/10 text-white' : 'text-slate-400'
              }`}>
                <Users className="w-4 h-4" />
              </div>
              {!sidebarCollapsed && <span className="text-sm">Creature</span>}
            </div>
            {!sidebarCollapsed && (
              <ChevronRight
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  expandedSections['creatures'] ? 'rotate-90 text-white' : ''
                }`}
              />
            )}
          </button>

          {!sidebarCollapsed && expandedSections['creatures'] && (
            <div className="py-1 space-y-0.5 w-full">
              <button
                type="button"
                onClick={() => {
                  setActiveModule('creatures');
                  setActiveSubItem('creatures:select');
                }}
                className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer ${
                  activeModule === 'creatures' && activeSubItem === 'creatures:select'
                    ? 'text-white font-bold'
                    : 'text-slate-400 hover:text-white font-normal'
                }`}
              >
                Select Creature
              </button>

              {selectedEntities.creature && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('creatures');
                      setActiveSubItem('creatures:template');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'creatures' && (activeSubItem === 'creatures:template' || activeSubItem === 'template')
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Creature Template</span>
                    {dirtySubItems.includes('creatures:template') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('creatures');
                      setActiveSubItem('creatures:addon');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'creatures' && activeSubItem === 'creatures:addon'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Template Addon</span>
                    {dirtySubItems.includes('creatures:addon') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('creatures');
                      setActiveSubItem('creatures:models');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'creatures' && (activeSubItem === 'creatures:models' || activeSubItem === 'models')
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Template Models</span>
                    {dirtySubItems.includes('creatures:models') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('creatures');
                      setActiveSubItem('creatures:spells');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'creatures' && (activeSubItem === 'creatures:spells' || activeSubItem === 'spells')
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Template Spells</span>
                    {dirtySubItems.includes('creatures:spells') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('creatures');
                      setActiveSubItem('creatures:scaling');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'creatures' && activeSubItem === 'creatures:scaling'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Scaling & Difficulty</span>
                    {dirtySubItems.includes('creatures:scaling') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('creatures');
                      setActiveSubItem('creatures:equip');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'creatures' && activeSubItem === 'creatures:equip'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Equip Template</span>
                    {dirtySubItems.includes('creatures:equip') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('creatures');
                      setActiveSubItem('creatures:vendor');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'creatures' && activeSubItem === 'creatures:vendor'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Vendor</span>
                    {dirtySubItems.includes('creatures:vendor') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('creatures');
                      setActiveSubItem('creatures:trainer');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'creatures' && activeSubItem === 'creatures:trainer'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Trainer</span>
                    {dirtySubItems.includes('creatures:trainer') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('creatures');
                      setActiveSubItem('creatures:onkill');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'creatures' && activeSubItem === 'creatures:onkill'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>OnKill Rewards</span>
                    {dirtySubItems.includes('creatures:onkill') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('creatures');
                      setActiveSubItem('creatures:quests');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'creatures' && activeSubItem === 'creatures:quests'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Quest Relations</span>
                    {dirtySubItems.includes('creatures:quests') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('creatures');
                      setActiveSubItem('creatures:loot');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'creatures' && (activeSubItem === 'creatures:loot' || activeSubItem === 'loot')
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Creature Loot</span>
                    {dirtySubItems.includes('creatures:loot') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('creatures');
                      setActiveSubItem('creatures:pickpocket');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'creatures' && activeSubItem === 'creatures:pickpocket'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Pickpocketing Loot</span>
                    {dirtySubItems.includes('creatures:pickpocket') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('creatures');
                      setActiveSubItem('creatures:skinning');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'creatures' && activeSubItem === 'creatures:skinning'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Skinning Loot</span>
                    {dirtySubItems.includes('creatures:skinning') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('creatures');
                      setActiveSubItem('creatures:spawns');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'creatures' && (activeSubItem === 'creatures:spawns' || activeSubItem === 'spawns')
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Spawns & World</span>
                    {dirtySubItems.includes('creatures:spawns') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('creatures');
                      setActiveSubItem('creatures:spawn_addon');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'creatures' && activeSubItem === 'creatures:spawn_addon'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Spawn Addon</span>
                    {dirtySubItems.includes('creatures:spawn_addon') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('creatures');
                      setActiveSubItem('creatures:smartai');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'creatures' && (activeSubItem === 'creatures:smartai' || activeSubItem === 'smartai')
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>SmartAI</span>
                    {dirtySubItems.includes('creatures:smartai') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('creatures');
                      setActiveSubItem('creatures:texts');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'creatures' && (activeSubItem === 'creatures:texts' || activeSubItem === 'texts')
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Creature Texts</span>
                    {dirtySubItems.includes('creatures:texts') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('creatures');
                      setActiveSubItem('creatures:formations');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'creatures' && activeSubItem === 'creatures:formations'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Formations</span>
                    {dirtySubItems.includes('creatures:formations') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Quest */}
        <div className="rounded-lg overflow-hidden transition-colors">
          <button
            type="button"
            onClick={() => handleEntityClick('quests')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left cursor-pointer hover:bg-[#1E293B]/60 ${
              activeModule === 'quests'
                ? 'text-white font-semibold'
                : 'text-slate-300 hover:text-white font-medium text-sm'
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                activeModule === 'quests' ? 'bg-white/10 text-white' : 'text-slate-400'
              }`}>
                <BookOpen className="w-4 h-4" />
              </div>
              {!sidebarCollapsed && <span className="text-sm">Quest</span>}
            </div>
            {!sidebarCollapsed && (
              <ChevronRight
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  expandedSections['quests'] ? 'rotate-90 text-white' : ''
                }`}
              />
            )}
          </button>

          {!sidebarCollapsed && expandedSections['quests'] && (
            <div className="py-1 space-y-0.5 w-full">
              <button
                type="button"
                onClick={() => {
                  setActiveModule('quests');
                  setActiveSubItem('quests:select');
                }}
                className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer ${
                  activeModule === 'quests' && activeSubItem === 'quests:select'
                    ? 'text-white font-bold'
                    : 'text-slate-400 hover:text-white font-normal'
                }`}
              >
                Select Quest
              </button>

              {selectedEntities.quest && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('quests');
                      setActiveSubItem('quests:template');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'quests' && (activeSubItem === 'quests:template' || activeSubItem === 'template')
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Quest Template</span>
                    {dirtySubItems.includes('quests:template') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('quests');
                      setActiveSubItem('quests:addon');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'quests' && activeSubItem === 'quests:addon'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Quest Template Addon</span>
                    {dirtySubItems.includes('quests:addon') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('quests');
                      setActiveSubItem('quests:objectives');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'quests' && (activeSubItem === 'quests:objectives' || activeSubItem === 'objectives')
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Quest Objectives</span>
                    {dirtySubItems.includes('quests:objectives') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('quests');
                      setActiveSubItem('quests:rewards');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'quests' && (activeSubItem === 'quests:rewards' || activeSubItem === 'rewards')
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Rewards & Currency</span>
                    {dirtySubItems.includes('quests:rewards') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('quests');
                      setActiveSubItem('quests:offer_reward');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'quests' && activeSubItem === 'quests:offer_reward'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Quest Offer Reward</span>
                    {dirtySubItems.includes('quests:offer_reward') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('quests');
                      setActiveSubItem('quests:request_items');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'quests' && activeSubItem === 'quests:request_items'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Quest Request Items</span>
                    {dirtySubItems.includes('quests:request_items') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('quests');
                      setActiveSubItem('quests:greetings');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'quests' && (activeSubItem === 'quests:greetings' || activeSubItem === 'greetings')
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Greetings & Details</span>
                    {dirtySubItems.includes('quests:greetings') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('quests');
                      setActiveSubItem('quests:relations');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'quests' && activeSubItem === 'quests:relations'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Quest Relations</span>
                    {dirtySubItems.includes('quests:relations') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('quests');
                      setActiveSubItem('quests:poi');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'quests' && activeSubItem === 'quests:poi'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Quest POI & Points</span>
                    {dirtySubItems.includes('quests:poi') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Game Object */}
        <div className="rounded-lg overflow-hidden transition-colors">
          <button
            type="button"
            onClick={() => handleEntityClick('gameobjects')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left cursor-pointer hover:bg-[#1E293B]/60 ${
              activeModule === 'gameobjects'
                ? 'text-white font-semibold'
                : 'text-slate-300 hover:text-white font-medium text-sm'
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                activeModule === 'gameobjects' ? 'bg-white/10 text-white' : 'text-slate-400'
              }`}>
                <Box className="w-4 h-4" />
              </div>
              {!sidebarCollapsed && <span className="text-sm">Game Object</span>}
            </div>
            {!sidebarCollapsed && (
              <ChevronRight
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  expandedSections['gameobjects'] ? 'rotate-90 text-white' : ''
                }`}
              />
            )}
          </button>

          {!sidebarCollapsed && expandedSections['gameobjects'] && (
            <div className="py-1 space-y-0.5 w-full">
              <button
                type="button"
                onClick={() => {
                  setActiveModule('gameobjects');
                  setActiveSubItem('gameobjects:select');
                }}
                className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer ${
                  activeModule === 'gameobjects' && activeSubItem === 'gameobjects:select'
                    ? 'text-white font-bold'
                    : 'text-slate-400 hover:text-white font-normal'
                }`}
              >
                Select GameObject
              </button>

              {selectedEntities.gameobject && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('gameobjects');
                      setActiveSubItem('gameobjects:template');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'gameobjects' && (activeSubItem === 'gameobjects:template' || activeSubItem === 'template')
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Gameobject Template</span>
                    {dirtySubItems.includes('gameobjects:template') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('gameobjects');
                      setActiveSubItem('gameobjects:addon');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'gameobjects' && activeSubItem === 'gameobjects:addon'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Template Addon</span>
                    {dirtySubItems.includes('gameobjects:addon') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('gameobjects');
                      setActiveSubItem('gameobjects:quest_items');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'gameobjects' && activeSubItem === 'gameobjects:quest_items'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Quest Items</span>
                    {dirtySubItems.includes('gameobjects:quest_items') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('gameobjects');
                      setActiveSubItem('gameobjects:loot');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'gameobjects' && activeSubItem === 'gameobjects:loot'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Gameobject Loot</span>
                    {dirtySubItems.includes('gameobjects:loot') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('gameobjects');
                      setActiveSubItem('gameobjects:spawns');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'gameobjects' && (activeSubItem === 'gameobjects:spawns' || activeSubItem === 'spawns')
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Spawn</span>
                    {dirtySubItems.includes('gameobjects:spawns') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('gameobjects');
                      setActiveSubItem('gameobjects:spawn_addon');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'gameobjects' && activeSubItem === 'gameobjects:spawn_addon'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Spawn Addon</span>
                    {dirtySubItems.includes('gameobjects:spawn_addon') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('gameobjects');
                      setActiveSubItem('gameobjects:smartai');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'gameobjects' && activeSubItem === 'gameobjects:smartai'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>SmartAI</span>
                    {dirtySubItems.includes('gameobjects:smartai') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Item */}
        <div className="rounded-lg overflow-hidden transition-colors">
          <button
            type="button"
            onClick={() => handleEntityClick('items')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left cursor-pointer hover:bg-[#1E293B]/60 ${
              activeModule === 'items'
                ? 'text-white font-semibold'
                : 'text-slate-300 hover:text-white font-medium text-sm'
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                activeModule === 'items' ? 'bg-white/10 text-white' : 'text-slate-400'
              }`}>
                <Sword className="w-4 h-4" />
              </div>
              {!sidebarCollapsed && <span className="text-sm">Item</span>}
            </div>
            {!sidebarCollapsed && (
              <ChevronRight
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  expandedSections['items'] ? 'rotate-90 text-white' : ''
                }`}
              />
            )}
          </button>

          {!sidebarCollapsed && expandedSections['items'] && (
            <div className="py-1 space-y-0.5 w-full">
              <button
                type="button"
                onClick={() => {
                  setActiveModule('items');
                  setActiveSubItem('items:select');
                }}
                className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer ${
                  activeModule === 'items' && (activeSubItem === 'items:select' || activeSubItem === 'select' || !activeSubItem)
                    ? 'text-white font-bold'
                    : 'text-slate-400 hover:text-white font-normal'
                }`}
              >
                Select Item
              </button>

              {selectedEntities.item && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('items');
                      setActiveSubItem('items:template');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'items' && (activeSubItem === 'items:template' || activeSubItem === 'items:properties')
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Item Properties</span>
                    {(dirtySubItems.includes('items:template') || dirtySubItems.includes('items:properties')) && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('items');
                      setActiveSubItem('items:effects');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'items' && activeSubItem === 'items:effects'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Item Effects</span>
                    {dirtySubItems.includes('items:effects') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('items');
                      setActiveSubItem('items:enchantment');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'items' && activeSubItem === 'items:enchantment'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Enchantments</span>
                    {dirtySubItems.includes('items:enchantment') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('items');
                      setActiveSubItem('items:loot');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'items' && activeSubItem === 'items:loot'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Item Loot</span>
                    {dirtySubItems.includes('items:loot') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('items');
                      setActiveSubItem('items:disenchant');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'items' && activeSubItem === 'items:disenchant'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Disenchant Loot</span>
                    {dirtySubItems.includes('items:disenchant') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('items');
                      setActiveSubItem('items:prospecting');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'items' && activeSubItem === 'items:prospecting'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Prospecting Loot</span>
                    {dirtySubItems.includes('items:prospecting') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('items');
                      setActiveSubItem('items:milling');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'items' && activeSubItem === 'items:milling'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Milling Loot</span>
                    {dirtySubItems.includes('items:milling') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('items');
                      setActiveSubItem('items:scrapping');
                    }}
                    className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeModule === 'items' && activeSubItem === 'items:scrapping'
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-white font-normal'
                    }`}
                  >
                    <span>Scrapping Loot</span>
                    {dirtySubItems.includes('items:scrapping') && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* SmartAI */}
        <div className="rounded-lg overflow-hidden transition-colors">
          <button
            type="button"
            onClick={() => handleEntityClick('smartai')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left cursor-pointer hover:bg-[#1E293B]/60 ${
              activeModule === 'smartai'
                ? 'text-white font-semibold'
                : 'text-slate-300 hover:text-white font-medium text-sm'
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                activeModule === 'smartai' ? 'bg-white/10 text-white' : 'text-slate-400'
              }`}>
                <Brain className="w-4 h-4" />
              </div>
              {!sidebarCollapsed && <span className="text-sm">SmartAI</span>}
            </div>
            {!sidebarCollapsed && (
              <ChevronRight
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  expandedSections['smartai'] ? 'rotate-90 text-white' : ''
                }`}
              />
            )}
          </button>

          {!sidebarCollapsed && expandedSections['smartai'] && (
            <div className="py-1 space-y-0.5 w-full">
              <button
                type="button"
                onClick={() => {
                  setActiveModule('smartai');
                  setActiveSubItem('smartai:select');
                }}
                className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer ${
                  activeModule === 'smartai' && (activeSubItem === 'smartai:select' || activeSubItem === 'select' || !activeSubItem)
                    ? 'text-white font-bold'
                    : 'text-slate-400 hover:text-white font-normal'
                }`}
              >
                Select SmartAI
              </button>

              {selectedEntities.smartai && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveModule('smartai');
                    setActiveSubItem('smartai:editor');
                  }}
                  className={`w-full text-left py-1.5 pl-10 pr-3 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                    activeModule === 'smartai' && (activeSubItem === 'smartai:editor' || activeSubItem === 'editor')
                      ? 'text-white font-bold'
                      : 'text-slate-400 hover:text-white font-normal'
                  }`}
                >
                  <span>Script Editor</span>
                  {dirtySubItems.includes('smartai:editor') && (
                    <span className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 shadow-2xs" title="Unsaved modifications" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Settings & Collapse Buttons */}
      <div className={`p-2 border-t border-[#1E293B] bg-[#0B1120] flex items-center ${sidebarCollapsed ? 'flex-col gap-2 justify-center' : 'justify-between px-3'}`}>
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg hover:bg-[#1E293B] text-slate-400 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
          title="Settings & Client Data (Ctrl+,)"
        >
          <SettingsIcon className="w-4 h-4 text-slate-400 hover:text-white" />
          {!sidebarCollapsed && <span className="text-xs text-slate-300 font-medium">Settings</span>}
        </button>

        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-1.5 rounded-lg hover:bg-[#1E293B] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronsRight className="w-5 h-5" />
          ) : (
            <ChevronsLeft className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
