// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Design Data core library — validation, resolution, and tooling.

pub mod compat;
pub mod discovery;
pub mod graph;
pub mod report;
pub mod schema;
pub mod validate;

use std::path::PathBuf;

/// Errors from schema loading, IO, and JSON parsing.
#[derive(Debug, thiserror::Error)]
pub enum CoreError {
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    #[error(transparent)]
    Referencing(#[from] jsonschema::ReferencingError),
    #[error("JSON Schema compile: {0}")]
    SchemaBuild(String),
    #[error("schema file is missing $id: {0}")]
    MissingSchemaId(PathBuf),
    #[error("expected token schema directory at {0}")]
    SchemaDirectoryMissing(PathBuf),
}

/// Returns the crate name for sanity checks and CLI `--version` wiring later.
pub fn crate_name() -> &'static str {
    env!("CARGO_PKG_NAME")
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::*;
    use crate::schema::SchemaRegistry;
    use crate::validate::structural::validate_structural;

    #[test]
    fn validate_module_reports_ready() {
        assert!(validate::engine_ready());
    }

    #[test]
    fn crate_name_is_set() {
        assert_eq!(crate_name(), "design-data-core");
    }

    #[test]
    fn structural_validates_spectrum_token_sources() {
        let schemas = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../packages/tokens/schemas");
        let src = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../packages/tokens/src");
        let registry = SchemaRegistry::load_legacy_token_schemas(&schemas).expect("schemas load");
        let report = validate_structural(&src, &registry).expect("validate");
        assert!(report.errors.is_empty(), "{report:?}");
    }
}

#[cfg(test)]
mod relational_conformance {
    use std::path::PathBuf;

    use serde_json::json;

    use crate::graph::{DimensionRecord, TokenGraph};
    use crate::validate::relational::diagnostics_for_rule;

    #[test]
    fn spec001_alias_target_missing() {
        let g = TokenGraph::from_pairs(vec![(
            "missing-alias".into(),
            PathBuf::from("fixture.json"),
            json!({
                "name": {"property": "alias-missing-target"},
                "$ref": "tokens/nonexistent-token.json"
            }),
        )]);
        assert!(!diagnostics_for_rule(&g, "SPEC-001").is_empty());
    }

    #[test]
    fn spec002_spacing_alias_to_color() {
        let g = TokenGraph::from_pairs(vec![
            (
                "spacing-alias".into(),
                PathBuf::from("a.json"),
                json!({
                    "name": {"property": "spacing-alias"},
                    "$ref": "token-color.json",
                    "uuid": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
                }),
            ),
            (
                "token-color".into(),
                PathBuf::from("b.json"),
                json!({
                    "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
                    "name": {"property": "base-color"},
                    "value": "rgb(0, 128, 255)",
                    "uuid": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
                }),
            ),
        ]);
        assert!(!diagnostics_for_rule(&g, "SPEC-002").is_empty());
    }

    #[test]
    fn spec003_alias_cycle() {
        let g = TokenGraph::from_pairs(vec![
            (
                "token-a".into(),
                PathBuf::from("ta.json"),
                json!({
                    "name": {"property": "cycle-a"},
                    "$ref": "token-b.json",
                    "uuid": "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
                }),
            ),
            (
                "token-b".into(),
                PathBuf::from("tb.json"),
                json!({
                    "name": {"property": "cycle-b"},
                    "$ref": "token-a.json",
                    "uuid": "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
                }),
            ),
        ]);
        assert!(!diagnostics_for_rule(&g, "SPEC-003").is_empty());
    }

    #[test]
    fn spec004_duplicate_uuid() {
        let g = TokenGraph::from_pairs(vec![
            (
                "a".into(),
                PathBuf::from("x.json"),
                json!({"uuid": "11111111-1111-1111-1111-111111111111", "value": "1"}),
            ),
            (
                "b".into(),
                PathBuf::from("y.json"),
                json!({"uuid": "11111111-1111-1111-1111-111111111111", "value": "2"}),
            ),
        ]);
        assert!(!diagnostics_for_rule(&g, "SPEC-004").is_empty());
    }

    #[test]
    fn spec005_dimension_default_not_in_modes() {
        let g = TokenGraph::default().with_dimensions(vec![DimensionRecord {
            file: PathBuf::from("dimension.json"),
            name: "scale".into(),
            modes: vec!["medium".into(), "large".into()],
            default_mode: "xlarge".into(),
        }]);
        assert!(!diagnostics_for_rule(&g, "SPEC-005").is_empty());
    }

    #[test]
    fn spec006_duplicate_name_object() {
        let name = json!({"property": "ambiguous", "colorScheme": "dark"});
        let g = TokenGraph::from_pairs(vec![
            (
                "t1".into(),
                PathBuf::from("1.json"),
                json!({
                    "name": name.clone(),
                    "value": "rgb(10, 10, 10)",
                    "uuid": "ffffffff-ffff-4fff-8fff-ffffffffffff"
                }),
            ),
            (
                "t2".into(),
                PathBuf::from("2.json"),
                json!({
                    "name": name,
                    "value": "rgb(20, 20, 20)",
                    "uuid": "11111111-1111-4111-8111-111111111111"
                }),
            ),
        ]);
        assert!(!diagnostics_for_rule(&g, "SPEC-006").is_empty());
    }
}
