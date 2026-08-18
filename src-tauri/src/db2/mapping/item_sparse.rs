//! `ItemSparse.db2` to [`ItemSparseRecord`].
//!
//! Every value is read through the metadata-driven decoder; the record layout
//! is derived from the file's own field entries, not from the width of the
//! destination struct member.

use std::collections::HashMap;

use crate::db2::decode::{Db2Table, Record};
use crate::db2::format::Db2Result;
use crate::db2::mapping::column_indices;
use crate::db2::structures::{
    ItemSparseRecord, MAX_ITEM_PROTO_FLAGS, MAX_ITEM_PROTO_SOCKETS, MAX_ITEM_PROTO_STATS,
    MAX_ITEM_PROTO_ZONES,
};

column_indices! {
    crate::db2::meta::tables::ITEM_SPARSE;
    ALLOWABLE_RACE = 0 => "AllowableRace",
    DESCRIPTION = 1 => "Description",
    DISPLAY3 = 2 => "Display3",
    DISPLAY2 = 3 => "Display2",
    DISPLAY1 = 4 => "Display1",
    DISPLAY = 5 => "Display",
    DMG_VARIANCE = 6 => "DmgVariance",
    DURATION_IN_INVENTORY = 7 => "DurationInInventory",
    QUALITY_MODIFIER = 8 => "QualityModifier",
    BAG_FAMILY = 9 => "BagFamily",
    ITEM_RANGE = 10 => "ItemRange",
    STAT_PERCENTAGE_OF_SOCKET = 11 => "StatPercentageOfSocket",
    STAT_PERCENT_EDITOR = 12 => "StatPercentEditor",
    STACKABLE = 13 => "Stackable",
    MAX_COUNT = 14 => "MaxCount",
    REQUIRED_ABILITY = 15 => "RequiredAbility",
    SELL_PRICE = 16 => "SellPrice",
    BUY_PRICE = 17 => "BuyPrice",
    VENDOR_STACK_COUNT = 18 => "VendorStackCount",
    PRICE_VARIANCE = 19 => "PriceVariance",
    PRICE_RANDOM_VALUE = 20 => "PriceRandomValue",
    FLAGS = 21 => "Flags",
    FACTION_RELATED = 22 => "FactionRelated",
    ITEM_NAME_DESCRIPTION_ID = 23 => "ItemNameDescriptionID",
    REQUIRED_TRANSMOG_HOLIDAY = 24 => "RequiredTransmogHoliday",
    REQUIRED_HOLIDAY = 25 => "RequiredHoliday",
    LIMIT_CATEGORY = 26 => "LimitCategory",
    GEM_PROPERTIES = 27 => "GemProperties",
    SOCKET_MATCH_ENCHANTMENT_ID = 28 => "SocketMatchEnchantmentId",
    TOTEM_CATEGORY_ID = 29 => "TotemCategoryID",
    INSTANCE_BOUND = 30 => "InstanceBound",
    ZONE_BOUND = 31 => "ZoneBound",
    ITEM_SET = 32 => "ItemSet",
    LOCK_ID = 33 => "LockID",
    START_QUEST_ID = 34 => "StartQuestID",
    PAGE_ID = 35 => "PageID",
    ITEM_DELAY = 36 => "ItemDelay",
    SCALING_STAT_DISTRIBUTION_ID = 37 => "ScalingStatDistributionID",
    MIN_FACTION_ID = 38 => "MinFactionID",
    REQUIRED_SKILL_RANK = 39 => "RequiredSkillRank",
    REQUIRED_SKILL = 40 => "RequiredSkill",
    ITEM_LEVEL = 41 => "ItemLevel",
    ALLOWABLE_CLASS = 42 => "AllowableClass",
    EXPANSION_ID = 43 => "ExpansionID",
    ARTIFACT_ID = 44 => "ArtifactID",
    SPELL_WEIGHT = 45 => "SpellWeight",
    SPELL_WEIGHT_CATEGORY = 46 => "SpellWeightCategory",
    SOCKET_TYPE = 47 => "SocketType",
    SHEATHE_TYPE = 48 => "SheatheType",
    MATERIAL = 49 => "Material",
    PAGE_MATERIAL_ID = 50 => "PageMaterialID",
    LANGUAGE_ID = 51 => "LanguageID",
    BONDING = 52 => "Bonding",
    DAMAGE_DAMAGE_TYPE = 53 => "DamageDamageType",
    STAT_MODIFIER_BONUS_STAT = 54 => "StatModifierBonusStat",
    CONTAINER_SLOTS = 55 => "ContainerSlots",
    MIN_REPUTATION = 56 => "MinReputation",
    REQUIRED_PVP_MEDAL = 57 => "RequiredPVPMedal",
    REQUIRED_PVP_RANK = 58 => "RequiredPVPRank",
    REQUIRED_LEVEL = 59 => "RequiredLevel",
    INVENTORY_TYPE = 60 => "InventoryType",
    OVERALL_QUALITY_ID = 61 => "OverallQualityID",
}

pub fn decode(table: &Db2Table) -> Db2Result<HashMap<u32, ItemSparseRecord>> {
    table.decode_all(map_record)
}

fn map_record(id: u32, record: &Record<'_>) -> Db2Result<ItemSparseRecord> {
    let mut stat_percentage_of_socket = [0.0f32; MAX_ITEM_PROTO_STATS];
    for (index, slot) in stat_percentage_of_socket.iter_mut().enumerate() {
        *slot = record.f32(STAT_PERCENTAGE_OF_SOCKET, index)?;
    }

    let mut stat_percent_editor = [0i32; MAX_ITEM_PROTO_STATS];
    for (index, slot) in stat_percent_editor.iter_mut().enumerate() {
        *slot = record.i32(STAT_PERCENT_EDITOR, index)?;
    }

    let mut flags = [0i32; MAX_ITEM_PROTO_FLAGS];
    for (index, slot) in flags.iter_mut().enumerate() {
        *slot = record.i32(FLAGS, index)?;
    }

    let mut zone_bound = [0u16; MAX_ITEM_PROTO_ZONES];
    for (index, slot) in zone_bound.iter_mut().enumerate() {
        *slot = record.u16(ZONE_BOUND, index)?;
    }

    let mut socket_type = [0u8; MAX_ITEM_PROTO_SOCKETS];
    for (index, slot) in socket_type.iter_mut().enumerate() {
        *slot = record.u8(SOCKET_TYPE, index)?;
    }

    let mut stat_modifier_bonus_stat = [0i8; MAX_ITEM_PROTO_STATS];
    for (index, slot) in stat_modifier_bonus_stat.iter_mut().enumerate() {
        *slot = record.i8(STAT_MODIFIER_BONUS_STAT, index)?;
    }

    Ok(ItemSparseRecord {
        id,
        allowable_race: record.i64(ALLOWABLE_RACE, 0)?,
        description: record.string(DESCRIPTION, 0)?,
        display3: record.string(DISPLAY3, 0)?,
        display2: record.string(DISPLAY2, 0)?,
        display1: record.string(DISPLAY1, 0)?,
        display: record.string(DISPLAY, 0)?,
        dmg_variance: record.f32(DMG_VARIANCE, 0)?,
        duration_in_inventory: record.u32(DURATION_IN_INVENTORY, 0)?,
        quality_modifier: record.f32(QUALITY_MODIFIER, 0)?,
        bag_family: record.u32(BAG_FAMILY, 0)?,
        item_range: record.f32(ITEM_RANGE, 0)?,
        stat_percentage_of_socket,
        stat_percent_editor,
        stackable: record.i32(STACKABLE, 0)?,
        max_count: record.i32(MAX_COUNT, 0)?,
        required_ability: record.u32(REQUIRED_ABILITY, 0)?,
        sell_price: record.u32(SELL_PRICE, 0)?,
        buy_price: record.u32(BUY_PRICE, 0)?,
        vendor_stack_count: record.u32(VENDOR_STACK_COUNT, 0)?,
        price_variance: record.f32(PRICE_VARIANCE, 0)?,
        price_random_value: record.f32(PRICE_RANDOM_VALUE, 0)?,
        flags,
        faction_related: record.i32(FACTION_RELATED, 0)?,
        item_name_description_id: record.u16(ITEM_NAME_DESCRIPTION_ID, 0)?,
        required_transmog_holiday: record.u16(REQUIRED_TRANSMOG_HOLIDAY, 0)?,
        required_holiday: record.u16(REQUIRED_HOLIDAY, 0)?,
        limit_category: record.u16(LIMIT_CATEGORY, 0)?,
        gem_properties: record.u16(GEM_PROPERTIES, 0)?,
        socket_match_enchantment_id: record.u16(SOCKET_MATCH_ENCHANTMENT_ID, 0)?,
        totem_category_id: record.u16(TOTEM_CATEGORY_ID, 0)?,
        instance_bound: record.u16(INSTANCE_BOUND, 0)?,
        zone_bound,
        item_set: record.u16(ITEM_SET, 0)?,
        lock_id: record.u16(LOCK_ID, 0)?,
        start_quest_id: record.u16(START_QUEST_ID, 0)?,
        page_id: record.u16(PAGE_ID, 0)?,
        item_delay: record.u16(ITEM_DELAY, 0)?,
        scaling_stat_distribution_id: record.u16(SCALING_STAT_DISTRIBUTION_ID, 0)?,
        min_faction_id: record.u16(MIN_FACTION_ID, 0)?,
        required_skill_rank: record.u16(REQUIRED_SKILL_RANK, 0)?,
        required_skill: record.u16(REQUIRED_SKILL, 0)?,
        item_level: record.u16(ITEM_LEVEL, 0)?,
        allowable_class: record.i16(ALLOWABLE_CLASS, 0)?,
        expansion_id: record.u8(EXPANSION_ID, 0)?,
        artifact_id: record.u8(ARTIFACT_ID, 0)?,
        spell_weight: record.u8(SPELL_WEIGHT, 0)?,
        spell_weight_category: record.u8(SPELL_WEIGHT_CATEGORY, 0)?,
        socket_type,
        sheathe_type: record.u8(SHEATHE_TYPE, 0)?,
        material: record.u8(MATERIAL, 0)?,
        page_material_id: record.u8(PAGE_MATERIAL_ID, 0)?,
        language_id: record.u8(LANGUAGE_ID, 0)?,
        bonding: record.u8(BONDING, 0)?,
        damage_damage_type: record.u8(DAMAGE_DAMAGE_TYPE, 0)?,
        stat_modifier_bonus_stat,
        container_slots: record.u8(CONTAINER_SLOTS, 0)?,
        min_reputation: record.u8(MIN_REPUTATION, 0)?,
        required_pvp_medal: record.u8(REQUIRED_PVP_MEDAL, 0)?,
        required_pvp_rank: record.u8(REQUIRED_PVP_RANK, 0)?,
        required_level: record.i8(REQUIRED_LEVEL, 0)?,
        inventory_type: record.u8(INVENTORY_TYPE, 0)?,
        overall_quality_id: record.u8(OVERALL_QUALITY_ID, 0)?,
    })
}
