# Lyra DB2 Subsystem Requirements

## Purpose

The architecture and correctness rules the DB2 subsystem has to satisfy, and the
traps that a naive implementation falls into. Format details live in
`DB2/WDC3-Format.md` and `DB2/Sparse-Records.md`.

## Architecture

The subsystem is layered so that no table-specific code touches the binary
format:

```
format   WDC3 container parsing, no table knowledge
meta     structural table definitions, schema only
decode   metadata-aware record decoding for both layouts
mapping  decoded records to domain structures
catalog  client data discovery, load orchestration, caching
```

Rules that follow from this:

- Adding a table means adding a structural definition and a mapper. It must
  never mean writing another binary parser.
- A mapper names the columns it reads and copies values. It contains no offsets,
  no widths and no compression handling.
- The structural registry holds schema only: column names, types, array sizes,
  signedness, index column, parent column, layout hash, client file id. It holds
  no record values, no record counts and no id ranges. Everything the user sees
  is decoded at run time from the files they selected, so modified or custom
  client data is reflected automatically.

## Validation policy

On load, before any record is read:

- The container signature must be `WDC3`.
- The layout hash must match the table definition. A mismatch means the file
  uses a different schema and must be reported, not decoded.
- The column count must match, allowing for one appended parent column.
- At most one parent lookup, and a parent lookup requires the definition to
  declare a parent column.
- For tables with localized strings, the requested locale must be present in the
  file's locale mask.
- The table hash must **not** be compared against a constant. The loader in
  HavenCore validates the layout hash only, and the table hash identifies the
  table for hotfix purposes.

Every failure carries the table name and the specific mismatch. Decoding a file
the definition does not describe is never an acceptable fallback.

## Correctness traps

Each of these produces plausible-looking but wrong values rather than an error,
so each needs a regression test.

1. **Ignoring `PackedDataOffset`.** Bit-packed columns are addressed relative to
   the record's packed block. Most tables have a non-zero offset.
2. **Resolving strings against the string table alone.** The stored value is an
   offset from the column's own position inside the concatenated record and
   string buffer.
3. **Skipping value truncation.** Pallet blocks store unrelated high bits;
   values must be truncated to the declared column width.
4. **Treating a `Pallet` block and a `PalletArray` block as one pass.** They are
   two ordered passes, followed by the common-data blocks.
5. **Ignoring common-data columns.** Their value is keyed by record id and falls
   back to a per-column default; they are not zero.
6. **Assuming array strides.** For uncompressed storage the stride is the
   declared element width; for pallet arrays it is a slot inside the pallet
   block.
7. **Decoding encrypted sections.** A non-zero section key marks data that
   cannot be read; the records are unavailable and their slots must still be
   reserved so record indices stay aligned.
8. **Deriving record ids from the start of the record.** Ids come from the id
   table unless the definition names an in-data index column, which may be
   bit-packed anywhere in the record.
9. **Reading sparse records with a fixed cursor.** Sparse records vary in
   length; offsets are recomputed per record from the field entries and the
   inline string lengths.
10. **Inferring a physical width from a destination structure member.** The file
    decides the width. A `uint32` member does not imply four stored bytes.
11. **Treating parent lookup record indices as global.** They are relative to
    their section.
12. **Ignoring the copy table.** For some tables the copies outnumber the
    records several times over, and every copy is a real id.

## Verification requirements

Two complementary layers:

- **Hermetic tests.** Synthetic containers written byte by byte, covering bit
  extraction, sign extension, width truncation, every storage mode including
  common data and pallet arrays, arrays, strings across multiple sections,
  sparse records with differing widths and inline strings, copy tables, in-data
  index columns, parent lookups, encrypted sections and the validation failures
  above. These must not depend on any client build.
- **Client data validation.** Optional tests, enabled by pointing an environment
  variable at a client data directory, asserting invariants rather than fixed
  values: every registered table opens, decoded row counts stay within records
  plus copies, names are populated, small enumerations stay in range, and
  cross-table references resolve.

Invariant checks belong in the second layer precisely because they hold for any
client build, including modified files. Values observed from one build are
evidence during development, not test fixtures.

Compilation proves nothing about a binary decoder. Both layers must pass.

## Reporting

Per-table load status is part of the contract with the user: whether the file
was found, whether it loaded, how many records it produced, and the specific
reason when it did not. A table that failed to load must never be indistinguishable
from a table that is legitimately empty.

## Last verified

Against the HavenCore BFA DB2 loader and the BFA 8.3.7.35662 client data set.
