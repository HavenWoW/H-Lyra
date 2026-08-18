// Gameobject module coordinator.
//
// Routes between the select screen, the template editor and the sub-tabs.

import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../lib/ipc';
import { GameObjectSelectScreen } from './components/GameObjectSelectScreen';
import { GameObjectDetailEditor } from './components/GameObjectDetailEditor';
import { GameObjectAddonTab } from './components/GameObjectAddonTab';
import { GameObjectQuestItemsTab } from './components/GameObjectQuestItemsTab';
import { GameObjectLootTab } from './components/GameObjectLootTab';
import { GameObjectSpawnsTab } from './components/GameObjectSpawnsTab';
import { GameObjectSpawnAddonTab } from './components/GameObjectSpawnAddonTab';
import { GameObjectSmartAiTab } from './components/GameObjectSmartAiTab';
import { GameObjectSearchRow } from './types';
import { escapeSqlString } from '../../lib/utils';
import { GAMEOBJECT_TYPE_OPTIONS } from '../../constants/gameObjectOptions';
import { createDefaultGameObjectTemplate } from './schema/gameObjectTemplateSchema';
import { isGameObjectModified } from './utils/gameObjectSqlGenerator';

interface GameObjectViewProps {
  selectedGameObject?: any;
  onSelectGameObject?: (go: any) => void;
  activeSubTab?: string;
  onNavigateSubItem?: (subItem: string) => void;
  onSetDirty?: (subItem: string, isDirty: boolean) => void;
}

export const GameObjectView: React.FC<GameObjectViewProps> = ({
  selectedGameObject: propSelectedGameObject,
  onSelectGameObject: propOnSelectGameObject,
  activeSubTab = 'select',
  onNavigateSubItem,
  onSetDirty,
}) => {
  // Search & Select Screen State
  const [searchEntry, setSearchEntry] = useState<string>('');
  const [searchName, setSearchName] = useState<string>('');
  const [searchType, setSearchType] = useState<string>('');
  const [searchScriptName, setSearchScriptName] = useState<string>('');
  const [searchLimit, setSearchLimit] = useState<number>(50);
  const [searchResults, setSearchResults] = useState<GameObjectSearchRow[] | null>(null);
  const [searching, setSearching] = useState(false);

  // Editor State. Defaults come from the table definition, so a new record
  // starts out identical to what the database would have inserted.
  const defaultGameObject = createDefaultGameObjectTemplate(0);

  const [go, setGo] = useState<any>(propSelectedGameObject || defaultGameObject);
  const [initialGo, setInitialGo] = useState<any>(
    propSelectedGameObject ? JSON.parse(JSON.stringify(propSelectedGameObject)) : null
  );
  const isDirty = isGameObjectModified(initialGo, go);

  // Sync prop changes
  useEffect(() => {
    if (propSelectedGameObject && propSelectedGameObject.entry !== go.entry) {
      setGo(propSelectedGameObject);
      setInitialGo(JSON.parse(JSON.stringify(propSelectedGameObject)));
    }
  }, [propSelectedGameObject]);

  useEffect(() => {
    onSetDirty?.('gameobjects:template', isDirty);
  }, [isDirty, onSetDirty]);

  const getSearchQuery = () => {
    let whereClauses: string[] = [];
    if (searchEntry.trim()) {
      whereClauses.push(`(\`entry\` LIKE '%${searchEntry.trim()}%')`);
    }
    if (searchName.trim()) {
      const safe = escapeSqlString(searchName.trim());
      whereClauses.push(`(\`name\` LIKE '%${safe}%')`);
    }
    if (searchType.trim()) {
      whereClauses.push(`(\`type\` = ${Number(searchType)})`);
    }
    if (searchScriptName.trim()) {
      const safe = escapeSqlString(searchScriptName.trim());
      whereClauses.push(`(\`ScriptName\` LIKE '%${safe}%')`);
    }
    const whereSql = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';
    const limit = searchLimit || 50;
    const limitSql = ` LIMIT ${limit}`;
    return {
      whereSql,
      fullSql: `SELECT \`entry\`, \`name\`, \`type\`, \`displayId\`, \`AIName\`, \`ScriptName\` FROM \`gameobject_template\`${whereSql}${limitSql}`,
      limit,
    };
  };

  const handleSearch = async () => {
    setSearching(true);
    try {
      const { fullSql } = getSearchQuery();
      const res = await api.executeSql('world', fullSql);
      if (res && res.success && res.rows) {
        const mapped: GameObjectSearchRow[] = res.rows.map((r: any[]) => {
          const typeNum = Number(r[2]) || 0;
          return {
            entry: Number(r[0]) || 0,
            name: String(r[1] || 'Unnamed GameObject'),
            type: typeNum,
            typeName:
              GAMEOBJECT_TYPE_OPTIONS.find((o) => o.value === typeNum)?.name || `TYPE_${typeNum}`,
            displayId: Number(r[3]) || 0,
            AIName: r[4] ? String(r[4]) : '',
            ScriptName: r[5] ? String(r[5]) : '',
          };
        });
        setSearchResults(mapped);
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  /** Re-reads the edited row so the editor reflects what is actually stored. */
  const fetchGameObjectRow = async (entry: number): Promise<any | null> => {
    try {
      const res = await api.executeSql(
        'world',
        `SELECT * FROM \`gameobject_template\` WHERE \`entry\` = ${entry} LIMIT 1;`
      );
      if (res.success && res.rows && res.rows.length > 0) {
        const row = res.rows[0];
        const obj: any = {};
        res.columns.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        return obj;
      }
    } catch {
      // Reported by the editor through the query bar.
    }
    return null;
  };

  const loadGameObject = async (entry: number) => {
    const obj = await fetchGameObjectRow(entry);
    if (obj) {
      setGo(obj);
      setInitialGo(JSON.parse(JSON.stringify(obj)));
      if (propOnSelectGameObject) {
        propOnSelectGameObject(obj);
      }
      if (onNavigateSubItem) {
        onNavigateSubItem('template');
      }
    }
  };

  const handleCreateNewGameObject = (newEntry: number) => {
    // Start from the table defaults so an untouched new object inserts exactly
    // what the schema would have produced.
    const newGO = {
      ...createDefaultGameObjectTemplate(newEntry),
      name: `New GameObject (${newEntry})`,
      _isNew: true,
    };
    setGo(newGO);
    setInitialGo({ ...newGO, _isNew: true });
    if (propOnSelectGameObject) {
      propOnSelectGameObject(newGO);
    }
    if (onNavigateSubItem) {
      onNavigateSubItem('template');
    }
  };

  const handleNavigateBack = () => {
    if (propOnSelectGameObject) propOnSelectGameObject(null);
    if (onNavigateSubItem) onNavigateSubItem('select');
  };

  const cleanSubTab = activeSubTab.replace('gameobjects:', '');

  // Select Gameobject Screen
  if (cleanSubTab === 'select' || !propSelectedGameObject) {
    return (
      <GameObjectSelectScreen
        searchEntry={searchEntry}
        setSearchEntry={setSearchEntry}
        searchName={searchName}
        setSearchName={setSearchName}
        searchType={searchType}
        setSearchType={setSearchType}
        searchScriptName={searchScriptName}
        setSearchScriptName={setSearchScriptName}
        searchLimit={searchLimit}
        setSearchLimit={setSearchLimit}
        searchResults={searchResults}
        searching={searching}
        onSearch={handleSearch}
        onSelectExistingGameObject={loadGameObject}
        onCreateNewGameObject={handleCreateNewGameObject}
        getSearchQueryInfo={() => {
          const q = getSearchQuery();
          return { sql: q.fullSql, whereSql: q.whereSql, limit: q.limit };
        }}
      />
    );
  }

  // Wrapper for sub-tabs with standard Top Sub-Header
  const renderWithSubHeader = (title: string, component: React.ReactNode) => (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-hidden select-none font-sans text-slate-800">
      {/* Top Sub-Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-xs flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleNavigateBack}
            className="text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded flex items-center gap-1.5 font-medium font-sans transition-colors cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Select Game Object</span>
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-sans">
            <span className="text-slate-500 font-sans text-xs">Editing:</span>
            <span className="font-bold text-slate-900 text-xs font-sans">
              {go.name || 'Unnamed GameObject'}
            </span>
            <span className="text-slate-500 font-mono text-xs">({go.entry})</span>
            <span className="text-slate-400 font-sans text-xs">/ {title}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {component}
      </div>
    </div>
  );

  // Sub-views routed directly from the sidebar
  if (cleanSubTab === 'addon') {
    return renderWithSubHeader('Template Addon', <GameObjectAddonTab goEntry={go.entry} />);
  }

  if (cleanSubTab === 'quest_items') {
    return renderWithSubHeader('Quest Items', <GameObjectQuestItemsTab goEntry={go.entry} />);
  }

  if (cleanSubTab === 'loot') {
    return renderWithSubHeader('GameObject Loot', <GameObjectLootTab go={go} />);
  }

  if (cleanSubTab === 'spawns') {
    return renderWithSubHeader('World Spawns', <GameObjectSpawnsTab goEntry={go.entry} />);
  }

  if (cleanSubTab === 'spawn_addon') {
    return renderWithSubHeader('Spawn Addon', <GameObjectSpawnAddonTab goEntry={go.entry} />);
  }

  if (cleanSubTab === 'smartai') {
    return renderWithSubHeader('SmartAI Scripts', <GameObjectSmartAiTab goEntry={go.entry} />);
  }

  // Default view: the gameobject template detail editor
  return (
    <GameObjectDetailEditor
      go={go}
      setGo={setGo}
      initialGo={initialGo}
      setInitialGo={setInitialGo}
      onNavigateBack={handleNavigateBack}
      reloadGameObject={() => fetchGameObjectRow(Number(go.entry))}
    />
  );
};

export default GameObjectView;
