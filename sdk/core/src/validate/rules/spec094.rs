// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-094: relationship-state-repeated
//!
//! A state that appears in more than one element of one `scope.options.state` array. The
//! array is an AND, so `["down", { "anyOf": ["down", "hover"] }]` repeats `down`: the expansion
//! is well defined (a state counts once) but the record almost always says something other than
//! what the author meant (proposal 017).
//!
//! Warning.

use std::collections::BTreeMap;

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-094"
    }

    fn name(&self) -> &'static str {
        "relationship-state-repeated"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for rel in &ctx.graph.relationships {
            let Some(options) = rel.raw.pointer("/scope/options").and_then(Value::as_object) else {
                continue;
            };
            let mut seen: BTreeMap<String, usize> = BTreeMap::new();
            for element in crate::scope::state_elements(options) {
                let mut once: Vec<String> = element;
                once.sort();
                once.dedup();
                for state in once {
                    *seen.entry(state).or_default() += 1;
                }
            }
            for (state, n) in seen {
                if n > 1 {
                    out.push(Diagnostic {
                        file: rel.file.clone(),
                        token: None,
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Warning,
                        message: format!(
                            "Relationship scope lists state '{state}' in {n} elements of its state array; list it once"
                        ),
                        instance_path: Some(format!("/{}/scope/options/state", rel.index)),
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
    fn a_state_in_two_elements_warns() {
        let g = graph(
            vec![],
            vec![
                rel(json!({"state": ["down", {"anyOf": ["down", "hover"]}]})),
                rel(json!({"state": [{"anyOf": ["a", "b"]}, {"anyOf": ["b", "c"]}]})),
                rel(json!({"state": ["hover", "hover"]})),
            ],
        );
        assert_eq!(run(&g).len(), 3);
    }

    #[test]
    fn distinct_states_do_not() {
        let g = graph(
            vec![],
            vec![
                rel(json!({"state": ["selected", {"anyOf": ["hover", "down"]}]})),
                rel(json!({"size": "m"})),
            ],
        );
        assert!(run(&g).is_empty());
    }
}
