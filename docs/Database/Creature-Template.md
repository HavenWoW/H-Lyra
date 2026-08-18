# creature_template

## Purpose

Column layout, loader behaviour and validation rules for the `creature_template`
world table. Authoritative behaviour comes from
`ObjectMgr::LoadCreatureTemplates`, `ObjectMgr::LoadCreatureTemplate` and
`ObjectMgr::CheckCreatureTemplate` in `src/server/game/Globals/ObjectMgr.cpp`,
together with the `WORLD_SEL_CREATURE_TEMPLATE` statement in
`src/server/database/Database/Implementation/WorldDatabase.cpp`.

## Column summary

The table has **81 columns**. The core's select statement reads **78** of them:
`trainer_type`, `trainer_race` and `VerifiedBuild` exist in the table but are
never loaded.

Only four columns are nullable — `femaleName`, `subname`, `TitleAlt` and
`IconName` — and all four default to NULL. Every other column is `NOT NULL` with
a numeric or empty-string default.

| # | Column | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| 0 | `entry` | mediumint unsigned | 0 | Primary key |
| 1–3 | `difficulty_entry_1..3` | mediumint unsigned | 0 | Other `creature_template` entries |
| 4–5 | `KillCredit1..2` | int unsigned | 0 | Creature credited on kill |
| 6 | `name` | char(200) | `'0'` | |
| 7 | `femaleName` | char(200) | NULL | |
| 8 | `subname` | char(200) | NULL | |
| 9 | `TitleAlt` | char(200) | NULL | |
| 10 | `IconName` | char(100) | NULL | Client cursor |
| 11 | `gossip_menu_id` | mediumint unsigned | 0 | |
| 12–13 | `minlevel`, `maxlevel` | smallint **signed** | 1 | Read as `GetInt16` |
| 14 | `HealthScalingExpansion` | mediumint **signed** | 0 | `-1` means current expansion |
| 15 | `RequiredExpansion` | mediumint **signed** | 0 | |
| 16 | `VignetteID` | mediumint **signed** | 0 | |
| 17 | `faction` | smallint unsigned | 0 | **FactionTemplate id, not a Faction id** |
| 18 | `npcflag` | **bigint unsigned** | 0 | 64-bit; see below |
| 19 | `speed_walk` | float | 1 | |
| 20 | `speed_run` | float | 1.14286 | |
| 21 | `scale` | float | 1 | |
| 22 | `rank` | tinyint unsigned | 0 | Reserved word; must be quoted |
| 23 | `dmgschool` | tinyint **signed** | 0 | Read as `GetInt8` |
| 24–25 | `BaseAttackTime`, `RangeAttackTime` | int unsigned | 0 | |
| 26–27 | `BaseVariance`, `RangeVariance` | float | 1 | |
| 28 | `unit_class` | tinyint unsigned | 0 | |
| 29–32 | `unit_flags`, `unit_flags2`, `unit_flags3`, `dynamicflags` | int unsigned | 0 | |
| 33 | `family` | int unsigned | 0 | Read as `GetInt32` into `CreatureFamily` |
| 34 | `trainer_type` | tinyint signed | 0 | **Not loaded by the core** |
| 35 | `trainer_class` | tinyint unsigned | 0 | |
| 36 | `trainer_race` | tinyint unsigned | 0 | **Not loaded by the core** |
| 37 | `type` | tinyint unsigned | 0 | |
| 38–39 | `type_flags`, `type_flags2` | int unsigned | 0 | |
| 40–42 | `lootid`, `pickpocketloot`, `skinloot` | mediumint unsigned | 0 | |
| 43–48 | `resistance1..6` | smallint **signed** | 0 | Holy, Fire, Nature, Frost, Shadow, Arcane |
| 49–56 | `spell1..8` | mediumint unsigned | 0 | |
| 57 | `VehicleId` | mediumint unsigned | 0 | |
| 58–59 | `mingold`, `maxgold` | int unsigned | 0 | Copper |
| 60 | `AIName` | char(64) | `''` | |
| 61 | `MovementType` | tinyint unsigned | 0 | |
| 62 | `InhabitType` | tinyint unsigned | 3 | Bitmask |
| 63 | `HoverHeight` | float | 1 | |
| 64–70 | `HealthModifier`, `HealthModifierExtra`, `ManaModifier`, `ManaModifierExtra`, `ArmorModifier`, `DamageModifier`, `ExperienceModifier` | float | 1 | |
| 71 | `RacialLeader` | tinyint unsigned | 0 | Read as `GetBool` |
| 72 | `movementId` | int unsigned | 0 | |
| 73 | `FadeRegionRadius` | float | 0 | |
| 74–75 | `WidgetSetID`, `WidgetSetUnitConditionID` | int **signed** | 0 | |
| 76 | `RegenHealth` | tinyint unsigned | 1 | Read as `GetBool` |
| 77 | `mechanic_immune_mask` | int unsigned | 0 | |
| 78 | `flags_extra` | int unsigned | 0 | |
| 79 | `ScriptName` | char(64) | `''` | Resolved to a script id on load |
| 80 | `VerifiedBuild` | int signed | 0 | **Not loaded by the core** |

The `#` column is the table's own ordinal. The loader's field indices differ,
because its select omits `trainer_type` and `trainer_race`: after `family` at
index 33 it reads `trainer_class` at 34 and `type` at 35, ending with
`ScriptName` at index 77.

### npcflag is 64-bit

`npcflag` is `bigint unsigned` and the core declares `enum NPCFlags : uint64`.
Flags run from bit 0 up to `0x80000000000` (bit 43), with a block of
garrison, shipyard, tradeskill and class-hall flags occupying bits 33 to 43.

Any tool editing this column must use 64-bit arithmetic. Language bitwise
operators that coerce to 32 bits will silently alias bit 33 onto bit 1, bit 34
onto bit 2 and so on. The highest defined flag is comfortably inside the exact
integer range of an IEEE double, so the value survives JSON transport; only the
arithmetic needs care.

### faction references FactionTemplate

`creature_template.faction` is validated against the faction **template** store,
not the faction store. A picker offering Faction ids for this column writes
semantically wrong data.

## Values the loader corrects

`CheckCreatureTemplate` rewrites out-of-range values in memory and logs an
error. The stored row is left untouched, so the database keeps the bad value.

| Column | Rule | Corrected to |
| --- | --- | --- |
| `unit_class` | must be one of 1, 2, 4, 8 | 1 |
| `dmgschool` | must be below 7 | 0 |
| `speed_walk` | must not be 0 | 1 |
| `speed_run` | must not be 0 | 1.14286 |
| `InhabitType` | must be 1–15 | 15 |
| `HoverHeight` | must not be negative | 1 |
| `MovementType` | must be below 3 | 0 |
| `HealthScalingExpansion` | must be −1 to 7 | 0 |
| `RequiredExpansion` | must be below 8 | 0 |
| `faction` | must exist in the faction template store | 35 |

`MovementType` accepts only idle (0), random (1) and waypoint (2); the remaining
movement generator types cannot be set from the database.

## Difficulty entry consistency

When `difficulty_entry_1..3` point at other templates, the loader requires the
child rows to agree with the parent on `faction`, `unit_class`, `npcflag`,
`dmgschool`, `unit_flags2`, `family`, `trainer_class`, `type` and `RegenHealth`,
and requires the child's `minlevel`, `maxlevel` and `HealthScalingExpansion` to
be at least the parent's. A difficulty entry may not itself declare difficulty
entries, and may not be referenced by more than one parent.

## Related tables

`creature_template_model` supplies display ids and is loaded separately, ordered
by `Idx`; `creature_template_addon`, `creature_template_scaling`,
`creature_template_spell`, `creature_equip_template` and
`creature_template_locale` extend the template further.

## Lyra implementation implications

- A full-row rewrite must write all 81 columns. Because the full query is a
  DELETE followed by an INSERT, any omitted column reverts to its table default.
- Keep NULL and the empty string distinct for the four nullable text columns.
- Model signedness explicitly; eleven columns are signed and several of them
  legitimately hold negative values.
- Use 64-bit arithmetic for `npcflag`.
- Offer a FactionTemplate picker for `faction`.
- The three columns the core ignores still have to be written, or a full save
  silently discards them.

## Last verified

Against the HavenCore BFA creature template loader and the `bfa_world`
`creature_template` schema.
