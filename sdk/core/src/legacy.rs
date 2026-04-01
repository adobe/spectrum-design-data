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

use std::collections::{BTreeMap, BTreeSet, HashMap};
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
const OUTER_LIFECYCLE_FIELDS: &[&str] = &[
    "deprecated",
    "deprecated_comment",
    "renamed",
    "replaced_by",
    "plannedRemoval",
    "introduced",
    "private",
    "description",
];

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

    // Pass 1: read all cascade files and build a global UUID → property-name map
    // so that cross-file `replaced_by` references resolve to `renamed`.
    let input_paths = discover_json_files(input_dir)?;
    let mut all_files: Vec<(std::path::PathBuf, Value)> = Vec::new();
    let mut global_uuid_to_name: HashMap<String, String> = HashMap::new();

    for input_path in input_paths {
        let text = std::fs::read_to_string(&input_path)?;
        let value: Value = serde_json::from_str(&text)?;
        if let Some(arr) = value.as_array() {
            for item in arr {
                if let Some(tok) = item.as_object() {
                    let name = tok
                        .get("name")
                        .and_then(|v| v.as_object())
                        .and_then(|n| n.get("property"))
                        .and_then(|v| v.as_str());
                    if let Some(name) = name {
                        // Index the per-mode uuid.
                        if let Some(uuid) = tok.get("uuid").and_then(|v| v.as_str()) {
                            global_uuid_to_name.insert(uuid.to_string(), name.to_string());
                        }
                        // Also index set_uuid so replaced_by pointing at a set token's
                        // outer UUID resolves correctly to renamed.
                        if let Some(set_uuid) = tok.get("set_uuid").and_then(|v| v.as_str()) {
                            global_uuid_to_name.insert(set_uuid.to_string(), name.to_string());
                        }
                    }
                }
            }
        }
        all_files.push((input_path, value));
    }

    // Pass 2: convert each file using the global map.
    for (input_path, value) in &all_files {
        let Some(arr) = value.as_array() else {
            continue;
        };

        let legacy = convert_array(arr, &mut summary, &global_uuid_to_name)?;
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

// ── Roundtrip verification ────────────────────────────────────────────────────

/// A semantic difference found between a generated legacy file and its reference.
#[derive(Debug, PartialEq)]
pub struct VerifyDifference {
    /// Name of the file being compared (stem only, e.g. `"layout"`).
    pub file: String,
    /// The token property name where the difference was found.
    pub token: String,
    /// Human-readable description of the difference.
    pub detail: String,
}

/// Run a full legacy → cascade → legacy roundtrip on `legacy_src` and compare
/// the output semantically against the original source.
///
/// Lifecycle hoisting (e.g. `deprecated` moving from mode entries to the outer
/// token level) is treated as equivalent — the comparison normalises both sides
/// before diffing so these structural-but-not-semantic changes do not produce
/// false positives.
///
/// Returns a list of meaningful differences. An empty `Vec` means the roundtrip
/// is clean. Returns `Err` only on I/O or parse failures.
pub fn roundtrip_verify(legacy_src: &Path) -> Result<Vec<VerifyDifference>, CoreError> {
    let cascade_tmp = tempfile::tempdir()?;
    let legacy_tmp = tempfile::tempdir()?;
    crate::migrate::convert_dir(legacy_src, cascade_tmp.path())?;
    convert_dir(cascade_tmp.path(), legacy_tmp.path())?;
    verify_against_reference(legacy_tmp.path(), legacy_src)
}

/// Compare a directory of generated legacy files against a reference directory.
///
/// For each `.json` file in `reference_dir`, finds the matching file in
/// `output_dir` and compares token entries semantically. Lifecycle fields
/// (`deprecated`, `deprecated_comment`, `renamed`) are normalised — a field
/// present only at the outer level in one side and only in all mode entries in
/// the other is treated as equivalent.
pub fn verify_against_reference(
    output_dir: &Path,
    reference_dir: &Path,
) -> Result<Vec<VerifyDifference>, CoreError> {
    let mut diffs = Vec::new();

    for ref_path in discover_json_files(reference_dir)? {
        let stem = ref_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_string();

        let out_path = output_dir.join(format!("{stem}.json"));
        if !out_path.exists() {
            diffs.push(VerifyDifference {
                file: stem.clone(),
                token: String::new(),
                detail: format!("file {stem}.json missing from output"),
            });
            continue;
        }

        let ref_text = std::fs::read_to_string(&ref_path)?;
        let out_text = std::fs::read_to_string(&out_path)?;
        let ref_obj: Map<String, Value> =
            serde_json::from_str::<Value>(&ref_text)
                .map_err(|e| CoreError::ParseError(format!("{stem}.json (reference): {e}")))?
                .as_object()
                .cloned()
                .ok_or_else(|| CoreError::ParseError(format!("{stem}.json (reference): not an object")))?;
        let out_obj: Map<String, Value> =
            serde_json::from_str::<Value>(&out_text)
                .map_err(|e| CoreError::ParseError(format!("{stem}.json (output): {e}")))?
                .as_object()
                .cloned()
                .ok_or_else(|| CoreError::ParseError(format!("{stem}.json (output): not an object")))?;

        // Tokens present in reference but missing from output.
        for key in ref_obj.keys() {
            if !out_obj.contains_key(key.as_str()) {
                diffs.push(VerifyDifference {
                    file: stem.clone(),
                    token: key.clone(),
                    detail: "token missing from output".into(),
                });
            }
        }

        // Tokens present in output but not in reference.
        for key in out_obj.keys() {
            if !ref_obj.contains_key(key.as_str()) {
                diffs.push(VerifyDifference {
                    file: stem.clone(),
                    token: key.clone(),
                    detail: "extra token in output not present in reference".into(),
                });
            }
        }

        // Semantic comparison of tokens present in both.
        for (key, ref_entry) in &ref_obj {
            let Some(out_entry) = out_obj.get(key) else {
                continue; // already reported above
            };
            let entry_diffs =
                compare_token_entries(key, ref_entry, out_entry);
            for detail in entry_diffs {
                diffs.push(VerifyDifference {
                    file: stem.clone(),
                    token: key.clone(),
                    detail,
                });
            }
        }
    }

    Ok(diffs)
}

/// Compare two legacy token entries semantically.
/// Returns a list of difference descriptions (empty = equivalent).
///
/// Lifecycle hoisting is normalised: fields that appear only at the outer level
/// on one side but consistently in all mode entries on the other are treated as
/// equivalent.
fn compare_token_entries(name: &str, reference: &Value, output: &Value) -> Vec<String> {
    let _ = name;
    let mut diffs = Vec::new();

    let (Some(ref_obj), Some(out_obj)) = (reference.as_object(), output.as_object()) else {
        if reference != output {
            diffs.push(format!("value mismatch: {reference:?} vs {out_obj:?}", out_obj = output));
        }
        return diffs;
    };

    // Compare $schema.
    if ref_obj.get("$schema") != out_obj.get("$schema") {
        diffs.push(format!(
            "$schema mismatch: {:?} vs {:?}",
            ref_obj.get("$schema"),
            out_obj.get("$schema")
        ));
    }

    // Compare uuid (outer set-level).
    if ref_obj.get("uuid") != out_obj.get("uuid") {
        diffs.push(format!(
            "uuid mismatch: {:?} vs {:?}",
            ref_obj.get("uuid"),
            out_obj.get("uuid")
        ));
    }

    // Compare component.
    if ref_obj.get("component") != out_obj.get("component") {
        diffs.push(format!(
            "component mismatch: {:?} vs {:?}",
            ref_obj.get("component"),
            out_obj.get("component")
        ));
    }

    // Compare value/alias for flat tokens.
    if ref_obj.get("value") != out_obj.get("value") {
        diffs.push(format!(
            "value mismatch: {:?} vs {:?}",
            ref_obj.get("value"),
            out_obj.get("value")
        ));
    }

    // Normalise and compare lifecycle fields, tolerating hoisting differences.
    // "Effective" value = outer field if present, else the consistent value
    // across all mode entries (if any).
    const LIFECYCLE: &[&str] = &["deprecated", "deprecated_comment", "renamed", "private", "description"];
    for field in LIFECYCLE {
        let ref_eff = effective_lifecycle_value(ref_obj, field);
        let out_eff = effective_lifecycle_value(out_obj, field);
        if ref_eff != out_eff {
            diffs.push(format!(
                "{field} mismatch: {ref_eff:?} vs {out_eff:?}"
            ));
        }
    }

    // Compare sets structure (modes and all per-mode fields).
    match (ref_obj.get("sets"), out_obj.get("sets")) {
        (Some(ref_sets), Some(out_sets)) => {
            let ref_sets = ref_sets.as_object();
            let out_sets = out_sets.as_object();
            if let (Some(ref_sets), Some(out_sets)) = (ref_sets, out_sets) {
                for mode in ref_sets.keys() {
                    let Some(out_mode) = out_sets.get(mode.as_str()) else {
                        diffs.push(format!("sets.{mode} missing from output"));
                        continue;
                    };
                    let ref_mode = &ref_sets[mode];
                    // Fields compared directly (not subject to hoisting).
                    for field in &["value", "uuid", "$schema"] {
                        if ref_mode.get(*field) != out_mode.get(*field) {
                            diffs.push(format!(
                                "sets.{mode}.{field} mismatch: {:?} vs {:?}",
                                ref_mode.get(*field),
                                out_mode.get(*field)
                            ));
                        }
                    }
                    // Per-mode lifecycle fields — normalised for hoisting.
                    // A field present in a reference mode but absent in the output mode is
                    // acceptable if the output token's outer level carries the same value
                    // (hoisting occurred during conversion). This mirrors the outer-level
                    // effective_lifecycle_value normalisation.
                    for field in LIFECYCLE {
                        let ref_val = ref_mode.as_object().and_then(|m| m.get(*field));
                        let out_val = out_mode.as_object().and_then(|m| m.get(*field));
                        if ref_val == out_val {
                            continue;
                        }
                        // Allow hoisting: ref has field in mode, output hoisted it to outer.
                        if out_val.is_none() && out_obj.get(*field) == ref_val {
                            continue;
                        }
                        diffs.push(format!(
                            "sets.{mode}.{field} mismatch: {ref_val:?} vs {out_val:?}"
                        ));
                    }
                }
                for mode in out_sets.keys() {
                    if !ref_sets.contains_key(mode.as_str()) {
                        diffs.push(format!("sets.{mode} extra in output"));
                    }
                }
            }
        }
        (None, None) => {}
        (Some(_), None) => diffs.push("sets present in reference but missing from output".into()),
        (None, Some(_)) => diffs.push("sets present in output but missing from reference".into()),
    }

    diffs
}

/// Return the "effective" value of a lifecycle field for a token entry,
/// normalising hoisting: if the field is absent at the outer level but
/// present consistently across all mode entries, that consistent value is
/// returned.
fn effective_lifecycle_value<'a>(entry: &'a Map<String, Value>, field: &str) -> Option<&'a Value> {
    // Outer level wins if present.
    if let Some(v) = entry.get(field) {
        return Some(v);
    }
    // Fall back to consistent value across all mode entries.
    let sets = entry.get("sets")?.as_object()?;
    let mut iter = sets.values().filter_map(|v| v.as_object()?.get(field));
    let first = iter.next()?;
    if iter.all(|v| v == first) {
        Some(first)
    } else {
        None
    }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/// Convert a cascade array to a legacy object map.
///
/// Tokens that share a `name.property` and differ only by a **single** dimension
/// key are grouped into a `color-set` or `scale-set` entry. Tokens with no
/// recognized dimension key are emitted as flat entries.
///
/// Returns `Err(CoreError::MultiDimensionalToken)` if any property group has
/// tokens spread across more than one dimension (e.g. colorScheme × scale).
/// The legacy format has no representation for such combinations; emitting a
/// partial output would silently discard data.
fn convert_array(
    arr: &[Value],
    summary: &mut LegacySummary,
    global_uuid_to_name: &HashMap<String, String>,
) -> Result<Map<String, Value>, CoreError> {
    // Group tokens by property name, preserving document order via BTreeMap.
    let mut groups: BTreeMap<String, Vec<&Map<String, Value>>> = BTreeMap::new();

    for item in arr {
        let Some(tok) = item.as_object() else {
            continue;
        };
        let Some(name_obj) = tok.get("name").and_then(|v| v.as_object()) else {
            continue;
        };
        let Some(property) = name_obj.get("property").and_then(|v| v.as_str()) else {
            continue;
        };
        groups.entry(property.to_string()).or_default().push(tok);
    }

    let mut out = Map::new();

    for (property, tokens) in groups {
        if tokens.is_empty() {
            continue;
        }

        // Collect ALL distinct dimension keys present across this property group.
        let dim_keys = collect_dimension_keys(&tokens);

        if dim_keys.len() > 1 {
            return Err(CoreError::MultiDimensionalToken(property));
        }

        let mut entry = if let Some(dim) = dim_keys.into_iter().next() {
            let result = build_set_entry(&property, &tokens, dim, summary);
            summary.sets_reconstructed += 1;
            result
        } else {
            // No dimension key → flat entry (use first token, base/default variant).
            summary.flat_tokens += 1;
            build_flat_entry(tokens[0])
        };

        // Convert cascade lifecycle fields to legacy format.
        if let Some(obj) = entry.as_object_mut() {
            normalize_lifecycle_for_legacy(obj, global_uuid_to_name);
        }

        summary.tokens_produced += 1;
        out.insert(property, entry);
    }

    Ok(out)
}

/// Convert cascade lifecycle fields to legacy format on a token entry.
///
/// - `deprecated: "version"` → `deprecated: true`
/// - `replaced_by: "uuid"` → `renamed: "<property-name>"` (resolved via map)
/// - `plannedRemoval`, `introduced` → removed (no legacy equivalent)
fn normalize_lifecycle_for_legacy(
    entry: &mut Map<String, Value>,
    uuid_to_name: &HashMap<String, String>,
) {
    // deprecated: version string → boolean true
    if let Some(dep) = entry.get("deprecated") {
        if dep.is_string() {
            entry.insert("deprecated".into(), Value::Bool(true));
        }
    }

    // replaced_by → renamed (resolve UUID to property name)
    if let Some(replaced) = entry.remove("replaced_by") {
        if let Some(uuid) = replaced.as_str() {
            if let Some(name) = uuid_to_name.get(uuid) {
                entry.insert("renamed".into(), Value::String(name.clone()));
            }
        }
        // Array form: don't emit renamed (no 1:1 mapping); deprecated_comment explains it.
    }

    // Drop fields with no legacy equivalent.
    entry.remove("plannedRemoval");
    entry.remove("introduced");

    // Recurse into sets entries.
    if let Some(sets) = entry.get_mut("sets").and_then(|v| v.as_object_mut()) {
        for (_mode, set_entry) in sets.iter_mut() {
            if let Some(obj) = set_entry.as_object_mut() {
                normalize_lifecycle_for_legacy(obj, uuid_to_name);
            }
        }
    }
}

/// Collect the set of recognized dimension keys present in any token in the group.
///
/// Only the known set-forming dimensions are considered (`colorScheme`, `scale`).
/// Returns a sorted set so error messages are deterministic.
fn collect_dimension_keys(tokens: &[&Map<String, Value>]) -> BTreeSet<&'static str> {
    const SET_DIMS: &[&str] = &["colorScheme", "scale"];
    let mut found = BTreeSet::new();
    for tok in tokens {
        if let Some(name_obj) = tok.get("name").and_then(|v| v.as_object()) {
            for dim in SET_DIMS {
                if name_obj.contains_key(*dim) {
                    found.insert(*dim);
                }
            }
        }
    }
    found
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

    // Recover the outer set-level UUID from the cascade tokens (stored as set_uuid).
    if let Some(set_uuid) =
        consistent_str_field(tokens, |t| t.get("set_uuid").and_then(|v| v.as_str()))
    {
        outer.insert("uuid".into(), Value::String(set_uuid.to_string()));
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
        let Some(name_obj) = tok.get("name").and_then(|v| v.as_object()) else {
            continue;
        };
        let Some(mode) = name_obj.get(dim_key).and_then(|v| v.as_str()) else {
            continue;
        };
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
        let out = convert_array(arr.as_array().unwrap(), &mut summary, &HashMap::new()).unwrap();

        assert!(out.contains_key("overlay-opacity"));
        let entry = &out["overlay-opacity"];
        assert!(entry["$schema"]
            .as_str()
            .unwrap()
            .ends_with("color-set.json"));
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
        let out = convert_array(arr.as_array().unwrap(), &mut summary, &HashMap::new()).unwrap();

        let entry = &out["spacing-100"];
        assert!(entry["$schema"]
            .as_str()
            .unwrap()
            .ends_with("scale-set.json"));
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
        let out = convert_array(arr.as_array().unwrap(), &mut summary, &HashMap::new()).unwrap();

        let entry = &out["old-color"];
        assert_eq!(entry["deprecated"], true);
        assert_eq!(entry["renamed"], "new-color");
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
        let out = convert_array(arr.as_array().unwrap(), &mut summary, &HashMap::new()).unwrap();

        let entry = &out["mixed-color"];
        assert!(entry.get("deprecated").is_none());
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
        let out = convert_array(arr.as_array().unwrap(), &mut summary, &HashMap::new()).unwrap();

        let entry = &out["action-color"];
        assert_eq!(entry["sets"]["light"]["value"], "{blue-900}");
        assert_eq!(entry["sets"]["dark"]["value"], "{blue-300}");
        assert!(entry["sets"]["light"].get("$ref").is_none());
    }

    /// Regression for P1: multi-dimensional cascade tokens MUST error, not silently
    /// discard data. A colorScheme × scale matrix cannot be represented in legacy format.
    #[test]
    fn multi_dimensional_tokens_error_not_silently_lose_data() {
        let arr = json!([
            {"name": {"property": "bg", "colorScheme": "light", "scale": "desktop"}, "value": "#fff", "uuid": "md-0001"},
            {"name": {"property": "bg", "colorScheme": "dark",  "scale": "desktop"}, "value": "#000", "uuid": "md-0002"},
            {"name": {"property": "bg", "colorScheme": "light", "scale": "mobile"},  "value": "#eee", "uuid": "md-0003"},
            {"name": {"property": "bg", "colorScheme": "dark",  "scale": "mobile"},  "value": "#111", "uuid": "md-0004"}
        ]);
        let mut summary = LegacySummary::default();
        let result = convert_array(arr.as_array().unwrap(), &mut summary, &HashMap::new());
        assert!(
            result.is_err(),
            "expected Err for multi-dimensional property, got Ok"
        );
        let err = result.unwrap_err().to_string();
        assert!(
            err.contains("bg"),
            "error message should name the property: {err}"
        );
    }

    /// Regression: replaced_by pointing at a set token's outer UUID must resolve
    /// to `renamed` in the legacy output. Previously the global uuid_to_name map
    /// only indexed per-mode UUIDs, so set_uuid entries were invisible.
    #[test]
    fn replaced_by_set_uuid_resolves_to_renamed() {
        let arr = json!([
            // old-token: flat, deprecated, replaced_by the outer UUID of new-set.
            {
                "name": {"property": "old-token"},
                "$schema": ".../color.json",
                "value": "#fff",
                "uuid": "old-0001",
                "deprecated": true,
                "replaced_by": "set-outer-uuid-0001"
            },
            // new-set light mode: carries set_uuid = "set-outer-uuid-0001".
            {
                "name": {"property": "new-set", "colorScheme": "light"},
                "$schema": ".../color.json",
                "value": "#aaa",
                "uuid": "new-0001",
                "set_uuid": "set-outer-uuid-0001"
            },
            // new-set dark mode: same set_uuid.
            {
                "name": {"property": "new-set", "colorScheme": "dark"},
                "$schema": ".../color.json",
                "value": "#111",
                "uuid": "new-0002",
                "set_uuid": "set-outer-uuid-0001"
            },
            // new-set wireframe mode: same set_uuid.
            {
                "name": {"property": "new-set", "colorScheme": "wireframe"},
                "$schema": ".../color.json",
                "value": "#888",
                "uuid": "new-0003",
                "set_uuid": "set-outer-uuid-0001"
            }
        ]);

        // Build the global map the same way convert_dir does.
        let mut global: HashMap<String, String> = HashMap::new();
        for item in arr.as_array().unwrap() {
            let tok = item.as_object().unwrap();
            let name = tok["name"]["property"].as_str().unwrap();
            if let Some(uuid) = tok.get("uuid").and_then(|v| v.as_str()) {
                global.insert(uuid.to_string(), name.to_string());
            }
            if let Some(set_uuid) = tok.get("set_uuid").and_then(|v| v.as_str()) {
                global.insert(set_uuid.to_string(), name.to_string());
            }
        }

        let mut summary = LegacySummary::default();
        let out = convert_array(arr.as_array().unwrap(), &mut summary, &global).unwrap();

        let old = &out["old-token"];
        assert_eq!(
            old.get("renamed").and_then(|v| v.as_str()),
            Some("new-set"),
            "replaced_by pointing at set_uuid should resolve to renamed"
        );
        assert_eq!(old["deprecated"], true);
        // new-set should have its outer UUID reconstructed.
        assert_eq!(out["new-set"]["uuid"], "set-outer-uuid-0001");
    }

    /// Integration test: full roundtrip against the real Spectrum token sources.
    /// Skipped automatically when the packages/tokens/src directory is absent
    /// (e.g. in a sparse checkout).
    #[test]
    fn full_roundtrip_clean_against_spectrum_token_sources() {
        let src = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../packages/tokens/src");
        if !src.exists() {
            return;
        }
        let diffs = crate::legacy::roundtrip_verify(&src)
            .expect("roundtrip_verify should not error");
        assert!(
            diffs.is_empty(),
            "legacy roundtrip has {} difference(s):\n{:#?}",
            diffs.len(),
            diffs
        );
    }
}
