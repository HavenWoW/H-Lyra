# gameobject_template

## Purpose

Column layout, the polymorphic `Data` columns, and loader behaviour for the
`gameobject_template` world table. Authoritative behaviour comes from
`ObjectMgr::LoadGameObjectTemplate` in `src/server/game/Globals/ObjectMgr.cpp`
and the `GameObjectTemplate` union in
`src/server/game/Entities/GameObject/GameObjectData.h`.

## Column summary

The table has **46 columns**.

| Column | Type | Notes |
| --- | --- | --- |
| `entry` | mediumint unsigned | Primary key |
| `type` | tinyint unsigned | GameObject type 0..57; selects the meaning of every Data column |
| `displayId` | mediumint unsigned | GameObjectDisplayInfo.db2 id |
| `name` | varchar(100) | NOT NULL |
| `IconName` | varchar(100) | NOT NULL; client cursor on hover |
| `castBarCaption` | varchar(100) | NOT NULL |
| `unk1` | varchar(100) | NOT NULL |
| `size` | float | Default 1 |
| `Data0`..`Data33` | int (signed) | 34 columns; meaning depends on `type` |
| `RequiredLevel` | int (signed) | |
| `AIName` | char(64) | NOT NULL |
| `ScriptName` | varchar(64) | NOT NULL |
| `VerifiedBuild` | int (signed) | In the table; **not loaded** |

Two properties differ from other templates and matter for an editor:

- **Every text column is `NOT NULL DEFAULT ''`.** There is no nullable text
  here — an empty field is the empty string, never `NULL`.
- `Data0`..`Data33`, `RequiredLevel` and `VerifiedBuild` are **signed**. Some
  Data slots legitimately hold negatives (transport `SpawnMap` uses
  `NoValue = -1`; destructible-building nameplate offsets are signed), so an
  editor must preserve negative values.

## The Data columns are polymorphic

`Data0`..`Data33` are a raw union. What each slot means is decided entirely by
`type`. The `GameObjectTemplate` union documents each type's slots with
machine-readable comments, for example (type 3, chest):

```
Data0  open              References: Lock_
Data1  chestLoot         References: Treasure
Data8  questID           References: QuestV2
Data19 xpDifficulty      enum { No Exp, Trivial, ... }
Data26 spell             References: Spell
```

The comment grammar maps to editor controls:

- `enum { false, true }` → a boolean.
- `enum { A, B, C }` → a small value enum.
- `References: <store>` → an id into `<store>`.
- `int, Min..Max` → a bounded integer.

A `type` whose slot is not described (binder, map object, and other empty union
bodies, or any index beyond a type's list) leaves that slot as a raw signed
integer. Unknown or unsupported values are preserved, never rewritten.

### Reference stores that have an id picker

Only a subset of the referenced stores have a selector in this project; the rest
are edited as plain ids with the store named as a hint.

| Reference | Picker |
| --- | --- |
| `Spell` | yes (spell) |
| `GameObjects` (linked traps, flag drops) | yes (gameobject) |
| `QuestV2` / `QuestGiver` | yes (quest) |
| `Item` | yes (item) |
| `Lock_`, `BroadcastText`, `PlayerCondition`, `GameEvents`, `Treasure`, `Gossip`, `PageText`, `Map`, `WorldState`, `Creature`, `AnimKit`, … | no — numeric id with a hint |

### The 58 GameObject types

0 Door · 1 Button · 2 Quest Giver · 3 Chest · 4 Binder · 5 Generic · 6 Trap ·
7 Chair · 8 Spell Focus · 9 Text · 10 Goober · 11 Transport · 12 Area Damage ·
13 Camera · 14 Map Object · 15 Map Object Transport · 16 Duel Arbiter ·
17 Fishing Node · 18 Ritual · 19 Mailbox · 20 Do Not Use · 21 Guard Post ·
22 Spell Caster · 23 Meeting Stone · 24 Flag Stand · 25 Fishing Hole ·
26 Flag Drop · 27 Mini Game · 28 Do Not Use 2 · 29 Control Zone ·
30 Aura Generator · 31 Dungeon Difficulty · 32 Barber Chair ·
33 Destructible Building · 34 Guild Bank · 35 Trap Door · 36 New Flag ·
37 New Flag Drop · 38 Garrison Building · 39 Garrison Plot · 40 Client Creature ·
41 Client Item · 42 Capture Point · 43 Phaseable MO · 44 Garrison Monument ·
45 Garrison Shipment · 46 Garrison Monument Plaque · 47 Item Forge · 48 UI Link ·
49 Keystone Receptacle · 50 Gathering Node · 51 Challenge Mode Reward ·
52 Multi · 53 Siegeable Multi · 54 Siegeable MO · 55 PvP Reward ·
56 Future Patch 1 · 57 Future Patch 2.

## Loader behaviour

`LoadGameObjectTemplate` mostly **validates and logs** rather than rewriting
data. Helper checks run per type against the referenced stores and only emit a
`sql.sql` error when an id does not resolve:

- `CheckGOLockId` — the referenced `Lock_` id exists.
- `CheckGOLinkedTrapId` — a linked-trap Data slot points at a real GameObject.
- `CheckGOSpellId` — a spell reference exists.
- `CheckGONoDamageImmuneId` — logs a bad `noDamageImmune` combination.
- `CheckGOConsumable` — logs an inconsistent `consumable` flag.

The one check that **rewrites** a value is `CheckAndFixGOChairHeightId`: a
`chairheight` (type 7 chair `Data1`, type 32 barber chair `Data0`) above the
allowed range is reset to 0 to prevent unexpected client/server behaviour.

`gameobject_template_addon` is loaded separately (see
[GameObject-Related-Tables.md](GameObject-Related-Tables.md)); it is not part of
this table.

## Lyra implementation implications

- The editor writes all 46 columns in table order; a full query is a lossless
  `DELETE` + `INSERT`. The column list has a single source of truth in the
  schema module.
- Text columns are never `NULL`; an empty box is written as `''`.
- The Data card is driven by a per-type metadata table transcribed from the
  union: it renders named, typed controls for the selected type and a raw
  integer box for every other slot, so unknown data is preserved.
- `VerifiedBuild` is written even though the core ignores it, because dropping a
  stored column on save is data loss.

## Last verified

Against `ObjectMgr::LoadGameObjectTemplate`, the `GameObjectTemplate` union, and
the `gameobject_template` table definition.
