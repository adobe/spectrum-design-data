// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-075: visual-present-in-matches-anatomy
//!
//! A recipe part's `visibleWhen.states` SHOULD agree with the `presentIn` of the
//! anatomy part of the same name. Today a focus indicator's visibility lives in the
//! recipe, while the anatomy says where the part is present; this keeps the two from
//! drifting. State names are compared after the engine's normalization.
//!
//! `visibleWhen.states` means every listed state must be active, while `presentIn`
//! means any listed state. They agree when each lists one state, so a difference is a
//! warning only when neither side lists more than one. Otherwise the difference is
//! reported at info level, because the two readings can legitimately differ.

use std::collections::BTreeSet;

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::{component_of, diagnostic};
use crate::visual::state_ids;

pub struct Rule;

fn normalized<'a>(names: impl Iterator<Item = &'a str>) -> BTreeSet<String> {
    names.flat_map(state_ids).collect()
}

fn list(set: &BTreeSet<String>) -> String {
    if set.is_empty() {
        "no states".to_string()
    } else {
        set.iter().cloned().collect::<Vec<_>>().join(", ")
    }
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-075"
    }

    fn name(&self) -> &'static str {
        "visual-present-in-matches-anatomy"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for v in &ctx.graph.visuals {
            let Some(comp) = component_of(ctx.graph, v) else {
                continue; // SPEC-060 covers undeclared component
            };
            let Some(anatomy) = comp.raw.get("anatomy").and_then(Value::as_array) else {
                continue;
            };
            let Some(parts) = v.raw.get("parts").and_then(Value::as_object) else {
                continue;
            };
            for (part_name, recipe_part) in parts {
                let Some(anatomy_part) = anatomy
                    .iter()
                    .find(|a| a.get("name").and_then(Value::as_str) == Some(part_name))
                else {
                    continue; // SPEC-060 covers undeclared part
                };
                let recipe_states = normalized(
                    recipe_part
                        .get("visibleWhen")
                        .and_then(|w| w.get("states"))
                        .and_then(Value::as_array)
                        .into_iter()
                        .flatten()
                        .filter_map(Value::as_str),
                );
                let present_in = normalized(
                    anatomy_part
                        .get("presentIn")
                        .and_then(Value::as_array)
                        .into_iter()
                        .flatten()
                        .filter_map(Value::as_str),
                );
                if recipe_states == present_in {
                    continue;
                }
                let multi = recipe_states.len() > 1 || present_in.len() > 1;
                let (severity, note) = if multi {
                    (
                        Severity::Info,
                        " (visibleWhen.states means all, presentIn means any; check they intend the same)",
                    )
                } else {
                    (Severity::Warning, "")
                };
                out.push(diagnostic(
                    self.id(),
                    v,
                    &format!("/parts/{part_name}/visibleWhen/states"),
                    severity,
                    format!(
                        "Recipe part '{part_name}' of '{}' is visible in {}, but its anatomy presentIn lists {}{note}",
                        v.component,
                        list(&recipe_states),
                        list(&present_in)
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
    use crate::report::Severity;
    use crate::validate::rules::visual_util::test_util::{graph, run};

    fn check(anatomy: Value, recipe_part: Value) -> Vec<crate::report::Diagnostic> {
        let g = graph(
            json!({"name": "button", "anatomy": anatomy}),
            vec![],
            vec![],
            vec![(
                "button",
                json!({"component": "button", "root": "container", "parts": {
                    "container": {"kind": "box"},
                    "focus-indicator": recipe_part
                }}),
            )],
        );
        run(&Rule, &g)
    }

    fn anatomy(present_in: Option<Value>) -> Value {
        let mut part = json!({"name": "focus-indicator"});
        if let Some(p) = present_in {
            part["presentIn"] = p;
        }
        json!([{"name": "container"}, part])
    }

    #[test]
    fn agrees_across_state_spellings() {
        let d = check(
            anatomy(Some(json!(["keyboard-focus"]))),
            json!({"kind": "ring", "visibleWhen": {"states": ["focus"]}}),
        );
        assert!(d.is_empty(), "{d:?}");
    }

    #[test]
    fn warns_when_the_single_states_differ() {
        let d = check(
            anatomy(Some(json!(["focus"]))),
            json!({"kind": "ring", "visibleWhen": {"states": ["hover"]}}),
        );
        assert_eq!(d.len(), 1);
        assert_eq!(d[0].severity, Severity::Warning);
        assert!(d[0].message.contains("visible in hover"));
        assert!(d[0].message.contains("lists keyboard-focus"));
    }

    #[test]
    fn warns_when_only_one_side_is_state_limited() {
        let recipe_only = check(
            anatomy(None),
            json!({"kind": "ring", "visibleWhen": {"states": ["focus"]}}),
        );
        assert_eq!(recipe_only.len(), 1);
        assert!(recipe_only[0].message.contains("lists no states"));
        let anatomy_only = check(anatomy(Some(json!(["focus"]))), json!({"kind": "ring"}));
        assert_eq!(anatomy_only.len(), 1);
        assert!(anatomy_only[0].message.contains("visible in no states"));
        assert_eq!(anatomy_only[0].severity, Severity::Warning);
    }

    #[test]
    fn reports_a_multi_state_difference_as_info() {
        let d = check(
            anatomy(Some(json!(["focus", "hover"]))),
            json!({"kind": "ring", "visibleWhen": {"states": ["focus"]}}),
        );
        assert_eq!(d.len(), 1);
        assert_eq!(d[0].severity, Severity::Info);
        assert!(d[0].message.contains("means all"));
    }

    #[test]
    fn ignores_option_conditions_and_unlisted_parts() {
        let d = check(
            anatomy(None),
            json!({"kind": "ring", "visibleWhen": {"options": {"isPending": true}}}),
        );
        assert!(d.is_empty());
    }
}
