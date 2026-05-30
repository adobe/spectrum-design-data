// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-027: token-binding-token-exists
//!
//! Each `tokenBindings[].token` value in a component declaration MUST match the
//! name of a declared token in the dataset.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-027"
    }

    fn name(&self) -> &'static str {
        "token-binding-token-exists"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        // Only string-named tokens are referenceable via tokenBindings.
        let token_names: std::collections::HashSet<&str> = ctx
            .graph
            .tokens
            .values()
            .filter_map(|t| t.raw.get("name").and_then(|n| n.as_str()))
            .collect();

        for comp in &ctx.graph.components {
            let Some(bindings) = comp.raw.get("tokenBindings").and_then(|v| v.as_array()) else {
                continue;
            };
            for binding in bindings {
                let Some(token_ref) = binding.get("token").and_then(|v| v.as_str()) else {
                    continue;
                };
                if !token_names.contains(token_ref) {
                    out.push(Diagnostic {
                        file: comp.file.clone(),
                        token: None,
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Error,
                        message: format!(
                            "Component '{}' tokenBindings references unknown token '{token_ref}'",
                            comp.name
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

    use crate::graph::{ComponentRecord, TokenGraph, TokenRecord};
    use crate::registry::RegistryData;
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec027::Rule;

    fn make_graph(tokens: Vec<serde_json::Value>, comp_raw: serde_json::Value) -> TokenGraph {
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
        let comp_name = comp_raw
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("comp")
            .to_string();
        g.components.push(ComponentRecord {
            name: comp_name,
            file: PathBuf::from("dataset.json"),
            raw: comp_raw,
        });
        g
    }

    fn run(
        tokens: Vec<serde_json::Value>,
        comp_raw: serde_json::Value,
    ) -> Vec<crate::report::Diagnostic> {
        let g = make_graph(tokens, comp_raw);
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
    fn known_token_no_error() {
        let diags = run(
            vec![json!({"name": "button-background-color", "value": "#fff"})],
            json!({
                "name": "button",
                "tokenBindings": [{"token": "button-background-color", "slot": "default"}]
            }),
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn unknown_token_error() {
        let diags = run(
            vec![],
            json!({
                "name": "button",
                "tokenBindings": [{"token": "ghost-token", "slot": "default"}]
            }),
        );
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-027"));
        assert!(diags[0].message.contains("ghost-token"));
    }

    #[test]
    fn no_bindings_no_error() {
        let diags = run(vec![], json!({"name": "button"}));
        assert!(diags.is_empty());
    }
}
