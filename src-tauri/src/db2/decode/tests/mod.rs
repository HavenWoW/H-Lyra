//! Decoder tests against synthetic WDC3 containers.
//!
//! The containers are written byte by byte here, so every storage mode is
//! covered without depending on any particular client build.

mod builder;

use builder::{write_packed, Column, RecordDef, SectionDef, Storage, Wdc3Builder};

use crate::db2::decode::Db2Table;
use crate::db2::format::{Db2Error, Db2File};
use crate::db2::meta::{Db2FieldMeta, Db2TableMeta, FieldType};

use FieldType::{Byte, Float, Int, Long, Short, String as Localized, StringNotLocalized as RawStr};

// ---------------------------------------------------------------------------
// Fixed-size table exercising every storage mode at once.
// ---------------------------------------------------------------------------

const MIXED_FIELDS: &[Db2FieldMeta] = &[
    Db2FieldMeta::new("Plain", Int, 1, false),
    Db2FieldMeta::new("PlainArray", Short, 2, false),
    Db2FieldMeta::new("Text", RawStr, 1, false),
    Db2FieldMeta::new("Imm", Int, 1, false),
    Db2FieldMeta::new("SignedImm", Int, 1, true),
    Db2FieldMeta::new("Pal", Int, 1, false),
    Db2FieldMeta::new("PalArr", Int, 4, false),
    Db2FieldMeta::new("Common", Int, 1, false),
];

const MIXED: Db2TableMeta = Db2TableMeta {
    name: "Mixed",
    file_name: "Mixed.db2",
    file_data_id: 1,
    layout_hash: 0xAAAA_0001,
    index_field: -1,
    parent_index_field: -1,
    file_field_count: 8,
    fields: MIXED_FIELDS,
};

const MIXED_RECORD_SIZE: u32 = 16;
const MIXED_PACKED_OFFSET: u32 = 12;

const IMM_BITS: (u32, u32) = (0, 12);
const SIGNED_IMM_BITS: (u32, u32) = (12, 10);
const PALLET_BITS: (u32, u32) = (22, 3);
const PALLET_ARRAY_BITS: (u32, u32) = (25, 3);

fn mixed_columns() -> Vec<Column> {
    vec![
        Column::uncompressed(0, 32),
        Column::uncompressed(32, 32),
        Column::uncompressed(64, 32),
        Column::packed(
            96,
            IMM_BITS.1 as u16,
            Storage::Immediate {
                bit_offset: IMM_BITS.0,
                bit_width: IMM_BITS.1,
            },
        ),
        Column::packed(
            108,
            SIGNED_IMM_BITS.1 as u16,
            Storage::SignedImmediate {
                bit_offset: SIGNED_IMM_BITS.0,
                bit_width: SIGNED_IMM_BITS.1,
            },
        ),
        Column::packed(
            118,
            PALLET_BITS.1 as u16,
            Storage::Pallet {
                bit_offset: PALLET_BITS.0,
                bit_width: PALLET_BITS.1,
                values: vec![111, 222, 333],
            },
        ),
        Column::packed(
            121,
            PALLET_ARRAY_BITS.1 as u16,
            Storage::PalletArray {
                bit_offset: PALLET_ARRAY_BITS.0,
                bit_width: PALLET_ARRAY_BITS.1,
                array_size: 4,
                // Three pallet entries of four elements each.
                values: vec![10, 11, 12, 13, 20, 21, 22, 23, 30, 31, 32, 33],
            },
        ),
        Column::packed(
            124,
            32,
            Storage::CommonData {
                default_value: 77,
                values: vec![(10, 1000), (20, 2000)],
            },
        ),
    ]
}

struct MixedValues {
    plain: u32,
    array: [u16; 2],
    text: &'static str,
    immediate: u64,
    signed_immediate: i64,
    pallet_index: u64,
    pallet_array_index: u64,
}

fn mixed_record(values: &MixedValues) -> RecordDef {
    let mut bytes = vec![0u8; MIXED_RECORD_SIZE as usize];
    bytes[0..4].copy_from_slice(&values.plain.to_le_bytes());
    bytes[4..6].copy_from_slice(&values.array[0].to_le_bytes());
    bytes[6..8].copy_from_slice(&values.array[1].to_le_bytes());
    // Bytes 8..12 hold the string offset, filled in by the builder.

    let packed = MIXED_PACKED_OFFSET as usize;
    write_packed(&mut bytes, packed, IMM_BITS.0, IMM_BITS.1, values.immediate);
    write_packed(
        &mut bytes,
        packed,
        SIGNED_IMM_BITS.0,
        SIGNED_IMM_BITS.1,
        values.signed_immediate as u64,
    );
    write_packed(
        &mut bytes,
        packed,
        PALLET_BITS.0,
        PALLET_BITS.1,
        values.pallet_index,
    );
    write_packed(
        &mut bytes,
        packed,
        PALLET_ARRAY_BITS.0,
        PALLET_ARRAY_BITS.1,
        values.pallet_array_index,
    );

    RecordDef::new(bytes).with_string(8, values.text)
}

fn mixed_builder() -> Wdc3Builder {
    let mut builder = Wdc3Builder::new(MIXED.layout_hash);
    builder.record_size = MIXED_RECORD_SIZE;
    builder.packed_data_offset = MIXED_PACKED_OFFSET;
    builder.field_entries = vec![(0, 0); 8];
    builder.columns = mixed_columns();

    let first = SectionDef {
        records: vec![
            mixed_record(&MixedValues {
                plain: 0x1122_3344,
                array: [0x0102, 0x0304],
                text: "alpha",
                immediate: 0xABC,
                signed_immediate: -5,
                pallet_index: 1,
                pallet_array_index: 1,
            }),
            mixed_record(&MixedValues {
                plain: 7,
                array: [1, 2],
                text: "beta",
                immediate: 1,
                signed_immediate: 511,
                pallet_index: 0,
                pallet_array_index: 0,
            }),
            mixed_record(&MixedValues {
                plain: 0,
                array: [0xFFFF, 0],
                text: "",
                immediate: 4095,
                signed_immediate: -512,
                pallet_index: 2,
                pallet_array_index: 2,
            }),
        ],
        ids: vec![10, 11, 12],
        copies: vec![(500, 11)],
        ..SectionDef::default()
    };

    // An encrypted section keeps its record slots but yields no data.
    let encrypted = SectionDef {
        encrypted: true,
        records: vec![mixed_record(&MixedValues {
            plain: 0xDEAD_BEEF,
            array: [0, 0],
            text: "secret",
            immediate: 0,
            signed_immediate: 0,
            pallet_index: 0,
            pallet_array_index: 0,
        })],
        ids: vec![99],
        ..SectionDef::default()
    };

    let third = SectionDef {
        records: vec![
            mixed_record(&MixedValues {
                plain: 42,
                array: [5, 6],
                text: "gamma",
                immediate: 2,
                signed_immediate: 3,
                pallet_index: 0,
                pallet_array_index: 0,
            }),
            mixed_record(&MixedValues {
                plain: 43,
                array: [7, 8],
                text: "delta",
                immediate: 3,
                signed_immediate: -1,
                pallet_index: 1,
                pallet_array_index: 1,
            }),
        ],
        ids: vec![20, 21],
        ..SectionDef::default()
    };

    builder.sections = vec![first, encrypted, third];
    builder
}

fn open(builder: &Wdc3Builder, meta: &'static Db2TableMeta) -> Db2Table {
    let file = Db2File::parse(builder.build()).expect("container must parse");
    Db2Table::from_file(file, meta, "enUS").expect("table must load")
}

#[derive(Debug, Clone, PartialEq)]
struct MixedRow {
    id: u32,
    plain: u32,
    array: [u16; 2],
    text: String,
    immediate: u32,
    signed_immediate: i32,
    pallet: u32,
    pallet_array: [u32; 4],
    common: u32,
}

fn decode_mixed(table: &Db2Table) -> std::collections::HashMap<u32, MixedRow> {
    table
        .decode_all(|id, record| {
            let mut pallet_array = [0u32; 4];
            for (index, slot) in pallet_array.iter_mut().enumerate() {
                *slot = record.u32(6, index)?;
            }
            Ok(MixedRow {
                id,
                plain: record.u32(0, 0)?,
                array: [record.u16(1, 0)?, record.u16(1, 1)?],
                text: record.string(2, 0)?,
                immediate: record.u32(3, 0)?,
                signed_immediate: record.i32(4, 0)?,
                pallet: record.u32(5, 0)?,
                pallet_array,
                common: record.u32(7, 0)?,
            })
        })
        .expect("decode must succeed")
}

#[test]
fn uncompressed_scalars_and_arrays_decode() {
    let table = open(&mixed_builder(), &MIXED);
    let rows = decode_mixed(&table);

    let first = &rows[&10];
    assert_eq!(first.plain, 0x1122_3344);
    assert_eq!(first.array, [0x0102, 0x0304]);
    assert_eq!(rows[&12].array, [0xFFFF, 0]);
}

#[test]
fn immediate_columns_start_at_the_packed_data_offset() {
    // Reading the packed block from the start of the record instead of from
    // packed_data_offset yields the uncompressed columns' bits, so a wrong
    // offset shows up immediately here.
    let table = open(&mixed_builder(), &MIXED);
    let rows = decode_mixed(&table);

    assert_eq!(rows[&10].immediate, 0xABC);
    assert_eq!(rows[&11].immediate, 1);
    assert_eq!(rows[&12].immediate, 4095);
    assert_eq!(rows[&20].immediate, 2);
}

#[test]
fn signed_immediate_columns_sign_extend_from_their_bit_width() {
    let table = open(&mixed_builder(), &MIXED);
    let rows = decode_mixed(&table);

    assert_eq!(rows[&10].signed_immediate, -5);
    assert_eq!(rows[&11].signed_immediate, 511);
    assert_eq!(rows[&12].signed_immediate, -512);
    assert_eq!(rows[&21].signed_immediate, -1);
}

#[test]
fn pallet_and_pallet_array_columns_resolve_through_their_blocks() {
    let table = open(&mixed_builder(), &MIXED);
    let rows = decode_mixed(&table);

    assert_eq!(rows[&10].pallet, 222);
    assert_eq!(rows[&11].pallet, 111);
    assert_eq!(rows[&12].pallet, 333);

    assert_eq!(rows[&10].pallet_array, [20, 21, 22, 23]);
    assert_eq!(rows[&11].pallet_array, [10, 11, 12, 13]);
    assert_eq!(rows[&12].pallet_array, [30, 31, 32, 33]);
}

#[test]
fn common_data_columns_fall_back_to_the_column_default() {
    let table = open(&mixed_builder(), &MIXED);
    let rows = decode_mixed(&table);

    assert_eq!(rows[&10].common, 1000, "record with an override");
    assert_eq!(rows[&20].common, 2000, "override in a later section");
    assert_eq!(rows[&11].common, 77, "no override, column default applies");
    assert_eq!(rows[&12].common, 77);
}

#[test]
fn strings_resolve_relative_to_their_own_column_across_sections() {
    let table = open(&mixed_builder(), &MIXED);
    let rows = decode_mixed(&table);

    assert_eq!(rows[&10].text, "alpha");
    assert_eq!(rows[&11].text, "beta");
    assert_eq!(rows[&12].text, "");
    // Records in a later section resolve against the concatenated buffer.
    assert_eq!(rows[&20].text, "gamma");
    assert_eq!(rows[&21].text, "delta");
}

#[test]
fn encrypted_sections_are_skipped_rather_than_decoded() {
    let table = open(&mixed_builder(), &MIXED);
    let rows = decode_mixed(&table);

    assert_eq!(table.encrypted_sections(), 1);
    assert_eq!(table.encrypted_records(), 1);
    assert!(!rows.contains_key(&99), "encrypted record must not decode");
    // Its slot still exists so later records keep their global index.
    assert!(table.record(3).expect("index is valid").is_none());
    assert!(table.record(4).expect("index is valid").is_some());
}

#[test]
fn copy_table_rows_duplicate_their_source_under_a_new_id() {
    let table = open(&mixed_builder(), &MIXED);
    let rows = decode_mixed(&table);

    let source = rows[&11].clone();
    let copy = rows[&500].clone();
    assert_eq!(copy.id, 500);
    assert_eq!(copy.plain, source.plain);
    assert_eq!(copy.text, source.text);
    assert_eq!(copy.pallet_array, source.pallet_array);
}

#[test]
fn decoded_row_count_matches_the_available_records_plus_copies() {
    let table = open(&mixed_builder(), &MIXED);
    let rows = decode_mixed(&table);

    // Six addressable records, one of them encrypted, plus one copy.
    assert_eq!(table.record_count(), 6);
    assert_eq!(rows.len(), 6);
    let stats = table.stats(rows.len() as u32);
    assert_eq!(stats.copy_records, 1);
    assert_eq!(stats.encrypted_records, 1);
}

// ---------------------------------------------------------------------------
// Parent lookup filling an appended column.
// ---------------------------------------------------------------------------

const CHILD_FIELDS: &[Db2FieldMeta] = &[
    Db2FieldMeta::new("Value", Int, 1, false),
    Db2FieldMeta::new("ParentID", Int, 1, false),
];

const CHILD: Db2TableMeta = Db2TableMeta {
    name: "Child",
    file_name: "Child.db2",
    file_data_id: 2,
    layout_hash: 0xAAAA_0002,
    index_field: -1,
    parent_index_field: 1,
    file_field_count: 1,
    fields: CHILD_FIELDS,
};

#[test]
fn parent_lookup_fills_the_appended_column() {
    let mut builder = Wdc3Builder::new(CHILD.layout_hash);
    builder.record_size = 2;
    builder.parent_lookup_count = 1;
    builder.field_entries = vec![(0, 0)];
    builder.columns = vec![Column::packed(
        0,
        16,
        Storage::Immediate {
            bit_offset: 0,
            bit_width: 16,
        },
    )];
    builder.sections = vec![SectionDef {
        records: vec![
            RecordDef::new(100u16.to_le_bytes().to_vec()),
            RecordDef::new(200u16.to_le_bytes().to_vec()),
            RecordDef::new(300u16.to_le_bytes().to_vec()),
        ],
        ids: vec![1, 2, 3],
        // Section-relative record indices.
        parents: vec![(700, 0), (800, 2)],
        ..SectionDef::default()
    }];

    let table = open(&builder, &CHILD);
    let rows = table
        .decode_all(|id, record| Ok((id, record.u32(0, 0)?, record.u32(1, 0)?)))
        .expect("decode must succeed");

    assert_eq!(rows[&1], (1, 100, 700));
    assert_eq!(rows[&2], (2, 200, 0), "records without a parent read zero");
    assert_eq!(rows[&3], (3, 300, 800));
}

#[test]
fn parent_lookup_indices_are_section_relative() {
    let mut builder = Wdc3Builder::new(CHILD.layout_hash);
    builder.record_size = 2;
    builder.parent_lookup_count = 1;
    builder.field_entries = vec![(0, 0)];
    builder.columns = vec![Column::packed(
        0,
        16,
        Storage::Immediate {
            bit_offset: 0,
            bit_width: 16,
        },
    )];
    builder.sections = vec![
        SectionDef {
            records: vec![RecordDef::new(10u16.to_le_bytes().to_vec())],
            ids: vec![1],
            parents: vec![(700, 0)],
            ..SectionDef::default()
        },
        SectionDef {
            records: vec![
                RecordDef::new(20u16.to_le_bytes().to_vec()),
                RecordDef::new(30u16.to_le_bytes().to_vec()),
            ],
            ids: vec![2, 3],
            // Index 1 inside the second section is global record index 2.
            parents: vec![(900, 1)],
            ..SectionDef::default()
        },
    ];

    let table = open(&builder, &CHILD);
    let rows = table
        .decode_all(|id, record| Ok((id, record.u32(1, 0)?)))
        .expect("decode must succeed");

    assert_eq!(rows[&1], (1, 700));
    assert_eq!(rows[&2], (2, 0));
    assert_eq!(rows[&3], (3, 900));
}

// ---------------------------------------------------------------------------
// Record id stored in the data instead of an id table.
// ---------------------------------------------------------------------------

const KEYED_FIELDS: &[Db2FieldMeta] = &[
    Db2FieldMeta::new("ID", Int, 1, false),
    Db2FieldMeta::new("Value", Int, 1, false),
];

const KEYED: Db2TableMeta = Db2TableMeta {
    name: "Keyed",
    file_name: "Keyed.db2",
    file_data_id: 3,
    layout_hash: 0xAAAA_0003,
    index_field: 0,
    parent_index_field: -1,
    file_field_count: 2,
    fields: KEYED_FIELDS,
};

#[test]
fn in_data_index_columns_supply_the_record_id() {
    let mut builder = Wdc3Builder::new(KEYED.layout_hash);
    builder.record_size = 4;
    builder.index_field = 0;
    builder.field_entries = vec![(0, 0), (0, 2)];
    builder.columns = vec![
        Column::packed(
            0,
            16,
            Storage::Immediate {
                bit_offset: 0,
                bit_width: 16,
            },
        ),
        Column::packed(
            16,
            16,
            Storage::Immediate {
                bit_offset: 16,
                bit_width: 16,
            },
        ),
    ];

    let record = |id: u16, value: u16| {
        let mut bytes = vec![0u8; 4];
        bytes[0..2].copy_from_slice(&id.to_le_bytes());
        bytes[2..4].copy_from_slice(&value.to_le_bytes());
        RecordDef::new(bytes)
    };

    builder.sections = vec![SectionDef {
        records: vec![record(4242, 7), record(90, 8)],
        // No id table: section.IdTableSize stays zero.
        ids: Vec::new(),
        ..SectionDef::default()
    }];

    let table = open(&builder, &KEYED);
    let rows = table
        .decode_all(|id, record| Ok((id, record.u32(1, 0)?)))
        .expect("decode must succeed");

    assert_eq!(rows.len(), 2);
    assert_eq!(rows[&4242], (4242, 7));
    assert_eq!(rows[&90], (90, 8));
}

// ---------------------------------------------------------------------------
// Sparse (offset map) records.
// ---------------------------------------------------------------------------

const SPARSE_FIELDS: &[Db2FieldMeta] = &[
    Db2FieldMeta::new("Big", Long, 1, true),
    Db2FieldMeta::new("Text", RawStr, 1, false),
    Db2FieldMeta::new("Value", Int, 1, true),
    Db2FieldMeta::new("Trio", Byte, 3, false),
    Db2FieldMeta::new("Ratio", Float, 1, false),
];

const SPARSE: Db2TableMeta = Db2TableMeta {
    name: "Sparse",
    file_name: "Sparse.db2",
    file_data_id: 4,
    layout_hash: 0xAAAA_0004,
    index_field: -1,
    parent_index_field: -1,
    file_field_count: 5,
    fields: SPARSE_FIELDS,
};

fn sparse_record(big: i64, text: &str, value: i32, trio: [u8; 3], ratio: f32) -> Vec<u8> {
    let mut bytes = Vec::new();
    bytes.extend_from_slice(&big.to_le_bytes());
    bytes.extend_from_slice(text.as_bytes());
    bytes.push(0);
    // Stored in two bytes, as the field entry declares.
    bytes.extend_from_slice(&(value as u16).to_le_bytes());
    bytes.extend_from_slice(&trio);
    bytes.extend_from_slice(&ratio.to_le_bytes());
    bytes
}

fn sparse_builder() -> Wdc3Builder {
    let mut builder = Wdc3Builder::new(SPARSE.layout_hash);
    builder.sparse = true;
    // The nominal record size is unused by sparse decoding but is still part of
    // the header, as in the shipped client files.
    builder.record_size = 24;
    builder.locale = 1;
    // Unused bits drive the stored width: -32 widens to eight bytes, 16 narrows
    // to two, 24 narrows to one.
    builder.field_entries = vec![(-32, 0), (0, 8), (16, 12), (24, 14), (0, 17)];
    builder.columns = (0..5)
        .map(|index| Column::uncompressed(index * 32, 32))
        .collect();
    builder.sections = vec![SectionDef {
        sparse_records: vec![
            (100, sparse_record(-1, "hi", -3, [1, 2, 3], 1.5)),
            (101, sparse_record(5, "", 1000, [9, 8, 7], -0.5)),
            (
                102,
                sparse_record(i64::MIN, "longer text", 32767, [0, 0, 255], 0.0),
            ),
        ],
        copies: vec![(900, 100)],
        ..SectionDef::default()
    }];
    builder
}

#[derive(Debug, Clone, PartialEq)]
struct SparseRow {
    id: u32,
    big: i64,
    text: String,
    value: i32,
    trio: [u8; 3],
    ratio: f32,
}

#[test]
fn sparse_records_use_field_entry_widths_and_inline_strings() {
    let table = open(&sparse_builder(), &SPARSE);
    let rows = table
        .decode_all(|id, record| {
            let mut trio = [0u8; 3];
            for (index, slot) in trio.iter_mut().enumerate() {
                *slot = record.u8(3, index)?;
            }
            Ok(SparseRow {
                id,
                big: record.i64(0, 0)?,
                text: record.string(1, 0)?,
                value: record.i32(2, 0)?,
                trio,
                ratio: record.f32(4, 0)?,
            })
        })
        .expect("decode must succeed");

    assert_eq!(rows.len(), 4, "three records plus one copy");

    let first = &rows[&100];
    assert_eq!(first.big, -1);
    assert_eq!(first.text, "hi");
    assert_eq!(first.value, -3, "two byte column sign extends from 16 bits");
    assert_eq!(first.trio, [1, 2, 3]);
    assert_eq!(first.ratio, 1.5);

    let second = &rows[&101];
    assert_eq!(second.big, 5);
    assert_eq!(
        second.text, "",
        "an empty inline string is just a terminator"
    );
    assert_eq!(second.value, 1000);
    assert_eq!(second.trio, [9, 8, 7]);
    assert_eq!(second.ratio, -0.5);

    let third = &rows[&102];
    assert_eq!(
        third.big,
        i64::MIN,
        "eight byte column keeps its full range"
    );
    assert_eq!(third.text, "longer text");
    assert_eq!(third.value, 32767);
    assert_eq!(third.trio, [0, 0, 255]);
}

#[test]
fn sparse_copies_reuse_their_source_record() {
    let table = open(&sparse_builder(), &SPARSE);
    let rows = table
        .decode_all(|id, record| Ok((id, record.string(1, 0)?, record.i32(2, 0)?)))
        .expect("decode must succeed");

    assert_eq!(rows[&900], (900, String::from("hi"), -3));
}

#[test]
fn variable_length_records_do_not_shift_later_columns() {
    // The three records have different lengths because their inline strings
    // differ; a fixed-stride reader would misalign every column after the text.
    let table = open(&sparse_builder(), &SPARSE);
    let ratios = table
        .decode_all(|id, record| Ok((id, record.f32(4, 0)?)))
        .expect("decode must succeed");

    assert_eq!(ratios[&100].1, 1.5);
    assert_eq!(ratios[&101].1, -0.5);
    assert_eq!(ratios[&102].1, 0.0);
}

// ---------------------------------------------------------------------------
// Validation failures.
// ---------------------------------------------------------------------------

#[test]
fn a_foreign_container_signature_is_rejected() {
    let mut builder = mixed_builder();
    builder.signature = u32::from_le_bytes(*b"WDC2");
    let error = Db2File::parse(builder.build()).expect_err("must not parse");
    assert!(
        matches!(error, Db2Error::UnsupportedSignature { .. }),
        "unexpected error: {error}"
    );
}

#[test]
fn a_different_layout_hash_is_reported_instead_of_decoded() {
    let mut builder = mixed_builder();
    builder.layout_hash = 0x0BAD_0BAD;
    let file = Db2File::parse(builder.build()).expect("container must parse");
    let error = Db2Table::from_file(file, &MIXED, "enUS").expect_err("must not load");
    match error {
        Db2Error::LayoutHashMismatch {
            expected, actual, ..
        } => {
            assert_eq!(expected, MIXED.layout_hash);
            assert_eq!(actual, 0x0BAD_0BAD);
        }
        other => panic!("unexpected error: {other}"),
    }
}

#[test]
fn a_column_count_that_does_not_match_the_metadata_is_reported() {
    let file = Db2File::parse(mixed_builder().build()).expect("container must parse");
    // KEYED declares two columns; the container carries eight.
    let error = Db2Table::from_file(file, &KEYED, "enUS").expect_err("must not load");
    assert!(
        matches!(
            error,
            Db2Error::LayoutHashMismatch { .. } | Db2Error::FieldCountMismatch { .. }
        ),
        "unexpected error: {error}"
    );
}

#[test]
fn a_truncated_container_names_the_block_that_ran_out() {
    let mut bytes = mixed_builder().build();
    bytes.truncate(90);
    let error = Db2File::parse(bytes).expect_err("must not parse");
    match error {
        Db2Error::Truncated { stage, .. } => assert_eq!(stage, "section headers"),
        other => panic!("unexpected error: {other}"),
    }
}

const LOCALIZED_FIELDS: &[Db2FieldMeta] = &[
    Db2FieldMeta::new("Name", Localized, 1, false),
    Db2FieldMeta::new("Value", Int, 1, false),
];

const LOCALIZED: Db2TableMeta = Db2TableMeta {
    name: "Localized",
    file_name: "Localized.db2",
    file_data_id: 5,
    layout_hash: 0xAAAA_0005,
    index_field: -1,
    parent_index_field: -1,
    file_field_count: 2,
    fields: LOCALIZED_FIELDS,
};

fn localized_builder() -> Wdc3Builder {
    let mut builder = Wdc3Builder::new(LOCALIZED.layout_hash);
    builder.record_size = 8;
    // Only the first locale bit is set, as a single-locale client file has.
    builder.locale = 1;
    builder.field_entries = vec![(0, 0), (0, 4)];
    builder.columns = vec![Column::uncompressed(0, 32), Column::uncompressed(32, 32)];
    builder.sections = vec![SectionDef {
        records: vec![
            RecordDef::new(vec![0, 0, 0, 0, 1, 0, 0, 0]).with_string(0, "Stormwind"),
            RecordDef::new(vec![0, 0, 0, 0, 2, 0, 0, 0]).with_string(0, "Orgrimmar"),
        ],
        ids: vec![1, 2],
        ..SectionDef::default()
    }];
    builder
}

#[test]
fn localized_tables_load_for_the_locale_the_file_carries() {
    let table = open(&localized_builder(), &LOCALIZED);
    let rows = table
        .decode_all(|id, record| Ok((id, record.string(0, 0)?, record.u32(1, 0)?)))
        .expect("decode must succeed");

    assert_eq!(rows[&1], (1, String::from("Stormwind"), 1));
    assert_eq!(rows[&2], (2, String::from("Orgrimmar"), 2));
}

#[test]
fn localized_tables_refuse_a_locale_the_file_does_not_carry() {
    let file = Db2File::parse(localized_builder().build()).expect("container must parse");
    let error = Db2Table::from_file(file, &LOCALIZED, "deDE").expect_err("must not load");
    match error {
        Db2Error::LocaleUnavailable {
            requested, mask, ..
        } => {
            assert_eq!(requested, "deDE");
            assert_eq!(mask, 1);
        }
        other => panic!("unexpected error: {other}"),
    }
}
