// Editor for gameobject_template_addon: the per-template addon covering faction,
// flags and world effects.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Copy, Check } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { GameObjectTemplateAddon } from '../types';
import { InfoTooltip, SelectorButton } from './GameObjectTooltip';
import { FlagsSelectorModal } from '../../../components/FlagsSelectorModal';
import { EntitySelectorModal, SelectorType } from '../../../components/EntitySelectorModal';
import { GAMEOBJECT_FLAGS } from '../../../constants/gameObjectOptions';
import { generateCollectionReplace } from '../../../lib/collectionSql';
import {
  GAMEOBJECT_TEMPLATE_ADDON_TABLE,
  GAMEOBJECT_TEMPLATE_ADDON_SCOPE_COLUMN,
  GAMEOBJECT_TEMPLATE_ADDON_COLUMNS,
} from '../schema/gameObjectTemplateAddonSchema';

import { SqlQueryBar } from '../../../components/SqlQueryBar';

interface GameObjectAddonTabProps {
  goEntry: number;
}

export const GameObjectAddonTab: React.FC<GameObjectAddonTabProps> = ({ goEntry }) => {
  const [addon, setAddon] = useState<GameObjectTemplateAddon | null>(null);
  const [initialAddon, setInitialAddon] = useState<GameObjectTemplateAddon | null>(null);
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Modals
  const [flagsModal, setFlagsModal] = useState<{
    open: boolean;
    title: string;
    field: keyof GameObjectTemplateAddon;
    flags: any[];
  } | null>(null);

  const [entityModal, setEntityModal] = useState<{
    open: boolean;
    type: SelectorType;
    title: string;
    field: keyof GameObjectTemplateAddon;
  } | null>(null);

  useEffect(() => {
    loadAddon();
  }, [goEntry]);

  const loadAddon = async () => {
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT entry, faction, flags, mingold, maxgold, WorldEffectID, AIAnimKitID FROM \`gameobject_template_addon\` WHERE \`entry\` = ${goEntry} LIMIT 1;`
      );
      if (res && res.success && res.rows && res.rows.length > 0) {
        const r = res.rows[0];
        const loaded: GameObjectTemplateAddon = {
          entry: Number(r[0]),
          faction: Number(r[1]) || 0,
          flags: Number(r[2]) || 0,
          mingold: Number(r[3]) || 0,
          maxgold: Number(r[4]) || 0,
          WorldEffectID: Number(r[5]) || 0,
          AIAnimKitID: Number(r[6]) || 0,
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
    const fresh: GameObjectTemplateAddon = {
      entry: goEntry,
      faction: 0,
      flags: 0,
      mingold: 0,
      maxgold: 0,
      WorldEffectID: 0,
      AIAnimKitID: 0,
    };
    setAddon(fresh);
    setIsDirty(true);
  };

  const handleChange = (field: keyof GameObjectTemplateAddon, value: any) => {
    if (!addon) return;
    setAddon({ ...addon, [field]: value });
    setIsDirty(true);
  };

  const generateFullQuery = (): string => {
    if (!addon) return '';
    return generateCollectionReplace(
      GAMEOBJECT_TEMPLATE_ADDON_TABLE,
      { column: GAMEOBJECT_TEMPLATE_ADDON_SCOPE_COLUMN, value: goEntry },
      GAMEOBJECT_TEMPLATE_ADDON_COLUMNS,
      [{ ...addon, entry: goEntry }]
    );
  };

  const generateDiffQuery = (): string => {
    if (!addon) return '';
    if (!initialAddon) return generateFullQuery();

    const changes: string[] = [];
    for (const col of GAMEOBJECT_TEMPLATE_ADDON_COLUMNS) {
      if (col.name === GAMEOBJECT_TEMPLATE_ADDON_SCOPE_COLUMN) continue; // entry is the key
      const current = Number((addon as unknown as Record<string, unknown>)[col.name] ?? 0);
      const initial = Number((initialAddon as unknown as Record<string, unknown>)[col.name] ?? 0);
      if (current !== initial) {
        changes.push(`\`${col.name}\` = ${current}`);
      }
    }

    if (changes.length === 0) return '';

    return `UPDATE \`gameobject_template_addon\` SET
  ${changes.join(',\n  ')}
WHERE \`entry\` = ${goEntry};`;
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
    if (!confirm(`Are you sure you want to delete template addon for GameObject ${goEntry}?`)) return;
    setSaving(true);
    try {
      await api.executeSql('world', `DELETE FROM \`gameobject_template_addon\` WHERE \`entry\` = ${goEntry};`);
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
          name="game_object_addon"
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

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">GameObject Template Addon</h2>
            <p className="text-xs text-slate-500 font-mono">bfa_world.gameobject_template_addon [entry: {goEntry}]</p>
          </div>

          <div className="flex items-center gap-2">
            {addon && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Addon</span>
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading addon record...</div>
        ) : !addon ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-xs text-slate-500">No template addon record exists for GameObject {goEntry}.</p>
            <button
              type="button"
              onClick={handleCreate}
              className="px-3.5 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Template Addon</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-3 text-xs">
            <div className="col-span-6 sm:col-span-3 space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center">
                <span>faction</span>
                <SelectorButton
                  onClick={() =>
                    setEntityModal({
                      open: true,
                      type: 'faction',
                      title: 'Select Faction',
                      field: 'faction',
                    })
                  }
                />
              </label>
              <input
                type="number"
                value={addon.faction}
                onChange={(e) => handleChange('faction', Number(e.target.value) || 0)}
                className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2.5 py-1.5 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="col-span-6 sm:col-span-3 space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center">
                <span>flags</span>
                <SelectorButton
                  onClick={() =>
                    setFlagsModal({
                      open: true,
                      title: 'GameObject Flags',
                      field: 'flags',
                      flags: GAMEOBJECT_FLAGS,
                    })
                  }
                />
              </label>
              <input
                type="number"
                value={addon.flags}
                onChange={(e) => handleChange('flags', Number(e.target.value) || 0)}
                className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2.5 py-1.5 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="col-span-6 sm:col-span-3 space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center">
                <span>mingold (copper)</span>
                <InfoTooltip text="Minimum money contained in copper when opened / looted." />
              </label>
              <input
                type="number"
                value={addon.mingold}
                onChange={(e) => handleChange('mingold', Number(e.target.value) || 0)}
                className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2.5 py-1.5 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="col-span-6 sm:col-span-3 space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center">
                <span>maxgold (copper)</span>
                <InfoTooltip text="Maximum money contained in copper when opened / looted." />
              </label>
              <input
                type="number"
                value={addon.maxgold}
                onChange={(e) => handleChange('maxgold', Number(e.target.value) || 0)}
                className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2.5 py-1.5 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="col-span-6 sm:col-span-3 space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center">
                <span>WorldEffectID</span>
                <InfoTooltip text="WorldEffect.db2 record ID attached to this GameObject." />
              </label>
              <input
                type="number"
                value={addon.WorldEffectID}
                onChange={(e) => handleChange('WorldEffectID', Number(e.target.value) || 0)}
                className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2.5 py-1.5 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="col-span-6 sm:col-span-3 space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center">
                <span>AIAnimKitID</span>
                <InfoTooltip text="AnimKit.db2 record ID for the GameObject's AI animation." />
              </label>
              <input
                type="number"
                value={addon.AIAnimKitID}
                onChange={(e) => handleChange('AIAnimKitID', Number(e.target.value) || 0)}
                className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2.5 py-1.5 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bitmask Flags Modal */}
      {flagsModal && flagsModal.open && (
        <FlagsSelectorModal
          isOpen={true}
          onClose={() => setFlagsModal(null)}
          title={flagsModal.title}
          flags={flagsModal.flags}
          currentValue={addon ? (addon[flagsModal.field] as number) : 0}
          onSelect={(val) => {
            if (addon) handleChange(flagsModal.field, val);
          }}
        />
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
