// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-074: anatomy-present-in-declared
//!
//! Every entry of an anatomy part's `presentIn` SHOULD be a state the component
//! declares. A part that lists an undeclared state is a dangling reference: the
//! anatomy version of SPEC-054. State names are compared after the engine's own
//! normalization (`focus`, `key-focus` and `keyboard-focus` are one state), so a
//! component that declares `focus` can use any of those spellings. Warning for now,
//! because anatomy is unreviewed; it tightens to an error after the review pass.

use std::collections::HashSet;

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::visual::state_ids;

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-074"
    }

    fn name(&self) -> &'static str {
        "anatomy-present-in-declared"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for comp in &ctx.graph.components {
            let Some(anatomy) = comp.raw.get("anatomy").and_then(Value::as_array) else {
                continue;
            };
            let declared: Vec<&str> = comp
                .raw
                .get("states")
                .and_then(Value::as_array)
                .map(|a| {
                    a.iter()
                        .filter_map(|s| s.get("name").and_then(Value::as_str))
                        .collect()
                })
                .unwrap_or_default();
            let normalized: HashSet<String> = declared.iter().flat_map(|n| state_ids(n)).collect();

            for part in anatomy {
                let Some(present_in) = part.get("presentIn").and_then(Value::as_array) else {
                    continue;
                };
                let part_name = part.get("name").and_then(Value::as_str).unwrap_or("?");
                for state in present_in.iter().filter_map(Value::as_str) {
                    let known = declared.contains(&state)
                        || state_ids(state).iter().all(|id| normalized.contains(id));
                    if known {
                        continue;
                    }
                    let why = if declared.is_empty() {
                        "the component declares no states"
                    } else {
                        "it is not a declared state"
                    };
                    out.push(Diagnostic {
                        file: comp.file.clone(),
                        token: None,
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Warning,
                        message: format!(
                            "Anatomy part '{part_name}' on component '{}' is present in state '{state}', but {why}",
                            comp.name
                        ),
                        instance_path: Some(format!("/anatomy/{part_name}/presentIn")),
                        schema_path: None,
                    });
                }
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::{json, Value};

    use super::Rule;
    use crate::graph::{ComponentRecord, Layer, TokenGraph};
    use crate::registry::RegistryData;
    use crate::report::{Diagnostic, Severity};
    use crate::validate::rule::{ValidationContext, ValidationRule};

    fn run(component: Value) -> Vec<Diagnostic> {
        let mut g = TokenGraph::default();
        g.components.push(ComponentRecord {
            name: component["name"].as_str().unwrap().to_string(),
            file: PathBuf::from("c.json"),
            raw: component,
            layer: Layer::Foundation,
        });
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest: None,
        };
        Rule.validate(&ctx)
    }

    fn comp(states: &[&str], present_in: &[&str]) -> Value {
        json!({
            "name": "demo",
            "states": states.iter().map(|s| json!({"name": s})).collect::<Vec<_>>(),
            "anatomy": [{"name": "focus-indicator", "presentIn": present_in}]
        })
    }

    #[test]
    fn warns_on_an_undeclared_state() {
        let d = run(comp(&["hover", "down"], &["focus"]));
        assert_eq!(d.len(), 1);
        assert_eq!(d[0].severity, Severity::Warning);
        assert!(d[0].message.contains("state 'focus'"));
        assert!(d[0].message.contains("not a declared state"));
    }

    #[test]
    fn treats_focus_spellings_as_one_state() {
        for (declared, used) in [
            ("focus", "keyboard-focus"),
            ("keyboard-focus", "focus"),
            ("keyboard-focus", "key-focus"),
            ("focus", "focus"),
        ] {
            assert!(
                run(comp(&[declared], &[used])).is_empty(),
                "{declared} / {used}"
            );
        }
    }

    #[test]
    fn warns_when_the_component_declares_no_states() {
        let d = run(comp(&[], &["focus"]));
        assert_eq!(d.len(), 1);
        assert!(d[0].message.contains("declares no states"));
    }

    #[test]
    fn silent_without_presence_states() {
        let d = run(json!({"name": "demo", "anatomy": [{"name": "label"}]}));
        assert!(d.is_empty());
    }

    #[test]
    fn matches_a_declared_name_that_has_no_normal_form() {
        assert!(run(comp(&["focus-+-hover"], &["focus-+-hover"])).is_empty());
    }
}
