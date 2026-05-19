// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-043: domain-required-fields
//!
//! Tokens in a known domain SHOULD include at least one domain-identifying field
//! in their name object so tooling can group, sort, and validate them correctly.
//!
//! Domain detection is based on the token's `$schema` URL suffix:
//! - Color tokens (color.json, color-set.json) SHOULD have `colorFamily` or `scaleIndex`.
//!   Either field alone satisfies the check intentionally — a token with only `scaleIndex`
//!   (ramp step without family context) is still sortable, and a token with only
//!   `colorFamily` (non-ramp token such as transparent-black) is also valid.
//! - Typography tokens (font-*.json, typography.json, multiplier.json) SHOULD have
//!   `family`, `weight`, `style`, `scaleIndex`, or `structure`. The last two cover
//!   typography-domain multiplier tokens (line-height ratios, margin multipliers)
//!   which are identified by scale position or typography-scale category rather than
//!   typeface attributes.
//! - Motion tokens (duration.json, easing.json, motion.json) SHOULD have
//!   `motionRole` or `easing`.
//!
//! This rule fires at advisory (Warning) severity so it does not block existing
//! tokens that have not yet been migrated to structured name objects.
//!
//! String-named tokens are skipped — SPEC-017 already tracks them as debt.
//! Tokens without a `$schema` are skipped — domain cannot be determined.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

/// Returns true when the name object satisfies the minimum field requirement for the domain.
fn has_required_fields(
    name_obj: &serde_json::Map<String, serde_json::Value>,
    domain: &str,
) -> bool {
    match domain {
        "color" => {
            name_obj.contains_key("colorFamily") || name_obj.contains_key("scaleIndex")
        }
        "typography" => {
            name_obj.contains_key("family")
                || name_obj.contains_key("weight")
                || name_obj.contains_key("style")
                || name_obj.contains_key("scaleIndex")
                || name_obj.contains_key("structure")
        }
        "motion" => {
            name_obj.contains_key("motionRole") || name_obj.contains_key("easing")
        }
        _ => true,
    }
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-043"
    }

    fn name(&self) -> &'static str {
        "domain-required-fields"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        for record in ctx.graph.tokens.values() {
            let schema_url = match record.schema_url.as_deref() {
                Some(s) if !s.is_empty() => s,
                _ => continue,
            };

            let Some(domain) = super::schema_domain(schema_url) else {
                continue;
            };

            let name_obj = match record.raw.get("name").and_then(|v| v.as_object()) {
                Some(n) => n,
                None => continue, // string-name or missing — skip
            };

            if !has_required_fields(name_obj, domain) {
                let required = required_fields_description(domain);
                out.push(Diagnostic {
                    file: record.file.clone(),
                    token: Some(record.name.clone()),
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Warning,
                    message: format!(
                        "{domain} token has a name object but no domain-identifying field \
                         — add at least one of: {required}"
                    ),
                    instance_path: Some("/name".to_string()),
                    schema_path: None,
                });
            }
        }

        out
    }
}

fn required_fields_description(domain: &str) -> &'static str {
    match domain {
        "color" => "colorFamily, scaleIndex",
        "typography" => "family, weight, style, scaleIndex, structure",
        "motion" => "motionRole, easing",
        _ => "(unknown)",
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::json;

    use crate::graph::TokenGraph;
    use crate::validate::relational::diagnostics_for_rule;

    fn make_token(schema: &str, name_val: serde_json::Value) -> TokenGraph {
        TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({ "$schema": schema, "name": name_val, "value": "#fff" }),
        )])
    }

    const COLOR_SCHEMA: &str =
        "https://example.com/schemas/token-types/color.json";
    const FONT_WEIGHT_SCHEMA: &str =
        "https://example.com/schemas/token-types/font-weight.json";
    const DURATION_SCHEMA: &str =
        "https://example.com/schemas/token-types/duration.json";
    const EASING_SCHEMA: &str =
        "https://example.com/schemas/token-types/easing.json";
    const DIMENSION_SCHEMA: &str =
        "https://example.com/schemas/token-types/dimension.json";

    #[test]
    fn color_with_color_family_no_warning() {
        let g = make_token(
            COLOR_SCHEMA,
            json!({ "property": "color", "colorFamily": "blue" }),
        );
        assert!(diagnostics_for_rule(&g, "SPEC-043").is_empty());
    }

    #[test]
    fn color_with_scale_index_no_warning() {
        let g = make_token(
            COLOR_SCHEMA,
            json!({ "property": "color", "scaleIndex": 100 }),
        );
        assert!(diagnostics_for_rule(&g, "SPEC-043").is_empty());
    }

    #[test]
    fn color_missing_domain_fields_warns() {
        let g = make_token(
            COLOR_SCHEMA,
            json!({ "property": "color", "state": "hover" }),
        );
        let diags = diagnostics_for_rule(&g, "SPEC-043");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("colorFamily"));
    }

    #[test]
    fn typography_with_family_no_warning() {
        let g = make_token(
            FONT_WEIGHT_SCHEMA,
            json!({ "property": "font-weight", "family": "sans-serif" }),
        );
        assert!(diagnostics_for_rule(&g, "SPEC-043").is_empty());
    }

    #[test]
    fn typography_with_weight_no_warning() {
        let g = make_token(
            FONT_WEIGHT_SCHEMA,
            json!({ "property": "font-weight", "weight": "bold" }),
        );
        assert!(diagnostics_for_rule(&g, "SPEC-043").is_empty());
    }

    #[test]
    fn typography_missing_domain_fields_warns() {
        let g = make_token(
            FONT_WEIGHT_SCHEMA,
            json!({ "property": "font-weight" }),
        );
        let diags = diagnostics_for_rule(&g, "SPEC-043");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("family"));
    }

    #[test]
    fn motion_with_motion_role_no_warning() {
        let g = make_token(
            DURATION_SCHEMA,
            json!({ "property": "duration", "motionRole": "enter" }),
        );
        assert!(diagnostics_for_rule(&g, "SPEC-043").is_empty());
    }

    #[test]
    fn motion_with_easing_no_warning() {
        let g = make_token(
            DURATION_SCHEMA,
            json!({ "property": "duration", "easing": "ease-out" }),
        );
        assert!(diagnostics_for_rule(&g, "SPEC-043").is_empty());
    }

    #[test]
    fn motion_missing_domain_fields_warns() {
        let g = make_token(
            DURATION_SCHEMA,
            json!({ "property": "duration" }),
        );
        let diags = diagnostics_for_rule(&g, "SPEC-043");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("motionRole"));
    }

    #[test]
    fn easing_schema_is_motion_domain() {
        // easing.json tokens are motion-domain; missing motionRole/easing should warn.
        let g = make_token(
            EASING_SCHEMA,
            json!({ "property": "easing" }),
        );
        let diags = diagnostics_for_rule(&g, "SPEC-043");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("motionRole"));
    }

    #[test]
    fn easing_schema_with_motion_role_no_warning() {
        let g = make_token(
            EASING_SCHEMA,
            json!({ "property": "easing", "motionRole": "enter" }),
        );
        assert!(diagnostics_for_rule(&g, "SPEC-043").is_empty());
    }

    #[test]
    fn typography_multiplier_with_scale_index_no_warning() {
        // multiplier.json is in the typography domain; scaleIndex satisfies the check.
        const MULTIPLIER_SCHEMA: &str =
            "https://example.com/schemas/token-types/multiplier.json";
        let g = make_token(
            MULTIPLIER_SCHEMA,
            json!({ "property": "line-height-multiplier", "scaleIndex": 100 }),
        );
        assert!(diagnostics_for_rule(&g, "SPEC-043").is_empty());
    }

    #[test]
    fn typography_multiplier_with_structure_no_warning() {
        const MULTIPLIER_SCHEMA: &str =
            "https://example.com/schemas/token-types/multiplier.json";
        let g = make_token(
            MULTIPLIER_SCHEMA,
            json!({ "structure": "body", "property": "margin" }),
        );
        assert!(diagnostics_for_rule(&g, "SPEC-043").is_empty());
    }

    #[test]
    fn typography_multiplier_missing_domain_fields_warns() {
        const MULTIPLIER_SCHEMA: &str =
            "https://example.com/schemas/token-types/multiplier.json";
        let g = make_token(
            MULTIPLIER_SCHEMA,
            json!({ "property": "some-multiplier" }),
        );
        let diags = diagnostics_for_rule(&g, "SPEC-043");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("family"));
    }

    #[test]
    fn unrecognized_schema_skipped() {
        // dimension.json is not a known domain — no SPEC-043 diagnostic.
        let g = make_token(
            DIMENSION_SCHEMA,
            json!({ "property": "width" }),
        );
        assert!(diagnostics_for_rule(&g, "SPEC-043").is_empty());
    }

    #[test]
    fn no_schema_url_skipped() {
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({ "name": { "property": "color" }, "value": "#fff" }),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-043").is_empty());
    }

    #[test]
    fn string_name_token_skipped() {
        let g = make_token(COLOR_SCHEMA, json!("blue-100"));
        assert!(diagnostics_for_rule(&g, "SPEC-043").is_empty());
    }
}
