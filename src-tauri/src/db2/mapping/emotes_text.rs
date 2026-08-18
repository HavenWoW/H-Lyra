//! `EmotesText.db2` to [`EmotesTextRecord`].

use std::collections::HashMap;

use crate::db2::decode::Db2Table;
use crate::db2::format::Db2Result;
use crate::db2::mapping::column_indices;
use crate::db2::structures::EmotesTextRecord;

column_indices! {
    crate::db2::meta::tables::EMOTES_TEXT;
    NAME = 0 => "Name",
    EMOTE_ID = 1 => "EmoteID",
}

pub fn decode(table: &Db2Table) -> Db2Result<HashMap<u32, EmotesTextRecord>> {
    table.decode_all(|id, record| {
        Ok(EmotesTextRecord {
            id,
            name: record.string(NAME, 0)?,
            emote_id: record.u16(EMOTE_ID, 0)?,
        })
    })
}
