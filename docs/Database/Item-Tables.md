# Item tables (hotfix database)

## Purpose

Layout, signedness and editing semantics of the item tables as they exist in the
**hotfix database**, and the traps that make item editing different from the
world-database templates. For the binary client-side layout of the same data see
[../DB2/Item-ItemSparse-ItemEffect.md](../DB2/Item-ItemSparse-ItemEffect.md);
for how a database row overrides client data see
[../DB2/Hotfix-Overlay.md](../DB2/Hotfix-Overlay.md).

Unlike creatures, quests and gameobjects, an item is **not** one row in one
world table. It is assembled from several hotfix tables that mirror DB2 files,
and the same logical field can appear in more than one of them with a
**different width**.

## The tables

| Table | Holds | Key |
| --- | --- | --- |
| `item` | Class, subclass, material, inventory type, sheathe, icon | `ID` |
| `item_sparse` | Almost everything else: names, stats, requirements, flags | `ID` |
| `item_effect` | Spells the item casts or teaches | `ID`, parent `ParentItemID` |
| `item_appearance`, `item_modified_appearance` | Display/appearance resolution | `ID` |
| `item_search_name` | Client search index — **a different table, not a view** | `ID` |

`item` is small and mostly unsigned; the notable signed columns are
`InventoryType` (`tinyint`), `SoundOverrideSubclassID` (`tinyint`) and
`IconFileDataID` (`int`).

## Signedness is the main trap

Several `item_sparse` columns are **signed**, and some of them are bitmasks
where the client stores `-1` to mean "no restriction". Writing the unsigned
reading of such a value overflows the column: MySQL then clamps it (in
non-strict mode) and the row is silently corrupted.

| Column | Type | Notes |
| --- | --- | --- |
| `AllowableClass` | `smallint` **signed** | Class mask. `-1` = all classes |
| `AllowableRace` | `bigint` **signed** | Race mask. `-1` = all races |
| `Flags1`–`Flags4` | `int` **signed** | Bit 31 is a negative value, not `2147483648` |
| `StatPercentEditor1`–`10` | `int` signed | |
| `StatModifierBonusStat1`–`10` | `tinyint` signed | `-1` marks an unused slot |
| `RequiredLevel` | `tinyint` signed | |
| `Stackable`, `MaxCount`, `FactionRelated` | `int` signed | |
| `BagFamily` | `int` **unsigned** | The one mask here that is not signed |

The declared width matters as much as the sign. `AllowableClass` is
**16-bit**: the load info for `ItemSparse` declares
`{ true, FT_SHORT, "AllowableClass" }`, and the `ItemSparseEntry` field is
`int16`. A value composed at 32 bits and written here cannot fit.

### `AllowableClass` appears twice, with different widths

`ItemSearchNameEntry` also has an `AllowableClass`, and **that one is `int32`**
(`{ true, FT_INT, "AllowableClass" }`). Reading the wrong table's definition
leads to decoding `ItemSparse` at the wrong width; the low 16 bits of `-1` then
present as `32767` rather than `-1`. Always take the field width from the load
info of the table actually being read.

### The `32767` signature

`32767` is `MAX(signed smallint)`. Seeing it in `AllowableClass` is a strong
sign that an out-of-range value was written and clamped, rather than a real
client value — the client uses `-1` for "all classes".

## Text columns are nullable

`Display` (the item name), `Display1`–`Display3` and `Description` are
`text` with **no `NOT NULL`**, so `NULL` and `''` are distinguishable and must
be preserved separately. This is the opposite of `gameobject_template`, whose
text columns are all `NOT NULL DEFAULT ''`.

## item_effect

Keyed by its own `ID` and linked to the item by `ParentItemID`. `TriggerType`,
`Charges`, `SpellID`, `CoolDownMSec` and `CategoryCoolDownMSec` are signed;
the cooldown fields use `-1` for "no cooldown", so a default of `0` is not
equivalent. `VerifiedBuild` distinguishes official rows from custom ones: rows
with `VerifiedBuild > 0` came from the client build and should not be deleted
when rewriting custom effects.

## Lyra implementation implications

- A bitmask editor must know both the **width** and the **signedness** of the
  column. Composing at the wrong width, or emitting the unsigned form of an
  all-bits value, produces a value the column cannot store.
- `-1` is a legitimate, meaningful value in these columns and must round-trip
  unchanged; it is not a placeholder to normalise away.
- Numeric inputs for these columns should carry the column's real bounds so an
  out-of-range value cannot be entered and silently clamped.
- The nullable text columns need an explicit NULL control, since `NULL` cannot
  be expressed by typing into a text box.
- Item edits target the **hotfix** database, not the world database.

## Last verified

Against the `item`, `item_sparse` and `item_effect` table definitions,
`ItemSparseLoadInfo` / `ItemSearchNameLoadInfo` in
`src/server/game/DataStores/DB2LoadInfo.h`, and `ItemSparseEntry` /
`ItemSearchNameEntry` in `src/server/game/DataStores/DB2Structure.h`.
