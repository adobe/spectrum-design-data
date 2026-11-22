// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-112: floating-part-well-formed
//!
//! Error. A part with `floating` is a top-level `box` drawn outside the root: it is not the
//! root, not a child of any part, has no `placement`, and either hosts `children` (a subtree
//! the layout sizes) or binds a `width` and a `height` (the engine cannot place a leaf box it
//! cannot size).

use serde_json::Value;

use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::error;

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-112"
    }

    fn name(&self) -> &'static str {
        "floating-part-well-formed"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for v in &ctx.graph.visuals {
            let root = v.raw.get("root").and_then(Value::as_str);
            let Some(parts) = v.raw.get("parts").and_then(Value::as_object) else {
                continue;
            };
            let is_child = |id: &str| {
                parts.values().any(|p| {
                    p.get("children")
                        .and_then(Value::as_array)
                        .is_some_and(|c| c.iter().any(|c| c.as_str() == Some(id)))
                })
            };
            for (id, part) in parts.iter().filter(|(_, p)| p.get("floating").is_some()) {
                let mut problems = Vec::new();
                if Some(id.as_str()) == root {
                    problems.push("is the root");
                }
                if is_child(id) {
                    problems.push("is a child of another part");
                }
                if part.get("kind").and_then(Value::as_str) != Some("box")
                    || part.get("placement").is_some()
                {
                    problems.push("is not a box without a placement");
                }
                let hosts = part
                    .get("children")
                    .and_then(Value::as_array)
                    .is_some_and(|c| !c.is_empty());
                // A `position` length axis is the part's size along it: nothing to bind.
                let bound = |n: &str| {
                    let axis = if n == "width" { "x" } else { "y" };
                    part.pointer(&format!("/props/{n}")).is_some()
                        || part
                            .pointer(&format!("/floating/position/{axis}/length"))
                            .and_then(Value::as_bool)
                            == Some(true)
                };
                if !hosts && (!bound("width") || !bound("height")) {
                    problems.push("does not bind both width and height");
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

    fn check(parts: serde_json::Value) -> Vec<String> {
        let g = graph(
            json!({"name": "switch"}),
            vec![],
            vec![],
            vec![(
                "switch",
                json!({ "component": "switch", "root": "r", "parts": parts }),
            )],
        );
        run(&Rule, &g).into_iter().map(|d| d.message).collect()
    }

    fn tip(extra: serde_json::Value) -> serde_json::Value {
        let mut t = json!({ "kind": "box", "floating": {"side": "top"},
            "props": { "width": {"value": 4}, "height": {"value": 4} } });
        t.as_object_mut()
            .unwrap()
            .extend(extra.as_object().unwrap().clone());
        t
    }

    #[test]
    fn a_leaf_floating_box_with_a_size_and_a_subtree_without_one_are_clean() {
        assert!(check(json!({ "r": { "kind": "box" }, "t": tip(json!({})) })).is_empty());
        let host = json!({ "kind": "box", "floating": {"side": "top"}, "children": ["c"] });
        assert!(
            check(json!({ "r": { "kind": "box" }, "t": host, "c": { "kind": "box" } })).is_empty()
        );
    }

    #[test]
    fn flags_a_child_the_root_a_non_box_and_a_missing_size() {
        let m = check(json!({ "r": { "kind": "box", "children": ["t"] }, "t": tip(json!({})) }));
        assert_eq!(m.len(), 1, "{m:?}");
        assert!(m[0].contains("child of another part"));
        let m = check(json!({ "r": tip(json!({})) }));
        assert!(m.iter().any(|m| m.contains("is the root")), "{m:?}");
        let m = check(json!({ "r": { "kind": "box" }, "t": tip(json!({"kind": "text"})) }));
        assert!(m.iter().any(|m| m.contains("is not a box")), "{m:?}");
        let m = check(json!({ "r": { "kind": "box" },
            "t": { "kind": "box", "floating": {"side": "top"}, "props": { "width": {"value": 4} } } }));
        assert!(m.iter().any(|m| m.contains("width and height")), "{m:?}");
    }
}
