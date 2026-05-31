// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-035: anatomy-part-name-registry-sync
//!
//! A component anatomy part's `name` SHOULD reference an id from the anatomy-terms
//! registry in `@adobe/design-system-registry` (anatomy-terms.json). Unknown values
//! are reported as warnings; the registry is the authoritative vocabulary.
//!
//! This mirrors SPEC-034 (component-category-registry-sync) for the anatomy array,
//! and complements SPEC-023 (anatomy-custom-part-documented) which only warns when
//! a non-canonical name lacks a description. SPEC-035 fires regardless of whether
//! a description is present, pointing authors directly at the registry vocabulary.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-035"
    }

    fn name(&self) -> &'static str {
        "anatomy-part-name-registry-sync"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut diags = Vec::new();
        let Some(anatomy_vocab) = ctx.registry.for_field("anatomy") else {
            return diags;
        };

        for comp in &ctx.graph.components {
            let Some(anatomy) = comp.raw.get("anatomy").and_then(|v| v.as_array()) else {
                continue;
            };
            for (idx, part) in anatomy.iter().enumerate() {
                let Some(name) = part.get("name").and_then(|v| v.as_str()) else {
                    continue;
                };
                if !anatomy_vocab.contains(name) {
                    diags.push(Diagnostic {
                        file: comp.file.clone(),
                        token: None,
                        rule_id: Some("SPEC-035".into()),
                        severity: Severity::Warning,
                        message: format!(
                            "Component '{}' anatomy part name \"{}\" is not in the \
                             design-system-registry anatomy-terms vocabulary",
                            comp.name, name
                        ),
                        instance_path: Some(format!("/anatomy/{idx}/name")),
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

    use crate::graph::{ComponentRecord, TokenGraph};
    use crate::validate::relational::diagnostics_for_rule;

    fn graph_with_anatomy(name: &str, parts: serde_json::Value) -> TokenGraph {
        let mut g = TokenGraph::default();
        g.components.push(ComponentRecord {
            name: name.to_string(),
            file: PathBuf::from(format!("{name}.json")),
            raw: json!({
                "name": name,
                "anatomy": parts,
                "meta": { "documentationUrl": "https://example.com" }
            }),
        });
        g
    }

    fn graph_without_anatomy(name: &str) -> TokenGraph {
        let mut g = TokenGraph::default();
        g.components.push(ComponentRecord {
            name: name.to_string(),
            file: PathBuf::from(format!("{name}.json")),
            raw: json!({
                "name": name,
                "meta": { "documentationUrl": "https://example.com" }
            }),
        });
        g
    }

    #[test]
    fn valid_canonical_name_no_warning() {
        let g = graph_with_anatomy("button", json!([{"name": "label"}, {"name": "icon"}]));
        assert!(diagnostics_for_rule(&g, "SPEC-035").is_empty());
    }

    #[test]
    fn valid_kebab_name_no_warning() {
        // close-button and body-area are kebab-case ids present in anatomy-terms.json
        let g = graph_with_anatomy(
            "dialog",
            json!([{"name": "close-button"}, {"name": "body-area"}]),
        );
        assert!(diagnostics_for_rule(&g, "SPEC-035").is_empty());
    }

    #[test]
    fn unknown_name_warns() {
        let g = graph_with_anatomy(
            "widget",
            json!([{"name": "wibble", "description": "Custom."}]),
        );
        let diags = diagnostics_for_rule(&g, "SPEC-035");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("wibble"));
        assert!(diags[0].message.contains("widget"));
    }

    #[test]
    fn unknown_name_instance_path_is_indexed() {
        // second element is unknown — instance_path must reflect index 1
        let g = graph_with_anatomy(
            "widget",
            json!([{"name": "label"}, {"name": "wibble", "description": "Custom."}]),
        );
        let diags = diagnostics_for_rule(&g, "SPEC-035");
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].instance_path.as_deref(), Some("/anatomy/1/name"));
    }

    #[test]
    fn missing_anatomy_array_no_warning() {
        let g = graph_without_anatomy("widget");
        assert!(diagnostics_for_rule(&g, "SPEC-035").is_empty());
    }

    #[test]
    fn empty_anatomy_array_no_warning() {
        let g = graph_with_anatomy("widget", json!([]));
        assert!(diagnostics_for_rule(&g, "SPEC-035").is_empty());
    }

    #[test]
    fn multiple_parts_one_unknown_warns_once() {
        let g = graph_with_anatomy(
            "widget",
            json!([{"name": "body"}, {"name": "wibble", "description": "Custom part."}]),
        );
        let diags = diagnostics_for_rule(&g, "SPEC-035");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("wibble"));
    }

    #[test]
    fn empty_string_name_warns() {
        // empty string is not in the registry
        let g = graph_with_anatomy("widget", json!([{"name": ""}]));
        let diags = diagnostics_for_rule(&g, "SPEC-035");
        assert_eq!(diags.len(), 1);
    }

    #[test]
    fn all_canonical_anatomy_pass() {
        for part in &[
            "body",
            "checkmark",
            "disclosure-triangle",
            "field",
            "handle",
            "header",
            "icon",
            "label",
            "picker",
            "progress-bar",
            "swatch",
            "thumbnail",
            "track",
            "value",
        ] {
            let g = graph_with_anatomy("comp", json!([{"name": part}]));
            assert!(
                diagnostics_for_rule(&g, "SPEC-035").is_empty(),
                "canonical anatomy part '{part}' should not warn"
            );
        }
    }
}
