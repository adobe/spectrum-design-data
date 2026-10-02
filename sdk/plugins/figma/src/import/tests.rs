// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use std::collections::HashMap;
use std::io::Write;
use std::path::PathBuf;

use serde_json::json;
use serde_json::Value;

use super::diff::*;
use super::naming::*;
use super::overrides::*;
use super::pair::*;
use super::resolve::*;
use crate::types::{FigmaVariable, VariablesMeta};
use design_data_core::graph::TokenGraph;

fn mock_variable(
    name: &str,
    resolved_type: &str,
    values_by_mode: Vec<(&str, Value)>,
) -> FigmaVariable {
    FigmaVariable {
        id: format!("var-{name}"),
        name: name.to_string(),
        key: "k".to_string(),
        variable_collection_id: "col-1".to_string(),
        resolved_type: resolved_type.to_string(),
        values_by_mode: values_by_mode
            .into_iter()
            .map(|(mode, v)| (mode.to_string(), v))
            .collect(),
        remote: false,
        description: String::new(),
        hidden_from_publishing: false,
        scopes: vec![],
        code_syntax: HashMap::new(),
    }
}

fn mock_meta(variables: Vec<FigmaVariable>) -> VariablesMeta {
    VariablesMeta {
        variables: variables.into_iter().map(|v| (v.id.clone(), v)).collect(),
        variable_collections: HashMap::new(),
    }
}

/// A one-token graph, loaded through the real `from_json_dir` path (same
/// as the object-format fixtures `mapping.rs`'s export tests use) so the
/// uuid/legacy-name indexes are populated exactly as they are in production.
fn mock_graph(legacy_key: &str, uuid: &str, value: Value) -> TokenGraph {
    mock_graph_with_schema(legacy_key, uuid, value, "https://example.com/color.json")
}

fn mock_graph_with_schema(legacy_key: &str, uuid: &str, value: Value, schema: &str) -> TokenGraph {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("tokens.json");
    let mut f = std::fs::File::create(&path).unwrap();
    write!(
        f,
        "{}",
        json!({
            legacy_key: {
                "$schema": schema,
                "name": legacy_key,
                "value": value,
                "uuid": uuid,
            }
        })
    )
    .unwrap();
    TokenGraph::from_json_dir(dir.path()).unwrap()
}

/// A multi-token graph from full token JSON objects (`name` may be a
/// cascade object, unlike `mock_graph`'s flat-string `name`) — needed
/// for [`pair_by_value`] tests, which match/disambiguate by value across
/// several design-data tokens at once.
fn mock_graph_multi(tokens: Vec<(&str, Value)>) -> TokenGraph {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("tokens.json");
    let obj: serde_json::Map<String, Value> = tokens
        .into_iter()
        .map(|(key, token)| (key.to_string(), token))
        .collect();
    let mut f = std::fs::File::create(&path).unwrap();
    write!(f, "{}", Value::Object(obj)).unwrap();
    TokenGraph::from_json_dir(dir.path()).unwrap()
}

#[test]
fn pair_by_value_matches_unresolvable_name_by_value() {
    // "Alias/accent-color-default" doesn't invert to any known legacy
    // key (design-data's key is "accent-background-color-default"), but
    // its value matches exactly one design-data token.
    let target = mock_variable(
        "Palette/orange/500",
        "COLOR",
        vec![(
            "m-modeless",
            json!({"r": 1.0, "g": 0.5019607843137255, "b": 0.0, "a": 1.0}),
        )],
    );
    let alias = mock_variable(
        "Alias/accent-color-default",
        "COLOR",
        vec![(
            "m-modeless",
            json!({"type": "VARIABLE_ALIAS", "id": target.id.clone()}),
        )],
    );
    let meta = mock_meta_modeless(vec![target, alias]);

    let graph = mock_graph_multi(vec![(
        "accent-background-color-default",
        json!({
            "$schema": "https://example.com/color.json",
            "name": {
                "colorRole": "accent",
                "object": "background",
                "state": ["default"],
                "legacyKey": "accent-background-color-default",
            },
            "value": "#ff8000",
            "uuid": "u1",
        }),
    )]);

    let report = pair_by_value(&meta, &graph, &["Alias/", "Icon/"], None);
    assert_eq!(
        report.candidates,
        vec![PairingCandidate {
            legacy_key: "accent-background-color-default".to_string(),
            figma_name: "Alias/accent-color-default".to_string(),
        }]
    );
    assert!(report.ambiguous.is_empty());
    assert!(report.unmatched.is_empty());
}

#[test]
fn pair_by_value_disambiguates_collision_by_path_segments() {
    // Two design-data tokens share the resolved value; only one's name
    // fields overlap with the Figma path's segments.
    let target = mock_variable(
        "Palette/orange/500",
        "COLOR",
        vec![(
            "m-modeless",
            json!({"r": 1.0, "g": 0.5019607843137255, "b": 0.0, "a": 1.0}),
        )],
    );
    let alias = mock_variable(
        "Alias/background/accent/default",
        "COLOR",
        vec![(
            "m-modeless",
            json!({"type": "VARIABLE_ALIAS", "id": target.id.clone()}),
        )],
    );
    let meta = mock_meta_modeless(vec![target, alias]);

    let graph = mock_graph_multi(vec![
        (
            "accent-background-color-default",
            json!({
                "$schema": "https://example.com/color.json",
                "name": {
                    "colorRole": "accent",
                    "object": "background",
                    "state": ["default"],
                    "legacyKey": "accent-background-color-default",
                },
                "value": "#ff8000",
                "uuid": "u1",
            }),
        ),
        (
            "informative-background-color-default",
            json!({
                "$schema": "https://example.com/color.json",
                "name": {
                    "colorRole": "informative",
                    "object": "background",
                    "state": ["default"],
                    "legacyKey": "informative-background-color-default",
                },
                "value": "#ff8000",
                "uuid": "u2",
            }),
        ),
    ]);

    let report = pair_by_value(&meta, &graph, &["Alias/", "Icon/"], None);
    assert_eq!(
        report.candidates,
        vec![PairingCandidate {
            legacy_key: "accent-background-color-default".to_string(),
            figma_name: "Alias/background/accent/default".to_string(),
        }]
    );
    assert!(report.ambiguous.is_empty());
}

#[test]
fn pair_by_value_leaves_true_word_tie_ambiguous() {
    // Two design-data tokens share the resolved value AND the exact same
    // word set (order differs, which the set-based Jaccard score ignores
    // by design) — neither name is a better match, so this must stay
    // ambiguous rather than the tiebreak guessing one.
    let target = mock_variable(
        "Palette/orange/500",
        "COLOR",
        vec![(
            "m-modeless",
            json!({"r": 1.0, "g": 0.5019607843137255, "b": 0.0, "a": 1.0}),
        )],
    );
    let alias = mock_variable(
        "Alias/accent/default",
        "COLOR",
        vec![(
            "m-modeless",
            json!({"type": "VARIABLE_ALIAS", "id": target.id.clone()}),
        )],
    );
    let meta = mock_meta_modeless(vec![target, alias]);

    let graph = mock_graph_multi(vec![
        (
            "accent-color-default",
            json!({
                "$schema": "https://example.com/color.json",
                "name": {"legacyKey": "accent-color-default"},
                "value": "#ff8000",
                "uuid": "u1",
            }),
        ),
        (
            "default-accent-color",
            json!({
                "$schema": "https://example.com/color.json",
                "name": {"legacyKey": "default-accent-color"},
                "value": "#ff8000",
                "uuid": "u2",
            }),
        ),
    ]);

    let report = pair_by_value(&meta, &graph, &["Alias/", "Icon/"], None);
    assert!(report.candidates.is_empty());
    assert_eq!(report.ambiguous, vec!["Alias/accent/default".to_string()]);
}

/// Bead `spectrum-design-data-11k.10.13`: `Heading/small` inverts (via
/// `normalize_typography_grouping`) to the CTR-only legacy key
/// `heading-small`, which lives only in `relationships/*.json`, not in
/// `graph.tokens`. Before the fix, the "already resolved" skip gate
/// checked only `by_key` (direct tokens), missed it, and let the
/// variable fall through to value-matching — where it collides in value
/// with two unrelated design-data tokens and lands in `ambiguous`, even
/// though `figma diff` already resolves it cleanly via
/// `resolve_relationship_ref` (same as `diff`/`naming`'s skip check).
#[test]
fn pair_by_value_skips_ctr_only_resolvable_name() {
    use design_data_core::graph::RelationshipRecord;

    let variable = mock_variable("Heading/small", "FLOAT", vec![("m-modeless", json!(16.0))]);
    let meta = mock_meta_modeless(vec![variable]);

    // Two unrelated design-data tokens happen to share the same value —
    // if the CTR gate didn't fire, `Heading/small` would collide with
    // both and (per `pair_by_value_leaves_true_word_tie_ambiguous`'s
    // tie logic) land in `ambiguous` instead of being skipped outright.
    let graph = mock_graph_multi(vec![
        (
            "some-other-dimension",
            json!({
                "$schema": "https://example.com/dimension.json",
                "name": {"legacyKey": "some-other-dimension"},
                "value": 16.0,
                "uuid": "u1",
            }),
        ),
        (
            "yet-another-dimension",
            json!({
                "$schema": "https://example.com/dimension.json",
                "name": {"legacyKey": "yet-another-dimension"},
                "value": 16.0,
                "uuid": "u2",
            }),
        ),
    ])
    .with_relationships(vec![RelationshipRecord {
        file: PathBuf::from("relationships/heading.json"),
        index: 0,
        uuid: Some("99999999-0000-0000-0000-000000000001".to_string()),
        raw: json!({
            "$schema": "https://example.com/dimension.json",
            "value": 16.0,
            "legacyKey": "heading-small",
        }),
    }]);

    let report = pair_by_value(&meta, &graph, &["Heading/", "Body/", "Title/"], None);
    assert!(report.candidates.is_empty());
    assert!(report.ambiguous.is_empty());
    assert!(report.unmatched.is_empty());
}

#[test]
fn pair_by_value_demotes_cross_variable_legacy_key_collision() {
    // Two different Figma variables both uniquely tiebreak to the same
    // legacy_key — a legacyKey -> figmaName mapping artifact can only
    // hold one figmaName per key, so neither pick was truly
    // distinguishing; both must fall back to ambiguous instead of one
    // candidate silently overwriting the other in the mapping artifact.
    let target = mock_variable(
        "Palette/orange/500",
        "COLOR",
        vec![(
            "m-modeless",
            json!({"r": 1.0, "g": 0.5019607843137255, "b": 0.0, "a": 1.0}),
        )],
    );
    let first = mock_variable(
        "Alias/content/neutral/default",
        "COLOR",
        vec![(
            "m-modeless",
            json!({"type": "VARIABLE_ALIAS", "id": target.id.clone()}),
        )],
    );
    let second = mock_variable(
        "Alias/content/typography/body",
        "COLOR",
        vec![(
            "m-modeless",
            json!({"type": "VARIABLE_ALIAS", "id": target.id.clone()}),
        )],
    );
    let meta = mock_meta_modeless(vec![target, first, second]);

    let graph = mock_graph_multi(vec![
        (
            "neutral-content-color-default",
            json!({
                "$schema": "https://example.com/color.json",
                "name": {"legacyKey": "neutral-content-color-default"},
                "value": "#ff8000",
                "uuid": "u1",
            }),
        ),
        (
            "gray-800",
            json!({
                "$schema": "https://example.com/color.json",
                "name": {"legacyKey": "gray-800"},
                "value": "#ff8000",
                "uuid": "u2",
            }),
        ),
    ]);

    let report = pair_by_value(&meta, &graph, &["Alias/", "Icon/"], None);
    assert!(report.candidates.is_empty());
    assert_eq!(
        report.ambiguous,
        vec![
            "Alias/content/neutral/default".to_string(),
            "Alias/content/typography/body".to_string(),
        ]
    );
}

#[test]
fn pair_by_value_reports_true_gap_as_unmatched() {
    // No design-data token holds this value at all (e.g. "app-frame",
    // which has no design-data counterpart) — a permanent figma-only.
    let variable = mock_variable(
        "Alias/app-frame",
        "COLOR",
        vec![(
            "m-modeless",
            json!({"r": 0.1, "g": 0.1, "b": 0.1, "a": 1.0}),
        )],
    );
    let meta = mock_meta_modeless(vec![variable]);
    let graph = mock_graph_multi(vec![(
        "accent-background-color-default",
        json!({
            "$schema": "https://example.com/color.json",
            "name": "accent-background-color-default",
            "value": "#ff8000",
            "uuid": "u1",
        }),
    )]);

    let report = pair_by_value(&meta, &graph, &["Alias/", "Icon/"], None);
    assert!(report.candidates.is_empty());
    assert_eq!(report.unmatched, vec!["Alias/app-frame".to_string()]);
}

/// A remote/library-linked variable must never be surfaced as a pairing
/// candidate — `diff_values`/`build_import_overrides` both skip these,
/// and a reviewer curating candidates has no way to act on one.
#[test]
fn pair_by_value_ignores_remote_variables() {
    let mut variable = mock_variable(
        "Alias/accent-color-default",
        "COLOR",
        vec![(
            "m-modeless",
            json!({"r": 1.0, "g": 0.5019607843137255, "b": 0.0, "a": 1.0}),
        )],
    );
    variable.remote = true;
    let meta = mock_meta_modeless(vec![variable]);
    let graph = mock_graph_multi(vec![(
        "accent-background-color-default",
        json!({
            "$schema": "https://example.com/color.json",
            "name": "accent-background-color-default",
            "value": "#ff8000",
            "uuid": "u1",
        }),
    )]);

    let report = pair_by_value(&meta, &graph, &["Alias/", "Icon/"], None);
    assert!(report.candidates.is_empty());
    assert!(report.ambiguous.is_empty());
    assert!(report.unmatched.is_empty());
}

/// The curated `S2.Color-theme` `--mapping` artifact is a hand-maintained
/// override on top of `pair_by_value`'s output — nothing re-derives it
/// from the fixture at test time, so a bad edit (e.g. two legacy_keys
/// silently pointing at the same figmaName, which `load_overrides`'
/// figmaName -> legacyKey reversal would then collapse into one) would
/// otherwise go unnoticed until someone ran `figma export` for real.
#[test]
fn s2_color_theme_mapping_fixture_has_no_duplicate_figma_names() {
    let raw = include_str!("../../tests/fixtures/figma/s2-color-theme.mapping.json");
    #[derive(serde::Deserialize)]
    struct MappingFile {
        overrides: HashMap<String, String>,
    }
    let mapping: MappingFile =
        serde_json::from_str(raw).expect("mapping fixture is valid {overrides: {...}} JSON");
    assert!(
        !mapping.overrides.is_empty(),
        "expected at least one curated override"
    );

    let mut seen_figma_names: HashMap<&str, &str> = HashMap::new();
    for (legacy_key, figma_name) in &mapping.overrides {
        if let Some(other_key) = seen_figma_names.insert(figma_name, legacy_key) {
            panic!(
                "figma_name {figma_name:?} is claimed by both {other_key:?} and \
                     {legacy_key:?} — load_overrides' reversed map can only keep one"
            );
        }
    }
}

/// A cyclic `VARIABLE_ALIAS` chain must fail closed via the depth guard,
/// not loop forever or panic.
#[test]
fn resolve_figma_value_stops_on_cyclic_alias_chain() {
    let a = mock_variable(
        "Alias/a",
        "COLOR",
        vec![(
            "m-modeless",
            json!({"type": "VARIABLE_ALIAS", "id": "var-Alias/b"}),
        )],
    );
    let b = mock_variable(
        "Alias/b",
        "COLOR",
        vec![(
            "m-modeless",
            json!({"type": "VARIABLE_ALIAS", "id": "var-Alias/a"}),
        )],
    );
    let meta = mock_meta_modeless(vec![a, b]);
    let alias_value = json!({"type": "VARIABLE_ALIAS", "id": "var-Alias/a"});
    assert_eq!(resolve_figma_value(&meta, &alias_value, 0, None), None);
}

/// Build a `VariablesMeta` with one Modeless collection ("col-1", the
/// same id [`mock_variable`] defaults to) so [`resolve_figma_value`] can
/// look up each alias target's default mode.
fn mock_meta_modeless(variables: Vec<FigmaVariable>) -> VariablesMeta {
    use super::super::types::{FigmaMode, FigmaVariableCollection};
    let collection = FigmaVariableCollection {
        id: "col-1".to_string(),
        name: "S2.Color-theme".to_string(),
        key: "k".to_string(),
        modes: vec![FigmaMode {
            mode_id: "m-modeless".to_string(),
            name: "Modeless".to_string(),
        }],
        default_mode_id: "m-modeless".to_string(),
        remote: false,
        hidden_from_publishing: false,
        variable_ids: vec![],
    };
    VariablesMeta {
        variables: variables.into_iter().map(|v| (v.id.clone(), v)).collect(),
        variable_collections: [(collection.id.clone(), collection)].into_iter().collect(),
    }
}

#[test]
fn unchanged_color_produces_no_override() {
    let meta = mock_meta(vec![mock_variable(
        "colorTheme/blue-100",
        "COLOR",
        vec![(
            "m-light",
            json!({"r": 1.0, "g": 0.5019607843137255, "b": 0.0, "a": 1.0}),
        )],
    )]);
    let graph = mock_graph("blue-100", "u-blue-100", json!("#ff8000"));
    let (overrides, summary) = build_import_overrides(&meta, &graph, None);
    assert!(overrides.is_empty());
    assert_eq!(summary.unchanged, 1);
    assert_eq!(summary.overrides_emitted, 0);
}

#[test]
fn approx_eq_absorbs_hand_authored_float32_roundtrip_noise() {
    // A manually authored Figma FLOAT variable round-trips through
    // 32-bit float storage on top of being hand-typed to ~3 decimals,
    // so design-data's exact `0` or `8/9` can arrive as
    // `0.0010000000474974513` or `0.8889999985694885` — not a real
    // disagreement.
    assert!(approx_eq(0.0, 0.0010000000474974513));
    assert!(approx_eq(8.0 / 9.0, 0.8889999985694885));
    // A genuine scale-step drift (e.g. 18px vs 20px) must still count
    // as a mismatch.
    assert!(!approx_eq(18.0, 20.0));
}

#[test]
fn diff_values_reports_known_mismatch() {
    use super::super::types::{FigmaMode, FigmaVariableCollection};

    let var = mock_variable(
        "colorTheme/blue-100",
        "COLOR",
        vec![("m-light", json!({"r": 0.0, "g": 0.0, "b": 1.0, "a": 1.0}))],
    );
    let mut variables = HashMap::new();
    variables.insert(var.id.clone(), var);
    let mut variable_collections = HashMap::new();
    variable_collections.insert(
        "col-1".to_string(),
        FigmaVariableCollection {
            id: "col-1".to_string(),
            name: ".Color theme".to_string(),
            key: "k1".to_string(),
            modes: vec![FigmaMode {
                mode_id: "m-light".to_string(),
                name: "Light".to_string(),
            }],
            default_mode_id: "m-light".to_string(),
            remote: false,
            hidden_from_publishing: false,
            variable_ids: vec![],
        },
    );
    variable_collections.insert(
        "col-2".to_string(),
        FigmaVariableCollection {
            id: "col-2".to_string(),
            name: ".Platform scale".to_string(),
            key: "k2".to_string(),
            modes: vec![FigmaMode {
                mode_id: "m-desktop".to_string(),
                name: "Desktop".to_string(),
            }],
            default_mode_id: "m-desktop".to_string(),
            remote: false,
            hidden_from_publishing: false,
            variable_ids: vec![],
        },
    );
    let meta = VariablesMeta {
        variables,
        variable_collections,
    };

    let graph = mock_graph("blue-100", "u-blue-100", json!("#ff8000"));
    let tokens = vec![(
        "blue-100".to_string(),
        PathBuf::from("test.json"),
        json!({
            "$schema": "https://example.com/color.json",
            "name": "blue-100",
            "value": "#ff8000",
            "uuid": "u-blue-100",
        }),
    )];

    let report = diff_values(&meta, &graph, &tokens, None).unwrap();
    assert_eq!(report.counts.value_mismatch, 1);
    assert_eq!(report.counts.matched, 0);
    let entry = report
        .entries
        .iter()
        .find(|e| e.name == "colorTheme/blue-100")
        .expect("mismatched variable must be reported");
    match &entry.class {
        DiffClass::ValueMismatch { design_data, figma } => {
            assert_eq!(design_data, &json!("#ff8000"));
            assert_eq!(figma, &json!("#0000ff"));
        }
        other => panic!("expected ValueMismatch, got {other:?}"),
    }
}

/// `S2.Color-theme` is a single-mode collection whose variables are bare
/// names (no `/`) that are `VARIABLE_ALIAS`es into `.Color theme`.
/// `invert_name` can't invert a bare name, so it must not short-circuit
/// straight to `FigmaOnly` — the alias-target fallback has to run anyway
/// and resolve through the aliased `colorTheme/*` variable.
#[test]
fn bare_named_alias_variable_resolves_via_target() {
    use super::super::types::{FigmaMode, FigmaVariableCollection};

    let target = mock_variable(
        "colorTheme/background-opacity-default",
        "FLOAT",
        vec![("m-light", json!(10.0))],
    );
    let target_id = target.id.clone();
    let alias_var = mock_variable(
        "background-opacity-default",
        "FLOAT",
        vec![(
            "m-single",
            json!({"type": "VARIABLE_ALIAS", "id": target_id}),
        )],
    );

    let mut meta = mock_meta(vec![target, alias_var]);
    meta.variable_collections.insert(
        "col-1".to_string(),
        FigmaVariableCollection {
            id: "col-1".to_string(),
            name: ".Color theme".to_string(),
            key: "k1".to_string(),
            modes: vec![FigmaMode {
                mode_id: "m-light".to_string(),
                name: "Light".to_string(),
            }],
            default_mode_id: "m-light".to_string(),
            remote: false,
            hidden_from_publishing: false,
            variable_ids: vec![],
        },
    );
    meta.variable_collections.insert(
        "col-2".to_string(),
        FigmaVariableCollection {
            id: "col-2".to_string(),
            name: "S2.Color-theme".to_string(),
            key: "k2".to_string(),
            modes: vec![FigmaMode {
                mode_id: "m-single".to_string(),
                name: "Mode 1".to_string(),
            }],
            default_mode_id: "m-single".to_string(),
            remote: false,
            hidden_from_publishing: false,
            variable_ids: vec![],
        },
    );
    for v in meta.variables.values_mut() {
        v.variable_collection_id = if v.name.starts_with("colorTheme/") {
            "col-1".to_string()
        } else {
            "col-2".to_string()
        };
    }

    let graph = mock_graph_with_schema(
        "background-opacity-default",
        "u-bod",
        json!("0.1"),
        "https://example.com/opacity.json",
    );
    let tokens = vec![(
        "background-opacity-default".to_string(),
        PathBuf::from("test.json"),
        json!({
            "$schema": "https://example.com/opacity.json",
            "name": "background-opacity-default",
            "value": "0.1",
            "uuid": "u-bod",
        }),
    )];

    let report = diff_values(&meta, &graph, &tokens, None).unwrap();
    assert_eq!(
        report.counts.figma_only, 0,
        "bare-named alias var must not be classified FigmaOnly: {:?}",
        report.entries
    );
    let entry = report
        .entries
        .iter()
        .find(|e| e.name == "background-opacity-default")
        .expect("bare-named alias variable must be reported");
    assert!(
        matches!(entry.class, DiffClass::Match),
        "expected Match, got {:?}",
        entry.class
    );
}

/// A design-data-only token that's covered by `--mapping` must report its
/// real legacy key, not whatever comes after the last `/` in the mapped
/// Figma name (which can differ, e.g. `spacing-100` -> `Layout/spacing-100-real`).
#[test]
fn design_data_only_entry_uses_mapping_for_legacy_key() {
    use super::super::types::{FigmaMode, FigmaVariableCollection};

    let mut variable_collections = HashMap::new();
    variable_collections.insert(
        "col-1".to_string(),
        FigmaVariableCollection {
            id: "col-1".to_string(),
            name: ".Color theme".to_string(),
            key: "k1".to_string(),
            modes: vec![FigmaMode {
                mode_id: "m-light".to_string(),
                name: "Light".to_string(),
            }],
            default_mode_id: "m-light".to_string(),
            remote: false,
            hidden_from_publishing: false,
            variable_ids: vec![],
        },
    );
    variable_collections.insert(
        "col-2".to_string(),
        FigmaVariableCollection {
            id: "col-2".to_string(),
            name: ".Platform scale".to_string(),
            key: "k2".to_string(),
            modes: vec![FigmaMode {
                mode_id: "m-desktop".to_string(),
                name: "Desktop".to_string(),
            }],
            default_mode_id: "m-desktop".to_string(),
            remote: false,
            hidden_from_publishing: false,
            variable_ids: vec![],
        },
    );
    let meta = VariablesMeta {
        variables: HashMap::new(),
        variable_collections,
    };

    let graph = mock_graph("spacing-100", "u-spacing-100", json!("8px"));
    let tokens = vec![(
        "spacing-100".to_string(),
        PathBuf::from("test.json"),
        json!({
            "$schema": "https://example.com/dimension.json",
            "name": "spacing-100",
            "value": "8px",
            "uuid": "u-spacing-100",
        }),
    )];
    let mapping: HashMap<String, String> = [(
        "spacing-100".to_string(),
        "Layout/spacing-100-real".to_string(),
    )]
    .into_iter()
    .collect();

    let report = diff_values(&meta, &graph, &tokens, Some(&mapping)).unwrap();
    let entry = report
        .entries
        .iter()
        .find(|e| e.name == "Layout/spacing-100-real")
        .expect("design-data-only entry must be reported");
    assert_eq!(entry.legacy_key.as_deref(), Some("spacing-100"));
}

/// A token whose name resolution fell back to its synthetic
/// `path:index` graph key (no usable `name`/`legacyKey` field, e.g. a
/// cascade-format token graph.rs couldn't extract a legacy key from)
/// must be reported as skipped, not as a misleading "design-data-only"
/// real gap.
#[test]
fn unresolved_legacy_key_is_skipped_not_design_data_only() {
    use super::super::types::{FigmaMode, FigmaVariableCollection};

    let mut variable_collections = HashMap::new();
    variable_collections.insert(
        "col-1".to_string(),
        FigmaVariableCollection {
            id: "col-1".to_string(),
            name: ".Color theme".to_string(),
            key: "k1".to_string(),
            modes: vec![FigmaMode {
                mode_id: "m-light".to_string(),
                name: "Light".to_string(),
            }],
            default_mode_id: "m-light".to_string(),
            remote: false,
            hidden_from_publishing: false,
            variable_ids: vec![],
        },
    );
    variable_collections.insert(
        "col-2".to_string(),
        FigmaVariableCollection {
            id: "col-2".to_string(),
            name: ".Platform scale".to_string(),
            key: "k2".to_string(),
            modes: vec![FigmaMode {
                mode_id: "m-desktop".to_string(),
                name: "Desktop".to_string(),
            }],
            default_mode_id: "m-desktop".to_string(),
            remote: false,
            hidden_from_publishing: false,
            variable_ids: vec![],
        },
    );
    let meta = VariablesMeta {
        variables: HashMap::new(),
        variable_collections,
    };

    let graph = mock_graph("spacing-100", "u-spacing-100", json!("8px"));
    let tokens = vec![(
        "/repo/packages/design-data/tokens/layout.tokens.json:3".to_string(),
        PathBuf::from("test.json"),
        json!({
            "$schema": "https://example.com/dimension.json",
            "value": "8px",
            "uuid": "u-spacing-100",
        }),
    )];

    let report = diff_values(&meta, &graph, &tokens, None).unwrap();
    assert_eq!(report.counts.design_data_only, 0);
    assert_eq!(report.counts.skipped_uncovered, 1);
    let entry = report
        .entries
        .iter()
        .find(|e| e.name.contains(".json:"))
        .expect("unresolved-name entry must be reported");
    match &entry.class {
        DiffClass::SkippedUncovered { reason } => {
            assert_eq!(reason, "legacy-key-unresolved");
        }
        other => panic!("expected SkippedUncovered, got {other:?}"),
    }
}

#[test]
fn opacity_scale_agrees_when_figma_is_percent_of_fraction() {
    let meta = mock_meta(vec![mock_variable(
        "colorTheme/background-opacity-down",
        "FLOAT",
        vec![("m-light", json!(10.0))],
    )]);
    let graph = mock_graph_with_schema(
        "background-opacity-down",
        "u-opacity-down",
        json!("0.1"),
        "https://example.com/opacity.json",
    );
    let report = diff_values(&meta, &graph, &[], None).unwrap();
    assert_eq!(report.counts.matched, 1);
    assert_eq!(report.counts.value_mismatch, 0);
}

#[test]
fn opacity_mismatch_reports_fraction_scale() {
    let meta = mock_meta(vec![mock_variable(
        "colorTheme/background-opacity-down",
        "FLOAT",
        vec![("m-light", json!(20.0))],
    )]);
    let graph = mock_graph_with_schema(
        "background-opacity-down",
        "u-opacity-down",
        json!("0.1"),
        "https://example.com/opacity.json",
    );
    let report = diff_values(&meta, &graph, &[], None).unwrap();
    assert_eq!(report.counts.value_mismatch, 1);
    let entry = &report.entries[0];
    match &entry.class {
        DiffClass::ValueMismatch { design_data, figma } => {
            assert_eq!(design_data, &json!("0.1"));
            assert_eq!(figma, &json!("0.2"));
        }
        other => panic!("expected ValueMismatch, got {other:?}"),
    }
}

#[test]
fn opacity_import_override_uses_fraction_scale() {
    let meta = mock_meta(vec![mock_variable(
        "colorTheme/background-opacity-down",
        "FLOAT",
        vec![("m-light", json!(20.0))],
    )]);
    let graph = mock_graph_with_schema(
        "background-opacity-down",
        "u-opacity-down",
        json!("0.1"),
        "https://example.com/opacity.json",
    );
    let (overrides, summary) = build_import_overrides(&meta, &graph, None);
    assert_eq!(summary.overrides_emitted, 1);
    assert_eq!(overrides[0]["target"], "u-opacity-down");
    assert_eq!(overrides[0]["value"], "0.2");
}

#[test]
fn opacity_import_no_override_when_scales_agree() {
    let meta = mock_meta(vec![mock_variable(
        "colorTheme/background-opacity-down",
        "FLOAT",
        vec![("m-light", json!(10.0))],
    )]);
    let graph = mock_graph_with_schema(
        "background-opacity-down",
        "u-opacity-down",
        json!("0.1"),
        "https://example.com/opacity.json",
    );
    let (overrides, summary) = build_import_overrides(&meta, &graph, None);
    assert!(overrides.is_empty());
    assert_eq!(summary.unchanged, 1);
}

#[test]
fn font_weight_name_casing_agrees() {
    let meta = mock_meta(vec![mock_variable(
        "platformScale/bold-font-weight",
        "STRING",
        vec![("m-desktop", json!("Bold"))],
    )]);
    let graph = mock_graph_with_schema(
        "bold-font-weight",
        "u-bold",
        json!("bold"),
        "https://example.com/font-weight.json",
    );
    let report = diff_values(&meta, &graph, &[], None).unwrap();
    assert_eq!(report.counts.matched, 1);
    assert_eq!(report.counts.value_mismatch, 0);
}

#[test]
fn font_weight_space_variant_agrees() {
    let meta = mock_meta(vec![mock_variable(
        "platformScale/extra-bold-font-weight",
        "STRING",
        vec![("m-desktop", json!("Extra Bold"))],
    )]);
    let graph = mock_graph_with_schema(
        "extra-bold-font-weight",
        "u-extra-bold",
        json!("extra-bold"),
        "https://example.com/font-weight.json",
    );
    let report = diff_values(&meta, &graph, &[], None).unwrap();
    assert_eq!(report.counts.matched, 1);
    assert_eq!(report.counts.value_mismatch, 0);
}

#[test]
fn font_style_normal_agrees_with_figma_regular() {
    let meta = mock_meta(vec![mock_variable(
        "platformScale/default-font-style",
        "STRING",
        vec![("m-desktop", json!("Regular"))],
    )]);
    let graph = mock_graph_with_schema(
        "default-font-style",
        "u-default-style",
        json!("normal"),
        "https://example.com/font-style.json",
    );
    let report = diff_values(&meta, &graph, &[], None).unwrap();
    assert_eq!(report.counts.matched, 1);
    assert_eq!(report.counts.value_mismatch, 0);
}

/// A genuinely different weight must still be reported — canonicalization
/// normalizes naming, not the underlying value.
#[test]
fn font_weight_genuine_difference_still_mismatches() {
    let meta = mock_meta(vec![mock_variable(
        "platformScale/bold-font-weight",
        "STRING",
        vec![("m-desktop", json!("Black"))],
    )]);
    let graph = mock_graph_with_schema(
        "bold-font-weight",
        "u-bold",
        json!("bold"),
        "https://example.com/font-weight.json",
    );
    let report = diff_values(&meta, &graph, &[], None).unwrap();
    assert_eq!(report.counts.value_mismatch, 1);
}

#[test]
fn font_family_verbatim_value_agrees() {
    let meta = mock_meta(vec![mock_variable(
        "platformScale/code-font-family",
        "STRING",
        vec![("m-desktop", json!("Source Code Pro"))],
    )]);
    let graph = mock_graph_with_schema(
        "code-font-family",
        "u-code-font-family",
        json!("Source Code Pro"),
        "https://example.com/font-family.json",
    );
    let report = diff_values(&meta, &graph, &[], None).unwrap();
    assert_eq!(report.counts.matched, 1);
    assert_eq!(report.counts.value_mismatch, 0);
}

/// Unlike font-weight/style, family names compare verbatim — no casing or
/// punctuation normalization, so a genuinely different family mismatches.
#[test]
fn font_family_genuine_difference_mismatches() {
    let meta = mock_meta(vec![mock_variable(
        "platformScale/code-font-family",
        "STRING",
        vec![("m-desktop", json!("Fira Code"))],
    )]);
    let graph = mock_graph_with_schema(
        "code-font-family",
        "u-code-font-family",
        json!("Source Code Pro"),
        "https://example.com/font-family.json",
    );
    let report = diff_values(&meta, &graph, &[], None).unwrap();
    assert_eq!(report.counts.value_mismatch, 1);
}

#[test]
fn dp_unit_agrees_with_bare_figma_number() {
    let meta = mock_meta(vec![mock_variable(
        "platformScale/android-elevation",
        "FLOAT",
        vec![("m-desktop", json!(2.0))],
    )]);
    let graph = mock_graph("android-elevation", "u-elevation", json!("2dp"));
    let report = diff_values(&meta, &graph, &[], None).unwrap();
    assert_eq!(report.counts.matched, 1);
    assert_eq!(report.counts.value_mismatch, 0);
}

/// Attaches the real color-scheme/scale mode-set records (mirroring
/// `packages/design-data/mode-sets/{color-scheme,scale}.json`) to a mock
/// graph, since `multimode_name_field` looks up `graph.mode_sets` rather
/// than hardcoding mode names.
fn with_real_mode_sets(mut graph: TokenGraph) -> TokenGraph {
    graph.mode_sets = vec![
        design_data_core::graph::ModeSetRecord {
            file: PathBuf::from("color-scheme.json"),
            name: "colorScheme".to_string(),
            modes: vec![
                "light".to_string(),
                "dark".to_string(),
                "wireframe".to_string(),
            ],
            default_mode: "light".to_string(),
        },
        design_data_core::graph::ModeSetRecord {
            file: PathBuf::from("scale.json"),
            name: "scale".to_string(),
            modes: vec!["desktop".to_string(), "mobile".to_string()],
            default_mode: "desktop".to_string(),
        },
    ];
    graph
}

#[test]
fn default_source_context_recognizes_any_declared_mode_set_axis() {
    // Before this fix, `default_source_context` only recognized hardcoded
    // "scale"/"colorScheme" fields; a token disambiguated by a newer axis
    // declared in `graph.mode_sets` (e.g. `contrast`, added after this
    // function was written — see packages/design-data/mode-sets/contrast.json)
    // fell through to `None`, silently losing its axis pin. Deriving the
    // checked fields from `graph.mode_sets` instead fixes that.
    let contrast_mode_set = design_data_core::graph::ModeSetRecord {
        file: PathBuf::from("contrast.json"),
        name: "contrast".to_string(),
        modes: vec!["regular".to_string(), "high".to_string()],
        default_mode: "regular".to_string(),
    };
    let mut graph = TokenGraph::from_pairs(vec![(
        "high-contrast-token".to_string(),
        PathBuf::from("tokens.json"),
        json!({"name": {"property": "border-width", "contrast": "high"}, "value": "2px"}),
    )]);
    graph.mode_sets = vec![contrast_mode_set];
    let record = graph.tokens.get("high-contrast-token").unwrap();

    let ctx = default_source_context(&graph, record).expect("contrast axis should be recognized");
    assert_eq!(ctx.get("contrast").map(String::as_str), Some("high"));
}

/// Two-entry scale-set graph (desktop/mobile sharing `conceptId`), used to
/// verify the diff aligns to the Figma variable's own scale instead of an
/// arbitrary entry.
fn mock_scale_graph(legacy_key: &str, desktop: Value, mobile: Value) -> TokenGraph {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("tokens.json");
    let mut f = std::fs::File::create(&path).unwrap();
    write!(
        f,
        "{}",
        json!([
            {
                "$schema": "https://example.com/dimension.json",
                "name": {"property": "padding", "scale": "desktop", "legacyKey": legacy_key},
                "value": desktop,
                "uuid": format!("u-{legacy_key}-desktop"),
                "conceptId": format!("su-{legacy_key}"),
            },
            {
                "$schema": "https://example.com/dimension.json",
                "name": {"property": "padding", "scale": "mobile", "legacyKey": legacy_key},
                "value": mobile,
                "uuid": format!("u-{legacy_key}-mobile"),
                "conceptId": format!("su-{legacy_key}"),
            },
        ])
    )
    .unwrap();
    with_real_mode_sets(TokenGraph::from_json_dir(dir.path()).unwrap())
}

/// A three-entry `.Color theme` set (Light/Dark/Wireframe sharing
/// `conceptId`, discriminated by `name.colorScheme`) — the real shape
/// (see `packages/design-data/tokens/semantic-color-palette.tokens.json`)
/// minus the `$ref`-alias indirection, which is irrelevant to
/// `diff_multimode`'s set-lookup/re-verify logic under test here.
fn mock_color_set_graph(
    legacy_key: &str,
    light: Value,
    dark: Value,
    wireframe: Value,
) -> TokenGraph {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("tokens.json");
    let mut f = std::fs::File::create(&path).unwrap();
    write!(
            f,
            "{}",
            json!([
                {
                    "$schema": "https://example.com/color.json",
                    "name": {"colorRole": "accent", "colorScheme": "light", "legacyKey": legacy_key},
                    "value": light,
                    "uuid": format!("u-{legacy_key}-light"),
                    "conceptId": format!("su-{legacy_key}"),
                },
                {
                    "$schema": "https://example.com/color.json",
                    "name": {"colorRole": "accent", "colorScheme": "dark", "legacyKey": legacy_key},
                    "value": dark,
                    "uuid": format!("u-{legacy_key}-dark"),
                    "conceptId": format!("su-{legacy_key}"),
                },
                {
                    "$schema": "https://example.com/color.json",
                    "name": {"colorRole": "accent", "colorScheme": "wireframe", "legacyKey": legacy_key},
                    "value": wireframe,
                    "uuid": format!("u-{legacy_key}-wireframe"),
                    "conceptId": format!("su-{legacy_key}"),
                },
            ])
        )
        .unwrap();
    with_real_mode_sets(TokenGraph::from_json_dir(dir.path()).unwrap())
}

/// Like [`mock_color_set_graph`], but each semantic member's own value is
/// a `$ref` into a second, palette-level color-set (`su-palette`) instead
/// of a literal — the real shape of e.g. `accent-background-color-default`
/// (`$ref` → `accent-color-800`, itself `conceptId`-backed by `blue-800`).
/// Regression fixture for `resolve_set_member_in_context` dropping mode
/// context on this second hop and falling back to the palette's
/// first-indexed (Light) member regardless of the requested mode.
fn mock_nested_color_set_graph(legacy_key: &str) -> TokenGraph {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("tokens.json");
    let mut f = std::fs::File::create(&path).unwrap();
    write!(
            f,
            "{}",
            json!([
                {
                    "$schema": "https://example.com/color.json",
                    "name": {"colorRole": "accent", "colorScheme": "light", "legacyKey": legacy_key},
                    "$ref": "u-palette-light",
                    "uuid": format!("u-{legacy_key}-light"),
                    "conceptId": format!("su-{legacy_key}"),
                },
                {
                    "$schema": "https://example.com/color.json",
                    "name": {"colorRole": "accent", "colorScheme": "dark", "legacyKey": legacy_key},
                    "$ref": "u-palette-dark",
                    "uuid": format!("u-{legacy_key}-dark"),
                    "conceptId": format!("su-{legacy_key}"),
                },
                {
                    "$schema": "https://example.com/color.json",
                    "name": {"colorRole": "accent", "colorScheme": "wireframe", "legacyKey": legacy_key},
                    "$ref": "u-palette-light",
                    "uuid": format!("u-{legacy_key}-wireframe"),
                    "conceptId": format!("su-{legacy_key}"),
                },
                {
                    "$schema": "https://example.com/color.json",
                    "name": {"colorRole": "palette", "colorScheme": "light", "legacyKey": "blue-800"},
                    "value": "#4b75ff",
                    "uuid": "u-palette-light",
                    "conceptId": "su-palette",
                },
                {
                    "$schema": "https://example.com/color.json",
                    "name": {"colorRole": "palette", "colorScheme": "dark", "legacyKey": "blue-800"},
                    "value": "#4069fd",
                    "uuid": "u-palette-dark",
                    "conceptId": "su-palette",
                },
            ])
        )
        .unwrap();
    with_real_mode_sets(TokenGraph::from_json_dir(dir.path()).unwrap())
}

/// A `.Color theme` collection with all three real modes, for a single
/// variable.
fn mock_meta_color_theme(variable: FigmaVariable) -> VariablesMeta {
    use super::super::types::{FigmaMode, FigmaVariableCollection};
    let mut variable_collections = HashMap::new();
    variable_collections.insert(
        variable.variable_collection_id.clone(),
        FigmaVariableCollection {
            id: variable.variable_collection_id.clone(),
            name: ".Color theme".to_string(),
            key: "k".to_string(),
            modes: vec![
                FigmaMode {
                    mode_id: "m-light".to_string(),
                    name: "Light".to_string(),
                },
                FigmaMode {
                    mode_id: "m-dark".to_string(),
                    name: "Dark".to_string(),
                },
                FigmaMode {
                    mode_id: "m-wireframe".to_string(),
                    name: "Wireframe".to_string(),
                },
            ],
            default_mode_id: "m-light".to_string(),
            remote: false,
            hidden_from_publishing: false,
            variable_ids: vec![],
        },
    );
    let mut variables = HashMap::new();
    variables.insert(variable.id.clone(), variable);
    VariablesMeta {
        variables,
        variable_collections,
    }
}

/// The bug this fix targets: `.Color theme` modes are *supposed* to
/// diverge (Dark genuinely differs from Light/Wireframe here) — the old
/// `collapse_modes` model discarded the whole variable as
/// `skipped-uncovered/multimode-divergent` the moment any two modes
/// disagreed. Each mode must now be compared against design-data's own
/// value for that mode, and only the divergent mode reported as a
/// mismatch.
#[test]
fn color_theme_modes_compared_individually_when_one_diverges() {
    let var = mock_variable(
        "colorTheme/accent-color-default",
        "COLOR",
        vec![
            (
                "m-light",
                json!({"r": 1.0, "g": 0.5019607843137255, "b": 0.0, "a": 1.0}),
            ),
            ("m-dark", json!({"r": 0.0, "g": 0.0, "b": 1.0, "a": 1.0})),
            (
                "m-wireframe",
                json!({"r": 1.0, "g": 1.0, "b": 1.0, "a": 1.0}),
            ),
        ],
    );
    let meta = mock_meta_color_theme(var);
    let graph = mock_color_set_graph(
        "accent-color-default",
        json!("#ff8000"),
        json!("#000000"),
        json!("#ffffff"),
    );

    let report = diff_values(&meta, &graph, &[], None).unwrap();
    assert_eq!(report.counts.multi_mode_mismatch, 1);
    assert_eq!(report.counts.skipped_uncovered, 0);
    assert_eq!(report.counts.matched, 0);

    let entry = report
        .entries
        .iter()
        .find(|e| e.name == "colorTheme/accent-color-default")
        .expect("multi-mode variable must be reported");
    match &entry.class {
        DiffClass::MultiModeMismatch { modes } => {
            assert_eq!(modes.len(), 3);
            let by_mode: HashMap<&str, &DiffClass> =
                modes.iter().map(|m| (m.mode.as_str(), &m.class)).collect();
            assert!(matches!(by_mode["Light"], DiffClass::Match));
            assert!(matches!(by_mode["Wireframe"], DiffClass::Match));
            match by_mode["Dark"] {
                DiffClass::ValueMismatch { design_data, figma } => {
                    assert_eq!(design_data, &json!("#000000"));
                    assert_eq!(figma, &json!("#0000ff"));
                }
                other => panic!("expected ValueMismatch for Dark, got {other:?}"),
            }
        }
        other => panic!("expected MultiModeMismatch, got {other:?}"),
    }
}

/// The design-data-side twin of the figma-side alias-mode bug fixed in
/// `resolve_figma_value`: a set member's own `$ref` chain must stay
/// mode-aware when it lands on a second `conceptId` (chromatic palette
/// steps), not silently fall back to that set's first-indexed (Light)
/// child via context-free `resolve_leaf`. Regression guard for
/// `resolve_set_member_in_context` using `resolve_leaf_in_context`.
#[test]
fn color_theme_modes_resolve_through_nested_set_alias_per_mode() {
    let var = mock_variable(
        "colorTheme/accent-background-color-default",
        "COLOR",
        vec![
            (
                "m-light",
                json!({"r": 0.29411764705882354, "g": 0.4588235294117647, "b": 1.0, "a": 1.0}),
            ),
            (
                "m-dark",
                json!({"r": 0.25098039215686274, "g": 0.4117647058823529, "b": 0.9921568627450981, "a": 1.0}),
            ),
            (
                "m-wireframe",
                json!({"r": 0.29411764705882354, "g": 0.4588235294117647, "b": 1.0, "a": 1.0}),
            ),
        ],
    );
    let meta = mock_meta_color_theme(var);
    let graph = mock_nested_color_set_graph("accent-background-color-default");

    let report = diff_values(&meta, &graph, &[], None).unwrap();
    let entry = report
        .entries
        .iter()
        .find(|e| e.name == "colorTheme/accent-background-color-default")
        .expect("multi-mode variable must be reported");
    assert!(
        matches!(entry.class, DiffClass::Match),
        "expected Match (Dark should resolve to blue-800 Dark, not fall back to \
             Light), got {:?}",
        entry.class
    );
}

/// When every mode genuinely agrees, a multi-mode variable reports a
/// plain `Match` — the new per-mode path isn't just a rename of
/// `skipped-uncovered`.
#[test]
fn color_theme_modes_all_agree_reports_match() {
    let var = mock_variable(
        "colorTheme/accent-color-default",
        "COLOR",
        vec![
            (
                "m-light",
                json!({"r": 1.0, "g": 0.5019607843137255, "b": 0.0, "a": 1.0}),
            ),
            (
                "m-dark",
                json!({"r": 1.0, "g": 0.5019607843137255, "b": 0.0, "a": 1.0}),
            ),
            (
                "m-wireframe",
                json!({"r": 1.0, "g": 0.5019607843137255, "b": 0.0, "a": 1.0}),
            ),
        ],
    );
    let meta = mock_meta_color_theme(var);
    let graph = mock_color_set_graph(
        "accent-color-default",
        json!("#ff8000"),
        json!("#ff8000"),
        json!("#ff8000"),
    );

    let report = diff_values(&meta, &graph, &[], None).unwrap();
    assert_eq!(report.counts.matched, 1);
    assert_eq!(report.counts.multi_mode_mismatch, 0);
    assert_eq!(report.counts.skipped_uncovered, 0);
    assert!(matches!(report.entries[0].class, DiffClass::Match));
}

/// The bug from the real `color-wheel-border-color` report: its Light,
/// Dark, and Wireframe values are each a `VARIABLE_ALIAS` to the *same*
/// target variable (`colorTheme/gray-1000`) within the same collection.
/// Resolving every mode via the target's default (Light) mode collapsed
/// Dark and Wireframe to the target's Light value — each alias hop must
/// resolve through the target's own same-named mode instead.
#[test]
fn diff_multimode_resolves_alias_through_same_named_mode() {
    let target = mock_variable(
        "colorTheme/gray-1000",
        "COLOR",
        vec![
            ("m-light", json!({"r": 0.0, "g": 0.0, "b": 0.0, "a": 1.0})),
            ("m-dark", json!({"r": 1.0, "g": 1.0, "b": 1.0, "a": 1.0})),
            (
                "m-wireframe",
                json!({"r": 0.0, "g": 0.0, "b": 0.0, "a": 1.0}),
            ),
        ],
    );
    let alias = json!({"type": "VARIABLE_ALIAS", "id": target.id.clone()});
    let var = mock_variable(
        "colorTheme/color-wheel-border-color",
        "COLOR",
        vec![
            ("m-light", alias.clone()),
            ("m-dark", alias.clone()),
            ("m-wireframe", alias),
        ],
    );
    let mut meta = mock_meta_color_theme(var);
    meta.variables.insert(target.id.clone(), target);
    let graph = mock_color_set_graph(
        "color-wheel-border-color",
        json!("#000000"),
        json!("#ffffff"),
        json!("#000000"),
    );

    let report = diff_values(&meta, &graph, &[], None).unwrap();
    assert_eq!(report.counts.matched, 1);
    assert_eq!(report.counts.multi_mode_mismatch, 0);
    assert!(matches!(report.entries[0].class, DiffClass::Match));
}

/// A `.Platform scale` collection with both Desktop and Mobile modes,
/// for a single variable — genuinely multi-mode like `.Color theme`, so
/// it must also route through `diff_multimode`.
fn mock_meta_platform_scale(variable: FigmaVariable) -> VariablesMeta {
    use super::super::types::{FigmaMode, FigmaVariableCollection};
    let mut variable_collections = HashMap::new();
    variable_collections.insert(
        variable.variable_collection_id.clone(),
        FigmaVariableCollection {
            id: variable.variable_collection_id.clone(),
            name: ".Platform scale".to_string(),
            key: "k".to_string(),
            modes: vec![
                FigmaMode {
                    mode_id: "m-desktop".to_string(),
                    name: "Desktop".to_string(),
                },
                FigmaMode {
                    mode_id: "m-mobile".to_string(),
                    name: "Mobile".to_string(),
                },
            ],
            default_mode_id: "m-desktop".to_string(),
            remote: false,
            hidden_from_publishing: false,
            variable_ids: vec![],
        },
    );
    let mut variables = HashMap::new();
    variables.insert(variable.id.clone(), variable);
    VariablesMeta {
        variables,
        variable_collections,
    }
}

/// Finding #1 from the PR #1416 review: the `diff_multimode` guard
/// (`values_by_mode.len() > 1 && concept_id.is_some()`) also matches
/// `.Platform scale` Desktop/Mobile variables, not just `.Color theme`.
/// This locks that in as intended — per-mode comparison beats the old
/// `skipped-uncovered` collapse — rather than leaving it an untested
/// side effect of the guard's shape.
#[test]
fn platform_scale_modes_compared_individually_when_one_diverges() {
    let var = mock_variable(
        "platformScale/line-height-900",
        "FLOAT",
        vec![("m-desktop", json!(42.0)), ("m-mobile", json!(55.0))],
    );
    let meta = mock_meta_platform_scale(var);
    let graph = mock_scale_graph("line-height-900", json!("42px"), json!("50px"));

    let report = diff_values(&meta, &graph, &[], None).unwrap();
    assert_eq!(report.counts.multi_mode_mismatch, 1);
    assert_eq!(report.counts.matched, 0);
    assert_eq!(report.counts.skipped_uncovered, 0);

    match &report.entries[0].class {
        DiffClass::MultiModeMismatch { modes } => {
            let by_mode: HashMap<&str, &DiffClass> =
                modes.iter().map(|m| (m.mode.as_str(), &m.class)).collect();
            assert!(matches!(by_mode["Desktop"], DiffClass::Match));
            match by_mode["Mobile"] {
                DiffClass::ValueMismatch { design_data, figma } => {
                    assert_eq!(design_data, &json!("50px"));
                    assert_eq!(figma, &json!("55px"));
                }
                other => panic!("expected ValueMismatch for Mobile, got {other:?}"),
            }
        }
        other => panic!("expected MultiModeMismatch, got {other:?}"),
    }
}

/// The `accent-color-100`-shaped bug: a `.Color theme` variable whose
/// design-data concept has no member for *any* of Light/Dark/Wireframe
/// (a plain single-scheme alias, not a genuinely per-scheme set) rolls
/// up to `SkippedUncovered`, not `MultiModeMismatch` — "nothing to
/// compare in any mode" is a coverage gap, not a divergence.
#[test]
fn color_theme_all_modes_uncovered_reports_skipped_not_mismatch() {
    let var = mock_variable(
        "colorTheme/accent-color-100",
        "COLOR",
        vec![
            ("m-light", json!({"r": 1.0, "g": 0.5, "b": 0.0, "a": 1.0})),
            ("m-dark", json!({"r": 1.0, "g": 0.5, "b": 0.0, "a": 1.0})),
            (
                "m-wireframe",
                json!({"r": 1.0, "g": 0.5, "b": 0.0, "a": 1.0}),
            ),
        ],
    );
    let meta = mock_meta_color_theme(var);
    // A plain single-scheme alias, not a real per-scheme set: one member,
    // no `colorScheme` field at all, so a light/dark/wireframe lookup
    // never finds a match — every mode is genuinely uncovered.
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("tokens.json");
    let mut f = std::fs::File::create(&path).unwrap();
    write!(
        f,
        "{}",
        json!([
            {
                "$schema": "https://example.com/color.json",
                "name": {"colorRole": "accent", "legacyKey": "accent-color-100"},
                "value": "#ff8000",
                "uuid": "u-accent-color-100",
                "conceptId": "su-accent-color-100",
            },
        ])
    )
    .unwrap();
    let graph = with_real_mode_sets(TokenGraph::from_json_dir(dir.path()).unwrap());

    let report = diff_values(&meta, &graph, &[], None).unwrap();
    assert_eq!(report.counts.multi_mode_mismatch, 0);
    assert_eq!(report.counts.skipped_uncovered, 1);
    assert_eq!(report.counts.matched, 0);
    match &report.entries[0].class {
        DiffClass::SkippedUncovered { reason } => {
            assert_eq!(reason, "multimode-uncovered");
        }
        other => panic!("expected SkippedUncovered, got {other:?}"),
    }
}

/// A follow-up PR #1416 review finding: the `diff_multimode` routing
/// guard checked only the snake_case `conceptId` field. Relationship
/// (CTR) raw uses camelCase `setUuid` instead
/// (`reindex_relationship_tokens` clones the relationship's own raw
/// as-is) — so a legacy key with no owning token (only a
/// `relationships/*.json` entry, resolved via
/// `resolve_relationship_ref`) never matched the guard and silently fell
/// through to the old collapse-and-give-up path even though it was
/// genuinely multi-mode, unlike the token-owned case in
/// `platform_scale_modes_compared_individually_when_one_diverges` above.
#[test]
fn ctr_only_multimode_variable_routes_through_diff_multimode() {
    use design_data_core::graph::RelationshipRecord;

    let var = mock_variable(
        "platformScale/ctr-only-line-height-900",
        "FLOAT",
        vec![("m-desktop", json!(42.0)), ("m-mobile", json!(55.0))],
    );
    let meta = mock_meta_platform_scale(var);

    // No owning token at all — only two inline-value CTR siblings
    // (the `avatar-size-100` shape), distinguished by
    // `scope.options.scale`, so `resolve_alias_key` misses entirely and
    // `diff_values` must fall back to `resolve_relationship_ref`, whose
    // synthesized `TokenRecord` clones the CTR's own (camelCase
    // `setUuid`) raw as-is.
    let graph = TokenGraph::default().with_relationships(vec![
        RelationshipRecord {
            file: PathBuf::from("relationships/ctr-only-line-height.json"),
            index: 0,
            uuid: Some("88888888-0000-0000-0000-000000000001".to_string()),
            raw: json!({
                "scope": {"options": {"scale": "desktop"}},
                "$schema": "https://example.com/dimension.json",
                "value": "42px",
                "legacyKey": "ctr-only-line-height-900",
                "setUuid": "su-ctr-only-line-height-900",
            }),
        },
        RelationshipRecord {
            file: PathBuf::from("relationships/ctr-only-line-height.json"),
            index: 1,
            uuid: Some("88888888-0000-0000-0000-000000000002".to_string()),
            raw: json!({
                "scope": {"options": {"scale": "mobile"}},
                "$schema": "https://example.com/dimension.json",
                "value": "50px",
                "legacyKey": "ctr-only-line-height-900",
                "setUuid": "su-ctr-only-line-height-900",
            }),
        },
    ]);
    let graph = with_real_mode_sets(graph);

    let report = diff_values(&meta, &graph, &[], None).unwrap();
    // Before the fix: `record_concept_id` only checked `conceptId`, missed
    // the CTR's `setUuid`, so this fell through to the old collapse path
    // instead of `diff_multimode` (multi_mode_mismatch stayed 0).
    assert_eq!(report.counts.multi_mode_mismatch, 1);
    match &report.entries[0].class {
        DiffClass::MultiModeMismatch { modes } => {
            let by_mode: HashMap<&str, &DiffClass> =
                modes.iter().map(|m| (m.mode.as_str(), &m.class)).collect();
            assert!(matches!(by_mode["Desktop"], DiffClass::Match));
            match by_mode["Mobile"] {
                DiffClass::ValueMismatch { design_data, figma } => {
                    assert_eq!(design_data, &json!("50px"));
                    assert_eq!(figma, &json!("55px"));
                }
                other => panic!("expected ValueMismatch for Mobile, got {other:?}"),
            }
        }
        other => panic!("expected MultiModeMismatch, got {other:?}"),
    }
}

/// Bead `spectrum-design-data-2god`: the real `action-bar-border-color`
/// shape — a `$ref`-backed CTR (not the inline-value shape covered by
/// `ctr_only_multimode_variable_routes_through_diff_multimode` above).
/// Each mode's relationship record has no inline `value`, just a `$ref`
/// into a plain palette color token (no `conceptId`), so
/// `reindex_relationship_tokens` skips it entirely (only inline-value
/// CTRs get a synthesized `TokenRecord`) and `resolve_relationship_ref`
/// returns the *palette* token's record — which never carries `setUuid`
/// (that field lives only on the `RelationshipRecord`, never merged onto
/// a resolved `TokenRecord.raw`). Before the fix, `record_concept_id`
/// found neither `conceptId` nor `setUuid` and the variable silently
/// fell through to the old collapse-and-give-up path even though Dark
/// genuinely diverges from Light/Wireframe here.
#[test]
fn ref_backed_ctr_color_set_routes_through_diff_multimode() {
    use design_data_core::graph::RelationshipRecord;

    let var = mock_variable(
        "colorTheme/action-bar-border-color",
        "COLOR",
        vec![
            ("m-light", json!({"r": 1.0, "g": 1.0, "b": 1.0, "a": 0.25})),
            ("m-dark", json!({"r": 0.0, "g": 0.0, "b": 0.0, "a": 1.0})),
            (
                "m-wireframe",
                json!({"r": 1.0, "g": 1.0, "b": 1.0, "a": 0.25}),
            ),
        ],
    );
    let meta = mock_meta_color_theme(var);

    // Plain palette color tokens — no `conceptId`, no owning set — the
    // real shape of `transparent-white-25` / `gray-400`, referenced by
    // `$ref` rather than holding the per-mode value inline.
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("tokens.json");
    let mut f = std::fs::File::create(&path).unwrap();
    write!(
        f,
        "{}",
        json!([
            {
                "$schema": "https://example.com/color.json",
                "name": {"colorFamily": "transparent-white", "scaleIndex": 25},
                "value": "#ffffff40",
                "uuid": "u-transparent-white-25",
            },
            {
                "$schema": "https://example.com/color.json",
                "name": {"colorFamily": "gray", "scaleIndex": 400},
                "value": "#bcbcbc",
                "uuid": "u-gray-400",
            },
        ])
    )
    .unwrap();
    let graph = TokenGraph::from_json_dir(dir.path())
        .unwrap()
        .with_relationships(vec![
            RelationshipRecord {
                file: PathBuf::from("relationships/action-bar.json"),
                index: 0,
                uuid: Some("e242c2e1-0000-0000-0000-000000000001".to_string()),
                raw: json!({
                    "scope": {"options": {"colorScheme": "light"}},
                    "$schema": "https://example.com/alias.json",
                    "$ref": "u-transparent-white-25",
                    "legacyKey": "action-bar-border-color",
                    "setUuid": "su-action-bar-border-color",
                }),
            },
            RelationshipRecord {
                file: PathBuf::from("relationships/action-bar.json"),
                index: 1,
                uuid: Some("e242c2e1-0000-0000-0000-000000000002".to_string()),
                raw: json!({
                    "scope": {"options": {"colorScheme": "dark"}},
                    "$schema": "https://example.com/alias.json",
                    "$ref": "u-gray-400",
                    "legacyKey": "action-bar-border-color",
                    "setUuid": "su-action-bar-border-color",
                }),
            },
            RelationshipRecord {
                file: PathBuf::from("relationships/action-bar.json"),
                index: 2,
                uuid: Some("e242c2e1-0000-0000-0000-000000000003".to_string()),
                raw: json!({
                    "scope": {"options": {"colorScheme": "wireframe"}},
                    "$schema": "https://example.com/alias.json",
                    "$ref": "u-transparent-white-25",
                    "legacyKey": "action-bar-border-color",
                    "setUuid": "su-action-bar-border-color",
                }),
            },
        ]);
    let graph = with_real_mode_sets(graph);

    let report = diff_values(&meta, &graph, &[], None).unwrap();
    assert_eq!(report.counts.multi_mode_mismatch, 1);
    assert_eq!(report.counts.skipped_uncovered, 0);

    let entry = report
        .entries
        .iter()
        .find(|e| e.name == "colorTheme/action-bar-border-color")
        .expect("$ref-backed color-set CTR must be reported");
    match &entry.class {
        DiffClass::MultiModeMismatch { modes } => {
            let by_mode: HashMap<&str, &DiffClass> =
                modes.iter().map(|m| (m.mode.as_str(), &m.class)).collect();
            assert!(matches!(by_mode["Light"], DiffClass::Match));
            assert!(matches!(by_mode["Wireframe"], DiffClass::Match));
            match by_mode["Dark"] {
                DiffClass::ValueMismatch { design_data, figma } => {
                    assert_eq!(design_data, &json!("#bcbcbc"));
                    assert_eq!(figma, &json!("#000000"));
                }
                other => panic!("expected ValueMismatch for Dark, got {other:?}"),
            }
        }
        other => panic!("expected MultiModeMismatch, got {other:?}"),
    }
}

/// Finding #2 from the PR #1416 review: a Figma mode that's genuinely
/// recognized (has a mode-set discriminator field) but has no matching
/// design-data set member must be reported `SkippedUncovered`, not
/// silently compared against an unrelated mode's value. Here
/// design-data's `.Color theme` set only has Light/Dark members, but
/// Figma also has a Wireframe mode.
#[test]
fn diff_multimode_reports_uncovered_when_no_set_member_matches_mode() {
    let var = mock_variable(
        "colorTheme/accent-color-default",
        "COLOR",
        vec![
            (
                "m-light",
                json!({"r": 1.0, "g": 0.5019607843137255, "b": 0.0, "a": 1.0}),
            ),
            ("m-dark", json!({"r": 0.0, "g": 0.0, "b": 1.0, "a": 1.0})),
            (
                "m-wireframe",
                json!({"r": 1.0, "g": 1.0, "b": 1.0, "a": 1.0}),
            ),
        ],
    );
    let meta = mock_meta_color_theme(var);

    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("tokens.json");
    let mut f = std::fs::File::create(&path).unwrap();
    write!(
            f,
            "{}",
            json!([
                {
                    "$schema": "https://example.com/color.json",
                    "name": {"colorRole": "accent", "colorScheme": "light", "legacyKey": "accent-color-default"},
                    "value": "#ff8000",
                    "uuid": "u-accent-color-default-light",
                    "conceptId": "su-accent-color-default",
                },
                {
                    "$schema": "https://example.com/color.json",
                    "name": {"colorRole": "accent", "colorScheme": "dark", "legacyKey": "accent-color-default"},
                    "value": "#0000ff",
                    "uuid": "u-accent-color-default-dark",
                    "conceptId": "su-accent-color-default",
                },
            ])
        )
        .unwrap();
    let graph = with_real_mode_sets(TokenGraph::from_json_dir(dir.path()).unwrap());

    let report = diff_values(&meta, &graph, &[], None).unwrap();
    assert_eq!(report.counts.multi_mode_mismatch, 1);
    assert_eq!(report.counts.matched, 0);

    match &report.entries[0].class {
        DiffClass::MultiModeMismatch { modes } => {
            let by_mode: HashMap<&str, &DiffClass> =
                modes.iter().map(|m| (m.mode.as_str(), &m.class)).collect();
            assert!(matches!(by_mode["Light"], DiffClass::Match));
            assert!(matches!(by_mode["Dark"], DiffClass::Match));
            match by_mode["Wireframe"] {
                DiffClass::SkippedUncovered { reason } => {
                    assert_eq!(reason, "uncovered");
                }
                other => panic!("expected SkippedUncovered for Wireframe, got {other:?}"),
            }
        }
        other => panic!("expected MultiModeMismatch, got {other:?}"),
    }
}

fn mock_meta_with_single_mode(
    variable: FigmaVariable,
    mode_name: &str,
    mode_id: &str,
) -> VariablesMeta {
    use super::super::types::{FigmaMode, FigmaVariableCollection};
    let mut variable_collections = HashMap::new();
    variable_collections.insert(
        variable.variable_collection_id.clone(),
        FigmaVariableCollection {
            id: variable.variable_collection_id.clone(),
            name: ".Platform scale".to_string(),
            key: "k".to_string(),
            modes: vec![FigmaMode {
                mode_id: mode_id.to_string(),
                name: mode_name.to_string(),
            }],
            default_mode_id: mode_id.to_string(),
            remote: false,
            hidden_from_publishing: false,
            variable_ids: vec![],
        },
    );
    let mut variables = HashMap::new();
    variables.insert(variable.id.clone(), variable);
    VariablesMeta {
        variables,
        variable_collections,
    }
}

/// The false-positive case this fix targets: design-data's mobile entry
/// (50) differs from Figma's captured Desktop mode (42), but the desktop
/// entry (42) agrees — the diff must align to Figma's scale, not an
/// arbitrary entry, and report a match.
#[test]
fn scale_set_aligns_to_figmas_captured_mode() {
    let var = mock_variable(
        "platformScale/line-height-900",
        "FLOAT",
        vec![("m-desktop", json!(42.0))],
    );
    let meta = mock_meta_with_single_mode(var, "Desktop", "m-desktop");
    let graph = mock_scale_graph("line-height-900", json!("42px"), json!("50px"));
    let report = diff_values(&meta, &graph, &[], None).unwrap();
    assert_eq!(report.counts.matched, 1);
    assert_eq!(report.counts.value_mismatch, 0);
}

/// A genuine desktop-to-desktop difference must still be reported once
/// aligned to the correct scale.
#[test]
fn scale_set_still_mismatches_on_real_desktop_drift() {
    let var = mock_variable(
        "platformScale/base-padding-horizontal-large",
        "FLOAT",
        vec![("m-desktop", json!(16.0))],
    );
    let meta = mock_meta_with_single_mode(var, "Desktop", "m-desktop");
    let graph = mock_scale_graph(
        "base-padding-horizontal-large",
        json!("14px"),
        json!("12px"),
    );
    let report = diff_values(&meta, &graph, &[], None).unwrap();
    assert_eq!(report.counts.value_mismatch, 1);
    let entry = &report.entries[0];
    match &entry.class {
        DiffClass::ValueMismatch { design_data, .. } => {
            assert_eq!(design_data, &json!("14px"));
        }
        other => panic!("expected ValueMismatch, got {other:?}"),
    }
}

/// Same false-positive-fix scenario as `scale_set_aligns_to_figmas_captured_mode`,
/// but sourced from a CTR-only scale-set (inline `value`, `setUuid`, no
/// standalone `tokens/*.tokens.json` entry — avatar-size-100's real shape)
/// instead of a cascade token. Regression test for the bug where
/// `reindex_relationship_tokens` cloned the CTR's raw as-is: since CTRs
/// never enter `concept_id_index` and use `scope.options.scale` (not
/// `name.scale`), scale alignment silently fell back to the hardcoded
/// desktop value for every mode, including mobile.
#[test]
fn ctr_scale_set_aligns_to_figmas_captured_mode() {
    use design_data_core::graph::RelationshipRecord;

    let var = mock_variable(
        "platformScale/avatar-size-100",
        "FLOAT",
        vec![("m-mobile", json!(28.0))],
    );
    let meta = mock_meta_with_single_mode(var, "Mobile", "m-mobile");
    let graph = TokenGraph::default().with_relationships(vec![
            RelationshipRecord {
                file: PathBuf::from("relationships/avatar.json"),
                index: 0,
                uuid: Some("dddddddd-0000-0000-0000-000000000001".to_string()),
                raw: json!({
                    "scope": {"component": "avatar", "property": "size", "options": {"scale": "desktop", "scaleIndex": 100}},
                    "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/dimension.json",
                    "value": "24px",
                    "uuid": "dddddddd-0000-0000-0000-000000000001",
                    "legacyKey": "avatar-size-100",
                    "setUuid": "su-avatar-size-100",
                    "setSchema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/scale-set.json",
                }),
            },
            RelationshipRecord {
                file: PathBuf::from("relationships/avatar.json"),
                index: 1,
                uuid: Some("dddddddd-0000-0000-0000-000000000002".to_string()),
                raw: json!({
                    "scope": {"component": "avatar", "property": "size", "options": {"scale": "mobile", "scaleIndex": 100}},
                    "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/dimension.json",
                    "value": "28px",
                    "uuid": "dddddddd-0000-0000-0000-000000000002",
                    "legacyKey": "avatar-size-100",
                    "setUuid": "su-avatar-size-100",
                    "setSchema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/scale-set.json",
                }),
            },
        ]);

    let report = diff_values(&meta, &graph, &[], None).unwrap();
    assert_eq!(report.counts.matched, 1);
    assert_eq!(report.counts.value_mismatch, 0);
}

#[test]
fn diverged_color_emits_uuid_override() {
    let meta = mock_meta(vec![mock_variable(
        "colorTheme/blue-100",
        "COLOR",
        vec![("m-light", json!({"r": 0.0, "g": 0.0, "b": 1.0, "a": 1.0}))],
    )]);
    let graph = mock_graph("blue-100", "u-blue-100", json!("#ff8000"));
    let (overrides, summary) = build_import_overrides(&meta, &graph, None);
    assert_eq!(summary.overrides_emitted, 1);
    assert_eq!(overrides[0]["target"], "u-blue-100");
    assert_eq!(overrides[0]["value"], "#0000ff");
}

#[test]
fn modes_agree_still_emits_when_diverged() {
    let meta = mock_meta(vec![mock_variable(
        "platformScale/spacing-100",
        "FLOAT",
        vec![("m-desktop", json!(16.0)), ("m-mobile", json!(16.0))],
    )]);
    let graph = mock_graph("spacing-100", "u-spacing-100", json!("8px"));
    let (overrides, summary) = build_import_overrides(&meta, &graph, None);
    assert_eq!(summary.overrides_emitted, 1);
    assert_eq!(overrides[0]["value"], "16px");
}

/// A bare-number source (e.g. a font-weight token, not a unit-suffixed
/// dimension, and not opacity — this mock's schema is `color.json`, so no
/// opacity scaling applies) must still be compared numerically —
/// otherwise an unedited FLOAT variable falsely reads as diverged.
#[test]
fn unchanged_bare_numeric_float_produces_no_override() {
    let meta = mock_meta(vec![mock_variable(
        "platformScale/font-weight-bold",
        "FLOAT",
        vec![("m-desktop", json!(0.6666))],
    )]);
    let graph = mock_graph("font-weight-bold", "u-font-weight-bold", json!(0.6666));
    let (overrides, summary) = build_import_overrides(&meta, &graph, None);
    assert!(overrides.is_empty());
    assert_eq!(summary.unchanged, 1);
    assert_eq!(summary.overrides_emitted, 0);
}

#[test]
fn modes_disagree_reports_multimode_divergent() {
    let meta = mock_meta(vec![mock_variable(
        "platformScale/spacing-100",
        "FLOAT",
        vec![("m-desktop", json!(16.0)), ("m-mobile", json!(12.0))],
    )]);
    let graph = mock_graph("spacing-100", "u-spacing-100", json!("8px"));
    let (overrides, summary) = build_import_overrides(&meta, &graph, None);
    assert!(overrides.is_empty());
    assert_eq!(
        summary.multimode_divergent,
        vec!["platformScale/spacing-100"]
    );
}

#[test]
fn unmapped_name_reports_unmapped() {
    let meta = mock_meta(vec![mock_variable(
        "SomeCollection/foo",
        "STRING",
        vec![("m-1", json!("bar"))],
    )]);
    let graph = mock_graph("blue-100", "u-blue-100", json!("#ff8000"));
    let (overrides, summary) = build_import_overrides(&meta, &graph, None);
    assert!(overrides.is_empty());
    assert_eq!(summary.unmapped, vec!["SomeCollection/foo"]);
}

#[test]
fn rename_map_takes_precedence_over_prefix_strip() {
    let meta = mock_meta(vec![mock_variable(
        "Layout/spacing-100-real",
        "FLOAT",
        vec![("m-1", json!(24.0))],
    )]);
    let renames: HashMap<String, String> = [(
        "Layout/spacing-100-real".to_string(),
        "spacing-100".to_string(),
    )]
    .into_iter()
    .collect();
    let graph = mock_graph("spacing-100", "u-spacing-100", json!("8px"));
    let (overrides, summary) = build_import_overrides(&meta, &graph, Some(&renames));
    assert_eq!(summary.overrides_emitted, 1);
    assert_eq!(overrides[0]["target"], "u-spacing-100");
}

#[test]
fn invert_name_normalizes_nested_slashes_to_dashes() {
    // A nested source name (e.g. S2.Color-theme's "Palette/blue/100")
    // must invert to the dash-form legacy key, not the slash-form tail.
    assert_eq!(
        invert_name("Palette/blue/100", None),
        Some("blue-100".to_string())
    );
    // A flat name is unaffected.
    assert_eq!(
        invert_name("colorTheme/blue-100", None),
        Some("blue-100".to_string())
    );
}

#[test]
fn invert_name_normalizes_typography_atomic_leaves() {
    assert_eq!(
        invert_name("Font size/100", None),
        Some("font-size-100".to_string())
    );
    assert_eq!(
        invert_name("Line height/Font size 100", None),
        Some("line-height-font-size-100".to_string())
    );
    assert_eq!(
        invert_name("Font weight/Extra bold", None),
        Some("extra-bold-font-weight".to_string())
    );
    assert_eq!(
        invert_name("Font style/Italic", None),
        Some("italic-font-style".to_string())
    );
    assert_eq!(
        invert_name("Font family/Default", None),
        Some("default-font-family".to_string())
    );
    // No atomic `sans-serif`/`serif` font-family token exists in
    // design-data (only `default-font-family`) — the rule still
    // produces the naming-convention-correct key; `resolve_alias_key`
    // legitimately fails to find it, so this stays `figma_only` rather
    // than silently mismatching against an unrelated token.
    assert_eq!(
        invert_name("Font family/Serif", None),
        Some("serif-font-family".to_string())
    );
}

#[test]
fn invert_name_normalizes_typography_groupings() {
    assert_eq!(
        invert_name("Body/Sans serif/Emphasized/Font weight", None),
        Some("body-sans-serif-emphasized-font-weight".to_string())
    );
    assert_eq!(
        invert_name("Body/Sans serif/Strong/Emphasized/Font style", None),
        Some("body-sans-serif-strong-emphasized-font-style".to_string())
    );
    assert_eq!(
        invert_name("Detail/Serif/Strong/Font style", None),
        Some("detail-serif-strong-font-style".to_string())
    );
    // The lone grouping without a `$ref` CTR target (an inline value) —
    // still inverts to the correct legacy key; `resolve_relationship_ref`
    // is the one that (correctly) can't resolve it further.
    assert_eq!(
        invert_name("Code/Font family", None),
        Some("code-font-family".to_string())
    );
    assert_eq!(
        invert_name("Heading/Size/XXXXL", None),
        Some("heading-size-xxxxl".to_string())
    );
}

/// S2.Color-theme is Modeless and every value is a `VARIABLE_ALIAS` —
/// this is the case `collapse_modes` used to hard-fail as unconvertible.
/// `resolve_figma_value` must follow the chain to the target's concrete
/// value so a same-value alias produces a real `match`.
#[test]
fn aliased_variable_resolves_through_target_to_concrete_value() {
    let target = mock_variable(
        "Palette/blue/100",
        "COLOR",
        vec![(
            "m-modeless",
            json!({"r": 1.0, "g": 0.5019607843137255, "b": 0.0, "a": 1.0}),
        )],
    );
    let alias = mock_variable(
        "Alias/accent-color-default",
        "COLOR",
        vec![(
            "m-modeless",
            json!({"type": "VARIABLE_ALIAS", "id": target.id.clone()}),
        )],
    );
    let meta = mock_meta_modeless(vec![target, alias]);

    let graph = mock_graph("accent-color-default", "u-accent", json!("#ff8000"));
    let (overrides, summary) = build_import_overrides(&meta, &graph, None);
    assert!(
        overrides.is_empty(),
        "resolved alias value matches design-data's value: no override needed"
    );
    assert_eq!(summary.unconvertible, Vec::<String>::new());
    assert_eq!(summary.unchanged, 1);
}

/// A `VARIABLE_ALIAS` pointing at a nonexistent target must still fail
/// closed as unconvertible, not panic.
#[test]
fn alias_to_missing_target_stays_unconvertible() {
    let alias = mock_variable(
        "Alias/dangling",
        "COLOR",
        vec![(
            "m-modeless",
            json!({"type": "VARIABLE_ALIAS", "id": "VariableID:does-not-exist"}),
        )],
    );
    let meta = mock_meta(vec![alias]);
    let graph = mock_graph("dangling", "u-dangling", json!("#ff8000"));
    let (_, summary) = build_import_overrides(&meta, &graph, None);
    assert_eq!(summary.unconvertible, vec!["Alias/dangling".to_string()]);
}

#[test]
fn nested_palette_name_resolves_instead_of_figma_only() {
    let meta = mock_meta(vec![mock_variable(
        "Palette/blue/100",
        "COLOR",
        vec![(
            "m-light",
            json!({"r": 1.0, "g": 0.5019607843137255, "b": 0.0, "a": 1.0}),
        )],
    )]);
    let graph = mock_graph("blue-100", "u-blue-100", json!("#ff8000"));
    let (overrides, summary) = build_import_overrides(&meta, &graph, None);
    assert!(overrides.is_empty());
    assert_eq!(
        summary.unchanged, 1,
        "nested Palette name must resolve to the known key, not fall through as unresolved"
    );
}

#[test]
fn diff_values_resolves_alias_through_target_name() {
    // "Standard dialog/Maximum width/Small" doesn't invert to any known
    // legacy key (design-data has no such token), but it's a Figma
    // VARIABLE_ALIAS into "platformScale/standard-dialog-maximum-width-small",
    // which does. Mirrors the real Layout-collection shape: 329 variables
    // that are all semantic aliases into `.Platform scale`.
    let target = mock_variable(
        "platformScale/standard-dialog-maximum-width-small",
        "FLOAT",
        vec![("m-modeless", json!(400.0))],
    );
    let alias = mock_variable(
        "Standard dialog/Maximum width/Small",
        "FLOAT",
        vec![(
            "m-modeless",
            json!({"type": "VARIABLE_ALIAS", "id": target.id.clone()}),
        )],
    );
    let meta = mock_meta_modeless(vec![target, alias]);
    let graph = mock_graph_with_schema(
        "standard-dialog-maximum-width-small",
        "u-sdmws",
        json!("400px"),
        "https://example.com/dimension.json",
    );

    let report = diff_values(&meta, &graph, &[], None).unwrap();
    // Both the alias and the target it points at are diffed as their own
    // Figma variables (the target's own name also inverts cleanly here) —
    // matched == 2, not 1.
    assert_eq!(report.counts.matched, 2);
    assert_eq!(report.counts.figma_only, 0);
    let entry = report
        .entries
        .iter()
        .find(|e| e.name == "Standard dialog/Maximum width/Small")
        .unwrap();
    assert_eq!(
        entry.legacy_key.as_deref(),
        Some("standard-dialog-maximum-width-small"),
        "reported key should be the alias target's, not the unresolvable own name"
    );
}

#[test]
fn diff_values_alias_with_unresolvable_target_stays_figma_only() {
    // Same shape, but the target's own inverted name isn't a known
    // design-data key either — the fallback must not invent a match.
    let target = mock_variable(
        "platformScale/totally-unknown-dimension",
        "FLOAT",
        vec![("m-modeless", json!(400.0))],
    );
    let alias = mock_variable(
        "Standard dialog/Maximum width/Small",
        "FLOAT",
        vec![(
            "m-modeless",
            json!({"type": "VARIABLE_ALIAS", "id": target.id.clone()}),
        )],
    );
    let meta = mock_meta_modeless(vec![target, alias]);
    let graph = mock_graph_with_schema(
        "standard-dialog-maximum-width-small",
        "u-sdmws",
        json!("400px"),
        "https://example.com/dimension.json",
    );

    let report = diff_values(&meta, &graph, &[], None).unwrap();
    // Both the alias and its (also-unresolvable) target end up figma_only.
    assert_eq!(report.counts.figma_only, 2);
    assert_eq!(report.counts.matched, 0);
}

#[test]
fn diff_values_resolves_alias_target_via_supplied_renames() {
    // The alias target's own Figma name ("PlatformScaleOddName") has no
    // '/' at all, so invert_name's generic fallback can't invert it on
    // its own — it only resolves through a `--mapping` override, exactly
    // like diff_values' own direct-name resolution already supports.
    // Regression test: resolve_alias_target must thread `reversed`
    // through to its `invert_name` call, not just try `None`.
    let target = mock_variable(
        "PlatformScaleOddName",
        "FLOAT",
        vec![("m-modeless", json!(400.0))],
    );
    let alias = mock_variable(
        "Standard dialog/Maximum width/Small",
        "FLOAT",
        vec![(
            "m-modeless",
            json!({"type": "VARIABLE_ALIAS", "id": target.id.clone()}),
        )],
    );
    let meta = mock_meta_modeless(vec![target, alias]);
    let graph = mock_graph_with_schema(
        "standard-dialog-maximum-width-small",
        "u-sdmws",
        json!("400px"),
        "https://example.com/dimension.json",
    );
    let mapping: HashMap<String, String> = [(
        "standard-dialog-maximum-width-small".to_string(),
        "PlatformScaleOddName".to_string(),
    )]
    .into_iter()
    .collect();

    let report = diff_values(&meta, &graph, &[], Some(&mapping)).unwrap();
    let entry = report
        .entries
        .iter()
        .find(|e| e.name == "Standard dialog/Maximum width/Small")
        .unwrap();
    assert!(
        matches!(entry.class, DiffClass::Match),
        "expected Match, got {:?}",
        entry.class
    );
    assert_eq!(
        entry.legacy_key.as_deref(),
        Some("standard-dialog-maximum-width-small")
    );
}

#[test]
fn diff_values_resolves_alias_two_hops_deep() {
    // Mirrors the real Layout collection: `Banner/Gap/Horizontal` ->
    // `platformScale/banner-gap-horizontal` (itself unresolvable — its
    // structured name has no legacyKey) -> `platformScale/spacing-400`
    // (resolvable). resolve_alias_target must walk past the first,
    // unresolvable hop instead of giving up on it.
    let primitive = mock_variable(
        "platformScale/spacing-400",
        "FLOAT",
        vec![("m-modeless", json!(32.0))],
    );
    let intermediate = mock_variable(
        "platformScale/banner-gap-horizontal",
        "FLOAT",
        vec![(
            "m-modeless",
            json!({"type": "VARIABLE_ALIAS", "id": primitive.id.clone()}),
        )],
    );
    let alias = mock_variable(
        "Banner/Gap/Horizontal",
        "FLOAT",
        vec![(
            "m-modeless",
            json!({"type": "VARIABLE_ALIAS", "id": intermediate.id.clone()}),
        )],
    );
    let meta = mock_meta_modeless(vec![primitive, intermediate, alias]);
    let graph = mock_graph_with_schema(
        "spacing-400",
        "u-spacing-400",
        json!("32px"),
        "https://example.com/dimension.json",
    );

    let report = diff_values(&meta, &graph, &[], None).unwrap();
    let entry = report
        .entries
        .iter()
        .find(|e| e.name == "Banner/Gap/Horizontal")
        .unwrap();
    assert!(
        matches!(entry.class, DiffClass::Match),
        "expected Match, got {:?}",
        entry.class
    );
    assert_eq!(entry.legacy_key.as_deref(), Some("spacing-400"));
}

#[test]
fn diff_values_alias_chain_cycle_terminates_without_hang() {
    // Two variables aliasing each other in a loop must not resolve and
    // must not hang — resolve_alias_target's MAX_ALIAS_DEPTH cap is what
    // keeps this from spinning forever the way an unbounded chain walk
    // would on a malformed/cyclic Figma file.
    let a = mock_variable(
        "Cycle/A",
        "FLOAT",
        vec![(
            "m-modeless",
            json!({"type": "VARIABLE_ALIAS", "id": "var-Cycle/B"}),
        )],
    );
    let b = mock_variable(
        "Cycle/B",
        "FLOAT",
        vec![(
            "m-modeless",
            json!({"type": "VARIABLE_ALIAS", "id": "var-Cycle/A"}),
        )],
    );
    let meta = mock_meta_modeless(vec![a, b]);
    let graph = mock_graph_with_schema(
        "unrelated",
        "u-unrelated",
        json!("1px"),
        "https://example.com/dimension.json",
    );

    let report = diff_values(&meta, &graph, &[], None).unwrap();
    // Neither side of the cycle resolves — both stay figma_only, and the
    // call returns instead of looping forever.
    assert_eq!(report.counts.figma_only, 2);
    assert_eq!(report.counts.matched, 0);
}

#[test]
fn diff_values_rejects_direct_match_onto_composite_shape() {
    // "Alias/drop-shadow/dragged" (COLOR) is a VARIABLE_ALIAS into a flat
    // color variable. Naive name inversion of its own name ("Alias/drop-
    // shadow/dragged" -> "drop-shadow-dragged") coincidentally equals the
    // key of an unrelated design-data token: a composite, multi-layer
    // drop-shadow (`value` is an array of shadow-layer objects). A scalar
    // COLOR variable can never legitimately match that shape, so the
    // direct hit must be rejected and the alias-target fallback should
    // find the real (flat-color) sibling, "drop-shadow-dragged-color",
    // instead. Regression test for the real S2 baseline mismatch this
    // shape confusion caused (design_data_only in previous test naming).
    let target = mock_variable(
        "colorTheme/drop-shadow-dragged-color",
        "COLOR",
        vec![(
            "m-modeless",
            json!({"r": 0.0, "g": 0.0, "b": 0.0, "a": 0.2}),
        )],
    );
    let alias = mock_variable(
        "Alias/drop-shadow/dragged",
        "COLOR",
        vec![(
            "m-modeless",
            json!({"type": "VARIABLE_ALIAS", "id": target.id.clone()}),
        )],
    );
    let meta = mock_meta_modeless(vec![target, alias]);
    let graph = mock_graph_multi(vec![
        (
            "drop-shadow-dragged",
            json!({
                "$schema": "https://example.com/drop-shadow.json",
                "name": "drop-shadow-dragged",
                "value": [{"x": "0px", "y": "12px", "blur": "16px", "spread": "0px", "color": "#000000"}],
                "uuid": "u-composite",
            }),
        ),
        (
            "drop-shadow-dragged-color",
            json!({
                "$schema": "https://example.com/color.json",
                "name": "drop-shadow-dragged-color",
                "value": "rgba(0, 0, 0, 0.2)",
                "uuid": "u-flat",
            }),
        ),
    ]);

    let report = diff_values(&meta, &graph, &[], None).unwrap();
    let entry = report
        .entries
        .iter()
        .find(|e| e.name == "Alias/drop-shadow/dragged")
        .unwrap();
    assert!(
        matches!(entry.class, DiffClass::Match),
        "expected Match against the flat color sibling, got {:?}",
        entry.class
    );
    assert_eq!(
        entry.legacy_key.as_deref(),
        Some("drop-shadow-dragged-color")
    );
}

/// End-to-end check: an emitted override must satisfy
/// `apply_platform_manifest`'s type-kind guard (`graph.rs:810`) — the
/// value it feeds back in ("#0000ff") has to match the original's JSON
/// kind (string), or the manifest would reject its own generated output.
#[test]
fn emitted_override_applies_cleanly_through_platform_manifest() {
    let meta = mock_meta(vec![mock_variable(
        "colorTheme/blue-100",
        "COLOR",
        vec![("m-light", json!({"r": 0.0, "g": 0.0, "b": 1.0, "a": 1.0}))],
    )]);
    let mut graph = mock_graph("blue-100", "u-blue-100", json!("#ff8000"));
    let (overrides, summary) = build_import_overrides(&meta, &graph, None);
    assert_eq!(summary.overrides_emitted, 1);

    let manifest = json!({ "overrides": overrides });
    graph.apply_platform_manifest(&manifest).unwrap();

    let record = graph.resolve_alias_key("u-blue-100").unwrap();
    assert_eq!(record.raw.get("value"), Some(&json!("#0000ff")));
}
