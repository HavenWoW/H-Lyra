//! Resident DB2 client base overlay.
//!
//! Locates the client data directory, loads every registered table through the
//! metadata-driven decoder, and hands out immutable snapshots. Nothing here
//! knows about the binary format; every value comes from the user's own DB2
//! files, so modified or custom client data is picked up automatically.

pub mod config;
pub mod discovery;

use std::collections::HashMap;
use std::path::Path;

use parking_lot::RwLock;

use crate::db2::decode::Db2Table;
use crate::db2::format::Db2Error;
use crate::db2::mapping;
use crate::db2::meta::{Db2TableMeta, SUPPORTED_TABLES};
use crate::db2::structures::{
    EmoteRecord, EmotesTextRecord, FactionRecord, FactionTemplateRecord, ItemEffectRecord,
    ItemRecord, ItemSparseRecord,
};

pub use config::{Db2Config, Db2TableStatus};

/// The decoded client base for every registered table.
#[derive(Default)]
struct Db2Cache {
    items: HashMap<u32, ItemRecord>,
    sparse: HashMap<u32, ItemSparseRecord>,
    effects: HashMap<u32, ItemEffectRecord>,
    factions: HashMap<u32, FactionRecord>,
    faction_templates: HashMap<u32, FactionTemplateRecord>,
    emotes: HashMap<u32, EmoteRecord>,
    emotes_text: HashMap<u32, EmotesTextRecord>,
}

impl Db2Cache {
    fn clear(&mut self) {
        *self = Self::default();
    }
}

pub struct Db2CatalogService {
    config: RwLock<Db2Config>,
    cache: RwLock<Db2Cache>,
}

impl Default for Db2CatalogService {
    fn default() -> Self {
        Self::new()
    }
}

impl Db2CatalogService {
    pub fn new() -> Self {
        let service = Self {
            config: RwLock::new(Db2Config::default()),
            cache: RwLock::new(Db2Cache::default()),
        };

        if let Some(saved) = config::load_persisted() {
            service.configure(saved.data_dir, saved.locale);
        }

        service
    }

    pub fn get_config(&self) -> Db2Config {
        self.config.read().clone()
    }

    /// Points the catalog at a client data directory and reloads every table.
    pub fn configure(&self, data_dir: String, locale: String) -> Db2Config {
        {
            let mut config = self.config.write();
            config.data_dir = data_dir.clone();
            config.locale = locale.clone();
            config.reset_load_state();
        }
        self.cache.write().clear();

        let Some(directory) = discovery::locate(&data_dir, &locale) else {
            let mut config = self.config.write();
            config.status_message = format!("No DB2 files found in \"{data_dir}\"");
            return config.clone();
        };

        let mut cache = Db2Cache::default();
        let mut statuses = Vec::with_capacity(SUPPORTED_TABLES.len());
        let mut failures: Vec<String> = Vec::new();

        for table in SUPPORTED_TABLES {
            let status = match directory.file_for(table.name) {
                Some(path) => load_table(table, path, &locale, &mut cache),
                None => Db2TableStatus {
                    table: table.name.to_string(),
                    file_name: table.file_name.to_string(),
                    found: false,
                    loaded: false,
                    records: 0,
                    message: String::from("file not present"),
                },
            };
            if status.found && !status.loaded {
                failures.push(format!("{}: {}", table.file_name, status.message));
            }
            statuses.push(status);
        }

        let loaded_tables = statuses.iter().filter(|status| status.loaded).count();
        let total_records: u32 = statuses.iter().map(|status| status.records).sum();

        *self.cache.write() = cache;

        let mut config = self.config.write();
        config.detected_path = Some(directory.path.to_string_lossy().into_owned());
        config.apply_table_status(statuses);
        config.status_message = if failures.is_empty() {
            format!(
                "Loaded {loaded_tables} of {} DB2 tables ({total_records} records)",
                SUPPORTED_TABLES.len()
            )
        } else {
            format!("DB2 load issues: {}", failures.join("; "))
        };

        let snapshot = config.clone();
        drop(config);
        config::persist(&snapshot);
        snapshot
    }

    pub fn db2_items_snapshot(&self) -> HashMap<u32, ItemRecord> {
        self.cache.read().items.clone()
    }

    pub fn db2_sparse_snapshot(&self) -> HashMap<u32, ItemSparseRecord> {
        self.cache.read().sparse.clone()
    }

    pub fn db2_effects_snapshot(&self) -> HashMap<u32, ItemEffectRecord> {
        self.cache.read().effects.clone()
    }

    pub fn db2_factions_snapshot(&self) -> HashMap<u32, FactionRecord> {
        self.cache.read().factions.clone()
    }

    pub fn db2_faction_templates_snapshot(&self) -> HashMap<u32, FactionTemplateRecord> {
        self.cache.read().faction_templates.clone()
    }

    pub fn db2_emotes_snapshot(&self) -> HashMap<u32, EmoteRecord> {
        self.cache.read().emotes.clone()
    }

    pub fn db2_emotes_text_snapshot(&self) -> HashMap<u32, EmotesTextRecord> {
        self.cache.read().emotes_text.clone()
    }

    pub fn is_db2_loaded(&self) -> bool {
        let cache = self.cache.read();
        !cache.sparse.is_empty() || !cache.factions.is_empty()
    }
}

/// Opens one table and stores its decoded rows in the cache.
fn load_table(
    meta: &'static Db2TableMeta,
    path: &Path,
    locale: &str,
    cache: &mut Db2Cache,
) -> Db2TableStatus {
    let mut status = Db2TableStatus {
        table: meta.name.to_string(),
        file_name: meta.file_name.to_string(),
        found: true,
        loaded: false,
        records: 0,
        message: String::new(),
    };

    let table = match Db2Table::open(path, meta, locale) {
        Ok(table) => table,
        Err(error) => {
            status.found = !error.is_file_not_found();
            status.message = error.to_string();
            return status;
        }
    };

    let outcome = decode_into(meta, &table, cache);
    match outcome {
        Ok(records) => {
            status.loaded = true;
            status.records = records;
            let stats = table.stats(records);
            if stats.encrypted_sections > 0 {
                status.message = format!(
                    "{} encrypted section(s) skipped, {} record(s) unavailable",
                    stats.encrypted_sections, stats.encrypted_records
                );
            }
        }
        Err(error) => status.message = error.to_string(),
    }

    status
}

/// Routes a loaded table to its domain mapper.
fn decode_into(
    meta: &'static Db2TableMeta,
    table: &Db2Table,
    cache: &mut Db2Cache,
) -> Result<u32, Db2Error> {
    let records = match meta.name {
        "Item" => {
            cache.items = mapping::item::decode(table)?;
            cache.items.len()
        }
        "ItemSparse" => {
            cache.sparse = mapping::item_sparse::decode(table)?;
            cache.sparse.len()
        }
        "ItemEffect" => {
            cache.effects = mapping::item_effect::decode(table)?;
            cache.effects.len()
        }
        "Faction" => {
            cache.factions = mapping::faction::decode(table)?;
            cache.factions.len()
        }
        "FactionTemplate" => {
            cache.faction_templates = mapping::faction_template::decode(table)?;
            cache.faction_templates.len()
        }
        "Emotes" => {
            cache.emotes = mapping::emotes::decode(table)?;
            cache.emotes.len()
        }
        "EmotesText" => {
            cache.emotes_text = mapping::emotes_text::decode(table)?;
            cache.emotes_text.len()
        }
        // A registered table with no mapper still validates and decodes, it
        // just has nowhere to be stored yet.
        _ => 0,
    };
    Ok(records as u32)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_registered_table_has_a_mapper() {
        let mut cache = Db2Cache::default();
        for table in SUPPORTED_TABLES {
            // The router matches on the table name; an unrouted table would
            // silently decode into nothing.
            let routed = matches!(
                table.name,
                "Item"
                    | "ItemSparse"
                    | "ItemEffect"
                    | "Faction"
                    | "FactionTemplate"
                    | "Emotes"
                    | "EmotesText"
            );
            assert!(routed, "{} has no domain mapper", table.name);
        }
        cache.clear();
    }
}
