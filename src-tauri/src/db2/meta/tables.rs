//! Verified structural definitions for the DB2 tables Lyra reads.
//!
//! Each definition is transcribed from the corresponding HavenCore
//! `<Table>Meta` (physical structure, layout hash, file id, index and parent
//! columns) and `<Table>LoadInfo` (column names and effective signedness).
//!
//! Registering another table is a matter of adding one constant here and one
//! entry to [`SUPPORTED_TABLES`]; the decoder is entirely metadata-driven and
//! needs no per-table binary code.

use crate::db2::meta::{Db2FieldMeta, Db2TableMeta, FieldType};

use FieldType::{Byte, Float, Int, Long, Short, String as Str, StringNotLocalized as RawStr};

const fn f(name: &'static str, ty: FieldType, array_size: u8, signed: bool) -> Db2FieldMeta {
    Db2FieldMeta::new(name, ty, array_size, signed)
}

/// `Item.db2` — item class, subclass, material, icon.
pub const ITEM: Db2TableMeta = Db2TableMeta {
    name: "Item",
    file_name: "Item.db2",
    file_data_id: 841626,
    layout_hash: 0x4517_779D,
    index_field: -1,
    parent_index_field: -1,
    file_field_count: 8,
    fields: &[
        f("ClassID", Byte, 1, false),
        f("SubclassID", Byte, 1, false),
        f("Material", Byte, 1, false),
        f("InventoryType", Byte, 1, true),
        f("SheatheType", Byte, 1, false),
        f("SoundOverrideSubclassID", Byte, 1, true),
        f("IconFileDataID", Int, 1, true),
        f("ItemGroupSoundsID", Byte, 1, false),
    ],
};

/// `ItemSparse.db2` — extended item data. Stored as sparse records, so field
/// widths come from the file's field entries rather than from column metadata.
pub const ITEM_SPARSE: Db2TableMeta = Db2TableMeta {
    name: "ItemSparse",
    file_name: "ItemSparse.db2",
    file_data_id: 1572924,
    layout_hash: 0xAC42_0B53,
    index_field: -1,
    parent_index_field: -1,
    file_field_count: 62,
    fields: &[
        f("AllowableRace", Long, 1, true),
        f("Description", Str, 1, false),
        f("Display3", Str, 1, false),
        f("Display2", Str, 1, false),
        f("Display1", Str, 1, false),
        f("Display", Str, 1, false),
        f("DmgVariance", Float, 1, false),
        f("DurationInInventory", Int, 1, false),
        f("QualityModifier", Float, 1, false),
        f("BagFamily", Int, 1, false),
        f("ItemRange", Float, 1, false),
        f("StatPercentageOfSocket", Float, 10, false),
        f("StatPercentEditor", Int, 10, true),
        f("Stackable", Int, 1, true),
        f("MaxCount", Int, 1, true),
        f("RequiredAbility", Int, 1, false),
        f("SellPrice", Int, 1, false),
        f("BuyPrice", Int, 1, false),
        f("VendorStackCount", Int, 1, false),
        f("PriceVariance", Float, 1, false),
        f("PriceRandomValue", Float, 1, false),
        f("Flags", Int, 4, true),
        f("FactionRelated", Int, 1, true),
        f("ItemNameDescriptionID", Short, 1, false),
        f("RequiredTransmogHoliday", Short, 1, false),
        f("RequiredHoliday", Short, 1, false),
        f("LimitCategory", Short, 1, false),
        f("GemProperties", Short, 1, false),
        f("SocketMatchEnchantmentId", Short, 1, false),
        f("TotemCategoryID", Short, 1, false),
        f("InstanceBound", Short, 1, false),
        f("ZoneBound", Short, 2, false),
        f("ItemSet", Short, 1, false),
        f("LockID", Short, 1, false),
        f("StartQuestID", Short, 1, false),
        f("PageID", Short, 1, false),
        f("ItemDelay", Short, 1, false),
        f("ScalingStatDistributionID", Short, 1, false),
        f("MinFactionID", Short, 1, false),
        f("RequiredSkillRank", Short, 1, false),
        f("RequiredSkill", Short, 1, false),
        f("ItemLevel", Short, 1, false),
        f("AllowableClass", Short, 1, true),
        f("ExpansionID", Byte, 1, false),
        f("ArtifactID", Byte, 1, false),
        f("SpellWeight", Byte, 1, false),
        f("SpellWeightCategory", Byte, 1, false),
        f("SocketType", Byte, 3, false),
        f("SheatheType", Byte, 1, false),
        f("Material", Byte, 1, false),
        f("PageMaterialID", Byte, 1, false),
        f("LanguageID", Byte, 1, false),
        f("Bonding", Byte, 1, false),
        f("DamageDamageType", Byte, 1, false),
        f("StatModifierBonusStat", Byte, 10, true),
        f("ContainerSlots", Byte, 1, false),
        f("MinReputation", Byte, 1, false),
        f("RequiredPVPMedal", Byte, 1, false),
        f("RequiredPVPRank", Byte, 1, false),
        f("RequiredLevel", Byte, 1, true),
        f("InventoryType", Byte, 1, false),
        f("OverallQualityID", Byte, 1, false),
    ],
};

/// `ItemEffect.db2` — spell effects attached to items.
///
/// `ParentItemID` is not stored per record: the file carries a parent lookup and
/// the column is appended to the loaded structure, which is why
/// `file_field_count` is one less than the column count.
pub const ITEM_EFFECT: Db2TableMeta = Db2TableMeta {
    name: "ItemEffect",
    file_name: "ItemEffect.db2",
    file_data_id: 969941,
    layout_hash: 0xE3E9_5759,
    index_field: -1,
    parent_index_field: 8,
    file_field_count: 8,
    fields: &[
        f("LegacySlotIndex", Byte, 1, false),
        f("TriggerType", Byte, 1, true),
        f("Charges", Short, 1, true),
        f("CoolDownMSec", Int, 1, true),
        f("CategoryCoolDownMSec", Int, 1, true),
        f("SpellCategoryID", Short, 1, false),
        f("SpellID", Int, 1, true),
        f("ChrSpecializationID", Short, 1, false),
        f("ParentItemID", Int, 1, false),
    ],
};

/// `Faction.db2` — reputation factions. The record id is stored in the data at
/// column 3 rather than in an id table.
pub const FACTION: Db2TableMeta = Db2TableMeta {
    name: "Faction",
    file_name: "Faction.db2",
    file_data_id: 1361972,
    layout_hash: 0x451E_56EC,
    index_field: 3,
    parent_index_field: -1,
    file_field_count: 16,
    fields: &[
        f("ReputationRaceMask", Long, 4, true),
        f("Name", Str, 1, false),
        f("Description", Str, 1, false),
        f("ID", Int, 1, false),
        f("ReputationIndex", Short, 1, true),
        f("ParentFactionID", Short, 1, false),
        f("Expansion", Byte, 1, false),
        f("FriendshipRepID", Int, 1, false),
        f("Flags", Byte, 1, false),
        f("ParagonFactionID", Short, 1, false),
        f("ReputationClassMask", Short, 4, true),
        f("ReputationFlags", Short, 4, false),
        f("ReputationBase", Int, 4, true),
        f("ReputationMax", Int, 4, true),
        f("ParentFactionMod", Float, 2, false),
        f("ParentFactionCap", Byte, 2, false),
    ],
};

/// `FactionTemplate.db2` — faction hostility groups.
pub const FACTION_TEMPLATE: Db2TableMeta = Db2TableMeta {
    name: "FactionTemplate",
    file_name: "FactionTemplate.db2",
    file_data_id: 1361579,
    layout_hash: 0xDB7D_5E30,
    index_field: -1,
    parent_index_field: -1,
    file_field_count: 7,
    fields: &[
        f("Faction", Short, 1, false),
        f("Flags", Short, 1, false),
        f("FactionGroup", Byte, 1, false),
        f("FriendGroup", Byte, 1, false),
        f("EnemyGroup", Byte, 1, false),
        f("Enemies", Short, 4, false),
        f("Friend", Short, 4, false),
    ],
};

/// `Emotes.db2` — emote animations and slash commands.
pub const EMOTES: Db2TableMeta = Db2TableMeta {
    name: "Emotes",
    file_name: "Emotes.db2",
    file_data_id: 1343602,
    layout_hash: 0x704A_62E9,
    index_field: -1,
    parent_index_field: -1,
    file_field_count: 9,
    fields: &[
        f("RaceMask", Long, 1, true),
        f("EmoteSlashCommand", RawStr, 1, false),
        f("AnimID", Int, 1, true),
        f("EmoteFlags", Int, 1, false),
        f("EmoteSpecProc", Byte, 1, false),
        f("EmoteSpecProcParam", Int, 1, false),
        f("EventSoundID", Int, 1, false),
        f("SpellVisualKitID", Int, 1, false),
        f("ClassMask", Int, 1, true),
    ],
};

/// `EmotesText.db2` — text emote names and the emote they trigger.
pub const EMOTES_TEXT: Db2TableMeta = Db2TableMeta {
    name: "EmotesText",
    file_name: "EmotesText.db2",
    file_data_id: 1347273,
    layout_hash: 0x6C60_0BD2,
    index_field: -1,
    parent_index_field: -1,
    file_field_count: 2,
    fields: &[f("Name", RawStr, 1, false), f("EmoteID", Short, 1, false)],
};

/// Every table Lyra can decode today.
pub const SUPPORTED_TABLES: &[&Db2TableMeta] = &[
    &ITEM,
    &ITEM_SPARSE,
    &ITEM_EFFECT,
    &FACTION,
    &FACTION_TEMPLATE,
    &EMOTES,
    &EMOTES_TEXT,
];

/// Looks up a registered table by its canonical name.
pub fn table_by_name(name: &str) -> Option<&'static Db2TableMeta> {
    SUPPORTED_TABLES
        .iter()
        .copied()
        .find(|table| table.name.eq_ignore_ascii_case(name))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn item_sparse_declares_every_column() {
        assert_eq!(ITEM_SPARSE.field_count(), 62);
        assert_eq!(ITEM_SPARSE.file_field_count, 62);
        // Arrays expanded, this is the column count the hotfix table carries
        // besides the id: 62 columns hold 95 scalar values.
        assert_eq!(ITEM_SPARSE.value_count(), 95);
    }

    #[test]
    fn faction_reads_its_id_from_the_data() {
        assert!(FACTION.has_index_in_data());
        assert_eq!(FACTION.index_field_index(), 3);
        assert_eq!(FACTION.field(3).map(|field| field.name), Some("ID"));
    }

    #[test]
    fn table_lookup_is_case_insensitive() {
        assert_eq!(
            table_by_name("itemsparse").map(|t| t.name),
            Some("ItemSparse")
        );
        assert!(table_by_name("CreatureTemplate").is_none());
    }

    #[test]
    fn layout_hashes_are_unique_per_table() {
        for (index, table) in SUPPORTED_TABLES.iter().enumerate() {
            for other in &SUPPORTED_TABLES[index + 1..] {
                assert_ne!(
                    table.layout_hash, other.layout_hash,
                    "{} and {} share a layout hash",
                    table.name, other.name
                );
                assert_ne!(
                    table.file_data_id, other.file_data_id,
                    "{} and {} share a file id",
                    table.name, other.name
                );
            }
        }
    }
}
