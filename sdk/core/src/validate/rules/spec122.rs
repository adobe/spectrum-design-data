// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-122: recipe-facets-resolve
//!
//! Warning. A `facets` clause in a recipe `when` or `visibleWhen` names a facet the component's
//! behavior contract can publish (declared state-group facet, or an interaction facet a pattern it
//! extends publishes), with a value that facet has and that options or a state can select.

use serde_json::Value;

use crate::behavior::facet_match;
use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::{walk_objects, warning};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-122"
    }

    fn name(&self) -> &'static str {
        "recipe-facets-resolve"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for v in &ctx.graph.visuals {
            let Some(parts) = v.raw.get("parts") else {
                continue;
            };
            walk_objects(parts, "/parts", &mut |path, node| {
                for key in ["when", "visibleWhen"] {
                    let Some(facets) = node
                        .pointer(&format!("/{key}/facets"))
                        .and_then(Value::as_object)
                    else {
                        continue;
                    };
                    for (facet, want) in facets {
                        let at = format!("{path}/{key}/facets/{facet}");
                        let problem = match want.as_str() {
                            None => Some("wants a string value".to_string()),
                            Some(w) => facet_match(ctx.graph, &v.component, facet, w).err(),
                        };
                        if let Some(p) = problem {
                            out.push(warning(
                                self.id(),
                                v,
                                &at,
                                format!("Recipe of '{}' reads facet '{facet}': {p}", v.component),
                            ));
                        }
                    }
                }
            });
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::Rule;
    use crate::graph::{Layer, VisualRecord};
    use crate::validate::rules::behavior_util::test_util::{good, graph, run};

    fn check(facets: serde_json::Value) -> Vec<String> {
        check_contract(good(), facets)
    }

    fn check_contract(contract: serde_json::Value, facets: serde_json::Value) -> Vec<String> {
        let mut g = graph(vec![contract]);
        g.visuals.push(VisualRecord {
            component: "switch".into(),
            file: "visuals/switch.json".into(),
            raw: json!({ "parts": { "track": { "props": { "fill": [
                { "when": { "facets": facets }, "value": "red" }
            ] } } } }),
            layer: Layer::Foundation,
        });
        run(&Rule, &g)
    }

    #[test]
    fn resolvable_facets_are_clean() {
        assert!(check(json!({ "checked": "checked", "hovered": "true" })).is_empty());
    }

    #[test]
    fn flags_each_unresolvable_facet() {
        for (facets, why) in [
            (json!({ "glow": "on" }), "not in the facets registry"),
            (json!({ "readOnly": "true" }), "does not declare facet"),
            (json!({ "checked": "mixed" }), "has no value 'mixed'"),
            (json!({ "hovered": "false" }), "absence"),
            (json!({ "checked": true }), "string value"),
        ] {
            let m = check(facets.clone());
            assert!(m.iter().any(|m| m.contains(why)), "{facets}: {m:?}");
        }
    }

    #[test]
    fn flags_a_value_that_overlaps_an_earlier_one() {
        let mut c = good();
        c["state"] = json!(["isSelected", "isDisabled"]);
        c["facets"]["checked"] = json!({
            "from": ["isSelected", "isDisabled"],
            "values": { "checked": { "isSelected": true }, "unchecked": { "isDisabled": false } },
            "order": "first match wins"
        });
        let m = check_contract(c.clone(), json!({ "checked": "unchecked" }));
        assert!(
            m.iter().any(|m| m.contains("overlaps the earlier value")),
            "{m:?}"
        );
        assert!(check_contract(c, json!({ "checked": "checked" })).is_empty());
    }
}
