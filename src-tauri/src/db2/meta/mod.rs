//! Structural table metadata.
//!
//! Mirrors the shape of HavenCore's `DB2Meta` (physical structure) combined
//! with the column names and signedness of its `DB2LoadInfo` counterpart.
//!
//! This layer describes *schema only*: column types, array sizes, signedness,
//! which column holds the record id, which column is filled from the parent
//! lookup, the expected layout hash and the client file id. It never contains
//! record values, record counts or id ranges. Every value Lyra displays is
//! decoded at run time from the DB2 files the user selected, so modified or
//! custom client data is reflected automatically.

pub mod locale;
pub mod tables;

pub use locale::{describe_locale_mask, locale_index};
pub use tables::{table_by_name, SUPPORTED_TABLES};

/// Logical type of a column, matching HavenCore's `DBCFormer`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FieldType {
    /// `FT_BYTE`
    Byte,
    /// `FT_SHORT`
    Short,
    /// `FT_INT`
    Int,
    /// `FT_LONG`
    Long,
    /// `FT_FLOAT`
    Float,
    /// `FT_STRING` — localized; one value per locale in the client data.
    String,
    /// `FT_STRING_NOT_LOCALIZED`
    StringNotLocalized,
}

impl FieldType {
    /// Width of one element as the loader materialises it.
    ///
    /// This is the width that drives array strides for uncompressed columns and
    /// the truncation of decoded values, exactly as HavenCore's
    /// `RecordGetVarInt<T>` does through `sizeof(T)`. String columns store a
    /// four byte offset in the record.
    pub fn byte_width(self) -> usize {
        match self {
            FieldType::Byte => 1,
            FieldType::Short => 2,
            FieldType::Int | FieldType::Float => 4,
            FieldType::Long => 8,
            FieldType::String | FieldType::StringNotLocalized => 4,
        }
    }

    pub fn is_string(self) -> bool {
        matches!(self, FieldType::String | FieldType::StringNotLocalized)
    }

    /// True when the client stores one value per locale for this column.
    pub fn is_localized(self) -> bool {
        matches!(self, FieldType::String)
    }
}

/// One column of a table.
#[derive(Debug, Clone, Copy)]
pub struct Db2FieldMeta {
    /// Column name as HavenCore's load info spells it. Array columns carry the
    /// base name; individual elements are suffixed with a one-based index.
    pub name: &'static str,
    pub ty: FieldType,
    pub array_size: u8,
    /// Effective signedness used when decoding.
    ///
    /// This is the value HavenCore's load info declares, which is
    /// `DB2Meta::IsSignedField`: always false for strings, floats, the index
    /// column and the parent column, and the declared signedness otherwise.
    pub signed: bool,
}

impl Db2FieldMeta {
    pub const fn new(name: &'static str, ty: FieldType, array_size: u8, signed: bool) -> Self {
        Self {
            name,
            ty,
            array_size,
            signed,
        }
    }
}

/// Structural definition of one DB2 table.
#[derive(Debug, Clone, Copy)]
pub struct Db2TableMeta {
    /// Canonical table name, used in diagnostics.
    pub name: &'static str,
    /// Client file name to look for on disk.
    pub file_name: &'static str,
    /// Client file id, the stable identifier for the table's physical file.
    pub file_data_id: u32,
    /// Layout hash the client file must carry for this definition to apply.
    pub layout_hash: u32,
    /// Column that holds the record id, or `-1` when ids come from the id table.
    pub index_field: i32,
    /// Column filled from the parent lookup, or `-1` when the table has none.
    pub parent_index_field: i32,
    /// Number of columns physically present in the file. Columns beyond this
    /// exist only in the loaded structure; today that is the appended parent
    /// column.
    pub file_field_count: u32,
    pub fields: &'static [Db2FieldMeta],
}

impl Db2TableMeta {
    /// True when the record id is decoded from a column rather than the id table.
    pub fn has_index_in_data(&self) -> bool {
        self.index_field != -1
    }

    /// Index of the id column, or zero when the id lives in the id table.
    pub fn index_field_index(&self) -> usize {
        if self.index_field < 0 {
            0
        } else {
            self.index_field as usize
        }
    }

    pub fn field_count(&self) -> usize {
        self.fields.len()
    }

    pub fn field(&self, index: usize) -> Option<&'static Db2FieldMeta> {
        self.fields.get(index)
    }

    /// True when the column exists in the loaded structure but not in the file.
    pub fn is_appended_field(&self, index: usize) -> bool {
        index >= self.file_field_count as usize
    }

    /// True when the column is filled from the file's parent lookup.
    pub fn is_parent_field(&self, index: usize) -> bool {
        self.parent_index_field >= 0 && self.parent_index_field as usize == index
    }

    /// Total number of scalar values across all columns, arrays expanded.
    pub fn value_count(&self) -> usize {
        self.fields
            .iter()
            .map(|field| field.array_size as usize)
            .sum()
    }

    /// True when any column stores a localized string.
    pub fn has_localized_strings(&self) -> bool {
        self.fields.iter().any(|field| field.ty.is_localized())
    }

    /// Name of one scalar value, matching the hotfix column naming: arrays get
    /// a one-based suffix, scalars keep the bare name.
    pub fn value_name(&self, field: usize, array_index: usize) -> Option<String> {
        let meta = self.field(field)?;
        if meta.array_size <= 1 {
            Some(meta.name.to_string())
        } else {
            Some(format!("{}{}", meta.name, array_index + 1))
        }
    }

    /// Resolves a load-info style column name to a `(field, array index)` pair.
    pub fn field_index_by_name(&self, name: &str) -> Option<(usize, usize)> {
        for (index, field) in self.fields.iter().enumerate() {
            for array_index in 0..field.array_size as usize {
                let candidate = if field.array_size <= 1 {
                    field.name.to_string()
                } else {
                    format!("{}{}", field.name, array_index + 1)
                };
                if candidate.eq_ignore_ascii_case(name) {
                    return Some((index, array_index));
                }
            }
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_registered_table_is_internally_consistent() {
        for table in SUPPORTED_TABLES {
            assert!(
                table.file_field_count as usize <= table.field_count(),
                "{}: file field count exceeds declared columns",
                table.name
            );
            // At most one column may be appended, and only for the parent.
            let appended = table.field_count() - table.file_field_count as usize;
            assert!(appended <= 1, "{}: too many appended columns", table.name);
            if appended == 1 {
                assert_eq!(
                    table.parent_index_field, table.file_field_count as i32,
                    "{}: appended column must be the parent column",
                    table.name
                );
            }
            if table.has_index_in_data() {
                let index = table.index_field_index();
                let field = table.field(index).expect("index column must exist");
                assert_eq!(
                    field.array_size, 1,
                    "{}: id column must be scalar",
                    table.name
                );
                assert!(!field.signed, "{}: id column must be unsigned", table.name);
            }
            for field in table.fields {
                assert!(field.array_size >= 1, "{}: zero-sized array", table.name);
                if field.ty.is_string() || field.ty == FieldType::Float {
                    assert!(
                        !field.signed,
                        "{} {}: strings and floats are never signed",
                        table.name, field.name
                    );
                }
            }
        }
    }

    #[test]
    fn array_columns_expose_suffixed_value_names() {
        let sparse = table_by_name("ItemSparse").expect("ItemSparse must be registered");
        let (field, array_index) = sparse
            .field_index_by_name("StatPercentEditor3")
            .expect("array element must resolve");
        assert_eq!(array_index, 2);
        assert_eq!(
            sparse.value_name(field, 2).as_deref(),
            Some("StatPercentEditor3")
        );
        assert_eq!(
            sparse.field_index_by_name("Display").map(|pair| pair.0),
            Some(5)
        );
    }

    #[test]
    fn item_effect_declares_an_appended_parent_column() {
        let effect = table_by_name("ItemEffect").expect("ItemEffect must be registered");
        assert_eq!(effect.file_field_count, 8);
        assert_eq!(effect.field_count(), 9);
        assert!(effect.is_appended_field(8));
        assert!(effect.is_parent_field(8));
        assert_eq!(effect.field(8).map(|f| f.name), Some("ParentItemID"));
    }
}
