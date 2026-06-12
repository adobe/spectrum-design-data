// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-045: guideline-missing-purpose
//!
//! Warns when a guideline document has a `documentBlocks` array but no block with
//! type "purpose". A purpose block explains the design intent of the topic and is
//! the primary entry point for agents and designers querying the guidance corpus.
//!
//! Mirrors SPEC-029 (document-block-missing-purpose) scoped to the guideline entity.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-045"
    }

    fn name(&self) -> &'static str {
        "guideline-missing-purpose"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        for guideline in &ctx.graph.guidelines {
            let Some(blocks) = guideline
                .raw
                .get("documentBlocks")
                .and_then(|v| v.as_array())
            else {
                continue;
            };
            if blocks.is_empty() {
                continue;
            }
            let has_purpose = blocks
                .iter()
                .any(|b| b.get("type").and_then(|v| v.as_str()) == Some("purpose"));
            if !has_purpose {
                out.push(Diagnostic {
                    file: guideline.file.clone(),
                    token: None,
                    rule_id: Some("SPEC-045".to_string()),
                    severity: Severity::Warning,
                    message: format!(
                        "Guideline '{}' has documentBlocks but no purpose block — add a block with type 'purpose'",
                        guideline.name
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

    use crate::graph::{GuidelineRecord, TokenGraph};
    use crate::registry::RegistryData;
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec045::Rule;

    fn make_graph(guidelines: Vec<serde_json::Value>) -> TokenGraph {
        let records: Vec<GuidelineRecord> = guidelines
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
        TokenGraph::default().with_guidelines(records)
    }

    fn run(guidelines: Vec<serde_json::Value>) -> Vec<crate::report::Diagnostic> {
        let g = make_graph(guidelines);
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
    fn no_guidelines_no_warning() {
        let diags = run(vec![]);
        assert!(diags.is_empty());
    }

    #[test]
    fn guideline_with_purpose_no_warning() {
        let diags = run(vec![json!({
            "name": "colors",
            "title": "Colors",
            "category": "designing",
            "documentBlocks": [
                {"type": "purpose", "content": "The Spectrum 2 color system."}
            ]
        })]);
        assert!(diags.is_empty());
    }

    #[test]
    fn guideline_without_purpose_warns() {
        let diags = run(vec![json!({
            "name": "spacing",
            "title": "Spacing",
            "category": "designing",
            "documentBlocks": [
                {"type": "guideline", "content": "Use spacing tokens for consistent rhythm."}
            ]
        })]);
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-045"));
        assert!(diags[0].message.contains("'spacing'"));
        assert!(diags[0].message.contains("purpose block"));
    }

    #[test]
    fn guideline_with_empty_blocks_no_warning() {
        // Empty documentBlocks (schema violation, but not SPEC-045's concern).
        let diags = run(vec![json!({
            "name": "motion",
            "title": "Motion",
            "category": "designing",
            "documentBlocks": []
        })]);
        assert!(diags.is_empty());
    }

    #[test]
    fn multiple_guidelines_warns_only_for_missing() {
        let diags = run(vec![
            json!({
                "name": "colors",
                "documentBlocks": [{"type": "purpose", "content": "Color system."}]
            }),
            json!({
                "name": "spacing",
                "documentBlocks": [{"type": "guideline", "content": "Use spacing tokens."}]
            }),
        ]);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("'spacing'"));
    }
}
