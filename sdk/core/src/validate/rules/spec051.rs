// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-051: ctr-component-exists
//!
//! A Component/Token Relationship (CTR)'s `scope.component` value MUST match
//! the `name` of a declared component in the dataset. Mirrors SPEC-018
//! (component-name-declared) for the CTR scope object.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-051"
    }

    fn name(&self) -> &'static str {
        "ctr-component-exists"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        // Skip when no component catalog has been loaded — mirrors SPEC-018's guard.
        if ctx.graph.components.is_empty() {
            return vec![];
        }

        let mut out = Vec::new();

        let component_names: std::collections::HashSet<&str> = ctx
            .graph
            .components
            .iter()
            .map(|c| c.name.as_str())
            .collect();

        for rel in &ctx.graph.relationships {
            let Some(scope) = rel.raw.get("scope").and_then(|v| v.as_object()) else {
                continue;
            };
            let Some(component) = scope.get("component").and_then(|v| v.as_str()) else {
                continue; // Layer 1 requires scope.component; nothing to check here
            };
            if !component_names.contains(component) {
                let rel_label = serde_json::to_string(scope).unwrap_or_default();
                out.push(Diagnostic {
                    file: rel.file.clone(),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Error,
                    message: format!(
                        "Relationship '{rel_label}' references undeclared component '{component}'"
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
    use crate::validate::rules::spec051::Rule;

    fn make_graph(
        relationships: Vec<serde_json::Value>,
        components: Vec<serde_json::Value>,
    ) -> TokenGraph {
        let mut g = TokenGraph::default();
        for (i, raw) in relationships.into_iter().enumerate() {
            g.relationships.push(RelationshipRecord {
                file: PathBuf::from("relationships.json"),
                index: i,
                uuid: raw.get("uuid").and_then(|v| v.as_str()).map(String::from),
                raw,
            });
        }
        for raw in components {
            let name = raw
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("comp")
                .to_string();
            g.components.push(ComponentRecord {
                name,
                file: PathBuf::from("dataset.json"),
                raw,
            });
        }
        g
    }

    fn run(
        relationships: Vec<serde_json::Value>,
        components: Vec<serde_json::Value>,
    ) -> Vec<crate::report::Diagnostic> {
        let g = make_graph(relationships, components);
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
    fn declared_component_no_error() {
        let diags = run(
            vec![json!({"scope": {"component": "button", "property": "color"}, "value": "#fff"})],
            vec![json!({"name": "button"})],
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn undeclared_component_error() {
        let diags = run(
            vec![json!({"scope": {"component": "ghost", "property": "color"}, "value": "#fff"})],
            vec![json!({"name": "button"})],
        );
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-051"));
        assert!(diags[0].message.contains("ghost"));
    }

    #[test]
    fn no_component_catalog_loaded_skipped() {
        let diags = run(
            vec![json!({"scope": {"component": "ghost", "property": "color"}, "value": "#fff"})],
            vec![],
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn missing_context_skipped() {
        let diags = run(
            vec![json!({"value": "#fff"})],
            vec![json!({"name": "button"})],
        );
        assert!(diags.is_empty());
    }
}
