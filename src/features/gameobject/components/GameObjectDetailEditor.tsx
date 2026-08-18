// GameObject template editor, covering gameobject_template.
//
// Renders the Identity/Scripting/Advanced columns as shared FieldCards and the
// polymorphic Data0..Data33 columns as a dedicated type-aware card, all from the
// same schema, so the form and the generated SQL always cover the same columns.

import React, { useCallback, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { SqlQueryBar } from '../../../components/SqlQueryBar';
import { FieldCard } from '../../../components/fields/FieldCard';
import { GameObjectDataCard } from './GameObjectDataCard';
import { SingleValueSelectorModal } from '../../../components/SingleValueSelectorModal';
import { FlagsSelectorModal } from '../../../components/FlagsSelectorModal';
import { EntitySelectorModal } from '../../../components/EntitySelectorModal';
import { SelectorModalState } from '../types';
import {
  GAMEOBJECT_TEMPLATE_GROUPS,
  GAMEOBJECT_TEMPLATE_COLUMN_MAP,
  columnsForGroup,
} from '../schema/gameObjectTemplateSchema';
import {
  generateDiffQuery,
  generateFullQuery,
  isGameObjectModified,
} from '../utils/gameObjectSqlGenerator';
import { useSqlEditorState } from '../../../hooks/useSqlEditorState';

type GameObjectRecord = Record<string, unknown> & { _isNew?: boolean };

interface GameObjectDetailEditorProps {
  go: GameObjectRecord;
  setGo: (go: GameObjectRecord) => void;
  initialGo: GameObjectRecord | null;
  setInitialGo: (go: GameObjectRecord | null) => void;
  onNavigateBack: () => void;
  reloadGameObject: () => Promise<GameObjectRecord | null>;
}

export const GameObjectDetailEditor: React.FC<GameObjectDetailEditorProps> = ({
  go,
  setGo,
  initialGo,
  setInitialGo,
  onNavigateBack,
  reloadGameObject,
}) => {
  const [activeSelectorModal, setActiveSelectorModal] = useState<SelectorModalState | null>(null);

  const handleFieldChange = useCallback(
    (field: string, value: unknown) => {
      setGo({ ...go, [field]: value });
    },
    [go, setGo]
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
  } = useSqlEditorState<GameObjectRecord>({
    database: 'world',
    record: go,
    setRecord: setGo,
    original: initialGo,
    setOriginal: setInitialGo,
    generateDiffQuery,
    generateFullQuery,
    isModified: isGameObjectModified,
    reload: reloadGameObject,
  });

  const activeColumn = activeSelectorModal
    ? GAMEOBJECT_TEMPLATE_COLUMN_MAP[activeSelectorModal.field]
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
            <span>Select Game Object</span>
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-sans">
            <span className="text-slate-500 font-sans text-xs">Editing:</span>
            <span className="font-bold text-slate-900 text-xs font-sans">
              {String(go.name || 'Unnamed GameObject')}
            </span>
            <span className="text-slate-500 font-mono text-xs">({String(go.entry)})</span>
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
          name="game_object"
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

        {GAMEOBJECT_TEMPLATE_GROUPS.map((group) => (
          <FieldCard
            key={group.id}
            title={group.title}
            note={group.note}
            columns={columnsForGroup(group.id)}
            record={go}
            onChange={handleFieldChange}
            openSelector={setActiveSelectorModal}
          />
        ))}

        <GameObjectDataCard go={go} onChange={handleFieldChange} openSelector={setActiveSelectorModal} />
      </div>

      {/* Single Value Enum Selector Modal */}
      {activeSelectorModal && activeSelectorModal.type === 'single' && activeSelectorModal.options && (
        <SingleValueSelectorModal
          isOpen={true}
          onClose={() => setActiveSelectorModal(null)}
          title={activeSelectorModal.title}
          options={activeSelectorModal.options}
          selectedValue={Number(go[activeSelectorModal.field] ?? 0)}
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
          currentValue={(go[activeSelectorModal.field] ?? 0) as number | string}
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
          initialValue={Number(go[activeSelectorModal.field] ?? 0)}
          onSelect={(id) => handleFieldChange(activeSelectorModal.field, id)}
        />
      )}
    </div>
  );
};
