//! DB2 catalog configuration and its on-disk persistence.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Per-table outcome of the last catalog load.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Db2TableStatus {
    pub table: String,
    pub file_name: String,
    pub found: bool,
    pub loaded: bool,
    pub records: u32,
    /// Empty when the table loaded cleanly.
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Db2Config {
    pub data_dir: String,
    pub locale: String,
    pub detected_path: Option<String>,
    pub item_db2_found: bool,
    pub item_sparse_db2_found: bool,
    #[serde(default)]
    pub item_effect_db2_found: bool,
    #[serde(default)]
    pub faction_db2_found: bool,
    #[serde(default)]
    pub emotes_db2_found: bool,
    #[serde(default)]
    pub item_db2_parse_ok: bool,
    #[serde(default)]
    pub item_sparse_db2_parse_ok: bool,
    #[serde(default)]
    pub item_effect_db2_parse_ok: bool,
    #[serde(default)]
    pub faction_db2_parse_ok: bool,
    #[serde(default)]
    pub emotes_db2_parse_ok: bool,
    /// One entry per registered table, in registry order.
    #[serde(default)]
    pub tables: Vec<Db2TableStatus>,
    pub status_message: String,
}

impl Default for Db2Config {
    fn default() -> Self {
        Self {
            data_dir: String::from(".\\ClientData"),
            locale: String::from("enUS"),
            detected_path: None,
            item_db2_found: false,
            item_sparse_db2_found: false,
            item_effect_db2_found: false,
            faction_db2_found: false,
            emotes_db2_found: false,
            item_db2_parse_ok: false,
            item_sparse_db2_parse_ok: false,
            item_effect_db2_parse_ok: false,
            faction_db2_parse_ok: false,
            emotes_db2_parse_ok: false,
            tables: Vec::new(),
            status_message: String::from("Not configured"),
        }
    }
}

impl Db2Config {
    /// Clears everything derived from a previous load, keeping the user's
    /// directory and locale choice.
    pub fn reset_load_state(&mut self) {
        self.detected_path = None;
        self.item_db2_found = false;
        self.item_sparse_db2_found = false;
        self.item_effect_db2_found = false;
        self.faction_db2_found = false;
        self.emotes_db2_found = false;
        self.item_db2_parse_ok = false;
        self.item_sparse_db2_parse_ok = false;
        self.item_effect_db2_parse_ok = false;
        self.faction_db2_parse_ok = false;
        self.emotes_db2_parse_ok = false;
        self.tables.clear();
        self.status_message.clear();
    }

    /// Mirrors the per-table results onto the flat flags the interface reads.
    pub fn apply_table_status(&mut self, statuses: Vec<Db2TableStatus>) {
        for status in &statuses {
            match status.table.as_str() {
                "Item" => {
                    self.item_db2_found = status.found;
                    self.item_db2_parse_ok = status.loaded;
                }
                "ItemSparse" => {
                    self.item_sparse_db2_found = status.found;
                    self.item_sparse_db2_parse_ok = status.loaded;
                }
                "ItemEffect" => {
                    self.item_effect_db2_found = status.found;
                    self.item_effect_db2_parse_ok = status.loaded;
                }
                "Faction" => {
                    self.faction_db2_found = status.found;
                    self.faction_db2_parse_ok = status.loaded;
                }
                "Emotes" | "EmotesText" => {
                    self.emotes_db2_found |= status.found;
                    self.emotes_db2_parse_ok |= status.loaded;
                }
                _ => {}
            }
        }
        self.tables = statuses;
    }
}

/// Location of the persisted configuration.
pub fn config_path() -> PathBuf {
    if let Ok(appdata) = std::env::var("APPDATA") {
        let dir = Path::new(&appdata).join("Lyra");
        let _ = std::fs::create_dir_all(&dir);
        dir.join("db2_config.json")
    } else {
        PathBuf::from("db2_config.json")
    }
}

pub fn load_persisted() -> Option<Db2Config> {
    let path = config_path();
    let data = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&data).ok()
}

pub fn persist(config: &Db2Config) {
    if let Ok(json) = serde_json::to_string_pretty(config) {
        let _ = std::fs::write(config_path(), json);
    }
}
