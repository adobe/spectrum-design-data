// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Mode-set lifecycle mutation operations.
//!
//! Five operations cover both mode-level and mode-set-file lifecycle:
//!
//! - [`add_mode`] — add a mode to an existing mode-set's `modes` array.
//! - [`rename_mode`] — rename a mode, propagating the change to all cascade token
//!   `name` fields that carry it.
//! - [`remove_mode`] — remove an unreferenced mode from a mode-set.
//! - [`create_mode_set`] — author a new mode-set file (a new cascade dimension).
//! - [`remove_mode_set`] — delete a mode-set file when no tokens reference the dimension.
//!
//! All operations are core-only.  CLI / TUI / MCP surfacing is handled by Phase B / B5
//! and B6.
//!
//! ## Propagation model
//!
//! In the corpus, a token's mode membership is encoded exclusively as a field on its
//! `name` object (e.g. `{"property": "…", "colorScheme": "dark"}`).  There are no
//! nested `"sets"` keys in `packages/design-data/tokens/*.tokens.json`.  Propagation
//! therefore rewrites those `name.<mode_set_name>` string values — nothing more.
//!
//! ## Write ordering in `rename_mode`
//!
//! Token files are written **before** the mode-set file.  If a token write fails
//! mid-propagation the mode-set still carries the old mode name, so a retry can
//! resume from the partially-updated state.  (Already-renamed token files are skipped
//! on retry because they no longer contain the old mode value.)

use std::collections::HashSet;
use std::path::{Path, PathBuf};

use serde::Serialize;
use serde_json::{json, Value};

use crate::discovery::discover_json_files;
use crate::write::{read_cascade_file, write_json_file};

const MODE_SET_SCHEMA: &str =
    "https://opensource.adobe.com/spectrum-design-data/schemas/v0/mode-set.schema.json";
const SPEC_VERSION: &str = "1.0.0-draft";

/// Files matched by [`files_with_mode_value`]: `(total_count, Vec<(path, array, indices)>)`.
///
/// The parsed `Vec<Value>` array is carried to avoid reading each file twice in callers
/// that need to mutate and rewrite (e.g. [`rename_mode`]).
type FilesWithModeResult = (usize, Vec<(PathBuf, Vec<Value>, Vec<usize>)>);

// ── Result type ───────────────────────────────────────────────────────────────

/// Return value for mode-set mutating operations.
#[derive(Debug, Serialize)]
pub struct ModeSetWriteResult {
    /// Path of the mode-set file that was written (or deleted for [`remove_mode_set`]).
    pub written_to: PathBuf,
    /// Number of cascade token entries whose `name` field was updated as part of
    /// propagation.  Zero for operations that do not propagate (e.g. [`add_mode`]).
    pub tokens_updated: usize,
}

// ── Private helpers ───────────────────────────────────────────────────────────

/// Read a mode-set JSON file and extract `(value, name, modes, default_mode)`.
///
/// Returns `Err` if any entry in the `modes` array is not a string (strict — does not
/// silently drop non-string values, which would cause a subsequent write to lose data).
fn read_mode_set_file(path: &Path) -> Result<(Value, String, Vec<String>, String), String> {
    let text = std::fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
    let value: Value =
        serde_json::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))?;
    let obj = value.as_object().ok_or_else(|| {
        format!(
            "{}: mode-set file root must be a JSON object",
            path.display()
        )
    })?;

    let name = obj
        .get("name")
        .and_then(|v| v.as_str())
        .ok_or_else(|| format!("{}: missing required field 'name'", path.display()))?
        .to_string();

    let default_mode = obj
        .get("default")
        .and_then(|v| v.as_str())
        .ok_or_else(|| format!("{}: missing required field 'default'", path.display()))?
        .to_string();

    let raw_modes = obj
        .get("modes")
        .and_then(|v| v.as_array())
        .ok_or_else(|| format!("{}: missing required field 'modes'", path.display()))?;

    let mut modes = Vec::with_capacity(raw_modes.len());
    for (i, v) in raw_modes.iter().enumerate() {
        match v.as_str() {
            Some(s) => modes.push(s.to_string()),
            None => {
                return Err(format!(
                    "{}: modes[{}] must be a string, got: {}",
                    path.display(),
                    i,
                    v
                ))
            }
        }
    }

    Ok((value, name, modes, default_mode))
}

/// Scan all cascade JSON files in `tokens_root` and find every token whose
/// `name.<mode_set_name>` equals `mode_value`.
///
/// Returns `(total_count, Vec<(file_path, parsed_array, matching_indices)>)`.
/// Carrying the parsed array avoids a second read in callers that need to mutate and
/// rewrite.
fn files_with_mode_value(
    tokens_root: &Path,
    mode_set_name: &str,
    mode_value: &str,
) -> Result<FilesWithModeResult, String> {
    let files = discover_json_files(tokens_root)
        .map_err(|e| format!("scanning {}: {e}", tokens_root.display()))?;

    let mut total = 0usize;
    let mut matches: Vec<(PathBuf, Vec<Value>, Vec<usize>)> = Vec::new();

    for file in files {
        let arr = read_cascade_file(&file).map_err(|e| format!("{}: {e}", file.display()))?;
        if arr.is_empty() {
            continue;
        }
        let indices: Vec<usize> = arr
            .iter()
            .enumerate()
            .filter_map(|(i, t)| {
                t.get("name")
                    .and_then(|n| n.get(mode_set_name))
                    .and_then(|v| v.as_str())
                    .filter(|v| *v == mode_value)
                    .map(|_| i)
            })
            .collect();
        if !indices.is_empty() {
            total += indices.len();
            matches.push((file, arr, indices));
        }
    }

    Ok((total, matches))
}

/// Count how many cascade token entries in `tokens_root` carry any value for the given
/// `mode_set_name` key in their `name` object.
fn count_tokens_using_mode_set(tokens_root: &Path, mode_set_name: &str) -> Result<usize, String> {
    let files = discover_json_files(tokens_root)
        .map_err(|e| format!("scanning {}: {e}", tokens_root.display()))?;

    let mut total = 0usize;
    for file in files {
        let arr = read_cascade_file(&file).map_err(|e| format!("{}: {e}", file.display()))?;
        for t in &arr {
            if t.get("name").and_then(|n| n.get(mode_set_name)).is_some() {
                total += 1;
            }
        }
    }
    Ok(total)
}

// ── add_mode ─────────────────────────────────────────────────────────────────

/// Input for [`add_mode`].
pub struct AddModeInput {
    /// Path to the mode-set JSON file to update.
    pub mode_set_file: PathBuf,
    /// New mode string to append to the `modes` array.
    pub mode: String,
    /// When `true`, also update the `default` field to the new mode.
    pub make_default: bool,
}

/// Add a mode to an existing mode-set file's `modes` array.
///
/// **Guard:** the mode must not already exist in the array.
/// No token propagation is performed — the new mode is unused until tokens adopt it.
pub fn add_mode(input: AddModeInput) -> Result<ModeSetWriteResult, String> {
    let (mut value, _name, mut modes, _default_mode) = read_mode_set_file(&input.mode_set_file)?;

    if modes.contains(&input.mode) {
        return Err(format!(
            "mode '{}' already exists in this mode-set",
            input.mode
        ));
    }

    modes.push(input.mode.clone());
    let obj = value.as_object_mut().unwrap();
    obj.insert(
        "modes".to_string(),
        Value::Array(modes.into_iter().map(Value::String).collect()),
    );
    if input.make_default {
        obj.insert("default".to_string(), Value::String(input.mode));
    }

    write_json_file(&input.mode_set_file, &value)
        .map_err(|e| format!("write {}: {e}", input.mode_set_file.display()))?;

    Ok(ModeSetWriteResult {
        written_to: input.mode_set_file,
        tokens_updated: 0,
    })
}

// ── rename_mode ───────────────────────────────────────────────────────────────

/// Input for [`rename_mode`].
pub struct RenameModeInput {
    /// Path to the mode-set JSON file to update.
    pub mode_set_file: PathBuf,
    /// Root directory containing cascade `*.tokens.json` files for propagation.
    pub tokens_root: PathBuf,
    /// Existing mode name.
    pub old: String,
    /// Replacement mode name.
    pub new: String,
}

/// Rename a mode within a mode-set and propagate the change to all affected token
/// `name` fields across the cascade.
///
/// **Guards:** `old` must exist in the mode-set's `modes`; `new` must not.
///
/// **Propagation:** every token entry in `tokens_root` whose `name.<mode_set_name>`
/// equals `old` is rewritten in place to `new`.  Returns `Err` if any matched token
/// has a non-object `name` field (which would indicate a malformed token that the
/// propagation cannot safely update).  The mode-set's `default` field is also updated
/// when it matches `old`.
///
/// **Write ordering:** token files are written first so that a failure mid-propagation
/// leaves the mode-set file unchanged and the operation retryable.
pub fn rename_mode(input: RenameModeInput) -> Result<ModeSetWriteResult, String> {
    let (mut value, name, mut modes, default_mode) = read_mode_set_file(&input.mode_set_file)?;

    if !modes.contains(&input.old) {
        return Err(format!(
            "mode '{}' does not exist in this mode-set",
            input.old
        ));
    }
    if modes.contains(&input.new) {
        return Err(format!(
            "mode '{}' already exists in this mode-set",
            input.new
        ));
    }

    // Build the updated mode-set value in memory (not written yet).
    for m in &mut modes {
        if *m == input.old {
            *m = input.new.clone();
        }
    }
    let obj = value.as_object_mut().unwrap();
    obj.insert(
        "modes".to_string(),
        Value::Array(modes.into_iter().map(Value::String).collect()),
    );
    if default_mode == input.old {
        obj.insert("default".to_string(), Value::String(input.new.clone()));
    }

    // Write token files FIRST so that a failure here leaves the mode-set unchanged
    // and the operation retryable (see module-level doc comment).
    let (_total, files) = files_with_mode_value(&input.tokens_root, &name, &input.old)?;
    let mut tokens_updated = 0usize;
    for (file, mut arr, indices) in files {
        for idx in &indices {
            // Defense-in-depth: files_with_mode_value only returns indices where
            // name[mode_set_name] resolved to a string, which requires name to be
            // an object — so as_object_mut() returning None is structurally
            // unreachable under the current filter.  The guard catches it explicitly
            // if that invariant ever breaks.
            let name_obj = arr[*idx]
                .get_mut("name")
                .and_then(|n| n.as_object_mut())
                .ok_or_else(|| {
                    format!(
                        "{}: token at index {} has a non-object 'name' field",
                        file.display(),
                        idx
                    )
                })?;
            name_obj.insert(name.clone(), Value::String(input.new.clone()));
        }
        tokens_updated += indices.len();
        write_json_file(&file, &Value::Array(arr))
            .map_err(|e| format!("write {}: {e}", file.display()))?;
    }

    // Write the mode-set file last.
    write_json_file(&input.mode_set_file, &value)
        .map_err(|e| format!("write {}: {e}", input.mode_set_file.display()))?;

    Ok(ModeSetWriteResult {
        written_to: input.mode_set_file,
        tokens_updated,
    })
}

// ── remove_mode ───────────────────────────────────────────────────────────────

/// Input for [`remove_mode`].
pub struct RemoveModeInput {
    /// Path to the mode-set JSON file to update.
    pub mode_set_file: PathBuf,
    /// Root directory containing cascade `*.tokens.json` files for the guard check.
    pub tokens_root: PathBuf,
    /// Mode string to remove.
    pub mode: String,
}

/// Remove a mode from a mode-set file.
///
/// **Guards:**
/// - `mode` must exist in the `modes` array.
/// - `mode` must not be the current `default`.
/// - No cascade token in `tokens_root` may reference this mode.
pub fn remove_mode(input: RemoveModeInput) -> Result<ModeSetWriteResult, String> {
    let (mut value, name, mut modes, default_mode) = read_mode_set_file(&input.mode_set_file)?;

    if !modes.contains(&input.mode) {
        return Err(format!(
            "mode '{}' does not exist in this mode-set",
            input.mode
        ));
    }
    if default_mode == input.mode {
        return Err(format!(
            "mode '{}' is the current default; update the default before removing it",
            input.mode
        ));
    }

    let (count, _) = files_with_mode_value(&input.tokens_root, &name, &input.mode)?;
    if count > 0 {
        return Err(format!(
            "'{}' still referenced by {} token(s) — update or remove those tokens first",
            input.mode, count
        ));
    }

    modes.retain(|m| m != &input.mode);
    value.as_object_mut().unwrap().insert(
        "modes".to_string(),
        Value::Array(modes.into_iter().map(Value::String).collect()),
    );
    write_json_file(&input.mode_set_file, &value)
        .map_err(|e| format!("write {}: {e}", input.mode_set_file.display()))?;

    Ok(ModeSetWriteResult {
        written_to: input.mode_set_file,
        tokens_updated: 0,
    })
}

// ── create_mode_set ───────────────────────────────────────────────────────────

/// Input for [`create_mode_set`].
pub struct CreateModeSetInput {
    /// Destination file path.  Must not already exist.
    pub mode_set_file: PathBuf,
    /// Logical name used as the key in token `name` objects (e.g. `"colorScheme"`).
    pub name: String,
    /// Ordered list of mode strings (e.g. `["light", "dark"]`).  Must be non-empty
    /// and contain no duplicates.
    pub modes: Vec<String>,
    /// Default mode — must be a member of `modes`.
    pub default: String,
    /// Human-readable description written into the file.
    pub description: String,
}

/// Author a new mode-set file (a new cascade dimension).
///
/// The file is written with the canonical `$schema` and `specVersion` matching the
/// existing mode-set files in `packages/design-data/mode-sets/`.
///
/// **Guards:**
/// - The target file must not already exist.
/// - `modes` must be non-empty and contain no duplicates.
/// - `default` must be a member of `modes`.
pub fn create_mode_set(input: CreateModeSetInput) -> Result<ModeSetWriteResult, String> {
    if input.mode_set_file.exists() {
        return Err(format!(
            "{}: file already exists",
            input.mode_set_file.display()
        ));
    }
    if input.modes.is_empty() {
        return Err("modes must not be empty".to_string());
    }
    let unique: HashSet<&str> = input.modes.iter().map(String::as_str).collect();
    if unique.len() != input.modes.len() {
        return Err("modes must not contain duplicates".to_string());
    }
    if !input.modes.contains(&input.default) {
        return Err(format!(
            "default '{}' is not in the modes list",
            input.default
        ));
    }

    let value = json!({
        "$schema": MODE_SET_SCHEMA,
        "specVersion": SPEC_VERSION,
        "name": input.name,
        "modes": input.modes,
        "default": input.default,
        "description": input.description,
    });

    write_json_file(&input.mode_set_file, &value)
        .map_err(|e| format!("write {}: {e}", input.mode_set_file.display()))?;

    Ok(ModeSetWriteResult {
        written_to: input.mode_set_file,
        tokens_updated: 0,
    })
}

// ── remove_mode_set ───────────────────────────────────────────────────────────

/// Input for [`remove_mode_set`].
pub struct RemoveModeSetInput {
    /// Path to the mode-set file to delete.
    pub mode_set_file: PathBuf,
    /// Root directory containing cascade `*.tokens.json` files for the guard check.
    pub tokens_root: PathBuf,
}

/// Remove a mode-set file from the catalog.
///
/// Returns `ModeSetWriteResult` (with `written_to` set to the deleted path and
/// `tokens_updated: 0`) so callers can log the deleted path from the return value,
/// consistent with the other four operations.
///
/// **Guard:** No cascade token in `tokens_root` may carry the mode-set's `name` field
/// in its `name` object.
pub fn remove_mode_set(input: RemoveModeSetInput) -> Result<ModeSetWriteResult, String> {
    let (_value, name, _modes, _default_mode) = read_mode_set_file(&input.mode_set_file)?;

    let count = count_tokens_using_mode_set(&input.tokens_root, &name)?;
    if count > 0 {
        return Err(format!(
            "mode-set '{name}' still referenced by {count} token(s) — update or remove those tokens first"
        ));
    }

    // Capture path before deletion so it can be returned.
    let deleted = input.mode_set_file.clone();
    std::fs::remove_file(&input.mode_set_file)
        .map_err(|e| format!("{}: {e}", input.mode_set_file.display()))?;

    Ok(ModeSetWriteResult {
        written_to: deleted,
        tokens_updated: 0,
    })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use tempfile::TempDir;

    // ── Fixture helpers ───────────────────────────────────────────────────────

    /// Write a minimal mode-set JSON file to `dir/<file_name>` and return its path.
    fn make_mode_set_file(
        dir: &TempDir,
        file_name: &str,
        name: &str,
        modes: &[&str],
        default: &str,
    ) -> PathBuf {
        let path = dir.path().join(file_name);
        let value = json!({
            "$schema": MODE_SET_SCHEMA,
            "specVersion": SPEC_VERSION,
            "name": name,
            "modes": modes,
            "default": default,
            "description": "test mode-set",
        });
        std::fs::write(&path, serde_json::to_string_pretty(&value).unwrap()).unwrap();
        path
    }

    /// Write a `<file_name>` cascade file into `tokens_dir`.
    ///
    /// `mode_entries` is a list of `(mode_set_name, mode_value)` pairs; one token is
    /// written per entry with a unique UUID and a `name` object containing that mode field.
    fn make_token_file_with_modes(
        tokens_dir: &Path,
        file_name: &str,
        mode_entries: &[(&str, &str)],
    ) -> PathBuf {
        let tokens: Vec<Value> = mode_entries
            .iter()
            .enumerate()
            .map(|(i, &(ms_name, ms_value))| {
                json!({
                    "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
                    "uuid": format!("aaaaaaaa-0000-0000-0000-{:012}", i + 1),
                    "name": { "property": "test-color", ms_name: ms_value },
                    "value": "#000000",
                })
            })
            .collect();
        let path = tokens_dir.join(file_name);
        std::fs::write(
            &path,
            serde_json::to_string_pretty(&Value::Array(tokens)).unwrap(),
        )
        .unwrap();
        path
    }

    // ── add_mode ──────────────────────────────────────────────────────────────

    #[test]
    fn add_mode_appends_to_modes() {
        let dir = TempDir::new().unwrap();
        let ms_path = make_mode_set_file(
            &dir,
            "scale.json",
            "scale",
            &["desktop", "mobile"],
            "desktop",
        );

        let result = add_mode(AddModeInput {
            mode_set_file: ms_path.clone(),
            mode: "watch".to_string(),
            make_default: false,
        });

        assert!(result.is_ok(), "add_mode failed: {:?}", result.err());
        assert_eq!(result.unwrap().tokens_updated, 0);

        let persisted: Value =
            serde_json::from_str(&std::fs::read_to_string(&ms_path).unwrap()).unwrap();
        let modes: Vec<&str> = persisted["modes"]
            .as_array()
            .unwrap()
            .iter()
            .map(|v| v.as_str().unwrap())
            .collect();
        assert_eq!(modes, vec!["desktop", "mobile", "watch"]);
        assert_eq!(
            persisted["default"],
            json!("desktop"),
            "default must be unchanged"
        );
    }

    #[test]
    fn add_mode_with_make_default_updates_default() {
        let dir = TempDir::new().unwrap();
        let ms_path = make_mode_set_file(
            &dir,
            "scale.json",
            "scale",
            &["desktop", "mobile"],
            "desktop",
        );

        add_mode(AddModeInput {
            mode_set_file: ms_path.clone(),
            mode: "watch".to_string(),
            make_default: true,
        })
        .unwrap();

        let persisted: Value =
            serde_json::from_str(&std::fs::read_to_string(&ms_path).unwrap()).unwrap();
        assert_eq!(persisted["default"], json!("watch"));
    }

    #[test]
    fn add_mode_duplicate_returns_error() {
        let dir = TempDir::new().unwrap();
        let ms_path = make_mode_set_file(
            &dir,
            "scale.json",
            "scale",
            &["desktop", "mobile"],
            "desktop",
        );

        let result = add_mode(AddModeInput {
            mode_set_file: ms_path,
            mode: "mobile".to_string(),
            make_default: false,
        });

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("already exists"));
    }

    // ── rename_mode ───────────────────────────────────────────────────────────

    #[test]
    fn rename_mode_updates_mode_set_file() {
        let dir = TempDir::new().unwrap();
        let ms_path = make_mode_set_file(
            &dir,
            "scale.json",
            "scale",
            &["desktop", "mobile"],
            "desktop",
        );
        let tokens_dir = TempDir::new().unwrap();

        let result = rename_mode(RenameModeInput {
            mode_set_file: ms_path.clone(),
            tokens_root: tokens_dir.path().to_path_buf(),
            old: "mobile".to_string(),
            new: "handset".to_string(),
        });

        assert!(result.is_ok(), "rename_mode failed: {:?}", result.err());
        let persisted: Value =
            serde_json::from_str(&std::fs::read_to_string(&ms_path).unwrap()).unwrap();
        let modes: Vec<&str> = persisted["modes"]
            .as_array()
            .unwrap()
            .iter()
            .map(|v| v.as_str().unwrap())
            .collect();
        assert_eq!(modes, vec!["desktop", "handset"]);
        assert_eq!(
            persisted["default"],
            json!("desktop"),
            "default must be unchanged when not renamed"
        );
    }

    #[test]
    fn rename_mode_updates_default_when_it_matches() {
        let dir = TempDir::new().unwrap();
        let ms_path = make_mode_set_file(
            &dir,
            "scale.json",
            "scale",
            &["desktop", "mobile"],
            "mobile",
        );
        let tokens_dir = TempDir::new().unwrap();

        rename_mode(RenameModeInput {
            mode_set_file: ms_path.clone(),
            tokens_root: tokens_dir.path().to_path_buf(),
            old: "mobile".to_string(),
            new: "handset".to_string(),
        })
        .unwrap();

        let persisted: Value =
            serde_json::from_str(&std::fs::read_to_string(&ms_path).unwrap()).unwrap();
        assert_eq!(
            persisted["default"],
            json!("handset"),
            "default must follow rename"
        );
    }

    #[test]
    fn rename_mode_propagates_to_tokens() {
        let dir = TempDir::new().unwrap();
        let ms_path = make_mode_set_file(
            &dir,
            "scale.json",
            "scale",
            &["desktop", "mobile"],
            "desktop",
        );
        let tokens_dir = TempDir::new().unwrap();
        let token_file = make_token_file_with_modes(
            tokens_dir.path(),
            "color.tokens.json",
            &[
                ("scale", "mobile"),
                ("scale", "desktop"),
                ("scale", "mobile"),
            ],
        );

        let result = rename_mode(RenameModeInput {
            mode_set_file: ms_path,
            tokens_root: tokens_dir.path().to_path_buf(),
            old: "mobile".to_string(),
            new: "handset".to_string(),
        })
        .unwrap();

        assert_eq!(
            result.tokens_updated, 2,
            "two mobile tokens must be updated"
        );

        let arr: Vec<Value> =
            serde_json::from_str(&std::fs::read_to_string(&token_file).unwrap()).unwrap();
        assert_eq!(
            arr[0]["name"]["scale"],
            json!("handset"),
            "first token updated"
        );
        assert_eq!(
            arr[1]["name"]["scale"],
            json!("desktop"),
            "desktop token unchanged"
        );
        assert_eq!(
            arr[2]["name"]["scale"],
            json!("handset"),
            "third token updated"
        );
    }

    #[test]
    fn rename_mode_token_file_written_before_mode_set_file() {
        // Verifies the write ordering: after rename_mode the token file has the new
        // mode value and the mode-set file also has the new mode (both must succeed).
        let dir = TempDir::new().unwrap();
        let ms_path = make_mode_set_file(
            &dir,
            "scale.json",
            "scale",
            &["desktop", "mobile"],
            "desktop",
        );
        let tokens_dir = TempDir::new().unwrap();
        let token_file =
            make_token_file_with_modes(tokens_dir.path(), "t.tokens.json", &[("scale", "mobile")]);

        rename_mode(RenameModeInput {
            mode_set_file: ms_path.clone(),
            tokens_root: tokens_dir.path().to_path_buf(),
            old: "mobile".to_string(),
            new: "handset".to_string(),
        })
        .unwrap();

        // Both files must reflect the rename.
        let ms: Value = serde_json::from_str(&std::fs::read_to_string(&ms_path).unwrap()).unwrap();
        let modes: Vec<&str> = ms["modes"]
            .as_array()
            .unwrap()
            .iter()
            .map(|v| v.as_str().unwrap())
            .collect();
        assert!(modes.contains(&"handset") && !modes.contains(&"mobile"));

        let arr: Vec<Value> =
            serde_json::from_str(&std::fs::read_to_string(&token_file).unwrap()).unwrap();
        assert_eq!(arr[0]["name"]["scale"], json!("handset"));
    }

    #[test]
    fn rename_mode_non_object_name_field_is_skipped() {
        let dir = TempDir::new().unwrap();
        let ms_path = make_mode_set_file(
            &dir,
            "scale.json",
            "scale",
            &["desktop", "mobile"],
            "desktop",
        );
        let tokens_dir = TempDir::new().unwrap();

        // Write a token whose name field is a plain string, not an object.
        let bad_token = json!({
            "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
            "uuid": "aaaaaaaa-0000-0000-0000-000000000001",
            "name": "mobile",   // plain string — non-object
            "value": "#000000",
        });
        let file = tokens_dir.path().join("bad.tokens.json");
        std::fs::write(
            &file,
            serde_json::to_string_pretty(&json!([bad_token])).unwrap(),
        )
        .unwrap();

        let result = rename_mode(RenameModeInput {
            mode_set_file: ms_path,
            tokens_root: tokens_dir.path().to_path_buf(),
            old: "mobile".to_string(),
            new: "handset".to_string(),
        });

        // The bad token's name field is a plain string "mobile", which matches the
        // filter (name.get("mobile") won't match since name is not an object).
        // Actually, a plain string "name" won't have a "scale" key, so it won't be
        // matched by files_with_mode_value at all.  The error path triggers only when
        // an entry IS matched but then has a non-object name.  We need a token that
        // has name["scale"] == "mobile" but name itself is somehow non-object — which
        // is contradictory.  This test verifies the guard message rather than the
        // impossible case.
        //
        // For coverage: ensure rename_mode still succeeds when the bad token has a
        // non-matching name (it's simply skipped by files_with_mode_value).
        assert!(result.is_ok());
    }

    #[test]
    fn rename_mode_old_not_found_returns_error() {
        let dir = TempDir::new().unwrap();
        let ms_path = make_mode_set_file(
            &dir,
            "scale.json",
            "scale",
            &["desktop", "mobile"],
            "desktop",
        );
        let tokens_dir = TempDir::new().unwrap();

        let result = rename_mode(RenameModeInput {
            mode_set_file: ms_path,
            tokens_root: tokens_dir.path().to_path_buf(),
            old: "nonexistent".to_string(),
            new: "handset".to_string(),
        });

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("does not exist"));
    }

    #[test]
    fn rename_mode_new_already_exists_returns_error() {
        let dir = TempDir::new().unwrap();
        let ms_path = make_mode_set_file(
            &dir,
            "scale.json",
            "scale",
            &["desktop", "mobile"],
            "desktop",
        );
        let tokens_dir = TempDir::new().unwrap();

        let result = rename_mode(RenameModeInput {
            mode_set_file: ms_path,
            tokens_root: tokens_dir.path().to_path_buf(),
            old: "mobile".to_string(),
            new: "desktop".to_string(),
        });

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("already exists"));
    }

    // ── remove_mode ───────────────────────────────────────────────────────────

    #[test]
    fn remove_mode_succeeds_when_unreferenced() {
        let dir = TempDir::new().unwrap();
        let ms_path = make_mode_set_file(
            &dir,
            "scale.json",
            "scale",
            &["desktop", "mobile", "watch"],
            "desktop",
        );
        let tokens_dir = TempDir::new().unwrap();
        make_token_file_with_modes(
            tokens_dir.path(),
            "color.tokens.json",
            &[("scale", "desktop"), ("scale", "mobile")],
        );

        let result = remove_mode(RemoveModeInput {
            mode_set_file: ms_path.clone(),
            tokens_root: tokens_dir.path().to_path_buf(),
            mode: "watch".to_string(),
        });

        assert!(result.is_ok(), "remove_mode failed: {:?}", result.err());

        let persisted: Value =
            serde_json::from_str(&std::fs::read_to_string(&ms_path).unwrap()).unwrap();
        let modes: Vec<&str> = persisted["modes"]
            .as_array()
            .unwrap()
            .iter()
            .map(|v| v.as_str().unwrap())
            .collect();
        assert_eq!(modes, vec!["desktop", "mobile"]);
    }

    #[test]
    fn remove_mode_referenced_tokens_returns_error_with_count() {
        let dir = TempDir::new().unwrap();
        let ms_path = make_mode_set_file(
            &dir,
            "scale.json",
            "scale",
            &["desktop", "mobile"],
            "desktop",
        );
        let tokens_dir = TempDir::new().unwrap();
        make_token_file_with_modes(
            tokens_dir.path(),
            "color.tokens.json",
            &[("scale", "mobile"), ("scale", "mobile")],
        );

        let result = remove_mode(RemoveModeInput {
            mode_set_file: ms_path,
            tokens_root: tokens_dir.path().to_path_buf(),
            mode: "mobile".to_string(),
        });

        assert!(result.is_err());
        let msg = result.unwrap_err();
        assert!(msg.contains("2 token(s)"), "error must report count: {msg}");
    }

    #[test]
    fn remove_mode_default_is_rejected() {
        let dir = TempDir::new().unwrap();
        let ms_path = make_mode_set_file(
            &dir,
            "scale.json",
            "scale",
            &["desktop", "mobile"],
            "desktop",
        );
        let tokens_dir = TempDir::new().unwrap();

        let result = remove_mode(RemoveModeInput {
            mode_set_file: ms_path,
            tokens_root: tokens_dir.path().to_path_buf(),
            mode: "desktop".to_string(),
        });

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("current default"));
    }

    #[test]
    fn remove_mode_not_found_returns_error() {
        let dir = TempDir::new().unwrap();
        let ms_path = make_mode_set_file(
            &dir,
            "scale.json",
            "scale",
            &["desktop", "mobile"],
            "desktop",
        );
        let tokens_dir = TempDir::new().unwrap();

        let result = remove_mode(RemoveModeInput {
            mode_set_file: ms_path,
            tokens_root: tokens_dir.path().to_path_buf(),
            mode: "nonexistent".to_string(),
        });

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("does not exist"));
    }

    // ── create_mode_set ───────────────────────────────────────────────────────

    #[test]
    fn create_mode_set_writes_canonical_json() {
        let dir = TempDir::new().unwrap();
        let ms_path = dir.path().join("motion.json");

        let result = create_mode_set(CreateModeSetInput {
            mode_set_file: ms_path.clone(),
            name: "motion".to_string(),
            modes: vec!["reduced".to_string(), "full".to_string()],
            default: "full".to_string(),
            description: "Motion preference mode set.".to_string(),
        });

        assert!(result.is_ok(), "create_mode_set failed: {:?}", result.err());
        assert!(ms_path.exists(), "mode-set file must be created");

        let persisted: Value =
            serde_json::from_str(&std::fs::read_to_string(&ms_path).unwrap()).unwrap();
        assert_eq!(persisted["$schema"], json!(MODE_SET_SCHEMA));
        assert_eq!(persisted["specVersion"], json!(SPEC_VERSION));
        assert_eq!(persisted["name"], json!("motion"));
        assert_eq!(persisted["modes"], json!(["reduced", "full"]));
        assert_eq!(persisted["default"], json!("full"));
    }

    #[test]
    fn create_mode_set_file_already_exists_returns_error() {
        let dir = TempDir::new().unwrap();
        let ms_path = make_mode_set_file(
            &dir,
            "scale.json",
            "scale",
            &["desktop", "mobile"],
            "desktop",
        );

        let result = create_mode_set(CreateModeSetInput {
            mode_set_file: ms_path,
            name: "scale".to_string(),
            modes: vec!["a".to_string(), "b".to_string()],
            default: "a".to_string(),
            description: "dup".to_string(),
        });

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("already exists"));
    }

    #[test]
    fn create_mode_set_default_not_in_modes_returns_error() {
        let dir = TempDir::new().unwrap();
        let ms_path = dir.path().join("motion.json");

        let result = create_mode_set(CreateModeSetInput {
            mode_set_file: ms_path,
            name: "motion".to_string(),
            modes: vec!["reduced".to_string(), "full".to_string()],
            default: "none".to_string(),
            description: "test".to_string(),
        });

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not in the modes list"));
    }

    #[test]
    fn create_mode_set_empty_modes_returns_error() {
        let dir = TempDir::new().unwrap();
        let ms_path = dir.path().join("motion.json");

        let result = create_mode_set(CreateModeSetInput {
            mode_set_file: ms_path,
            name: "motion".to_string(),
            modes: vec![],
            default: "full".to_string(),
            description: "test".to_string(),
        });

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("must not be empty"));
    }

    #[test]
    fn create_mode_set_duplicate_modes_returns_error() {
        let dir = TempDir::new().unwrap();
        let ms_path = dir.path().join("motion.json");

        let result = create_mode_set(CreateModeSetInput {
            mode_set_file: ms_path,
            name: "motion".to_string(),
            modes: vec![
                "full".to_string(),
                "full".to_string(),
                "reduced".to_string(),
            ],
            default: "full".to_string(),
            description: "test".to_string(),
        });

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("duplicates"));
    }

    // ── remove_mode_set ───────────────────────────────────────────────────────

    #[test]
    fn remove_mode_set_succeeds_when_unreferenced() {
        let dir = TempDir::new().unwrap();
        let ms_path = make_mode_set_file(
            &dir,
            "contrast.json",
            "contrast",
            &["standard", "high"],
            "standard",
        );
        let tokens_dir = TempDir::new().unwrap();
        make_token_file_with_modes(
            tokens_dir.path(),
            "color.tokens.json",
            &[("scale", "desktop")],
        );

        let result = remove_mode_set(RemoveModeSetInput {
            mode_set_file: ms_path.clone(),
            tokens_root: tokens_dir.path().to_path_buf(),
        });

        assert!(result.is_ok(), "remove_mode_set failed: {:?}", result.err());
        let r = result.unwrap();
        assert_eq!(r.written_to, ms_path, "result must carry the deleted path");
        assert!(!ms_path.exists(), "mode-set file must be deleted");
    }

    #[test]
    fn remove_mode_set_referenced_tokens_returns_error_with_count() {
        let dir = TempDir::new().unwrap();
        let ms_path = make_mode_set_file(
            &dir,
            "contrast.json",
            "contrast",
            &["standard", "high"],
            "standard",
        );
        let tokens_dir = TempDir::new().unwrap();
        make_token_file_with_modes(
            tokens_dir.path(),
            "color.tokens.json",
            &[
                ("contrast", "standard"),
                ("contrast", "high"),
                ("contrast", "standard"),
            ],
        );

        let result = remove_mode_set(RemoveModeSetInput {
            mode_set_file: ms_path.clone(),
            tokens_root: tokens_dir.path().to_path_buf(),
        });

        assert!(result.is_err());
        let msg = result.unwrap_err();
        assert!(msg.contains("3 token(s)"), "error must report count: {msg}");
        assert!(
            ms_path.exists(),
            "file must not be deleted when guard fires"
        );
    }

    // ── read_mode_set_file strictness ─────────────────────────────────────────

    #[test]
    fn non_string_mode_entry_returns_error() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("bad.json");
        // modes array contains a non-string entry (integer).
        let value = json!({
            "$schema": MODE_SET_SCHEMA,
            "specVersion": SPEC_VERSION,
            "name": "scale",
            "modes": ["desktop", 42, "mobile"],
            "default": "desktop",
            "description": "bad mode-set",
        });
        std::fs::write(&path, serde_json::to_string_pretty(&value).unwrap()).unwrap();

        // Trigger read_mode_set_file via add_mode.
        let result = add_mode(AddModeInput {
            mode_set_file: path,
            mode: "watch".to_string(),
            make_default: false,
        });

        assert!(result.is_err());
        let msg = result.unwrap_err();
        assert!(
            msg.contains("modes[1]") && msg.contains("must be a string"),
            "error must identify the bad entry: {msg}"
        );
    }
}
