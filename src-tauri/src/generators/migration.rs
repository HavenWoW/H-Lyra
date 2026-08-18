use chrono::Local;

pub struct MigrationGenerator;

impl MigrationGenerator {
    /// Formats a complete HavenCore migration file with timestamps and headers
    pub fn create_migration(description: &str, author: &str, sql_body: &str) -> (String, String) {
        let now = Local::now();
        let date_prefix = now.format("%Y_%m_%d").to_string();
        let sanitized_desc = description
            .to_lowercase()
            .replace(' ', "_")
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '_')
            .collect::<String>();

        let filename = format!("{}_01_{}.sql", date_prefix, sanitized_desc);

        let mut content = String::new();
        content.push_str("-- ---------------------------------------------------------\n");
        content.push_str(&format!("-- HavenCore BFA (8.3.7.35662) Database Migration\n"));
        content.push_str(&format!("-- Description: {}\n", description));
        content.push_str(&format!("-- Author:      {}\n", author));
        content.push_str(&format!("-- Date:        {}\n", now.format("%Y-%m-%d %H:%M:%S")));
        content.push_str("-- ---------------------------------------------------------\n\n");
        content.push_str("START TRANSACTION;\n\n");
        content.push_str(sql_body.trim());
        content.push_str("\n\nCOMMIT;\n");

        (filename, content)
    }
}
