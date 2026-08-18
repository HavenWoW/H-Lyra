pub mod db;
pub mod db2;
pub mod generators;
pub mod schema;

use std::sync::Arc;
use tauri::State;
use crate::db::executor::QueryExecutor;
use crate::db::models::{DbConfig, QueryResult, TableColumnInfo, TableSummary};
use crate::db::pool::DatabaseManager;
use crate::db2::catalog::{Db2CatalogService, Db2Config};
use crate::db2::repository::{EffectiveCatalogStats, EffectiveItemRepository};
use crate::db2::structures::FactionRecord;
use crate::generators::migration::MigrationGenerator;
use crate::generators::smart_ai_sql::{SmartAiSqlGenerator, SmartScriptRow};
use crate::schema::definitions::{
    BfaDefinitions, SmartActionDefinition, SmartEventDefinition, SmartTargetDefinition,
};

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<DatabaseManager>,
    pub db2: Arc<Db2CatalogService>,
    pub item_repo: Arc<EffectiveItemRepository>,
}

// -----------------------------------------------------------------------------
// Tauri Commands
// -----------------------------------------------------------------------------

#[tauri::command]
fn get_db2_config(state: State<'_, AppState>) -> Db2Config {
    state.db2.get_config()
}

#[tauri::command]
async fn set_db2_config(
    state: State<'_, AppState>,
    data_dir: String,
    locale: String,
) -> Result<Db2Config, String> {
    let db2 = state.db2.clone();
    tokio::task::spawn_blocking(move || {
        db2.configure(data_dir, locale)
    })
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_catalog_stats(
    state: State<'_, AppState>,
    sql_hotfix_ids: Vec<u32>,
) -> Result<EffectiveCatalogStats, String> {
    Ok(state.item_repo.get_stats_async(sql_hotfix_ids).await)
}

#[tauri::command]
async fn search_effective_items(
    state: State<'_, AppState>,
    query: crate::db2::structures::ItemSearchQuery,
) -> Result<Vec<crate::db2::structures::EffectiveItemSummary>, String> {
    Ok(state.item_repo.search(query).await)
}

#[tauri::command]
async fn get_effective_item(
    state: State<'_, AppState>,
    item_id: u32,
) -> Result<Option<crate::db2::structures::EffectiveItem>, String> {
    Ok(state.item_repo.get_item(item_id).await)
}

#[tauri::command]
async fn get_item_effects(
    state: State<'_, AppState>,
    item_id: u32,
) -> Result<Vec<crate::db2::structures::EffectiveItemEffect>, String> {
    Ok(state.item_repo.get_item_effects(item_id).await)
}

#[tauri::command]
async fn get_next_effect_id(state: State<'_, AppState>) -> Result<u32, String> {
    Ok(state.item_repo.next_effect_id().await)
}

#[tauri::command]
async fn search_effective_factions(
    state: State<'_, AppState>,
    term: String,
) -> Result<Vec<FactionRecord>, String> {
    let term = term.trim().to_lowercase();
    let is_num = term.parse::<u32>().ok();

    // 1. Fetch DB2 base snapshot
    let db2_factions = state.db2.db2_factions_snapshot();

    // 2. Fetch SQL hotfix overrides if available
    let mut merged = db2_factions;
    let sql = "SELECT ID, Name, Description, ReputationIndex, ParentFactionID, Expansion, Flags FROM faction ORDER BY ID ASC;";
    let sql_res = QueryExecutor::execute_query(&state.db, "hotfixes", sql).await;
    if sql_res.success {
        for row in sql_res.rows {
            if row.len() >= 7 {
                let id = row[0].as_u64().unwrap_or(0) as u32;
                let name = row[1].as_str().unwrap_or("").to_string();
                let desc = row[2].as_str().unwrap_or("").to_string();
                let rep_idx = row[3].as_i64().unwrap_or(0) as i16;
                let parent = row[4].as_u64().unwrap_or(0) as u16;
                let exp = row[5].as_u64().unwrap_or(0) as u8;
                let flg = row[6].as_u64().unwrap_or(0) as u8;

                merged.insert(
                    id,
                    FactionRecord {
                        id,
                        name,
                        description: desc,
                        reputation_index: rep_idx,
                        parent_faction_id: parent,
                        expansion: exp,
                        flags: flg,
                    },
                );
            }
        }
    }

    // 3. Filter and sort
    let mut results: Vec<FactionRecord> = merged
        .into_values()
        .filter(|f| {
            if term.is_empty() {
                return true;
            }
            if let Some(target_id) = is_num {
                if f.id == target_id || f.id.to_string().contains(&term) {
                    return true;
                }
            }
            f.name.to_lowercase().contains(&term) || f.description.to_lowercase().contains(&term)
        })
        .collect();

    results.sort_by_key(|f| f.id);
    Ok(results)
}

#[tauri::command]
async fn search_effective_faction_templates(
    state: State<'_, AppState>,
    term: String,
) -> Result<Vec<(u32, String, u16)>, String> {
    let term = term.trim().to_lowercase();
    let is_num = term.parse::<u32>().ok();

    let db2_templates = state.db2.db2_faction_templates_snapshot();
    let factions = state.db2.db2_factions_snapshot();

    let mut list: Vec<(u32, String, u16)> = Vec::new();
    for (id, ft) in db2_templates {
        let faction_name = factions
            .get(&(ft.faction as u32))
            .map(|f| f.name.clone())
            .unwrap_or_else(|| format!("Faction {}", ft.faction));

        let matches = if term.is_empty() {
            true
        } else if let Some(target_id) = is_num {
            id == target_id || id.to_string().contains(&term) || ft.faction as u32 == target_id
        } else {
            faction_name.to_lowercase().contains(&term)
        };

        if matches {
            list.push((id, faction_name, ft.faction));
        }
    }

    list.sort_by_key(|item| item.0);
    Ok(list)
}

#[tauri::command]
async fn search_effective_emotes(
    state: State<'_, AppState>,
    term: String,
) -> Result<Vec<(u32, String)>, String> {
    let term = term.trim().to_lowercase();
    let is_num = term.parse::<u32>().ok();

    let db2_texts = state.db2.db2_emotes_text_snapshot();
    let db2_emotes = state.db2.db2_emotes_snapshot();

    let mut list: Vec<(u32, String)> = Vec::new();

    // Prefer EmotesText.db2 first
    if !db2_texts.is_empty() {
        for (id, rec) in db2_texts {
            let matches = if term.is_empty() {
                true
            } else if let Some(target_id) = is_num {
                id == target_id || id.to_string().contains(&term)
            } else {
                rec.name.to_lowercase().contains(&term)
            };

            if matches {
                list.push((id, rec.name));
            }
        }
    } else {
        // Fallback to Emotes.db2
        for (id, rec) in db2_emotes {
            let name = if !rec.emote_slash_command.is_empty() {
                rec.emote_slash_command
            } else {
                format!("Emote #{}", id)
            };

            let matches = if term.is_empty() {
                true
            } else if let Some(target_id) = is_num {
                id == target_id || id.to_string().contains(&term)
            } else {
                name.to_lowercase().contains(&term)
            };

            if matches {
                list.push((id, name));
            }
        }
    }

    list.sort_by_key(|item| item.0);
    Ok(list)
}

#[tauri::command]
async fn connect_databases(
    state: State<'_, AppState>,
    config: DbConfig,
) -> Result<(), String> {
    state.db.connect(config).await
}

#[tauri::command]
async fn execute_sql(
    state: State<'_, AppState>,
    db_type: String,
    sql: String,
) -> Result<QueryResult, String> {
    Ok(QueryExecutor::execute_query(&state.db, &db_type, &sql).await)
}

#[tauri::command]
async fn execute_sql_batch(
    state: State<'_, AppState>,
    db_type: String,
    statements: Vec<String>,
) -> Result<QueryResult, String> {
    Ok(QueryExecutor::execute_batch(&state.db, &db_type, &statements).await)
}

#[tauri::command]
async fn validate_database_schema(
    state: State<'_, AppState>,
) -> Result<crate::db::validator::SchemaValidationReport, String> {
    Ok(crate::db::validator::SchemaValidator::run_validation(&state.db).await)
}

#[tauri::command]
async fn get_database_tables(
    state: State<'_, AppState>,
    db_type: String,
) -> Result<Vec<TableSummary>, String> {
    QueryExecutor::get_tables(&state.db, &db_type).await
}

#[tauri::command]
async fn get_table_schema(
    state: State<'_, AppState>,
    db_type: String,
    table_name: String,
) -> Result<Vec<TableColumnInfo>, String> {
    QueryExecutor::get_table_schema(&state.db, &db_type, &table_name).await
}

#[tauri::command]
async fn get_next_entity_id(
    state: State<'_, AppState>,
    db_type: String,
    table_name: String,
    id_column: String,
) -> Result<u32, String> {
    QueryExecutor::get_next_entity_id(&state.db, &db_type, &table_name, &id_column).await
}

#[tauri::command]
fn get_smart_events() -> Vec<SmartEventDefinition> {
    BfaDefinitions::get_smart_events()
}

#[tauri::command]
fn get_smart_actions() -> Vec<SmartActionDefinition> {
    BfaDefinitions::get_smart_actions()
}

#[tauri::command]
fn get_smart_targets() -> Vec<SmartTargetDefinition> {
    BfaDefinitions::get_smart_targets()
}

#[tauri::command]
fn generate_smart_ai_sql(
    entryorguid: i64,
    source_type: u8,
    rows: Vec<SmartScriptRow>,
) -> String {
    SmartAiSqlGenerator::generate_sql(entryorguid, source_type, &rows)
}

#[tauri::command]
fn create_migration_file(
    description: String,
    author: String,
    sql_body: String,
) -> (String, String) {
    MigrationGenerator::create_migration(&description, &author, &sql_body)
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    // Restrict external navigation to http/https only; never pass user
    // input through a shell, which would allow command injection.
    let lower = url.to_ascii_lowercase();
    if !(lower.starts_with("http://") || lower.starts_with("https://")) {
        return Err("open_url rejected: only http(s) URLs are allowed.".to_string());
    }
    open::that(&url).map_err(|e| e.to_string())
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AppConfigPayload {
    pub config: DbConfig,
    pub save_password: bool,
    pub remember_me: bool,
}

fn get_appdata_config_path() -> std::path::PathBuf {
    if let Ok(appdata) = std::env::var("APPDATA") {
        let dir = std::path::Path::new(&appdata).join("Lyra");
        let _ = std::fs::create_dir_all(&dir);
        dir.join("config.json")
    } else {
        std::path::PathBuf::from("config.json")
    }
}

fn encrypt_password(plain: &str) -> String {
    if plain.is_empty() {
        return String::new();
    }
    let key = b"LyraHavenCore_837_Protected_2026";
    let encrypted: Vec<u8> = plain
        .as_bytes()
        .iter()
        .enumerate()
        .map(|(i, b)| b ^ key[i % key.len()])
        .collect();
    let mut hex = String::from("enc:");
    for byte in encrypted {
        hex.push_str(&format!("{:02x}", byte));
    }
    hex
}

fn decrypt_password(enc: &str) -> String {
    if !enc.starts_with("enc:") {
        return enc.to_string(); // backwards compatibility
    }
    let hex_part = &enc[4..];
    if hex_part.len() % 2 != 0 {
        return enc.to_string();
    }
    let mut bytes = Vec::new();
    for i in (0..hex_part.len()).step_by(2) {
        if let Ok(byte) = u8::from_str_radix(&hex_part[i..i + 2], 16) {
            bytes.push(byte);
        } else {
            return enc.to_string();
        }
    }
    let key = b"LyraHavenCore_837_Protected_2026";
    let decrypted: Vec<u8> = bytes
        .iter()
        .enumerate()
        .map(|(i, b)| b ^ key[i % key.len()])
        .collect();
    String::from_utf8(decrypted).unwrap_or_else(|_| enc.to_string())
}

#[tauri::command]
fn save_app_config(mut payload: AppConfigPayload) -> Result<(), String> {
    let path = get_appdata_config_path();
    if payload.save_password && !payload.config.password.is_empty() {
        payload.config.password = encrypt_password(&payload.config.password);
    } else {
        payload.config.password = String::new();
    }
    let json = serde_json::to_string_pretty(&payload).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_app_config() -> Result<Option<AppConfigPayload>, String> {
    let path = get_appdata_config_path();
    if !path.exists() {
        return Ok(None);
    }
    let data = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut payload: AppConfigPayload = serde_json::from_str(&data).map_err(|e| e.to_string())?;
    if !payload.config.password.is_empty() {
        payload.config.password = decrypt_password(&payload.config.password);
    }
    Ok(Some(payload))
}

#[tauri::command]
fn clear_app_config() -> Result<(), String> {
    let path = get_appdata_config_path();
    if path.exists() {
        let _ = std::fs::remove_file(&path);
    }
    Ok(())
}

#[tauri::command]
fn minimize_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_fullscreen(window: tauri::WebviewWindow) -> Result<(), String> {
    let is_fs = window.is_fullscreen().unwrap_or(false);
    window.set_fullscreen(!is_fs).map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_devtools(window: tauri::WebviewWindow) {
    if window.is_devtools_open() {
        window.close_devtools();
    } else {
        window.open_devtools();
    }
}

#[tauri::command]
async fn select_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog().file().pick_folder(move |folder_path| {
        let path_str = folder_path.map(|p| p.to_string());
        let _ = tx.send(path_str);
    });
    rx.await.map_err(|e| e.to_string())
}

#[tauri::command]
fn exit_app() {
    std::process::exit(0);
}

/// Runs the Tauri application
pub fn run() {
    let db_manager = Arc::new(DatabaseManager::new());
    let db2_catalog = Arc::new(Db2CatalogService::new());
    let item_repo = Arc::new(EffectiveItemRepository::new(
        Arc::clone(&db_manager),
        Arc::clone(&db2_catalog),
    ));
    let state = AppState {
        db: db_manager,
        db2: db2_catalog,
        item_repo,
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            connect_databases,
            validate_database_schema,
            execute_sql,
            execute_sql_batch,
            get_database_tables,
            get_table_schema,
            get_smart_events,
            get_smart_actions,
            get_smart_targets,
            generate_smart_ai_sql,
            create_migration_file,
            open_url,
            save_app_config,
            load_app_config,
            clear_app_config,
            minimize_window,
            toggle_fullscreen,
            toggle_devtools,
            exit_app,
            select_folder,
            get_db2_config,
            set_db2_config,
            get_catalog_stats,
            search_effective_items,
            get_effective_item,
            get_item_effects,
            get_next_effect_id,
            get_next_entity_id,
            search_effective_factions,
            search_effective_faction_templates,
            search_effective_emotes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lyra Tauri application");
}
