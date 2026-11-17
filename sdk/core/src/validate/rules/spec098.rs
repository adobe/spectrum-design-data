// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-098: relationship-any-of-undeclared
//!
//! An alternative whose keys are all undeclared options. The solver keeps only declared options
//! (`pinned_options`), so the alternative would become empty and always match, and the any-of
//! would stop narrowing anything (proposal 017). Skipped for a component with no declared options.
//!
//! Warning.

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-098"
    }

    fn name(&self) -> &'static str {
        "relationship-any-of-undeclared"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        let components = super::component_map(ctx.graph);
        for rel in &ctx.graph.relationships {
            let Some(options) = rel.raw.pointer("/scope/options").and_then(Value::as_object) else {
                continue;
            };
            let Some(declared) = rel
                .raw
                .pointer("/scope/component")
                .and_then(Value::as_str)
                .and_then(|c| components.get(c))
                .and_then(|c| c.raw.get("options"))
                .and_then(Value::as_object)
                .filter(|o| !o.is_empty())
            else {
                continue;
            };
            for (i, alt) in crate::scope::any_of_alternatives(options)
                .into_iter()
                .enumerate()
            {
                if !alt.keys().any(|k| declared.contains_key(k)) {
                    out.push(Diagnostic {
                        file: rel.file.clone(),
                        token: None,
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Warning,
                        message: format!(
                            "Relationship anyOf alternative {i} pins no option the component declares, so it would always match"
                        ),
                        instance_path: Some(format!("/{}/scope/options/anyOf/{i}", rel.index)),
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
    fn an_alternative_with_no_declared_option_warns() {
        let comp = json!({"name": "x", "options": {"isSelected": {"type": "boolean"}}});
        let g = graph(
            vec![comp],
            vec![rel(
                json!({"anyOf": [{"isSelected": true}, {"isIndeterminate": true}]}),
            )],
        );
        let d = run(&g);
        assert_eq!(d.len(), 1);
        assert!(d[0].message.contains("alternative 1"));
    }

    #[test]
    fn declared_alternatives_and_options_less_components_pass() {
        let comp = json!({"name": "x", "options": {"isSelected": {"type": "boolean"},
            "isIndeterminate": {"type": "boolean"}}});
        let ok = graph(
            vec![comp],
            vec![rel(
                json!({"anyOf": [{"isSelected": true}, {"isIndeterminate": true}]}),
            )],
        );
        assert!(run(&ok).is_empty());
        let none = graph(
            vec![json!({"name": "x"})],
            vec![rel(json!({"anyOf": [{"a": true}, {"b": true}]}))],
        );
        assert!(run(&none).is_empty());
    }
}
