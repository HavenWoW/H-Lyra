// Editor for creature_onkill_reward: reputation and currency granted on kill.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { CreatureOnKillReward } from '../types';
import { SqlQueryBar } from '../../../components/SqlQueryBar';

interface CreatureOnKillTabProps {
  creatureEntry: number;
}

export const CreatureOnKillTab: React.FC<CreatureOnKillTabProps> = ({ creatureEntry }) => {
  const [reward, setReward] = useState<CreatureOnKillReward | null>(null);
  const [initialReward, setInitialReward] = useState<CreatureOnKillReward | null>(null);
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    loadReward();
  }, [creatureEntry]);

  const loadReward = async () => {
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT creature_id, RewOnKillRepFaction1, RewOnKillRepFaction2, MaxStanding1, IsTeamAward1, RewOnKillRepValue1, MaxStanding2, IsTeamAward2, RewOnKillRepValue2, TeamDependent, CurrencyId1, CurrencyId2, CurrencyId3, CurrencyCount1, CurrencyCount2, CurrencyCount3 FROM \`creature_onkill_reward\` WHERE \`creature_id\` = ${creatureEntry} LIMIT 1;`
      );
      if (res && res.success && res.rows && res.rows.length > 0) {
        const r = res.rows[0];
        const obj = {
          creature_id: Number(r[0]),
          RewOnKillRepFaction1: Number(r[1]) || 0,
          RewOnKillRepFaction2: Number(r[2]) || 0,
          MaxStanding1: Number(r[3]) || 0,
          IsTeamAward1: Number(r[4]) || 0,
          RewOnKillRepValue1: Number(r[5]) || 0,
          MaxStanding2: Number(r[6]) || 0,
          IsTeamAward2: Number(r[7]) || 0,
          RewOnKillRepValue2: Number(r[8]) || 0,
          TeamDependent: Number(r[9]) || 0,
          CurrencyId1: Number(r[10]) || 0,
          CurrencyId2: Number(r[11]) || 0,
          CurrencyId3: Number(r[12]) || 0,
          CurrencyCount1: Number(r[13]) || 0,
          CurrencyCount2: Number(r[14]) || 0,
          CurrencyCount3: Number(r[15]) || 0,
        };
        setReward(obj);
        setInitialReward(JSON.parse(JSON.stringify(obj)));
      } else {
        setReward(null);
        setInitialReward(null);
      }
      setIsDirty(false);
    } catch {
      setReward(null);
      setInitialReward(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    const newReward = {
      creature_id: creatureEntry,
      RewOnKillRepFaction1: 0,
      RewOnKillRepFaction2: 0,
      MaxStanding1: 0,
      IsTeamAward1: 0,
      RewOnKillRepValue1: 0,
      MaxStanding2: 0,
      IsTeamAward2: 0,
      RewOnKillRepValue2: 0,
      TeamDependent: 0,
      CurrencyId1: 0,
      CurrencyId2: 0,
      CurrencyId3: 0,
      CurrencyCount1: 0,
      CurrencyCount2: 0,
      CurrencyCount3: 0,
    };
    setReward(newReward);
    setIsDirty(true);
  };

  const handleChange = (field: keyof CreatureOnKillReward, value: any) => {
    if (!reward) return;
    setReward({ ...reward, [field]: value });
    setIsDirty(true);
  };

  const generateFullQuery = () => {
    if (!reward) return `DELETE FROM \`creature_onkill_reward\` WHERE \`creature_id\` = ${creatureEntry};`;
    return `DELETE FROM \`creature_onkill_reward\` WHERE \`creature_id\` = ${creatureEntry};
INSERT INTO \`creature_onkill_reward\`
  (\`creature_id\`, \`RewOnKillRepFaction1\`, \`RewOnKillRepFaction2\`, \`MaxStanding1\`, \`IsTeamAward1\`, \`RewOnKillRepValue1\`, \`MaxStanding2\`, \`IsTeamAward2\`, \`RewOnKillRepValue2\`, \`TeamDependent\`, \`CurrencyId1\`, \`CurrencyId2\`, \`CurrencyId3\`, \`CurrencyCount1\`, \`CurrencyCount2\`, \`CurrencyCount3\`)
VALUES
  (${creatureEntry}, ${reward.RewOnKillRepFaction1 || 0}, ${reward.RewOnKillRepFaction2 || 0}, ${reward.MaxStanding1 || 0}, ${reward.IsTeamAward1 || 0}, ${reward.RewOnKillRepValue1 || 0}, ${reward.MaxStanding2 || 0}, ${reward.IsTeamAward2 || 0}, ${reward.RewOnKillRepValue2 || 0}, ${reward.TeamDependent || 0}, ${reward.CurrencyId1 || 0}, ${reward.CurrencyId2 || 0}, ${reward.CurrencyId3 || 0}, ${reward.CurrencyCount1 || 0}, ${reward.CurrencyCount2 || 0}, ${reward.CurrencyCount3 || 0});`;
  };

  const generateDiffQuery = () => {
    if (!reward && !initialReward) return '';
    if (!reward && initialReward) {
      return `DELETE FROM \`creature_onkill_reward\` WHERE \`creature_id\` = ${creatureEntry};`;
    }
    if (reward && !initialReward) {
      return `INSERT INTO \`creature_onkill_reward\`
  (\`creature_id\`, \`RewOnKillRepFaction1\`, \`RewOnKillRepFaction2\`, \`MaxStanding1\`, \`IsTeamAward1\`, \`RewOnKillRepValue1\`, \`MaxStanding2\`, \`IsTeamAward2\`, \`RewOnKillRepValue2\`, \`TeamDependent\`, \`CurrencyId1\`, \`CurrencyId2\`, \`CurrencyId3\`, \`CurrencyCount1\`, \`CurrencyCount2\`, \`CurrencyCount3\`)
VALUES
  (${creatureEntry}, ${reward.RewOnKillRepFaction1 || 0}, ${reward.RewOnKillRepFaction2 || 0}, ${reward.MaxStanding1 || 0}, ${reward.IsTeamAward1 || 0}, ${reward.RewOnKillRepValue1 || 0}, ${reward.MaxStanding2 || 0}, ${reward.IsTeamAward2 || 0}, ${reward.RewOnKillRepValue2 || 0}, ${reward.TeamDependent || 0}, ${reward.CurrencyId1 || 0}, ${reward.CurrencyId2 || 0}, ${reward.CurrencyId3 || 0}, ${reward.CurrencyCount1 || 0}, ${reward.CurrencyCount2 || 0}, ${reward.CurrencyCount3 || 0});`;
    }

    // Both exist -> check field differences
    if (!reward || !initialReward) return '';

    const fields: (keyof CreatureOnKillReward)[] = [
      'RewOnKillRepFaction1', 'RewOnKillRepFaction2', 'MaxStanding1', 'IsTeamAward1',
      'RewOnKillRepValue1', 'MaxStanding2', 'IsTeamAward2', 'RewOnKillRepValue2',
      'TeamDependent', 'CurrencyId1', 'CurrencyId2', 'CurrencyId3',
      'CurrencyCount1', 'CurrencyCount2', 'CurrencyCount3',
    ];

    const changes: string[] = [];
    for (const f of fields) {
      if (reward[f] !== initialReward[f]) {
        changes.push(`\`${f}\` = ${reward[f] || 0}`);
      }
    }

    if (changes.length === 0) return '';

    return `UPDATE \`creature_onkill_reward\` SET
  ${changes.join(',\n  ')}
WHERE \`creature_id\` = ${creatureEntry};`;
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
      setInitialReward(reward ? JSON.parse(JSON.stringify(reward)) : null);
      setIsDirty(false);
    } catch (e) {
      console.error('Save onkill reward failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    await handleExecute();
    handleCopySql();
  };

  const handleReload = () => {
    setReward(initialReward ? JSON.parse(JSON.stringify(initialReward)) : null);
    setIsDirty(false);
  };

  const handleDelete = () => {
    setReward(null);
    setIsDirty(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 font-sans select-none text-slate-800">
      {/* Top Query Action Bar */}
      <SqlQueryBar
        name="creature_onkill"
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
          <h2 className="text-base text-slate-800 font-semibold">OnKill Reputation & Currency Rewards</h2>
          <p className="text-xs text-slate-500 font-mono">
            Table: <code className="text-blue-600 font-bold">creature_onkill_reward</code> (creature_id: {creatureEntry})
          </p>
        </div>
        <div className="flex items-center gap-2">
          {reward ? (
            <button
              type="button"
              onClick={handleDelete}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Reward</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Reward Row</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded p-8 text-center text-slate-500 text-sm">
          Loading on-kill reward record...
        </div>
      ) : !reward ? (
        <div className="w-full space-y-3 pt-1">
          <div className="w-full bg-[#F1F3F5] border border-[#E2E8F0] rounded py-3 text-center text-[13px] text-slate-700 font-sans shadow-2xs">
            No on-kill rewards defined for creature {creatureEntry}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Faction 1 & 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Faction */}
            <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm space-y-3 text-xs">
              <h3 className="font-semibold text-slate-800 text-sm">Faction Reputation 1</h3>
              <div>
                <label className="block text-slate-600 mb-1">Faction ID 1</label>
                <input
                  type="number"
                  value={reward.RewOnKillRepFaction1}
                  onChange={(e) => handleChange('RewOnKillRepFaction1', Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Reputation Value 1</label>
                <input
                  type="number"
                  value={reward.RewOnKillRepValue1}
                  onChange={(e) => handleChange('RewOnKillRepValue1', Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Max Standing 1</label>
                <input
                  type="number"
                  value={reward.MaxStanding1}
                  onChange={(e) => handleChange('MaxStanding1', Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isTeam1"
                  checked={reward.IsTeamAward1 === 1}
                  onChange={(e) => handleChange('IsTeamAward1', e.target.checked ? 1 : 0)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <label htmlFor="isTeam1" className="text-slate-700 font-semibold cursor-pointer">Team Award 1</label>
              </div>
            </div>

            {/* Secondary Faction */}
            <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm space-y-3 text-xs">
              <h3 className="font-semibold text-slate-800 text-sm">Faction Reputation 2</h3>
              <div>
                <label className="block text-slate-600 mb-1">Faction ID 2</label>
                <input
                  type="number"
                  value={reward.RewOnKillRepFaction2}
                  onChange={(e) => handleChange('RewOnKillRepFaction2', Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Reputation Value 2</label>
                <input
                  type="number"
                  value={reward.RewOnKillRepValue2}
                  onChange={(e) => handleChange('RewOnKillRepValue2', Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Max Standing 2</label>
                <input
                  type="number"
                  value={reward.MaxStanding2}
                  onChange={(e) => handleChange('MaxStanding2', Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isTeam2"
                  checked={reward.IsTeamAward2 === 1}
                  onChange={(e) => handleChange('IsTeamAward2', e.target.checked ? 1 : 0)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <label htmlFor="isTeam2" className="text-slate-700 font-semibold cursor-pointer">Team Award 2</label>
              </div>
            </div>
          </div>

          {/* Currencies 1, 2, 3 (BFA Feature) */}
          <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-slate-800 text-sm">Currency Drops (BFA Currencies)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
              <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                <span className="font-semibold text-slate-800">Currency 1</span>
                <div>
                  <label className="block text-slate-600 mb-0.5">Currency ID 1</label>
                  <input
                    type="number"
                    value={reward.CurrencyId1}
                    onChange={(e) => handleChange('CurrencyId1', Number(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-0.5">Currency Count 1</label>
                  <input
                    type="number"
                    value={reward.CurrencyCount1}
                    onChange={(e) => handleChange('CurrencyCount1', Number(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                <span className="font-semibold text-slate-800">Currency 2</span>
                <div>
                  <label className="block text-slate-600 mb-0.5">Currency ID 2</label>
                  <input
                    type="number"
                    value={reward.CurrencyId2}
                    onChange={(e) => handleChange('CurrencyId2', Number(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-0.5">Currency Count 2</label>
                  <input
                    type="number"
                    value={reward.CurrencyCount2}
                    onChange={(e) => handleChange('CurrencyCount2', Number(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                <span className="font-semibold text-slate-800">Currency 3</span>
                <div>
                  <label className="block text-slate-600 mb-0.5">Currency ID 3</label>
                  <input
                    type="number"
                    value={reward.CurrencyId3}
                    onChange={(e) => handleChange('CurrencyId3', Number(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-0.5">Currency Count 3</label>
                  <input
                    type="number"
                    value={reward.CurrencyCount3}
                    onChange={(e) => handleChange('CurrencyCount3', Number(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
