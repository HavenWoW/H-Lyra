//! Locating the client data directory that holds the DB2 files.
//!
//! The search is driven by the table registry: a directory qualifies as soon as
//! it contains at least one registered table file, so registering another table
//! needs no change here.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use crate::db2::meta::SUPPORTED_TABLES;

/// Directories that are never client data and would only slow the scan down.
const SKIPPED_DIRECTORIES: [&str; 4] = ["logs", "screenshots", "errors", "indices"];

/// Depth limit for the fallback recursive scan.
const MAX_SCAN_DEPTH: usize = 4;

/// A located data directory and the registered table files inside it.
pub struct Db2Directory {
    pub path: PathBuf,
    /// Table name to file path, for the tables that are actually present.
    pub files: HashMap<&'static str, PathBuf>,
}

impl Db2Directory {
    pub fn file_for(&self, table: &str) -> Option<&PathBuf> {
        self.files.get(table)
    }
}

/// Finds a file in `dir` ignoring case, as client dumps vary in casing.
pub fn find_file_case_insensitive(dir: &Path, file_name: &str) -> Option<PathBuf> {
    let target = file_name.to_ascii_lowercase();
    let entries = std::fs::read_dir(dir).ok()?;
    for entry in entries.filter_map(Result::ok) {
        if let Some(name) = entry.file_name().to_str() {
            if name.to_ascii_lowercase() == target {
                return Some(entry.path());
            }
        }
    }
    None
}

/// Collects every registered table file present in a directory.
fn collect_tables(dir: &Path) -> HashMap<&'static str, PathBuf> {
    let mut files = HashMap::new();
    for table in SUPPORTED_TABLES {
        if let Some(path) = find_file_case_insensitive(dir, table.file_name) {
            files.insert(table.name, path);
        }
    }
    files
}

/// Candidate directories to probe before falling back to a recursive scan.
fn candidate_paths(data_dir: &str, locale: &str) -> Vec<PathBuf> {
    let base = PathBuf::from(data_dir);
    let mut roots = vec![base.clone()];
    if let Some(parent) = base.parent() {
        roots.push(parent.to_path_buf());
        if let Some(grandparent) = parent.parent() {
            roots.push(grandparent.to_path_buf());
        }
    }

    let mut candidates = Vec::new();
    for root in roots {
        for prefix in ["", "data", "Data", "ClientData"] {
            let anchored = if prefix.is_empty() {
                root.clone()
            } else {
                root.join(prefix)
            };
            candidates.push(anchored.join("dbc").join(locale));
            candidates.push(anchored.join("dbc"));
            candidates.push(anchored.join(locale));
            candidates.push(anchored);
        }
        candidates.push(root.join("DBFilesClient"));
    }
    candidates
}

/// Depth-limited search for any directory holding registered table files.
fn scan(root: &Path, depth: usize) -> Option<PathBuf> {
    if !root.is_dir() {
        return None;
    }
    if !collect_tables(root).is_empty() {
        return Some(root.to_path_buf());
    }
    if depth == 0 {
        return None;
    }

    let entries = std::fs::read_dir(root).ok()?;
    for entry in entries.filter_map(Result::ok) {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let name = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or_default();
        if name.starts_with('.')
            || SKIPPED_DIRECTORIES
                .iter()
                .any(|skipped| name.eq_ignore_ascii_case(skipped))
        {
            continue;
        }
        if let Some(found) = scan(&path, depth - 1) {
            return Some(found);
        }
    }
    None
}

/// Resolves the data directory for the configured path and locale.
pub fn locate(data_dir: &str, locale: &str) -> Option<Db2Directory> {
    for candidate in candidate_paths(data_dir, locale) {
        if !candidate.is_dir() {
            continue;
        }
        let files = collect_tables(&candidate);
        if !files.is_empty() {
            return Some(Db2Directory {
                path: candidate,
                files,
            });
        }
    }

    let base = PathBuf::from(data_dir);
    let mut roots = vec![base.clone()];
    if let Some(parent) = base.parent() {
        roots.push(parent.to_path_buf());
    }
    for root in roots {
        if let Some(path) = scan(&root, MAX_SCAN_DEPTH) {
            let files = collect_tables(&path);
            return Some(Db2Directory { path, files });
        }
    }

    None
}
