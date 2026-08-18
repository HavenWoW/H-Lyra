// Per-type meaning of the gameobject_template Data0..Data33 columns.
//
// Those 34 columns are a raw union: what each Data slot means depends entirely
// on the object's `type`. This module encodes the meaning for all 58 GameObject
// types, transcribed directly from HavenCore's `GameObjectTemplate` union in
// `src/server/game/Entities/GameObject/GameObjectData.h`.
//
// Each field carries the slot index, the HavenCore field name, and the editor
// control that fits it:
//   - `bool`   — union `enum { false, true }`
//   - `enum`   — union multi-value `enum { … }`, with the value list
//   - `entity` — union `References:` a store that Lyra already has a picker for
//                (Spell, GameObjects, QuestV2/QuestGiver, Item)
//   - `int`    — everything else; references to stores without a picker keep the
//                store name in the hint so the id is still meaningful
//
// A `type` whose slot is not described here (or any index past its list) is
// preserved and edited as a raw signed integer, so unknown or unsupported data
// is never lost.

import { SelectOption } from '../../../constants/itemOptions';

export type DataEditorKind = 'bool' | 'int' | 'enum' | 'entity';

/** Entity stores that have an existing Phase-1 selector. */
export type DataEntityType = 'spell' | 'gameobject' | 'quest' | 'item';

export interface DataFieldDef {
  /** Which Data slot (0..33). */
  index: number;
  /** HavenCore field name for this slot under the object's type. */
  name: string;
  editor: DataEditorKind;
  /** Picker to use for `entity` fields. */
  entityType?: DataEntityType;
  /** Value list for `enum` fields. */
  options?: SelectOption[];
  /** Extra guidance: the referenced store, or a value range. */
  hint?: string;
}

// ---- builders ------------------------------------------------------------
const bool = (index: number, name: string, hint?: string): DataFieldDef => ({
  index,
  name,
  editor: 'bool',
  hint,
});
const int = (index: number, name: string, hint?: string): DataFieldDef => ({
  index,
  name,
  editor: 'int',
  hint,
});
const ent = (
  index: number,
  name: string,
  entityType: DataEntityType,
  hint?: string
): DataFieldDef => ({ index, name, editor: 'entity', entityType, hint });
const en = (
  index: number,
  name: string,
  options: SelectOption[],
  hint?: string
): DataFieldDef => ({ index, name, editor: 'enum', options, hint });

const opt = (names: string[]): SelectOption[] =>
  names.map((name, value) => ({ value, name: `${value}: ${name}` }));

// ---- value enums referenced below ----------------------------------------
const XP_DIFFICULTY = opt([
  'No Exp',
  'Trivial',
  'Very Small',
  'Small',
  'Substandard',
  'Standard',
  'High',
  'Epic',
  'Dungeon',
  '9',
]);
const INSTANCE_TYPE = opt([
  'Not Instanced',
  'Party Dungeon',
  'Raid Dungeon',
  'PVP Battlefield',
  'Arena Battlefield',
  'Scenario',
]);
const FORGE_TYPE = opt(['Artifact Forge', 'Relic Forge', 'Heart Forge']);
const UI_LINK_TYPE = opt(['Adventure Journal', 'Obliterum Forge', 'Scrapping Machine']);
const INITIAL_DAMAGE = opt(['None', 'Raw', 'Ratio']);

// Reference-store hints for id columns that have no dedicated picker.
const LOCK = 'Lock.db2 id';
const BTEXT = 'BroadcastText id';
const COND = 'PlayerCondition id';
const EVENT = 'GameEvents id';
const TREASURE = 'Treasure id';
const VIGNETTE = 'vignette id';
const WSTATE = 'WorldState id';
const MAP = 'Map id (NoValue = -1)';

/**
 * Data slot descriptions per GameObject type. Types with an empty union body
 * (binder, mapobject, fishing node, etc.) are absent, so all of their Data
 * slots render as raw integers.
 */
export const GAMEOBJECT_TYPE_DATA: Record<number, DataFieldDef[]> = {
  // 0 DOOR
  0: [
    bool(0, 'startOpen'),
    int(1, 'open', LOCK),
    int(2, 'autoClose', 'ms'),
    bool(3, 'noDamageImmune'),
    int(4, 'openTextID', BTEXT),
    int(5, 'closeTextID', BTEXT),
    bool(6, 'IgnoredByPathing'),
    int(7, 'conditionID1', COND),
    bool(8, 'DoorisOpaque'),
    bool(9, 'GiganticAOI'),
    bool(10, 'InfiniteAOI'),
    bool(11, 'NotLOSBlocking'),
  ],
  // 1 BUTTON
  1: [
    bool(0, 'startOpen'),
    int(1, 'open', LOCK),
    int(2, 'autoClose', 'ms'),
    ent(3, 'linkedTrap', 'gameobject'),
    bool(4, 'noDamageImmune'),
    bool(5, 'GiganticAOI'),
    int(6, 'openTextID', BTEXT),
    int(7, 'closeTextID', BTEXT),
    bool(8, 'requireLOS'),
    int(9, 'conditionID1', COND),
  ],
  // 2 QUESTGIVER
  2: [
    int(0, 'open', LOCK),
    ent(1, 'questGiver', 'quest'),
    int(2, 'pageMaterial', 'PageTextMaterial id'),
    int(3, 'gossipID', 'Gossip menu id'),
    int(4, 'customAnim', '0..4'),
    bool(5, 'noDamageImmune'),
    int(6, 'openTextID', BTEXT),
    bool(7, 'requireLOS'),
    bool(8, 'allowMounted'),
    bool(9, 'GiganticAOI'),
    int(10, 'conditionID1', COND),
    bool(11, 'NeverUsableWhileMounted'),
  ],
  // 3 CHEST
  3: [
    int(0, 'open', LOCK),
    int(1, 'chestLoot', TREASURE),
    int(2, 'chestRestockTime', 'ms'),
    bool(3, 'consumable'),
    int(4, 'minRestock'),
    int(5, 'maxRestock'),
    int(6, 'triggeredEvent', EVENT),
    ent(7, 'linkedTrap', 'gameobject'),
    ent(8, 'questID', 'quest'),
    int(9, 'level'),
    bool(10, 'requireLOS'),
    bool(11, 'leaveLoot'),
    bool(12, 'notInCombat'),
    bool(13, 'logloot'),
    int(14, 'openTextID', BTEXT),
    bool(15, 'usegrouplootrules'),
    bool(16, 'floatingTooltip'),
    int(17, 'conditionID1', COND),
    int(18, 'XPLevelRange', 'ContentTuning id'),
    en(19, 'xpDifficulty', XP_DIFFICULTY),
    int(20, 'lootLevel', '0..123'),
    bool(21, 'GroupXP'),
    bool(22, 'DamageImmuneOK'),
    int(23, 'trivialSkillLow'),
    int(24, 'trivialSkillHigh'),
    int(25, 'DungeonEncounter', 'DungeonEncounter id'),
    ent(26, 'spell', 'spell'),
    bool(27, 'GiganticAOI'),
    bool(28, 'LargeAOI'),
    int(29, 'SpawnVignette', VIGNETTE),
    int(30, 'chestPersonalLoot', TREASURE),
    bool(31, 'turnpersonallootsecurityoff'),
    int(32, 'ChestProperties', 'ChestProperties id'),
    int(33, 'chestPushLoot', TREASURE),
  ],
  // 5 GENERIC
  5: [
    bool(0, 'floatingTooltip'),
    bool(1, 'highlight'),
    bool(2, 'serverOnly'),
    bool(3, 'GiganticAOI'),
    bool(4, 'floatOnWater'),
    ent(5, 'questID', 'quest'),
    int(6, 'conditionID1', COND),
    bool(7, 'LargeAOI'),
    bool(8, 'UseGarrisonOwnerGuildColors'),
  ],
  // 6 TRAP
  6: [
    int(0, 'open', LOCK),
    int(1, 'level'),
    int(2, 'radius'),
    ent(3, 'spell', 'spell'),
    int(4, 'charges'),
    int(5, 'cooldown'),
    int(6, 'autoClose', 'ms'),
    int(7, 'startDelay'),
    bool(8, 'serverOnly'),
    bool(9, 'stealthed'),
    bool(10, 'GiganticAOI'),
    bool(11, 'stealthAffected'),
    int(12, 'openTextID', BTEXT),
    int(13, 'closeTextID', BTEXT),
    bool(14, 'IgnoreTotems'),
    int(15, 'conditionID1', COND),
    bool(16, 'playerCast'),
    bool(17, 'SummonerTriggered'),
    bool(18, 'requireLOS'),
    int(19, 'TriggerCondition', COND),
    bool(20, 'Checkallunits'),
  ],
  // 7 CHAIR
  7: [
    int(0, 'chairslots', '1..5'),
    int(1, 'chairheight', '0..2'),
    bool(2, 'onlyCreatorUse'),
    int(3, 'triggeredEvent', EVENT),
    int(4, 'conditionID1', COND),
  ],
  // 8 SPELL_FOCUS
  8: [
    int(0, 'spellFocusType', 'SpellFocusObject id'),
    int(1, 'radius'),
    ent(2, 'linkedTrap', 'gameobject'),
    bool(3, 'serverOnly'),
    ent(4, 'questID', 'quest'),
    bool(5, 'GiganticAOI'),
    bool(6, 'floatingTooltip'),
    bool(7, 'floatOnWater'),
    int(8, 'conditionID1', COND),
  ],
  // 9 TEXT
  9: [
    int(0, 'pageID', 'PageText id'),
    int(1, 'language', 'Languages id'),
    int(2, 'pageMaterial', 'PageTextMaterial id'),
    bool(3, 'allowMounted'),
    int(4, 'conditionID1', COND),
    bool(5, 'NeverUsableWhileMounted'),
  ],
  // 10 GOOBER
  10: [
    int(0, 'open', LOCK),
    ent(1, 'questID', 'quest'),
    int(2, 'eventID', EVENT),
    int(3, 'autoClose', 'ms'),
    int(4, 'customAnim', '0..4'),
    bool(5, 'consumable'),
    int(6, 'cooldown'),
    int(7, 'pageID', 'PageText id'),
    int(8, 'language', 'Languages id'),
    int(9, 'pageMaterial', 'PageTextMaterial id'),
    ent(10, 'spell', 'spell'),
    bool(11, 'noDamageImmune'),
    ent(12, 'linkedTrap', 'gameobject'),
    bool(13, 'GiganticAOI'),
    int(14, 'openTextID', BTEXT),
    int(15, 'closeTextID', BTEXT),
    bool(16, 'requireLOS'),
    bool(17, 'allowMounted'),
    bool(18, 'floatingTooltip'),
    int(19, 'gossipID', 'Gossip menu id'),
    bool(20, 'AllowMultiInteract'),
    bool(21, 'floatOnWater'),
    int(22, 'conditionID1', COND),
    bool(23, 'playerCast'),
    int(24, 'SpawnVignette', VIGNETTE),
    bool(25, 'startOpen'),
    bool(26, 'DontPlayOpenAnim'),
    bool(27, 'IgnoreBoundingBox'),
    bool(28, 'NeverUsableWhileMounted'),
    bool(29, 'SortFarZ'),
    bool(30, 'SyncAnimationtoObjectLifetime'),
    bool(31, 'NoFuzzyHit'),
  ],
  // 11 TRANSPORT
  11: [
    int(0, 'Timeto2ndfloor', 'ms'),
    bool(1, 'startOpen'),
    int(2, 'autoClose', 'ms'),
    int(3, 'Reached1stfloor', EVENT),
    int(4, 'Reached2ndfloor', EVENT),
    int(5, 'SpawnMap', MAP),
    int(6, 'Timeto3rdfloor', 'ms'),
    int(7, 'Reached3rdfloor', EVENT),
    int(8, 'Timeto4thfloor', 'ms'),
    int(9, 'Reached4thfloor', EVENT),
    int(10, 'Timeto5thfloor', 'ms'),
    int(11, 'Reached5thfloor', EVENT),
    int(12, 'Timeto6thfloor', 'ms'),
    int(13, 'Reached6thfloor', EVENT),
    int(14, 'Timeto7thfloor', 'ms'),
    int(15, 'Reached7thfloor', EVENT),
    int(16, 'Timeto8thfloor', 'ms'),
    int(17, 'Reached8thfloor', EVENT),
    int(18, 'Timeto9thfloor', 'ms'),
    int(19, 'Reached9thfloor', EVENT),
    int(20, 'Timeto10thfloor', 'ms'),
    int(21, 'Reached10thfloor', EVENT),
    int(22, 'onlychargeheightcheck', 'yards'),
    int(23, 'onlychargetimecheck'),
  ],
  // 12 AREADAMAGE
  12: [
    int(0, 'open', LOCK),
    int(1, 'radius'),
    int(2, 'damageMin'),
    int(3, 'damageMax'),
    int(4, 'damageSchool'),
    int(5, 'autoClose', 'ms'),
    int(6, 'openTextID', BTEXT),
    int(7, 'closeTextID', BTEXT),
  ],
  // 13 CAMERA
  13: [
    int(0, 'open', LOCK),
    int(1, 'camera', 'CinematicSequences id'),
    int(2, 'eventID', EVENT),
    int(3, 'openTextID', BTEXT),
    int(4, 'conditionID1', COND),
  ],
  // 15 MAP_OBJ_TRANSPORT
  15: [
    int(0, 'taxiPathID', 'TaxiPath id'),
    int(1, 'moveSpeed', '1..60'),
    int(2, 'accelRate', '1..20'),
    int(3, 'startEventID', EVENT),
    int(4, 'stopEventID', EVENT),
    int(5, 'transportPhysics', 'TransportPhysics id'),
    int(6, 'SpawnMap', MAP),
    int(7, 'worldState1', WSTATE),
    bool(8, 'allowstopping'),
    bool(9, 'InitStopped'),
    bool(10, 'TrueInfiniteAOI'),
  ],
  // 18 RITUAL
  18: [
    int(0, 'casters', '1..10'),
    ent(1, 'spell', 'spell'),
    ent(2, 'animSpell', 'spell'),
    bool(3, 'ritualPersistent'),
    ent(4, 'casterTargetSpell', 'spell'),
    int(5, 'casterTargetSpellTargets', '1..10'),
    bool(6, 'castersGrouped'),
    bool(7, 'ritualNoTargetCheck'),
    int(8, 'conditionID1', COND),
  ],
  // 19 MAILBOX
  19: [int(0, 'conditionID1', COND)],
  // 21 GUARDPOST
  21: [
    int(0, 'creatureID', 'Creature id'),
    int(1, 'charges'),
    bool(2, 'Preferonlyifinlineofsight'),
  ],
  // 22 SPELLCASTER
  22: [
    ent(0, 'spell', 'spell'),
    int(1, 'charges', '-1..65535'),
    bool(2, 'partyOnly'),
    bool(3, 'allowMounted'),
    bool(4, 'GiganticAOI'),
    int(5, 'conditionID1', COND),
    bool(6, 'playerCast'),
    bool(7, 'NeverUsableWhileMounted'),
  ],
  // 23 MEETINGSTONE
  23: [
    int(0, 'minLevel'),
    int(1, 'maxLevel'),
    int(2, 'areaID', 'AreaTable id'),
  ],
  // 24 FLAGSTAND
  24: [
    int(0, 'open', LOCK),
    ent(1, 'pickupSpell', 'spell'),
    int(2, 'radius'),
    ent(3, 'returnAura', 'spell'),
    ent(4, 'returnSpell', 'spell'),
    bool(5, 'noDamageImmune'),
    int(6, 'openTextID', BTEXT),
    bool(7, 'requireLOS'),
    int(8, 'conditionID1', COND),
    bool(9, 'playerCast'),
    bool(10, 'GiganticAOI'),
    bool(11, 'InfiniteAOI'),
    int(12, 'cooldown'),
  ],
  // 25 FISHINGHOLE
  25: [
    int(0, 'radius'),
    int(1, 'chestLoot', TREASURE),
    int(2, 'minRestock'),
    int(3, 'maxRestock'),
    int(4, 'open', LOCK),
  ],
  // 26 FLAGDROP
  26: [
    int(0, 'open', LOCK),
    int(1, 'eventID', EVENT),
    ent(2, 'pickupSpell', 'spell'),
    bool(3, 'noDamageImmune'),
    int(4, 'openTextID', BTEXT),
    bool(5, 'playerCast'),
    int(6, 'ExpireDuration', 'ms'),
    bool(7, 'GiganticAOI'),
    bool(8, 'InfiniteAOI'),
    int(9, 'cooldown'),
  ],
  // 29 CONTROL_ZONE
  29: [
    int(0, 'radius'),
    ent(1, 'spell', 'spell'),
    int(2, 'worldState1', WSTATE),
    int(3, 'worldstate2', WSTATE),
    int(4, 'CaptureEventHorde', EVENT),
    int(5, 'CaptureEventAlliance', EVENT),
    int(6, 'ContestedEventHorde', EVENT),
    int(7, 'ContestedEventAlliance', EVENT),
    int(8, 'ProgressEventHorde', EVENT),
    int(9, 'ProgressEventAlliance', EVENT),
    int(10, 'NeutralEventHorde', EVENT),
    int(11, 'NeutralEventAlliance', EVENT),
    int(12, 'neutralPercent', '0..100'),
    int(13, 'worldstate3', WSTATE),
    int(14, 'minSuperiority'),
    int(15, 'maxSuperiority'),
    int(16, 'minTime'),
    int(17, 'maxTime'),
    bool(18, 'GiganticAOI'),
    bool(19, 'highlight'),
    int(20, 'startingValue', '0..100'),
    bool(21, 'unidirectional'),
    int(22, 'killbonustime', '% 0..100'),
    int(23, 'speedWorldState1', WSTATE),
    int(24, 'speedWorldState2', WSTATE),
    int(25, 'UncontestedTime'),
    bool(26, 'FrequentHeartbeat'),
    int(27, 'EnablingWorldStateExpression', 'WorldStateExpression id'),
  ],
  // 30 AURA_GENERATOR
  30: [
    bool(0, 'startOpen'),
    int(1, 'radius'),
    ent(2, 'auraID1', 'spell'),
    int(3, 'conditionID1', COND),
    ent(4, 'auraID2', 'spell'),
    int(5, 'conditionID2', COND),
    bool(6, 'serverOnly'),
  ],
  // 31 DUNGEON_DIFFICULTY
  31: [
    en(0, 'InstanceType', INSTANCE_TYPE),
    int(1, 'DifficultyNormal', 'animationdata id'),
    int(2, 'DifficultyHeroic', 'animationdata id'),
    int(3, 'DifficultyEpic', 'animationdata id'),
    int(4, 'DifficultyLegendary', 'animationdata id'),
    int(5, 'HeroicAttachment', 'gameobjectdisplayinfo id'),
    int(6, 'ChallengeAttachment', 'gameobjectdisplayinfo id'),
    int(7, 'DifficultyAnimations', 'GameObjectDiffAnim id'),
    bool(8, 'LargeAOI'),
    bool(9, 'GiganticAOI'),
    bool(10, 'Legacy'),
  ],
  // 32 BARBER_CHAIR
  32: [
    int(0, 'chairheight', '0..2'),
    int(1, 'HeightOffset', 'inches, -100..100'),
    int(2, 'SitAnimKit', 'AnimKit id'),
  ],
  // 33 DESTRUCTIBLE_BUILDING
  33: [
    int(0, 'Unused'),
    int(1, 'CreditProxyCreature', 'Creature id'),
    int(2, 'HealthRec', 'DestructibleHitpoint id'),
    int(3, 'IntactEvent', EVENT),
    bool(4, 'PVPEnabling'),
    bool(5, 'InteriorVisible'),
    bool(6, 'InteriorLight'),
    int(7, 'Unused'),
    int(8, 'Unused'),
    int(9, 'DamagedEvent', EVENT),
    int(10, 'Unused'),
    int(11, 'Unused'),
    int(12, 'Unused'),
    int(13, 'Unused'),
    int(14, 'DestroyedEvent', EVENT),
    int(15, 'Unused'),
    int(16, 'RebuildingTime', 'secs'),
    int(17, 'Unused'),
    int(18, 'DestructibleModelRec', 'DestructibleModelData id'),
    int(19, 'RebuildingEvent', EVENT),
    int(20, 'Unused'),
    int(21, 'Unused'),
    int(22, 'DamageEvent', EVENT),
    bool(23, 'Displaymouseoverasanameplate'),
    int(24, 'Nameplate X offset', 'hundredths'),
    int(25, 'Nameplate Y offset', 'hundredths'),
    int(26, 'Nameplate Z offset', 'hundredths'),
  ],
  // 34 GUILD_BANK
  34: [int(0, 'conditionID1', COND)],
  // 35 TRAPDOOR
  35: [
    bool(0, 'AutoLink'),
    bool(1, 'startOpen'),
    int(2, 'autoClose', 'ms'),
    bool(3, 'BlocksPathsDown'),
    int(4, 'PathBlockerBump', 'ft'),
    bool(5, 'GiganticAOI'),
    bool(6, 'InfiniteAOI'),
    bool(7, 'DoorisOpaque'),
  ],
  // 36 NEW_FLAG
  36: [
    int(0, 'open', LOCK),
    ent(1, 'pickupSpell', 'spell'),
    int(2, 'openTextID', BTEXT),
    bool(3, 'requireLOS'),
    int(4, 'conditionID1', COND),
    bool(5, 'GiganticAOI'),
    bool(6, 'InfiniteAOI'),
    int(7, 'ExpireDuration', 'ms'),
    int(8, 'RespawnTime', 'ms'),
    ent(9, 'FlagDrop', 'gameobject'),
    int(10, 'ExclusiveCategory', 'BGs only'),
    int(11, 'worldState1', WSTATE),
    bool(12, 'ReturnonDefenderInteract'),
    int(13, 'SpawnVignette', VIGNETTE),
  ],
  // 37 NEW_FLAG_DROP
  37: [int(0, 'open', LOCK), int(1, 'SpawnVignette', VIGNETTE)],
  // 38 GARRISON_BUILDING
  38: [int(0, 'SpawnMap', MAP)],
  // 39 GARRISON_PLOT
  39: [int(0, 'PlotInstance', 'GarrPlotInstance id'), int(1, 'SpawnMap', MAP)],
  // 40 CLIENT_CREATURE
  40: [
    int(0, 'CreatureDisplayInfo', 'CreatureDisplayInfo id'),
    int(1, 'AnimKit', 'AnimKit id'),
    int(2, 'creatureID', 'Creature id'),
  ],
  // 41 CLIENT_ITEM
  41: [ent(0, 'Item', 'item')],
  // 42 CAPTURE_POINT
  42: [
    int(0, 'CaptureTime', 'ms'),
    bool(1, 'GiganticAOI'),
    bool(2, 'highlight'),
    int(3, 'open', LOCK),
    int(4, 'AssaultBroadcastHorde', BTEXT),
    int(5, 'CaptureBroadcastHorde', BTEXT),
    int(6, 'DefendedBroadcastHorde', BTEXT),
    int(7, 'AssaultBroadcastAlliance', BTEXT),
    int(8, 'CaptureBroadcastAlliance', BTEXT),
    int(9, 'DefendedBroadcastAlliance', BTEXT),
    int(10, 'worldState1', WSTATE),
    int(11, 'ContestedEventHorde', EVENT),
    int(12, 'CaptureEventHorde', EVENT),
    int(13, 'DefendedEventHorde', EVENT),
    int(14, 'ContestedEventAlliance', EVENT),
    int(15, 'CaptureEventAlliance', EVENT),
    int(16, 'DefendedEventAlliance', EVENT),
    int(17, 'SpellVisual1', 'SpellVisual id'),
    int(18, 'SpellVisual2', 'SpellVisual id'),
    int(19, 'SpellVisual3', 'SpellVisual id'),
    int(20, 'SpellVisual4', 'SpellVisual id'),
    int(21, 'SpellVisual5', 'SpellVisual id'),
    int(22, 'SpawnVignette', VIGNETTE),
  ],
  // 43 PHASEABLE_MO
  43: [
    int(0, 'SpawnMap', MAP),
    int(1, 'AreaNameSet', 'index'),
    int(2, 'DoodadSetA'),
    int(3, 'DoodadSetB'),
  ],
  // 44 GARRISON_MONUMENT
  44: [
    int(0, 'TrophyTypeID', 'TrophyType id'),
    int(1, 'TrophyInstanceID', 'TrophyInstance id'),
  ],
  // 45 GARRISON_SHIPMENT
  45: [
    int(0, 'ShipmentContainer', 'CharShipmentContainer id'),
    bool(1, 'GiganticAOI'),
    bool(2, 'LargeAOI'),
  ],
  // 46 GARRISON_MONUMENT_PLAQUE
  46: [int(0, 'TrophyInstanceID', 'TrophyInstance id')],
  // 47 ITEM_FORGE
  47: [
    int(0, 'conditionID1', COND),
    bool(1, 'LargeAOI'),
    bool(2, 'IgnoreBoundingBox'),
    int(3, 'CameraMode', 'CameraMode id'),
    int(4, 'FadeRegionRadius'),
    en(5, 'ForgeType', FORGE_TYPE),
  ],
  // 48 UI_LINK
  48: [
    en(0, 'UILinkType', UI_LINK_TYPE),
    bool(1, 'allowMounted'),
    bool(2, 'GiganticAOI'),
    int(3, 'spellFocusType', 'SpellFocusObject id'),
    int(4, 'radius'),
  ],
  // 50 GATHERING_NODE
  50: [
    int(0, 'open', LOCK),
    int(1, 'chestLoot', TREASURE),
    int(2, 'level'),
    bool(3, 'notInCombat'),
    int(4, 'trivialSkillLow'),
    int(5, 'trivialSkillHigh'),
    int(6, 'ObjectDespawnDelay'),
    int(7, 'triggeredEvent', EVENT),
    bool(8, 'requireLOS'),
    int(9, 'openTextID', BTEXT),
    bool(10, 'floatingTooltip'),
    int(11, 'conditionID1', COND),
    int(12, 'XPLevelRange', 'ContentTuning id'),
    en(13, 'xpDifficulty', XP_DIFFICULTY),
    ent(14, 'spell', 'spell'),
    bool(15, 'GiganticAOI'),
    bool(16, 'LargeAOI'),
    int(17, 'SpawnVignette', VIGNETTE),
    int(18, 'MaxNumberofLoots', '1..40'),
    bool(19, 'logloot'),
    ent(20, 'linkedTrap', 'gameobject'),
    bool(21, 'PlayOpenAnimationonOpening'),
    bool(22, 'turnpersonallootsecurityoff'),
    bool(23, 'ClearObjectVignetteonOpening'),
  ],
  // 51 CHALLENGE_MODE_REWARD
  51: [
    int(0, 'Unused'),
    int(1, 'WhenAvailable', 'GameObjectDisplayInfo id'),
    int(2, 'open', LOCK),
    int(3, 'openTextID', BTEXT),
  ],
  // 52 MULTI
  52: [int(0, 'MultiProperties', 'MultiProperties id')],
  // 53 SIEGEABLE_MULTI
  53: [
    int(0, 'MultiProperties', 'MultiProperties id'),
    en(1, 'InitialDamage', INITIAL_DAMAGE),
  ],
  // 54 SIEGEABLE_MO
  54: [
    int(0, 'SiegeableProperties', 'SiegeableProperties id'),
    int(1, 'DoodadSetA'),
    int(2, 'DoodadSetB'),
    int(3, 'DoodadSetC'),
    int(4, 'SpawnMap', MAP),
    int(5, 'AreaNameSet', 'index'),
  ],
  // 55 PVP_REWARD
  55: [
    int(0, 'Unused'),
    int(1, 'WhenAvailable', 'GameObjectDisplayInfo id'),
    int(2, 'open', LOCK),
    int(3, 'openTextID', BTEXT),
  ],
};

/** Slot descriptions for a type, or an empty list for types with a raw union. */
export const dataFieldsForType = (type: number): DataFieldDef[] =>
  GAMEOBJECT_TYPE_DATA[type] ?? [];

/** Lookup of a single slot's description for a type, if any. */
export const dataFieldDef = (type: number, index: number): DataFieldDef | undefined =>
  dataFieldsForType(type).find((field) => field.index === index);
