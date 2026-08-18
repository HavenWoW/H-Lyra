# Lyra SQL Editor Requirements

## Purpose

Correctness rules every SQL-backed editor in Lyra has to satisfy. These are the
failure modes that produce a statement which runs cleanly and stores the wrong
thing, so none of them are caught by "does it execute".

## The editor is schema-driven

One module per table declares every column once: name, SQL type, signedness,
nullability, default, editor kind, and which card it belongs to. That module
drives the typed record, the new-record defaults, the card layout, the diff
generator and the full-query generator.

A hand-maintained column list inside a query generator will drift from the
table, and the drift is invisible until someone notices data disappearing. When
the column list has a single definition, adding a column makes it appear
everywhere at once.

## Full queries must be lossless

A full query is a DELETE followed by an INSERT. Every column the INSERT omits
silently reverts to its table default, so an incomplete column list is data loss
rather than a cosmetic gap.

The invariant: **a row loaded and saved without edits must produce an INSERT
whose values equal the loaded values, for every column.** This is worth an
explicit regression test, because it is the property that breaks quietly.

Columns the server core does not read still have to be written. They exist in
the table and a save that drops them destroys data the user may care about.

## NULL and the empty string are different values

Only an actual absence becomes `NULL`, and only on a nullable column. An empty
string stays `''`. Collapsing the two means a row loaded with `''` comes back as
`NULL` after an unchanged save, which breaks the losslessness rule above.

Because the two are distinct, the interface needs an explicit way to choose
between them on nullable columns, and the dirty-state comparison must treat
changing one into the other as a real edit.

## Escaping

Escape the backslash **first**, then quotes, then NUL, newline, carriage return
and Ctrl-Z. Escaping quotes first leaves the introduced backslashes unescaped
and terminates the literal early. A single trailing backslash in a name is
enough to break a statement that is otherwise valid.

Generated SQL is copied out and applied by hand as often as it is executed
in-app, so it has to be correct standing alone.

## Numbers

- **Locale independence.** Never format a number for SQL through a locale-aware
  path; a comma decimal separator produces a syntax error or a wrong value.
- **64-bit columns.** Keep exact integer strings exact. Values that fit the
  exact-integer range may be carried as numbers, but bit arithmetic on them must
  use 64-bit operations.
- **Signedness.** Model it per column. A signed column can legitimately hold a
  negative value that must survive a round trip.

## Bitmask editing preserves unknown bits

A stored bitmask may contain bits the application has no label for, because the
column is newer than the flag table or the data is custom. Rebuilding the value
purely from the labelled checkboxes clears those bits.

Compose the new value as `(original & ~knownMask) | selectedBits`, and surface
the preserved bits so the behaviour is visible rather than magic. Do not invent
`-1` as an "everything" value for an unsigned column; write the real mask.

### A bitmask editor needs the column's width and signedness

Composition must be parameterised by both, because they decide what an
"everything" selection actually is:

- **Width** is the column's storage width, not a convenient default. A 16-bit
  mask composed at 32 bits produces a value the column cannot hold.
- **Signedness** decides the emitted form. On a signed column the all-bits
  pattern is `-1` (two's complement); on an unsigned column it is the unsigned
  maximum. Emitting the unsigned form for a signed column overflows it, and a
  server in non-strict mode then clamps the value and corrupts the row instead
  of rejecting the write.

Take both from the schema rather than assuming. Where a column is signed, `-1`
is frequently the core's own "no restriction" sentinel and must round-trip
unchanged.

## Dirty tracking tolerates input drift

A value read from the database and the same value re-entered through a form
input differ in type. Compare through the column's formatter rather than with
strict equality, or the editor reports changes that do not exist.

## Execute re-reads the row

After a successful execute, re-read the row and adopt what the database actually
stored. The server may truncate a value to the column width or normalise it, and
an editor that marks its in-memory copy clean will show something that is not in
the database. Reload behaves the same way: discard local edits and re-read.

Report execute failures in the interface. Swallowing the error leaves the user
believing a save succeeded.

## Shared infrastructure

The query bar, the editor state machine (snapshot, dirty tracking, copy,
execute, execute-and-copy, reload) and the SQL value formatting are shared, not
copied per module. Duplicated copies drift, and a correctness fix then has to be
applied several times.

The table descriptor, the diff/full generators and the field renderers are
table-agnostic and live in shared modules. A per-table editor is a schema array
plus a small binding; the collection sub-tables (many rows per parent) share a
scoped DELETE + multi-row INSERT generator with the same escaping guarantees.

## Composite primary keys

A table's primary key can span several columns (`quest_poi` is keyed by
`QuestID`, `BlobIndex`, `Idx1`; `quest_greeting` by `ID`, `Type`). The diff and
full generators take the key as a list and build a `WHERE` that ANDs every key
column, so a single-column key stays exactly as before. A diff query is only
emitted once every key column carries a value.

## An untouched editor generates no statement

Diff mode must be empty until something actually changes. This is a data-safety
rule, not a cosmetic one: a collection tab is saved as a scoped
`DELETE` + `INSERT`, so a diff query that is always populated offers to rewrite
rows the user never edited, and on an empty collection it degrades to a bare
`DELETE` that would discard existing rows.

A collection has no cheaper diff than its replace statement, so the correct
shape is to emit that statement **only while the tab is dirty**:

```
activeQueryText = queryMode === 'diff' && !isDirty ? '' : buildReplace()
```

Single-row editors get this for free by returning an empty string when no
column changed. Either way, execute is a no-op when the statement is empty.

## Statements are routed by their target table

An editor knows which database it writes to, but a free-form SQL console has to
decide. Route on the tables in **table position** — the identifiers following
`FROM`, `INTO`, `UPDATE` and `JOIN`, with backticks and any `db.` qualifier
stripped — and never on tokens found anywhere in the text.

Matching loose tokens misroutes statements whose *column* names collide with
table names in another database: `creature_template` has a `faction` column, and
a token match sends a world-table statement to the hotfix database, where the
table does not exist. Keep a manual database override available and honour it
over any detection.

## Reserved-word columns are always quoted

Some real column names are SQL reserved words — `Order` in `quest_objectives`,
`Index` in `quest_visual_effect`, `rank` in `creature_template`. Every generated
column reference is backtick-quoted so these never terminate the statement. A
generator that quotes names unconditionally cannot forget one.

This applies to **read** queries as much as to writes. `RANK` became reserved in
MySQL 8.0, so `SELECT entry, name, rank FROM creature_template` is a syntax
error; a picker that swallows the failure and shows an empty list looks like "no
data" rather than a broken query. Quote identifiers in hand-written SELECTs too,
and surface the error rather than substituting an empty result.

## Last verified

Against the `creature_template`, `quest_template` and `gameobject_template`
editor rebuilds, and the item bitmask columns described in
[../Database/Item-Tables.md](../Database/Item-Tables.md).
