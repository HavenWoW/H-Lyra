use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartScriptRow {
    pub entryorguid: i64,
    pub source_type: u8,
    pub id: u16,
    pub link: u16,
    pub event_type: u8,
    pub event_phase_mask: u16,
    pub event_chance: u8,
    pub event_flags: u32,
    pub event_param1: u32,
    pub event_param2: u32,
    pub event_param3: u32,
    pub event_param4: u32,
    pub event_param5: u32,
    pub event_param_string: String,
    pub action_type: u8,
    pub action_param1: i32,
    pub action_param2: i32,
    pub action_param3: i32,
    pub action_param4: i32,
    pub action_param5: i32,
    pub action_param6: i32,
    pub target_type: u8,
    pub target_param1: u32,
    pub target_param2: u32,
    pub target_param3: u32,
    pub target_x: f32,
    pub target_y: f32,
    pub target_z: f32,
    pub target_o: f32,
    pub comment: String,
}

pub struct SmartAiSqlGenerator;

impl SmartAiSqlGenerator {
    /// Generates standard HavenCore SQL for a list of SmartScript lines
    pub fn generate_sql(entryorguid: i64, source_type: u8, rows: &[SmartScriptRow]) -> String {
        let mut sql = String::new();
        sql.push_str(&format!(
            "-- SmartScript update for Entry/GUID {} (SourceType {})\n",
            entryorguid, source_type
        ));
        sql.push_str(&format!(
            "DELETE FROM `smart_scripts` WHERE `entryorguid` = {} AND `source_type` = {};\n",
            entryorguid, source_type
        ));

        if rows.is_empty() {
            return sql;
        }

        sql.push_str("INSERT INTO `smart_scripts` (`entryorguid`, `source_type`, `id`, `link`, `event_type`, `event_phase_mask`, `event_chance`, `event_flags`, `event_param1`, `event_param2`, `event_param3`, `event_param4`, `event_param5`, `event_param_string`, `action_type`, `action_param1`, `action_param2`, `action_param3`, `action_param4`, `action_param5`, `action_param6`, `target_type`, `target_param1`, `target_param2`, `target_param3`, `target_x`, `target_y`, `target_z`, `target_o`, `comment`) VALUES\n");

        let len = rows.len();
        for (i, row) in rows.iter().enumerate() {
            let escaped_comment = row.comment.replace('\'', "''");
            let escaped_param_str = row.event_param_string.replace('\'', "''");
            let delimiter = if i + 1 == len { ";" } else { "," };

            sql.push_str(&format!(
                "({}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, '{}', {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, '{}'){}",
                row.entryorguid,
                row.source_type,
                row.id,
                row.link,
                row.event_type,
                row.event_phase_mask,
                row.event_chance,
                row.event_flags,
                row.event_param1,
                row.event_param2,
                row.event_param3,
                row.event_param4,
                row.event_param5,
                escaped_param_str,
                row.action_type,
                row.action_param1,
                row.action_param2,
                row.action_param3,
                row.action_param4,
                row.action_param5,
                row.action_param6,
                row.target_type,
                row.target_param1,
                row.target_param2,
                row.target_param3,
                row.target_x,
                row.target_y,
                row.target_z,
                row.target_o,
                escaped_comment,
                delimiter
            ));
            sql.push('\n');
        }

        sql
    }
}
