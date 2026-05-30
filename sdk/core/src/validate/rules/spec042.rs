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
//! **Alias-target resolution**: for tokens whose `$schema` is `alias.json`, the
//! rule follows the `alias_target` chain to find the terminal non-alias schema and
//! checks that schema against the domain. This lets a color alias carry `colorFamily`
//! when its target is a color-domain token. Broken alias chains fall through to the
//! alias's own schema (already a no-op since alias.json is not in any DOMAIN_SCHEMAS);
//! SPEC-001 owns the broken-alias diagnostic.

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

            // For alias tokens, resolve to the terminal schema so that a color alias
            // carrying colorFamily is valid when its target is a color-domain schema.
            let effective_schema = if schema_url.ends_with("/alias.json") {
                let mut cursor = record.alias_target.as_deref();
                let mut resolved = schema_url;
                let mut hops = 0u8;
                while let Some(target_name) = cursor {
                    if hops >= 8 {
                        break; // depth guard; SPEC-003 enforces no true cycles
                    }
                    let Some(target) = ctx.graph.tokens.get(target_name) else {
                        break; // broken alias — SPEC-001 owns this diagnostic
                    };
                    resolved = target.schema_url.as_deref().unwrap_or("<missing schema>");
                    if !resolved.ends_with("/alias.json") {
                        break;
                    }
                    cursor = target.alias_target.as_deref();
                    hops += 1;
                }
                resolved
            } else {
                schema_url
            };

            for (field, _value) in name_obj {
                let Some(scope) = field_domain(field) else {
                    continue;
                };

                let is_compatible = super::DOMAIN_SCHEMAS
                    .iter()
                    .find(|(domain, _)| *domain == scope)
                    .is_some_and(|(_, suffixes)| {
                        suffixes.iter().any(|s| effective_schema.ends_with(s))
                    });

                if !is_compatible {
                    out.push(Diagnostic {
                        file: record.file.clone(),
                        token: Some(record.name.clone()),
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Warning,
                        message: format!(
                            "name.{field} is a {scope}-scoped field but token schema \
                             '{effective_schema}' is not a {scope} token type"
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

    // ── Alias-target resolution ────────────────────────────────────────────────

    fn make_alias_graph(alias_name_obj: serde_json::Value, target_schema: &str) -> TokenGraph {
        TokenGraph::from_pairs(vec![
            (
                "alias-token".into(),
                PathBuf::from("a.tokens.json"),
                json!({
                    "$schema": "https://example.com/schemas/token-types/alias.json",
                    "name": alias_name_obj,
                    "value": "{target-token}"
                }),
            ),
            (
                "target-token".into(),
                PathBuf::from("a.tokens.json"),
                json!({ "$schema": target_schema, "value": "#aabbcc" }),
            ),
        ])
    }

    #[test]
    fn alias_to_color_set_allows_color_family() {
        // A color alias carrying colorFamily is valid when its target is color-set.json.
        let g = make_alias_graph(
            json!({ "property": "icon-color", "colorFamily": "blue" }),
            "https://example.com/schemas/token-types/color-set.json",
        );
        assert!(diagnostics_for_rule(&g, "SPEC-042").is_empty());
    }

    #[test]
    fn alias_to_color_allows_color_family() {
        let g = make_alias_graph(
            json!({ "property": "color", "colorFamily": "gray" }),
            "https://example.com/schemas/token-types/color.json",
        );
        assert!(diagnostics_for_rule(&g, "SPEC-042").is_empty());
    }

    #[test]
    fn alias_to_multiplier_disallows_color_family() {
        // An alias whose target is multiplier.json is not color-domain; colorFamily fires.
        let g = make_alias_graph(
            json!({ "property": "line-height", "colorFamily": "blue" }),
            "https://example.com/schemas/token-types/multiplier.json",
        );
        let diags = diagnostics_for_rule(&g, "SPEC-042");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("colorFamily"));
    }

    #[test]
    fn alias_to_font_weight_allows_weight() {
        // A typography alias carrying weight is valid when its target is font-weight.json.
        let g = make_alias_graph(
            json!({ "property": "font-weight", "weight": "bold" }),
            "https://example.com/schemas/token-types/font-weight.json",
        );
        assert!(diagnostics_for_rule(&g, "SPEC-042").is_empty());
    }

    #[test]
    fn chained_alias_resolves_to_terminal_schema() {
        // A → B (alias) → C (color-set): colorFamily allowed on A.
        let g = TokenGraph::from_pairs(vec![
            (
                "alias-a".into(),
                PathBuf::from("a.tokens.json"),
                json!({
                    "$schema": "https://example.com/schemas/token-types/alias.json",
                    "name": { "property": "icon-color", "colorFamily": "red" },
                    "value": "{alias-b}"
                }),
            ),
            (
                "alias-b".into(),
                PathBuf::from("a.tokens.json"),
                json!({
                    "$schema": "https://example.com/schemas/token-types/alias.json",
                    "value": "{target-c}"
                }),
            ),
            (
                "target-c".into(),
                PathBuf::from("a.tokens.json"),
                json!({
                    "$schema": "https://example.com/schemas/token-types/color-set.json",
                    "value": "#ff0000"
                }),
            ),
        ]);
        assert!(diagnostics_for_rule(&g, "SPEC-042").is_empty());
    }

    #[test]
    fn alias_with_missing_target_falls_back_silently() {
        // Broken alias (target not in graph): SPEC-042 falls through without panic.
        // SPEC-001 owns the broken-alias diagnostic.
        let g = TokenGraph::from_pairs(vec![(
            "alias-token".into(),
            PathBuf::from("a.tokens.json"),
            json!({
                "$schema": "https://example.com/schemas/token-types/alias.json",
                "name": { "property": "color", "colorFamily": "blue" },
                "value": "{nonexistent-token}"
            }),
        )]);
        // Falls back to alias.json schema which is not in DOMAIN_SCHEMAS → fires warning.
        // (Same behavior as before this change for broken aliases.)
        let diags = diagnostics_for_rule(&g, "SPEC-042");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("colorFamily"));
    }
}
