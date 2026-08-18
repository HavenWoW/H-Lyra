//! WDC3 container structures.
//!
//! Field names and sizes mirror `DB2Header`, `DB2SectionHeader`, `DB2FieldEntry`
//! and `DB2ColumnMeta` in `src/common/DataStores/DB2FileLoader.h` and
//! `DB2FileLoader.cpp`.

use crate::db2::format::error::{Db2Error, Db2Result};
use crate::db2::format::reader::ByteReader;

/// `WDC3`, the only container the targeted client build ships.
pub const WDC3_SIGNATURE: u32 = 0x3343_4457;

/// Set in `Db2Header::flags` when records live in an offset map instead of a
/// fixed-size record block.
pub const DB2_FLAG_SPARSE: u16 = 0x1;

pub const DB2_HEADER_SIZE: usize = 72;
pub const DB2_SECTION_HEADER_SIZE: usize = 40;
pub const DB2_FIELD_ENTRY_SIZE: usize = 4;
pub const DB2_COLUMN_META_SIZE: usize = 24;
pub const DB2_PALLET_VALUE_SIZE: usize = 4;
pub const DB2_COMMON_VALUE_SIZE: usize = 8;
pub const DB2_CATALOG_ENTRY_SIZE: usize = 6;
pub const DB2_RECORD_COPY_SIZE: usize = 8;
pub const DB2_INDEX_DATA_INFO_SIZE: usize = 12;
pub const DB2_INDEX_ENTRY_SIZE: usize = 8;

#[derive(Debug, Clone)]
pub struct Db2Header {
    pub signature: u32,
    pub record_count: u32,
    pub field_count: u32,
    pub record_size: u32,
    pub string_table_size: u32,
    pub table_hash: u32,
    pub layout_hash: u32,
    pub min_id: u32,
    pub max_id: u32,
    /// Bitmask of the locales the file carries, indexed by locale constant.
    pub locale: u32,
    pub flags: u16,
    /// Index of the in-data id column as recorded by the client. The
    /// authoritative value is the table metadata's index field; this one is
    /// informational.
    pub index_field: i16,
    pub total_field_count: u32,
    /// Byte offset inside a record at which the bit-packed block begins.
    pub packed_data_offset: u32,
    pub parent_lookup_count: u32,
    pub column_meta_size: u32,
    pub common_data_size: u32,
    pub pallet_data_size: u32,
    pub section_count: u32,
}

impl Db2Header {
    pub fn read(reader: &mut ByteReader<'_>) -> Db2Result<Self> {
        reader.enter("header");
        let header = Self {
            signature: reader.u32()?,
            record_count: reader.u32()?,
            field_count: reader.u32()?,
            record_size: reader.u32()?,
            string_table_size: reader.u32()?,
            table_hash: reader.u32()?,
            layout_hash: reader.u32()?,
            min_id: reader.u32()?,
            max_id: reader.u32()?,
            locale: reader.u32()?,
            flags: reader.u16()?,
            index_field: reader.i16()?,
            total_field_count: reader.u32()?,
            packed_data_offset: reader.u32()?,
            parent_lookup_count: reader.u32()?,
            column_meta_size: reader.u32()?,
            common_data_size: reader.u32()?,
            pallet_data_size: reader.u32()?,
            section_count: reader.u32()?,
        };

        if header.signature != WDC3_SIGNATURE {
            return Err(Db2Error::UnsupportedSignature {
                signature: header.signature,
            });
        }

        Ok(header)
    }

    /// True when records are stored through an offset map with variable sizes.
    pub fn is_sparse(&self) -> bool {
        self.flags & DB2_FLAG_SPARSE != 0
    }

    /// True when the file carries the given locale index.
    pub fn has_locale(&self, locale_index: u32) -> bool {
        locale_index < 32 && self.locale & (1 << locale_index) != 0
    }
}

#[derive(Debug, Clone)]
pub struct Db2SectionHeader {
    /// Non-zero when the section is encrypted; such sections cannot be decoded
    /// and their records are unavailable.
    pub tact_id: u64,
    pub file_offset: u32,
    pub record_count: u32,
    pub string_table_size: u32,
    /// For sparse files, the offset of the id list that precedes the offset map.
    pub catalog_data_offset: u32,
    pub id_table_size: u32,
    pub parent_lookup_data_size: u32,
    /// For sparse files, the number of offset-map entries in this section.
    pub catalog_data_count: u32,
    pub copy_table_count: u32,
}

impl Db2SectionHeader {
    pub fn read(reader: &mut ByteReader<'_>) -> Db2Result<Self> {
        Ok(Self {
            tact_id: reader.u64()?,
            file_offset: reader.u32()?,
            record_count: reader.u32()?,
            string_table_size: reader.u32()?,
            catalog_data_offset: reader.u32()?,
            id_table_size: reader.u32()?,
            parent_lookup_data_size: reader.u32()?,
            catalog_data_count: reader.u32()?,
            copy_table_count: reader.u32()?,
        })
    }

    pub fn is_encrypted(&self) -> bool {
        self.tact_id != 0
    }
}

/// One entry of the field structure block.
///
/// `unused_bits` gives the stored width of the column in sparse files:
/// `size = 4 - unused_bits / 8` with C truncation toward zero, so a value of
/// `-32` denotes an eight byte field.
#[derive(Debug, Clone, Copy)]
pub struct Db2FieldEntry {
    pub unused_bits: i16,
    pub offset: u16,
}

impl Db2FieldEntry {
    pub fn read(reader: &mut ByteReader<'_>) -> Db2Result<Self> {
        Ok(Self {
            unused_bits: reader.i16()?,
            offset: reader.u16()?,
        })
    }

    /// Stored width in bytes for sparse records.
    pub fn stored_size(&self) -> usize {
        let truncated = (self.unused_bits as i32) / 8;
        (4 - truncated).clamp(1, 8) as usize
    }
}

/// How a column's value is physically stored.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Db2Storage {
    /// Plain little-endian value at a byte offset inside the record.
    None,
    /// Bit-packed unsigned value inside the packed block.
    Immediate { bit_offset: u32, bit_width: u32 },
    /// Bit-packed two's complement value inside the packed block.
    SignedImmediate { bit_offset: u32, bit_width: u32 },
    /// Value looked up per record id, falling back to `default_value`.
    CommonData { default_value: u32 },
    /// Bit-packed index into the column's pallet block.
    Pallet { bit_offset: u32, bit_width: u32 },
    /// Bit-packed index into the column's pallet block, addressing `array_size`
    /// consecutive values.
    PalletArray {
        bit_offset: u32,
        bit_width: u32,
        array_size: u32,
    },
}

#[derive(Debug, Clone)]
pub struct Db2ColumnMeta {
    /// Bit offset of the column within a record for uncompressed storage.
    pub bit_offset: u16,
    /// Total bit size of the column, including every array element.
    pub bit_size: u16,
    /// Size in bytes of this column's pallet or common block.
    pub additional_data_size: u32,
    pub storage: Db2Storage,
}

impl Db2ColumnMeta {
    pub fn read(reader: &mut ByteReader<'_>, field: usize) -> Db2Result<Self> {
        let bit_offset = reader.u16()?;
        let bit_size = reader.u16()?;
        let additional_data_size = reader.u32()?;
        let compression = reader.u32()?;
        let first = reader.u32()?;
        let second = reader.u32()?;
        let third = reader.u32()?;

        let storage = match compression {
            0 => Db2Storage::None,
            1 => Db2Storage::Immediate {
                bit_offset: first,
                bit_width: second,
            },
            2 => Db2Storage::CommonData {
                default_value: first,
            },
            3 => Db2Storage::Pallet {
                bit_offset: first,
                bit_width: second,
            },
            4 => Db2Storage::PalletArray {
                bit_offset: first,
                bit_width: second,
                array_size: third,
            },
            5 => Db2Storage::SignedImmediate {
                bit_offset: first,
                bit_width: second,
            },
            raw => return Err(Db2Error::UnknownCompression { field, raw }),
        };

        Ok(Self {
            bit_offset,
            bit_size,
            additional_data_size,
            storage,
        })
    }

    /// Byte offset of the column inside a record.
    ///
    /// Mirrors `DB2FileLoaderRegularImpl::GetFieldOffset`: uncompressed columns
    /// sit at their own bit offset, every bit-packed mode is relative to the
    /// record's packed block, which starts at `packed_data_offset`.
    pub fn field_offset(&self, packed_data_offset: u32) -> Option<usize> {
        match self.storage {
            Db2Storage::None => Some(self.bit_offset as usize / 8),
            Db2Storage::Immediate { bit_offset, .. }
            | Db2Storage::SignedImmediate { bit_offset, .. }
            | Db2Storage::Pallet { bit_offset, .. }
            | Db2Storage::PalletArray { bit_offset, .. } => {
                Some(bit_offset as usize / 8 + packed_data_offset as usize)
            }
            // Common data is not stored in the record at all.
            Db2Storage::CommonData { .. } => None,
        }
    }
}

/// One `new row id -> source row id` duplication entry.
#[derive(Debug, Clone, Copy)]
pub struct Db2RecordCopy {
    pub new_row_id: u32,
    pub source_row_id: u32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stored_size_follows_truncating_division() {
        assert_eq!(
            Db2FieldEntry {
                unused_bits: 0,
                offset: 0
            }
            .stored_size(),
            4
        );
        assert_eq!(
            Db2FieldEntry {
                unused_bits: 16,
                offset: 0
            }
            .stored_size(),
            2
        );
        assert_eq!(
            Db2FieldEntry {
                unused_bits: 24,
                offset: 0
            }
            .stored_size(),
            1
        );
        // Negative unused bits widen the field; ItemSparse uses -32 for its
        // 64 bit race mask.
        assert_eq!(
            Db2FieldEntry {
                unused_bits: -32,
                offset: 0
            }
            .stored_size(),
            8
        );
    }

    #[test]
    fn packed_columns_are_offset_by_the_packed_block() {
        let column = Db2ColumnMeta {
            bit_offset: 320,
            bit_size: 13,
            additional_data_size: 0,
            storage: Db2Storage::SignedImmediate {
                bit_offset: 0,
                bit_width: 13,
            },
        };
        assert_eq!(column.field_offset(40), Some(40));

        let uncompressed = Db2ColumnMeta {
            bit_offset: 256,
            bit_size: 32,
            additional_data_size: 0,
            storage: Db2Storage::None,
        };
        assert_eq!(uncompressed.field_offset(40), Some(32));
    }

    #[test]
    fn common_data_columns_have_no_record_offset() {
        let column = Db2ColumnMeta {
            bit_offset: 0,
            bit_size: 32,
            additional_data_size: 8,
            storage: Db2Storage::CommonData { default_value: 7 },
        };
        assert_eq!(column.field_offset(0), None);
    }
}
