// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-052: ctr-part-valid
//!
//! A CTR's `scope.part` value, when present, MUST match the `name` of a
//! declared anatomy part on the referenced component (when anatomy parts are
//! declared). Mirrors SPEC-020 (component-anatomy-valid) for the CTR scope
//! object.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-052"
    }

    fn name(&self) -> &'static str {
        "ctr-part-valid"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        let comp_map: std::collections::HashMap<&str, &crate::graph::ComponentRecord> = ctx
            .graph
            .components
            .iter()
            .map(|c| (c.name.as_str(), c))
            .collect();

        for rel in &ctx.graph.relationships {
            let Some(scope) = rel.raw.get("scope").and_then(|v| v.as_object()) else {
                continue;
            };
            let Some(component) = scope.get("component").and_then(|v| v.as_str()) else {
                continue;
            };
            let Some(part) = scope.get("part").and_then(|v| v.as_str()) else {
                continue;
            };
            let Some(comp) = comp_map.get(component) else {
                continue; // SPEC-051 covers undeclared component
            };

            let declared_parts: std::collections::HashSet<&str> = comp
                .raw
                .get("anatomy")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|p| p.get("name").and_then(|n| n.as_str()))
                        .collect()
                })
                .unwrap_or_default();

            if !declared_parts.is_empty() && !declared_parts.contains(part) {
                let rel_label = serde_json::to_string(scope).unwrap_or_default();
                out.push(Diagnostic {
                    file: rel.file.clone(),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Error,
                    message: format!(
                        "Relationship '{rel_label}' references undeclared anatomy part '{part}' on component '{component}'"
                    ),
                    instance_path: None,
                    schema_path: None,
                });
            }
        }

        out
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::json;

    use crate::graph::{ComponentRecord, RelationshipRecord, TokenGraph};
    use crate::registry::RegistryData;
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec052::Rule;

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
    fn declared_part_no_error() {
        let diags = run(
            json!({"scope": {"component": "button", "part": "label", "property": "color"}, "value": "#fff"}),
            json!({"name": "button", "anatomy": [{"name": "label"}]}),
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn undeclared_part_error() {
        let diags = run(
            json!({"scope": {"component": "button", "part": "capsule", "property": "color"}, "value": "#fff"}),
            json!({"name": "button", "anatomy": [{"name": "label"}]}),
        );
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-052"));
        assert!(diags[0].message.contains("capsule"));
    }

    #[test]
    fn no_anatomy_declared_no_error() {
        let diags = run(
            json!({"scope": {"component": "button", "part": "anything", "property": "color"}, "value": "#fff"}),
            json!({"name": "button"}),
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn missing_component_skipped() {
        let diags = run(
            json!({"scope": {"component": "missing", "part": "label", "property": "color"}, "value": "#fff"}),
            json!({"name": "button", "anatomy": [{"name": "label"}]}),
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn no_part_skipped() {
        let diags = run(
            json!({"scope": {"component": "button", "property": "color"}, "value": "#fff"}),
            json!({"name": "button", "anatomy": [{"name": "label"}]}),
        );
        assert!(diags.is_empty());
    }
}
