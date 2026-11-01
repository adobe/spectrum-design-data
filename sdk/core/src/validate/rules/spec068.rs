// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-068: visual-literal-discouraged
//!
//! A literal (`{"value": ...}`) SHOULD NOT supply a color or a non-zero size in a
//! visual recipe: a token or relationship describes it, or one should be added.
//! Layout keywords (`direction`, `align`, `justify`), `transparent` / `none`
//! colors, zero widths and ratio radii (`relativeTo`) are fine.

use serde_json::Value;

use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::{component_of, warning};

pub struct Rule;

const COLOR_PROPS: &[&str] = &["fill", "stroke", "color", "trackColor"];
const COLOR_KEYWORDS: &[&str] = &["transparent", "none", "currentColor"];
const SIZE_PROPS: &[&str] = &[
    "width",
    "height",
    "minWidth",
    "gap",
    "gapToParent",
    "strokeWidth",
    "fontSize",
    "paddingInlineStart",
    "paddingInlineEnd",
    "paddingBlockStart",
    "paddingBlockEnd",
    "cornerRadius",
    "cornerRadiusStartStart",
    "cornerRadiusStartEnd",
    "cornerRadiusEndStart",
    "cornerRadiusEndEnd",
];

fn is_literal_only(entry: &Value) -> bool {
    entry.get("value").is_some()
        && entry.get("token").is_none()
        && entry.get("relationship").is_none()
}

fn nonzero_number(v: &Value) -> bool {
    match v {
        Value::Number(n) => n.as_f64().is_some_and(|x| x != 0.0),
        Value::String(s) => s.parse::<f64>().is_ok_and(|x| x != 0.0),
        _ => false,
    }
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-068"
    }

    fn name(&self) -> &'static str {
        "visual-literal-discouraged"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for v in &ctx.graph.visuals {
            if component_of(ctx.graph, v).is_none() {
                continue; // SPEC-060 covers undeclared component
            }
            let Some(parts) = v.raw.get("parts").and_then(Value::as_object) else {
                continue;
            };
            for (part, def) in parts {
                let Some(props) = def.get("props").and_then(Value::as_object) else {
                    continue;
                };
                for (prop, source) in props {
                    let entries: Vec<(String, &Value)> = match source {
                        Value::Array(a) => a
                            .iter()
                            .enumerate()
                            .map(|(i, e)| (format!("/parts/{part}/props/{prop}/{i}"), e))
                            .collect(),
                        other => vec![(format!("/parts/{part}/props/{prop}"), other)],
                    };
                    for (path, entry) in entries {
                        if !is_literal_only(entry) {
                            continue;
                        }
                        let value = &entry["value"];
                        let bad_color = COLOR_PROPS.contains(&prop.as_str())
                            && !value.as_str().is_some_and(|s| COLOR_KEYWORDS.contains(&s));
                        let bad_size = SIZE_PROPS.contains(&prop.as_str())
                            && entry.get("relativeTo").is_none()
                            && nonzero_number(value);
                        if bad_color || bad_size {
                            out.push(warning(
                                self.id(),
                                v,
                                &format!("{path}/value"),
                                format!(
                                    "Literal {value} for '{prop}' on part '{part}'; bind a token or relationship instead"
                                ),
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

    fn d(props: serde_json::Value) -> Vec<crate::report::Diagnostic> {
        let g = graph(
            json!({"name": "switch"}),
            vec![],
            vec![],
            vec![(
                "switch",
                json!({"component": "switch", "root": "r", "parts": {"r": {"kind": "box", "props": props}}}),
            )],
        );
        run(&Rule, &g)
    }

    #[test]
    fn literal_size_and_color_warn() {
        assert_eq!(d(json!({"width": {"value": 10}})).len(), 1);
        assert_eq!(d(json!({"fill": {"value": "#fff"}})).len(), 1);
        assert_eq!(
            d(json!({"height": [{"value": 8}, {"when": {"options": {"a": true}}, "value": 9}]}))
                .len(),
            2
        );
    }

    #[test]
    fn keywords_zero_and_ratios_are_fine() {
        assert!(d(json!({
            "direction": {"value": "row"},
            "fill": {"value": "transparent"},
            "strokeWidth": {"value": 0},
            "cornerRadius": {"value": 0.5, "relativeTo": "height"}
        }))
        .is_empty());
    }
}
