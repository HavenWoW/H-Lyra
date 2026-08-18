// Editor for quest_template_addon: extended quest settings covering
// prerequisites, rewards and completion rules.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Copy, Check } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { QuestTemplateAddon } from '../types';
import { InfoTooltip, SelectorButton } from './QuestTooltip';
import { FlagsSelectorModal } from '../../../components/FlagsSelectorModal';
import { EntitySelectorModal, SelectorType } from '../../../components/EntitySelectorModal';
import { ALLOWABLE_CLASSES } from '../../../constants/itemOptions';
import { QUEST_SPECIAL_FLAGS } from '../../../constants/questOptions';
import { quoteSqlString } from '../../../lib/sql';

import { SqlQueryBar } from '../../../components/SqlQueryBar';

interface QuestAddonTabProps {
  questId: number;
}

export const QuestAddonTab: React.FC<QuestAddonTabProps> = ({ questId }) => {
  const [addon, setAddon] = useState<QuestTemplateAddon | null>(null);
  const [initialAddon, setInitialAddon] = useState<QuestTemplateAddon | null>(null);
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Selector modal states
  const [flagsModal, setFlagsModal] = useState<{
    open: boolean;
    title: string;
    field: keyof QuestTemplateAddon;
    flags: any[];
  } | null>(null);

  const [entityModal, setEntityModal] = useState<{
    open: boolean;
    type: SelectorType;
    title: string;
    field: keyof QuestTemplateAddon;
  } | null>(null);

  useEffect(() => {
    loadAddon();
  }, [questId]);

  const loadAddon = async () => {
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT a.ID, a.MaxLevel, a.AllowableClasses, a.SourceSpellID, a.PrevQuestID, a.NextQuestID, a.ExclusiveGroup, a.RewardMailTemplateID, a.RewardMailDelay, a.RequiredSkillID, a.RequiredSkillPoints, a.RequiredMinRepFaction, a.RequiredMinRepValue, a.RequiredMaxRepFaction, a.RequiredMaxRepValue, a.ProvidedItemCount, a.SpecialFlags, a.ScriptName, m.RewardMailSenderEntry FROM \`quest_template_addon\` a LEFT JOIN \`quest_mail_sender\` m ON a.ID = m.QuestId WHERE a.ID = ${questId} LIMIT 1;`
      );
      if (res && res.success && res.rows && res.rows.length > 0) {
        const r = res.rows[0];
        const loaded: QuestTemplateAddon = {
          ID: Number(r[0]),
          MaxLevel: Number(r[1]) || 0,
          AllowableClasses: Number(r[2]) || 0,
          SourceSpellID: Number(r[3]) || 0,
          PrevQuestID: Number(r[4]) || 0,
          NextQuestID: Number(r[5]) || 0,
          ExclusiveGroup: Number(r[6]) || 0,
          RewardMailTemplateID: Number(r[7]) || 0,
          RewardMailDelay: Number(r[8]) || 0,
          RequiredSkillID: Number(r[9]) || 0,
          RequiredSkillPoints: Number(r[10]) || 0,
          RequiredMinRepFaction: Number(r[11]) || 0,
          RequiredMinRepValue: Number(r[12]) || 0,
          RequiredMaxRepFaction: Number(r[13]) || 0,
          RequiredMaxRepValue: Number(r[14]) || 0,
          ProvidedItemCount: Number(r[15]) || 0,
          SpecialFlags: Number(r[16]) || 0,
          ScriptName: String(r[17] || ''),
          RewardMailSenderEntry: Number(r[18]) || 0,
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
    const fresh: QuestTemplateAddon = {
      ID: questId,
      MaxLevel: 0,
      AllowableClasses: 0,
      SourceSpellID: 0,
      PrevQuestID: 0,
      NextQuestID: 0,
      ExclusiveGroup: 0,
      RewardMailTemplateID: 0,
      RewardMailDelay: 0,
      RequiredSkillID: 0,
      RequiredSkillPoints: 0,
      RequiredMinRepFaction: 0,
      RequiredMinRepValue: 0,
      RequiredMaxRepFaction: 0,
      RequiredMaxRepValue: 0,
      ProvidedItemCount: 0,
      SpecialFlags: 0,
      ScriptName: '',
      RewardMailSenderEntry: 0,
    };
    setAddon(fresh);
    setIsDirty(true);
  };

  /**
   * Writes quest_mail_sender for the quest. A zero sender entry clears the row,
   * since the core reads a missing join as no sender.
   */
  const mailSenderSql = (): string => {
    const entry = addon?.RewardMailSenderEntry ?? 0;
    const del = `DELETE FROM \`quest_mail_sender\` WHERE \`QuestId\` = ${questId};`;
    if (!entry) return del;
    return `${del}\nINSERT INTO \`quest_mail_sender\` (\`QuestId\`, \`RewardMailSenderEntry\`) VALUES (${questId}, ${entry});`;
  };

  const mailSenderChanged = (): boolean =>
    !!initialAddon && (initialAddon.RewardMailSenderEntry ?? 0) !== (addon?.RewardMailSenderEntry ?? 0);

  const handleChange = (field: keyof QuestTemplateAddon, value: any) => {
    if (!addon) return;
    setAddon({ ...addon, [field]: value });
    setIsDirty(true);
  };

  const generateFullQuery = (): string => {
    if (!addon) return '';
    const addonSql = `DELETE FROM \`quest_template_addon\` WHERE \`ID\` = ${questId};
INSERT INTO \`quest_template_addon\`
  (\`ID\`, \`MaxLevel\`, \`AllowableClasses\`, \`SourceSpellID\`, \`PrevQuestID\`, \`NextQuestID\`, \`ExclusiveGroup\`, \`RewardMailTemplateID\`, \`RewardMailDelay\`, \`RequiredSkillID\`, \`RequiredSkillPoints\`, \`RequiredMinRepFaction\`, \`RequiredMinRepValue\`, \`RequiredMaxRepFaction\`, \`RequiredMaxRepValue\`, \`ProvidedItemCount\`, \`SpecialFlags\`, \`ScriptName\`)
VALUES
  (${questId}, ${addon.MaxLevel ?? 0}, ${addon.AllowableClasses ?? 0}, ${addon.SourceSpellID ?? 0}, ${addon.PrevQuestID ?? 0}, ${addon.NextQuestID ?? 0}, ${addon.ExclusiveGroup ?? 0}, ${addon.RewardMailTemplateID ?? 0}, ${addon.RewardMailDelay ?? 0}, ${addon.RequiredSkillID ?? 0}, ${addon.RequiredSkillPoints ?? 0}, ${addon.RequiredMinRepFaction ?? 0}, ${addon.RequiredMinRepValue ?? 0}, ${addon.RequiredMaxRepFaction ?? 0}, ${addon.RequiredMaxRepValue ?? 0}, ${addon.ProvidedItemCount ?? 0}, ${addon.SpecialFlags ?? 0}, ${quoteSqlString(addon.ScriptName || '')});`;
    return `${addonSql}\n\n${mailSenderSql()}`;
  };

  const generateDiffQuery = (): string => {
    if (!addon) return '';
    if (!initialAddon) return generateFullQuery();

    const changes: string[] = [];
    const fields: (keyof QuestTemplateAddon)[] = [
      'MaxLevel', 'AllowableClasses', 'SourceSpellID', 'PrevQuestID', 'NextQuestID',
      'ExclusiveGroup', 'RewardMailTemplateID', 'RewardMailDelay', 'RequiredSkillID',
      'RequiredSkillPoints', 'RequiredMinRepFaction', 'RequiredMinRepValue',
      'RequiredMaxRepFaction', 'RequiredMaxRepValue', 'ProvidedItemCount',
      'SpecialFlags', 'ScriptName'
    ];

    for (const f of fields) {
      if (initialAddon[f] !== addon[f]) {
        if (f === 'ScriptName') {
          changes.push(`\`${f}\` = ${quoteSqlString(String(addon[f] || ''))}`);
        } else {
          changes.push(`\`${f}\` = ${addon[f] ?? 0}`);
        }
      }
    }

    const statements: string[] = [];
    if (changes.length > 0) {
      statements.push(`UPDATE \`quest_template_addon\` SET
  ${changes.join(',\n  ')}
WHERE \`ID\` = ${questId};`);
    }
    if (mailSenderChanged()) {
      statements.push(mailSenderSql());
    }
    return statements.join('\n\n');
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
    if (!window.confirm('Delete quest template addon record?')) return;
    setSaving(true);
    try {
      await api.executeSql('world', `DELETE FROM \`quest_template_addon\` WHERE \`ID\` = ${questId};`);
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
          name="quest_addon"
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
          <h2 className="text-base text-slate-800 font-semibold">Quest Template Addon</h2>
          <p className="text-xs text-slate-500 font-mono">
            Table: <code className="text-blue-600 font-bold">quest_template_addon</code> (Quest ID: {questId})
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
            No addon record defined for quest {questId}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Max Level (`MaxLevel`)</span>
                <InfoTooltip text="Maximum player level allowed to accept this quest. If 0, no maximum limit is enforced." />
              </label>
              <input
                type="number"
                value={addon.MaxLevel}
                onChange={(e) => handleChange('MaxLevel', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Allowable Classes Mask</span>
                <SelectorButton
                  onClick={() =>
                    setFlagsModal({
                      open: true,
                      title: 'Allowable Classes Mask',
                      field: 'AllowableClasses',
                      flags: ALLOWABLE_CLASSES,
                    })
                  }
                />
              </label>
              <input
                type="number"
                value={addon.AllowableClasses}
                onChange={(e) => handleChange('AllowableClasses', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Source Spell ID</span>
                <SelectorButton
                  onClick={() =>
                    setEntityModal({
                      open: true,
                      type: 'spell',
                      title: 'Select Source Spell',
                      field: 'SourceSpellID',
                    })
                  }
                />
              </label>
              <input
                type="number"
                value={addon.SourceSpellID}
                onChange={(e) => handleChange('SourceSpellID', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Previous Quest ID (`PrevQuestID`)</span>
                <SelectorButton
                  onClick={() =>
                    setEntityModal({
                      open: true,
                      type: 'quest',
                      title: 'Select Previous Quest',
                      field: 'PrevQuestID',
                    })
                  }
                />
              </label>
              <input
                type="number"
                value={addon.PrevQuestID}
                onChange={(e) => handleChange('PrevQuestID', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none text-blue-600 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Next Quest ID (`NextQuestID`)</span>
                <SelectorButton
                  onClick={() =>
                    setEntityModal({
                      open: true,
                      type: 'quest',
                      title: 'Select Next Quest',
                      field: 'NextQuestID',
                    })
                  }
                />
              </label>
              <input
                type="number"
                value={addon.NextQuestID}
                onChange={(e) => handleChange('NextQuestID', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none text-blue-600 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Exclusive Group</span>
                <InfoTooltip text="Quests sharing the same exclusive group value cannot be completed together (mutually exclusive choices)." />
              </label>
              <input
                type="number"
                value={addon.ExclusiveGroup}
                onChange={(e) => handleChange('ExclusiveGroup', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Required Skill ID</span>
                <InfoTooltip text="Skill / Profession ID required to accept the quest (SkillLine.db2)." />
              </label>
              <input
                type="number"
                value={addon.RequiredSkillID}
                onChange={(e) => handleChange('RequiredSkillID', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Required Skill Points</span>
                <InfoTooltip text="Minimum skill rank points required in the specified profession." />
              </label>
              <input
                type="number"
                value={addon.RequiredSkillPoints}
                onChange={(e) => handleChange('RequiredSkillPoints', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                ScriptName
              </label>
              <input
                type="text"
                placeholder="e.g. quest_example_script"
                value={addon.ScriptName || ''}
                onChange={(e) => handleChange('ScriptName', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Required Min Rep Faction</span>
                <SelectorButton
                  onClick={() =>
                    setEntityModal({
                      open: true,
                      type: 'faction',
                      title: 'Select Min Reputation Faction',
                      field: 'RequiredMinRepFaction',
                    })
                  }
                />
              </label>
              <input
                type="number"
                value={addon.RequiredMinRepFaction}
                onChange={(e) => handleChange('RequiredMinRepFaction', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Required Min Rep Value</span>
                <InfoTooltip text="Minimum standing reputation value required with the specified faction." />
              </label>
              <input
                type="number"
                value={addon.RequiredMinRepValue}
                onChange={(e) => handleChange('RequiredMinRepValue', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Required Max Rep Faction</span>
                <SelectorButton
                  onClick={() =>
                    setEntityModal({
                      open: true,
                      type: 'faction',
                      title: 'Select Max Reputation Faction',
                      field: 'RequiredMaxRepFaction',
                    })
                  }
                />
              </label>
              <input
                type="number"
                value={addon.RequiredMaxRepFaction}
                onChange={(e) => handleChange('RequiredMaxRepFaction', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Required Max Rep Value</span>
                <InfoTooltip text="Maximum standing reputation value allowed with the specified faction." />
              </label>
              <input
                type="number"
                value={addon.RequiredMaxRepValue}
                onChange={(e) => handleChange('RequiredMaxRepValue', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Reward Mail Template ID</span>
                <InfoTooltip text="Mail template ID sent to the player upon quest turn-in (MailTemplate.db2)." />
              </label>
              <input
                type="number"
                value={addon.RewardMailTemplateID}
                onChange={(e) => handleChange('RewardMailTemplateID', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Reward Mail Delay</span>
                <InfoTooltip text="Delay in seconds before the completion reward mail is delivered to the player's mailbox." />
              </label>
              <input
                type="number"
                value={addon.RewardMailDelay}
                onChange={(e) => handleChange('RewardMailDelay', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Reward Mail Sender</span>
                <InfoTooltip text="Creature entry the reward mail is sent from. Stored in quest_mail_sender, which the core joins onto the addon. 0 clears the sender." />
              </label>
              <input
                type="number"
                value={addon.RewardMailSenderEntry ?? 0}
                onChange={(e) => handleChange('RewardMailSenderEntry', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center">
                <span>Special Flags</span>
                <SelectorButton
                  onClick={() =>
                    setFlagsModal({
                      open: true,
                      title: 'Quest Special Flags',
                      field: 'SpecialFlags',
                      flags: QUEST_SPECIAL_FLAGS,
                    })
                  }
                />
              </label>
              <input
                type="number"
                value={addon.SpecialFlags}
                onChange={(e) => handleChange('SpecialFlags', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

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
