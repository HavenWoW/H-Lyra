// Editor for smart_scripts: the SmartAI script attached to this creature.

import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/ipc';
import { SmartAiDetailEditor } from '../../smartai/components/SmartAiDetailEditor';
import { SmartScriptRow } from '../../smartai/types';

interface CreatureSmartAiTabProps {
  creatureEntry: number;
}

export const CreatureSmartAiTab: React.FC<CreatureSmartAiTabProps> = ({ creatureEntry }) => {
  const [scripts, setScripts] = useState<SmartScriptRow[]>([]);
  const [initialScripts, setInitialScripts] = useState<SmartScriptRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    loadSmartScripts();
  }, [creatureEntry]);

  const loadSmartScripts = async () => {
    setLoading(true);
    try {
      const res = await api.executeSql(
        'world',
        `SELECT entryorguid, source_type, id, link, event_type, event_phase_mask, event_chance, event_flags, event_param1, event_param2, event_param3, event_param4, event_param5, event_param_string, action_type, action_param1, action_param2, action_param3, action_param4, action_param5, action_param6, target_type, target_param1, target_param2, target_param3, target_x, target_y, target_z, target_o, comment FROM \`smart_scripts\` WHERE \`entryorguid\` = ${creatureEntry} AND \`source_type\` = 0 ORDER BY \`id\` ASC;`
      );
      if (res && res.success && res.rows) {
        const loaded: SmartScriptRow[] = res.rows.map((r: any[]) => ({
          entryorguid: Number(r[0]),
          source_type: Number(r[1]) || 0,
          id: Number(r[2]) || 0,
          link: Number(r[3]) || 0,
          event_type: Number(r[4]) || 0,
          event_phase_mask: Number(r[5]) || 0,
          event_chance: Number(r[6]) || 100,
          event_flags: Number(r[7]) || 0,
          event_param1: Number(r[8]) || 0,
          event_param2: Number(r[9]) || 0,
          event_param3: Number(r[10]) || 0,
          event_param4: Number(r[11]) || 0,
          event_param5: Number(r[12]) || 0,
          event_param_string: String(r[13] || ''),
          action_type: Number(r[14]) || 0,
          action_param1: Number(r[15]) || 0,
          action_param2: Number(r[16]) || 0,
          action_param3: Number(r[17]) || 0,
          action_param4: Number(r[18]) || 0,
          action_param5: Number(r[19]) || 0,
          action_param6: Number(r[20]) || 0,
          target_type: Number(r[21]) || 0,
          target_param1: Number(r[22]) || 0,
          target_param2: Number(r[23]) || 0,
          target_param3: Number(r[24]) || 0,
          target_x: Number(r[25]) || 0,
          target_y: Number(r[26]) || 0,
          target_z: Number(r[27]) || 0,
          target_o: Number(r[28]) || 0,
          comment: String(r[29] || ''),
        }));
        setScripts(loaded);
        setInitialScripts(JSON.parse(JSON.stringify(loaded)));
      } else {
        setScripts([]);
        setInitialScripts([]);
      }
      setIsDirty(false);
    } catch {
      setScripts([]);
      setInitialScripts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
        Loading SmartAI scripts...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F0F2F5]">
      <SmartAiDetailEditor
        entryorguid={creatureEntry}
        sourceType={0}
        scripts={scripts}
        setScripts={setScripts}
        initialScripts={initialScripts}
        setInitialScripts={setInitialScripts}
        isDirty={isDirty}
        setIsDirty={setIsDirty}
        hideHeader={true}
      />
    </div>
  );
};
