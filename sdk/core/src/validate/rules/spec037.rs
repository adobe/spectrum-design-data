// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-037: sub-entity-deprecation-cascade
//!
//! Tokens SHOULD NOT reference a deprecated anatomy part, deprecated component state,
//! or deprecated option-enum value via `name.*` unless the token is itself deprecated.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-037"
    }

    fn name(&self) -> &'static str {
        "sub-entity-deprecation-cascade"
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
            // Use as_str() so deprecated: null or deprecated: false does not suppress warnings.
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

            // --- anatomy cascade ---
            if let Some(part_name) = name_obj.get("anatomy").and_then(|v| v.as_str()) {
                let dep_version = comp
                    .raw
                    .get("anatomy")
                    .and_then(|v| v.as_array())
                    .and_then(|arr| {
                        arr.iter()
                            .find(|p| p.get("name").and_then(|n| n.as_str()) == Some(part_name))
                    })
                    .and_then(|p| p.get("lifecycle"))
                    .and_then(|l| l.get("deprecated"))
                    .and_then(|v| v.as_str());

                if let Some(version) = dep_version {
                    out.push(Diagnostic {
                        file: t.file.clone(),
                        token: Some(t.name.clone()),
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Warning,
                        message: format!(
                            "Token '{}' references deprecated anatomy part '{part_name}' \
                             on component '{component}' (deprecated since {version}); \
                             update the reference or mark the token deprecated",
                            t.name
                        ),
                        instance_path: Some("/name/anatomy".to_string()),
                        schema_path: None,
                    });
                }
            }

            // --- state cascade ---
            if let Some(state_name) = name_obj.get("state").and_then(|v| v.as_str()) {
                let dep_version = comp
                    .raw
                    .get("states")
                    .and_then(|v| v.as_array())
                    .and_then(|arr| {
                        arr.iter()
                            .find(|s| s.get("name").and_then(|n| n.as_str()) == Some(state_name))
                    })
                    .and_then(|s| s.get("lifecycle"))
                    .and_then(|l| l.get("deprecated"))
                    .and_then(|v| v.as_str());

                if let Some(version) = dep_version {
                    out.push(Diagnostic {
                        file: t.file.clone(),
                        token: Some(t.name.clone()),
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Warning,
                        message: format!(
                            "Token '{}' references deprecated state '{state_name}' \
                             on component '{component}' (deprecated since {version}); \
                             update the reference or mark the token deprecated",
                            t.name
                        ),
                        instance_path: Some("/name/state".to_string()),
                        schema_path: None,
                    });
                }
            }

            // --- option-value cascade ---
            // Iterate every declared option; check if the token's name-field for that option
            // matches a value in values[] that carries a deprecated lifecycle.
            if let Some(options) = comp.raw.get("options").and_then(|v| v.as_object()) {
                for (option_key, option_desc) in options {
                    // Only string token values are reachable here; numeric/boolean option
                    // values use as_str() → None and are skipped. Non-string deprecated
                    // values are not yet expressible in token name-objects, so this gap
                    // is harmless today but worth revisiting if numeric options adopt lifecycle.
                    let Some(token_value) =
                        name_obj.get(option_key.as_str()).and_then(|v| v.as_str())
                    else {
                        continue;
                    };

                    let dep_version = option_desc
                        .get("values")
                        .and_then(|v| v.as_array())
                        .and_then(|arr| {
                            arr.iter().find(|entry| {
                                entry.get("value").and_then(|v| v.as_str()) == Some(token_value)
                            })
                        })
                        .and_then(|entry| entry.get("lifecycle"))
                        .and_then(|l| l.get("deprecated"))
                        .and_then(|v| v.as_str());

                    if let Some(version) = dep_version {
                        out.push(Diagnostic {
                            file: t.file.clone(),
                            token: Some(t.name.clone()),
                            rule_id: Some(self.id().to_string()),
                            severity: Severity::Warning,
                            message: format!(
                                "Token '{}' references deprecated option value '{token_value}' \
                                 for option '{option_key}' on component '{component}' \
                                 (deprecated since {version}); \
                                 update the reference or mark the token deprecated",
                                t.name
                            ),
                            instance_path: Some(format!("/name/{option_key}")),
                            schema_path: None,
                        });
                    }
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
    use crate::validate::rules::spec037::Rule;

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

    fn run(
        token_raw: serde_json::Value,
        comp_raw: serde_json::Value,
    ) -> Vec<crate::report::Diagnostic> {
        let g = make_graph(token_raw, comp_raw);
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

    // --- anatomy tests ---

    #[test]
    fn non_deprecated_anatomy_no_warning() {
        let diags = run(
            json!({"name": {"component": "slider", "anatomy": "track", "property": "background-color"}, "value": "#fff"}),
            json!({"name": "slider", "anatomy": [{"name": "track"}]}),
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn deprecated_anatomy_warns() {
        let diags = run(
            json!({"name": {"component": "slider", "anatomy": "handle", "property": "background-color"}, "value": "#fff"}),
            json!({"name": "slider", "anatomy": [{"name": "handle", "lifecycle": {"deprecated": "1.0.0-draft"}}]}),
        );
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-037"));
        assert!(diags[0].message.contains("anatomy part"));
        assert!(diags[0].message.contains("handle"));
        assert!(diags[0].message.contains("1.0.0-draft"));
        assert_eq!(diags[0].instance_path.as_deref(), Some("/name/anatomy"));
    }

    // --- state tests ---

    #[test]
    fn non_deprecated_state_no_warning() {
        let diags = run(
            json!({"name": {"component": "button", "state": "hover", "property": "background-color"}, "value": "#eee"}),
            json!({"name": "button", "states": [{"name": "hover"}]}),
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn deprecated_state_warns() {
        let diags = run(
            json!({"name": {"component": "button", "state": "pressed", "property": "background-color"}, "value": "#ccc"}),
            json!({"name": "button", "states": [{"name": "pressed", "lifecycle": {"deprecated": "1.0.0-draft"}}]}),
        );
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-037"));
        assert!(diags[0].message.contains("state"));
        assert!(diags[0].message.contains("pressed"));
        assert!(diags[0].message.contains("1.0.0-draft"));
        assert_eq!(diags[0].instance_path.as_deref(), Some("/name/state"));
    }

    // --- option-enum tests ---

    #[test]
    fn non_deprecated_option_no_warning() {
        let diags = run(
            json!({"name": {"component": "button", "variant": "primary", "property": "background-color"}, "value": "#0265dc"}),
            json!({"name": "button", "options": {"variant": {"values": [{"value": "primary"}, {"value": "secondary"}]}}}),
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn deprecated_option_value_warns() {
        let diags = run(
            json!({"name": {"component": "button", "variant": "cta", "property": "background-color"}, "value": "#0265dc"}),
            json!({
                "name": "button",
                "options": {
                    "variant": {
                        "values": [
                            {"value": "primary"},
                            {"value": "secondary"},
                            {"value": "cta", "lifecycle": {"deprecated": "1.0.0-draft", "deprecatedComment": "Use primary instead."}}
                        ]
                    }
                }
            }),
        );
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-037"));
        assert!(diags[0].message.contains("option value"));
        assert!(diags[0].message.contains("cta"));
        assert!(diags[0].message.contains("1.0.0-draft"));
        assert_eq!(diags[0].instance_path.as_deref(), Some("/name/variant"));
    }

    // --- suppression tests ---

    #[test]
    fn already_deprecated_token_no_warning() {
        // Token with top-level deprecated string — cascade suppressed for all sub-entity checks.
        let diags = run(
            json!({
                "name": {"component": "slider", "anatomy": "handle", "property": "background-color"},
                "value": "#fff",
                "deprecated": "1.0.0-draft"
            }),
            json!({"name": "slider", "anatomy": [{"name": "handle", "lifecycle": {"deprecated": "1.0.0-draft"}}]}),
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn deprecated_false_does_not_suppress_warning() {
        // deprecated: false is not a string — must NOT suppress the warning.
        let diags = run(
            json!({
                "name": {"component": "button", "state": "pressed", "property": "background-color"},
                "value": "#ccc",
                "deprecated": false
            }),
            json!({"name": "button", "states": [{"name": "pressed", "lifecycle": {"deprecated": "1.0.0-draft"}}]}),
        );
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
    }

    // --- boundary tests ---

    #[test]
    fn missing_component_no_warning() {
        // SPEC-018 owns "component not declared" — SPEC-037 stays silent.
        let diags = run(
            json!({"name": {"component": "ghost", "anatomy": "handle", "property": "color"}, "value": "#000"}),
            json!({"name": "other-component", "anatomy": [{"name": "handle", "lifecycle": {"deprecated": "1.0.0-draft"}}]}),
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn multiple_cascades_in_one_token() {
        // Token references both a deprecated anatomy part and a deprecated state — two warnings.
        let diags = run(
            json!({"name": {"component": "slider", "anatomy": "handle", "state": "pressed", "property": "color"}, "value": "#000"}),
            json!({
                "name": "slider",
                "anatomy": [{"name": "handle", "lifecycle": {"deprecated": "1.0.0-draft"}}],
                "states": [{"name": "pressed", "lifecycle": {"deprecated": "1.0.0-draft"}}]
            }),
        );
        assert_eq!(diags.len(), 2);
        assert!(diags.iter().all(|d| d.severity == Severity::Warning));
        assert!(diags
            .iter()
            .all(|d| d.rule_id.as_deref() == Some("SPEC-037")));
        let paths: std::collections::HashSet<&str> = diags
            .iter()
            .filter_map(|d| d.instance_path.as_deref())
            .collect();
        assert!(paths.contains("/name/anatomy"));
        assert!(paths.contains("/name/state"));
    }
}
