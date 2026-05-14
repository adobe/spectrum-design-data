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
//! Applies to tokens, components, and anatomy parts.

use std::path::Path;

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

fn check_blocks(blocks: &[Value], entity_label: &str, file: &Path, out: &mut Vec<Diagnostic>) {
    for block in blocks {
        let Some(content) = block.get("content").and_then(|v| v.as_str()) else {
            continue;
        };
        let Some(agents) = block.get("agents").and_then(|v| v.as_str()) else {
            continue;
        };
        if agents == content {
            out.push(Diagnostic {
                file: file.to_path_buf(),
                token: None,
                rule_id: Some("SPEC-028".to_string()),
                severity: Severity::Warning,
                message: format!(
                    "{entity_label} has a document block whose agents text is identical to content — tailor it for agent consumption or omit the agents field"
                ),
                instance_path: None,
                schema_path: None,
            });
        }
    }
}

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
            if let Some(blocks) = t.raw.get("documentBlocks").and_then(|v| v.as_array()) {
                check_blocks(blocks, &format!("Token '{}'", t.name), &t.file, &mut out);
            }
        }

        for comp in &ctx.graph.components {
            let comp_label = format!("Component '{}'", comp.name);
            if let Some(blocks) = comp.raw.get("documentBlocks").and_then(|v| v.as_array()) {
                check_blocks(blocks, &comp_label, &comp.file, &mut out);
            }
            if let Some(anatomy) = comp.raw.get("anatomy").and_then(|v| v.as_array()) {
                for part in anatomy {
                    let part_name = part.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                    let part_label =
                        format!("Component '{}' anatomy part '{}'", comp.name, part_name);
                    if let Some(blocks) = part.get("documentBlocks").and_then(|v| v.as_array()) {
                        check_blocks(blocks, &part_label, &comp.file, &mut out);
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

    use crate::graph::{ComponentRecord, TokenGraph, TokenRecord};
    use crate::registry::RegistryData;
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec028::Rule;

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

    fn make_graph_with_component(comp_raw: serde_json::Value) -> TokenGraph {
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
        g
    }

    fn run(raw: serde_json::Value) -> Vec<crate::report::Diagnostic> {
        let g = make_graph(raw);
        let exceptions = std::collections::HashSet::new();
        let registry = RegistryData::embedded();
        let ctx = ValidationContext { graph: &g, naming_exceptions: &exceptions, registry: &registry };
        Rule.validate(&ctx)
    }

    fn run_comp(comp_raw: serde_json::Value) -> Vec<crate::report::Diagnostic> {
        let g = make_graph_with_component(comp_raw);
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

    #[test]
    fn component_agents_equals_content_warns() {
        let diags = run_comp(json!({
            "name": "button",
            "displayName": "Button",
            "documentBlocks": [
                {"type": "purpose", "content": "Triggers an action.", "agents": "Triggers an action."}
            ]
        }));
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-028"));
        assert!(diags[0].message.contains("Component 'button'"));
    }

    #[test]
    fn component_agents_differs_no_warning() {
        let diags = run_comp(json!({
            "name": "button",
            "displayName": "Button",
            "documentBlocks": [
                {"type": "purpose", "content": "Triggers an action.", "agents": "Use Button to trigger a discrete action."}
            ]
        }));
        assert!(diags.is_empty());
    }

    #[test]
    fn anatomy_part_agents_equals_content_warns() {
        let diags = run_comp(json!({
            "name": "button",
            "displayName": "Button",
            "anatomy": [
                {
                    "name": "label",
                    "documentBlocks": [
                        {"type": "guideline", "content": "Use action verbs.", "agents": "Use action verbs."}
                    ]
                }
            ]
        }));
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-028"));
        assert!(diags[0].message.contains("anatomy part 'label'"));
    }
}
