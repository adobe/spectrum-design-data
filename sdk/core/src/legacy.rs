// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Legacy output generator: converts cascade-format `.tokens.json` arrays back
//! to the legacy Spectrum token file format (JSON objects with optional `sets`).
//!
//! This is the inverse of [`crate::migrate`] and produces output compatible
//! with `@adobe/spectrum-tokens` consumers that have not yet migrated to the
//! cascade format.
//!
//! # Format transformation
//!
//! **Cascade tokens for the same property with dimension variants:**
//! ```json
//! [
//!   { "name": { "property": "overlay-opacity", "colorScheme": "light" }, "value": "0.4", "uuid": "aaa" },
//!   { "name": { "property": "overlay-opacity", "colorScheme": "dark" },  "value": "0.6", "uuid": "bbb" }
//! ]
//! ```
//!
//! **Legacy output:**
//! ```json
//! {
//!   "overlay-opacity": {
//!     "$schema": ".../color-set.json",
//!     "sets": {
//!       "light": { "value": "0.4", "uuid": "aaa" },
//!       "dark":  { "value": "0.6", "uuid": "bbb" }
//!     }
//!   }
//! }
//! ```
//!
//! `$ref` values are denormalized back to `value: "{target}"` alias syntax.

use std::collections::BTreeMap;
use std::path::Path;

use serde_json::{Map, Value};

use crate::discovery::discover_json_files;
use crate::CoreError;

// ── Schema URL constants ──────────────────────────────────────────────────────

const COLOR_SET_SCHEMA: &str =
    "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color-set.json";
const SCALE_SET_SCHEMA: &str =
    "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/scale-set.json";

/// Fields that belong on the outer token entry (hoisted from mode entries when
/// they are identical across all modes).
const OUTER_LIFECYCLE_FIELDS: &[&str] =
    &["deprecated", "deprecated_comment", "renamed", "private", "status", "description"];

// ── Summary ───────────────────────────────────────────────────────────────────

/// Summary statistics from a legacy-output run.
#[derive(Debug, Default)]
pub struct LegacySummary {
    /// Number of cascade source files processed.
    pub files_processed: usize,
    /// Number of legacy output files written.
    pub files_written: usize,
    /// Total legacy token entries produced.
    pub tokens_produced: usize,
    /// Number of set tokens reconstructed.
    pub sets_reconstructed: usize,
    /// Number of flat tokens passed through.
    pub flat_tokens: usize,
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Convert all cascade `.tokens.json` files in `input_dir` and write legacy
/// `*.json` token files to `output_dir`. Output files use the same stem as
/// the input file.
pub fn convert_dir(input_dir: &Path, output_dir: &Path) -> Result<LegacySummary, CoreError> {
    std::fs::create_dir_all(output_dir)?;
    let mut summary = LegacySummary::default();

    for input_path in discover_json_files(input_dir)? {
        let text = std::fs::read_to_string(&input_path)?;
        let value: Value = serde_json::from_str(&text)?;

        // Only process cascade-format files (top-level arrays).
        let Some(arr) = value.as_array() else {
            continue;
        };

        let legacy = convert_array(arr, &mut summary);
        if legacy.is_empty() {
            continue;
        }

        // Output file: strip `.tokens.json` or just `.json` → same stem + `.json`.
        let stem = input_path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("tokens");
        let out_stem = stem
            .strip_suffix(".tokens.json")
            .or_else(|| stem.strip_suffix(".json"))
            .unwrap_or(stem);
        let out_name = format!("{out_stem}.json");
        let out_path = output_dir.join(out_name);
        let out_text = serde_json::to_string_pretty(&Value::Object(legacy))?;
        std::fs::write(&out_path, out_text)?;

        summary.files_processed += 1;
        summary.files_written += 1;
    }

    Ok(summary)
}

/// Convert a single cascade token (from a `name` object + token fields) to a
/// legacy entry value. Returns `None` if the token has no `name.property`.
///
/// Used directly in tests; `convert_dir` calls this internally via `convert_array`.
pub fn convert_token(token: &Map<String, Value>) -> Option<(String, Value)> {
    let name_obj = token.get("name")?.as_object()?;
    let property = name_obj.get("property")?.as_str()?.to_string();
    let entry = build_entry(token, name_obj);
    Some((property, entry))
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/// Convert a cascade array to a legacy object map.
///
/// Tokens that share a `name.property` and differ only by a dimension key are
/// grouped into a `color-set` or `scale-set` entry. Tokens with no recognized
/// dimension key are emitted as flat entries.
fn convert_array(arr: &[Value], summary: &mut LegacySummary) -> Map<String, Value> {
    // Group tokens by property name, preserving document order via BTreeMap.
    let mut groups: BTreeMap<String, Vec<&Map<String, Value>>> = BTreeMap::new();

    for item in arr {
        let Some(tok) = item.as_object() else { continue };
        let Some(name_obj) = tok.get("name").and_then(|v| v.as_object()) else { continue };
        let Some(property) = name_obj.get("property").and_then(|v| v.as_str()) else { continue };
        groups.entry(property.to_string()).or_default().push(tok);
    }

    let mut out = Map::new();

    for (property, tokens) in groups {
        if tokens.is_empty() {
            continue;
        }

        // Detect dimension key across the group.
        let dim_key = detect_dimension_key(&tokens);

        let entry = if let Some(dim) = dim_key {
            let result = build_set_entry(&property, &tokens, dim, summary);
            summary.sets_reconstructed += 1;
            result
        } else {
            // Use the first token (base/default variant) as the flat entry.
            summary.flat_tokens += 1;
            build_flat_entry(tokens[0])
        };

        summary.tokens_produced += 1;
        out.insert(property, entry);
    }

    out
}

/// Detect the dimension key used by a group of tokens (e.g. `colorScheme`, `scale`).
/// Returns `None` if no recognized set-forming dimension is present.
fn detect_dimension_key<'a>(tokens: &[&'a Map<String, Value>]) -> Option<&'a str> {
    // A set dimension is one where at least one token in the group has that key
    // in its name object. We prefer colorScheme, then scale.
    let set_dims = ["colorScheme", "scale"];
    for tok in tokens.iter() {
        if let Some(name_obj) = tok.get("name").and_then(|v| v.as_object()) {
            for dim in &set_dims {
                if name_obj.contains_key(*dim) {
                    return Some(dim);
                }
            }
        }
    }
    None
}

/// Build a `color-set` or `scale-set` outer entry from a group of cascade tokens.
fn build_set_entry(
    _property: &str,
    tokens: &[&Map<String, Value>],
    dim_key: &str,
    _summary: &mut LegacySummary,
) -> Value {
    let set_schema = if dim_key == "colorScheme" {
        COLOR_SET_SCHEMA
    } else {
        SCALE_SET_SCHEMA
    };

    let mut outer = Map::new();
    outer.insert("$schema".into(), Value::String(set_schema.to_string()));

    // Hoist component from name object if consistent across all tokens.
    let component = consistent_str_field(tokens, |tok| {
        tok.get("name")
            .and_then(|v| v.as_object())
            .and_then(|n| n.get("component"))
            .and_then(|v| v.as_str())
    });
    if let Some(c) = component {
        outer.insert("component".into(), Value::String(c.to_string()));
    }

    // Hoist lifecycle fields that are identical across all mode entries.
    for field in OUTER_LIFECYCLE_FIELDS {
        if let Some(val) = consistent_field(tokens, field) {
            outer.insert(field.to_string(), val.clone());
        }
    }

    // Build sets object.
    let mut sets = Map::new();
    for tok in tokens {
        let Some(name_obj) = tok.get("name").and_then(|v| v.as_object()) else { continue };
        let Some(mode) = name_obj.get(dim_key).and_then(|v| v.as_str()) else { continue };
        let entry = build_mode_entry(tok, tokens);
        sets.insert(mode.to_string(), Value::Object(entry));
    }
    outer.insert("sets".into(), Value::Object(sets));

    Value::Object(outer)
}

/// Build a single mode entry (inside `sets`) from a cascade token.
/// Lifecycle fields that were hoisted to the outer level are omitted from the
/// mode entry when they are consistent across all tokens.
fn build_mode_entry(
    tok: &Map<String, Value>,
    all_tokens: &[&Map<String, Value>],
) -> Map<String, Value> {
    let mut entry = Map::new();

    if let Some(schema) = tok.get("$schema").and_then(|v| v.as_str()) {
        entry.insert("$schema".into(), Value::String(schema.to_string()));
    }

    // Value / alias denormalization.
    insert_value_or_ref(&mut entry, tok);

    if let Some(uuid) = tok.get("uuid").and_then(|v| v.as_str()) {
        entry.insert("uuid".into(), Value::String(uuid.to_string()));
    }

    // Include lifecycle fields only if NOT consistently the same across all
    // tokens (i.e. they weren't hoisted to the outer level).
    for field in OUTER_LIFECYCLE_FIELDS {
        let is_hoisted = consistent_field(all_tokens, field).is_some();
        if !is_hoisted {
            if let Some(v) = tok.get(*field) {
                entry.insert(field.to_string(), v.clone());
            }
        }
    }

    entry
}

/// Build a flat legacy entry from a cascade token with no dimension key.
fn build_flat_entry(tok: &Map<String, Value>) -> Value {
    let mut entry = Map::new();

    if let Some(schema) = tok.get("$schema").and_then(|v| v.as_str()) {
        entry.insert("$schema".into(), Value::String(schema.to_string()));
    }

    // Component lives at the outer level in legacy format.
    if let Some(c) = tok
        .get("name")
        .and_then(|v| v.as_object())
        .and_then(|n| n.get("component"))
        .and_then(|v| v.as_str())
    {
        entry.insert("component".into(), Value::String(c.to_string()));
    }

    insert_value_or_ref(&mut entry, tok);

    if let Some(uuid) = tok.get("uuid").and_then(|v| v.as_str()) {
        entry.insert("uuid".into(), Value::String(uuid.to_string()));
    }

    for field in OUTER_LIFECYCLE_FIELDS {
        if let Some(v) = tok.get(*field) {
            entry.insert(field.to_string(), v.clone());
        }
    }

    Value::Object(entry)
}

/// Build an entry value directly from a cascade token (used by `convert_token`).
fn build_entry(tok: &Map<String, Value>, name_obj: &Map<String, Value>) -> Value {
    // If the token has a recognized dimension key in its name object, it cannot
    // be round-tripped as a standalone entry — return flat entry.
    let _ = name_obj;
    build_flat_entry(tok)
}

/// Denormalize `$ref: "foo"` → `value: "{foo}"`.
fn insert_value_or_ref(out: &mut Map<String, Value>, src: &Map<String, Value>) {
    if let Some(r) = src.get("$ref").and_then(|v| v.as_str()) {
        out.insert("value".into(), Value::String(format!("{{{r}}}")));
    } else if let Some(v) = src.get("value") {
        out.insert("value".into(), v.clone());
    }
}

/// Return the value of `field` if it is identical across all tokens, else `None`.
fn consistent_field<'a>(tokens: &[&'a Map<String, Value>], field: &str) -> Option<&'a Value> {
    let first = tokens.first()?.get(field)?;
    if tokens.iter().all(|t| t.get(field) == Some(first)) {
        Some(first)
    } else {
        None
    }
}

/// Return a string field extracted by `f` if it is identical across all tokens.
fn consistent_str_field<'a, F>(tokens: &[&'a Map<String, Value>], f: F) -> Option<&'a str>
where
    F: Fn(&'a Map<String, Value>) -> Option<&'a str>,
{
    let first = f(tokens.first()?)?;
    if tokens.iter().all(|t| f(t) == Some(first)) {
        Some(first)
    } else {
        None
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn obj(v: Value) -> Map<String, Value> {
        v.as_object().unwrap().clone()
    }

    #[test]
    fn flat_ref_denormalizes_to_value() {
        let tok = obj(json!({
            "name": {"property": "swatch-border-color", "component": "swatch"},
            "$schema": ".../alias.json",
            "$ref": "gray-1000",
            "uuid": "flat-0001"
        }));
        let (name, entry) = convert_token(&tok).unwrap();
        assert_eq!(name, "swatch-border-color");
        assert_eq!(entry["value"], "{gray-1000}");
        assert!(entry.get("$ref").is_none());
        assert_eq!(entry["component"], "swatch");
        assert_eq!(entry["uuid"], "flat-0001");
    }

    #[test]
    fn flat_literal_passes_through() {
        let tok = obj(json!({
            "name": {"property": "spacing-100"},
            "$schema": ".../dimension.json",
            "value": "8px",
            "uuid": "flat-0002"
        }));
        let (name, entry) = convert_token(&tok).unwrap();
        assert_eq!(name, "spacing-100");
        assert_eq!(entry["value"], "8px");
    }

    #[test]
    fn color_set_reconstructed_from_three_cascade_tokens() {
        let arr = json!([
            {"name": {"property": "overlay-opacity", "colorScheme": "light"},
             "$schema": ".../opacity.json", "value": "0.4", "uuid": "cs-0001"},
            {"name": {"property": "overlay-opacity", "colorScheme": "dark"},
             "$schema": ".../opacity.json", "value": "0.6", "uuid": "cs-0002"},
            {"name": {"property": "overlay-opacity", "colorScheme": "wireframe"},
             "$schema": ".../opacity.json", "value": "0.4", "uuid": "cs-0003"}
        ]);
        let mut summary = LegacySummary::default();
        let out = convert_array(arr.as_array().unwrap(), &mut summary);

        assert!(out.contains_key("overlay-opacity"));
        let entry = &out["overlay-opacity"];
        assert!(entry["$schema"].as_str().unwrap().ends_with("color-set.json"));
        assert_eq!(entry["sets"]["light"]["uuid"], "cs-0001");
        assert_eq!(entry["sets"]["dark"]["uuid"], "cs-0002");
        assert_eq!(entry["sets"]["wireframe"]["uuid"], "cs-0003");
        assert_eq!(summary.sets_reconstructed, 1);
    }

    #[test]
    fn scale_set_reconstructed_from_two_cascade_tokens() {
        let arr = json!([
            {"name": {"property": "spacing-100", "scale": "desktop"},
             "$schema": ".../dimension.json", "value": "8px", "uuid": "ss-0001"},
            {"name": {"property": "spacing-100", "scale": "mobile"},
             "$schema": ".../dimension.json", "value": "10px", "uuid": "ss-0002"}
        ]);
        let mut summary = LegacySummary::default();
        let out = convert_array(arr.as_array().unwrap(), &mut summary);

        let entry = &out["spacing-100"];
        assert!(entry["$schema"].as_str().unwrap().ends_with("scale-set.json"));
        assert_eq!(entry["sets"]["desktop"]["value"], "8px");
        assert_eq!(entry["sets"]["mobile"]["value"], "10px");
    }

    #[test]
    fn consistent_lifecycle_field_hoisted_to_outer() {
        let arr = json!([
            {"name": {"property": "old-color", "colorScheme": "light"},
             "value": "#fff", "uuid": "lc-0001", "deprecated": true, "renamed": "new-color"},
            {"name": {"property": "old-color", "colorScheme": "dark"},
             "value": "#000", "uuid": "lc-0002", "deprecated": true, "renamed": "new-color"}
        ]);
        let mut summary = LegacySummary::default();
        let out = convert_array(arr.as_array().unwrap(), &mut summary);

        let entry = &out["old-color"];
        // deprecated and renamed are consistent → hoisted to outer
        assert_eq!(entry["deprecated"], true);
        assert_eq!(entry["renamed"], "new-color");
        // mode entries should NOT repeat the hoisted fields
        assert!(entry["sets"]["light"].get("deprecated").is_none());
        assert!(entry["sets"]["dark"].get("deprecated").is_none());
    }

    #[test]
    fn inconsistent_lifecycle_field_stays_in_mode_entry() {
        let arr = json!([
            {"name": {"property": "mixed-color", "colorScheme": "light"},
             "value": "#fff", "uuid": "lc-0003", "deprecated": false},
            {"name": {"property": "mixed-color", "colorScheme": "dark"},
             "value": "#000", "uuid": "lc-0004", "deprecated": true}
        ]);
        let mut summary = LegacySummary::default();
        let out = convert_array(arr.as_array().unwrap(), &mut summary);

        let entry = &out["mixed-color"];
        // Not consistent → should NOT be hoisted
        assert!(entry.get("deprecated").is_none());
        // Each mode entry should have its own value
        assert_eq!(entry["sets"]["light"]["deprecated"], false);
        assert_eq!(entry["sets"]["dark"]["deprecated"], true);
    }

    #[test]
    fn alias_in_set_denormalized() {
        let arr = json!([
            {"name": {"property": "action-color", "colorScheme": "light"},
             "$schema": ".../alias.json", "$ref": "blue-900", "uuid": "al-0001"},
            {"name": {"property": "action-color", "colorScheme": "dark"},
             "$schema": ".../alias.json", "$ref": "blue-300", "uuid": "al-0002"},
            {"name": {"property": "action-color", "colorScheme": "wireframe"},
             "$schema": ".../alias.json", "$ref": "gray-500", "uuid": "al-0003"}
        ]);
        let mut summary = LegacySummary::default();
        let out = convert_array(arr.as_array().unwrap(), &mut summary);

        let entry = &out["action-color"];
        assert_eq!(entry["sets"]["light"]["value"], "{blue-900}");
        assert_eq!(entry["sets"]["dark"]["value"], "{blue-300}");
        assert!(entry["sets"]["light"].get("$ref").is_none());
    }
}
