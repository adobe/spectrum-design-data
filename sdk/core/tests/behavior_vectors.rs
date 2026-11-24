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

fn rewrite_to_facets(node: &mut Value, count: &mut usize) {
    match node {
        Value::Object(map) => {
            for key in ["when", "visibleWhen"] {
                let Some(cond) = map.get_mut(key).and_then(Value::as_object_mut) else {
                    continue;
                };
                let mut facets = serde_json::Map::new();
                if let Some(opts) = cond.get_mut("options").and_then(Value::as_object_mut) {
                    for (opt, facet, value) in [
                        ("isSelected", "checked", "checked"),
                        ("isDisabled", "disabled", "true"),
                    ] {
                        if opts.get(opt) == Some(&Value::Bool(true)) {
                            opts.remove(opt);
                            facets.insert(facet.into(), json!(value));
                        }
                    }
                    if opts.is_empty() {
                        cond.remove("options");
                    }
                }
                if let Some(states) = cond.get_mut("states").and_then(Value::as_array_mut) {
                    if states.iter().any(|s| s == "hover") {
                        states.retain(|s| s != "hover");
                        facets.insert("hovered".into(), json!("true"));
                    }
                    if states.is_empty() {
                        cond.remove("states");
                    }
                }
                *count += facets.len();
                if !facets.is_empty() {
                    cond.insert("facets".into(), Value::Object(facets));
                }
            }
            for v in map.values_mut() {
                rewrite_to_facets(v, count);
            }
        }
        Value::Array(items) => items.iter_mut().for_each(|v| rewrite_to_facets(v, count)),
        _ => {}
    }
}

/// A recipe that reads facets compiles to exactly what the equivalent option and state
/// conditions compile to, so a render cannot change; a recipe with no `facets` clause is untouched.
#[test]
fn facet_conditions_compile_to_the_equivalent_option_conditions() {
    use design_data_core::visual::compile_recipe;
    let pkg = packages().join("design-data");
    let (b, _) = dirs();
    let mut g = TokenGraph::from_json_dir_with_catalogs(
        &pkg.join("tokens"),
        Some(&pkg.join("mode-sets")),
        Some(&pkg.join("components")),
    )
    .unwrap()
    .with_relationships(TokenGraph::load_spec_relationships(&pkg.join("relationships")).unwrap())
    .with_icons(TokenGraph::load_spec_icons(&pkg.join("icons")).unwrap());
    g.visuals = TokenGraph::load_spec_visuals(&pkg.join("visuals")).unwrap();
    g.behaviors = TokenGraph::load_spec_behaviors(&b).unwrap();
    g.behavior_patterns = TokenGraph::load_spec_behavior_patterns(&b.join("patterns")).unwrap();
    let recipe = g
        .visuals
        .iter()
        .find(|v| v.component == "switch")
        .unwrap()
        .raw
        .clone();
    let mode: std::collections::HashMap<String, String> =
        [("colorScheme", "light"), ("scale", "desktop")]
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect();
    let mut faceted = recipe.clone();
    let mut count = 0;
    rewrite_to_facets(&mut faceted, &mut count);
    assert!(
        count >= 9,
        "the switch recipe should have facet-able conditions, got {count}"
    );
    assert_ne!(recipe, faceted);
    let want = compile_recipe(&g, &recipe, "switch", &[mode.clone()]).unwrap();
    let got = compile_recipe(&g, &faceted, "switch", &[mode.clone()]).unwrap();
    assert_eq!(want, got);

    // Mutation guard: a facet that selects a different option changes the compile.
    let mut wrong = faceted.clone();
    let swap = |n: &mut Value| {
        if let Some(c) = n.pointer_mut("/parts/track/props/fill/1/when/facets") {
            *c = json!({ "disabled": "true" });
        }
    };
    swap(&mut wrong);
    assert_ne!(want, compile_recipe(&g, &wrong, "switch", &[mode]).unwrap());
}
