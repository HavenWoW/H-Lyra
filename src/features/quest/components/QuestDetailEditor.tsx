// Quest template editor.
//
// Renders the non-reward columns of quest_template as cards driven by the
// schema module, so the form and the generated SQL always cover the same
// columns. The reward columns live in their own sub-tab but share the schema.

import React, { useCallback, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { SqlQueryBar } from '../../../components/SqlQueryBar';
import { FieldCard } from '../../../components/fields/FieldCard';
import { SingleValueSelectorModal } from '../../../components/SingleValueSelectorModal';
import { FlagsSelectorModal } from '../../../components/FlagsSelectorModal';
import { EntitySelectorModal } from '../../../components/EntitySelectorModal';
import { SelectorModalState } from '../types';
import {
  QUEST_TEMPLATE_GROUPS,
  QUEST_TEMPLATE_COLUMN_MAP,
  columnsForGroup,
} from '../schema/questTemplateSchema';
import { generateDiffQuery, generateFullQuery, isQuestModified } from '../utils/questSqlGenerator';
import { useSqlEditorState } from '../../../hooks/useSqlEditorState';

type QuestRecord = Record<string, unknown> & { _isNew?: boolean };

interface QuestDetailEditorProps {
  quest: QuestRecord;
  setQuest: (quest: QuestRecord) => void;
  initialQuest: QuestRecord | null;
  setInitialQuest: (quest: QuestRecord | null) => void;
  onNavigateBack: () => void;
  /** Re-reads the row from the database after a save or a reload. */
  reloadQuest: () => Promise<QuestRecord | null>;
}

export const QuestDetailEditor: React.FC<QuestDetailEditorProps> = ({
  quest,
  setQuest,
  initialQuest,
  setInitialQuest,
  onNavigateBack,
  reloadQuest,
}) => {
  const [activeSelectorModal, setActiveSelectorModal] = useState<SelectorModalState | null>(null);

  const handleFieldChange = useCallback(
    (field: string, value: unknown) => {
      setQuest({ ...quest, [field]: value });
    },
    [quest, setQuest]
  );

  const {
    queryMode,
    setQueryMode,
    activeQueryText,
    isDirty,
    saving,
    copied,
    error,
    handleCopy,
    handleExecute,
    handleExecuteAndCopy,
    handleReload,
  } = useSqlEditorState<QuestRecord>({
    database: 'world',
    record: quest,
    setRecord: setQuest,
    original: initialQuest,
    setOriginal: setInitialQuest,
    generateDiffQuery,
    generateFullQuery,
    isModified: isQuestModified,
    reload: reloadQuest,
  });

  const activeColumn = activeSelectorModal
    ? QUEST_TEMPLATE_COLUMN_MAP[activeSelectorModal.field]
    : undefined;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-hidden select-none font-sans text-slate-800">
      {/* Top Sub-Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-xs flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateBack}
            className="text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded flex items-center gap-1.5 font-medium font-sans transition-colors cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Select Quest</span>
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-sans">
            <span className="text-slate-500 font-sans text-xs">Editing:</span>
            <span className="font-bold text-slate-900 text-xs font-sans">
              {String(quest.LogTitle || 'Untitled Quest')}
            </span>
            <span className="text-slate-500 font-mono text-xs">({String(quest.ID)})</span>
          </div>
          {isDirty && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-amber-100 text-amber-800 border border-amber-300">
              Unsaved Changes
            </span>
          )}
        </div>
      </div>

      {/* Main Form Scroll Canvas */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <SqlQueryBar
          name="quest"
          queryMode={queryMode}
          setQueryMode={setQueryMode}
          activeQueryText={activeQueryText}
          saving={saving}
          copied={copied}
          error={error}
          onCopy={handleCopy}
          onExecute={handleExecute}
          onExecuteAndCopy={handleExecuteAndCopy}
          onReload={handleReload}
        />

        {QUEST_TEMPLATE_GROUPS.map((group) => (
          <FieldCard
            key={group.id}
            title={group.title}
            note={group.note}
            columns={columnsForGroup(group.id)}
            record={quest}
            onChange={handleFieldChange}
            openSelector={setActiveSelectorModal}
          />
        ))}
      </div>

      {/* Single Value Enum Selector Modal */}
      {activeSelectorModal && activeSelectorModal.type === 'single' && activeSelectorModal.options && (
        <SingleValueSelectorModal
          isOpen={true}
          onClose={() => setActiveSelectorModal(null)}
          title={activeSelectorModal.title}
          options={activeSelectorModal.options}
          selectedValue={Number(quest[activeSelectorModal.field] ?? 0)}
          onSelect={(val) => handleFieldChange(activeSelectorModal.field, val)}
        />
      )}

      {/* Bitmask Flags Selector Modal */}
      {activeSelectorModal && activeSelectorModal.type === 'flags' && activeSelectorModal.flags && (
        <FlagsSelectorModal
          isOpen={true}
          onClose={() => setActiveSelectorModal(null)}
          title={activeSelectorModal.title}
          flags={activeSelectorModal.flags}
          currentValue={(quest[activeSelectorModal.field] ?? 0) as number | string}
          isBigInt={activeSelectorModal.isBigInt ?? activeColumn?.bigint}
          width={activeSelectorModal.width}
          signed={activeSelectorModal.signed ?? activeColumn?.signed}
          onSelect={(val) => handleFieldChange(activeSelectorModal.field, val)}
        />
      )}

      {/* Entity Selector Modal */}
      {activeSelectorModal && activeSelectorModal.type === 'entity' && activeSelectorModal.entityType && (
        <EntitySelectorModal
          isOpen={true}
          onClose={() => setActiveSelectorModal(null)}
          type={activeSelectorModal.entityType}
          title={activeSelectorModal.title}
          initialValue={Number(quest[activeSelectorModal.field] ?? 0)}
          onSelect={(id) => handleFieldChange(activeSelectorModal.field, id)}
        />
      )}
    </div>
  );
};
