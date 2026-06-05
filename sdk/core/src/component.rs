// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Component declaration lookup — shared by CLI, TUI, WASM, and MCP surfaces.
//!
//! Component declarations are one JSON file per component under a components
//! directory (e.g. `packages/design-data/components/<id>.json`).  This module
//! provides ID validation, single-component lookup, and directory listing so that
//! each surface only needs to resolve the directory path and handle presentation.

use std::path::Path;

use crate::CoreError;

/// Validate a component ID against the allowed pattern `^[a-z][a-z0-9-]*$`.
///
/// This guard prevents path-traversal attacks when constructing the file path
/// `<dir>/<id>.json`.  Returns `Ok(())` on a valid ID or an error message.
pub fn validate_id(id: &str) -> Result<(), String> {
    if id.is_empty() {
        return Err(format!(
            "invalid component ID {id:?}: must be non-empty and match ^[a-z][a-z0-9-]*$"
        ));
    }
    let mut chars = id.chars();
    if !chars
        .next()
        .is_some_and(|c| c.is_ascii_lowercase())
    {
        return Err(format!(
            "invalid component ID {id:?}: must start with a lowercase letter"
        ));
    }
    if !chars.all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-') {
        return Err(format!(
            "invalid component ID {id:?}: only lowercase letters, digits, and hyphens allowed"
        ));
    }
    Ok(())
}

/// Look up a single component by ID in `dir`.
///
/// Returns `Ok(Some(value))` when `<dir>/<id>.json` exists and parses, `Ok(None)` when
/// the file does not exist, or an IO/JSON error on a read or parse failure.
pub fn lookup(dir: &Path, id: &str) -> Result<Option<serde_json::Value>, CoreError> {
    let file = dir.join(format!("{id}.json"));
    if !file.is_file() {
        return Ok(None);
    }
    let raw = std::fs::read_to_string(&file)?;
    let value: serde_json::Value = serde_json::from_str(&raw)?;
    Ok(Some(value))
}

/// List all component names available in `dir`.
///
/// Scans `dir` for `*.json` files and returns the value of each file's top-level
/// `"name"` string field, sorted alphabetically.  Files that cannot be read or
/// parsed, or that lack a string `"name"` field, are silently skipped.
pub fn list(dir: &Path) -> Vec<String> {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return vec![];
    };
    let mut names: Vec<String> = entries
        .flatten()
        .filter_map(|e| {
            let p = e.path();
            if p.extension().and_then(|x| x.to_str()) != Some("json") {
                return None;
            }
            let raw = std::fs::read_to_string(&p).ok()?;
            let v: serde_json::Value = serde_json::from_str(&raw).ok()?;
            v.get("name")?.as_str().map(|s| s.to_string())
        })
        .collect();
    names.sort();
    names
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;

    // ── validate_id ───────────────────────────────────────────────────────────

    #[test]
    fn validate_id_ok() {
        assert!(validate_id("accordion").is_ok());
        assert!(validate_id("action-menu").is_ok());
        assert!(validate_id("a1b2").is_ok());
    }

    #[test]
    fn validate_id_rejects_empty() {
        assert!(validate_id("").is_err());
    }

    #[test]
    fn validate_id_rejects_uppercase() {
        assert!(validate_id("Accordion").is_err());
        assert!(validate_id("action_menu").is_err());
    }

    #[test]
    fn validate_id_rejects_path_traversal() {
        assert!(validate_id("../secrets").is_err());
        assert!(validate_id("a/b").is_err());
    }

    #[test]
    fn validate_id_rejects_numeric_start() {
        assert!(validate_id("1button").is_err());
    }

    // ── lookup ────────────────────────────────────────────────────────────────

    #[test]
    fn lookup_found() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(
            dir.path().join("button.json"),
            r#"{"name":"button","description":"A button component"}"#,
        )
        .unwrap();
        let result = lookup(dir.path(), "button").unwrap();
        assert!(result.is_some());
        assert_eq!(result.unwrap()["name"], "button");
    }

    #[test]
    fn lookup_not_found_returns_none() {
        let dir = tempfile::tempdir().unwrap();
        let result = lookup(dir.path(), "nonexistent").unwrap();
        assert!(result.is_none());
    }

    // ── list ──────────────────────────────────────────────────────────────────

    #[test]
    fn list_sorted_names() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("toast.json"), r#"{"name":"toast"}"#).unwrap();
        fs::write(dir.path().join("accordion.json"), r#"{"name":"accordion"}"#).unwrap();
        fs::write(dir.path().join("button.json"), r#"{"name":"button"}"#).unwrap();
        let names = list(dir.path());
        assert_eq!(names, vec!["accordion", "button", "toast"]);
    }

    #[test]
    fn list_skips_non_json_and_malformed() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("notes.txt"), "not a component").unwrap();
        fs::write(dir.path().join("broken.json"), "{ bad json }").unwrap();
        fs::write(dir.path().join("noname.json"), r#"{"title":"no name field"}"#).unwrap();
        fs::write(dir.path().join("button.json"), r#"{"name":"button"}"#).unwrap();
        let names = list(dir.path());
        assert_eq!(names, vec!["button"]);
    }
}
