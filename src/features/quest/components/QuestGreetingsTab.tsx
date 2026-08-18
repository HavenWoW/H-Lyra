// Editor for quest_greeting and quest_details: the text shown when a quest is
// offered.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Copy, Check } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { QuestGreetingRow } from '../types';
import { SqlQueryBar } from '../../../components/SqlQueryBar';
import { generateCollectionReplace } from '../../../lib/collectionSql';
import {
  QUEST_GREETING_TABLE,
  QUEST_GREETING_SCOPE_COLUMN,
  QUEST_GREETING_COLUMNS,
} from '../schema/questGreetingSchema';
import {
  QUEST_DETAILS_TABLE,
  QUEST_DETAILS_SCOPE_COLUMN,
  QUEST_DETAILS_COLUMNS,
} from '../schema/questDetailsSchema';

interface QuestGreetingsTabProps {
  questId: number;
}

export const QuestGreetingsTab: React.FC<QuestGreetingsTabProps> = ({ questId }) => {
  const [greetings, setGreetings] = useState<QuestGreetingRow[]>([]);
  const [initialGreetings, setInitialGreetings] = useState<QuestGreetingRow[]>([]);
  const [details, setDetails] = useState<any | null>(null);
  const [initialDetails, setInitialDetails] = useState<any | null>(null);
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    loadGreetingsAndDetails();
  }, [questId]);

  const loadGreetingsAndDetails = async () => {
    setLoading(true);
    try {
      const [gRes, dRes] = await Promise.all([
        api.executeSql(
          'world',
          `SELECT ID, Type, GreetEmoteType, GreetEmoteDelay, Greeting, VerifiedBuild FROM \`quest_greeting\` WHERE \`ID\` = ${questId} ORDER BY \`Type\` ASC;`
        ),
        api.executeSql(
          'world',
          `SELECT ID, Emote1, Emote2, Emote3, Emote4, EmoteDelay1, EmoteDelay2, EmoteDelay3, EmoteDelay4, VerifiedBuild FROM \`quest_details\` WHERE \`ID\` = ${questId} LIMIT 1;`
        ),
      ]);

      if (gRes && gRes.success && gRes.rows) {
        const list = gRes.rows.map((r: any[]) => ({
          ID: Number(r[0]),
          Type: Number(r[1]) || 0,
          GreetEmoteType: Number(r[2]) || 0,
          GreetEmoteDelay: Number(r[3]) || 0,
          Greeting: r[4] ? String(r[4]) : '',
          VerifiedBuild: Number(r[5]) || 0,
        }));
        setGreetings(list);
        setInitialGreetings(JSON.parse(JSON.stringify(list)));
      } else {
        setGreetings([]);
        setInitialGreetings([]);
      }

      if (dRes && dRes.success && dRes.rows && dRes.rows.length > 0) {
        const dr = dRes.rows[0];
        const dObj = {
          ID: Number(dr[0]),
          Emote1: Number(dr[1]) || 0,
          Emote2: Number(dr[2]) || 0,
          Emote3: Number(dr[3]) || 0,
          Emote4: Number(dr[4]) || 0,
          EmoteDelay1: Number(dr[5]) || 0,
          EmoteDelay2: Number(dr[6]) || 0,
          EmoteDelay3: Number(dr[7]) || 0,
          EmoteDelay4: Number(dr[8]) || 0,
          VerifiedBuild: Number(dr[9]) || 0,
        };
        setDetails(dObj);
        setInitialDetails(JSON.parse(JSON.stringify(dObj)));
      } else {
        setDetails(null);
        setInitialDetails(null);
      }

      setIsDirty(false);
    } catch {
      setGreetings([]);
      setInitialGreetings([]);
      setDetails(null);
      setInitialDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGreeting = () => {
    const nextType = greetings.length === 0 ? 0 : Math.max(...greetings.map(g => g.Type)) + 1;
    setGreetings([
      ...greetings,
      {
        ID: questId,
        Type: nextType,
        GreetEmoteType: 0,
        GreetEmoteDelay: 0,
        Greeting: '',
        VerifiedBuild: 0,
      },
    ]);
    setIsDirty(true);
  };

  const handleUpdateGreeting = (index: number, field: keyof QuestGreetingRow, value: any) => {
    const updated = [...greetings];
    updated[index] = { ...updated[index], [field]: value };
    setGreetings(updated);
    setIsDirty(true);
  };

  const handleRemoveGreeting = (index: number) => {
    setGreetings(greetings.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const handleCreateDetails = () => {
    const fresh = {
      ID: questId,
      Emote1: 0,
      Emote2: 0,
      Emote3: 0,
      Emote4: 0,
      EmoteDelay1: 0,
      EmoteDelay2: 0,
      EmoteDelay3: 0,
      EmoteDelay4: 0,
      VerifiedBuild: 0,
    };
    setDetails(fresh);
    setIsDirty(true);
  };

  const handleUpdateDetails = (field: string, value: any) => {
    if (!details) return;
    setDetails({ ...details, [field]: value });
    setIsDirty(true);
  };

  const handleDeleteDetails = () => {
    setDetails(null);
    setIsDirty(true);
  };

  const generateFullQuery = () => {
    // Rows are keyed by ID (the quest id here) and written through the shared
    // collection generator, so text is escaped and NULL is handled uniformly.
    const greetingRows = greetings.map((g) => ({
      ID: questId,
      Type: g.Type,
      GreetEmoteType: g.GreetEmoteType || 0,
      GreetEmoteDelay: g.GreetEmoteDelay || 0,
      Greeting: g.Greeting ? g.Greeting : null,
      VerifiedBuild: g.VerifiedBuild || 0,
    }));
    const detailsRows = details ? [{ ...details, ID: questId }] : [];

    const greetingSql = generateCollectionReplace(
      QUEST_GREETING_TABLE,
      { column: QUEST_GREETING_SCOPE_COLUMN, value: questId },
      QUEST_GREETING_COLUMNS,
      greetingRows
    );
    const detailsSql = generateCollectionReplace(
      QUEST_DETAILS_TABLE,
      { column: QUEST_DETAILS_SCOPE_COLUMN, value: questId },
      QUEST_DETAILS_COLUMNS,
      detailsRows
    );
    return [greetingSql, detailsSql].join('\n\n');
  };

  // The collection is written as a scoped DELETE + INSERT, so the diff statement
  // is the same replace. It is only emitted once something has actually changed,
  // leaving the diff query empty for an untouched tab.
  const activeQueryText = queryMode === 'diff' && !isDirty ? '' : generateFullQuery();

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
      setInitialGreetings(JSON.parse(JSON.stringify(greetings)));
      setInitialDetails(details ? JSON.parse(JSON.stringify(details)) : null);
      setIsDirty(false);
    } catch (e) {
      console.error('Save greetings failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    await handleExecute();
    handleCopySql();
  };

  const handleReload = () => {
    setGreetings(JSON.parse(JSON.stringify(initialGreetings)));
    setDetails(initialDetails ? JSON.parse(JSON.stringify(initialDetails)) : null);
    setIsDirty(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 font-sans select-none">
      {/* Top Query Action Bar */}
      <SqlQueryBar
        name="quest_greetings"
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
          <h2 className="text-base text-slate-800 font-semibold">Greetings & Quest Details</h2>
          <p className="text-xs text-slate-500 font-mono">
            Tables: <code className="text-blue-600 font-bold">quest_greeting</code> & <code className="text-blue-600 font-bold">quest_details</code> (Quest ID: {questId})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddGreeting}
            className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Greeting</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded p-8 text-center text-slate-500 text-sm">
          Loading greetings and details...
        </div>
      ) : (
        <div className="space-y-4">
          {/* Greetings List */}
          <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-slate-800 text-sm">Quest NPC Greetings (`quest_greeting`)</h3>
            {greetings.length === 0 ? (
              <div className="text-center py-3 text-xs text-slate-500 font-mono">No custom NPC greetings</div>
            ) : (
              <div className="space-y-3">
                {greetings.map((g, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">Type:</span>
                        <input
                          type="number"
                          value={g.Type}
                          onChange={(e) => handleUpdateGreeting(idx, 'Type', Number(e.target.value) || 0)}
                          className="w-16 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveGreeting(idx)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-0.5">Greeting Text</label>
                      <textarea
                        value={g.Greeting}
                        onChange={(e) => handleUpdateGreeting(idx, 'Greeting', e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-sans focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-0.5">Greet Emote Type</label>
                        <input
                          type="number"
                          value={g.GreetEmoteType}
                          onChange={(e) => handleUpdateGreeting(idx, 'GreetEmoteType', Number(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-0.5">Greet Emote Delay (ms)</label>
                        <input
                          type="number"
                          value={g.GreetEmoteDelay}
                          onChange={(e) => handleUpdateGreeting(idx, 'GreetEmoteDelay', Number(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-semibold text-slate-800 text-sm">Quest Details Start Emotes (`quest_details`)</h3>
              {!details && (
                <button
                  type="button"
                  onClick={handleCreateDetails}
                  className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Details Record</span>
                </button>
              )}
            </div>

            {details && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                  <span className="font-semibold text-slate-800">Emote 1</span>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Emote ID 1</label>
                    <input
                      type="number"
                      value={details.Emote1}
                      onChange={(e) => {
                        setDetails({ ...details, Emote1: Number(e.target.value) || 0 });
                        setIsDirty(true);
                      }}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Delay 1 (ms)</label>
                    <input
                      type="number"
                      value={details.EmoteDelay1}
                      onChange={(e) => {
                        setDetails({ ...details, EmoteDelay1: Number(e.target.value) || 0 });
                        setIsDirty(true);
                      }}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                  <span className="font-semibold text-slate-800">Emote 2</span>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Emote ID 2</label>
                    <input
                      type="number"
                      value={details.Emote2}
                      onChange={(e) => {
                        setDetails({ ...details, Emote2: Number(e.target.value) || 0 });
                        setIsDirty(true);
                      }}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Delay 2 (ms)</label>
                    <input
                      type="number"
                      value={details.EmoteDelay2}
                      onChange={(e) => {
                        setDetails({ ...details, EmoteDelay2: Number(e.target.value) || 0 });
                        setIsDirty(true);
                      }}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                  <span className="font-semibold text-slate-800">Emote 3</span>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Emote ID 3</label>
                    <input
                      type="number"
                      value={details.Emote3}
                      onChange={(e) => {
                        setDetails({ ...details, Emote3: Number(e.target.value) || 0 });
                        setIsDirty(true);
                      }}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Delay 3 (ms)</label>
                    <input
                      type="number"
                      value={details.EmoteDelay3}
                      onChange={(e) => {
                        setDetails({ ...details, EmoteDelay3: Number(e.target.value) || 0 });
                        setIsDirty(true);
                      }}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                  <span className="font-semibold text-slate-800">Emote 4</span>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Emote ID 4</label>
                    <input
                      type="number"
                      value={details.Emote4}
                      onChange={(e) => {
                        setDetails({ ...details, Emote4: Number(e.target.value) || 0 });
                        setIsDirty(true);
                      }}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Delay 4 (ms)</label>
                    <input
                      type="number"
                      value={details.EmoteDelay4}
                      onChange={(e) => {
                        setDetails({ ...details, EmoteDelay4: Number(e.target.value) || 0 });
                        setIsDirty(true);
                      }}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
