// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Load legacy Spectrum token JSON Schemas (`packages/tokens/schemas`) into a [`SchemaRegistry`].

use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::Arc;

use jsonschema::{Draft, Registry, Resource, Validator};
use serde_json::Value;

use crate::CoreError;

/// Compiled validators for legacy token types plus `token-file.json`.
pub struct SchemaRegistry {
    by_url: HashMap<String, Arc<Validator>>,
    token_file_validator: Arc<Validator>,
    token_file_schema_url: String,
}

impl SchemaRegistry {
    /// Load `schemas/token-types/*.json` and `schemas/token-file.json` from `schemas_dir`.
    pub fn load_legacy_token_schemas(schemas_dir: &Path) -> Result<Self, CoreError> {
        let token_types_dir = schemas_dir.join("token-types");
        if !token_types_dir.is_dir() {
            return Err(CoreError::SchemaDirectoryMissing(token_types_dir));
        }

        let mut pairs: Vec<(String, Resource)> = Vec::new();
        let mut values_by_url: HashMap<String, Value> = HashMap::new();

        for entry in fs::read_dir(&token_types_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("json") {
                continue;
            }
            let text = fs::read_to_string(&path)?;
            let value: Value = serde_json::from_str(&text)?;
            let id = value
                .get("$id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| CoreError::MissingSchemaId(path.clone()))?
                .to_string();
            let resource = Resource::from_contents(value.clone())?;
            pairs.push((id.clone(), resource));
            values_by_url.insert(id, value);
        }

        let token_file_path = schemas_dir.join("token-file.json");
        let token_file_text = fs::read_to_string(&token_file_path)?;
        let token_file_value: Value = serde_json::from_str(&token_file_text)?;
        let token_file_id = token_file_value
            .get("$id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| CoreError::MissingSchemaId(token_file_path.clone()))?
            .to_string();
        let token_file_resource = Resource::from_contents(token_file_value.clone())?;
        pairs.push((token_file_id.clone(), token_file_resource));

        let registry = Registry::try_from_resources(pairs)?;
        let registry = Arc::new(registry);

        let build_opts = || {
            jsonschema::options()
                .with_registry((*registry).clone())
                .with_draft(Draft::Draft202012)
                .should_validate_formats(true)
        };

        let mut by_url = HashMap::new();
        for (url, schema_value) in &values_by_url {
            let validator = build_opts()
                .build(schema_value)
                .map_err(|e| CoreError::SchemaBuild(e.to_string()))?;
            by_url.insert(url.clone(), Arc::new(validator));
        }

        let token_file_validator = build_opts()
            .build(&token_file_value)
            .map_err(|e| CoreError::SchemaBuild(e.to_string()))?;

        Ok(Self {
            by_url,
            token_file_validator: Arc::new(token_file_validator),
            token_file_schema_url: token_file_id,
        })
    }

    /// Validator for a token object's `$schema` URL (legacy token-types).
    pub fn validator_for_url(&self, schema_url: &str) -> Option<&Arc<Validator>> {
        self.by_url.get(schema_url)
    }

    /// Whole-file validator (`token-file.json`).
    pub fn token_file_validator(&self) -> &Arc<Validator> {
        &self.token_file_validator
    }

    pub fn token_file_schema_url(&self) -> &str {
        &self.token_file_schema_url
    }

    /// Validate a platform manifest document against `manifest.schema.json`.
    ///
    /// `manifest_schema_path` points at the spec's `schemas/manifest.schema.json`.
    /// Returns the list of Layer 1 schema violation messages (empty = valid).
    /// This is the manifest analog of token schema validation and is used by the
    /// Foundation→Platform cascade ([`crate::graph::TokenGraph::apply_platform_manifest`]).
    pub fn validate_manifest(
        manifest: &Value,
        manifest_schema_path: &Path,
    ) -> Result<Vec<String>, CoreError> {
        let text = fs::read_to_string(manifest_schema_path)?;
        let schema: Value = serde_json::from_str(&text)?;
        let validator = jsonschema::options()
            .with_draft(Draft::Draft202012)
            .build(&schema)
            .map_err(|e| CoreError::SchemaBuild(e.to_string()))?;
        Ok(validator
            .iter_errors(manifest)
            .map(|e| e.to_string())
            .collect())
    }

    /// Construct a no-op stub for unit tests where schema validation is never reached.
    #[cfg(test)]
    pub fn new_stub() -> Self {
        use jsonschema::validator_for;
        let empty_schema = serde_json::json!({
            "$schema": "https://json-schema.org/draft/2020-12/schema"
        });
        let validator = Arc::new(validator_for(&empty_schema).expect("stub schema is valid"));
        Self {
            by_url: HashMap::new(),
            token_file_validator: validator,
            token_file_schema_url: String::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn manifest_schema_path() -> std::path::PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../packages/design-data-spec/schemas/manifest.schema.json")
    }

    #[test]
    fn validate_manifest_accepts_valid_document() {
        let manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "include": ["component=button"],
            "modeSetRestrictions": {"colorScheme": {"allowed": ["light", "dark"]}}
        });
        let errors = SchemaRegistry::validate_manifest(&manifest, &manifest_schema_path()).unwrap();
        assert!(errors.is_empty(), "expected no errors, got: {errors:?}");
    }

    #[test]
    fn validate_manifest_rejects_missing_required_field() {
        // Missing the required `foundationVersion`.
        let manifest = json!({ "specVersion": "1.0.0-draft" });
        let errors = SchemaRegistry::validate_manifest(&manifest, &manifest_schema_path()).unwrap();
        assert!(!errors.is_empty());
    }

    #[test]
    fn validate_manifest_rejects_unknown_top_level_key() {
        // Schema sets additionalProperties:false at the top level.
        let manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "bogusKey": true
        });
        let errors = SchemaRegistry::validate_manifest(&manifest, &manifest_schema_path()).unwrap();
        assert!(!errors.is_empty());
    }
}
