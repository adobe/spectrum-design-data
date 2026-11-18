// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-102: field-token-tier-violation
//!
//! A token's name object MUST NOT contain a field whose catalog declaration lists
//! `allowedTokenTiers` without the token's effective tier: its explicit `tokenTier`, or the
//! tier derived from its name and value (see `token_tier`).

use crate::registry::FieldCatalog;
use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-102"
    }

    fn name(&self) -> &'static str {
        "field-token-tier-violation"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let catalog = FieldCatalog::embedded();
        let mut out = Vec::new();

        for record in ctx.graph.tokens.values() {
            let tier = crate::token_tier::effective(record);
            let Some(name_obj) = record.raw.get("name").and_then(|v| v.as_object()) else {
                continue;
            };

            for field in name_obj.keys() {
                let Some(allowed) = catalog.get(field).and_then(|e| e.allowed_token_tiers) else {
                    continue;
                };
                if !allowed.contains(&tier) {
                    out.push(Diagnostic {
                        file: record.file.clone(),
                        token: Some(record.name.clone()),
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Warning,
                        message: format!(
                            "name.{field} applies only to {} tokens but this token's tier is '{tier}'",
                            allowed.join(" and ")
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

    fn graph(token: serde_json::Value) -> TokenGraph {
        TokenGraph::from_pairs(vec![("t".into(), PathBuf::from("a.tokens.json"), token)])
    }

    #[test]
    fn scale_index_on_component_token_warns() {
        let g = graph(json!({
            "tokenTier": "component",
            "name": { "property": "size", "scaleIndex": 100 },
            "value": "16px"
        }));
        let diags = diagnostics_for_rule(&g, "SPEC-102");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("scaleIndex"));
    }

    #[test]
    fn scale_index_on_semantic_token_is_fine() {
        let g = graph(json!({
            "tokenTier": "semantic",
            "name": { "property": "size", "scaleIndex": 100 },
            "value": "16px"
        }));
        assert!(diagnostics_for_rule(&g, "SPEC-102").is_empty());
    }

    #[test]
    fn derived_component_tier_warns_without_explicit_tier() {
        let g = graph(json!({
            "name": { "component": "tabs", "property": "size", "scaleIndex": 100 },
            "value": "16px"
        }));
        assert_eq!(diagnostics_for_rule(&g, "SPEC-102").len(), 1);
    }

    #[test]
    fn token_without_tier_derives_primitive_and_is_fine() {
        let g = graph(json!({
            "name": { "property": "size", "scaleIndex": 100 },
            "value": "16px"
        }));
        assert!(diagnostics_for_rule(&g, "SPEC-102").is_empty());
    }

    #[test]
    fn field_without_allowed_tiers_is_fine_on_any_tier() {
        let g = graph(json!({
            "tokenTier": "component",
            "name": { "property": "size" },
            "value": "16px"
        }));
        assert!(diagnostics_for_rule(&g, "SPEC-102").is_empty());
    }
}
