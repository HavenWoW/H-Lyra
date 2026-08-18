//! Binary layer: WDC3 container parsing with no table-specific knowledge.

pub mod bits;
pub mod error;
pub mod file;
pub mod header;
pub mod reader;

pub use error::{Db2Error, Db2Result};
pub use file::Db2File;
pub use header::{
    Db2ColumnMeta, Db2FieldEntry, Db2Header, Db2RecordCopy, Db2SectionHeader, Db2Storage,
    DB2_FLAG_SPARSE, WDC3_SIGNATURE,
};
