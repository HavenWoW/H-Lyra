use std::time::Instant;
use sqlx::{Column, Row, TypeInfo};
use crate::db::models::{QueryResult, TableColumnInfo, TableSummary};
use crate::db::pool::DatabaseManager;

pub struct QueryExecutor;

impl QueryExecutor {
    /// Executes an arbitrary SQL statement against the selected database pool
    pub async fn execute_query(
        db_mgr: &DatabaseManager,
        db_type: &str,
        sql: &str,
    ) -> QueryResult {
        let start = Instant::now();
        let pool = match db_mgr.get_pool(db_type).await {
            Ok(p) => p,
            Err(e) => {
                return QueryResult {
                    success: false,
                    columns: vec![],
                    rows: vec![],
                    affected_rows: 0,
                    execution_time_ms: start.elapsed().as_millis() as u64,
                    error: Some(e),
                };
            }
        };

        let clean_sql = {
            let mut cleaned = String::new();
            let mut in_block_comment = false;
            for line in sql.lines() {
                let trimmed_line = line.trim();
                if trimmed_line.starts_with("/*") && trimmed_line.ends_with("*/") {
                    continue;
                }
                if trimmed_line.starts_with("/*") {
                    in_block_comment = true;
                    continue;
                }
                if in_block_comment {
                    if trimmed_line.contains("*/") {
                        in_block_comment = false;
                    }
                    continue;
                }
                if trimmed_line.starts_with("--") || trimmed_line.starts_with("#") {
                    continue;
                }
                cleaned.push_str(trimmed_line);
                cleaned.push(' ');
            }
            cleaned.trim().to_uppercase()
        };

        let is_select = clean_sql.starts_with("SELECT")
            || clean_sql.starts_with("SHOW")
            || clean_sql.starts_with("DESCRIBE")
            || clean_sql.starts_with("EXPLAIN");

        if is_select {
            match sqlx::query(sql).fetch_all(&pool).await {
                Ok(rows) => {
                    let mut columns = Vec::new();
                    if let Some(first_row) = rows.first() {
                        for col in first_row.columns() {
                            columns.push(col.name().to_string());
                        }
                    }

                    let mut json_rows = Vec::new();
                    for row in &rows {
                        let mut row_vals = Vec::new();
                        for i in 0..row.columns().len() {
                            let val = Self::extract_json_value(row, i);
                            row_vals.push(val);
                        }
                        json_rows.push(row_vals);
                    }

                    QueryResult {
                        success: true,
                        columns,
                        rows: json_rows,
                        affected_rows: rows.len() as u64,
                        execution_time_ms: start.elapsed().as_millis() as u64,
                        error: None,
                    }
                }
                Err(e) => QueryResult {
                    success: false,
                    columns: vec![],
                    rows: vec![],
                    affected_rows: 0,
                    execution_time_ms: start.elapsed().as_millis() as u64,
                    error: Some(e.to_string()),
                },
            }
        } else {
            // INSERT, UPDATE, DELETE, REPLACE, ALTER, etc.
            match sqlx::raw_sql(sql).execute(&pool).await {
                Ok(result) => QueryResult {
                    success: true,
                    columns: vec![],
                    rows: vec![],
                    affected_rows: result.rows_affected(),
                    execution_time_ms: start.elapsed().as_millis() as u64,
                    error: None,
                },
                Err(e) => QueryResult {
                    success: false,
                    columns: vec![],
                    rows: vec![],
                    affected_rows: 0,
                    execution_time_ms: start.elapsed().as_millis() as u64,
                    error: Some(e.to_string()),
                },
            }
        }
    }

    /// Executes a batch of SQL statements inside a single transaction so that
    /// editor save flows (e.g. DELETE + INSERT) are all-or-nothing.
    pub async fn execute_batch(
        db_mgr: &DatabaseManager,
        db_type: &str,
        statements: &[String],
    ) -> QueryResult {
        let start = Instant::now();
        let pool = match db_mgr.get_pool(db_type).await {
            Ok(p) => p,
            Err(e) => {
                return QueryResult {
                    success: false,
                    columns: vec![],
                    rows: vec![],
                    affected_rows: 0,
                    execution_time_ms: start.elapsed().as_millis() as u64,
                    error: Some(e),
                };
            }
        };

        let mut transaction = match pool.begin().await {
            Ok(t) => t,
            Err(e) => {
                return QueryResult {
                    success: false,
                    columns: vec![],
                    rows: vec![],
                    affected_rows: 0,
                    execution_time_ms: start.elapsed().as_millis() as u64,
                    error: Some(e.to_string()),
                };
            }
        };

        let mut total_affected: u64 = 0;
        for statement in statements {
            let trimmed = statement.trim();
            if trimmed.is_empty() {
                continue;
            }
            match sqlx::query(trimmed).execute(&mut *transaction).await {
                Ok(result) => total_affected += result.rows_affected(),
                Err(e) => {
                    let _ = transaction.rollback().await;
                    return QueryResult {
                        success: false,
                        columns: vec![],
                        rows: vec![],
                        affected_rows: 0,
                        execution_time_ms: start.elapsed().as_millis() as u64,
                        error: Some(format!("Transaction rolled back at statement: {e}")),
                    };
                }
            }
        }

        if let Err(e) = transaction.commit().await {
            return QueryResult {
                success: false,
                columns: vec![],
                rows: vec![],
                affected_rows: 0,
                execution_time_ms: start.elapsed().as_millis() as u64,
                error: Some(e.to_string()),
            };
        }

        QueryResult {
            success: true,
            columns: vec![],
            rows: vec![],
            affected_rows: total_affected,
            execution_time_ms: start.elapsed().as_millis() as u64,
            error: None,
        }
    }

    /// Fetches all table names and row counts in the specified database
    pub async fn get_tables(
        db_mgr: &DatabaseManager,
        db_type: &str,
    ) -> Result<Vec<TableSummary>, String> {
        let pool = db_mgr.get_pool(db_type).await?;
        let sql = r#"
            SELECT 
                TABLE_NAME, 
                IFNULL(TABLE_ROWS, 0) AS row_count,
                IFNULL(DATA_LENGTH + INDEX_LENGTH, 0) AS data_size
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME ASC;
        "#;

        let rows = sqlx::query(sql)
            .fetch_all(&pool)
            .await
            .map_err(|e| e.to_string())?;

        let mut tables = Vec::new();
        for row in rows {
            let name: String = row.try_get("TABLE_NAME").unwrap_or_default();
            let count: i64 = row.try_get("row_count").unwrap_or(0);
            let size: i64 = row.try_get("data_size").unwrap_or(0);
            tables.push(TableSummary {
                table_name: name,
                row_count: count as u64,
                data_size_bytes: size as u64,
            });
        }

        Ok(tables)
    }

    /// Fetches detailed column schema for a given table
    pub async fn get_table_schema(
        db_mgr: &DatabaseManager,
        db_type: &str,
        table_name: &str,
    ) -> Result<Vec<TableColumnInfo>, String> {
        let pool = db_mgr.get_pool(db_type).await?;
        let sql = r#"
            SELECT 
                COLUMN_NAME, 
                COLUMN_TYPE, 
                IS_NULLABLE, 
                COLUMN_KEY, 
                COLUMN_DEFAULT, 
                COLUMN_COMMENT
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION ASC;
        "#;

        let rows = sqlx::query(sql)
            .bind(table_name)
            .fetch_all(&pool)
            .await
            .map_err(|e| e.to_string())?;

        let mut columns = Vec::new();
        for row in rows {
            let name: String = row.try_get("COLUMN_NAME").unwrap_or_default();
            let data_type: String = row.try_get("COLUMN_TYPE").unwrap_or_default();
            let nullable_str: String = row.try_get("IS_NULLABLE").unwrap_or_default();
            let key: String = row.try_get("COLUMN_KEY").unwrap_or_default();
            let def: Option<String> = row.try_get("COLUMN_DEFAULT").ok();
            let comment: String = row.try_get("COLUMN_COMMENT").unwrap_or_default();

            columns.push(TableColumnInfo {
                name,
                data_type,
                is_nullable: nullable_str.eq_ignore_ascii_case("YES"),
                column_key: key,
                default_value: def,
                comment,
            });
        }

        Ok(columns)
    }

    /// Allocates the next available ID by querying MAX(id_column) + 1 from the specified table
    pub async fn get_next_entity_id(
        db_mgr: &DatabaseManager,
        db_type: &str,
        table_name: &str,
        id_column: &str,
    ) -> Result<u32, String> {
        // Sanitize table and column names (must be alphanumeric or underscore only)
        if !table_name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
            || !id_column.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
        {
            return Err("Invalid table or column identifier for ID allocation".into());
        }

        let pool = db_mgr.get_pool(db_type).await?;
        let sql = format!("SELECT COALESCE(MAX(`{}`), 0) + 1 AS next_id FROM `{}`;", id_column, table_name);

        let row = sqlx::query(&sql)
            .fetch_one(&pool)
            .await
            .map_err(|e| format!("Failed to query next ID for {}.{}: {}", table_name, id_column, e))?;

        let next_id: u32 = row.try_get::<i64, _>("next_id")
            .map(|v| v as u32)
            .or_else(|_| row.try_get::<u32, _>("next_id"))
            .unwrap_or(1);

        Ok(next_id)
    }

    /// Helper to convert sqlx column types into serde_json values handling all MySQL primitive integer and float sizes
    /// Largest integer a JavaScript `number` (IEEE-754 double) can hold without
    /// loss: `Number.MAX_SAFE_INTEGER`, 2^53 - 1.
    const JS_MAX_SAFE_INTEGER: i128 = 9_007_199_254_740_991;

    /// Serialises a 64-bit integer for the frontend without precision loss.
    ///
    /// Values that fit the JavaScript safe-integer range are emitted as JSON
    /// numbers, exactly as before. Anything outside it is emitted as a decimal
    /// string instead, because the JSON number would be parsed into a double on
    /// the JavaScript side and silently rounded. A 64-bit column such as
    /// `quest_template.AllowableRaces` (all-races is 2^64 - 1) or
    /// `creature_template.npcflag` must survive this boundary bit-for-bit; the
    /// frontend already accepts an exact-integer string wherever it accepts a
    /// number.
    fn json_int_i64(val: i64) -> serde_json::Value {
        if (val as i128).abs() <= Self::JS_MAX_SAFE_INTEGER {
            serde_json::Value::Number(serde_json::Number::from(val))
        } else {
            serde_json::Value::String(val.to_string())
        }
    }

    /// Unsigned counterpart of [`json_int_i64`].
    fn json_int_u64(val: u64) -> serde_json::Value {
        if (val as i128) <= Self::JS_MAX_SAFE_INTEGER {
            serde_json::Value::Number(serde_json::Number::from(val))
        } else {
            serde_json::Value::String(val.to_string())
        }
    }

    fn extract_json_value(row: &sqlx::mysql::MySqlRow, index: usize) -> serde_json::Value {
        let col = &row.columns()[index];
        let type_name = col.type_info().name();

        match type_name {
            "TINYINT" | "TINYINT(1)" | "BOOLEAN" => {
                if let Ok(val) = row.try_get::<i8, _>(index) {
                    serde_json::Value::Number(serde_json::Number::from(val))
                } else if let Ok(val) = row.try_get::<u8, _>(index) {
                    serde_json::Value::Number(serde_json::Number::from(val))
                } else if let Ok(val) = row.try_get::<bool, _>(index) {
                    serde_json::Value::Bool(val)
                } else if let Ok(val) = row.try_get::<i32, _>(index) {
                    serde_json::Value::Number(serde_json::Number::from(val))
                } else {
                    serde_json::Value::Null
                }
            }
            "SMALLINT" => {
                if let Ok(val) = row.try_get::<i16, _>(index) {
                    serde_json::Value::Number(serde_json::Number::from(val))
                } else if let Ok(val) = row.try_get::<u16, _>(index) {
                    serde_json::Value::Number(serde_json::Number::from(val))
                } else if let Ok(val) = row.try_get::<i32, _>(index) {
                    serde_json::Value::Number(serde_json::Number::from(val))
                } else if let Ok(val) = row.try_get::<u32, _>(index) {
                    serde_json::Value::Number(serde_json::Number::from(val))
                } else {
                    serde_json::Value::Null
                }
            }
            "INT" | "MEDIUMINT" => {
                if let Ok(val) = row.try_get::<i32, _>(index) {
                    serde_json::Value::Number(serde_json::Number::from(val))
                } else if let Ok(val) = row.try_get::<u32, _>(index) {
                    serde_json::Value::Number(serde_json::Number::from(val))
                } else if let Ok(val) = row.try_get::<i64, _>(index) {
                    Self::json_int_i64(val)
                } else if let Ok(val) = row.try_get::<u64, _>(index) {
                    Self::json_int_u64(val)
                } else {
                    serde_json::Value::Null
                }
            }
            "BIGINT" => {
                if let Ok(val) = row.try_get::<i64, _>(index) {
                    Self::json_int_i64(val)
                } else if let Ok(val) = row.try_get::<u64, _>(index) {
                    Self::json_int_u64(val)
                } else if let Ok(val) = row.try_get::<i32, _>(index) {
                    serde_json::Value::Number(serde_json::Number::from(val))
                } else if let Ok(val) = row.try_get::<u32, _>(index) {
                    serde_json::Value::Number(serde_json::Number::from(val))
                } else {
                    serde_json::Value::Null
                }
            }
            "FLOAT" => {
                if let Ok(val) = row.try_get::<f32, _>(index) {
                    serde_json::Number::from_f64(val as f64)
                        .map(serde_json::Value::Number)
                        .unwrap_or(serde_json::Value::Null)
                } else if let Ok(val) = row.try_get::<f64, _>(index) {
                    serde_json::Number::from_f64(val)
                        .map(serde_json::Value::Number)
                        .unwrap_or(serde_json::Value::Null)
                } else {
                    serde_json::Value::Null
                }
            }
            "DOUBLE" | "DECIMAL" => {
                if let Ok(val) = row.try_get::<f64, _>(index) {
                    serde_json::Number::from_f64(val)
                        .map(serde_json::Value::Number)
                        .unwrap_or(serde_json::Value::Null)
                } else if let Ok(val) = row.try_get::<f32, _>(index) {
                    serde_json::Number::from_f64(val as f64)
                        .map(serde_json::Value::Number)
                        .unwrap_or(serde_json::Value::Null)
                } else {
                    serde_json::Value::Null
                }
            }
            _ => {
                if let Ok(val) = row.try_get::<String, _>(index) {
                    serde_json::Value::String(val)
                } else if let Ok(val) = row.try_get::<i32, _>(index) {
                    serde_json::Value::Number(serde_json::Number::from(val))
                } else if let Ok(val) = row.try_get::<u32, _>(index) {
                    serde_json::Value::Number(serde_json::Number::from(val))
                } else if let Ok(val) = row.try_get::<i64, _>(index) {
                    Self::json_int_i64(val)
                } else if let Ok(val) = row.try_get::<u64, _>(index) {
                    Self::json_int_u64(val)
                } else if let Ok(val) = row.try_get::<i16, _>(index) {
                    serde_json::Value::Number(serde_json::Number::from(val))
                } else if let Ok(val) = row.try_get::<u16, _>(index) {
                    serde_json::Value::Number(serde_json::Number::from(val))
                } else if let Ok(val) = row.try_get::<i8, _>(index) {
                    serde_json::Value::Number(serde_json::Number::from(val))
                } else if let Ok(val) = row.try_get::<u8, _>(index) {
                    serde_json::Value::Number(serde_json::Number::from(val))
                } else if let Ok(val) = row.try_get::<f64, _>(index) {
                    serde_json::Number::from_f64(val)
                        .map(serde_json::Value::Number)
                        .unwrap_or(serde_json::Value::Null)
                } else if let Ok(val) = row.try_get::<f32, _>(index) {
                    serde_json::Number::from_f64(val as f64)
                        .map(serde_json::Value::Number)
                        .unwrap_or(serde_json::Value::Null)
                } else if let Ok(val) = row.try_get::<Vec<u8>, _>(index) {
                    serde_json::Value::String(String::from_utf8_lossy(&val).to_string())
                } else {
                    serde_json::Value::Null
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::QueryExecutor;
    use serde_json::Value;

    // A 64-bit value that fits the JS safe-integer range stays a JSON number,
    // so no existing consumer that reads it as a number is affected.
    #[test]
    fn small_bigint_stays_a_json_number() {
        assert_eq!(QueryExecutor::json_int_u64(0), Value::Number(0u64.into()));
        assert_eq!(
            QueryExecutor::json_int_i64(-1),
            Value::Number((-1i64).into())
        );
        let max_safe = QueryExecutor::JS_MAX_SAFE_INTEGER as u64;
        assert_eq!(
            QueryExecutor::json_int_u64(max_safe),
            Value::Number(max_safe.into())
        );
    }

    // The value that motivated the fix: AllowableRaces "all races" is 2^64 - 1,
    // far beyond what a JavaScript double can represent. If it were emitted as a
    // JSON number, JSON.parse on the frontend would round it to
    // 18446744073709552000 and a save would write the wrong mask back. Emitting
    // it as a decimal string keeps it exact across the IPC boundary.
    #[test]
    fn unsafe_bigint_becomes_an_exact_decimal_string() {
        let all_races: u64 = 18_446_744_073_709_551_615; // u64::MAX, 2^64 - 1
        assert_eq!(
            QueryExecutor::json_int_u64(all_races),
            Value::String("18446744073709551615".to_string())
        );
    }

    // The first integer past the safe range must already switch to a string,
    // and large negatives (e.g. a 64-bit flag column read as signed) too.
    #[test]
    fn boundary_and_negative_values_switch_to_strings() {
        let first_unsafe = (QueryExecutor::JS_MAX_SAFE_INTEGER + 1) as u64;
        assert_eq!(
            QueryExecutor::json_int_u64(first_unsafe),
            Value::String("9007199254740992".to_string())
        );
        assert_eq!(
            QueryExecutor::json_int_i64(i64::MIN),
            Value::String("-9223372036854775808".to_string())
        );
    }
}
