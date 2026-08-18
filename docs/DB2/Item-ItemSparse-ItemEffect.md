# Item, ItemSparse and ItemEffect

## Purpose

Structure and relationships of the three DB2 tables that describe items, as
defined by `ItemMeta`, `ItemSparseMeta`, `ItemEffectMeta` and their load info
counterparts in `src/server/game/DataStores/`.

## Relationships

```
Item.db2         one row per item id: class, subclass, material, icon
ItemSparse.db2   one row per item id: name, quality, prices, stats, flags
ItemEffect.db2   zero or more rows per item, linked through the parent lookup
```

`Item` and `ItemSparse` are two halves of the same catalogue keyed by the same
item id; neither embeds a reference to the other. `ItemEffect` rows carry
`ParentItemID`, which is the `Item` id the effect belongs to.

## Item.db2

- File id 841626, layout hash `0x4517779D`.
- Eight columns, no array columns, no parent column.
- Ids come from the section id table; the header's own index field is `0` but
  the table definition declares no in-data index, and the id table is present.

| # | Column | Type | Signed |
| --- | --- | --- | --- |
| 0 | `ClassID` | byte | no |
| 1 | `SubclassID` | byte | no |
| 2 | `Material` | byte | no |
| 3 | `InventoryType` | byte | yes |
| 4 | `SheatheType` | byte | no |
| 5 | `SoundOverrideSubclassID` | byte | yes |
| 6 | `IconFileDataID` | int | yes |
| 7 | `ItemGroupSoundsID` | byte | no |

In the shipped 8.3.7 file all eight columns are bit-packed, the record is seven
bytes, and `PackedDataOffset` is zero. Five columns use pallet storage.

**Trap.** `ItemGroupSoundsID` is a pallet column whose stored 32-bit values carry
unrelated high bits. The declared type is a byte, so only the low eight bits are
the value. Reading the pallet entry at full width yields values in the millions.

## ItemSparse.db2

- File id 1572924, layout hash `0xAC420B53`.
- Sparse layout; see `Sparse-Records.md`.
- 62 columns holding 95 scalar values once arrays are expanded, no parent column.
- Ids come from the offset map id list.

Column order, which is also the order of the inline record layout:

| # | Column | Type | Array | Signed |
| --- | --- | --- | --- | --- |
| 0 | `AllowableRace` | long | 1 | yes |
| 1 | `Description` | string | 1 | |
| 2 | `Display3` | string | 1 | |
| 3 | `Display2` | string | 1 | |
| 4 | `Display1` | string | 1 | |
| 5 | `Display` | string | 1 | |
| 6 | `DmgVariance` | float | 1 | |
| 7 | `DurationInInventory` | int | 1 | no |
| 8 | `QualityModifier` | float | 1 | |
| 9 | `BagFamily` | int | 1 | no |
| 10 | `ItemRange` | float | 1 | |
| 11 | `StatPercentageOfSocket` | float | 10 | |
| 12 | `StatPercentEditor` | int | 10 | yes |
| 13 | `Stackable` | int | 1 | yes |
| 14 | `MaxCount` | int | 1 | yes |
| 15 | `RequiredAbility` | int | 1 | no |
| 16 | `SellPrice` | int | 1 | no |
| 17 | `BuyPrice` | int | 1 | no |
| 18 | `VendorStackCount` | int | 1 | no |
| 19 | `PriceVariance` | float | 1 | |
| 20 | `PriceRandomValue` | float | 1 | |
| 21 | `Flags` | int | 4 | yes |
| 22 | `FactionRelated` | int | 1 | yes |
| 23 | `ItemNameDescriptionID` | short | 1 | no |
| 24 | `RequiredTransmogHoliday` | short | 1 | no |
| 25 | `RequiredHoliday` | short | 1 | no |
| 26 | `LimitCategory` | short | 1 | no |
| 27 | `GemProperties` | short | 1 | no |
| 28 | `SocketMatchEnchantmentId` | short | 1 | no |
| 29 | `TotemCategoryID` | short | 1 | no |
| 30 | `InstanceBound` | short | 1 | no |
| 31 | `ZoneBound` | short | 2 | no |
| 32 | `ItemSet` | short | 1 | no |
| 33 | `LockID` | short | 1 | no |
| 34 | `StartQuestID` | short | 1 | no |
| 35 | `PageID` | short | 1 | no |
| 36 | `ItemDelay` | short | 1 | no |
| 37 | `ScalingStatDistributionID` | short | 1 | no |
| 38 | `MinFactionID` | short | 1 | no |
| 39 | `RequiredSkillRank` | short | 1 | no |
| 40 | `RequiredSkill` | short | 1 | no |
| 41 | `ItemLevel` | short | 1 | no |
| 42 | `AllowableClass` | short | 1 | yes |
| 43 | `ExpansionID` | byte | 1 | no |
| 44 | `ArtifactID` | byte | 1 | no |
| 45 | `SpellWeight` | byte | 1 | no |
| 46 | `SpellWeightCategory` | byte | 1 | no |
| 47 | `SocketType` | byte | 3 | no |
| 48 | `SheatheType` | byte | 1 | no |
| 49 | `Material` | byte | 1 | no |
| 50 | `PageMaterialID` | byte | 1 | no |
| 51 | `LanguageID` | byte | 1 | no |
| 52 | `Bonding` | byte | 1 | no |
| 53 | `DamageDamageType` | byte | 1 | no |
| 54 | `StatModifierBonusStat` | byte | 10 | yes |
| 55 | `ContainerSlots` | byte | 1 | no |
| 56 | `MinReputation` | byte | 1 | no |
| 57 | `RequiredPVPMedal` | byte | 1 | no |
| 58 | `RequiredPVPRank` | byte | 1 | no |
| 59 | `RequiredLevel` | byte | 1 | yes |
| 60 | `InventoryType` | byte | 1 | no |
| 61 | `OverallQualityID` | byte | 1 | no |

Notes:

- The five string columns come early and are inline, so they determine where
  every later column starts in a given record.
- `Display` is the item name. `Display1` to `Display3` are additional name lines
  and are empty for the overwhelming majority of items, but they are real
  columns and must be decoded, not skipped.
- `AllowableRace` is a 64-bit mask read without sign handling; "no restriction"
  is all bits set, which reads as `-1` when interpreted as a signed 64-bit value.
- `AllowableClass` is a signed 16-bit mask with `-1` meaning "no restriction".
- In the shipped 8.3.7 file the stored widths are 8 bytes for `AllowableRace`,
  4 for int and float columns, 2 for short columns and 1 for byte columns. This
  alignment is a property of that build, not a guarantee.

## ItemEffect.db2

- File id 969941, layout hash `0xE3E95759`.
- Nine columns, of which only the first eight exist in the file. The ninth,
  `ParentItemID`, is **appended** to the loaded structure and filled from the
  file's parent lookup.
- Ids come from the section id table.

| # | Column | Type | Signed | Notes |
| --- | --- | --- | --- | --- |
| 0 | `LegacySlotIndex` | byte | no | |
| 1 | `TriggerType` | byte | yes | |
| 2 | `Charges` | short | yes | |
| 3 | `CoolDownMSec` | int | yes | |
| 4 | `CategoryCoolDownMSec` | int | yes | |
| 5 | `SpellCategoryID` | short | no | |
| 6 | `SpellID` | int | yes | |
| 7 | `ChrSpecializationID` | short | no | |
| 8 | `ParentItemID` | int | no | from the parent lookup, not in the file |

The parent lookup carries one entry per record that has a parent, addressed by a
section-relative record index. Records with no entry read `ParentItemID` as zero.

**Trap.** `SpellCategoryID` and `ChrSpecializationID` are pallet columns whose
stored values carry constant high bits (patterns such as `0x00A4xxxx` and
`0x0005xxxx`). Both are declared as shorts, so only the low 16 bits are the
value. Without truncation these columns read as values in the millions.

## Observed shape of the 8.3.7.35662 client data

Useful as sanity bounds when validating a decoder; a different client build will
differ.

| Table | Records | Copies | Distinct ids |
| --- | --- | --- | --- |
| `Item.db2` | 36 839 | 108 084 | 144 923 |
| `ItemSparse.db2` | 117 645 | 96 | 117 741 |
| `ItemEffect.db2` | 34 459 | 0 | 34 459 |

`Item.db2` has seven sections and a copy table far larger than its record count.
`ItemEffect.db2` has five sections and 34 368 parent lookup entries, so a small
number of effects legitimately have no parent.

## Lyra implementation implications

- Decode all three tables through the shared metadata-driven decoder; none of
  them needs table-specific binary code.
- Truncate every value to its declared width, or the pallet columns named above
  will be wrong.
- Populate `Display1` to `Display3`; they are part of the record even when empty.
- Resolve `ParentItemID` from the parent lookup, using section-relative record
  indices.
- Expect the effective `Item` id space to be dominated by copy-table rows.

## Last verified

Against the HavenCore BFA item table definitions and the BFA 8.3.7.35662 client
data set.
