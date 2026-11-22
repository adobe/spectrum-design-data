// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-108: visual-slot-part-valid
//!
//! A recipe part of kind `slot` draws a component's slot fills. It MUST be the `part` of
//! exactly one non-collection slot of the component, and that slot MUST declare `accepts`,
//! because the compiler embeds the recipe of every accepted component. Each accepted component
//! MUST be declared with a recipe and MUST NOT nest the host; the part's `with` options MUST be
//! valid for the accepted components that declare them and declared by at least one; `sizeMap`
//! MUST cover every size of the host and map into each accepted recipe's `sizeScale`; and the
//! part MUST sit in the root or a row box, where the solver lays it out.

use serde_json::Value;

use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::spec089::{check_option, nesting_problem};
use crate::validate::rules::visual_util::{component_of, error};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-108"
    }

    fn name(&self) -> &'static str {
        "visual-slot-part-valid"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let graph = ctx.graph;
        if graph.components.is_empty() {
            return vec![]; // no component catalog loaded
        }
        let mut out = Vec::new();
        for v in &graph.visuals {
            let Some(parts) = v.raw.get("parts").and_then(Value::as_object) else {
                continue;
            };
            for (id, part) in parts
                .iter()
                .filter(|(_, p)| p.get("kind").and_then(Value::as_str) == Some("slot"))
            {
                let path = format!("/parts/{id}");
                let comp = &v.component;
                let mut bad = |at: &str, reason: String| {
                    out.push(error(
                        self.id(),
                        v,
                        at,
                        format!("Slot part '{id}' of '{comp}': {reason}"),
                    ));
                };
                let Some(host) = component_of(graph, v) else {
                    continue; // SPEC-060 covers an undeclared component
                };
                let slots: Vec<&Value> = host
                    .raw
                    .get("slots")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                    .filter(|s| {
                        s.get("part").and_then(Value::as_str) == Some(id)
                            && s.get("collection").is_none()
                    })
                    .collect();
                let [slot] = slots[..] else {
                    bad(
                        &path,
                        format!(
                            "it must be the part of exactly one non-collection slot, found {}",
                            slots.len()
                        ),
                    );
                    continue;
                };
                let accepts: Vec<&str> = slot
                    .get("accepts")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                    .filter_map(Value::as_str)
                    .collect();
                if accepts.is_empty() {
                    bad(
                        &path,
                        "its slot declares no `accepts`, so there is no recipe to embed".into(),
                    );
                    continue;
                }
                let parent = parts.iter().find(|(_, p)| {
                    p.get("children")
                        .and_then(Value::as_array)
                        .is_some_and(|c| c.iter().any(|x| x.as_str() == Some(id)))
                });
                let in_row = parent.is_some_and(|(pid, p)| {
                    Some(pid.as_str()) == v.raw.get("root").and_then(Value::as_str)
                        || p.pointer("/props/direction").is_some()
                });
                if !in_row {
                    bad(
                        &path,
                        "it must sit in the root or a row box; the solver would not draw it".into(),
                    );
                }
                let with: Vec<(&String, &Value)> = part
                    .get("with")
                    .and_then(Value::as_object)
                    .into_iter()
                    .flatten()
                    .collect();
                let mut declared_by_any = vec![false; with.len()];
                for name in accepts {
                    let canonical = graph.canonical_component(name);
                    let Some(nested_comp) = graph.components.iter().find(|c| c.name == canonical)
                    else {
                        bad(&path, format!("'{name}' is not a declared component"));
                        continue;
                    };
                    let Some(recipe) = graph.visual_recipe(name) else {
                        bad(&path, format!("'{name}' has no visual recipe"));
                        continue;
                    };
                    let mut stack = vec![graph.canonical_component(comp).to_string()];
                    if let Some(p) = nesting_problem(graph, name, &mut stack) {
                        bad(&path, format!("accepted component '{name}': {p}"));
                    }
                    for (i, (opt, value)) in with.iter().enumerate() {
                        if nested_comp
                            .raw
                            .pointer(&format!("/options/{opt}"))
                            .is_none()
                        {
                            continue;
                        }
                        declared_by_any[i] = true;
                        if let Some(reason) = check_option(graph, v, &nested_comp.raw, opt, value) {
                            bad(
                                &format!("{path}/with/{opt}"),
                                format!("for '{name}': {reason}"),
                            );
                        }
                    }
                    let nested_scale = recipe.raw.get("sizeScale").and_then(Value::as_object);
                    for size in v
                        .raw
                        .get("sizeScale")
                        .and_then(Value::as_object)
                        .into_iter()
                        .flat_map(|s| s.keys())
                    {
                        match part
                            .pointer(&format!("/sizeMap/{size}"))
                            .and_then(Value::as_str)
                        {
                            None => bad(
                                &format!("{path}/sizeMap"),
                                format!("sizeMap has no entry for the host size '{size}'"),
                            ),
                            Some(to) if !nested_scale.is_some_and(|s| s.contains_key(to)) => bad(
                                &format!("{path}/sizeMap/{size}"),
                                format!("'{to}' is not a size of the '{name}' recipe"),
                            ),
                            _ => {}
                        }
                    }
                }
                for ((opt, _), any) in with.iter().zip(declared_by_any) {
                    if !any {
                        bad(
                            &format!("{path}/with/{opt}"),
                            format!("'{opt}' is not an option of any component the slot accepts"),
                        );
                    }
                }
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::{json, Value};

    use crate::graph::{ComponentRecord, Layer, TokenGraph, VisualRecord};
    use crate::registry::RegistryData;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec108::Rule;

    fn component(name: &str, raw: Value) -> ComponentRecord {
        let mut raw = raw;
        raw["name"] = json!(name);
        ComponentRecord {
            name: name.into(),
            file: PathBuf::from(format!("components/{name}.json")),
            raw,
            layer: Layer::Foundation,
        }
    }

    fn visual(name: &str, raw: Value) -> VisualRecord {
        VisualRecord {
            component: name.into(),
            file: PathBuf::from(format!("visuals/{name}.json")),
            raw,
            layer: Layer::Foundation,
        }
    }

    /// A host with one slot `row` (accepting `chip`) and a recipe with a slot part in a row box.
    fn graph(slot: Value, part: Value, row_props: Value) -> TokenGraph {
        let mut g = TokenGraph::default();
        g.components.push(component(
            "host",
            json!({ "options": {}, "anatomy": [], "slots": [slot] }),
        ));
        g.components.push(component(
            "chip",
            json!({ "options": { "isQuiet": {"type": "boolean"}, "tone": {"type": "string"} } }),
        ));
        g.visuals.push(visual(
            "host",
            json!({ "component": "host", "root": "r", "sizeScale": {"s": 1, "m": 2},
                "parts": {
                    "r": {"kind": "box", "children": ["b"]},
                    "b": {"kind": "box", "children": ["row"], "props": row_props},
                    "row": part } }),
        ));
        g.visuals.push(visual(
            "chip",
            json!({ "component": "chip", "root": "c", "sizeScale": {"s": 1, "m": 2},
                "parts": { "c": {"kind": "box"} } }),
        ));
        g
    }

    fn good_slot() -> Value {
        json!({ "name": "row", "part": "row", "accepts": ["chip"], "acceptsOnly": true })
    }

    fn good_part() -> Value {
        json!({ "kind": "slot", "sizeMap": {"s": "s", "m": "m"}, "with": {"isQuiet": true} })
    }

    fn dir() -> Value {
        json!({ "direction": {"value": "row"} })
    }

    fn run(g: &TokenGraph) -> Vec<String> {
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest: None,
        };
        Rule.validate(&ctx).into_iter().map(|d| d.message).collect()
    }

    #[test]
    fn a_valid_slot_part_passes() {
        assert!(run(&graph(good_slot(), good_part(), dir())).is_empty());
    }

    #[test]
    fn the_slot_must_exist_be_single_and_accept_components() {
        let mut other = good_slot();
        other["part"] = json!("elsewhere");
        let m = run(&graph(other, good_part(), dir()));
        assert!(
            m[0].contains("exactly one non-collection slot, found 0"),
            "{m:?}"
        );
        let mut free = good_slot();
        free.as_object_mut().unwrap().remove("accepts");
        free.as_object_mut().unwrap().remove("acceptsOnly");
        let m = run(&graph(free, good_part(), dir()));
        assert!(m[0].contains("declares no `accepts`"), "{m:?}");
        let mut g = graph(good_slot(), good_part(), dir());
        g.components[0].raw["slots"] = json!([good_slot(), { "name": "again", "part": "row" }]);
        assert!(run(&g)[0].contains("found 2"));
    }

    #[test]
    fn with_options_and_size_map_are_checked_for_every_accepted_component() {
        let part =
            |with: Value, map: Value| json!({ "kind": "slot", "sizeMap": map, "with": with });
        let ok = json!({"s": "s", "m": "m"});
        let m = run(&graph(
            good_slot(),
            part(json!({"isQuiet": "yes"}), ok.clone()),
            dir(),
        ));
        assert!(m[0].contains("not a valid value of 'isQuiet'"), "{m:?}");
        let m = run(&graph(
            good_slot(),
            part(json!({"nope": 1}), ok.clone()),
            dir(),
        ));
        assert!(
            m[0].contains("not an option of any component the slot accepts"),
            "{m:?}"
        );
        let m = run(&graph(
            good_slot(),
            part(json!({}), json!({"s": "s"})),
            dir(),
        ));
        assert!(m[0].contains("no entry for the host size 'm'"), "{m:?}");
        let m = run(&graph(
            good_slot(),
            part(json!({}), json!({"s": "s", "m": "xl"})),
            dir(),
        ));
        assert!(m[0].contains("'xl' is not a size"), "{m:?}");
    }

    #[test]
    fn an_accepted_component_without_a_recipe_or_a_declaration_errors() {
        let mut g = graph(good_slot(), good_part(), dir());
        g.visuals.retain(|v| v.component != "chip");
        assert!(run(&g)[0].contains("no visual recipe"));
        let mut g = graph(good_slot(), good_part(), dir());
        g.components.retain(|c| c.name != "chip");
        assert!(run(&g)[0].contains("not a declared component"));
    }

    #[test]
    fn a_slot_part_outside_a_row_box_errors() {
        let m = run(&graph(good_slot(), good_part(), json!({})));
        assert!(m[0].contains("must sit in the root or a row box"), "{m:?}");
    }

    #[test]
    fn a_host_that_the_accepted_component_nests_errors() {
        let mut g = graph(good_slot(), good_part(), dir());
        g.visuals.retain(|v| v.component != "chip");
        g.visuals.push(visual(
            "chip",
            json!({ "component": "chip", "root": "c", "sizeScale": {"s": 1, "m": 2},
                "parts": { "c": {"kind": "box", "children": ["x"]},
                    "x": {"kind": "component", "sizeMap": {"s": "s", "m": "m"}} } }),
        ));
        g.components[1].raw["anatomy"] = json!([{ "name": "x", "component": "host" }]);
        assert!(
            run(&g).iter().any(|m| m.contains("inside itself")),
            "{:?}",
            run(&g)
        );
    }
}
