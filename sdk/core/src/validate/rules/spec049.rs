// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-049: anatomy-in-registry
//!
//! A token name object's `anatomy` field, when there is no `component` to validate
//! it against a declared anatomy part (SPEC-020 covers that case), MUST reference a
//! known id in the `anatomy-terms.json` registry. This is the backstop for the two
//! cases SPEC-025 allows anatomy without a component: `structure`-scoped anatomy
//! (e.g. `structure: "accessory"`, `anatomy: "item"`) and registry terms flagged
//! `standaloneScope: true` (e.g. `focus-ring`, `focus-indicator`). Without this rule,
//! either case would leave the `anatomy` value completely unvalidated.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-049"
    }

    fn name(&self) -> &'static str {
        "anatomy-in-registry"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut diags = Vec::new();
        let Some(anatomy_vocab) = ctx.registry.for_field("anatomy") else {
            return diags;
        };

        for record in ctx.graph.tokens.values() {
            let Some(name_obj) = record.raw.get("name").and_then(|v| v.as_object()) else {
                continue;
            };
            if name_obj.contains_key("component") {
                continue; // SPEC-020 validates component-scoped anatomy
            }
            let Some(anatomy) = name_obj.get("anatomy").and_then(|v| v.as_str()) else {
                continue;
            };

            if !anatomy_vocab.contains(anatomy) {
                diags.push(Diagnostic {
                    file: record.file.clone(),
                    token: Some(record.name.clone()),
                    rule_id: Some("SPEC-049".into()),
                    severity: Severity::Error,
                    message: format!(
                        "Token '{}' references anatomy part '{anatomy}' which is not in the \
                         spectrum-design-data registry/anatomy-terms vocabulary",
                        record.name
                    ),
                    instance_path: Some("/name/anatomy".into()),
                    schema_path: None,
                });
            }
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
    fn structure_scoped_known_anatomy_is_valid() {
        let g = TokenGraph::from_pairs(vec![(
            "accessory-item-padding-small".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "padding", "structure": "accessory", "anatomy": "item", "size": "small"}, "value": "4px"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-049").is_empty());
    }

    #[test]
    fn standalone_known_anatomy_is_valid() {
        let g = TokenGraph::from_pairs(vec![(
            "focus-ring-gap".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "gap", "anatomy": "focus-ring"}, "value": "2px"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-049").is_empty());
    }

    #[test]
    fn unknown_anatomy_without_component_errors() {
        let g = TokenGraph::from_pairs(vec![(
            "wibble-gap".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "gap", "structure": "accessory", "anatomy": "wibble"}, "value": "2px"}),
        )]);
        let diags = diagnostics_for_rule(&g, "SPEC-049");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("wibble"));
    }

    #[test]
    fn component_scoped_anatomy_skipped_defers_to_spec020() {
        // Even an unknown anatomy value is not flagged here when a component is
        // present — SPEC-020 owns that validation against the component's declared parts.
        let g = TokenGraph::from_pairs(vec![(
            "button-wibble-color".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color", "component": "button", "anatomy": "wibble"}, "value": "#fff"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-049").is_empty());
    }

    #[test]
    fn no_anatomy_no_error() {
        let g = TokenGraph::from_pairs(vec![(
            "background-color-default".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "background-color"}, "value": "#fff"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-049").is_empty());
    }

    #[test]
    fn string_name_skipped() {
        let g = TokenGraph::from_pairs(vec![(
            "my-token".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": "my-token", "value": "#fff"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-049").is_empty());
    }
}
