// Editor for quest_offer_reward: the completion text and emotes.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { QuestOfferRewardRow } from '../types';
import { InfoTooltip, SelectorButton } from './QuestTooltip';
import { EntitySelectorModal, SelectorType } from '../../../components/EntitySelectorModal';
import { SqlQueryBar } from '../../../components/SqlQueryBar';
import { formatSqlValue } from '../../../lib/sql';
import { generateCollectionReplace } from '../../../lib/collectionSql';
import {
  QUEST_OFFER_REWARD_TABLE,
  QUEST_OFFER_REWARD_SCOPE_COLUMN,
  QUEST_OFFER_REWARD_COLUMNS,
} from '../schema/questOfferRewardSchema';

interface QuestOfferRewardTabProps {
  questId: number;
}

/** An empty text box means "no text" — stored as NULL, not an empty string. */
const textOrNull = (value: unknown): string | null => (value ? String(value) : null);

export const QuestOfferRewardTab: React.FC<QuestOfferRewardTabProps> = ({ questId }) => {
  const [offer, setOffer] = useState<QuestOfferRewardRow | null>(null);
  const [initialOffer, setInitialOffer] = useState<QuestOfferRewardRow | null>(null);
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
    field: keyof QuestOfferRewardRow;
  } | null>(null);

  useEffect(() => {
    loadOffer();
  }, [questId]);

  const loadOffer = async () => {
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT ID, Emote1, Emote2, Emote3, Emote4, EmoteDelay1, EmoteDelay2, EmoteDelay3, EmoteDelay4, RewardText, VerifiedBuild FROM \`quest_offer_reward\` WHERE \`ID\` = ${questId} LIMIT 1;`
      );
      if (res && res.success && res.rows && res.rows.length > 0) {
        const r = res.rows[0];
        const loaded: QuestOfferRewardRow = {
          ID: Number(r[0]),
          Emote1: Number(r[1]) || 0,
          Emote2: Number(r[2]) || 0,
          Emote3: Number(r[3]) || 0,
          Emote4: Number(r[4]) || 0,
          EmoteDelay1: Number(r[5]) || 0,
          EmoteDelay2: Number(r[6]) || 0,
          EmoteDelay3: Number(r[7]) || 0,
          EmoteDelay4: Number(r[8]) || 0,
          RewardText: r[9] ? String(r[9]) : '',
          VerifiedBuild: Number(r[10]) || 0,
        };
        setOffer(loaded);
        setInitialOffer(JSON.parse(JSON.stringify(loaded)));
      } else {
        setOffer(null);
        setInitialOffer(null);
      }
      setIsDirty(false);
    } catch {
      setOffer(null);
      setInitialOffer(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    const fresh: QuestOfferRewardRow = {
      ID: questId,
      Emote1: 0,
      Emote2: 0,
      Emote3: 0,
      Emote4: 0,
      EmoteDelay1: 0,
      EmoteDelay2: 0,
      EmoteDelay3: 0,
      EmoteDelay4: 0,
      RewardText: '',
      VerifiedBuild: 0,
    };
    setOffer(fresh);
    setIsDirty(true);
  };

  const handleChange = (field: keyof QuestOfferRewardRow, value: any) => {
    if (!offer) return;
    setOffer({ ...offer, [field]: value });
    setIsDirty(true);
  };

  /** The offer row shaped for the schema-driven generators. */
  const offerRow = (row: QuestOfferRewardRow): Record<string, unknown> => ({
    ...row,
    ID: questId,
    RewardText: textOrNull(row.RewardText),
  });

  const generateFullQuery = (): string => {
    if (!offer) return '';
    return generateCollectionReplace(
      QUEST_OFFER_REWARD_TABLE,
      { column: QUEST_OFFER_REWARD_SCOPE_COLUMN, value: questId },
      QUEST_OFFER_REWARD_COLUMNS,
      [offerRow(offer)]
    );
  };

  const generateDiffQuery = (): string => {
    if (!offer) return '';
    if (!initialOffer) return generateFullQuery();

    const current = offerRow(offer);
    const original = offerRow(initialOffer);
    const changes: string[] = [];
    for (const col of QUEST_OFFER_REWARD_COLUMNS) {
      if (col.name === QUEST_OFFER_REWARD_SCOPE_COLUMN) continue; // ID is the key
      const fmt = (v: unknown) => formatSqlValue(v, { kind: col.kind, nullable: !!col.nullable });
      if (fmt(current[col.name]) !== fmt(original[col.name])) {
        changes.push(`\`${col.name}\` = ${fmt(current[col.name])}`);
      }
    }

    if (changes.length === 0) return '';

    return `UPDATE \`quest_offer_reward\` SET
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
      setInitialOffer(offer ? JSON.parse(JSON.stringify(offer)) : null);
      setIsDirty(false);
    } catch (e) {
      console.error('Save offer reward failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    await handleExecute();
    handleCopySql();
  };

  const handleReload = () => {
    if (initialOffer) {
      setOffer(JSON.parse(JSON.stringify(initialOffer)));
      setIsDirty(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete quest offer reward record?')) return;
    setSaving(true);
    try {
      await api.executeSql('world', `DELETE FROM \`quest_offer_reward\` WHERE \`ID\` = ${questId};`);
      setOffer(null);
      setInitialOffer(null);
      setIsDirty(false);
    } catch (e) {
      console.error('Delete offer reward failed:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 font-sans select-none text-slate-800">
      {/* Top Query Action Bar */}
      {offer && (
        <SqlQueryBar
          name="quest_offer_reward"
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
          <h2 className="text-base text-slate-800 font-semibold">Offer Reward Text & Turn-In Emotes</h2>
          <p className="text-xs text-slate-500 font-mono">
            Table: <code className="text-blue-600 font-bold">quest_offer_reward</code> (Quest ID: {questId})
          </p>
        </div>
        <div className="flex items-center gap-2">
          {offer ? (
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
          Loading offer reward record...
        </div>
      ) : !offer ? (
        <div className="w-full space-y-3 pt-1">
          <div className="w-full bg-[#F1F3F5] border border-[#E2E8F0] rounded py-3 text-center text-[13px] text-slate-700 font-sans shadow-2xs">
            No offer reward turn-in record defined for quest {questId}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm space-y-4 text-xs font-sans">
          <div>
            <label className="block text-slate-700 font-bold mb-1 flex items-center">
              <span>Turn-In Reward Text (`RewardText`)</span>
              <InfoTooltip text="Text displayed by quest giver in the turn-in completion dialog." />
            </label>
            <textarea
              value={offer.RewardText}
              onChange={(e) => handleChange('RewardText', e.target.value)}
              rows={4}
              placeholder="Text displayed by quest giver when turning in the quest..."
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-sans focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {([1, 2, 3, 4] as const).map((num) => {
              const emoteField = `Emote${num}` as keyof QuestOfferRewardRow;
              const delayField = `EmoteDelay${num}` as keyof QuestOfferRewardRow;

              return (
                <div key={num} className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                  <span className="font-bold text-slate-800">Emote {num}</span>
                  <div>
                    <label className="block text-slate-700 font-bold mb-0.5 flex items-center">
                      <span>Emote ID {num}</span>
                      <SelectorButton
                        onClick={() =>
                          setEntityModal({
                            open: true,
                            type: 'emote',
                            title: `Select Turn-In Emote ${num}`,
                            field: emoteField,
                          })
                        }
                      />
                    </label>
                    <input
                      type="number"
                      value={offer[emoteField] as number}
                      onChange={(e) => handleChange(emoteField, Number(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-0.5 flex items-center">
                      <span>Delay {num} (ms)</span>
                      <InfoTooltip text="Delay in milliseconds before playing this emote." />
                    </label>
                    <input
                      type="number"
                      value={offer[delayField] as number}
                      onChange={(e) => handleChange(delayField, Number(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {entityModal && entityModal.open && (
        <EntitySelectorModal
          isOpen={true}
          onClose={() => setEntityModal(null)}
          type={entityModal.type}
          title={entityModal.title}
          initialValue={offer ? (offer[entityModal.field] as number) : 0}
          onSelect={(id) => {
            if (offer) handleChange(entityModal.field, id);
          }}
        />
      )}
    </div>
  );
};
