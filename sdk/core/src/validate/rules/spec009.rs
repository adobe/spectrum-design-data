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
//! Semantic name-object fields with a backing registry vocabulary SHOULD use
//! values from that registry. The set of checked fields is derived from the
//! field catalog (`packages/design-data/fields/`) — fields with
//! `validation: "advisory"` and a non-null registry are checked here.
//!
//! This is a warning-only rule. `property` is included (advisory registry added
//! in #941) and checked here like any other advisory field. Fields excluded from
//! this check:
//! - `colorScheme`, `scale`, `contrast` — mode-set fields, validated by SPEC-005/SPEC-008
//!
//! Per Proposal 006, array-valued fields (`interaction`, `interaction-context`) hold
//! an ordered array of atomic state ids (e.g. `["hover"]`) rather than a single
//! string — each element is checked against the registry independently. Detected
//! via the field catalog's `value_type`, not a hardcoded field name.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

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
        let catalog = crate::registry::FieldCatalog::embedded();

        for record in ctx.graph.tokens.values() {
            let name_obj = match record.raw.get("name").and_then(|v| v.as_object()) {
                Some(n) => n,
                None => continue,
            };

            for &field in ctx.registry.advisory_fields() {
                let registry_set = match ctx.registry.for_field(field) {
                    Some(s) => s,
                    None => continue,
                };

                // Array-valued fields (Proposal 006, e.g. `interaction`,
                // `interaction-context`) hold an ordered array of atomic ids; every
                // other advisory field is a single string. Detected via the field
                // catalog's `value_type` so this stays correct if the array-valued
                // field set changes again.
                let is_array = catalog.get(field).is_some_and(|e| e.value_type == "array");
                let values: Vec<&str> = if is_array {
                    match name_obj.get(field).and_then(|v| v.as_array()) {
                        Some(arr) => arr.iter().filter_map(|v| v.as_str()).collect(),
                        None => continue,
                    }
                } else {
                    match name_obj.get(field).and_then(|v| v.as_str()) {
                        Some(v) => vec![v],
                        None => continue,
                    }
                };

                for value in values {
                    if registry_set.contains(value) {
                        continue;
                    }

                    diags.push(Diagnostic {
                        file: record.file.clone(),
                        token: Some(record.name.clone()),
                        rule_id: Some("SPEC-009".into()),
                        severity: Severity::Warning,
                        message: format!(
                            "name.{field} value \"{value}\" is not in the spectrum-design-data \
                             registry/{field} vocabulary"
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
            json!({"name": {"property": "color", "interaction": ["hover"]}, "value": "#fff"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-009").is_empty());
    }

    #[test]
    fn valid_attribute_no_warning() {
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color", "attribute": "background"}, "value": "#fff"}),
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
    fn property_unknown_value_warns() {
        // "property" now has an advisory registry; unknown values trigger SPEC-009.
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "some-custom-css-thing"}, "value": "10px"}),
        )]);
        assert!(!diagnostics_for_rule(&g, "SPEC-009").is_empty());
    }

    #[test]
    fn property_known_value_no_warning() {
        // Values in property-terms.json must not produce a SPEC-009 warning.
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color"}, "value": "#fff"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-009").is_empty());
    }

    #[test]
    fn mode_set_fields_not_checked() {
        // colorScheme, scale, contrast are validated by SPEC-005/008, not here.
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color", "colorScheme": "nonexistent"}, "value": "#fff"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-009").is_empty());
    }

    #[test]
    fn compound_state_of_known_segments_no_warning() {
        // Interaction-context and interaction are now two separate array fields;
        // the "compound state" split across them, rather than into one array.
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color", "interaction-context": ["selected"], "interaction": ["hover"]}, "value": "#fff"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-009").is_empty());
    }

    #[test]
    fn compound_state_with_hyphenated_segment_no_warning() {
        // "focus" absorbed the former "key-focus"/"keyboard-focus" alias and is
        // itself a single registry value.
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color", "interaction-context": ["selected"], "interaction": ["focus"]}, "value": "#fff"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-009").is_empty());
    }

    #[test]
    fn compound_state_with_down_no_warning() {
        // "down" is the canonical transient pressed-state term in the current registry.
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color", "interaction-context": ["selected"], "interaction": ["down"]}, "value": "#fff"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-009").is_empty());
    }

    #[test]
    fn compound_state_with_unknown_segment_warns() {
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color", "interaction-context": ["selected"], "interaction": ["nonexistent"]}, "value": "#fff"}),
        )]);
        let diags = diagnostics_for_rule(&g, "SPEC-009");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("nonexistent"));
    }

    #[test]
    fn multiple_unknown_fields_multiple_warnings() {
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color", "component": "nope", "interaction": ["nah"]}, "value": "#fff"}),
        )]);
        let diags = diagnostics_for_rule(&g, "SPEC-009");
        assert_eq!(diags.len(), 2);
    }
}
