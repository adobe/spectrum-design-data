// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-028: document-block-agents-equals-content
//!
//! Warns when a document block's `agents` field is present but identical to `content`.
//! An identical copy adds size with no agent-specific value and should be omitted.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-028"
    }

    fn name(&self) -> &'static str {
        "document-block-agents-equals-content"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for t in ctx.graph.tokens.values() {
            let Some(blocks) = t.raw.get("documentBlocks").and_then(|v| v.as_array()) else {
                continue;
            };
            for block in blocks {
                let Some(content) = block.get("content").and_then(|v| v.as_str()) else {
                    continue;
                };
                let Some(agents) = block.get("agents").and_then(|v| v.as_str()) else {
                    continue;
                };
                if agents == content {
                    out.push(Diagnostic {
                        file: t.file.clone(),
                        token: Some(t.name.clone()),
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Warning,
                        message: format!(
                            "Token '{}' has a document block whose agents text is identical to content — tailor it for agent consumption or omit the agents field",
                            t.name
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

    use crate::graph::{TokenGraph, TokenRecord};
    use crate::report::Severity;
    use crate::registry::RegistryData;
    use crate::validate::rule::ValidationContext;
    use crate::validate::rules::spec028::Rule;
    use crate::validate::rule::ValidationRule;

    fn make_graph(raw: serde_json::Value) -> TokenGraph {
        let mut g = TokenGraph::default();
        g.tokens.insert(
            "t".into(),
            TokenRecord {
                name: "t".into(),
                file: PathBuf::from("test.tokens.json"),
                index: 0,
                schema_url: None,
                uuid: None,
                alias_target: None,
                raw,
            },
        );
        g
    }

    fn run(raw: serde_json::Value) -> Vec<crate::report::Diagnostic> {
        let g = make_graph(raw);
        let exceptions = std::collections::HashSet::new();
        let registry = RegistryData::embedded();
        let ctx = ValidationContext { graph: &g, naming_exceptions: &exceptions, registry: &registry };
        Rule.validate(&ctx)
    }

    #[test]
    fn no_document_blocks_no_warning() {
        let diags = run(json!({"name": {"property": "color"}, "value": "#fff"}));
        assert!(diags.is_empty());
    }

    #[test]
    fn agents_differs_no_warning() {
        let diags = run(json!({
            "name": {"property": "color"},
            "value": "#fff",
            "documentBlocks": [
                {"type": "purpose", "content": "Primary CTA color.", "agents": "Use for the primary call-to-action element."}
            ]
        }));
        assert!(diags.is_empty());
    }

    #[test]
    fn agents_equals_content_warns() {
        let diags = run(json!({
            "name": {"property": "color"},
            "value": "#fff",
            "documentBlocks": [
                {"type": "purpose", "content": "Primary CTA color.", "agents": "Primary CTA color."}
            ]
        }));
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-028"));
    }

    #[test]
    fn no_agents_field_no_warning() {
        let diags = run(json!({
            "name": {"property": "color"},
            "value": "#fff",
            "documentBlocks": [
                {"type": "purpose", "content": "Primary CTA color."}
            ]
        }));
        assert!(diags.is_empty());
    }
}
