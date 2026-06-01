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

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

use serde_json::{Map, Value};
use uuid::Uuid;

use crate::discovery::discover_json_files;
use crate::naming;
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
    "replaced_by",
    "plannedRemoval",
    "introduced",
    "private",
    "description",
];

// ── Name resolution ───────────────────────────────────────────────────────────

/// How a cascade token's `name` field was produced during migration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NameKind {
    /// Inline `name` field was present on the legacy token (passed through verbatim).
    Inline,
    /// Name fields were enriched from a sidecar name-object file. The legacy key
    /// is kept as `property`; other sidecar fields (colorFamily, scaleIndex, etc.)
    /// are added as additional taxonomy fields.
    Sidecar,
    /// Key was decomposed into `component`, `property`, and `state` via
    /// [`naming::parse_legacy_name`], and the roundtrip check passed.
    Decomposed,
    /// Key did not decompose cleanly; `property` contains the full legacy key
    /// (thin format). These are candidates for SPEC-017 remediation once the spec
    /// taxonomy fully covers them.
    Thin,
}

/// Options for the enhanced [`convert_dir_with_options`] converter.
#[derive(Debug, Default)]
pub struct ConvertOptions {
    /// Directory containing sidecar name-object JSON files (e.g.
    /// `packages/token-names/names/`). If set, tokens without an inline `name`
    /// are enriched with taxonomy fields from the sidecar.
    pub names_dir: Option<PathBuf>,
    /// Path to a `naming-exceptions.json` file. Tokens listed there receive a
    /// `Thin` name (they are known non-roundtrippable keys).
    pub exceptions_path: Option<PathBuf>,
}

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
    /// Cascade tokens whose name came from an inline `name` field (highest fidelity).
    pub inline_names: usize,
    /// Cascade tokens enriched with sidecar taxonomy fields.
    pub sidecar_names: usize,
    /// Cascade tokens where the key was decomposed into component+property+state.
    pub decomposed_names: usize,
    /// Cascade tokens that kept the full legacy key as `property` (tech-debt / thin).
    pub thin_names: usize,
}

/// Summary statistics from an add-uuids run.
#[derive(Debug, Default)]
pub struct AddUuidsSummary {
    /// Number of files scanned.
    pub files_scanned: usize,
    /// Number of files modified (had at least one UUID added).
    pub files_modified: usize,
    /// Total number of UUIDs generated and written.
    pub uuids_added: usize,
}

// ── Name resolution helpers ───────────────────────────────────────────────────

/// Bundled name-resolution inputs threaded through the conversion pipeline.
struct NameContext<'a> {
    sidecar: &'a HashMap<String, Value>,
    forced_thin: &'a HashSet<String>,
}

/// Load sidecar name-object JSON files from `dir` into a flat slug → name map.
///
/// Each file in `dir` must be a JSON object mapping token slug → name-object value.
/// Duplicate slugs across files are overwritten (last writer wins).
fn load_sidecar_names(dir: &Path) -> Result<HashMap<String, Value>, CoreError> {
    let mut map = HashMap::new();
    for path in discover_json_files(dir)? {
        let text = std::fs::read_to_string(&path)?;
        let val: Value = serde_json::from_str(&text)?;
        if let Some(obj) = val.as_object() {
            for (slug, name_val) in obj {
                map.insert(slug.clone(), name_val.clone());
            }
        }
    }
    Ok(map)
}

/// Resolve a name value for a legacy token key.
///
/// Priority order:
/// 1. **Inline** — token already has a `name` field → pass through verbatim.
/// 2. **Sidecar** — sidecar provides taxonomy fields whose serialization roundtrips
///    to the original key (verified via [`naming::extract_legacy_key`]). The sidecar
///    name object is used as-is. Fields that don't roundtrip fall through.
/// 3. **Decomposed** — [`naming::parse_legacy_name`] + roundtrip check via
///    [`naming::roundtrips`]. Produces `{component?, property, state?}`.
/// 4. **Thin** — fallback: `{property: key, component?}`. Roundtrip-safe because
///    [`naming::extract_legacy_key`] detects the thin format and returns `property`
///    directly for group key extraction in `legacy.rs`.
fn resolve_name(
    key: &str,
    token_obj: &Map<String, Value>,
    ctx: &NameContext<'_>,
) -> (Value, NameKind) {
    // 1. Inline name — verify it roundtrips to the original key before trusting it.
    // Some inline names (e.g. icons.json) were authored for semantic clarity but omit
    // fields needed to reconstruct the legacy key (e.g. missing `state`), so their
    // extract_legacy_key result may not match. Fall through to decomposition if so.
    if let Some(existing) = token_obj.get("name") {
        if naming::extract_legacy_key(existing).as_deref() == Some(key) {
            return (existing.clone(), NameKind::Inline);
        }
        // Inline name exists but doesn't roundtrip; treat as Thin candidate below.
    }

    // 2. Sidecar — verify the sidecar name roundtrips to the original key.
    if let Some(sidecar_name) = ctx.sidecar.get(key) {
        if naming::extract_legacy_key(sidecar_name).as_deref() == Some(key) {
            return (sidecar_name.clone(), NameKind::Sidecar);
        }
        // Sidecar exists but doesn't roundtrip (e.g. typography fields not yet covered
        // by extract_legacy_key). Fall through to decomposition.
    }

    // 3. Known non-roundtrippable from naming-exceptions.json → skip to thin.
    let component_hint = token_obj.get("component").and_then(|v| v.as_str());
    if !ctx.forced_thin.contains(key) {
        // Decompose via parse_legacy_name and check roundtrip.
        if naming::roundtrips(key, component_hint) {
            let parsed = naming::parse_legacy_name(key, component_hint);
            let mut name = Map::new();
            if let Some(c) = &parsed.component {
                name.insert("component".into(), Value::String(c.clone()));
            }
            name.insert("property".into(), Value::String(parsed.property));
            if let Some(s) = &parsed.state {
                name.insert("state".into(), Value::String(s.clone()));
            }
            return (Value::Object(name), NameKind::Decomposed);
        }
    }

    // 4. Thin fallback — property = full legacy key (always roundtrip-safe).
    let mut name = Map::new();
    name.insert("property".into(), Value::String(key.to_string()));
    if let Some(c) = component_hint {
        name.insert("component".into(), Value::String(c.to_string()));
    }
    (Value::Object(name), NameKind::Thin)
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Add missing outer-level UUIDs to set tokens (color-set, scale-set) in all
/// legacy `.json` token files in `dir`. Files are modified in-place.
///
/// Set tokens that already have an outer `uuid` field are left untouched.
/// The operation is idempotent — running it twice produces no changes on the
/// second run.
pub fn add_uuids(dir: &Path) -> Result<AddUuidsSummary, CoreError> {
    let mut summary = AddUuidsSummary::default();

    for path in discover_json_files(dir)? {
        let text = std::fs::read_to_string(&path)?;
        let mut root: Value = serde_json::from_str(&text)?;

        // Only process legacy-format files (top-level objects, not cascade arrays).
        let Some(obj) = root.as_object_mut() else {
            continue;
        };

        summary.files_scanned += 1;
        let mut modified = false;

        for (_name, token) in obj.iter_mut() {
            let Some(tok) = token.as_object_mut() else {
                continue;
            };
            // Only set tokens (have a "sets" key) that are missing an outer uuid.
            if tok.contains_key("sets") && !tok.contains_key("uuid") {
                tok.insert(
                    "uuid".to_string(),
                    Value::String(Uuid::new_v4().to_string()),
                );
                summary.uuids_added += 1;
                modified = true;
            }
        }

        if modified {
            let out_text = serde_json::to_string_pretty(&root)?;
            std::fs::write(&path, out_text + "\n")?;
            summary.files_modified += 1;
        }
    }

    Ok(summary)
}

/// Convert a single legacy token JSON object map entry to cascade token(s).
///
/// Returns one token for flat entries, or N tokens for set tokens (one per mode).
/// Does not resolve `renamed` → `replaced_by` (no graph context). Use
/// `convert_dir` for full lifecycle conversion.
pub fn convert_token(name: &str, token_obj: &Map<String, Value>) -> Vec<Value> {
    let empty = HashMap::new();
    convert_token_with_context(name, token_obj, &empty)
}

/// Convert a single legacy token with access to a name→UUID map for resolving
/// `renamed` → `replaced_by`.
fn convert_token_with_context(
    name: &str,
    token_obj: &Map<String, Value>,
    name_to_uuid: &HashMap<&str, &str>,
) -> Vec<Value> {
    let schema = token_obj
        .get("$schema")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if schema.ends_with("color-set.json") {
        convert_set(
            name,
            token_obj,
            "colorScheme",
            COLOR_SET_MODE_ORDER,
            name_to_uuid,
        )
    } else if schema.ends_with("scale-set.json") || schema.ends_with("typography-scale.json") {
        convert_set(name, token_obj, "scale", SCALE_SET_MODE_ORDER, name_to_uuid)
    } else {
        vec![build_flat(name, token_obj, name_to_uuid)]
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

    // Pass 1: scan all files to build a global name → UUID map for cross-file
    // renamed → replaced_by resolution.
    let files = discover_json_files(input_dir)?;
    let mut global_name_to_uuid: HashMap<String, String> = HashMap::new();
    let mut file_contents: Vec<(std::path::PathBuf, Value)> = Vec::new();

    for input_path in &files {
        let text = std::fs::read_to_string(input_path)?;
        let value: Value = serde_json::from_str(&text)?;
        if let Some(obj) = value.as_object() {
            for (name, val) in obj {
                if let Some(tok) = val.as_object() {
                    if let Some(uuid) = tok.get("uuid").and_then(|v| v.as_str()) {
                        global_name_to_uuid.insert(name.clone(), uuid.to_string());
                    }
                }
            }
        }
        file_contents.push((input_path.clone(), value));
    }

    // Build a borrowed view for the conversion functions.
    let name_to_uuid_ref: HashMap<&str, &str> = global_name_to_uuid
        .iter()
        .map(|(k, v)| (k.as_str(), v.as_str()))
        .collect();

    // Pass 2: convert each file using the global map.
    for (input_path, value) in &file_contents {
        let Some(obj) = value.as_object() else {
            continue;
        };

        let tokens = convert_object_with_context(obj, &mut summary, &name_to_uuid_ref);
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

/// Convert all legacy token files in `input_dir` to cascade `.tokens.json` files in
/// `output_dir`, applying richer name-object resolution guided by `opts`.
///
/// When `opts.names_dir` is set, sidecar name objects are merged where they roundtrip
/// to the original key. When `opts.exceptions_path` is set, tokens listed in the
/// exceptions file skip decomposition and receive a thin name.
///
/// The [`MigrateSummary`] returned includes per-resolution-kind counts so callers can
/// measure decomposition quality (the "feasibility spike" report).
pub fn convert_dir_with_options(
    input_dir: &Path,
    output_dir: &Path,
    opts: &ConvertOptions,
) -> Result<MigrateSummary, CoreError> {
    std::fs::create_dir_all(output_dir)?;
    let mut summary = MigrateSummary::default();

    // Load sidecar names if provided.
    let sidecar: HashMap<String, Value> = match &opts.names_dir {
        Some(dir) if dir.is_dir() => load_sidecar_names(dir)?,
        _ => HashMap::new(),
    };

    // Load forced-thin set from naming-exceptions.json if provided.
    let forced_thin: HashSet<String> = match &opts.exceptions_path {
        Some(path) if path.exists() => {
            let exc = naming::NamingExceptionsFile::load(path)?;
            exc.token_set()
        }
        _ => HashSet::new(),
    };

    let name_ctx = NameContext {
        sidecar: &sidecar,
        forced_thin: &forced_thin,
    };

    // Pass 1: build cross-file name→UUID map (same as convert_dir).
    let files = discover_json_files(input_dir)?;
    let mut global_name_to_uuid: HashMap<String, String> = HashMap::new();
    let mut file_contents: Vec<(std::path::PathBuf, Value)> = Vec::new();

    for input_path in &files {
        let text = std::fs::read_to_string(input_path)?;
        let value: Value = serde_json::from_str(&text)?;
        if let Some(obj) = value.as_object() {
            for (name, val) in obj {
                if let Some(tok) = val.as_object() {
                    if let Some(uuid) = tok.get("uuid").and_then(|v| v.as_str()) {
                        global_name_to_uuid.insert(name.clone(), uuid.to_string());
                    }
                }
            }
        }
        file_contents.push((input_path.clone(), value));
    }

    let name_to_uuid_ref: HashMap<&str, &str> = global_name_to_uuid
        .iter()
        .map(|(k, v)| (k.as_str(), v.as_str()))
        .collect();

    // Pass 2: convert each file with richer name resolution.
    for (input_path, value) in &file_contents {
        let Some(obj) = value.as_object() else {
            continue;
        };

        let tokens =
            convert_object_with_opts(obj, &mut summary, &name_to_uuid_ref, &name_ctx);
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

/// Convert all entries in a legacy token file object to cascade tokens (opts path).
fn convert_object_with_opts(
    obj: &Map<String, Value>,
    summary: &mut MigrateSummary,
    name_to_uuid: &HashMap<&str, &str>,
    name_ctx: &NameContext<'_>,
) -> Vec<Value> {
    let mut out = Vec::new();
    for (name, val) in obj {
        let Some(tok_obj) = val.as_object() else {
            continue;
        };
        let schema = tok_obj
            .get("$schema")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if schema.ends_with("color-set.json") {
            let tokens =
                convert_set_with_opts(name, tok_obj, "colorScheme", COLOR_SET_MODE_ORDER, name_to_uuid, name_ctx);
            let n = tokens.len();
            if n > 0 {
                let kind = resolve_name(name, tok_obj, name_ctx).1;
                record_name_kind(kind, n, summary);
            }
            summary.set_entries_unwrapped += n;
            summary.tokens_produced += n;
            out.extend(tokens);
        } else if schema.ends_with("scale-set.json") || schema.ends_with("typography-scale.json")
        {
            let tokens =
                convert_set_with_opts(name, tok_obj, "scale", SCALE_SET_MODE_ORDER, name_to_uuid, name_ctx);
            let n = tokens.len();
            if n > 0 {
                let kind = resolve_name(name, tok_obj, name_ctx).1;
                record_name_kind(kind, n, summary);
            }
            summary.set_entries_unwrapped += n;
            summary.tokens_produced += n;
            out.extend(tokens);
        } else {
            let token = build_flat_with_opts(name, tok_obj, name_to_uuid, name_ctx, summary);
            summary.flat_tokens_converted += 1;
            summary.tokens_produced += 1;
            out.push(token);
        }
    }
    out
}

fn record_name_kind(kind: NameKind, count: usize, summary: &mut MigrateSummary) {
    match kind {
        NameKind::Inline => summary.inline_names += count,
        NameKind::Sidecar => summary.sidecar_names += count,
        NameKind::Decomposed => summary.decomposed_names += count,
        NameKind::Thin => summary.thin_names += count,
    }
}

/// Convert a set token (opts path).
fn convert_set_with_opts(
    property: &str,
    outer: &Map<String, Value>,
    dim_key: &str,
    mode_order: &[&str],
    name_to_uuid: &HashMap<&str, &str>,
    name_ctx: &NameContext<'_>,
) -> Vec<Value> {
    let sets = match outer.get("sets").and_then(|v| v.as_object()) {
        Some(s) => s,
        None => return vec![build_flat_with_opts(property, outer, name_to_uuid, name_ctx, &mut MigrateSummary::default())],
    };

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
            Some(build_set_entry_with_opts(
                property, outer, entry, dim_key, mode, name_to_uuid, name_ctx,
            ))
        })
        .collect()
}

/// Build a cascade token from a set mode entry (opts path).
fn build_set_entry_with_opts(
    property: &str,
    outer: &Map<String, Value>,
    entry: &Map<String, Value>,
    dim_key: &str,
    mode: &str,
    name_to_uuid: &HashMap<&str, &str>,
    name_ctx: &NameContext<'_>,
) -> Value {
    let mut out = Map::new();

    // Resolve the base name (taxonomy decomposition / sidecar enrichment).
    let (base_name, _kind) = resolve_name(property, outer, name_ctx);
    let name_val = match base_name {
        Value::Object(mut name_obj) => {
            // Add the mode-set dimension to the name object.
            name_obj.insert(dim_key.to_string(), Value::String(mode.to_string()));
            Value::Object(name_obj)
        }
        // String escape hatch: can't add dim_key to a string.
        // Fall back to thin object so the set structure is preserved.
        _ => {
            let mut name_obj = Map::new();
            name_obj.insert("property".into(), Value::String(property.to_string()));
            if let Some(c) = outer.get("component").and_then(|v| v.as_str()) {
                name_obj.insert("component".into(), Value::String(c.to_string()));
            }
            name_obj.insert(dim_key.to_string(), Value::String(mode.to_string()));
            Value::Object(name_obj)
        }
    };
    out.insert("name".into(), name_val);

    if let Some(schema) = entry.get("$schema").and_then(|v| v.as_str()) {
        out.insert("$schema".into(), Value::String(schema.to_string()));
    }
    insert_value_or_ref(&mut out, entry);
    if let Some(uuid) = entry.get("uuid").and_then(|v| v.as_str()) {
        out.insert("uuid".into(), Value::String(uuid.to_string()));
    }
    if let Some(set_uuid) = outer.get("uuid").and_then(|v| v.as_str()) {
        out.insert("set_uuid".into(), Value::String(set_uuid.to_string()));
    }
    if let Some(outer_schema) = outer.get("$schema").and_then(|v| v.as_str()) {
        out.insert("set_schema".into(), Value::String(outer_schema.to_string()));
    }
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
    normalize_lifecycle_for_cascade(&mut out, name_to_uuid);
    Value::Object(out)
}

/// Build a cascade token from a flat (non-set) legacy token (opts path).
fn build_flat_with_opts(
    property: &str,
    token_obj: &Map<String, Value>,
    name_to_uuid: &HashMap<&str, &str>,
    name_ctx: &NameContext<'_>,
    summary: &mut MigrateSummary,
) -> Value {
    let mut out = Map::new();

    let (name_val, kind) = resolve_name(property, token_obj, name_ctx);
    record_name_kind(kind, 1, summary);
    out.insert("name".into(), name_val);

    if let Some(schema) = token_obj.get("$schema").and_then(|v| v.as_str()) {
        if !schema.ends_with("color-set.json")
            && !schema.ends_with("scale-set.json")
            && !schema.ends_with("typography-scale.json")
        {
            out.insert("$schema".into(), Value::String(schema.to_string()));
        }
    }
    insert_value_or_ref(&mut out, token_obj);
    if let Some(uuid) = token_obj.get("uuid").and_then(|v| v.as_str()) {
        out.insert("uuid".into(), Value::String(uuid.to_string()));
    }
    for field in OUTER_LIFECYCLE_FIELDS {
        if let Some(v) = token_obj.get(*field) {
            out.insert(field.to_string(), v.clone());
        }
    }
    normalize_lifecycle_for_cascade(&mut out, name_to_uuid);
    Value::Object(out)
}

/// Convert all entries in a legacy token file object to cascade tokens.
fn convert_object_with_context(
    obj: &Map<String, Value>,
    summary: &mut MigrateSummary,
    name_to_uuid: &HashMap<&str, &str>,
) -> Vec<Value> {
    let mut out = Vec::new();
    for (name, val) in obj {
        let Some(tok_obj) = val.as_object() else {
            continue;
        };
        let schema = tok_obj
            .get("$schema")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if schema.ends_with("color-set.json")
            || schema.ends_with("scale-set.json")
            || schema.ends_with("typography-scale.json")
        {
            let tokens = convert_token_with_context(name, tok_obj, name_to_uuid);
            summary.set_entries_unwrapped += tokens.len();
            summary.tokens_produced += tokens.len();
            out.extend(tokens);
        } else {
            out.push(build_flat(name, tok_obj, name_to_uuid));
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
    name_to_uuid: &HashMap<&str, &str>,
) -> Vec<Value> {
    let sets = match outer.get("sets").and_then(|v| v.as_object()) {
        Some(s) => s,
        None => return vec![build_flat(property, outer, name_to_uuid)],
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
            Some(build_set_entry(
                property,
                outer,
                entry,
                dim_key,
                mode,
                name_to_uuid,
            ))
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
    name_to_uuid: &HashMap<&str, &str>,
) -> Value {
    let mut out = Map::new();

    // Name object: property + optional component from outer + mode set mode.
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

    // UUID from entry (mode-level).
    if let Some(uuid) = entry.get("uuid").and_then(|v| v.as_str()) {
        out.insert("uuid".into(), Value::String(uuid.to_string()));
    }

    // Carry the outer set-level UUID so legacy-output can reconstruct it.
    // Stored as `set_uuid` to distinguish it from the per-mode uuid.
    if let Some(set_uuid) = outer.get("uuid").and_then(|v| v.as_str()) {
        out.insert("set_uuid".into(), Value::String(set_uuid.to_string()));
    }

    // Carry the outer set schema so legacy-output can reconstruct the correct
    // set type (e.g. scale-set vs typography-scale).
    if let Some(outer_schema) = outer.get("$schema").and_then(|v| v.as_str()) {
        out.insert("set_schema".into(), Value::String(outer_schema.to_string()));
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

    normalize_lifecycle_for_cascade(&mut out, name_to_uuid);

    Value::Object(out)
}

/// Build a cascade token from a flat (non-set) legacy token.
fn build_flat(
    property: &str,
    token_obj: &Map<String, Value>,
    name_to_uuid: &HashMap<&str, &str>,
) -> Value {
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
        if !schema.ends_with("color-set.json")
            && !schema.ends_with("scale-set.json")
            && !schema.ends_with("typography-scale.json")
        {
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

    normalize_lifecycle_for_cascade(&mut out, name_to_uuid);

    Value::Object(out)
}

/// Convert legacy lifecycle fields to cascade model on a token map.
///
/// - `deprecated: true` → `deprecated: "unknown"` (authors should backfill)
/// - `renamed: "<name>"` → `replaced_by: "<uuid>"` (resolved via name_to_uuid map)
/// - `status` → removed (derivable in cascade model)
fn normalize_lifecycle_for_cascade(
    entry: &mut Map<String, Value>,
    name_to_uuid: &HashMap<&str, &str>,
) {
    // deprecated: boolean true → version string "unknown"
    if let Some(dep) = entry.get("deprecated") {
        if dep.as_bool() == Some(true) {
            entry.insert("deprecated".into(), Value::String("unknown".into()));
        } else if dep.as_bool() == Some(false) {
            entry.remove("deprecated");
        }
    }

    // renamed → replaced_by (resolve name to UUID via the file's token map)
    if let Some(renamed) = entry
        .remove("renamed")
        .and_then(|v| v.as_str().map(String::from))
    {
        if let Some(&uuid) = name_to_uuid.get(renamed.as_str()) {
            entry.insert("replaced_by".into(), Value::String(uuid.to_string()));
        }
        // If the target name isn't found in this file, drop silently — the
        // target may be in another file and replaced_by must be set manually.
    }

    // status → remove (derivable, not part of cascade model)
    entry.remove("status");
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
            // deprecated: true → "unknown" in cascade model
            assert_eq!(t["deprecated"], "unknown");
            assert_eq!(t["deprecated_comment"], "use new-token instead");
            // renamed is stripped (replaced_by with UUID should be set manually)
            assert!(t.get("renamed").is_none(), "renamed should be stripped");
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
        // desktop entry overrides outer deprecated=true with false → removed
        assert!(
            tokens[0].get("deprecated").is_none(),
            "deprecated: false should be stripped"
        );
        // mobile entry inherits outer deprecated=true → "unknown"
        assert_eq!(tokens[1]["deprecated"], "unknown");
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

    #[test]
    fn convert_dir_resolves_cross_file_renamed_to_replaced_by() {
        use std::fs;

        // Use a unique dir name to avoid collisions across concurrent test runs.
        let id = std::process::id();
        let tmp = std::env::temp_dir().join(format!("migrate_cross_file_test_{id}"));
        let input = tmp.join("input");
        let output = tmp.join("output");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(&input).unwrap();

        // File 1: old-token with renamed pointing to new-token (in file 2).
        fs::write(
            input.join("file1.json"),
            serde_json::to_string_pretty(&json!({
                "old-token": {
                    "$schema": ".../color.json",
                    "value": "#fff",
                    "uuid": "aaaaaaaa-0001-4000-8000-000000000001",
                    "deprecated": true,
                    "renamed": "new-token"
                }
            }))
            .unwrap(),
        )
        .unwrap();

        // File 2: new-token (the rename target).
        fs::write(
            input.join("file2.json"),
            serde_json::to_string_pretty(&json!({
                "new-token": {
                    "$schema": ".../color.json",
                    "value": "#000",
                    "uuid": "aaaaaaaa-0002-4000-8000-000000000001"
                }
            }))
            .unwrap(),
        )
        .unwrap();

        let summary = crate::migrate::convert_dir(&input, &output).unwrap();
        assert_eq!(summary.files_written, 2);

        // Read the output for file1 and verify replaced_by was resolved.
        let out1_text = fs::read_to_string(output.join("file1.tokens.json")).unwrap();
        let out1: Value = serde_json::from_str(&out1_text).unwrap();
        let token = &out1.as_array().unwrap()[0];

        assert_eq!(
            token["replaced_by"], "aaaaaaaa-0002-4000-8000-000000000001",
            "renamed should resolve to replaced_by via cross-file UUID lookup"
        );
        assert!(
            token.get("renamed").is_none(),
            "renamed should be stripped from cascade output"
        );
        assert_eq!(token["deprecated"], "unknown");

        // Cleanup.
        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn add_uuids_adds_to_set_tokens_missing_uuid() {
        use std::fs;

        let id = std::process::id();
        let tmp = std::env::temp_dir().join(format!("add_uuids_test_{id}"));
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(&tmp).unwrap();

        // Write a file with one set token missing uuid and one that already has one.
        fs::write(
            tmp.join("tokens.json"),
            serde_json::to_string_pretty(&json!({
                "no-uuid-set": {
                    "$schema": ".../color-set.json",
                    "sets": {
                        "light": { "value": "#fff", "uuid": "mode-0001" },
                        "dark":  { "value": "#000", "uuid": "mode-0002" },
                        "wireframe": { "value": "#ccc", "uuid": "mode-0003" }
                    }
                },
                "already-has-uuid": {
                    "$schema": ".../color-set.json",
                    "uuid": "existing-uuid-1111",
                    "sets": {
                        "light": { "value": "#abc", "uuid": "mode-0004" },
                        "dark":  { "value": "#def", "uuid": "mode-0005" },
                        "wireframe": { "value": "#123", "uuid": "mode-0006" }
                    }
                },
                "flat-token": {
                    "$schema": ".../color.json",
                    "value": "#fff",
                    "uuid": "flat-0001"
                }
            }))
            .unwrap(),
        )
        .unwrap();

        let summary = crate::migrate::add_uuids(&tmp).unwrap();

        assert_eq!(summary.files_scanned, 1);
        assert_eq!(summary.files_modified, 1);
        assert_eq!(
            summary.uuids_added, 1,
            "only the set token missing uuid should get one"
        );

        // Read back and verify.
        let text = fs::read_to_string(tmp.join("tokens.json")).unwrap();
        let val: serde_json::Value = serde_json::from_str(&text).unwrap();

        // no-uuid-set should now have a uuid.
        let new_uuid = val["no-uuid-set"]["uuid"]
            .as_str()
            .expect("uuid should be present");
        assert!(!new_uuid.is_empty());
        // It should look like a UUID (basic length check).
        assert_eq!(new_uuid.len(), 36, "uuid should be a standard UUID string");

        // already-has-uuid should be unchanged.
        assert_eq!(val["already-has-uuid"]["uuid"], "existing-uuid-1111");

        // flat-token should be untouched (no sets key).
        assert_eq!(val["flat-token"]["uuid"], "flat-0001");
        assert!(val["flat-token"].get("sets").is_none());

        // Cleanup.
        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn add_uuids_is_idempotent() {
        use std::fs;

        let id = std::process::id();
        let tmp = std::env::temp_dir().join(format!("add_uuids_idempotent_test_{id}"));
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(&tmp).unwrap();

        fs::write(
            tmp.join("tokens.json"),
            serde_json::to_string_pretty(&json!({
                "my-set": {
                    "$schema": ".../scale-set.json",
                    "sets": {
                        "desktop": { "value": "8px", "uuid": "mode-0001" },
                        "mobile":  { "value": "10px", "uuid": "mode-0002" }
                    }
                }
            }))
            .unwrap(),
        )
        .unwrap();

        // First run — should add 1 UUID.
        let s1 = crate::migrate::add_uuids(&tmp).unwrap();
        assert_eq!(s1.uuids_added, 1);

        // Second run — should add nothing.
        let s2 = crate::migrate::add_uuids(&tmp).unwrap();
        assert_eq!(s2.uuids_added, 0);
        assert_eq!(s2.files_modified, 0);

        // UUID written in run 1 should still be there and unchanged.
        let text = fs::read_to_string(tmp.join("tokens.json")).unwrap();
        let val: serde_json::Value = serde_json::from_str(&text).unwrap();
        let uuid_after_run1 = val["my-set"]["uuid"].as_str().unwrap().to_string();

        let _ = crate::migrate::add_uuids(&tmp).unwrap();
        let text2 = fs::read_to_string(tmp.join("tokens.json")).unwrap();
        let val2: serde_json::Value = serde_json::from_str(&text2).unwrap();
        assert_eq!(val2["my-set"]["uuid"].as_str().unwrap(), uuid_after_run1);

        let _ = fs::remove_dir_all(&tmp);
    }
}
