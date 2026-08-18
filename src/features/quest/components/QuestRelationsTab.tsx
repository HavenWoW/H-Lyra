// Editor for the creature and gameobject quest relation tables: which entities
// start and end the quest.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Copy, Check } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { QuestRelationRow } from '../types';
import { SelectorButton } from './QuestTooltip';
import { EntitySelectorModal, SelectorType } from '../../../components/EntitySelectorModal';
import { SqlQueryBar } from '../../../components/SqlQueryBar';

interface QuestRelationsTabProps {
  questId: number;
}

export const QuestRelationsTab: React.FC<QuestRelationsTabProps> = ({ questId }) => {
  const [relations, setRelations] = useState<QuestRelationRow[]>([]);
  const [initialRelations, setInitialRelations] = useState<QuestRelationRow[]>([]);
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
    index: number;
  } | null>(null);

  useEffect(() => {
    loadRelations();
  }, [questId]);

  const loadRelations = async () => {
    setLoading(true);
    try {
      const [cStart, cEnd, goStart, goEnd] = await Promise.all([
        api.executeSql('world', `SELECT id FROM \`creature_queststarter\` WHERE \`quest\` = ${questId};`),
        api.executeSql('world', `SELECT id FROM \`creature_questender\` WHERE \`quest\` = ${questId};`),
        api.executeSql('world', `SELECT id FROM \`gameobject_queststarter\` WHERE \`quest\` = ${questId};`),
        api.executeSql('world', `SELECT id FROM \`gameobject_questender\` WHERE \`quest\` = ${questId};`),
      ]);

      const list: QuestRelationRow[] = [];
      if (cStart && cStart.rows) {
        cStart.rows.forEach((r: any[]) => list.push({ id: Number(r[0]), quest: questId, entityType: 'creature', relationType: 'starter' }));
      }
      if (cEnd && cEnd.rows) {
        cEnd.rows.forEach((r: any[]) => list.push({ id: Number(r[0]), quest: questId, entityType: 'creature', relationType: 'ender' }));
      }
      if (goStart && goStart.rows) {
        goStart.rows.forEach((r: any[]) => list.push({ id: Number(r[0]), quest: questId, entityType: 'gameobject', relationType: 'starter' }));
      }
      if (goEnd && goEnd.rows) {
        goEnd.rows.forEach((r: any[]) => list.push({ id: Number(r[0]), quest: questId, entityType: 'gameobject', relationType: 'ender' }));
      }

      setRelations(list);
      setInitialRelations(JSON.parse(JSON.stringify(list)));
      setIsDirty(false);
    } catch {
      setRelations([]);
      setInitialRelations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (entityType: 'creature' | 'gameobject', relationType: 'starter' | 'ender') => {
    setRelations([
      ...relations,
      {
        id: 0,
        quest: questId,
        entityType,
        relationType,
      },
    ]);
    setIsDirty(true);
  };

  const handleUpdate = (index: number, id: number) => {
    const updated = [...relations];
    updated[index] = { ...updated[index], id };
    setRelations(updated);
    setIsDirty(true);
  };

  const handleRemove = (index: number) => {
    setRelations(relations.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const generateFullQuery = () => {
    const cStart = relations.filter(r => r.entityType === 'creature' && r.relationType === 'starter' && r.id > 0);
    const cEnd = relations.filter(r => r.entityType === 'creature' && r.relationType === 'ender' && r.id > 0);
    const goStart = relations.filter(r => r.entityType === 'gameobject' && r.relationType === 'starter' && r.id > 0);
    const goEnd = relations.filter(r => r.entityType === 'gameobject' && r.relationType === 'ender' && r.id > 0);

    const parts: string[] = [];

    parts.push(`DELETE FROM \`creature_queststarter\` WHERE \`quest\` = ${questId};`);
    if (cStart.length > 0) {
      parts.push(`INSERT INTO \`creature_queststarter\` (\`id\`, \`quest\`) VALUES\n` + cStart.map(r => `  (${r.id}, ${questId})`).join(',\n') + ';');
    }

    parts.push(`DELETE FROM \`creature_questender\` WHERE \`quest\` = ${questId};`);
    if (cEnd.length > 0) {
      parts.push(`INSERT INTO \`creature_questender\` (\`id\`, \`quest\`) VALUES\n` + cEnd.map(r => `  (${r.id}, ${questId})`).join(',\n') + ';');
    }

    parts.push(`DELETE FROM \`gameobject_queststarter\` WHERE \`quest\` = ${questId};`);
    if (goStart.length > 0) {
      parts.push(`INSERT INTO \`gameobject_queststarter\` (\`id\`, \`quest\`) VALUES\n` + goStart.map(r => `  (${r.id}, ${questId})`).join(',\n') + ';');
    }

    parts.push(`DELETE FROM \`gameobject_questender\` WHERE \`quest\` = ${questId};`);
    if (goEnd.length > 0) {
      parts.push(`INSERT INTO \`gameobject_questender\` (\`id\`, \`quest\`) VALUES\n` + goEnd.map(r => `  (${r.id}, ${questId})`).join(',\n') + ';');
    }

    return parts.join('\n');
  };

  // The collection is written as a scoped DELETE + INSERT, so the diff statement
  // is the same replace. It is only emitted once something has actually changed,
  // leaving the diff query empty for an untouched tab.
  const activeQueryText = queryMode === 'diff' && !isDirty ? '' : generateFullQuery();

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
      setInitialRelations(JSON.parse(JSON.stringify(relations)));
      setIsDirty(false);
    } catch (e) {
      console.error('Execute relations query failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    await handleExecute();
    handleCopySql();
  };

  const handleReload = () => {
    setRelations(JSON.parse(JSON.stringify(initialRelations)));
    setIsDirty(false);
  };

  const renderSection = (
    title: string,
    tableName: string,
    entityType: 'creature' | 'gameobject',
    relationType: 'starter' | 'ender',
    color: string
  ) => {
    const list = relations
      .map((r, originalIdx) => ({ ...r, originalIdx }))
      .filter(r => r.entityType === entityType && r.relationType === relationType);

    return (
      <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
            <p className="text-xs text-slate-500 font-mono">Table: <code className={`${color} font-bold`}>{tableName}</code></p>
          </div>
          <button
            type="button"
            onClick={() => handleAdd(entityType, relationType)}
            className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add ID</span>
          </button>
        </div>

        {list.length === 0 ? (
          <div className="text-center py-2 text-xs text-slate-400 font-mono">None linked</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-xs">
            {list.map(r => (
              <div key={r.originalIdx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded p-2">
                <span className="text-slate-700 font-sans font-bold w-16 flex items-center">
                  {entityType === 'creature' ? 'NPC ID:' : 'GO ID:'}
                </span>
                <SelectorButton
                  onClick={() =>
                    setEntityModal({
                      open: true,
                      type: entityType,
                      title: `Select ${entityType === 'creature' ? 'Creature / NPC' : 'GameObject'}`,
                      index: r.originalIdx,
                    })
                  }
                />
                <input
                  type="number"
                  value={r.id}
                  onChange={(e) => handleUpdate(r.originalIdx, Number(e.target.value) || 0)}
                  className="flex-1 px-2 py-1 bg-white border border-slate-300 rounded font-bold text-blue-600 text-xs focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(r.originalIdx)}
                  className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 font-sans select-none text-slate-800">
      {/* Top Query Action Bar */}
      <SqlQueryBar
        name="quest_relations"
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
          <h2 className="text-base text-slate-800 font-semibold">Starters & Enders Relations</h2>
          <p className="text-xs text-slate-500 font-mono">
            Linked NPCs & GameObjects for Quest {questId}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded p-8 text-center text-slate-500 text-sm">
          Loading starters and enders relations...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderSection('Creature Quest Starter', 'creature_queststarter', 'creature', 'starter', 'text-blue-600')}
          {renderSection('Creature Quest Ender', 'creature_questender', 'creature', 'ender', 'text-indigo-600')}
          {renderSection('GameObject Quest Starter', 'gameobject_queststarter', 'gameobject', 'starter', 'text-amber-600')}
          {renderSection('GameObject Quest Ender', 'gameobject_questender', 'gameobject', 'ender', 'text-orange-600')}
        </div>
      )}

      {entityModal && entityModal.open && (
        <EntitySelectorModal
          isOpen={true}
          onClose={() => setEntityModal(null)}
          type={entityModal.type}
          title={entityModal.title}
          initialValue={relations[entityModal.index]?.id || 0}
          onSelect={(id) => {
            handleUpdate(entityModal.index, id);
          }}
        />
      )}
    </div>
  );
};
