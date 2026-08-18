// Editor for creature_queststarter, creature_questender and creature_questitem:
// which quests a creature starts, ends and drops items for.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Copy, Check } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { CreatureQuestItem, CreatureQuestRelation } from '../types';
import { SelectorButton } from './CreatureTooltip';
import { EntitySelectorModal, SelectorType } from '../../../components/EntitySelectorModal';

import { SqlQueryBar } from '../../../components/SqlQueryBar';

interface CreatureQuestsTabProps {
  creatureEntry: number;
}

export const CreatureQuestsTab: React.FC<CreatureQuestsTabProps> = ({ creatureEntry }) => {
  const [starters, setStarters] = useState<CreatureQuestRelation[]>([]);
  const [initialStarters, setInitialStarters] = useState<CreatureQuestRelation[]>([]);
  const [enders, setEnders] = useState<CreatureQuestRelation[]>([]);
  const [initialEnders, setInitialEnders] = useState<CreatureQuestRelation[]>([]);
  const [questItems, setQuestItems] = useState<CreatureQuestItem[]>([]);
  const [initialQuestItems, setInitialQuestItems] = useState<CreatureQuestItem[]>([]);
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Entity selector modal state
  const [entityModal, setEntityModal] = useState<{
    open: boolean;
    type: SelectorType;
    title: string;
    section: 'starter' | 'ender' | 'item';
    index: number;
  } | null>(null);

  useEffect(() => {
    loadQuestData();
  }, [creatureEntry]);

  const loadQuestData = async () => {
    setLoading(true);
    try {
      const [startRes, endRes, itemRes] = await Promise.all([
        api.executeSql('world', `SELECT id, quest FROM \`creature_queststarter\` WHERE \`id\` = ${creatureEntry};`),
        api.executeSql('world', `SELECT id, quest FROM \`creature_questender\` WHERE \`id\` = ${creatureEntry};`),
        api.executeSql('world', `SELECT CreatureEntry, idx, ItemId, VerifiedBuild FROM \`creature_questitem\` WHERE \`CreatureEntry\` = ${creatureEntry} ORDER BY \`idx\` ASC;`),
      ]);

      if (startRes && startRes.success && startRes.rows) {
        const list = startRes.rows.map((r: any[]) => ({ id: Number(r[0]), quest: Number(r[1]), type: 'starter' as const }));
        setStarters(list);
        setInitialStarters(JSON.parse(JSON.stringify(list)));
      } else {
        setStarters([]);
        setInitialStarters([]);
      }

      if (endRes && endRes.success && endRes.rows) {
        const list = endRes.rows.map((r: any[]) => ({ id: Number(r[0]), quest: Number(r[1]), type: 'ender' as const }));
        setEnders(list);
        setInitialEnders(JSON.parse(JSON.stringify(list)));
      } else {
        setEnders([]);
        setInitialEnders([]);
      }

      if (itemRes && itemRes.success && itemRes.rows) {
        const list = itemRes.rows.map((r: any[]) => ({
          CreatureEntry: Number(r[0]),
          idx: Number(r[1]) || 0,
          ItemId: Number(r[2]) || 0,
          VerifiedBuild: Number(r[3]) || 35662,
        }));
        setQuestItems(list);
        setInitialQuestItems(JSON.parse(JSON.stringify(list)));
      } else {
        setQuestItems([]);
        setInitialQuestItems([]);
      }

      setIsDirty(false);
    } catch {
      setStarters([]);
      setInitialStarters([]);
      setEnders([]);
      setInitialEnders([]);
      setQuestItems([]);
      setInitialQuestItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStarter = () => {
    setStarters([...starters, { id: creatureEntry, quest: 0, type: 'starter' }]);
    setIsDirty(true);
  };

  const handleAddEnder = () => {
    setEnders([...enders, { id: creatureEntry, quest: 0, type: 'ender' }]);
    setIsDirty(true);
  };

  const handleAddQuestItem = () => {
    const nextIdx = questItems.length === 0 ? 0 : Math.max(...questItems.map(q => q.idx)) + 1;
    setQuestItems([...questItems, { CreatureEntry: creatureEntry, idx: nextIdx, ItemId: 0, VerifiedBuild: 35662 }]);
    setIsDirty(true);
  };

  const generateFullQuery = () => {
    const starterInserts = starters.length > 0
      ? `INSERT INTO \`creature_queststarter\` (\`id\`, \`quest\`) VALUES\n${starters.map(s => `  (${creatureEntry}, ${s.quest || 0})`).join(',\n')};`
      : '';

    const enderInserts = enders.length > 0
      ? `INSERT INTO \`creature_questender\` (\`id\`, \`quest\`) VALUES\n${enders.map(e => `  (${creatureEntry}, ${e.quest || 0})`).join(',\n')};`
      : '';

    const itemInserts = questItems.length > 0
      ? `INSERT INTO \`creature_questitem\` (\`CreatureEntry\`, \`idx\`, \`ItemId\`, \`VerifiedBuild\`) VALUES\n${questItems.map(q => `  (${creatureEntry}, ${q.idx || 0}, ${q.ItemId || 0}, ${q.VerifiedBuild || 35662})`).join(',\n')};`
      : '';

    const parts = [
      `DELETE FROM \`creature_queststarter\` WHERE \`id\` = ${creatureEntry};`,
      starterInserts,
      `DELETE FROM \`creature_questender\` WHERE \`id\` = ${creatureEntry};`,
      enderInserts,
      `DELETE FROM \`creature_questitem\` WHERE \`CreatureEntry\` = ${creatureEntry};`,
      itemInserts,
    ].filter(p => Boolean(p && p.trim()));

    return parts.join('\n\n');
  };

  const generateDiffQuery = () => {
    const statements: string[] = [];

    // Starters diff
    const initialStarterQuests = new Set(initialStarters.map(s => s.quest));
    const currentStarterQuests = new Set(starters.map(s => s.quest));

    for (const q of initialStarterQuests) {
      if (!currentStarterQuests.has(q)) {
        statements.push(`DELETE FROM \`creature_queststarter\` WHERE \`id\` = ${creatureEntry} AND \`quest\` = ${q};`);
      }
    }
    for (const q of currentStarterQuests) {
      if (!initialStarterQuests.has(q)) {
        statements.push(`INSERT INTO \`creature_queststarter\` (\`id\`, \`quest\`) VALUES (${creatureEntry}, ${q});`);
      }
    }

    // Enders diff
    const initialEnderQuests = new Set(initialEnders.map(e => e.quest));
    const currentEnderQuests = new Set(enders.map(e => e.quest));

    for (const q of initialEnderQuests) {
      if (!currentEnderQuests.has(q)) {
        statements.push(`DELETE FROM \`creature_questender\` WHERE \`id\` = ${creatureEntry} AND \`quest\` = ${q};`);
      }
    }
    for (const q of currentEnderQuests) {
      if (!initialEnderQuests.has(q)) {
        statements.push(`INSERT INTO \`creature_questender\` (\`id\`, \`quest\`) VALUES (${creatureEntry}, ${q});`);
      }
    }

    // Quest items diff
    const initialItemMap = new Map(initialQuestItems.map(i => [i.idx, i]));
    const currentItemMap = new Map(questItems.map(i => [i.idx, i]));

    for (const [idx, item] of initialItemMap) {
      if (!currentItemMap.has(idx)) {
        statements.push(`DELETE FROM \`creature_questitem\` WHERE \`CreatureEntry\` = ${creatureEntry} AND \`idx\` = ${idx};`);
      }
    }
    for (const [idx, item] of currentItemMap) {
      const init = initialItemMap.get(idx);
      if (!init) {
        statements.push(`INSERT INTO \`creature_questitem\` (\`CreatureEntry\`, \`idx\`, \`ItemId\`, \`VerifiedBuild\`) VALUES (${creatureEntry}, ${idx}, ${item.ItemId || 0}, ${item.VerifiedBuild || 35662});`);
      } else if (init.ItemId !== item.ItemId || init.VerifiedBuild !== item.VerifiedBuild) {
        statements.push(`UPDATE \`creature_questitem\` SET \`ItemId\` = ${item.ItemId || 0}, \`VerifiedBuild\` = ${item.VerifiedBuild || 35662} WHERE \`CreatureEntry\` = ${creatureEntry} AND \`idx\` = ${idx};`);
      }
    }

    return statements.join('\n');
  };

  const activeQueryText = queryMode === 'diff' ? generateDiffQuery() : generateFullQuery();

  const handleCopySql = () => {
    navigator.clipboard.writeText(activeQueryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecute = async () => {
    if (!activeQueryText) return;
    setSaving(true);
    try {
      await api.executeSql('world', activeQueryText);
      setInitialStarters(JSON.parse(JSON.stringify(starters)));
      setInitialEnders(JSON.parse(JSON.stringify(enders)));
      setInitialQuestItems(JSON.parse(JSON.stringify(questItems)));
      setIsDirty(false);
    } catch (e) {
      console.error('Save quest data failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    await handleExecute();
    handleCopySql();
  };

  const handleReload = () => {
    setStarters(JSON.parse(JSON.stringify(initialStarters)));
    setEnders(JSON.parse(JSON.stringify(initialEnders)));
    setQuestItems(JSON.parse(JSON.stringify(initialQuestItems)));
    setIsDirty(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 font-sans select-none text-slate-800">
      {/* Top Query Action Bar */}
      <SqlQueryBar
        name="creature_quests"
        queryMode={queryMode}
        setQueryMode={setQueryMode}
        activeQueryText={activeQueryText}
        saving={saving}
        copied={copied}
        onCopy={handleCopySql}
        onExecute={handleExecute}
        onExecuteAndCopy={handleExecuteAndCopy}
        onReload={handleReload}
      />

      {/* Header card */}
      <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base text-slate-800 font-semibold">Quest Relations & Quest Items</h2>
          <p className="text-xs text-slate-500 font-mono">
            Tables: <code className="text-blue-600 font-bold">creature_queststarter</code>, <code className="text-blue-600 font-bold">creature_questender</code>, <code className="text-blue-600 font-bold">creature_questitem</code>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded p-8 text-center text-slate-500 text-sm">
          Loading quest relations...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-800 text-sm">Quests Started</span>
              <button
                type="button"
                onClick={handleAddStarter}
                className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-2 py-1 rounded flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>
            {starters.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500 font-mono">No quest starters</div>
            ) : (
              <div className="space-y-2">
                {starters.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <SelectorButton
                      onClick={() =>
                        setEntityModal({
                          open: true,
                          type: 'quest',
                          title: 'Select Quest Starter',
                          section: 'starter',
                          index: idx,
                        })
                      }
                    />
                    <input
                      type="number"
                      value={s.quest}
                      onChange={(e) => {
                        const updated = [...starters];
                        updated[idx].quest = Number(e.target.value) || 0;
                        setStarters(updated);
                        setIsDirty(true);
                      }}
                      className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none font-bold text-blue-600"
                      placeholder="Quest ID"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setStarters(starters.filter((_, i) => i !== idx));
                        setIsDirty(true);
                      }}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-800 text-sm">Quests Ended</span>
              <button
                type="button"
                onClick={handleAddEnder}
                className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-2 py-1 rounded flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>
            {enders.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500 font-mono">No quest enders</div>
            ) : (
              <div className="space-y-2">
                {enders.map((e, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <SelectorButton
                      onClick={() =>
                        setEntityModal({
                          open: true,
                          type: 'quest',
                          title: 'Select Quest Ender',
                          section: 'ender',
                          index: idx,
                        })
                      }
                    />
                    <input
                      type="number"
                      value={e.quest}
                      onChange={(ev) => {
                        const updated = [...enders];
                        updated[idx].quest = Number(ev.target.value) || 0;
                        setEnders(updated);
                        setIsDirty(true);
                      }}
                      className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none font-bold text-blue-600"
                      placeholder="Quest ID"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEnders(enders.filter((_, i) => i !== idx));
                        setIsDirty(true);
                      }}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quest Items Dropped */}
          <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-800 text-sm">Quest Items Required</span>
              <button
                type="button"
                onClick={handleAddQuestItem}
                className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-2 py-1 rounded flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>
            {questItems.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500 font-mono">No quest items</div>
            ) : (
              <div className="space-y-2">
                {questItems.map((q, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <SelectorButton
                      onClick={() =>
                        setEntityModal({
                          open: true,
                          type: 'item',
                          title: 'Select Quest Item',
                          section: 'item',
                          index: idx,
                        })
                      }
                    />
                    <input
                      type="number"
                      value={q.ItemId}
                      onChange={(ev) => {
                        const updated = [...questItems];
                        updated[idx].ItemId = Number(ev.target.value) || 0;
                        setQuestItems(updated);
                        setIsDirty(true);
                      }}
                      className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none font-bold text-emerald-600"
                      placeholder="Item ID"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setQuestItems(questItems.filter((_, i) => i !== idx));
                        setIsDirty(true);
                      }}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {entityModal && entityModal.open && (
        <EntitySelectorModal
          isOpen={true}
          onClose={() => setEntityModal(null)}
          type={entityModal.type}
          title={entityModal.title}
          initialValue={
            entityModal.section === 'starter'
              ? starters[entityModal.index]?.quest || 0
              : entityModal.section === 'ender'
              ? enders[entityModal.index]?.quest || 0
              : questItems[entityModal.index]?.ItemId || 0
          }
          onSelect={(id) => {
            if (entityModal.section === 'starter') {
              const updated = [...starters];
              updated[entityModal.index].quest = id;
              setStarters(updated);
            } else if (entityModal.section === 'ender') {
              const updated = [...enders];
              updated[entityModal.index].quest = id;
              setEnders(updated);
            } else if (entityModal.section === 'item') {
              const updated = [...questItems];
              updated[entityModal.index].ItemId = id;
              setQuestItems(updated);
            }
            setIsDirty(true);
          }}
        />
      )}
    </div>
  );
};
