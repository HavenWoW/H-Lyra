// Editor for creature_template_addon: the per-template spawn addon covering
// mount, emote, auras and anim kits.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Copy, Check } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { CreatureTemplateAddon } from '../types';
import { InfoTooltip, SelectorButton } from './CreatureTooltip';
import { EntitySelectorModal, SelectorType } from '../../../components/EntitySelectorModal';

import { SqlQueryBar } from '../../../components/SqlQueryBar';
import { quoteSqlString } from '../../../lib/sql';

interface CreatureAddonTabProps {
  creatureEntry: number;
}

export const CreatureAddonTab: React.FC<CreatureAddonTabProps> = ({ creatureEntry }) => {
  const [addon, setAddon] = useState<CreatureTemplateAddon | null>(null);
  const [initialAddon, setInitialAddon] = useState<CreatureTemplateAddon | null>(null);
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
    field: keyof CreatureTemplateAddon;
  } | null>(null);

  useEffect(() => {
    loadAddon();
  }, [creatureEntry]);

  const loadAddon = async () => {
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT entry, path_id, mount, bytes1, bytes2, emote, aiAnimKit, movementAnimKit, meleeAnimKit, visibilityDistanceType, auras FROM \`creature_template_addon\` WHERE \`entry\` = ${creatureEntry} LIMIT 1;`
      );
      if (res && res.success && res.rows && res.rows.length > 0) {
        const r = res.rows[0];
        const loaded: CreatureTemplateAddon = {
          entry: Number(r[0]),
          path_id: Number(r[1]) || 0,
          mount: Number(r[2]) || 0,
          bytes1: Number(r[3]) || 0,
          bytes2: Number(r[4]) || 0,
          emote: Number(r[5]) || 0,
          aiAnimKit: Number(r[6]) || 0,
          movementAnimKit: Number(r[7]) || 0,
          meleeAnimKit: Number(r[8]) || 0,
          visibilityDistanceType: Number(r[9]) || 0,
          auras: r[10] ? String(r[10]) : '',
        };
        setAddon(loaded);
        setInitialAddon(JSON.parse(JSON.stringify(loaded)));
      } else {
        setAddon(null);
        setInitialAddon(null);
      }
      setIsDirty(false);
    } catch {
      setAddon(null);
      setInitialAddon(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    const fresh: CreatureTemplateAddon = {
      entry: creatureEntry,
      path_id: 0,
      mount: 0,
      bytes1: 0,
      bytes2: 0,
      emote: 0,
      aiAnimKit: 0,
      movementAnimKit: 0,
      meleeAnimKit: 0,
      visibilityDistanceType: 0,
      auras: '',
    };
    setAddon(fresh);
    setIsDirty(true);
  };

  const handleChange = (field: keyof CreatureTemplateAddon, value: any) => {
    if (!addon) return;
    setAddon({ ...addon, [field]: value });
    setIsDirty(true);
  };

  const generateFullQuery = (): string => {
    if (!addon) return '';
    const safeAuras = addon.auras ? quoteSqlString(addon.auras) : 'NULL';
    return `DELETE FROM \`creature_template_addon\` WHERE \`entry\` = ${creatureEntry};
INSERT INTO \`creature_template_addon\`
  (\`entry\`, \`path_id\`, \`mount\`, \`bytes1\`, \`bytes2\`, \`emote\`, \`aiAnimKit\`, \`movementAnimKit\`, \`meleeAnimKit\`, \`visibilityDistanceType\`, \`auras\`)
VALUES
  (${creatureEntry}, ${addon.path_id ?? 0}, ${addon.mount ?? 0}, ${addon.bytes1 ?? 0}, ${addon.bytes2 ?? 0}, ${addon.emote ?? 0}, ${addon.aiAnimKit ?? 0}, ${addon.movementAnimKit ?? 0}, ${addon.meleeAnimKit ?? 0}, ${addon.visibilityDistanceType ?? 0}, ${safeAuras});`;
  };

  const generateDiffQuery = (): string => {
    if (!addon) return '';
    if (!initialAddon) return generateFullQuery();

    const changes: string[] = [];
    const fields: (keyof CreatureTemplateAddon)[] = [
      'path_id', 'mount', 'bytes1', 'bytes2', 'emote',
      'aiAnimKit', 'movementAnimKit', 'meleeAnimKit', 'visibilityDistanceType', 'auras'
    ];

    for (const f of fields) {
      if (initialAddon[f] !== addon[f]) {
        if (f === 'auras') {
          const safe = addon.auras ? quoteSqlString(addon.auras) : 'NULL';
          changes.push(`\`${f}\` = ${safe}`);
        } else {
          changes.push(`\`${f}\` = ${addon[f] ?? 0}`);
        }
      }
    }

    if (changes.length === 0) return '';

    return `UPDATE \`creature_template_addon\` SET
  ${changes.join(',\n  ')}
WHERE \`entry\` = ${creatureEntry};`;
  };

  const activeQueryText = queryMode === 'diff' ? generateDiffQuery() : generateFullQuery();

  const handleCopySql = () => {
    const sql = activeQueryText || generateFullQuery();
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecute = async () => {
    const sql = activeQueryText || generateFullQuery();
    if (!sql) return;
    setSaving(true);
    try {
      await api.executeSql('world', sql);
      setInitialAddon(addon ? JSON.parse(JSON.stringify(addon)) : null);
      setIsDirty(false);
    } catch (e) {
      console.error('Execute addon query failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    await handleExecute();
    handleCopySql();
  };

  const handleReload = () => {
    if (initialAddon) {
      setAddon(JSON.parse(JSON.stringify(initialAddon)));
      setIsDirty(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete creature template addon record?')) return;
    setSaving(true);
    try {
      await api.executeSql('world', `DELETE FROM \`creature_template_addon\` WHERE \`entry\` = ${creatureEntry};`);
      setAddon(null);
      setInitialAddon(null);
      setIsDirty(false);
    } catch (e) {
      console.error('Delete addon failed:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 font-sans select-none text-slate-800">
      {/* Top Query Action Bar */}
      {addon && (
        <SqlQueryBar
          name="creature_addon"
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
      )}

      {/* Header card */}
      <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base text-slate-800 font-semibold">Template Addon</h2>
          <p className="text-xs text-slate-500 font-mono">
            Table: <code className="text-blue-600 font-bold">creature_template_addon</code> (Entry: {creatureEntry})
          </p>
        </div>
        <div className="flex items-center gap-2">
          {addon ? (
            <button
              type="button"
              onClick={handleDelete}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Addon Record</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Addon Record</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded p-8 text-center text-slate-500 text-sm">
          Loading addon record...
        </div>
      ) : !addon ? (
        <div className="w-full space-y-3 pt-1">
          <div className="w-full bg-[#F1F3F5] border border-[#E2E8F0] rounded py-3 text-center text-[13px] text-slate-700 font-sans shadow-2xs">
            No addon record defined for creature template {creatureEntry}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Path ID (`path_id`)</span>
                <InfoTooltip text="Waypoint path ID associated with this creature template (waypoint_data)." />
              </label>
              <input
                type="number"
                value={addon.path_id}
                onChange={(e) => handleChange('path_id', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Mount ID (`mount`)</span>
                <SelectorButton
                  onClick={() =>
                    setEntityModal({
                      open: true,
                      type: 'display',
                      title: 'Select Mount Display',
                      field: 'mount',
                    })
                  }
                />
              </label>
              <input
                type="number"
                value={addon.mount}
                onChange={(e) => handleChange('mount', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Emote (`emote`)</span>
                <SelectorButton
                  onClick={() =>
                    setEntityModal({
                      open: true,
                      type: 'emote',
                      title: 'Select Default Emote',
                      field: 'emote',
                    })
                  }
                />
              </label>
              <input
                type="number"
                value={addon.emote}
                onChange={(e) => handleChange('emote', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Bytes1 (`bytes1`)</span>
                <InfoTooltip text="UNIT_FIELD_BYTES_1 value (StandState, VisFlags, AnimTier)." />
              </label>
              <input
                type="number"
                value={addon.bytes1}
                onChange={(e) => handleChange('bytes1', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Bytes2 (`bytes2`)</span>
                <InfoTooltip text="UNIT_FIELD_BYTES_2 value (SheathState, PvPFlags, PetFlags, ShapeshiftForm)." />
              </label>
              <input
                type="number"
                value={addon.bytes2}
                onChange={(e) => handleChange('bytes2', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Visibility Distance Type</span>
                <InfoTooltip text="Visibility distance category (0: Normal, 1: Tiny, 2: Small, 3: Large, 4: Gigantic, 5: Infinite)." />
              </label>
              <input
                type="number"
                value={addon.visibilityDistanceType}
                onChange={(e) => handleChange('visibilityDistanceType', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>AI Anim Kit (`aiAnimKit`)</span>
                <InfoTooltip text="AnimKit ID played during AI state transitions (AnimKit.db2)." />
              </label>
              <input
                type="number"
                value={addon.aiAnimKit}
                onChange={(e) => handleChange('aiAnimKit', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Movement Anim Kit</span>
                <InfoTooltip text="AnimKit ID played during creature movement (AnimKit.db2)." />
              </label>
              <input
                type="number"
                value={addon.movementAnimKit}
                onChange={(e) => handleChange('movementAnimKit', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Melee Anim Kit</span>
                <InfoTooltip text="AnimKit ID played during melee combat attacks (AnimKit.db2)." />
              </label>
              <input
                type="number"
                value={addon.meleeAnimKit}
                onChange={(e) => handleChange('meleeAnimKit', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="col-span-1 md:col-span-3">
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Inherent Auras (Space-separated Spell IDs)</span>
                <InfoTooltip text="Space-separated list of Spell IDs continuously applied to the creature on spawn." />
              </label>
              <input
                type="text"
                value={addon.auras}
                onChange={(e) => handleChange('auras', e.target.value)}
                placeholder="e.g. 12345 67890"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {entityModal && entityModal.open && (
        <EntitySelectorModal
          isOpen={true}
          onClose={() => setEntityModal(null)}
          type={entityModal.type}
          title={entityModal.title}
          initialValue={addon ? (addon[entityModal.field] as number) : 0}
          onSelect={(id) => {
            if (addon) handleChange(entityModal.field, id);
          }}
        />
      )}
    </div>
  );
};
