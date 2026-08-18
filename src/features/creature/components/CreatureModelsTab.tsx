// Editor for creature_template_model: display ids and their selection
// probability.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { InfoTooltip, SelectorButton } from './CreatureTooltip';
import { EntitySelectorModal, SelectorType } from '../../../components/EntitySelectorModal';

import { SqlQueryBar } from '../../../components/SqlQueryBar';

export interface CreatureModelRow {
  CreatureID: number;
  Idx: number;
  CreatureDisplayID: number;
  DisplayScale: number;
  Probability: number;
  VerifiedBuild?: number;
}

interface CreatureModelsTabProps {
  creatureEntry: number;
}

export const CreatureModelsTab: React.FC<CreatureModelsTabProps> = ({ creatureEntry }) => {
  const [models, setModels] = useState<CreatureModelRow[]>([]);
  const [initialModels, setInitialModels] = useState<CreatureModelRow[]>([]);
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Entity selector modal
  const [entityModal, setEntityModal] = useState<{
    open: boolean;
    type: SelectorType;
    title: string;
    index: number;
  } | null>(null);

  useEffect(() => {
    loadModels();
  }, [creatureEntry]);

  const loadModels = async () => {
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT CreatureID, Idx, CreatureDisplayID, DisplayScale, Probability, VerifiedBuild FROM \`creature_template_model\` WHERE \`CreatureID\` = ${creatureEntry} ORDER BY \`Idx\` ASC;`
      );
      if (res && res.success && res.rows) {
        const list = res.rows.map((r: any[]) => ({
          CreatureID: Number(r[0]),
          Idx: Number(r[1]) || 0,
          CreatureDisplayID: Number(r[2]) || 0,
          DisplayScale: Number(r[3]) || 1.0,
          Probability: Number(r[4]) || 1.0,
          VerifiedBuild: Number(r[5]) || 35662,
        }));
        setModels(list);
        setInitialModels(JSON.parse(JSON.stringify(list)));
      } else {
        setModels([]);
        setInitialModels([]);
      }
      setIsDirty(false);
    } catch {
      setModels([]);
      setInitialModels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddModel = () => {
    const nextIdx = models.length === 0 ? 0 : Math.max(...models.map(m => m.Idx)) + 1;
    setModels([
      ...models,
      {
        CreatureID: creatureEntry,
        Idx: nextIdx,
        CreatureDisplayID: 0,
        DisplayScale: 1.0,
        Probability: 1.0,
        VerifiedBuild: 35662,
      },
    ]);
    setIsDirty(true);
  };

  const handleUpdate = (index: number, field: keyof CreatureModelRow, value: any) => {
    const updated = [...models];
    updated[index] = { ...updated[index], [field]: value };
    setModels(updated);
    setIsDirty(true);
  };

  const handleRemove = (index: number) => {
    setModels(models.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const generateFullQuery = () => {
    if (models.length === 0) {
      return `DELETE FROM \`creature_template_model\` WHERE \`CreatureID\` = ${creatureEntry};`;
    }

    const values = models
      .map(
        m =>
          `  (${creatureEntry}, ${m.Idx}, ${m.CreatureDisplayID || 0}, ${m.DisplayScale || 1.0}, ${m.Probability || 1.0}, ${m.VerifiedBuild || 35662})`
      )
      .join(',\n');

    return `DELETE FROM \`creature_template_model\` WHERE \`CreatureID\` = ${creatureEntry};
INSERT INTO \`creature_template_model\`
  (\`CreatureID\`, \`Idx\`, \`CreatureDisplayID\`, \`DisplayScale\`, \`Probability\`, \`VerifiedBuild\`)
VALUES
${values};`;
  };

  const generateDiffQuery = () => {
    const statements: string[] = [];
    const initialMap = new Map(initialModels.map(m => [m.Idx, m]));
    const currentMap = new Map(models.map(m => [m.Idx, m]));

    for (const [idx, m] of initialMap) {
      if (!currentMap.has(idx)) {
        statements.push(`DELETE FROM \`creature_template_model\` WHERE \`CreatureID\` = ${creatureEntry} AND \`Idx\` = ${idx};`);
      }
    }

    for (const [idx, m] of currentMap) {
      const init = initialMap.get(idx);
      if (!init) {
        statements.push(`INSERT INTO \`creature_template_model\` (\`CreatureID\`, \`Idx\`, \`CreatureDisplayID\`, \`DisplayScale\`, \`Probability\`, \`VerifiedBuild\`) VALUES (${creatureEntry}, ${m.Idx}, ${m.CreatureDisplayID || 0}, ${m.DisplayScale || 1.0}, ${m.Probability || 1.0}, ${m.VerifiedBuild || 35662});`);
      } else {
        const isModified =
          init.CreatureDisplayID !== m.CreatureDisplayID ||
          init.DisplayScale !== m.DisplayScale ||
          init.Probability !== m.Probability ||
          init.VerifiedBuild !== m.VerifiedBuild;

        if (isModified) {
          statements.push(`UPDATE \`creature_template_model\` SET \`CreatureDisplayID\` = ${m.CreatureDisplayID || 0}, \`DisplayScale\` = ${m.DisplayScale || 1.0}, \`Probability\` = ${m.Probability || 1.0}, \`VerifiedBuild\` = ${m.VerifiedBuild || 35662} WHERE \`CreatureID\` = ${creatureEntry} AND \`Idx\` = ${idx};`);
        }
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
      setInitialModels(JSON.parse(JSON.stringify(models)));
      setIsDirty(false);
    } catch (e) {
      console.error('Save models failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    await handleExecute();
    handleCopySql();
  };

  const handleReload = () => {
    setModels(JSON.parse(JSON.stringify(initialModels)));
    setIsDirty(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 font-sans select-none text-slate-800">
      {/* Top Query Action Bar */}
      <SqlQueryBar
        name="creature_models"
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
          <h2 className="text-base text-slate-800 font-semibold">Creature Models & Displays</h2>
          <p className="text-xs text-slate-500 font-mono">
            Table: <code className="text-blue-600 font-bold">creature_template_model</code> (CreatureID: {creatureEntry})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddModel}
            className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Model Display</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded p-8 text-center text-slate-500 text-sm">
          Loading display models...
        </div>
      ) : models.length === 0 ? (
        <div className="w-full space-y-3 pt-1">
          <div className="w-full bg-[#F1F3F5] border border-[#E2E8F0] rounded py-3 text-center text-[13px] text-slate-700 font-sans shadow-2xs">
            No display models configured for creature {creatureEntry}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3 w-16">Idx</th>
                <th className="py-2.5 px-3 w-48">Display ID</th>
                <th className="py-2.5 px-3 w-32">Display Scale</th>
                <th className="py-2.5 px-3 w-32">Probability</th>
                <th className="py-2.5 px-3 w-28">VerifiedBuild</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {models.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 font-bold text-slate-600">
                    <input
                      type="number"
                      value={m.Idx}
                      onChange={(e) => handleUpdate(idx, 'Idx', Number(e.target.value) || 0)}
                      className="w-12 px-1.5 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={m.CreatureDisplayID}
                        onChange={(e) => handleUpdate(idx, 'CreatureDisplayID', Number(e.target.value) || 0)}
                        className="w-28 px-2 py-1 border border-slate-300 rounded font-bold text-blue-600 focus:border-blue-500 focus:outline-none text-xs"
                      />
                      <SelectorButton
                        onClick={() =>
                          setEntityModal({
                            open: true,
                            type: 'display',
                            title: `Select Creature Display (${m.Idx})`,
                            index: idx,
                          })
                        }
                      />
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="0.01"
                      value={m.DisplayScale}
                      onChange={(e) => handleUpdate(idx, 'DisplayScale', parseFloat(e.target.value) || 1.0)}
                      className="w-24 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="0.01"
                      value={m.Probability}
                      onChange={(e) => handleUpdate(idx, 'Probability', parseFloat(e.target.value) || 1.0)}
                      className="w-24 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={m.VerifiedBuild ?? 35662}
                      onChange={(e) => handleUpdate(idx, 'VerifiedBuild', Number(e.target.value) || 35662)}
                      className="w-24 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="text-red-500 hover:text-red-700 p-1 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {entityModal && entityModal.open && (
        <EntitySelectorModal
          isOpen={true}
          onClose={() => setEntityModal(null)}
          type={entityModal.type}
          title={entityModal.title}
          initialValue={models[entityModal.index]?.CreatureDisplayID || 0}
          onSelect={(id) => {
            handleUpdate(entityModal.index, 'CreatureDisplayID', id);
          }}
        />
      )}
    </div>
  );
};

export default CreatureModelsTab;
