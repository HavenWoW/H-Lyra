//! Validation against a real client data directory.
//!
//! These tests need actual DB2 files, so they are skipped unless the data
//! directory is provided:
//!
//! ```text
//! LYRA_DB2_DIR=<path to the locale directory> cargo test --test db2_client_data
//! LYRA_DB2_LOCALE=deDE                        (optional, defaults to enUS)
//! ```
//!
//! They assert invariants rather than specific values, so they hold for any
//! client build and for modified or custom DB2 files.

use std::collections::HashMap;
use std::path::PathBuf;

use lyra_lib::db2::decode::Db2Table;
use lyra_lib::db2::meta::{Db2TableMeta, SUPPORTED_TABLES};
use lyra_lib::db2::{mapping, structures};

/// Reads the configured data directory, or `None` when the tests should skip.
fn client_data() -> Option<(PathBuf, String)> {
    let dir = std::env::var("LYRA_DB2_DIR").ok()?;
    let path = PathBuf::from(dir);
    if !path.is_dir() {
        panic!(
            "LYRA_DB2_DIR does not point at a directory: {}",
            path.display()
        );
    }
    let locale = std::env::var("LYRA_DB2_LOCALE").unwrap_or_else(|_| String::from("enUS"));
    Some((path, locale))
}

fn open(meta: &'static Db2TableMeta) -> Option<Db2Table> {
    let (dir, locale) = client_data()?;
    let path = dir.join(meta.file_name);
    if !path.is_file() {
        return None;
    }
    match Db2Table::open(&path, meta, &locale) {
        Ok(table) => Some(table),
        Err(error) => panic!("{} failed to load: {error}", meta.file_name),
    }
}

#[test]
fn every_registered_table_opens_and_decodes() {
    if client_data().is_none() {
        eprintln!("skipped: LYRA_DB2_DIR is not set");
        return;
    }

    let mut opened = 0;
    for meta in SUPPORTED_TABLES {
        let Some(table) = open(meta) else {
            continue;
        };
        opened += 1;

        // Every available record must decode without error, and its id must be
        // inside the range the header advertises.
        let ids = table
            .decode_all(|id, _| Ok(id))
            .unwrap_or_else(|error| panic!("{}: decode failed: {error}", meta.file_name));

        assert!(
            !ids.is_empty(),
            "{}: decoded no records at all",
            meta.file_name
        );

        let available = table.record_count() - table.encrypted_records();
        let expected_max = available as usize + table.copy_records().len();
        assert!(
            ids.len() <= expected_max,
            "{}: decoded {} rows from {} available records and {} copies",
            meta.file_name,
            ids.len(),
            available,
            table.copy_records().len()
        );
    }

    assert!(
        opened > 0,
        "no registered table files found in LYRA_DB2_DIR"
    );
}

#[test]
fn item_sparse_decodes_names_for_effectively_every_record() {
    let Some(table) = open(&lyra_lib::db2::meta::tables::ITEM_SPARSE) else {
        eprintln!("skipped: ItemSparse.db2 not available");
        return;
    };

    let rows = mapping::item_sparse::decode(&table).expect("ItemSparse must decode");
    assert!(!rows.is_empty());

    // A misaligned sparse walk shows up as empty or garbled names, because the
    // inline strings would be read from the wrong offsets.
    let named = rows.values().filter(|row| !row.display.is_empty()).count();
    let ratio = named as f64 / rows.len() as f64;
    assert!(
        ratio > 0.99,
        "only {named} of {} records carry a name ({ratio:.4})",
        rows.len()
    );

    // Quality, inventory type and bonding are small enumerations; values far
    // outside their range mean the record walk drifted.
    for row in rows.values() {
        assert!(
            row.overall_quality_id <= 10,
            "item {}: implausible quality {}",
            row.id,
            row.overall_quality_id
        );
        assert!(
            row.inventory_type <= 32,
            "item {}: implausible inventory type {}",
            row.id,
            row.inventory_type
        );
        assert!(
            row.bonding <= 8,
            "item {}: implausible bonding {}",
            row.id,
            row.bonding
        );
    }
}

#[test]
fn item_and_item_sparse_describe_the_same_catalog() {
    let (Some(item_table), Some(sparse_table)) = (
        open(&lyra_lib::db2::meta::tables::ITEM),
        open(&lyra_lib::db2::meta::tables::ITEM_SPARSE),
    ) else {
        eprintln!("skipped: Item.db2 or ItemSparse.db2 not available");
        return;
    };

    let items = mapping::item::decode(&item_table).expect("Item must decode");
    let sparse = mapping::item_sparse::decode(&sparse_table).expect("ItemSparse must decode");

    // ItemSparse is the extended half of Item, so almost every sparse row has a
    // matching basic row.
    let matched = sparse.keys().filter(|id| items.contains_key(id)).count();
    let ratio = matched as f64 / sparse.len() as f64;
    assert!(
        ratio > 0.95,
        "only {matched} of {} ItemSparse rows have an Item row ({ratio:.4})",
        sparse.len()
    );

    // Item class ids are a small enumeration.
    for item in items.values() {
        assert!(
            item.class_id <= 20,
            "item {}: implausible class {}",
            item.id,
            item.class_id
        );
    }
}

#[test]
fn item_effect_parents_resolve_to_items() {
    let (Some(effect_table), Some(item_table)) = (
        open(&lyra_lib::db2::meta::tables::ITEM_EFFECT),
        open(&lyra_lib::db2::meta::tables::ITEM),
    ) else {
        eprintln!("skipped: ItemEffect.db2 or Item.db2 not available");
        return;
    };

    let effects = mapping::item_effect::decode(&effect_table).expect("ItemEffect must decode");
    let items = mapping::item::decode(&item_table).expect("Item must decode");

    let parented: Vec<&structures::ItemEffectRecord> = effects
        .values()
        .filter(|effect| effect.parent_item_id != 0)
        .collect();

    assert!(
        !parented.is_empty(),
        "no ItemEffect row received a parent from the parent lookup"
    );

    let resolved = parented
        .iter()
        .filter(|effect| items.contains_key(&effect.parent_item_id))
        .count();
    let ratio = resolved as f64 / parented.len() as f64;
    assert!(
        ratio > 0.99,
        "only {resolved} of {} parented effects point at a known item ({ratio:.4})",
        parented.len()
    );

    // SpellCategoryID and ChrSpecializationID are pallet columns whose stored
    // values carry unrelated high bits; a missing truncation to the declared
    // width would push them far out of range.
    for effect in effects.values() {
        assert!(
            effect.chr_specialization_id < 4096,
            "effect {}: implausible specialization {}",
            effect.id,
            effect.chr_specialization_id
        );
    }
}

#[test]
fn faction_relationships_resolve() {
    let Some(faction_table) = open(&lyra_lib::db2::meta::tables::FACTION) else {
        eprintln!("skipped: Faction.db2 not available");
        return;
    };

    let factions = mapping::faction::decode(&faction_table).expect("Faction must decode");
    assert!(!factions.is_empty());

    // Faction stores its id inside the record; a wrong id column would produce
    // wildly scattered keys and unnamed rows.
    let named = factions.values().filter(|row| !row.name.is_empty()).count();
    assert!(
        named as f64 / factions.len() as f64 > 0.95,
        "only {named} of {} factions carry a name",
        factions.len()
    );

    // Client data does carry the occasional reference to a faction that was
    // removed, so this checks that parents resolve overwhelmingly rather than
    // universally; a wrong column would break nearly all of them.
    let with_parent = factions
        .values()
        .filter(|faction| faction.parent_faction_id != 0)
        .count();
    let resolved_parents = factions
        .values()
        .filter(|faction| {
            faction.parent_faction_id != 0
                && factions.contains_key(&(faction.parent_faction_id as u32))
        })
        .count();
    assert!(
        with_parent > 0 && resolved_parents as f64 / with_parent as f64 > 0.99,
        "only {resolved_parents} of {with_parent} parent factions resolve"
    );

    let Some(template_table) = open(&lyra_lib::db2::meta::tables::FACTION_TEMPLATE) else {
        return;
    };
    let templates =
        mapping::faction_template::decode(&template_table).expect("FactionTemplate must decode");
    let resolved = templates
        .values()
        .filter(|template| {
            template.faction == 0 || factions.contains_key(&(template.faction as u32))
        })
        .count();
    assert!(
        resolved as f64 / templates.len() as f64 > 0.99,
        "only {resolved} of {} faction templates reference a known faction",
        templates.len()
    );
}

#[test]
fn emote_text_rows_carry_names_and_plausible_emote_ids() {
    let Some(table) = open(&lyra_lib::db2::meta::tables::EMOTES_TEXT) else {
        eprintln!("skipped: EmotesText.db2 not available");
        return;
    };

    let rows = mapping::emotes_text::decode(&table).expect("EmotesText must decode");
    assert!(!rows.is_empty());

    for row in rows.values() {
        assert!(!row.name.is_empty(), "text emote {} has no name", row.id);
        assert!(
            row.name.chars().all(|c| c.is_ascii_graphic()),
            "text emote {}: implausible name {:?}",
            row.id,
            row.name
        );
    }

    // The emote column sits in the packed block; ignoring the packed data
    // offset would read the string offset's low bits instead and push these
    // values far out of range.
    let Some(emotes_table) = open(&lyra_lib::db2::meta::tables::EMOTES) else {
        return;
    };
    let emotes = mapping::emotes::decode(&emotes_table).expect("Emotes must decode");
    let resolved = rows
        .values()
        .filter(|row| row.emote_id == 0 || emotes.contains_key(&(row.emote_id as u32)))
        .count();
    assert!(
        resolved as f64 / rows.len() as f64 > 0.99,
        "only {resolved} of {} text emotes reference a known emote",
        rows.len()
    );
}

#[test]
fn table_metadata_matches_every_present_client_file() {
    let Some((dir, _)) = client_data() else {
        eprintln!("skipped: LYRA_DB2_DIR is not set");
        return;
    };

    let mut checked: HashMap<&str, u32> = HashMap::new();
    for meta in SUPPORTED_TABLES {
        let path = dir.join(meta.file_name);
        if !path.is_file() {
            continue;
        }
        // Db2Table::open validates the layout hash and the column count, so a
        // successful open already proves the metadata matches the file.
        let table = open(meta).expect("file exists so the table must open");
        checked.insert(meta.name, table.record_count());
    }

    assert!(
        !checked.is_empty(),
        "no registered table files found in LYRA_DB2_DIR"
    );
}
