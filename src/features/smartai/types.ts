// Types for SmartAI scripts and their event, action and target parameters.

export interface SmartScriptRow {
  entryorguid: number;
  source_type: number;
  id: number;
  link: number;
  event_type: number;
  event_phase_mask: number;
  event_chance: number;
  event_flags: number;
  event_param1: number;
  event_param2: number;
  event_param3: number;
  event_param4: number;
  event_param5: number;
  event_param_string: string;
  action_type: number;
  action_param1: number;
  action_param2: number;
  action_param3: number;
  action_param4: number;
  action_param5: number;
  action_param6: number;
  target_type: number;
  target_param1: number;
  target_param2: number;
  target_param3: number;
  target_x: number;
  target_y: number;
  target_z: number;
  target_o: number;
  comment: string;
}

export interface SmartAiSearchRow {
  entryorguid: number;
  source_type: number;
  sourceTypeName: string;
  line_count: number;
  comment: string;
}

export type SmartAiSortKey = keyof SmartAiSearchRow;
