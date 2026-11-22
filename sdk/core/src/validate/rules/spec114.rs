// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-114: floating-position-well-formed
//!
//! Error. A `floating.position` places a floating part at a fraction of a part's box. It is an
//! alternative to `side` (not both), names a drawn non-floating part in `of` (default the
//! root), has an `x` or a `y` axis, and every axis has a `value` and optional `min`, `max` and
//! `from` that are `{ "option": name }` or `{ "value": number }`. A `length` axis is the part's
//! size along it, so the part binds no size there and hosts no `children`.

use serde_json::Value;

use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::error;

pub struct Rule;

fn source_ok(v: &Value) -> bool {
    match (v.get("option"), v.get("value")) {
        (Some(o), None) => o.as_str().is_some_and(|s| !s.is_empty()),
        (None, Some(n)) => n.is_number(),
        _ => false,
    }
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-114"
    }

    fn name(&self) -> &'static str {
        "floating-position-well-formed"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for v in &ctx.graph.visuals {
            let Some(parts) = v.raw.get("parts").and_then(Value::as_object) else {
                continue;
            };
            let root = v.raw.get("root").and_then(Value::as_str);
            for (id, part) in parts {
                let Some(floating) = part.get("floating") else {
                    continue;
                };
                let mut problems: Vec<String> = Vec::new();
                match (floating.get("side"), floating.get("position")) {
                    (Some(_), Some(_)) => problems.push("has both side and position".into()),
                    (None, None) => problems.push("has neither side nor position".into()),
                    _ => {}
                }
                if let Some(pos) = floating.get("position") {
                    if let Some(of) = pos.get("of") {
                        let ok = of.as_str().is_some_and(|o| {
                            parts.get(o).is_some_and(|p| p.get("floating").is_none())
                        });
                        if !ok {
                            problems.push("position.of does not name a non-floating part".into());
                        }
                    } else if root.is_none() {
                        problems.push("position has no root to be relative to".into());
                    }
                    if pos.get("x").is_none() && pos.get("y").is_none() {
                        problems.push("position has neither x nor y".into());
                    }
                    for k in ["x", "y"] {
                        let Some(axis) = pos.get(k) else { continue };
                        if !axis.get("value").is_some_and(source_ok) {
                            problems
                                .push(format!("position.{k}.value is not an option or a number"));
                        }
                        for s in ["min", "max", "from"] {
                            if axis.get(s).is_some_and(|x| !source_ok(x)) {
                                problems
                                    .push(format!("position.{k}.{s} is not an option or a number"));
                            }
                        }
                        if axis.get("length").and_then(Value::as_bool) == Some(true) {
                            let size = if k == "x" { "width" } else { "height" };
                            if part.pointer(&format!("/props/{size}")).is_some()
                                || part
                                    .get("children")
                                    .and_then(Value::as_array)
                                    .is_some_and(|c| !c.is_empty())
                            {
                                problems.push(format!(
                                    "position.{k} is a length but the part binds {size} or has children"
                                ));
                            }
                        } else if axis.get("from").is_some() {
                            problems.push(format!("position.{k}.from needs length"));
                        }
                    }
                }
                for problem in problems {
                    out.push(error(
                        self.id(),
                        v,
                        &format!("/parts/{id}/floating"),
                        format!("Floating part '{id}' of '{}' {problem}", v.component),
                    ));
                }
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::Rule;
    use crate::validate::rules::visual_util::test_util::{graph, run};

    fn check(floating: serde_json::Value, extra: serde_json::Value) -> Vec<String> {
        let mut h = json!({ "kind": "box", "floating": floating,
            "props": { "width": {"value": 4}, "height": {"value": 4} } });
        h.as_object_mut()
            .unwrap()
            .extend(extra.as_object().unwrap().clone());
        let g = graph(
            json!({"name": "slider"}),
            vec![],
            vec![],
            vec![(
                "slider",
                json!({ "component": "slider", "root": "r",
                    "parts": { "r": { "kind": "box" }, "h": h } }),
            )],
        );
        run(&Rule, &g).into_iter().map(|d| d.message).collect()
    }

    fn pos(axis: serde_json::Value) -> serde_json::Value {
        json!({ "position": { "x": axis } })
    }

    #[test]
    fn a_well_formed_position_is_clean() {
        let axis = json!({ "value": {"option": "value"}, "min": {"value": 0}, "max": {"option": "maxValue"}, "invert": true });
        assert!(check(pos(axis), json!({})).is_empty());
        let len = json!({ "value": {"option": "v"}, "from": {"value": 0.2}, "length": true });
        assert!(check(pos(len), json!({ "props": { "height": {"value": 2} } })).is_empty());
    }

    #[test]
    fn flags_each_malformed_position() {
        let ok = json!({ "value": {"option": "v"} });
        let m = |f, e| check(f, e).join("|");
        assert!(
            m(json!({ "side": "top", "position": { "x": ok } }), json!({}))
                .contains("both side and position")
        );
        assert!(m(json!({}), json!({})).contains("neither side nor position"));
        assert!(m(json!({ "position": {} }), json!({})).contains("neither x nor y"));
        assert!(m(json!({ "position": { "of": "h", "x": ok } }), json!({})).contains("position.of"));
        assert!(
            m(json!({ "position": { "of": "nope", "x": ok } }), json!({})).contains("position.of")
        );
        assert!(m(pos(json!({ "value": {"option": ""} })), json!({})).contains("x.value"));
        assert!(m(
            pos(json!({ "value": {"option": "v"}, "max": {"token": "t"} })),
            json!({})
        )
        .contains("x.max"));
        assert!(m(
            pos(json!({ "value": {"option": "v"}, "from": {"value": 0} })),
            json!({})
        )
        .contains("from needs length"));
        let len = json!({ "value": {"option": "v"}, "length": true });
        assert!(m(pos(len), json!({})).contains("binds width"));
    }
}
