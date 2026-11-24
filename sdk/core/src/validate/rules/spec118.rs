// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-118: stroke-style-well-formed
//!
//! Error. A literal `strokeDash` or `strokeGap` of a part is a positive number, `strokeCap` is
//! `butt` or `round`, `strokeDashAnchor` is `box` or `scene`, and `strokeSides` lists only
//! `top`, `end`, `bottom`, `start`, `all` or `none`. A value from a token, relationship or
//! option is not judged here (the solver reports it at render time).

use serde_json::Value;

use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::error;

pub struct Rule;

const SIDES: &[&str] = &["top", "end", "bottom", "start", "all", "none"];

/// What is wrong with a literal `value` of `prop`, if anything.
fn problem(prop: &str, value: &Value) -> Option<String> {
    let text = match value {
        Value::String(s) => s.trim().to_string(),
        other => other.to_string(),
    };
    let bad = match prop {
        "strokeDash" | "strokeGap" => !text
            .trim_end_matches("px")
            .trim()
            .parse::<f64>()
            .is_ok_and(|n| n.is_finite() && n > 0.0),
        "strokeCap" => !matches!(text.as_str(), "butt" | "round"),
        "strokeDashAnchor" => !matches!(text.as_str(), "box" | "scene"),
        _ => text.is_empty() || text.split_whitespace().any(|w| !SIDES.contains(&w)),
    };
    bad.then(|| match prop {
        "strokeDash" | "strokeGap" => format!("{prop} {text} is not a positive number"),
        "strokeCap" => format!("strokeCap {text} is not butt or round"),
        "strokeDashAnchor" => format!("strokeDashAnchor {text} is not box or scene"),
        _ => format!("strokeSides {text} is not a list of top, end, bottom, start, all or none"),
    })
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-118"
    }

    fn name(&self) -> &'static str {
        "stroke-style-well-formed"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for v in &ctx.graph.visuals {
            let Some(parts) = v.raw.get("parts").and_then(Value::as_object) else {
                continue;
            };
            for (id, part) in parts {
                for prop in [
                    "strokeDash",
                    "strokeGap",
                    "strokeCap",
                    "strokeDashAnchor",
                    "strokeSides",
                ] {
                    let Some(source) = part.pointer(&format!("/props/{prop}")) else {
                        continue;
                    };
                    let entries: Vec<(String, &Value)> = match source {
                        Value::Array(a) => a
                            .iter()
                            .enumerate()
                            .map(|(i, e)| (format!("/parts/{id}/props/{prop}/{i}"), e))
                            .collect(),
                        other => vec![(format!("/parts/{id}/props/{prop}"), other)],
                    };
                    for (path, entry) in entries {
                        let Some(value) = entry.get("value") else {
                            continue;
                        };
                        if let Some(p) = problem(prop, value) {
                            out.push(error(
                                self.id(),
                                v,
                                &format!("{path}/value"),
                                format!("Stroke style of part '{id}' of '{}': {p}", v.component),
                            ));
                        }
                    }
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

    fn check(props: serde_json::Value) -> Vec<String> {
        let g = graph(
            json!({"name": "card"}),
            vec![],
            vec![],
            vec![(
                "card",
                json!({ "component": "card", "root": "r",
                    "parts": { "r": { "kind": "box", "props": props } } }),
            )],
        );
        run(&Rule, &g).into_iter().map(|d| d.message).collect()
    }

    #[test]
    fn a_well_formed_stroke_style_is_clean() {
        assert!(check(json!({
            "strokeDash": { "value": 3 },
            "strokeGap": { "value": "2px" },
            "strokeCap": { "value": "round" },
            "strokeDashAnchor": { "value": "scene" },
            "strokeSides": [
                { "value": "top bottom" },
                { "when": { "rowPosition": "only" }, "value": "all" },
            ],
        }))
        .is_empty());
        // A token or relationship is not judged here.
        assert!(check(json!({ "strokeDash": { "token": { "property": "x" } } })).is_empty());
    }

    #[test]
    fn flags_each_bad_value() {
        for (props, why) in [
            (json!({ "strokeDash": { "value": 0 } }), "strokeDash 0"),
            (json!({ "strokeDash": { "value": -2 } }), "positive"),
            (
                json!({ "strokeGap": { "value": "wide" } }),
                "strokeGap wide",
            ),
            (
                json!({ "strokeCap": { "value": "square" } }),
                "butt or round",
            ),
            (
                json!({ "strokeDashAnchor": { "value": "page" } }),
                "box or scene",
            ),
            (
                json!({ "strokeSides": { "value": "top left" } }),
                "strokeSides",
            ),
            (json!({ "strokeSides": { "value": "" } }), "strokeSides"),
            (
                json!({ "strokeSides": [{ "value": "top" }, { "when": {}, "value": "up" }] }),
                "strokeSides up",
            ),
        ] {
            let m = check(props.clone());
            assert!(m.iter().any(|m| m.contains(why)), "{props}: {m:?}");
        }
    }
}
