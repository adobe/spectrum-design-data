// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Set-to-cascade migration: converts legacy `color-set` / `scale-set` token
//! files to spec-compliant cascade-format `.tokens.json` arrays.
//!
//! # Format transformation
//!
//! **Legacy set token** (one outer key, N mode entries in `sets`):
//! ```json
//! {
//!   "overlay-opacity": {
//!     "$schema": ".../color-set.json",
//!     "deprecated": true,
//!     "sets": {
//!       "light": { "$schema": ".../opacity.json", "value": "0.4", "uuid": "aaa" },
//!       "dark":  { "$schema": ".../opacity.json", "value": "0.6", "uuid": "bbb" }
//!     }
//!   }
//! }
//! ```
//!
//! **Cascade output** (array of individual tokens per mode):
//! ```json
//! [
//!   { "name": { "property": "overlay-opacity", "colorScheme": "light" },
//!     "$schema": ".../opacity.json", "value": "0.4", "uuid": "aaa", "deprecated": true },
//!   { "name": { "property": "overlay-opacity", "colorScheme": "dark" },
//!     "$schema": ".../opacity.json", "value": "0.6", "uuid": "bbb", "deprecated": true }
//! ]
//! ```
//!
//! **Flat tokens** (no `sets`) are wrapped with a `name` object and alias syntax
//! is normalized: `value: "{foo}"` → `$ref: "foo"`.

use std::path::Path;

use serde_json::{Map, Value};

use crate::discovery::discover_json_files;
use crate::CoreError;

// ── Mode orders ───────────────────────────────────────────────────────────────

/// Stable output order for `color-set` modes.
const COLOR_SET_MODE_ORDER: &[&str] = &["light", "dark", "wireframe"];

/// Stable output order for `scale-set` modes.
const SCALE_SET_MODE_ORDER: &[&str] = &["desktop", "mobile"];

/// Token fields that live at the outer set level and propagate to all child tokens.
const OUTER_LIFECYCLE_FIELDS: &[&str] = &[
    "deprecated",
    "deprecated_comment",
    "renamed",
    "private",
    "status",
    "description",
];

// ── Summary ───────────────────────────────────────────────────────────────────

/// Summary statistics from a migration run.
#[derive(Debug, Default)]
pub struct MigrateSummary {
    /// Number of source files processed.
    pub files_processed: usize,
    /// Number of output cascade files written.
    pub files_written: usize,
    /// Total cascade tokens produced.
    pub tokens_produced: usize,
    /// Number of set entries unwrapped (each mode entry becomes a cascade token).
    pub set_entries_unwrapped: usize,
    /// Number of flat tokens converted.
    pub flat_tokens_converted: usize,
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Convert a single legacy token JSON object map entry to cascade token(s).
///
/// Returns one token for flat entries, or N tokens for set tokens (one per mode).
pub fn convert_token(name: &str, token_obj: &Map<String, Value>) -> Vec<Value> {
    let schema = token_obj
        .get("$schema")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if schema.ends_with("color-set.json") {
        convert_set(name, token_obj, "colorScheme", COLOR_SET_MODE_ORDER)
    } else if schema.ends_with("scale-set.json") {
        convert_set(name, token_obj, "scale", SCALE_SET_MODE_ORDER)
    } else {
        vec![build_flat(name, token_obj)]
    }
}

/// Convert all legacy token files in `input_dir` and write cascade `.tokens.json`
/// files to `output_dir`. Output files use the same stem as the input file
/// with a `.tokens.json` extension.
///
/// Returns a summary of the migration.
pub fn convert_dir(input_dir: &Path, output_dir: &Path) -> Result<MigrateSummary, CoreError> {
    std::fs::create_dir_all(output_dir)?;
    let mut summary = MigrateSummary::default();

    for input_path in discover_json_files(input_dir)? {
        // Skip files that don't look like legacy token sources (e.g. schemas).
        let text = std::fs::read_to_string(&input_path)?;
        let value: Value = serde_json::from_str(&text)?;
        let Some(obj) = value.as_object() else {
            continue;
        };

        let tokens = convert_object(obj, &mut summary);
        if tokens.is_empty() {
            continue;
        }

        let stem = input_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("tokens");
        let out_name = format!("{stem}.tokens.json");
        let out_path = output_dir.join(out_name);
        let out_text = serde_json::to_string_pretty(&Value::Array(tokens))?;
        std::fs::write(&out_path, out_text)?;

        summary.files_processed += 1;
        summary.files_written += 1;
    }

    Ok(summary)
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/// Convert all entries in a legacy token file object to cascade tokens.
fn convert_object(obj: &Map<String, Value>, summary: &mut MigrateSummary) -> Vec<Value> {
    let mut out = Vec::new();
    for (name, val) in obj {
        let Some(tok_obj) = val.as_object() else {
            continue;
        };
        let schema = tok_obj
            .get("$schema")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if schema.ends_with("color-set.json") || schema.ends_with("scale-set.json") {
            let tokens = convert_token(name, tok_obj);
            summary.set_entries_unwrapped += tokens.len();
            summary.tokens_produced += tokens.len();
            out.extend(tokens);
        } else {
            out.push(build_flat(name, tok_obj));
            summary.flat_tokens_converted += 1;
            summary.tokens_produced += 1;
        }
    }
    out
}

/// Convert a set token (color-set or scale-set) into N cascade tokens.
fn convert_set(
    property: &str,
    outer: &Map<String, Value>,
    dim_key: &str,
    mode_order: &[&str],
) -> Vec<Value> {
    let sets = match outer.get("sets").and_then(|v| v.as_object()) {
        Some(s) => s,
        None => return vec![build_flat(property, outer)],
    };

    // Emit modes in stable order (defined order first, then any extras).
    let mut modes: Vec<&str> = mode_order
        .iter()
        .filter(|m| sets.contains_key(**m))
        .copied()
        .collect();
    for mode in sets.keys() {
        if !modes.contains(&mode.as_str()) {
            modes.push(mode.as_str());
        }
    }

    modes
        .iter()
        .filter_map(|mode| {
            let entry = sets.get(*mode)?.as_object()?;
            Some(build_set_entry(property, outer, entry, dim_key, mode))
        })
        .collect()
}

/// Build a cascade token from a set mode entry.
fn build_set_entry(
    property: &str,
    outer: &Map<String, Value>,
    entry: &Map<String, Value>,
    dim_key: &str,
    mode: &str,
) -> Value {
    let mut out = Map::new();

    // Name object: property + optional component from outer + dimension mode.
    let mut name_obj = Map::new();
    name_obj.insert("property".into(), Value::String(property.to_string()));
    if let Some(c) = outer.get("component").and_then(|v| v.as_str()) {
        name_obj.insert("component".into(), Value::String(c.to_string()));
    }
    name_obj.insert(dim_key.to_string(), Value::String(mode.to_string()));
    out.insert("name".into(), Value::Object(name_obj));

    // Schema URL from entry (value-type schema, not the set wrapper).
    if let Some(schema) = entry.get("$schema").and_then(|v| v.as_str()) {
        out.insert("$schema".into(), Value::String(schema.to_string()));
    }

    // Value or alias.
    insert_value_or_ref(&mut out, entry);

    // UUID from entry.
    if let Some(uuid) = entry.get("uuid").and_then(|v| v.as_str()) {
        out.insert("uuid".into(), Value::String(uuid.to_string()));
    }

    // Lifecycle fields: outer level first, entry level overrides.
    for field in OUTER_LIFECYCLE_FIELDS {
        if let Some(v) = outer.get(*field) {
            out.insert(field.to_string(), v.clone());
        }
    }
    for field in OUTER_LIFECYCLE_FIELDS {
        if let Some(v) = entry.get(*field) {
            out.insert(field.to_string(), v.clone());
        }
    }

    Value::Object(out)
}

/// Build a cascade token from a flat (non-set) legacy token.
fn build_flat(property: &str, token_obj: &Map<String, Value>) -> Value {
    let mut out = Map::new();

    // Name object: property + optional component.
    let mut name_obj = Map::new();
    name_obj.insert("property".into(), Value::String(property.to_string()));
    if let Some(c) = token_obj.get("component").and_then(|v| v.as_str()) {
        name_obj.insert("component".into(), Value::String(c.to_string()));
    }
    out.insert("name".into(), Value::Object(name_obj));

    // Schema URL (value-type, not a set schema).
    if let Some(schema) = token_obj.get("$schema").and_then(|v| v.as_str()) {
        if !schema.ends_with("color-set.json") && !schema.ends_with("scale-set.json") {
            out.insert("$schema".into(), Value::String(schema.to_string()));
        }
    }

    // Value or alias.
    insert_value_or_ref(&mut out, token_obj);

    // UUID.
    if let Some(uuid) = token_obj.get("uuid").and_then(|v| v.as_str()) {
        out.insert("uuid".into(), Value::String(uuid.to_string()));
    }

    // Lifecycle fields.
    for field in OUTER_LIFECYCLE_FIELDS {
        if let Some(v) = token_obj.get(*field) {
            out.insert(field.to_string(), v.clone());
        }
    }

    Value::Object(out)
}

/// Insert `value` or `$ref` into the output map from a source object.
///
/// Alias syntax `value: "{token-name}"` is normalized to `$ref: "token-name"`.
fn insert_value_or_ref(out: &mut Map<String, Value>, src: &Map<String, Value>) {
    if let Some(val) = src.get("value") {
        if let Some(s) = val.as_str() {
            if s.starts_with('{') && s.ends_with('}') && s.len() > 2 {
                let target = s[1..s.len() - 1].to_string();
                out.insert("$ref".into(), Value::String(target));
                return;
            }
        }
        out.insert("value".into(), val.clone());
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
    fn flat_alias_converts_to_ref() {
        let tokens = convert_token(
            "swatch-border-color",
            &obj(json!({
                "component": "swatch",
                "$schema": ".../alias.json",
                "value": "{gray-1000}",
                "uuid": "aabbccdd-0000-0000-0000-000000000000"
            })),
        );
        assert_eq!(tokens.len(), 1);
        let t = &tokens[0];
        assert_eq!(t["name"]["property"], "swatch-border-color");
        assert_eq!(t["name"]["component"], "swatch");
        assert_eq!(t["$ref"], "gray-1000");
        assert!(t.get("value").is_none());
        assert_eq!(t["uuid"], "aabbccdd-0000-0000-0000-000000000000");
    }

    #[test]
    fn flat_literal_keeps_value() {
        let tokens = convert_token(
            "spacing-100",
            &obj(json!({
                "$schema": ".../dimension.json",
                "value": "8px",
                "uuid": "11111111-0000-0000-0000-000000000000"
            })),
        );
        assert_eq!(tokens.len(), 1);
        assert_eq!(tokens[0]["value"], "8px");
        assert!(tokens[0].get("$ref").is_none());
    }

    #[test]
    fn color_set_splits_into_three_tokens() {
        let tokens = convert_token(
            "overlay-opacity",
            &obj(json!({
                "$schema": ".../color-set.json",
                "sets": {
                    "light":     { "$schema": ".../opacity.json", "value": "0.4", "uuid": "aaaa" },
                    "dark":      { "$schema": ".../opacity.json", "value": "0.6", "uuid": "bbbb" },
                    "wireframe": { "$schema": ".../opacity.json", "value": "0.4", "uuid": "cccc" }
                }
            })),
        );
        assert_eq!(tokens.len(), 3);
        // Stable output order: light, dark, wireframe.
        assert_eq!(tokens[0]["name"]["colorScheme"], "light");
        assert_eq!(tokens[1]["name"]["colorScheme"], "dark");
        assert_eq!(tokens[2]["name"]["colorScheme"], "wireframe");
        // Each token carries the right uuid.
        assert_eq!(tokens[0]["uuid"], "aaaa");
        assert_eq!(tokens[1]["uuid"], "bbbb");
    }

    #[test]
    fn scale_set_splits_into_two_tokens() {
        let tokens = convert_token(
            "spacing-size-100",
            &obj(json!({
                "$schema": ".../scale-set.json",
                "sets": {
                    "desktop": { "$schema": ".../dimension.json", "value": "8px",  "uuid": "dddd" },
                    "mobile":  { "$schema": ".../dimension.json", "value": "10px", "uuid": "eeee" }
                }
            })),
        );
        assert_eq!(tokens.len(), 2);
        assert_eq!(tokens[0]["name"]["scale"], "desktop");
        assert_eq!(tokens[1]["name"]["scale"], "mobile");
    }

    #[test]
    fn outer_lifecycle_propagates_to_all_modes() {
        let tokens = convert_token(
            "old-token",
            &obj(json!({
                "$schema": ".../scale-set.json",
                "deprecated": true,
                "deprecated_comment": "use new-token instead",
                "renamed": "new-token",
                "sets": {
                    "desktop": { "$schema": ".../dimension.json", "value": "4px", "uuid": "f1" },
                    "mobile":  { "$schema": ".../dimension.json", "value": "5px", "uuid": "f2" }
                }
            })),
        );
        assert_eq!(tokens.len(), 2);
        for t in &tokens {
            assert_eq!(t["deprecated"], true);
            assert_eq!(t["deprecated_comment"], "use new-token instead");
            assert_eq!(t["renamed"], "new-token");
        }
    }

    #[test]
    fn entry_lifecycle_overrides_outer() {
        let tokens = convert_token(
            "mixed-token",
            &obj(json!({
                "$schema": ".../scale-set.json",
                "deprecated": true,
                "sets": {
                    "desktop": { "$schema": ".../dimension.json", "value": "4px", "uuid": "g1", "deprecated": false },
                    "mobile":  { "$schema": ".../dimension.json", "value": "5px", "uuid": "g2" }
                }
            })),
        );
        // desktop entry overrides outer deprecated=true with false
        assert_eq!(tokens[0]["deprecated"], false);
        // mobile entry inherits outer deprecated=true
        assert_eq!(tokens[1]["deprecated"], true);
    }

    #[test]
    fn component_from_outer_goes_into_name() {
        let tokens = convert_token(
            "swatch-size",
            &obj(json!({
                "$schema": ".../scale-set.json",
                "component": "swatch",
                "sets": {
                    "desktop": { "$schema": ".../dimension.json", "value": "24px", "uuid": "h1" },
                    "mobile":  { "$schema": ".../dimension.json", "value": "30px", "uuid": "h2" }
                }
            })),
        );
        for t in &tokens {
            assert_eq!(t["name"]["component"], "swatch");
        }
    }

    #[test]
    fn color_set_alias_entry_normalizes_to_ref() {
        let tokens = convert_token(
            "action-color",
            &obj(json!({
                "$schema": ".../color-set.json",
                "sets": {
                    "light": { "$schema": ".../alias.json", "value": "{blue-500}", "uuid": "i1" },
                    "dark":  { "$schema": ".../alias.json", "value": "{blue-300}", "uuid": "i2" },
                    "wireframe": { "$schema": ".../alias.json", "value": "{gray-500}", "uuid": "i3" }
                }
            })),
        );
        assert_eq!(tokens[0]["$ref"], "blue-500");
        assert_eq!(tokens[1]["$ref"], "blue-300");
        assert!(tokens[0].get("value").is_none());
    }
}
