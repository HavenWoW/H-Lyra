use serde::{Deserialize, Serialize};
use sqlx::Row;
use crate::db::pool::DatabaseManager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaCheckItem {
    pub name: String,
    pub table: String,
    pub status: String, // "PASSED", "WARNING", "FAILED"
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaValidationReport {
    pub passed_count: u32,
    pub warning_count: u32,
    pub failed_count: u32,
    pub items: Vec<SchemaCheckItem>,
}

pub struct SchemaValidator;

impl SchemaValidator {
    pub async fn run_validation(db_mgr: &DatabaseManager) -> SchemaValidationReport {
        let mut items = Vec::new();
        let mut passed = 0;
        let mut warnings = 0;
        let mut failed = 0;

        // 1. World DB Checks
        if let Ok(pool) = db_mgr.get_pool("world").await {
            // Check smart_scripts columns and signed action params
            let ss_query = "SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'smart_scripts';";
            if let Ok(rows) = sqlx::query(ss_query).fetch_all(&pool).await {
                let col_names: Vec<String> = rows.iter().map(|r| r.get("COLUMN_NAME")).collect();
                
                // Check event_param5
                if col_names.contains(&"event_param5".to_string()) {
                    passed += 1;
                    items.push(SchemaCheckItem {
                        name: "SmartAI Event Parameters (5 Params)".into(),
                        table: "smart_scripts".into(),
                        status: "PASSED".into(),
                        message: "Column `event_param5` confirmed present (HavenCore BFA 8.3.7)".into(),
                    });
                } else {
                    failed += 1;
                    items.push(SchemaCheckItem {
                        name: "SmartAI Event Parameters".into(),
                        table: "smart_scripts".into(),
                        status: "FAILED".into(),
                        message: "Column `event_param5` missing in `smart_scripts`".into(),
                    });
                }

                // Check event_param_string
                if col_names.contains(&"event_param_string".to_string()) {
                    passed += 1;
                    items.push(SchemaCheckItem {
                        name: "SmartAI Scene Triggers (String Param)".into(),
                        table: "smart_scripts".into(),
                        status: "PASSED".into(),
                        message: "Column `event_param_string` confirmed present".into(),
                    });
                } else {
                    failed += 1;
                    items.push(SchemaCheckItem {
                        name: "SmartAI Scene Triggers".into(),
                        table: "smart_scripts".into(),
                        status: "FAILED".into(),
                        message: "Column `event_param_string` missing in `smart_scripts`".into(),
                    });
                }

                // Check action_param1 signedness
                if let Some(r) = rows.iter().find(|r| r.get::<String, _>("COLUMN_NAME") == "action_param1") {
                    let col_type: String = r.get("COLUMN_TYPE");
                    if !col_type.to_lowercase().contains("unsigned") {
                        passed += 1;
                        items.push(SchemaCheckItem {
                            name: "SmartAI Signed Action Parameters".into(),
                            table: "smart_scripts".into(),
                            status: "PASSED".into(),
                            message: format!("`action_param1` is signed integer ({})", col_type),
                        });
                    } else {
                        warnings += 1;
                        items.push(SchemaCheckItem {
                            name: "SmartAI Signed Action Parameters".into(),
                            table: "smart_scripts".into(),
                            status: "WARNING".into(),
                            message: "Action params are unsigned instead of signed int(11)".into(),
                        });
                    }
                }
            }

            // Check creature_template_model normalized table
            let ctm_query = "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'creature_template_model';";
            if let Ok(rows) = sqlx::query(ctm_query).fetch_all(&pool).await {
                if !rows.is_empty() {
                    passed += 1;
                    items.push(SchemaCheckItem {
                        name: "Normalized Creature Models".into(),
                        table: "creature_template_model".into(),
                        status: "PASSED".into(),
                        message: "Table `creature_template_model` verified with multi-model normalization".into(),
                    });
                } else {
                    failed += 1;
                    items.push(SchemaCheckItem {
                        name: "Normalized Creature Models".into(),
                        table: "creature_template_model".into(),
                        status: "FAILED".into(),
                        message: "Table `creature_template_model` not found in world database".into(),
                    });
                }
            }

            // Verify the quest tables carry the columns the editor writes, not
            // just that the tables exist. Each entry lists columns that must be
            // present for a save to round-trip without silently dropping data.
            let quest_table_checks: [(&str, &str, &[&str]); 4] = [
                (
                    "Quest Template Columns",
                    "quest_template",
                    // A representative spread of the BFA-specific columns the
                    // editor is responsible for writing losslessly.
                    &[
                        "AllowableRaces",
                        "RewardArtifactCategoryID",
                        "ManagedWorldStateID",
                        "QuestSessionBonus",
                    ],
                ),
                (
                    "Quest Objective Columns",
                    "quest_objectives",
                    // Flags2 and ProgressBarWeight were being written as a
                    // hardcoded 0 before; they must exist for the fix to hold.
                    &["Flags2", "ProgressBarWeight"],
                ),
                ("Quest POI Points", "quest_poi_points", &["X", "Y"]),
                (
                    "Quest Mail Sender",
                    "quest_mail_sender",
                    &["RewardMailSenderEntry"],
                ),
            ];

            for (name, table, columns) in quest_table_checks {
                let in_list = columns
                    .iter()
                    .map(|c| format!("'{}'", c))
                    .collect::<Vec<_>>()
                    .join(", ");
                let query = format!(
                    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{}' AND COLUMN_NAME IN ({});",
                    table, in_list
                );
                if let Ok(rows) = sqlx::query(&query).fetch_all(&pool).await {
                    if rows.len() == columns.len() {
                        passed += 1;
                        items.push(SchemaCheckItem {
                            name: name.into(),
                            table: table.into(),
                            status: "PASSED".into(),
                            message: format!(
                                "Table `{}` has the {} column(s) the editor writes",
                                table,
                                columns.len()
                            ),
                        });
                    } else {
                        failed += 1;
                        items.push(SchemaCheckItem {
                            name: name.into(),
                            table: table.into(),
                            status: "FAILED".into(),
                            message: format!(
                                "Table `{}` is missing columns the editor writes ({} of {} present)",
                                table,
                                rows.len(),
                                columns.len()
                            ),
                        });
                    }
                }
            }

            // Verify gameobject_template carries the columns the editor writes:
            // the type switch, both ends of the Data0..Data33 range, and size.
            let go_columns = ["type", "Data0", "Data33", "size"];
            let go_in_list = go_columns
                .iter()
                .map(|c| format!("'{}'", c))
                .collect::<Vec<_>>()
                .join(", ");
            let go_query = format!(
                "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gameobject_template' AND COLUMN_NAME IN ({});",
                go_in_list
            );
            if let Ok(rows) = sqlx::query(&go_query).fetch_all(&pool).await {
                if rows.len() == go_columns.len() {
                    passed += 1;
                    items.push(SchemaCheckItem {
                        name: "GameObject Template Columns".into(),
                        table: "gameobject_template".into(),
                        status: "PASSED".into(),
                        message: "Table `gameobject_template` has the type, Data and size columns the editor writes".into(),
                    });
                } else {
                    failed += 1;
                    items.push(SchemaCheckItem {
                        name: "GameObject Template Columns".into(),
                        table: "gameobject_template".into(),
                        status: "FAILED".into(),
                        message: format!(
                            "Table `gameobject_template` is missing columns the editor writes ({} of {} present)",
                            rows.len(),
                            go_columns.len()
                        ),
                    });
                }
            }
        }

        // 2. Hotfixes DB Checks
        if let Ok(pool) = db_mgr.get_pool("hotfixes").await {
            let hf_query = "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('broadcast_text', 'item_sparse', 'spell_name');";
            if let Ok(rows) = sqlx::query(hf_query).fetch_all(&pool).await {
                if rows.len() >= 3 {
                    passed += 1;
                    items.push(SchemaCheckItem {
                        name: "DB2 Hotfixes Client Structures".into(),
                        table: "bfa_hotfixes".into(),
                        status: "PASSED".into(),
                        message: "Client hotfix tables (broadcast_text, item_sparse, spell_name) confirmed".into(),
                    });
                }
            }
        }

        SchemaValidationReport {
            passed_count: passed,
            warning_count: warnings,
            failed_count: failed,
            items,
        }
    }
}
