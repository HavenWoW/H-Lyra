/**
 * BFA 8.3.7.35662 — Hotfix & DB2 Identity Constants
 *
 * There are two distinct 32-bit identifiers per table:
 *  - TABLE_HASH_*  : the `hotfix_data.TableHash` used by the client hotfix
 *                    pipeline to address a record in database tables.
 *  - LAYOUT_HASH_* : the physical DB2 file layout hash (e.g. `Item.db2` header),
 *                    used to validate that a client DB2 file matches the expected
 *                    binary structure.
 */

/** Layout hash for `Item.db2` (0x4517779D). */
export const LAYOUT_HASH_ITEM = 0x4517779d;

/** Layout hash for `ItemSparse.db2` (0xAC420B53). */
export const LAYOUT_HASH_ITEM_SPARSE = 0xac420b53;

/** `hotfix_data.TableHash` for the `item` table. */
export const TABLE_HASH_ITEM = 1344507586;

/** `hotfix_data.TableHash` for the `item_sparse` table. */
export const TABLE_HASH_ITEM_SPARSE = 2442913102;

/** `hotfix_data.TableHash` for the `item_effect` table. */
export const TABLE_HASH_ITEM_EFFECT = 1109793673;

/** Default `VerifiedBuild` for custom user-authored hotfix rows. */
export const DEFAULT_VERIFIED_BUILD = 0;