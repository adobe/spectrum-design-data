// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-053: ctr-option-valid
//!
//! For every CTR whose `scope.options` contains a key (other than `state`,
//! owned by SPEC-054), the CTR's option value MUST appear in the referenced
//! component's `options.<key>.values` list, when that list is declared.
//!
//! This is the headline CTR rule: it combines SPEC-019's error severity
//! (component-variant-valid) with SPEC-040's generality (any option key) —
//! for CTRs, `scope.options` fully replaces the token name-object's
//! multi-purpose scope fields, so a wrong option value is always an error,
//! not an advisory warning.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

/// `state` is validated by SPEC-054 against `component.states[].name` (an
/// ordered array), not against `options.state.values[]`. Excluded here to
/// avoid double-reporting, mirroring SPEC-040's `RESERVED` list.
const RESERVED: &[&str] = &["state"];

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-053"
    }

    fn name(&self) -> &'static str {
        "ctr-option-valid"
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
            let Some(options) = scope.get("options").and_then(|v| v.as_object()) else {
                continue;
            };
            let Some(comp) = comp_map.get(component) else {
                continue; // SPEC-051 covers undeclared component
            };

            let mut invalid: Vec<(&str, &str)> = Vec::new();

            for (key, val) in options {
                if RESERVED.contains(&key.as_str()) {
                    continue;
                }
                let Some(field_val) = val.as_str() else {
                    continue; // Layer 1 catches non-string option values
                };

                let Some(declared) = crate::validate::rules::component_option_values(comp, key)
                else {
                    continue; // option not declared, or no values[] — any value allowed
                };

                if declared.is_empty() {
                    continue;
                }

                if !declared.contains(field_val) {
                    invalid.push((key.as_str(), field_val));
                }
            }

            if !invalid.is_empty() {
                let rel_label = serde_json::to_string(scope).unwrap_or_default();
                for (key, field_val) in invalid {
                    out.push(Diagnostic {
                        file: rel.file.clone(),
                        token: None,
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Error,
                        message: format!(
                            "Relationship '{rel_label}' has {key} '{field_val}' which is not declared on component '{component}'"
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
    use crate::validate::rules::spec053::Rule;

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
    fn valid_value_passes() {
        let diags = run(
            json!({"scope": {"component": "button", "property": "color", "options": {"style": "fill"}}, "value": "#fff"}),
            json!({"name": "button", "options": {"style": {"values": [{"value": "fill"}, {"value": "outline"}]}}}),
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn invalid_value_error() {
        let diags = run(
            json!({"scope": {"component": "button", "property": "color", "options": {"style": "ghost"}}, "value": "#fff"}),
            json!({"name": "button", "options": {"style": {"values": [{"value": "fill"}, {"value": "outline"}]}}}),
        );
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-053"));
        assert!(diags[0].message.contains("ghost"));
    }

    #[test]
    fn option_without_values_skipped() {
        let diags = run(
            json!({"scope": {"component": "button", "property": "color", "options": {"isDisabled": "true"}}, "value": "#fff"}),
            json!({"name": "button", "options": {"isDisabled": {"type": "boolean"}}}),
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn state_key_skipped_owned_by_spec054() {
        let diags = run(
            json!({"scope": {"component": "button", "property": "color", "options": {"state": ["hover"]}}, "value": "#fff"}),
            json!({"name": "button", "options": {"state": {"values": [{"value": "focus"}]}}}),
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn missing_component_skipped() {
        let diags = run(
            json!({"scope": {"component": "missing", "property": "color", "options": {"style": "ghost"}}, "value": "#fff"}),
            json!({"name": "button", "options": {"style": {"values": [{"value": "fill"}]}}}),
        );
        assert!(diags.is_empty());
    }
}
