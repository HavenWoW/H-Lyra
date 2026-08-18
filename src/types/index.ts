// Shared types for database connections, query results and module routing.

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  world_db: string;
  hotfixes_db: string;
}

export interface QueryResult {
  success: boolean;
  columns: string[];
  rows: any[][];
  affected_rows: number;
  execution_time_ms: number;
  error?: string;
}

export interface TableSummary {
  table_name: string;
  row_count: number;
  data_size_bytes: number;
}

export interface TableColumnInfo {
  name: string;
  data_type: string;
  is_nullable: boolean;
  column_key: string;
  default_value: string | null;
  comment: string;
}

export interface ParamDefinition {
  name: string;
  description: string;
  param_type: string;
  default_val: number;
}

export interface SmartEventDefinition {
  id: number;
  name: string;
  description: string;
  params: ParamDefinition[];
  string_param: string | null;
}

export interface SmartActionDefinition {
  id: number;
  name: string;
  description: string;
  params: ParamDefinition[];
}

export interface SmartTargetDefinition {
  id: number;
  name: string;
  description: string;
  params: ParamDefinition[];
  has_coords: boolean;
}

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

export interface CreatureTemplateModel {
  CreatureID: number;
  Idx: number;
  CreatureDisplayID: number;
  DisplayScale: number;
  Probability: number;
  VerifiedBuild: number;
}

export interface QuestObjective {
  ID: number;
  QuestID: number;
  Type: number;
  Order: number;
  StorageIndex: number;
  ObjectID: number;
  Amount: number;
  Flags: number;
  Flags2: number;
  ProgressBarWeight: number;
  Description: string | null;
  VerifiedBuild: number;
}

export interface ConditionRow {
  SourceTypeOrReferenceId: number;
  SourceGroup: number;
  SourceEntry: number;
  SourceId: number;
  ElseGroup: number;
  ConditionTypeOrReference: number;
  ConditionTarget: number;
  ConditionValue1: number;
  ConditionValue2: number;
  ConditionValue3: number;
  NegativeCondition: number;
  ErrorType: number;
  ErrorTextId: number;
  ScriptName: string;
  Comment: string | null;
}
