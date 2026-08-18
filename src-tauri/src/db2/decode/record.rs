//! Typed access to a single decoded record.
//!
//! One value pipeline serves both storage layouts: resolve the physical bits
//! for a column and array element, truncate them to the column's declared
//! width, then reinterpret as signed when the column says so. This mirrors
//! HavenCore's `RecordGetVarInt<T>`, where `T` comes from the load info and
//! `memcpy` of `min(sizeof(T), …)` bytes performs the truncation.

use crate::db2::decode::sparse::{field_offsets, stored_int_size};
use crate::db2::decode::table::{Db2Table, TableBody};
use crate::db2::format::bits::{packed_value, read_uint_le, sign_extend, truncate_to_width};
use crate::db2::format::error::{Db2Error, Db2Result};
use crate::db2::format::Db2Storage;
use crate::db2::meta::{Db2FieldMeta, FieldType};

enum Payload<'a> {
    Regular,
    Sparse {
        raw: &'a [u8],
        /// Byte offset of every scalar value, arrays expanded.
        offsets: Vec<usize>,
    },
}

pub struct Record<'a> {
    table: &'a Db2Table,
    index: u32,
    id: u32,
    payload: Payload<'a>,
}

impl<'a> Record<'a> {
    pub(crate) fn new(table: &'a Db2Table, index: u32) -> Db2Result<Self> {
        let payload = match &table.body {
            TableBody::Regular(_) => Payload::Regular,
            TableBody::Sparse(body) => {
                let raw = body
                    .record(table.file.bytes(), index)?
                    .ok_or(Db2Error::Truncated {
                        stage: "sparse record",
                        offset: 0,
                        needed: 0,
                        available: 0,
                    })?;
                let mut offsets = Vec::with_capacity(table.meta.value_count());
                field_offsets(
                    table.meta,
                    &table.file.field_entries,
                    raw,
                    &table.value_start,
                    &mut offsets,
                )?;
                Payload::Sparse { raw, offsets }
            }
        };

        let mut record = Self {
            table,
            index,
            id: 0,
            payload,
        };
        record.id = record.resolve_id()?;
        Ok(record)
    }

    fn resolve_id(&self) -> Db2Result<u32> {
        if self.table.meta.has_index_in_data() {
            return self.u32(self.table.meta.index_field_index(), 0);
        }
        self.table
            .table_id(self.index)
            .ok_or(Db2Error::FieldOutOfRange {
                field: self.index as usize,
                count: self.table.record_count() as usize,
            })
    }

    pub fn id(&self) -> u32 {
        self.id
    }

    /// Global record index inside the file.
    pub fn index(&self) -> u32 {
        self.index
    }

    // ---- typed accessors -------------------------------------------------

    pub fn u64(&self, field: usize, array_index: usize) -> Db2Result<u64> {
        self.value(field, array_index)
    }

    pub fn i64(&self, field: usize, array_index: usize) -> Db2Result<i64> {
        let column = self.column(field)?;
        let raw = self.value(field, array_index)?;
        Ok(sign_extend(raw, (column.ty.byte_width() * 8) as u32) as i64)
    }

    pub fn u32(&self, field: usize, array_index: usize) -> Db2Result<u32> {
        self.value(field, array_index).map(|value| value as u32)
    }

    pub fn i32(&self, field: usize, array_index: usize) -> Db2Result<i32> {
        self.i64(field, array_index).map(|value| value as i32)
    }

    pub fn u16(&self, field: usize, array_index: usize) -> Db2Result<u16> {
        self.value(field, array_index).map(|value| value as u16)
    }

    pub fn i16(&self, field: usize, array_index: usize) -> Db2Result<i16> {
        self.i64(field, array_index).map(|value| value as i16)
    }

    pub fn u8(&self, field: usize, array_index: usize) -> Db2Result<u8> {
        self.value(field, array_index).map(|value| value as u8)
    }

    pub fn i8(&self, field: usize, array_index: usize) -> Db2Result<i8> {
        self.i64(field, array_index).map(|value| value as i8)
    }

    pub fn f32(&self, field: usize, array_index: usize) -> Db2Result<f32> {
        self.value(field, array_index)
            .map(|value| f32::from_bits(value as u32))
    }

    /// Reads a string column. Invalid UTF-8 is replaced rather than rejected,
    /// because client text is otherwise valid and a single bad byte must not
    /// take the whole table down.
    pub fn string(&self, field: usize, array_index: usize) -> Db2Result<String> {
        let column = self.column(field)?;
        self.check_array_index(field, array_index, column)?;
        if !column.ty.is_string() {
            return Err(Db2Error::FieldOutOfRange {
                field,
                count: self.table.meta.field_count(),
            });
        }

        let bytes = match &self.payload {
            Payload::Regular => {
                let TableBody::Regular(body) = &self.table.body else {
                    unreachable!("regular payload requires a regular body")
                };
                // The stored value is an offset from the column's own position
                // inside the shared record + string buffer.
                let field_offset = self.regular_field_offset(field)? + 4 * array_index;
                let relative = self.value(field, array_index)? as usize;
                let absolute = body.record_offset(self.index) + field_offset + relative;
                body.string_at(field, absolute)?
            }
            Payload::Sparse { raw, offsets } => {
                let offset = self.sparse_offset(field, array_index, offsets)?;
                let tail = raw
                    .get(offset..)
                    .ok_or(Db2Error::UnterminatedString { field, offset })?;
                let end = tail
                    .iter()
                    .position(|byte| *byte == 0)
                    .ok_or(Db2Error::UnterminatedString { field, offset })?;
                &tail[..end]
            }
        };

        Ok(String::from_utf8_lossy(bytes).into_owned())
    }

    // ---- value pipeline --------------------------------------------------

    fn column(&self, field: usize) -> Db2Result<&'static Db2FieldMeta> {
        self.table
            .meta
            .field(field)
            .ok_or(Db2Error::FieldOutOfRange {
                field,
                count: self.table.meta.field_count(),
            })
    }

    fn check_array_index(
        &self,
        field: usize,
        array_index: usize,
        column: &Db2FieldMeta,
    ) -> Db2Result<()> {
        if array_index >= column.array_size as usize {
            return Err(Db2Error::ArrayIndexOutOfRange {
                field,
                index: array_index,
                size: column.array_size as usize,
            });
        }
        Ok(())
    }

    /// Physical value of one scalar, truncated to the column's declared width.
    fn value(&self, field: usize, array_index: usize) -> Db2Result<u64> {
        let column = self.column(field)?;
        self.check_array_index(field, array_index, column)?;

        // Columns filled from the parent lookup are not stored per record.
        if self.table.meta.is_parent_field(field) && self.table.file.header.parent_lookup_count > 0
        {
            return Ok(self.table.parents.get(&self.index).copied().unwrap_or(0) as u64);
        }

        // Columns that exist only in the loaded structure read as zero, the
        // same value HavenCore writes for them.
        if self.table.meta.is_appended_field(field) {
            return Ok(0);
        }

        let width = column.ty.byte_width();
        let raw = match &self.payload {
            Payload::Regular => self.regular_value(field, array_index, width)?,
            Payload::Sparse { raw, offsets } => {
                self.sparse_value(field, array_index, column, raw, offsets)?
            }
        };

        Ok(truncate_to_width(raw, width))
    }

    fn regular_field_offset(&self, field: usize) -> Db2Result<usize> {
        let packed_data_offset = self.table.file.header.packed_data_offset;
        self.table
            .file
            .columns
            .get(field)
            .and_then(|column| column.field_offset(packed_data_offset))
            .ok_or(Db2Error::FieldOutOfRange {
                field,
                count: self.table.file.columns.len(),
            })
    }

    fn regular_record(&self) -> Db2Result<&[u8]> {
        let TableBody::Regular(body) = &self.table.body else {
            unreachable!("regular payload requires a regular body")
        };
        body.record(self.index).ok_or(Db2Error::FieldOutOfRange {
            field: self.index as usize,
            count: body.record_count() as usize,
        })
    }

    fn regular_value(&self, field: usize, array_index: usize, width: usize) -> Db2Result<u64> {
        let storage = self.table.file.storage(field);

        if let Db2Storage::CommonData { default_value } = storage {
            let value = self
                .table
                .file
                .common_values
                .get(field)
                .and_then(|values| values.get(&self.id))
                .copied()
                .unwrap_or(default_value);
            return Ok(value as u64);
        }

        let record = self.regular_record()?;
        let field_offset = self.regular_field_offset(field)?;

        match storage {
            Db2Storage::None => {
                let offset = field_offset + width * array_index;
                let slice = record.get(offset..).unwrap_or(&[]);
                read_uint_le(slice, width).ok_or(Db2Error::FieldOutOfBounds {
                    field,
                    offset,
                    needed: width,
                    available: record.len().saturating_sub(offset.min(record.len())),
                })
            }
            Db2Storage::Immediate {
                bit_offset,
                bit_width,
            } => {
                let slice = self.packed_slice(record, field, field_offset)?;
                Ok(packed_value(slice, bit_width, bit_offset))
            }
            Db2Storage::SignedImmediate {
                bit_offset,
                bit_width,
            } => {
                let slice = self.packed_slice(record, field, field_offset)?;
                Ok(sign_extend(
                    packed_value(slice, bit_width, bit_offset),
                    bit_width,
                ))
            }
            Db2Storage::Pallet {
                bit_offset,
                bit_width,
            } => {
                let slice = self.packed_slice(record, field, field_offset)?;
                let pallet_index = packed_value(slice, bit_width, bit_offset) as usize;
                let values = self
                    .table
                    .file
                    .pallet_values
                    .get(field)
                    .map(Vec::as_slice)
                    .unwrap_or(&[]);
                values.get(pallet_index).map(|value| *value as u64).ok_or(
                    Db2Error::PalletIndexOutOfRange {
                        field,
                        index: pallet_index,
                        len: values.len(),
                    },
                )
            }
            Db2Storage::PalletArray {
                bit_offset,
                bit_width,
                array_size,
            } => {
                let slice = self.packed_slice(record, field, field_offset)?;
                let pallet_index = packed_value(slice, bit_width, bit_offset) as usize;
                let values = self
                    .table
                    .file
                    .pallet_array_values
                    .get(field)
                    .map(Vec::as_slice)
                    .unwrap_or(&[]);
                let slot = pallet_index * array_size as usize + array_index;
                values
                    .get(slot)
                    .map(|value| *value as u64)
                    .ok_or(Db2Error::PalletIndexOutOfRange {
                        field,
                        index: slot,
                        len: values.len(),
                    })
            }
            Db2Storage::CommonData { .. } => unreachable!("handled above"),
        }
    }

    /// Record bytes from a column's byte offset onward.
    ///
    /// Clamped to the record: a packed column's bits always lie inside its own
    /// record, so nothing is lost and neighbouring records are never read.
    fn packed_slice<'r>(
        &self,
        record: &'r [u8],
        field: usize,
        field_offset: usize,
    ) -> Db2Result<&'r [u8]> {
        record
            .get(field_offset..)
            .ok_or(Db2Error::FieldOutOfBounds {
                field,
                offset: field_offset,
                needed: 1,
                available: record.len(),
            })
    }

    fn sparse_offset(
        &self,
        field: usize,
        array_index: usize,
        offsets: &[usize],
    ) -> Db2Result<usize> {
        let slot = self.table.value_start[field] + array_index;
        offsets
            .get(slot)
            .copied()
            .ok_or(Db2Error::ArrayIndexOutOfRange {
                field,
                index: array_index,
                size: offsets.len(),
            })
    }

    fn sparse_value(
        &self,
        field: usize,
        array_index: usize,
        column: &Db2FieldMeta,
        raw: &[u8],
        offsets: &[usize],
    ) -> Db2Result<u64> {
        let offset = self.sparse_offset(field, array_index, offsets)?;

        // Only integer columns take their width from the field entry. Bytes,
        // shorts, longs and floats are read at their declared width, matching
        // the sparse accessors in HavenCore.
        let (width, sign_bits) = match column.ty {
            FieldType::Int => {
                let stored = stored_int_size(&self.table.file.field_entries, field).min(4);
                (stored, (stored * 8) as u32)
            }
            FieldType::Byte => (1, 8),
            FieldType::Short => (2, 16),
            FieldType::Long => (8, 64),
            FieldType::Float => (4, 32),
            FieldType::String | FieldType::StringNotLocalized => {
                return Err(Db2Error::FieldOutOfRange {
                    field,
                    count: self.table.meta.field_count(),
                })
            }
        };

        let slice = raw.get(offset..).unwrap_or(&[]);
        let value = read_uint_le(slice, width).ok_or(Db2Error::FieldOutOfBounds {
            field,
            offset,
            needed: width,
            available: raw.len().saturating_sub(offset.min(raw.len())),
        })?;

        if column.signed {
            Ok(sign_extend(value, sign_bits))
        } else {
            Ok(value)
        }
    }
}
