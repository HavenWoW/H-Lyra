// Editor for creature_text: the text lines SmartAI and scripts can make the
// creature say.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Copy, Check } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { InfoTooltip, SelectorButton } from './CreatureTooltip';
import { EntitySelectorModal, SelectorType } from '../../../components/EntitySelectorModal';

import { SqlQueryBar } from '../../../components/SqlQueryBar';
import { escapeSqlString, quoteSqlString } from '../../../lib/sql';

export interface CreatureTextRow {
  CreatureID: number;
  GroupID: number;
  ID: number;
  Text: string;
  Type: number;
  Language: number;
  Probability: number;
  Emote: number;
  Duration: number;
  Sound: number;
  BroadcastTextId: number;
  TextRange: number;
  comment: string;
}

const CHAT_TYPES = [
  { value: 12, label: '12 - Say' },
  { value: 14, label: '14 - Yell' },
  { value: 16, label: '16 - Text Emote' },
  { value: 41, label: '41 - Boss Whisper' },
  { value: 42, label: '42 - Boss Emote' },
  { value: 15, label: '15 - Whisper' },
];

interface CreatureTextsTabProps {
  creatureEntry: number;
}

export const CreatureTextsTab: React.FC<CreatureTextsTabProps> = ({ creatureEntry }) => {
  const [texts, setTexts] = useState<CreatureTextRow[]>([]);
  const [initialTexts, setInitialTexts] = useState<CreatureTextRow[]>([]);
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
    field: keyof CreatureTextRow;
  } | null>(null);

  useEffect(() => {
    loadTexts();
  }, [creatureEntry]);

  const loadTexts = async () => {
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT CreatureID, GroupID, ID, Text, Type, Language, Probability, Emote, Duration, Sound, BroadcastTextId, TextRange, comment FROM \`creature_text\` WHERE \`CreatureID\` = ${creatureEntry} ORDER BY \`GroupID\` ASC, \`ID\` ASC;`
      );
      if (res && res.success && res.rows) {
        const list = res.rows.map((r: any[]) => ({
          CreatureID: Number(r[0]),
          GroupID: Number(r[1]) || 0,
          ID: Number(r[2]) || 0,
          Text: r[3] ? String(r[3]) : '',
          Type: Number(r[4]) || 12,
          Language: Number(r[5]) || 0,
          Probability: Number(r[6]) || 100,
          Emote: Number(r[7]) || 0,
          Duration: Number(r[8]) || 0,
          Sound: Number(r[9]) || 0,
          BroadcastTextId: Number(r[10]) || 0,
          TextRange: Number(r[11]) || 0,
          comment: r[12] ? String(r[12]) : '',
        }));
        setTexts(list);
        setInitialTexts(JSON.parse(JSON.stringify(list)));
      } else {
        setTexts([]);
        setInitialTexts([]);
      }
      setIsDirty(false);
    } catch {
      setTexts([]);
      setInitialTexts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddText = () => {
    const nextGroup = texts.length === 0 ? 0 : Math.max(...texts.map(t => t.GroupID)) + 1;
    setTexts([
      ...texts,
      {
        CreatureID: creatureEntry,
        GroupID: nextGroup,
        ID: 0,
        Text: 'Speech text...',
        Type: 12,
        Language: 0,
        Probability: 100,
        Emote: 0,
        Duration: 0,
        Sound: 0,
        BroadcastTextId: 0,
        TextRange: 0,
        comment: '',
      },
    ]);
    setIsDirty(true);
  };

  const handleUpdate = (index: number, field: keyof CreatureTextRow, value: any) => {
    const updated = [...texts];
    updated[index] = { ...updated[index], [field]: value };
    setTexts(updated);
    setIsDirty(true);
  };

  const handleRemove = (index: number) => {
    setTexts(texts.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const generateFullQuery = () => {
    if (texts.length === 0) {
      return `DELETE FROM \`creature_text\` WHERE \`CreatureID\` = ${creatureEntry};`;
    }

    const values = texts
      .map(
        t =>
          `  (${creatureEntry}, ${t.GroupID}, ${t.ID}, ${quoteSqlString((t.Text || ''))}, ${t.Type || 12}, ${t.Language || 0}, ${t.Probability || 100}, ${t.Emote || 0}, ${t.Duration || 0}, ${t.Sound || 0}, ${t.BroadcastTextId || 0}, ${t.TextRange || 0}, ${quoteSqlString((t.comment || ''))})`
      )
      .join(',\n');

    return `DELETE FROM \`creature_text\` WHERE \`CreatureID\` = ${creatureEntry};
INSERT INTO \`creature_text\`
  (\`CreatureID\`, \`GroupID\`, \`ID\`, \`Text\`, \`Type\`, \`Language\`, \`Probability\`, \`Emote\`, \`Duration\`, \`Sound\`, \`BroadcastTextId\`, \`TextRange\`, \`comment\`)
VALUES
${values};`;
  };

  const generateDiffQuery = () => {
    const statements: string[] = [];
    const initialMap = new Map(initialTexts.map(t => [`${t.GroupID}-${t.ID}`, t]));
    const currentMap = new Map(texts.map(t => [`${t.GroupID}-${t.ID}`, t]));

    for (const [key, t] of initialMap) {
      if (!currentMap.has(key)) {
        statements.push(`DELETE FROM \`creature_text\` WHERE \`CreatureID\` = ${creatureEntry} AND \`GroupID\` = ${t.GroupID} AND \`ID\` = ${t.ID};`);
      }
    }

    for (const [key, t] of currentMap) {
      const init = initialMap.get(key);
      const safeText = escapeSqlString(t.Text || '');
      const safeComment = escapeSqlString(t.comment || '');

      if (!init) {
        statements.push(`INSERT INTO \`creature_text\` (\`CreatureID\`, \`GroupID\`, \`ID\`, \`Text\`, \`Type\`, \`Language\`, \`Probability\`, \`Emote\`, \`Duration\`, \`Sound\`, \`BroadcastTextId\`, \`TextRange\`, \`comment\`) VALUES (${creatureEntry}, ${t.GroupID}, ${t.ID}, '${safeText}', ${t.Type || 12}, ${t.Language || 0}, ${t.Probability || 100}, ${t.Emote || 0}, ${t.Duration || 0}, ${t.Sound || 0}, ${t.BroadcastTextId || 0}, ${t.TextRange || 0}, '${safeComment}');`);
      } else {
        const isModified =
          init.Text !== t.Text ||
          init.Type !== t.Type ||
          init.Language !== t.Language ||
          init.Probability !== t.Probability ||
          init.Emote !== t.Emote ||
          init.Duration !== t.Duration ||
          init.Sound !== t.Sound ||
          init.BroadcastTextId !== t.BroadcastTextId ||
          init.TextRange !== t.TextRange ||
          init.comment !== t.comment;

        if (isModified) {
          statements.push(`UPDATE \`creature_text\` SET \`Text\` = '${safeText}', \`Type\` = ${t.Type || 12}, \`Language\` = ${t.Language || 0}, \`Probability\` = ${t.Probability || 100}, \`Emote\` = ${t.Emote || 0}, \`Duration\` = ${t.Duration || 0}, \`Sound\` = ${t.Sound || 0}, \`BroadcastTextId\` = ${t.BroadcastTextId || 0}, \`TextRange\` = ${t.TextRange || 0}, \`comment\` = '${safeComment}' WHERE \`CreatureID\` = ${creatureEntry} AND \`GroupID\` = ${t.GroupID} AND \`ID\` = ${t.ID};`);
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
      setInitialTexts(JSON.parse(JSON.stringify(texts)));
      setIsDirty(false);
    } catch (e) {
      console.error('Save texts failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    await handleExecute();
    handleCopySql();
  };

  const handleReload = () => {
    setTexts(JSON.parse(JSON.stringify(initialTexts)));
    setIsDirty(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 font-sans select-none text-slate-800">
      {/* Top Query Action Bar */}
      <SqlQueryBar
        name="creature_texts"
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
          <h2 className="text-base text-slate-800 font-semibold">Creature Speech Texts</h2>
          <p className="text-xs text-slate-500 font-mono">
            Table: <code className="text-blue-600 font-bold">creature_text</code> (CreatureID: {creatureEntry})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddText}
            className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Speech Text</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded p-8 text-center text-slate-500 text-sm">
          Loading speech texts...
        </div>
      ) : texts.length === 0 ? (
        <div className="w-full space-y-3 pt-1">
          <div className="w-full bg-[#F1F3F5] border border-[#E2E8F0] rounded py-3 text-center text-[13px] text-slate-700 font-sans shadow-2xs">
            No speech texts configured for creature {creatureEntry}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3 w-16">Group</th>
                <th className="py-2.5 px-3 w-14">ID</th>
                <th className="py-2.5 px-3 min-w-[200px]">Text Content</th>
                <th className="py-2.5 px-3 w-32">Chat Type</th>
                <th className="py-2.5 px-3 w-20">Prob %</th>
                <th className="py-2.5 px-3 w-28">Sound</th>
                <th className="py-2.5 px-3 w-28">Emote</th>
                <th className="py-2.5 px-3 w-24">Comment</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {texts.map((t, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 font-bold text-slate-600">
                    <input
                      type="number"
                      value={t.GroupID}
                      onChange={(e) => handleUpdate(idx, 'GroupID', Number(e.target.value) || 0)}
                      className="w-12 px-1.5 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 font-bold text-slate-600">
                    <input
                      type="number"
                      value={t.ID}
                      onChange={(e) => handleUpdate(idx, 'ID', Number(e.target.value) || 0)}
                      className="w-12 px-1.5 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={t.Text}
                      onChange={(e) => handleUpdate(idx, 'Text', e.target.value)}
                      className="w-full px-2 py-1 border border-slate-300 rounded font-sans focus:border-blue-500 focus:outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={t.Type}
                      onChange={(e) => handleUpdate(idx, 'Type', Number(e.target.value) || 12)}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-sans text-xs focus:border-blue-500 focus:outline-none"
                    >
                      {CHAT_TYPES.map((ct) => (
                        <option key={ct.value} value={ct.value}>
                          {ct.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={t.Probability}
                      onChange={(e) => handleUpdate(idx, 'Probability', Number(e.target.value) || 100)}
                      className="w-16 px-1.5 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs text-center"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={t.Sound}
                        onChange={(e) => handleUpdate(idx, 'Sound', Number(e.target.value) || 0)}
                        className="w-20 px-1.5 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
                      />
                      <SelectorButton
                        onClick={() =>
                          setEntityModal({
                            open: true,
                            type: 'sound',
                            title: `Select Sound Effect`,
                            index: idx,
                            field: 'Sound',
                          })
                        }
                      />
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={t.Emote}
                        onChange={(e) => handleUpdate(idx, 'Emote', Number(e.target.value) || 0)}
                        className="w-20 px-1.5 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs"
                      />
                      <SelectorButton
                        onClick={() =>
                          setEntityModal({
                            open: true,
                            type: 'emote',
                            title: `Select Emote`,
                            index: idx,
                            field: 'Emote',
                          })
                        }
                      />
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={t.comment}
                      onChange={(e) => handleUpdate(idx, 'comment', e.target.value)}
                      placeholder="Comment..."
                      className="w-full px-2 py-1 border border-slate-300 rounded font-sans focus:border-blue-500 focus:outline-none text-xs"
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
          initialValue={texts[entityModal.index] ? (texts[entityModal.index][entityModal.field] as number) : 0}
          onSelect={(id) => {
            handleUpdate(entityModal.index, entityModal.field, id);
          }}
        />
      )}
    </div>
  );
};

export default CreatureTextsTab;
