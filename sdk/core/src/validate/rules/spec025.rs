// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-025: anatomy-requires-component
//!
//! A token name object MUST NOT include an `anatomy` field unless a `component`
//! or `structure` field is also present, or the `anatomy` value is a registry
//! term flagged `standaloneScope: true` (see `registry/anatomy-terms.json`).
//! Anatomy parts are scoped to a component or structure; a truly standalone
//! anatomy reference has no semantic meaning, except for the handful of
//! cross-cutting parts (e.g. `focus-ring`, `focus-indicator`) that have no
//! single owning component and are explicitly allowed to stand alone.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-025"
    }

    fn name(&self) -> &'static str {
        "anatomy-requires-component"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut diags = Vec::new();

        for record in ctx.graph.tokens.values() {
            let name_obj = match record.raw.get("name").and_then(|v| v.as_object()) {
                Some(n) => n,
                None => continue,
            };

            let Some(anatomy) = name_obj.get("anatomy").and_then(|v| v.as_str()) else {
                continue;
            };
            if name_obj.contains_key("component") || name_obj.contains_key("structure") {
                continue;
            }
            if ctx
                .registry
                .anatomy_standalone_scope_terms()
                .contains(anatomy)
            {
                continue;
            }

            diags.push(Diagnostic {
                file: record.file.clone(),
                token: Some(record.name.clone()),
                rule_id: Some("SPEC-025".into()),
                severity: Severity::Error,
                message: format!(
                    "Token '{}' has 'anatomy' field without a 'component' or 'structure' \
                     field, and '{anatomy}' is not a registry term flagged standaloneScope",
                    record.name
                ),
                instance_path: Some("/name/anatomy".into()),
                schema_path: None,
            });
        }

        diags
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::json;

    use crate::graph::TokenGraph;
    use crate::validate::relational::diagnostics_for_rule;

    #[test]
    fn anatomy_with_component_is_valid() {
        let g = TokenGraph::from_pairs(vec![(
            "button-label-color".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color", "component": "button", "anatomy": "label"}, "value": "#fff"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-025").is_empty());
    }

    #[test]
    fn anatomy_without_component_errors() {
        let g = TokenGraph::from_pairs(vec![(
            "label-color".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color", "anatomy": "label"}, "value": "#fff"}),
        )]);
        let diags = diagnostics_for_rule(&g, "SPEC-025");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("anatomy"));
        assert!(diags[0].message.contains("component"));
    }

    #[test]
    fn anatomy_with_structure_is_valid() {
        let g = TokenGraph::from_pairs(vec![(
            "accessory-item-padding-small".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "padding", "structure": "accessory", "anatomy": "item", "size": "small"}, "value": "4px"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-025").is_empty());
    }

    #[test]
    fn standalone_scope_registry_term_is_valid() {
        let g = TokenGraph::from_pairs(vec![(
            "focus-ring-gap".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "gap", "anatomy": "focus-ring"}, "value": "2px"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-025").is_empty());
    }

    #[test]
    fn non_standalone_scope_term_without_owner_still_errors() {
        let g = TokenGraph::from_pairs(vec![(
            "item-color".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color", "anatomy": "item"}, "value": "#fff"}),
        )]);
        let diags = diagnostics_for_rule(&g, "SPEC-025");
        assert_eq!(diags.len(), 1);
    }

    #[test]
    fn no_anatomy_no_error() {
        let g = TokenGraph::from_pairs(vec![(
            "background-color-default".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "background-color"}, "value": "#fff"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-025").is_empty());
    }

    #[test]
    fn string_name_skipped() {
        let g = TokenGraph::from_pairs(vec![(
            "my-token".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": "my-token", "value": "#fff"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-025").is_empty());
    }
}
