// Enumerations and flag definitions for quest columns, mirroring the
// corresponding HavenCore enums.

import { FlagOption, SelectOption } from './itemOptions';
import { SelectorType } from '../components/EntitySelectorModal';

export const QUEST_TYPE_OPTIONS: SelectOption[] = [
  { value: 0, name: 'Autocomplete (0)' },
  { value: 1, name: 'Group / Disabled (1)' },
  { value: 2, name: 'Normal (2)' },
  { value: 3, name: 'Task / World Quest (3)' },
];

export const QUEST_INFO_OPTIONS: SelectOption[] = [
  { value: 0, name: 'None (0)' },
  { value: 1, name: 'Group (1)' },
  { value: 21, name: 'Class (21)' },
  { value: 41, name: 'PvP (41)' },
  { value: 62, name: 'Raid (62)' },
  { value: 81, name: 'Dungeon (81)' },
  { value: 82, name: 'World Event (82)' },
  { value: 83, name: 'Legendary (83)' },
  { value: 84, name: 'Escort (84)' },
  { value: 85, name: 'Heroic (85)' },
  { value: 88, name: 'Raid (10) (88)' },
  { value: 89, name: 'Raid (25) (89)' },
  { value: 98, name: 'Scenario (98)' },
  { value: 102, name: 'Account (102)' },
  { value: 104, name: 'Side Quest (104)' },
  { value: 107, name: 'Artifact (107)' },
  { value: 109, name: 'World Quest (109)' },
  { value: 110, name: 'World Quest (Epic) (110)' },
  { value: 111, name: 'World Quest (Elite) (111)' },
  { value: 112, name: 'World Quest (Rare Elite) (112)' },
  { value: 113, name: 'World Quest (PvP) (113)' },
  { value: 128, name: 'Emissary (128)' },
  { value: 137, name: 'World Quest (Dungeon) (137)' },
  { value: 141, name: 'World Quest (Raid) (141)' },
  { value: 148, name: 'Pick Pocket (148)' },
];

export const QUEST_FLAGS: FlagOption[] = [
  { bit: 0, name: 'STAY_ALIVE - Must stay alive' },
  { bit: 1, name: 'PARTY_ACCEPT - Prompt whole party to accept' },
  { bit: 2, name: 'EXPLORATION - Area exploration quest' },
  { bit: 3, name: 'SHARABLE - Can be shared with party members' },
  { bit: 4, name: 'HAS_CONDITION - Quest condition required' },
  { bit: 5, name: 'HIDE_REWARD_POI - Hides reward POI' },
  { bit: 6, name: 'RAID - Can be completed in raid group' },
  { bit: 7, name: 'TBC - Expansion enabled only' },
  { bit: 8, name: 'NO_MONEY_FROM_XP - No gold converted from XP at max level' },
  { bit: 9, name: 'HIDDEN_REWARDS - Rewards only sent in offer reward dialog' },
  { bit: 10, name: 'TRACKING - Hidden auto-reward tracking quest' },
  { bit: 11, name: 'DEPRECATE_REPUTATION - Reputation deprecation' },
  { bit: 12, name: 'DAILY - Daily repeatable quest' },
  { bit: 13, name: 'FLAGS_PVP - Forces PvP flag while in quest log' },
  { bit: 14, name: 'UNAVAILABLE - Unavailable generically' },
  { bit: 15, name: 'WEEKLY - Weekly repeatable quest' },
  { bit: 16, name: 'AUTOCOMPLETE - Player submits via GUI button' },
  { bit: 17, name: 'DISPLAY_ITEM_IN_TRACKER - Usable item button in quest tracker' },
  { bit: 18, name: 'OBJ_TEXT - Use objective text as complete text' },
  { bit: 19, name: 'AUTO_ACCEPT - Automatically accepted without prompt' },
  { bit: 20, name: 'PLAYER_CAST_ON_ACCEPT - Cast spell on accept' },
  { bit: 21, name: 'PLAYER_CAST_ON_COMPLETE - Cast spell on complete' },
  { bit: 22, name: 'UPDATE_PHASE_SHIFT - Updates phase shift on accept' },
  { bit: 23, name: 'SOR_WHITELIST - Scroll of Resurrection whitelist' },
  { bit: 24, name: 'LAUNCH_GOSSIP_COMPLETE - Launch gossip on complete' },
  { bit: 25, name: 'REMOVE_EXTRA_GET_ITEMS - Remove extra items' },
  { bit: 26, name: 'HIDE_UNTIL_DISCOVERED - Hidden in log until discovered' },
  { bit: 27, name: 'PORTRAIT_IN_QUEST_LOG - Shows portrait in quest log' },
  { bit: 28, name: 'SHOW_ITEM_WHEN_COMPLETED - Shows item upon completion' },
  { bit: 29, name: 'LAUNCH_GOSSIP_ACCEPT - Launch gossip on accept' },
  { bit: 30, name: 'ITEMS_GLOW_WHEN_DONE - Quest items sparkle when done' },
  { bit: 31, name: 'FAIL_ON_LOGOUT - Fails if player logs out' },
];

export const QUEST_FLAGS_EX: FlagOption[] = [
  { bit: 0, name: 'KEEP_ADDITIONAL_ITEMS - Keep additional quest items' },
  { bit: 1, name: 'SUPPRESS_GOSSIP_COMPLETE - Suppress gossip on complete' },
  { bit: 2, name: 'SUPPRESS_GOSSIP_ACCEPT - Suppress gossip on accept' },
  { bit: 3, name: 'DISALLOW_PLAYER_AS_QUESTGIVER - Player cannot give quest' },
  { bit: 4, name: 'DISPLAY_CLASS_CHOICE_REWARDS - Class-specific choices' },
  { bit: 5, name: 'DISPLAY_SPEC_CHOICE_REWARDS - Spec-specific choices' },
  { bit: 6, name: 'REMOVE_FROM_LOG_ON_PERIODIC_RESET - Clean on reset' },
  { bit: 7, name: 'ACCOUNT_LEVEL_QUEST - Account-wide quest progression' },
  { bit: 8, name: 'LEGENDARY_QUEST - Legendary storyline quest' },
  { bit: 9, name: 'NO_GUILD_XP - Awards no guild experience' },
  { bit: 10, name: 'RESET_CACHE_ON_ACCEPT - Resets cache upon accept' },
  { bit: 11, name: 'NO_ABANDON_ONCE_ANY_OBJECTIVE_COMPLETE' },
  { bit: 12, name: 'RECAST_ACCEPT_SPELL_ON_LOGIN' },
  { bit: 13, name: 'UPDATE_ZONE_AURAS - Refreshes zone auras' },
  { bit: 14, name: 'NO_CREDIT_FOR_PROXY' },
  { bit: 15, name: 'DISPLAY_AS_DAILY_QUEST - Shows blue exclamation mark' },
  { bit: 16, name: 'PART_OF_QUEST_LINE - Part of continuous chain' },
  { bit: 17, name: 'QUEST_FOR_INTERNAL_BUILDS_ONLY' },
  { bit: 18, name: 'SUPPRESS_SPELL_LEARN_TEXT_LINE' },
  { bit: 19, name: 'DISPLAY_HEADER_AS_OBJECTIVE_FOR_TASKS' },
  { bit: 20, name: 'GARRISON_NON_OWNERS_ALLOWED' },
  { bit: 21, name: 'REMOVE_QUEST_ON_WEEKLY_RESET' },
  { bit: 22, name: 'SUPPRESS_FAREWELL_AUDIO_AFTER_QUEST_ACCEPT' },
  { bit: 23, name: 'REWARDS_BYPASS_WEEKLY_CAPS_AND_SEASON_TOTAL' },
  {
    bit: 24,
    name: 'IS_WORLD_QUEST / CLEAR_PROGRESS_OF_CRITERIA_TREE_OBJECTIVES_ON_ACCEPT',
    comment:
      'HavenCore assigns this single bit two meanings: Quest::IsWorldQuest() keys off it, so setting it pushes the quest into the world-quest store as well as clearing criteria-tree progress on accept.',
  },
  { bit: 25, name: 'NOT_IGNORABLE - Cannot be hidden or ignored' },
  { bit: 26, name: 'AUTO_PUSH - Automatically push to eligible nearby players' },
  { bit: 27, name: 'NO_SPELL_COMPLETE_EFFECTS' },
  { bit: 28, name: 'DO_NOT_TOAST_HONOR_REWARD' },
  { bit: 29, name: 'KEEP_REPEATABLE_QUEST_ON_FACTION_CHANGE' },
  { bit: 30, name: 'KEEP_PROGRESS_ON_FACTION_CHANGE' },
  { bit: 31, name: 'PUSH_TEAM_QUEST_USING_MAP_CONTROLLER' },
];

export const QUEST_FLAGS_EX2: FlagOption[] = [
  { bit: 1, name: 'NO_WAR_MODE_BONUS - War Mode bonus does not apply (2)' },
];

// quest_template_addon.SpecialFlags is tinyint unsigned, and the loader masks it
// to QUEST_SPECIAL_FLAGS_DB_ALLOWED (0x3F). Only these six bits can be set from
// the database; higher bits are computed internally by the core.
export const QUEST_SPECIAL_FLAGS: FlagOption[] = [
  { bit: 0, name: 'REPEATABLE - Quest is repeatable (1)' },
  { bit: 1, name: 'EXPLORATION_OR_EVENT - Area explore or event complete (2)' },
  { bit: 2, name: 'AUTO_ACCEPT - Auto-accept on trigger (4)' },
  { bit: 3, name: 'DF_QUEST - Dungeon finder quest (8)' },
  { bit: 4, name: 'MONTHLY - Resets at beginning of the month (16)' },
  { bit: 5, name: 'CAST - Spell cast required instead of kill (32)' },
];

/** quest_objectives.Type, from HavenCore's QuestObjectiveType. */
export const QUEST_OBJECTIVE_TYPE_OPTIONS: SelectOption[] = [
  { value: 0, name: 'Monster / Creature Kill (0)' },
  { value: 1, name: 'Item Drop / Collect (1)' },
  { value: 2, name: 'GameObject Interact (2)' },
  { value: 3, name: 'Talk To / Gossip NPC (3)' },
  { value: 4, name: 'Currency (4)' },
  { value: 5, name: 'Learn Spell (5)' },
  { value: 6, name: 'Min Reputation (6)' },
  { value: 7, name: 'Max Reputation (7)' },
  { value: 8, name: 'Money (8)' },
  { value: 9, name: 'Player Kills (9)' },
  { value: 10, name: 'Area Trigger (10)' },
  { value: 11, name: 'Win Pet Battle vs NPC (11)' },
  { value: 12, name: 'Defeat Battle Pet (12)' },
  { value: 13, name: 'Win PvP Pet Battles (13)' },
  { value: 14, name: 'Criteria Tree (14)' },
  { value: 15, name: 'Progress Bar (15)' },
  { value: 16, name: 'Have Currency (16)' },
  { value: 17, name: 'Obtain Currency (17)' },
];

/** Entity picker to resolve an objective's ObjectID, by objective Type. */
export const QUEST_OBJECTIVE_TYPE_SELECTORS: Record<number, SelectorType | null> = {
  0: 'creature',
  1: 'item',
  2: 'gameobject',
  3: 'creature',
  4: 'currency',
  5: 'spell',
  6: 'faction',
  7: 'faction',
  8: null,
  9: null,
  10: null,
  11: 'creature',
  12: 'creature',
  13: null,
  14: null,
  15: null,
  16: 'currency',
  17: 'currency',
};

/** quest_objectives.Flags, from HavenCore's QuestObjectiveFlags. */
export const QUEST_OBJECTIVE_FLAGS: FlagOption[] = [
  { bit: 0, name: 'TRACKED_ON_MINIMAP (1)' },
  { bit: 1, name: 'SEQUENCED (2)' },
  { bit: 2, name: 'OPTIONAL (4)' },
  { bit: 3, name: 'HIDDEN (8)' },
  { bit: 4, name: 'HIDE_ITEM_GAINS (16)' },
  { bit: 5, name: 'PROGRESS_COUNTS_ITEMS_IN_INVENTORY (32)' },
  { bit: 6, name: 'PART_OF_PROGRESS_BAR (64)' },
];

/** quest_greeting.Type: which entity kind the greeting id refers to. */
export const QUEST_GREETING_TYPE_OPTIONS: SelectOption[] = [
  { value: 0, name: 'Creature (0)' },
  { value: 1, name: 'GameObject (1)' },
];
