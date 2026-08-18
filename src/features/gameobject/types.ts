// Types for the gameobject module and its sub-tables.

// The selector-modal state is shared by every schema-driven editor.
export type { SelectorModalState } from '../../components/fields/types';

export interface GameObjectSearchRow {
  entry: number;
  name: string;
  type: number;
  typeName?: string;
  displayId: number;
  AIName: string;
  ScriptName: string;
}

export type GameObjectSortKey = keyof GameObjectSearchRow;

export interface GameObjectTemplateAddon {
  entry: number;
  faction: number;
  flags: number;
  mingold: number;
  maxgold: number;
  WorldEffectID: number;
  AIAnimKitID: number;
}

export interface GameObjectQuestItemRow {
  GameObjectEntry: number;
  Idx: number;
  ItemId: number;
  VerifiedBuild?: number;
}

export interface GameObjectSpawnRow {
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
  rotation0: number;
  rotation1: number;
  rotation2: number;
  rotation3: number;
  spawntimesecs: number;
  animprogress: number;
  state: number;
}

export interface GameObjectSpawnAddonRow {
  guid: number;
  parent_rotation0: number;
  parent_rotation1: number;
  parent_rotation2: number;
  parent_rotation3: number;
  invisibilityType: number;
  invisibilityValue: number;
  WorldEffectID: number;
}

