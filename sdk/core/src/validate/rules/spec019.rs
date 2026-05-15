// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-019: component-variant-valid
//!
//! Token name-object `variant` field MUST be a value in the component's
//! `options.variant.enum` when that enum is declared.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-019"
    }

    fn name(&self) -> &'static str {
        "component-variant-valid"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        let comp_map: std::collections::HashMap<&str, &crate::graph::ComponentRecord> = ctx
            .graph
            .components
            .iter()
            .map(|c| (c.name.as_str(), c))
            .collect();

        for t in ctx.graph.tokens.values() {
            let Some(name_obj) = t.raw.get("name").and_then(|v| v.as_object()) else {
                continue;
            };
            let Some(component) = name_obj.get("component").and_then(|v| v.as_str()) else {
                continue;
            };
            let Some(variant) = name_obj.get("variant").and_then(|v| v.as_str()) else {
                continue;
            };
            let Some(comp) = comp_map.get(component) else {
                continue; // SPEC-018 covers undeclared component
            };

            let Some(variant_enum) = comp
                .raw
                .get("options")
                .and_then(|o| o.get("variant"))
                .and_then(|v| v.get("enum"))
                .and_then(|e| e.as_array())
            else {
                continue; // no enum declared — any variant is allowed
            };

            let declared: std::collections::HashSet<&str> = variant_enum
                .iter()
                .filter_map(|v| v.as_str())
                .collect();

            if !declared.contains(variant) {
                let token_label = serde_json::to_string(name_obj).unwrap_or_default();
                out.push(Diagnostic {
                    file: t.file.clone(),
                    token: Some(t.name.clone()),
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Error,
                    message: format!(
                        "Token '{token_label}' has variant '{variant}' which is not declared on component '{component}'"
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
    use crate::validate::rules::spec019::Rule;

    fn make_graph(token_raw: serde_json::Value, comp_raw: serde_json::Value) -> TokenGraph {
        let mut g = TokenGraph::default();
        g.tokens.insert(
            "t".into(),
            TokenRecord {
                name: "t".into(),
                file: PathBuf::from("dataset.json"),
                index: 0,
                schema_url: None,
                uuid: None,
                alias_target: None,
                raw: token_raw,
            },
        );
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

    fn run(token_raw: serde_json::Value, comp_raw: serde_json::Value) -> Vec<crate::report::Diagnostic> {
        let g = make_graph(token_raw, comp_raw);
        let exceptions = std::collections::HashSet::new();
        let registry = RegistryData::embedded();
        let ctx = ValidationContext { graph: &g, naming_exceptions: &exceptions, registry: &registry };
        Rule.validate(&ctx)
    }

    #[test]
    fn valid_variant_no_error() {
        let diags = run(
            json!({"name": {"property": "color", "component": "button", "variant": "primary"}, "value": "#fff"}),
            json!({"name": "button", "options": {"variant": {"enum": ["primary", "secondary"]}}}),
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn invalid_variant_error() {
        let diags = run(
            json!({"name": {"property": "color", "component": "button", "variant": "electric"}, "value": "#fff"}),
            json!({"name": "button", "options": {"variant": {"enum": ["primary", "secondary"]}}}),
        );
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-019"));
        assert!(diags[0].message.contains("electric"));
        assert!(diags[0].message.contains("button"));
    }

    #[test]
    fn no_enum_declared_no_error() {
        let diags = run(
            json!({"name": {"property": "color", "component": "button", "variant": "anything"}, "value": "#fff"}),
            json!({"name": "button"}),
        );
        assert!(diags.is_empty());
    }
}
