// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-036: component-deprecation-cascade
//!
//! Tokens SHOULD NOT reference a deprecated component via `name.component`
//! unless the token is itself deprecated.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-036"
    }

    fn name(&self) -> &'static str {
        "component-deprecation-cascade"
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
            // Skip tokens that are themselves deprecated — no cascaded warning needed.
            // Use as_str() so deprecated: null or deprecated: false does not suppress the warning.
            if t.raw.get("deprecated").and_then(|v| v.as_str()).is_some() {
                continue;
            }

            let Some(name_obj) = t.raw.get("name").and_then(|v| v.as_object()) else {
                continue;
            };
            let Some(component) = name_obj.get("component").and_then(|v| v.as_str()) else {
                continue;
            };
            let Some(comp) = comp_map.get(component) else {
                continue; // SPEC-018 covers undeclared component
            };

            let dep_version = comp
                .raw
                .get("lifecycle")
                .and_then(|l| l.get("deprecated"))
                .and_then(|v| v.as_str());

            if let Some(version) = dep_version {
                out.push(Diagnostic {
                    file: t.file.clone(),
                    token: Some(t.name.clone()),
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Warning,
                    message: format!(
                        "Token '{}' references deprecated component '{component}' \
                         (deprecated since {version}); update the reference or mark the token deprecated",
                        t.name
                    ),
                    instance_path: Some("/name/component".to_string()),
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
    use crate::validate::rules::spec036::Rule;

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
                layer: crate::graph::Layer::Foundation,
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
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: &registry,
        };
        Rule.validate(&ctx)
    }

    #[test]
    fn non_deprecated_component_no_warning() {
        let diags = run(
            json!({"name": {"component": "button", "property": "background-color"}, "value": "#fff"}),
            json!({"name": "button"}),
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn deprecated_component_warns() {
        let diags = run(
            json!({"name": {"component": "old-widget", "property": "color"}, "value": "#000"}),
            json!({"name": "old-widget", "lifecycle": {"deprecated": "1.0.0-draft"}}),
        );
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-036"));
        assert!(diags[0].message.contains("old-widget"));
        assert!(diags[0].message.contains("1.0.0-draft"));
        assert_eq!(diags[0].instance_path.as_deref(), Some("/name/component"));
    }

    #[test]
    fn already_deprecated_token_no_warning() {
        let diags = run(
            json!({"name": {"component": "old-widget", "property": "color"}, "value": "#000", "deprecated": "1.0.0-draft"}),
            json!({"name": "old-widget", "lifecycle": {"deprecated": "1.0.0-draft"}}),
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn string_name_token_skipped() {
        let diags = run(
            json!({"name": "old-widget-color", "value": "#000"}),
            json!({"name": "old-widget", "lifecycle": {"deprecated": "1.0.0-draft"}}),
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn missing_component_no_warning() {
        // SPEC-018 owns the "component not declared" error — SPEC-036 stays silent.
        let diags = run(
            json!({"name": {"component": "ghost-component", "property": "color"}, "value": "#000"}),
            json!({"name": "other-component", "lifecycle": {"deprecated": "1.0.0-draft"}}),
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn deprecated_false_does_not_suppress_warning() {
        // deprecated: false should NOT be treated as deprecated — warning must still fire.
        let diags = run(
            json!({"name": {"component": "old-widget", "property": "color"}, "value": "#000", "deprecated": false}),
            json!({"name": "old-widget", "lifecycle": {"deprecated": "1.0.0-draft"}}),
        );
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
    }

    #[test]
    fn unrelated_token_no_component_field_no_warning() {
        let diags = run(
            json!({"name": {"property": "border-radius"}, "value": "4px"}),
            json!({"name": "button", "lifecycle": {"deprecated": "1.0.0-draft"}}),
        );
        assert!(diags.is_empty());
    }
}
