//! Synthetic WDC3 writer used by the decoder tests.
//!
//! Emits byte-exact containers so the decoder can be exercised against every
//! storage mode without depending on any particular client build.

use crate::db2::format::header::{
    DB2_CATALOG_ENTRY_SIZE, DB2_COLUMN_META_SIZE, DB2_HEADER_SIZE, DB2_SECTION_HEADER_SIZE,
    WDC3_SIGNATURE,
};

/// Physical storage of one synthetic column.
#[derive(Clone)]
pub enum Storage {
    None,
    Immediate {
        bit_offset: u32,
        bit_width: u32,
    },
    SignedImmediate {
        bit_offset: u32,
        bit_width: u32,
    },
    CommonData {
        default_value: u32,
        values: Vec<(u32, u32)>,
    },
    Pallet {
        bit_offset: u32,
        bit_width: u32,
        values: Vec<u32>,
    },
    PalletArray {
        bit_offset: u32,
        bit_width: u32,
        array_size: u32,
        values: Vec<u32>,
    },
}

impl Storage {
    fn code(&self) -> u32 {
        match self {
            Storage::None => 0,
            Storage::Immediate { .. } => 1,
            Storage::CommonData { .. } => 2,
            Storage::Pallet { .. } => 3,
            Storage::PalletArray { .. } => 4,
            Storage::SignedImmediate { .. } => 5,
        }
    }

    fn additional_data_size(&self) -> u32 {
        match self {
            Storage::CommonData { values, .. } => (values.len() * 8) as u32,
            Storage::Pallet { values, .. } => (values.len() * 4) as u32,
            Storage::PalletArray { values, .. } => (values.len() * 4) as u32,
            _ => 0,
        }
    }

    fn compression_data(&self) -> [u32; 3] {
        match self {
            Storage::None => [0, 0, 0],
            Storage::Immediate {
                bit_offset,
                bit_width,
            }
            | Storage::SignedImmediate {
                bit_offset,
                bit_width,
            } => [*bit_offset, *bit_width, 0],
            Storage::CommonData { default_value, .. } => [*default_value, 0, 0],
            Storage::Pallet {
                bit_offset,
                bit_width,
                ..
            } => [*bit_offset, *bit_width, 0],
            Storage::PalletArray {
                bit_offset,
                bit_width,
                array_size,
                ..
            } => [*bit_offset, *bit_width, *array_size],
        }
    }
}

#[derive(Clone)]
pub struct Column {
    pub bit_offset: u16,
    pub bit_size: u16,
    pub storage: Storage,
}

impl Column {
    pub fn uncompressed(bit_offset: u16, bit_size: u16) -> Self {
        Self {
            bit_offset,
            bit_size,
            storage: Storage::None,
        }
    }

    pub fn packed(bit_offset: u16, bit_size: u16, storage: Storage) -> Self {
        Self {
            bit_offset,
            bit_size,
            storage,
        }
    }
}

/// One fixed-size record, with string columns resolved at build time.
#[derive(Clone, Default)]
pub struct RecordDef {
    pub bytes: Vec<u8>,
    /// `(byte offset of the string column inside the record, text)`
    pub strings: Vec<(usize, String)>,
}

impl RecordDef {
    pub fn new(bytes: Vec<u8>) -> Self {
        Self {
            bytes,
            strings: Vec::new(),
        }
    }

    pub fn with_string(mut self, byte_offset: usize, text: &str) -> Self {
        self.strings.push((byte_offset, text.to_string()));
        self
    }
}

#[derive(Clone, Default)]
pub struct SectionDef {
    pub encrypted: bool,
    pub records: Vec<RecordDef>,
    /// Ids for the id table; empty when the table stores its id in the data.
    pub ids: Vec<u32>,
    pub copies: Vec<(u32, u32)>,
    /// `(parent id, section relative record index)`
    pub parents: Vec<(u32, u32)>,
    /// Sparse records as `(id, raw bytes)`; used only when the file is sparse.
    pub sparse_records: Vec<(u32, Vec<u8>)>,
}

pub struct Wdc3Builder {
    pub layout_hash: u32,
    pub table_hash: u32,
    pub locale: u32,
    pub sparse: bool,
    pub index_field: i16,
    pub record_size: u32,
    pub packed_data_offset: u32,
    pub parent_lookup_count: u32,
    pub field_entries: Vec<(i16, u16)>,
    pub columns: Vec<Column>,
    pub sections: Vec<SectionDef>,
    pub signature: u32,
}

impl Wdc3Builder {
    pub fn new(layout_hash: u32) -> Self {
        Self {
            layout_hash,
            table_hash: 0x1234_5678,
            locale: u32::MAX,
            sparse: false,
            index_field: 0,
            record_size: 0,
            packed_data_offset: 0,
            parent_lookup_count: 0,
            field_entries: Vec::new(),
            columns: Vec::new(),
            sections: Vec::new(),
            signature: WDC3_SIGNATURE,
        }
    }

    pub fn build(&self) -> Vec<u8> {
        let field_count = self.field_entries.len() as u32;
        let total_field_count = self.columns.len() as u32;
        let record_count: u32 = if self.sparse {
            self.sections
                .iter()
                .map(|section| section.sparse_records.len() as u32)
                .sum()
        } else {
            self.sections
                .iter()
                .map(|section| section.records.len() as u32)
                .sum()
        };

        let pallet_data_size: u32 = self
            .columns
            .iter()
            .filter(|column| matches!(column.storage, Storage::Pallet { .. }))
            .map(|column| column.storage.additional_data_size())
            .sum::<u32>()
            + self
                .columns
                .iter()
                .filter(|column| matches!(column.storage, Storage::PalletArray { .. }))
                .map(|column| column.storage.additional_data_size())
                .sum::<u32>();
        let common_data_size: u32 = self
            .columns
            .iter()
            .filter(|column| matches!(column.storage, Storage::CommonData { .. }))
            .map(|column| column.storage.additional_data_size())
            .sum();

        let mut string_tables: Vec<Vec<u8>> = Vec::with_capacity(self.sections.len());
        let mut resolved_records: Vec<Vec<Vec<u8>>> = Vec::with_capacity(self.sections.len());
        if !self.sparse {
            self.resolve_strings(record_count, &mut string_tables, &mut resolved_records);
        } else {
            string_tables = vec![Vec::new(); self.sections.len()];
        }

        let header_block = DB2_HEADER_SIZE
            + DB2_SECTION_HEADER_SIZE * self.sections.len()
            + 4 * field_count as usize
            + DB2_COLUMN_META_SIZE * total_field_count as usize
            + pallet_data_size as usize
            + common_data_size as usize;

        // First pass: lay out each section to learn its file offsets.
        let mut cursor = header_block;
        let mut section_offsets = Vec::with_capacity(self.sections.len());
        for (index, section) in self.sections.iter().enumerate() {
            let file_offset = cursor;
            let mut catalog_offset = 0usize;
            if self.sparse {
                let data_len: usize = section
                    .sparse_records
                    .iter()
                    .map(|(_, bytes)| bytes.len())
                    .sum();
                cursor += data_len;
                catalog_offset = cursor;
                cursor += 4 * section.sparse_records.len();
                cursor += 8 * section.copies.len();
                cursor += DB2_CATALOG_ENTRY_SIZE * section.sparse_records.len();
                cursor += 4 * section.sparse_records.len();
            } else {
                cursor += self.record_size as usize * section.records.len();
                cursor += string_tables[index].len();
                cursor += 4 * section.ids.len();
                cursor += 8 * section.copies.len();
            }
            if self.parent_lookup_count > 0 {
                cursor += 12 + 8 * section.parents.len();
            }
            section_offsets.push((file_offset, catalog_offset));
        }

        let mut out: Vec<u8> = Vec::with_capacity(cursor);
        let all_ids: Vec<u32> = self
            .sections
            .iter()
            .flat_map(|section| {
                if self.sparse {
                    section
                        .sparse_records
                        .iter()
                        .map(|(id, _)| *id)
                        .collect::<Vec<_>>()
                } else {
                    section.ids.clone()
                }
            })
            .collect();

        // Header.
        push_u32(&mut out, self.signature);
        push_u32(&mut out, record_count);
        push_u32(&mut out, field_count);
        push_u32(&mut out, self.record_size);
        push_u32(
            &mut out,
            string_tables.iter().map(|table| table.len() as u32).sum(),
        );
        push_u32(&mut out, self.table_hash);
        push_u32(&mut out, self.layout_hash);
        push_u32(&mut out, all_ids.iter().copied().min().unwrap_or(0));
        push_u32(&mut out, all_ids.iter().copied().max().unwrap_or(0));
        push_u32(&mut out, self.locale);
        push_u16(&mut out, if self.sparse { 0x5 } else { 0x4 });
        push_u16(&mut out, self.index_field as u16);
        push_u32(&mut out, total_field_count);
        push_u32(&mut out, self.packed_data_offset);
        push_u32(&mut out, self.parent_lookup_count);
        push_u32(&mut out, DB2_COLUMN_META_SIZE as u32 * total_field_count);
        push_u32(&mut out, common_data_size);
        push_u32(&mut out, pallet_data_size);
        push_u32(&mut out, self.sections.len() as u32);

        // Section headers.
        for (index, section) in self.sections.iter().enumerate() {
            let (file_offset, catalog_offset) = section_offsets[index];
            let record_count = if self.sparse {
                section.sparse_records.len() as u32
            } else {
                section.records.len() as u32
            };
            push_u64(&mut out, if section.encrypted { 0xDEAD_BEEF } else { 0 });
            push_u32(&mut out, file_offset as u32);
            push_u32(&mut out, record_count);
            push_u32(&mut out, string_tables[index].len() as u32);
            push_u32(&mut out, catalog_offset as u32);
            push_u32(
                &mut out,
                if self.sparse {
                    4 * section.sparse_records.len() as u32
                } else {
                    4 * section.ids.len() as u32
                },
            );
            push_u32(
                &mut out,
                if self.parent_lookup_count > 0 {
                    12 + 8 * section.parents.len() as u32
                } else {
                    0
                },
            );
            push_u32(
                &mut out,
                if self.sparse {
                    section.sparse_records.len() as u32
                } else {
                    0
                },
            );
            push_u32(&mut out, section.copies.len() as u32);
        }

        // Field entries.
        for (unused_bits, offset) in &self.field_entries {
            push_u16(&mut out, *unused_bits as u16);
            push_u16(&mut out, *offset);
        }

        // Column metadata.
        for column in &self.columns {
            push_u16(&mut out, column.bit_offset);
            push_u16(&mut out, column.bit_size);
            push_u32(&mut out, column.storage.additional_data_size());
            push_u32(&mut out, column.storage.code());
            for value in column.storage.compression_data() {
                push_u32(&mut out, value);
            }
        }

        // Pallet block, then pallet-array block, then common block.
        for column in &self.columns {
            if let Storage::Pallet { values, .. } = &column.storage {
                for value in values {
                    push_u32(&mut out, *value);
                }
            }
        }
        for column in &self.columns {
            if let Storage::PalletArray { values, .. } = &column.storage {
                for value in values {
                    push_u32(&mut out, *value);
                }
            }
        }
        for column in &self.columns {
            if let Storage::CommonData { values, .. } = &column.storage {
                for (record_id, value) in values {
                    push_u32(&mut out, *record_id);
                    push_u32(&mut out, *value);
                }
            }
        }

        debug_assert_eq!(out.len(), header_block);

        // Section payloads.
        for (index, section) in self.sections.iter().enumerate() {
            if self.sparse {
                let base = out.len();
                let mut entries = Vec::with_capacity(section.sparse_records.len());
                for (_, bytes) in &section.sparse_records {
                    entries.push((out.len() as u32, bytes.len() as u16));
                    out.extend_from_slice(bytes);
                }
                debug_assert_eq!(base, section_offsets[index].0);
                debug_assert_eq!(out.len(), section_offsets[index].1);
                for (id, _) in &section.sparse_records {
                    push_u32(&mut out, *id);
                }
                for (new_row, source_row) in &section.copies {
                    push_u32(&mut out, *new_row);
                    push_u32(&mut out, *source_row);
                }
                for (offset, size) in &entries {
                    push_u32(&mut out, *offset);
                    push_u16(&mut out, *size);
                }
                for (id, _) in &section.sparse_records {
                    push_u32(&mut out, *id);
                }
            } else {
                for record in &resolved_records[index] {
                    out.extend_from_slice(record);
                }
                out.extend_from_slice(&string_tables[index]);
                for id in &section.ids {
                    push_u32(&mut out, *id);
                }
                for (new_row, source_row) in &section.copies {
                    push_u32(&mut out, *new_row);
                    push_u32(&mut out, *source_row);
                }
            }

            if self.parent_lookup_count > 0 {
                push_u32(&mut out, section.parents.len() as u32);
                push_u32(
                    &mut out,
                    section.parents.iter().map(|(id, _)| *id).min().unwrap_or(0),
                );
                push_u32(
                    &mut out,
                    section.parents.iter().map(|(id, _)| *id).max().unwrap_or(0),
                );
                for (parent_id, record_index) in &section.parents {
                    push_u32(&mut out, *parent_id);
                    push_u32(&mut out, *record_index);
                }
            }
        }

        out
    }

    /// Fills string columns with offsets relative to the column's own position
    /// inside the concatenated record + string buffer.
    fn resolve_strings(
        &self,
        record_count: u32,
        string_tables: &mut Vec<Vec<u8>>,
        resolved_records: &mut Vec<Vec<Vec<u8>>>,
    ) {
        let record_size = self.record_size as usize;
        let string_base = record_size * record_count as usize;
        let mut global_record_index = 0usize;
        let mut global_string_offset = 0usize;

        for section in &self.sections {
            let mut table: Vec<u8> = Vec::new();
            let mut records: Vec<Vec<u8>> = Vec::new();
            for record in &section.records {
                let mut bytes = record.bytes.clone();
                bytes.resize(record_size, 0);
                for (byte_offset, text) in &record.strings {
                    let position = global_string_offset + table.len();
                    table.extend_from_slice(text.as_bytes());
                    table.push(0);
                    let absolute = string_base + position;
                    let column_position = global_record_index * record_size + byte_offset;
                    let relative = (absolute - column_position) as u32;
                    bytes[*byte_offset..*byte_offset + 4].copy_from_slice(&relative.to_le_bytes());
                }
                records.push(bytes);
                global_record_index += 1;
            }
            global_string_offset += table.len();
            string_tables.push(table);
            resolved_records.push(records);
        }
    }
}

fn push_u16(out: &mut Vec<u8>, value: u16) {
    out.extend_from_slice(&value.to_le_bytes());
}

fn push_u32(out: &mut Vec<u8>, value: u32) {
    out.extend_from_slice(&value.to_le_bytes());
}

fn push_u64(out: &mut Vec<u8>, value: u64) {
    out.extend_from_slice(&value.to_le_bytes());
}

/// Writes a bit-packed value into a record's packed block.
pub fn write_packed(
    record: &mut [u8],
    packed_data_offset: usize,
    bit_offset: u32,
    bit_width: u32,
    value: u64,
) {
    let mask = if bit_width >= 64 {
        u64::MAX
    } else {
        (1u64 << bit_width) - 1
    };
    let value = value & mask;
    for bit in 0..bit_width {
        if value & (1 << bit) == 0 {
            continue;
        }
        let absolute = bit_offset as usize + bit as usize;
        let byte = packed_data_offset + absolute / 8;
        record[byte] |= 1 << (absolute % 8);
    }
}
