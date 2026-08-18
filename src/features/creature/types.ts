// Types for the creature module: the template row and the sub-tables it owns.

// The selector-modal state is shared by every schema-driven editor.
export type { SelectorModalState } from '../../components/fields/types';

/**
 * One `creature_template` row.
 *
 * Field order and types mirror the table definition; see
 * `creatureTemplateSchema.ts` for the authoritative column metadata that drives
 * the editor and the SQL generators. The four nullable text columns are the
 * only ones that may hold `null`.
 *
 * `npcflag` is a 64-bit column. It is carried as a number because the highest
 * flag HavenCore defines is bit 43, well inside the exact-integer range, but
 * all bit arithmetic on it must use BigInt.
 */
export interface CreatureTemplate {
  entry: number;
  difficulty_entry_1: number;
  difficulty_entry_2: number;
  difficulty_entry_3: number;
  KillCredit1: number;
  KillCredit2: number;
  name: string;
  femaleName: string | null;
  subname: string | null;
  TitleAlt: string | null;
  IconName: string | null;
  gossip_menu_id: number;
  minlevel: number;
  maxlevel: number;
  HealthScalingExpansion: number;
  RequiredExpansion: number;
  VignetteID: number;
  /** FactionTemplate id, not a Faction id. */
  faction: number;
  npcflag: number;
  speed_walk: number;
  speed_run: number;
  scale: number;
  rank: number;
  dmgschool: number;
  BaseAttackTime: number;
  RangeAttackTime: number;
  BaseVariance: number;
  RangeVariance: number;
  unit_class: number;
  unit_flags: number;
  unit_flags2: number;
  unit_flags3: number;
  dynamicflags: number;
  family: number;
  /** Present in the table but not read by HavenCore. */
  trainer_type: number;
  trainer_class: number;
  /** Present in the table but not read by HavenCore. */
  trainer_race: number;
  type: number;
  type_flags: number;
  type_flags2: number;
  lootid: number;
  pickpocketloot: number;
  skinloot: number;
  resistance1: number;
  resistance2: number;
  resistance3: number;
  resistance4: number;
  resistance5: number;
  resistance6: number;
  spell1: number;
  spell2: number;
  spell3: number;
  spell4: number;
  spell5: number;
  spell6: number;
  spell7: number;
  spell8: number;
  VehicleId: number;
  mingold: number;
  maxgold: number;
  AIName: string;
  MovementType: number;
  InhabitType: number;
  HoverHeight: number;
  HealthModifier: number;
  HealthModifierExtra: number;
  ManaModifier: number;
  ManaModifierExtra: number;
  ArmorModifier: number;
  DamageModifier: number;
  ExperienceModifier: number;
  RacialLeader: number;
  movementId: number;
  FadeRegionRadius: number;
  WidgetSetID: number;
  WidgetSetUnitConditionID: number;
  RegenHealth: number;
  mechanic_immune_mask: number;
  flags_extra: number;
  ScriptName: string;
  /** Present in the table but not read by HavenCore. */
  VerifiedBuild: number;
  /** Editor-only marker for a record that does not exist in the database yet. */
  _isNew?: boolean;
}

export interface CreatureSearchRow {
  entry: number;
  name: string;
  subname: string;
  minlevel: number;
  maxlevel: number;
  AIName: string;
  ScriptName: string;
}

export type CreatureSortKey = keyof CreatureSearchRow;

export interface CreatureTemplateModel {
  CreatureID: number;
  Idx: number;
  CreatureDisplayID: number;
  DisplayScale: number;
  Probability: number;
  VerifiedBuild?: number;
}

export interface CreatureTemplateAddon {
  entry: number;
  path_id: number;
  mount: number;
  bytes1: number;
  bytes2: number;
  emote: number;
  aiAnimKit: number;
  movementAnimKit: number;
  meleeAnimKit: number;
  visibilityDistanceType: number;
  auras: string;
}

export interface CreatureTemplateScaling {
  Entry: number;
  DifficultyID: number;
  LevelScalingMin: number;
  LevelScalingMax: number;
  LevelScalingDeltaMin: number;
  LevelScalingDeltaMax: number;
  ContentTuningID: number;
  VerifiedBuild?: number;
}

export interface CreatureEquipTemplate {
  CreatureID: number;
  ID: number;
  ItemID1: number;
  AppearanceModID1: number;
  ItemVisual1: number;
  ItemID2: number;
  AppearanceModID2: number;
  ItemVisual2: number;
  ItemID3: number;
  AppearanceModID3: number;
  ItemVisual3: number;
  VerifiedBuild?: number;
}

export interface CreatureVendorItem {
  entry: number;
  slot: number;
  item: number;
  maxcount: number;
  incrtime: number;
  ExtendedCost: number;
  OverrideGoldCost: number;
  type: number;
  BonusListIDs?: string;
  PlayerConditionID: number;
  IgnoreFiltering: number;
  VerifiedBuild?: number;
}

export interface CreatureTrainerItem {
  CreatureId: number;
  TrainerId: number;
  MenuId: number;
  OptionIndex: number;
}

export interface CreatureOnKillReward {
  creature_id: number;
  RewOnKillRepFaction1: number;
  RewOnKillRepFaction2: number;
  MaxStanding1: number;
  IsTeamAward1: number;
  RewOnKillRepValue1: number;
  MaxStanding2: number;
  IsTeamAward2: number;
  RewOnKillRepValue2: number;
  TeamDependent: number;
  CurrencyId1: number;
  CurrencyId2: number;
  CurrencyId3: number;
  CurrencyCount1: number;
  CurrencyCount2: number;
  CurrencyCount3: number;
}

export interface CreatureQuestItem {
  CreatureEntry: number;
  idx: number;
  ItemId: number;
  VerifiedBuild?: number;
}

export interface CreatureQuestRelation {
  id: number;
  quest: number;
  type: 'starter' | 'ender';
}

export interface CreatureSpawnRow {
  guid: number;
  id: number;
  map: number;
  zoneId?: number;
  areaId?: number;
  spawnMask?: number;
  phaseMask?: number;
  position_x: number;
  position_y: number;
  position_z: number;
  orientation: number;
  spawntimesecs: number;
  curhealth?: number;
  curmana?: number;
  MovementType?: number;
  spawnDifficulties?: string;
}

export interface CreatureSpawnAddon {
  guid: number;
  path_id: number;
  mount: number;
  bytes1: number;
  bytes2: number;
  emote: number;
  aiAnimKit?: number;
  movementAnimKit?: number;
  meleeAnimKit?: number;
  visibilityDistanceType?: number;
  auras: string;
}

export interface CreatureSmartScriptRow {
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
  target_param4: number;
  target_x: number;
  target_y: number;
  target_z: number;
  target_o: number;
  comment: string;
}

export interface CreatureTextRow {
  CreatureID: number;
  GroupID: number;
  ID: number;
  Text?: string;
  Type: number;
  Language: number;
  Probability: number;
  Emote: number;
  Duration: number;
  Sound: number;
  BroadcastTextId: number;
  TextRange: number;
  comment?: string;
}

export interface CreatureFormationRow {
  leaderGUID: number;
  memberGUID: number;
  dist: number;
  angle: number;
  groupAI: number;
  point_1: number;
  point_2: number;
}
