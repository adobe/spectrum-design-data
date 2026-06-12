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
//! **Cascade tokens for the same property with mode set variants:**
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
use crate::naming::extract_legacy_key;
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
                    // Use extract_legacy_key so string-name (escape-hatch) tokens
                    // are indexed correctly alongside object-name tokens.
                    let name = tok.get("name").and_then(extract_legacy_key);
                    if let Some(ref name) = name {
                        // Index the per-mode uuid.
                        if let Some(uuid) = tok.get("uuid").and_then(|v| v.as_str()) {
                            global_uuid_to_name.insert(uuid.to_string(), name.clone());
                        }
                        // Also index set_uuid so replaced_by pointing at a set token's
                        // outer UUID resolves correctly to renamed.
                        if let Some(set_uuid) = tok.get("set_uuid").and_then(|v| v.as_str()) {
                            global_uuid_to_name.insert(set_uuid.to_string(), name.clone());
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

/// Convert a single cascade token to a legacy entry value.
///
/// Accepts both object-name tokens and string-name (SPEC-017 escape-hatch) tokens.
/// Returns `None` only when the token has no recognisable `name` field.
///
/// Used directly in tests; `convert_dir` calls this internally via `convert_array`.
pub fn convert_token(token: &Map<String, Value>) -> Option<(String, Value)> {
    // No uuid_to_name map available in this single-token API; any UUID $ref
    // is wrapped verbatim.  Use convert_dir for full UUID→name resolution.
    let empty: HashMap<String, String> = HashMap::new();
    let key = token.get("name").and_then(extract_legacy_key)?;
    let entry = build_flat_entry(token, &empty);
    Some((key, entry))
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

/// Regenerate legacy files from a cascade source directory and compare
/// semantically against a committed reference legacy directory.
///
/// Equivalent to running `design-data migrate legacy-output` into a temp dir
/// and then comparing the output against `reference_legacy_dir` with the same
/// semantic normalisation as [`roundtrip_verify`].
///
/// Returns an empty `Vec` when the cascade and reference are in sync. Returns
/// `Err` only on I/O or parse failures.
pub fn legacy_output_verify(
    cascade_dir: &Path,
    reference_legacy_dir: &Path,
) -> Result<Vec<VerifyDifference>, CoreError> {
    let legacy_tmp = tempfile::tempdir()?;
    convert_dir(cascade_dir, legacy_tmp.path())?;
    verify_against_reference(legacy_tmp.path(), reference_legacy_dir)
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
        let ref_obj: Map<String, Value> = serde_json::from_str::<Value>(&ref_text)
            .map_err(|e| CoreError::ParseError(format!("{stem}.json (reference): {e}")))?
            .as_object()
            .cloned()
            .ok_or_else(|| {
                CoreError::ParseError(format!("{stem}.json (reference): not an object"))
            })?;
        let out_obj: Map<String, Value> = serde_json::from_str::<Value>(&out_text)
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
            let entry_diffs = compare_token_entries(key, ref_entry, out_entry);
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
            diffs.push(format!("value mismatch: {reference:?} vs {output:?}"));
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
    const LIFECYCLE: &[&str] = &[
        "deprecated",
        "deprecated_comment",
        "renamed",
        "private",
        "description",
    ];
    for field in LIFECYCLE {
        let ref_eff = effective_lifecycle_value(ref_obj, field);
        let out_eff = effective_lifecycle_value(out_obj, field);
        if ref_eff != out_eff {
            diffs.push(format!("{field} mismatch: {ref_eff:?} vs {out_eff:?}"));
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
/// Tokens that share a `name.property` and differ only by a **single** mode set
/// key are grouped into a `color-set` or `scale-set` entry. Tokens with no
/// recognized mode set key are emitted as flat entries.
///
/// Returns `Err(CoreError::MultiModeSetToken)` if any property group has
/// tokens spread across more than one mode set (e.g. colorScheme × scale).
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
        // extract_legacy_key handles both object names (decomposed or thin) and
        // string names (SPEC-017 escape hatch).
        let Some(key) = tok.get("name").and_then(extract_legacy_key) else {
            continue;
        };
        groups.entry(key).or_default().push(tok);
    }

    let mut out = Map::new();

    for (property, tokens) in groups {
        if tokens.is_empty() {
            continue;
        }

        // Collect ALL distinct mode set keys present across this property group.
        let dim_keys = collect_mode_set_keys(&tokens);

        if dim_keys.len() > 1 {
            return Err(CoreError::MultiModeSetToken(property));
        }

        let mut entry = if let Some(dim) = dim_keys.into_iter().next() {
            let result = build_set_entry(&property, &tokens, dim, summary, global_uuid_to_name);
            summary.sets_reconstructed += 1;
            result
        } else {
            // No mode set key → flat entry (use first token, base/default variant).
            summary.flat_tokens += 1;
            build_flat_entry(tokens[0], global_uuid_to_name)
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
/// - `replaced_by: "uuid"` → `renamed: "<property-name>"` (string form, resolved via map)
/// - `replaced_by: ["uuid", ...]` → `renamed: "<property-name>"` when all elements
///   resolve to the **same** legacy name (multi-member scale/color-set pointing at one
///   logical token); left unset when they resolve to multiple distinct names (genuine
///   multi-target rename — `deprecated_comment` explains it).
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

    // replaced_by → renamed (resolve UUID(s) to property name)
    if let Some(replaced) = entry.remove("replaced_by") {
        if let Some(uuid) = replaced.as_str() {
            // Single-string form.
            if let Some(name) = uuid_to_name.get(uuid) {
                entry.insert("renamed".into(), Value::String(name.clone()));
            }
        } else if let Some(arr) = replaced.as_array() {
            // Array form: collect all distinct resolved names.
            let mut distinct: Vec<&str> = Vec::new();
            for elem in arr {
                if let Some(uuid) = elem.as_str() {
                    if let Some(name) = uuid_to_name.get(uuid) {
                        let s = name.as_str();
                        if !distinct.contains(&s) {
                            distinct.push(s);
                        }
                    }
                }
            }
            // Emit renamed only when all resolvable elements point at the same logical
            // token (e.g. two scale-set members with the same property name). Unresolvable
            // UUIDs are skipped rather than treated as ambiguous: if a replacement token is
            // absent from this conversion run the resolvable elements still identify the
            // replacement name, so emitting renamed is correct. If elements resolve to two
            // or more distinct names the mapping is genuinely ambiguous; deprecated_comment
            // explains it. An empty array (or all unresolvable) produces no renamed.
            if distinct.len() == 1 {
                entry.insert("renamed".into(), Value::String(distinct[0].to_string()));
            }
            // Multiple distinct targets or empty: no 1:1 mapping.
        }
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

    // Hoist `renamed` to the outer level when it is absent there but consistently
    // the same across all mode entries. This matches the structural convention of the
    // committed legacy files (lifecycle fields uniform across all modes belong at the
    // outer level, not inside each set entry). This can happen when the cascade source
    // stores per-mode `replaced_by` UUIDs that all resolve to the same legacy token
    // name (e.g. desktop/mobile scale members of one logical replacement token).
    if entry.get("renamed").is_none() {
        let hoist_val: Option<Value> = entry
            .get("sets")
            .and_then(|s| s.as_object())
            .filter(|sets| !sets.is_empty())
            .and_then(|sets| {
                let mut iter = sets
                    .values()
                    .filter_map(|v| v.as_object()?.get("renamed").cloned());
                let first = iter.next()?;
                if iter.all(|v| v == first) {
                    Some(first)
                } else {
                    None
                }
            });
        if let Some(val) = hoist_val {
            entry.insert("renamed".into(), val);
            // Remove from mode entries — the value is now represented at the outer level.
            if let Some(sets) = entry.get_mut("sets").and_then(|v| v.as_object_mut()) {
                for set_entry in sets.values_mut() {
                    if let Some(obj) = set_entry.as_object_mut() {
                        obj.remove("renamed");
                    }
                }
            }
        }
    }
}

/// Collect the set of recognized mode set keys present in any token in the group.
///
/// Only the known set-forming mode sets are considered (`colorScheme`, `scale`).
/// Returns a sorted set so error messages are deterministic.
fn collect_mode_set_keys(tokens: &[&Map<String, Value>]) -> BTreeSet<&'static str> {
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
    uuid_to_name: &HashMap<String, String>,
) -> Value {
    // Prefer the stored set_schema (written by migrate) so we can round-trip
    // schema types that share a mode set key (e.g. typography-scale vs scale-set).
    // Falls back to the legacy default (color-set or scale-set) for older cascade
    // files that were produced before set_schema was stored.
    let stored_set_schema =
        consistent_str_field(tokens, |t| t.get("set_schema").and_then(|v| v.as_str()));
    let set_schema = stored_set_schema.unwrap_or(if dim_key == "colorScheme" {
        COLOR_SET_SCHEMA
    } else {
        SCALE_SET_SCHEMA
    });

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
        let entry = build_mode_entry(tok, tokens, uuid_to_name);
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
    uuid_to_name: &HashMap<String, String>,
) -> Map<String, Value> {
    let mut entry = Map::new();

    if let Some(schema) = tok.get("$schema").and_then(|v| v.as_str()) {
        entry.insert("$schema".into(), Value::String(schema.to_string()));
    }

    // Value / alias denormalization.
    insert_value_or_ref(&mut entry, tok, uuid_to_name);

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

/// Build a flat legacy entry from a cascade token with no mode-set key.
fn build_flat_entry(tok: &Map<String, Value>, uuid_to_name: &HashMap<String, String>) -> Value {
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

    insert_value_or_ref(&mut entry, tok, uuid_to_name);

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

/// Denormalize `$ref: "<uuid-or-name>"` → `value: "{<name>}"`.
///
/// When `$ref` holds a UUID (cascade canonical form), looks it up in
/// `uuid_to_name` to recover the human-readable legacy slug.  If the UUID is
/// not found in the map (dangling or non-UUID `$ref`), the raw `$ref` value is
/// wrapped verbatim so the output is still syntactically valid and the
/// `roundtrip-verify` task will surface the discrepancy.
fn insert_value_or_ref(
    out: &mut Map<String, Value>,
    src: &Map<String, Value>,
    uuid_to_name: &HashMap<String, String>,
) {
    if let Some(r) = src.get("$ref").and_then(|v| v.as_str()) {
        let name = uuid_to_name.get(r).map(String::as_str).unwrap_or(r);
        out.insert("value".into(), Value::String(format!("{{{name}}}")));
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

    /// Regression for P1: multi-mode-set cascade tokens MUST error, not silently
    /// discard data. A colorScheme × scale matrix cannot be represented in legacy format.
    #[test]
    fn multi_mode_set_tokens_error_not_silently_lose_data() {
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
            "expected Err for multi-mode-set property, got Ok"
        );
        let err = result.unwrap_err().to_string();
        assert!(
            err.contains("bg"),
            "error message should name the property: {err}"
        );
    }

    /// Empty replaced_by array must produce no renamed and must not crash.
    #[test]
    fn replaced_by_empty_array_omits_renamed() {
        let arr = json!([{
            "name": {"property": "old-token"},
            "$schema": ".../alias.json",
            "value": "1px",
            "uuid": "old-uuid-empty",
            "deprecated": "unknown",
            "replaced_by": []
        }]);
        let global: HashMap<String, String> = HashMap::new();
        let mut summary = LegacySummary::default();
        let out = convert_array(arr.as_array().unwrap(), &mut summary, &global).unwrap();
        assert!(
            out["old-token"].get("renamed").is_none(),
            "empty replaced_by should not produce renamed"
        );
        assert_eq!(out["old-token"]["deprecated"], true);
    }

    /// When replaced_by contains a mix of resolvable and unresolvable UUIDs, and all
    /// resolvable ones collapse to one name, renamed is still emitted.  The unresolvable
    /// UUID is interpreted as "target may be absent from this conversion run" rather than
    /// "unknown second target" — see the comment in normalize_lifecycle_for_legacy.
    #[test]
    fn replaced_by_array_partial_resolution_emits_renamed() {
        let arr = json!([
            {
                "name": {"property": "old-token"},
                "$schema": ".../alias.json",
                "$ref": "known-uuid-0001",
                "uuid": "old-partial-uuid",
                "deprecated": "unknown",
                "replaced_by": ["known-uuid-0001", "no-such-uuid-xyz"]
            },
            {
                "name": {"property": "new-token"},
                "$schema": ".../alias.json",
                "value": "1px",
                "uuid": "known-uuid-0001"
            }
        ]);
        let mut global: HashMap<String, String> = HashMap::new();
        for item in arr.as_array().unwrap() {
            let tok = item.as_object().unwrap();
            if let Some(key) = tok.get("name").and_then(extract_legacy_key) {
                if let Some(uuid) = tok.get("uuid").and_then(|v| v.as_str()) {
                    global.insert(uuid.to_string(), key);
                }
            }
        }
        let mut summary = LegacySummary::default();
        let out = convert_array(arr.as_array().unwrap(), &mut summary, &global).unwrap();
        assert_eq!(
            out["old-token"].get("renamed").and_then(|v| v.as_str()),
            Some("new-token"),
            "one resolvable + one unresolvable UUID should emit renamed from the resolved element"
        );
    }

    /// Per-mode replaced_by strings (different UUID per scale member, both resolving to
    /// the same property name) must produce renamed hoisted to the outer set level.
    #[test]
    fn per_mode_replaced_by_string_hoisted_to_outer() {
        let arr = json!([
            // old-width scale-set: each mode member replaced by the corresponding member
            // of new-width.  The two target UUIDs differ but share the same property name.
            {
                "name": {"property": "old-width", "scale": "desktop"},
                "$schema": ".../alias.json",
                "$ref": "new-desktop-uuid-0001",
                "uuid": "old-desktop-uuid-0001",
                "set_uuid": "old-set-uuid-0001",
                "set_schema": ".../scale-set.json",
                "deprecated": "unknown",
                "replaced_by": "new-desktop-uuid-0001"
            },
            {
                "name": {"property": "old-width", "scale": "mobile"},
                "$schema": ".../alias.json",
                "$ref": "new-mobile-uuid-0001",
                "uuid": "old-mobile-uuid-0001",
                "set_uuid": "old-set-uuid-0001",
                "set_schema": ".../scale-set.json",
                "deprecated": "unknown",
                "replaced_by": "new-mobile-uuid-0001"
            },
            {
                "name": {"property": "new-width", "scale": "desktop"},
                "$schema": ".../alias.json",
                "value": "240px",
                "uuid": "new-desktop-uuid-0001"
            },
            {
                "name": {"property": "new-width", "scale": "mobile"},
                "$schema": ".../alias.json",
                "value": "288px",
                "uuid": "new-mobile-uuid-0001"
            }
        ]);
        let mut global: HashMap<String, String> = HashMap::new();
        for item in arr.as_array().unwrap() {
            let tok = item.as_object().unwrap();
            if let Some(key) = tok.get("name").and_then(extract_legacy_key) {
                if let Some(uuid) = tok.get("uuid").and_then(|v| v.as_str()) {
                    global.insert(uuid.to_string(), key.clone());
                }
                if let Some(set_uuid) = tok.get("set_uuid").and_then(|v| v.as_str()) {
                    global.insert(set_uuid.to_string(), key);
                }
            }
        }
        let mut summary = LegacySummary::default();
        let out = convert_array(arr.as_array().unwrap(), &mut summary, &global).unwrap();
        let old = out["old-width"].as_object().unwrap();
        assert_eq!(
            old.get("renamed").and_then(|v| v.as_str()),
            Some("new-width"),
            "renamed should be hoisted to outer set level"
        );
        assert_eq!(old["deprecated"], true);
        let sets = old["sets"].as_object().unwrap();
        assert!(
            sets["desktop"]
                .as_object()
                .unwrap()
                .get("renamed")
                .is_none(),
            "renamed should be absent from sets.desktop after hoisting"
        );
        assert!(
            sets["mobile"].as_object().unwrap().get("renamed").is_none(),
            "renamed should be absent from sets.mobile after hoisting"
        );
    }

    /// Regression: array-form replaced_by where all elements resolve to the same
    /// property name (e.g. two scale-set members) must produce `renamed`.
    #[test]
    fn replaced_by_array_single_target_resolves_to_renamed() {
        let arr = json!([
            // old-token: flat alias, deprecated, replaced_by two scale-set member UUIDs.
            {
                "name": {"property": "old-width"},
                "$schema": ".../alias.json",
                "$ref": "new-desktop-uuid",
                "uuid": "old-uuid-0001",
                "deprecated": "unknown",
                "deprecated_comment": "Use new-width instead.",
                "replaced_by": ["new-desktop-uuid", "new-mobile-uuid"]
            },
            // new-width desktop: both scale members share the same property name.
            {
                "name": {"property": "new-width", "scale": "desktop"},
                "$schema": ".../alias.json",
                "value": "240px",
                "uuid": "new-desktop-uuid"
            },
            // new-width mobile.
            {
                "name": {"property": "new-width", "scale": "mobile"},
                "$schema": ".../alias.json",
                "value": "288px",
                "uuid": "new-mobile-uuid"
            }
        ]);

        let mut global: HashMap<String, String> = HashMap::new();
        for item in arr.as_array().unwrap() {
            let tok = item.as_object().unwrap();
            if let Some(key) = tok.get("name").and_then(extract_legacy_key) {
                if let Some(uuid) = tok.get("uuid").and_then(|v| v.as_str()) {
                    global.insert(uuid.to_string(), key.clone());
                }
                if let Some(set_uuid) = tok.get("set_uuid").and_then(|v| v.as_str()) {
                    global.insert(set_uuid.to_string(), key);
                }
            }
        }

        let mut summary = LegacySummary::default();
        let out = convert_array(arr.as_array().unwrap(), &mut summary, &global).unwrap();

        let old = &out["old-width"];
        assert_eq!(
            old.get("renamed").and_then(|v| v.as_str()),
            Some("new-width"),
            "array replaced_by all resolving to same name should produce renamed"
        );
        assert_eq!(old["deprecated"], true, "deprecated should be true");
    }

    /// Array-form replaced_by with two different target names must NOT emit renamed
    /// (no 1:1 legacy mapping; deprecated_comment describes the split).
    #[test]
    fn replaced_by_array_multi_target_omits_renamed() {
        let arr = json!([
            // old-token: replaced by two genuinely distinct tokens.
            {
                "name": {"property": "old-token"},
                "$schema": ".../alias.json",
                "$ref": "target-a-uuid",
                "uuid": "old-uuid-0002",
                "deprecated": "unknown",
                "deprecated_comment": "Split into token-a and token-b.",
                "replaced_by": ["target-a-uuid", "target-b-uuid"]
            },
            {
                "name": {"property": "token-a"},
                "$schema": ".../alias.json",
                "value": "1px",
                "uuid": "target-a-uuid"
            },
            {
                "name": {"property": "token-b"},
                "$schema": ".../alias.json",
                "value": "2px",
                "uuid": "target-b-uuid"
            }
        ]);

        let mut global: HashMap<String, String> = HashMap::new();
        for item in arr.as_array().unwrap() {
            let tok = item.as_object().unwrap();
            if let Some(key) = tok.get("name").and_then(extract_legacy_key) {
                if let Some(uuid) = tok.get("uuid").and_then(|v| v.as_str()) {
                    global.insert(uuid.to_string(), key);
                }
            }
        }

        let mut summary = LegacySummary::default();
        let out = convert_array(arr.as_array().unwrap(), &mut summary, &global).unwrap();

        let old = &out["old-token"];
        assert!(
            old.get("renamed").is_none(),
            "multi-target array replaced_by should NOT produce renamed, got: {:?}",
            old.get("renamed")
        );
        assert_eq!(old["deprecated"], true, "deprecated should still be true");
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
        let src =
            std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../packages/tokens/src");
        if !src.exists() {
            return;
        }
        let diffs =
            crate::legacy::roundtrip_verify(&src).expect("roundtrip_verify should not error");
        assert!(
            diffs.is_empty(),
            "legacy roundtrip has {} difference(s):\n{:#?}",
            diffs.len(),
            diffs
        );
    }
}
