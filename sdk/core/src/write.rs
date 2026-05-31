// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Token write operation — validates a token fragment and writes it to a product-layer file.

use std::path::{Path, PathBuf};

use serde_json::{Map, Value};

use crate::schema::SchemaRegistry;
use crate::CoreError;

const SPEC_VERSION: &str = "1.0.0-draft";

/// Input for the `write_token` operation.
pub struct WriteTokenInput {
    /// Key used to identify the token in the target legacy JSON file.
    pub key: String,
    /// Full token object — MUST include `$schema` and `value`.
    pub token: Value,
    /// Target file path (legacy JSON: `{ "key": { ...token... } }`). Created if absent.
    pub target: PathBuf,
    /// Optional `product-context.json` path for agent-capture-behavior rationale recording.
    pub product_context: Option<PathBuf>,
    /// Optional rationale string. Recorded in both the token's inline field and product-context.
    pub rationale: Option<String>,
    /// ISO 8601 timestamp used for `createdAt` when creating a new product-context document.
    pub created_at: Option<String>,
    /// When true the token overrides an existing foundation/platform token (written to
    /// `overrides[]`). When false it is a net-new product-layer token (written to
    /// `extensions.tokens[]`).
    pub is_override: bool,
}

/// Result of a successful `write_token` call.
#[derive(Debug)]
pub struct WriteTokenResult {
    /// Path of the token file that was written.
    pub written_to: PathBuf,
    /// Whether `product-context.json` was created or updated.
    pub product_context_updated: bool,
}

/// Validate, write, and record a product-layer token.
///
/// # Errors
///
/// Returns `Err` when:
/// - The token object is missing `$schema`.
/// - The `$schema` URL is not in the registry.
/// - The token fails structural JSON Schema validation (first error wins).
/// - File I/O fails.
pub fn write_token(
    input: WriteTokenInput,
    registry: &SchemaRegistry,
) -> Result<WriteTokenResult, CoreError> {
    // Destructure so it's clear only `token` is mutated.
    let WriteTokenInput {
        key,
        mut token,
        target,
        product_context,
        rationale,
        created_at,
        is_override,
    } = input;

    // Inject rationale into the token object if supplied.
    if let Some(ref r) = rationale {
        if let Some(obj) = token.as_object_mut() {
            obj.entry("rationale")
                .or_insert_with(|| Value::String(r.clone()));
        }
    }

    // Structural validation against the token's $schema.
    validate_token_object(&key, &token, registry)?;

    // Read existing target file (if any) and merge.
    let mut file_map = read_legacy_file(&target)?;
    file_map.insert(key.clone(), token.clone());

    write_json_file(&target, &Value::Object(file_map))?;

    // Update product-context.json for rationale capture.
    let product_context_updated = if let Some(ref pc_path) = product_context {
        update_product_context(
            pc_path,
            &key,
            &token,
            rationale.as_deref(),
            created_at.as_deref(),
            is_override,
        )?;
        true
    } else {
        false
    };

    Ok(WriteTokenResult {
        written_to: target,
        product_context_updated,
    })
}

/// Validate a single token object against its `$schema` using the registry.
/// Returns `Err(CoreError::ParseError)` on the first validation failure.
fn validate_token_object(
    key: &str,
    token: &Value,
    registry: &SchemaRegistry,
) -> Result<(), CoreError> {
    let schema_url = token
        .get("$schema")
        .and_then(|v| v.as_str())
        .ok_or_else(|| CoreError::ParseError(format!("{key}: missing required \"$schema\"")))?;

    let validator = registry.validator_for_url(schema_url).ok_or_else(|| {
        CoreError::ParseError(format!(
            "{key}: unknown \"$schema\" URL (not in registry): {schema_url}"
        ))
    })?;

    let mut errors = validator.iter_errors(token);
    if let Some(err) = errors.next() {
        return Err(CoreError::ParseError(format!(
            "{key}: schema validation error: {err}"
        )));
    }

    Ok(())
}

/// Read a legacy token file into a `Map`, or return an empty map if the file does not exist.
fn read_legacy_file(path: &Path) -> Result<Map<String, Value>, CoreError> {
    if !path.exists() {
        return Ok(Map::new());
    }
    let text = std::fs::read_to_string(path)?;
    let root: Value = serde_json::from_str(&text)?;
    match root {
        Value::Object(map) => Ok(map),
        _ => Err(CoreError::ParseError(format!(
            "{}: token file root must be a JSON object",
            path.display()
        ))),
    }
}

/// Serialize `value` as pretty-printed JSON with a trailing newline and write to `path`.
/// Creates parent directories if needed.
fn write_json_file(path: &Path, value: &Value) -> Result<(), CoreError> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)?;
        }
    }
    let json = serde_json::to_string_pretty(value)?;
    std::fs::write(path, json + "\n")?;
    Ok(())
}

/// Update (or create) `product-context.json` to record the written token's rationale.
///
/// For overrides (`is_override = true`): appends/updates an entry in `overrides[]`.
/// For extensions (`is_override = false`): appends the token to `extensions.tokens[]`.
fn update_product_context(
    path: &Path,
    key: &str,
    token: &Value,
    rationale: Option<&str>,
    created_at: Option<&str>,
    is_override: bool,
) -> Result<(), CoreError> {
    let mut doc: Map<String, Value> = if path.exists() {
        let text = std::fs::read_to_string(path)?;
        let v: Value = serde_json::from_str(&text)?;
        match v {
            Value::Object(m) => m,
            _ => {
                return Err(CoreError::ParseError(format!(
                    "{}: product-context.json root must be a JSON object",
                    path.display()
                )))
            }
        }
    } else {
        // New document — build in spec field order.
        let mut m = Map::new();
        m.insert("specVersion".into(), Value::String(SPEC_VERSION.into()));
        m.insert("layer".into(), Value::String("product".into()));
        m.insert(
            "createdBy".into(),
            serde_json::json!({ "type": "agent", "tool": "design-data" }),
        );
        if let Some(ts) = created_at {
            m.insert("createdAt".into(), Value::String(ts.into()));
        }
        m
    };

    let uuid = token
        .get("uuid")
        .and_then(|v| v.as_str())
        .map(str::to_string);

    if is_override {
        let overrides = doc
            .entry("overrides")
            .or_insert_with(|| Value::Array(Vec::new()));
        if let Value::Array(arr) = overrides {
            // Upsert: update existing entry with matching UUID, or append new.
            let existing = uuid.as_deref().and_then(|u| {
                arr.iter_mut()
                    .find(|e| e.get("uuid").and_then(|v| v.as_str()) == Some(u))
            });
            if let Some(entry) = existing {
                if let (Some(r), Some(obj)) = (rationale, entry.as_object_mut()) {
                    obj.insert("rationale".into(), Value::String(r.into()));
                }
            } else {
                let mut entry = Map::new();
                if let Some(u) = uuid {
                    entry.insert("uuid".into(), Value::String(u));
                }
                if let Some(v) = token.get("value") {
                    entry.insert("value".into(), v.clone());
                }
                if let Some(r) = rationale {
                    entry.insert("rationale".into(), Value::String(r.into()));
                }
                arr.push(Value::Object(entry));
            }
        }
    } else {
        let ext_obj = doc
            .entry("extensions")
            .or_insert_with(|| serde_json::json!({}))
            .as_object_mut()
            .ok_or_else(|| {
                CoreError::ParseError(format!(
                    "{}: product-context.json `extensions` field is not an object",
                    path.display()
                ))
            })?;

        let tokens_arr = ext_obj
            .entry("tokens")
            .or_insert_with(|| Value::Array(Vec::new()))
            .as_array_mut()
            .ok_or_else(|| {
                CoreError::ParseError(format!(
                    "{}: product-context.json `extensions.tokens` is not an array",
                    path.display()
                ))
            })?;

        // Upsert by UUID if present, otherwise by name string.
        let token_name = token.get("name").and_then(|v| v.as_str());
        let existing_idx = if let Some(u) = uuid.as_deref() {
            tokens_arr
                .iter()
                .position(|e| e.get("uuid").and_then(|v| v.as_str()) == Some(u))
        } else {
            tokens_arr
                .iter()
                .position(|e| e.get("name").and_then(|v| v.as_str()) == token_name)
        };

        if let Some(idx) = existing_idx {
            // Update value and rationale in-place.
            if let Some(obj) = tokens_arr[idx].as_object_mut() {
                if let Some(v) = token.get("value") {
                    obj.insert("value".into(), v.clone());
                }
                if let Some(r) = rationale {
                    obj.insert("rationale".into(), Value::String(r.into()));
                }
            }
        } else {
            // New entry — record the token key for human-readability.
            let mut entry = Map::new();
            entry.insert("key".into(), Value::String(key.into()));
            if let Some(obj) = token.as_object() {
                for (k, v) in obj {
                    entry.insert(k.clone(), v.clone());
                }
            }
            tokens_arr.push(Value::Object(entry));
        }
    }

    write_json_file(path, &Value::Object(doc))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::schema::SchemaRegistry;
    use serde_json::json;
    use std::path::Path;
    use tempfile::TempDir;

    fn test_registry() -> SchemaRegistry {
        let schemas = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../packages/tokens/schemas");
        SchemaRegistry::load_legacy_token_schemas(&schemas).expect("schemas load")
    }

    #[test]
    fn write_token_creates_new_file() {
        let dir = TempDir::new().unwrap();
        let target = dir.path().join("tokens.json");
        let registry = test_registry();

        let result = write_token(
            WriteTokenInput {
                key: "checkout-bg".into(),
                token: json!({
                    "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
                    "value": "rgb(248, 248, 248)",
                    "uuid": "aaaaaaaa-0001-4001-8001-000000000001"
                }),
                target: target.clone(),
                product_context: None,
                rationale: None,
                created_at: None,
                is_override: false,
            },
            &registry,
        )
        .expect("write_token should succeed");

        assert!(target.exists());
        let text = std::fs::read_to_string(&target).unwrap();
        let doc: Value = serde_json::from_str(&text).unwrap();
        assert_eq!(
            doc["checkout-bg"]["value"].as_str(),
            Some("rgb(248, 248, 248)"),
            "written value should round-trip"
        );
        assert!(!result.product_context_updated);
    }

    #[test]
    fn write_token_merges_into_existing_file() {
        let dir = TempDir::new().unwrap();
        let target = dir.path().join("tokens.json");
        let registry = test_registry();

        // Write first token.
        write_token(
            WriteTokenInput {
                key: "first".into(),
                token: json!({
                    "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
                    "value": "rgb(17, 17, 17)",
                    "uuid": "aaaaaaaa-0001-4001-8001-000000000001"
                }),
                target: target.clone(),
                product_context: None,
                rationale: None,
                created_at: None,
                is_override: false,
            },
            &registry,
        )
        .unwrap();

        // Write second token — should merge.
        write_token(
            WriteTokenInput {
                key: "second".into(),
                token: json!({
                    "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
                    "value": "rgb(34, 34, 34)",
                    "uuid": "bbbbbbbb-0002-4002-8002-000000000002"
                }),
                target: target.clone(),
                product_context: None,
                rationale: None,
                created_at: None,
                is_override: false,
            },
            &registry,
        )
        .unwrap();

        let text = std::fs::read_to_string(&target).unwrap();
        let doc: Value = serde_json::from_str(&text).unwrap();
        assert!(doc.get("first").is_some(), "first token preserved");
        assert!(doc.get("second").is_some(), "second token added");
    }

    #[test]
    fn write_token_injects_rationale_into_token() {
        let dir = TempDir::new().unwrap();
        let target = dir.path().join("tokens.json");
        let registry = test_registry();

        write_token(
            WriteTokenInput {
                key: "my-token".into(),
                token: json!({
                    "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
                    "value": "rgb(255, 0, 0)",
                    "uuid": "cccccccc-0003-4003-8003-000000000003"
                }),
                target: target.clone(),
                product_context: None,
                rationale: Some("Checkout redesign".into()),
                created_at: None,
                is_override: false,
            },
            &registry,
        )
        .unwrap();

        let text = std::fs::read_to_string(&target).unwrap();
        let doc: Value = serde_json::from_str(&text).unwrap();
        assert_eq!(
            doc["my-token"]["rationale"].as_str(),
            Some("Checkout redesign")
        );
    }

    #[test]
    fn write_token_creates_product_context_extension() {
        let dir = TempDir::new().unwrap();
        let target = dir.path().join("tokens.json");
        let pc_path = dir.path().join("product-context.json");
        let registry = test_registry();

        let result = write_token(
            WriteTokenInput {
                key: "new-token".into(),
                token: json!({
                    "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
                    "value": "rgb(100, 200, 150)",
                    "uuid": "dddddddd-0004-4004-8004-000000000004"
                }),
                target: target.clone(),
                product_context: Some(pc_path.clone()),
                rationale: Some("New brand color".into()),
                created_at: Some("2026-05-19T00:00:00Z".into()),
                is_override: false,
            },
            &registry,
        )
        .unwrap();

        assert!(result.product_context_updated);
        let pc_text = std::fs::read_to_string(&pc_path).unwrap();
        let pc: Value = serde_json::from_str(&pc_text).unwrap();
        assert_eq!(pc["layer"].as_str(), Some("product"));
        assert_eq!(pc["createdAt"].as_str(), Some("2026-05-19T00:00:00Z"));
        let tokens = &pc["extensions"]["tokens"];
        assert!(tokens.as_array().map(|a| !a.is_empty()).unwrap_or(false));
        assert_eq!(tokens[0]["rationale"].as_str(), Some("New brand color"));
    }

    #[test]
    fn write_token_records_override_in_product_context() {
        let dir = TempDir::new().unwrap();
        let target = dir.path().join("tokens.json");
        let pc_path = dir.path().join("product-context.json");
        let registry = test_registry();

        write_token(
            WriteTokenInput {
                key: "existing-token".into(),
                token: json!({
                    "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
                    "value": "rgb(10, 20, 30)",
                    "uuid": "eeeeeeee-0005-4005-8005-000000000005"
                }),
                target: target.clone(),
                product_context: Some(pc_path.clone()),
                rationale: Some("Override reason".into()),
                created_at: None,
                is_override: true,
            },
            &registry,
        )
        .unwrap();

        let pc_text = std::fs::read_to_string(&pc_path).unwrap();
        let pc: Value = serde_json::from_str(&pc_text).unwrap();
        let overrides = pc["overrides"].as_array().expect("overrides array");
        assert!(!overrides.is_empty());
        assert_eq!(overrides[0]["rationale"].as_str(), Some("Override reason"));
        assert_eq!(
            overrides[0]["uuid"].as_str(),
            Some("eeeeeeee-0005-4005-8005-000000000005")
        );
    }

    #[test]
    fn write_token_errors_on_unknown_schema() {
        let dir = TempDir::new().unwrap();
        let target = dir.path().join("tokens.json");
        let registry = test_registry();

        let result = write_token(
            WriteTokenInput {
                key: "bad".into(),
                token: json!({
                    "$schema": "https://example.com/unknown-schema.json",
                    "value": "x"
                }),
                target,
                product_context: None,
                rationale: None,
                created_at: None,
                is_override: false,
            },
            &registry,
        );

        assert!(result.is_err());
        let msg = result.unwrap_err().to_string();
        assert!(
            msg.contains("unknown"),
            "error should mention unknown schema: {msg}"
        );
    }

    #[test]
    fn write_token_errors_on_missing_schema_field() {
        let dir = TempDir::new().unwrap();
        let target = dir.path().join("tokens.json");
        let registry = test_registry();

        let result = write_token(
            WriteTokenInput {
                key: "bad".into(),
                token: json!({ "value": "#fff" }),
                target,
                product_context: None,
                rationale: None,
                created_at: None,
                is_override: false,
            },
            &registry,
        );

        assert!(result.is_err());
        let msg = result.unwrap_err().to_string();
        assert!(
            msg.contains("$schema"),
            "error should mention $schema: {msg}"
        );
    }

    #[test]
    fn write_token_errors_when_extensions_tokens_is_not_array() {
        let dir = TempDir::new().unwrap();
        let target = dir.path().join("tokens.json");
        let pc_path = dir.path().join("product-context.json");
        let registry = test_registry();

        // Seed a product-context.json where extensions.tokens is a string, not an array.
        std::fs::write(
            &pc_path,
            r#"{"specVersion":"1.0.0-draft","layer":"product","extensions":{"tokens":"bad"}}"#,
        )
        .unwrap();

        let result = write_token(
            WriteTokenInput {
                key: "t".into(),
                token: json!({
                    "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
                    "value": "rgb(1, 2, 3)",
                    "uuid": "ffffffff-0006-4006-8006-000000000006"
                }),
                target,
                product_context: Some(pc_path),
                rationale: None,
                created_at: None,
                is_override: false,
            },
            &registry,
        );

        assert!(result.is_err());
        let msg = result.unwrap_err().to_string();
        assert!(
            msg.contains("extensions.tokens"),
            "error should name the bad field: {msg}"
        );
    }

    #[test]
    fn write_token_upserts_extension_entry_in_place() {
        let dir = TempDir::new().unwrap();
        let target = dir.path().join("tokens.json");
        let pc_path = dir.path().join("product-context.json");
        let registry = test_registry();

        let common = WriteTokenInput {
            key: "tok".into(),
            token: json!({
                "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
                "value": "rgb(1, 1, 1)",
                "uuid": "a7a7a7a7-0007-4007-8007-000000000007"
            }),
            target: target.clone(),
            product_context: Some(pc_path.clone()),
            rationale: Some("first write".into()),
            created_at: None,
            is_override: false,
        };
        write_token(common, &registry).unwrap();

        // Second write: new value, new rationale — should update in place, not append.
        write_token(
            WriteTokenInput {
                key: "tok".into(),
                token: json!({
                    "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
                    "value": "rgb(2, 2, 2)",
                    "uuid": "a7a7a7a7-0007-4007-8007-000000000007"
                }),
                target,
                product_context: Some(pc_path.clone()),
                rationale: Some("updated rationale".into()),
                created_at: None,
                is_override: false,
            },
            &registry,
        )
        .unwrap();

        let pc: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(&pc_path).unwrap()).unwrap();
        let tokens = pc["extensions"]["tokens"].as_array().expect("tokens array");
        assert_eq!(tokens.len(), 1, "upsert must not duplicate the entry");
        assert_eq!(tokens[0]["value"].as_str(), Some("rgb(2, 2, 2)"));
        assert_eq!(tokens[0]["rationale"].as_str(), Some("updated rationale"));
    }
}
