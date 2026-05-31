// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-017: string-name-tech-debt
//!
//! A token's `name` field SHOULD be a structured name object. Using a plain
//! string is permitted as an escape hatch for tokens that cannot be expressed
//! via the taxonomy, but it is tracked as tech debt (severity: warning).

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-017"
    }

    fn name(&self) -> &'static str {
        "string-name-tech-debt"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut diags = Vec::new();

        for record in ctx.graph.tokens.values() {
            if let Some(name_str) = record.raw.get("name").and_then(|v| v.as_str()) {
                diags.push(Diagnostic {
                    file: record.file.clone(),
                    token: Some(record.name.clone()),
                    rule_id: Some("SPEC-017".into()),
                    severity: Severity::Warning,
                    message: format!(
                        "Token \"{name_str}\" uses a string name instead of a name object \
                         — treat as tech debt and plan remediation"
                    ),
                    instance_path: Some("/name".into()),
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
    fn string_name_warns() {
        let g = TokenGraph::from_pairs(vec![(
            "focus-ring-color-key-focus".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": "focus-ring-color-key-focus", "value": "#0265dc"}),
        )]);
        let diags = diagnostics_for_rule(&g, "SPEC-017");
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("focus-ring-color-key-focus"));
        assert!(diags[0].message.contains("string name"));
    }

    #[test]
    fn object_name_no_warning() {
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "color", "variant": "accent"}, "value": "#0265dc"}),
        )]);
        assert!(diagnostics_for_rule(&g, "SPEC-017").is_empty());
    }

    #[test]
    fn multiple_string_names_multiple_warnings() {
        let g = TokenGraph::from_pairs(vec![
            (
                "t1".into(),
                PathBuf::from("a.tokens.json"),
                json!({"name": "raw-token-one", "value": "#fff"}),
            ),
            (
                "t2".into(),
                PathBuf::from("a.tokens.json"),
                json!({"name": "raw-token-two", "value": "#000"}),
            ),
        ]);
        assert_eq!(diagnostics_for_rule(&g, "SPEC-017").len(), 2);
    }
}
