// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-096: relationship-any-of-single-option
//!
//! An `anyOf` whose alternatives all pin the same single option says "this option takes one of
//! these values", which an array value says directly: `size: ["s", "m"]` (proposal 017).
//!
//! Warning.

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-096"
    }

    fn name(&self) -> &'static str {
        "relationship-any-of-single-option"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for rel in &ctx.graph.relationships {
            let Some(options) = rel.raw.pointer("/scope/options").and_then(Value::as_object) else {
                continue;
            };
            let alts = crate::scope::any_of_alternatives(options);
            if alts.len() < 2 || alts.iter().any(|a| a.len() != 1) {
                continue;
            }
            let key = alts[0].keys().next().cloned().unwrap_or_default();
            if alts.iter().all(|a| a.contains_key(&key)) {
                out.push(Diagnostic {
                    file: rel.file.clone(),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Warning,
                    message: format!(
                        "Relationship anyOf pins only '{key}' in every alternative; use an array value for '{key}' instead"
                    ),
                    instance_path: Some(format!("/{}/scope/options/anyOf", rel.index)),
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

    use serde_json::{json, Value};

    use crate::graph::{ComponentRecord, Layer, RelationshipRecord, TokenGraph};
    use crate::registry::RegistryData;
    use crate::validate::rule::{ValidationContext, ValidationRule};

    use super::Rule;

    fn graph(components: Vec<Value>, relationships: Vec<Value>) -> TokenGraph {
        let mut g = TokenGraph::from_records(vec![]);
        g.components = components
            .into_iter()
            .map(|raw| ComponentRecord {
                name: raw["name"].as_str().unwrap_or("x").to_string(),
                file: PathBuf::from("components/x.json"),
                raw,
                layer: Layer::Foundation,
            })
            .collect();
        g.relationships = relationships
            .into_iter()
            .enumerate()
            .map(|(index, raw)| RelationshipRecord {
                file: PathBuf::from("relationships/x.json"),
                index,
                uuid: None,
                raw,
            })
            .collect();
        g
    }

    fn run(g: &TokenGraph) -> Vec<crate::report::Diagnostic> {
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest: None,
        };
        Rule.validate(&ctx)
    }

    fn rel(options: Value) -> Value {
        json!({"scope": {"component": "x", "property": "p", "options": options}, "$ref": "t"})
    }

    #[test]
    fn alternatives_on_one_option_warn() {
        let g = graph(
            vec![],
            vec![rel(json!({"anyOf": [{"size": "s"}, {"size": "m"}]}))],
        );
        assert_eq!(run(&g).len(), 1);
    }

    #[test]
    fn alternatives_on_different_options_do_not() {
        let g = graph(
            vec![],
            vec![
                rel(json!({"anyOf": [{"isSelected": true}, {"isIndeterminate": true}]})),
                rel(json!({"anyOf": [{"size": "s", "isDisabled": true}, {"size": "m"}]})),
            ],
        );
        assert!(run(&g).is_empty());
    }
}
