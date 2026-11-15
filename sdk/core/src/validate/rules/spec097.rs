// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-097: relationship-any-of-redundant
//!
//! An alternative that adds nothing: it repeats a pin the record already has, or it equals or
//! contains another alternative (the larger one is covered by the smaller, because an alternative
//! is an AND and the any-of is an OR). Proposal 017.
//!
//! Warning.

use serde_json::{Map, Value};

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

/// Whether every pin of `small` is in `large` with the same value.
fn covers(small: &Map<String, Value>, large: &Map<String, Value>) -> bool {
    small.iter().all(|(k, v)| large.get(k) == Some(v))
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-097"
    }

    fn name(&self) -> &'static str {
        "relationship-any-of-redundant"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for rel in &ctx.graph.relationships {
            let Some(options) = rel.raw.pointer("/scope/options").and_then(Value::as_object) else {
                continue;
            };
            let alts = crate::scope::any_of_alternatives(options);
            let mut warn = |message: String| {
                out.push(Diagnostic {
                    file: rel.file.clone(),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Warning,
                    message,
                    instance_path: Some(format!("/{}/scope/options/anyOf", rel.index)),
                    schema_path: None,
                });
            };
            for (i, alt) in alts.iter().enumerate() {
                if let Some(key) = alt.keys().find(|k| {
                    k.as_str() != crate::scope::ANY_OF
                        && k.as_str() != "state"
                        && options.contains_key(k.as_str())
                }) {
                    warn(format!(
                        "Relationship anyOf alternative {i} repeats the record's own pin '{key}'; remove it from the alternative"
                    ));
                }
                for (j, other) in alts.iter().enumerate() {
                    // The first of two equal alternatives is kept; a strict superset is covered.
                    let redundant =
                        i != j && covers(other, alt) && (alt.len() > other.len() || j < i);
                    if redundant {
                        warn(format!(
                            "Relationship anyOf alternative {i} is covered by alternative {j}; remove it"
                        ));
                        break;
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
    fn a_repeated_pin_warns() {
        let g = graph(
            vec![],
            vec![rel(json!({"isEmphasized": true,
                "anyOf": [{"isSelected": true, "isEmphasized": true}, {"isIndeterminate": true}]}))],
        );
        let d = run(&g);
        assert_eq!(d.len(), 1);
        assert!(d[0].message.contains("isEmphasized"));
    }

    #[test]
    fn a_covered_alternative_warns_once_and_equal_ones_keep_the_first() {
        let g = graph(
            vec![],
            vec![
                rel(
                    json!({"anyOf": [{"isSelected": true}, {"isSelected": true, "isDisabled": true}]}),
                ),
                rel(json!({"anyOf": [{"isSelected": true}, {"isSelected": true}]})),
            ],
        );
        let d = run(&g);
        assert_eq!(d.len(), 2);
        assert!(d[0]
            .message
            .contains("alternative 1 is covered by alternative 0"));
        assert!(d[1]
            .message
            .contains("alternative 1 is covered by alternative 0"));
    }

    #[test]
    fn independent_alternatives_pass() {
        let g = graph(
            vec![],
            vec![rel(json!({"isEmphasized": true,
                "anyOf": [{"isSelected": true}, {"isIndeterminate": true, "isDisabled": true}]}))],
        );
        assert!(run(&g).is_empty());
    }
}
