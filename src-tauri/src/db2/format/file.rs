//! Structural parse of a WDC3 container.
//!
//! Reads everything that precedes the section payloads: header, section
//! headers, field entries, column metadata and the pallet / common blocks.
//! No table metadata is required at this stage, so any WDC3 file can be
//! inspected structurally even when Lyra carries no definition for it.

use std::collections::HashMap;
use std::path::Path;

use crate::db2::format::error::{Db2Error, Db2Result};
use crate::db2::format::header::{
    Db2ColumnMeta, Db2FieldEntry, Db2Header, Db2SectionHeader, Db2Storage, DB2_COLUMN_META_SIZE,
    DB2_COMMON_VALUE_SIZE,
};
use crate::db2::format::reader::ByteReader;

/// A WDC3 file held in memory together with its parsed structural metadata.
pub struct Db2File {
    bytes: Vec<u8>,
    pub header: Db2Header,
    pub sections: Vec<Db2SectionHeader>,
    pub field_entries: Vec<Db2FieldEntry>,
    pub columns: Vec<Db2ColumnMeta>,
    /// Pallet values per column; empty for columns that use another mode.
    pub pallet_values: Vec<Vec<u32>>,
    /// Pallet-array values per column, laid out as `index * array_size + element`.
    pub pallet_array_values: Vec<Vec<u32>>,
    /// Per-column `record id -> value` overrides for common-data columns.
    pub common_values: Vec<HashMap<u32, u32>>,
}

impl std::fmt::Debug for Db2File {
    /// Summarises the container rather than dumping its bytes.
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Db2File")
            .field(
                "layout_hash",
                &format_args!("0x{:08X}", self.header.layout_hash),
            )
            .field("records", &self.header.record_count)
            .field("fields", &self.header.field_count)
            .field("sections", &self.header.section_count)
            .field("sparse", &self.header.is_sparse())
            .field("bytes", &self.bytes.len())
            .finish()
    }
}

impl Db2File {
    /// Reads and structurally parses a DB2 file from disk.
    pub fn open(path: &Path) -> Db2Result<Self> {
        let bytes = std::fs::read(path).map_err(|source| {
            let path = path.to_string_lossy().into_owned();
            if source.kind() == std::io::ErrorKind::NotFound {
                Db2Error::FileNotFound { path, source }
            } else {
                Db2Error::Io { path, source }
            }
        })?;
        Self::parse(bytes)
    }

    pub fn parse(bytes: Vec<u8>) -> Db2Result<Self> {
        let (
            header,
            sections,
            field_entries,
            columns,
            pallet_values,
            pallet_array_values,
            common_values,
        ) = {
            let mut reader = ByteReader::new(&bytes);
            let header = Db2Header::read(&mut reader)?;

            reader.enter("section headers");
            let mut sections = Vec::with_capacity(header.section_count as usize);
            for _ in 0..header.section_count {
                sections.push(Db2SectionHeader::read(&mut reader)?);
            }

            reader.enter("field entries");
            let mut field_entries = Vec::with_capacity(header.field_count as usize);
            for _ in 0..header.field_count {
                field_entries.push(Db2FieldEntry::read(&mut reader)?);
            }

            reader.enter("column meta");
            let total_fields = header.total_field_count as usize;
            let mut columns = Vec::new();
            if header.column_meta_size > 0 {
                let declared = header.column_meta_size as usize;
                let expected = total_fields * DB2_COLUMN_META_SIZE;
                if declared != expected {
                    return Err(Db2Error::Truncated {
                        stage: "column meta",
                        offset: reader.position(),
                        needed: expected,
                        available: declared,
                    });
                }
                columns.reserve(total_fields);
                for field in 0..total_fields {
                    columns.push(Db2ColumnMeta::read(&mut reader, field)?);
                }
            }

            let block_start = reader.position();

            reader.enter("pallet data");
            let mut pallet_values = vec![Vec::new(); total_fields];
            for (field, column) in columns.iter().enumerate() {
                if matches!(column.storage, Db2Storage::Pallet { .. }) {
                    pallet_values[field] =
                        reader.u32_vec(column.additional_data_size as usize / 4)?;
                }
            }

            reader.enter("pallet array data");
            let mut pallet_array_values = vec![Vec::new(); total_fields];
            for (field, column) in columns.iter().enumerate() {
                if matches!(column.storage, Db2Storage::PalletArray { .. }) {
                    pallet_array_values[field] =
                        reader.u32_vec(column.additional_data_size as usize / 4)?;
                }
            }

            let pallet_bytes = reader.position() - block_start;
            if pallet_bytes != header.pallet_data_size as usize {
                return Err(Db2Error::Truncated {
                    stage: "pallet data",
                    offset: block_start,
                    needed: header.pallet_data_size as usize,
                    available: pallet_bytes,
                });
            }

            reader.enter("common data");
            let common_start = reader.position();
            let mut common_values = vec![HashMap::new(); total_fields];
            for (field, column) in columns.iter().enumerate() {
                if !matches!(column.storage, Db2Storage::CommonData { .. })
                    || column.additional_data_size == 0
                {
                    continue;
                }
                let count = column.additional_data_size as usize / DB2_COMMON_VALUE_SIZE;
                let mut entries = HashMap::with_capacity(count);
                for _ in 0..count {
                    let record_id = reader.u32()?;
                    let value = reader.u32()?;
                    entries.insert(record_id, value);
                }
                common_values[field] = entries;
            }

            let common_bytes = reader.position() - common_start;
            if common_bytes != header.common_data_size as usize {
                return Err(Db2Error::Truncated {
                    stage: "common data",
                    offset: common_start,
                    needed: header.common_data_size as usize,
                    available: common_bytes,
                });
            }

            (
                header,
                sections,
                field_entries,
                columns,
                pallet_values,
                pallet_array_values,
                common_values,
            )
        };

        Ok(Self {
            bytes,
            header,
            sections,
            field_entries,
            columns,
            pallet_values,
            pallet_array_values,
            common_values,
        })
    }

    pub fn bytes(&self) -> &[u8] {
        &self.bytes
    }

    /// A reader positioned at the start of the file.
    pub fn reader(&self) -> ByteReader<'_> {
        ByteReader::new(&self.bytes)
    }

    /// Number of sections that are encrypted and therefore undecodable.
    pub fn encrypted_section_count(&self) -> usize {
        self.sections.iter().filter(|s| s.is_encrypted()).count()
    }

    /// Storage mode of a column, defaulting to uncompressed when the file
    /// carries no column metadata.
    pub fn storage(&self, field: usize) -> Db2Storage {
        self.columns
            .get(field)
            .map(|column| column.storage)
            .unwrap_or(Db2Storage::None)
    }
}
