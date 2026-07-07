// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-047: space-between-endpoint-valid
//!
//! A token name-object with `property: "space-between"` MUST carry both `from`
//! and `to` endpoint fields, and neither field may appear without it. Each
//! endpoint value MUST be one of: an edge position (registry/positions.json),
//! a generic anatomy term (registry/anatomy-terms.json), or — when `component`
//! is present and declares an `anatomy` array — the `name` of a declared
//! anatomy part on that component. Mirrors SPEC-020's component→anatomy
//! resolution, unioned with the position and generic-anatomy vocabularies.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-047"
    }

    fn name(&self) -> &'static str {
        "space-between-endpoint-valid"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        let position_vocab = ctx.registry.for_field("position");
        let anatomy_vocab = ctx.registry.for_field("anatomy");

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
            let property = name_obj.get("property").and_then(|v| v.as_str());
            let from = name_obj.get("from").and_then(|v| v.as_str());
            let to = name_obj.get("to").and_then(|v| v.as_str());
            let is_space_between = property == Some("space-between");

            if !is_space_between {
                if from.is_some() || to.is_some() {
                    out.push(Diagnostic {
                        file: t.file.clone(),
                        token: Some(t.name.clone()),
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Error,
                        message: format!(
                            "Token '{}' has a 'from'/'to' endpoint field but property is not 'space-between'",
                            t.name
                        ),
                        instance_path: None,
                        schema_path: None,
                    });
                }
                continue;
            }

            if from.is_none() || to.is_none() {
                out.push(Diagnostic {
                    file: t.file.clone(),
                    token: Some(t.name.clone()),
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Error,
                    message: format!(
                        "Token '{}' has property 'space-between' but is missing 'from' and/or 'to'",
                        t.name
                    ),
                    instance_path: None,
                    schema_path: None,
                });
                continue;
            }

            let component = name_obj.get("component").and_then(|v| v.as_str());
            let declared_parts: std::collections::HashSet<&str> = component
                .and_then(|c| comp_map.get(c))
                .and_then(|comp| comp.raw.get("anatomy"))
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|p| p.get("name").and_then(|n| n.as_str()))
                        .collect()
                })
                .unwrap_or_default();

            for (field, endpoint) in [("from", from.unwrap()), ("to", to.unwrap())] {
                let valid = position_vocab.is_some_and(|v| v.contains(endpoint))
                    || anatomy_vocab.is_some_and(|v| v.contains(endpoint))
                    || declared_parts.contains(endpoint);

                if !valid {
                    out.push(Diagnostic {
                        file: t.file.clone(),
                        token: Some(t.name.clone()),
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Error,
                        message: format!(
                            "Token '{}' has space-between endpoint '{}' ('{endpoint}') that is not a known position, anatomy term, or declared anatomy part on component '{}'",
                            t.name,
                            field,
                            component.unwrap_or("<none>")
                        ),
                        instance_path: Some(format!("/name/{field}")),
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

    use crate::graph::TokenGraph;
    use crate::validate::relational::diagnostics_for_rule;

    #[test]
    fn edge_to_generic_anatomy_no_error() {
        let g = TokenGraph::from_pairs(vec![(
            "accordion-top-to-text".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "space-between", "component": "accordion", "from": "top", "to": "text"}, "value": "8px"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-047").is_empty());
    }

    #[test]
    fn component_declared_anatomy_endpoint_no_error() {
        let mut g = TokenGraph::from_pairs(vec![(
            "accordion-bottom-to-handle".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "space-between", "component": "accordion", "from": "bottom", "to": "handle"}, "value": "8px"}),
        )]);
        g.components.push(crate::graph::ComponentRecord {
            name: "accordion".into(),
            file: PathBuf::from("accordion.json"),
            raw: json!({"name": "accordion", "anatomy": [{"name": "handle"}]}),
        });
        assert!(diagnostics_for_rule(&g, "SPEC-047").is_empty());
    }

    #[test]
    fn unknown_endpoint_errors() {
        let g = TokenGraph::from_pairs(vec![(
            "widget-top-to-banana".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "space-between", "from": "top", "to": "banana"}, "value": "8px"}),
        )]);
        let diags = diagnostics_for_rule(&g, "SPEC-047");
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, crate::report::Severity::Error);
        assert!(diags[0].message.contains("banana"));
    }

    #[test]
    fn missing_to_errors() {
        let g = TokenGraph::from_pairs(vec![(
            "widget-top".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "space-between", "from": "top"}, "value": "8px"}),
        )]);
        let diags = diagnostics_for_rule(&g, "SPEC-047");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("missing"));
    }

    #[test]
    fn from_without_space_between_property_errors() {
        let g = TokenGraph::from_pairs(vec![(
            "widget-color".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "background-color", "from": "top"}, "value": "#fff"}),
        )]);
        let diags = diagnostics_for_rule(&g, "SPEC-047");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("not 'space-between'"));
    }

    #[test]
    fn unrelated_token_no_error() {
        let g = TokenGraph::from_pairs(vec![(
            "button-background-color".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "background-color", "component": "button"}, "value": "#fff"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-047").is_empty());
    }
}
