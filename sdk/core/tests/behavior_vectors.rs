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
    let results = run_dir(&b, &s, None, None, &all_capabilities()).unwrap();
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
    let results = run_dir(&b, &s, Some("switch"), None, &touch).unwrap();
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
        None,
    )
    .iter()
    .filter(|r| matches!(r.status, Status::Fail(_)))
    .count()
}

/// Each break of a contract, or of the toggle pattern it extends, must fail at least one vector,
/// or the vectors prove nothing. A pointer starting `toggle:` edits the pattern.
#[test]
fn a_broken_transition_fails_a_vector() {
    let toggle = [
        (
            "toggle:/transitions/0/do",
            json!({ "set": { "isSelected": true } }),
        ),
        (
            "toggle:/transitions/0/guard",
            json!({ "facet": "disabled", "is": "false" }),
        ),
        (
            "toggle:/transitions/0/guard",
            json!({ "facet": "readOnly", "is": "true" }),
        ),
        ("toggle:/transitions/0/emit", json!("changed")),
        (
            "toggle:/facets/checked/values",
            json!({ "unchecked": true, "checked": false }),
        ),
    ];
    for (component, edits) in [
        ("switch", toggle.to_vec()),
        (
            "checkbox",
            vec![
                ("/transitions/0/do", json!({ "toggle": "isSelected" })),
                ("/transitions/0/do/set/isIndeterminate", json!(true)),
                (
                    "/transitions/0/guard",
                    json!({ "all": [{ "facet": "disabled", "is": "true" }, { "facet": "readOnly", "is": "false" }] }),
                ),
                (
                    "/transitions/0/guard",
                    json!({ "all": [{ "facet": "disabled", "is": "false" }, { "facet": "readOnly", "is": "true" }] }),
                ),
                (
                    "/facets/checked/values/indeterminate",
                    json!({ "isIndeterminate": false }),
                ),
            ],
        ),
    ] {
        let (contract, vectors, patterns) = load(component);
        assert_eq!(failures(&contract, &vectors, &patterns), 0);
        for (pointer, value) in edits {
            let (mut broken, mut broken_patterns) = (contract.clone(), patterns.clone());
            match pointer.strip_prefix("toggle:") {
                Some(p) => {
                    let t = broken_patterns
                        .iter_mut()
                        .find(|p| p.pattern == "toggle")
                        .unwrap();
                    *t.raw.pointer_mut(p).unwrap() = value;
                }
                None => *broken.pointer_mut(pointer).unwrap() = value,
            }
            assert!(
                failures(&broken, &vectors, &broken_patterns) > 0,
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

fn rewrite_to_facets(node: &mut Value, mapping: &[(&str, &str, &str)], count: &mut usize) {
    match node {
        Value::Object(map) => {
            for key in ["when", "visibleWhen"] {
                let Some(cond) = map.get_mut(key).and_then(Value::as_object_mut) else {
                    continue;
                };
                let mut facets = serde_json::Map::new();
                if let Some(opts) = cond.get_mut("options").and_then(Value::as_object_mut) {
                    for (opt, facet, value) in mapping.iter().copied() {
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
                rewrite_to_facets(v, mapping, count);
            }
        }
        Value::Array(items) => items
            .iter_mut()
            .for_each(|v| rewrite_to_facets(v, mapping, count)),
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
    let switch_map = [
        ("isSelected", "checked", "checked"),
        ("isDisabled", "disabled", "true"),
    ];
    rewrite_to_facets(&mut faceted, &switch_map, &mut count);
    assert!(
        count >= 9,
        "the switch recipe should have facet-able conditions, got {count}"
    );
    assert_ne!(recipe, faceted);
    let want = compile_recipe(&g, &recipe, "switch", &[mode.clone()]).unwrap();
    let got = compile_recipe(&g, &faceted, "switch", &[mode.clone()]).unwrap();
    assert_eq!(want, got);

    // Checkbox: only `indeterminate` selects exactly one option. `checked` also needs
    // `isIndeterminate: false`, which would add that option to the compiled scene conditions, so
    // the recipe keeps `isSelected` in option form.
    let recipe = g
        .visuals
        .iter()
        .find(|v| v.component == "checkbox")
        .unwrap()
        .raw
        .clone();
    let mut faceted = recipe.clone();
    let mut count = 0;
    let map = [("isIndeterminate", "checked", "indeterminate")];
    rewrite_to_facets(&mut faceted, &map, &mut count);
    assert_eq!(count, 2);
    let want = compile_recipe(&g, &recipe, "checkbox", &[mode.clone()]).unwrap();
    let got = compile_recipe(&g, &faceted, "checkbox", &[mode.clone()]).unwrap();
    assert_eq!(want, got);
    let mut selected = recipe.clone();
    rewrite_to_facets(
        &mut selected,
        &[("isSelected", "checked", "checked")],
        &mut 0,
    );
    let got = compile_recipe(&g, &selected, "checkbox", &[mode.clone()]).unwrap();
    assert_ne!(want, got, "`checked` is not the option form of isSelected");

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

#[test]
fn a_raise_cycle_fails_the_vector_instead_of_overflowing() {
    let (mut contract, vectors, patterns) = load("switch");
    contract["transitions"] = json!([{ "on": "activate", "do": { "raise": "press" } }]);
    let r = run_vectors(
        &contract,
        &patterns,
        &vectors[..1],
        RegistryData::embedded(),
        &all_capabilities(),
        None,
    );
    assert!(
        matches!(&r[0].status, Status::Fail(f) if f[0].contains("raise")),
        "{:?}",
        r[0].status
    );
}

#[test]
fn raise_without_a_part_press_fails_the_vector() {
    let (mut contract, vectors, patterns) = load("switch");
    contract["parts"]["track"]
        .as_object_mut()
        .unwrap()
        .remove("press");
    let v = [
        json!({ "name": "x", "start": {}, "steps": [{ "intent": "press-start" }, { "intent": "press-end" }], "expect": [] }),
    ];
    let r = run_vectors(
        &contract,
        &patterns,
        &v,
        RegistryData::embedded(),
        &all_capabilities(),
        None,
    );
    assert!(matches!(&r[0].status, Status::Fail(f) if f[0].contains("no part declares")));
    let _ = vectors;
}

#[test]
fn the_event_intent_list_matches_the_registry() {
    let reg: Value = serde_json::from_str(
        &std::fs::read_to_string(packages().join("design-data/registry/intents.json")).unwrap(),
    )
    .unwrap();
    let mut want: Vec<&str> = reg["values"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|e| e["category"] == "event")
        .map(|e| e["id"].as_str().unwrap())
        .collect();
    let mut have: Vec<&str> = design_data_core::behavior::INTERACTION_EVENTS.to_vec();
    want.sort();
    have.sort();
    assert_eq!(have, want);
}

fn web_bindings() -> Value {
    serde_json::from_str(
        &std::fs::read_to_string(packages().join("design-data/behaviors/bindings/web.json"))
            .unwrap(),
    )
    .unwrap()
}

fn key_suite(role: &str) -> Vec<Value> {
    let (_, s) = dirs();
    let suite: Value = serde_json::from_str(
        &std::fs::read_to_string(s.join(format!("bindings/web/{role}.json"))).unwrap(),
    )
    .unwrap();
    suite["vectors"].as_array().unwrap().clone()
}

#[test]
fn key_vectors_run_for_every_component_with_the_role() {
    let (b, s) = dirs();
    let results = run_dir(&b, &s, None, Some("web"), &all_capabilities()).unwrap();
    for c in ["switch", "checkbox"] {
        let names: Vec<&str> = results
            .iter()
            .filter(|r| r.component == c)
            .map(|r| r.name.as_str())
            .collect();
        assert!(names.contains(&"Enter does not toggle"), "{c}: {names:?}");
        assert!(names.contains(&"Space turns it off"), "{c}: {names:?}");
    }
    assert!(run_dir(&b, &s, None, Some("ios"), &all_capabilities()).is_err());
}

#[test]
fn a_platform_without_a_keyboard_makes_key_vectors_not_applicable() {
    let tmp = std::env::temp_dir().join(format!("bindings-no-keyboard-{}", std::process::id()));
    let (b, s) = dirs();
    let bindings = tmp.join("bindings");
    std::fs::create_dir_all(&bindings).unwrap();
    std::fs::create_dir_all(tmp.join("patterns")).unwrap();
    for f in ["switch.json", "checkbox.json"] {
        std::fs::copy(b.join(f), tmp.join(f)).unwrap();
    }
    for f in ["interactive.json", "toggle.json"] {
        std::fs::copy(b.join("patterns").join(f), tmp.join("patterns").join(f)).unwrap();
    }
    let mut touch = web_bindings();
    touch["platform"] = json!("touch");
    touch["capabilities"] = json!(["assistive-activation"]);
    std::fs::write(bindings.join("touch.json"), touch.to_string()).unwrap();
    let suites = tmp.join("suites");
    std::fs::create_dir_all(suites.join("bindings/touch")).unwrap();
    let mut suite: Value =
        serde_json::from_str(&std::fs::read_to_string(s.join("bindings/web/switch.json")).unwrap())
            .unwrap();
    suite["platform"] = json!("touch");
    std::fs::write(suites.join("bindings/touch/switch.json"), suite.to_string()).unwrap();
    let results = run_dir(&tmp, &suites, None, Some("touch"), &all_capabilities()).unwrap();
    std::fs::remove_dir_all(&tmp).unwrap();
    assert_eq!(results.len(), 4);
    assert!(results
        .iter()
        .all(|r| r.status == Status::NotApplicable(vec!["keyboard".into()])));
}

/// Each break of the bindings must fail a key vector, or the vectors prove nothing.
#[test]
fn a_wrong_binding_fails_a_key_vector() {
    let (contract, _, patterns) = load("switch");
    let vectors = key_suite("switch");
    let run = |bindings: &Value| {
        run_vectors(
            &contract,
            &patterns,
            &vectors,
            RegistryData::embedded(),
            &all_capabilities(),
            Some(bindings),
        )
        .iter()
        .filter(|r| matches!(r.status, Status::Fail(_)))
        .count()
    };
    assert_eq!(run(&web_bindings()), 0);
    for (pointer, value) in [
        ("/roles/switch/keyboard/0/key", json!("Enter")),
        ("/roles/switch/keyboard/0/up", json!("press-cancel")),
        (
            "/roles/switch/keyboard/0/down",
            json!(["press-start", "press-end"]),
        ),
    ] {
        let mut broken = web_bindings();
        *broken.pointer_mut(pointer).unwrap() = value;
        assert!(run(&broken) > 0, "breaking {pointer} failed no vector");
    }
    let mut also_enter = web_bindings();
    also_enter["roles"]["switch"]["keyboard"]
        .as_array_mut()
        .unwrap()
        .push(json!({ "key": "Enter", "down": "press-start", "up": "press-end" }));
    assert!(run(&also_enter) > 0, "Enter binding failed no vector");
}

#[test]
fn an_input_step_without_bindings_fails() {
    let (contract, _, patterns) = load("switch");
    let r = run_vectors(
        &contract,
        &patterns,
        &key_suite("switch"),
        RegistryData::embedded(),
        &all_capabilities(),
        None,
    );
    assert!(r
        .iter()
        .all(|r| matches!(&r.status, Status::Fail(f) if f[0].contains("no key bindings"))));
}
