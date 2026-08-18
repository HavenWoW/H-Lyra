//! Fixed-size record storage.
//!
//! Sections are concatenated into a single buffer laid out exactly as
//! HavenCore's regular loader builds it: every section's record block in order,
//! then every section's string table in order. String columns store an offset
//! relative to the column's own position inside that buffer, so the layout has
//! to match for strings to resolve.

use crate::db2::format::error::{Db2Error, Db2Result};

pub struct RegularBody {
    data: Vec<u8>,
    string_table_offset: usize,
    record_size: usize,
    record_count: u32,
}

/// Extra slack after the string table so a packed read at the very last record
/// never runs off the end of the allocation.
const TRAILING_SLACK: usize = 8;

impl RegularBody {
    pub fn new(record_size: usize, record_count: u32, string_table_size: usize) -> Self {
        let records_len = record_size.saturating_mul(record_count as usize);
        Self {
            data: vec![0u8; records_len + string_table_size + TRAILING_SLACK],
            string_table_offset: records_len,
            record_size,
            record_count,
        }
    }

    /// Copies one section's record block into the shared buffer.
    ///
    /// `record_offset` counts records, not bytes, and includes the space
    /// reserved for encrypted sections so that global record indices stay
    /// aligned with the id table.
    pub fn put_records(&mut self, record_offset: usize, bytes: &[u8]) -> Db2Result<()> {
        let start = record_offset.saturating_mul(self.record_size);
        self.put(start, bytes, "section records")
    }

    /// Copies one section's string table into the shared buffer.
    pub fn put_strings(&mut self, string_offset: usize, bytes: &[u8]) -> Db2Result<()> {
        let start = self.string_table_offset + string_offset;
        self.put(start, bytes, "section string table")
    }

    fn put(&mut self, start: usize, bytes: &[u8], stage: &'static str) -> Db2Result<()> {
        let end = start + bytes.len();
        if end > self.data.len() {
            return Err(Db2Error::Truncated {
                stage,
                offset: start,
                needed: bytes.len(),
                available: self.data.len().saturating_sub(start.min(self.data.len())),
            });
        }
        self.data[start..end].copy_from_slice(bytes);
        Ok(())
    }

    pub fn record_size(&self) -> usize {
        self.record_size
    }

    pub fn record_count(&self) -> u32 {
        self.record_count
    }

    /// Byte offset of a record inside the shared buffer.
    pub fn record_offset(&self, record_index: u32) -> usize {
        record_index as usize * self.record_size
    }

    /// The shared buffer, records followed by string tables.
    pub fn data(&self) -> &[u8] {
        &self.data
    }

    /// Bytes of one record, without the trailing buffer.
    pub fn record(&self, record_index: u32) -> Option<&[u8]> {
        if record_index >= self.record_count {
            return None;
        }
        let start = self.record_offset(record_index);
        self.data.get(start..start + self.record_size)
    }

    /// Bytes of a NUL terminated string at an absolute offset in the shared
    /// buffer, terminator excluded.
    pub fn string_at(&self, field: usize, offset: usize) -> Db2Result<&[u8]> {
        let tail = self
            .data
            .get(offset..)
            .ok_or(Db2Error::UnterminatedString { field, offset })?;
        let end = tail
            .iter()
            .position(|byte| *byte == 0)
            .ok_or(Db2Error::UnterminatedString { field, offset })?;
        Ok(&tail[..end])
    }
}
