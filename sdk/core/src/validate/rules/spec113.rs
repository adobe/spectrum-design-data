// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-113: path-well-formed
//!
//! Error. A part with `path` is a `box` that binds `width` and `height`, and its `path` is
//! SVG path data the engine can draw: `d` of `M L H V C S Q T Z` commands (no arcs) within the
//! size limits, an optional positive `viewBox` `[width, height]` and a `fillRule` of `nonzero`
//! or `evenodd`. The same reader the solver uses decides, so a recipe that passes draws.

use serde_json::Value;

use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::error;
use crate::visual::path_shape;

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-113"
    }

    fn name(&self) -> &'static str {
        "path-well-formed"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for v in &ctx.graph.visuals {
            let Some(parts) = v.raw.get("parts").and_then(Value::as_object) else {
                continue;
            };
            for (id, part) in parts.iter().filter(|(_, p)| p.get("path").is_some()) {
                let mut problems: Vec<String> = Vec::new();
                if part.get("kind").and_then(Value::as_str).unwrap_or("box") != "box" {
                    problems.push("is not a box".into());
                }
                let bound = |n: &str| part.pointer(&format!("/props/{n}")).is_some();
                if !(bound("width") && bound("height")) {
                    problems.push("does not bind both width and height".into());
                }
                if let Err(e) = path_shape(&part["path"], 1.0, 1.0) {
                    problems.push(format!("has a path that cannot be drawn: {e}"));
                }
                for problem in problems {
                    out.push(error(
                        self.id(),
                        v,
                        &format!("/parts/{id}/path"),
                        format!("Path part '{id}' of '{}' {problem}", v.component),
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

    fn check(part: serde_json::Value) -> Vec<String> {
        let g = graph(
            json!({"name": "switch"}),
            vec![],
            vec![],
            vec![(
                "switch",
                json!({ "component": "switch", "root": "r", "parts": { "r": { "kind": "box" }, "p": part } }),
            )],
        );
        run(&Rule, &g).into_iter().map(|d| d.message).collect()
    }

    fn path(spec: serde_json::Value) -> serde_json::Value {
        json!({ "kind": "box", "path": spec,
            "props": { "width": {"value": 4}, "height": {"value": 4} } })
    }

    #[test]
    fn a_drawable_path_with_a_size_is_clean() {
        let ok = json!({ "d": "M0 0L4 0L2 4Z", "viewBox": [4, 4], "fillRule": "evenodd" });
        assert!(check(path(ok)).is_empty());
    }

    #[test]
    fn flags_bad_data_a_bad_view_box_a_non_box_and_a_missing_size() {
        for bad in [
            json!({}),
            json!({ "d": "" }),
            json!({ "d": "M0 0A1 1 0 0 1 2 2" }),
            json!({ "d": "M0 0L1e300 1" }),
            json!({ "d": "M0 0L1 1", "viewBox": [0, 4] }),
            json!({ "d": "M0 0L1 1", "fillRule": "odd" }),
        ] {
            let m = check(path(bad.clone()));
            assert!(
                m.iter().any(|m| m.contains("cannot be drawn")),
                "{bad}: {m:?}"
            );
        }
        let mut t = path(json!({ "d": "M0 0L1 1" }));
        t["kind"] = json!("text");
        assert!(check(t).iter().any(|m| m.contains("is not a box")));
        let m = check(json!({ "kind": "box", "path": { "d": "M0 0L1 1" } }));
        assert!(m.iter().any(|m| m.contains("width and height")), "{m:?}");
    }
}
