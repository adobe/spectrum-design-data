// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-086: visual-icon-scale
//!
//! Warning. Over the request grid, every `ui` icon a recipe draws has a drawing at the scale
//! its size binding gives ([`crate::visual::icon_scale`]): the bound size token's
//! `scaleIndex` or `size`, else the recipe's `sizeScale` entry for the request's size. With
//! no exact drawing the renderer draws the nearest scale, which is usually a different
//! design. Workflow icons have one drawing and are not checked. Runs only when the `icons/`
//! catalog is loaded; a missing icon is SPEC-085.

use std::collections::{BTreeMap, BTreeSet, HashMap};

use serde_json::Value;

use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::spec076::requests;
use crate::validate::rules::visual_util::{component_of, warning};
use crate::visual::{build_scene_cached, icon_scale, token_label, IconRef, SceneCache};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-086"
    }

    fn name(&self) -> &'static str {
        "visual-icon-scale"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let graph = ctx.graph;
        let Some(ui) = graph
            .icons
            .iter()
            .find(|s| s.set == "ui")
            .and_then(|s| s.raw.get("icons"))
        else {
            return vec![];
        };
        let names: HashMap<String, &Value> = graph
            .tokens
            .values()
            .filter_map(|t| t.raw.get("name").map(|n| (token_label(t), n)))
            .collect();
        let name_of = |label: &str| {
            names.get(label).map(|n| (*n).clone()).or_else(|| {
                graph
                    .resolve_relationship_ref(label)
                    .and_then(|t| t.raw.get("name").cloned())
            })
        };
        let mut out = Vec::new();
        for v in &graph.visuals {
            let Some(parts) = v.raw.get("parts").and_then(Value::as_object) else {
                continue;
            };
            let draws_ui = parts
                .values()
                .filter_map(IconRef::of_part)
                .any(|i| i.set == "ui" && ui.get(&i.name).is_some());
            if !draws_ui || component_of(graph, v).is_none() {
                continue;
            }
            let size_scale = v.raw.get("sizeScale").and_then(Value::as_object);
            let cache = SceneCache::default();
            // (part, icon) -> (scale, source) pairs with no exact drawing.
            let mut misses: BTreeMap<(String, String), BTreeSet<(u32, String)>> = BTreeMap::new();
            for req in requests(graph, v) {
                let Ok(scene) = build_scene_cached(graph, &v.raw, &req, &cache) else {
                    continue; // render failures are SPEC-062's and SPEC-079's
                };
                let size_index = size_scale
                    .and_then(|s| s.get(&req.size))
                    .and_then(Value::as_u64)
                    .and_then(|i| u32::try_from(i).ok());
                // A nested recipe's nodes (`<part>.<inner>`) are at its own scales, which its own
                // recipe is checked for.
                for n in scene.nodes.iter().filter(|n| !n.part.contains('.')) {
                    let Some(icon) = n.icon.as_ref().filter(|i| i.set == "ui") else {
                        continue;
                    };
                    let Some(sizes) = ui.get(&icon.name).and_then(|i| i.get("sizes")) else {
                        continue;
                    };
                    let (scale, from) = icon_scale(n, size_index, name_of);
                    if sizes.get(scale.to_string()).is_none() {
                        let from = from.map_or_else(
                            || format!("sizeScale for size '{}'", req.size),
                            |t| format!("token '{t}'"),
                        );
                        misses
                            .entry((n.part.clone(), icon.name.clone()))
                            .or_default()
                            .insert((scale, from));
                    }
                }
            }
            for ((part, name), missing) in misses {
                let available = ui
                    .get(&name)
                    .and_then(|i| i.get("sizes"))
                    .and_then(Value::as_object)
                    .map(|s| s.keys().cloned().collect::<Vec<_>>().join(", "))
                    .unwrap_or_default();
                let missing = missing
                    .iter()
                    .map(|(s, from)| format!("scale {s} ({from})"))
                    .collect::<Vec<_>>()
                    .join(", ");
                out.push(warning(
                    self.id(),
                    v,
                    &format!("/parts/{part}/icon"),
                    format!(
                        "Part '{part}' of '{}' draws ui:{name} at {missing}, which has no drawing; the nearest of {available} is drawn instead",
                        v.component
                    ),
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
    use crate::graph::TokenGraph;
    use crate::report::Severity;
    use crate::validate::rules::spec085::tests::with_icons;
    use crate::validate::rules::visual_util::test_util::{run, token};

    fn sizes(scales: &[u32]) -> Value {
        let geometry = json!({ "viewBox": "0 0 10 10", "paths": [{ "d": "M0 0" }] });
        json!({ "checkmark": { "sizes": scales.iter()
            .map(|s| (s.to_string(), geometry.clone()))
            .collect::<serde_json::Map<_, _>>() } })
    }

    /// The checkbox fixture with the mark bound to `width`, sized `m` (sizeScale 100).
    fn fixture(width: Option<Value>, scales: &[u32], tokens: Vec<(&str, Value)>) -> TokenGraph {
        let mut g = with_icons(
            json!({ "set": "ui", "name": "checkmark" }),
            &[("ui", sizes(scales))],
        );
        if let Some(width) = width {
            g.visuals[0].raw["parts"]["mark"]["props"] = json!({ "width": width });
        }
        for (key, name) in tokens {
            let t = token(key, name, None);
            g.tokens.insert(t.name.clone(), t);
        }
        g
    }

    #[test]
    fn the_size_scale_entry_picks_the_drawing_without_a_size_token() {
        assert!(run(&Rule, &fixture(None, &[100], vec![])).is_empty());
        let d = run(&Rule, &fixture(None, &[75, 200], vec![]));
        assert_eq!(d.len(), 1, "{d:?}");
        assert_eq!(d[0].severity, Severity::Warning);
        assert_eq!(d[0].instance_path.as_deref(), Some("/parts/mark/icon"));
        assert!(
            d[0].message.contains(
                "scale 100 (sizeScale for size 'm'), which has no drawing; the nearest of 75, 200"
            ),
            "{}",
            d[0].message
        );
    }

    #[test]
    fn a_bound_token_scale_index_or_size_key_wins() {
        let by_index = json!({ "token": { "property": "mark-size", "scaleIndex": 200 } });
        let index_token = vec![("t", json!({ "property": "mark-size", "scaleIndex": 200 }))];
        assert!(run(
            &Rule,
            &fixture(Some(by_index.clone()), &[200], index_token.clone())
        )
        .is_empty());
        let d = run(&Rule, &fixture(Some(by_index), &[100], index_token));
        assert!(
            d[0].message.contains("scale 200 (token "),
            "{}",
            d[0].message
        );

        let by_size = json!({ "token": { "property": "mark-size", "size": "l" } });
        let size_token = vec![("t", json!({ "property": "mark-size", "size": "l" }))];
        assert!(run(
            &Rule,
            &fixture(Some(by_size.clone()), &[200], size_token.clone())
        )
        .is_empty());
        assert_eq!(
            run(&Rule, &fixture(Some(by_size), &[100], size_token)).len(),
            1
        );
    }

    #[test]
    fn workflow_icons_and_no_catalog_are_not_checked() {
        let g = with_icons(
            json!({ "set": "workflow", "name": "add" }),
            &[
                ("ui", sizes(&[75])),
                (
                    "workflow",
                    json!({ "add": {
                "viewBox": "0 0 20 20", "paths": [{ "d": "M0 0" }] } }),
                ),
            ],
        );
        assert!(run(&Rule, &g).is_empty());
        let g = with_icons(json!({ "set": "ui", "name": "checkmark" }), &[]);
        assert!(run(&Rule, &g).is_empty());
    }
}
