// Structural definition of the `quest_template` table.
//
// Single source of truth for the Quest Template editor: it drives the typed
// record, the new-record defaults, the card layout, and both the diff and full
// query generators. Adding a column here makes it appear in every one of those
// places at once, which is what keeps a DELETE + INSERT lossless.
//
// Column order matches the table definition exactly, so generated INSERT
// statements are deterministic and diffable. The table has 123 columns and
// HavenCore's `ObjectMgr::LoadQuests` reads 122 of them; only `VerifiedBuild`
// is ignored. Types, signedness, nullability and defaults come from the table
// definition; signedness in particular matters because `QuestLevel` defaults to
// -1 and several reward and world-state columns are legitimately negative.

import { SqlColumnFormat } from '../../../lib/sql';
import {
  TableColumn,
  text as textColumn,
  int as intColumn,
  float as floatColumn,
  columnFormat as sharedColumnFormat,
  columnsForGroup as sharedColumnsForGroup,
  createDefaultRecord,
} from '../../../lib/tableSchema';
import { EXPANSIONS } from '../../../constants/creatureOptions';
import { ALLOWABLE_RACES } from '../../../constants/itemOptions';
import {
  QUEST_TYPE_OPTIONS,
  QUEST_INFO_OPTIONS,
  QUEST_FLAGS,
  QUEST_FLAGS_EX,
  QUEST_FLAGS_EX2,
} from '../../../constants/questOptions';

/** Card the column is rendered in. */
export type QuestFieldGroup =
  | 'identity'
  | 'level'
  | 'flags'
  | 'rewardXpMoney'
  | 'rewardSpell'
  | 'rewardItems'
  | 'rewardChoice'
  | 'rewardCurrency'
  | 'rewardReputation'
  | 'rewardOther'
  | 'poiPortrait'
  | 'soundArea'
  | 'worldSession'
  | 'texts'
  | 'advanced';

/** A `quest_template` column: the shared descriptor, grouped by this table's cards. */
export type QuestColumn = TableColumn<QuestFieldGroup>;

const text = (
  name: string,
  label: string,
  group: QuestFieldGroup,
  sqlType: string,
  nullable: boolean,
  defaultValue: string | null,
  extra: Partial<QuestColumn> = {}
): QuestColumn => textColumn(name, label, group, sqlType, nullable, defaultValue, extra);

const int = (
  name: string,
  label: string,
  group: QuestFieldGroup,
  sqlType: string,
  signed: boolean,
  defaultValue: number,
  extra: Partial<QuestColumn> = {}
): QuestColumn => intColumn(name, label, group, sqlType, signed, defaultValue, extra);

const float = (
  name: string,
  label: string,
  group: QuestFieldGroup,
  defaultValue: number,
  extra: Partial<QuestColumn> = {}
): QuestColumn => floatColumn(name, label, group, defaultValue, extra);

const item = { editor: 'entity', entityType: 'item' } as const;
const spell = { editor: 'entity', entityType: 'spell' } as const;
const currency = { editor: 'entity', entityType: 'currency' } as const;
const faction = { editor: 'entity', entityType: 'faction' } as const;
const sound = { editor: 'entity', entityType: 'sound' } as const;

/** Every column of `quest_template`, in table order. */
export const QUEST_TEMPLATE_COLUMNS: QuestColumn[] = [
  int('ID', 'Quest ID', 'identity', 'int unsigned', false, 0, { primaryKey: true }),
  int('QuestType', 'Quest Type', 'identity', 'tinyint unsigned', false, 2, {
    editor: 'enum',
    options: QUEST_TYPE_OPTIONS,
  }),
  int('QuestLevel', 'Quest Level', 'level', 'int', true, -1, {
    hint: '-1 scales the quest to the player level',
  }),
  int('ScalingFactionGroup', 'Scaling Faction Group', 'level', 'int', true, 0),
  int('MaxScalingLevel', 'Max Scaling Level', 'level', 'int', true, 255),
  int('QuestPackageID', 'Quest Package', 'identity', 'int unsigned', false, 0),
  int('MinLevel', 'Min Level', 'level', 'int', true, 0),
  int('QuestSortID', 'Quest Sort', 'identity', 'smallint', true, 0, {
    hint: 'Positive is an AreaTable id; negative is a QuestSort id',
  }),
  int('QuestInfoID', 'Quest Info', 'identity', 'smallint unsigned', false, 0, {
    editor: 'enum',
    options: QUEST_INFO_OPTIONS,
  }),
  int('SuggestedGroupNum', 'Suggested Players', 'identity', 'tinyint unsigned', false, 0),

  int('RewardNextQuest', 'Reward Next Quest', 'rewardXpMoney', 'int unsigned', false, 0, {
    editor: 'entity',
    entityType: 'quest',
  }),
  int('RewardXPDifficulty', 'Reward XP Difficulty', 'rewardXpMoney', 'int unsigned', false, 0, {
    hint: 'Row index into QuestXP.db2',
  }),
  float('RewardXPMultiplier', 'Reward XP Multiplier', 'rewardXpMoney', 1),
  int('RewardMoney', 'Reward Money', 'rewardXpMoney', 'int', true, 0, {
    hint: 'Copper; a negative value requires the player to pay',
  }),
  int('RewardMoneyDifficulty', 'Reward Money Difficulty', 'rewardXpMoney', 'int unsigned', false, 0),
  float('RewardMoneyMultiplier', 'Reward Money Multiplier', 'rewardXpMoney', 1),
  int('RewardBonusMoney', 'Reward Bonus Money', 'rewardXpMoney', 'int unsigned', false, 0),

  int('RewardDisplaySpell1', 'Display Spell 1', 'rewardSpell', 'int unsigned', false, 0, spell),
  int('RewardDisplaySpell2', 'Display Spell 2', 'rewardSpell', 'int unsigned', false, 0, spell),
  int('RewardDisplaySpell3', 'Display Spell 3', 'rewardSpell', 'int unsigned', false, 0, spell),
  int('RewardSpell', 'Reward Spell', 'rewardSpell', 'int unsigned', false, 0, {
    ...spell,
    hint: 'Spell cast on the player on turn-in',
  }),

  int('RewardHonor', 'Reward Honor', 'rewardXpMoney', 'int unsigned', false, 0),
  int('RewardKillHonor', 'Reward Kill Honor', 'rewardXpMoney', 'int unsigned', false, 0),

  int('StartItem', 'Start Item', 'rewardItems', 'int unsigned', false, 0, {
    ...item,
    hint: 'Item given when the quest is accepted',
  }),

  int('RewardArtifactXPDifficulty', 'Artifact XP Difficulty', 'rewardOther', 'int unsigned', false, 0),
  float('RewardArtifactXPMultiplier', 'Artifact XP Multiplier', 'rewardOther', 1),
  int('RewardArtifactCategoryID', 'Artifact Category', 'rewardOther', 'int unsigned', false, 0),

  int('Flags', 'Flags', 'flags', 'int unsigned', false, 0, { editor: 'flags', flags: QUEST_FLAGS }),
  int('FlagsEx', 'Flags Ex', 'flags', 'int unsigned', false, 0, {
    editor: 'flags',
    flags: QUEST_FLAGS_EX,
  }),
  int('FlagsEx2', 'Flags Ex 2', 'flags', 'int unsigned', false, 0, {
    editor: 'flags',
    flags: QUEST_FLAGS_EX2,
  }),

  int('RewardItem1', 'Reward Item 1', 'rewardItems', 'int unsigned', false, 0, item),
  int('RewardAmount1', 'Reward Amount 1', 'rewardItems', 'int unsigned', false, 0),
  int('RewardItem2', 'Reward Item 2', 'rewardItems', 'int unsigned', false, 0, item),
  int('RewardAmount2', 'Reward Amount 2', 'rewardItems', 'int unsigned', false, 0),
  int('RewardItem3', 'Reward Item 3', 'rewardItems', 'int unsigned', false, 0, item),
  int('RewardAmount3', 'Reward Amount 3', 'rewardItems', 'int unsigned', false, 0),
  int('RewardItem4', 'Reward Item 4', 'rewardItems', 'int unsigned', false, 0, item),
  int('RewardAmount4', 'Reward Amount 4', 'rewardItems', 'int unsigned', false, 0),

  int('ItemDrop1', 'Item Drop 1', 'rewardItems', 'int unsigned', false, 0, item),
  int('ItemDropQuantity1', 'Item Drop Quantity 1', 'rewardItems', 'int unsigned', false, 0),
  int('ItemDrop2', 'Item Drop 2', 'rewardItems', 'int unsigned', false, 0, item),
  int('ItemDropQuantity2', 'Item Drop Quantity 2', 'rewardItems', 'int unsigned', false, 0),
  int('ItemDrop3', 'Item Drop 3', 'rewardItems', 'int unsigned', false, 0, item),
  int('ItemDropQuantity3', 'Item Drop Quantity 3', 'rewardItems', 'int unsigned', false, 0),
  int('ItemDrop4', 'Item Drop 4', 'rewardItems', 'int unsigned', false, 0, item),
  int('ItemDropQuantity4', 'Item Drop Quantity 4', 'rewardItems', 'int unsigned', false, 0),

  int('RewardChoiceItemID1', 'Choice Item 1', 'rewardChoice', 'int unsigned', false, 0, item),
  int('RewardChoiceItemQuantity1', 'Choice Quantity 1', 'rewardChoice', 'int unsigned', false, 0),
  int('RewardChoiceItemDisplayID1', 'Choice Display 1', 'rewardChoice', 'int unsigned', false, 0),
  int('RewardChoiceItemID2', 'Choice Item 2', 'rewardChoice', 'int unsigned', false, 0, item),
  int('RewardChoiceItemQuantity2', 'Choice Quantity 2', 'rewardChoice', 'int unsigned', false, 0),
  int('RewardChoiceItemDisplayID2', 'Choice Display 2', 'rewardChoice', 'int unsigned', false, 0),
  int('RewardChoiceItemID3', 'Choice Item 3', 'rewardChoice', 'int unsigned', false, 0, item),
  int('RewardChoiceItemQuantity3', 'Choice Quantity 3', 'rewardChoice', 'int unsigned', false, 0),
  int('RewardChoiceItemDisplayID3', 'Choice Display 3', 'rewardChoice', 'int unsigned', false, 0),
  int('RewardChoiceItemID4', 'Choice Item 4', 'rewardChoice', 'int unsigned', false, 0, item),
  int('RewardChoiceItemQuantity4', 'Choice Quantity 4', 'rewardChoice', 'int unsigned', false, 0),
  int('RewardChoiceItemDisplayID4', 'Choice Display 4', 'rewardChoice', 'int unsigned', false, 0),
  int('RewardChoiceItemID5', 'Choice Item 5', 'rewardChoice', 'int unsigned', false, 0, item),
  int('RewardChoiceItemQuantity5', 'Choice Quantity 5', 'rewardChoice', 'int unsigned', false, 0),
  int('RewardChoiceItemDisplayID5', 'Choice Display 5', 'rewardChoice', 'int unsigned', false, 0),
  int('RewardChoiceItemID6', 'Choice Item 6', 'rewardChoice', 'int unsigned', false, 0, item),
  int('RewardChoiceItemQuantity6', 'Choice Quantity 6', 'rewardChoice', 'int unsigned', false, 0),
  int('RewardChoiceItemDisplayID6', 'Choice Display 6', 'rewardChoice', 'int unsigned', false, 0),

  int('POIContinent', 'POI Continent', 'poiPortrait', 'int unsigned', false, 0),
  float('POIx', 'POI X', 'poiPortrait', 0),
  float('POIy', 'POI Y', 'poiPortrait', 0),
  int('POIPriority', 'POI Priority', 'poiPortrait', 'int', true, 0),

  int('RewardTitle', 'Reward Title', 'rewardOther', 'int unsigned', false, 0, {
    hint: 'CharTitles.db2 id',
  }),
  int('RewardArenaPoints', 'Reward Arena Points', 'rewardXpMoney', 'int unsigned', false, 0),
  int('RewardSkillLineID', 'Reward Skill Line', 'rewardOther', 'int unsigned', false, 0),
  int('RewardNumSkillUps', 'Reward Skill Ups', 'rewardOther', 'int unsigned', false, 0),

  int('PortraitGiver', 'Portrait Giver', 'poiPortrait', 'int unsigned', false, 0),
  int('PortraitGiverMount', 'Portrait Giver Mount', 'poiPortrait', 'int', true, 0),
  int('PortraitTurnIn', 'Portrait Turn-In', 'poiPortrait', 'int unsigned', false, 0),

  int('RewardFactionID1', 'Faction 1', 'rewardReputation', 'int unsigned', false, 0, faction),
  int('RewardFactionValue1', 'Faction Value 1', 'rewardReputation', 'int', true, 0),
  int('RewardFactionOverride1', 'Faction Override 1', 'rewardReputation', 'int', true, 0),
  int('RewardFactionCapIn1', 'Faction Cap 1', 'rewardReputation', 'int unsigned', false, 0),
  int('RewardFactionID2', 'Faction 2', 'rewardReputation', 'int unsigned', false, 0, faction),
  int('RewardFactionValue2', 'Faction Value 2', 'rewardReputation', 'int', true, 0),
  int('RewardFactionOverride2', 'Faction Override 2', 'rewardReputation', 'int', true, 0),
  int('RewardFactionCapIn2', 'Faction Cap 2', 'rewardReputation', 'int unsigned', false, 0),
  int('RewardFactionID3', 'Faction 3', 'rewardReputation', 'int unsigned', false, 0, faction),
  int('RewardFactionValue3', 'Faction Value 3', 'rewardReputation', 'int', true, 0),
  int('RewardFactionOverride3', 'Faction Override 3', 'rewardReputation', 'int', true, 0),
  int('RewardFactionCapIn3', 'Faction Cap 3', 'rewardReputation', 'int unsigned', false, 0),
  int('RewardFactionID4', 'Faction 4', 'rewardReputation', 'int unsigned', false, 0, faction),
  int('RewardFactionValue4', 'Faction Value 4', 'rewardReputation', 'int', true, 0),
  int('RewardFactionOverride4', 'Faction Override 4', 'rewardReputation', 'int', true, 0),
  int('RewardFactionCapIn4', 'Faction Cap 4', 'rewardReputation', 'int unsigned', false, 0),
  int('RewardFactionID5', 'Faction 5', 'rewardReputation', 'int unsigned', false, 0, faction),
  int('RewardFactionValue5', 'Faction Value 5', 'rewardReputation', 'int', true, 0),
  int('RewardFactionOverride5', 'Faction Override 5', 'rewardReputation', 'int', true, 0),
  int('RewardFactionCapIn5', 'Faction Cap 5', 'rewardReputation', 'int unsigned', false, 0),
  int('RewardFactionFlags', 'Faction Flags', 'rewardReputation', 'int unsigned', false, 0),

  int('RewardCurrencyID1', 'Currency 1', 'rewardCurrency', 'int unsigned', false, 0, currency),
  int('RewardCurrencyQty1', 'Currency Quantity 1', 'rewardCurrency', 'int unsigned', false, 0),
  int('RewardCurrencyID2', 'Currency 2', 'rewardCurrency', 'int unsigned', false, 0, currency),
  int('RewardCurrencyQty2', 'Currency Quantity 2', 'rewardCurrency', 'int unsigned', false, 0),
  int('RewardCurrencyID3', 'Currency 3', 'rewardCurrency', 'int unsigned', false, 0, currency),
  int('RewardCurrencyQty3', 'Currency Quantity 3', 'rewardCurrency', 'int unsigned', false, 0),
  int('RewardCurrencyID4', 'Currency 4', 'rewardCurrency', 'int unsigned', false, 0, currency),
  int('RewardCurrencyQty4', 'Currency Quantity 4', 'rewardCurrency', 'int unsigned', false, 0),

  int('AcceptedSoundKitID', 'Accepted Sound Kit', 'soundArea', 'int unsigned', false, 0, sound),
  int('CompleteSoundKitID', 'Complete Sound Kit', 'soundArea', 'int unsigned', false, 0, sound),
  int('AreaGroupID', 'Area Group', 'soundArea', 'int unsigned', false, 0),
  int('TimeAllowed', 'Time Allowed', 'soundArea', 'int unsigned', false, 0, {
    hint: 'Seconds; 0 means untimed',
  }),
  int('AllowableRaces', 'Allowable Races', 'identity', 'bigint unsigned', false, 0, {
    bigint: true,
    editor: 'flags',
    flags: ALLOWABLE_RACES,
    hint: '64-bit race mask; 18446744073709551615 (all bits) means all races',
  }),
  int('TreasurePickerID', 'Treasure Picker', 'worldSession', 'int', true, 0),
  int('Expansion', 'Expansion', 'worldSession', 'int', true, 0, {
    editor: 'enum',
    options: EXPANSIONS,
  }),
  int('ManagedWorldStateID', 'Managed World State', 'worldSession', 'int', true, 0),
  int('QuestSessionBonus', 'Quest Session Bonus', 'worldSession', 'int', true, 0),

  text('LogTitle', 'Log Title', 'texts', 'text', true, null, { wide: true }),
  text('LogDescription', 'Log Description', 'texts', 'text', true, null, { wide: true }),
  text('QuestDescription', 'Quest Description', 'texts', 'text', true, null, { wide: true }),
  text('AreaDescription', 'Area Description', 'texts', 'text', true, null, { wide: true }),
  text('PortraitGiverText', 'Portrait Giver Text', 'texts', 'text', true, null, { wide: true }),
  text('PortraitGiverName', 'Portrait Giver Name', 'texts', 'text', true, null, { wide: true }),
  text('PortraitTurnInText', 'Portrait Turn-In Text', 'texts', 'text', true, null, { wide: true }),
  text('PortraitTurnInName', 'Portrait Turn-In Name', 'texts', 'text', true, null, { wide: true }),
  text('QuestCompletionLog', 'Quest Completion Log', 'texts', 'text', true, null, { wide: true }),

  int('VerifiedBuild', 'Verified Build', 'advanced', 'int', true, 0, { coreLoaded: false }),
];

/** Column lookup by name. */
export const QUEST_TEMPLATE_COLUMN_MAP: Record<string, QuestColumn> = Object.fromEntries(
  QUEST_TEMPLATE_COLUMNS.map((column) => [column.name, column])
);

/** Ordered column names, matching the table definition. */
export const QUEST_TEMPLATE_COLUMN_NAMES: string[] = QUEST_TEMPLATE_COLUMNS.map(
  (column) => column.name
);

export const QUEST_TEMPLATE_PRIMARY_KEY = 'ID';

/** Value-formatting descriptor for a column, for the shared SQL helpers. */
export const columnFormat = (column: QuestColumn): SqlColumnFormat => sharedColumnFormat(column);

interface QuestFieldGroupDef {
  id: QuestFieldGroup;
  title: string;
  note?: string;
}

/** Cards shown in the main quest_template editor. */
export const QUEST_TEMPLATE_GROUPS: QuestFieldGroupDef[] = [
  { id: 'identity', title: 'Identity & Type' },
  { id: 'level', title: 'Level & Scaling' },
  { id: 'flags', title: 'Flags' },
  { id: 'poiPortrait', title: 'POI & Portraits' },
  { id: 'soundArea', title: 'Sound, Area & Timing' },
  { id: 'worldSession', title: 'World State & Session' },
  { id: 'texts', title: 'Texts' },
  { id: 'advanced', title: 'Advanced', note: 'VerifiedBuild is not read by HavenCore.' },
];

/** Cards shown in the Rewards & Currency sub-tab. */
export const QUEST_REWARD_GROUPS: QuestFieldGroupDef[] = [
  { id: 'rewardXpMoney', title: 'XP, Money & Honor' },
  { id: 'rewardSpell', title: 'Spells' },
  { id: 'rewardItems', title: 'Items & Drops' },
  { id: 'rewardChoice', title: 'Choice Items' },
  { id: 'rewardCurrency', title: 'Currency' },
  { id: 'rewardReputation', title: 'Reputation' },
  { id: 'rewardOther', title: 'Title, Skill & Artifact' },
];

/** Columns belonging to one card, in table order. */
export const columnsForGroup = (group: QuestFieldGroup): QuestColumn[] =>
  sharedColumnsForGroup(QUEST_TEMPLATE_COLUMNS, group);

/** A new record populated from the table defaults. */
export const createDefaultQuestTemplate = (id: number): Record<string, unknown> =>
  createDefaultRecord(QUEST_TEMPLATE_COLUMNS, QUEST_TEMPLATE_PRIMARY_KEY, id);
