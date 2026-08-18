# Sparse (Offset Map) DB2 Records

## Purpose

Decoding rules for DB2 files whose records have variable length and are
addressed through an offset map. Authoritative behaviour comes from the sparse
loader implementation in `src/common/DataStores/DB2FileLoader.cpp`.

## When a file is sparse

Bit 0 of the header `Flags` field selects the sparse layout. In the BFA 8.3.7
client data set exactly four files use it: `ItemSparse.db2`, `Spell.db2`,
`ConversationLine.db2` and `SceneScriptText.db2`.

For sparse files:

- `RecordSize` in the header is nominal and is not used for record addressing.
- `StringTableSize` is zero; strings live inline in each record.
- Column metadata is present but **entirely unused**. The sparse loader never
  looks at compression modes; every column is a plain value at a computed byte
  offset inside the record.
- Field entries are required, because they carry the stored width of integer
  columns.

## Section payload order

```
variable record data     at FileOffset, records concatenated back to back
id list                  at CatalogDataOffset, 4 * CatalogDataCount
copy table               8 * CopyTableCount
offset map               6 * CatalogDataCount
trailing id list         IdTableSize bytes
parent lookup            ParentLookupCount blocks
```

Two id lists are present. The first, at `CatalogDataOffset`, supplies the record
ids. The second follows the offset map and is not used for keying, but its bytes
must be consumed to reach the parent lookup.

The copy table for a sparse file is read here, between the id list and the
offset map, not in the position a fixed-layout file uses.

### Offset map entry

```
uint32 FileOffset
uint16 RecordSize
```

Entries are addressed by record index; a record's bytes are read from the
absolute file offset for exactly `RecordSize` bytes. Encrypted sections
contribute placeholder entries so that record indices stay aligned.

## Field offsets inside a record

Offsets are recomputed for every record by walking the columns in order from
byte zero. There is no fixed stride: a longer inline string shifts every column
after it.

| Column type | Bytes consumed |
| --- | --- |
| integer types | stored width from the field entry |
| float | 4 |
| string | `length + 1`, including the terminator |

### Stored width

```
stored width = 4 - UnusedBits / 8      // division truncates toward zero
```

`UnusedBits` may be negative, which widens the column past four bytes. A value
of `-32` denotes an eight byte column; 12 files in the BFA 8.3.7 client data set
contain such a column, `ItemSparse.db2` among them.

Typical values and the widths they produce:

| `UnusedBits` | Stored width |
| --- | --- |
| -32 | 8 |
| 0 | 4 |
| 16 | 2 |
| 24 | 1 |

## Reading values

The walk above determines *where* a column starts. How many bytes are read
depends on the declared column type:

| Declared type | Bytes read | Sign handling |
| --- | --- | --- |
| byte | 1 | reinterpreted as signed when the column is signed |
| short | 2 | reinterpreted as signed when the column is signed |
| int | stored width | sign-extended from `stored width * 8` bits |
| long | 8 | none applied |
| float | 4 | none |
| string | up to the terminator | none |

Only integer columns use the stored width for reading. Byte, short, long and
float columns always read their declared width, while the *offset* walk still
advances by the stored width. For the shipped client data the two agree, but the
distinction matters when a client stores a column more narrowly than its type.

A signed integer column whose stored width is narrower than four bytes is
sign-extended from the stored width, not from 32 bits.

Long columns are read without sign handling, so an "all bits set" mask surfaces
as `0xFFFFFFFFFFFFFFFF`. Interpreted as a signed 64-bit value that is `-1`, which
is the conventional "no restriction" encoding for race and class masks.

## Record ids and copies

Ids come from the first id list, positionally matched to the offset map entries.
A table definition may instead name an in-data index column, in which case the
id is decoded from that column like any other value.

Copy table entries duplicate a decoded record under a new id, exactly as for
fixed-layout files.

## Parent lookups

No sparse file in the BFA 8.3.7 client data set carries a parent lookup, so the
combination of a sparse layout with an appended parent column is untested
against real data.

## Lyra implementation implications

- A sparse record cannot be decoded without the table definition: column types
  and array sizes drive the offset walk.
- Never read a sparse record with a fixed cursor built from the widths of a
  destination structure. Two records of the same table routinely have different
  lengths.
- Treat the field entries as the source of integer widths; do not assume they
  match the declared types even when they currently do.
- A misaligned walk shows up as empty or garbled inline strings, so decoding a
  full table and checking that names are populated is an effective smoke test.

## Last verified

Against the HavenCore BFA DB2 sparse loader and the BFA 8.3.7.35662 client data
set.
