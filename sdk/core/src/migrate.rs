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
    /// Flat tokens that had an inline `name` field that didn't roundtrip to the legacy key;
    /// the inline name was discarded and a resolved name was substituted.
    pub inline_names_dropped: usize,
    /// Number of sidecar slug entries that were overwritten by a later file
    /// (last-writer-wins collision count from `load_sidecar_names`).
    pub sidecar_slug_overrides: usize,
    /// Alias `$ref` targets whose legacy name was not found in the UUID map.
    ///
    /// These fall back to writing the raw name string so SPEC-014 can detect
    /// the dangling ref downstream.  A non-zero count indicates source tokens
    /// that reference a target not present in the current migration run.
    pub dangling_alias_refs: usize,
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
/// Duplicate slugs across files are overwritten (last writer wins). The number of
/// slug collisions (overrides) is added to `summary.sidecar_slug_overrides`.
fn load_sidecar_names(
    dir: &Path,
    summary: &mut MigrateSummary,
) -> Result<HashMap<String, Value>, CoreError> {
    let mut map = HashMap::new();
    for path in discover_json_files(dir)? {
        let text = std::fs::read_to_string(&path)?;
        let val: Value = serde_json::from_str(&text)?;
        if let Some(obj) = val.as_object() {
            for (slug, name_val) in obj {
                if map.contains_key(slug) {
                    summary.sidecar_slug_overrides += 1;
                }
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
            return (decomposed_name_val(&parsed), NameKind::Decomposed);
        }
    }

    (thin_name_val(key, token_obj), NameKind::Thin)
}

/// Build the cascade `name` value for a successfully-decomposed [`naming::NameObject`]
/// (variant/component/property/state, in that order — mirrors the field-catalog
/// serialization order used by `naming::extract_legacy_key`'s general path).
fn decomposed_name_val(parsed: &naming::NameObject) -> Value {
    let mut name = Map::new();
    if let Some(v) = &parsed.variant {
        name.insert("variant".into(), Value::String(v.clone()));
    }
    if let Some(c) = &parsed.component {
        name.insert("component".into(), Value::String(c.clone()));
    }
    name.insert("property".into(), Value::String(parsed.property.clone()));
    if let Some(s) = &parsed.state {
        name.insert("state".into(), Value::String(s.clone()));
    }
    Value::Object(name)
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
///
/// Uses a throwaway `MigrateSummary` and `name_ctx: None` (thin path) because
/// `convert_token` / `convert_token_with_context` are single-token utilities with
/// no caller-visible summary and no name-resolution context. Full name resolution
/// and summary accumulation happen only in `convert_dir` / `convert_dir_with_options`.
fn convert_token_with_context(
    name: &str,
    token_obj: &Map<String, Value>,
    name_to_uuid: &HashMap<&str, &str>,
) -> Vec<Value> {
    let mut throwaway = MigrateSummary::default();
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
            None,
            &mut throwaway,
        )
    } else if schema.ends_with("scale-set.json") || schema.ends_with("typography-scale.json") {
        convert_set(
            name,
            token_obj,
            "scale",
            SCALE_SET_MODE_ORDER,
            name_to_uuid,
            None,
            &mut throwaway,
        )
    } else {
        vec![build_flat(
            name,
            token_obj,
            name_to_uuid,
            None,
            &mut throwaway,
        )]
    }
}

/// Convert all legacy token files in `input_dir` and write cascade `.tokens.json`
/// files to `output_dir`. Output files use the same stem as the input file
/// with a `.tokens.json` extension.
///
/// Returns a summary of the migration.
pub fn convert_dir(input_dir: &Path, output_dir: &Path) -> Result<MigrateSummary, CoreError> {
    let mut summary = MigrateSummary::default();
    convert_dir_inner(input_dir, output_dir, None, &mut summary)?;
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
    let mut summary = MigrateSummary::default();

    // Load sidecar names if provided.
    let sidecar: HashMap<String, Value> = match &opts.names_dir {
        Some(dir) if dir.is_dir() => load_sidecar_names(dir, &mut summary)?,
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

    convert_dir_inner(input_dir, output_dir, Some(&name_ctx), &mut summary)?;
    Ok(summary)
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/// Shared pass-1/pass-2 implementation for `convert_dir` and `convert_dir_with_options`.
///
/// Pass 1 scans all files to build a global name→UUID map for cross-file
/// `renamed` → `replaced_by` resolution. Pass 2 converts each file using that
/// map, optionally threading a `NameContext` for richer name resolution.
fn convert_dir_inner(
    input_dir: &Path,
    output_dir: &Path,
    name_ctx: Option<&NameContext<'_>>,
    summary: &mut MigrateSummary,
) -> Result<(), CoreError> {
    std::fs::create_dir_all(output_dir)?;

    // Pass 1: scan all files to build a global name → UUID map.
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

        let tokens = convert_object_with_context(obj, summary, &name_to_uuid_ref, name_ctx);
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

    Ok(())
}

fn record_name_kind(kind: NameKind, count: usize, summary: &mut MigrateSummary) {
    match kind {
        NameKind::Inline => summary.inline_names += count,
        NameKind::Sidecar => summary.sidecar_names += count,
        NameKind::Decomposed => summary.decomposed_names += count,
        NameKind::Thin => summary.thin_names += count,
    }
}

/// Build the thin name value: `{property: key, component?}`.
///
/// This is the safe fallback name that always roundtrips because
/// `naming::extract_legacy_key` detects the thin format and returns `property`
/// directly for group key extraction in `legacy.rs`.
fn thin_name_val(property: &str, source: &Map<String, Value>) -> Value {
    let mut name = Map::new();
    name.insert("property".into(), Value::String(property.to_string()));
    if let Some(c) = source.get("component").and_then(|v| v.as_str()) {
        name.insert("component".into(), Value::String(c.to_string()));
    }
    // Including `component` alongside the full-key `property` normally still
    // reproduces the original key (the common case: the flat `component`
    // value is a prefix of `property`'s legacy key). But if the flat
    // `component` was corrected independently of the key (e.g. an anatomy
    // sub-part token whose `component` now names its real parent rather than
    // the sub-part itself), the naive reconstruction yields a different key.
    // Pin the original key explicitly rather than silently derive a new one.
    if naming::extract_legacy_key(&Value::Object(name.clone())).as_deref() != Some(property) {
        name.insert("legacyKey".into(), Value::String(property.to_string()));
    }
    Value::Object(name)
}

/// Convert all entries in a legacy token file object to cascade tokens.
///
/// When `name_ctx` is `None`, the thin path is used (existing `build_flat` /
/// `build_set_entry` logic). When `Some`, `resolve_name` is called for richer
/// name-object resolution.
fn convert_object_with_context(
    obj: &Map<String, Value>,
    summary: &mut MigrateSummary,
    name_to_uuid: &HashMap<&str, &str>,
    name_ctx: Option<&NameContext<'_>>,
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
            let tokens = convert_set(
                name,
                tok_obj,
                "colorScheme",
                COLOR_SET_MODE_ORDER,
                name_to_uuid,
                name_ctx,
                summary,
            );
            summary.set_entries_unwrapped += tokens.len();
            summary.tokens_produced += tokens.len();
            out.extend(tokens);
        } else if schema.ends_with("scale-set.json") || schema.ends_with("typography-scale.json") {
            let tokens = convert_set(
                name,
                tok_obj,
                "scale",
                SCALE_SET_MODE_ORDER,
                name_to_uuid,
                name_ctx,
                summary,
            );
            summary.set_entries_unwrapped += tokens.len();
            summary.tokens_produced += tokens.len();
            out.extend(tokens);
        } else {
            let token = build_flat(name, tok_obj, name_to_uuid, name_ctx, summary);
            summary.flat_tokens_converted += 1;
            summary.tokens_produced += 1;
            out.push(token);
        }
    }
    out
}

/// Convert a set token (color-set or scale-set) into N cascade tokens.
///
/// When `name_ctx` is `Some`, `resolve_name` is called ONCE here to get the
/// pre-resolved `base_name`, which is passed to `build_set_entry` for all N
/// modes. The kind is recorded once for all N modes with `record_name_kind`
/// to avoid double-counting. When `name_ctx` is `None`, the thin path is used.
fn convert_set(
    property: &str,
    outer: &Map<String, Value>,
    dim_key: &str,
    mode_order: &[&str],
    name_to_uuid: &HashMap<&str, &str>,
    name_ctx: Option<&NameContext<'_>>,
    summary: &mut MigrateSummary,
) -> Vec<Value> {
    let sets = match outer.get("sets").and_then(|v| v.as_object()) {
        Some(s) => s,
        None => return vec![build_flat(property, outer, name_to_uuid, name_ctx, summary)],
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

    // Resolve the base name ONCE (avoids double-counting per mode).
    let (base_name, kind) = if let Some(ctx) = name_ctx {
        resolve_name(property, outer, ctx)
    } else {
        (thin_name_val(property, outer), NameKind::Thin)
    };

    // Record the kind once for all N modes (not once per mode).
    if !modes.is_empty() && name_ctx.is_some() {
        record_name_kind(kind, modes.len(), summary);
    }

    modes
        .iter()
        .filter_map(|mode| {
            let entry = sets.get(*mode)?.as_object()?;
            Some(build_set_entry(
                outer,
                entry,
                dim_key,
                mode,
                name_to_uuid,
                &base_name,
                &mut summary.dangling_alias_refs,
            ))
        })
        .collect()
}

/// Build a cascade token from a set mode entry.
///
/// Accepts a pre-resolved `base_name` (computed once by `convert_set`) to
/// avoid redundant `resolve_name` calls and prevent double-counting.
fn build_set_entry(
    outer: &Map<String, Value>,
    entry: &Map<String, Value>,
    dim_key: &str,
    mode: &str,
    name_to_uuid: &HashMap<&str, &str>,
    base_name: &Value,
    dangling: &mut usize,
) -> Value {
    let mut out = Map::new();

    // Add the mode-set dimension to the pre-resolved name object.
    let name_val = match base_name {
        Value::Object(name_obj) => {
            let mut name_obj = name_obj.clone();
            name_obj.insert(dim_key.to_string(), Value::String(mode.to_string()));
            Value::Object(name_obj)
        }
        // String-valued base_name: produced when the sidecar carries a
        // SPEC-017 string-name escape-hatch value rather than an object.
        // Reconstruct a thin name object so the mode dimension can still
        // be attached and the set structure is preserved.
        _ => {
            let property = base_name.as_str().unwrap_or("");
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

    // Schema URL from entry (value-type schema, not the set wrapper).
    if let Some(schema) = entry.get("$schema").and_then(|v| v.as_str()) {
        out.insert("$schema".into(), Value::String(schema.to_string()));
    }

    // Value or alias (UUID-keyed $ref for aliases).
    insert_value_or_ref(&mut out, entry, name_to_uuid, dangling);

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
///
/// When `name_ctx` is `None`, uses thin name construction (existing behavior).
/// When `Some`, calls `resolve_name` and records the kind in `summary`.
/// If the token had an inline `name` that didn't roundtrip, increments
/// `summary.inline_names_dropped`.
fn build_flat(
    property: &str,
    token_obj: &Map<String, Value>,
    name_to_uuid: &HashMap<&str, &str>,
    name_ctx: Option<&NameContext<'_>>,
    summary: &mut MigrateSummary,
) -> Value {
    let mut out = Map::new();

    let name_val = if let Some(ctx) = name_ctx {
        // Track whether an inline name existed but didn't roundtrip.
        let had_inline = token_obj.get("name").is_some();
        let (resolved, kind) = resolve_name(property, token_obj, ctx);
        // If the token had an inline name but resolve_name fell through (kind != Inline),
        // the inline name was discarded.
        if had_inline && kind != NameKind::Inline {
            summary.inline_names_dropped += 1;
        }
        record_name_kind(kind, 1, summary);
        resolved
    } else {
        // No sidecar/exceptions context — still attempt decomposition, since
        // parse_legacy_name/roundtrips only need the key and the token's own
        // `component` metadata. Falls back to thin if it doesn't roundtrip.
        let component_hint = token_obj.get("component").and_then(|v| v.as_str());
        if naming::roundtrips(property, component_hint) {
            decomposed_name_val(&naming::parse_legacy_name(property, component_hint))
        } else {
            thin_name_val(property, token_obj)
        }
    };
    out.insert("name".into(), name_val);

    // Schema URL (value-type, not a set schema).
    if let Some(schema) = token_obj.get("$schema").and_then(|v| v.as_str()) {
        if !schema.ends_with("color-set.json")
            && !schema.ends_with("scale-set.json")
            && !schema.ends_with("typography-scale.json")
        {
            out.insert("$schema".into(), Value::String(schema.to_string()));
        }
    }

    // Value or alias (UUID-keyed $ref for aliases).
    insert_value_or_ref(
        &mut out,
        token_obj,
        name_to_uuid,
        &mut summary.dangling_alias_refs,
    );

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
/// Alias syntax `value: "{token-name}"` is normalized to `$ref: "<uuid>"` by
/// looking up the target name in `name_to_uuid`.  If the target name is not
/// found (dangling alias in the source), the name string is used verbatim as a
/// fallback and `dangling` is incremented — SPEC-014 will flag it downstream.
///
/// Non-alias `value` entries are copied unchanged.
fn insert_value_or_ref(
    out: &mut Map<String, Value>,
    src: &Map<String, Value>,
    name_to_uuid: &HashMap<&str, &str>,
    dangling: &mut usize,
) {
    if let Some(val) = src.get("value") {
        if let Some(s) = val.as_str() {
            if s.starts_with('{') && s.ends_with('}') && s.len() > 2 {
                let target_name = &s[1..s.len() - 1];
                let ref_value = if let Some(&uuid) = name_to_uuid.get(target_name) {
                    uuid.to_string()
                } else {
                    // Dangling alias: target not in this migration run.
                    *dangling += 1;
                    target_name.to_string()
                };
                out.insert("$ref".into(), Value::String(ref_value));
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
        // "swatch-border-color" decomposes cleanly (component prefix + property),
        // so build_flat's no-context path now resolves it via parse_legacy_name
        // rather than falling back to a thin property.
        assert_eq!(t["name"]["property"], "border-color");
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

    // ── resolve_name ──────────────────────────────────────────────────────────

    fn empty_ctx<'a>(
        sidecar: &'a HashMap<String, Value>,
        forced_thin: &'a HashSet<String>,
    ) -> NameContext<'a> {
        NameContext {
            sidecar,
            forced_thin,
        }
    }

    #[test]
    fn resolve_name_inline_roundtrips() {
        // Token already has a valid inline name that roundtrips → NameKind::Inline.
        let sidecar = HashMap::new();
        let forced = HashSet::new();
        let ctx = empty_ctx(&sidecar, &forced);
        let tok = obj(json!({
            "name": {"component": "button", "property": "background-color", "state": "hover"},
            "uuid": "0000"
        }));
        let (name, kind) = resolve_name("button-background-color-hover", &tok, &ctx);
        assert_eq!(kind, NameKind::Inline);
        assert_eq!(name["component"], "button");
        assert_eq!(name["property"], "background-color");
    }

    #[test]
    fn resolve_name_inline_dropped_when_no_roundtrip() {
        // Inline name exists but doesn't reconstruct the original key → falls through.
        let sidecar = HashMap::new();
        let forced = HashSet::new();
        let ctx = empty_ctx(&sidecar, &forced);
        let tok = obj(json!({
            // icon-color + colorFamily → color domain serialization gives wrong key
            "name": {"property": "icon-color", "colorFamily": "cinnamon", "variant": "primary"},
            "component": "icon",
            "uuid": "0000"
        }));
        let (_name, kind) = resolve_name("icon-color-cinnamon-primary-default", &tok, &ctx);
        // Should fall through to Decomposed (parse_legacy_name handles it)
        assert_ne!(kind, NameKind::Inline);
    }

    #[test]
    fn resolve_name_sidecar_used_when_roundtrips() {
        let mut sidecar = HashMap::new();
        sidecar.insert(
            "blue-100".to_string(),
            json!({"property": "color", "colorFamily": "blue", "scaleIndex": 100}),
        );
        let forced = HashSet::new();
        let ctx = empty_ctx(&sidecar, &forced);
        let tok = obj(json!({"$schema": ".../color.json", "value": "#2c2c2c", "uuid": "0000"}));
        let (name, kind) = resolve_name("blue-100", &tok, &ctx);
        assert_eq!(kind, NameKind::Sidecar);
        assert_eq!(name["colorFamily"], "blue");
        assert_eq!(name["scaleIndex"], 100);
    }

    #[test]
    fn resolve_name_decomposed_when_roundtrips() {
        let sidecar = HashMap::new();
        let forced = HashSet::new();
        let ctx = empty_ctx(&sidecar, &forced);
        let tok = obj(json!({"component": "button", "uuid": "0000"}));
        let (name, kind) = resolve_name("button-background-color-hover", &tok, &ctx);
        assert_eq!(kind, NameKind::Decomposed);
        assert_eq!(name["component"], "button");
        assert_eq!(name["property"], "background-color");
        assert_eq!(name["state"], "hover");
    }

    #[test]
    fn resolve_name_thin_for_forced_exceptions() {
        let sidecar = HashMap::new();
        let mut forced = HashSet::new();
        forced.insert("swatch-disabled-icon-border-color".to_string());
        let ctx = empty_ctx(&sidecar, &forced);
        let tok = obj(json!({"component": "swatch", "uuid": "0000"}));
        let (name, kind) = resolve_name("swatch-disabled-icon-border-color", &tok, &ctx);
        assert_eq!(kind, NameKind::Thin);
        // Thin name: full key in property.
        assert_eq!(name["property"], "swatch-disabled-icon-border-color");
        assert_eq!(name["component"], "swatch");
    }

    #[test]
    fn resolve_name_thin_when_roundtrip_fails() {
        // Key has embedded state in non-canonical position — roundtrips() = false.
        let sidecar = HashMap::new();
        let forced = HashSet::new();
        let ctx = empty_ctx(&sidecar, &forced);
        let tok = obj(json!({"component": "swatch", "uuid": "0000"}));
        let (_name, kind) = resolve_name("swatch-disabled-icon-border-color", &tok, &ctx);
        assert_eq!(kind, NameKind::Thin);
    }

    #[test]
    fn thin_name_val_omits_legacy_key_when_component_prefixes_property() {
        // Common case: `component` is a literal prefix of the full legacy key, so
        // reconstruction from {component, property} reproduces it exactly.
        let source = obj(json!({"component": "swatch", "uuid": "0000"}));
        let name = thin_name_val("swatch-disabled-icon-border-color", &source);
        assert_eq!(name["property"], "swatch-disabled-icon-border-color");
        assert_eq!(name["component"], "swatch");
        assert!(name.get("legacyKey").is_none());
    }

    #[test]
    fn thin_name_val_pins_legacy_key_when_component_does_not_prefix_property() {
        // Anatomy sub-part case: `component` names the real parent (not the
        // sub-part that literally prefixes the key), so reconstruction from
        // {component, property} would yield a different key than the original.
        let source = obj(json!({"component": "tabs", "uuid": "0000"}));
        let name = thin_name_val("tab-item-height-medium", &source);
        assert_eq!(name["property"], "tab-item-height-medium");
        assert_eq!(name["component"], "tabs");
        assert_eq!(name["legacyKey"], "tab-item-height-medium");
    }
}
