// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is licensed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-029: document-block-missing-purpose
//!
//! Warns when an entity has a non-empty `documentBlocks` array but no block with
//! type "purpose". Applies to tokens, components, and anatomy parts.

use std::path::Path;

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

fn check_purpose(blocks: &[Value], entity_label: &str, file: &Path, out: &mut Vec<Diagnostic>) {
    if blocks.is_empty() {
        return;
    }
    let has_purpose = blocks
        .iter()
        .any(|b| b.get("type").and_then(|v| v.as_str()) == Some("purpose"));
    if !has_purpose {
        out.push(Diagnostic {
            file: file.to_path_buf(),
            token: None,
            rule_id: Some("SPEC-029".to_string()),
            severity: Severity::Warning,
            message: format!(
                "{entity_label} has documentBlocks but no purpose block — add a block with type 'purpose'"
            ),
            instance_path: None,
            schema_path: None,
        });
    }
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-029"
    }

    fn name(&self) -> &'static str {
        "document-block-missing-purpose"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        for t in ctx.graph.tokens.values() {
            if let Some(blocks) = t.raw.get("documentBlocks").and_then(|v| v.as_array()) {
                check_purpose(blocks, &format!("Token '{}'", t.name), &t.file, &mut out);
            }
        }

        for comp in &ctx.graph.components {
            let comp_label = format!("Component '{}'", comp.name);
            if let Some(blocks) = comp.raw.get("documentBlocks").and_then(|v| v.as_array()) {
                check_purpose(blocks, &comp_label, &comp.file, &mut out);
            }
            if let Some(anatomy) = comp.raw.get("anatomy").and_then(|v| v.as_array()) {
                for part in anatomy {
                    let part_name = part.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                    let part_label =
                        format!("Component '{}' anatomy part '{}'", comp.name, part_name);
                    if let Some(blocks) = part.get("documentBlocks").and_then(|v| v.as_array()) {
                        check_purpose(blocks, &part_label, &comp.file, &mut out);
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
    use crate::validate::rules::spec029::Rule;

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
    fn empty_document_blocks_no_warning() {
        let diags = run(json!({
            "name": {"property": "color"},
            "value": "#fff",
            "documentBlocks": []
        }));
        assert!(diags.is_empty());
    }

    #[test]
    fn has_purpose_block_no_warning() {
        let diags = run(json!({
            "name": {"property": "color"},
            "value": "#fff",
            "documentBlocks": [
                {"type": "purpose", "content": "Primary CTA color."},
                {"type": "guideline", "content": "Use sparingly."}
            ]
        }));
        assert!(diags.is_empty());
    }

    #[test]
    fn blocks_without_purpose_warns() {
        let diags = run(json!({
            "name": {"property": "color"},
            "value": "#fff",
            "documentBlocks": [
                {"type": "guideline", "content": "Use sparingly."},
                {"type": "examples", "content": "Applied to the primary button."}
            ]
        }));
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-029"));
    }

    #[test]
    fn component_without_purpose_warns() {
        let diags = run_comp(json!({
            "name": "button",
            "displayName": "Button",
            "documentBlocks": [
                {"type": "guideline", "content": "Use for primary actions."}
            ]
        }));
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-029"));
        assert!(diags[0].message.contains("Component 'button'"));
    }

    #[test]
    fn component_with_purpose_no_warning() {
        let diags = run_comp(json!({
            "name": "button",
            "displayName": "Button",
            "documentBlocks": [
                {"type": "purpose", "content": "Triggers a discrete action."},
                {"type": "guideline", "content": "Use for primary actions."}
            ]
        }));
        assert!(diags.is_empty());
    }

    #[test]
    fn anatomy_part_without_purpose_warns() {
        let diags = run_comp(json!({
            "name": "button",
            "displayName": "Button",
            "anatomy": [
                {
                    "name": "label",
                    "documentBlocks": [
                        {"type": "guideline", "content": "Use action verbs."}
                    ]
                }
            ]
        }));
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-029"));
        assert!(diags[0].message.contains("anatomy part 'label'"));
    }
}
