// Diff and full query generation for smart_scripts.

import { escapeSqlString } from '../../../lib/utils';
import { SmartScriptRow } from '../types';

export function isSmartAiModified(initial: SmartScriptRow[], current: SmartScriptRow[]): boolean {
  if (!initial && !current) return false;
  if (!initial || !current) return true;
  if (initial.length !== current.length) return true;

  for (let i = 0; i < current.length; i++) {
    const init = initial[i];
    const curr = current[i];
    if (!init || !curr) return true;

    const keys: (keyof SmartScriptRow)[] = [
      'id',
      'link',
      'event_type',
      'event_phase_mask',
      'event_chance',
      'event_flags',
      'event_param1',
      'event_param2',
      'event_param3',
      'event_param4',
      'event_param5',
      'event_param_string',
      'action_type',
      'action_param1',
      'action_param2',
      'action_param3',
      'action_param4',
      'action_param5',
      'action_param6',
      'target_type',
      'target_param1',
      'target_param2',
      'target_param3',
      'target_x',
      'target_y',
      'target_z',
      'target_o',
      'comment',
    ];

    for (const k of keys) {
      if (init[k] !== curr[k]) return true;
    }
  }

  return false;
}

export function generateDiffQuery(
  entryorguid: number,
  source_type: number,
  initial: SmartScriptRow[],
  current: SmartScriptRow[]
): string {
  if (!isSmartAiModified(initial, current)) return '';
  return generateFullQuery(entryorguid, source_type, current);
}

export function generateFullQuery(
  entryorguid: number,
  source_type: number,
  scripts: SmartScriptRow[]
): string {
  if (!scripts || scripts.length === 0) {
    return `DELETE FROM \`smart_scripts\` WHERE \`entryorguid\` = ${entryorguid} AND \`source_type\` = ${source_type};`;
  }

  const values = scripts
    .map(
      (s) =>
        `  (${entryorguid}, ${source_type}, ${s.id}, ${s.link || 0}, ${s.event_type || 0}, ${s.event_phase_mask || 0}, ${s.event_chance ?? 100}, ${s.event_flags || 0}, ${s.event_param1 || 0}, ${s.event_param2 || 0}, ${s.event_param3 || 0}, ${s.event_param4 || 0}, ${s.event_param5 || 0}, '${escapeSqlString(s.event_param_string || '')}', ${s.action_type || 0}, ${s.action_param1 || 0}, ${s.action_param2 || 0}, ${s.action_param3 || 0}, ${s.action_param4 || 0}, ${s.action_param5 || 0}, ${s.action_param6 || 0}, ${s.target_type || 0}, ${s.target_param1 || 0}, ${s.target_param2 || 0}, ${s.target_param3 || 0}, ${s.target_x || 0}, ${s.target_y || 0}, ${s.target_z || 0}, ${s.target_o || 0}, '${escapeSqlString(s.comment || '')}')`
    )
    .join(',\n');

  return `DELETE FROM \`smart_scripts\` WHERE \`entryorguid\` = ${entryorguid} AND \`source_type\` = ${source_type};
INSERT INTO \`smart_scripts\` (
  \`entryorguid\`, \`source_type\`, \`id\`, \`link\`, \`event_type\`, \`event_phase_mask\`, \`event_chance\`, \`event_flags\`,
  \`event_param1\`, \`event_param2\`, \`event_param3\`, \`event_param4\`, \`event_param5\`, \`event_param_string\`,
  \`action_type\`, \`action_param1\`, \`action_param2\`, \`action_param3\`, \`action_param4\`, \`action_param5\`, \`action_param6\`,
  \`target_type\`, \`target_param1\`, \`target_param2\`, \`target_param3\`, \`target_x\`, \`target_y\`, \`target_z\`, \`target_o\`, \`comment\`
) VALUES
${values};`;
}
