// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language

//! SPEC-107: relationship-item-position-valid
//!
//! A relationship's `scope.itemPosition` MUST be `first`, `middle`, `last` or `only`, and
//! `scope.part` MUST be the repeated part of a collection slot of the component, or a part
//! inside it (anatomy `contains`, at any depth).

use std::collections::HashSet;

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::scope::ITEM_POSITIONS;
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

/// The collection slots' parts and every part inside them.
fn item_parts(component: &Value) -> HashSet<&str> {
    let anatomy = component.get("anatomy").and_then(Value::as_array);
    let mut todo: Vec<&str> = component
        .get("slots")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter(|s| s.get("collection").is_some())
        .filter_map(|s| s.get("part")?.as_str())
        .collect();
    let mut out = HashSet::new();
    while let Some(p) = todo.pop() {
        if out.insert(p) {
            let kids = anatomy
                .into_iter()
                .flatten()
                .find(|a| a.get("name").and_then(Value::as_str) == Some(p))
                .and_then(|a| a.get("contains")?.as_array());
            todo.extend(kids.into_iter().flatten().filter_map(Value::as_str));
        }
    }
    out
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-107"
    }

    fn name(&self) -> &'static str {
        "relationship-item-position-valid"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for r in &ctx.graph.relationships {
            let Some(want) = r.raw.pointer("/scope/itemPosition") else {
                continue;
            };
            let problem = if !want.as_str().is_some_and(|p| ITEM_POSITIONS.contains(&p)) {
                Some(format!(
                    "itemPosition {want} is not first, middle, last or only"
                ))
            } else {
                let comp = r.raw.pointer("/scope/component").and_then(Value::as_str);
                let part = r.raw.pointer("/scope/part").and_then(Value::as_str);
                let Some(comp) = ctx
                    .graph
                    .components
                    .iter()
                    .find(|c| Some(c.name.as_str()) == comp)
                else {
                    continue; // SPEC-051 covers an undeclared component
                };
                match part {
                    Some(p) if item_parts(&comp.raw).contains(p) => None,
                    _ => Some(format!(
                        "scope.part {} is not the repeated part of a collection slot of '{}' or a part inside it",
                        part.map_or("(none)".to_string(), |p| format!("'{p}'")),
                        comp.name
                    )),
                }
            };
            if let Some(message) = problem {
                out.push(Diagnostic {
                    file: r.file.clone(),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Error,
                    message,
                    instance_path: Some("/scope/itemPosition".to_string()),
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
    use crate::validate::rules::spec107::Rule;

    fn run(scope: Value) -> Vec<String> {
        let mut g = TokenGraph::default();
        g.components.push(ComponentRecord {
            name: "list".into(),
            file: PathBuf::from("components/list.json"),
            raw: json!({
                "name": "list",
                "anatomy": [
                    { "name": "row", "contains": ["icon"] },
                    { "name": "icon" },
                    { "name": "header" }
                ],
                "slots": [{ "name": "default", "part": "row", "collection": "items" }]
            }),
            layer: Layer::Foundation,
        });
        g.relationships.push(RelationshipRecord {
            uuid: None,
            index: 0,
            file: PathBuf::from("relationships/list.json"),
            raw: json!({ "scope": scope }),
        });
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest: None,
        };
        Rule.validate(&ctx).into_iter().map(|d| d.message).collect()
    }

    #[test]
    fn the_repeated_part_and_parts_inside_it_pass() {
        for part in ["row", "icon"] {
            let s = json!({ "component": "list", "part": part, "itemPosition": "only" });
            assert!(run(s).is_empty(), "{part}");
        }
    }

    #[test]
    fn other_parts_no_part_and_bad_values_error() {
        let m = run(json!({ "component": "list", "part": "header", "itemPosition": "first" }));
        assert_eq!(m.len(), 1, "{m:?}");
        assert!(run(json!({ "component": "list", "itemPosition": "last" }))[0].contains("(none)"));
        let m = run(json!({ "component": "list", "part": "row", "itemPosition": "top" }));
        assert!(m[0].contains("not first, middle, last or only"), "{m:?}");
    }

    #[test]
    fn a_record_without_it_is_ignored() {
        assert!(run(json!({ "component": "list", "part": "header" })).is_empty());
    }
}
