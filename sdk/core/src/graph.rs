// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! In-memory token graph for relational (Layer 2) validation.

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

use serde_json::Value;

use crate::discovery::discover_json_files;
use crate::naming::extract_legacy_key;
use crate::query;
use crate::CoreError;

/// Cascade layer (Foundation < Platform < Product).
///
/// Layer ordering is encoded in the discriminant so `Ord` gives correct
/// precedence: `Foundation < Platform < Product`.
#[derive(
    Debug,
    Clone,
    Copy,
    PartialEq,
    Eq,
    PartialOrd,
    Ord,
    Hash,
    Default,
    serde::Serialize,
    serde::Deserialize,
)]
#[serde(rename_all = "lowercase")]
pub enum Layer {
    #[default]
    Foundation = 1,
    Platform = 2,
    Product = 3,
}

impl std::str::FromStr for Layer {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "foundation" => Ok(Layer::Foundation),
            "platform" => Ok(Layer::Platform),
            "product" => Ok(Layer::Product),
            _ => Err(()),
        }
    }
}

/// One taxonomy field entry loaded from the spec fields catalog.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FieldRecord {
    pub name: String,
    pub required: bool,
    // NOTE: do NOT add skip_serializing_if here — FieldRecord is rmp-encoded in the
    // redb cache (ordinal table), and msgpack tuple lengths must match struct field
    // counts exactly. skip_serializing_if produces a 2-element tuple on None, which
    // fails to deserialize back to a 3-field struct.
    pub description: Option<String>,
}

/// One component declaration (spec-format JSON), loaded for relational rules.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ComponentRecord {
    pub name: String,
    pub file: PathBuf,
    pub raw: Value,
}

/// One guideline document (spec-format JSON from `guidelines/`), loaded for relational rules.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GuidelineRecord {
    pub name: String,
    pub file: PathBuf,
    pub raw: Value,
}

/// One mode set declaration (new spec shape), when present in a JSON file.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ModeSetRecord {
    pub file: PathBuf,
    pub name: String,
    pub modes: Vec<String>,
    pub default_mode: String,
}

/// One token entry (legacy file key, cascade array element, or test fixture id).
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TokenRecord {
    pub name: String,
    pub file: PathBuf,
    /// Position within the source file array (cascade format) for tie-breaking.
    pub index: usize,
    pub schema_url: Option<String>,
    pub uuid: Option<String>,
    /// Resolved alias target id when applicable.
    pub alias_target: Option<String>,
    pub raw: Value,
    /// Cascade layer this token belongs to.
    pub layer: Layer,
}

/// Token graph across files.
#[derive(Debug, Clone, Default)]
pub struct TokenGraph {
    pub tokens: HashMap<String, TokenRecord>,
    pub mode_sets: Vec<ModeSetRecord>,
    pub components: Vec<ComponentRecord>,
    /// Guideline documents from the spec `guidelines/` catalog.
    pub guidelines: Vec<GuidelineRecord>,
    /// Taxonomy field definitions from the spec fields catalog.
    pub fields: Vec<FieldRecord>,
    /// Platform manifest from `manifest.json` in the tokens root, if present.
    pub manifest: serde_json::Value,
    /// Secondary index: UUID value → primary key in `tokens`.
    ///
    /// Required for cascade-format alias resolution: cascade token keys are
    /// `"<file>:<index>"` (guaranteed unique) rather than UUIDs, so `$ref`
    /// targets that are UUID strings need this index to resolve.
    ///
    /// Also contains `set_uuid → first child key` as a context-free fallback
    /// (see `set_uuid_index` for the full child list used by context-aware
    /// resolution).
    uuid_index: HashMap<String, String>,
    /// Tertiary index: legacy human-readable name → primary key in `tokens`.
    ///
    /// Populated for cascade-format tokens (keyed `"<file>:<index>"`), where
    /// the graph key is not the human-readable legacy name.  Allows inline
    /// composite alias references that use `{legacy-name}` syntax to resolve
    /// against cascade tokens.  Not needed for object-format tokens, which are
    /// already keyed by their legacy slug, but harmlessly populated there too.
    legacy_name_index: HashMap<String, String>,
    /// Quaternary index: set-level UUID → all child graph keys (in insertion order).
    ///
    /// When the cascade `migrate convert` command explodes a legacy color-set or
    /// scale-set token into per-mode records, each child carries a `set_uuid`
    /// field pointing at the original set-level UUID (which is no longer any
    /// individual record's `uuid`).  Context-aware callers (e.g.
    /// [`TokenGraph::resolve_alias_in_context`]) use this index to pick the
    /// mode-appropriate child rather than always taking the first.
    ///
    /// `uuid_index` retains the `set_uuid → first child` mapping as a context-free
    /// fallback so non-context callers like `resolve_leaf` continue to terminate.
    set_uuid_index: HashMap<String, Vec<String>>,
}

impl TokenGraph {
    /// Load sidecar name maps from a directory of `*.json` files.
    ///
    /// Each file is `{ "<token-slug>": { <name-object> }, … }`.  All files are
    /// merged into a single map.  Duplicate slugs across files return an error.
    fn load_sidecar_names(dir: &Path) -> Result<HashMap<String, Value>, CoreError> {
        let mut map: HashMap<String, Value> = HashMap::new();
        for path in discover_json_files(dir)? {
            let text = std::fs::read_to_string(&path)?;
            let value: Value = serde_json::from_str(&text)?;
            let Some(obj) = value.as_object() else {
                continue;
            };
            for (slug, name_val) in obj {
                if map.contains_key(slug) {
                    return Err(CoreError::ParseError(format!(
                        "duplicate sidecar slug '{slug}' in {}",
                        dir.display()
                    )));
                }
                map.insert(slug.clone(), name_val.clone());
            }
        }
        Ok(map)
    }

    /// Convenience wrapper: equivalent to `from_json_dir_with_names(root, None)`.
    pub fn from_json_dir(root: &Path) -> Result<Self, CoreError> {
        Self::from_json_dir_with_names(root, None)
    }

    /// Load tokens plus optional spec catalog directories.
    ///
    /// Inline mode-set docs in the tokens tree are preserved; catalog mode sets
    /// are appended (not replaced).
    pub fn from_json_dir_with_catalogs(
        root: &Path,
        mode_sets_dir: Option<&Path>,
        components_dir: Option<&Path>,
    ) -> Result<Self, CoreError> {
        Self::from_json_dir_with_names_and_catalogs(root, None, mode_sets_dir, components_dir)
    }

    /// Load tokens with optional sidecar names **and** spec catalog directories.
    ///
    /// Combines [`Self::from_json_dir_with_names`] (sidecar name merge) with
    /// catalog loading: inline mode-set docs discovered in the tokens tree are
    /// preserved and catalog mode sets are appended (not replaced), matching the
    /// cache/query/resolve graph. Components are loaded from `components_dir`
    /// (replace) since `from_json_dir_with_names` never discovers components.
    ///
    /// Mode sets are not deduplicated: an inline and a catalog mode set sharing
    /// the same `name` both remain in `mode_sets` (intentional consistency with
    /// the cache/query/resolve graph). The canonical Spectrum layout keeps mode
    /// sets only in the catalog, so this overlap does not arise there.
    pub fn from_json_dir_with_names_and_catalogs(
        root: &Path,
        names_dir: Option<&Path>,
        mode_sets_dir: Option<&Path>,
        components_dir: Option<&Path>,
    ) -> Result<Self, CoreError> {
        let mut graph = Self::from_json_dir_with_names(root, names_dir)?;
        // Load manifest.json from the tokens root when present.
        let manifest_path = root.join("manifest.json");
        if manifest_path.is_file() {
            if let Ok(text) = std::fs::read_to_string(&manifest_path) {
                if let Ok(val) = serde_json::from_str(&text) {
                    graph.manifest = val;
                }
            }
        }
        if let Some(dir) = mode_sets_dir {
            if dir.is_dir() {
                graph.mode_sets.extend(Self::load_spec_mode_sets(dir)?);
            }
        }
        if let Some(dir) = components_dir {
            if dir.is_dir() {
                graph.components = Self::load_spec_components(dir)?;
            }
        }
        Ok(graph)
    }

    /// Load tokens with optional spec catalog directories including the fields catalog.
    ///
    /// Combines [`Self::from_json_dir_with_catalogs`] (mode sets + components) with
    /// optional fields loading. The manifest is always loaded from
    /// `root/manifest.json` when present, regardless of `fields_dir`.
    pub fn from_json_dir_with_all_catalogs(
        root: &Path,
        mode_sets_dir: Option<&Path>,
        components_dir: Option<&Path>,
        fields_dir: Option<&Path>,
    ) -> Result<Self, CoreError> {
        let mut graph =
            Self::from_json_dir_with_names_and_catalogs(root, None, mode_sets_dir, components_dir)?;
        if let Some(dir) = fields_dir {
            if dir.is_dir() {
                graph.fields = Self::load_spec_fields(dir)?;
            }
        }
        Ok(graph)
    }

    /// Load a graph for `root`, using the derived embedded-database cache when
    /// the `cache` feature is enabled.
    ///
    /// Drop-in replacement for [`Self::from_json_dir`]. See also
    /// [`Self::open_cached_with_index`] when the persisted query index is needed.
    pub fn open_cached(root: &Path) -> Result<Self, CoreError> {
        Self::open_cached_with_catalogs(root, None, None)
    }

    /// Load a graph with optional spec catalog directories from cache or JSON.
    pub fn open_cached_with_catalogs(
        root: &Path,
        mode_sets_dir: Option<&Path>,
        components_dir: Option<&Path>,
    ) -> Result<Self, CoreError> {
        #[cfg(feature = "cache")]
        {
            crate::cache::open_cached_with_catalogs(root, mode_sets_dir, components_dir)
        }
        #[cfg(not(feature = "cache"))]
        {
            Self::from_json_dir_with_catalogs(root, mode_sets_dir, components_dir)
        }
    }

    /// Load a graph and its query index together from cache or JSON.
    ///
    /// On a cache hit the `idx_*` multimap tables are hydrated without an
    /// in-memory rebuild. When the `cache` feature is disabled this builds the
    /// index from the JSON-loaded graph.
    pub fn open_cached_with_index(root: &Path) -> Result<(Self, query::TokenIndex), CoreError> {
        Self::open_cached_with_index_with_catalogs(root, None, None)
    }

    /// Load a graph and query index with optional spec catalog directories.
    pub fn open_cached_with_index_with_catalogs(
        root: &Path,
        mode_sets_dir: Option<&Path>,
        components_dir: Option<&Path>,
    ) -> Result<(Self, query::TokenIndex), CoreError> {
        #[cfg(feature = "cache")]
        {
            let loaded = crate::cache::open_cached_with_index_with_catalogs(
                root,
                mode_sets_dir,
                components_dir,
            )?;
            Ok((loaded.graph, loaded.index))
        }
        #[cfg(not(feature = "cache"))]
        {
            let graph = Self::from_json_dir_with_catalogs(root, mode_sets_dir, components_dir)?;
            let index = query::TokenIndex::build(&graph);
            Ok((graph, index))
        }
    }

    /// Build a graph from legacy Spectrum token sources (`*.json` token maps).
    ///
    /// Also handles cascade-format files: if the top-level JSON value is an array,
    /// each element is keyed by `"<canonical_file_path>:<array_index>"` — a key
    /// that is always unique regardless of UUID or name-object collisions. This
    /// ensures SPEC-004 (duplicate UUID) and SPEC-006 (duplicate name object)
    /// can inspect every token. UUIDs are indexed separately in `uuid_index` for
    /// alias `$ref` resolution.
    ///
    /// Pass `names_dir` to merge sidecar name objects at ingest so that relational
    /// rules (SPEC-042, SPEC-043, SPEC-018…022, cascade, diff, query) can read
    /// `record.raw["name"]` as usual.  An inline `name` in a token JSON always
    /// wins over the sidecar (forward compat during migration).  Sidecar slugs
    /// that don't match any token are silently skipped.
    pub fn from_json_dir_with_names(
        root: &Path,
        names_dir: Option<&Path>,
    ) -> Result<Self, CoreError> {
        let sidecar = match names_dir {
            Some(dir) if dir.is_dir() => Self::load_sidecar_names(dir)?,
            _ => HashMap::new(),
        };
        let mut g = TokenGraph::default();
        for path in discover_json_files(root)? {
            let text = std::fs::read_to_string(&path)?;
            let value: Value = serde_json::from_str(&text)?;

            // Cascade format: top-level array of token objects.
            if let Some(arr) = value.as_array() {
                for (idx, token_val) in arr.iter().enumerate() {
                    let Some(tok_obj) = token_val.as_object() else {
                        continue;
                    };
                    // Key is always unique: duplicate UUIDs / name objects both
                    // land in the graph so SPEC-004 and SPEC-006 can detect them.
                    let key = format!("{}:{}", path.display(), idx);
                    let schema_url = tok_obj
                        .get("$schema")
                        .and_then(|v| v.as_str())
                        .map(str::to_string);
                    let uuid = tok_obj
                        .get("uuid")
                        .and_then(|v| v.as_str())
                        .map(str::to_string);
                    let alias_target = extract_alias_target(tok_obj);
                    // Register UUID → key for cascade alias resolution.
                    if let Some(u) = &uuid {
                        g.uuid_index.entry(u.clone()).or_insert_with(|| key.clone());
                    }
                    // Register set_uuid → key so that aliases pointing at the
                    // set-level UUID (emitted by the forward migration when a
                    // legacy alias targets a color-set or scale-set token) can
                    // resolve.  `or_insert_with` keeps the first mode (stable)
                    // as a context-free fallback in uuid_index; set_uuid_index
                    // accumulates ALL children for context-aware selection.
                    if let Some(su) = tok_obj.get("set_uuid").and_then(|v| v.as_str()) {
                        g.uuid_index
                            .entry(su.to_string())
                            .or_insert_with(|| key.clone());
                        g.set_uuid_index
                            .entry(su.to_string())
                            .or_default()
                            .push(key.clone());
                    }
                    // Register legacy name → key so inline composite `{name}`
                    // refs can resolve against cascade tokens (keyed file:index).
                    if let Some(name_val) = tok_obj.get("name") {
                        if let Some(legacy_key) = extract_legacy_key(name_val) {
                            g.legacy_name_index
                                .entry(legacy_key)
                                .or_insert_with(|| key.clone());
                        }
                    }
                    g.tokens.insert(
                        key.clone(),
                        TokenRecord {
                            name: key,
                            file: path.clone(),
                            index: idx,
                            schema_url,
                            uuid,
                            alias_target,
                            raw: token_val.clone(),
                            layer: Layer::Foundation,
                        },
                    );
                }
                continue;
            }

            let Some(obj) = value.as_object() else {
                continue;
            };

            if looks_like_mode_set_doc(obj) {
                if let Some(d) = parse_mode_set(&path, obj) {
                    g.mode_sets.push(d);
                }
                continue;
            }

            if !looks_like_token_file(obj) {
                continue;
            }

            for (token_name, token_val) in obj {
                let Some(tok_obj) = token_val.as_object() else {
                    continue;
                };
                let schema_url = tok_obj
                    .get("$schema")
                    .and_then(|v| v.as_str())
                    .map(str::to_string);
                let uuid = tok_obj
                    .get("uuid")
                    .and_then(|v| v.as_str())
                    .map(str::to_string);
                let alias_target = extract_alias_target(tok_obj);
                // Merge sidecar name when token has no inline `name` field.
                let raw = if !tok_obj.contains_key("name") {
                    if let Some(name_val) = sidecar.get(token_name) {
                        let mut merged = tok_obj.clone();
                        merged.insert("name".to_string(), name_val.clone());
                        Value::Object(merged)
                    } else {
                        token_val.clone()
                    }
                } else {
                    token_val.clone()
                };
                g.tokens.insert(
                    token_name.clone(),
                    TokenRecord {
                        name: token_name.clone(),
                        file: path.clone(),
                        index: 0,
                        schema_url,
                        uuid,
                        alias_target,
                        raw,
                        layer: Layer::Foundation,
                    },
                );
            }
        }
        Ok(g)
    }

    /// Load spec-format mode set declarations from a dedicated catalog directory.
    ///
    /// Each file must be a JSON object conforming to `mode-set.schema.json`
    /// (fields: `name`, `modes`, `default`). Returns all successfully parsed
    /// declarations; silently skips files that do not match the mode set shape.
    pub fn load_spec_mode_sets(dir: &Path) -> Result<Vec<ModeSetRecord>, CoreError> {
        let mut out = Vec::new();
        for path in discover_json_files(dir)? {
            let text = std::fs::read_to_string(&path)?;
            let value: Value = serde_json::from_str(&text)?;
            if let Some(obj) = value.as_object() {
                if let Some(d) = parse_mode_set(&path, obj) {
                    out.push(d);
                }
            }
        }
        Ok(out)
    }

    /// Merge tokens for tests / conformance (global token id → record).
    pub fn from_pairs(entries: Vec<(String, PathBuf, Value)>) -> Self {
        let mut tokens = HashMap::new();
        let mut uuid_index = HashMap::new();
        let mut set_uuid_index: HashMap<String, Vec<String>> = HashMap::new();
        // `from_pairs` uses the entry name as the graph key (object-format style),
        // so no separate legacy_name_index entry is needed — tokens.get(name) works.
        let legacy_name_index = HashMap::new();
        for (name, file, raw) in entries {
            let tok_obj = raw.as_object();
            let schema_url = tok_obj
                .and_then(|o| o.get("$schema"))
                .and_then(|v| v.as_str())
                .map(str::to_string);
            let uuid = tok_obj
                .and_then(|o| o.get("uuid"))
                .and_then(|v| v.as_str())
                .map(str::to_string);
            let alias_target = tok_obj.and_then(extract_alias_target);
            if let Some(u) = &uuid {
                uuid_index.entry(u.clone()).or_insert_with(|| name.clone());
            }
            if let Some(su) = tok_obj
                .and_then(|o| o.get("set_uuid"))
                .and_then(|v| v.as_str())
            {
                uuid_index
                    .entry(su.to_string())
                    .or_insert_with(|| name.clone());
                set_uuid_index
                    .entry(su.to_string())
                    .or_default()
                    .push(name.clone());
            }
            tokens.insert(
                name.clone(),
                TokenRecord {
                    name,
                    file,
                    index: 0,
                    schema_url,
                    uuid,
                    alias_target,
                    raw,
                    layer: Layer::Foundation,
                },
            );
        }
        Self {
            tokens,
            mode_sets: Vec::new(),
            components: Vec::new(),
            guidelines: Vec::new(),
            fields: Vec::new(),
            manifest: serde_json::Value::Null,
            uuid_index,
            legacy_name_index,
            set_uuid_index,
        }
    }

    /// Build a graph from full `TokenRecord`s, preserving each record's `layer`.
    ///
    /// Use instead of `from_pairs` when layer information must be retained
    /// (e.g. after loading a product-context overlay).
    pub fn from_records(records: Vec<TokenRecord>) -> Self {
        let mut tokens = HashMap::new();
        let mut uuid_index = HashMap::new();
        let mut set_uuid_index: HashMap<String, Vec<String>> = HashMap::new();
        let mut legacy_name_index = HashMap::new();
        for record in records {
            if let Some(u) = &record.uuid {
                uuid_index
                    .entry(u.clone())
                    .or_insert_with(|| record.name.clone());
            }
            if let Some(su) = record.raw.get("set_uuid").and_then(|v| v.as_str()) {
                uuid_index
                    .entry(su.to_string())
                    .or_insert_with(|| record.name.clone());
                set_uuid_index
                    .entry(su.to_string())
                    .or_default()
                    .push(record.name.clone());
            }
            // Index by legacy name derived from the name object so that inline
            // composite refs can resolve if this was a cascade-format token.
            if let Some(name_val) = record.raw.get("name") {
                if let Some(legacy_key) = extract_legacy_key(name_val) {
                    legacy_name_index
                        .entry(legacy_key)
                        .or_insert_with(|| record.name.clone());
                }
            }
            tokens.insert(record.name.clone(), record);
        }
        Self {
            tokens,
            mode_sets: Vec::new(),
            components: Vec::new(),
            guidelines: Vec::new(),
            fields: Vec::new(),
            manifest: serde_json::Value::Null,
            uuid_index,
            legacy_name_index,
            set_uuid_index,
        }
    }

    /// Load a `product-context.json` and insert Product-layer tokens into the graph.
    ///
    /// For each override `{uuid, value}` in the document, the corresponding Foundation
    /// token is looked up by UUID; a synthetic Product-layer `TokenRecord` is created
    /// that inherits the Foundation token's `name` object but carries the override value.
    /// Net-new tokens in `extensions.tokens` are inserted directly at Product layer.
    pub fn load_product_context(&mut self, path: &Path) -> Result<(), CoreError> {
        let text = std::fs::read_to_string(path)?;
        let doc: Value = serde_json::from_str(&text)?;

        // Process overrides: each must reference an existing Foundation token by UUID.
        if let Some(overrides) = doc.get("overrides").and_then(|v| v.as_array()) {
            for (idx, entry) in overrides.iter().enumerate() {
                let Some(uuid_str) = entry.get("uuid").and_then(|v| v.as_str()) else {
                    continue;
                };
                let Some(override_value) = entry.get("value") else {
                    continue;
                };

                // Find the Foundation token's name object via uuid_index.
                // Skip overrides that reference an unknown UUID — inserting a synthetic
                // token with "name": null would silently corrupt downstream validation.
                let Some(name_obj) = self
                    .uuid_index
                    .get(uuid_str)
                    .and_then(|k| self.tokens.get(k))
                    .and_then(|t| t.raw.get("name"))
                    .cloned()
                else {
                    continue;
                };

                // Synthesize a Product-layer token with the same name object and override value.
                let mut synthetic_raw = serde_json::json!({
                    "name": name_obj,
                    "value": override_value,
                    "uuid": uuid_str,
                });
                if let Some(rationale) = entry.get("rationale") {
                    synthetic_raw["rationale"] = rationale.clone();
                }

                let key = format!("product-context:{uuid_str}:{idx}");
                self.tokens.insert(
                    key.clone(),
                    TokenRecord {
                        name: key,
                        file: path.to_path_buf(),
                        index: idx,
                        schema_url: None,
                        uuid: Some(uuid_str.to_string()),
                        alias_target: None,
                        raw: synthetic_raw,
                        layer: Layer::Product,
                    },
                );
            }
        }

        // Process extensions.tokens: insert each as a Product-layer token.
        if let Some(ext_tokens) = doc
            .get("extensions")
            .and_then(|v| v.get("tokens"))
            .and_then(|v| v.as_array())
        {
            for (idx, token_val) in ext_tokens.iter().enumerate() {
                let Some(tok_obj) = token_val.as_object() else {
                    continue;
                };
                let uuid = tok_obj
                    .get("uuid")
                    .and_then(|v| v.as_str())
                    .map(str::to_string);
                let alias_target = extract_alias_target(tok_obj);
                let key = format!("product-context-ext:{}:{}", path.display(), idx);
                if let Some(u) = &uuid {
                    self.uuid_index
                        .entry(u.clone())
                        .or_insert_with(|| key.clone());
                }
                self.tokens.insert(
                    key.clone(),
                    TokenRecord {
                        name: key,
                        file: path.to_path_buf(),
                        index: idx,
                        schema_url: None,
                        uuid,
                        alias_target,
                        raw: token_val.clone(),
                        layer: Layer::Product,
                    },
                );
            }
        }

        Ok(())
    }

    /// Apply a Layer 2 **platform manifest** to this (foundation) graph in place.
    ///
    /// Implements the Foundation → Platform cascade from `spec/manifest.md` and
    /// `spec/cascade.md`. The manifest is the platform-layer analog of the
    /// product-context overlay handled by [`Self::load_product_context`].
    ///
    /// Steps (applied in order):
    /// 1. `include` / `exclude` — filter the foundation token set using the
    ///    query grammar (`spec/query.md`). When `include` is present and
    ///    non-empty, only tokens matching at least one include query are kept;
    ///    `exclude` then removes tokens matching any exclude query. Each entry
    ///    MUST be a parseable query (SPEC-039); a parse error is surfaced as
    ///    [`CoreError::QueryParse`].
    /// 2. `overrides` — typed overrides inserted at [`Layer::Platform`]. Each
    ///    `overrides[].target` string is resolved in order: (a) when it contains
    ///    `=` or `!=`, as a query expression (may match multiple tokens); (b)
    ///    otherwise as a token UUID via the graph's UUID index; (c) otherwise as
    ///    a graph key (legacy slug or cascade `"file:index"` key). Each override
    ///    MUST preserve the target token's value JSON type
    ///    (`spec/cascade.md` type safety / SPEC-006); a type change is a
    ///    [`CoreError::ParseError`].
    /// 3. `extensions.tokens` — net-new platform tokens inserted at
    ///    [`Layer::Platform`].
    /// 4. `modeSetRestrictions` — returned so the caller can seed a
    ///    [`crate::cascade::ResolutionContext`]; restrictions are enforced at
    ///    resolution time, not by mutating the graph.
    ///
    /// The caller is responsible for Layer 1 schema validation of the manifest
    /// (see [`crate::schema::validate_manifest`]); this method assumes a
    /// structurally valid document and ignores fields it does not recognise.
    pub fn apply_platform_manifest(
        &mut self,
        manifest: &Value,
    ) -> Result<PlatformManifest, CoreError> {
        // 1. include / exclude filtering.
        if let Some(entries) = manifest.get("include").and_then(|v| v.as_array()) {
            if !entries.is_empty() {
                let mut keep: HashSet<String> = HashSet::new();
                for entry in entries {
                    let Some(s) = entry.as_str() else { continue };
                    let filter = query::parse(s)?;
                    for rec in query::filter(self, &filter) {
                        keep.insert(rec.name.clone());
                    }
                }
                self.tokens.retain(|k, _| keep.contains(k));
            }
        }
        if let Some(entries) = manifest.get("exclude").and_then(|v| v.as_array()) {
            let mut drop: HashSet<String> = HashSet::new();
            for entry in entries {
                let Some(s) = entry.as_str() else { continue };
                let filter = query::parse(s)?;
                for rec in query::filter(self, &filter) {
                    drop.insert(rec.name.clone());
                }
            }
            if !drop.is_empty() {
                self.tokens.retain(|k, _| !drop.contains(k));
            }
        }
        // Rebuild the UUID index so override/alias resolution below cannot point
        // at tokens that were just filtered out.
        self.rebuild_uuid_index();
        self.rebuild_legacy_name_index();

        // 2. overrides — typed, Platform layer, type-preserving.
        if let Some(overrides) = manifest.get("overrides").and_then(|v| v.as_array()) {
            for (idx, entry) in overrides.iter().enumerate() {
                let Some(target) = entry.get("target").and_then(|v| v.as_str()) else {
                    continue;
                };
                let matches = self.resolve_override_targets(target)?;
                for (match_idx, (name_obj, orig_value, uuid)) in matches.into_iter().enumerate() {
                    let mut synthetic = serde_json::Map::new();
                    synthetic.insert("name".to_string(), name_obj);
                    if let Some(new_value) = entry.get("value") {
                        if let Some(orig) = &orig_value {
                            if json_kind(orig) != json_kind(new_value) {
                                return Err(CoreError::ParseError(format!(
                                    "manifest overrides[{idx}] for target {target:?} changes value \
                                     type from {} to {} (violates cascade type safety)",
                                    json_kind(orig),
                                    json_kind(new_value),
                                )));
                            }
                        }
                        synthetic.insert("value".to_string(), new_value.clone());
                    } else if let Some(ref_val) = entry.get("$ref") {
                        synthetic.insert("$ref".to_string(), ref_val.clone());
                    } else {
                        continue;
                    }
                    if let Some(u) = &uuid {
                        synthetic.insert("uuid".to_string(), Value::String(u.clone()));
                    }
                    let raw = Value::Object(synthetic);
                    let alias_target = raw.as_object().and_then(extract_alias_target);
                    let key = format!("platform-override:{target}:{idx}:{match_idx}");
                    if let Some(u) = &uuid {
                        self.uuid_index
                            .entry(u.clone())
                            .or_insert_with(|| key.clone());
                    }
                    self.tokens.insert(
                        key.clone(),
                        TokenRecord {
                            name: key,
                            file: PathBuf::from("manifest.json"),
                            index: idx,
                            schema_url: None,
                            uuid,
                            alias_target,
                            raw,
                            layer: Layer::Platform,
                        },
                    );
                }
            }
        }

        // 3. extensions.tokens — net-new Platform-layer tokens.
        if let Some(ext_tokens) = manifest
            .get("extensions")
            .and_then(|v| v.get("tokens"))
            .and_then(|v| v.as_array())
        {
            for (idx, token_val) in ext_tokens.iter().enumerate() {
                let Some(tok_obj) = token_val.as_object() else {
                    continue;
                };
                let uuid = tok_obj
                    .get("uuid")
                    .and_then(|v| v.as_str())
                    .map(str::to_string);
                let schema_url = tok_obj
                    .get("$schema")
                    .and_then(|v| v.as_str())
                    .map(str::to_string);
                let alias_target = extract_alias_target(tok_obj);
                let key = format!("platform-ext:{idx}");
                if let Some(u) = &uuid {
                    self.uuid_index
                        .entry(u.clone())
                        .or_insert_with(|| key.clone());
                }
                self.tokens.insert(
                    key.clone(),
                    TokenRecord {
                        name: key,
                        file: PathBuf::from("manifest.json"),
                        index: idx,
                        schema_url,
                        uuid,
                        alias_target,
                        raw: token_val.clone(),
                        layer: Layer::Platform,
                    },
                );
            }
        }

        // 4. modeSetRestrictions — returned for the resolution context.
        let mut mode_set_restrictions: HashMap<String, Vec<String>> = HashMap::new();
        if let Some(obj) = manifest
            .get("modeSetRestrictions")
            .and_then(|v| v.as_object())
        {
            for (ms_name, restr) in obj {
                if let Some(allowed) = restr.get("allowed").and_then(|v| v.as_array()) {
                    let modes: Vec<String> = allowed
                        .iter()
                        .filter_map(|v| v.as_str().map(str::to_string))
                        .collect();
                    if !modes.is_empty() {
                        mode_set_restrictions.insert(ms_name.clone(), modes);
                    }
                }
            }
        }

        Ok(PlatformManifest {
            mode_set_restrictions,
        })
    }

    /// Resolve a manifest override `target` to the affected token name objects.
    ///
    /// Resolution order matches [`Self::apply_platform_manifest`]: query expression
    /// (when `target` contains `=` or `!=`), then UUID lookup, then graph key.
    fn resolve_override_targets(
        &self,
        target: &str,
    ) -> Result<Vec<OverrideTargetMatch>, CoreError> {
        // Query expression heuristic: UUIDs (hex+hyphens) and slugs (word chars+hyphens)
        // never contain '=', so presence of '=' unambiguously signals a query expression.
        if target.contains('=') {
            let filter = query::parse(target)?;
            return Ok(query::filter(self, &filter)
                .into_iter()
                .filter_map(|rec| {
                    rec.raw
                        .get("name")
                        .cloned()
                        .map(|name_obj| (name_obj, rec.raw.get("value").cloned(), rec.uuid.clone()))
                })
                .collect());
        }
        let record = self
            .uuid_index
            .get(target)
            .and_then(|k| self.tokens.get(k))
            .or_else(|| self.tokens.get(target));
        if let Some(rec) = record {
            if let Some(name_obj) = rec.raw.get("name").cloned() {
                return Ok(vec![(
                    name_obj,
                    rec.raw.get("value").cloned(),
                    rec.uuid.clone(),
                )]);
            }
        }
        Ok(Vec::new())
    }

    /// Rebuild `uuid_index` and `set_uuid_index` from the current `tokens` map
    /// (after filtering or cache reload).
    ///
    /// This is called whenever the token map is mutated (e.g. after loading from
    /// the redb cache, which only persists `tokens`/`mode_sets`/`fields`).
    /// Rebuilding here ensures that `set_uuid` → children mappings are restored
    /// even when the graph was not loaded fresh from JSON.
    fn rebuild_uuid_index(&mut self) {
        self.uuid_index.clear();
        self.set_uuid_index.clear();
        for (key, rec) in &self.tokens {
            if let Some(u) = &rec.uuid {
                self.uuid_index
                    .entry(u.clone())
                    .or_insert_with(|| key.clone());
            }
            if let Some(su) = rec.raw.get("set_uuid").and_then(|v| v.as_str()) {
                // First-child fallback for context-free callers (resolve_leaf, etc.).
                self.uuid_index
                    .entry(su.to_string())
                    .or_insert_with(|| key.clone());
                // Full child list for context-aware resolution.
                self.set_uuid_index
                    .entry(su.to_string())
                    .or_default()
                    .push(key.clone());
            }
        }
    }

    fn rebuild_legacy_name_index(&mut self) {
        self.legacy_name_index.clear();
        for (key, rec) in &self.tokens {
            if let Some(name_val) = rec.raw.get("name") {
                if let Some(legacy_key) = extract_legacy_key(name_val) {
                    self.legacy_name_index
                        .entry(legacy_key)
                        .or_insert_with(|| key.clone());
                }
            }
        }
    }

    /// Attach mode set records (e.g. from conformance fixtures).
    pub fn with_mode_sets(mut self, mode_sets: Vec<ModeSetRecord>) -> Self {
        self.mode_sets = mode_sets;
        self
    }

    /// Load spec-format component declarations from a catalog directory.
    ///
    /// Each file must be a JSON object with a `name` field (component identifier).
    /// Silently skips files that do not match this shape.
    pub fn load_spec_components(dir: &Path) -> Result<Vec<ComponentRecord>, CoreError> {
        let mut out = Vec::new();
        for path in discover_json_files(dir)? {
            let text = std::fs::read_to_string(&path)?;
            let value: Value = serde_json::from_str(&text)?;
            if let Some(obj) = value.as_object() {
                if let Some(name) = obj.get("name").and_then(|v| v.as_str()) {
                    out.push(ComponentRecord {
                        name: name.to_string(),
                        file: path,
                        raw: value,
                    });
                }
            }
        }
        Ok(out)
    }

    /// Attach component records loaded from a components directory.
    pub fn with_components(mut self, components: Vec<ComponentRecord>) -> Self {
        self.components = components;
        self
    }

    /// Load spec-format guideline documents from a catalog directory.
    ///
    /// Each file must be a JSON object with a `name` field (guideline slug).
    /// Silently skips files that do not match this shape (e.g. `manifest.json`).
    pub fn load_spec_guidelines(dir: &Path) -> Result<Vec<GuidelineRecord>, CoreError> {
        let mut out = Vec::new();
        for path in discover_json_files(dir)? {
            let text = std::fs::read_to_string(&path)?;
            let value: Value = serde_json::from_str(&text)?;
            if let Some(obj) = value.as_object() {
                if let Some(name) = obj.get("name").and_then(|v| v.as_str()) {
                    out.push(GuidelineRecord {
                        name: name.to_string(),
                        file: path,
                        raw: value,
                    });
                }
            }
        }
        Ok(out)
    }

    /// Attach guideline records loaded from a guidelines directory.
    pub fn with_guidelines(mut self, guidelines: Vec<GuidelineRecord>) -> Self {
        self.guidelines = guidelines;
        self
    }

    /// Load taxonomy field definitions from a spec fields catalog directory.
    ///
    /// Each JSON file is expected to have a `name` field (string), an optional
    /// `required` field (boolean, defaults to `false`), and an optional
    /// `description` field (string). Silently skips files missing a `name`.
    pub fn load_spec_fields(dir: &Path) -> Result<Vec<FieldRecord>, CoreError> {
        let mut out = Vec::new();
        for path in discover_json_files(dir)? {
            let text = std::fs::read_to_string(&path)?;
            let value: Value = serde_json::from_str(&text)?;
            if let Some(obj) = value.as_object() {
                if let Some(name) = obj.get("name").and_then(|v| v.as_str()) {
                    let required = obj
                        .get("required")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false);
                    let description = obj
                        .get("description")
                        .and_then(|v| v.as_str())
                        .filter(|s| !s.is_empty())
                        .map(str::to_string);
                    out.push(FieldRecord {
                        name: name.to_string(),
                        required,
                        description,
                    });
                }
            }
        }
        Ok(out)
    }

    /// Attach field records loaded from a fields catalog directory.
    pub fn with_fields(mut self, fields: Vec<FieldRecord>) -> Self {
        self.fields = fields;
        self
    }

    /// Find the `$schema` URL of any token whose `name.property` matches `property`.
    ///
    /// Useful when creating a new token to infer the schema URL from an existing sibling
    /// token in the same property group.  Returns `None` when `property` is empty or no
    /// matching token is found.
    pub fn infer_schema_url(&self, property: &str) -> Option<String> {
        if property.is_empty() {
            return None;
        }
        self.tokens.values().find_map(|t| {
            let prop_matches = t
                .raw
                .get("name")
                .and_then(|n| n.as_object())
                .and_then(|n| n.get("property"))
                .and_then(|v| v.as_str())
                == Some(property);
            if prop_matches {
                t.schema_url.clone()
            } else {
                None
            }
        })
    }
}

/// Outcome of [`TokenGraph::apply_platform_manifest`].
///
/// The graph itself is mutated in place (filtered set + Platform-layer override
/// and extension tokens). Mode set restrictions are returned separately because
/// they are enforced at resolution time via
/// [`crate::cascade::ResolutionContext`], not by mutating the graph.
#[derive(Debug, Clone, Default)]
pub struct PlatformManifest {
    /// Mode set name → allowed mode values declared by `modeSetRestrictions`.
    pub mode_set_restrictions: HashMap<String, Vec<String>>,
}

/// One foundation token matched by a manifest `overrides[].target` string.
type OverrideTargetMatch = (Value, Option<Value>, Option<String>);

/// The JSON "kind" of a value, used for override type-safety checks.
fn json_kind(v: &Value) -> &'static str {
    match v {
        Value::Null => "null",
        Value::Bool(_) => "boolean",
        Value::Number(_) => "number",
        Value::String(_) => "string",
        Value::Array(_) => "array",
        Value::Object(_) => "object",
    }
}

fn looks_like_token_file(obj: &serde_json::Map<String, Value>) -> bool {
    obj.values().next().is_some_and(|v| {
        v.as_object().is_some_and(|o| {
            o.contains_key("$schema") || o.contains_key("$ref") || o.contains_key("name")
        })
    })
}

fn looks_like_mode_set_doc(obj: &serde_json::Map<String, Value>) -> bool {
    obj.contains_key("modes")
        && obj.contains_key("default")
        && obj.get("name").and_then(|v| v.as_str()).is_some()
        && !obj
            .values()
            .any(|v| v.as_object().is_some_and(|o| o.contains_key("$schema")))
}

fn parse_mode_set(path: &Path, obj: &serde_json::Map<String, Value>) -> Option<ModeSetRecord> {
    let name = obj.get("name")?.as_str()?.to_string();
    let default_mode = obj.get("default")?.as_str()?.to_string();
    let modes: Vec<String> = obj
        .get("modes")?
        .as_array()?
        .iter()
        .filter_map(|v| v.as_str().map(str::to_string))
        .collect();
    Some(ModeSetRecord {
        file: path.to_path_buf(),
        name,
        modes,
        default_mode,
    })
}

/// Count the name-object fields in `raw` that match the given context map.
///
/// Used for context-aware candidate selection in [`TokenGraph::resolve_set_in_context`]
/// and `cascade::resolve_reference`: the candidate with the highest score is the
/// best fit for the requested context.
pub(crate) fn name_ctx_score(
    raw: &Value,
    ctx: &std::collections::HashMap<String, String>,
) -> usize {
    let Some(name) = raw.get("name") else {
        return 0;
    };
    ctx.iter()
        .filter(|(k, v)| {
            name.get(k.as_str())
                .and_then(|f| f.as_str())
                .is_some_and(|f| f == v.as_str())
        })
        .count()
}

pub(crate) fn extract_alias_target(obj: &serde_json::Map<String, Value>) -> Option<String> {
    if let Some(r) = obj.get("$ref").and_then(|v| v.as_str()) {
        return Some(normalize_ref_target(r));
    }
    if let Some(s) = obj.get("value").and_then(|v| v.as_str()) {
        if s.starts_with('{') && s.ends_with('}') && s.len() > 2 {
            return Some(s[1..s.len() - 1].to_string());
        }
    }
    None
}

fn normalize_ref_target(s: &str) -> String {
    let s = s.trim();
    let file_name = s.rsplit(['/', '\\']).next().unwrap_or(s);
    file_name
        .strip_suffix(".json")
        .unwrap_or(file_name)
        .to_string()
}

impl TokenGraph {
    /// Resolve an alias target string to a `TokenRecord`, trying indexes in
    /// priority order:
    ///
    /// 1. **UUID index** — cascade `$ref` stores the target's UUID (canonical).
    /// 2. **Direct graph key** — legacy object-format tokens are keyed by slug.
    /// 3. **Legacy name index** — inline composite `{name}` refs that reference
    ///    cascade tokens by their human-readable name.
    pub fn resolve_alias_key<'a>(&'a self, target: &str) -> Option<&'a TokenRecord> {
        // 1. UUID → graph key (cascade format canonical path).
        if let Some(k) = self.uuid_index.get(target) {
            if let Some(rec) = self.tokens.get(k) {
                return Some(rec);
            }
        }
        // 2. Direct lookup — object-format tokens are keyed by their legacy slug.
        if let Some(rec) = self.tokens.get(target) {
            return Some(rec);
        }
        // 3. Legacy name → graph key (inline composite refs into cascade tokens).
        if let Some(k) = self.legacy_name_index.get(target) {
            return self.tokens.get(k);
        }
        None
    }

    /// Resolve a set-level UUID to the context-appropriate child record.
    ///
    /// Picks the child from `set_uuid_index` whose name-object fields best match
    /// `ctx` (greatest count of matching key=value pairs).  Tie-breaks are stable:
    /// among equal-score children the one with the lexicographically smallest `uuid`
    /// wins, so repeated calls with the same arguments always return the same token.
    ///
    /// Returns `None` when no children are registered for `set_uuid`.
    pub fn resolve_set_in_context<'a>(
        &'a self,
        set_uuid: &str,
        ctx: &std::collections::HashMap<String, String>,
    ) -> Option<&'a TokenRecord> {
        let keys = self.set_uuid_index.get(set_uuid)?;
        let mut best_score = 0usize;
        let mut best_uuid: Option<&str> = None;
        let mut best: Option<&TokenRecord> = None;

        for key in keys {
            let Some(rec) = self.tokens.get(key) else {
                continue;
            };
            let score = name_ctx_score(&rec.raw, ctx);
            let cand_uuid = rec.uuid.as_deref().unwrap_or("");
            // Higher score wins; equal scores break on uuid lexicographic ascending.
            let is_better = match best {
                None => true,
                Some(_) => {
                    score > best_score || (score == best_score && Some(cand_uuid) < best_uuid)
                }
            };
            if is_better {
                best_score = score;
                best_uuid = Some(cand_uuid);
                best = Some(rec);
            }
        }
        best
    }

    /// Context-aware alias resolution: checks `set_uuid_index` first.
    ///
    /// When `alias_target` is a set-level UUID, returns the mode-appropriate child
    /// via [`TokenGraph::resolve_set_in_context`].  Falls back to the standard
    /// [`TokenGraph::resolve_alias_key`] path (uuid_index → direct → legacy name)
    /// for all other alias targets.
    ///
    /// Use this in chain-walking code that has an active resolution context; use
    /// `resolve_alias_key` for context-free alias resolution (e.g. `resolve_leaf`).
    pub(crate) fn resolve_alias_in_context<'a>(
        &'a self,
        alias_target: &str,
        ctx: &std::collections::HashMap<String, String>,
    ) -> Option<&'a TokenRecord> {
        if self.set_uuid_index.contains_key(alias_target) {
            return self.resolve_set_in_context(alias_target, ctx);
        }
        self.resolve_alias_key(alias_target)
    }
}

impl TokenRecord {
    /// Follow alias edges until a non-alias or missing target.
    ///
    /// Resolution priority per hop (via [`TokenGraph::resolve_alias_key`]):
    /// 1. UUID index — canonical for cascade `$ref` targets.
    /// 2. Direct graph key — legacy slug-keyed object-format tokens.
    /// 3. Legacy name index — inline composite `{name}` refs into cascade tokens.
    ///
    /// Cycle detection keys on the *resolved graph key* of each hop (not the
    /// raw alias string), so chains that mix UUID and name references to the
    /// same token are correctly detected.
    pub fn resolve_leaf<'a>(&'a self, graph: &'a TokenGraph) -> &'a TokenRecord {
        let mut current = self;
        // Seed with the starting token's graph key.
        let mut seen: Vec<&str> = vec![&self.name];
        loop {
            let Some(target_name) = current.alias_target.as_deref() else {
                break;
            };
            let Some(next) = graph.resolve_alias_key(target_name) else {
                break;
            };
            // Use the resolved graph key, not the raw alias string, so that a
            // UUID ref and a name ref to the same token are both detected.
            if seen.contains(&next.name.as_str()) {
                break;
            }
            seen.push(&next.name);
            current = next;
        }
        current
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use serde_json::json;
    use std::io::Write;
    use tempfile::tempdir;

    use super::*;

    fn write_json(dir: &tempfile::TempDir, filename: &str, value: serde_json::Value) {
        let path = dir.path().join(filename);
        let mut f = std::fs::File::create(&path).unwrap();
        write!(f, "{value}").unwrap();
    }

    #[test]
    fn sidecar_merges_name_into_token_raw() {
        let tokens_dir = tempdir().unwrap();
        let names_dir = tempdir().unwrap();

        write_json(
            &tokens_dir,
            "t.json",
            json!({
                "blue-100": { "$schema": "https://example.com/color-set.json", "value": "#0000ff" }
            }),
        );
        write_json(
            &names_dir,
            "t.json",
            json!({
                "blue-100": { "property": "color", "colorFamily": "blue", "scaleIndex": 100 }
            }),
        );

        let g = TokenGraph::from_json_dir_with_names(tokens_dir.path(), Some(names_dir.path()))
            .unwrap();
        let token = g.tokens.get("blue-100").unwrap();
        let name = token.raw.get("name").expect("name merged from sidecar");
        assert_eq!(name["colorFamily"], "blue");
        assert_eq!(name["scaleIndex"], 100);
    }

    #[test]
    fn names_and_catalogs_extends_inline_mode_sets_and_merges_sidecar() {
        let tokens_dir = tempdir().unwrap();
        let names_dir = tempdir().unwrap();
        let mode_sets_dir = tempdir().unwrap();
        let components_dir = tempdir().unwrap();

        // Token plus an inline mode-set doc co-located in the tokens tree.
        write_json(
            &tokens_dir,
            "color.json",
            json!({
                "blue-100": { "$schema": "https://example.com/color-set.json", "value": "#0000ff" }
            }),
        );
        write_json(
            &tokens_dir,
            "inline-mode-set.json",
            json!({ "name": "scale", "modes": ["desktop", "mobile"], "default": "desktop" }),
        );
        // Sidecar name for the token.
        write_json(
            &names_dir,
            "color.json",
            json!({
                "blue-100": { "property": "color", "colorFamily": "blue" }
            }),
        );
        // Catalog mode-set + component in separate dirs.
        write_json(
            &mode_sets_dir,
            "color-scheme.json",
            json!({ "name": "colorScheme", "modes": ["light", "dark"], "default": "light" }),
        );
        write_json(
            &components_dir,
            "button.json",
            json!({ "name": "button", "description": "Primary action" }),
        );

        let g = TokenGraph::from_json_dir_with_names_and_catalogs(
            tokens_dir.path(),
            Some(names_dir.path()),
            Some(mode_sets_dir.path()),
            Some(components_dir.path()),
        )
        .unwrap();

        // Inline mode set is preserved AND catalog mode set is appended (extend).
        let names: Vec<&str> = g.mode_sets.iter().map(|m| m.name.as_str()).collect();
        assert!(names.contains(&"scale"), "inline mode set must be kept");
        assert!(
            names.contains(&"colorScheme"),
            "catalog mode set must be appended"
        );
        assert_eq!(g.mode_sets.len(), 2);

        // Catalog component is loaded.
        assert_eq!(g.components.len(), 1);
        assert_eq!(g.components[0].name, "button");

        // Sidecar name merged into the token raw.
        let token = g.tokens.get("blue-100").unwrap();
        assert_eq!(token.raw["name"]["colorFamily"], "blue");
    }

    #[test]
    fn inline_name_wins_over_sidecar() {
        let tokens_dir = tempdir().unwrap();
        let names_dir = tempdir().unwrap();

        write_json(
            &tokens_dir,
            "t.json",
            json!({
                "blue-100": {
                    "$schema": "https://example.com/color-set.json",
                    "value": "#0000ff",
                    "name": { "property": "color", "colorFamily": "inline-value" }
                }
            }),
        );
        write_json(
            &names_dir,
            "t.json",
            json!({
                "blue-100": { "property": "color", "colorFamily": "sidecar-value" }
            }),
        );

        let g = TokenGraph::from_json_dir_with_names(tokens_dir.path(), Some(names_dir.path()))
            .unwrap();
        let token = g.tokens.get("blue-100").unwrap();
        let name = token.raw.get("name").unwrap();
        assert_eq!(
            name["colorFamily"], "inline-value",
            "inline name must win over sidecar"
        );
    }

    #[test]
    fn sidecar_unknown_slug_is_ignored() {
        let tokens_dir = tempdir().unwrap();
        let names_dir = tempdir().unwrap();

        write_json(
            &tokens_dir,
            "t.json",
            json!({
                "real-token": { "$schema": "https://example.com/color.json", "value": "#fff" }
            }),
        );
        write_json(
            &names_dir,
            "t.json",
            json!({
                "nonexistent-token": { "property": "color", "colorFamily": "blue" }
            }),
        );

        let g = TokenGraph::from_json_dir_with_names(tokens_dir.path(), Some(names_dir.path()))
            .unwrap();
        let token = g.tokens.get("real-token").unwrap();
        assert!(token.raw.get("name").is_none());
    }

    #[test]
    fn duplicate_sidecar_slug_returns_error() {
        let names_dir = tempdir().unwrap();
        write_json(
            &names_dir,
            "a.json",
            json!({
                "blue-100": { "property": "color", "colorFamily": "blue" }
            }),
        );
        write_json(
            &names_dir,
            "b.json",
            json!({
                "blue-100": { "property": "color", "colorFamily": "blue" }
            }),
        );

        let result = TokenGraph::load_sidecar_names(names_dir.path());
        assert!(result.is_err());
    }

    #[test]
    fn from_json_dir_without_names_unchanged() {
        let tokens_dir = tempdir().unwrap();
        write_json(
            &tokens_dir,
            "t.json",
            json!({
                "blue-100": { "$schema": "https://example.com/color-set.json", "value": "#0000ff" }
            }),
        );

        let g = TokenGraph::from_json_dir(tokens_dir.path()).unwrap();
        let token = g.tokens.get("blue-100").unwrap();
        assert!(token.raw.get("name").is_none());
    }

    // ── apply_platform_manifest (Foundation→Platform cascade) ──────────────────

    /// Build a small foundation graph for manifest cascade tests.
    fn foundation_graph() -> TokenGraph {
        TokenGraph::from_pairs(vec![
            (
                "btn-bg".into(),
                PathBuf::from("button.json"),
                json!({"name": {"property": "background-color", "component": "button"}, "value": "#aaa", "uuid": "u-btn-bg"}),
            ),
            (
                "btn-fg".into(),
                PathBuf::from("button.json"),
                json!({"name": {"property": "color", "component": "button"}, "value": "#111", "uuid": "u-btn-fg"}),
            ),
            (
                "chk-bg".into(),
                PathBuf::from("checkbox.json"),
                json!({"name": {"property": "background-color", "component": "checkbox"}, "value": "#bbb", "uuid": "u-chk-bg"}),
            ),
        ])
    }

    #[test]
    fn manifest_include_filters_to_matching_tokens() {
        let mut g = foundation_graph();
        let manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "include": ["component=button"]
        });
        g.apply_platform_manifest(&manifest).unwrap();
        assert_eq!(g.tokens.len(), 2);
        assert!(g.tokens.contains_key("btn-bg"));
        assert!(g.tokens.contains_key("btn-fg"));
        assert!(!g.tokens.contains_key("chk-bg"));
    }

    #[test]
    fn manifest_exclude_removes_matching_tokens() {
        let mut g = foundation_graph();
        let manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "exclude": ["property=color"]
        });
        g.apply_platform_manifest(&manifest).unwrap();
        assert!(!g.tokens.contains_key("btn-fg"));
        assert_eq!(g.tokens.len(), 2);
    }

    #[test]
    fn manifest_include_then_exclude_compose() {
        let mut g = foundation_graph();
        let manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "include": ["component=button"],
            "exclude": ["property=color"]
        });
        g.apply_platform_manifest(&manifest).unwrap();
        assert_eq!(g.tokens.len(), 1);
        assert!(g.tokens.contains_key("btn-bg"));
    }

    #[test]
    fn manifest_unparseable_query_errors() {
        let mut g = foundation_graph();
        let manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "include": ["not-a-valid-query"]
        });
        assert!(matches!(
            g.apply_platform_manifest(&manifest),
            Err(CoreError::QueryParse(_))
        ));
    }

    #[test]
    fn manifest_override_by_uuid_adds_platform_token() {
        let mut g = foundation_graph();
        let manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "overrides": [{"target": "u-btn-bg", "value": "#ffffff"}]
        });
        g.apply_platform_manifest(&manifest).unwrap();
        let overridden = g
            .tokens
            .values()
            .find(|t| t.layer == Layer::Platform && t.uuid.as_deref() == Some("u-btn-bg"))
            .expect("platform override token present");
        assert_eq!(
            overridden.raw.get("value").and_then(|v| v.as_str()),
            Some("#ffffff")
        );
        // Name object is inherited from the foundation token.
        assert_eq!(overridden.raw["name"]["component"].as_str(), Some("button"));
    }

    #[test]
    fn manifest_override_by_query_targets_all_matches() {
        let mut g = foundation_graph();
        let manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "overrides": [{"target": "property=background-color", "value": "#000000"}]
        });
        g.apply_platform_manifest(&manifest).unwrap();
        let platform_overrides = g
            .tokens
            .values()
            .filter(|t| t.layer == Layer::Platform)
            .count();
        assert_eq!(platform_overrides, 2); // btn-bg + chk-bg
    }

    #[test]
    fn manifest_override_type_change_errors() {
        let mut g = foundation_graph();
        // btn-bg value is a string; overriding with a number violates type safety.
        let manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "overrides": [{"target": "u-btn-bg", "value": 42}]
        });
        assert!(matches!(
            g.apply_platform_manifest(&manifest),
            Err(CoreError::ParseError(_))
        ));
    }

    #[test]
    fn manifest_extensions_add_platform_tokens() {
        let mut g = foundation_graph();
        let manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "extensions": {
                "tokens": [
                    {"name": {"property": "elevation", "component": "card"}, "value": "4dp", "uuid": "u-card-elev"}
                ]
            }
        });
        g.apply_platform_manifest(&manifest).unwrap();
        let ext = g
            .tokens
            .values()
            .find(|t| t.uuid.as_deref() == Some("u-card-elev"))
            .expect("extension token present");
        assert_eq!(ext.layer, Layer::Platform);
    }

    #[test]
    fn manifest_mode_set_restrictions_returned() {
        let mut g = foundation_graph();
        let manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "modeSetRestrictions": {
                "colorScheme": {"allowed": ["light", "dark"]}
            }
        });
        let outcome = g.apply_platform_manifest(&manifest).unwrap();
        assert_eq!(
            outcome.mode_set_restrictions.get("colorScheme"),
            Some(&vec!["light".to_string(), "dark".to_string()])
        );
    }

    #[test]
    fn manifest_empty_is_noop() {
        let mut g = foundation_graph();
        let before = g.tokens.len();
        let manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0"
        });
        let outcome = g.apply_platform_manifest(&manifest).unwrap();
        assert_eq!(g.tokens.len(), before);
        assert!(outcome.mode_set_restrictions.is_empty());
    }

    // ── resolve_alias_key / resolve_leaf (UUID-first, cycle guard) ────────────

    /// Helper: build a cascade-format graph from an array of token objects.
    ///
    /// Uses a temp file so cascade-format ingest (keyed file:index) is exercised.
    fn cascade_graph_from(tokens: serde_json::Value) -> TokenGraph {
        use std::io::Write;
        let dir = tempdir().unwrap();
        let path = dir.path().join("tokens.json");
        let mut f = std::fs::File::create(&path).unwrap();
        write!(f, "{tokens}").unwrap();
        // Keep `dir` alive until graph is loaded.
        let g = TokenGraph::from_json_dir(dir.path()).unwrap();
        g
    }

    #[test]
    fn resolve_alias_key_uuid_first() {
        // Two tokens: a leaf (palette value) and an alias pointing to it by UUID.
        let uuid = "aaaaaaaa-0000-0000-0000-000000000001";
        let g = cascade_graph_from(json!([
            {
                "name": { "property": "color", "colorFamily": "blue", "scaleIndex": 100 },
                "$schema": "https://example.com/color.json",
                "value": "rgb(0,0,255)",
                "uuid": uuid
            },
            {
                "name": { "property": "accent-background-color", "state": "default" },
                "$schema": "https://example.com/alias.json",
                "$ref": uuid,
                "uuid": "aaaaaaaa-0000-0000-0000-000000000002"
            }
        ]));

        // resolve_alias_key by UUID must find the leaf.
        let leaf = g.resolve_alias_key(uuid).expect("UUID lookup must succeed");
        assert_eq!(leaf.raw["value"], "rgb(0,0,255)");

        // resolve_leaf on the alias must traverse to the value token.
        let alias_key = g
            .tokens
            .iter()
            .find(|(_, r)| r.alias_target.is_some())
            .map(|(k, _)| k.clone())
            .unwrap();
        let alias_rec = g.tokens.get(&alias_key).unwrap();
        let resolved = alias_rec.resolve_leaf(&g);
        assert_eq!(resolved.raw["value"], "rgb(0,0,255)");
    }

    #[test]
    fn legacy_name_index_resolves_cascade_token_by_name() {
        // Cascade tokens are keyed file:index. resolve_alias_key must still find
        // them when given their human-readable legacy name.
        let g = cascade_graph_from(json!([
            {
                "name": { "property": "color", "colorFamily": "blue", "scaleIndex": 100 },
                "$schema": "https://example.com/color.json",
                "value": "rgb(0,0,255)",
                "uuid": "bbbbbbbb-0000-0000-0000-000000000001"
            }
        ]));

        // "blue-100" is the serialized legacy name for this token.
        let rec = g
            .resolve_alias_key("blue-100")
            .expect("legacy name lookup must succeed");
        assert_eq!(rec.raw["value"], "rgb(0,0,255)");
    }

    #[test]
    fn dangling_uuid_ref_returns_self_without_panic() {
        // An alias whose $ref UUID has no matching token must break the chain
        // and return self (same behaviour as today for dangling name refs).
        let g = cascade_graph_from(json!([
            {
                "name": { "property": "accent-background-color", "state": "default" },
                "$schema": "https://example.com/alias.json",
                "$ref": "00000000-dead-beef-0000-000000000000",
                "uuid": "cccccccc-0000-0000-0000-000000000001"
            }
        ]));

        let alias_key = g.tokens.keys().next().unwrap().clone();
        let rec = g.tokens.get(&alias_key).unwrap();
        // Must return self, not panic.
        let resolved = rec.resolve_leaf(&g);
        assert_eq!(
            resolved.name, rec.name,
            "dangling UUID ref must return self"
        );
    }

    #[test]
    fn cycle_guard_detects_mixed_uuid_and_name_chain() {
        // Craft a two-token cycle where A refs B by UUID and B refs A by legacy
        // slug, exercising the "key on resolved graph key" fix.
        let uuid_a = "dddddddd-0000-0000-0000-000000000001";
        let uuid_b = "dddddddd-0000-0000-0000-000000000002";

        // Use object-format for B so it's keyed by slug (enabling name ref from A).
        let tokens_dir = tempdir().unwrap();
        // Token A: cascade format, refs B by UUID.
        let cascade_path = tokens_dir.path().join("a.json");
        std::fs::write(
            &cascade_path,
            serde_json::to_string(&json!([
                {
                    "name": { "property": "accent-background-color", "state": "default" },
                    "$schema": "https://example.com/alias.json",
                    "$ref": uuid_b,
                    "uuid": uuid_a
                }
            ]))
            .unwrap(),
        )
        .unwrap();
        // Token B: object format (keyed by slug), refs A by legacy name.
        let obj_path = tokens_dir.path().join("b.json");
        std::fs::write(
            &obj_path,
            serde_json::to_string(&json!({
                "accent-color-800": {
                    "$schema": "https://example.com/alias.json",
                    "$ref": "accent-background-color-default",
                    "uuid": uuid_b
                }
            }))
            .unwrap(),
        )
        .unwrap();

        let g = TokenGraph::from_json_dir(tokens_dir.path()).unwrap();

        // Resolving from either token must terminate (not loop forever).
        let rec_a = g.resolve_alias_key(uuid_a).unwrap();
        let result_a = rec_a.resolve_leaf(&g);
        // Result is one of the two tokens; the important thing is it terminates.
        assert!(
            result_a.uuid.as_deref() == Some(uuid_a) || result_a.uuid.as_deref() == Some(uuid_b),
            "cycle must terminate, got {:?}",
            result_a.uuid
        );
    }
}
