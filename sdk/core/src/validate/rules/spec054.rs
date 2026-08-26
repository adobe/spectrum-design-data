// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-054: ctr-state-valid
//!
//! A CTR's `scope.options.state` array elements MUST match the `name` of a
//! declared state on the referenced component (when state declarations are
//! present). Mirrors SPEC-022 (component-state-valid) for the CTR scope
//! object.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-054"
    }

    fn name(&self) -> &'static str {
        "ctr-state-valid"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        let comp_map = super::component_map(ctx.graph);

        for rel in &ctx.graph.relationships {
            let Some(scope) = rel.raw.get("scope").and_then(|v| v.as_object()) else {
                continue;
            };
            let Some(component) = scope.get("component").and_then(|v| v.as_str()) else {
                continue;
            };
            let Some(states) = scope
                .get("options")
                .and_then(|o| o.get("state"))
                .and_then(|v| v.as_array())
            else {
                continue;
            };
            let Some(comp) = comp_map.get(component) else {
                continue; // SPEC-051 covers undeclared component
            };

            let declared_states: std::collections::HashSet<&str> = comp
                .raw
                .get("states")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|s| s.get("name").and_then(|n| n.as_str()))
                        .collect()
                })
                .unwrap_or_default();

            if declared_states.is_empty() {
                continue;
            }

            let rel_label = serde_json::to_string(scope).unwrap_or_default();
            for state in states.iter().filter_map(|s| s.as_str()) {
                if !declared_states.contains(state) {
                    out.push(Diagnostic {
                        file: rel.file.clone(),
                        token: None,
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Error,
                        message: format!(
                            "Relationship '{rel_label}' references undeclared state '{state}' on component '{component}'"
                        ),
                        instance_path: None,
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

    use serde_json::json;

    use crate::graph::{ComponentRecord, Layer, RelationshipRecord, TokenGraph};
    use crate::registry::RegistryData;
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec054::Rule;

    fn make_graph(rel_raw: serde_json::Value, comp_raw: serde_json::Value) -> TokenGraph {
        let mut g = TokenGraph::default();
        g.relationships.push(RelationshipRecord {
            file: PathBuf::from("relationships.json"),
            index: 0,
            uuid: None,
            raw: rel_raw,
        });
        let comp_name = comp_raw
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("button")
            .to_string();
        g.components.push(ComponentRecord {
            name: comp_name,
            file: PathBuf::from("dataset.json"),
            raw: comp_raw,
            layer: Layer::Foundation,
        });
        g
    }

    fn run(
        rel_raw: serde_json::Value,
        comp_raw: serde_json::Value,
    ) -> Vec<crate::report::Diagnostic> {
        let g = make_graph(rel_raw, comp_raw);
        let exceptions = std::collections::HashSet::new();
        let registry = RegistryData::embedded();
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: &registry,
            manifest: None,
        };
        Rule.validate(&ctx)
    }

    #[test]
    fn declared_state_no_error() {
        let diags = run(
            json!({"scope": {"component": "button", "property": "color", "options": {"state": ["hover"]}}, "value": "#fff"}),
            json!({"name": "button", "states": [{"name": "hover"}]}),
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn undeclared_state_error() {
        let diags = run(
            json!({"scope": {"component": "button", "property": "color", "options": {"state": ["jello"]}}, "value": "#fff"}),
            json!({"name": "button", "states": [{"name": "hover"}]}),
        );
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-054"));
        assert!(diags[0].message.contains("jello"));
    }

    #[test]
    fn no_states_declared_no_error() {
        let diags = run(
            json!({"scope": {"component": "button", "property": "color", "options": {"state": ["anything"]}}, "value": "#fff"}),
            json!({"name": "button"}),
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn missing_component_skipped() {
        let diags = run(
            json!({"scope": {"component": "missing", "property": "color", "options": {"state": ["hover"]}}, "value": "#fff"}),
            json!({"name": "button", "states": [{"name": "hover"}]}),
        );
        assert!(diags.is_empty());
    }
}
