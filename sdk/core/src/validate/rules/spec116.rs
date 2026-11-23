// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-116: grid-and-nested-repeat-well-formed
//!
//! Error. `direction: grid` is declared only on the root or on a repeated part (the parts the
//! engine solves as roots) and needs `columns`, a whole number from 1 through
//! `MAX_GRID_COLUMNS` (a literal, or a `dimension` option). `columnGap` and `rowGap` are not
//! negative literals, and none of the three is bound on a part that is not a grid. Repeats nest
//! at most `MAX_REPEAT_DEPTH` deep (a repeated part repeating its own child, and so on).

use std::collections::HashSet;

use serde_json::Value;

use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::{component_of, error};
use crate::visual::{collection_slot, MAX_GRID_COLUMNS, MAX_REPEAT_DEPTH};

pub struct Rule;

/// The sources of a prop: one, or the entries of a conditional list.
fn sources<'a>(props: &'a Value, name: &str) -> Vec<&'a Value> {
    match props.get(name) {
        Some(Value::Array(a)) => a.iter().collect(),
        Some(v) => vec![v],
        None => vec![],
    }
}

fn number(src: &Value) -> Option<f64> {
    match src.get("value")? {
        Value::Number(n) => n.as_f64(),
        Value::String(s) => s.trim().parse().ok(),
        _ => None,
    }
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-116"
    }

    fn name(&self) -> &'static str {
        "grid-and-nested-repeat-well-formed"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for v in &ctx.graph.visuals {
            let Some(parts) = v.raw.get("parts").and_then(Value::as_object) else {
                continue;
            };
            let root = v.raw.get("root").and_then(Value::as_str);
            let comp = component_of(ctx.graph, v);
            // The part each `repeat` draws, by the part that declares it.
            let repeated = |id: &str| -> Option<String> {
                let slot = parts.get(id)?.pointer("/repeat/slot")?.as_str()?;
                collection_slot(&comp?.raw, slot).map(|(p, _)| p.to_string())
            };
            let repeated_parts: HashSet<String> =
                parts.keys().filter_map(|id| repeated(id)).collect();
            let grid_part = |id: &str| {
                parts
                    .get(id)
                    .and_then(|p| p.get("props"))
                    .is_some_and(|props| {
                        sources(props, "direction")
                            .iter()
                            .any(|s| s.get("value").and_then(Value::as_str) == Some("grid"))
                    })
            };
            // The parts the engine solves as the root of their own scene: the root, repeated
            // parts, floating subtrees, and a grid or repeating box that is a child of one.
            let mut rootlike: HashSet<&str> = root.into_iter().collect();
            rootlike.extend(repeated_parts.iter().map(String::as_str));
            rootlike.extend(
                parts
                    .iter()
                    .filter(|(_, p)| p.get("floating").is_some() && p.get("children").is_some())
                    .map(|(k, _)| k.as_str()),
            );
            loop {
                let more: Vec<&str> = parts
                    .iter()
                    .filter(|(k, p)| {
                        !rootlike.contains(k.as_str())
                            && (grid_part(k) || p.get("repeat").is_some())
                            && parts.iter().any(|(pk, pp)| {
                                rootlike.contains(pk.as_str())
                                    && pp
                                        .get("children")
                                        .and_then(Value::as_array)
                                        .is_some_and(|c| c.iter().any(|c| c.as_str() == Some(k)))
                            })
                    })
                    .map(|(k, _)| k.as_str())
                    .collect();
                if more.is_empty() {
                    break;
                }
                rootlike.extend(more);
            }
            let mut problems: Vec<(String, String)> = Vec::new();
            for (id, part) in parts {
                if part.get("repeat").is_some() && !rootlike.contains(id.as_str()) {
                    problems.push((
                        format!("/parts/{id}/repeat"),
                        format!("part '{id}' repeats a child but is not laid out as a root"),
                    ));
                }
                let Some(props) = part.get("props") else {
                    continue;
                };
                let is_grid = grid_part(id);
                if is_grid && !rootlike.contains(id.as_str()) {
                    problems.push((
                        format!("/parts/{id}/props/direction"),
                        format!(
                            "part '{id}' is a grid but is not laid out as a root: it must be the root, a repeated part, or a direct child of one"
                        ),
                    ));
                }
                for name in ["columns", "columnGap", "rowGap"] {
                    let entries = sources(props, name);
                    if !entries.is_empty() && !is_grid {
                        problems.push((
                            format!("/parts/{id}/props/{name}"),
                            format!("part '{id}' binds {name} but its direction is not grid"),
                        ));
                    }
                    for src in entries {
                        let path = format!("/parts/{id}/props/{name}");
                        let literal = src.get("value").is_some();
                        let n = number(src);
                        if name == "columns" {
                            if literal
                                && !n.is_some_and(|n| {
                                    n.fract() == 0.0 && (1.0..=MAX_GRID_COLUMNS as f64).contains(&n)
                                })
                            {
                                problems.push((path, format!("part '{id}' columns is not a whole number from 1 through {MAX_GRID_COLUMNS}")));
                            } else if !literal && src.get("dimension").is_none() {
                                problems.push((
                                    path,
                                    format!(
                                        "part '{id}' columns is not a number or a dimension option"
                                    ),
                                ));
                            }
                        } else if literal && !n.is_some_and(|n| n >= 0.0) {
                            problems.push((
                                path,
                                format!("part '{id}' {name} is not a number of at least 0"),
                            ));
                        }
                    }
                }
                if is_grid && sources(props, "columns").is_empty() {
                    problems.push((
                        format!("/parts/{id}/props"),
                        format!("grid part '{id}' has no columns"),
                    ));
                }
            }
            // Repeats nested inside repeated copies: depth along the part tree.
            let mut seen = HashSet::new();
            let mut stack: Vec<(&str, u32)> = root.into_iter().map(|r| (r, 0)).collect();
            while let Some((id, depth)) = stack.pop() {
                if !seen.insert(id) {
                    continue;
                }
                for kid in parts
                    .get(id)
                    .and_then(|p| p.get("children"))
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                    .filter_map(Value::as_str)
                {
                    let d = depth + u32::from(rootlike.contains(kid));
                    if d > MAX_REPEAT_DEPTH {
                        problems.push((
                            format!("/parts/{kid}"),
                            format!("repeats nest deeper than {MAX_REPEAT_DEPTH} at part '{kid}'"),
                        ));
                    } else {
                        stack.push((kid, d));
                    }
                }
            }
            for (path, problem) in problems {
                out.push(error(
                    self.id(),
                    v,
                    &path,
                    format!("Recipe of '{}': {problem}", v.component),
                ));
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use serde_json::{json, Value};

    use super::Rule;
    use crate::validate::rules::visual_util::test_util::{graph, run};

    fn check(root_props: Value, extra: Value) -> Vec<String> {
        let mut parts = json!({
            "r": { "kind": "box", "children": ["c"], "props": root_props },
            "c": { "kind": "box" }
        });
        parts
            .as_object_mut()
            .unwrap()
            .extend(extra.as_object().unwrap().clone());
        let g = graph(
            json!({ "name": "table", "slots": [
                { "name": "a", "part": "c", "collection": "cells" },
                { "name": "b", "part": "d", "collection": "kids" }] }),
            vec![],
            vec![],
            vec![(
                "table",
                json!({ "component": "table", "root": "r", "parts": parts }),
            )],
        );
        run(&Rule, &g).into_iter().map(|d| d.message).collect()
    }

    fn grid(columns: Value) -> Value {
        json!({ "direction": {"value": "grid"}, "columns": columns })
    }

    #[test]
    fn a_well_formed_grid_is_clean() {
        assert!(check(grid(json!({"value": 7})), json!({})).is_empty());
        assert!(check(grid(json!({"dimension": "n"})), json!({})).is_empty());
    }

    #[test]
    fn flags_each_malformed_grid() {
        let m = |p: Value, e: Value| check(p, e).join("|");
        for bad in [json!(0), json!(-2), json!(2.5), json!(1.0e9), json!("NaN")] {
            assert!(m(grid(json!({"value": bad})), json!({})).contains("whole number"));
        }
        assert!(m(grid(json!({"token": {}})), json!({})).contains("dimension"));
        assert!(m(json!({ "direction": {"value": "grid"} }), json!({})).contains("no columns"));
        let mut p = grid(json!({"value": 2}));
        p["columnGap"] = json!({"value": -1});
        assert!(m(p, json!({})).contains("columnGap is not"));
        assert!(m(json!({ "columns": {"value": 2} }), json!({})).contains("not grid"));
        // A grid under a plain box is not laid out as a root; under the root it is.
        let deep = json!({ "c": { "kind": "box", "children": ["e"] },
            "e": { "kind": "box", "props": grid(json!({"value": 2})) } });
        assert!(m(json!({}), deep).contains("not laid out as a root"));
        let direct = json!({ "c": { "kind": "box", "props": grid(json!({"value": 2})) } });
        assert!(check(json!({}), direct).is_empty());
        let deep_repeat = json!({ "c": { "kind": "box", "children": ["e"] },
            "e": { "kind": "box", "children": [], "repeat": {"slot": "b"} } });
        assert!(m(json!({}), deep_repeat).contains("repeats a child but is not laid out"));
        // A repeated part may be a grid.
        let mut r = json!({ "repeat": {"slot": "a"} });
        r["kind"] = json!("box");
        r["children"] = json!([]);
        let ok = json!({ "kind": "box", "props": grid(json!({"value": 2})) });
        let rr = json!({ "kind": "box", "children": ["c"], "repeat": {"slot": "a"} });
        assert!(check(json!({}), json!({ "r": rr, "c": ok })).is_empty());
    }

    #[test]
    fn flags_repeats_nested_too_deep() {
        // d repeats c repeats d ... a chain deeper than the limit, built from distinct parts.
        let n = crate::visual::MAX_REPEAT_DEPTH as usize + 2;
        let slots: Vec<Value> = (0..n)
            .map(|i| json!({ "name": format!("s{i}"), "part": format!("p{}", i + 1), "collection": format!("o{i}") }))
            .collect();
        let mut parts = serde_json::Map::new();
        for i in 0..n {
            parts.insert(
                format!("p{i}"),
                json!({ "kind": "box", "children": [format!("p{}", i + 1)],
                "repeat": { "slot": format!("s{i}") } }),
            );
        }
        parts.insert(format!("p{n}"), json!({ "kind": "box" }));
        let g = graph(
            json!({ "name": "tree", "slots": slots }),
            vec![],
            vec![],
            vec![(
                "tree",
                json!({ "component": "tree", "root": "p0", "parts": parts }),
            )],
        );
        let msgs: Vec<String> = run(&Rule, &g).into_iter().map(|d| d.message).collect();
        assert!(msgs.iter().any(|m| m.contains("nest deeper")), "{msgs:?}");
    }
}
