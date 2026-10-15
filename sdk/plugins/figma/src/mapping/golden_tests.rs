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
