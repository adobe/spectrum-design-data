// Copyright 2026 Adobe. All rights reserved.

//! Golden payload over a pinned cascade fixture, plus invariants over the
//! full canonical corpus. Regenerate the golden with `UPDATE_GOLDEN=1`.

use super::*;
use design_data_core::graph::TokenGraph;
use serde_json::Value;
use std::path::{Path, PathBuf};

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../..")
}

fn metadata() -> crate::types::VariablesMeta {
    serde_json::from_str(include_str!(
        "../../tests/fixtures/figma/s2-web-variables.baseline.json"
    ))
    .unwrap()
}

fn fixture_graph() -> TokenGraph {
    TokenGraph::from_json_dir(
        &Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/figma/cascade/tokens"),
    )
    .unwrap()
}

fn corpus() -> TokenGraph {
    let root = root();
    TokenGraph::from_json_dir(&root.join("packages/design-data/tokens"))
        .unwrap()
        .with_mode_sets(
            TokenGraph::load_spec_mode_sets(&root.join("packages/design-data/mode-sets")).unwrap(),
        )
        .with_relationships(
            TokenGraph::load_spec_relationships(&root.join("packages/design-data/relationships"))
                .unwrap(),
        )
}

/// Round-trip through text so float parsing matches the golden file.
fn normalize(value: impl serde::Serialize) -> Value {
    serde_json::from_slice(&serde_json::to_vec_pretty(&value).unwrap()).unwrap()
}

#[test]
fn cascade_fixture_matches_golden_payload() {
    let graph = fixture_graph();
    let specs = collection_specs(&graph.mode_sets).unwrap();
    let tokens = export_tokens(&graph).unwrap();
    let payloads: Vec<Value> = [false, true]
        .into_iter()
        .map(|redirect| {
            let (body, _) = build_export_payload_with_options(
                &tokens,
                &specs,
                &metadata(),
                None,
                &[],
                redirect,
            )
            .unwrap();
            normalize(body)
        })
        .collect();
    let path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/figma/cascade/golden-payload.json");
    if std::env::var_os("UPDATE_GOLDEN").is_some() {
        std::fs::write(&path, serde_json::to_vec_pretty(&payloads).unwrap()).unwrap();
    }
    let expected: Value = serde_json::from_slice(&std::fs::read(&path).unwrap()).unwrap();
    assert_eq!(Value::Array(payloads), expected);
}

fn metadata_with_modeless_collection() -> crate::types::VariablesMeta {
    let mut meta = metadata();
    meta.variable_collections.insert(
        "c-spectrum".to_string(),
        crate::types::FigmaVariableCollection {
            id: "c-spectrum".to_string(),
            name: MODELESS_COLLECTION.to_string(),
            key: "k-spectrum".to_string(),
            modes: vec![crate::types::FigmaMode {
                mode_id: "m-spectrum".to_string(),
                name: "Mode 1".to_string(),
            }],
            default_mode_id: "m-spectrum".to_string(),
            remote: false,
            hidden_from_publishing: false,
            variable_ids: vec![],
        },
    );
    meta
}

#[test]
fn modeless_layer_aliases_single_axis_tokens_and_copies_invariant_values() {
    let graph = fixture_graph();
    let specs = collection_specs(&graph.mode_sets).unwrap();
    let tokens = export_tokens(&graph).unwrap();
    let meta = metadata_with_modeless_collection();
    let (mut body, mut summary) =
        build_export_payload_with_options(&tokens, &specs, &meta, None, &[], false).unwrap();
    let before = body.variables.len();
    append_modeless_layer(&mut body, &mut summary, &tokens, &specs, &meta, None).unwrap();
    assert!(body.variables.len() > before);

    let modeless = |name: &str| {
        let variable = body
            .variables
            .iter()
            .find(|v| v.variable_collection_id == "c-spectrum" && v.name == name)
            .unwrap_or_else(|| panic!("modeless variable {name}"));
        let value = body
            .variable_mode_values
            .iter()
            .find(|mv| Some(&mv.variable_id) == variable.id.as_ref())
            .unwrap();
        assert_eq!(value.mode_id, "m-spectrum");
        value.value.clone()
    };
    let group_id = |name: &str| {
        body.variables
            .iter()
            .find(|v| v.name == name)
            .and_then(|v| v.id.clone())
            .unwrap()
    };

    let color = modeless("accent-color-100");
    assert_eq!(color["type"], "VARIABLE_ALIAS");
    assert_eq!(color["id"], group_id("colorTheme/accent-color-100"));
    let size = modeless("font-size-100");
    assert_eq!(size["id"], group_id("platformScale/font-size-100"));
    let spacing = modeless("spacing-100");
    assert!(spacing.get("type").is_none(), "{spacing}");
    assert_eq!(spacing, serde_json::json!(8.0));
}

#[test]
fn modeless_layer_requires_the_collection_to_exist() {
    let graph = fixture_graph();
    let specs = collection_specs(&graph.mode_sets).unwrap();
    let tokens = export_tokens(&graph).unwrap();
    let meta = metadata();
    let (mut body, mut summary) =
        build_export_payload_with_options(&tokens, &specs, &meta, None, &[], false).unwrap();
    let error =
        append_modeless_layer(&mut body, &mut summary, &tokens, &specs, &meta, None).unwrap_err();
    assert!(error.to_string().contains(MODELESS_COLLECTION), "{error}");
}

#[test]
fn unprefixed_specs_name_variables_by_bare_token_name() {
    let graph = fixture_graph();
    let specs = without_folder_prefix(collection_specs(&graph.mode_sets).unwrap());
    let tokens = export_tokens(&graph).unwrap();
    let meta = metadata_with_modeless_collection();
    let (mut body, mut summary) =
        build_export_payload_with_options(&tokens, &specs, &meta, None, &[], false).unwrap();
    append_modeless_layer(&mut body, &mut summary, &tokens, &specs, &meta, None).unwrap();
    let in_group = |name: &str| {
        body.variables
            .iter()
            .filter(|v| v.name == name && v.variable_collection_id != "c-spectrum")
            .count()
    };
    assert_eq!(in_group("accent-color-100"), 1);
    assert_eq!(in_group("spacing-100"), 1);
    assert!(body.variables.iter().all(|v| !v.name.contains('/')));
    let modeless: Vec<_> = body
        .variables
        .iter()
        .filter(|v| v.variable_collection_id == "c-spectrum")
        .map(|v| v.id.clone().unwrap())
        .collect();
    let unique: std::collections::HashSet<_> = modeless.iter().collect();
    assert_eq!(unique.len(), modeless.len());
}

#[test]
fn bare_names_do_not_match_same_named_variables_in_other_collections() {
    let graph = fixture_graph();
    let specs = without_folder_prefix(collection_specs(&graph.mode_sets).unwrap());
    let tokens = export_tokens(&graph).unwrap();
    let mut meta = metadata_with_modeless_collection();
    meta.variable_collections.insert(
        "c-other".to_string(),
        crate::types::FigmaVariableCollection {
            id: "c-other".to_string(),
            name: "Unrelated".to_string(),
            key: "k-other".to_string(),
            modes: vec![crate::types::FigmaMode {
                mode_id: "m-other".to_string(),
                name: "Mode 1".to_string(),
            }],
            default_mode_id: "m-other".to_string(),
            remote: false,
            hidden_from_publishing: false,
            variable_ids: vec![],
        },
    );
    meta.variables.insert(
        "v-other".to_string(),
        serde_json::from_value(serde_json::json!({
            "id": "v-other",
            "name": "spacing-100",
            "key": "k",
            "variableCollectionId": "c-other",
            "resolvedType": "FLOAT",
            "valuesByMode": {"m-other": 1.0},
        }))
        .unwrap(),
    );
    let (mut body, mut summary) =
        build_export_payload_with_options(&tokens, &specs, &meta, None, &[], false).unwrap();
    append_modeless_layer(&mut body, &mut summary, &tokens, &specs, &meta, None).unwrap();
    assert!(
        body.variables
            .iter()
            .all(|v| v.id.as_deref() != Some("v-other")),
        "a same-named variable in another collection must not be updated"
    );
    let spacing = body
        .variables
        .iter()
        .find(|v| v.name == "spacing-100" && v.variable_collection_id != "c-spectrum")
        .expect("spacing-100 exported");
    assert_eq!(spacing.action, "CREATE");
}

#[test]
fn full_corpus_exports_every_collection_deterministically() {
    let graph = corpus();
    let specs = collection_specs(&graph.mode_sets).unwrap();
    let tokens = export_tokens(&graph).unwrap();
    assert!(tokens.len() > 500);
    let build = || {
        build_export_payload_with_options(&tokens, &specs, &metadata(), None, &[], false).unwrap()
    };
    let (first, summary) = build();
    assert!(summary.variables_created > 500);
    let collections: std::collections::BTreeSet<_> = first
        .variables
        .iter()
        .map(|v| v.variable_collection_id.clone())
        .collect();
    assert!(
        collections.len() >= 2,
        "expected both collections: {collections:?}"
    );
    assert_eq!(normalize(first), normalize(build().0));
}

#[test]
fn ctr_only_tokens_group_by_scale_mode() {
    use design_data_core::graph::RelationshipRecord;
    let record = |index: usize, scale: &str, value: &str, uuid: &str| RelationshipRecord {
        file: PathBuf::from("text-area.json"),
        index,
        uuid: Some(uuid.to_string()),
        raw: serde_json::json!({
            "scope": {"component": "text-area", "property": "minimum-height", "options": {"scale": scale}},
            "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/dimension.json",
            "value": value,
            "uuid": uuid,
            "legacyKey": "text-area-minimum-height",
            "setUuid": "set-1",
            "setSchema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/scale-set.json"
        }),
    };
    let graph = TokenGraph::from_json_dir(
        &Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/figma/cascade/tokens"),
    )
    .unwrap()
    .with_relationships(vec![
        record(0, "desktop", "56px", "r-1"),
        record(1, "mobile", "64px", "r-2"),
    ]);
    let tokens = export_tokens(&graph).unwrap();
    let token = tokens
        .iter()
        .find(|t| t.name == "text-area-minimum-height")
        .expect("CTR-only token exported");
    assert!(token.value.schema.ends_with(routing::SCALE_SET));
    let modes: Vec<_> = token.modes.keys().map(String::as_str).collect();
    assert_eq!(modes, ["desktop", "mobile"]);
}

/// p6ga.8.29: an override keeps its token's colour-scheme siblings in one variable,
/// whether or not its value differs from the light value.
#[test]
fn overridden_color_token_keeps_all_its_modes() {
    let color = |scheme: &str, value: &str, uuid: &str| {
        (
            uuid.to_string(),
            PathBuf::from("color-aliases.tokens.json"),
            serde_json::json!({
                "name": {"legacyKey": "seafoam-800", "colorScheme": scheme},
                "$schema": "https://example.test/color.json",
                "value": value,
                "uuid": uuid,
            }),
        )
    };
    for override_value in ["rgb(9, 144, 120)", "rgb(1, 2, 3)"] {
        let mut graph = TokenGraph::from_pairs(vec![
            color("light", "rgb(9, 144, 120)", "u-light"),
            color("dark", "rgb(8, 134, 112)", "u-dark"),
            color("wireframe", "rgb(93, 127, 201)", "u-wire"),
        ]);
        graph
            .apply_platform_manifest(&serde_json::json!({
                "specVersion": "1.0.0-draft",
                "foundationVersion": "1.0.0",
                "platform": "fixture",
                "exclude": ["colorScheme=wireframe"],
                "overrides": [{"target": "u-dark", "value": override_value}],
            }))
            .unwrap();
        let tokens = export_tokens(&graph).unwrap();
        let token = tokens.iter().find(|t| t.name == "seafoam-800").unwrap();
        let modes: Vec<_> = token.modes.keys().map(String::as_str).collect();
        assert_eq!(modes, ["dark", "light"], "override value {override_value}");
    }
}
