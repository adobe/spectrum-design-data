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

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde_json::Value;

use crate::discovery::discover_json_files;
use crate::CoreError;

/// Cascade layer (Foundation < Platform < Product).
///
/// Layer ordering is encoded in the discriminant so `Ord` gives correct
/// precedence: `Foundation < Platform < Product`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Default, serde::Serialize)]
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

/// One component declaration (spec-format JSON), loaded for relational rules.
#[derive(Debug, Clone)]
pub struct ComponentRecord {
    pub name: String,
    pub file: PathBuf,
    pub raw: Value,
}

/// One mode set declaration (new spec shape), when present in a JSON file.
#[derive(Debug, Clone)]
pub struct ModeSetRecord {
    pub file: PathBuf,
    pub name: String,
    pub modes: Vec<String>,
    pub default_mode: String,
}

/// One token entry (legacy file key, cascade array element, or test fixture id).
#[derive(Debug, Clone)]
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
    /// Secondary index: UUID value → primary key in `tokens`.
    ///
    /// Required for cascade-format alias resolution: cascade token keys are
    /// `"<file>:<index>"` (guaranteed unique) rather than UUIDs, so `$ref`
    /// targets that are plain UUID strings need this index to resolve.
    uuid_index: HashMap<String, String>,
}

impl TokenGraph {
    /// Load sidecar name maps from a directory of `*.json` files.
    ///
    /// Each file is `{ "<token-slug>": { <name-object> }, … }`.  All files are
    /// merged into a single map.  Duplicate slugs across files return an error.
    fn load_sidecar_names(
        dir: &Path,
    ) -> Result<HashMap<String, Value>, CoreError> {
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
                    // Register UUID → key for alias resolution.
                    if let Some(u) = &uuid {
                        g.uuid_index.entry(u.clone()).or_insert_with(|| key.clone());
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
            uuid_index,
        }
    }

    /// Build a graph from full `TokenRecord`s, preserving each record's `layer`.
    ///
    /// Use instead of `from_pairs` when layer information must be retained
    /// (e.g. after loading a product-context overlay).
    pub fn from_records(records: Vec<TokenRecord>) -> Self {
        let mut tokens = HashMap::new();
        let mut uuid_index = HashMap::new();
        for record in records {
            if let Some(u) = &record.uuid {
                uuid_index.entry(u.clone()).or_insert_with(|| record.name.clone());
            }
            tokens.insert(record.name.clone(), record);
        }
        Self {
            tokens,
            mode_sets: Vec::new(),
            components: Vec::new(),
            uuid_index,
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

                let key = format!("product-context:{}:{}", uuid_str, idx);
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
                let uuid = tok_obj.get("uuid").and_then(|v| v.as_str()).map(str::to_string);
                let alias_target = extract_alias_target(tok_obj);
                let key = format!("product-context-ext:{}:{}", path.display(), idx);
                if let Some(u) = &uuid {
                    self.uuid_index.entry(u.clone()).or_insert_with(|| key.clone());
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

impl TokenRecord {
    /// Follow alias edges until a non-alias or missing target.
    ///
    /// For cascade tokens whose `$ref` targets a UUID, the graph key is
    /// `"file:index"` rather than the UUID itself. The `uuid_index` is checked
    /// as a fallback so UUID-based aliases resolve correctly.
    pub fn resolve_leaf<'a>(&'a self, graph: &'a TokenGraph) -> &'a TokenRecord {
        let mut current = self;
        let mut seen: Vec<&str> = vec![&self.name];
        while let Some(target_name) = &current.alias_target {
            let next = graph.tokens.get(target_name).or_else(|| {
                graph
                    .uuid_index
                    .get(target_name)
                    .and_then(|k| graph.tokens.get(k))
            });
            let Some(next) = next else {
                break;
            };
            if seen.contains(&target_name.as_str()) {
                break;
            }
            seen.push(target_name);
            current = next;
        }
        current
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use std::io::Write;
    use tempfile::tempdir;
    use serde_json::json;

    use super::*;

    fn write_json(dir: &tempfile::TempDir, filename: &str, value: serde_json::Value) {
        let path = dir.path().join(filename);
        let mut f = std::fs::File::create(&path).unwrap();
        write!(f, "{}", value).unwrap();
    }

    #[test]
    fn sidecar_merges_name_into_token_raw() {
        let tokens_dir = tempdir().unwrap();
        let names_dir = tempdir().unwrap();

        write_json(&tokens_dir, "t.json", json!({
            "blue-100": { "$schema": "https://example.com/color-set.json", "value": "#0000ff" }
        }));
        write_json(&names_dir, "t.json", json!({
            "blue-100": { "property": "color", "colorFamily": "blue", "scaleIndex": 100 }
        }));

        let g = TokenGraph::from_json_dir_with_names(tokens_dir.path(), Some(names_dir.path()))
            .unwrap();
        let token = g.tokens.get("blue-100").unwrap();
        let name = token.raw.get("name").expect("name merged from sidecar");
        assert_eq!(name["colorFamily"], "blue");
        assert_eq!(name["scaleIndex"], 100);
    }

    #[test]
    fn inline_name_wins_over_sidecar() {
        let tokens_dir = tempdir().unwrap();
        let names_dir = tempdir().unwrap();

        write_json(&tokens_dir, "t.json", json!({
            "blue-100": {
                "$schema": "https://example.com/color-set.json",
                "value": "#0000ff",
                "name": { "property": "color", "colorFamily": "inline-value" }
            }
        }));
        write_json(&names_dir, "t.json", json!({
            "blue-100": { "property": "color", "colorFamily": "sidecar-value" }
        }));

        let g = TokenGraph::from_json_dir_with_names(tokens_dir.path(), Some(names_dir.path()))
            .unwrap();
        let token = g.tokens.get("blue-100").unwrap();
        let name = token.raw.get("name").unwrap();
        assert_eq!(name["colorFamily"], "inline-value", "inline name must win over sidecar");
    }

    #[test]
    fn sidecar_unknown_slug_is_ignored() {
        let tokens_dir = tempdir().unwrap();
        let names_dir = tempdir().unwrap();

        write_json(&tokens_dir, "t.json", json!({
            "real-token": { "$schema": "https://example.com/color.json", "value": "#fff" }
        }));
        write_json(&names_dir, "t.json", json!({
            "nonexistent-token": { "property": "color", "colorFamily": "blue" }
        }));

        let g = TokenGraph::from_json_dir_with_names(tokens_dir.path(), Some(names_dir.path()))
            .unwrap();
        let token = g.tokens.get("real-token").unwrap();
        assert!(token.raw.get("name").is_none());
    }

    #[test]
    fn duplicate_sidecar_slug_returns_error() {
        let names_dir = tempdir().unwrap();
        write_json(&names_dir, "a.json", json!({
            "blue-100": { "property": "color", "colorFamily": "blue" }
        }));
        write_json(&names_dir, "b.json", json!({
            "blue-100": { "property": "color", "colorFamily": "blue" }
        }));

        let result = TokenGraph::load_sidecar_names(names_dir.path());
        assert!(result.is_err());
    }

    #[test]
    fn from_json_dir_without_names_unchanged() {
        let tokens_dir = tempdir().unwrap();
        write_json(&tokens_dir, "t.json", json!({
            "blue-100": { "$schema": "https://example.com/color-set.json", "value": "#0000ff" }
        }));

        let g = TokenGraph::from_json_dir(tokens_dir.path()).unwrap();
        let token = g.tokens.get("blue-100").unwrap();
        assert!(token.raw.get("name").is_none());
    }
}
