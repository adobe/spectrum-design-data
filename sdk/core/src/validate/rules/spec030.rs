// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-030: accessibility-empty
//!
//! Warns when a component declaration carries an `accessibility` object but all
//! five known fields (`role`, `intents`, `focusable`, `keyboardIntents`, `wcag`)
//! are absent. An empty declaration adds no semantic value and should either be
//! populated or removed.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

const KNOWN_FIELDS: &[&str] = &["role", "intents", "focusable", "keyboardIntents", "wcag"];

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-030"
    }

    fn name(&self) -> &'static str {
        "accessibility-empty"
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
            let has_any = KNOWN_FIELDS.iter().any(|f| obj.contains_key(*f));
            if !has_any {
                out.push(Diagnostic {
                    file: comp.file.clone(),
                    token: None,
                    rule_id: Some("SPEC-030".to_string()),
                    severity: Severity::Warning,
                    message: format!(
                        "Component '{}' has an empty accessibility object — populate at least one field or remove the property",
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
    use crate::validate::rules::spec030::Rule;

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
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: &registry,
            manifest: None,
        };
        Rule.validate(&ctx)
    }

    #[test]
    fn no_accessibility_no_warning() {
        let diags = run(json!({"name": "button", "displayName": "Button"}));
        assert!(diags.is_empty());
    }

    #[test]
    fn populated_accessibility_no_warning() {
        let diags = run(json!({
            "name": "button",
            "displayName": "Button",
            "accessibility": { "role": "button", "focusable": true }
        }));
        assert!(diags.is_empty());
    }

    #[test]
    fn empty_accessibility_warns() {
        let diags = run(json!({
            "name": "button",
            "displayName": "Button",
            "accessibility": {}
        }));
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-030"));
        assert!(diags[0].message.contains("Component 'button'"));
    }

    #[test]
    fn single_field_no_warning() {
        let diags = run(json!({
            "name": "tooltip",
            "displayName": "Tooltip",
            "accessibility": { "focusable": false }
        }));
        assert!(diags.is_empty());
    }
}
