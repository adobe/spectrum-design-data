// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-048: anatomy-contains-resolves
//!
//! An anatomy part's `contains` entries SHOULD match the `name` of another anatomy
//! part declared on the same component. Unresolved references are advisory only —
//! `contains` may legitimately point at sub-component anatomy in layered designs
//! (anatomy-format.md#contains) — so this fires a warning, not an error.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-048"
    }

    fn name(&self) -> &'static str {
        "anatomy-contains-resolves"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        for comp in &ctx.graph.components {
            let Some(anatomy) = comp.raw.get("anatomy").and_then(|v| v.as_array()) else {
                continue;
            };

            let declared_parts: std::collections::HashSet<&str> = anatomy
                .iter()
                .filter_map(|p| p.get("name").and_then(|n| n.as_str()))
                .collect();

            for part in anatomy {
                let Some(part_name) = part.get("name").and_then(|n| n.as_str()) else {
                    continue;
                };
                let Some(contains) = part.get("contains").and_then(|v| v.as_array()) else {
                    continue;
                };

                for child in contains {
                    let Some(child_name) = child.as_str() else {
                        continue;
                    };
                    if !declared_parts.contains(child_name) {
                        out.push(Diagnostic {
                            file: comp.file.clone(),
                            token: None,
                            rule_id: Some(self.id().to_string()),
                            severity: Severity::Warning,
                            message: format!(
                                "Anatomy part '{part_name}' on component '{}' contains '{child_name}', which is not a declared anatomy part on this component",
                                comp.name
                            ),
                            instance_path: None,
                            schema_path: None,
                        });
                    }
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
    use crate::validate::rules::spec048::Rule;

    fn run(comp_raw: serde_json::Value) -> Vec<crate::report::Diagnostic> {
        let mut g = TokenGraph::default();
        let comp_name = comp_raw
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("menu")
            .to_string();
        g.components.push(ComponentRecord {
            name: comp_name,
            file: PathBuf::from("dataset.json"),
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
    fn resolved_contains_no_warning() {
        let diags = run(json!({
            "name": "menu",
            "anatomy": [
                { "name": "menu-item", "description": "A row.", "contains": ["icon", "label"] },
                { "name": "icon", "description": "Leading icon." },
                { "name": "label", "description": "Item label." }
            ]
        }));
        assert!(diags.is_empty());
    }

    #[test]
    fn unresolved_contains_warns() {
        let diags = run(json!({
            "name": "menu",
            "anatomy": [
                { "name": "menu-item", "description": "A row.", "contains": ["checkbox"] }
            ]
        }));
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-048"));
        assert!(diags[0].message.contains("checkbox"));
    }

    #[test]
    fn no_contains_no_warning() {
        let diags = run(json!({
            "name": "menu",
            "anatomy": [{ "name": "menu-item", "description": "A row." }]
        }));
        assert!(diags.is_empty());
    }
}
