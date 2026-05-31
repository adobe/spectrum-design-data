// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-024: anatomy-part-name-unique
//!
//! Anatomy part names within a single component's anatomy array MUST be unique.

use std::collections::HashSet;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-024"
    }

    fn name(&self) -> &'static str {
        "anatomy-part-name-unique"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        for comp in &ctx.graph.components {
            let Some(anatomy) = comp.raw.get("anatomy").and_then(|v| v.as_array()) else {
                continue;
            };

            let mut seen: HashSet<&str> = HashSet::new();
            for part in anatomy {
                let Some(name) = part.get("name").and_then(|v| v.as_str()) else {
                    continue;
                };
                if !seen.insert(name) {
                    out.push(Diagnostic {
                        file: comp.file.clone(),
                        token: None,
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Error,
                        message: format!(
                            "Component '{}' declares duplicate anatomy part name '{name}'",
                            comp.name
                        ),
                        instance_path: None,
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

    use crate::graph::{ComponentRecord, TokenGraph};
    use crate::registry::RegistryData;
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec024::Rule;

    fn make_graph(comp_raw: serde_json::Value) -> TokenGraph {
        let mut g = TokenGraph::default();
        let name = comp_raw
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("comp")
            .to_string();
        g.components.push(ComponentRecord {
            name,
            file: PathBuf::from("dataset.json"),
            raw: comp_raw,
        });
        g
    }

    fn run(comp_raw: serde_json::Value) -> Vec<crate::report::Diagnostic> {
        let g = make_graph(comp_raw);
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
    fn unique_parts_no_error() {
        let diags = run(json!({
            "name": "button",
            "anatomy": [
                {"name": "label", "description": "Button text."},
                {"name": "icon", "description": "Leading icon."}
            ]
        }));
        assert!(diags.is_empty());
    }

    #[test]
    fn duplicate_part_error() {
        let diags = run(json!({
            "name": "button",
            "anatomy": [
                {"name": "label", "description": "Button text."},
                {"name": "icon", "description": "Leading icon."},
                {"name": "label", "description": "Duplicate."}
            ]
        }));
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-024"));
        assert!(diags[0].message.contains("label"));
    }

    #[test]
    fn no_anatomy_no_error() {
        let diags = run(json!({"name": "button"}));
        assert!(diags.is_empty());
    }
}
