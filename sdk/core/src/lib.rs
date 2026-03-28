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

pub mod cascade;
pub mod compat;
pub mod discovery;
pub mod graph;
pub mod legacy;
pub mod migrate;
pub mod naming;
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
    #[error(
        "token property '{0}' has tokens across multiple dimensions and cannot be represented \
         in legacy set format; convert individual dimension slices separately"
    )]
    MultiDimensionalToken(String),
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

    /// Regression for P1 Bug 1: duplicate UUIDs in a cascade file must be detected
    /// by SPEC-004, not silently dropped during graph construction.
    #[test]
    fn spec004_cascade_duplicate_uuid_not_dropped() {
        use std::io::Write;
        use tempfile::TempDir;
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("tokens.tokens.json");
        let mut f = std::fs::File::create(&path).unwrap();
        writeln!(
            f,
            r#"[
              {{"name":{{"property":"a"}},"value":"1","uuid":"dup-uuid-0000-0000-0000-000000000001"}},
              {{"name":{{"property":"b"}},"value":"2","uuid":"dup-uuid-0000-0000-0000-000000000001"}}
            ]"#
        )
        .unwrap();
        let g = TokenGraph::from_json_dir(dir.path()).unwrap();
        // Both tokens must be in the graph (different keys despite same UUID).
        let matching: Vec<_> = g
            .tokens
            .values()
            .filter(|t| t.uuid.as_deref() == Some("dup-uuid-0000-0000-0000-000000000001"))
            .collect();
        assert_eq!(
            matching.len(),
            2,
            "both tokens with duplicate UUID must be in the graph"
        );
        // SPEC-004 must fire.
        assert!(!diagnostics_for_rule(&g, "SPEC-004").is_empty());
    }

    /// Regression for P1 Bug 2: cascade tokens with duplicate name objects (no UUID)
    /// must both be in the graph so SPEC-006 can detect the ambiguity.
    #[test]
    fn spec006_cascade_duplicate_name_object_not_dropped() {
        use std::io::Write;
        use tempfile::TempDir;
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("tokens.tokens.json");
        let mut f = std::fs::File::create(&path).unwrap();
        writeln!(
            f,
            r#"[
              {{"name":{{"property":"bg"}},"value":"white"}},
              {{"name":{{"property":"bg"}},"value":"offwhite"}}
            ]"#
        )
        .unwrap();
        let g = TokenGraph::from_json_dir(dir.path()).unwrap();
        assert_eq!(
            g.tokens.len(),
            2,
            "both tokens with duplicate name must be in the graph"
        );
        assert!(!diagnostics_for_rule(&g, "SPEC-006").is_empty());
    }

    #[test]
    fn spec008_cascade_completeness_warning() {
        use crate::graph::DimensionRecord;
        let g = TokenGraph::from_pairs(vec![(
            "dark-only".into(),
            PathBuf::from("a.json"),
            json!({"name": {"property": "bg", "colorScheme": "dark"}, "value": "#000"}),
        )])
        .with_dimensions(vec![DimensionRecord {
            file: PathBuf::from("d.json"),
            name: "colorScheme".into(),
            modes: vec!["light".into(), "dark".into()],
            default_mode: "light".into(),
        }]);
        assert!(!diagnostics_for_rule(&g, "SPEC-008").is_empty());
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

/// Resolution conformance tests — fixture-driven, closes #768.
///
/// Each test case lives under `packages/design-data-spec/conformance/resolution/<name>/`
/// with `input/` (cascade tokens), optional `dimensions/`, `query.json`, and `expected.json`.
#[cfg(test)]
mod resolution_conformance {
    use std::collections::HashMap;
    use std::path::Path;

    use serde_json::Value;

    use crate::cascade::{resolve, ResolutionContext};
    use crate::graph::TokenGraph;

    fn run_fixture(case: &str) {
        let base = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../packages/design-data-spec/conformance/resolution")
            .join(case);

        let query_text = std::fs::read_to_string(base.join("query.json"))
            .unwrap_or_else(|e| panic!("{case}: failed to read query.json: {e}"));
        let query: Value = serde_json::from_str(&query_text)
            .unwrap_or_else(|e| panic!("{case}: invalid query.json: {e}"));

        let expected_text = std::fs::read_to_string(base.join("expected.json"))
            .unwrap_or_else(|e| panic!("{case}: failed to read expected.json: {e}"));
        let expected: Value = serde_json::from_str(&expected_text)
            .unwrap_or_else(|e| panic!("{case}: invalid expected.json: {e}"));

        let property = query["property"]
            .as_str()
            .unwrap_or_else(|| panic!("{case}: query.json missing 'property'"));

        let ctx_map: HashMap<String, String> = query
            .get("context")
            .and_then(|v| v.as_object())
            .map(|o| {
                o.iter()
                    .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                    .collect()
            })
            .unwrap_or_default();

        let mut ctx = ResolutionContext::new();
        for (k, v) in ctx_map {
            ctx = ctx.with(k, v);
        }

        let mut graph = TokenGraph::from_json_dir(&base.join("input"))
            .unwrap_or_else(|e| panic!("{case}: failed to load tokens: {e}"));

        let dims_dir = base.join("dimensions");
        if dims_dir.is_dir() {
            let dims = TokenGraph::load_spec_dimensions(&dims_dir)
                .unwrap_or_else(|e| panic!("{case}: failed to load dimensions: {e}"));
            graph = graph.with_dimensions(dims);
        }

        // Filter to property.
        let candidates: Vec<_> = graph
            .tokens
            .values()
            .filter(|t| {
                t.raw
                    .get("name")
                    .and_then(|v| v.as_object())
                    .and_then(|n| n.get("property"))
                    .and_then(|v| v.as_str())
                    == Some(property)
            })
            .collect();

        let filtered = TokenGraph::from_pairs(
            candidates
                .iter()
                .map(|t| (t.name.clone(), t.file.clone(), t.raw.clone()))
                .collect(),
        )
        .with_dimensions(graph.dimensions.clone());

        let should_resolve = expected["resolved"].as_bool().unwrap_or(true);
        let winner = resolve(&filtered, &ctx);

        if should_resolve {
            let winner = winner.unwrap_or_else(|| {
                panic!("{case}: expected resolution but got None");
            });
            if let Some(expected_uuid) = expected["expected_uuid"].as_str() {
                let actual_uuid = winner.raw.get("uuid").and_then(|v| v.as_str());
                assert_eq!(
                    actual_uuid,
                    Some(expected_uuid),
                    "{case}: wrong token selected (uuid mismatch)"
                );
            }
        } else {
            assert!(
                winner.is_none(),
                "{case}: expected no resolution but got a winner"
            );
        }
    }

    #[test]
    fn base_fallback() {
        run_fixture("base-fallback");
    }

    #[test]
    fn specificity_wins() {
        run_fixture("specificity-wins");
    }

    #[test]
    fn alias_resolved_after_cascade() {
        run_fixture("alias-resolved-after-cascade");
    }
}

/// Migration roundtrip tests — closes #769.
#[cfg(test)]
mod migration_roundtrip {
    use std::path::PathBuf;

    use serde_json::json;

    use crate::graph::TokenGraph;
    use crate::migrate::convert_token;

    #[test]
    fn color_set_roundtrip_loadable_in_graph() {
        // Convert a color-set token to cascade format.
        let tokens = convert_token(
            "overlay-opacity",
            json!({
                "$schema": ".../color-set.json",
                "sets": {
                    "light":     { "$schema": ".../opacity.json", "value": "0.4", "uuid": "rt-0001-0000-0000-000000000001" },
                    "dark":      { "$schema": ".../opacity.json", "value": "0.6", "uuid": "rt-0001-0000-0000-000000000002" },
                    "wireframe": { "$schema": ".../opacity.json", "value": "0.4", "uuid": "rt-0001-0000-0000-000000000003" }
                }
            })
            .as_object()
            .unwrap(),
        );
        assert_eq!(tokens.len(), 3);

        // Load the output tokens into a TokenGraph (simulating what from_json_dir does
        // for cascade arrays).
        let pairs: Vec<_> = tokens
            .iter()
            .enumerate()
            .map(|(_i, v)| {
                let uuid = v["uuid"].as_str().unwrap_or("").to_string();
                (uuid, PathBuf::from("output.tokens.json"), v.clone())
            })
            .collect();
        let graph = TokenGraph::from_pairs(pairs);
        assert_eq!(
            graph.tokens.len(),
            3,
            "all 3 cascade tokens should be in graph"
        );

        // All tokens should carry the property name.
        for t in graph.tokens.values() {
            let property = t.raw["name"]["property"].as_str().unwrap();
            assert_eq!(property, "overlay-opacity");
        }
    }

    #[test]
    fn scale_set_roundtrip_resolves_in_context() {
        use crate::cascade::{resolve, ResolutionContext};
        use crate::graph::{DimensionRecord, TokenGraph};

        let tokens = convert_token(
            "spacing-100",
            json!({
                "$schema": ".../scale-set.json",
                "sets": {
                    "desktop": { "$schema": ".../dimension.json", "value": "8px",  "uuid": "rt-0002-0000-0000-000000000001" },
                    "mobile":  { "$schema": ".../dimension.json", "value": "10px", "uuid": "rt-0002-0000-0000-000000000002" }
                }
            })
            .as_object()
            .unwrap(),
        );

        let pairs: Vec<_> = tokens
            .iter()
            .map(|v| {
                let uuid = v["uuid"].as_str().unwrap_or("").to_string();
                (uuid, PathBuf::from("output.tokens.json"), v.clone())
            })
            .collect();
        let graph = TokenGraph::from_pairs(pairs).with_dimensions(vec![DimensionRecord {
            file: PathBuf::from("scale.json"),
            name: "scale".into(),
            modes: vec!["desktop".into(), "mobile".into()],
            default_mode: "desktop".into(),
        }]);

        let ctx = ResolutionContext::new().with("scale", "mobile");
        let winner = resolve(&graph, &ctx).expect("should resolve for mobile");
        assert_eq!(winner.raw["value"].as_str(), Some("10px"));

        let ctx = ResolutionContext::new().with("scale", "desktop");
        let winner = resolve(&graph, &ctx).expect("should resolve for desktop");
        assert_eq!(winner.raw["value"].as_str(), Some("8px"));
    }
}
