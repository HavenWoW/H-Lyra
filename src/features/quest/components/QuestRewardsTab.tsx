// Rewards & Currency sub-tab.
//
// Edits the reward columns of quest_template. It shares the schema and the
// generators with the main template editor, so both write the same 123-column
// lossless query; this tab just renders a different set of cards.

import React, { useCallback, useState } from 'react';
import { SqlQueryBar } from '../../../components/SqlQueryBar';
import { FieldCard } from '../../../components/fields/FieldCard';
import { FlagsSelectorModal } from '../../../components/FlagsSelectorModal';
import { EntitySelectorModal } from '../../../components/EntitySelectorModal';
import { SelectorModalState } from '../types';
import {
  QUEST_REWARD_GROUPS,
  QUEST_TEMPLATE_COLUMN_MAP,
  columnsForGroup,
} from '../schema/questTemplateSchema';
import { generateDiffQuery, generateFullQuery, isQuestModified } from '../utils/questSqlGenerator';
import { useSqlEditorState } from '../../../hooks/useSqlEditorState';

type QuestRecord = Record<string, unknown> & { _isNew?: boolean };

interface QuestRewardsTabProps {
  quest: QuestRecord;
  setQuest: (quest: QuestRecord) => void;
  initialQuest: QuestRecord | null;
  setInitialQuest: (quest: QuestRecord | null) => void;
  reloadQuest: () => Promise<QuestRecord | null>;
}

export const QuestRewardsTab: React.FC<QuestRewardsTabProps> = ({
  quest,
  setQuest,
  initialQuest,
  setInitialQuest,
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
    <div className="p-4 space-y-4">
      <SqlQueryBar
        name="quest-rewards"
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

      {QUEST_REWARD_GROUPS.map((group) => (
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
