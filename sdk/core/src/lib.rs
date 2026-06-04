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

pub mod authoring;
#[cfg(feature = "cache")]
pub mod cache;
pub mod cascade;
pub mod compat;
pub mod data_source;
pub mod diff;
pub mod discovery;
#[cfg(feature = "figma")]
pub mod figma;
pub mod graph;
pub mod legacy;
pub mod manifest;
pub mod migrate;
pub mod naming;
pub mod query;
pub mod registry;
pub mod report;
pub mod schema;
pub mod suggest;
pub mod validate;
pub mod write;

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
        "token property '{0}' has tokens across multiple mode sets and cannot be represented \
         in legacy set format; convert individual mode-set slices separately"
    )]
    MultiModeSetToken(String),
    #[error("query parse error: {0}")]
    QueryParse(String),
    #[error("parse error: {0}")]
    ParseError(String),
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

    use crate::graph::{ModeSetRecord, TokenGraph};
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
    fn spec005_mode_set_default_not_in_modes() {
        let g = TokenGraph::default().with_mode_sets(vec![ModeSetRecord {
            file: PathBuf::from("mode-set.json"),
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
        let g = TokenGraph::from_pairs(vec![(
            "dark-only".into(),
            PathBuf::from("a.json"),
            json!({"name": {"property": "bg", "colorScheme": "dark"}, "value": "#000"}),
        )])
        .with_mode_sets(vec![ModeSetRecord {
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

    #[test]
    fn spec010_replaced_by_target_not_found() {
        let g = TokenGraph::from_pairs(vec![(
            "dep".into(),
            PathBuf::from("t.json"),
            json!({
                "name": {"property": "old"},
                "uuid": "aaaaaaaa-0001-4000-8000-000000000001",
                "deprecated": "3.0.0",
                "replaced_by": "bbbbbbbb-9999-4000-8000-000000000099",
                "value": "#fff"
            }),
        )]);
        assert!(!diagnostics_for_rule(&g, "SPEC-010").is_empty());
    }

    #[test]
    fn spec010_replaced_by_target_exists_no_error() {
        let g = TokenGraph::from_pairs(vec![
            (
                "dep".into(),
                PathBuf::from("t.json"),
                json!({
                    "name": {"property": "old"},
                    "uuid": "aaaaaaaa-0001-4000-8000-000000000001",
                    "deprecated": "3.0.0",
                    "replaced_by": "aaaaaaaa-0002-4000-8000-000000000001",
                    "value": "#fff"
                }),
            ),
            (
                "new".into(),
                PathBuf::from("t.json"),
                json!({
                    "name": {"property": "new"},
                    "uuid": "aaaaaaaa-0002-4000-8000-000000000001",
                    "value": "#000"
                }),
            ),
        ]);
        assert!(diagnostics_for_rule(&g, "SPEC-010").is_empty());
    }

    #[test]
    fn spec011_replaced_by_array_missing_comment() {
        let g = TokenGraph::from_pairs(vec![(
            "split".into(),
            PathBuf::from("t.json"),
            json!({
                "name": {"property": "split"},
                "uuid": "aaaaaaaa-0001-4000-8000-000000000001",
                "deprecated": "3.0.0",
                "replaced_by": ["aaaaaaaa-0002-4000-8000-000000000001"],
                "value": "#fff"
            }),
        )]);
        assert!(!diagnostics_for_rule(&g, "SPEC-011").is_empty());
    }

    #[test]
    fn spec012_replaced_by_without_deprecated() {
        let g = TokenGraph::from_pairs(vec![(
            "bad".into(),
            PathBuf::from("t.json"),
            json!({
                "name": {"property": "bad"},
                "uuid": "aaaaaaaa-0001-4000-8000-000000000001",
                "replaced_by": "aaaaaaaa-0002-4000-8000-000000000001",
                "value": "#fff"
            }),
        )]);
        assert!(!diagnostics_for_rule(&g, "SPEC-012").is_empty());
    }

    #[test]
    fn spec013_planned_removal_without_deprecated() {
        let g = TokenGraph::from_pairs(vec![(
            "bad".into(),
            PathBuf::from("t.json"),
            json!({
                "name": {"property": "bad"},
                "uuid": "aaaaaaaa-0001-4000-8000-000000000001",
                "plannedRemoval": "4.0.0",
                "value": "#fff"
            }),
        )]);
        assert!(!diagnostics_for_rule(&g, "SPEC-013").is_empty());
    }

    #[test]
    fn spec013_planned_removal_precedes_deprecated() {
        let g = TokenGraph::from_pairs(vec![(
            "bad".into(),
            PathBuf::from("t.json"),
            json!({
                "name": {"property": "bad"},
                "uuid": "aaaaaaaa-0001-4000-8000-000000000001",
                "deprecated": "3.2.0",
                "plannedRemoval": "3.1.0",
                "value": "#fff"
            }),
        )]);
        let diags = diagnostics_for_rule(&g, "SPEC-013");
        assert!(!diags.is_empty(), "should catch preceding plannedRemoval");
        assert!(
            diags[0].message.contains("preceding"),
            "message should mention version ordering"
        );
    }

    #[test]
    fn spec013_valid_planned_removal_no_error() {
        let g = TokenGraph::from_pairs(vec![(
            "ok".into(),
            PathBuf::from("t.json"),
            json!({
                "name": {"property": "ok"},
                "uuid": "aaaaaaaa-0001-4000-8000-000000000001",
                "deprecated": "3.2.0",
                "plannedRemoval": "4.0.0",
                "value": "#fff"
            }),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-013").is_empty());
    }

    #[test]
    fn spec013_multi_digit_semver_ordering() {
        // 3.10.0 > 3.2.0, so this is valid — should not error.
        let g = TokenGraph::from_pairs(vec![(
            "ok".into(),
            PathBuf::from("t.json"),
            json!({
                "name": {"property": "ok"},
                "uuid": "aaaaaaaa-0001-4000-8000-000000000001",
                "deprecated": "3.2.0",
                "plannedRemoval": "3.10.0",
                "value": "#fff"
            }),
        )]);
        assert!(
            diagnostics_for_rule(&g, "SPEC-013").is_empty(),
            "3.10.0 > 3.2.0 — should not error"
        );
    }
}

/// Validation conformance tests — fixture-driven, exercises relational rules
/// against `packages/design-data-spec/conformance/{invalid,valid}/` fixtures.
///
/// Each fixture directory contains `dataset.json` (neutral interchange format:
/// `{ tokens, components, modeSets }`) and `expected-errors.json` (list of
/// `{ rule_id, severity, message_pattern }` entries). Dirs without `dataset.json`
/// are legacy-only and skipped until migrated.
#[cfg(test)]
mod validation_conformance {
    use std::collections::HashSet;
    use std::path::Path;

    use regex::Regex;
    use serde_json::Value;

    use crate::graph::{ComponentRecord, ModeSetRecord, TokenGraph};
    use crate::naming::NamingExceptionsFile;
    use crate::report::Severity;
    use crate::validate::rules::{default_rules, run_rules};

    fn severity_str(s: &Severity) -> &'static str {
        match s {
            Severity::Error => "error",
            Severity::Warning => "warning",
            Severity::Info => "info",
        }
    }

    fn build_graph(dataset: &Value) -> TokenGraph {
        use crate::graph::{extract_alias_target, Layer, TokenRecord};

        let tokens_json = dataset
            .get("tokens")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();

        let records: Vec<TokenRecord> = tokens_json
            .into_iter()
            .enumerate()
            .map(|(i, raw)| {
                // For string names use the string directly (SPEC-007 roundtrip checks t.name).
                // For object names generate a unique key from index.
                let key = raw
                    .get("name")
                    .and_then(|n| n.as_str())
                    .map(String::from)
                    .unwrap_or_else(|| format!("token-{i}"));
                // Optional "$layer" field lets fixtures exercise multi-layer rules (e.g. SPEC-032).
                let layer = raw
                    .get("$layer")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(Layer::Foundation);
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
                TokenRecord {
                    name: key,
                    file: std::path::PathBuf::from("dataset.json"),
                    index: i,
                    schema_url,
                    uuid,
                    alias_target,
                    raw,
                    layer,
                }
            })
            .collect();

        let mut graph = TokenGraph::from_records(records);

        if let Some(comps) = dataset.get("components").and_then(|v| v.as_array()) {
            let comp_records: Vec<ComponentRecord> = comps
                .iter()
                .filter_map(|v| {
                    let name = v.get("name")?.as_str()?.to_string();
                    Some(ComponentRecord {
                        name,
                        file: std::path::PathBuf::from("dataset.json"),
                        raw: v.clone(),
                    })
                })
                .collect();
            graph = graph.with_components(comp_records);
        }

        if let Some(mode_sets) = dataset.get("modeSets").and_then(|v| v.as_array()) {
            let ms_records: Vec<ModeSetRecord> = mode_sets
                .iter()
                .filter_map(|v| {
                    let name = v.get("name")?.as_str()?.to_string();
                    let default_mode = v.get("default")?.as_str()?.to_string();
                    let modes: Vec<String> = v
                        .get("modes")?
                        .as_array()?
                        .iter()
                        .filter_map(|m| m.as_str().map(String::from))
                        .collect();
                    Some(ModeSetRecord {
                        file: std::path::PathBuf::from("dataset.json"),
                        name,
                        modes,
                        default_mode,
                    })
                })
                .collect();
            graph = graph.with_mode_sets(ms_records);
        }

        graph
    }

    fn load_naming_exceptions() -> HashSet<String> {
        let path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../packages/tokens/naming-exceptions.json");
        NamingExceptionsFile::load(&path)
            .map(|f| f.token_set())
            .unwrap_or_default()
    }

    fn load_manifest(dir: &Path) -> Option<Value> {
        let mp = dir.join("manifest.json");
        if mp.is_file() {
            std::fs::read_to_string(&mp)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
        } else {
            None
        }
    }

    fn assert_invalid_fixtures() {
        let base = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../packages/design-data-spec/conformance/invalid");
        let naming_exceptions = load_naming_exceptions();
        // Only assert on rules that are registered. Phase 2+ adds the remaining rules;
        // their fixtures are discovered but their assertions are skipped until then.
        let registered: std::collections::HashSet<String> =
            default_rules().iter().map(|r| r.id().to_string()).collect();
        let mut failures = Vec::new();

        let mut dirs: Vec<_> = std::fs::read_dir(&base)
            .expect("conformance/invalid dir missing")
            .filter_map(|e| e.ok())
            .filter(|e| e.path().is_dir())
            .collect();
        dirs.sort_by_key(|e| e.path());

        for entry in dirs {
            let dir = entry.path();
            let dataset_path = dir.join("dataset.json");
            if !dataset_path.exists() {
                // Legacy-only fixture: skipped until migrated in Phase 4.
                continue;
            }
            let expected_path = dir.join("expected-errors.json");
            let case = dir.file_name().unwrap().to_string_lossy().to_string();

            let dataset: Value = serde_json::from_str(
                &std::fs::read_to_string(&dataset_path)
                    .unwrap_or_else(|e| panic!("{case}: failed to read dataset.json: {e}")),
            )
            .unwrap_or_else(|e| panic!("{case}: invalid dataset.json: {e}"));

            let expected: Value = serde_json::from_str(
                &std::fs::read_to_string(&expected_path)
                    .unwrap_or_else(|e| panic!("{case}: failed to read expected-errors.json: {e}")),
            )
            .unwrap_or_else(|e| panic!("{case}: invalid expected-errors.json: {e}"));

            // Load optional manifest.json alongside dataset.json (used by SPEC-039).
            let manifest_val = load_manifest(&dir);

            let graph = build_graph(&dataset);
            let diagnostics = run_rules(&graph, &naming_exceptions, manifest_val.as_ref());

            let expected_errors = expected
                .get("errors")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();

            for expected_err in &expected_errors {
                let rule_id = expected_err
                    .get("rule_id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                // Skip assertions for rules not yet implemented in Rust.
                if !registered.contains(rule_id) {
                    continue;
                }
                let severity = expected_err
                    .get("severity")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let pattern = expected_err
                    .get("message_pattern")
                    .and_then(|v| v.as_str())
                    .unwrap_or(".*");
                let re = Regex::new(pattern)
                    .unwrap_or_else(|e| panic!("{case}: invalid message_pattern {pattern:?}: {e}"));

                let matched = diagnostics.iter().any(|d| {
                    d.rule_id.as_deref() == Some(rule_id)
                        && severity_str(&d.severity) == severity
                        && re.is_match(&d.message)
                });

                if !matched {
                    let got: Vec<String> = diagnostics
                        .iter()
                        .map(|d| {
                            format!(
                                "[{} {}] {}",
                                d.rule_id.as_deref().unwrap_or("?"),
                                severity_str(&d.severity),
                                d.message
                            )
                        })
                        .collect();
                    failures.push(format!(
                        "{case}: no diagnostic matched rule_id={rule_id:?} severity={severity:?} pattern={pattern:?}\n  Got: [{}]",
                        got.join("; ")
                    ));
                }
            }
        }

        assert!(
            failures.is_empty(),
            "Validation conformance failures:\n{}",
            failures.join("\n")
        );
    }

    fn assert_valid_fixtures() {
        let base = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../packages/design-data-spec/conformance/valid");
        let naming_exceptions = load_naming_exceptions();
        let mut failures = Vec::new();

        let mut dirs: Vec<_> = std::fs::read_dir(&base)
            .expect("conformance/valid dir missing")
            .filter_map(|e| e.ok())
            .filter(|e| e.path().is_dir())
            .collect();
        dirs.sort_by_key(|e| e.path());

        for entry in dirs {
            let dir = entry.path();
            let dataset_path = dir.join("dataset.json");
            if !dataset_path.exists() {
                continue;
            }
            let case = dir.file_name().unwrap().to_string_lossy().to_string();
            let dataset: Value = serde_json::from_str(
                &std::fs::read_to_string(&dataset_path)
                    .unwrap_or_else(|e| panic!("{case}: failed to read dataset.json: {e}")),
            )
            .unwrap_or_else(|e| panic!("{case}: invalid dataset.json: {e}"));

            let manifest_val = load_manifest(&dir);

            let graph = build_graph(&dataset);
            let diagnostics = run_rules(&graph, &naming_exceptions, manifest_val.as_ref());
            let errors: Vec<_> = diagnostics
                .iter()
                .filter(|d| matches!(d.severity, Severity::Error))
                .collect();

            // Deliberate policy: only error-severity diagnostics fail the valid
            // fixture. Warnings (e.g. undocumented custom states/slots) may still
            // fire on intentionally minimal valid fixtures.
            if !errors.is_empty() {
                failures.push(format!(
                    "{case}: expected no errors but got: {}",
                    errors
                        .iter()
                        .map(|d| d.message.as_str())
                        .collect::<Vec<_>>()
                        .join("; ")
                ));
            }
        }

        assert!(
            failures.is_empty(),
            "Valid fixture failures:\n{}",
            failures.join("\n")
        );
    }

    #[test]
    fn invalid_fixtures_match_expected() {
        assert_invalid_fixtures();
    }

    #[test]
    fn valid_fixtures_produce_no_errors() {
        assert_valid_fixtures();
    }
}

/// SPEC-044 dataset-structure conformance — directory-based fixtures.
///
/// Unlike [`validation_conformance`] (in-memory `dataset.json` graphs), SPEC-044
/// inspects the on-disk directory layout, so each fixture under
/// `conformance/invalid/SPEC-044/<case>/` and `conformance/valid/SPEC-044/` is a
/// **real dataset tree**. [`check_dataset_structure`](crate::validate::dataset_structure::check_dataset_structure)
/// is run directly against the case directory and matched against
/// `expected-errors.json`. Kept separate from `validation_conformance` so the
/// graph-based harness is untouched (it skips dirs without `dataset.json`).
#[cfg(test)]
mod dataset_structure_conformance {
    use std::path::Path;

    use regex::Regex;
    use serde_json::Value;

    use crate::report::Severity;
    use crate::validate::dataset_structure::check_dataset_structure;

    fn severity_str(s: &Severity) -> &'static str {
        match s {
            Severity::Error => "error",
            Severity::Warning => "warning",
            Severity::Info => "info",
        }
    }

    #[test]
    fn invalid_spec044_fixtures_match_expected() {
        let base = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../packages/design-data-spec/conformance/invalid/SPEC-044");
        let mut cases: Vec<_> = std::fs::read_dir(&base)
            .expect("conformance/invalid/SPEC-044 dir missing")
            .filter_map(|e| e.ok())
            .filter(|e| e.path().is_dir())
            .collect();
        cases.sort_by_key(|e| e.path());

        let mut failures = Vec::new();
        for entry in cases {
            let dir = entry.path();
            let case = dir.file_name().unwrap().to_string_lossy().to_string();
            let expected_path = dir.join("expected-errors.json");
            let expected: Value = serde_json::from_str(
                &std::fs::read_to_string(&expected_path)
                    .unwrap_or_else(|e| panic!("{case}: failed to read expected-errors.json: {e}")),
            )
            .unwrap_or_else(|e| panic!("{case}: invalid expected-errors.json: {e}"));

            let diagnostics = check_dataset_structure(&dir);
            let expected_errors = expected
                .get("errors")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();

            for expected_err in &expected_errors {
                let rule_id = expected_err
                    .get("rule_id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let severity = expected_err
                    .get("severity")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let pattern = expected_err
                    .get("message_pattern")
                    .and_then(|v| v.as_str())
                    .unwrap_or(".*");
                let re = Regex::new(pattern)
                    .unwrap_or_else(|e| panic!("{case}: invalid message_pattern {pattern:?}: {e}"));

                let matched = diagnostics.iter().any(|d| {
                    d.rule_id.as_deref() == Some(rule_id)
                        && severity_str(&d.severity) == severity
                        && re.is_match(&d.message)
                });

                if !matched {
                    let got: Vec<String> = diagnostics
                        .iter()
                        .map(|d| {
                            format!(
                                "[{} {}] {}",
                                d.rule_id.as_deref().unwrap_or("?"),
                                severity_str(&d.severity),
                                d.message
                            )
                        })
                        .collect();
                    failures.push(format!(
                        "{case}: no diagnostic matched rule_id={rule_id:?} severity={severity:?} pattern={pattern:?}\n  Got: [{}]",
                        got.join("; ")
                    ));
                }
            }
        }

        assert!(
            failures.is_empty(),
            "SPEC-044 conformance failures:\n{}",
            failures.join("\n")
        );
    }

    #[test]
    fn valid_spec044_fixture_has_no_errors() {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../packages/design-data-spec/conformance/valid/SPEC-044");
        let diagnostics = check_dataset_structure(&dir);
        let errors: Vec<_> = diagnostics
            .iter()
            .filter(|d| matches!(d.severity, Severity::Error))
            .collect();
        assert!(
            errors.is_empty(),
            "expected no errors for valid SPEC-044 fixture, got: {errors:?}"
        );
    }
}

/// Resolution conformance tests — fixture-driven, closes #768.
///
/// Each test case lives under `packages/design-data-spec/conformance/resolution/<name>/`
/// with `input/` (cascade tokens), optional `mode-sets/`, `query.json`, and `expected.json`.
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

        let mode_sets_dir = base.join("mode-sets");
        if mode_sets_dir.is_dir() {
            let mode_sets = TokenGraph::load_spec_mode_sets(&mode_sets_dir)
                .unwrap_or_else(|e| panic!("{case}: failed to load mode sets: {e}"));
            graph = graph.with_mode_sets(mode_sets);
        }

        // Optionally load a product-context.json to test multi-layer resolution.
        let product_context_path = base.join("product-context.json");
        if product_context_path.is_file() {
            graph
                .load_product_context(&product_context_path)
                .unwrap_or_else(|e| panic!("{case}: failed to load product-context.json: {e}"));
        }

        // Filter to property, preserving layer info via from_records.
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
            .cloned()
            .collect();

        let filtered = TokenGraph::from_records(candidates).with_mode_sets(graph.mode_sets.clone());

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
            if let Some(expected_value) = expected.get("expected_value") {
                let actual_value = winner.raw.get("value");
                assert_eq!(
                    actual_value,
                    Some(expected_value),
                    "{case}: wrong value resolved"
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

    #[test]
    fn product_layer_wins() {
        run_fixture("product-layer-wins");
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
            .map(|v| {
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
        use crate::graph::{ModeSetRecord, TokenGraph};

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
        let graph = TokenGraph::from_pairs(pairs).with_mode_sets(vec![ModeSetRecord {
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

/// Diff conformance tests — fixture-driven, closes #788.
///
/// Each test case lives under `packages/design-data-spec/conformance/diff/<name>/`
/// with `old/` (old tokens), `new/` (new tokens), and `expected.json` (DiffReport).
#[cfg(test)]
mod diff_conformance {
    use std::path::Path;

    use serde_json::Value;

    use crate::diff::semantic_diff;
    use crate::graph::TokenGraph;

    fn run_fixture(case: &str) {
        let base = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../packages/design-data-spec/conformance/diff")
            .join(case);

        let old = TokenGraph::from_json_dir(&base.join("old"))
            .unwrap_or_else(|e| panic!("{case}: failed to load old/: {e}"));
        let new = TokenGraph::from_json_dir(&base.join("new"))
            .unwrap_or_else(|e| panic!("{case}: failed to load new/: {e}"));

        let report = semantic_diff(&old, &new);

        let actual: Value = serde_json::to_value(&report)
            .unwrap_or_else(|e| panic!("{case}: failed to serialize report: {e}"));

        let expected_text = std::fs::read_to_string(base.join("expected.json"))
            .unwrap_or_else(|e| panic!("{case}: failed to read expected.json: {e}"));
        let expected: Value = serde_json::from_str(&expected_text)
            .unwrap_or_else(|e| panic!("{case}: invalid expected.json: {e}"));

        for key in [
            "renamed",
            "deprecated",
            "reverted",
            "added",
            "deleted",
            "updated",
        ] {
            let actual_arr = actual.get(key).and_then(|v| v.as_array());
            let expected_arr = expected.get(key).and_then(|v| v.as_array());
            assert_eq!(
                actual_arr,
                expected_arr,
                "{case}: mismatch in '{key}'\n  actual:   {}\n  expected: {}",
                serde_json::to_string_pretty(&actual_arr).unwrap_or_default(),
                serde_json::to_string_pretty(&expected_arr).unwrap_or_default(),
            );
        }
    }

    #[test]
    fn identical_tokens() {
        run_fixture("identical-tokens");
    }

    #[test]
    fn simple_add_delete() {
        run_fixture("simple-add-delete");
    }

    #[test]
    fn rename_by_uuid() {
        run_fixture("rename-by-uuid");
    }

    #[test]
    fn deprecated_new_token() {
        run_fixture("deprecated-new-token");
    }

    #[test]
    fn deprecated_set_level() {
        run_fixture("deprecated-set-level");
    }

    #[test]
    fn reverted_token() {
        run_fixture("reverted-token");
    }

    #[test]
    fn matched_gaining_deprecated() {
        run_fixture("matched-gaining-deprecated");
    }

    #[test]
    fn property_value_update() {
        run_fixture("property-value-update");
    }

    #[test]
    fn property_nested_change() {
        run_fixture("property-nested-change");
    }

    #[test]
    fn uuid_backfill() {
        run_fixture("uuid-backfill");
    }

    #[test]
    fn cross_format() {
        run_fixture("cross-format");
    }

    #[test]
    fn rename_with_property_changes() {
        run_fixture("rename-with-property-changes");
    }

    #[test]
    fn replaced_by_pairing() {
        run_fixture("replaced-by-pairing");
    }
}

/// Query conformance tests — fixture-driven, closes #788.
///
/// Each test case lives under `packages/design-data-spec/conformance/query/<name>/`
/// with `input/` (tokens), `query.txt` (filter expression), and `expected.json`
/// (sorted array of matched token UUIDs).
#[cfg(test)]
mod query_conformance {
    use std::path::Path;

    use serde_json::Value;

    use crate::graph::TokenGraph;
    use crate::query;

    fn run_fixture(case: &str) {
        let base = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../packages/design-data-spec/conformance/query")
            .join(case);

        let graph = TokenGraph::from_json_dir(&base.join("input"))
            .unwrap_or_else(|e| panic!("{case}: failed to load input/: {e}"));

        let query_text = std::fs::read_to_string(base.join("query.txt"))
            .unwrap_or_else(|e| panic!("{case}: failed to read query.txt: {e}"));

        let filter_expr =
            query::parse(&query_text).unwrap_or_else(|e| panic!("{case}: query parse error: {e}"));
        let results = query::filter(&graph, &filter_expr);

        let mut actual_uuids: Vec<String> = results.iter().filter_map(|t| t.uuid.clone()).collect();
        actual_uuids.sort();

        let expected_text = std::fs::read_to_string(base.join("expected.json"))
            .unwrap_or_else(|e| panic!("{case}: failed to read expected.json: {e}"));
        let expected: Value = serde_json::from_str(&expected_text)
            .unwrap_or_else(|e| panic!("{case}: invalid expected.json: {e}"));
        let expected_uuids: Vec<String> = expected
            .as_array()
            .unwrap_or_else(|| panic!("{case}: expected.json must be an array"))
            .iter()
            .filter_map(|v| v.as_str().map(String::from))
            .collect();

        assert_eq!(
            actual_uuids, expected_uuids,
            "{case}: UUID mismatch\n  actual:   {actual_uuids:?}\n  expected: {expected_uuids:?}"
        );
    }

    #[test]
    fn single_field() {
        run_fixture("single-field");
    }

    #[test]
    fn and_conditions() {
        run_fixture("and-conditions");
    }

    #[test]
    fn or_conditions() {
        run_fixture("or-conditions");
    }

    #[test]
    fn negation() {
        run_fixture("negation");
    }

    #[test]
    fn wildcard_suffix() {
        run_fixture("wildcard-suffix");
    }

    #[test]
    fn wildcard_prefix() {
        run_fixture("wildcard-prefix");
    }

    #[test]
    fn empty_matches_all() {
        run_fixture("empty-matches-all");
    }

    #[test]
    fn no_matches() {
        run_fixture("no-matches");
    }

    #[test]
    fn schema_key() {
        run_fixture("schema-key");
    }

    #[test]
    fn and_or_precedence() {
        run_fixture("and-or-precedence");
    }
}
