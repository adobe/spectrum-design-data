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
//!
//! A compound endpoint (e.g. `content-area-bottom`, `top-text`) that doesn't
//! match the flat union directly is retried once by stripping a registered
//! position as a hyphen-bounded prefix or suffix and validating the remainder
//! against the anatomy union. This covers gap endpoints that fuse an anatomy
//! part with a row/edge scope without requiring a third name-object field —
//! `from`/`to` still store the full compound string for legacy-key round-trip.

use std::collections::HashSet;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

/// True if `endpoint` matches a position, a generic anatomy term, a declared
/// anatomy part, or — failing that — is a registered position glued to one of
/// those via a single hyphen-bounded prefix/suffix strip.
fn endpoint_resolves(
    endpoint: &str,
    position_vocab: Option<&HashSet<String>>,
    anatomy_vocab: Option<&HashSet<String>>,
    declared_parts: &HashSet<&str>,
) -> bool {
    let is_anatomy =
        |s: &str| anatomy_vocab.is_some_and(|v| v.contains(s)) || declared_parts.contains(s);
    let is_position = |s: &str| position_vocab.is_some_and(|v| v.contains(s));

    if is_position(endpoint) || is_anatomy(endpoint) {
        return true;
    }

    let positions = match position_vocab {
        Some(v) => v,
        None => return false,
    };
    positions.iter().any(|pos| {
        endpoint
            .strip_prefix(pos.as_str())
            .and_then(|rest| rest.strip_prefix('-'))
            .is_some_and(is_anatomy)
            || endpoint
                .strip_suffix(pos.as_str())
                .and_then(|rest| rest.strip_suffix('-'))
                .is_some_and(is_anatomy)
    })
}

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
                let valid =
                    endpoint_resolves(endpoint, position_vocab, anatomy_vocab, &declared_parts);

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
    fn triage_04c3_registry_additions_resolve() {
        // Regression check for the 04c.3 registry work (docs/proposals/012-
        // space-between-decompose.md): a representative endpoint from each
        // escalation bucket, using the real component-declared anatomy[]
        // shape, must resolve with zero SPEC-047 diagnostics once the
        // matching from/to fields are populated (04c.6). Catches accidental
        // reverts of the anatomy-terms.json / positions.json additions or
        // the position-affix split logic.
        // (from, to, component, declared-anatomy-owner-and-parts)
        type Case<'a> = (&'a str, &'a str, &'a str, Option<(&'a str, &'a [&'a str])>);
        let cases: &[Case] = &[
            // Bucket 1: generic anatomy/position vocabulary.
            ("action", "navigation", "stack-item", None),
            ("edge", "content", "card", None),
            ("counter", "disclosure", "side-navigation", None),
            // Bucket 2: component-declared multi-word parts.
            (
                "label",
                "action-group-area",
                "action-bar",
                Some(("action-bar", &["action-group-area"])),
            ),
            (
                "edge",
                "clear-icon",
                "tag",
                Some(("tag", &["clear-icon", "cross-icon"])),
            ),
            // Bucket 3: compound anatomy+position, resolved via split.
            ("content-area-bottom", "content", "accordion", None),
            (
                "column-header-row-bottom",
                "text",
                "table",
                Some(("table", &["column-header-row", "row"])),
            ),
            ("item-top", "disclosure-icon", "menu", None),
            ("top-text", "bottom-text", "breadcrumbs", None),
        ];

        for (from, to, component, declared) in cases {
            let mut g = TokenGraph::from_pairs(vec![(
                format!("{component}-{from}-to-{to}"),
                PathBuf::from("a.tokens.json"),
                json!({"name": {"property": "space-between", "component": component, "from": from, "to": to}, "value": "8px"}),
            )]);
            if let Some((owner, parts)) = declared {
                g.components.push(crate::graph::ComponentRecord {
                    name: (*owner).into(),
                    file: PathBuf::from(format!("{owner}.json")),
                    raw: json!({"name": owner, "anatomy": parts.iter().map(|p| json!({"name": p})).collect::<Vec<_>>()}),
                });
            }
            let diags = diagnostics_for_rule(&g, "SPEC-047");
            assert!(
                diags.is_empty(),
                "expected '{from}'-to-'{to}' on {component} to resolve, got: {diags:?}"
            );
        }
    }

    #[test]
    fn compound_position_suffix_resolves_via_declared_anatomy() {
        // "content-area-bottom" isn't itself registered, but strips the
        // registered position suffix "bottom" down to the declared anatomy
        // part "content-area" — mirrors real tokens like
        // `content-area-bottom-to-content` (accordion).
        let mut g = TokenGraph::from_pairs(vec![(
            "accordion-content-area-bottom-to-text".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "space-between", "component": "accordion", "from": "content-area-bottom", "to": "text"}, "value": "8px"}),
        )]);
        g.components.push(crate::graph::ComponentRecord {
            name: "accordion".into(),
            file: PathBuf::from("accordion.json"),
            raw: json!({"name": "accordion", "anatomy": [{"name": "content-area"}]}),
        });
        assert!(diagnostics_for_rule(&g, "SPEC-047").is_empty());
    }

    #[test]
    fn compound_position_prefix_resolves_via_generic_anatomy() {
        // "top-text" strips the registered position prefix "top" down to the
        // generic anatomy term "text" — mirrors real tokens like
        // `top-text-to-bottom-text` (breadcrumbs).
        let g = TokenGraph::from_pairs(vec![(
            "breadcrumbs-top-text-to-text".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "space-between", "from": "top-text", "to": "text"}, "value": "8px"}),
        )]);
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
