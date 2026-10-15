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
    let tokens = export_tokens(&fixture_graph()).unwrap();
    let payloads: Vec<Value> = [false, true]
        .into_iter()
        .map(|redirect| {
            let (body, _) =
                build_export_payload_with_options(&tokens, &metadata(), None, &[], redirect)
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
    let tokens = export_tokens(&graph).unwrap();
    assert!(tokens.len() > 500);
    let build =
        || build_export_payload_with_options(&tokens, &metadata(), None, &[], false).unwrap();
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
