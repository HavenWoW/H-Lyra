# Quest-related tables

## Purpose

Layout and loader behaviour for the tables that hang off `quest_template`.
Authoritative behaviour comes from `ObjectMgr::LoadQuests`,
`ObjectMgr::LoadQuestPOI`, `ObjectMgr::LoadQuestStartersAndEnders` and
`ObjectMgr::LoadQuestGreetings` in `src/server/game/Globals/ObjectMgr.cpp`, and
the `Quest` loader methods in `src/server/game/Quests/QuestDef.cpp`. See
[Quest-Template.md](Quest-Template.md) for the main table.

## Load order

Within `LoadQuests`: `quest_template` → `quest_details` →
`quest_request_items` → `quest_offer_reward` →
`quest_template_addon` (LEFT JOIN `quest_mail_sender`) → `quest_objectives` →
`quest_visual_effect`, then post-processing. `LoadQuestPOI`,
`LoadQuestStartersAndEnders` and `LoadQuestGreetings` run afterwards. An empty
`quest_template` aborts the whole load.

## quest_template_addon

One row per quest, keyed by `ID`. Columns: `MaxLevel`, `AllowableClasses`,
`SourceSpellID`, `PrevQuestID`, `NextQuestID`, `ExclusiveGroup`,
`RewardMailTemplateID`, `RewardMailDelay`, `RequiredSkillID`,
`RequiredSkillPoints`, `RequiredMinRepFaction`, `RequiredMaxRepFaction`,
`RequiredMinRepValue`, `RequiredMaxRepValue`, `ProvidedItemCount`,
`SpecialFlags` (tinyint unsigned), `ScriptName` (varchar(64)).

`RewardMailSenderEntry` is **not** in this table. The loader reads it from
`quest_mail_sender` via `LEFT JOIN quest_mail_sender ON Id=QuestId`, so an
editor that wants to set the mail sender must write `quest_mail_sender`
separately. `SpecialFlags` is masked to `0x3F` on load.

## quest_mail_sender

`QuestId` (primary key), `RewardMailSenderEntry`. A missing row means no sender.

## quest_objectives

One row per objective, keyed by `ID` (globally unique, not per-quest). Columns:
`ID`, `QuestID`, `Type`, `Order`, `StorageIndex`, `ObjectID`, `Amount`, `Flags`,
`Flags2`, `ProgressBarWeight` (float), `Description` (text), `VerifiedBuild`.

`Order` is a reserved word and must be backtick-quoted; it drives insertion
order (`ORDER BY \`Order\` ASC, StorageIndex ASC`) but is not otherwise read.
`Type` follows `QuestObjectiveType` (0–17); `Flags` follows
`QuestObjectiveFlags`. `Flags2` and `ProgressBarWeight` are real stored data —
an editor must load and re-write them rather than default them to 0.

## quest_visual_effect

`ID`, `Index` (reserved word), `VisualEffect`, `VerifiedBuild`, keyed by
(`ID`, `Index`). `ID` is a **`quest_objectives.ID`**, not a quest id; the loader
joins it onto `quest_objectives`. Visual effects attach to an objective, so
editing them means resolving the objective id first.

Because the rows are keyed by objective id rather than quest id, an editor
cannot delete them with a simple `WHERE QuestID = ?`. It must:

1. Resolve the quest's objective ids, then load the visual effects
   `WHERE ID IN (<objective ids>)`.
2. On save, scope the DELETE to the **union of the objective ids the quest has
   now and the ids it had when loaded** — so a removed objective's visual
   effects are cleared — and never a wider set. A blanket delete would destroy
   another objective's rows.
3. Write only rows whose objective still exists, so no row is inserted for a
   deleted objective.
4. When the quest has **no objectives at all, emit no statement** — an empty id
   set must not become a `WHERE ID IN ()` or an unscoped delete.

The `Index` column is a reserved word and is always backtick-quoted.

## quest_details / quest_offer_reward / quest_request_items

All keyed by `ID` (the quest id).

- `quest_details`: `Emote1..4`, `EmoteDelay1..4`. Emote play on quest accept.
- `quest_offer_reward`: `Emote1..4`, `EmoteDelay1..4`, `RewardText` (text).
- `quest_request_items`: `EmoteOnComplete`, `EmoteOnIncomplete`,
  `EmoteOnCompleteDelay`, `EmoteOnIncompleteDelay`, `CompletionText` (text).

Emote ids are validated against the emote store on load; an invalid emote is
skipped, leaving that slot 0.

## quest_greeting

Keyed by (`ID`, `Type`). `ID` is a **creature entry** (`Type` 0) or a
**gameobject entry** (`Type` 1), not a quest id. Columns: `GreetEmoteType`,
`GreetEmoteDelay`, `Greeting` (text).

## quest_poi and quest_poi_points

`quest_poi` holds the map blobs, keyed by (`QuestID`, `BlobIndex`, `Idx1`):
`ObjectiveIndex`, `QuestObjectiveID`, `QuestObjectID`, `MapID`, `UiMapID`,
`Priority`, `Flags`, `WorldEffectID`, `PlayerConditionID`, `SpawnTrackingID`,
`AlwaysAllowMergingBlobs`, `VerifiedBuild`.

`quest_poi_points` holds the polygon vertices for each blob, keyed by
(`QuestID`, `Idx1`, `Idx2`): `X`, `Y` (both `int`), `VerifiedBuild`. A blob's
outline is the set of points sharing its `Idx1`. The loader pre-sizes its point
buckets from the maximum `QuestID` (it reads points `ORDER BY QuestID DESC`), so
a single very large quest id inflates memory here.

## Relation tables

`creature_queststarter`, `creature_questender`, `gameobject_queststarter`,
`gameobject_questender`: each is (`id`, `quest`) where `id` is the
creature/gameobject entry. `LoadQuestRelationsHelper` joins them against
`pool_quest`.

## Locale tables

`quest_template_locale`, `quest_objectives_locale`, `quest_offer_reward_locale`,
`quest_request_items_locale`, `quest_greeting_locale`: keyed by the base id plus
`locale`, mirroring the text columns of their parent. `quest_objectives_locale`
additionally carries `QuestId` and `StorageIndex` columns that the core never
reads. Locales load before `LoadQuests`.

## Lyra implementation implications

- Collection tables (objectives, POI, POI points, ...) are written as a scoped
  `DELETE` + multi-row `INSERT`; every column of every row is written so a
  loaded-then-saved collection round-trips, and text is escaped through the
  shared helper.
- Reserved-word columns (`Order`, `Index`) are always backtick-quoted.
- `RewardMailSenderEntry` is edited through `quest_mail_sender`, not the addon
  row.

## Last verified

Against `ObjectMgr::LoadQuests` / `LoadQuestPOI` / `LoadQuestGreetings` and the
respective table definitions.
