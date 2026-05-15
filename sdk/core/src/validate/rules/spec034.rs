// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-034: component-category-registry-sync
//!
//! A component's `meta.category` SHOULD reference an id from the categories
//! registry in `@adobe/design-system-registry` (categories.json). Unknown
//! values are reported as warnings; the registry is the authoritative vocabulary.
//!
//! This mirrors SPEC-009 (name-field-enum-sync) for name-object fields, but
//! applies to the `meta.category` field on component declarations instead.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-034"
    }

    fn name(&self) -> &'static str {
        "component-category-registry-sync"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut diags = Vec::new();
        let categories = ctx.registry.categories();

        for comp in &ctx.graph.components {
            let value = match comp
                .raw
                .get("meta")
                .and_then(|m| m.get("category"))
                .and_then(|v| v.as_str())
            {
                Some(v) => v,
                None => continue,
            };

            if !categories.contains(value) {
                diags.push(Diagnostic {
                    file: comp.file.clone(),
                    token: None,
                    rule_id: Some("SPEC-034".into()),
                    severity: Severity::Warning,
                    message: format!(
                        "Component '{}' meta.category value \"{}\" is not in the \
                         design-system-registry categories vocabulary",
                        comp.name, value
                    ),
                    instance_path: Some("/meta/category".into()),
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

    use crate::graph::{ComponentRecord, TokenGraph};
    use crate::validate::relational::diagnostics_for_rule;

    fn graph_with_category(name: &str, category: &str) -> TokenGraph {
        let mut g = TokenGraph::default();
        g.components.push(ComponentRecord {
            name: name.to_string(),
            file: PathBuf::from(format!("{name}.json")),
            raw: json!({
                "name": name,
                "meta": { "category": category, "documentationUrl": "https://example.com" }
            }),
        });
        g
    }

    fn graph_without_category(name: &str) -> TokenGraph {
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
    fn valid_category_no_warning() {
        let g = graph_with_category("button", "actions");
        assert!(diagnostics_for_rule(&g, "SPEC-034").is_empty());
    }

    #[test]
    fn valid_kebab_category_no_warning() {
        let g = graph_with_category("table", "data-visualization");
        assert!(diagnostics_for_rule(&g, "SPEC-034").is_empty());
    }

    #[test]
    fn unknown_category_warns() {
        let g = graph_with_category("widget", "not-a-real-category");
        let diags = diagnostics_for_rule(&g, "SPEC-034");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("not-a-real-category"));
        assert!(diags[0].message.contains("widget"));
    }

    #[test]
    fn old_spaced_form_warns_after_alias_removal() {
        // "data visualization" (space form) is no longer a valid alias — must warn.
        let g = graph_with_category("table", "data visualization");
        let diags = diagnostics_for_rule(&g, "SPEC-034");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("data visualization"));
    }

    #[test]
    fn missing_meta_no_warning() {
        let mut g = TokenGraph::default();
        g.components.push(ComponentRecord {
            name: "widget".to_string(),
            file: PathBuf::from("widget.json"),
            raw: json!({ "name": "widget" }),
        });
        assert!(diagnostics_for_rule(&g, "SPEC-034").is_empty());
    }

    #[test]
    fn missing_category_in_meta_no_warning() {
        let g = graph_without_category("widget");
        assert!(diagnostics_for_rule(&g, "SPEC-034").is_empty());
    }

    #[test]
    fn empty_string_category_warns() {
        // schema minLength:1 doesn't apply at the SDK layer; empty string is not
        // in the registry, so SPEC-034 fires a warning rather than silently passing.
        let g = graph_with_category("widget", "");
        let diags = diagnostics_for_rule(&g, "SPEC-034");
        assert_eq!(diags.len(), 1);
    }

    #[test]
    fn all_canonical_categories_pass() {
        for cat in &[
            "actions",
            "containers",
            "data-visualization",
            "feedback",
            "inputs",
            "navigation",
            "status",
            "typography",
        ] {
            let g = graph_with_category("comp", cat);
            assert!(
                diagnostics_for_rule(&g, "SPEC-034").is_empty(),
                "canonical category '{cat}' should not warn"
            );
        }
    }
}
