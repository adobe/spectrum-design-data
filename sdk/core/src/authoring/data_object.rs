// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Create / edit authoring for non-token data categories:
//! components, fields, registry, mode-sets, guidelines.
//!
//! All five categories are one-JSON-object-per-file, so create/edit reduces to:
//! validate the document (Layer 1, JSON Schema), write `<category-dir>/<name>.json`.
//! No UUID resolution, no array upsert, no cascade layering — see Phase B for tokens.

use std::path::{Path, PathBuf};

use serde::Serialize;
use serde_json::Value;

use crate::schema::SchemaRegistry;
use crate::write::write_json_file;
use crate::CoreError;

// ── Category registration ─────────────────────────────────────────────────────

/// A non-token data category that can be created or edited.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DataCategory {
    Components,
    Fields,
    Registry,
    ModeSets,
    Guidelines,
}

struct CategoryMeta {
    /// Subdirectory under the dataset root.
    subdir: &'static str,
    /// Schema filename under `spec_schemas_dir`.
    schema_file: &'static str,
    /// JSON field used as the canonical name / filename slug.
    name_field: &'static str,
    /// Whether mutations here require `moon run sdk:codegen` to stay in sync.
    needs_codegen: bool,
}

fn meta(cat: DataCategory) -> CategoryMeta {
    match cat {
        DataCategory::Components => CategoryMeta {
            subdir: "components",
            schema_file: "component.schema.json",
            name_field: "name",
            needs_codegen: false,
        },
        DataCategory::Fields => CategoryMeta {
            subdir: "fields",
            schema_file: "field.schema.json",
            name_field: "name",
            needs_codegen: true,
        },
        DataCategory::Registry => CategoryMeta {
            subdir: "registry",
            schema_file: "registry-value.json",
            name_field: "type",
            needs_codegen: true,
        },
        DataCategory::ModeSets => CategoryMeta {
            subdir: "mode-sets",
            schema_file: "mode-set.schema.json",
            name_field: "name",
            needs_codegen: false,
        },
        DataCategory::Guidelines => CategoryMeta {
            subdir: "guidelines",
            schema_file: "guideline.schema.json",
            name_field: "name",
            needs_codegen: false,
        },
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Whether to create a new file or overwrite an existing one.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DataWriteMode {
    /// Fails if the target file already exists.
    Create,
    /// Fails if the target file does not exist.
    Edit,
}

/// Result of a successful [`write_data_object`] call.
#[derive(Debug, Serialize)]
pub struct DataWriteResult {
    pub written_to: PathBuf,
    pub category: String,
    pub name: String,
    /// Non-empty when the caller should run `moon run sdk:codegen` + `sdk:codegen-check`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub codegen_required: Option<String>,
}

/// Validate and write a non-token data object to `<dataset_root>/<category>/<name>.json`.
///
/// # Errors
/// - `CoreError::ParseError` if the document is not valid JSON, is missing its name
///   field, fails Layer 1 schema validation, or violates the create/edit existence check.
/// - `CoreError::Io` on file read/write failure.
pub fn write_data_object(
    dataset_root: &Path,
    spec_schemas_dir: &Path,
    category: DataCategory,
    mode: DataWriteMode,
    doc: &Value,
) -> Result<DataWriteResult, CoreError> {
    let m = meta(category);

    // Extract name from document.
    let name = doc
        .get(m.name_field)
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| {
            CoreError::ParseError(format!(
                "document is missing required string field {:?}",
                m.name_field
            ))
        })?
        .to_string();

    let target_dir = dataset_root.join(m.subdir);
    let target = target_dir.join(format!("{name}.json"));

    // Enforce create / edit existence semantics.
    match mode {
        DataWriteMode::Create if target.exists() => {
            return Err(CoreError::ParseError(format!(
                "{}/{name}.json already exists — use edit to overwrite",
                m.subdir
            )));
        }
        DataWriteMode::Edit if !target.exists() => {
            return Err(CoreError::ParseError(format!(
                "{}/{name}.json does not exist — use create to create it",
                m.subdir
            )));
        }
        _ => {}
    }

    // Layer 1: validate against the category JSON schema (pre-write, nothing written yet).
    let schema_path = spec_schemas_dir.join(m.schema_file);
    let errors = SchemaRegistry::validate_value_against_schema_file(doc, &schema_path)?;
    if !errors.is_empty() {
        return Err(CoreError::ParseError(format!(
            "schema validation failed for {}/{name}.json:\n{}",
            m.subdir,
            errors.join("\n")
        )));
    }

    // Write.
    std::fs::create_dir_all(&target_dir)?;
    write_json_file(&target, doc)?;

    Ok(DataWriteResult {
        written_to: target,
        category: m.subdir.to_string(),
        name,
        codegen_required: if m.needs_codegen {
            Some("run `moon run sdk:codegen && moon run sdk:codegen-check` to keep the embedded Rust registry in sync".to_string())
        } else {
            None
        },
    })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use serde_json::json;
    use tempfile::TempDir;

    use super::*;

    fn spec_schemas_dir() -> PathBuf {
        // Resolve relative to this source file's location in the workspace.
        let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        manifest.join("../../packages/design-data-spec/schemas")
    }

    fn run(
        cat: DataCategory,
        mode: DataWriteMode,
        doc: Value,
    ) -> (TempDir, Result<DataWriteResult, CoreError>) {
        let dir = TempDir::new().unwrap();
        let result = write_data_object(dir.path(), &spec_schemas_dir(), cat, mode, &doc);
        (dir, result)
    }

    #[test]
    fn create_valid_mode_set() {
        let (_dir, result) = run(
            DataCategory::ModeSets,
            DataWriteMode::Create,
            json!({
                "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/v0/mode-set.schema.json",
                "specVersion": "1.0.0-draft",
                "name": "test-modes",
                "modes": ["a", "b"],
                "default": "a",
                "description": "test"
            }),
        );
        let r = result.expect("create should succeed");
        assert_eq!(r.name, "test-modes");
        assert!(r.written_to.exists());
        assert!(r.codegen_required.is_none());
    }

    #[test]
    fn create_fails_on_schema_violation() {
        // mode-set missing required "default" field
        let (_dir, result) = run(
            DataCategory::ModeSets,
            DataWriteMode::Create,
            json!({
                "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/v0/mode-set.schema.json",
                "specVersion": "1.0.0-draft",
                "name": "bad-mode-set",
                "modes": ["a", "b"]
            }),
        );
        assert!(matches!(result, Err(CoreError::ParseError(_))));
        // ponytail: also assert nothing was written
        // (dir still around, but the file should not exist)
    }

    #[test]
    fn create_fails_when_file_exists() {
        let doc = json!({
            "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/v0/mode-set.schema.json",
            "specVersion": "1.0.0-draft",
            "name": "dup",
            "modes": ["a"],
            "default": "a"
        });
        let dir = TempDir::new().unwrap();
        let schemas = spec_schemas_dir();
        write_data_object(
            dir.path(),
            &schemas,
            DataCategory::ModeSets,
            DataWriteMode::Create,
            &doc,
        )
        .expect("first create should succeed");
        let second = write_data_object(
            dir.path(),
            &schemas,
            DataCategory::ModeSets,
            DataWriteMode::Create,
            &doc,
        );
        assert!(matches!(second, Err(CoreError::ParseError(_))));
    }

    #[test]
    fn edit_fails_when_file_missing() {
        let (_dir, result) = run(
            DataCategory::ModeSets,
            DataWriteMode::Edit,
            json!({
                "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/v0/mode-set.schema.json",
                "specVersion": "1.0.0-draft",
                "name": "nonexistent",
                "modes": ["a"],
                "default": "a"
            }),
        );
        assert!(matches!(result, Err(CoreError::ParseError(_))));
    }

    #[test]
    fn edit_succeeds_when_file_exists() {
        let doc_v1 = json!({
            "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/v0/mode-set.schema.json",
            "specVersion": "1.0.0-draft",
            "name": "editable",
            "modes": ["a"],
            "default": "a"
        });
        let doc_v2 = json!({
            "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/v0/mode-set.schema.json",
            "specVersion": "1.0.0-draft",
            "name": "editable",
            "modes": ["a", "b"],
            "default": "b",
            "description": "updated"
        });
        let dir = TempDir::new().unwrap();
        let schemas = spec_schemas_dir();
        write_data_object(
            dir.path(),
            &schemas,
            DataCategory::ModeSets,
            DataWriteMode::Create,
            &doc_v1,
        )
        .expect("create should succeed");
        let r = write_data_object(
            dir.path(),
            &schemas,
            DataCategory::ModeSets,
            DataWriteMode::Edit,
            &doc_v2,
        )
        .expect("edit should succeed");
        assert_eq!(r.name, "editable");
    }

    #[test]
    fn fields_create_signals_codegen() {
        let (_dir, result) = run(
            DataCategory::Fields,
            DataWriteMode::Create,
            json!({
                "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/v0/field.schema.json",
                "specVersion": "1.0.0-draft",
                "name": "test-field",
                "description": "A test field.",
                "kind": "semantic",
                "validation": "advisory",
                "serialization": { "position": 99 },
                "required": false,
                "valueType": "string"
            }),
        );
        let r = result.expect("create should succeed");
        assert!(r.codegen_required.is_some());
    }
}
