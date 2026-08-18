# SmartAI (`smart_scripts`)

## Purpose

Layout, identity and loader behaviour of the `smart_scripts` table, plus the
value ranges an editor must offer. Authoritative behaviour comes from
`SmartAIMgr::LoadSmartAIFromDB` and the enums in
`src/server/game/AI/SmartScripts/SmartScriptMgr.h`.

## Table layout

Primary key: (`entryorguid`, `source_type`, `id`, `link`).

| Column | Type | Notes |
| --- | --- | --- |
| `entryorguid` | `bigint` **signed** | Entry when `>= 0`, spawn guid when negative |
| `source_type` | `tinyint unsigned` | `SmartScriptType`, 0–10 |
| `id` | `smallint unsigned` | Line number within the script |
| `link` | `smallint unsigned` | `id` of a line to chain, or 0 |
| `event_type` | `tinyint unsigned` | `SMART_EVENT` |
| `event_phase_mask` | `smallint unsigned` | Phase bitmask (see the trap below) |
| `event_chance` | `tinyint unsigned` | Percent, normally 100 |
| `event_flags` | `int unsigned` | `SMART_EVENT_FLAG_*` |
| `event_param1`–`event_param5` | `int unsigned` | Meaning depends on `event_type` |
| `event_param_string` | `varchar` | Text parameter for the few events that take one |
| `action_type` | `tinyint unsigned` | `SMART_ACTION` |
| `action_param1`–`action_param6` | `int` **signed** | Meaning depends on `action_type` |
| `target_type` | `tinyint unsigned` | `SMARTAI_TARGETS` |
| `target_param1`–`target_param3` | `int unsigned` | Meaning depends on `target_type` |
| `target_x`, `target_y`, `target_z`, `target_o` | `float` | Position target |
| `comment` | `text` | Free text |

`event_param5` and `event_param_string` sit between `event_param4` and
`action_type`, and the loader reads them at field indices 12 and 13. Any tool
that assumes four event parameters, or that omits the string column, produces a
row this core cannot load correctly.

## Identity

A script is addressed by `entryorguid` **together with** `source_type`; the same
numeric value means different things per type. A **negative** `entryorguid` is
the negated spawn guid, which scopes the script to one placed creature or
gameobject instead of every spawn of that template. Only
`SMART_SCRIPT_TYPE_CREATURE` and `SMART_SCRIPT_TYPE_GAMEOBJECT` support the
guid form; the loader logs "GUID-specific scripting not yet implemented" for
any other source type.

`id` orders the lines; `link` chains one line to another by `id`. A line whose
`link` points at itself is rejected as an infinite loop.

## Value ranges

Taken from the enum bounds, not from observed data:

| Enum | Valid values |
| --- | --- |
| `SmartScriptType` (`source_type`) | 0–10 (`SMART_SCRIPT_TYPE_MAX` = 11) |
| `SMART_EVENT` | 0–81 (`SMART_EVENT_END` = 82) |
| `SMART_ACTION` | 0–142, then **201–215**, plus **1005** |
| `SMARTAI_TARGETS` | 0–29, plus **100** |

The action and target ranges are not contiguous. `SMART_ACTION` jumps from
`SMART_ACTION_COMPLETE_SCENARIO` (142) to `SMART_ACTION_PLAY_SPELL_VISUAL`
(201), runs to `SMART_ACTION_CAST_SPELL_OFFSET` (215), and then defines
`SMART_ACTION_ENTER_LFG_QUEUE` at **1005**, which the source marks as a
core-specific addition. `SMARTAI_TARGETS` ends at
`SMART_TARGET_VEHICLE_ACCESSORY` (29) but also defines
`SMART_TARGET_INVOKER_SUMMON` at **100**. An editor that offers a dense 0..max
dropdown will both hide the high values and offer non-existent ones in the gaps.

Not every event is valid for every `source_type`: `SmartAIEventMask` gates
events per script type, and `SmartAITypeMask` gates which types allow what.

## Event phases and flags

Phases are a bitmask, not an index: `SMART_EVENT_PHASE_1_BIT` = 1,
`_2_BIT` = 2, `_3_BIT` = 4 … `_12_BIT` = 2048, and
`SMART_EVENT_PHASE_ALL` = **4095**. A mask of 0 means the event fires in every
phase.

`SMART_EVENT_FLAG_*` runs from `NOT_REPEATABLE` (0x001) through the difficulty
bits, `DEBUG_ONLY` (0x080), `DONT_RESET` (0x100), `WHILE_CHARMED` (0x200) and
the mythic / mythic-keystone difficulty bits (0x400, 0x800). Bits 0x020 and
0x040 are reserved.

### Trap: the phase mask is read 8 bits wide

The column is `smallint unsigned` and the in-memory field is `uint32`, but the
loader reads it with `fields[5].GetUInt8()`. A mask above 255 — that is, any
script using phases 9 through 12 — cannot survive the load intact. The range
check that rejects a mask greater than `SMART_EVENT_PHASE_ALL` runs *after*
that read, so it never sees the original value.

Store phase masks within the low 8 bits (phases 1–8) unless the core is changed;
values above that will not behave as written.

## Loader behaviour

`LoadSmartAIFromDB` validates and skips rather than repairing:

- A creature or gameobject entry that does not exist, or whose template does not
  use SmartAI (`AIName` = `SmartAI` / `SmartGameObjectAI`), is skipped with a
  `sql.sql` error.
- The same applies to guid-form scripts whose spawn does not exist.
- A self-linking event is skipped.
- An out-of-range phase mask is skipped.

Scripts are keyed in memory by (`entryorguid`, `source_type`), so a whole
script is loaded or replaced as a unit.

## Lyra implementation implications

- A script is a **collection** keyed by (`entryorguid`, `source_type`); saving
  it is a scoped `DELETE` + multi-row `INSERT`, and the `DELETE` must match both
  key columns so a creature script never removes a gameobject script.
- Event, action and target dropdowns must be built from the real enum values,
  including the 201–215, 1005 and 100 outliers, rather than a numeric range.
- `event_param5` and `event_param_string` are written on every row; dropping
  them loses data this core reads.
- `action_param1`–`6` are signed and must preserve negative values, while the
  event and target parameters are unsigned.
- `comment` and `event_param_string` are text and go through the shared escaper.
- `entryorguid` is a signed 64-bit column: it exceeds the exact integer range of
  a JavaScript number and must not round-trip through a float.

## Last verified

Against `SmartAIMgr::LoadSmartAIFromDB`, the `SMART_EVENT`, `SMART_ACTION`,
`SMARTAI_TARGETS`, `SmartScriptType`, `SMART_EVENT_PHASE_BITS` and
`SMART_EVENT_FLAG_*` enums in
`src/server/game/AI/SmartScripts/SmartScriptMgr.h`, and the `smart_scripts`
table definition.
