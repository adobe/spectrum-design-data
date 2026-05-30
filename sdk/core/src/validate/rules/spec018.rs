// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-018: component-name-declared
//!
//! Token name-object `component` field MUST reference a declared component.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-018"
    }

    fn name(&self) -> &'static str {
        "component-name-declared"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        let component_names: std::collections::HashSet<&str> = ctx
            .graph
            .components
            .iter()
            .map(|c| c.name.as_str())
            .collect();

        for t in ctx.graph.tokens.values() {
            let Some(name_obj) = t.raw.get("name").and_then(|v| v.as_object()) else {
                continue;
            };
            let Some(component) = name_obj.get("component").and_then(|v| v.as_str()) else {
                continue;
            };
            if !component_names.contains(component) {
                let token_label = serde_json::to_string(name_obj).unwrap_or_default();
                out.push(Diagnostic {
                    file: t.file.clone(),
                    token: Some(t.name.clone()),
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Error,
                    message: format!(
                        "Token '{token_label}' references undeclared component '{component}'"
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

    use crate::graph::{ComponentRecord, TokenGraph, TokenRecord};
    use crate::registry::RegistryData;
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec018::Rule;

    fn make_graph(
        tokens: Vec<serde_json::Value>,
        components: Vec<serde_json::Value>,
    ) -> TokenGraph {
        let mut g = TokenGraph::default();
        for (i, raw) in tokens.into_iter().enumerate() {
            g.tokens.insert(
                format!("token-{i}"),
                TokenRecord {
                    name: format!("token-{i}"),
                    file: PathBuf::from("dataset.json"),
                    index: i,
                    schema_url: None,
                    uuid: None,
                    alias_target: None,
                    layer: crate::graph::Layer::Foundation,
                    raw,
                },
            );
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
        tokens: Vec<serde_json::Value>,
        components: Vec<serde_json::Value>,
    ) -> Vec<crate::report::Diagnostic> {
        let g = make_graph(tokens, components);
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
            vec![json!({"name": {"property": "color", "component": "button"}, "value": "#fff"})],
            vec![json!({"name": "button"})],
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn undeclared_component_error() {
        let diags = run(
            vec![json!({"name": {"property": "color", "component": "ghost"}, "value": "#fff"})],
            vec![],
        );
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-018"));
        assert!(diags[0].message.contains("ghost"));
    }

    #[test]
    fn string_name_skipped() {
        let diags = run(
            vec![json!({"name": "plain-string-token", "value": "#fff"})],
            vec![],
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn no_component_field_skipped() {
        let diags = run(
            vec![json!({"name": {"property": "color"}, "value": "#fff"})],
            vec![],
        );
        assert!(diags.is_empty());
    }
}
