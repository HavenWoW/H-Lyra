use std::time::Duration;
use tokio::sync::RwLock;
use sqlx::mysql::{MySqlConnectOptions, MySqlPool, MySqlPoolOptions};
use crate::db::models::DbConfig;

pub struct DatabaseManager {
    pub config: RwLock<DbConfig>,
    pub world_pool: RwLock<Option<MySqlPool>>,
    pub hotfixes_pool: RwLock<Option<MySqlPool>>,
}

impl DatabaseManager {
    pub fn new() -> Self {
        Self {
            config: RwLock::new(DbConfig::default()),
            world_pool: RwLock::new(None),
            hotfixes_pool: RwLock::new(None),
        }
    }

    /// Tests and establishes connection pools for configured databases with strict timeouts
    pub async fn connect(&self, config: DbConfig) -> Result<(), String> {
        let timeout = Duration::from_secs(3);

        // Build base connect options with fast connection timeout
        let base_options = MySqlConnectOptions::new()
            .host(&config.host)
            .port(config.port)
            .username(&config.user)
            .password(&config.password);

        // 1. Connect World DB
        let world_options = base_options.clone().database(&config.world_db);
        let world_pool = MySqlPoolOptions::new()
            .max_connections(10)
            .acquire_timeout(timeout)
            .connect_with(world_options)
            .await
            .map_err(|e| format!("Failed to connect to World DB ({}): {}", config.world_db, e))?;

        // 2. Connect Hotfixes DB
        let hotfixes_options = base_options.clone().database(&config.hotfixes_db);
        let hotfixes_pool = MySqlPoolOptions::new()
            .max_connections(10)
            .acquire_timeout(timeout)
            .connect_with(hotfixes_options)
            .await
            .map_err(|e| format!("Failed to connect to Hotfixes DB ({}): {}", config.hotfixes_db, e))?;

        // Update state
        *self.config.write().await = config;
        *self.world_pool.write().await = Some(world_pool);
        *self.hotfixes_pool.write().await = Some(hotfixes_pool);

        Ok(())
    }

    /// Returns pool reference by database identifier ("world", "hotfixes")
    pub async fn get_pool(&self, db_type: &str) -> Result<MySqlPool, String> {
        match db_type {
            "world" => self.world_pool.read().await.clone().ok_or_else(|| "World DB is not connected".into()),
            "hotfixes" => self.hotfixes_pool.read().await.clone().ok_or_else(|| "Hotfixes DB is not connected".into()),
            _ => self.world_pool.read().await.clone().ok_or_else(|| "World DB is not connected".into()),
        }
    }
}
