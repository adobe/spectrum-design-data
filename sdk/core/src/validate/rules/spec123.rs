// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-123: component-has-contract-or-exemption
//!
//! Warning. A component with no `accessibility.role` has no contract path derived from its role,
//! so it MUST have a behavior contract or an entry in the exemptions registry
//! (`behavior-exemptions.json`), and not both. An exemption's reason MUST be a registered one.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-123"
    }

    fn name(&self) -> &'static str {
        "component-has-contract-or-exemption"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for c in &ctx.graph.components {
            let has_role = c
                .raw
                .pointer("/accessibility/role")
                .is_some_and(|r| r.is_string());
            let has_contract = ctx.graph.behaviors.iter().any(|b| b.component == c.name);
            let reason = ctx.registry.behavior_exemption(&c.name);
            let problem = match (reason, has_contract) {
                (Some(_), true) => {
                    Some("is exempt from a behavior contract and also has one".to_string())
                }
                (Some(r), false) if !ctx.registry.exemption_reasons().contains(r) => Some(format!(
                    "is exempt for reason '{r}', which is not registered"
                )),
                (None, false) if !has_role => Some(
                    "has no accessibility.role, no behavior contract and no exemption".to_string(),
                ),
                _ => None,
            };
            if let Some(p) = problem {
                out.push(Diagnostic {
                    file: c.file.clone(),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Warning,
                    message: format!("Component '{}' {p}", c.name),
                    instance_path: Some("/name".to_string()),
                    schema_path: None,
                });
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::Rule;
    use crate::graph::{ComponentRecord, Layer};
    use crate::validate::rules::behavior_util::test_util::{good, graph, run};

    fn component(name: &str, raw: serde_json::Value) -> ComponentRecord {
        ComponentRecord {
            name: name.into(),
            file: "dataset.json".into(),
            raw,
            layer: Layer::Foundation,
        }
    }

    #[test]
    fn flags_a_component_with_no_role_contract_or_exemption() {
        let mut g = graph(vec![]);
        g.components
            .push(component("tabs", json!({ "name": "tabs" })));
        let m = run(&Rule, &g);
        assert_eq!(m.len(), 2, "switch has no role either: {m:?}");
        assert!(m
            .iter()
            .any(|m| m.contains("'tabs'") && m.contains("no exemption")));
    }

    #[test]
    fn accepts_a_role_a_contract_or_an_exemption() {
        let mut g = graph(vec![good()]);
        g.components.push(component(
            "tabs",
            json!({ "accessibility": { "role": "tablist" } }),
        ));
        g.components.push(component("divider", json!({})));
        assert!(run(&Rule, &g).is_empty());
    }

    #[test]
    fn flags_an_exempt_component_that_has_a_contract() {
        let mut c = good();
        c["component"] = json!("divider");
        let mut g = graph(vec![good(), c]);
        g.components.push(component("divider", json!({})));
        let m = run(&Rule, &g);
        assert_eq!(m.len(), 1, "{m:?}");
        assert!(m[0].contains("exempt") && m[0].contains("also has one"));
    }
}
