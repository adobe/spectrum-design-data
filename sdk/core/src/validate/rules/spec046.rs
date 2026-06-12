// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-046: guideline-related-resolves
//!
//! Warns when a `related[].ref` in a guideline document does not resolve to a
//! known component or guideline name in the dataset.
//!
//! When `kind` is `"component"`, only the component catalog is checked.
//! When `kind` is `"guideline"`, only the guideline catalog is checked.
//! When `kind` is absent, both catalogs are checked.
//!
//! Dangling references are advisory (warning) to allow incremental migration
//! where some targets may not yet be present in the dataset.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-046"
    }

    fn name(&self) -> &'static str {
        "guideline-related-resolves"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        // Build fast name sets for lookup.
        let component_names: std::collections::HashSet<&str> = ctx
            .graph
            .components
            .iter()
            .map(|c| c.name.as_str())
            .collect();
        let guideline_names: std::collections::HashSet<&str> = ctx
            .graph
            .guidelines
            .iter()
            .map(|g| g.name.as_str())
            .collect();

        for guideline in &ctx.graph.guidelines {
            let Some(related) = guideline.raw.get("related").and_then(|v| v.as_array()) else {
                continue;
            };

            for entry in related {
                let Some(ref_val) = entry.get("ref").and_then(|v| v.as_str()) else {
                    continue;
                };
                let kind = entry.get("kind").and_then(|v| v.as_str());

                let resolves = match kind {
                    Some("component") => component_names.contains(ref_val),
                    Some("guideline") => guideline_names.contains(ref_val),
                    // No kind hint — check both catalogs.
                    _ => component_names.contains(ref_val) || guideline_names.contains(ref_val),
                };

                if !resolves {
                    out.push(Diagnostic {
                        file: guideline.file.clone(),
                        token: None,
                        rule_id: Some("SPEC-046".to_string()),
                        severity: Severity::Warning,
                        message: format!(
                            "Guideline '{}' references '{}' which is not a known component or guideline",
                            guideline.name, ref_val
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

    use crate::graph::{ComponentRecord, GuidelineRecord, TokenGraph};
    use crate::registry::RegistryData;
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec046::Rule;

    fn make_graph(
        guidelines: Vec<serde_json::Value>,
        components: Vec<serde_json::Value>,
    ) -> TokenGraph {
        let guideline_records: Vec<GuidelineRecord> = guidelines
            .into_iter()
            .map(|raw| {
                let name = raw
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown")
                    .to_string();
                GuidelineRecord {
                    name,
                    file: PathBuf::from("dataset.json"),
                    raw,
                }
            })
            .collect();
        let component_records: Vec<ComponentRecord> = components
            .into_iter()
            .map(|raw| {
                let name = raw
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown")
                    .to_string();
                ComponentRecord {
                    name,
                    file: PathBuf::from("dataset.json"),
                    raw,
                }
            })
            .collect();
        TokenGraph::default()
            .with_guidelines(guideline_records)
            .with_components(component_records)
    }

    fn run(
        guidelines: Vec<serde_json::Value>,
        components: Vec<serde_json::Value>,
    ) -> Vec<crate::report::Diagnostic> {
        let g = make_graph(guidelines, components);
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
    fn no_related_no_warning() {
        let diags = run(
            vec![json!({
                "name": "colors",
                "documentBlocks": [{"type": "purpose", "content": "Color system."}]
            })],
            vec![],
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn related_resolves_to_guideline_no_warning() {
        let diags = run(
            vec![
                json!({
                    "name": "colors",
                    "related": [{"ref": "grays", "kind": "guideline"}],
                    "documentBlocks": [{"type": "purpose", "content": "Color system."}]
                }),
                json!({
                    "name": "grays",
                    "documentBlocks": [{"type": "purpose", "content": "Gray tokens."}]
                }),
            ],
            vec![],
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn related_resolves_to_component_no_warning() {
        let diags = run(
            vec![json!({
                "name": "developer-overview",
                "related": [{"ref": "button", "kind": "component"}],
                "documentBlocks": [{"type": "purpose", "content": "Dev overview."}]
            })],
            vec![json!({"name": "button", "displayName": "Button"})],
        );
        assert!(diags.is_empty());
    }

    #[test]
    fn dangling_ref_warns() {
        let diags = run(
            vec![json!({
                "name": "motion",
                "related": [{"ref": "nonexistent-guideline", "kind": "guideline"}],
                "documentBlocks": [{"type": "purpose", "content": "Motion system."}]
            })],
            vec![],
        );
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-046"));
        assert!(diags[0].message.contains("'motion'"));
        assert!(diags[0].message.contains("'nonexistent-guideline'"));
        assert!(diags[0]
            .message
            .contains("not a known component or guideline"));
    }

    #[test]
    fn component_kind_checks_only_components() {
        // ref resolves as a guideline name but kind=component → should warn.
        let diags = run(
            vec![
                json!({
                    "name": "colors",
                    "related": [{"ref": "grays", "kind": "component"}],
                    "documentBlocks": [{"type": "purpose", "content": "Color."}]
                }),
                json!({
                    "name": "grays",
                    "documentBlocks": [{"type": "purpose", "content": "Grays."}]
                }),
            ],
            vec![],
        );
        assert_eq!(
            diags.len(),
            1,
            "should warn when kind=component but ref only exists as guideline"
        );
        assert!(diags[0].message.contains("'grays'"));
    }

    #[test]
    fn no_kind_resolves_against_both_catalogs() {
        // No kind hint — should find in either catalog.
        let diags = run(
            vec![
                json!({
                    "name": "colors",
                    "related": [{"ref": "button"}, {"ref": "grays"}],
                    "documentBlocks": [{"type": "purpose", "content": "Color."}]
                }),
                json!({
                    "name": "grays",
                    "documentBlocks": [{"type": "purpose", "content": "Grays."}]
                }),
            ],
            vec![json!({"name": "button", "displayName": "Button"})],
        );
        assert!(
            diags.is_empty(),
            "button and grays both exist — no warnings expected"
        );
    }
}
