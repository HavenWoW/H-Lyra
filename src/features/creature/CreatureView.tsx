// Creature module coordinator.
//
// Routes between the select screen, the template editor and the sub-tabs, and
// owns the loaded row plus its unedited snapshot.

import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../lib/ipc';
import { CreatureSelectScreen } from './components/CreatureSelectScreen';
import { CreatureDetailEditor } from './components/CreatureDetailEditor';
import { CreatureAddonTab } from './components/CreatureAddonTab';
import { CreatureModelsTab } from './components/CreatureModelsTab';
import { CreatureSpellsTab } from './components/CreatureSpellsTab';
import { CreatureScalingTab } from './components/CreatureScalingTab';
import { CreatureEquipTab } from './components/CreatureEquipTab';
import { CreatureVendorTab } from './components/CreatureVendorTab';
import { CreatureTrainerTab } from './components/CreatureTrainerTab';
import { CreatureOnKillTab } from './components/CreatureOnKillTab';
import { CreatureQuestsTab } from './components/CreatureQuestsTab';
import { CreatureLootTab } from './components/CreatureLootTab';
import { CreatureSpawnsTab } from './components/CreatureSpawnsTab';
import { CreatureSpawnAddonTab } from './components/CreatureSpawnAddonTab';
import { CreatureSmartAiTab } from './components/CreatureSmartAiTab';
import { CreatureTextsTab } from './components/CreatureTextsTab';
import { CreatureFormationsTab } from './components/CreatureFormationsTab';
import { CreatureSearchRow } from './types';
import { escapeSqlString } from '../../lib/utils';
import { createDefaultCreatureTemplate } from './creatureTemplateSchema';
import { isCreatureModified } from './utils/creatureSqlGenerator';

interface CreatureViewProps {
  selectedCreature?: any;
  onSelectCreature?: (creature: any) => void;
  activeSubTab?: string;
  onNavigateSubItem?: (subItem: string) => void;
  onSetDirty?: (subItem: string, isDirty: boolean) => void;
}

export const CreatureView: React.FC<CreatureViewProps> = ({
  selectedCreature: propSelectedCreature,
  onSelectCreature: propOnSelectCreature,
  activeSubTab = 'select',
  onNavigateSubItem,
  onSetDirty,
}) => {
  // Search & Select Screen State
  const [searchEntry, setSearchEntry] = useState<string>('');
  const [searchName, setSearchName] = useState<string>('');
  const [searchSubname, setSearchSubname] = useState<string>('');
  const [searchLimit, setSearchLimit] = useState<number>(50);
  const [searchResults, setSearchResults] = useState<CreatureSearchRow[] | null>(null);
  const [searching, setSearching] = useState(false);

  // Editor State. Defaults come from the table definition, so a new record
  // starts out identical to what the database would have inserted.
  const defaultCreature = createDefaultCreatureTemplate(0);

  const [creature, setCreature] = useState<any>(propSelectedCreature || defaultCreature);
  const [initialCreature, setInitialCreature] = useState<any>(
    propSelectedCreature ? JSON.parse(JSON.stringify(propSelectedCreature)) : null
  );
  const isDirty = isCreatureModified(initialCreature, creature);

  // Sub-items data states
  const [models, setModels] = useState<any[]>([]);
  const [spawns, setSpawns] = useState<any[]>([]);
  const [texts, setTexts] = useState<any[]>([]);

  // Sync prop changes
  useEffect(() => {
    if (propSelectedCreature && propSelectedCreature.entry !== creature.entry) {
      setCreature(propSelectedCreature);
      setInitialCreature(JSON.parse(JSON.stringify(propSelectedCreature)));
    }
  }, [propSelectedCreature]);

  useEffect(() => {
    onSetDirty?.('creatures:template', isDirty);
  }, [isDirty, onSetDirty]);

  const handleFieldChange = (field: string, value: any) => {
    setCreature((prev: any) => ({ ...prev, [field]: value }));
  };

  /** Re-reads the edited row so the editor reflects what is actually stored. */
  const fetchCreatureRow = async (entry: number): Promise<any | null> => {
    try {
      const res = await api.executeSql(
        'world',
        `SELECT * FROM \`creature_template\` WHERE \`entry\` = ${entry} LIMIT 1;`
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

  const getSearchQuery = () => {
    let whereClauses: string[] = [];
    if (searchEntry.trim()) {
      whereClauses.push(`(\`entry\` LIKE '%${searchEntry.trim()}%')`);
    }
    if (searchName.trim()) {
      const safe = escapeSqlString(searchName.trim());
      whereClauses.push(`(\`name\` LIKE '%${safe}%')`);
    }
    if (searchSubname.trim()) {
      const safe = escapeSqlString(searchSubname.trim());
      whereClauses.push(`(\`subname\` LIKE '%${safe}%')`);
    }
    const whereSql = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';
    const limit = searchLimit || 50;
    const limitSql = ` LIMIT ${limit}`;
    return {
      whereSql,
      fullSql: `SELECT \`entry\`, \`name\`, \`subname\`, \`minlevel\`, \`maxlevel\`, \`AIName\`, \`ScriptName\` FROM \`creature_template\`${whereSql}${limitSql}`,
      limit,
    };
  };

  const handleSearch = async () => {
    setSearching(true);
    try {
      const { fullSql } = getSearchQuery();
      const res = await api.executeSql('world', fullSql);
      if (res && res.success && res.rows) {
        const mapped: CreatureSearchRow[] = res.rows.map((r: any[]) => ({
          entry: Number(r[0]) || 0,
          name: String(r[1] || 'Unnamed Creature'),
          subname: r[2] ? String(r[2]) : '',
          minlevel: Number(r[3]) || 0,
          maxlevel: Number(r[4]) || 0,
          AIName: r[5] ? String(r[5]) : '',
          ScriptName: r[6] ? String(r[6]) : '',
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

  const loadCreature = async (entry: number) => {
    try {
      const obj = await fetchCreatureRow(entry);
      if (obj) {
        setCreature(obj);
        setInitialCreature(JSON.parse(JSON.stringify(obj)));
        if (propOnSelectCreature) {
          propOnSelectCreature(obj);
        }
        if (onNavigateSubItem) {
          onNavigateSubItem('template');
        }

        // Load models
        const mRes = await api.executeSql('world', `SELECT Idx, CreatureDisplayID, DisplayScale, Probability FROM \`creature_template_model\` WHERE \`CreatureID\` = ${entry} ORDER BY Idx ASC;`);
        if (mRes.success && mRes.rows) {
          setModels(mRes.rows.map(r => ({ Idx: r[0], CreatureDisplayID: r[1], DisplayScale: r[2], Probability: r[3] })));
        }

        // Load spawns
        const sRes = await api.executeSql('world', `SELECT guid, map, position_x, position_y, position_z, orientation, spawntimesecs FROM \`creature\` WHERE id = ${entry} LIMIT 20;`);
        if (sRes.success && sRes.rows) {
          setSpawns(sRes.rows.map(r => ({ guid: r[0], map: r[1], position_x: r[2], position_y: r[3], position_z: r[4], orientation: r[5], spawntimesecs: r[6] })));
        }
      }
    } catch {
      // Handled
    }
  };

  const handleCreateNewCreature = (newId: number) => {
    // Start from the table defaults so an untouched new creature inserts
    // exactly what the schema would have produced.
    const newC = {
      ...createDefaultCreatureTemplate(newId),
      name: `New Creature (${newId})`,
      faction: 35,
      AIName: 'SmartAI',
      _isNew: true,
    };
    setCreature(newC);
    setInitialCreature({ ...newC, _isNew: true });
    if (propOnSelectCreature) {
      propOnSelectCreature(newC);
    }
    if (onNavigateSubItem) {
      onNavigateSubItem('template');
    }
  };

  const handleNavigateBack = () => {
    if (propOnSelectCreature) propOnSelectCreature(null);
    if (onNavigateSubItem) onNavigateSubItem('select');
  };

  const cleanSubTab = activeSubTab.replace('creatures:', '');

  // Select Creature Screen
  if (cleanSubTab === 'select' || !propSelectedCreature) {
    return (
      <CreatureSelectScreen
        searchEntry={searchEntry}
        setSearchEntry={setSearchEntry}
        searchName={searchName}
        setSearchName={setSearchName}
        searchSubname={searchSubname}
        setSearchSubname={setSearchSubname}
        searchLimit={searchLimit}
        setSearchLimit={setSearchLimit}
        searchResults={searchResults}
        searching={searching}
        onSearch={handleSearch}
        onSelectExistingCreature={loadCreature}
        onCreateNewCreature={handleCreateNewCreature}
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
            <span>Select Creature</span>
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-sans">
            <span className="text-slate-500 font-sans text-xs">Editing:</span>
            <span className="font-bold text-slate-900 text-xs font-sans">
              {creature.name || 'Unnamed Creature'}
            </span>
            <span className="text-slate-500 font-mono text-xs">({creature.entry})</span>
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
    return renderWithSubHeader('Template Addon', <CreatureAddonTab creatureEntry={creature.entry} />);
  }

  if (cleanSubTab === 'scaling') {
    return renderWithSubHeader(
      'Scaling & Difficulty',
      <CreatureScalingTab
        creatureEntry={creature.entry}
        creature={creature}
        onFieldChange={handleFieldChange}
      />
    );
  }

  if (cleanSubTab === 'models') {
    return renderWithSubHeader('Display Models', <CreatureModelsTab creatureEntry={creature.entry} />);
  }

  if (cleanSubTab === 'spells') {
    return renderWithSubHeader(
      'Spells (1-8)',
      <CreatureSpellsTab
        creature={creature}
        setCreature={setCreature}
        initialCreature={initialCreature}
        setInitialCreature={setInitialCreature}
        isDirty={isDirty}
        handleFieldChange={handleFieldChange}
      />
    );
  }

  if (cleanSubTab === 'equip') {
    return renderWithSubHeader('Equip Template', <CreatureEquipTab creatureEntry={creature.entry} />);
  }

  if (cleanSubTab === 'vendor') {
    return renderWithSubHeader('Vendor Inventory', <CreatureVendorTab creatureEntry={creature.entry} />);
  }

  if (cleanSubTab === 'trainer') {
    return renderWithSubHeader('Trainer Spells', <CreatureTrainerTab creatureEntry={creature.entry} />);
  }

  if (cleanSubTab === 'onkill') {
    return renderWithSubHeader('OnKill Rewards', <CreatureOnKillTab creatureEntry={creature.entry} />);
  }

  if (cleanSubTab === 'quests') {
    return renderWithSubHeader('Quest Relations', <CreatureQuestsTab creatureEntry={creature.entry} />);
  }

  if (cleanSubTab === 'loot') {
    return renderWithSubHeader('Creature Loot', <CreatureLootTab creature={creature} handleFieldChange={handleFieldChange} mode="creature" />);
  }

  if (cleanSubTab === 'pickpocket') {
    return renderWithSubHeader('Pickpocket Loot', <CreatureLootTab creature={creature} handleFieldChange={handleFieldChange} mode="pickpocket" />);
  }

  if (cleanSubTab === 'skinning') {
    return renderWithSubHeader('Skinning Loot', <CreatureLootTab creature={creature} handleFieldChange={handleFieldChange} mode="skinning" />);
  }

  if (cleanSubTab === 'spawns') {
    return renderWithSubHeader('World Spawns', <CreatureSpawnsTab creatureEntry={creature.entry} />);
  }

  if (cleanSubTab === 'spawn_addon') {
    return renderWithSubHeader('Spawn Addon', <CreatureSpawnAddonTab creatureEntry={creature.entry} />);
  }

  if (cleanSubTab === 'smartai') {
    return renderWithSubHeader('SmartAI Scripts', <CreatureSmartAiTab creatureEntry={creature.entry} />);
  }

  if (cleanSubTab === 'texts') {
    return renderWithSubHeader('Creature Texts', <CreatureTextsTab creatureEntry={creature.entry} />);
  }

  if (cleanSubTab === 'formations') {
    return renderWithSubHeader('Formations', <CreatureFormationsTab creatureEntry={creature.entry} />);
  }

  // Default view: the creature template detail editor
  return (
    <CreatureDetailEditor
      creature={creature}
      setCreature={setCreature}
      initialCreature={initialCreature}
      setInitialCreature={setInitialCreature}
      onNavigateBack={handleNavigateBack}
      reloadCreature={() => fetchCreatureRow(Number(creature.entry))}
    />
  );
};

export default CreatureView;
