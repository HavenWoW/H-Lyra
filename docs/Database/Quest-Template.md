# quest_template

## Purpose

Column layout, loader behaviour and validation rules for the `quest_template`
world table. Authoritative behaviour comes from `ObjectMgr::LoadQuests` in
`src/server/game/Globals/ObjectMgr.cpp`, the `Quest` constructor in
`src/server/game/Quests/QuestDef.cpp`, and the member and enum declarations in
`src/server/game/Quests/QuestDef.h`.

## Column summary

The table has **123 columns**. `LoadQuests` reads **122** of them; only
`VerifiedBuild` exists in the table but is never loaded.

Only the **nine text columns are nullable** (`LogTitle`, `LogDescription`,
`QuestDescription`, `AreaDescription`, `PortraitGiverText`, `PortraitGiverName`,
`PortraitTurnInText`, `PortraitTurnInName`, `QuestCompletionLog`) and all nine
default to NULL. Every other column is `NOT NULL` with a numeric default.

This is a pre-8.3-style schema: quest scaling is expressed through
`QuestLevel` / `ScalingFactionGroup` / `MaxScalingLevel`, and there is **no
`ContentTuningID` column** — that field exists only in DB2 structures, not in
this table. Reward choice items are stored inline as `RewardChoiceItemID1..6`
rather than in a separate table.

### Signedness

Signedness is not cosmetic — several columns legitimately hold negative values
and the editor must model each one:

`QuestLevel` (default **-1**, meaning scale to player), `ScalingFactionGroup`,
`MaxScalingLevel`, `MinLevel`, `QuestSortID`, `RewardMoney` (negative = the
player must pay), `POIPriority`, `PortraitGiverMount`, `RewardFactionValue1..5`,
`RewardFactionOverride1..5`, `TreasurePickerID`, `Expansion`,
`ManagedWorldStateID`, `QuestSessionBonus`, `VerifiedBuild`.

`AllowableRaces` is `bigint unsigned`: a 64-bit race mask where the all-bits
value `18446744073709551615` means all races. It exceeds the JavaScript
safe-integer range and must be carried as an exact-integer value end to end.

## Columns

Listed by loader field index. Types and defaults are from the table definition.

| # | Column | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| 0 | `ID` | int unsigned | 0 | Primary key |
| 1 | `QuestType` | tinyint unsigned | 2 | 0 auto, 1 disabled, 2 normal, 3 task |
| 2 | `QuestLevel` | int | -1 | -1 scales to the player |
| 3 | `ScalingFactionGroup` | int | 0 | |
| 4 | `MaxScalingLevel` | int | 255 | |
| 5 | `QuestPackageID` | int unsigned | 0 | |
| 6 | `MinLevel` | int | 0 | |
| 7 | `QuestSortID` | smallint | 0 | >0 AreaTable id; <0 QuestSort id |
| 8 | `QuestInfoID` | smallint unsigned | 0 | |
| 9 | `SuggestedGroupNum` | tinyint unsigned | 0 | |
| 10 | `RewardNextQuest` | int unsigned | 0 | |
| 11 | `RewardXPDifficulty` | int unsigned | 0 | Row into QuestXP.db2 |
| 12 | `RewardXPMultiplier` | float | 1 | |
| 13 | `RewardMoney` | int | 0 | Copper; negative requires payment |
| 14 | `RewardMoneyDifficulty` | int unsigned | 0 | |
| 15 | `RewardMoneyMultiplier` | float | 1 | |
| 16 | `RewardBonusMoney` | int unsigned | 0 | |
| 17–19 | `RewardDisplaySpell1..3` | int unsigned | 0 | |
| 20 | `RewardSpell` | int unsigned | 0 | Cast on turn-in |
| 21 | `RewardHonor` | int unsigned | 0 | |
| 22 | `RewardKillHonor` | int unsigned | 0 | |
| 23 | `StartItem` | int unsigned | 0 | Given on accept |
| 24 | `RewardArtifactXPDifficulty` | int unsigned | 0 | |
| 25 | `RewardArtifactXPMultiplier` | float | 1 | |
| 26 | `RewardArtifactCategoryID` | int unsigned | 0 | |
| 27 | `Flags` | int unsigned | 0 | `QuestFlags` |
| 28 | `FlagsEx` | int unsigned | 0 | `QuestFlagsEx` |
| 29 | `FlagsEx2` | int unsigned | 0 | `QuestFlagsEx2` |
| 30–37 | `RewardItem1..4`, `RewardAmount1..4` | int unsigned | 0 | Table stores the four item/amount pairs first |
| 38–45 | `ItemDrop1..4`, `ItemDropQuantity1..4` | int unsigned | 0 | Then the four drop pairs |
| 46–63 | `RewardChoiceItemID1..6`, `RewardChoiceItemQuantity1..6`, `RewardChoiceItemDisplayID1..6` | int unsigned | 0 | Six triples |
| 64 | `POIContinent` | int unsigned | 0 | |
| 65–66 | `POIx`, `POIy` | float | 0 | |
| 67 | `POIPriority` | int | 0 | |
| 68 | `RewardTitle` | int unsigned | 0 | CharTitles.db2 id |
| 69 | `RewardArenaPoints` | int unsigned | 0 | |
| 70 | `RewardSkillLineID` | int unsigned | 0 | |
| 71 | `RewardNumSkillUps` | int unsigned | 0 | |
| 72 | `PortraitGiver` | int unsigned | 0 | |
| 73 | `PortraitGiverMount` | int | 0 | |
| 74 | `PortraitTurnIn` | int unsigned | 0 | |
| 75–94 | `RewardFactionID1..5`, `RewardFactionValue1..5`, `RewardFactionOverride1..5`, `RewardFactionCapIn1..5` | mixed | 0 | Four columns per faction; Value and Override are signed |
| 95 | `RewardFactionFlags` | int unsigned | 0 | |
| 96–103 | `RewardCurrencyID1..4`, `RewardCurrencyQty1..4` | int unsigned | 0 | Interleaved id/qty |
| 104 | `AcceptedSoundKitID` | int unsigned | 0 | |
| 105 | `CompleteSoundKitID` | int unsigned | 0 | |
| 106 | `AreaGroupID` | int unsigned | 0 | |
| 107 | `TimeAllowed` | int unsigned | 0 | Seconds; 0 untimed |
| 108 | `AllowableRaces` | bigint unsigned | 0 | 64-bit mask; all-bits = all races |
| 109 | `TreasurePickerID` | int | 0 | |
| 110 | `Expansion` | int | 0 | |
| 111 | `ManagedWorldStateID` | int | 0 | |
| 112 | `QuestSessionBonus` | int | 0 | |
| 113–121 | `LogTitle`, `LogDescription`, `QuestDescription`, `AreaDescription`, `PortraitGiverText`, `PortraitGiverName`, `PortraitTurnInText`, `PortraitTurnInName`, `QuestCompletionLog` | text | NULL | The nine nullable text columns |
| — | `VerifiedBuild` | int | 0 | In the table; **not loaded** |

### SELECT versus table order

The loader's `SELECT` interleaves the reward-item and item-drop columns
(`RewardItem1, RewardAmount1, ItemDrop1, ItemDropQuantity1, ...`), while the
table stores all four `RewardItem` pairs first and then all four `ItemDrop`
pairs. Because both the loader and a generated INSERT name their columns
explicitly, MySQL matches by name and the difference does not matter — but any
positional or `SELECT *` tooling would misread these columns. Generated INSERTs
follow **table order**.

## Values the loader corrects

`LoadQuests` mutates several fields after loading. Disabled quests
(`DISABLE_TYPE_QUEST`) skip all of these checks.

- `SpecialFlags` (from `quest_template_addon`) is masked to
  `QUEST_SPECIAL_FLAGS_DB_ALLOWED` (`0x3F`); higher bits are computed internally
  and cannot be set from the database.
- `Flags` with both DAILY and WEEKLY set has DAILY stripped. DAILY, WEEKLY or
  MONTHLY each imply `QUEST_SPECIAL_FLAGS_REPEATABLE`, which is added if absent.
- `AllowableClasses` that does not intersect the playable class mask is reset to
  0. `AllowableRaces` that does not intersect the playable race mask (unless it
  is the raw all-bits value) is reset to all-races.
- Reward spells, the accept/turn-in sound kits, `RewardTitle`, and reward
  faction ids are validated against DB2/DBC stores and reset to 0 when the id
  does not exist.
- `StartItem` set with `ProvidedItemCount` 0 forces the count to 1;
  `StartItem` 0 with a non-zero count zeroes the count.
- `RewardMailTemplateID` must be globally unique. A duplicate across quests
  zeroes `RewardMailTemplateId`, `RewardMailDelay` **and** `RewardMailSenderEntry`
  on the later quest.
- `MinLevel` of -1 or above the level cap logs an error but is left unchanged;
  sending -1 to the client is valid.

## The FlagsEx world-quest bit

In `QuestFlagsEx`, `QUEST_FLAGS_EX_IS_WORLD_QUEST` and
`QUEST_FLAGS_EX_CLEAR_PROGRESS_OF_CRITERIA_TREE_OBJECTIVES_ON_ACCEPT` are both
`0x01000000` — the same bit. `Quest::IsWorldQuest()` keys off it, so setting
this bit both marks the quest a world quest (pushing it into the world-quest
store) and clears criteria-tree progress on accept. Any editor should surface
both meanings on that single bit.

## Lyra implementation implications

- The editor writes all 123 columns in table order. A full query is a lossless
  `DELETE` + `INSERT`; omitting a column silently resets it to its default, so
  the column list has a single source of truth in the schema module.
- The nine text columns keep `NULL` and `''` distinct.
- `AllowableRaces` must survive the database → backend → IPC → editor → SQL path
  as an exact 64-bit value; see the DB2/large-integer transport note in the
  implementation docs.
- `VerifiedBuild` is written even though the core ignores it, because dropping a
  stored column on save is data loss.

## Last verified

Against `ObjectMgr::LoadQuests`, `Quest` (`QuestDef.h` / `QuestDef.cpp`) and the
`quest_template` table definition.
