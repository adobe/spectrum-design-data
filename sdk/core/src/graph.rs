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

/// One dimension declaration (new spec shape), when present in a JSON file.
#[derive(Debug, Clone)]
pub struct DimensionRecord {
    pub file: PathBuf,
    pub name: String,
    pub modes: Vec<String>,
    pub default_mode: String,
}

/// One token entry (legacy file key or test fixture id).
#[derive(Debug, Clone)]
pub struct TokenRecord {
    pub name: String,
    pub file: PathBuf,
    pub schema_url: Option<String>,
    pub uuid: Option<String>,
    /// Resolved alias target id when applicable.
    pub alias_target: Option<String>,
    pub raw: Value,
}

/// Token graph across files.
#[derive(Debug, Clone, Default)]
pub struct TokenGraph {
    pub tokens: HashMap<String, TokenRecord>,
    pub dimensions: Vec<DimensionRecord>,
}

impl TokenGraph {
    /// Build a graph from legacy Spectrum token sources (`*.json` token maps).
    pub fn from_json_dir(root: &Path) -> Result<Self, CoreError> {
        let mut g = TokenGraph::default();
        for path in discover_json_files(root)? {
            let text = std::fs::read_to_string(&path)?;
            let value: Value = serde_json::from_str(&text)?;
            let Some(obj) = value.as_object() else {
                continue;
            };

            if looks_like_dimension_doc(obj) {
                if let Some(d) = parse_dimension(&path, obj) {
                    g.dimensions.push(d);
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
                g.tokens.insert(
                    token_name.clone(),
                    TokenRecord {
                        name: token_name.clone(),
                        file: path.clone(),
                        schema_url,
                        uuid,
                        alias_target,
                        raw: token_val.clone(),
                    },
                );
            }
        }
        Ok(g)
    }

    /// Merge tokens for tests / conformance (global token id → record).
    pub fn from_pairs(entries: Vec<(String, PathBuf, Value)>) -> Self {
        let mut tokens = HashMap::new();
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
            tokens.insert(
                name.clone(),
                TokenRecord {
                    name,
                    file,
                    schema_url,
                    uuid,
                    alias_target,
                    raw,
                },
            );
        }
        Self {
            tokens,
            dimensions: Vec::new(),
        }
    }

    /// Attach dimension records (e.g. from conformance fixtures).
    pub fn with_dimensions(mut self, dimensions: Vec<DimensionRecord>) -> Self {
        self.dimensions = dimensions;
        self
    }
}

fn looks_like_token_file(obj: &serde_json::Map<String, Value>) -> bool {
    obj.values().next().is_some_and(|v| {
        v.as_object()
            .is_some_and(|o| o.contains_key("$schema") || o.contains_key("$ref") || o.contains_key("name"))
    })
}

fn looks_like_dimension_doc(obj: &serde_json::Map<String, Value>) -> bool {
    obj.contains_key("modes")
        && obj.contains_key("default")
        && obj.get("name").and_then(|v| v.as_str()).is_some()
        && !obj.values().any(|v| v.as_object().is_some_and(|o| o.contains_key("$schema")))
}

fn parse_dimension(path: &Path, obj: &serde_json::Map<String, Value>) -> Option<DimensionRecord> {
    let name = obj.get("name")?.as_str()?.to_string();
    let default_mode = obj.get("default")?.as_str()?.to_string();
    let modes: Vec<String> = obj
        .get("modes")?
        .as_array()?
        .iter()
        .filter_map(|v| v.as_str().map(str::to_string))
        .collect();
    Some(DimensionRecord {
        file: path.to_path_buf(),
        name,
        modes,
        default_mode,
    })
}

fn extract_alias_target(obj: &serde_json::Map<String, Value>) -> Option<String> {
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
    pub fn resolve_leaf<'a>(&'a self, graph: &'a TokenGraph) -> &'a TokenRecord {
        let mut current = self;
        let mut seen: Vec<&str> = vec![&self.name];
        while let Some(target_name) = &current.alias_target {
            let Some(next) = graph.tokens.get(target_name) else {
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
