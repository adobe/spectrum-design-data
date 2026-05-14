// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-031: accessibility-wcag-missing
//!
//! Warns when a component has an `accessibility` object with a `role` field but
//! no `wcag` entries. Components with a named semantic role SHOULD document the
//! applicable WCAG 2.x success criteria for audit traceability.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-031"
    }

    fn name(&self) -> &'static str {
        "accessibility-wcag-missing"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        for comp in &ctx.graph.components {
            let Some(acc) = comp.raw.get("accessibility") else {
                continue;
            };
            let Some(obj) = acc.as_object() else {
                continue;
            };
            // Only applies when `role` is present
            if !obj.contains_key("role") {
                continue;
            }
            let wcag_empty = obj
                .get("wcag")
                .and_then(|v| v.as_array())
                .map(|a| a.is_empty())
                .unwrap_or(true); // absent counts as empty
            if wcag_empty {
                out.push(Diagnostic {
                    file: comp.file.clone(),
                    token: None,
                    rule_id: Some("SPEC-031".to_string()),
                    severity: Severity::Warning,
                    message: format!(
                        "Component '{}' accessibility has a role but no wcag entries — add applicable WCAG 2.x success criteria",
                        comp.name
                    ),
                    instance_path: None,
                    schema_path: None,
                });
            }
        }

        out
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::json;

    use crate::graph::{ComponentRecord, TokenGraph};
    use crate::registry::RegistryData;
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec031::Rule;

    fn run(comp_raw: serde_json::Value) -> Vec<crate::report::Diagnostic> {
        let mut g = TokenGraph::default();
        g.components.push(ComponentRecord {
            name: comp_raw
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("test-comp")
                .to_string(),
            file: PathBuf::from("test-comp.json"),
            raw: comp_raw,
        });
        let exceptions = std::collections::HashSet::new();
        let registry = RegistryData::embedded();
        let ctx = ValidationContext { graph: &g, naming_exceptions: &exceptions, registry: &registry };
        Rule.validate(&ctx)
    }

    #[test]
    fn no_accessibility_no_warning() {
        let diags = run(json!({"name": "button", "displayName": "Button"}));
        assert!(diags.is_empty());
    }

    #[test]
    fn role_with_wcag_no_warning() {
        let diags = run(json!({
            "name": "button",
            "displayName": "Button",
            "accessibility": {
                "role": "button",
                "wcag": [
                    { "criterion": "4.1.2", "level": "A", "title": "Name, Role, Value" }
                ]
            }
        }));
        assert!(diags.is_empty());
    }

    #[test]
    fn role_without_wcag_warns() {
        let diags = run(json!({
            "name": "button",
            "displayName": "Button",
            "accessibility": { "role": "button" }
        }));
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-031"));
        assert!(diags[0].message.contains("Component 'button'"));
    }

    #[test]
    fn role_with_empty_wcag_warns() {
        let diags = run(json!({
            "name": "button",
            "displayName": "Button",
            "accessibility": { "role": "button", "wcag": [] }
        }));
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-031"));
    }

    #[test]
    fn no_role_no_warning() {
        // accessibility present but no role — SPEC-031 should not fire
        let diags = run(json!({
            "name": "decoration",
            "displayName": "Decoration",
            "accessibility": { "focusable": false }
        }));
        assert!(diags.is_empty());
    }
}
