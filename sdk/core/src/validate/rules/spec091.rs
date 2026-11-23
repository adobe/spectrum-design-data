// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-091: relationship-context-main-word-registered
//!
//! The main word of a relationship `context` (the text before an optional parenthesis; a
//! compound such as `Background and border` is split at `and` and commas) should be a
//! label or alias in `registry/relationship-contexts.json`. Matching ignores case and
//! stray whitespace; cleaning those up is separate work.
//!
//! Warning, held at a baseline by `tests/recipe_lint_baseline.rs`.

use serde_json::Value;

use crate::registry::split_context;
use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-091"
    }

    fn name(&self) -> &'static str {
        "relationship-context-main-word-registered"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for rel in &ctx.graph.relationships {
            let Some(context) = rel.raw.get("context").and_then(Value::as_str) else {
                continue;
            };
            if context.trim().is_empty() {
                continue;
            }
            if let Err(word) = ctx.registry.context_roles(split_context(context).0) {
                out.push(Diagnostic {
                    file: rel.file.clone(),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Warning,
                    message: format!(
                        "Relationship context '{context}': main word '{word}' is not in the relationship-contexts registry"
                    ),
                    instance_path: Some(format!("/{}", rel.index)),
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

    use crate::graph::{RelationshipRecord, TokenGraph};
    use crate::registry::RegistryData;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec091::Rule;

    fn warnings(contexts: &[&str]) -> usize {
        let mut g = TokenGraph::from_records(vec![]);
        g.relationships = contexts
            .iter()
            .enumerate()
            .map(|(i, c)| RelationshipRecord {
                file: PathBuf::from("tag.json"),
                index: i,
                uuid: None,
                raw: json!({"scope": {"component": "tag", "property": "gap"}, "context": c, "$ref": "t"}),
            })
            .collect();
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest: None,
        };
        Rule.validate(&ctx).len()
    }

    #[test]
    fn registered_main_words_pass() {
        assert_eq!(
            warnings(&[
                "Spacing",
                "Spacing (icon to label)",
                " minimum  Height ",
                "Background and border",
                "Label, icon, and hold icon",
                "Standalone",
            ]),
            1
        );
    }

    #[test]
    fn an_unregistered_word_warns() {
        assert_eq!(warnings(&["Wibble", "Wibble (x)", "Label and wibble"]), 3);
    }
}
