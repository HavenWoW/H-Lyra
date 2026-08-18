//! `Faction.db2` to [`FactionRecord`].
//!
//! The record id is stored in the data at the `ID` column rather than in an id
//! table, which the decode layer resolves from the table metadata.

use std::collections::HashMap;

use crate::db2::decode::Db2Table;
use crate::db2::format::Db2Result;
use crate::db2::mapping::column_indices;
use crate::db2::structures::FactionRecord;

column_indices! {
    crate::db2::meta::tables::FACTION;
    NAME = 1 => "Name",
    DESCRIPTION = 2 => "Description",
    REPUTATION_INDEX = 4 => "ReputationIndex",
    PARENT_FACTION_ID = 5 => "ParentFactionID",
    EXPANSION = 6 => "Expansion",
    FLAGS = 8 => "Flags",
}

pub fn decode(table: &Db2Table) -> Db2Result<HashMap<u32, FactionRecord>> {
    table.decode_all(|id, record| {
        Ok(FactionRecord {
            id,
            name: record.string(NAME, 0)?,
            description: record.string(DESCRIPTION, 0)?,
            reputation_index: record.i16(REPUTATION_INDEX, 0)?,
            parent_faction_id: record.u16(PARENT_FACTION_ID, 0)?,
            expansion: record.u8(EXPANSION, 0)?,
            flags: record.u8(FLAGS, 0)?,
        })
    })
}
