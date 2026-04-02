// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-009: name-field-enum-sync
//!
//! Recognized name-object fields (component, state, variant, size, anatomy,
//! object, structure, substructure, orientation, position, density, shape)
//! SHOULD use values from the corresponding design-system-registry enums.
//!
//! This is a warning-only rule (advisory severity per spec/taxonomy.md).
//! Structural fields that are not enum-checked: `property` (free-form name),
//! dimension keys (`colorScheme`, `scale`, `contrast`) which are validated by
//! SPEC-005/SPEC-008 against dimension declarations.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

/// Name-object fields whose values are enum-validated against the registry.
/// Dimension keys (colorScheme, scale, contrast) are excluded — they are
/// covered by SPEC-005/SPEC-008. `property` is free-form and excluded.
const ENUM_CHECKED_FIELDS: &[&str] = &[
    "component",
    "state",
    "variant",
    "size",
    "anatomy",
    "object",
    "structure",
    "substructure",
    "orientation",
    "position",
    "density",
    "shape",
];

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-009"
    }

    fn name(&self) -> &'static str {
        "name-field-enum-sync"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut diags = Vec::new();

        for record in ctx.graph.tokens.values() {
            let name_obj = match record.raw.get("name").and_then(|v| v.as_object()) {
                Some(n) => n,
                None => continue,
            };

            for &field in ENUM_CHECKED_FIELDS {
                let value = match name_obj.get(field).and_then(|v| v.as_str()) {
                    Some(v) => v,
                    None => continue,
                };

                let registry_set = match ctx.registry.for_field(field) {
                    Some(s) => s,
                    None => continue,
                };

                if !registry_set.contains(value) {
                    diags.push(Diagnostic {
                        file: record.file.clone(),
                        token: Some(record.name.clone()),
                        rule_id: Some("SPEC-009".into()),
                        severity: Severity::Warning,
                        message: format!(
                            "name.{field} value \"{value}\" is not in the design-system-registry \
                             {field} vocabulary"
                        ),
                        instance_path: Some(format!("/name/{field}")),
                        schema_path: None,
                    });
                }
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
    fn valid_component_no_warning() {
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color", "component": "button"}, "value": "#fff"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-009").is_empty());
    }

    #[test]
    fn unknown_component_warns() {
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color", "component": "nonexistent-widget"}, "value": "#fff"}),
        )]);
        let diags = diagnostics_for_rule(&g, "SPEC-009");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("nonexistent-widget"));
        assert!(diags[0].message.contains("component"));
    }

    #[test]
    fn valid_state_no_warning() {
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color", "state": "hover"}, "value": "#fff"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-009").is_empty());
    }

    #[test]
    fn valid_object_no_warning() {
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color", "object": "background"}, "value": "#fff"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-009").is_empty());
    }

    #[test]
    fn anatomy_background_warns_after_split() {
        // "background" was moved from anatomy to token-objects — using it as
        // anatomy should produce a warning.
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color", "anatomy": "background"}, "value": "#fff"}),
        )]);
        let diags = diagnostics_for_rule(&g, "SPEC-009");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("anatomy"));
    }

    #[test]
    fn no_enum_fields_no_warning() {
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color"}, "value": "#fff"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-009").is_empty());
    }

    #[test]
    fn property_field_not_checked() {
        // "property" is free-form — any value is allowed.
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "some-custom-css-thing"}, "value": "10px"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-009").is_empty());
    }

    #[test]
    fn dimension_fields_not_checked() {
        // colorScheme, scale, contrast are validated by SPEC-005/008, not here.
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color", "colorScheme": "nonexistent"}, "value": "#fff"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-009").is_empty());
    }

    #[test]
    fn multiple_unknown_fields_multiple_warnings() {
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color", "component": "nope", "state": "nah"}, "value": "#fff"}),
        )]);
        let diags = diagnostics_for_rule(&g, "SPEC-009");
        assert_eq!(diags.len(), 2);
    }
}
