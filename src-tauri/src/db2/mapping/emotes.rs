//! `Emotes.db2` to [`EmoteRecord`].

use std::collections::HashMap;

use crate::db2::decode::Db2Table;
use crate::db2::format::Db2Result;
use crate::db2::mapping::column_indices;
use crate::db2::structures::EmoteRecord;

column_indices! {
    crate::db2::meta::tables::EMOTES;
    EMOTE_SLASH_COMMAND = 1 => "EmoteSlashCommand",
    ANIM_ID = 2 => "AnimID",
    EMOTE_FLAGS = 3 => "EmoteFlags",
    EMOTE_SPEC_PROC = 4 => "EmoteSpecProc",
}

pub fn decode(table: &Db2Table) -> Db2Result<HashMap<u32, EmoteRecord>> {
    table.decode_all(|id, record| {
        Ok(EmoteRecord {
            id,
            emote_slash_command: record.string(EMOTE_SLASH_COMMAND, 0)?,
            anim_id: record.u32(ANIM_ID, 0)?,
            emote_flags: record.u32(EMOTE_FLAGS, 0)?,
            emote_spec_proc: record.u8(EMOTE_SPEC_PROC, 0)?,
        })
    })
}
