// Editor for creature_equip_template: the three equipment slots a creature
// displays.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Copy, Check } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { CreatureEquipTemplate } from '../types';
import { InfoTooltip, SelectorButton } from './CreatureTooltip';
import { EntitySelectorModal, SelectorType } from '../../../components/EntitySelectorModal';

import { SqlQueryBar } from '../../../components/SqlQueryBar';

interface CreatureEquipTabProps {
  creatureEntry: number;
}

export const CreatureEquipTab: React.FC<CreatureEquipTabProps> = ({ creatureEntry }) => {
  const [equips, setEquips] = useState<CreatureEquipTemplate[]>([]);
  const [initialEquips, setInitialEquips] = useState<CreatureEquipTemplate[]>([]);
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
    field: keyof CreatureEquipTemplate;
  } | null>(null);

  useEffect(() => {
    loadEquips();
  }, [creatureEntry]);

  const loadEquips = async () => {
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT CreatureID, ID, ItemID1, AppearanceModID1, ItemVisual1, ItemID2, AppearanceModID2, ItemVisual2, ItemID3, AppearanceModID3, ItemVisual3, VerifiedBuild FROM \`creature_equip_template\` WHERE \`CreatureID\` = ${creatureEntry} ORDER BY \`ID\` ASC;`
      );
      if (res && res.success && res.rows) {
        const list = res.rows.map((r: any[]) => ({
          CreatureID: Number(r[0]),
          ID: Number(r[1]) || 1,
          ItemID1: Number(r[2]) || 0,
          AppearanceModID1: Number(r[3]) || 0,
          ItemVisual1: Number(r[4]) || 0,
          ItemID2: Number(r[5]) || 0,
          AppearanceModID2: Number(r[6]) || 0,
          ItemVisual2: Number(r[7]) || 0,
          ItemID3: Number(r[8]) || 0,
          AppearanceModID3: Number(r[9]) || 0,
          ItemVisual3: Number(r[10]) || 0,
          VerifiedBuild: Number(r[11]) || 35662,
        }));
        setEquips(list);
        setInitialEquips(JSON.parse(JSON.stringify(list)));
      } else {
        setEquips([]);
        setInitialEquips([]);
      }
      setIsDirty(false);
    } catch {
      setEquips([]);
      setInitialEquips([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    const nextId = equips.length === 0 ? 1 : Math.max(...equips.map(e => e.ID)) + 1;
    setEquips([
      ...equips,
      {
        CreatureID: creatureEntry,
        ID: nextId,
        ItemID1: 0,
        AppearanceModID1: 0,
        ItemVisual1: 0,
        ItemID2: 0,
        AppearanceModID2: 0,
        ItemVisual2: 0,
        ItemID3: 0,
        AppearanceModID3: 0,
        ItemVisual3: 0,
        VerifiedBuild: 35662,
      },
    ]);
    setIsDirty(true);
  };

  const handleUpdate = (index: number, field: keyof CreatureEquipTemplate, value: any) => {
    const updated = [...equips];
    updated[index] = { ...updated[index], [field]: value };
    setEquips(updated);
    setIsDirty(true);
  };

  const handleRemove = (index: number) => {
    setEquips(equips.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const generateFullQuery = () => {
    if (equips.length === 0) {
      return `DELETE FROM \`creature_equip_template\` WHERE \`CreatureID\` = ${creatureEntry};`;
    }

    const values = equips
      .map(
        e =>
          `  (${creatureEntry}, ${e.ID}, ${e.ItemID1 || 0}, ${e.AppearanceModID1 || 0}, ${e.ItemVisual1 || 0}, ${e.ItemID2 || 0}, ${e.AppearanceModID2 || 0}, ${e.ItemVisual2 || 0}, ${e.ItemID3 || 0}, ${e.AppearanceModID3 || 0}, ${e.ItemVisual3 || 0}, ${e.VerifiedBuild || 35662})`
      )
      .join(',\n');

    return `DELETE FROM \`creature_equip_template\` WHERE \`CreatureID\` = ${creatureEntry};
INSERT INTO \`creature_equip_template\`
  (\`CreatureID\`, \`ID\`, \`ItemID1\`, \`AppearanceModID1\`, \`ItemVisual1\`, \`ItemID2\`, \`AppearanceModID2\`, \`ItemVisual2\`, \`ItemID3\`, \`AppearanceModID3\`, \`ItemVisual3\`, \`VerifiedBuild\`)
VALUES
${values};`;
  };

  const generateDiffQuery = () => {
    const statements: string[] = [];
    const initialMap = new Map(initialEquips.map(e => [e.ID, e]));
    const currentMap = new Map(equips.map(e => [e.ID, e]));

    for (const [id, e] of initialMap) {
      if (!currentMap.has(id)) {
        statements.push(`DELETE FROM \`creature_equip_template\` WHERE \`CreatureID\` = ${creatureEntry} AND \`ID\` = ${id};`);
      }
    }

    for (const [id, e] of currentMap) {
      const init = initialMap.get(id);
      if (!init) {
        statements.push(`INSERT INTO \`creature_equip_template\` (\`CreatureID\`, \`ID\`, \`ItemID1\`, \`AppearanceModID1\`, \`ItemVisual1\`, \`ItemID2\`, \`AppearanceModID2\`, \`ItemVisual2\`, \`ItemID3\`, \`AppearanceModID3\`, \`ItemVisual3\`, \`VerifiedBuild\`) VALUES (${creatureEntry}, ${e.ID}, ${e.ItemID1 || 0}, ${e.AppearanceModID1 || 0}, ${e.ItemVisual1 || 0}, ${e.ItemID2 || 0}, ${e.AppearanceModID2 || 0}, ${e.ItemVisual2 || 0}, ${e.ItemID3 || 0}, ${e.AppearanceModID3 || 0}, ${e.ItemVisual3 || 0}, ${e.VerifiedBuild || 35662});`);
      } else {
        const isModified =
          init.ItemID1 !== e.ItemID1 ||
          init.AppearanceModID1 !== e.AppearanceModID1 ||
          init.ItemVisual1 !== e.ItemVisual1 ||
          init.ItemID2 !== e.ItemID2 ||
          init.AppearanceModID2 !== e.AppearanceModID2 ||
          init.ItemVisual2 !== e.ItemVisual2 ||
          init.ItemID3 !== e.ItemID3 ||
          init.AppearanceModID3 !== e.AppearanceModID3 ||
          init.ItemVisual3 !== e.ItemVisual3 ||
          init.VerifiedBuild !== e.VerifiedBuild;

        if (isModified) {
          statements.push(`UPDATE \`creature_equip_template\` SET \`ItemID1\` = ${e.ItemID1 || 0}, \`AppearanceModID1\` = ${e.AppearanceModID1 || 0}, \`ItemVisual1\` = ${e.ItemVisual1 || 0}, \`ItemID2\` = ${e.ItemID2 || 0}, \`AppearanceModID2\` = ${e.AppearanceModID2 || 0}, \`ItemVisual2\` = ${e.ItemVisual2 || 0}, \`ItemID3\` = ${e.ItemID3 || 0}, \`AppearanceModID3\` = ${e.AppearanceModID3 || 0}, \`ItemVisual3\` = ${e.ItemVisual3 || 0}, \`VerifiedBuild\` = ${e.VerifiedBuild || 35662} WHERE \`CreatureID\` = ${creatureEntry} AND \`ID\` = ${id};`);
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
      setInitialEquips(JSON.parse(JSON.stringify(equips)));
      setIsDirty(false);
    } catch (e) {
      console.error('Save equips failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    await handleExecute();
    handleCopySql();
  };

  const handleReload = () => {
    setEquips(JSON.parse(JSON.stringify(initialEquips)));
    setIsDirty(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 font-sans select-none text-slate-800">
      {/* Top Query Action Bar */}
      <SqlQueryBar
        name="creature_equip"
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
          <h2 className="text-base text-slate-800 font-semibold">Equip Templates</h2>
          <p className="text-xs text-slate-500 font-mono">
            Table: <code className="text-blue-600 font-bold">creature_equip_template</code> (CreatureID: {creatureEntry})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAdd}
            className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Equipment Set</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded p-8 text-center text-slate-500 text-sm">
          Loading equipment templates...
        </div>
      ) : equips.length === 0 ? (
        <div className="w-full space-y-3 pt-1">
          <div className="w-full bg-[#F1F3F5] border border-[#E2E8F0] rounded py-3 text-center text-[13px] text-slate-700 font-sans shadow-2xs">
            No equipment templates configured for creature {creatureEntry}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {equips.map((e, idx) => (
            <div key={idx} className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Set ID:</span>
                  <input
                    type="number"
                    value={e.ID}
                    onChange={(ev) => handleUpdate(idx, 'ID', Number(ev.target.value) || 1)}
                    className="w-16 px-2 py-1 border border-slate-300 rounded font-mono text-xs focus:border-blue-500 focus:outline-none font-bold"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="text-red-500 hover:text-red-700 p-1 rounded transition-colors cursor-pointer flex items-center gap-1 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>

              {/* 3 Equipment Slots */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
                <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                  <span className="font-bold text-slate-800">Slot 1 (Main Hand)</span>
                  <div>
                    <label className="block text-slate-700 font-bold mb-0.5 flex items-center">
                      <span>Item ID 1</span>
                      <SelectorButton
                        onClick={() =>
                          setEntityModal({
                            open: true,
                            type: 'item',
                            title: 'Select Main Hand Item',
                            index: idx,
                            field: 'ItemID1',
                          })
                        }
                      />
                    </label>
                    <input
                      type="number"
                      value={e.ItemID1}
                      onChange={(ev) => handleUpdate(idx, 'ItemID1', Number(ev.target.value) || 0)}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-blue-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-0.5 flex items-center">
                      <span>Appearance Mod 1</span>
                      <InfoTooltip text="ItemAppearance.db2 / ItemModifiedAppearance.db2 modifier." />
                    </label>
                    <input
                      type="number"
                      value={e.AppearanceModID1}
                      onChange={(ev) => handleUpdate(idx, 'AppearanceModID1', Number(ev.target.value) || 0)}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-0.5 flex items-center">
                      <span>Item Visual 1</span>
                      <InfoTooltip text="Item visual enchantment / illusion ID." />
                    </label>
                    <input
                      type="number"
                      value={e.ItemVisual1}
                      onChange={(ev) => handleUpdate(idx, 'ItemVisual1', Number(ev.target.value) || 0)}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                  <span className="font-bold text-slate-800">Slot 2 (Off Hand / Shield)</span>
                  <div>
                    <label className="block text-slate-700 font-bold mb-0.5 flex items-center">
                      <span>Item ID 2</span>
                      <SelectorButton
                        onClick={() =>
                          setEntityModal({
                            open: true,
                            type: 'item',
                            title: 'Select Off Hand Item / Shield',
                            index: idx,
                            field: 'ItemID2',
                          })
                        }
                      />
                    </label>
                    <input
                      type="number"
                      value={e.ItemID2}
                      onChange={(ev) => handleUpdate(idx, 'ItemID2', Number(ev.target.value) || 0)}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-blue-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-0.5 flex items-center">
                      <span>Appearance Mod 2</span>
                      <InfoTooltip text="ItemAppearance.db2 modifier." />
                    </label>
                    <input
                      type="number"
                      value={e.AppearanceModID2}
                      onChange={(ev) => handleUpdate(idx, 'AppearanceModID2', Number(ev.target.value) || 0)}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-0.5 flex items-center">
                      <span>Item Visual 2</span>
                      <InfoTooltip text="Item visual enchantment / illusion ID." />
                    </label>
                    <input
                      type="number"
                      value={e.ItemVisual2}
                      onChange={(ev) => handleUpdate(idx, 'ItemVisual2', Number(ev.target.value) || 0)}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Slot 3: Ranged / Extra */}
                <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                  <span className="font-bold text-slate-800">Slot 3 (Ranged / Sheath)</span>
                  <div>
                    <label className="block text-slate-700 font-bold mb-0.5 flex items-center">
                      <span>Item ID 3</span>
                      <SelectorButton
                        onClick={() =>
                          setEntityModal({
                            open: true,
                            type: 'item',
                            title: 'Select Ranged Item',
                            index: idx,
                            field: 'ItemID3',
                          })
                        }
                      />
                    </label>
                    <input
                      type="number"
                      value={e.ItemID3}
                      onChange={(ev) => handleUpdate(idx, 'ItemID3', Number(ev.target.value) || 0)}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-blue-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-0.5 flex items-center">
                      <span>Appearance Mod 3</span>
                      <InfoTooltip text="ItemAppearance.db2 modifier." />
                    </label>
                    <input
                      type="number"
                      value={e.AppearanceModID3}
                      onChange={(ev) => handleUpdate(idx, 'AppearanceModID3', Number(ev.target.value) || 0)}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-0.5 flex items-center">
                      <span>Item Visual 3</span>
                      <InfoTooltip text="Item visual enchantment / illusion ID." />
                    </label>
                    <input
                      type="number"
                      value={e.ItemVisual3}
                      onChange={(ev) => handleUpdate(idx, 'ItemVisual3', Number(ev.target.value) || 0)}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {entityModal && entityModal.open && (
        <EntitySelectorModal
          isOpen={true}
          onClose={() => setEntityModal(null)}
          type={entityModal.type}
          title={entityModal.title}
          initialValue={equips[entityModal.index] ? (equips[entityModal.index][entityModal.field] as number) : 0}
          onSelect={(id) => {
            handleUpdate(entityModal.index, entityModal.field, id);
          }}
        />
      )}
    </div>
  );
};
