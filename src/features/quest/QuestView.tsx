// Quest module coordinator.
//
// Routes between the select screen, the quest template editor and the sub-tabs,
// and owns the loaded row plus its unedited snapshot.

import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../lib/ipc';
import { QuestSelectScreen } from './components/QuestSelectScreen';
import { QuestDetailEditor } from './components/QuestDetailEditor';
import { QuestAddonTab } from './components/QuestAddonTab';
import { QuestObjectivesTab } from './components/QuestObjectivesTab';
import { QuestRewardsTab } from './components/QuestRewardsTab';
import { QuestOfferRewardTab } from './components/QuestOfferRewardTab';
import { QuestRequestItemsTab } from './components/QuestRequestItemsTab';
import { QuestGreetingsTab } from './components/QuestGreetingsTab';
import { QuestRelationsTab } from './components/QuestRelationsTab';
import { QuestPoiTab } from './components/QuestPoiTab';
import { QuestSearchRow } from './types';
import { escapeSqlString } from '../../lib/utils';
import { createDefaultQuestTemplate } from './schema/questTemplateSchema';
import { isQuestModified } from './utils/questSqlGenerator';

type QuestRecord = Record<string, unknown> & { _isNew?: boolean };

interface QuestViewProps {
  selectedQuest?: any;
  onSelectQuest?: (quest: any) => void;
  activeSubTab?: string;
  onNavigateSubItem?: (subItem: string) => void;
  onSetDirty?: (subItem: string, isDirty: boolean) => void;
}

export const QuestView: React.FC<QuestViewProps> = ({
  selectedQuest: propSelectedQuest,
  onSelectQuest: propOnSelectQuest,
  activeSubTab = 'select',
  onNavigateSubItem,
  onSetDirty,
}) => {
  // Search & Select Screen State
  const [searchId, setSearchId] = useState<string>('');
  const [searchTitle, setSearchTitle] = useState<string>('');
  const [searchLimit, setSearchLimit] = useState<number>(50);
  const [searchResults, setSearchResults] = useState<QuestSearchRow[] | null>(null);
  const [searching, setSearching] = useState(false);

  // Editor State. Defaults come from the table definition, so a new record
  // starts out identical to what the database would have inserted.
  const defaultQuest = createDefaultQuestTemplate(0);

  const [quest, setQuest] = useState<QuestRecord>(propSelectedQuest || defaultQuest);
  const [initialQuest, setInitialQuest] = useState<QuestRecord | null>(
    propSelectedQuest ? JSON.parse(JSON.stringify(propSelectedQuest)) : null
  );
  const isDirty = isQuestModified(initialQuest, quest);

  // Sync prop changes
  useEffect(() => {
    if (propSelectedQuest && propSelectedQuest.ID !== quest.ID) {
      setQuest(propSelectedQuest);
      setInitialQuest(JSON.parse(JSON.stringify(propSelectedQuest)));
    }
  }, [propSelectedQuest]);

  useEffect(() => {
    onSetDirty?.('quests:template', isDirty);
  }, [isDirty, onSetDirty]);

  /** Re-reads the edited row so the editor reflects what is actually stored. */
  const fetchQuestRow = async (id: number): Promise<QuestRecord | null> => {
    try {
      const res = await api.executeSql(
        'world',
        `SELECT * FROM \`quest_template\` WHERE \`ID\` = ${id} LIMIT 1;`
      );
      if (res.success && res.rows && res.rows.length > 0) {
        const row = res.rows[0];
        const obj: QuestRecord = {};
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

  const getSearchQuery = () => {
    let whereClauses: string[] = [];
    if (searchId.trim()) {
      whereClauses.push(`(\`ID\` LIKE '%${searchId.trim()}%')`);
    }
    if (searchTitle.trim()) {
      const safe = escapeSqlString(searchTitle.trim());
      whereClauses.push(`(\`LogTitle\` LIKE '%${safe}%')`);
    }
    const whereSql = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';
    const limit = searchLimit || 50;
    const limitSql = ` LIMIT ${limit}`;
    return {
      whereSql,
      fullSql: `SELECT \`ID\`, \`LogTitle\`, \`QuestType\`, \`QuestLevel\`, \`MinLevel\`, \`QuestDescription\` FROM \`quest_template\`${whereSql}${limitSql}`,
      limit,
    };
  };

  const handleSearch = async () => {
    setSearching(true);
    try {
      const { fullSql } = getSearchQuery();
      const res = await api.executeSql('world', fullSql);
      if (res && res.success && res.rows) {
        const mapped: QuestSearchRow[] = res.rows.map((r: any[]) => ({
          ID: Number(r[0]) || 0,
          LogTitle: String(r[1] || 'Unknown Quest'),
          QuestType: Number(r[2]) || 0,
          QuestLevel: Number(r[3]) || 0,
          MinLevel: Number(r[4]) || 0,
          Description: r[5] ? String(r[5]) : '',
        }));
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

  const loadQuest = async (id: number) => {
    const obj = await fetchQuestRow(id);
    if (obj) {
      setQuest(obj);
      setInitialQuest(JSON.parse(JSON.stringify(obj)));
      if (propOnSelectQuest) {
        propOnSelectQuest(obj);
      }
      if (onNavigateSubItem) {
        onNavigateSubItem('template');
      }
    }
  };

  const handleCreateNewQuest = (newId: number) => {
    // Start from the table defaults so an untouched new quest inserts exactly
    // what the schema would have produced.
    const newQ: QuestRecord = {
      ...createDefaultQuestTemplate(newId),
      LogTitle: `New Quest (${newId})`,
      _isNew: true,
    };
    setQuest(newQ);
    setInitialQuest({ ...newQ, _isNew: true });
    if (propOnSelectQuest) {
      propOnSelectQuest(newQ);
    }
    if (onNavigateSubItem) {
      onNavigateSubItem('template');
    }
  };

  const handleNavigateBack = () => {
    if (propOnSelectQuest) propOnSelectQuest(null);
    if (onNavigateSubItem) onNavigateSubItem('select');
  };

  const questId = Number(quest.ID);
  const cleanSubTab = activeSubTab.replace('quests:', '');

  // Select Quest Screen
  if (cleanSubTab === 'select' || !propSelectedQuest) {
    return (
      <QuestSelectScreen
        searchId={searchId}
        setSearchId={setSearchId}
        searchTitle={searchTitle}
        setSearchTitle={setSearchTitle}
        searchLimit={searchLimit}
        setSearchLimit={setSearchLimit}
        searchResults={searchResults}
        searching={searching}
        onSearch={handleSearch}
        onSelectExistingQuest={loadQuest}
        onCreateNewQuest={handleCreateNewQuest}
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
            <span>Select Quest</span>
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-sans">
            <span className="text-slate-500 font-sans text-xs">Editing:</span>
            <span className="font-bold text-slate-900 text-xs font-sans">
              {String(quest.LogTitle || 'Untitled Quest')}
            </span>
            <span className="text-slate-500 font-mono text-xs">({String(quest.ID)})</span>
            <span className="text-slate-400 font-sans text-xs">/ {title}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">{component}</div>
    </div>
  );

  if (cleanSubTab === 'rewards') {
    return renderWithSubHeader(
      'Rewards & Currency',
      <QuestRewardsTab
        quest={quest}
        setQuest={setQuest}
        initialQuest={initialQuest}
        setInitialQuest={setInitialQuest}
        reloadQuest={() => fetchQuestRow(questId)}
      />
    );
  }

  if (cleanSubTab === 'addon') {
    return renderWithSubHeader('Quest Template Addon', <QuestAddonTab questId={questId} />);
  }

  if (cleanSubTab === 'objectives') {
    return renderWithSubHeader('Quest Objectives', <QuestObjectivesTab questId={questId} />);
  }

  if (cleanSubTab === 'offer_reward') {
    return renderWithSubHeader('Quest Offer Reward', <QuestOfferRewardTab questId={questId} />);
  }

  if (cleanSubTab === 'request_items') {
    return renderWithSubHeader('Quest Request Items', <QuestRequestItemsTab questId={questId} />);
  }

  if (cleanSubTab === 'greetings') {
    return renderWithSubHeader('Greetings & Details', <QuestGreetingsTab questId={questId} />);
  }

  if (cleanSubTab === 'relations') {
    return renderWithSubHeader('Quest Relations', <QuestRelationsTab questId={questId} />);
  }

  if (cleanSubTab === 'poi') {
    return renderWithSubHeader('Quest POI & Points', <QuestPoiTab questId={questId} />);
  }

  // Default view: the quest template detail editor
  return (
    <QuestDetailEditor
      quest={quest}
      setQuest={setQuest}
      initialQuest={initialQuest}
      setInitialQuest={setInitialQuest}
      onNavigateBack={handleNavigateBack}
      reloadQuest={() => fetchQuestRow(questId)}
    />
  );
};

export default QuestView;
