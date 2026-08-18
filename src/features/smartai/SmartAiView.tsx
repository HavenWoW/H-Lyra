// SmartAI module coordinator.
//
// Routes between script selection and the line editor for smart_scripts.

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/ipc';
import { SmartAiSelectScreen } from './components/SmartAiSelectScreen';
import { SmartAiDetailEditor } from './components/SmartAiDetailEditor';
import { SmartScriptRow, SmartAiSearchRow } from './types';
import { SMART_SOURCE_TYPES } from './constants/smartAiOptions';
import { escapeSqlString } from '../../lib/utils';

interface SmartAiViewProps {
  selectedScript?: { entryorguid: number; sourceType: number };
  onSelectScript?: (script: { entryorguid: number; sourceType: number } | null) => void;
  activeSubTab?: string;
  onNavigateSubItem?: (subItem: string) => void;
  onSetDirty?: (subItem: string, isDirty: boolean) => void;
}

export const SmartAiView: React.FC<SmartAiViewProps> = ({
  selectedScript: propSelectedScript,
  onSelectScript: propOnSelectScript,
  activeSubTab = 'select',
  onNavigateSubItem,
  onSetDirty,
}) => {
  // Search state
  const [searchSourceType, setSearchSourceType] = useState<string>('');
  const [searchEntry, setSearchEntry] = useState<string>('');
  const [searchComment, setSearchComment] = useState<string>('');
  const [searchLimit, setSearchLimit] = useState<number>(50);
  const [searchResults, setSearchResults] = useState<SmartAiSearchRow[] | null>(null);
  const [searching, setSearching] = useState(false);

  // Editor state
  const [currentEntry, setCurrentEntry] = useState<number>(propSelectedScript?.entryorguid || 30);
  const [currentSourceType, setCurrentSourceType] = useState<number>(propSelectedScript?.sourceType ?? 0);
  const [scripts, setScripts] = useState<SmartScriptRow[]>([]);
  const [initialScripts, setInitialScripts] = useState<SmartScriptRow[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (propSelectedScript) {
      setCurrentEntry(propSelectedScript.entryorguid);
      setCurrentSourceType(propSelectedScript.sourceType);
      loadScriptGroup(propSelectedScript.entryorguid, propSelectedScript.sourceType);
    }
  }, [propSelectedScript]);

  useEffect(() => {
    onSetDirty?.('smartai:editor', isDirty);
  }, [isDirty, onSetDirty]);

  const getSearchQuery = () => {
    let whereClauses: string[] = [];
    if (searchSourceType !== '') {
      whereClauses.push(`\`source_type\` = ${Number(searchSourceType)}`);
    }
    if (searchEntry.trim()) {
      whereClauses.push(`\`entryorguid\` LIKE '%${searchEntry.trim()}%'`);
    }
    if (searchComment.trim()) {
      const safe = escapeSqlString(searchComment.trim());
      whereClauses.push(`\`comment\` LIKE '%${safe}%'`);
    }
    const whereSql = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';
    const limit = searchLimit || 50;
    const fullSql = `SELECT \`entryorguid\`, \`source_type\`, COUNT(*) as line_count, MIN(\`comment\`) as comment FROM \`smart_scripts\`${whereSql} GROUP BY \`entryorguid\`, \`source_type\` ORDER BY \`entryorguid\` ASC LIMIT ${limit};`;

    return { whereSql, sql: fullSql, limit };
  };

  const handleSearch = async () => {
    setSearching(true);
    try {
      const { sql } = getSearchQuery();
      const res = await api.executeSql('world', sql);
      if (res && res.success && res.rows) {
        const mapped: SmartAiSearchRow[] = res.rows.map((r: any[]) => {
          const st = Number(r[1]) || 0;
          return {
            entryorguid: Number(r[0]) || 0,
            source_type: st,
            sourceTypeName: SMART_SOURCE_TYPES[st] || `TYPE_${st}`,
            line_count: Number(r[2]) || 0,
            comment: r[3] ? String(r[3]) : '',
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

  const loadScriptGroup = async (entry: number, sourceType: number) => {
    try {
      const res = await api.executeSql(
        'world',
        `SELECT entryorguid, source_type, id, link, event_type, event_phase_mask, event_chance, event_flags, event_param1, event_param2, event_param3, event_param4, event_param5, event_param_string, action_type, action_param1, action_param2, action_param3, action_param4, action_param5, action_param6, target_type, target_param1, target_param2, target_param3, target_x, target_y, target_z, target_o, comment FROM \`smart_scripts\` WHERE \`entryorguid\` = ${entry} AND \`source_type\` = ${sourceType} ORDER BY \`id\` ASC, \`link\` ASC;`
      );

      if (res && res.success && res.rows) {
        const loaded: SmartScriptRow[] = res.rows.map((r: any[]) => ({
          entryorguid: Number(r[0]),
          source_type: Number(r[1]) || 0,
          id: Number(r[2]) || 0,
          link: Number(r[3]) || 0,
          event_type: Number(r[4]) || 0,
          event_phase_mask: Number(r[5]) || 0,
          event_chance: Number(r[6]) || 100,
          event_flags: Number(r[7]) || 0,
          event_param1: Number(r[8]) || 0,
          event_param2: Number(r[9]) || 0,
          event_param3: Number(r[10]) || 0,
          event_param4: Number(r[11]) || 0,
          event_param5: Number(r[12]) || 0,
          event_param_string: r[13] ? String(r[13]) : '',
          action_type: Number(r[14]) || 0,
          action_param1: Number(r[15]) || 0,
          action_param2: Number(r[16]) || 0,
          action_param3: Number(r[17]) || 0,
          action_param4: Number(r[18]) || 0,
          action_param5: Number(r[19]) || 0,
          action_param6: Number(r[20]) || 0,
          target_type: Number(r[21]) || 0,
          target_param1: Number(r[22]) || 0,
          target_param2: Number(r[23]) || 0,
          target_param3: Number(r[24]) || 0,
          target_x: Number(r[25]) || 0,
          target_y: Number(r[26]) || 0,
          target_z: Number(r[27]) || 0,
          target_o: Number(r[28]) || 0,
          comment: r[29] ? String(r[29]) : '',
        }));

        setCurrentEntry(entry);
        setCurrentSourceType(sourceType);
        setScripts(loaded);
        setInitialScripts(JSON.parse(JSON.stringify(loaded)));
        setIsDirty(false);

        if (propOnSelectScript) {
          propOnSelectScript({ entryorguid: entry, sourceType });
        }
        if (onNavigateSubItem) {
          onNavigateSubItem('editor');
        }
      }
    } catch {
      // Handled
    }
  };

  const handleCreateNewScript = (entry: number, sourceType: number) => {
    setCurrentEntry(entry);
    setCurrentSourceType(sourceType);
    const initialLine: SmartScriptRow = {
      entryorguid: entry,
      source_type: sourceType,
      id: 0,
      link: 0,
      event_type: 0,
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
      target_type: 1,
      target_param1: 0,
      target_param2: 0,
      target_param3: 0,
      target_x: 0,
      target_y: 0,
      target_z: 0,
      target_o: 0,
      comment: `Script for ${SMART_SOURCE_TYPES[sourceType]} ${entry}`,
    };
    setScripts([initialLine]);
    setInitialScripts([]);
    setIsDirty(true);

    if (propOnSelectScript) {
      propOnSelectScript({ entryorguid: entry, sourceType });
    }
    if (onNavigateSubItem) {
      onNavigateSubItem('editor');
    }
  };

  const handleNavigateBack = () => {
    if (propOnSelectScript) propOnSelectScript(null);
    if (onNavigateSubItem) onNavigateSubItem('select');
  };

  const cleanSubTab = activeSubTab.replace('smartai:', '');

  // Select Screen
  if (cleanSubTab === 'select' || !propSelectedScript) {
    return (
      <SmartAiSelectScreen
        searchSourceType={searchSourceType}
        setSearchSourceType={setSearchSourceType}
        searchEntry={searchEntry}
        setSearchEntry={setSearchEntry}
        searchComment={searchComment}
        setSearchComment={setSearchComment}
        searchLimit={searchLimit}
        setSearchLimit={setSearchLimit}
        searchResults={searchResults}
        searching={searching}
        onSearch={handleSearch}
        onSelectExistingScript={loadScriptGroup}
        onCreateNewScript={handleCreateNewScript}
        getSearchQueryInfo={getSearchQuery}
      />
    );
  }

  // Editor
  return (
    <SmartAiDetailEditor
      entryorguid={currentEntry}
      sourceType={currentSourceType}
      scripts={scripts}
      setScripts={setScripts}
      initialScripts={initialScripts}
      setInitialScripts={setInitialScripts}
      isDirty={isDirty}
      setIsDirty={setIsDirty}
      onNavigateBack={handleNavigateBack}
    />
  );
};

export default SmartAiView;
