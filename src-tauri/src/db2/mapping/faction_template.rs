//! `FactionTemplate.db2` to [`FactionTemplateRecord`].

use std::collections::HashMap;

use crate::db2::decode::Db2Table;
use crate::db2::format::Db2Result;
use crate::db2::mapping::column_indices;
use crate::db2::structures::FactionTemplateRecord;

column_indices! {
    crate::db2::meta::tables::FACTION_TEMPLATE;
    FACTION = 0 => "Faction",
    FLAGS = 1 => "Flags",
    FACTION_GROUP = 2 => "FactionGroup",
    FRIEND_GROUP = 3 => "FriendGroup",
    ENEMY_GROUP = 4 => "EnemyGroup",
}

pub fn decode(table: &Db2Table) -> Db2Result<HashMap<u32, FactionTemplateRecord>> {
    table.decode_all(|id, record| {
        Ok(FactionTemplateRecord {
            id,
            faction: record.u16(FACTION, 0)?,
            flags: record.u16(FLAGS, 0)?,
            faction_group: record.u8(FACTION_GROUP, 0)?,
            friend_group: record.u8(FRIEND_GROUP, 0)?,
            enemy_group: record.u8(ENEMY_GROUP, 0)?,
        })
    })
}
