// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-026: state-custom-name-documented
//!
//! State declarations with a name outside the canonical state vocabulary
//! (design-system-registry `states.json`) SHOULD include a `description` field.
//! Custom state names without documentation make the component contract ambiguous.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-026"
    }

    fn name(&self) -> &'static str {
        "state-custom-name-documented"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut diags = Vec::new();

        let canonical_states = ctx.registry.for_field("state");

        for comp in &ctx.graph.components {
            let states = match comp.raw.get("states").and_then(|v| v.as_array()) {
                Some(s) => s,
                None => continue,
            };

            for state in states {
                let name = match state.get("name").and_then(|v| v.as_str()) {
                    Some(n) => n,
                    None => continue,
                };

                let is_canonical = canonical_states
                    .map(|set| set.contains(name))
                    .unwrap_or(false);

                if is_canonical {
                    continue;
                }

                let has_description = state
                    .get("description")
                    .and_then(|v| v.as_str())
                    .map(|s| !s.is_empty())
                    .unwrap_or(false);

                if !has_description {
                    diags.push(Diagnostic {
                        file: comp.file.clone(),
                        token: None,
                        rule_id: Some("SPEC-026".into()),
                        severity: Severity::Warning,
                        message: format!(
                            "Component '{}' has custom state '{}' with no description",
                            comp.name, name
                        ),
                        instance_path: None,
                        schema_path: None,
                    });
                }
            }
        }

        diags
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::json;

    use crate::graph::{ComponentRecord, TokenGraph};
    use crate::registry::RegistryData;
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec026::Rule;

    fn run_comp(comp_raw: serde_json::Value) -> Vec<crate::report::Diagnostic> {
        let mut g = TokenGraph::default();
        g.components.push(ComponentRecord {
            name: comp_raw
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("test-comp")
                .to_string(),
            file: PathBuf::from("test-comp.json"),
            raw: comp_raw,
        });
        let exceptions = std::collections::HashSet::new();
        let registry = RegistryData::embedded();
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: &registry,
        };
        Rule.validate(&ctx)
    }

    #[test]
    fn canonical_state_no_description_no_warning() {
        let diags = run_comp(json!({
            "name": "button",
            "displayName": "Button",
            "states": [{ "name": "hover", "trigger": "interaction", "precedence": 50 }]
        }));
        assert!(diags.is_empty());
    }

    #[test]
    fn custom_state_with_description_no_warning() {
        let diags = run_comp(json!({
            "name": "button",
            "displayName": "Button",
            "states": [{ "name": "wobble", "description": "A custom animation state." }]
        }));
        assert!(diags.is_empty());
    }

    #[test]
    fn custom_state_without_description_warns() {
        let diags = run_comp(json!({
            "name": "button",
            "displayName": "Button",
            "states": [
                { "name": "hover", "trigger": "interaction", "precedence": 50 },
                { "name": "wobble" }
            ]
        }));
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-026"));
        assert!(diags[0].message.contains("wobble"));
        assert!(diags[0].message.contains("button"));
    }

    #[test]
    fn no_states_no_warning() {
        let diags = run_comp(json!({ "name": "button", "displayName": "Button" }));
        assert!(diags.is_empty());
    }
}
