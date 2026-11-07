// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-087: visual-derived-context-matches-token
//!
//! Warning. A recipe's `derived` entry declares a relationship context whose value follows
//! from the layout. For every size and scale, the token the relationship gives (resolved by
//! binding it to the root's padding in a scratch copy of the recipe) must equal what the
//! formula gives from the solved scene. A context whose relationship resolves no token is
//! reported once per entry, listing the scales and sizes. A token with a desktop value only
//! resolves for mobile too, so it shows as a mobile mismatch.

use std::collections::{BTreeMap, BTreeSet};

use serde_json::{json, Value};

use crate::derived::declared;
use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::{component_of, size_entries, warning};
use crate::visual::{build_scene_cached, RenderRequest, SceneCache};

const SCALES: [&str; 2] = ["desktop", "mobile"];
const TOLERANCE: f64 = 0.01;

pub struct Rule;

fn request(component: &str, size: &str, scale: &str) -> RenderRequest {
    RenderRequest {
        component: component.to_string(),
        size: size.to_string(),
        states: vec![],
        options: Default::default(),
        mode: [
            ("colorScheme".to_string(), "light".to_string()),
            ("scale".to_string(), scale.to_string()),
        ]
        .into(),
        label: "Label".into(),
        icon: None,
        text_metrics: None,
    }
}

fn px(n: f64) -> String {
    if n.fract() == 0.0 {
        format!("{n}")
    } else {
        format!("{n:.2}")
    }
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-087"
    }

    fn name(&self) -> &'static str {
        "visual-derived-context-matches-token"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let graph = ctx.graph;
        let mut out = Vec::new();
        for v in &graph.visuals {
            let entries = declared(&v.raw);
            let (Some(root), true) = (
                v.raw.get("root").and_then(Value::as_str),
                component_of(graph, v).is_some(),
            ) else {
                continue;
            };
            // Shared by every entry, size and scale: base scenes repeat per entry, and the
            // scratch recipes reuse the same relationship lookups.
            let cache = SceneCache::default();
            for (i, d) in entries.iter().enumerate() {
                let path = format!("/derived/{i}");
                let parts = v.raw.get("parts");
                let unknown: Vec<&String> = [&d.part, &d.subtract]
                    .into_iter()
                    .filter(|p| parts.and_then(|ps| ps.get(p.as_str())).is_none())
                    .collect();
                if !unknown.is_empty() {
                    out.push(warning(
                        self.id(),
                        v,
                        &path,
                        format!(
                            "Derived context '{}' of '{}' names part {} that the recipe does not declare",
                            d.context, v.component, unknown[0]
                        ),
                    ));
                    continue;
                }
                // A scratch recipe that binds the context to the root's padding, so the
                // token resolves through the same relationship rules the renderer uses.
                let mut scratch = v.raw.clone();
                scratch["parts"][root]["props"][d.padding_prop()] =
                    json!({ "relationship": { "property": d.property, "context": d.context } });

                let mut missing: BTreeMap<&str, BTreeSet<String>> = BTreeMap::new();
                let mut mismatched: BTreeMap<&str, Vec<String>> = BTreeMap::new();
                for (size, _) in size_entries(&v.raw) {
                    for scale in SCALES {
                        let req = request(&v.component, &size, scale);
                        let Ok(base) = build_scene_cached(graph, &v.raw, &req, &cache) else {
                            continue; // render failures are SPEC-062's and SPEC-079's
                        };
                        let part_h = |p: &str| base.nodes.iter().find(|n| n.part == p).map(|n| n.h);
                        let Some(want) = part_h(root).and_then(|h| d.value(h, part_h)) else {
                            continue;
                        };
                        let Ok(bound) = build_scene_cached(graph, &scratch, &req, &cache) else {
                            continue;
                        };
                        let prop = d.padding_prop();
                        if bound
                            .diagnostics
                            .iter()
                            .any(|m| m.starts_with(&format!("{prop}:")))
                        {
                            missing.entry(scale).or_default().insert(size.clone());
                            continue;
                        }
                        let have = bound.layout.padding[if d.bottom { 2 } else { 0 }];
                        if (have - want).abs() > TOLERANCE {
                            mismatched.entry(scale).or_default().push(format!(
                                "{size}: token {}, derived {}",
                                px(have),
                                px(want)
                            ));
                        }
                    }
                }
                let head = format!(
                    "Derived context '{}' of '{}' ({})",
                    d.context, v.component, d.from
                );
                if !missing.is_empty() {
                    let list: Vec<String> = missing
                        .iter()
                        .map(|(scale, sizes)| {
                            format!(
                                "{scale} ({})",
                                sizes.iter().cloned().collect::<Vec<_>>().join(", ")
                            )
                        })
                        .collect();
                    out.push(warning(
                        self.id(),
                        v,
                        &path,
                        format!("{head}: its token has no value for {}", list.join("; ")),
                    ));
                }
                // One warning per scale, so a desktop disagreement is told apart from the
                // mobile values the tokens do not carry yet.
                for (scale, list) in mismatched {
                    out.push(warning(
                        self.id(),
                        v,
                        &path,
                        format!(
                            "{head}: the token value differs from the formula at {scale} for {}",
                            list.join("; ")
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
    use crate::validate::rules::visual_util::test_util::{graph, run, token};

    /// A button-like recipe: height 24 (literal), label line height 16, so the derived
    /// top spacing is 4.
    fn fixture(token_value: &str) -> crate::graph::TokenGraph {
        let rel = json!({
            "scope": { "component": "switch", "property": "component-top-to-text-100" },
            "context": "Spacing (top edge to label)", "$ref": "pad"
        });
        let mut pad = token("pad", json!({ "property": "padding-vertical" }), None);
        pad.raw["value"] = json!(token_value);
        let recipe = json!({
            "component": "switch", "root": "c",
            "sizeScale": { "m": 100 },
            "derived": [{
                "context": "Spacing (top edge to label)",
                "property": "component-top-to-text-{sizeIndex}",
                "part": "label",
                "from": "(height - label.lineHeight) / 2"
            }],
            "parts": {
                "c": { "kind": "box", "children": ["label"],
                       "props": { "height": { "value": "24" }, "direction": { "value": "row" } } },
                "label": { "kind": "text", "props": {
                    "fontSize": { "value": "14" }, "lineHeight": { "value": "16px" } } }
            }
        });
        graph(
            json!({ "name": "switch" }),
            vec![rel],
            vec![pad],
            vec![("switch", recipe)],
        )
    }

    #[test]
    fn a_token_that_equals_the_formula_is_clean() {
        assert!(run(&Rule, &fixture("4px")).is_empty());
    }

    #[test]
    fn a_token_that_disagrees_warns_for_each_scale() {
        // Like the pre-#1662 20 px button icon: a token that is off by one from the formula.
        let d = run(&Rule, &fixture("6px"));
        assert_eq!(d.len(), 2, "{d:?}");
        assert_eq!(d[0].severity, Severity::Warning);
        assert!(
            d[0].message
                .contains("at desktop for m: token 6, derived 4"),
            "{}",
            d[0].message
        );
        assert!(
            d[1].message.contains("at mobile for m: token 6, derived 4"),
            "{}",
            d[1].message
        );
    }

    #[test]
    fn a_missing_token_is_reported_once() {
        let mut g = fixture("4px");
        g.relationships.clear();
        let d = run(&Rule, &g);
        assert_eq!(d.len(), 1, "{d:?}");
        assert!(
            d[0].message
                .contains("has no value for desktop (m); mobile (m)"),
            "{}",
            d[0].message
        );
    }
}
