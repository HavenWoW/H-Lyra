// Editor for quest_objectives: what the player has to do to complete the quest.
//
// Every column is loaded and written back, so Flags2 and ProgressBarWeight —
// which an earlier version wrote as a hardcoded 0 — survive a save. Text is
// escaped through the shared collection generator.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { QuestObjectiveRow } from '../types';
import { InfoTooltip, SelectorButton } from './QuestTooltip';
import { EntitySelectorModal, SelectorType } from '../../../components/EntitySelectorModal';
import { SqlQueryBar } from '../../../components/SqlQueryBar';
import { collectionChanged, generateCollectionReplace } from '../../../lib/collectionSql';
import {
  QUEST_OBJECTIVES_TABLE,
  QUEST_OBJECTIVES_SCOPE_COLUMN,
  QUEST_OBJECTIVES_COLUMNS,
} from '../schema/questObjectivesSchema';
import { QUEST_VISUAL_EFFECT_COLUMNS } from '../schema/questVisualEffectSchema';
import { VisualEffectRow, generateVisualEffectSql } from '../utils/questVisualEffects';
import {
  QUEST_OBJECTIVE_TYPE_OPTIONS,
  QUEST_OBJECTIVE_TYPE_SELECTORS,
} from '../../../constants/questOptions';

interface QuestObjectivesTabProps {
  questId: number;
}

const emptyToNull = (value: string): string | null => (value === '' ? null : value);

export const QuestObjectivesTab: React.FC<QuestObjectivesTabProps> = ({ questId }) => {
  const [objectives, setObjectives] = useState<QuestObjectiveRow[]>([]);
  const [initialObjectives, setInitialObjectives] = useState<QuestObjectiveRow[]>([]);
  const [visualEffects, setVisualEffects] = useState<VisualEffectRow[]>([]);
  const [initialVisualEffects, setInitialVisualEffects] = useState<VisualEffectRow[]>([]);
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [entityModal, setEntityModal] = useState<{
    open: boolean;
    type: SelectorType;
    title: string;
    index: number;
  } | null>(null);

  useEffect(() => {
    loadObjectives();
  }, [questId]);

  const loadObjectives = async () => {
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT ID, QuestID, Type, \`Order\`, StorageIndex, ObjectID, Amount, Flags, Flags2, ProgressBarWeight, Description, VerifiedBuild FROM \`quest_objectives\` WHERE \`QuestID\` = ${questId} ORDER BY \`Order\` ASC, \`StorageIndex\` ASC, \`ID\` ASC;`
      );
      if (res && res.success && res.rows) {
        const list: QuestObjectiveRow[] = res.rows.map((r: any[]) => ({
          ID: Number(r[0]),
          QuestID: Number(r[1]),
          Type: Number(r[2]) || 0,
          Order: Number(r[3]) || 0,
          StorageIndex: Number(r[4]) || 0,
          ObjectID: Number(r[5]) || 0,
          Amount: Number(r[6]) || 0,
          Flags: Number(r[7]) || 0,
          Flags2: Number(r[8]) || 0,
          ProgressBarWeight: Number(r[9]) || 0,
          Description: r[10] === null || r[10] === undefined ? null : String(r[10]),
          VerifiedBuild: Number(r[11]) || 0,
        }));
        setObjectives(list);
        setInitialObjectives(JSON.parse(JSON.stringify(list)));
        await loadVisualEffects(list.map((o) => o.ID));
      } else {
        setObjectives([]);
        setInitialObjectives([]);
        setVisualEffects([]);
        setInitialVisualEffects([]);
      }
    } catch {
      setObjectives([]);
      setInitialObjectives([]);
      setVisualEffects([]);
      setInitialVisualEffects([]);
    } finally {
      setLoading(false);
    }
  };

  /** Visual effects are keyed by objective id, so they load through the ids. */
  const loadVisualEffects = async (objectiveIds: number[]) => {
    if (objectiveIds.length === 0) {
      setVisualEffects([]);
      setInitialVisualEffects([]);
      return;
    }
    try {
      const res = await api.executeSql(
        'world',
        `SELECT ID, \`Index\`, VisualEffect, VerifiedBuild FROM \`quest_visual_effect\` WHERE \`ID\` IN (${objectiveIds.join(', ')}) ORDER BY \`ID\` ASC, \`Index\` ASC;`
      );
      const list: VisualEffectRow[] =
        res && res.success && res.rows
          ? res.rows.map((r: any[]) => ({
              ID: Number(r[0]),
              Index: Number(r[1]) || 0,
              VisualEffect: Number(r[2]) || 0,
              VerifiedBuild: Number(r[3]) || 0,
            }))
          : [];
      setVisualEffects(list);
      setInitialVisualEffects(JSON.parse(JSON.stringify(list)));
    } catch {
      setVisualEffects([]);
      setInitialVisualEffects([]);
    }
  };

  const handleAddObjective = async () => {
    let dbMax = 0;
    try {
      const res = await api.executeSql('world', 'SELECT MAX(ID) FROM `quest_objectives`;');
      if (res && res.success && res.rows && res.rows[0] && res.rows[0][0]) {
        dbMax = Number(res.rows[0][0]);
      }
    } catch {
      dbMax = 0;
    }
    // Consider unsaved objectives too, so two adds before a save cannot collide
    // on the same id and cross-associate their visual effects.
    const memMax = objectives.length > 0 ? Math.max(...objectives.map((o) => o.ID)) : 0;
    const nextId = Math.max(dbMax, memMax) + 1;

    const nextOrder = objectives.length;
    setObjectives([
      ...objectives,
      {
        ID: nextId,
        QuestID: questId,
        Type: 0,
        Order: nextOrder,
        StorageIndex: nextOrder,
        ObjectID: 0,
        Amount: 1,
        Flags: 0,
        Flags2: 0,
        ProgressBarWeight: 0,
        Description: null,
        VerifiedBuild: 0,
      },
    ]);
  };

  const handleUpdate = (index: number, field: keyof QuestObjectiveRow, value: unknown) => {
    const updated = [...objectives];
    updated[index] = { ...updated[index], [field]: value } as QuestObjectiveRow;
    setObjectives(updated);
  };

  const handleRemove = (index: number) => {
    const removed = objectives[index];
    setObjectives(objectives.filter((_, i) => i !== index));
    // Drop the removed objective's visual effects so none are left orphaned.
    setVisualEffects(visualEffects.filter((v) => v.ID !== removed.ID));
  };

  // ---- visual effects (keyed by the owning objective id) -----------------
  const addVisualEffect = (objectiveId: number) => {
    const owned = visualEffects.filter((v) => v.ID === objectiveId);
    const nextIndex = owned.length === 0 ? 0 : Math.max(...owned.map((v) => v.Index)) + 1;
    setVisualEffects([
      ...visualEffects,
      { ID: objectiveId, Index: nextIndex, VisualEffect: 0, VerifiedBuild: 0 },
    ]);
  };

  const updateVisualEffect = (globalIndex: number, field: keyof VisualEffectRow, value: number) => {
    setVisualEffects(
      visualEffects.map((v, i) => (i === globalIndex ? { ...v, [field]: value } : v))
    );
  };

  const removeVisualEffect = (globalIndex: number) => {
    setVisualEffects(visualEffects.filter((_, i) => i !== globalIndex));
  };

  const objectivesDirty = collectionChanged(
    QUEST_OBJECTIVES_COLUMNS,
    initialObjectives as unknown as Record<string, unknown>[],
    objectives as unknown as Record<string, unknown>[]
  );
  const visualEffectsDirty = collectionChanged(
    QUEST_VISUAL_EFFECT_COLUMNS,
    initialVisualEffects as unknown as Record<string, unknown>[],
    visualEffects as unknown as Record<string, unknown>[]
  );
  const isDirty = objectivesDirty || visualEffectsDirty;

  const buildSql = (): string => {
    const objectivesSql = generateCollectionReplace(
      QUEST_OBJECTIVES_TABLE,
      { column: QUEST_OBJECTIVES_SCOPE_COLUMN, value: questId },
      QUEST_OBJECTIVES_COLUMNS,
      objectives as unknown as Record<string, unknown>[]
    );
    const visualEffectSql = generateVisualEffectSql(
      initialObjectives.map((o) => o.ID),
      objectives.map((o) => o.ID),
      visualEffects
    );
    return [objectivesSql, visualEffectSql].filter(Boolean).join('\n\n');
  };

  const activeQueryText = queryMode === 'diff' && !isDirty ? '' : buildSql();

  const handleCopySql = () => {
    if (!activeQueryText) return;
    navigator.clipboard.writeText(activeQueryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecute = async () => {
    if (!activeQueryText) return;
    setSaving(true);
    setError(null);
    try {
      await api.executeSql('world', activeQueryText);
      await loadObjectives();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    await handleExecute();
    handleCopySql();
  };

  const handleReload = () => {
    setObjectives(JSON.parse(JSON.stringify(initialObjectives)));
    setError(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 font-sans select-none text-slate-800">
      <SqlQueryBar
        name="quest_objectives"
        queryMode={queryMode}
        setQueryMode={setQueryMode}
        activeQueryText={activeQueryText}
        saving={saving}
        copied={copied}
        error={error}
        onCopy={handleCopySql}
        onExecute={handleExecute}
        onExecuteAndCopy={handleExecuteAndCopy}
        onReload={handleReload}
      />

      <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base text-slate-800 font-semibold">Quest Objectives</h2>
          <p className="text-xs text-slate-500 font-mono">
            Table: <code className="text-blue-600 font-bold">quest_objectives</code> (Quest ID: {questId})
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddObjective}
          className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Objective</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded p-8 text-center text-slate-500 text-sm">
          Loading objectives...
        </div>
      ) : objectives.length === 0 ? (
        <div className="w-full bg-[#F1F3F5] border border-[#E2E8F0] rounded py-3 text-center text-[13px] text-slate-700 font-sans shadow-2xs">
          No objectives defined in quest_objectives for quest {questId}
        </div>
      ) : (
        <div className="space-y-3">
          {objectives.map((obj, idx) => {
            const selectorType = QUEST_OBJECTIVE_TYPE_SELECTORS[obj.Type] ?? null;
            return (
              <div key={idx} className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700">Objective ID: #{obj.ID}</span>
                    <span className="text-xs text-slate-500 font-mono">Order: {obj.Order}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-sans">
                  <div>
                    <label className="text-slate-700 font-bold mb-1 flex items-center">
                      <span>Objective Type</span>
                      <InfoTooltip text="Objective category governing what the player must kill, interact with, collect, or cast." />
                    </label>
                    <select
                      value={obj.Type}
                      onChange={(e) => handleUpdate(idx, 'Type', Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                    >
                      {QUEST_OBJECTIVE_TYPE_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 font-bold mb-1 flex items-center">
                      <span>Target (ObjectID)</span>
                      {selectorType ? (
                        <SelectorButton
                          onClick={() =>
                            setEntityModal({
                              open: true,
                              type: selectorType,
                              title: `Select Target (${selectorType})`,
                              index: idx,
                            })
                          }
                        />
                      ) : (
                        <InfoTooltip text="Id of the creature, gameobject, item, currency or spell for this objective." />
                      )}
                    </label>
                    <input
                      type="number"
                      value={obj.ObjectID}
                      onChange={(e) => handleUpdate(idx, 'ObjectID', Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold text-blue-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-bold mb-1 flex items-center">
                      <span>Required Amount</span>
                    </label>
                    <input
                      type="number"
                      value={obj.Amount}
                      onChange={(e) => handleUpdate(idx, 'Amount', Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold text-emerald-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-bold mb-1 flex items-center">
                      <span>Storage Index</span>
                      <InfoTooltip text="Slot the objective's progress is stored in; -1 for objectives that do not track a count." />
                    </label>
                    <input
                      type="number"
                      value={obj.StorageIndex}
                      onChange={(e) => handleUpdate(idx, 'StorageIndex', Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-bold mb-1 flex items-center">
                      <span>Flags</span>
                    </label>
                    <input
                      type="number"
                      value={obj.Flags}
                      onChange={(e) => handleUpdate(idx, 'Flags', Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-bold mb-1 flex items-center">
                      <span>Flags2</span>
                    </label>
                    <input
                      type="number"
                      value={obj.Flags2}
                      onChange={(e) => handleUpdate(idx, 'Flags2', Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-bold mb-1 flex items-center">
                      <span>Progress Bar Weight</span>
                      <InfoTooltip text="Relative weight of this objective on a PART_OF_PROGRESS_BAR objective group." />
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={obj.ProgressBarWeight}
                      onChange={(e) => handleUpdate(idx, 'ProgressBarWeight', Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-700 font-bold mb-1 text-xs flex items-center">
                    <span>Objective Description</span>
                    <InfoTooltip text="Optional custom text shown in the quest tracker." />
                  </label>
                  <input
                    type="text"
                    value={obj.Description ?? ''}
                    onChange={(e) => handleUpdate(idx, 'Description', emptyToNull(e.target.value))}
                    placeholder="e.g. Defeat Gnoll Raiders"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Visual effects keyed by this objective's id */}
                <div className="border-t border-slate-100 pt-3 mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-slate-700 font-bold text-xs flex items-center">
                      <span>Visual Effects</span>
                      <InfoTooltip text="Client-side visual sparkle/highlight for this objective." />
                    </label>
                    <button
                      type="button"
                      onClick={() => addVisualEffect(obj.ID)}
                      className="text-[10px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5 inline mr-1" />
                      Add
                    </button>
                  </div>
                  {visualEffects.filter((ve) => ve.ID === obj.ID).length === 0 ? (
                    <div className="text-[12px] text-slate-500 italic">
                      No visual effects for this objective.
                    </div>
                  ) : (
                    <div className="space-y-2 bg-slate-50 p-2 rounded border border-slate-200">
                      {visualEffects.map((ve, veIdx) =>
                        ve.ID === obj.ID ? (
                          <div key={veIdx} className="flex items-end gap-2">
                            <div className="flex-1">
                              <label className="text-[11px] text-slate-600 font-semibold">Index</label>
                              <input
                                type="number"
                                value={ve.Index}
                                onChange={(e) => updateVisualEffect(veIdx, 'Index', Number(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-[12px] focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[11px] text-slate-600 font-semibold">Visual Effect ID</label>
                              <input
                                type="number"
                                value={ve.VisualEffect}
                                onChange={(e) => updateVisualEffect(veIdx, 'VisualEffect', Number(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-[12px] focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeVisualEffect(veIdx)}
                              className="text-red-500 hover:text-red-700 p-1 cursor-pointer flex-shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {entityModal && entityModal.open && (
        <EntitySelectorModal
          isOpen={true}
          onClose={() => setEntityModal(null)}
          type={entityModal.type}
          title={entityModal.title}
          initialValue={objectives[entityModal.index]?.ObjectID || 0}
          onSelect={(id) => handleUpdate(entityModal.index, 'ObjectID', id)}
        />
      )}
    </div>
  );
};
