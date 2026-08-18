//! `Item.db2` to [`ItemRecord`].

use std::collections::HashMap;

use crate::db2::decode::Db2Table;
use crate::db2::format::Db2Result;
use crate::db2::mapping::column_indices;
use crate::db2::structures::ItemRecord;

column_indices! {
    crate::db2::meta::tables::ITEM;
    CLASS_ID = 0 => "ClassID",
    SUBCLASS_ID = 1 => "SubclassID",
    MATERIAL = 2 => "Material",
    INVENTORY_TYPE = 3 => "InventoryType",
    SHEATHE_TYPE = 4 => "SheatheType",
    SOUND_OVERRIDE_SUBCLASS_ID = 5 => "SoundOverrideSubclassID",
    ICON_FILE_DATA_ID = 6 => "IconFileDataID",
    ITEM_GROUP_SOUNDS_ID = 7 => "ItemGroupSoundsID",
}

pub fn decode(table: &Db2Table) -> Db2Result<HashMap<u32, ItemRecord>> {
    table.decode_all(|id, record| {
        Ok(ItemRecord {
            id,
            class_id: record.u8(CLASS_ID, 0)?,
            subclass_id: record.u8(SUBCLASS_ID, 0)?,
            material: record.u8(MATERIAL, 0)?,
            inventory_type: record.i8(INVENTORY_TYPE, 0)?,
            sheathe_type: record.u8(SHEATHE_TYPE, 0)?,
            sound_override_subclass_id: record.i8(SOUND_OVERRIDE_SUBCLASS_ID, 0)?,
            icon_file_data_id: record.i32(ICON_FILE_DATA_ID, 0)?,
            item_group_sounds_id: record.u8(ITEM_GROUP_SOUNDS_ID, 0)?,
        })
    })
}
