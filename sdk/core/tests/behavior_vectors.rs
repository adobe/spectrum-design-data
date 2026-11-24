// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Runs every behavior conformance vector (`packages/design-data-spec/conformance/behavior`)
//! against the contracts in `packages/design-data/behaviors` with the reference runner.

use std::collections::HashSet;
use std::path::PathBuf;

use design_data_core::behavior::{all_capabilities, run_dir, run_vectors, Status};
use design_data_core::graph::TokenGraph;
use design_data_core::registry::RegistryData;
use serde_json::{json, Value};

fn packages() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages")
}

fn dirs() -> (PathBuf, PathBuf) {
    (
        packages().join("design-data/behaviors"),
        packages().join("design-data-spec/conformance/behavior"),
    )
}

#[test]
fn every_conformance_vector_passes() {
    let (b, s) = dirs();
    let results = run_dir(&b, &s, None, &all_capabilities()).unwrap();
    assert!(
        results.len() >= 20,
        "expected the switch and checkbox suites"
    );
    let failed: Vec<String> = results
        .iter()
        .filter(|r| matches!(r.status, Status::Fail(_)))
        .map(|r| format!("{} / {}: {:?}", r.component, r.name, r.status))
        .collect();
    assert!(failed.is_empty(), "{}", failed.join("\n"));
}

#[test]
fn vectors_needing_a_missing_capability_are_not_applicable() {
    let (b, s) = dirs();
    let touch: HashSet<String> = HashSet::new();
    let results = run_dir(&b, &s, Some("switch"), &touch).unwrap();
    assert!(results.iter().any(|r| r.name == "hover follows the pointer"
        && r.status == Status::NotApplicable(vec!["pointer-hover".into()])));
    assert!(results.iter().all(|r| !matches!(r.status, Status::Fail(_))));
}

fn load(
    component: &str,
) -> (
    Value,
    Vec<Value>,
    Vec<design_data_core::graph::BehaviorPatternRecord>,
) {
    let (b, s) = dirs();
    let contract = TokenGraph::load_spec_behaviors(&b)
        .unwrap()
        .into_iter()
        .find(|c| c.component == component)
        .unwrap()
        .raw;
    let suite: Value = serde_json::from_str(
        &std::fs::read_to_string(s.join(format!("{component}.json"))).unwrap(),
    )
    .unwrap();
    let patterns = TokenGraph::load_spec_behavior_patterns(&b.join("patterns")).unwrap();
    (
        contract,
        suite["vectors"].as_array().unwrap().clone(),
        patterns,
    )
}

fn failures(
    contract: &Value,
    vectors: &[Value],
    patterns: &[design_data_core::graph::BehaviorPatternRecord],
) -> usize {
    run_vectors(
        contract,
        patterns,
        vectors,
        RegistryData::embedded(),
        &all_capabilities(),
    )
    .iter()
    .filter(|r| matches!(r.status, Status::Fail(_)))
    .count()
}

/// Each break of a contract must fail at least one vector, or the vectors prove nothing.
#[test]
fn a_broken_transition_fails_a_vector() {
    for (component, edits) in [
        (
            "switch",
            vec![
                (
                    "/transitions/0/do",
                    json!({ "set": { "isSelected": true } }),
                ),
                (
                    "/transitions/0/guard",
                    json!({ "facet": "disabled", "is": "false" }),
                ),
                ("/transitions/0/emit", json!("changed")),
                (
                    "/facets/checked/values",
                    json!({ "unchecked": true, "checked": false }),
                ),
            ],
        ),
        (
            "checkbox",
            vec![
                ("/transitions/0/do", json!({ "toggle": "isSelected" })),
                ("/transitions/0/do/set/isIndeterminate", json!(true)),
                (
                    "/transitions/0/guard",
                    json!({ "facet": "disabled", "is": "true" }),
                ),
            ],
        ),
    ] {
        let (contract, vectors, patterns) = load(component);
        assert_eq!(failures(&contract, &vectors, &patterns), 0);
        for (pointer, value) in edits {
            let mut broken = contract.clone();
            *broken.pointer_mut(pointer).unwrap() = value;
            assert!(
                failures(&broken, &vectors, &patterns) > 0,
                "{component}: breaking {pointer} failed no vector"
            );
        }
    }
}

#[test]
fn a_contract_without_its_pattern_fails() {
    let (contract, vectors, _) = load("switch");
    assert!(failures(&contract, &vectors, &[]) > 0);
}

#[test]
fn an_intent_the_contract_does_not_cover_fails_unless_a_part_handles_it() {
    let (mut contract, _, patterns) = load("switch");
    let vector = json!({
        "name": "x", "start": {}, "steps": [{ "intent": "increment" }],
        "expect": [{ "after": 1, "facets": { "checked": "unchecked" } }]
    });
    assert_eq!(failures(&contract, &[vector.clone()], &patterns), 1);
    contract["parts"]["track"]["handles"] = json!(["increment"]);
    assert_eq!(failures(&contract, &[vector], &patterns), 0);
}
