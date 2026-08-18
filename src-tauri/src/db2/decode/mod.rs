//! Metadata-aware decoding: turns a parsed container plus a table definition
//! into typed records.

pub mod record;
pub mod regular;
pub mod sparse;
pub mod table;

#[cfg(test)]
mod tests;

pub use record::Record;
pub use table::{Db2Table, Db2TableStats};
