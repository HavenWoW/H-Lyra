// Editor for the eight spell columns of creature_template.
//
// The same columns also appear in the template editor's Spells card; this view
// exists for working on them in isolation.

import React, { useState } from 'react';
import { Sparkles, Search } from 'lucide-react';
import { SqlQueryBar } from '../../../components/SqlQueryBar';
import { EntitySelectorModal, SelectorType } from '../../../components/EntitySelectorModal';
import { generateDiffQuery, generateFullQuery } from '../utils/creatureSqlGenerator';
import { api } from '../../../lib/ipc';

interface CreatureSpellsTabProps {
  creature: any;
  setCreature?: React.Dispatch<React.SetStateAction<any>>;
  initialCreature?: any;
  setInitialCreature?: (c: any) => void;
  isDirty?: boolean;
  setIsDirty?: (dirty: boolean) => void;
  handleFieldChange: (field: string, value: any) => void;
  openPicker?: (type: SelectorType, targetField: string, title: string) => void;
}

export const CreatureSpellsTab: React.FC<CreatureSpellsTabProps> = ({
  creature,
  setCreature,
  initialCreature,
  setInitialCreature,
  isDirty,
  setIsDirty,
  handleFieldChange,
}) => {
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeModal, setActiveModal] = useState<{
    open: boolean;
    field: string;
    title: string;
  } | null>(null);

  const activeQueryText = queryMode === 'diff'
    ? generateDiffQuery(initialCreature, creature)
    : generateFullQuery(creature);

  const handleCopySql = () => {
    const sql = activeQueryText || generateFullQuery(creature);
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecute = async () => {
    const sql = activeQueryText || generateFullQuery(creature);
    if (!sql) return;
    setSaving(true);
    try {
      await api.executeSql('world', sql);
      if (setInitialCreature) {
        setInitialCreature(JSON.parse(JSON.stringify(creature)));
      }
      setIsDirty?.(false);
    } catch (e) {
      console.error('Execute creature spells query failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    await handleExecute();
    handleCopySql();
  };

  const handleReload = () => {
    if (initialCreature && setCreature) {
      setCreature(JSON.parse(JSON.stringify(initialCreature)));
      setIsDirty?.(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 font-sans select-none text-slate-800">
      {/* Top Query Action Bar */}
      <SqlQueryBar
        name="creature_spells"
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

      <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-slate-800 text-sm">Inherent Creature Spells (spell1 - spell8)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
            const field = `spell${num}`;
            const val = creature[field] || 0;
            return (
              <div key={num} className="p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Spell Slot {num}</span>
                  <span className="text-xs font-mono font-bold text-blue-600">ID: {val || 'None'}</span>
                </div>
                <div className="flex gap-1.5 items-center">
                  <input
                    type="number"
                    value={val}
                    onChange={(e) => handleFieldChange(field, parseInt(e.target.value) || 0)}
                    className="w-28 px-2 py-1 text-xs text-center font-mono border border-slate-300 rounded bg-white focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setActiveModal({ open: true, field, title: `Select Spell ${num}` })}
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-700 cursor-pointer"
                    title="Search Spell"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeModal && activeModal.open && (
        <EntitySelectorModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          type="spell"
          title={activeModal.title}
          initialValue={creature[activeModal.field] || 0}
          onSelect={(id) => {
            handleFieldChange(activeModal.field, id);
            setActiveModal(null);
          }}
        />
      )}
    </div>
  );
};

export default CreatureSpellsTab;
