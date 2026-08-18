# WDC3 Container Format

## Purpose

Physical layout of the DB2 client data files used by HavenCore BFA, and the
decoding rules that produce the values the core loads. Authoritative behaviour
comes from `DB2FileLoader` (`src/common/DataStores/DB2FileLoader.cpp`) together
with `DB2Meta` and the per-table definitions in `DB2Metadata.h` / `DB2LoadInfo.h`.

## Container

`DB2FileLoader::LoadHeaders` accepts the `WDC3` signature only. Every DB2 file
in the BFA 8.3.7 client data set is `WDC3`; earlier containers are not read.

Blocks appear in this order:

1. Header, 72 bytes.
2. Section headers, 40 bytes each, `SectionCount` of them.
3. Field entries, 4 bytes each, **`FieldCount`** of them.
4. Column metadata, 24 bytes each, `ColumnMetaSize / 24` = `TotalFieldCount`.
5. Pallet values, for every `Pallet` column in column order.
6. Pallet-array values, for every `PalletArray` column in column order.
7. Common values, for every `CommonData` column in column order that has data.
8. Section payloads, at the absolute `FileOffset` recorded per section.

Steps 5 and 6 are two separate passes. Reading all pallet blocks in a single
pass over the columns misplaces every subsequent block in files that mix both
modes.

### Header

| Field | Type | Notes |
| --- | --- | --- |
| `Signature` | uint32 | `WDC3` |
| `RecordCount` | uint32 | Across all sections, encrypted ones included |
| `FieldCount` | uint32 | Number of field entries |
| `RecordSize` | uint32 | Fixed record size; nominal only for sparse files |
| `StringTableSize` | uint32 | Sum over sections |
| `TableHash` | uint32 | Table identity; **not** validated against a constant |
| `LayoutHash` | uint32 | Must match the table definition's layout hash |
| `MinId`, `MaxId` | uint32 | Id range |
| `Locale` | uint32 | Bitmask indexed by locale constant |
| `Flags` | uint16 | Bit 0 selects the sparse layout |
| `IndexField` | int16 | Informational; the table definition is authoritative |
| `TotalFieldCount` | uint32 | Number of columns |
| `PackedDataOffset` | uint32 | Byte offset of the bit-packed block in a record |
| `ParentLookupCount` | uint32 | At most 1 is accepted |
| `ColumnMetaSize` | uint32 | |
| `CommonDataSize` | uint32 | |
| `PalletDataSize` | uint32 | Pallet block plus pallet-array block |
| `SectionCount` | uint32 | |

`LoadHeaders` validates the layout hash against the table definition, rejects
`ParentLookupCount > 1`, and requires
`TotalFieldCount + (parent column appended ? 1 : 0) == definition field count`.
It never compares `TableHash` to a constant.

For non-sparse files it also checks the exact file size:

```
72
+ 40 * SectionCount
+ 4  * FieldCount
+ RecordCount * RecordSize
+ StringTableSize
+ (id not in data ? RecordCount * 4 : 0)
+ sum(section.CopyTableCount) * 8
+ ColumnMetaSize + PalletDataSize + CommonDataSize
+ sum(section.ParentLookupDataSize)
```

### Section header

`TactId`(uint64), `FileOffset`, `RecordCount`, `StringTableSize`,
`CatalogDataOffset`, `IdTableSize`, `ParentLookupDataSize`, `CatalogDataCount`,
`CopyTableCount` — the last eight are uint32, so the structure is 40 bytes.

A non-zero `TactId` marks an **encrypted** section. Its records cannot be
decoded and are skipped entirely: the loader never seeks to its `FileOffset`,
and the id table is padded with zeroes so that global record indices stay
aligned. The records still occupy their slots in the record numbering.

### Field entry

```
int16  UnusedBits
uint16 Offset
```

There are `FieldCount` of them, not `TotalFieldCount`. `Offset` describes the
fixed record layout. `UnusedBits` gives the stored width of integer columns in
sparse files and is otherwise unused; see `Sparse-Records.md`.

### Column metadata

```
uint16 BitOffset          // position of the column for uncompressed storage
uint16 BitSize            // total bits, all array elements included
uint32 AdditionalDataSize // size of this column's pallet or common block
uint32 CompressionType
uint32 CompressionData[3] // interpretation depends on CompressionType
```

| Type | Value | `CompressionData` |
| --- | --- | --- |
| `None` | 0 | unused |
| `Immediate` | 1 | bit offset, bit width, signed flag |
| `CommonData` | 2 | default value |
| `Pallet` | 3 | bit offset, bit width |
| `PalletArray` | 4 | bit offset, bit width, array size |
| `SignedImmediate` | 5 | bit offset, bit width |

## Regular record decoding

### Buffer layout

The loader concatenates every section's record block, in section order, then
every section's string table, in section order, into one buffer. Encrypted
sections leave a zeroed gap of `RecordCount * RecordSize`. This layout matters:
string offsets are relative to positions inside this buffer.

### Column byte offset

```
None                        -> BitOffset / 8
Immediate, SignedImmediate  -> CompressionData.BitOffset / 8 + PackedDataOffset
Pallet, PalletArray         -> CompressionData.BitOffset / 8 + PackedDataOffset
CommonData                  -> not stored in the record
```

`PackedDataOffset` is mandatory. In the BFA 8.3.7 client data set, 281 of the
715 files have a non-zero value, so treating a compression bit offset as
absolute from the start of the record produces wrong values for most tables.

### Bit extraction

Read eight bytes from the column's byte offset, shift right by
`bit_offset % 8`, keep `bit_width` bits. The bits belonging to a column always
lie inside its own record, so the read may be clamped to the record and padded
with zeroes.

`SignedImmediate` then sign-extends from `bit_width`.

### Truncation to the declared width

The loader materialises each value into the type the table definition declares
and copies `min(sizeof(destination), sizeof(source))` bytes, so a value wider
than its column keeps only the low bytes. This is not cosmetic: pallet blocks in
the shipped client data store unrelated high bits. Reading a pallet column at
full width yields values that are orders of magnitude too large.

### Arrays

| Storage | Element addressing |
| --- | --- |
| `None` | byte offset + declared element width × array index |
| `Immediate`, `SignedImmediate` | scalar only |
| `Pallet` | scalar only |
| `PalletArray` | pallet slot `index * ArraySize + array index` |
| `CommonData` | keyed by record id; array index ignored |

The element stride for `None` storage is the width of the **declared** type
(byte 1, short 2, int 4, float 4, long 8), not a width derived from `BitSize`.

### Strings

A string column stores a uint32 offset **relative to the column's own position**
inside the concatenated buffer:

```
absolute = record index * RecordSize
         + column byte offset
         + 4 * array index
         + stored value
```

The result points into the string table region of the same buffer. Treating the
stored value as an index into the string table alone resolves to the wrong text,
usually out of bounds.

### Record ids

If the table definition names an index column, the id is decoded from that
column, which is always `None`, `Immediate` or `SignedImmediate`. Otherwise the
id comes from the section id table, which holds exactly `4 * RecordCount` bytes
per section. The header's own `IndexField` is informational and can be non-zero
even for tables whose ids live in the id table.

### Section payload order

```
records            RecordSize * RecordCount
string table       StringTableSize
id table           IdTableSize
copy table         8 * CopyTableCount
parent lookup      ParentLookupCount blocks
```

### Copy table

Each entry is `{ uint32 NewRowId, uint32 SourceRowId }`. A copy duplicates the
decoded source record under the new id. Entries with `SourceRowId == 0` are
ignored. Copies can substantially outnumber real records.

### Parent lookup

Present when `ParentLookupCount` is non-zero, once per section:

```
uint32 NumEntries
uint32 MinId
uint32 MaxId
{ uint32 ParentId, uint32 RecordIndex } * NumEntries
```

The 12-byte info block is always present, even when `NumEntries` is zero.
`RecordIndex` is **relative to its section**; the global index is obtained by
adding the record counts of all preceding sections. Only the first lookup feeds
the parent column.

The parent column may be appended to the loaded structure rather than stored in
the file. In that case the definition's field count exceeds the file's column
count by one, and every record that has no lookup entry reads zero.

### Locale

`Locale` is a bitmask indexed by the locale constant order:

```
0 enUS, 1 koKR, 2 frFR, 3 deDE, 4 zhCN, 5 zhTW,
6 esES, 7 esMX, 8 ruRU, 9 (unused), 10 ptBR, 11 itIT
```

Loading localized strings for a locale whose bit is clear is refused. Files with
no localized columns commonly carry `0xFFFFFFFF`.

## Feature usage in the BFA 8.3.7 client data set

Measured over the 715 shipped files, useful as a coverage guide:

| Feature | Files |
| --- | --- |
| `WDC3` container | 715 (all) |
| `PackedDataOffset` non-zero | 281 |
| `PalletArray` columns | 100 |
| `CommonData` columns | 63 |
| At least one encrypted section | 39 |
| Sparse layout | 4 |
| Negative `UnusedBits` | 12 |
| `FieldCount` different from `TotalFieldCount` | 0 |
| `ParentLookupCount` above 1 | 0 |

## Lyra implementation implications

- Decode from column metadata; never infer a physical width from the type of a
  destination structure member.
- Apply `PackedDataOffset` to every bit-packed mode.
- Read the pallet block, the pallet-array block and the common block as three
  ordered passes.
- Truncate every decoded value to its declared width.
- Resolve strings relative to the column's own position in the concatenated
  buffer.
- Skip encrypted sections and report how many records became unavailable rather
  than decoding zeroes.
- Validate the layout hash and the column count, and fail with a clear message
  instead of decoding a file the definition does not describe.

## Last verified

Against the HavenCore BFA DB2 loader and the complete BFA 8.3.7.35662 client
data set (715 files).
