//! `ItemEffect.db2` to [`ItemEffectRecord`].
//!
//! `ParentItemID` is supplied by the file's parent lookup rather than stored in
//! the record, which the decode layer resolves transparently.

use std::collections::HashMap;

use crate::db2::decode::Db2Table;
use crate::db2::format::Db2Result;
use crate::db2::mapping::column_indices;
use crate::db2::structures::ItemEffectRecord;

column_indices! {
    crate::db2::meta::tables::ITEM_EFFECT;
    LEGACY_SLOT_INDEX = 0 => "LegacySlotIndex",
    TRIGGER_TYPE = 1 => "TriggerType",
    CHARGES = 2 => "Charges",
    COOLDOWN_MSEC = 3 => "CoolDownMSec",
    CATEGORY_COOLDOWN_MSEC = 4 => "CategoryCoolDownMSec",
    SPELL_CATEGORY_ID = 5 => "SpellCategoryID",
    SPELL_ID = 6 => "SpellID",
    CHR_SPECIALIZATION_ID = 7 => "ChrSpecializationID",
    PARENT_ITEM_ID = 8 => "ParentItemID",
}

pub fn decode(table: &Db2Table) -> Db2Result<HashMap<u32, ItemEffectRecord>> {
    table.decode_all(|id, record| {
        Ok(ItemEffectRecord {
            id,
            legacy_slot_index: record.u8(LEGACY_SLOT_INDEX, 0)?,
            trigger_type: record.i8(TRIGGER_TYPE, 0)?,
            charges: record.i16(CHARGES, 0)?,
            cooldown_msec: record.i32(COOLDOWN_MSEC, 0)?,
            category_cooldown_msec: record.i32(CATEGORY_COOLDOWN_MSEC, 0)?,
            spell_category_id: record.u16(SPELL_CATEGORY_ID, 0)?,
            spell_id: record.i32(SPELL_ID, 0)?,
            chr_specialization_id: record.u16(CHR_SPECIALIZATION_ID, 0)?,
            parent_item_id: record.u32(PARENT_ITEM_ID, 0)?,
        })
    })
}
