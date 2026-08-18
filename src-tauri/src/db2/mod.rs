//! DB2 client data subsystem.
//!
//! Layered so that file-specific code never touches the binary format:
//!
//! - [`format`] parses the WDC3 container with no table knowledge.
//! - [`meta`] holds structural table definitions: column types, array sizes,
//!   signedness, layout hashes. Schema only, never record values.
//! - [`decode`] combines the two into typed records, handling every storage
//!   mode, sparse layouts, copy tables and parent lookups.
//! - [`mapping`] copies decoded records into Lyra's domain structures.
//! - [`catalog`] locates the client data and caches the decoded base.
//! - [`repository`] merges that base with the SQL hotfix overlay.

pub mod catalog;
pub mod decode;
pub mod format;
pub mod mapping;
pub mod meta;
pub mod repository;
pub mod structures;

pub use catalog::{Db2CatalogService, Db2Config, Db2TableStatus};
pub use decode::{Db2Table, Db2TableStats, Record};
pub use format::{Db2Error, Db2File, Db2Result, Db2Storage};
pub use meta::{Db2FieldMeta, Db2TableMeta, FieldType, SUPPORTED_TABLES};
pub use repository::{EffectiveCatalogStats, EffectiveItemRepository};
pub use structures::{EffectiveItem, ItemRecord, ItemSourceKind, ItemSparseRecord};
