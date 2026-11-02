// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-083: visual-props-read-by-renderer
//!
//! Warning. A recipe may bind only the props the renderer reads for that part. The schema
//! accepts more (`opacity`, `direction`, `align`, `minWidth`), and the renderer ignores the
//! rest without a word. The list is `visual::READ_PROPS`, which the solver's `rp` checks in
//! debug builds, so it cannot drift from what the solver reads.

use serde_json::Value;

use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::warning;
use crate::visual::{part_role, reads_prop};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-083"
    }

    fn name(&self) -> &'static str {
        "visual-props-read-by-renderer"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for v in &ctx.graph.visuals {
            let root = v.raw.get("root").and_then(Value::as_str);
            let Some(parts) = v.raw.get("parts").and_then(Value::as_object) else {
                continue;
            };
            for (id, part) in parts {
                let is_root = Some(id.as_str()) == root;
                let role = part_role(part, is_root);
                let Some(props) = part.get("props").and_then(Value::as_object) else {
                    continue;
                };
                for name in props.keys().filter(|n| !reads_prop(part, is_root, n)) {
                    out.push(warning(
                        self.id(),
                        v,
                        &format!("/parts/{id}/props/{name}"),
                        format!(
                            "Part '{id}' ({role}) of '{}' binds '{name}', which the renderer does not read for that part",
                            v.component
                        ),
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
    use crate::report::Severity;
    use crate::validate::rules::visual_util::test_util::{graph, run};

    fn recipe(root_props: serde_json::Value, label_props: serde_json::Value) -> serde_json::Value {
        json!({ "component": "switch", "root": "r", "parts": {
            "r": { "kind": "box", "children": ["l"], "props": root_props },
            "l": { "kind": "text", "props": label_props } } })
    }

    #[test]
    fn warns_for_a_prop_the_renderer_ignores() {
        let g = graph(
            json!({"name": "switch"}),
            vec![],
            vec![],
            vec![(
                "switch",
                recipe(
                    json!({ "fill": {"value": "red"}, "opacity": {"value": 1}, "width": {"value": 4} }),
                    json!({ "fontSize": {"value": 12}, "opacity": {"value": 1} }),
                ),
            )],
        );
        let d = run(&Rule, &g);
        let mut paths: Vec<String> = d.iter().filter_map(|d| d.instance_path.clone()).collect();
        paths.sort();
        assert_eq!(
            paths,
            [
                "/parts/l/props/opacity",
                "/parts/r/props/opacity",
                "/parts/r/props/width"
            ]
        );
        assert!(d.iter().all(|d| d.severity == Severity::Warning));
    }

    #[test]
    fn a_text_child_may_bind_box_props_and_a_placed_part_only_color() {
        let g = graph(
            json!({"name": "switch"}),
            vec![],
            vec![],
            vec![(
                "switch",
                json!({ "component": "switch", "root": "r", "parts": {
                    "r": { "kind": "box", "children": ["l", "d"] },
                    "l": { "kind": "text", "props": { "fill": {"value": "red"} } },
                    "d": { "kind": "box", "placement": { "anchor": "top-end" },
                        "props": { "color": {"value": "red"}, "fill": {"value": "red"} } } } }),
            )],
        );
        let d = run(&Rule, &g);
        assert_eq!(d.len(), 1, "{d:?}");
        assert_eq!(d[0].instance_path.as_deref(), Some("/parts/d/props/fill"));
    }

    #[test]
    fn a_recipe_of_read_props_is_clean() {
        let g = graph(
            json!({"name": "switch"}),
            vec![],
            vec![],
            vec![(
                "switch",
                recipe(
                    json!({ "gap": {"value": 4}, "fill": {"value": "red"} }),
                    json!({ "fontSize": {"value": 12}, "lineHeight": {"value": "1.2"} }),
                ),
            )],
        );
        assert!(run(&Rule, &g).is_empty());
    }
}
