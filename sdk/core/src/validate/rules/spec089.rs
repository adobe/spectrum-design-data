// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-089: visual-nested-component-valid
//!
//! A recipe part of kind `component` embeds another component's recipe. The nested component
//! MUST be declared and have a recipe, every `with` option MUST be an option of it with a
//! valid value (a host-option binding MUST name an option of the host), `sizeMap` MUST cover
//! every size of the host and map into the nested recipe's `sizeScale`, the nesting MUST NOT
//! cycle or go deeper than `MAX_NEST_DEPTH`, and the part MUST sit where the solver lays it
//! out: in the root's flow or in a row box.

use serde_json::Value;

use crate::graph::{TokenGraph, VisualRecord};
use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::{component_of, error, option_values};
use crate::visual::MAX_NEST_DEPTH;

pub struct Rule;

fn is_component(part: &Value) -> bool {
    part.get("kind").and_then(Value::as_str) == Some("component")
}

/// The first nesting problem below `name` (cycle or depth), following `component` parts of
/// each recipe. `stack` holds the canonical names from the host down to `name`.
fn nesting_problem(graph: &TokenGraph, name: &str, stack: &mut Vec<String>) -> Option<String> {
    let canonical = graph.canonical_component(name).to_string();
    if stack.contains(&canonical) {
        return Some(format!(
            "it nests '{canonical}' inside itself ({} > {canonical})",
            stack.join(" > ")
        ));
    }
    if stack.len() > MAX_NEST_DEPTH {
        return Some(format!(
            "it nests more than {MAX_NEST_DEPTH} levels deep ({} > {canonical})",
            stack.join(" > ")
        ));
    }
    let recipe = graph.visual_recipe(name)?;
    stack.push(canonical);
    let mut found = None;
    for part in recipe
        .raw
        .get("parts")
        .and_then(Value::as_object)
        .into_iter()
        .flat_map(|p| p.values())
        .filter(|p| is_component(p))
    {
        if let Some(n) = part.get("component").and_then(Value::as_str) {
            found = found.or_else(|| nesting_problem(graph, n, stack));
        }
    }
    stack.pop();
    found
}

fn check_option(
    graph: &TokenGraph,
    host: &VisualRecord,
    nested: &Value,
    name: &str,
    value: &Value,
) -> Option<String> {
    let opt = nested.pointer(&format!("/options/{name}"));
    let Some(opt) = opt else {
        return Some(format!("'{name}' is not an option of it"));
    };
    let ty = opt.get("type").and_then(Value::as_str);
    if let Some(h) = value.get("option").and_then(Value::as_str) {
        let host_opt = component_of(graph, host)?
            .raw
            .pointer(&format!("/options/{h}"));
        return match host_opt {
            None => Some(format!("'{h}' is not an option of '{}'", host.component)),
            Some(ho) if ho.get("type").and_then(Value::as_str) != ty => Some(format!(
                "host option '{h}' and nested option '{name}' have different types"
            )),
            _ => None,
        };
    }
    let ok = match (ty, option_values(opt)) {
        (_, Some(values)) => values.contains(value),
        (Some("boolean"), None) => value.is_boolean(),
        (Some("string"), None) => value.is_string(),
        (Some("number" | "integer"), None) => value.is_number(),
        _ => true,
    };
    (!ok).then(|| format!("{value} is not a valid value of '{name}'"))
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-089"
    }

    fn name(&self) -> &'static str {
        "visual-nested-component-valid"
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
            let root = v.raw.get("root").and_then(Value::as_str).unwrap_or("");
            for (id, part) in parts.iter().filter(|(_, p)| is_component(p)) {
                let path = format!("/parts/{id}");
                let comp = &v.component;
                let mut bad = |at: &str, reason: String| {
                    out.push(error(
                        self.id(),
                        v,
                        at,
                        format!("Component part '{id}' of '{comp}': {reason}"),
                    ));
                };
                if id == root {
                    bad(&path, "the root part cannot be a component".into());
                    continue;
                }
                let parent = parts
                    .iter()
                    .find(|(_, p)| {
                        p.get("children")
                            .and_then(Value::as_array)
                            .is_some_and(|c| c.iter().any(|x| x.as_str() == Some(id)))
                    })
                    .map(|(k, p)| (k.as_str(), p));
                if let Some((pid, p)) = parent {
                    if pid != root && p.pointer("/props/direction").is_none() {
                        bad(
                            &path,
                            format!(
                                "it sits in '{pid}', which is not the root or a row box; the solver would not draw it"
                            ),
                        );
                    }
                }
                let Some(name) = part.get("component").and_then(Value::as_str) else {
                    bad(&format!("{path}/component"), "it names no component".into());
                    continue;
                };
                let canonical = graph.canonical_component(name);
                let Some(nested_comp) = graph.components.iter().find(|c| c.name == canonical)
                else {
                    bad(
                        &format!("{path}/component"),
                        format!("'{name}' is not a declared component"),
                    );
                    continue;
                };
                let Some(recipe) = graph.visual_recipe(name) else {
                    bad(
                        &format!("{path}/component"),
                        format!("'{name}' has no visual recipe"),
                    );
                    continue;
                };
                let mut stack = vec![graph.canonical_component(comp).to_string()];
                if let Some(p) = nesting_problem(graph, name, &mut stack) {
                    bad(&format!("{path}/component"), p);
                }
                for (opt, value) in part
                    .get("with")
                    .and_then(Value::as_object)
                    .into_iter()
                    .flatten()
                {
                    if let Some(reason) = check_option(graph, v, &nested_comp.raw, opt, value) {
                        bad(&format!("{path}/with/{opt}"), reason);
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
    use crate::validate::rules::spec089::Rule;

    fn component(name: &str, options: Value) -> ComponentRecord {
        ComponentRecord {
            name: name.into(),
            file: PathBuf::from(format!("components/{name}.json")),
            raw: json!({ "name": name, "options": options }),
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

    fn graph(host_parts: Value, extra: Vec<VisualRecord>) -> TokenGraph {
        let mut g = TokenGraph::default();
        g.components.push(component(
            "host",
            json!({ "isOpen": {"type": "boolean"}, "tone": {"type": "string"} }),
        ));
        g.components.push(component(
            "chip",
            json!({ "isQuiet": {"type": "boolean"},
                "kind": {"type": "string", "values": [{"value": "a"}, {"value": "b"}]} }),
        ));
        g.visuals.push(visual(
            "host",
            json!({ "component": "host", "root": "r", "sizeScale": {"s": 1, "m": 2},
                "parts": host_parts }),
        ));
        g.visuals.push(visual(
            "chip",
            json!({ "component": "chip", "root": "c", "sizeScale": {"s": 1, "m": 2},
                "parts": { "c": {"kind": "box"} } }),
        ));
        g.visuals.extend(extra);
        g
    }

    fn parts(nested: Value) -> Value {
        json!({ "r": {"kind": "box", "children": ["n"]}, "n": nested })
    }

    fn nested(with: Value, size_map: Value) -> Value {
        json!({ "kind": "component", "component": "chip", "with": with, "sizeMap": size_map })
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

    fn ok_map() -> Value {
        json!({"s": "s", "m": "m"})
    }

    #[test]
    fn a_valid_nested_component_passes() {
        let n = nested(json!({"isQuiet": true, "kind": "b"}), ok_map());
        assert!(run(&graph(parts(n), vec![])).is_empty());
        let bound = nested(json!({"isQuiet": {"option": "isOpen"}}), ok_map());
        assert!(run(&graph(parts(bound), vec![])).is_empty());
    }

    #[test]
    fn an_unknown_component_or_a_missing_recipe_errors() {
        let mut n = nested(json!({}), ok_map());
        n["component"] = "nope".into();
        assert!(run(&graph(parts(n.clone()), vec![]))[0].contains("not a declared component"));
        let mut g = graph(parts(nested(json!({}), ok_map())), vec![]);
        g.visuals.retain(|v| v.component != "chip");
        assert!(run(&g)[0].contains("no visual recipe"));
    }

    #[test]
    fn options_and_values_are_checked() {
        let m = run(&graph(
            parts(nested(
                json!({"isQuiet": "yes", "kind": "z", "nope": 1}),
                ok_map(),
            )),
            vec![],
        ));
        assert_eq!(m.len(), 3, "{m:?}");
        assert!(m.iter().any(|s| s.contains("not an option of it")));
        let m = run(&graph(
            parts(nested(json!({"isQuiet": {"option": "tone"}}), ok_map())),
            vec![],
        ));
        assert!(m[0].contains("different types"), "{m:?}");
        let m = run(&graph(
            parts(nested(json!({"isQuiet": {"option": "missing"}}), ok_map())),
            vec![],
        ));
        assert!(m[0].contains("not an option of 'host'"), "{m:?}");
    }

    #[test]
    fn size_map_must_cover_the_host_sizes_and_land_in_the_nested_scale() {
        let m = run(&graph(parts(nested(json!({}), json!({"s": "s"}))), vec![]));
        assert!(m[0].contains("no entry for the host size 'm'"), "{m:?}");
        let m = run(&graph(
            parts(nested(json!({}), json!({"s": "s", "m": "xl"}))),
            vec![],
        ));
        assert!(m[0].contains("'xl' is not a size"), "{m:?}");
    }

    #[test]
    fn cycles_and_deep_nesting_error() {
        let chip_nests = |child: &str| {
            visual(
                "chip",
                json!({ "component": "chip", "root": "c", "sizeScale": {"s": 1, "m": 2},
                    "parts": { "c": {"kind": "box", "children": ["x"]},
                        "x": {"kind": "component", "component": child, "sizeMap": ok_map()} } }),
            )
        };
        let mut g = graph(parts(nested(json!({}), ok_map())), vec![]);
        g.visuals.retain(|v| v.component != "chip");
        g.visuals.push(chip_nests("chip"));
        assert!(run(&g).iter().any(|m| m.contains("inside itself")));
        // host > chip > badge > pill > leaf is three levels below the host.
        let mut g = graph(parts(nested(json!({}), ok_map())), vec![]);
        g.visuals.retain(|v| v.component != "chip");
        g.visuals.push(chip_nests("badge"));
        for (name, child) in [("badge", "pill"), ("pill", "leaf")] {
            g.components.push(component(name, json!({})));
            g.visuals.push(visual(
                name,
                json!({ "component": name, "root": "c", "sizeScale": {"s": 1, "m": 2},
                    "parts": { "c": {"kind": "box", "children": ["x"]},
                        "x": {"kind": "component", "component": child, "sizeMap": ok_map()} } }),
            ));
        }
        assert!(run(&g).iter().any(|m| m.contains("levels deep")));
    }

    #[test]
    fn the_root_and_parts_outside_a_row_error() {
        let g = graph(
            json!({ "r": {"kind": "component", "component": "chip", "sizeMap": ok_map()} }),
            vec![],
        );
        assert!(run(&g)[0].contains("root part cannot be a component"));
        let g = graph(
            json!({ "r": {"kind": "box", "children": ["b"]},
                "b": {"kind": "box", "children": ["n"]},
                "n": nested(json!({}), ok_map()) }),
            vec![],
        );
        assert!(run(&g)[0].contains("not the root or a row box"));
        let g = graph(
            json!({ "r": {"kind": "box", "children": ["b"]},
                "b": {"kind": "box", "children": ["n"],
                    "props": {"direction": {"value": "row"}}},
                "n": nested(json!({}), ok_map()) }),
            vec![],
        );
        assert!(run(&g).is_empty());
    }
}
