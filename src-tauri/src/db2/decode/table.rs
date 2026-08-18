//! Metadata-aware table loading.
//!
//! Ties a parsed WDC3 container to a structural table definition and exposes
//! decoded records. Section walking, id resolution, copy-table expansion,
//! parent lookups and encrypted-section handling all follow HavenCore's
//! `DB2FileLoader::Load` and the two loader implementations behind it.

use std::collections::HashMap;
use std::path::Path;

use crate::db2::decode::record::Record;
use crate::db2::decode::regular::RegularBody;
use crate::db2::decode::sparse::{CatalogEntry, SparseBody};
use crate::db2::format::error::{Db2Error, Db2Result};
use crate::db2::format::header::{Db2RecordCopy, DB2_CATALOG_ENTRY_SIZE};
use crate::db2::format::Db2File;
use crate::db2::meta::{locale_index, Db2TableMeta};

pub(crate) enum TableBody {
    Regular(RegularBody),
    Sparse(SparseBody),
}

/// Summary of what a table load produced, for status reporting.
#[derive(Debug, Clone, Copy, Default)]
pub struct Db2TableStats {
    /// Records addressable in the file, including any that are encrypted.
    pub record_count: u32,
    /// Records that could actually be decoded.
    pub decoded_records: u32,
    /// Duplicate rows produced from the copy table.
    pub copy_records: u32,
    pub encrypted_sections: usize,
    /// Records skipped because their section is encrypted.
    pub encrypted_records: u32,
}

pub struct Db2Table {
    pub(crate) file: Db2File,
    pub(crate) meta: &'static Db2TableMeta,
    pub(crate) body: TableBody,
    /// Whether each global record index lives in a decodable section.
    available: Vec<bool>,
    /// Record ids, populated only when the table's id is not stored in the data.
    id_table: Vec<u32>,
    copies: Vec<Db2RecordCopy>,
    /// Global record index to the parent id supplied by the parent lookup.
    pub(crate) parents: HashMap<u32, u32>,
    /// Slot of each column's first scalar value, arrays expanded.
    pub(crate) value_start: Vec<usize>,
    encrypted_sections: usize,
    encrypted_records: u32,
}

impl std::fmt::Debug for Db2Table {
    /// Summarises the table rather than dumping its record buffer.
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Db2Table")
            .field("table", &self.meta.name)
            .field("records", &self.record_count())
            .field("copies", &self.copies.len())
            .field("encrypted_sections", &self.encrypted_sections)
            .finish()
    }
}

impl Db2Table {
    /// Opens a client file and binds it to a table definition.
    ///
    /// `locale` names the client locale directory the file came from; it is
    /// validated against the file's locale mask for tables that carry localized
    /// strings.
    pub fn open(path: &Path, meta: &'static Db2TableMeta, locale: &str) -> Db2Result<Self> {
        Self::from_file(Db2File::open(path)?, meta, locale)
    }

    pub fn from_file(file: Db2File, meta: &'static Db2TableMeta, locale: &str) -> Db2Result<Self> {
        validate(&file, meta, locale)?;

        let value_start = build_value_start(meta);
        let mut table = if file.header.is_sparse() {
            Self::load_sparse(file, meta, value_start)?
        } else {
            Self::load_regular(file, meta, value_start)?
        };
        table.encrypted_sections = table.file.encrypted_section_count();
        Ok(table)
    }

    fn load_regular(
        file: Db2File,
        meta: &'static Db2TableMeta,
        value_start: Vec<usize>,
    ) -> Db2Result<Self> {
        let header = file.header.clone();
        let record_size = header.record_size as usize;
        let mut body = RegularBody::new(
            record_size,
            header.record_count,
            header.string_table_size as usize,
        );
        let mut available = vec![false; header.record_count as usize];
        let mut id_table: Vec<u32> = Vec::new();
        let mut copies: Vec<Db2RecordCopy> = Vec::new();
        let mut parents: HashMap<u32, u32> = HashMap::new();
        let mut encrypted_records = 0u32;

        {
            let mut reader = file.reader();
            let mut record_base = 0usize;
            let mut string_base = 0usize;

            for (index, section) in file.sections.iter().enumerate() {
                if section.is_encrypted() {
                    // The records stay unavailable but still occupy their slots
                    // so that global record indices line up with the id table.
                    id_table.resize(id_table.len() + section.id_table_size as usize / 4, 0);
                    record_base += section.record_count as usize;
                    string_base += section.string_table_size as usize;
                    encrypted_records += section.record_count;
                    continue;
                }

                reader.seek(section.file_offset as usize)?;

                reader.enter("section records");
                let record_bytes = reader.take(record_size * section.record_count as usize)?;
                body.put_records(record_base, record_bytes)?;

                reader.enter("section string table");
                let string_bytes = reader.take(section.string_table_size as usize)?;
                body.put_strings(string_base, string_bytes)?;

                reader.enter("id table");
                if section.id_table_size > 0 {
                    if meta.has_index_in_data() {
                        return Err(Db2Error::IdTableMismatch {
                            table: meta.name,
                            section: index,
                            id_table_size: section.id_table_size,
                            record_count: section.record_count,
                        });
                    }
                    if section.id_table_size != 4 * section.record_count {
                        return Err(Db2Error::IdTableMismatch {
                            table: meta.name,
                            section: index,
                            id_table_size: section.id_table_size,
                            record_count: section.record_count,
                        });
                    }
                    id_table.extend(reader.u32_vec(section.record_count as usize)?);
                } else if !meta.has_index_in_data() && section.record_count > 0 {
                    return Err(Db2Error::IdTableMismatch {
                        table: meta.name,
                        section: index,
                        id_table_size: section.id_table_size,
                        record_count: section.record_count,
                    });
                }

                reader.enter("copy table");
                for _ in 0..section.copy_table_count {
                    copies.push(Db2RecordCopy {
                        new_row_id: reader.u32()?,
                        source_row_id: reader.u32()?,
                    });
                }

                read_parent_lookup(
                    &mut reader,
                    header.parent_lookup_count,
                    record_base as u32,
                    &mut parents,
                )?;

                for slot in available
                    .iter_mut()
                    .skip(record_base)
                    .take(section.record_count as usize)
                {
                    *slot = true;
                }

                record_base += section.record_count as usize;
                string_base += section.string_table_size as usize;
            }
        }

        Ok(Self {
            file,
            meta,
            body: TableBody::Regular(body),
            available,
            id_table,
            copies,
            parents,
            value_start,
            encrypted_sections: 0,
            encrypted_records,
        })
    }

    fn load_sparse(
        file: Db2File,
        meta: &'static Db2TableMeta,
        value_start: Vec<usize>,
    ) -> Db2Result<Self> {
        let header = file.header.clone();
        let mut body = SparseBody::new();
        let mut available: Vec<bool> = Vec::new();
        let mut id_table: Vec<u32> = Vec::new();
        let mut copies: Vec<Db2RecordCopy> = Vec::new();
        let mut parents: HashMap<u32, u32> = HashMap::new();
        let mut encrypted_records = 0u32;

        {
            let mut reader = file.reader();
            let mut record_base = 0u32;

            for section in file.sections.iter() {
                let count = section.catalog_data_count as usize;

                if section.is_encrypted() {
                    for _ in 0..count {
                        body.push(CatalogEntry::UNAVAILABLE);
                        available.push(false);
                        id_table.push(0);
                    }
                    encrypted_records += section.catalog_data_count;
                    record_base += section.catalog_data_count;
                    continue;
                }

                reader.seek(section.catalog_data_offset as usize)?;

                reader.enter("offset map id list");
                id_table.extend(reader.u32_vec(count)?);

                reader.enter("copy table");
                for _ in 0..section.copy_table_count {
                    copies.push(Db2RecordCopy {
                        new_row_id: reader.u32()?,
                        source_row_id: reader.u32()?,
                    });
                }

                reader.enter("offset map");
                let entries = reader.take(count * DB2_CATALOG_ENTRY_SIZE)?;
                for chunk in entries.chunks_exact(DB2_CATALOG_ENTRY_SIZE) {
                    let entry = CatalogEntry {
                        file_offset: u32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]),
                        record_size: u16::from_le_bytes([chunk[4], chunk[5]]),
                    };
                    available.push(entry.is_available());
                    body.push(entry);
                }

                // A second copy of the id list follows the offset map. The
                // sparse loader keys records by the first list, but the bytes
                // still have to be consumed to reach the parent lookup.
                reader.enter("trailing id table");
                reader.skip(section.id_table_size as usize)?;

                read_parent_lookup(
                    &mut reader,
                    header.parent_lookup_count,
                    record_base,
                    &mut parents,
                )?;

                record_base += section.catalog_data_count;
            }
        }

        Ok(Self {
            file,
            meta,
            body: TableBody::Sparse(body),
            available,
            id_table,
            copies,
            parents,
            value_start,
            encrypted_sections: 0,
            encrypted_records,
        })
    }

    pub fn meta(&self) -> &'static Db2TableMeta {
        self.meta
    }

    pub fn header_locale_mask(&self) -> u32 {
        self.file.header.locale
    }

    /// Total number of addressable records, encrypted ones included.
    pub fn record_count(&self) -> u32 {
        match &self.body {
            TableBody::Regular(body) => body.record_count(),
            TableBody::Sparse(body) => body.record_count(),
        }
    }

    pub fn copy_records(&self) -> &[Db2RecordCopy] {
        &self.copies
    }

    pub fn encrypted_sections(&self) -> usize {
        self.encrypted_sections
    }

    pub fn encrypted_records(&self) -> u32 {
        self.encrypted_records
    }

    /// Id from the id table or the sparse id list, when the table stores ids
    /// outside the record data.
    pub(crate) fn table_id(&self, record_index: u32) -> Option<u32> {
        self.id_table.get(record_index as usize).copied()
    }

    /// Reads one record, or `None` when it sits in an encrypted section.
    pub fn record(&self, record_index: u32) -> Db2Result<Option<Record<'_>>> {
        if !self
            .available
            .get(record_index as usize)
            .copied()
            .unwrap_or(false)
        {
            return Ok(None);
        }
        Record::new(self, record_index).map(Some)
    }

    /// Decodes every record into a keyed map and applies the copy table.
    ///
    /// `map` receives the id to use, so copy rows are produced by re-mapping
    /// their source record under the new id — the same result as HavenCore's
    /// copy of the produced record with a rewritten id field.
    pub fn decode_all<T, F>(&self, mut map: F) -> Db2Result<HashMap<u32, T>>
    where
        F: FnMut(u32, &Record<'_>) -> Db2Result<T>,
    {
        let mut rows = HashMap::new();
        let mut index_by_id: HashMap<u32, u32> = HashMap::new();

        for index in 0..self.record_count() {
            let Some(record) = self.record(index)? else {
                continue;
            };
            let id = record.id();
            index_by_id.insert(id, index);
            rows.insert(id, map(id, &record)?);
        }

        for copy in &self.copies {
            if copy.source_row_id == 0 {
                continue;
            }
            let Some(&index) = index_by_id.get(&copy.source_row_id) else {
                continue;
            };
            let Some(record) = self.record(index)? else {
                continue;
            };
            rows.insert(copy.new_row_id, map(copy.new_row_id, &record)?);
        }

        Ok(rows)
    }

    /// Load statistics for the given decoded row count.
    pub fn stats(&self, decoded_records: u32) -> Db2TableStats {
        Db2TableStats {
            record_count: self.record_count(),
            decoded_records,
            copy_records: self.copies.len() as u32,
            encrypted_sections: self.encrypted_sections,
            encrypted_records: self.encrypted_records,
        }
    }
}

/// Reads the parent lookup blocks that follow a section's tables.
///
/// Record indices are relative to the section, so `record_base` shifts them
/// into the global record numbering.
fn read_parent_lookup(
    reader: &mut crate::db2::format::reader::ByteReader<'_>,
    parent_lookup_count: u32,
    record_base: u32,
    parents: &mut HashMap<u32, u32>,
) -> Db2Result<()> {
    if parent_lookup_count == 0 {
        return Ok(());
    }
    reader.enter("parent lookup");
    for lookup in 0..parent_lookup_count {
        let num_entries = reader.u32()?;
        let _min_id = reader.u32()?;
        let _max_id = reader.u32()?;
        if num_entries == 0 {
            continue;
        }
        let entries = reader.take(num_entries as usize * 8)?;
        // Only the first lookup feeds the parent column, matching HavenCore.
        if lookup != 0 {
            continue;
        }
        for chunk in entries.chunks_exact(8) {
            let parent_id = u32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]);
            let record_index = u32::from_le_bytes([chunk[4], chunk[5], chunk[6], chunk[7]]);
            parents.insert(record_base + record_index, parent_id);
        }
    }
    Ok(())
}

/// Validates the file against the table definition before any record is read.
fn validate(file: &Db2File, meta: &'static Db2TableMeta, locale: &str) -> Db2Result<()> {
    let header = &file.header;

    if header.layout_hash != meta.layout_hash {
        return Err(Db2Error::LayoutHashMismatch {
            table: meta.name,
            expected: meta.layout_hash,
            actual: header.layout_hash,
        });
    }

    if header.parent_lookup_count > 1 {
        return Err(Db2Error::UnsupportedParentLookupCount {
            table: meta.name,
            count: header.parent_lookup_count,
        });
    }

    if header.parent_lookup_count > 0 && meta.parent_index_field < 0 {
        return Err(Db2Error::ParentLookupMismatch {
            table: meta.name,
            reason: "file carries a parent lookup but the table declares no parent column",
        });
    }

    let appended = i32::from(meta.parent_index_field >= header.total_field_count as i32);
    let expected_fields = header.total_field_count as i32 + appended;
    if expected_fields != meta.field_count() as i32 {
        return Err(Db2Error::FieldCountMismatch {
            table: meta.name,
            expected: meta.field_count() as u32,
            actual: header.total_field_count,
        });
    }

    // A file without column metadata stores every column uncompressed. That is
    // only decodable when the record layout is fixed; a sparse file always
    // carries field entries instead, which are read unconditionally.
    if !header.is_sparse() && header.column_meta_size == 0 && header.total_field_count > 0 {
        return Err(Db2Error::MissingColumnMeta { table: meta.name });
    }

    if meta.has_localized_strings() {
        match locale_index(locale) {
            Some(index) if header.has_locale(index) => {}
            _ => {
                return Err(Db2Error::LocaleUnavailable {
                    table: meta.name,
                    requested: locale.to_string(),
                    mask: header.locale,
                })
            }
        }
    }

    Ok(())
}

/// Cumulative scalar-slot index of each column, arrays expanded.
fn build_value_start(meta: &Db2TableMeta) -> Vec<usize> {
    let mut starts = Vec::with_capacity(meta.field_count() + 1);
    let mut total = 0usize;
    for field in meta.fields {
        starts.push(total);
        total += field.array_size as usize;
    }
    starts.push(total);
    starts
}
