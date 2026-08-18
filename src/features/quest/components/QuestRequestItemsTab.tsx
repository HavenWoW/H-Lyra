// Editor for quest_request_items: the turn-in text and required items.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { QuestRequestItemsRow } from '../types';
import { InfoTooltip, SelectorButton } from './QuestTooltip';
import { EntitySelectorModal, SelectorType } from '../../../components/EntitySelectorModal';
import { SqlQueryBar } from '../../../components/SqlQueryBar';
import { formatSqlValue } from '../../../lib/sql';
import { generateCollectionReplace } from '../../../lib/collectionSql';
import {
  QUEST_REQUEST_ITEMS_TABLE,
  QUEST_REQUEST_ITEMS_SCOPE_COLUMN,
  QUEST_REQUEST_ITEMS_COLUMNS,
} from '../schema/questRequestItemsSchema';

/** An empty text box means "no text" — stored as NULL, not an empty string. */
const textOrNull = (value: unknown): string | null => (value ? String(value) : null);

interface QuestRequestItemsTabProps {
  questId: number;
}

export const QuestRequestItemsTab: React.FC<QuestRequestItemsTabProps> = ({ questId }) => {
  const [request, setRequest] = useState<QuestRequestItemsRow | null>(null);
  const [initialRequest, setInitialRequest] = useState<QuestRequestItemsRow | null>(null);
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
    field: keyof QuestRequestItemsRow;
  } | null>(null);

  useEffect(() => {
    loadRequest();
  }, [questId]);

  const loadRequest = async () => {
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT ID, EmoteOnComplete, EmoteOnIncomplete, EmoteOnCompleteDelay, EmoteOnIncompleteDelay, CompletionText, VerifiedBuild FROM \`quest_request_items\` WHERE \`ID\` = ${questId} LIMIT 1;`
      );
      if (res && res.success && res.rows && res.rows.length > 0) {
        const r = res.rows[0];
        const loaded: QuestRequestItemsRow = {
          ID: Number(r[0]),
          EmoteOnComplete: Number(r[1]) || 0,
          EmoteOnIncomplete: Number(r[2]) || 0,
          EmoteOnCompleteDelay: Number(r[3]) || 0,
          EmoteOnIncompleteDelay: Number(r[4]) || 0,
          CompletionText: r[5] ? String(r[5]) : '',
          VerifiedBuild: Number(r[6]) || 0,
        };
        setRequest(loaded);
        setInitialRequest(JSON.parse(JSON.stringify(loaded)));
      } else {
        setRequest(null);
        setInitialRequest(null);
      }
      setIsDirty(false);
    } catch {
      setRequest(null);
      setInitialRequest(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    const fresh: QuestRequestItemsRow = {
      ID: questId,
      EmoteOnComplete: 0,
      EmoteOnIncomplete: 0,
      EmoteOnCompleteDelay: 0,
      EmoteOnIncompleteDelay: 0,
      CompletionText: '',
      VerifiedBuild: 0,
    };
    setRequest(fresh);
    setIsDirty(true);
  };

  const handleChange = (field: keyof QuestRequestItemsRow, value: any) => {
    if (!request) return;
    setRequest({ ...request, [field]: value });
    setIsDirty(true);
  };

  /** The request row shaped for the schema-driven generators. */
  const requestRow = (row: QuestRequestItemsRow): Record<string, unknown> => ({
    ...row,
    ID: questId,
    CompletionText: textOrNull(row.CompletionText),
  });

  const generateFullQuery = (): string => {
    if (!request) return '';
    return generateCollectionReplace(
      QUEST_REQUEST_ITEMS_TABLE,
      { column: QUEST_REQUEST_ITEMS_SCOPE_COLUMN, value: questId },
      QUEST_REQUEST_ITEMS_COLUMNS,
      [requestRow(request)]
    );
  };

  const generateDiffQuery = (): string => {
    if (!request) return '';
    if (!initialRequest) return generateFullQuery();

    const current = requestRow(request);
    const original = requestRow(initialRequest);
    const changes: string[] = [];
    for (const col of QUEST_REQUEST_ITEMS_COLUMNS) {
      if (col.name === QUEST_REQUEST_ITEMS_SCOPE_COLUMN) continue; // ID is the key
      const fmt = (v: unknown) => formatSqlValue(v, { kind: col.kind, nullable: !!col.nullable });
      if (fmt(current[col.name]) !== fmt(original[col.name])) {
        changes.push(`\`${col.name}\` = ${fmt(current[col.name])}`);
      }
    }

    if (changes.length === 0) return '';

    return `UPDATE \`quest_request_items\` SET
  ${changes.join(',\n  ')}
WHERE \`ID\` = ${questId};`;
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
      setInitialRequest(request ? JSON.parse(JSON.stringify(request)) : null);
      setIsDirty(false);
    } catch (e) {
      console.error('Save request items failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    await handleExecute();
    handleCopySql();
  };

  const handleReload = () => {
    if (initialRequest) {
      setRequest(JSON.parse(JSON.stringify(initialRequest)));
      setIsDirty(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete quest request items record?')) return;
    setSaving(true);
    try {
      await api.executeSql('world', `DELETE FROM \`quest_request_items\` WHERE \`ID\` = ${questId};`);
      setRequest(null);
      setInitialRequest(null);
      setIsDirty(false);
    } catch (e) {
      console.error('Delete request items failed:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 font-sans select-none text-slate-800">
      {/* Top Query Action Bar */}
      {request && (
        <SqlQueryBar
          name="quest_request_items"
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
          <h2 className="text-base text-slate-800 font-semibold">Request Items Text & Progress Emotes</h2>
          <p className="text-xs text-slate-500 font-mono">
            Table: <code className="text-blue-600 font-bold">quest_request_items</code> (Quest ID: {questId})
          </p>
        </div>
        <div className="flex items-center gap-2">
          {request ? (
            <button
              type="button"
              onClick={handleDelete}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Record</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Record</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded p-8 text-center text-slate-500 text-sm">
          Loading request items record...
        </div>
      ) : !request ? (
        <div className="w-full space-y-3 pt-1">
          <div className="w-full bg-[#F1F3F5] border border-[#E2E8F0] rounded py-3 text-center text-[13px] text-slate-700 font-sans shadow-2xs">
            No in-progress request items record defined for quest {questId}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm space-y-4 text-xs font-sans">
          <div>
            <label className="block text-slate-700 font-bold mb-1 flex items-center">
              <span>In-Progress / Completion Text (`CompletionText`)</span>
              <InfoTooltip text="Text displayed when talking to the quest giver while the quest is currently in progress." />
            </label>
            <textarea
              value={request.CompletionText}
              onChange={(e) => handleChange('CompletionText', e.target.value)}
              rows={4}
              placeholder="Text displayed when speaking to NPC while quest is in progress..."
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-sans focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
              <span className="font-bold text-slate-800">Emote on Complete</span>
              <div>
                <label className="block text-slate-700 font-bold mb-0.5 flex items-center">
                  <span>Emote ID</span>
                  <SelectorButton
                    onClick={() =>
                      setEntityModal({
                        open: true,
                        type: 'emote',
                        title: 'Select Emote on Complete',
                        field: 'EmoteOnComplete',
                      })
                    }
                  />
                </label>
                <input
                  type="number"
                  value={request.EmoteOnComplete}
                  onChange={(e) => handleChange('EmoteOnComplete', Number(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-0.5 flex items-center">
                  <span>Delay (ms)</span>
                  <InfoTooltip text="Delay in milliseconds before playing emote on complete." />
                </label>
                <input
                  type="number"
                  value={request.EmoteOnCompleteDelay}
                  onChange={(e) => handleChange('EmoteOnCompleteDelay', Number(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
              <span className="font-bold text-slate-800">Emote on Incomplete</span>
              <div>
                <label className="block text-slate-700 font-bold mb-0.5 flex items-center">
                  <span>Emote ID</span>
                  <SelectorButton
                    onClick={() =>
                      setEntityModal({
                        open: true,
                        type: 'emote',
                        title: 'Select Emote on Incomplete',
                        field: 'EmoteOnIncomplete',
                      })
                    }
                  />
                </label>
                <input
                  type="number"
                  value={request.EmoteOnIncomplete}
                  onChange={(e) => handleChange('EmoteOnIncomplete', Number(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-0.5 flex items-center">
                  <span>Delay (ms)</span>
                  <InfoTooltip text="Delay in milliseconds before playing emote on incomplete." />
                </label>
                <input
                  type="number"
                  value={request.EmoteOnIncompleteDelay}
                  onChange={(e) => handleChange('EmoteOnIncompleteDelay', Number(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
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
          initialValue={request ? (request[entityModal.field] as number) : 0}
          onSelect={(id) => {
            if (request) handleChange(entityModal.field, id);
          }}
        />
      )}
    </div>
  );
};
