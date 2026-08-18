//! Offset-map (sparse) record storage.
//!
//! Sparse files hold variable length records addressed by an offset map.
//! Column metadata is not used at all for them: HavenCore's sparse loader walks
//! each record field by field, taking integer widths from the file's field
//! entries, four bytes for floats, and `strlen + 1` for inline strings.

use crate::db2::format::error::{Db2Error, Db2Result};
use crate::db2::format::header::Db2FieldEntry;
use crate::db2::meta::{Db2TableMeta, FieldType};

/// One offset-map entry: where a record lives and how long it is.
#[derive(Debug, Clone, Copy)]
pub struct CatalogEntry {
    pub file_offset: u32,
    pub record_size: u16,
}

impl CatalogEntry {
    /// Placeholder for a record inside an encrypted section.
    pub const UNAVAILABLE: Self = Self {
        file_offset: 0,
        record_size: 0,
    };

    pub fn is_available(&self) -> bool {
        self.file_offset != 0 && self.record_size != 0
    }
}

pub struct SparseBody {
    catalog: Vec<CatalogEntry>,
}

impl SparseBody {
    pub fn new() -> Self {
        Self {
            catalog: Vec::new(),
        }
    }

    pub fn push(&mut self, entry: CatalogEntry) {
        self.catalog.push(entry);
    }

    pub fn record_count(&self) -> u32 {
        self.catalog.len() as u32
    }

    pub fn entry(&self, record_index: u32) -> Option<CatalogEntry> {
        self.catalog.get(record_index as usize).copied()
    }

    /// Raw bytes of one record, taken from the whole-file buffer.
    pub fn record<'a>(
        &self,
        file_bytes: &'a [u8],
        record_index: u32,
    ) -> Db2Result<Option<&'a [u8]>> {
        let Some(entry) = self.entry(record_index) else {
            return Ok(None);
        };
        if !entry.is_available() {
            return Ok(None);
        }
        let start = entry.file_offset as usize;
        let end = start + entry.record_size as usize;
        file_bytes
            .get(start..end)
            .map(Some)
            .ok_or(Db2Error::Truncated {
                stage: "sparse record",
                offset: start,
                needed: entry.record_size as usize,
                available: file_bytes.len().saturating_sub(start.min(file_bytes.len())),
            })
    }
}

/// Stored width of a sparse integer column, from the file's field entry.
///
/// `4 - unused_bits / 8` with truncation toward zero, so a negative
/// `unused_bits` widens the column past four bytes.
pub fn stored_int_size(entries: &[Db2FieldEntry], field: usize) -> usize {
    entries
        .get(field)
        .map(Db2FieldEntry::stored_size)
        .unwrap_or(4)
}

/// Walks one sparse record and records the byte offset of every scalar value.
///
/// `value_start[field]` gives the slot of a column's first element inside the
/// returned vector; element `n` of that column sits at `value_start[field] + n`.
pub fn field_offsets(
    meta: &Db2TableMeta,
    entries: &[Db2FieldEntry],
    raw: &[u8],
    value_start: &[usize],
    out: &mut Vec<usize>,
) -> Db2Result<()> {
    out.clear();
    let mut offset = 0usize;
    let file_fields = (meta.file_field_count as usize).min(meta.field_count());

    for (field, column) in meta.fields.iter().enumerate().take(file_fields) {
        debug_assert_eq!(out.len(), value_start[field]);
        for _ in 0..column.array_size {
            out.push(offset);
            let width = match column.ty {
                FieldType::Byte | FieldType::Short | FieldType::Int | FieldType::Long => {
                    stored_int_size(entries, field)
                }
                FieldType::Float => 4,
                FieldType::String | FieldType::StringNotLocalized => {
                    let tail = raw
                        .get(offset..)
                        .ok_or(Db2Error::UnterminatedString { field, offset })?;
                    tail.iter()
                        .position(|byte| *byte == 0)
                        .ok_or(Db2Error::UnterminatedString { field, offset })?
                        + 1
                }
            };
            offset += width;
            if offset > raw.len() {
                return Err(Db2Error::FieldOutOfBounds {
                    field,
                    offset: offset - width,
                    needed: width,
                    available: raw.len(),
                });
            }
        }
    }

    Ok(())
}

impl Default for SparseBody {
    fn default() -> Self {
        Self::new()
    }
}
