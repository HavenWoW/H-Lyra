# DB2 and Hotfix Overlay

## Purpose

How client DB2 data and the server-side hotfix database combine into the values
the core actually uses, and what that means for an editor that has to show and
edit both.

## The two layers in HavenCore

A DB2 store is populated in two steps:

1. The client file is read by the DB2 file loader, producing the base rows.
2. The hotfix database is read by the DB2 database loader, whose rows are
   applied on top of the same store.

The hotfix tables mirror the DB2 column layout: one SQL column per scalar value,
with array columns expanded using a one-based suffix (`Flags1`, `ZoneBound2`,
`StatPercentEditor10`). Each table definition names the hotfix statement it
loads through, which is what ties a DB2 table to its SQL table.

A hotfix row therefore does one of two things:

- **Override** — the id already exists in the client file, and the SQL row
  replaces the whole record.
- **Addition** — the id does not exist in the client file, and the SQL row
  creates a record that has no client counterpart.

Overrides are whole-record, not per-column: the SQL row supplies every column.

## The three states an editor must keep apart

| State | Meaning |
| --- | --- |
| Base | The value in the client DB2 file |
| Override | The value in the hotfix database for the same id |
| Effective | What the core uses: the override when present, otherwise the base |

Collapsing these loses information the user needs. Whether a value came from the
client file or from a hotfix determines whether editing it is a change to server
data or the creation of a new override, and it is the only way to show a user
what a hotfix is actually changing.

Provenance must be decided by **presence in each layer**, never by id ranges.
Custom content is not confined to a numeric range, and client ids are not
guaranteed to stay below any threshold.

## Reading the base layer

The base layer is read from whichever client data directory the user configured.
Nothing about record values may be baked into the application: a user who edits
their own DB2 files, or points the editor at a different client build, must see
their own data. Only structural schema — column types, array sizes, signedness,
layout hashes, file ids — is fixed in the application, and a layout hash
mismatch means the definition does not describe the file and must be reported
rather than worked around.

## Allocating new ids

A new record must not collide with either layer. The next safe id is derived
from the union of the client id space and the hotfix id space, taking the
maximum across both. Using only the SQL maximum will collide with client rows,
and using only the client maximum will collide with existing hotfixes.

## Copy table rows are part of the base layer

Client files may duplicate records through a copy table, and those duplicates
are real ids with real data. An id that exists only as a copy is still a base
record, and a hotfix for it is an override rather than an addition.

## Lyra implementation implications

- Keep the base rows, the SQL rows and the resolved effective value all
  available, and label each effective record with where it came from.
- Merge whole records, matching how a hotfix row replaces a record.
- Derive provenance from presence in each layer.
- Reload the base layer whenever the configured data directory or locale
  changes, and report per-table load status so a table that failed to load is
  never silently treated as empty.

## Last verified

Against the HavenCore BFA DB2 file loader and DB2 database loader.
