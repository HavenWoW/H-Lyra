//! Structured DB2 errors.
//!
//! Every failure mode is explicit so the UI can distinguish a missing file from
//! an unreadable one, and so an unsupported layout is reported instead of
//! silently decoding zeros.

use std::fmt;
use std::io;

/// A DB2 load or decode failure.
#[derive(Debug)]
pub enum Db2Error {
    /// The requested file does not exist.
    FileNotFound { path: String, source: io::Error },
    /// The file exists but could not be read.
    Io { path: String, source: io::Error },
    /// The file is not a supported DB2 container.
    UnsupportedSignature { signature: u32 },
    /// A structural block extends past the end of the file.
    Truncated {
        stage: &'static str,
        offset: usize,
        needed: usize,
        available: usize,
    },
    /// The file's layout hash does not match the metadata this build knows.
    LayoutHashMismatch {
        table: &'static str,
        expected: u32,
        actual: u32,
    },
    /// The file declares a different number of columns than the metadata.
    FieldCountMismatch {
        table: &'static str,
        expected: u32,
        actual: u32,
    },
    /// More parent lookups than the format permits.
    UnsupportedParentLookupCount { table: &'static str, count: u32 },
    /// The metadata declares a parent field but the file carries no lookup, or
    /// the reverse.
    ParentLookupMismatch {
        table: &'static str,
        reason: &'static str,
    },
    /// A column declares a compression mode this build does not know.
    UnknownCompression { field: usize, raw: u32 },
    /// A compressed column requires column metadata the file does not carry.
    MissingColumnMeta { table: &'static str },
    /// A pallet index points outside the column's pallet block.
    PalletIndexOutOfRange {
        field: usize,
        index: usize,
        len: usize,
    },
    /// A field index is outside the table metadata.
    FieldOutOfRange { field: usize, count: usize },
    /// An array index is outside the field's declared array size.
    ArrayIndexOutOfRange {
        field: usize,
        index: usize,
        size: usize,
    },
    /// A field's bytes extend past the end of its record.
    FieldOutOfBounds {
        field: usize,
        offset: usize,
        needed: usize,
        available: usize,
    },
    /// A string field does not terminate inside the data it points into.
    UnterminatedString { field: usize, offset: usize },
    /// The file does not contain the locale that was requested.
    LocaleUnavailable {
        table: &'static str,
        requested: String,
        mask: u32,
    },
    /// The id table does not cover every record in a section.
    IdTableMismatch {
        table: &'static str,
        section: usize,
        id_table_size: u32,
        record_count: u32,
    },
}

impl Db2Error {
    /// True when the table simply is not present, which callers usually treat
    /// as "not configured" rather than as a parse failure.
    pub fn is_file_not_found(&self) -> bool {
        matches!(self, Db2Error::FileNotFound { .. })
    }
}

impl fmt::Display for Db2Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Db2Error::FileNotFound { path, source } => {
                write!(f, "file not found ({path}): {source}")
            }
            Db2Error::Io { path, source } => write!(f, "read failed ({path}): {source}"),
            Db2Error::UnsupportedSignature { signature } => write!(
                f,
                "unsupported container signature {} (0x{signature:08X}); expected WDC3",
                signature_label(*signature)
            ),
            Db2Error::Truncated {
                stage,
                offset,
                needed,
                available,
            } => write!(
                f,
                "truncated file while reading {stage}: need {needed} bytes at offset {offset}, {available} available"
            ),
            Db2Error::LayoutHashMismatch {
                table,
                expected,
                actual,
            } => write!(
                f,
                "{table}: layout hash mismatch (expected 0x{expected:08X}, file has 0x{actual:08X}); \
                 the client file uses a different schema than this build knows"
            ),
            Db2Error::FieldCountMismatch {
                table,
                expected,
                actual,
            } => write!(
                f,
                "{table}: column count mismatch (metadata declares {expected}, file has {actual})"
            ),
            Db2Error::UnsupportedParentLookupCount { table, count } => {
                write!(f, "{table}: unsupported parent lookup count {count} (at most 1 is valid)")
            }
            Db2Error::ParentLookupMismatch { table, reason } => {
                write!(f, "{table}: parent lookup mismatch ({reason})")
            }
            Db2Error::UnknownCompression { field, raw } => {
                write!(f, "column {field}: unknown compression type {raw}")
            }
            Db2Error::MissingColumnMeta { table } => {
                write!(f, "{table}: file carries no column metadata block")
            }
            Db2Error::PalletIndexOutOfRange { field, index, len } => write!(
                f,
                "column {field}: pallet index {index} outside pallet block of {len} values"
            ),
            Db2Error::FieldOutOfRange { field, count } => {
                write!(f, "field index {field} outside table metadata ({count} fields)")
            }
            Db2Error::ArrayIndexOutOfRange { field, index, size } => write!(
                f,
                "field {field}: array index {index} outside declared array size {size}"
            ),
            Db2Error::FieldOutOfBounds {
                field,
                offset,
                needed,
                available,
            } => write!(
                f,
                "field {field}: needs {needed} bytes at record offset {offset}, record holds {available}"
            ),
            Db2Error::UnterminatedString { field, offset } => {
                write!(f, "field {field}: unterminated string at offset {offset}")
            }
            Db2Error::LocaleUnavailable {
                table,
                requested,
                mask,
            } => write!(
                f,
                "{table}: file does not contain locale {requested} (locale mask 0x{mask:08X})"
            ),
            Db2Error::IdTableMismatch {
                table,
                section,
                id_table_size,
                record_count,
            } => write!(
                f,
                "{table}: section {section} id table is {id_table_size} bytes for {record_count} records"
            ),
        }
    }
}

impl std::error::Error for Db2Error {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Db2Error::FileNotFound { source, .. } | Db2Error::Io { source, .. } => Some(source),
            _ => None,
        }
    }
}

/// Renders a container signature as its four ASCII characters when printable.
fn signature_label(signature: u32) -> String {
    let bytes = signature.to_le_bytes();
    if bytes.iter().all(|b| b.is_ascii_graphic()) {
        String::from_utf8_lossy(&bytes).into_owned()
    } else {
        String::from("<binary>")
    }
}

pub type Db2Result<T> = Result<T, Db2Error>;
