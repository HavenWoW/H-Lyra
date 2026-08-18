//! Domain mapping: decoded records to Lyra's typed structures.
//!
//! These modules contain no binary logic. They name the columns they read and
//! copy values into the domain structs; everything about the physical layout
//! lives in the format and decode layers.

pub mod emotes;
pub mod emotes_text;
pub mod faction;
pub mod faction_template;
pub mod item;
pub mod item_effect;
pub mod item_sparse;

/// Declares column index constants and a test that pins each one to the column
/// name the table metadata declares, so a metadata edit cannot silently shift a
/// mapper onto the wrong column.
macro_rules! column_indices {
    ($table:path; $($konst:ident = $index:expr => $name:literal),+ $(,)?) => {
        $(pub const $konst: usize = $index;)+

        #[cfg(test)]
        mod column_index_checks {
            use super::*;

            #[test]
            fn column_indices_match_table_metadata() {
                $(
                    assert_eq!(
                        $table.field($konst).map(|column| column.name),
                        Some($name),
                        concat!("column index for ", stringify!($konst), " drifted")
                    );
                )+
            }
        }
    };
}

pub(crate) use column_indices;
