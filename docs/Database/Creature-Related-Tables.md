# Creature-related tables

## Purpose

Layout and editing semantics of the tables that hang off `creature_template`.
See [Creature-Template.md](Creature-Template.md) for the main table.

Creatures have more sub-tables than any other entity, and they split into two
groups that are easy to confuse: tables keyed by the **template entry** (they
describe the creature type) and tables keyed by a **spawn `guid`** (they
describe one placed instance).

## Keyed by template entry

| Table | Key | Notes |
| --- | --- | --- |
| `creature_template_addon` | `entry` | Per-type addon; `auras` is text |
| `creature_equip_template` | `CreatureID`, `ID` | Up to 3 item slots per equip set |
| `creature_template_model` | `CreatureID`, `Idx` | Display ids with `DisplayScale` / `Probability` floats |
| `creature_text` | `CreatureID`, `GroupID`, `ID` | Text lines; `Text` is `longtext` |
| `creature_trainer` | `CreatureId` | Links to a `TrainerId`, menu and option index |
| `npc_vendor` | `entry`, `item` (+ `ExtendedCost`, `type`) | Vendor list |
| `creature_onkill_reward` | `creature_id` | 0 or 1 row |
| `creature_questitem` | `CreatureEntry`, `Idx` | Composite key |
| `creature_queststarter` / `creature_questender` | `id`, `quest` | Quest relations |

## Keyed by spawn guid

| Table | Key | Notes |
| --- | --- | --- |
| `creature` | `guid` | The spawn itself; `id` references the template |
| `creature_addon` | `guid` | Per-spawn addon, distinct from the template addon |
| `creature_formations` | `leaderGUID`, `memberGUID` | `dist` / `angle` are floats |

`creature_template_addon` and `creature_addon` carry nearly identical columns.
Editing one when the other was intended changes either every creature of that
type or a single spawn. Note also that `emote` is `mediumint unsigned` in the
template addon but `int unsigned` in the spawn addon.

## Columns that need care

**Signed columns.** `aiAnimKit`, `movementAnimKit` and `meleeAnimKit` are
`smallint` **signed** in both addon tables. In `creature_onkill_reward` the
reputation fields are signed (`RewOnKillRepFaction1/2` `smallint`,
`RewOnKillRepValue1/2` `mediumint`, `MaxStanding1/2` and `IsTeamAward1/2`
`tinyint`) and `CurrencyCount1`–`3` are signed `mediumint`, so a negative
reward is representable. `creature_text.Language` and
`creature_text.BroadcastTextId` are signed, as are `npc_vendor.slot`,
`npc_vendor.item` and `npc_vendor.OverrideGoldCost` (`bigint`).

**64-bit columns.** `creature.guid`, `creature_addon.guid` and both
`creature_formations` guid columns are `bigint unsigned`, and
`npc_vendor.OverrideGoldCost` is a signed `bigint`. These exceed the exact
integer range of a JavaScript number and must not round-trip through a float.

**Text columns.** `creature_template_addon.auras`, `creature_addon.auras`,
`creature_text.Text` (`longtext`), `creature_text.comment` and
`npc_vendor.BonusListIDs` are text and nullable. They must go through the
shared escaper: an `auras` list or a text line containing a backslash, quote or
newline otherwise breaks the statement.

**Floats.** `creature_template_model.DisplayScale` / `Probability`,
`creature_text.Probability` and `creature_formations.dist` / `angle` must be
formatted locale-independently.

## Lyra implementation implications

- Template-keyed and spawn-keyed editors are separate surfaces; a spawn editor
  scopes its writes by `guid`, never by the template entry.
- Composite keys (`creature_equip_template`, `creature_template_model`,
  `creature_text`, `creature_questitem`) AND every key column in a diff.
- `creature_text` and `npc_vendor` diffs key on the full composite identity, so
  editing one line does not rewrite the rest of the group.

## Last verified

Against the table definitions of `creature_template_addon`, `creature_addon`,
`creature_equip_template`, `creature_template_model`, `creature_text`,
`creature_trainer`, `npc_vendor`, `creature_formations`,
`creature_onkill_reward` and `creature_questitem`.
