// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Token lifecycle mutation operations against cascade `*.tokens.json` files.
//!
//! All five operations (edit / deprecate / rename / alias-rewire / remove) operate on
//! the on-disk cascade array format introduced in Phase B / B1.  Each op:
//!
//! 1. Reads the target `*.tokens.json` as `Vec<Value>` via `read_cascade_file`.
//! 2. Locates the token **by UUID** (the stable identity contract per
//!    `authoring-workflow.md` §UUID-stability, L69).
//! 3. Mutates the element in place.
//! 4. Re-validates (Layer 1) via `validate_token_object` where applicable.
//! 5. Persists with `write_json_file`.
//!
//! `alias_rewire` and `remove` additionally load a `TokenGraph` to verify ref
//! resolution and inbound-ref absence respectively.

use std::path::{Path, PathBuf};

use semver::Version;
use serde_json::{Map, Value};

use crate::graph::TokenGraph;
use crate::schema::SchemaRegistry;
use crate::write::{read_cascade_file, validate_token_object, write_json_file, WriteTokenResult};

// ── Shared helper ─────────────────────────────────────────────────────────────

/// Find the index of a token in a cascade array by its `uuid` field.
///
/// Returns `Err` if no element in `arr` has `uuid == target_uuid`.
fn find_by_uuid(arr: &[Value], target_uuid: &str) -> Result<usize, String> {
    arr.iter()
        .position(|t| {
            t.get("uuid")
                .and_then(|v| v.as_str())
                .map(|u| u == target_uuid)
                .unwrap_or(false)
        })
        .ok_or_else(|| format!("no token with uuid '{target_uuid}' found in cascade file"))
}

// ── edit ──────────────────────────────────────────────────────────────────────

/// Input for [`edit_token`].
pub struct EditTokenInput {
    /// UUID of the token to edit (used for stable lookup).
    pub uuid: String,
    /// Path to the `*.tokens.json` cascade file that contains this token.
    pub target: PathBuf,
    /// Fields to merge into the token.  The `uuid` key is silently ignored to
    /// enforce UUID stability (`authoring-workflow.md` L69).
    pub updates: Map<String, Value>,
    pub rationale: Option<String>,
    /// Root of the tokens directory.  Required when `updates` contains `"$ref"`;
    /// the new target is verified to resolve in the cascade (same contract as
    /// [`rewire_alias`], `authoring-workflow.md` L65).
    pub tokens_root: Option<PathBuf>,
}

/// Update a token's value, alias target, rationale, or name-object fields.
///
/// **Contract:** UUID is always preserved (`authoring-workflow.md` L69).
/// Layer-1 schema validation is re-run on the merged result before persisting
/// (`authoring-workflow.md` L73).  When `updates` contains `"$ref"`, the new
/// target is verified to resolve in the cascade; `tokens_root` must be `Some`
/// in that case.
pub fn edit_token(
    input: EditTokenInput,
    registry: &SchemaRegistry,
) -> Result<WriteTokenResult, String> {
    // Validate any $ref change before touching the file.
    if let Some(new_ref) = input.updates.get("$ref").and_then(Value::as_str) {
        let root = input.tokens_root.as_deref().ok_or(
            "tokens_root is required when updates contains \"$ref\" (authoring-workflow.md L65)",
        )?;
        verify_ref_resolves(root, new_ref)?;
    }

    let mut arr = read_cascade_file(&input.target).map_err(|e| e.to_string())?;
    let idx = find_by_uuid(&arr, &input.uuid)?;

    let token = arr[idx]
        .as_object_mut()
        .ok_or("token is not a JSON object")?;

    // Merge updates; uuid is immutable.
    for (k, v) in input.updates {
        if k == "uuid" {
            continue;
        }
        token.insert(k, v);
    }

    // Inject rationale if supplied.
    if let Some(rationale) = &input.rationale {
        if !rationale.is_empty() {
            token.insert("rationale".into(), Value::String(rationale.clone()));
        }
    }

    let token_val = Value::Object(token.clone());
    validate_token_object(&input.uuid, &token_val, registry).map_err(|e| e.to_string())?;

    let result_val = Value::Array(arr);
    write_json_file(&input.target, &result_val).map_err(|e| e.to_string())?;

    Ok(WriteTokenResult {
        written_to: input.target,
        product_context_updated: false,
    })
}

// ── deprecate ─────────────────────────────────────────────────────────────────

/// Input for [`deprecate_token`].
pub struct DeprecateTokenInput {
    /// UUID of the token to deprecate.
    pub uuid: String,
    /// Path to the `*.tokens.json` cascade file that contains this token.
    pub target: PathBuf,
    /// The active dataset `specVersion` string to stamp as the `deprecated` value.
    pub spec_version: String,
    /// Human-readable deprecation explanation / migration guidance.
    pub deprecated_comment: Option<String>,
    /// Replacement token UUID (string) or UUIDs (array of strings).
    pub replaced_by: Option<Value>,
    /// Spec version when the token will be removed.
    pub planned_removal: Option<String>,
    pub rationale: Option<String>,
}

/// Deprecate a token and enforce the lifecycle cross-field contract.
///
/// **Contract** (`token-format.md` L145–155):
/// - If `replaced_by` is an **array**, `deprecated_comment` is **REQUIRED** (L149).
/// - If `replaced_by` is present, `deprecated` MUST also be set (L151) — always
///   satisfied here because we always set `deprecated`.
/// - If `planned_removal` is present, it MUST NOT precede `deprecated` (L153).
///
/// Additionally, `deprecated_comment` **SHOULD** accompany `deprecated` (L147);
/// this is advisory and does not block the operation.
pub fn deprecate_token(
    input: DeprecateTokenInput,
    registry: &SchemaRegistry,
) -> Result<WriteTokenResult, String> {
    // Pre-validate cross-field rules before touching the file.

    // L149: replaced_by array requires a non-empty deprecated_comment.
    let comment_present = input
        .deprecated_comment
        .as_deref()
        .map(|s| !s.is_empty())
        .unwrap_or(false);
    if matches!(&input.replaced_by, Some(Value::Array(_))) && !comment_present {
        return Err(
            "deprecated_comment is required (and must be non-empty) when replaced_by is an array \
             (token-format.md L149: must explain which replacement applies in which context)"
                .to_string(),
        );
    }

    // L153: plannedRemoval must not precede deprecated (semver comparison).
    if let Some(planned) = &input.planned_removal {
        let dep_ver = Version::parse(&input.spec_version).map_err(|e| {
            format!(
                "spec_version '{}' is not a valid semver: {e}",
                input.spec_version
            )
        })?;
        let plan_ver = Version::parse(planned)
            .map_err(|e| format!("planned_removal '{planned}' is not a valid semver: {e}"))?;
        if plan_ver < dep_ver {
            return Err(format!(
                "planned_removal '{planned}' precedes deprecated version '{}' \
                 (token-format.md L153)",
                input.spec_version
            ));
        }
    }

    let mut arr = read_cascade_file(&input.target).map_err(|e| e.to_string())?;
    let idx = find_by_uuid(&arr, &input.uuid)?;

    let token = arr[idx]
        .as_object_mut()
        .ok_or("token is not a JSON object")?;

    token.insert(
        "deprecated".into(),
        Value::String(input.spec_version.clone()),
    );

    if let Some(comment) = &input.deprecated_comment {
        token.insert("deprecated_comment".into(), Value::String(comment.clone()));
    }

    if let Some(replaced_by) = input.replaced_by {
        token.insert("replaced_by".into(), replaced_by);
    }

    if let Some(planned) = &input.planned_removal {
        token.insert("plannedRemoval".into(), Value::String(planned.clone()));
    }

    if let Some(rationale) = &input.rationale {
        if !rationale.is_empty() {
            token.insert("rationale".into(), Value::String(rationale.clone()));
        }
    }

    let token_val = Value::Object(token.clone());
    validate_token_object(&input.uuid, &token_val, registry).map_err(|e| e.to_string())?;

    let result_val = Value::Array(arr);
    write_json_file(&input.target, &result_val).map_err(|e| e.to_string())?;

    Ok(WriteTokenResult {
        written_to: input.target,
        product_context_updated: false,
    })
}

// ── rename ────────────────────────────────────────────────────────────────────

/// Input for [`rename_token`].
pub struct RenameTokenInput {
    /// UUID of the token to rename (UUID preserved, L69).
    pub uuid: String,
    /// Path to the `*.tokens.json` cascade file that contains this token.
    pub target: PathBuf,
    /// New name object (`{ "property": "…", … }`) or plain SPEC-017 string.
    pub new_name: Value,
    /// Optional UUID of a token that should receive a `replaced_by` pointer back
    /// to this token (the "retire old name" step, L64).
    pub replaced_by_target: Option<String>,
    pub rationale: Option<String>,
}

/// Assign a new name object to a token, preserving its UUID.
///
/// **Contract** (`authoring-workflow.md` L64 / L69):
/// - UUID MUST be preserved.
/// - Optionally sets a `replaced_by` pointer on a separate token in the same file
///   (the "retire old name" step).
pub fn rename_token(
    input: RenameTokenInput,
    registry: &SchemaRegistry,
) -> Result<WriteTokenResult, String> {
    let mut arr = read_cascade_file(&input.target).map_err(|e| e.to_string())?;
    let idx = find_by_uuid(&arr, &input.uuid)?;

    {
        let token = arr[idx]
            .as_object_mut()
            .ok_or("token is not a JSON object")?;
        token.insert("name".into(), input.new_name);

        if let Some(rationale) = &input.rationale {
            if !rationale.is_empty() {
                token.insert("rationale".into(), Value::String(rationale.clone()));
            }
        }
    }

    // Validate the renamed token.
    let token_val = arr[idx].clone();
    validate_token_object(&input.uuid, &token_val, registry).map_err(|e| e.to_string())?;

    // Retire the old-name token with a replaced_by pointer.
    if let Some(old_uuid) = &input.replaced_by_target {
        let old_idx = find_by_uuid(&arr, old_uuid)?;
        if let Some(old_token) = arr[old_idx].as_object_mut() {
            old_token.insert("replaced_by".into(), Value::String(input.uuid.clone()));
        }
    }

    let result_val = Value::Array(arr);
    write_json_file(&input.target, &result_val).map_err(|e| e.to_string())?;

    Ok(WriteTokenResult {
        written_to: input.target,
        product_context_updated: false,
    })
}

// ── alias-rewire ──────────────────────────────────────────────────────────────

/// Input for [`rewire_alias`].
pub struct RewireAliasInput {
    /// UUID of the alias token whose `$ref` should be changed.
    pub uuid: String,
    /// Path to the `*.tokens.json` cascade file that contains this token.
    pub target: PathBuf,
    /// New `$ref` target — must be a UUID that resolves in the dataset.
    pub new_ref: String,
    /// Root of the tokens directory (`packages/design-data/tokens/`) for graph
    /// resolution.  Used only to verify that `new_ref` resolves.
    pub tokens_root: PathBuf,
    pub rationale: Option<String>,
}

/// Change the `$ref` target on an alias token.
///
/// **Contract** (`authoring-workflow.md` L65): the new target MUST resolve in the
/// cascade before the write is accepted.
pub fn rewire_alias(
    input: RewireAliasInput,
    registry: &SchemaRegistry,
) -> Result<WriteTokenResult, String> {
    // Load graph to verify the new target resolves.
    verify_ref_resolves(&input.tokens_root, &input.new_ref)?;

    let mut arr = read_cascade_file(&input.target).map_err(|e| e.to_string())?;
    let idx = find_by_uuid(&arr, &input.uuid)?;

    {
        let token = arr[idx]
            .as_object_mut()
            .ok_or("token is not a JSON object")?;

        if !token.contains_key("$ref") {
            return Err(format!(
                "token '{}' is not an alias token (no '$ref' field)",
                input.uuid
            ));
        }

        token.insert("$ref".into(), Value::String(input.new_ref.clone()));

        if let Some(rationale) = &input.rationale {
            if !rationale.is_empty() {
                token.insert("rationale".into(), Value::String(rationale.clone()));
            }
        }
    }

    let token_val = arr[idx].clone();
    validate_token_object(&input.uuid, &token_val, registry).map_err(|e| e.to_string())?;

    let result_val = Value::Array(arr);
    write_json_file(&input.target, &result_val).map_err(|e| e.to_string())?;

    Ok(WriteTokenResult {
        written_to: input.target,
        product_context_updated: false,
    })
}

// ── remove ────────────────────────────────────────────────────────────────────

/// Input for [`remove_token`].
pub struct RemoveTokenInput {
    /// UUID of the token to remove.
    pub uuid: String,
    /// Path to the `*.tokens.json` cascade file that contains this token.
    pub target: PathBuf,
    /// Root of the tokens directory for inbound-ref scanning.
    pub tokens_root: PathBuf,
}

/// Delete a token from its cascade file.
///
/// **Contract** (`authoring-workflow.md` L67): MUST verify no `$ref` in the dataset
/// resolves to the removed UUID before deleting.
pub fn remove_token(input: RemoveTokenInput) -> Result<(), String> {
    // Verify no other token references this UUID.
    verify_no_inbound_refs(&input.tokens_root, &input.uuid)?;

    let mut arr = read_cascade_file(&input.target).map_err(|e| e.to_string())?;
    let idx = find_by_uuid(&arr, &input.uuid)?;

    arr.remove(idx);

    let result_val = Value::Array(arr);
    write_json_file(&input.target, &result_val).map_err(|e| e.to_string())?;

    Ok(())
}

// ── ref-resolution helpers ────────────────────────────────────────────────────

/// Verify that `target_ref` resolves as an alias key in the graph loaded from
/// `tokens_root`.  Returns `Err` if it does not resolve.
fn verify_ref_resolves(tokens_root: &Path, target_ref: &str) -> Result<(), String> {
    let graph = TokenGraph::from_json_dir(tokens_root)
        .map_err(|e| format!("failed to load graph from {}: {e}", tokens_root.display()))?;

    if graph.resolve_alias_key(target_ref).is_none() {
        return Err(format!(
            "alias target '{target_ref}' does not resolve in the cascade \
             (authoring-workflow.md L65)"
        ));
    }

    Ok(())
}

/// Verify that no token in the dataset has `$ref == uuid_to_remove`.
///
/// Scans `TokenRecord.alias_target` for every token loaded from `tokens_root`.
fn verify_no_inbound_refs(tokens_root: &Path, uuid_to_remove: &str) -> Result<(), String> {
    let graph = TokenGraph::from_json_dir(tokens_root)
        .map_err(|e| format!("failed to load graph from {}: {e}", tokens_root.display()))?;

    let inbound: Vec<String> = graph
        .tokens
        .values()
        .filter(|rec| {
            rec.alias_target
                .as_deref()
                .map(|t| t == uuid_to_remove)
                .unwrap_or(false)
        })
        .filter_map(|rec| rec.uuid.clone())
        .collect();

    if !inbound.is_empty() {
        return Err(format!(
            "cannot remove token '{}': {} token(s) still reference it via $ref ({}) \
             (authoring-workflow.md L67)",
            uuid_to_remove,
            inbound.len(),
            inbound.join(", ")
        ));
    }

    Ok(())
}

// ── tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::path::Path;
    use tempfile::TempDir;

    /// Load the real token schemas (same path as cascade_tests in write.rs).
    fn test_registry() -> SchemaRegistry {
        let schemas = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../packages/tokens/schemas");
        SchemaRegistry::load_legacy_token_schemas(&schemas).expect("schemas load")
    }

    fn make_tokens_dir(tokens: Vec<Value>) -> (TempDir, PathBuf) {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("test.tokens.json");
        let content = serde_json::to_string_pretty(&Value::Array(tokens)).unwrap();
        std::fs::write(&path, content).unwrap();
        (dir, path)
    }

    fn minimal_token(uuid: &str, schema: &str) -> Value {
        json!({
            "$schema": schema,
            "uuid": uuid,
            "name": { "property": "color" },
            "value": "rgb(255, 255, 255)"
        })
    }

    fn alias_token(uuid: &str, schema: &str, ref_target: &str) -> Value {
        json!({
            "$schema": schema,
            "uuid": uuid,
            "name": { "property": "color" },
            "$ref": ref_target
        })
    }

    // ── edit ──────────────────────────────────────────────────────────────────

    #[test]
    fn edit_updates_value_and_preserves_uuid() {
        let schema =
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json";
        let uuid = "aaaaaaaa-0000-0000-0000-000000000001";
        let (_dir, path) = make_tokens_dir(vec![minimal_token(uuid, schema)]);

        let result = edit_token(
            EditTokenInput {
                uuid: uuid.to_string(),
                target: path.clone(),
                updates: {
                    let mut m = Map::new();
                    m.insert("value".into(), json!("rgb(0, 0, 0)"));
                    m.insert("uuid".into(), json!("ignored")); // must be ignored
                    m
                },
                rationale: None,
                tokens_root: None,
            },
            &test_registry(),
        );

        assert!(result.is_ok(), "edit_token failed: {:?}", result.err());
        let arr: Vec<Value> =
            serde_json::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
        assert_eq!(arr[0]["uuid"], json!(uuid), "uuid must be preserved");
        assert_eq!(
            arr[0]["value"],
            json!("rgb(0, 0, 0)"),
            "value must be updated"
        );
    }

    #[test]
    fn edit_missing_uuid_returns_error() {
        let schema =
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json";
        let (_dir, path) = make_tokens_dir(vec![minimal_token(
            "aaaaaaaa-0000-0000-0000-000000000001",
            schema,
        )]);

        let result = edit_token(
            EditTokenInput {
                uuid: "does-not-exist".to_string(),
                target: path,
                updates: Map::new(),
                rationale: None,
                tokens_root: None,
            },
            &test_registry(),
        );

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("no token with uuid"));
    }

    #[test]
    fn edit_dangling_ref_in_updates_is_rejected() {
        let schema =
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json";
        let uuid = "aaaaaaaa-0000-0000-0000-000000000002";
        let (_dir, path) = make_tokens_dir(vec![minimal_token(uuid, schema)]);
        let tokens_root = path.parent().unwrap().to_path_buf();

        let result = edit_token(
            EditTokenInput {
                uuid: uuid.to_string(),
                target: path,
                updates: {
                    let mut m = Map::new();
                    m.insert("$ref".into(), json!("does-not-exist-uuid"));
                    m
                },
                rationale: None,
                tokens_root: Some(tokens_root),
            },
            &test_registry(),
        );

        assert!(result.is_err(), "should reject dangling $ref");
        assert!(
            result.unwrap_err().contains("does not resolve"),
            "error must mention resolution failure"
        );
    }

    #[test]
    fn edit_ref_requires_tokens_root() {
        let schema =
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json";
        let uuid = "aaaaaaaa-0000-0000-0000-000000000003";
        let (_dir, path) = make_tokens_dir(vec![minimal_token(uuid, schema)]);

        let result = edit_token(
            EditTokenInput {
                uuid: uuid.to_string(),
                target: path,
                updates: {
                    let mut m = Map::new();
                    m.insert("$ref".into(), json!("some-uuid"));
                    m
                },
                rationale: None,
                tokens_root: None, // missing — must be rejected
            },
            &test_registry(),
        );

        assert!(
            result.is_err(),
            "should reject $ref update without tokens_root"
        );
        assert!(
            result.unwrap_err().contains("tokens_root is required"),
            "error must mention tokens_root"
        );
    }

    // ── deprecate ─────────────────────────────────────────────────────────────

    #[test]
    fn deprecate_sets_deprecated_field() {
        let schema =
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json";
        let uuid = "bbbbbbbb-0000-0000-0000-000000000001";
        let (_dir, path) = make_tokens_dir(vec![minimal_token(uuid, schema)]);

        let result = deprecate_token(
            DeprecateTokenInput {
                uuid: uuid.to_string(),
                target: path.clone(),
                spec_version: "1.1.0".to_string(),
                deprecated_comment: Some("use new-token instead".to_string()),
                replaced_by: None,
                planned_removal: None,
                rationale: None,
            },
            &test_registry(),
        );

        assert!(result.is_ok(), "deprecate_token failed: {:?}", result.err());
        let arr: Vec<Value> =
            serde_json::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
        assert_eq!(arr[0]["deprecated"], json!("1.1.0"));
        assert_eq!(arr[0]["deprecated_comment"], json!("use new-token instead"));
    }

    #[test]
    fn deprecate_array_replaced_by_without_comment_is_rejected() {
        let schema =
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json";
        let uuid = "bbbbbbbb-0000-0000-0000-000000000002";
        let (_dir, path) = make_tokens_dir(vec![minimal_token(uuid, schema)]);

        let result = deprecate_token(
            DeprecateTokenInput {
                uuid: uuid.to_string(),
                target: path,
                spec_version: "1.1.0".to_string(),
                deprecated_comment: None, // MUST be present when replaced_by is array
                replaced_by: Some(json!(["uuid-a", "uuid-b"])),
                planned_removal: None,
                rationale: None,
            },
            &test_registry(),
        );

        assert!(
            result.is_err(),
            "should reject array replaced_by without comment"
        );
        assert!(
            result
                .unwrap_err()
                .contains("deprecated_comment is required"),
            "error must mention deprecated_comment"
        );
    }

    #[test]
    fn deprecate_planned_removal_preceding_deprecated_is_rejected() {
        let schema =
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json";
        let uuid = "bbbbbbbb-0000-0000-0000-000000000003";
        let (_dir, path) = make_tokens_dir(vec![minimal_token(uuid, schema)]);

        let result = deprecate_token(
            DeprecateTokenInput {
                uuid: uuid.to_string(),
                target: path,
                spec_version: "1.1.0".to_string(),
                deprecated_comment: None,
                replaced_by: None,
                planned_removal: Some("1.0.0".to_string()), // precedes 1.1.0 — invalid
                rationale: None,
            },
            &test_registry(),
        );

        assert!(
            result.is_err(),
            "should reject plannedRemoval preceding deprecated"
        );
        assert!(
            result.unwrap_err().contains("precedes"),
            "error must mention version ordering"
        );
    }

    #[test]
    fn deprecate_empty_string_comment_rejected_for_array_replaced_by() {
        let schema =
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json";
        let uuid = "bbbbbbbb-0000-0000-0000-000000000004";
        let (_dir, path) = make_tokens_dir(vec![minimal_token(uuid, schema)]);

        let result = deprecate_token(
            DeprecateTokenInput {
                uuid: uuid.to_string(),
                target: path,
                spec_version: "1.1.0".to_string(),
                deprecated_comment: Some(String::new()), // Some("") must be treated as absent
                replaced_by: Some(json!(["uuid-a", "uuid-b"])),
                planned_removal: None,
                rationale: None,
            },
            &test_registry(),
        );

        assert!(
            result.is_err(),
            "Some(\"\") must not satisfy the deprecated_comment requirement"
        );
        assert!(
            result
                .unwrap_err()
                .contains("deprecated_comment is required"),
            "error must mention deprecated_comment"
        );
    }

    // ── rename ────────────────────────────────────────────────────────────────

    #[test]
    fn rename_updates_name_and_preserves_uuid() {
        let schema =
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json";
        let uuid = "cccccccc-0000-0000-0000-000000000001";
        let (_dir, path) = make_tokens_dir(vec![minimal_token(uuid, schema)]);

        let new_name = json!({ "property": "color", "colorFamily": "blue" });

        let result = rename_token(
            RenameTokenInput {
                uuid: uuid.to_string(),
                target: path.clone(),
                new_name: new_name.clone(),
                replaced_by_target: None,
                rationale: None,
            },
            &test_registry(),
        );

        assert!(result.is_ok(), "rename_token failed: {:?}", result.err());
        let arr: Vec<Value> =
            serde_json::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
        assert_eq!(arr[0]["uuid"], json!(uuid), "uuid must be preserved");
        assert_eq!(arr[0]["name"], new_name, "name must be updated");
    }

    #[test]
    fn rename_sets_replaced_by_on_old_token() {
        let schema =
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json";
        let new_uuid = "cccccccc-0000-0000-0000-000000000002";
        let old_uuid = "cccccccc-0000-0000-0000-000000000003";
        let (_dir, path) = make_tokens_dir(vec![
            minimal_token(new_uuid, schema),
            minimal_token(old_uuid, schema),
        ]);

        let result = rename_token(
            RenameTokenInput {
                uuid: new_uuid.to_string(),
                target: path.clone(),
                new_name: json!({ "property": "color", "colorFamily": "blue" }),
                replaced_by_target: Some(old_uuid.to_string()),
                rationale: None,
            },
            &test_registry(),
        );

        assert!(result.is_ok());
        let arr: Vec<Value> =
            serde_json::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
        let old = arr.iter().find(|t| t["uuid"] == json!(old_uuid)).unwrap();
        assert_eq!(old["replaced_by"], json!(new_uuid));
    }

    #[test]
    fn rename_stale_replaced_by_target_returns_error() {
        let schema =
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json";
        let uuid = "cccccccc-0000-0000-0000-000000000004";
        let (_dir, path) = make_tokens_dir(vec![minimal_token(uuid, schema)]);

        let result = rename_token(
            RenameTokenInput {
                uuid: uuid.to_string(),
                target: path,
                new_name: json!({ "property": "color", "colorFamily": "blue" }),
                replaced_by_target: Some("does-not-exist".to_string()),
                rationale: None,
            },
            &test_registry(),
        );

        assert!(
            result.is_err(),
            "stale replaced_by_target UUID must return an error"
        );
        assert!(
            result.unwrap_err().contains("no token with uuid"),
            "error must identify the missing uuid"
        );
    }

    // ── alias-rewire ──────────────────────────────────────────────────────────

    #[test]
    fn rewire_alias_rejects_non_existent_target() {
        let schema =
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json";
        let alias_uuid = "dddddddd-0000-0000-0000-000000000001";
        let (_dir, path) = make_tokens_dir(vec![alias_token(
            alias_uuid,
            schema,
            "dddddddd-0000-0000-0000-000000000099",
        )]);

        let tokens_root = path.parent().unwrap().to_path_buf();

        let result = rewire_alias(
            RewireAliasInput {
                uuid: alias_uuid.to_string(),
                target: path,
                new_ref: "does-not-exist-uuid".to_string(),
                tokens_root,
                rationale: None,
            },
            &test_registry(),
        );

        assert!(result.is_err(), "should reject non-resolving target");
        assert!(
            result.unwrap_err().contains("does not resolve"),
            "error must mention resolution failure"
        );
    }

    #[test]
    fn rewire_alias_rejects_non_alias_token() {
        let schema =
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json";
        let target_uuid = "dddddddd-0000-0000-0000-000000000002";
        let alias_uuid = "dddddddd-0000-0000-0000-000000000003";
        // target_uuid is a literal, alias_uuid has a $ref to it.
        let (_dir, path) = make_tokens_dir(vec![
            minimal_token(target_uuid, schema),
            alias_token(alias_uuid, schema, target_uuid),
        ]);

        let tokens_root = path.parent().unwrap().to_path_buf();

        // Try to rewire the *literal* token (not an alias) — should fail.
        let result = rewire_alias(
            RewireAliasInput {
                uuid: target_uuid.to_string(),
                target: path,
                new_ref: alias_uuid.to_string(),
                tokens_root,
                rationale: None,
            },
            &test_registry(),
        );

        assert!(result.is_err(), "should reject non-alias token");
        assert!(
            result.unwrap_err().contains("not an alias token"),
            "error must mention non-alias"
        );
    }

    // ── remove ────────────────────────────────────────────────────────────────

    #[test]
    fn remove_succeeds_for_unreferenced_token() {
        let schema =
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json";
        let uuid = "eeeeeeee-0000-0000-0000-000000000001";
        let (_dir, path) = make_tokens_dir(vec![minimal_token(uuid, schema)]);
        let tokens_root = path.parent().unwrap().to_path_buf();

        let result = remove_token(RemoveTokenInput {
            uuid: uuid.to_string(),
            target: path.clone(),
            tokens_root,
        });

        assert!(result.is_ok(), "remove_token failed: {:?}", result.err());
        let arr: Vec<Value> =
            serde_json::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
        assert!(arr.is_empty(), "array must be empty after removal");
    }

    #[test]
    fn remove_rejects_token_with_inbound_ref() {
        let schema =
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json";
        let target_uuid = "eeeeeeee-0000-0000-0000-000000000002";
        let alias_uuid = "eeeeeeee-0000-0000-0000-000000000003";
        let (_dir, path) = make_tokens_dir(vec![
            minimal_token(target_uuid, schema),
            alias_token(alias_uuid, schema, target_uuid),
        ]);

        let tokens_root = path.parent().unwrap().to_path_buf();

        let result = remove_token(RemoveTokenInput {
            uuid: target_uuid.to_string(),
            target: path,
            tokens_root,
        });

        assert!(result.is_err(), "should reject removal with inbound refs");
        assert!(
            result.unwrap_err().contains("still reference it"),
            "error must mention inbound refs"
        );
    }

    #[test]
    fn remove_missing_uuid_returns_error() {
        let schema =
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json";
        let uuid = "eeeeeeee-0000-0000-0000-000000000004";
        let (_dir, path) = make_tokens_dir(vec![minimal_token(uuid, schema)]);
        let tokens_root = path.parent().unwrap().to_path_buf();

        let result = remove_token(RemoveTokenInput {
            uuid: "no-such-uuid".to_string(),
            target: path,
            tokens_root,
        });

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("no token with uuid"));
    }
}
