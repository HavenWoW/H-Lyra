// Application shell.
//
// Owns the module routing, the currently selected entity for each module, and
// the per-view dirty flags the sidebar uses to warn about unsaved work.

import React, { useState, useEffect } from 'react';
import type { DbConfig } from './types';
import { MenuBar } from './components/MenuBar';
import { Sidebar, NavModule } from './components/Sidebar';
import { LoginScreen } from './features/auth/LoginScreen';
import { DashboardView } from './features/dashboard/DashboardView';
import { CreatureView } from './features/creature/CreatureView';
import { QuestView } from './features/quest/QuestView';
import { GameObjectView } from './features/gameobject/GameObjectView';
import { ItemView } from './features/item/ItemView';
import { SmartAiView } from './features/smartai/SmartAiView';
import { SqlEditorView } from './features/sql-editor/SqlEditorView';
import { SettingsModal } from './components/SettingsModal';
import { api } from './lib/ipc';

export const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [allowAutoLogin, setAllowAutoLogin] = useState<boolean>(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  const [activeModule, setActiveModuleState] = useState<NavModule>(() => {
    return (sessionStorage.getItem('lyra_active_module') as NavModule) || 'dashboard';
  });
  const [activeSubItem, setActiveSubItemState] = useState<string>(() => {
    return sessionStorage.getItem('lyra_active_subitem') || '';
  });

  const setActiveModule = (mod: NavModule) => {
    setActiveModuleState(mod);
    sessionStorage.setItem('lyra_active_module', mod);
  };

  const setActiveSubItem = (subKey: string) => {
    setActiveSubItemState(subKey);
    sessionStorage.setItem('lyra_active_subitem', subKey);
  };

  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    creatures: false,
    quests: false,
    gameobjects: false,
    items: false,
    smartai: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleCollapseAll = () => {
    setOpenSections({
      creatures: false,
      quests: false,
      gameobjects: false,
      items: false,
      smartai: false,
    });
  };

  const [selectedEntities, setSelectedEntities] = useState<{
    item?: any;
    creature?: any;
    quest?: any;
    gameobject?: any;
    smartai?: any;
  }>({});

  const [dirtySubItems, setDirtySubItems] = useState<{ [key: string]: boolean }>({});

  const handleSetDirty = (subKey: string, isDirty: boolean) => {
    setDirtySubItems((prev) => {
      if (prev[subKey] === isDirty) return prev;
      return { ...prev, [subKey]: isDirty };
    });
  };

  const [dbConfig, setDbConfig] = useState<DbConfig>({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    world_db: 'bfa_world',
    hotfixes_db: 'bfa_hotfixes',
  });

  const handleLoginSuccess = (config: DbConfig) => {
    setDbConfig(config);
    setIsConnected(true);
    setAllowAutoLogin(true);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setAllowAutoLogin(false);
    setActiveModule('dashboard');
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+, -> Open Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
        return;
      }

      // F1: Help / GitHub
      if (e.key === 'F1') {
        e.preventDefault();
        api.openUrl('https://github.com/Stefan2102/HavenTools');
      }
      // F5 or Ctrl+R: Reload
      else if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R') && !e.shiftKey)) {
        e.preventDefault();
        window.location.reload();
      }
      // Ctrl+Shift+R: Hard Reload
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        window.location.href = window.location.origin;
      }
      // F11 or Ctrl+Shift+F: Fullscreen
      else if (e.key === 'F11' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'f' || e.key === 'F'))) {
        e.preventDefault();
        api.toggleFullscreen().catch(() => {});
      }
      // F12 or Ctrl+Shift+I: DevTools
      else if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'i' || e.key === 'I'))) {
        e.preventDefault();
        api.toggleDevtools().catch(() => {});
      }
      // Ctrl+M: Minimize
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'm' || e.key === 'M') && !e.shiftKey) {
        e.preventDefault();
        api.minimizeWindow().catch(() => {});
      }
      // Ctrl+W: Close / Exit
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        api.exitApp().catch(() => {});
      }
      // Ctrl+O: Open SQL Editor
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O') && !e.shiftKey) {
        e.preventDefault();
        setActiveModule('sqleditor');
        setActiveSubItem('');
      }
      // Ctrl+D: Disconnect
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D') && !e.shiftKey) {
        // Only if active element isn't a text input
        const active = document.activeElement;
        const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
        if (!isInput) {
          e.preventDefault();
          handleDisconnect();
        }
      }
      // Zoom In: Ctrl + Plus / Equal
      else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+' || e.code === 'NumpadAdd' || e.key === 'Add')) {
        e.preventDefault();
        const current = parseFloat((document.body.style as any).zoom || '1.0');
        const next = Math.min(Number((current + 0.1).toFixed(1)), 2.0);
        (document.body.style as any).zoom = String(next);
      }
      // Zoom Out: Ctrl + Minus / Dash
      else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract' || e.key === 'Subtract')) {
        e.preventDefault();
        const current = parseFloat((document.body.style as any).zoom || '1.0');
        const next = Math.max(Number((current - 0.1).toFixed(1)), 0.6);
        (document.body.style as any).zoom = String(next);
      }
      // Actual Size: Ctrl + 0
      else if ((e.ctrlKey || e.metaKey) && (e.key === '0' || e.code === 'Numpad0')) {
        e.preventDefault();
        (document.body.style as any).zoom = '1.0';
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Not connected -> Display Login Screen
  if (!isConnected) {
    return (
      <LoginScreen
        initialConfig={dbConfig}
        onLoginSuccess={handleLoginSuccess}
        allowAutoLogin={allowAutoLogin}
      />
    );
  }

  const dirtyList = Object.entries(dirtySubItems)
    .filter(([_, isDirty]) => isDirty)
    .map(([key]) => key);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0F172A] overflow-hidden">
      {/* Top Application Window Bar */}
      <MenuBar onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          activeModule={activeModule}
          setActiveModule={setActiveModule}
          activeSubItem={activeSubItem}
          setActiveSubItem={setActiveSubItem}
          expandedSections={openSections}
          toggleSection={toggleSection}
          selectedEntities={selectedEntities}
          dbConfig={dbConfig}
          onDisconnect={handleDisconnect}
          onCollapseAll={handleCollapseAll}
          onOpenSettings={() => setIsSettingsOpen(true)}
          dirtySubItems={dirtyList}
        />

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col bg-[#F0F2F5] overflow-hidden">
          {activeModule === 'dashboard' && <DashboardView onNavigate={(m) => setActiveModule(m as NavModule)} />}
          {activeModule === 'sqleditor' && <SqlEditorView />}
          {activeModule === 'creatures' && (
            <CreatureView
              selectedCreature={selectedEntities.creature}
              onSelectCreature={(creature) => setSelectedEntities((prev) => ({ ...prev, creature }))}
              activeSubTab={activeSubItem.startsWith('creatures:') ? activeSubItem.split(':')[1] : 'select'}
              onNavigateSubItem={(sub) => setActiveSubItem(`creatures:${sub}`)}
              onSetDirty={handleSetDirty}
            />
          )}
          {activeModule === 'quests' && (
            <QuestView
              selectedQuest={selectedEntities.quest}
              onSelectQuest={(quest) => setSelectedEntities((prev) => ({ ...prev, quest }))}
              activeSubTab={activeSubItem.startsWith('quests:') ? activeSubItem.split(':')[1] : 'select'}
              onNavigateSubItem={(sub) => setActiveSubItem(`quests:${sub}`)}
              onSetDirty={handleSetDirty}
            />
          )}
          {activeModule === 'gameobjects' && (
            <GameObjectView
              selectedGameObject={selectedEntities.gameobject}
              onSelectGameObject={(gameobject) => setSelectedEntities((prev) => ({ ...prev, gameobject }))}
              activeSubTab={activeSubItem.startsWith('gameobjects:') ? activeSubItem.split(':')[1] : 'select'}
              onNavigateSubItem={(sub) => setActiveSubItem(`gameobjects:${sub}`)}
              onSetDirty={handleSetDirty}
            />
          )}
          {activeModule === 'items' && (
            <ItemView
              selectedItem={selectedEntities.item}
              onSelectItem={(item) => setSelectedEntities((prev) => ({ ...prev, item }))}
              activeSubTab={activeSubItem.startsWith('items:') ? activeSubItem.split(':')[1] : 'select'}
              onNavigateSubItem={(sub) => setActiveSubItem(`items:${sub}`)}
              onSetDirty={handleSetDirty}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          )}
          {activeModule === 'smartai' && (
            <SmartAiView
              selectedScript={selectedEntities.smartai}
              onSelectScript={(script) => setSelectedEntities((prev) => ({ ...prev, smartai: script }))}
              activeSubTab={activeSubItem.startsWith('smartai:') ? activeSubItem.split(':')[1] : 'select'}
              onNavigateSubItem={(sub) => setActiveSubItem(`smartai:${sub}`)}
              onSetDirty={handleSetDirty}
            />
          )}
        </div>
      </div>

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default App;
