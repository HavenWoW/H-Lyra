//! HavenCore BFA 8.3.7 (Build 35662) DB2 Structure Definitions
//!
//! Mirrors `src/server/game/DataStores/DB2Structure.h`.

use serde::{Deserialize, Serialize};

pub const MAX_ITEM_PROTO_STATS: usize = 10;
pub const MAX_ITEM_PROTO_FLAGS: usize = 4;
pub const MAX_ITEM_PROTO_ZONES: usize = 2;
pub const MAX_ITEM_PROTO_SOCKETS: usize = 3;

/// Basic Item Data (Item.db2 / bfa_hotfixes.item)
/// Table Hash: 0x4517779D (1159165853) / 0x501C7482 (1344507586)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ItemRecord {
    pub id: u32,
    pub class_id: u8,
    pub subclass_id: u8,
    pub material: u8,
    pub inventory_type: i8,
    pub sheathe_type: u8,
    pub sound_override_subclass_id: i8,
    pub icon_file_data_id: i32,
    pub item_group_sounds_id: u8,
}

/// Extended Item Data (ItemSparse.db2 / bfa_hotfixes.item_sparse)
/// Table Hash: 0x919B278E (2442913102)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ItemSparseRecord {
    pub id: u32,
    pub allowable_race: i64,
    pub description: String,
    pub display3: String,
    pub display2: String,
    pub display1: String,
    pub display: String, // Main Item Name
    pub dmg_variance: float_pretty,
    pub duration_in_inventory: u32,
    pub quality_modifier: float_pretty,
    pub bag_family: u32,
    pub item_range: float_pretty,
    pub stat_percentage_of_socket: [f32; MAX_ITEM_PROTO_STATS],
    pub stat_percent_editor: [i32; MAX_ITEM_PROTO_STATS],
    pub stackable: i32,
    pub max_count: i32,
    pub required_ability: u32,
    pub sell_price: u32,
    pub buy_price: u32,
    pub vendor_stack_count: u32,
    pub price_variance: float_pretty,
    pub price_random_value: float_pretty,
    pub flags: [i32; MAX_ITEM_PROTO_FLAGS],
    pub faction_related: i32,
    pub item_name_description_id: u16,
    pub required_transmog_holiday: u16,
    pub required_holiday: u16,
    pub limit_category: u16,
    pub gem_properties: u16,
    pub socket_match_enchantment_id: u16,
    pub totem_category_id: u16,
    pub instance_bound: u16,
    pub zone_bound: [u16; MAX_ITEM_PROTO_ZONES],
    pub item_set: u16,
    pub lock_id: u16,
    pub start_quest_id: u16,
    pub page_id: u16,
    pub item_delay: u16,
    pub scaling_stat_distribution_id: u16,
    pub min_faction_id: u16,
    pub required_skill_rank: u16,
    pub required_skill: u16,
    pub item_level: u16,
    pub allowable_class: i16,
    pub expansion_id: u8,
    pub artifact_id: u8,
    pub spell_weight: u8,
    pub spell_weight_category: u8,
    pub socket_type: [u8; MAX_ITEM_PROTO_SOCKETS],
    pub sheathe_type: u8,
    pub material: u8,
    pub page_material_id: u8,
    pub language_id: u8,
    pub bonding: u8,
    pub damage_damage_type: u8,
    pub stat_modifier_bonus_stat: [i8; MAX_ITEM_PROTO_STATS],
    pub container_slots: u8,
    pub min_reputation: u8,
    pub required_pvp_medal: u8,
    pub required_pvp_rank: u8,
    pub required_level: i8,
    pub inventory_type: u8,
    pub overall_quality_id: u8,
}

#[allow(non_camel_case_types)]
pub type float_pretty = f32;

/// Item Spell Effect (ItemEffect.db2 / bfa_hotfixes.item_effect)
/// Table Hash: 0x4226BF19 (1109793673)
///
/// Field order and types mirror `ItemEffectLoadInfo` (BFA 8.3.7) and the
/// `item_effect` hotfix schema: ID, LegacySlotIndex, TriggerType, Charges,
/// CoolDownMSec, CategoryCoolDownMSec, SpellCategoryID, SpellID,
/// ChrSpecializationID, ParentItemID.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ItemEffectRecord {
    pub id: u32,
    pub legacy_slot_index: u8,
    pub trigger_type: i8,
    pub charges: i16,
    pub cooldown_msec: i32,
    pub category_cooldown_msec: i32,
    pub spell_category_id: u16,
    pub spell_id: i32,
    pub chr_specialization_id: u16,
    pub parent_item_id: u32,
}

/// Item Modified Appearance (ItemModifiedAppearance.db2 / bfa_hotfixes.item_modified_appearance)
/// Table Hash: 0x40026211 (1073915313)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ItemModifiedAppearanceRecord {
    pub id: u32,
    pub item_id: u32,
    pub appearance_mod_id: u8,
    pub appearance_id: u32,
    pub icon_file_data_id: i32,
    pub item_appearance_modifier_id: u8,
    pub transmog_source_type_enum: u8,
}

/// Source Metadata for Unified Item Layering
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ItemSourceKind {
    Db2Base,
    SqlOverride,
    CustomSql,
    Hybrid,
}

/// Unified Effective Item Model merging DB2 Base + SQL Hotfixes + Server Addon
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EffectiveItem {
    pub entry: u32,
    pub name: String,
    pub displayid: i32,
    pub class_id: u8,
    pub subclass_id: u8,
    pub quality: u8,
    pub item_level: u16,
    pub required_level: i8,
    pub inventory_type: u8,
    pub buy_price: u32,
    pub sell_price: u32,
    pub stackable: i32,
    pub max_count: i32,
    pub container_slots: u8,
    pub bonding: u8,
    pub description: String,
    pub source_kind: ItemSourceKind,
    pub source_badge: String,
    pub db2_source_name: String,
    pub has_db2_base: bool,
    pub has_sql_override: bool,
    pub is_custom: bool,
    pub db2_sparse: Option<ItemSparseRecord>,
    pub db2_item: Option<ItemRecord>,
    pub sql_sparse: Option<ItemSparseRecord>,
    pub sql_item: Option<ItemRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ItemSearchQuery {
    pub search_id: Option<String>,
    pub search_name: Option<String>,
    pub limit: Option<usize>,
    pub class_id: Option<u8>,
    pub subclass_id: Option<u8>,
    pub quality: Option<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EffectiveItemSummary {
    pub entry: u32,
    pub name: String,
    pub displayid: i32,
    pub class_id: Option<u8>,
    pub subclass_id: Option<u8>,
    pub quality: u8,
    pub item_level: u16,
    pub required_level: i8,
    pub inventory_type: u8,
    pub source_kind: ItemSourceKind,
    pub source_badge: String,
}

/// Unified effective item effect merging the DB2 `ItemEffect` base with the
/// SQL `item_effect` hotfix overlay. Keeps every layer intact so the UI can
/// display provenance, mirroring `EffectiveItem`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EffectiveItemEffect {
    pub id: u32,
    pub legacy_slot_index: u8,
    pub trigger_type: i8,
    pub charges: i16,
    pub cooldown_msec: i32,
    pub category_cooldown_msec: i32,
    pub spell_category_id: u16,
    pub spell_id: i32,
    pub chr_specialization_id: u16,
    pub parent_item_id: u32,
    pub source_kind: ItemSourceKind,
    pub source_badge: String,
    pub has_db2_base: bool,
    pub has_sql_override: bool,
    pub is_custom: bool,
    pub db2_effect: Option<ItemEffectRecord>,
    pub sql_effect: Option<ItemEffectRecord>,
}

/// Faction Entry (`Faction.db2` / `bfa_hotfixes.faction`)
/// Table Hash: 0x451E56EC (1159616236)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FactionRecord {
    pub id: u32,
    pub name: String,
    pub description: String,
    pub reputation_index: i16,
    pub parent_faction_id: u16,
    pub expansion: u8,
    pub flags: u8,
}

/// Faction Template Entry (`FactionTemplate.db2` / `bfa_hotfixes.faction_template`)
/// Table Hash: 0xDB7D5E30 (3682426416)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FactionTemplateRecord {
    pub id: u32,
    pub faction: u16,
    pub flags: u16,
    pub faction_group: u8,
    pub friend_group: u8,
    pub enemy_group: u8,
}

/// Emote Entry (`Emotes.db2` / `bfa_hotfixes.emotes`)
/// Table Hash: 0x704A62E9 (1883923177)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EmoteRecord {
    pub id: u32,
    pub emote_slash_command: String,
    pub anim_id: u32,
    pub emote_flags: u32,
    pub emote_spec_proc: u8,
}

/// Text Emote Entry (`EmotesText.db2` / `bfa_hotfixes.emotes_text`)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EmotesTextRecord {
    pub id: u32,
    pub name: String,
    pub emote_id: u16,
}
