# GameObject-related tables

## Purpose

Layout and loader behaviour for the tables that hang off `gameobject_template`.
Authoritative behaviour comes from `ObjectMgr::LoadGameObjectTemplateAddons`,
`ObjectMgr::LoadGameObjects` and the loot loader in
`src/server/game/Globals/ObjectMgr.cpp` /
`src/server/game/Loot/LootMgr.cpp`. See
[GameObject-Template.md](GameObject-Template.md) for the main table.

## gameobject_template_addon

One row per template, keyed by `entry`, loaded separately from the template by
`LoadGameObjectTemplateAddons`. Columns:

| Column | Type | Notes |
| --- | --- | --- |
| `entry` | mediumint unsigned | Primary key; the template entry |
| `faction` | smallint unsigned | Faction template id |
| `flags` | int unsigned | GameObject flags mask |
| `mingold` | mediumint unsigned | Money loot floor |
| `maxgold` | mediumint unsigned | Money loot ceiling |
| `WorldEffectID` | mediumint unsigned | WorldEffect.db2 id |
| `AIAnimKitID` | int unsigned | AnimKit.db2 id |

All columns are integers, so the row needs no text escaping. It is written as an
`entry`-scoped DELETE + INSERT of zero or one row.

## gameobject_questitem

The quest items an object provides, keyed by (`GameObjectEntry`, `Idx`):
`ItemId`, `VerifiedBuild`. A composite key, so a diff must AND both key columns.

## gameobject_loot_template

The loot table an object rolls, keyed by `Entry` (a loot id referenced from the
template's chest/gathering Data slots, not necessarily the object entry).
Columns: `Item`, `Reference`, `Chance` (float), `QuestRequired`, `LootMode`,
`GroupId`, `MinCount`, `MaxCount`, `Comment` (text). The `Comment` is the only
text column and must be escaped through the shared quoter.

## gameobject (spawns)

Placed instances of a template, keyed by `guid`, with `id` referencing
`gameobject_template.entry`. Holds map/zone/area, phasing, position, rotation
(`rotation0..3`), `spawntimesecs`, `animprogress` and `state`. Editing spawns is
separate from editing the template.

## Load order

`gameobject_template` → `gameobject_template_addon` →
`gameobject_template_locale` → `gameobject_override` (where present) →
`gameobject_questitem`; loot templates and spawns load in their own passes. An
addon or questitem row whose `entry` has no template logs an error and is
skipped.

## Lyra implementation implications

- The addon is driven by its own schema module and the shared collection
  generator, so its column list has a single source of truth.
- Collection tables escape text through the shared quoter; `gameobject_questitem`
  and `gameobject_poi`-style composite keys AND every key column in a diff.

## Last verified

Against `ObjectMgr::LoadGameObjectTemplateAddons` and the respective table
definitions.
