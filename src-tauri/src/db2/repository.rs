//! EffectiveItemRepository — the single merge point for item data.
//!
//! Owns both data sources: the MySQL hotfix catalog (`item_sparse`/`item`) and
//! the DB2 client base overlay. Every effective item ever produced flows
//! through this module, so there is exactly one place that knows how to merge
//! DB2 base records with SQL hotfix overrides and classify provenance.
//!
//! A search here queries the hotfix database itself; callers never build
//! bespoke SQL strings nor pass pre-mapped rows into the merge.

use crate::db::executor::QueryExecutor;
use crate::db::models::QueryResult;
use crate::db::pool::DatabaseManager;
use crate::db2::catalog::Db2CatalogService;
use crate::db2::structures::{
    EffectiveItem, EffectiveItemEffect, EffectiveItemSummary, ItemEffectRecord, ItemRecord,
    ItemSearchQuery, ItemSourceKind, ItemSparseRecord,
};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;

/// Hotfix database identifier used for all item catalog queries.
const HOTFIXES_DB: &str = "hotfixes";

/// Column-index accessor over a `QueryResult` row.
struct SqlRow<'a> {
    columns: &'a [String],
    values: &'a [serde_json::Value],
}

impl<'a> SqlRow<'a> {
    fn index(&self, column: &str) -> Option<usize> {
        self.columns
            .iter()
            .position(|c| c.eq_ignore_ascii_case(column))
    }

    fn get_u32(&self, column: &str) -> Option<u32> {
        self.index(column)
            .and_then(|i| self.values[i].as_u64())
            .map(|v| v as u32)
    }

    fn get_i32(&self, column: &str) -> Option<i32> {
        self.index(column)
            .and_then(|i| self.values[i].as_i64())
            .map(|v| v as i32)
    }

    fn get_i64(&self, column: &str) -> Option<i64> {
        self.index(column).and_then(|i| self.values[i].as_i64())
    }

    fn get_u16(&self, column: &str) -> Option<u16> {
        self.get_u32(column).map(|v| v as u16)
    }

    fn get_i16(&self, column: &str) -> Option<i16> {
        self.get_i32(column).map(|v| v as i16)
    }

    fn get_u8(&self, column: &str) -> Option<u8> {
        self.get_u32(column).map(|v| v as u8)
    }

    fn get_i8(&self, column: &str) -> Option<i8> {
        self.get_i32(column).map(|v| v as i8)
    }

    fn get_f32(&self, column: &str) -> Option<f32> {
        self.index(column)
            .and_then(|i| self.values[i].as_f64())
            .map(|v| v as f32)
    }

    fn get_string(&self, column: &str) -> Option<String> {
        self.index(column)
            .and_then(|i| self.values[i].as_str())
            .map(|s| s.to_string())
    }
}

/// Reads a `ItemRecord` overlay row from a joined `item` query.
/// Returns `None` if the item table row is absent (i.e. ClassID is NULL).
fn map_item_row(row: &SqlRow) -> Option<ItemRecord> {
    let class_id = row.get_u8("ClassID")?;
    Some(ItemRecord {
        id: row.get_u32("ID").unwrap_or(0),
        class_id,
        subclass_id: row.get_u8("SubclassID").unwrap_or(0),
        material: row.get_u8("Material").unwrap_or(0),
        inventory_type: row.get_i8("InventoryType").unwrap_or(0),
        sheathe_type: row.get_u8("SheatheType").unwrap_or(0),
        sound_override_subclass_id: row.get_i8("SoundOverrideSubclassID").unwrap_or(0),
        icon_file_data_id: row.get_i32("IconFileDataID").unwrap_or(0),
        item_group_sounds_id: row.get_u8("ItemGroupSoundsID").unwrap_or(0),
    })
}

/// Reads a full `ItemSparseRecord` from a `item_sparse` row.
fn map_sparse_row(row: &SqlRow) -> ItemSparseRecord {
    let mut rec = ItemSparseRecord::default();
    rec.id = row.get_u32("ID").unwrap_or(0);
    rec.allowable_race = row.get_i64("AllowableRace").unwrap_or(0);
    rec.description = row.get_string("Description").unwrap_or_default();
    rec.display3 = row.get_string("Display3").unwrap_or_default();
    rec.display2 = row.get_string("Display2").unwrap_or_default();
    rec.display1 = row.get_string("Display1").unwrap_or_default();
    rec.display = row.get_string("Display").unwrap_or_default();
    if rec.display.is_empty() {
        rec.display = format!("Item #{}", rec.id);
    }
    rec.dmg_variance = row.get_f32("DmgVariance").unwrap_or(0.0);
    rec.duration_in_inventory = row.get_u32("DurationInInventory").unwrap_or(0);
    rec.quality_modifier = row.get_f32("QualityModifier").unwrap_or(0.0);
    rec.bag_family = row.get_u32("BagFamily").unwrap_or(0);
    rec.item_range = row.get_f32("ItemRange").unwrap_or(0.0);

    for (i, slot) in rec.stat_percentage_of_socket.iter_mut().enumerate() {
        *slot = row
            .get_f32(&format!("StatPercentageOfSocket{}", i + 1))
            .unwrap_or(0.0);
    }
    for (i, slot) in rec.stat_percent_editor.iter_mut().enumerate() {
        *slot = row
            .get_i32(&format!("StatPercentEditor{}", i + 1))
            .unwrap_or(0);
    }

    rec.stackable = row.get_i32("Stackable").unwrap_or(1);
    rec.max_count = row.get_i32("MaxCount").unwrap_or(0);
    rec.required_ability = row.get_u32("RequiredAbility").unwrap_or(0);
    rec.sell_price = row.get_u32("SellPrice").unwrap_or(0);
    rec.buy_price = row.get_u32("BuyPrice").unwrap_or(0);
    rec.vendor_stack_count = row.get_u32("VendorStackCount").unwrap_or(0);
    rec.price_variance = row.get_f32("PriceVariance").unwrap_or(0.0);
    rec.price_random_value = row.get_f32("PriceRandomValue").unwrap_or(0.0);

    for (i, flag) in rec.flags.iter_mut().enumerate() {
        *flag = row.get_i32(&format!("Flags{}", i + 1)).unwrap_or(0);
    }
    rec.faction_related = row.get_i32("FactionRelated").unwrap_or(0);

    rec.item_name_description_id = row.get_u16("ItemNameDescriptionID").unwrap_or(0);
    rec.required_transmog_holiday = row.get_u16("RequiredTransmogHoliday").unwrap_or(0);
    rec.required_holiday = row.get_u16("RequiredHoliday").unwrap_or(0);
    rec.limit_category = row.get_u16("LimitCategory").unwrap_or(0);
    rec.gem_properties = row.get_u16("GemProperties").unwrap_or(0);
    rec.socket_match_enchantment_id = row.get_u16("SocketMatchEnchantmentId").unwrap_or(0);
    rec.totem_category_id = row.get_u16("TotemCategoryID").unwrap_or(0);
    rec.instance_bound = row.get_u16("InstanceBound").unwrap_or(0);
    rec.zone_bound = [
        row.get_u16("ZoneBound1").unwrap_or(0),
        row.get_u16("ZoneBound2").unwrap_or(0),
    ];
    rec.item_set = row.get_u16("ItemSet").unwrap_or(0);
    rec.lock_id = row.get_u16("LockID").unwrap_or(0);
    rec.start_quest_id = row.get_u16("StartQuestID").unwrap_or(0);
    rec.page_id = row.get_u16("PageID").unwrap_or(0);
    rec.item_delay = row.get_u16("ItemDelay").unwrap_or(0);
    rec.scaling_stat_distribution_id = row.get_u16("ScalingStatDistributionID").unwrap_or(0);
    rec.min_faction_id = row.get_u16("MinFactionID").unwrap_or(0);
    rec.required_skill_rank = row.get_u16("RequiredSkillRank").unwrap_or(0);
    rec.required_skill = row.get_u16("RequiredSkill").unwrap_or(0);
    rec.item_level = row.get_u16("ItemLevel").unwrap_or(0);
    rec.allowable_class = row.get_i16("AllowableClass").unwrap_or(-1);

    rec.expansion_id = row.get_u8("ExpansionID").unwrap_or(0);
    rec.artifact_id = row.get_u8("ArtifactID").unwrap_or(0);
    rec.spell_weight = row.get_u8("SpellWeight").unwrap_or(0);
    rec.spell_weight_category = row.get_u8("SpellWeightCategory").unwrap_or(0);
    rec.socket_type = [
        row.get_u8("SocketType1").unwrap_or(0),
        row.get_u8("SocketType2").unwrap_or(0),
        row.get_u8("SocketType3").unwrap_or(0),
    ];
    rec.sheathe_type = row.get_u8("SheatheType").unwrap_or(0);
    rec.material = row.get_u8("Material").unwrap_or(0);
    rec.page_material_id = row.get_u8("PageMaterialID").unwrap_or(0);
    rec.language_id = row.get_u8("LanguageID").unwrap_or(0);
    rec.bonding = row.get_u8("Bonding").unwrap_or(0);
    rec.damage_damage_type = row.get_u8("DamageDamageType").unwrap_or(0);

    for (i, slot) in rec.stat_modifier_bonus_stat.iter_mut().enumerate() {
        *slot = row
            .get_i8(&format!("StatModifierBonusStat{}", i + 1))
            .unwrap_or(0);
    }
    rec.container_slots = row.get_u8("ContainerSlots").unwrap_or(0);
    rec.min_reputation = row.get_u8("MinReputation").unwrap_or(0);
    rec.required_pvp_medal = row.get_u8("RequiredPVPMedal").unwrap_or(0);
    rec.required_pvp_rank = row.get_u8("RequiredPVPRank").unwrap_or(0);
    rec.required_level = row.get_i8("RequiredLevel").unwrap_or(0);
    rec.inventory_type = row.get_u8("InventoryType").unwrap_or(0);
    rec.overall_quality_id = row.get_u8("OverallQualityID").unwrap_or(1);
    rec
}

/// Reads an `ItemEffectRecord` from an `item_effect` row.
/// Field names come from the `item_effect` hotfix schema.
fn map_effect_row(row: &SqlRow) -> ItemEffectRecord {
    ItemEffectRecord {
        id: row.get_u32("ID").unwrap_or(0),
        legacy_slot_index: row.get_u8("LegacySlotIndex").unwrap_or(0),
        trigger_type: row.get_i8("TriggerType").unwrap_or(0),
        charges: row.get_i16("Charges").unwrap_or(0),
        cooldown_msec: row.get_i32("CoolDownMSec").unwrap_or(0),
        category_cooldown_msec: row.get_i32("CategoryCoolDownMSec").unwrap_or(0),
        spell_category_id: row.get_u16("SpellCategoryID").unwrap_or(0),
        spell_id: row.get_i32("SpellID").unwrap_or(0),
        chr_specialization_id: row.get_u16("ChrSpecializationID").unwrap_or(0),
        parent_item_id: row.get_u32("ParentItemID").unwrap_or(0),
    }
}

/// Builds the search SQL mirroring the item select screen. Field names come
/// from the `item_sparse`/`item` hotfix schema, not guessed.
fn build_search_sql(query: &ItemSearchQuery) -> String {
    let mut where_clauses: Vec<String> = Vec::new();
    if let Some(id) = query.search_id.as_deref() {
        let id = id.trim();
        if !id.is_empty() {
            where_clauses.push(format!("(s.`ID` LIKE '%{}%')", escape_like(id)));
        }
    }
    if let Some(name) = query.search_name.as_deref() {
        let name = name.trim();
        if !name.is_empty() {
            where_clauses.push(format!("(s.`Display` LIKE '%{}%')", escape_like(name)));
        }
    }
    if let Some(class_id) = query.class_id {
        where_clauses.push(format!("(i.`ClassID` = {class_id})"));
    }
    if let Some(subclass_id) = query.subclass_id {
        where_clauses.push(format!("(i.`SubclassID` = {subclass_id})"));
    }
    if let Some(quality) = query.quality {
        where_clauses.push(format!("(s.`OverallQualityID` = {quality})"));
    }

    let where_sql = if where_clauses.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", where_clauses.join(" AND "))
    };
    // No limit means "every match": the caller asked for the whole catalog.
    let limit_sql = match query.limit {
        Some(limit) => format!(" LIMIT {}", limit.max(1)),
        None => String::new(),
    };

    format!(
        "SELECT s.`ID`, s.`Display`, s.`OverallQualityID`, s.`ItemLevel`, s.`RequiredLevel`, \
         s.`InventoryType`, i.`ClassID`, i.`SubclassID`, \
         COALESCE(NULLIF(i.`IconFileDataID`, 0), app.`ItemDisplayInfoID`, app.`DefaultIconFileDataID`, 0) AS `IconFileDataID` \
         FROM `item_sparse` s \
         LEFT JOIN `item` i ON s.`ID` = i.`ID` \
         LEFT JOIN `item_modified_appearance` ima ON ima.`ItemID` = s.`ID` \
         LEFT JOIN `item_appearance` app ON app.`ID` = ima.`ItemAppearanceID` \
         {where_sql} GROUP BY s.`ID` ORDER BY s.`ID` ASC{limit_sql}"
    )
}

/// Label for an item whose record carries no name.
///
/// The decoder reports what the client file holds, including an empty name, so
/// the placeholder is applied here where the value is presented.
fn display_name(display: &str, entry: u32) -> String {
    if display.is_empty() {
        format!("Item #{entry}")
    } else {
        display.to_string()
    }
}

fn escape_like(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('\'', "\\'")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

/// Aggregate catalog statistics (union of IDs across DB2 + SQL).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EffectiveCatalogStats {
    pub db2_base_items: usize,
    pub sql_hotfix_items: usize,
    pub effective_items_count: usize,
    pub data_dir: String,
    pub locale: String,
    pub is_db2_loaded: bool,
}

/// The single merge point for effective item data. Holds the hotfix DB access
/// and the resident DB2 overlay, so neither can drift from the other.
pub struct EffectiveItemRepository {
    db: Arc<DatabaseManager>,
    db2: Arc<Db2CatalogService>,
}

impl EffectiveItemRepository {
    pub fn new(db: Arc<DatabaseManager>, db2: Arc<Db2CatalogService>) -> Self {
        Self { db, db2 }
    }

    /// Executes the SQL search and merges the result with the DB2 base overlay.
    /// If the hotfix database is unreachable, degrades to a pure DB2 search so
    /// the catalog remains usable without a server connection.
    pub async fn search(&self, query: ItemSearchQuery) -> Vec<EffectiveItemSummary> {
        let sql = build_search_sql(&query);
        let sql_items = match QueryExecutor::execute_query(&self.db, HOTFIXES_DB, &sql).await {
            QueryResult {
                success: true,
                columns,
                rows,
                ..
            } => Self::map_sql_summaries(&columns, &rows),
            _ => Vec::new(),
        };
        Self::merge_search(
            self.db2.db2_items_snapshot(),
            self.db2.db2_sparse_snapshot(),
            query,
            sql_items,
        )
    }

    /// Resolves a single effective item from both layers: SQL hotfix first,
    /// falling back to the DB2 base. Never fabricates data.
    pub async fn get_item(&self, item_id: u32) -> Option<EffectiveItem> {
        let sql = format!(
            "SELECT s.*, i.`ClassID`, i.`SubclassID`, i.`Material`, i.`InventoryType`, \
             i.`SheatheType`, i.`SoundOverrideSubclassID`, i.`IconFileDataID`, \
             i.`ItemGroupSoundsID` \
             FROM `item_sparse` s LEFT JOIN `item` i ON s.`ID` = i.`ID` \
             WHERE s.`ID` = {item_id} LIMIT 1"
        );

        let (sql_sparse, sql_item) =
            match QueryExecutor::execute_query(&self.db, HOTFIXES_DB, &sql).await {
                QueryResult {
                    success: true,
                    columns,
                    rows,
                    ..
                } if !rows.is_empty() => {
                    let row = SqlRow {
                        columns: &columns,
                        values: &rows[0],
                    };
                    (Some(map_sparse_row(&row)), map_item_row(&row))
                }
                _ => (None, None),
            };

        let db2_sparse = self.db2.db2_sparse_snapshot().remove(&item_id);
        let db2_item = self.db2.db2_items_snapshot().remove(&item_id);
        let effective =
            Self::resolve_effective(item_id, db2_sparse, db2_item, sql_sparse, sql_item);
        if effective.has_db2_base || effective.has_sql_override {
            Some(effective)
        } else {
            None
        }
    }

    /// Resolves all effective effects for an item by merging the SQL
    /// `item_effect` hotfix rows over the DB2 `ItemEffect` base rows for that
    /// parent, classifying provenance per effect like `resolve_effective`.
    pub async fn get_item_effects(&self, parent_item_id: u32) -> Vec<EffectiveItemEffect> {
        let sql = format!(
            "SELECT `ID`, `LegacySlotIndex`, `TriggerType`, `Charges`, `CoolDownMSec`, \
             `CategoryCoolDownMSec`, `SpellCategoryID`, `SpellID`, `ChrSpecializationID`, \
             `ParentItemID` \
             FROM `item_effect` WHERE `ParentItemID` = {parent_item_id} \
             ORDER BY `LegacySlotIndex` ASC, `ID` ASC"
        );

        let sql_effects = match QueryExecutor::execute_query(&self.db, HOTFIXES_DB, &sql).await {
            QueryResult {
                success: true,
                columns,
                rows,
                ..
            } => rows
                .iter()
                .map(|values| {
                    let row = SqlRow {
                        columns: &columns,
                        values,
                    };
                    map_effect_row(&row)
                })
                .collect::<Vec<_>>(),
            _ => Vec::new(),
        };

        let db2_effects = self
            .db2
            .db2_effects_snapshot()
            .into_values()
            .filter(|effect| effect.parent_item_id == parent_item_id)
            .collect::<Vec<_>>();

        Self::resolve_effective_effects(parent_item_id, db2_effects, sql_effects)
    }

    /// Allocates the next safe effect ID over the union of the DB2 base and
    /// SQL hotfix ID spaces, so new custom effects never collide with either.
    pub async fn next_effect_id(&self) -> u32 {
        let sql = "SELECT MAX(`ID`) AS `MaxId` FROM `item_effect`";
        let sql_max = match QueryExecutor::execute_query(&self.db, HOTFIXES_DB, sql).await {
            QueryResult {
                success: true,
                columns,
                rows,
                ..
            } if !rows.is_empty() => {
                let row = SqlRow {
                    columns: &columns,
                    values: &rows[0],
                };
                row.get_u32("MaxId")
            }
            _ => None,
        };

        let db2_max = self.db2.db2_effects_snapshot().into_keys().max();
        match (db2_max, sql_max) {
            (Some(a), Some(b)) => a.max(b) + 1,
            (Some(a), None) => a + 1,
            (None, Some(b)) => b + 1,
            (None, None) => 1,
        }
    }

    /// Reports union-of-IDs stats. SQL hotfix IDs that already exist in the DB2
    /// base are overrides, not new records, so they must not be double-counted.
    pub fn get_stats(&self, sql_hotfix_ids: &[u32]) -> EffectiveCatalogStats {
        let db2_sparse = self.db2.db2_sparse_snapshot();
        let db2_count = db2_sparse.len();

        let unique_sql_hotfixes = sql_hotfix_ids
            .iter()
            .filter(|id| !db2_sparse.contains_key(id))
            .count();

        let cfg = self.db2.get_config();

        EffectiveCatalogStats {
            db2_base_items: db2_count,
            sql_hotfix_items: sql_hotfix_ids.len(),
            effective_items_count: db2_count + unique_sql_hotfixes,
            data_dir: cfg.data_dir.clone(),
            locale: cfg.locale.clone(),
            is_db2_loaded: db2_count > 0,
        }
    }

    /// Asynchronous stats fetch that self-populates SQL hotfix IDs from MySQL
    /// if the caller did not supply them.
    pub async fn get_stats_async(&self, mut sql_hotfix_ids: Vec<u32>) -> EffectiveCatalogStats {
        if sql_hotfix_ids.is_empty() {
            let sql = "SELECT DISTINCT `ID` FROM `item_sparse` ORDER BY `ID` ASC;";
            if let QueryResult {
                success: true,
                rows,
                ..
            } = QueryExecutor::execute_query(&self.db, HOTFIXES_DB, sql).await
            {
                for r in rows {
                    if let Some(first) = r.first().and_then(|v| v.as_u64()) {
                        sql_hotfix_ids.push(first as u32);
                    }
                }
            }
        }
        self.get_stats(&sql_hotfix_ids)
    }

    /// Converts joined SQL result rows into catalog summaries.
    fn map_sql_summaries(
        columns: &[String],
        rows: &[Vec<serde_json::Value>],
    ) -> Vec<EffectiveItemSummary> {
        rows.iter()
            .map(|values| {
                let row = SqlRow { columns, values };
                let entry = row.get_u32("ID").unwrap_or(0);
                EffectiveItemSummary {
                    entry,
                    name: row
                        .get_string("Display")
                        .unwrap_or_else(|| format!("Item #{entry}")),
                    displayid: row.get_i32("IconFileDataID").unwrap_or(0),
                    class_id: row.get_u8("ClassID"),
                    subclass_id: row.get_u8("SubclassID"),
                    quality: row.get_u8("OverallQualityID").unwrap_or(1),
                    item_level: row.get_u16("ItemLevel").unwrap_or(0),
                    required_level: row.get_i8("RequiredLevel").unwrap_or(0),
                    inventory_type: row.get_u8("InventoryType").unwrap_or(0),
                    source_kind: ItemSourceKind::Db2Base,
                    source_badge: String::new(),
                }
            })
            .collect()
    }

    /// Merges SQL search rows with the DB2 base overlay and applies filters.
    /// SQL wins per-field; DB2 fills fields SQL didn't carry. Provenance is
    /// decided by presence, never by ID ranges.
    fn merge_search(
        db2_items: HashMap<u32, ItemRecord>,
        db2_sparse: HashMap<u32, ItemSparseRecord>,
        query: ItemSearchQuery,
        mut sql_items: Vec<EffectiveItemSummary>,
    ) -> Vec<EffectiveItemSummary> {
        // `None` means the caller wants every match rather than a page of them.
        let max_limit = query.limit;
        let id_filter = query.search_id.as_deref().unwrap_or("").trim();
        let name_filter = query
            .search_name
            .as_deref()
            .unwrap_or("")
            .trim()
            .to_lowercase();
        let quality_filter = query.quality;
        let class_filter = query.class_id;
        let subclass_filter = query.subclass_id;

        let mut seen_ids = HashSet::new();
        let mut results: Vec<EffectiveItemSummary> = Vec::new();

        for mut sql_item in sql_items.drain(..) {
            seen_ids.insert(sql_item.entry);

            // SQL may lack the `item` join row; enrich class/subclass/icon from the DB2 base.
            if let Some(basic) = db2_items.get(&sql_item.entry) {
                if sql_item.class_id.is_none() {
                    sql_item.class_id = Some(basic.class_id);
                    sql_item.subclass_id = Some(basic.subclass_id);
                }
                if sql_item.displayid == 0 && basic.icon_file_data_id != 0 {
                    sql_item.displayid = basic.icon_file_data_id;
                }
                sql_item.inventory_type = if basic.inventory_type < 0 {
                    0
                } else {
                    basic.inventory_type as u8
                };
            }
            if sql_item.quality == 0 {
                if let Some(sparse) = db2_sparse.get(&sql_item.entry) {
                    sql_item.quality = sparse.overall_quality_id;
                    if sql_item.item_level == 0 {
                        sql_item.item_level = sparse.item_level;
                    }
                    if sql_item.required_level == 0 {
                        sql_item.required_level = sparse.required_level;
                    }
                }
            }

            let matches_id = id_filter.is_empty() || sql_item.entry.to_string().contains(id_filter);
            let matches_name =
                name_filter.is_empty() || sql_item.name.to_lowercase().contains(&name_filter);
            let matches_quality = quality_filter.map_or(true, |q| sql_item.quality == q);
            let matches_class = class_filter.map_or(true, |c| sql_item.class_id == Some(c));
            let matches_subclass =
                subclass_filter.map_or(true, |s| sql_item.subclass_id == Some(s));

            if matches_id && matches_name && matches_quality && matches_class && matches_subclass {
                let has_db2 = db2_sparse.contains_key(&sql_item.entry)
                    || db2_items.contains_key(&sql_item.entry);
                sql_item.source_kind = if has_db2 {
                    ItemSourceKind::SqlOverride
                } else {
                    ItemSourceKind::CustomSql
                };
                sql_item.source_badge = if has_db2 {
                    String::from("SQL Override")
                } else {
                    String::from("Custom SQL")
                };
                results.push(sql_item);
            }
        }

        // DB2-only items that no SQL row overrode.
        for (&id, sparse) in db2_sparse.iter() {
            if max_limit.is_some_and(|max| results.len() >= max) {
                break;
            }
            if seen_ids.contains(&id) {
                continue;
            }

            let matches_id = id_filter.is_empty() || id.to_string().contains(id_filter);
            let matches_name =
                name_filter.is_empty() || sparse.display.to_lowercase().contains(&name_filter);
            let matches_quality = quality_filter.map_or(true, |q| sparse.overall_quality_id == q);

            let basic = db2_items.get(&id);
            let matches_class =
                class_filter.map_or(true, |c| basic.map_or(false, |b| b.class_id == c));
            let matches_subclass =
                subclass_filter.map_or(true, |s| basic.map_or(false, |b| b.subclass_id == s));

            if matches_id && matches_name && matches_quality && matches_class && matches_subclass {
                let source_badge = if basic.is_some() {
                    String::from("Item + ItemSparse")
                } else {
                    String::from("ItemSparse.db2")
                };
                results.push(EffectiveItemSummary {
                    entry: id,
                    name: display_name(&sparse.display, id),
                    displayid: basic.map(|b| b.icon_file_data_id).unwrap_or(0),
                    class_id: basic.map(|b| b.class_id),
                    subclass_id: basic.map(|b| b.subclass_id),
                    quality: sparse.overall_quality_id,
                    item_level: sparse.item_level,
                    required_level: sparse.required_level,
                    inventory_type: basic
                        .map(|b| {
                            if b.inventory_type < 0 {
                                0
                            } else {
                                b.inventory_type as u8
                            }
                        })
                        .unwrap_or(sparse.inventory_type),
                    source_kind: ItemSourceKind::Db2Base,
                    source_badge,
                });
            }
        }

        results.sort_by_key(|r| r.entry);
        if let Some(max) = max_limit {
            results.truncate(max);
        }
        results
    }

    /// Resolves effective per-field values from SQL overlay over DB2 base and
    /// keeps every layer intact for the UI to display provenance.
    fn resolve_effective(
        item_id: u32,
        db2_sparse: Option<ItemSparseRecord>,
        db2_item: Option<ItemRecord>,
        sql_sparse: Option<ItemSparseRecord>,
        sql_item: Option<ItemRecord>,
    ) -> EffectiveItem {
        let has_db2_base = db2_sparse.is_some() || db2_item.is_some();
        let has_sql_override = sql_sparse.is_some() || sql_item.is_some();
        let is_custom = !has_db2_base && has_sql_override;

        let source_kind = if is_custom {
            ItemSourceKind::CustomSql
        } else if has_sql_override {
            ItemSourceKind::SqlOverride
        } else {
            ItemSourceKind::Db2Base
        };

        let db2_source_name = if db2_item.is_some() && db2_sparse.is_some() {
            String::from("Item + ItemSparse")
        } else if db2_sparse.is_some() {
            String::from("ItemSparse.db2")
        } else if db2_item.is_some() {
            String::from("Item.db2")
        } else {
            String::new()
        };

        let source_badge = if is_custom {
            String::from("Custom SQL")
        } else if has_sql_override {
            if has_db2_base {
                format!("SQL Override ({db2_source_name})")
            } else {
                String::from("SQL Hotfix")
            }
        } else {
            db2_source_name.clone()
        };

        let eff_sparse = sql_sparse.as_ref().or(db2_sparse.as_ref());
        let eff_item = sql_item.as_ref().or(db2_item.as_ref());

        EffectiveItem {
            entry: item_id,
            name: eff_sparse
                .map(|sparse| display_name(&sparse.display, item_id))
                .unwrap_or_default(),
            displayid: eff_item.map(|i| i.icon_file_data_id).unwrap_or(0),
            class_id: eff_item.map(|i| i.class_id).unwrap_or(0),
            subclass_id: eff_item.map(|i| i.subclass_id).unwrap_or(0),
            quality: eff_sparse.map(|s| s.overall_quality_id).unwrap_or(0),
            item_level: eff_sparse.map(|s| s.item_level).unwrap_or(0),
            required_level: eff_sparse.map(|s| s.required_level).unwrap_or(0),
            inventory_type: eff_item
                .map(|i| {
                    if i.inventory_type < 0 {
                        0
                    } else {
                        i.inventory_type as u8
                    }
                })
                .or_else(|| eff_sparse.map(|s| s.inventory_type))
                .unwrap_or(0),
            buy_price: eff_sparse.map(|s| s.buy_price).unwrap_or(0),
            sell_price: eff_sparse.map(|s| s.sell_price).unwrap_or(0),
            stackable: eff_sparse.map(|s| s.stackable).unwrap_or(1),
            max_count: eff_sparse.map(|s| s.max_count).unwrap_or(0),
            container_slots: eff_sparse.map(|s| s.container_slots).unwrap_or(0),
            bonding: eff_sparse.map(|s| s.bonding).unwrap_or(0),
            description: eff_sparse
                .map(|s| s.description.clone())
                .unwrap_or_default(),
            source_kind,
            source_badge,
            db2_source_name,
            has_db2_base,
            has_sql_override,
            is_custom,
            db2_sparse,
            db2_item,
            sql_sparse,
            sql_item,
        }
    }

    /// Merges DB2 base effects with their SQL hotfix overrides. SQL wins
    /// whole-record per ID; DB2 supplies effects the hotfix table never
    /// overrode. Provenance is decided by presence, never by ID ranges.
    fn resolve_effective_effects(
        parent_item_id: u32,
        db2_effects: Vec<ItemEffectRecord>,
        sql_effects: Vec<ItemEffectRecord>,
    ) -> Vec<EffectiveItemEffect> {
        let db2_map = db2_effects
            .into_iter()
            .map(|effect| (effect.id, effect))
            .collect::<HashMap<_, _>>();

        let mut seen_ids = HashSet::new();
        let mut results: Vec<EffectiveItemEffect> = Vec::new();

        for sql_effect in sql_effects {
            seen_ids.insert(sql_effect.id);
            let db2_base = db2_map.get(&sql_effect.id);
            let has_db2_base = db2_base.is_some();
            let is_custom = !has_db2_base;

            let source_kind = if is_custom {
                ItemSourceKind::CustomSql
            } else {
                ItemSourceKind::SqlOverride
            };
            let source_badge = if is_custom {
                String::from("Custom SQL")
            } else {
                String::from("SQL Override (ItemEffect.db2)")
            };

            results.push(EffectiveItemEffect {
                id: sql_effect.id,
                legacy_slot_index: sql_effect.legacy_slot_index,
                trigger_type: sql_effect.trigger_type,
                charges: sql_effect.charges,
                cooldown_msec: sql_effect.cooldown_msec,
                category_cooldown_msec: sql_effect.category_cooldown_msec,
                spell_category_id: sql_effect.spell_category_id,
                spell_id: sql_effect.spell_id,
                chr_specialization_id: sql_effect.chr_specialization_id,
                parent_item_id,
                source_kind,
                source_badge,
                has_db2_base,
                has_sql_override: true,
                is_custom,
                db2_effect: db2_base.cloned(),
                sql_effect: Some(sql_effect),
            });
        }

        for (effect_id, db2_effect) in db2_map {
            if seen_ids.contains(&effect_id) {
                continue;
            }
            results.push(EffectiveItemEffect {
                id: effect_id,
                legacy_slot_index: db2_effect.legacy_slot_index,
                trigger_type: db2_effect.trigger_type,
                charges: db2_effect.charges,
                cooldown_msec: db2_effect.cooldown_msec,
                category_cooldown_msec: db2_effect.category_cooldown_msec,
                spell_category_id: db2_effect.spell_category_id,
                spell_id: db2_effect.spell_id,
                chr_specialization_id: db2_effect.chr_specialization_id,
                parent_item_id,
                source_kind: ItemSourceKind::Db2Base,
                source_badge: String::from("ItemEffect.db2"),
                has_db2_base: true,
                has_sql_override: false,
                is_custom: false,
                db2_effect: Some(db2_effect),
                sql_effect: None,
            });
        }

        results.sort_by_key(|effect| (effect.legacy_slot_index, effect.id));
        results
    }
}
