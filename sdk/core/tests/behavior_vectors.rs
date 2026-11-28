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

use design_data_core::behavior::{
    all_capabilities, run_dir, run_vectors, run_vectors_with, Status,
};
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
    run_vectors_with(
        contract,
        patterns,
        vectors,
        RegistryData::embedded(),
        &all_capabilities(),
        None,
        &all_contracts(),
    )
    .iter()
    .filter(|r| matches!(r.status, Status::Fail(_)))
    .count()
}

/// Every contract, for a group whose `collection` names its item.
fn all_contracts() -> Vec<Value> {
    TokenGraph::load_spec_behaviors(&dirs().0)
        .unwrap()
        .into_iter()
        .map(|c| c.raw)
        .collect()
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

/// The option and state form of the facet clauses under `node`: the inverse of what the compiler
/// folds, for the facets the converted recipes read.
fn rewrite_to_options(node: &mut Value, count: &mut usize) {
    let fold = |facet: &str, value: &str| -> Option<(&'static str, Value)> {
        match (facet, value) {
            ("checked", "checked") => Some(("isSelected", json!(true))),
            ("checked", "indeterminate") => Some(("isIndeterminate", json!(true))),
            ("disabled", "true") => Some(("isDisabled", json!(true))),
            ("pressed", "true") => Some(("", json!("down"))),
            ("hovered", "true") => Some(("", json!("hover"))),
            _ => None,
        }
    };
    match node {
        Value::Object(map) => {
            for key in ["when", "visibleWhen"] {
                let Some(cond) = map.get_mut(key).and_then(Value::as_object_mut) else {
                    continue;
                };
                let Some(Value::Object(facets)) = cond.remove("facets") else {
                    continue;
                };
                for (facet, want) in facets {
                    let (opt, value) = fold(&facet, want.as_str().unwrap())
                        .unwrap_or_else(|| panic!("no option form for facet {facet}"));
                    *count += 1;
                    if opt.is_empty() {
                        cond.entry("states")
                            .or_insert_with(|| json!([]))
                            .as_array_mut()
                            .unwrap()
                            .push(value);
                    } else {
                        cond.entry("options")
                            .or_insert_with(|| json!({}))
                            .as_object_mut()
                            .unwrap()
                            .insert(opt.into(), value);
                    }
                }
            }
            for v in map.values_mut() {
                rewrite_to_options(v, count);
            }
        }
        Value::Array(items) => items.iter_mut().for_each(|v| rewrite_to_options(v, count)),
        _ => {}
    }
}

/// The compile output without the empty `options: {}` an interaction-only facet clause leaves
/// (`pressed` folds into `states` and no option), which no condition reads.
fn without_empty_options(mut node: Value) -> Value {
    fn go(n: &mut Value) {
        match n {
            Value::Object(map) => {
                if map
                    .get("options")
                    .is_some_and(|o| o.as_object().is_some_and(|o| o.is_empty()))
                {
                    map.remove("options");
                }
                map.values_mut().for_each(go);
            }
            Value::Array(a) => a.iter_mut().for_each(go),
            _ => {}
        }
    }
    go(&mut node);
    node
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
    let faceted = g
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
    let mut recipe = faceted.clone();
    let mut count = 0;
    rewrite_to_options(&mut recipe, &mut count);
    assert!(
        count >= 9,
        "the switch recipe should have facet conditions, got {count}"
    );
    assert_ne!(recipe, faceted);
    let want =
        without_empty_options(compile_recipe(&g, &recipe, "switch", &[mode.clone()]).unwrap());
    let got =
        without_empty_options(compile_recipe(&g, &faceted, "switch", &[mode.clone()]).unwrap());
    assert_eq!(want, got);

    // Checkbox: only `indeterminate` selects exactly one option. `checked` also needs
    // `isIndeterminate: false`, which would add that option to the compiled scene conditions, so
    // the recipe keeps `isSelected` in option form.
    let faceted = g
        .visuals
        .iter()
        .find(|v| v.component == "checkbox")
        .unwrap()
        .raw
        .clone();
    let mut recipe = faceted.clone();
    let mut count = 0;
    rewrite_to_options(&mut recipe, &mut count);
    assert_eq!(count, 5, "pressed (3) and indeterminate (2)");
    assert_ne!(recipe, faceted);
    let want =
        without_empty_options(compile_recipe(&g, &recipe, "checkbox", &[mode.clone()]).unwrap());
    let got =
        without_empty_options(compile_recipe(&g, &faceted, "checkbox", &[mode.clone()]).unwrap());
    assert_eq!(want, got);
    let mut selected = recipe.clone();
    fn as_checked(n: &mut Value, swapped: &mut usize) {
        match n {
            Value::Object(map) => {
                if let Some(cond) = map.get_mut("when").and_then(Value::as_object_mut) {
                    let had = cond
                        .get_mut("options")
                        .and_then(Value::as_object_mut)
                        .is_some_and(|o| o.remove("isSelected").is_some());
                    if had {
                        cond.insert("facets".into(), json!({ "checked": "checked" }));
                        *swapped += 1;
                    }
                }
                map.values_mut().for_each(|v| as_checked(v, swapped));
            }
            Value::Array(a) => a.iter_mut().for_each(|v| as_checked(v, swapped)),
            _ => {}
        }
    }
    let mut swapped = 0;
    as_checked(&mut selected, &mut swapped);
    assert!(swapped > 0, "the checkbox recipe reads isSelected");
    let got =
        without_empty_options(compile_recipe(&g, &selected, "checkbox", &[mode.clone()]).unwrap());
    assert_ne!(want, got, "`checked` is not the option form of isSelected");

    // Mutation guard: a facet that selects a different option changes the compile.
    let switch = g
        .visuals
        .iter()
        .find(|v| v.component == "switch")
        .unwrap()
        .raw
        .clone();
    let want =
        without_empty_options(compile_recipe(&g, &switch, "switch", &[mode.clone()]).unwrap());
    let mut wrong = switch.clone();
    *wrong
        .pointer_mut("/parts/track/props/fill/1/when/facets")
        .expect("track fill rule reads a facet") = json!({ "disabled": "true" });
    assert_ne!(
        want,
        without_empty_options(compile_recipe(&g, &wrong, "switch", &[mode]).unwrap())
    );
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
    // No keyboard and no role bindings: still not applicable, not a failure.
    touch["roles"] = json!({});
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

/// A derived pattern's facet wins over its base's, and the contract's over both.
#[test]
fn a_derived_pattern_overrides_its_base() {
    let (contract, vectors, mut patterns) = load("switch");
    assert_eq!(failures(&contract, &vectors, &patterns), 0);
    let base = patterns
        .iter_mut()
        .find(|p| p.pattern == "interactive")
        .unwrap();
    base.raw["facets"] = json!({ "checked": {
        "from": "isSelected", "values": { "unchecked": true, "checked": false }
    } });
    assert_eq!(failures(&contract, &vectors, &patterns), 0);
}

/// The vectors cannot see `semantics`, so pin what Switch and Checkbox expose for read-only.
#[test]
fn semantics_expose_aria_readonly_and_aria_checked() {
    for (component, part) in [("switch", "track"), ("checkbox", "box")] {
        let (contract, _, _) = load(component);
        let read_only = &contract["semantics"][part]["readOnly"];
        assert_eq!(read_only["ariaState"], "aria-readonly", "{component}");
        assert_eq!(
            read_only["map"],
            json!({ "false": "false", "true": "true" })
        );
    }
    let (contract, _, _) = load("checkbox");
    let box_ = &contract["semantics"]["box"];
    assert_eq!(box_["checked"]["ariaState"], "aria-checked");
    assert_eq!(box_["checked"]["map"]["indeterminate"], "mixed");
}

#[test]
fn an_environment_property_comes_from_the_registry() {
    let (contract, vectors, patterns) = load("radio-group");
    let mut bad = vectors[2].clone();
    assert_eq!(bad["start"]["direction"], "rtl");
    bad["start"]["direction"] = json!("sideways");
    assert_eq!(failures(&contract, &[bad], &patterns), 1);
    // Left out, `direction` starts at the registered initial value (ltr): a horizontal group is natural.
    let mut ltr = vectors[1].clone();
    ltr["start"].as_object_mut().unwrap().remove("direction");
    assert_eq!(failures(&contract, &[ltr], &patterns), 0);
}

#[test]
fn radio_binds_no_home_or_end() {
    let web: Value =
        serde_json::from_str(&std::fs::read_to_string(dirs().0.join("bindings/web.json")).unwrap())
            .unwrap();
    for role in ["radio", "radiogroup"] {
        let keys: Vec<&str> = web["roles"][role]["keyboard"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(|e| e["key"].as_str())
            .collect();
        assert!(
            !keys.contains(&"Home") && !keys.contains(&"End"),
            "{role}: {keys:?}"
        );
    }
}

#[test]
fn action_button_exposes_aria_pressed() {
    let (contract, _, _) = load("action-button");
    let selected = &contract["semantics"]["container"]["selected"];
    assert_eq!(selected["ariaState"], "aria-pressed");
    assert_eq!(
        selected["map"],
        json!({ "unselected": "false", "selected": "true" })
    );
}

/// `emit` is compared exactly unless a vector opts in with `emitOptions: "listed"`: dropping an
/// option from an expected event (the same as a press raising a stray option change) fails.
#[test]
fn emit_is_exact_unless_a_vector_lists_options() {
    for component in [
        "switch",
        "checkbox",
        "radio-button",
        "radio-group",
        "action-button",
    ] {
        let (contract, vectors, patterns) = load(component);
        let mut mutated = 0;
        for v in &vectors {
            let mut bad = v.clone();
            let mut changed = false;
            for e in bad["expect"].as_array_mut().unwrap() {
                for ev in e
                    .get_mut("emit")
                    .and_then(Value::as_array_mut)
                    .into_iter()
                    .flatten()
                {
                    for opts in ev.as_object_mut().unwrap().values_mut() {
                        if let Some(o) = opts.as_object_mut().filter(|o| !o.is_empty()) {
                            o.clear();
                            changed = true;
                        }
                    }
                }
            }
            if !changed {
                continue;
            }
            mutated += 1;
            assert_eq!(
                failures(&contract, &[bad.clone()], &patterns),
                1,
                "{component}"
            );
            bad["emitOptions"] = json!("listed");
            assert_eq!(
                failures(&contract, &[bad.clone()], &patterns),
                0,
                "{component} {bad}"
            );
        }
        assert!(
            mutated > 0 || component == "radio-group",
            "{component} has no vector with an emit payload"
        );
    }
}

type Mutation = Box<dyn Fn(&mut Value)>;

fn pins_of(component: &str) -> Value {
    let (_, s) = dirs();
    let suite: Value = serde_json::from_str(
        &std::fs::read_to_string(s.join(format!("{component}.json"))).unwrap(),
    )
    .unwrap();
    suite["pins"].clone()
}

/// Focus mode, the `state` list and the part role are not seen by any vector (a mutation of each
/// left a suite at 17 of 17), so the suite pins them: each mutation must now be reported.
#[test]
fn a_mutated_focus_state_or_role_fails_the_pins() {
    for component in ["close-button", "radio-button", "switch", "radio-group"] {
        let (contract, _, patterns) = load(component);
        let pins = pins_of(component);
        assert_eq!(
            design_data_core::behavior::check_contract(&contract, &patterns, Some(&pins)),
            Vec::<String>::new(),
            "{component} baseline"
        );
        let part = contract["parts"]
            .as_object()
            .unwrap()
            .keys()
            .next()
            .unwrap()
            .clone();
        let mutations: Vec<(&str, Mutation)> = vec![
            ("focus none", {
                let p = part.clone();
                Box::new(move |c| c["parts"][&p]["focus"] = json!("none"))
            }),
            ("focus roving", {
                let p = part.clone();
                Box::new(move |c| c["parts"][&p]["focus"] = json!("roving"))
            }),
            ("focus removed", {
                let p = part.clone();
                Box::new(move |c| {
                    c["parts"][&p].as_object_mut().unwrap().remove("focus");
                })
            }),
            ("role mistyped", {
                let p = part.clone();
                Box::new(move |c| c["parts"][&p]["role"] = json!("buton"))
            }),
            ("role removed", {
                let p = part.clone();
                Box::new(move |c| {
                    c["parts"][&p].as_object_mut().unwrap().remove("role");
                })
            }),
            (
                "wcag changed",
                Box::new(|c| c["wcag"][0]["criterion"] = json!("2.4.7")),
            ),
            (
                "isDisabled dropped from state",
                Box::new(|c| {
                    let s = c["state"].as_array_mut().unwrap();
                    s.retain(|x| x != "isDisabled");
                }),
            ),
        ];
        for (what, mutate) in mutations {
            let mut mutated = contract.clone();
            mutate(&mut mutated);
            if mutated == contract {
                continue;
            }
            let issues =
                design_data_core::behavior::check_contract(&mutated, &patterns, Some(&pins));
            assert!(!issues.is_empty(), "{component}: {what} went unnoticed");
        }
    }
}

#[test]
fn a_suite_without_pins_fails_and_a_facet_source_missing_from_state_fails() {
    let (contract, _, patterns) = load("close-button");
    let issues = design_data_core::behavior::check_contract(&contract, &patterns, None);
    assert!(issues.iter().any(|i| i.contains("no `pins`")), "{issues:?}");
    let mut broken = contract.clone();
    broken["state"] = json!([]);
    let issues = design_data_core::behavior::check_contract(&broken, &patterns, None);
    assert!(
        issues
            .iter()
            .any(|i| i.contains("derives from 'isDisabled'")),
        "{issues:?}"
    );
}

#[test]
fn a_key_step_on_a_role_with_no_binding_is_an_error_not_a_silent_skip() {
    let (contract, _, patterns) = load("close-button");
    let vectors = key_suite("button");
    let mut bindings = web_bindings();
    bindings["roles"].as_object_mut().unwrap().remove("button");
    let results = run_vectors(
        &contract,
        &patterns,
        &vectors,
        RegistryData::embedded(),
        &all_capabilities(),
        Some(&bindings),
    );
    let failed: Vec<_> = results
        .iter()
        .filter(
            |r| matches!(&r.status, Status::Fail(f) if f[0].contains("no entry for role 'button'")),
        )
        .collect();
    assert_eq!(failed.len(), vectors.len(), "{results:?}");
}

#[test]
fn a_key_suite_for_a_role_the_bindings_lack_fails_the_run() {
    let tmp = std::env::temp_dir().join(format!("role-unbound-{}", std::process::id()));
    let (b, s) = dirs();
    std::fs::create_dir_all(tmp.join("bindings")).unwrap();
    std::fs::create_dir_all(tmp.join("patterns")).unwrap();
    std::fs::copy(b.join("close-button.json"), tmp.join("close-button.json")).unwrap();
    for f in ["interactive.json", "press.json"] {
        std::fs::copy(b.join("patterns").join(f), tmp.join("patterns").join(f)).unwrap();
    }
    let mut bindings = web_bindings();
    bindings["roles"].as_object_mut().unwrap().remove("button");
    std::fs::write(tmp.join("bindings/web.json"), bindings.to_string()).unwrap();
    let suites = tmp.join("suites");
    std::fs::create_dir_all(suites.join("bindings/web")).unwrap();
    std::fs::copy(
        s.join("bindings/web/button.json"),
        suites.join("bindings/web/button.json"),
    )
    .unwrap();
    let results = run_dir(&tmp, &suites, None, None, &all_capabilities()).unwrap();
    std::fs::remove_dir_all(&tmp).unwrap();
    assert!(results.iter().any(
        |r| matches!(&r.status, Status::Fail(f) if f[0].contains("no entry for role 'button'"))
    ));
}

#[test]
fn display_contracts_expose_the_value_and_handle_no_intent() {
    for c in [
        "progress-bar",
        "progress-circle",
        "meter",
        "in-field-progress-circle",
    ] {
        let (contract, vectors, patterns) = load(c);
        assert_eq!(failures(&contract, &vectors, &patterns), 0, "{c}");
        // A state-changing intent is not handled: nothing here is operable.
        let press = vec![json!({
            "name": "activate", "start": {},
            "steps": [{ "intent": "activate" }], "expect": [{ "after": 1, "emit": [] }]
        })];
        assert_eq!(failures(&contract, &press, &patterns), 1, "{c} activate");
    }
}

/// Each break of the display semantics must fail a vector.
#[test]
fn a_broken_semantic_fails_a_display_vector() {
    for (c, part, edits) in [
        (
            "progress-bar",
            "container",
            vec![
                ("/value/ariaState", json!("aria-valuetext")),
                ("/value/absentWhen", json!({ "isIndeterminate": false })),
                ("/minValue/ariaState", json!("aria-valuemax")),
                ("/maxValue/copy", json!(false)),
                ("/valueLabel/ariaState", json!("aria-label")),
                ("/label/ariaState", json!("aria-valuetext")),
                (
                    "/valueLabel/absentWhen",
                    json!({ "isIndeterminate": false }),
                ),
            ],
        ),
        (
            "meter",
            "container",
            vec![
                ("/value/ariaState", json!("aria-valuemin")),
                ("/maxValue/ariaState", json!("aria-valuenow")),
                ("/valueLabel/ariaState", json!("aria-valuenow")),
                ("/label/ariaState", json!("aria-valuetext")),
            ],
        ),
    ] {
        let (contract, vectors, patterns) = load(c);
        for (path, value) in edits {
            let mut mutated = contract.clone();
            *mutated["semantics"][part].pointer_mut(path).unwrap() = value;
            assert!(
                failures(&mutated, &vectors, &patterns) > 0,
                "{c}: {path} went unnoticed"
            );
        }
        let mut mutated = contract.clone();
        mutated["semantics"][part]
            .as_object_mut()
            .unwrap()
            .remove("value");
        assert!(
            failures(&mutated, &vectors, &patterns) > 0,
            "{c}: value dropped"
        );
        let pins = pins_of(c);
        mutated = contract.clone();
        mutated["parts"][part]["focus"] = json!("tab-stop");
        assert!(
            !design_data_core::behavior::check_contract(&mutated, &patterns, Some(&pins))
                .is_empty()
        );
    }
}

/// Each break of a group contract must be reported: a role, focus mode or state change by the
/// pins, a facet that no longer follows its option by a vector.
#[test]
fn a_mutated_group_contract_fails_its_pins_or_a_vector() {
    for c in [
        "button-group",
        "swatch-group",
        "checkbox-group",
        "avatar-group",
    ] {
        let (contract, vectors, patterns) = load(c);
        let pins = pins_of(c);
        assert_eq!(failures(&contract, &vectors, &patterns), 0, "{c}");
        let mut pinned: Vec<(&str, Mutation)> = vec![
            (
                "focus roving",
                Box::new(|m| m["parts"]["container"]["focus"] = json!("roving")),
            ),
            (
                "role changed",
                Box::new(|m| m["parts"]["container"]["role"] = json!("toolbar")),
            ),
        ];
        if contract["parts"]["container"]["role"].is_string() {
            pinned.push((
                "role dropped",
                Box::new(|m| {
                    m["parts"]["container"]
                        .as_object_mut()
                        .unwrap()
                        .remove("role");
                }),
            ));
        }
        if contract["state"]
            .as_array()
            .is_some_and(|s| s.contains(&json!("isDisabled")))
        {
            pinned.push((
                "isDisabled dropped from state",
                Box::new(|m| {
                    m["state"]
                        .as_array_mut()
                        .unwrap()
                        .retain(|x| x != "isDisabled")
                }),
            ));
        }
        for (what, mutate) in pinned {
            let mut m = contract.clone();
            mutate(&mut m);
            assert!(
                !design_data_core::behavior::check_contract(&m, &patterns, Some(&pins)).is_empty(),
                "{c}: {what} went unnoticed"
            );
        }
        if contract["facets"]["orientation"].is_object() {
            let mut m = contract.clone();
            m["facets"]["orientation"]["values"] =
                json!({ "horizontal": "vertical", "vertical": "horizontal" });
            assert!(failures(&m, &vectors, &patterns) > 0, "{c}: orientation");
            let mut m = contract.clone();
            m["facets"]["orientation"]["from"] = json!("isDisabled");
            assert!(failures(&m, &vectors, &patterns) > 0, "{c}: start property");
        }
        if contract["facets"]["disabled"].is_object() {
            let mut m = contract.clone();
            m["facets"]["disabled"]["values"] = json!({ "false": true, "true": false });
            assert!(failures(&m, &vectors, &patterns) > 0, "{c}: disabled");
        }
    }
}

/// The radio group's component suite and key suite, run with the web bindings.
fn radio_group_failures(
    contract: &Value,
    bindings: &Value,
    patterns: &[design_data_core::graph::BehaviorPatternRecord],
    contracts: &[Value],
) -> usize {
    let (_, component_vectors, _) = load("radio-group");
    let mut n = 0;
    for (vectors, b) in [
        (component_vectors, None),
        (key_suite("radiogroup"), Some(bindings)),
    ] {
        n += run_vectors_with(
            contract,
            patterns,
            &vectors,
            RegistryData::embedded(),
            &all_capabilities(),
            b,
            contracts,
        )
        .iter()
        .filter(|r| matches!(r.status, Status::Fail(_)))
        .count();
    }
    n
}

/// Each traversal, choose and item rule of the radio group must be pinned by a vector: wrap, skip,
/// mirror (and a swapped binding), select-on-move and the choose mode.
#[test]
fn a_broken_collection_rule_or_swapped_arrow_binding_fails_a_vector() {
    let (contract, _, patterns) = load("radio-group");
    let contracts = all_contracts();
    let bindings = web_bindings();
    assert_eq!(
        radio_group_failures(&contract, &bindings, &patterns, &contracts),
        0
    );
    let group_edits = [
        ("wrap off", "/collection/traversal/wrap", json!(false)),
        (
            "no skip",
            "/collection/traversal/skip",
            json!({ "facet": "disabled", "is": "false" }),
        ),
        (
            "select on move off",
            "/collection/traversal/selectOnMove",
            json!(false),
        ),
        (
            "mirror never",
            "/collection/traversal/mirror",
            json!({ "facet": "arrowOrder", "is": "natural" }),
        ),
        (
            "mirror always",
            "/collection/traversal/mirror",
            json!({ "facet": "orientation", "is": "vertical" }),
        ),
        (
            "choose multiple",
            "/collection/choose/mode",
            json!("multiple"),
        ),
        ("choose none", "/collection/choose/mode", json!("none")),
    ];
    for (what, pointer, value) in group_edits {
        let mut m = contract.clone();
        *m.pointer_mut(pointer).unwrap() = value;
        assert!(
            radio_group_failures(&m, &bindings, &patterns, &contracts) > 0,
            "{what} failed no vector"
        );
    }
    let mut m = contract.clone();
    m["collection"]["traversal"]
        .as_object_mut()
        .unwrap()
        .remove("mirror");
    assert!(
        radio_group_failures(&m, &bindings, &patterns, &contracts) > 0,
        "no mirror"
    );
    // The item: choosing by `set` leaves the other radios on.
    let mut broken: Vec<Value> = contracts.clone();
    let radio = broken
        .iter_mut()
        .find(|c| c["component"] == "radio-button")
        .unwrap();
    radio["transitions"][0]["do"] = json!({ "set": { "isSelected": true } });
    assert!(
        radio_group_failures(&contract, &bindings, &patterns, &broken) > 0,
        "set instead of choose"
    );
    // Bindings: swapped arrows, each pair.
    for (a, b) in [(0, 2), (1, 3), (0, 3), (1, 2)] {
        let mut swapped = web_bindings();
        let keys = swapped["roles"]["radiogroup"]["keyboard"]
            .as_array_mut()
            .unwrap();
        let (ka, kb) = (keys[a]["key"].clone(), keys[b]["key"].clone());
        keys[a]["key"] = kb;
        keys[b]["key"] = ka;
        assert!(
            radio_group_failures(&contract, &swapped, &patterns, &contracts) > 0,
            "swapping bindings {a} and {b} failed no vector"
        );
    }
    let mut also_home = web_bindings();
    also_home["roles"]["radiogroup"]["keyboard"]
        .as_array_mut()
        .unwrap()
        .push(json!({ "key": "End", "down": "navigate-last" }));
    // `last` is not set, so End still moves nothing: the contract, not the key, decides.
    assert_eq!(
        radio_group_failures(&contract, &also_home, &patterns, &contracts),
        0
    );
    let mut last = contract.clone();
    last["collection"]["traversal"]["last"] = json!(true);
    assert!(
        radio_group_failures(&last, &also_home, &patterns, &contracts) > 0,
        "End with `last` set"
    );
}

fn inline_group(mode: Value, allows_empty: Value) -> Value {
    json!({
        "component": "swatch-group",
        "state": ["selectionMode", "allowsEmpty"],
        "facets": {
            "selectionMode": { "from": "selectionMode", "values": { "none": "none", "single": "single", "multiple": "multiple" } },
            "emptyAllowed": { "from": "allowsEmpty", "values": { "false": false, "true": true } }
        },
        "parts": { "container": { "role": "group", "focus": "none" } },
        "collection": {
            "slot": "default",
            "item": {
                "state": ["isSelected", "isDisabled"],
                "facets": {
                    "checked": { "from": "isSelected", "values": { "unchecked": false, "checked": true } },
                    "disabled": { "from": "isDisabled", "values": { "false": false, "true": true } }
                },
                "parts": { "cell": { "press": "activate" } },
                "transitions": [{ "on": "activate", "guard": { "facet": "disabled", "is": "false" }, "do": { "choose": "isSelected" }, "emit": "change" }]
            },
            "choose": { "mode": mode, "allowsEmpty": allows_empty },
            "traversal": { "wrap": false, "skip": { "facet": "disabled", "is": "true" }, "first": true, "last": true }
        }
    })
}

fn choose_vector(start: Value, steps: &[usize], emit: Value, items: Value) -> Value {
    json!({
        "name": "choose",
        "start": start,
        "steps": steps.iter().map(|i| json!({ "item": i, "intent": "activate" })).collect::<Vec<_>>(),
        "expect": [{ "after": steps.len(), "emit": emit, "items": items }]
    })
}

/// An inline item contract (a `collection: items` slot) and every choose mode: single turns the
/// others off, multiple toggles, neither turns off the last item unless the group allows empty,
/// and `none` does nothing. The mode and `allowsEmpty` may come from group facets.
#[test]
fn the_choose_modes_follow_the_group() {
    let patterns = vec![];
    let on = |l: Value| {
        let l = l.as_array().unwrap();
        json!(l
            .iter()
            .map(|x| json!({ "checked": x }))
            .collect::<Vec<_>>())
    };
    let start = |m: &str, e: bool, sel: [bool; 3]| {
        json!({
            "selectionMode": m,
            "allowsEmpty": e,
            "items": sel.iter().map(|s| json!({ "isSelected": s })).collect::<Vec<_>>()
        })
    };
    let (u, c) = ("unchecked", "checked");
    let cases = [
        (
            json!("single"),
            json!(false),
            start("single", false, [true, false, false]),
            vec![1],
            json!([{ "change": { "isSelected": [1] } }]),
            on(json!([u, c, u])),
        ),
        // The last on item is not turned off without allowsEmpty.
        (
            json!("single"),
            json!(false),
            start("single", false, [true, false, false]),
            vec![0],
            json!([]),
            on(json!([c, u, u])),
        ),
        (
            json!("single"),
            json!(true),
            start("single", true, [true, false, false]),
            vec![0],
            json!([{ "change": { "isSelected": [] } }]),
            on(json!([u, u, u])),
        ),
        (
            json!("multiple"),
            json!(false),
            start("multiple", false, [true, false, false]),
            vec![1],
            json!([{ "change": { "isSelected": [0, 1] } }]),
            on(json!([c, c, u])),
        ),
        (
            json!("multiple"),
            json!(false),
            start("multiple", false, [true, true, false]),
            vec![0, 1],
            json!([]),
            on(json!([u, c, u])),
        ),
        (
            json!("multiple"),
            json!(true),
            start("multiple", true, [true, false, false]),
            vec![0],
            json!([{ "change": { "isSelected": [] } }]),
            on(json!([u, u, u])),
        ),
        (
            json!("none"),
            json!(true),
            start("none", true, [false, false, false]),
            vec![1],
            json!([]),
            on(json!([u, u, u])),
        ),
        // The mode and allowsEmpty read from the group's facets.
        (
            json!({ "facet": "selectionMode" }),
            json!({ "facet": "emptyAllowed" }),
            start("multiple", true, [true, false, false]),
            vec![0],
            json!([{ "change": { "isSelected": [] } }]),
            on(json!([u, u, u])),
        ),
        (
            json!({ "facet": "selectionMode" }),
            json!({ "facet": "emptyAllowed" }),
            start("single", false, [true, false, false]),
            vec![2],
            json!([{ "change": { "isSelected": [2] } }]),
            on(json!([u, u, c])),
        ),
    ];
    for (n, (mode, empty, start, steps, emit, items)) in cases.into_iter().enumerate() {
        let contract = inline_group(mode, empty);
        let mut v = choose_vector(start, &steps, emit, items);
        // Facet expectations name item facets; the last step is the one checked.
        v["expect"][0]["after"] = json!(steps.len());
        let r = run_vectors_with(
            &contract,
            &patterns,
            &[v],
            RegistryData::embedded(),
            &all_capabilities(),
            None,
            &[],
        );
        assert_eq!(r[0].status, Status::Pass, "case {n}");
    }
    // A disabled item is skipped by first and last.
    let contract = inline_group(json!("single"), json!(false));
    let v = json!({
        "name": "ends",
        "start": { "selectionMode": "single", "allowsEmpty": false, "focused": 1, "items": [{ "isDisabled": true }, {}, {}, { "isDisabled": true }] },
        "steps": [{ "intent": "navigate-first" }, { "intent": "navigate-last" }],
        "expect": [{ "after": 1, "focused": 1 }, { "after": 2, "focused": 2 }]
    });
    let r = run_vectors_with(
        &contract,
        &[],
        &[v],
        RegistryData::embedded(),
        &all_capabilities(),
        None,
        &[],
    );
    assert_eq!(r[0].status, Status::Pass);
}

fn run_inline(contract: &Value, v: Value) -> Status {
    run_vectors_with(
        contract,
        &[],
        &[v],
        RegistryData::embedded(),
        &all_capabilities(),
        None,
        &[],
    )
    .remove(0)
    .status
}

/// A choose vector on an inline group: the items start as `on`, and the emit and the items after
/// the steps are what the vector expects.
fn choose_status(
    mode: &str,
    on: [bool; 3],
    steps: &[usize],
    emit: Value,
    after: [bool; 3],
) -> Status {
    let contract = inline_group(json!(mode), json!(false));
    let item = |s: bool| json!({ "checked": if s { "checked" } else { "unchecked" } });
    let v = choose_vector(
        json!({
            "selectionMode": mode,
            "allowsEmpty": false,
            "items": on.iter().map(|s| json!({ "isSelected": s })).collect::<Vec<_>>()
        }),
        steps,
        emit,
        json!(after.iter().map(|s| item(*s)).collect::<Vec<_>>()),
    );
    run_inline(&contract, v)
}

/// Mutation guards for group.rs, none reachable through the radio group: each pins one branch of
/// the runner by itself. Mutate the branch and the named test must fail.
#[test]
fn navigate_last_goes_to_the_last_item_not_the_first() {
    let contract = inline_group(json!("single"), json!(false));
    let v = json!({
        "name": "last then first",
        "start": { "selectionMode": "single", "allowsEmpty": false, "items": [{}, {}, {}] },
        "steps": [{ "intent": "navigate-last" }, { "intent": "navigate-first" }],
        "expect": [{ "after": 1, "focused": 2 }, { "after": 2, "focused": 0 }]
    });
    assert_eq!(run_inline(&contract, v), Status::Pass);
}

#[test]
fn multiple_never_turns_off_the_only_item_that_is_on() {
    assert_eq!(
        choose_status(
            "multiple",
            [false, true, false],
            &[1],
            json!([]),
            [false, true, false]
        ),
        Status::Pass
    );
}

#[test]
fn single_never_turns_off_the_item_that_is_on() {
    assert_eq!(
        choose_status(
            "single",
            [false, true, false],
            &[1],
            json!([]),
            [false, true, false]
        ),
        Status::Pass
    );
}

#[test]
fn a_choose_that_changes_nothing_emits_nothing() {
    assert_eq!(
        choose_status(
            "none",
            [false, true, false],
            &[0],
            json!([]),
            [false, true, false]
        ),
        Status::Pass
    );
}

#[test]
fn an_expectation_on_items_or_focus_needs_a_group() {
    let contract = inline_group(json!("single"), json!(false));
    for (k, want) in [
        ("items", json!([{ "checked": "checked" }])),
        ("focused", json!(0)),
    ] {
        let mut v = json!({
            "name": "no group",
            "start": { "selectionMode": "single", "allowsEmpty": false },
            "steps": [{ "intent": "navigate-next" }],
            "expect": [{ "after": 1 }]
        });
        v["expect"][0][k] = want;
        match run_inline(&contract, v) {
            Status::Fail(f) => assert!(f[0].contains(&format!("expects `{k}`")), "{f:?}"),
            s => panic!("{k}: {s:?}"),
        }
    }
}

#[test]
fn a_start_item_option_the_item_does_not_declare_fails() {
    let contract = inline_group(json!("single"), json!(false));
    let v = |opt: &str| {
        json!({
            "name": "typo",
            "start": { "selectionMode": "single", "allowsEmpty": false, "items": [{ opt: true }] },
            "steps": [{ "intent": "navigate-next" }],
            "expect": [{ "after": 1, "focused": 0 }]
        })
    };
    assert_eq!(run_inline(&contract, v("isDisabled")), Status::Pass);
    match run_inline(&contract, v("isDisabeld")) {
        Status::Fail(f) => assert!(f[0].contains("isDisabeld"), "{f:?}"),
        s => panic!("{s:?}"),
    }
}

/// Each swatch group rule (choose mode and allowsEmpty, selection facet, wrap, skip, select on
/// move) and each swatch rule (guard, choose) must be pinned by a vector.
#[test]
fn a_broken_swatch_group_rule_fails_a_vector() {
    let edits = [
        (
            "swatch-group",
            vec![
                ("wrap on", "/collection/traversal/wrap", json!(true)),
                (
                    "no skip",
                    "/collection/traversal/skip",
                    json!({ "facet": "disabled", "is": "false" }),
                ),
                (
                    "select on move",
                    "/collection/traversal/selectOnMove",
                    json!(true),
                ),
                ("mode single", "/collection/choose/mode", json!("single")),
                (
                    "mode multiple",
                    "/collection/choose/mode",
                    json!("multiple"),
                ),
                ("mode none", "/collection/choose/mode", json!("none")),
                (
                    "empty allowed",
                    "/collection/choose/allowsEmpty",
                    json!(true),
                ),
                (
                    "empty refused",
                    "/collection/choose/allowsEmpty",
                    json!(false),
                ),
                (
                    "selection always single",
                    "/facets/selection/values",
                    json!({ "single": {} }),
                ),
            ],
        ),
        (
            "swatch",
            vec![
                (
                    "guard dropped",
                    "/transitions/0/guard",
                    json!({ "facet": "disabled", "is": "true" }),
                ),
                (
                    "choose becomes a set",
                    "/transitions/0/do",
                    json!({ "set": {} }),
                ),
            ],
        ),
    ];
    for (component, list) in edits {
        let (contract, vectors, patterns) = load(component);
        assert_eq!(failures(&contract, &vectors, &patterns), 0, "{component}");
        for (what, pointer, value) in list {
            let mut m = contract.clone();
            *m.pointer_mut(pointer).unwrap() = value;
            assert!(failures(&m, &vectors, &patterns) > 0, "{component}: {what}");
        }
    }
}

/// The tooltip's rules are the `trigger-reveal` pattern's transitions: breaking any one of them
/// (what opens it, what closes it, what each ending clears, what is emitted) must fail a vector, and the
/// pins hold the part. Escape is a binding, so an unbound or wrong key fails its key suite.
#[test]
fn a_mutated_tooltip_fails_a_vector() {
    let (contract, vectors, patterns) = load("tooltip");
    assert_eq!(failures(&contract, &vectors, &patterns), 0);
    let with = |mutate: &dyn Fn(&mut Vec<Value>)| {
        let mut p = patterns.clone();
        let reveal = p
            .iter_mut()
            .find(|p| p.pattern == "trigger-reveal")
            .unwrap();
        mutate(reveal.raw["transitions"].as_array_mut().unwrap());
        failures(&contract, &vectors, &p)
    };
    let nth = |ts: &Vec<Value>, on: &str, n: usize| {
        ts.iter()
            .enumerate()
            .filter(|(_, t)| t["on"] == on)
            .nth(n)
            .unwrap()
            .0
    };
    // (intent, nth transition for it, option dropped from `do.set`)
    for (on, n, option) in [
        ("focus", 0, "isOpen"),
        ("blur", 0, "isOpen"),
        ("blur", 0, "hovered"),
        ("blur", 0, "focusVisible"),
        ("blur", 1, "hovered"),
        ("blur", 1, "focusVisible"),
        ("pointer-enter", 0, "isOpen"),
        ("pointer-enter", 0, "hovered"),
        ("pointer-leave", 0, "isOpen"),
        ("pointer-leave", 0, "hovered"),
        ("pointer-leave", 0, "focusVisible"),
        ("pointer-leave", 1, "hovered"),
        ("pointer-leave", 1, "focusVisible"),
        ("press-start", 0, "isOpen"),
        ("press-start", 0, "hovered"),
        ("press-start", 0, "focusVisible"),
        ("press-start", 1, "hovered"),
        ("press-start", 1, "focusVisible"),
        ("dismiss", 0, "isOpen"),
    ] {
        assert!(
            with(&|ts| {
                let i = nth(ts, on, n);
                ts[i]["do"]["set"].as_object_mut().unwrap().remove(option);
            }) > 0,
            "{on} #{n} without {option} went unnoticed"
        );
    }
    // Each fallback (the transition that applies when the guarded one does not) and each guard.
    for (on, n) in [
        ("focus", 1),
        ("focus", 2),
        ("blur", 1),
        ("pointer-enter", 1),
        ("pointer-leave", 1),
        ("press-start", 1),
        ("dismiss", 0),
    ] {
        assert!(
            with(&|ts| {
                let i = nth(ts, on, n);
                ts.remove(i);
            }) > 0,
            "{on} #{n} removed went unnoticed"
        );
    }
    for (on, n) in [
        ("focus", 0),
        ("blur", 0),
        ("pointer-enter", 0),
        ("pointer-leave", 0),
        ("dismiss", 0),
    ] {
        assert!(
            with(&|ts| {
                let i = nth(ts, on, n);
                ts[i].as_object_mut().unwrap().remove("guard");
            }) > 0,
            "{on} #{n} guard dropped went unnoticed"
        );
    }
    // A platform without a capability never opens the tooltip with that gesture.
    for (cap, name) in [
        ("keyboard", "keyboard focus opens the tooltip"),
        ("pointer-hover", "hover opens the tooltip"),
    ] {
        let mut bad = vectors.iter().find(|v| v["name"] == name).unwrap().clone();
        assert_eq!(bad["needs"], json!([cap]), "{name}");
        bad.as_object_mut().unwrap().remove("needs");
        let mut caps = all_capabilities();
        caps.remove(cap);
        let r = run_vectors_with(
            &contract,
            &patterns,
            &[bad],
            RegistryData::embedded(),
            &caps,
            None,
            &all_contracts(),
        );
        assert!(
            matches!(r[0].status, Status::Fail(_)),
            "without {cap} the tooltip opened"
        );
    }
    let pins = pins_of("tooltip");
    for mutate in [
        (|m: &mut Value| m["parts"]["container"]["focus"] = json!("tab-stop")) as fn(&mut Value),
        |m| m["parts"]["container"]["role"] = json!("dialog"),
        |m| m["state"] = json!(["isOpen"]),
    ] {
        let mut m = contract.clone();
        mutate(&mut m);
        assert!(!design_data_core::behavior::check_contract(&m, &patterns, Some(&pins)).is_empty());
    }
}

#[test]
fn item_aria_on_a_vector_with_no_items_fails() {
    let (contract, _, patterns) = load("accordion");
    let vectors = vec![json!({
        "name": "itemAria without start.items",
        "start": {},
        "steps": [{ "intent": "blur" }],
        "expect": [{ "after": 1, "itemAria": [{ "aria-expanded": "bogus" }] }]
    })];
    let r = run_vectors_with(
        &contract,
        &patterns,
        &vectors,
        RegistryData::embedded(),
        &all_capabilities(),
        None,
        &all_contracts(),
    );
    assert!(
        matches!(&r[0].status, Status::Fail(f) if f[0].contains("itemAria") && f[0].contains("no group to check")),
        "{:?}",
        r[0].status
    );
}

fn range_fixture() -> (Value, Vec<Value>) {
    fixture("behavior-range.json")
}

fn fixture(name: &str) -> (Value, Vec<Value>) {
    let f: Value = serde_json::from_str(
        &std::fs::read_to_string(
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("tests/fixtures")
                .join(name),
        )
        .unwrap(),
    )
    .unwrap();
    (
        f["contract"].clone(),
        f["vectors"].as_array().unwrap().clone(),
    )
}

/// The results of `vectors` on a range contract, with the web key bindings.
fn run_range(
    contract: &Value,
    vectors: &[Value],
    patterns: &[design_data_core::graph::BehaviorPatternRecord],
) -> Vec<design_data_core::behavior::VectorResult> {
    run_vectors(
        contract,
        patterns,
        vectors,
        RegistryData::embedded(),
        &all_capabilities(),
        Some(&web_bindings()),
    )
}

fn range_patterns() -> Vec<design_data_core::graph::BehaviorPatternRecord> {
    TokenGraph::load_spec_behavior_patterns(&dirs().0.join("patterns")).unwrap()
}

fn range_failures(
    contract: &Value,
    vectors: &[Value],
    patterns: &[design_data_core::graph::BehaviorPatternRecord],
) -> usize {
    run_range(contract, vectors, patterns)
        .iter()
        .filter(|r| matches!(r.status, Status::Fail(_)))
        .count()
}

#[test]
fn the_range_vectors_pass_with_the_web_slider_bindings() {
    let (contract, vectors) = range_fixture();
    let results = run_range(&contract, &vectors, &range_patterns());
    assert_eq!(results.len(), vectors.len());
    let bad: Vec<_> = results
        .iter()
        .filter(|r| r.status != Status::Pass)
        .collect();
    assert!(bad.is_empty(), "{bad:?}");
}

/// Each break of the `range` block, of the range pattern or of the slider bindings must fail a
/// vector, or the vectors prove nothing. A pointer starting `range:` edits the pattern.
#[test]
fn a_broken_range_rule_fails_a_vector() {
    let (contract, vectors) = range_fixture();
    let patterns = range_patterns();
    let off = json!({ "facet": "disabled", "is": "true" });
    let edits = [
        (
            "/range/mirror",
            json!({ "facet": "arrowOrder", "is": "natural" }),
        ),
        ("/range/page", json!({ "fraction": 0.5 })),
        ("/range/page", json!({ "size": 7 })),
        ("/range/step", json!("ghost")),
        ("/range/min", json!("step")),
        ("/range/max", json!("ghost")),
        ("/range/value", json!("ghost")),
        (
            "range:/transitions/0/do",
            json!({ "set": { "pressed": true } }),
        ),
        ("range:/transitions/1/do/adjust/by", json!(-1)),
        ("range:/transitions/2/do/adjust/by", json!(1)),
        ("range:/transitions/3/do/adjust/unit", json!("step")),
        ("range:/transitions/4/do/adjust/unit", json!("step")),
        ("range:/transitions/5/do/adjust/to", json!("max")),
        ("range:/transitions/6/do/adjust/to", json!("min")),
        ("range:/transitions/7/do/adjust/to", json!("min")),
        ("range:/transitions/1/guard", off.clone()),
        ("range:/transitions/7/guard", off),
        ("range:/transitions/1/emit", json!("changed")),
    ];
    assert_eq!(range_failures(&contract, &vectors, &patterns), 0);
    for (pointer, value) in edits {
        let (mut broken, mut broken_patterns) = (contract.clone(), patterns.clone());
        match pointer.strip_prefix("range:") {
            Some(p) => {
                let r = broken_patterns
                    .iter_mut()
                    .find(|p| p.pattern == "range")
                    .unwrap();
                *r.raw.pointer_mut(p).unwrap() = value;
            }
            None => *broken.pointer_mut(pointer).unwrap() = value,
        }
        assert!(
            range_failures(&broken, &vectors, &broken_patterns) > 0,
            "breaking {pointer} failed no vector"
        );
    }
    let mut bindings = web_bindings();
    bindings["roles"]["slider"]["keyboard"][0]["down"] = json!("decrement");
    let results = run_vectors(
        &contract,
        &patterns,
        &vectors,
        RegistryData::embedded(),
        &all_capabilities(),
        Some(&bindings),
    );
    assert!(results.iter().any(|r| matches!(r.status, Status::Fail(_))));
}

#[test]
fn a_fixed_page_size_and_a_bad_range_are_pinned() {
    let (mut contract, _) = range_fixture();
    let patterns = range_patterns();
    let key = |k: &str| json!({ "input": { "key": k, "phase": "down" } });
    let vector = |start: Value, steps: Vec<Value>, expect: Value| json!([{ "name": "v", "start": start, "steps": steps, "expect": expect }]);
    contract["range"]["page"] = json!({ "size": 7 });
    let paged = vector(
        json!({ "value": 0 }),
        vec![key("PageUp")],
        json!([{ "after": 1, "emit": [{ "change": { "value": 7 } }] }]),
    );
    assert_eq!(
        range_failures(&contract, paged.as_array().unwrap(), &patterns),
        0
    );

    let (contract, _) = range_fixture();
    let reason = |contract: &Value, v: &Value| -> String {
        let r = run_range(contract, v.as_array().unwrap(), &patterns);
        match &r[0].status {
            Status::Fail(f) => f.join("; "),
            other => format!("not a failure: {other:?}"),
        }
    };
    let expect_none = json!([{ "after": 1, "emit": [] }]);
    let cases = [
        (
            vector(
                json!({ "value": 0 }),
                vec![json!({ "intent": "move", "position": 1.5 })],
                expect_none.clone(),
            ),
            "needs a step `position` from 0 to 1",
        ),
        (
            vector(
                json!({ "value": 0 }),
                vec![json!({ "intent": "move" })],
                expect_none.clone(),
            ),
            "needs a step `position` from 0 to 1",
        ),
        (
            vector(
                json!({ "value": 0, "step": 0 }),
                vec![key("ArrowRight")],
                expect_none.clone(),
            ),
            "the step must be above 0",
        ),
        (
            vector(
                json!({ "value": 0, "minValue": 9, "maxValue": 3 }),
                vec![key("ArrowRight")],
                expect_none.clone(),
            ),
            "min at most max",
        ),
        (
            vector(
                json!({ "value": "50" }),
                vec![key("ArrowRight")],
                expect_none.clone(),
            ),
            "option 'value' is \"50\", which is not a number",
        ),
        (
            vector(
                json!({ "value": 0, "step": "5" }),
                vec![key("ArrowRight")],
                expect_none.clone(),
            ),
            "option 'step' is \"5\"",
        ),
        (
            vector(
                json!({ "value": 0, "minValue": true }),
                vec![key("ArrowRight")],
                expect_none.clone(),
            ),
            "option 'minValue' is true",
        ),
        (
            // A position does not carry over to a later step that has none.
            vector(
                json!({ "value": 0 }),
                vec![
                    json!({ "intent": "move", "position": 0.5 }),
                    json!({ "intent": "move" }),
                ],
                json!([{ "after": 1, "emit": [{ "change": { "value": 50 } }] }, { "after": 2, "emit": [] }]),
            ),
            "needs a step `position` from 0 to 1",
        ),
    ];
    for (v, why) in cases {
        let got = reason(&contract, &v);
        assert!(got.contains(why), "want {why}: {got}");
    }
    let mut no_range = contract.clone();
    no_range.as_object_mut().unwrap().remove("range");
    let any = vector(
        json!({ "value": 0 }),
        vec![key("ArrowRight")],
        expect_none.clone(),
    );
    assert!(reason(&no_range, &any).contains("has no `range`"));

    // Defaults: only `value` and `min` are named, so max (100), step (1), the page (a tenth of
    // the span) come from the runner, and an unset value goes to the minimum on ArrowRight.
    let mut bare = contract.clone();
    bare["range"] = json!({ "value": "value", "min": "minValue" });
    let defaults = vector(
        json!({ "minValue": 10 }),
        vec![key("PageUp"), key("End"), key("Home"), key("ArrowRight")],
        json!([
            { "after": 1, "emit": [{ "change": { "value": 19 } }] },
            { "after": 2, "emit": [{ "change": { "value": 100 } }] },
            { "after": 3, "emit": [{ "change": { "value": 10 } }] },
            { "after": 4, "emit": [{ "change": { "value": 11 } }] },
        ]),
    );
    assert_eq!(
        range_failures(&bare, defaults.as_array().unwrap(), &patterns),
        0
    );
    let unset = vector(
        json!({ "minValue": 10 }),
        vec![key("ArrowRight")],
        json!([{ "after": 1, "emit": [{ "change": { "value": 10 } }] }]),
    );
    assert_eq!(
        range_failures(&bare, unset.as_array().unwrap(), &patterns),
        0
    );

    let mut unlisted = contract.clone();
    unlisted["state"] = json!(["isDisabled", "value", "minValue", "step", "direction"]);
    let issues = design_data_core::behavior::check_contract(&unlisted, &patterns, None);
    assert!(
        issues
            .iter()
            .any(|i| i.contains("`range.max` names 'maxValue'")),
        "{issues:?}"
    );
}

/// Each slider, color slider and rating rule (the range block, the facets, the semantics, the
/// web key bindings) must be pinned by a component or key vector.
#[test]
fn a_broken_range_contract_or_slider_binding_fails_a_vector() {
    let edits = [
        (
            "slider",
            vec![
                ("/range/page", json!({ "fraction": 0.5 })),
                ("/range/max", json!("step")),
                ("/range/step", json!("minValue")),
                (
                    "/facets/arrowOrder/values",
                    json!({ "mirrored": "ltr", "natural": "rtl" }),
                ),
                (
                    "/facets/orientation/values",
                    json!({ "horizontal": "vertical", "vertical": "horizontal" }),
                ),
                (
                    "/semantics/thumb/orientation/ariaState",
                    json!("aria-label"),
                ),
                (
                    "/semantics/thumb/minValue/ariaState",
                    json!("aria-valuemax"),
                ),
                ("/semantics/thumb/value/ariaState", json!("aria-valuemin")),
            ],
        ),
        (
            "color-slider",
            vec![
                ("/range/page", json!({ "fraction": 0.5 })),
                ("/range/min", json!("step")),
                (
                    "/facets/arrowOrder/values",
                    json!({ "mirrored": "ltr", "natural": "rtl" }),
                ),
                (
                    "/semantics/thumb/orientation/map",
                    json!({ "horizontal": "vertical", "vertical": "horizontal" }),
                ),
                (
                    "/semantics/thumb/maxValue/ariaState",
                    json!("aria-valuemin"),
                ),
            ],
        ),
        (
            "rating",
            vec![
                ("/range/max", json!("ghost")),
                ("/range/page", json!({ "fraction": 0.5 })),
                (
                    "/facets/arrowOrder/values",
                    json!({ "mirrored": "ltr", "natural": "rtl" }),
                ),
                (
                    "/semantics/container/maxValue/ariaState",
                    json!("aria-valuemin"),
                ),
            ],
        ),
    ];
    for (component, list) in edits {
        let (contract, vectors, patterns) = load(component);
        assert_eq!(failures(&contract, &vectors, &patterns), 0, "{component}");
        for (pointer, value) in list {
            let mut m = contract.clone();
            *m.pointer_mut(pointer).unwrap() = value;
            assert!(
                failures(&m, &vectors, &patterns) > 0,
                "{component}: breaking {pointer} failed no vector"
            );
        }
    }
    // The key suite runs on all three contracts; each web binding must be pinned.
    let keys = key_suite("slider");
    for component in ["slider", "color-slider", "rating"] {
        let (contract, _, patterns) = load(component);
        let run = |bindings: &Value| {
            run_vectors(
                &contract,
                &patterns,
                &keys,
                RegistryData::embedded(),
                &all_capabilities(),
                Some(bindings),
            )
            .iter()
            .filter(|r| matches!(r.status, Status::Fail(_)))
            .count()
        };
        assert_eq!(run(&web_bindings()), 0, "{component}");
        for i in 0..8 {
            let mut b = web_bindings();
            b["roles"]["slider"]["keyboard"][i]["down"] = json!("blur");
            assert!(run(&b) > 0, "{component}: binding {i} is not pinned");
        }
    }
}

#[test]
fn the_axis_and_wrap_vectors_pass() {
    let (contract, vectors) = fixture("behavior-axes.json");
    let results = run_range(&contract, &vectors, &range_patterns());
    assert_eq!(results.len(), vectors.len());
    let bad: Vec<_> = results
        .iter()
        .filter(|r| r.status != Status::Pass)
        .collect();
    assert!(bad.is_empty(), "{bad:?}");
}

/// Each break of the axes contract, of the range pattern or of the wrap rule must fail a vector.
#[test]
fn a_broken_axis_or_wrap_rule_fails_a_vector() {
    let (contract, vectors) = fixture("behavior-axes.json");
    let patterns = range_patterns();
    let edits = [
        ("/ranges/x/wrap", json!(false)),
        (
            "/ranges/y",
            json!({ "value": "yValue", "min": "yMin", "max": "yMax", "step": "step", "wrap": true }),
        ),
        ("/ranges/x/value", json!("yValue")),
        ("/ranges/y/value", json!("xValue")),
        ("/ranges/x/min", json!("yMin")),
        ("/ranges/x/max", json!("yMax")),
        ("/ranges/y/min", json!("xMin")),
        ("/ranges/y/max", json!("xMax")),
        ("/ranges/x/page", json!({ "fraction": 0.5 })),
        ("/ranges/x/page", json!({ "size": 7 })),
        ("/ranges/y/page", json!({ "fraction": 0.5 })),
        ("range:/transitions/1/do/adjust/by", json!(-1)),
        ("range:/transitions/2/do/adjust/by", json!(1)),
        ("range:/transitions/3/do/adjust/unit", json!("step")),
        ("range:/transitions/5/do/adjust/to", json!("max")),
        ("range:/transitions/6/do/adjust/to", json!("min")),
        ("range:/transitions/7/do/adjust/to", json!("min")),
        ("range:/transitions/1/emit", json!("changed")),
        (
            "range:/transitions/1/guard",
            json!({ "facet": "disabled", "is": "true" }),
        ),
    ];
    assert_eq!(range_failures(&contract, &vectors, &patterns), 0);
    for (pointer, value) in edits {
        let (mut broken, mut broken_patterns) = (contract.clone(), patterns.clone());
        match pointer.strip_prefix("range:") {
            Some(p) => {
                let r = broken_patterns
                    .iter_mut()
                    .find(|p| p.pattern == "range")
                    .unwrap();
                *r.raw.pointer_mut(p).unwrap() = value;
            }
            None => *broken.pointer_mut(pointer).unwrap() = value,
        }
        assert!(
            range_failures(&broken, &vectors, &broken_patterns) > 0,
            "breaking {pointer} failed no vector"
        );
    }
}

#[test]
fn axis_and_wrap_mistakes_fail_with_a_reason() {
    let (contract, _) = fixture("behavior-axes.json");
    let patterns = range_patterns();
    let reason = |contract: &Value, start: Value, step: Value| -> String {
        let v = json!([{ "name": "v", "start": start, "steps": [step],
            "expect": [{ "after": 1, "emit": [] }] }]);
        let r = run_range(contract, v.as_array().unwrap(), &patterns);
        match &r[0].status {
            Status::Fail(f) => f.join("; "),
            other => format!("not a failure: {other:?}"),
        }
    };
    let start = json!({ "xValue": 5, "xMin": 0, "xMax": 360, "step": 1 });
    let cases = [
        (
            &contract,
            json!({ "intent": "increment", "axis": "z" }),
            "unknown axis 'z' (the `ranges` have x, y)",
        ),
        (
            &contract,
            json!({ "intent": "increment" }),
            "must name an `axis`",
        ),
    ];
    for (c, step, why) in cases {
        let got = reason(c, start.clone(), step);
        assert!(got.contains(why), "{why}: {got}");
    }
    let mut single = contract.clone();
    single["range"] = single["ranges"]["x"].clone();
    single.as_object_mut().unwrap().remove("ranges");
    let got = reason(
        &single,
        start.clone(),
        json!({ "intent": "increment", "axis": "x" }),
    );
    assert!(got.contains("single `range`, not `ranges`"), "{got}");
    let mut both = contract.clone();
    both["range"] = contract["ranges"]["x"].clone();
    let got = reason(&both, start.clone(), json!({ "intent": "increment" }));
    assert!(got.contains("both `range` and `ranges`"), "{got}");
    assert!(
        design_data_core::behavior::check_contract(&both, &patterns, None)
            .iter()
            .any(|m| m.contains("both `range` and `ranges`"))
    );
    let mut fixed = patterns.clone();
    fixed.iter_mut().find(|p| p.pattern == "range").unwrap().raw["transitions"][1]["do"]
        ["adjust"]["axis"] = json!("y");
    let v = json!([{ "name": "v", "start": start,
        "steps": [{ "intent": "increment", "axis": "x" }], "expect": [{ "after": 1, "emit": [] }] }]);
    let r = run_range(&contract, v.as_array().unwrap(), &fixed);
    assert!(
        matches!(&r[0].status, Status::Fail(f) if f[0].contains("addresses axis 'y', but the step names axis 'x'")),
        "{:?}",
        r[0].status
    );
    let got = reason(
        &contract,
        json!({ "xValue": 1, "xMin": 0, "xMax": 10, "step": 3 }),
        json!({ "intent": "increment", "axis": "x" }),
    );
    assert!(
        got.contains("span 10 must be above 0 and a multiple of the step 3"),
        "{got}"
    );
    let got = reason(
        &contract,
        json!({ "xValue": 1, "xMin": 5, "xMax": 5, "step": 1 }),
        json!({ "intent": "increment", "axis": "x" }),
    );
    assert!(got.contains("span 0 must be above 0"), "{got}");
    let got = reason(
        &contract,
        json!({ "xValue": 1e300, "xMin": 0, "xMax": 360, "step": 1 }),
        json!({ "intent": "increment", "axis": "x" }),
    );
    assert!(got.contains("too large to wrap"), "{got}");
    let mut mirrored = contract.clone();
    mirrored["ranges"]["x"]["mirror"] = json!({ "facet": "disabled", "is": "true" });
    assert!(
        design_data_core::behavior::check_contract(&mirrored, &patterns, None)
            .iter()
            .any(|m| m.contains("which only a single `range` takes"))
    );
    let mut ghost = contract.clone();
    ghost["ranges"]["y"]["max"] = json!("isGhost");
    assert!(
        design_data_core::behavior::check_contract(&ghost, &patterns, None)
            .iter()
            .any(|m| m.contains("`ranges.y.max` names 'isGhost'"))
    );
}

/// Each number field rule (the range block, the semantics, the part pins) must be pinned by a
/// component vector, and each web `spinbutton` key binding by the key suite.
#[test]
fn a_broken_number_field_contract_or_spinbutton_binding_fails_a_vector() {
    let (contract, vectors, patterns) = load("number-field");
    assert_eq!(failures(&contract, &vectors, &patterns), 0);
    let edits = [
        ("/range/max", json!("step")),
        ("/range/min", json!("step")),
        ("/range/step", json!("minValue")),
        ("/semantics/field/value/ariaState", json!("aria-valuemin")),
        (
            "/semantics/field/minValue/ariaState",
            json!("aria-valuemax"),
        ),
        (
            "/semantics/field/maxValue/ariaState",
            json!("aria-valuemin"),
        ),
    ];
    for (pointer, value) in edits {
        let mut m = contract.clone();
        match m.pointer_mut(pointer) {
            Some(slot) => *slot = value,
            None => {
                let (parent, key) = pointer.rsplit_once('/').unwrap();
                m.pointer_mut(parent).unwrap()[key] = value;
            }
        }
        assert!(
            failures(&m, &vectors, &patterns) > 0,
            "number-field: breaking {pointer} failed no vector"
        );
    }
    // Part, state and wcag pins are checked by `check_contract`, not by a vector.
    let pins = pins_of("number-field");
    assert!(
        design_data_core::behavior::check_contract(&contract, &patterns, Some(&pins)).is_empty()
    );
    for (pointer, value) in [
        ("/parts/field/role", json!("slider")),
        ("/parts/field/focus", json!("roving")),
        ("/parts/in-field-button/focus", json!("tab-stop")),
        ("/state", json!(["isDisabled"])),
    ] {
        let mut m = contract.clone();
        *m.pointer_mut(pointer).unwrap() = value;
        assert!(
            !design_data_core::behavior::check_contract(&m, &patterns, Some(&pins)).is_empty(),
            "number-field: breaking {pointer} fails no pin"
        );
    }
    let mut no_stepper = contract.clone();
    no_stepper["parts"]
        .as_object_mut()
        .unwrap()
        .remove("in-field-button");
    assert!(
        !design_data_core::behavior::check_contract(&no_stepper, &patterns, Some(&pins)).is_empty()
    );
    let keys = key_suite("spinbutton");
    let run = |bindings: &Value| {
        run_vectors(
            &contract,
            &patterns,
            &keys,
            RegistryData::embedded(),
            &all_capabilities(),
            Some(bindings),
        )
        .iter()
        .filter(|r| matches!(r.status, Status::Fail(_)))
        .count()
    };
    assert_eq!(run(&web_bindings()), 0);
    for i in 0..6 {
        let mut b = web_bindings();
        b["roles"]["spinbutton"]["keyboard"][i]["down"] = json!("blur");
        assert!(run(&b) > 0, "spinbutton binding {i} is not pinned");
    }
    let mut extra = web_bindings();
    extra["roles"]["spinbutton"]["keyboard"]
        .as_array_mut()
        .unwrap()
        .push(json!({ "key": "ArrowRight", "down": "increment" }));
    assert!(run(&extra) > 0, "a bound ArrowRight is not pinned");
}

#[test]
fn wrap_and_a_zero_step_need_what_they_need() {
    let (mut contract, _) = range_fixture();
    let patterns = range_patterns();
    contract["range"]["wrap"] = json!(true);
    let fail = |contract: &Value, start: Value| -> String {
        let v = json!([{ "name": "v", "start": start, "steps": [{ "intent": "increment" }],
            "expect": [{ "after": 1, "emit": [] }] }]);
        match &run_range(contract, v.as_array().unwrap(), &patterns)[0].status {
            Status::Fail(f) => f[0].clone(),
            s => panic!("{s:?}"),
        }
    };
    for start in [
        json!({ "maxValue": 10, "value": 1 }),
        json!({ "minValue": 0, "value": 1 }),
        json!({ "value": 1 }),
    ] {
        assert!(fail(&contract, start).contains("needs both bounds"));
    }
    contract["range"]["wrap"] = json!(false);
    assert!(fail(&contract, json!({ "step": 0, "value": 1 })).contains("the step must be above 0"));
}

fn text_patterns() -> Vec<design_data_core::graph::BehaviorPatternRecord> {
    range_patterns()
}

fn text_fixture() -> (Value, Vec<Value>, Vec<Value>) {
    let f: Value = serde_json::from_str(
        &std::fs::read_to_string(
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/behavior-text.json"),
        )
        .unwrap(),
    )
    .unwrap();
    (
        f["contract"].clone(),
        f["vectors"].as_array().unwrap().clone(),
        f["textboxVectors"].as_array().unwrap().clone(),
    )
}

fn textbox(contract: &Value) -> Value {
    let mut c = contract.clone();
    c["parts"]["field"]["role"] = json!("textbox");
    c
}

fn text_failures(
    contract: &Value,
    vectors: &[Value],
    patterns: &[design_data_core::graph::BehaviorPatternRecord],
    bindings: &Value,
) -> usize {
    run_vectors(
        contract,
        patterns,
        vectors,
        RegistryData::embedded(),
        &all_capabilities(),
        Some(bindings),
    )
    .iter()
    .filter(|r| matches!(r.status, Status::Fail(_)))
    .count()
}

#[test]
fn the_text_vectors_pass_with_the_web_searchbox_and_textbox_bindings() {
    let (contract, vectors, textbox_vectors) = text_fixture();
    let patterns = text_patterns();
    let results = run_range(&contract, &vectors, &patterns);
    assert_eq!(results.len(), vectors.len());
    let bad: Vec<_> = results
        .iter()
        .filter(|r| r.status != Status::Pass)
        .collect();
    assert!(bad.is_empty(), "{bad:?}");
    let results = run_range(&textbox(&contract), &textbox_vectors, &patterns);
    assert_eq!(results.len(), textbox_vectors.len());
    let bad: Vec<_> = results
        .iter()
        .filter(|r| r.status != Status::Pass)
        .collect();
    assert!(bad.is_empty(), "{bad:?}");
}

/// Each break of the text pattern, of the `hasValue` facet or of the searchbox and textbox
/// bindings must fail a vector. A pointer starting `text:` edits the pattern.
#[test]
fn a_broken_text_rule_fails_a_vector() {
    let (contract, vectors, textbox_vectors) = text_fixture();
    let patterns = text_patterns();
    let bindings = web_bindings();
    let on = json!({ "facet": "hasValue", "is": "true" });
    let off = json!({ "facet": "disabled", "is": "true" });
    let pattern_edits = [
        ("text:/facets/hasValue/values/false", json!([false, null])),
        ("text:/facets/hasValue/values/false", json!([false, ""])),
        ("text:/facets/hasValue/values/false", json!([null, ""])),
        ("text:/facets/hasValue/values/false", json!([""])),
        ("text:/facets/hasValue/otherwise", json!("false")),
        ("text:/facets/hasValue/from", json!("isDisabled")),
        ("text:/facets/disabled/values/true", json!(false)),
        ("text:/transitions/0/guard", off.clone()),
        ("text:/transitions/0/guard", on.clone()),
        (
            "text:/transitions/0/guard",
            json!({ "all": [{ "facet": "hasValue", "is": "false" }, { "facet": "disabled", "is": "false" }] }),
        ),
        ("text:/transitions/0/do/set/value", json!("x")),
        ("text:/transitions/0/do/set", json!({ "isDisabled": true })),
        ("text:/transitions/0/emit", json!("changed")),
        ("text:/transitions/1/guard", on),
        ("text:/transitions/1/guard", off),
        ("text:/transitions/1/emit", json!("change")),
        ("text:/transitions/1/do", json!({ "set": { "value": "" } })),
        ("text:/transitions/1/on", json!("clear")),
    ];
    let all = |c: &Value, p: &[design_data_core::graph::BehaviorPatternRecord], b: &Value| {
        text_failures(c, &vectors, p, b) + text_failures(&textbox(c), &textbox_vectors, p, b)
    };
    assert_eq!(all(&contract, &patterns, &bindings), 0);
    for (pointer, value) in pattern_edits {
        let mut broken = patterns.clone();
        let p = pointer.strip_prefix("text:").unwrap();
        let t = broken.iter_mut().find(|p| p.pattern == "text").unwrap();
        *t.raw.pointer_mut(p).unwrap() = value;
        assert!(
            all(&contract, &broken, &bindings) > 0,
            "breaking {pointer} failed no vector"
        );
    }
    for (pointer, value) in [
        ("/roles/searchbox/keyboard/0/down", json!("submit")),
        ("/roles/searchbox/keyboard/1/down", json!("clear")),
        ("/roles/searchbox/keyboard/0/key", json!("Space")),
        ("/roles/searchbox/keyboard/1/key", json!("Tab")),
        ("/roles/searchbox/keyboard/0/up", json!("clear")),
        ("/roles/searchbox/keyboard/1/up", json!("submit")),
    ] {
        let mut broken = bindings.clone();
        let (parent, key) = pointer.rsplit_once('/').unwrap();
        broken
            .pointer_mut(parent)
            .unwrap()
            .as_object_mut()
            .unwrap()
            .insert(key.to_string(), value);
        assert!(
            all(&contract, &patterns, &broken) > 0,
            "breaking {pointer} failed no vector"
        );
    }
    let mut textbox_keys = bindings.clone();
    for (key, intent) in [("Escape", "clear"), ("Enter", "submit")] {
        let mut b = bindings.clone();
        b["roles"]["textbox"]["keyboard"] = json!([{ "key": key, "down": intent }]);
        assert!(
            all(&contract, &patterns, &b) > 0,
            "a textbox {key} binding failed no vector"
        );
    }
    textbox_keys["roles"]["searchbox"]["keyboard"]
        .as_array_mut()
        .unwrap()
        .push(json!({ "key": "Space", "down": "clear" }));
    assert!(all(&contract, &patterns, &textbox_keys) > 0);
}

#[test]
fn the_text_registry_entries_and_bindings_are_wired() {
    let registry = RegistryData::embedded();
    assert!(registry.facet("hasValue").is_some());
    for i in ["clear", "submit"] {
        assert!(registry.intents().contains(i), "{i}");
    }
    let b = web_bindings();
    assert_eq!(b["roles"]["textbox"]["keyboard"], json!([]));
    assert_eq!(
        b["roles"]["searchbox"]["keyboard"],
        json!([
            { "key": "Escape", "down": "clear" },
            { "key": "Enter", "down": "submit" }
        ])
    );
}

/// A contract that extends both `range` and `text` (a clearable number input): `clear` writes
/// the empty string, which the range reads as an unset value, so the next step goes to a bound.
#[test]
fn clear_on_a_range_and_text_contract_leaves_an_empty_value_the_range_reads() {
    let (mut contract, _) = range_fixture();
    contract["extends"] = json!(["range", "text"]);
    let v = json!([
        { "name": "clear, then step", "start": { "minValue": 0, "maxValue": 100, "step": 1, "value": 5 },
          "steps": [{ "intent": "clear" }, { "intent": "increment" }, { "intent": "clear" }, { "intent": "decrement" }],
          "expect": [
            { "after": 1, "emit": [{ "change": { "value": "" } }], "facets": { "hasValue": "false" } },
            { "after": 2, "emit": [{ "change": { "value": 0 } }], "facets": { "hasValue": "true" } },
            { "after": 3, "emit": [{ "change": { "value": "" } }] },
            { "after": 4, "emit": [{ "change": { "value": 100 } }] }
          ] },
        { "name": "a non-empty string is still not a number", "start": { "value": "50" },
          "steps": [{ "intent": "increment" }], "expect": [{ "after": 1, "emit": [] }] }
    ]);
    let r = run_range(&contract, v.as_array().unwrap(), &range_patterns());
    assert_eq!(r[0].status, Status::Pass, "{:?}", r[0]);
    assert!(
        matches!(&r[1].status, Status::Fail(f) if f[0].contains("not a number")),
        "{:?}",
        r[1]
    );
}

fn break_at(contract: &Value, pointer: &str, value: Value) -> Value {
    let mut m = contract.clone();
    match m.pointer_mut(pointer) {
        Some(slot) => *slot = value,
        None => {
            let (parent, key) = pointer.rsplit_once('/').unwrap();
            m.pointer_mut(parent).unwrap()[key] = value;
        }
    }
    m
}

/// Each color wheel rule (the wrapping hue range, the page of 15, the semantics, the part pins)
/// must be pinned by a component vector or the pins, and the wheel has no key suite.
#[test]
fn a_broken_color_wheel_contract_fails_a_vector() {
    let (contract, vectors, patterns) = load("color-wheel");
    assert_eq!(failures(&contract, &vectors, &patterns), 0);
    let edits = [
        ("/range/wrap", json!(false)),
        ("/range/page", json!({ "size": 10 })),
        ("/range/page", json!({ "fraction": 0.1 })),
        ("/range/min", json!("step")),
        ("/range/max", json!("step")),
        ("/range/step", json!("minValue")),
        ("/range/value", json!("minValue")),
        (
            "/semantics/color-handle/value/ariaState",
            json!("aria-valuemin"),
        ),
        (
            "/semantics/color-handle/minValue/ariaState",
            json!("aria-valuemax"),
        ),
        (
            "/semantics/color-handle/maxValue/ariaState",
            json!("aria-valuemin"),
        ),
    ];
    for (pointer, value) in edits {
        let m = break_at(&contract, pointer, value);
        assert!(
            failures(&m, &vectors, &patterns) > 0,
            "color-wheel: breaking {pointer} failed no vector"
        );
    }
    let pins = pins_of("color-wheel");
    assert!(
        design_data_core::behavior::check_contract(&contract, &patterns, Some(&pins)).is_empty()
    );
    for (pointer, value) in [
        ("/parts/color-handle/focus", json!("none")),
        ("/parts/color-handle/role", json!("slider")),
        ("/state", json!(["isDisabled"])),
    ] {
        let m = break_at(&contract, pointer, value);
        assert!(
            !design_data_core::behavior::check_contract(&m, &patterns, Some(&pins)).is_empty(),
            "color-wheel: breaking {pointer} fails no pin"
        );
    }
}

/// Each color area rule (one block per axis, the options each axis reads) must be pinned by a
/// component vector or the pins.
#[test]
fn a_broken_color_area_contract_fails_a_vector() {
    let (contract, vectors, patterns) = load("color-area");
    assert_eq!(failures(&contract, &vectors, &patterns), 0);
    let mut edits = vec![
        ("/ranges/x/value", json!("y-value")),
        ("/ranges/y/value", json!("x-value")),
        ("/ranges/x/min", json!("y-minValue")),
        ("/ranges/y/min", json!("x-minValue")),
        ("/ranges/x/max", json!("y-maxValue")),
        ("/ranges/y/max", json!("x-maxValue")),
        ("/ranges/x/step", json!("x-minValue")),
        ("/ranges/y/step", json!("y-minValue")),
        ("/ranges/x/wrap", json!(true)),
        ("/ranges/y/wrap", json!(true)),
        ("/ranges/x/page", json!({ "size": 7 })),
        ("/ranges/y/page", json!({ "size": 7 })),
    ];
    edits.push(("/ranges/x/min", json!("x-maxValue")));
    for (pointer, value) in edits {
        let m = break_at(&contract, pointer, value);
        assert!(
            failures(&m, &vectors, &patterns) > 0,
            "color-area: breaking {pointer} failed no vector"
        );
    }
    let mut one_axis = contract.clone();
    one_axis["ranges"].as_object_mut().unwrap().remove("y");
    assert!(failures(&one_axis, &vectors, &patterns) > 0);
    let pins = pins_of("color-area");
    assert!(
        design_data_core::behavior::check_contract(&contract, &patterns, Some(&pins)).is_empty()
    );
    for (pointer, value) in [
        ("/parts/color-handle/focus", json!("none")),
        ("/parts/color-handle/role", json!("slider")),
        ("/state", json!(["isDisabled"])),
    ] {
        let m = break_at(&contract, pointer, value);
        assert!(
            !design_data_core::behavior::check_contract(&m, &patterns, Some(&pins)).is_empty(),
            "color-area: breaking {pointer} fails no pin"
        );
    }
}

/// Color area's per-axis semantics: each of the six entries (one attribute per axis) must be
/// pinned by a vector, and the entries must stay addressed by axis.
#[test]
fn a_broken_color_area_semantics_entry_fails_a_vector() {
    let (contract, vectors, patterns) = load("color-area");
    assert_eq!(failures(&contract, &vectors, &patterns), 0);
    let entries = contract["semantics"]["color-handle"].as_object().unwrap();
    assert_eq!(entries.len(), 6);
    assert!(contract["parts"]["color-handle"].get("role").is_none());
    for (key, entry) in entries {
        let other = if entry["axis"] == "x" { "y" } else { "x" };
        for (field, value) in [
            ("axis", json!(other)),
            ("ariaState", json!("aria-valuetext")),
            ("copy", json!(true)),
        ] {
            let mut m = contract.clone();
            if field == "copy" {
                m["semantics"]["color-handle"]
                    .as_object_mut()
                    .unwrap()
                    .remove(key);
            } else {
                m["semantics"]["color-handle"][key][field] = value;
            }
            assert!(
                failures(&m, &vectors, &patterns) > 0,
                "color-area: changing {key} {field} failed no vector"
            );
        }
        let mut m = contract.clone();
        m["semantics"]["color-handle"][key]
            .as_object_mut()
            .unwrap()
            .remove("axis");
        assert!(
            failures(&m, &vectors, &patterns) > 0,
            "color-area: dropping the axis of {key} failed no vector"
        );
    }
    let mut none = contract.clone();
    none.as_object_mut().unwrap().remove("semantics");
    assert!(failures(&none, &vectors, &patterns) > 0);
}

fn axis_reason(contract: &Value, expect: Value) -> String {
    let patterns = range_patterns();
    let v = json!([{ "name": "v",
        "start": { "x-value": 40, "y-value": 70, "x-minValue": 0, "x-maxValue": 100,
            "y-minValue": 0, "y-maxValue": 100, "step": 1 },
        "steps": [{ "intent": "blur" }], "expect": [expect] }]);
    let r = failures_detail(contract, v.as_array().unwrap(), &patterns);
    r.unwrap_or_else(|| "not a failure".into())
}

fn failures_detail(
    contract: &Value,
    vectors: &[Value],
    patterns: &[design_data_core::graph::BehaviorPatternRecord],
) -> Option<String> {
    match &run_range(contract, vectors, patterns)[0].status {
        Status::Fail(f) => Some(f.join("; ")),
        _ => None,
    }
}

/// Adversarial `axisAria` and `aria` expectations against the color area contract.
#[test]
fn an_axis_aria_expectation_is_checked_per_axis() {
    let (contract, _, _) = load("color-area");
    let ok = |expect: Value| axis_reason(&contract, expect) == "not a failure";
    assert!(ok(
        json!({ "after": 1, "axisAria": { "x": { "aria-valuenow": "40" },
        "y": { "aria-valuenow": "70" } } })
    ));
    // The same attribute reads a different value per axis.
    let got = axis_reason(
        &contract,
        json!({ "after": 1,
        "axisAria": { "x": { "aria-valuenow": "70" } } }),
    );
    assert!(
        got.contains("axis 'x' 'aria-valuenow' want 70 got 40"),
        "{got}"
    );
    let got = axis_reason(
        &contract,
        json!({ "after": 1,
        "axisAria": { "y": { "aria-valuenow": "40" } } }),
    );
    assert!(
        got.contains("axis 'y' 'aria-valuenow' want 40 got 70"),
        "{got}"
    );
    // An axis the ranges do not declare.
    let got = axis_reason(
        &contract,
        json!({ "after": 1,
        "axisAria": { "z": { "aria-valuenow": "40" } } }),
    );
    assert!(
        got.contains("axis 'z', which the contract's `ranges` do not declare"),
        "{got}"
    );
    // A per-axis attribute is not read by name alone.
    let got = axis_reason(
        &contract,
        json!({ "after": 1, "aria": { "aria-valuenow": "40" } }),
    );
    assert!(got.contains("per axis: read it in `axisAria`"), "{got}");
    // An attribute the axis does not expose.
    let got = axis_reason(
        &contract,
        json!({ "after": 1,
        "axisAria": { "x": { "aria-orientation": "horizontal" } } }),
    );
    assert!(
        got.contains("no attribute 'aria-orientation' for axis 'x'"),
        "{got}"
    );
    // Absent is `null`, not "".
    let got = axis_reason(
        &contract,
        json!({ "after": 1,
        "axisAria": { "x": { "aria-valuenow": null } } }),
    );
    assert!(got.contains("want absent got 40"), "{got}");
    // `axisAria` on a single `range` contract has no axis to name.
    let (slider, _, _) = load("slider");
    let got = axis_reason(
        &slider,
        json!({ "after": 1,
        "axisAria": { "x": { "aria-valuenow": "40" } } }),
    );
    assert!(got.contains("do not declare"), "{got}");
}

/// A contract that names an axis it cannot have, or the same attribute twice for one axis, is
/// reported by the runner's contract check.
#[test]
fn a_semantics_axis_that_cannot_resolve_is_reported() {
    let (contract, _, patterns) = load("color-area");
    let pins = pins_of("color-area");
    let check = |c: &Value| design_data_core::behavior::check_contract(c, &patterns, Some(&pins));
    assert!(check(&contract).is_empty());
    let mut m = contract.clone();
    m["semantics"]["color-handle"]["x-value"]["axis"] = json!("z");
    assert!(check(&m)
        .iter()
        .any(|e| e.contains("'z', which the contract's `ranges` do not declare")));
    let mut m = contract.clone();
    m["semantics"]["color-handle"]["y-value"]["axis"] = json!("x");
    assert!(check(&m)
        .iter()
        .any(|e| e.contains("'aria-valuenow' for axis 'x' a second time")));
    // A single `range` takes no axis.
    let (mut slider, _, patterns) = load("slider");
    let part = slider["semantics"]
        .as_object()
        .unwrap()
        .keys()
        .next()
        .unwrap()
        .clone();
    let key = slider["semantics"][&part]
        .as_object()
        .unwrap()
        .keys()
        .next()
        .unwrap()
        .clone();
    slider["semantics"][&part][&key]["axis"] = json!("x");
    assert!(
        design_data_core::behavior::check_contract(&slider, &patterns, None)
            .iter()
            .any(|e| e.contains("single `range`")),
    );
}

/// Each drop zone rule (the `press` base, the `disabled` facet, the activate part, the pins) must
/// be pinned by a vector or the pins. The drop zone has no role, so no key suite runs.
#[test]
fn a_broken_drop_zone_contract_fails_a_vector_or_a_pin() {
    let (contract, vectors, patterns) = load("drop-zone");
    assert_eq!(failures(&contract, &vectors, &patterns), 0);
    let mut no_press = contract.clone();
    no_press["extends"] = json!(["interactive"]);
    assert!(failures(&no_press, &vectors, &patterns) > 0);
    let mut no_activate = contract.clone();
    no_activate["parts"]["container"]
        .as_object_mut()
        .unwrap()
        .remove("press");
    assert!(failures(&no_activate, &vectors, &patterns) > 0);
    let pins = pins_of("drop-zone");
    assert!(
        design_data_core::behavior::check_contract(&contract, &patterns, Some(&pins)).is_empty()
    );
    for (pointer, value) in [
        ("/parts/container/focus", json!("none")),
        ("/parts/container/role", json!("button")),
        ("/parts/container/press", json!("other")),
        ("/state", json!([])),
    ] {
        let m = break_at(&contract, pointer, value);
        assert!(
            !design_data_core::behavior::check_contract(&m, &patterns, Some(&pins)).is_empty(),
            "drop-zone: breaking {pointer} fails no pin"
        );
    }
}

/// A malformed `axis` or `axisAria` is rejected by the runner, as the schema does.
#[test]
fn a_malformed_axis_or_empty_axis_aria_is_rejected() {
    let (contract, _, _) = load("color-area");
    let got = axis_reason(&contract, json!({ "after": 1, "axisAria": {} }));
    assert!(
        got.contains("`axisAria` must be an object naming at least one axis"),
        "{got}"
    );
    let got = axis_reason(&contract, json!({ "after": 1, "axisAria": { "x": {} } }));
    assert!(
        got.contains("for axis 'x' must name at least one attribute"),
        "{got}"
    );
    let got = axis_reason(&contract, json!({ "after": 1, "axisAria": [] }));
    assert!(got.contains("must be an object"), "{got}");
    let mut bad = contract.clone();
    bad["semantics"]["color-handle"]["x-value"]["axis"] = json!(3);
    let got = axis_reason(
        &bad,
        json!({ "after": 1, "axisAria": { "y": { "aria-valuenow": "70" } } }),
    );
    assert!(got.contains("has an `axis` that is not a name: 3"), "{got}");
    let patterns = range_patterns();
    let pins = pins_of("color-area");
    assert!(
        design_data_core::behavior::check_contract(&bad, &patterns, Some(&pins))
            .iter()
            .any(|e| e.contains("not a name: 3"))
    );
}

/// An `axis` in an inline collection item's semantics has no `ranges` to name: reject it.
#[test]
fn an_axis_on_inline_item_semantics_is_reported() {
    let (mut contract, _, patterns) = load("accordion");
    let item = contract["collection"]["item"].clone();
    if !item.is_object() {
        contract["collection"]["item"] = json!({ "semantics": {} });
    }
    contract["collection"]["item"]["semantics"] = json!({ "header": {
        "isExpanded": { "ariaState": "aria-expanded", "copy": true, "axis": "x" } } });
    let issues = design_data_core::behavior::check_contract(&contract, &patterns, None);
    assert!(
        issues.iter().any(
            |e| e.contains("collection.item.semantics.header.isExpanded")
                && e.contains("inline item contract")
        ),
        "{issues:?}"
    );
}

/// Each wrong `relations` expectation must fail a vector, or the vectors prove nothing.
#[test]
fn a_wrong_relations_expectation_fails_a_vector() {
    let (contract, _, patterns) = load("tooltip");
    let describes = json!({
        "from": { "role": "trigger" },
        "kind": "describedby",
        "to": { "part": "container" }
    });
    let run = |step: Value, relations: Value| {
        let vector = json!({
            "name": "relations",
            "start": {},
            "steps": [step],
            "expect": [{ "after": 1, "relations": relations }]
        });
        run_vectors(
            &contract,
            &patterns,
            &[vector],
            RegistryData::embedded(),
            &all_capabilities(),
            None,
        )
        .iter()
        .filter(|r| matches!(r.status, Status::Fail(_)))
        .count()
    };
    let open = || json!({ "intent": "focus", "via": "keyboard" });
    let closed = || json!({ "intent": "blur" });
    let with = |k: &str, v: Value| {
        let mut r = describes.clone();
        r[k] = v;
        json!([r])
    };
    assert_eq!(run(open(), json!([describes.clone()])), 0);
    assert_eq!(
        run(closed(), with("present", json!(false))),
        0,
        "a closed tooltip exposes no relation"
    );
    for (what, step, relations) in [
        ("wrong to", open(), with("to", json!({ "part": "label" }))),
        ("wrong kind", open(), with("kind", json!("labelledby"))),
        (
            "wrong from",
            open(),
            with("from", json!({ "role": "owner" })),
        ),
        (
            "present: true while closed",
            closed(),
            json!([describes.clone()]),
        ),
        (
            "present: false while open",
            open(),
            with("present", json!(false)),
        ),
        ("empty list", open(), json!([])),
        ("not a list", open(), describes.clone()),
        (
            "missing to",
            open(),
            json!([{ "from": { "role": "trigger" }, "kind": "describedby" }]),
        ),
    ] {
        assert!(run(step, relations) > 0, "{what} failed no vector");
    }
}
