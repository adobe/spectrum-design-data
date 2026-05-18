// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-042: field-scope-violation
//!
//! When a name object contains a domain-scoped field (e.g. `colorFamily`,
//! `weight`, `motionRole`), the token's `$schema` MUST indicate a compatible
//! token type. Using a color-scoped field on a font-weight token, or a
//! typography-scoped field on a color token, is a taxonomy violation.
//!
//! The authoritative field→scope mapping is the field catalog under
//! `packages/design-data-spec/fields/` (the `scope` property on each field JSON).
//! The domain→schema-suffix mapping is shared with SPEC-043 via `super::DOMAIN_SCHEMAS`.
//!
//! Current token corpus has no name objects, so this rule fires zero diagnostics
//! today. It is forward-looking for when tokens migrate to structured name objects.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

/// Returns the domain name for a domain-scoped field, or `None` for universal fields.
/// Authoritative source: `packages/design-data-spec/fields/*.json` `scope` property.
fn field_domain(field: &str) -> Option<&'static str> {
    match field {
        "colorFamily" => Some("color"),
        "family" | "weight" | "style" => Some("typography"),
        "motionRole" | "easing" => Some("motion"),
        _ => None,
    }
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-042"
    }

    fn name(&self) -> &'static str {
        "field-scope-violation"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        for record in ctx.graph.tokens.values() {
            let name_obj = match record.raw.get("name").and_then(|v| v.as_object()) {
                Some(n) => n,
                None => continue,
            };

            let schema_url = record.schema_url.as_deref().unwrap_or("");
            // No schema URL means we cannot determine the token's domain;
            // skip to avoid false positives on alias tokens or test fixtures.
            if schema_url.is_empty() {
                continue;
            }

            for (field, _value) in name_obj {
                let Some(scope) = field_domain(field) else {
                    continue;
                };

                let is_compatible = super::DOMAIN_SCHEMAS
                    .iter()
                    .find(|(domain, _)| *domain == scope)
                    .is_some_and(|(_, suffixes)| {
                        suffixes.iter().any(|s| schema_url.ends_with(s))
                    });

                if !is_compatible {
                    out.push(Diagnostic {
                        file: record.file.clone(),
                        token: Some(record.name.clone()),
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Warning,
                        message: format!(
                            "name.{field} is a {scope}-scoped field but token schema \
                             '{schema_url}' is not a {scope} token type"
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

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::json;

    use crate::graph::TokenGraph;
    use crate::validate::relational::diagnostics_for_rule;

    fn make_token(schema: &str, name_obj: serde_json::Value) -> TokenGraph {
        TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({ "$schema": schema, "name": name_obj, "value": "#fff" }),
        )])
    }

    #[test]
    fn color_family_on_color_token_no_warning() {
        let g = make_token(
            "https://example.com/schemas/token-types/color.json",
            json!({ "property": "color", "colorFamily": "blue" }),
        );
        assert!(diagnostics_for_rule(&g, "SPEC-042").is_empty());
    }

    #[test]
    fn color_family_on_color_set_no_warning() {
        let g = make_token(
            "https://example.com/schemas/token-types/color-set.json",
            json!({ "property": "color", "colorFamily": "gray" }),
        );
        assert!(diagnostics_for_rule(&g, "SPEC-042").is_empty());
    }

    #[test]
    fn color_family_on_font_weight_warns() {
        let g = make_token(
            "https://example.com/schemas/token-types/font-weight.json",
            json!({ "property": "font-weight", "colorFamily": "blue" }),
        );
        let diags = diagnostics_for_rule(&g, "SPEC-042");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("colorFamily"));
        assert!(diags[0].message.contains("color-scoped"));
    }

    #[test]
    fn weight_on_font_weight_token_no_warning() {
        let g = make_token(
            "https://example.com/schemas/token-types/font-weight.json",
            json!({ "property": "font-weight", "weight": "bold" }),
        );
        assert!(diagnostics_for_rule(&g, "SPEC-042").is_empty());
    }

    #[test]
    fn weight_on_color_token_warns() {
        let g = make_token(
            "https://example.com/schemas/token-types/color.json",
            json!({ "property": "color", "weight": "bold" }),
        );
        let diags = diagnostics_for_rule(&g, "SPEC-042");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("weight"));
        assert!(diags[0].message.contains("typography-scoped"));
    }

    #[test]
    fn motion_role_on_motion_token_no_warning() {
        let g = make_token(
            "https://example.com/schemas/token-types/duration.json",
            json!({ "property": "duration", "motionRole": "enter" }),
        );
        assert!(diagnostics_for_rule(&g, "SPEC-042").is_empty());
    }

    #[test]
    fn motion_role_on_color_token_warns() {
        let g = make_token(
            "https://example.com/schemas/token-types/color.json",
            json!({ "property": "color", "motionRole": "enter" }),
        );
        let diags = diagnostics_for_rule(&g, "SPEC-042");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("motionRole"));
        assert!(diags[0].message.contains("motion-scoped"));
    }

    #[test]
    fn no_schema_url_skipped() {
        // Tokens without $schema cannot be domain-typed — skip to avoid false positives.
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({ "name": { "property": "color", "colorFamily": "blue" }, "value": "#fff" }),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-042").is_empty());
    }

    #[test]
    fn string_name_token_skipped() {
        // String-named tokens have no name object — rule is a no-op for them.
        let g = make_token(
            "https://example.com/schemas/token-types/color.json",
            json!("blue-100"),
        );
        assert!(diagnostics_for_rule(&g, "SPEC-042").is_empty());
    }

    #[test]
    fn universal_fields_not_checked() {
        // property, component, state etc. are unscoped — never flagged by SPEC-042.
        let g = make_token(
            "https://example.com/schemas/token-types/font-weight.json",
            json!({ "property": "font-weight", "state": "hover" }),
        );
        assert!(diagnostics_for_rule(&g, "SPEC-042").is_empty());
    }
}
