// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-101: relationship-scope-vocabulary
//!
//! The descriptive fields of a relationship `scope` take their values from the registries that
//! back the same-named name-object fields: `object`, `position`, `structure`, `qualifier` and
//! `icon` each name a registry term, and `between.from` / `between.to` resolve like a
//! space-between endpoint (SPEC-047): a position, a generic anatomy term, or an anatomy part
//! the component declares. When no component catalog is loaded, an endpoint that fails the
//! registry-only check is deferred, as in SPEC-047.
//!
//! Warning, held at a baseline by `tests/recipe_lint_baseline.rs`.

use std::collections::HashSet;

use serde_json::Value;

use super::spec047::endpoint_resolves;
use crate::report::{Diagnostic, Severity};
use crate::scope::DESCRIPTIVE_FIELDS;
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-101"
    }

    fn name(&self) -> &'static str {
        "relationship-scope-vocabulary"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let components = super::component_map(ctx.graph);
        let positions = ctx.registry.for_field("position");
        let anatomy = ctx.registry.for_field("anatomy");
        let mut out = Vec::new();
        for rel in &ctx.graph.relationships {
            let Some(scope) = rel.raw.get("scope").and_then(Value::as_object) else {
                continue;
            };
            let component = scope.get("component").and_then(Value::as_str);
            let mut bad: Vec<(String, &str)> = Vec::new();
            for field in DESCRIPTIVE_FIELDS {
                let Some(value) = scope.get(*field).and_then(Value::as_str) else {
                    continue;
                };
                if let Some(vocab) = ctx.registry.for_field(field) {
                    if !vocab.contains(value) {
                        bad.push((format!("scope.{field}"), value));
                    }
                }
            }
            if let Some(between) = scope.get("between").and_then(Value::as_object) {
                let declared: HashSet<&str> = component
                    .and_then(|c| components.get(c))
                    .and_then(|c| c.raw.get("anatomy"))
                    .and_then(Value::as_array)
                    .map(|a| {
                        a.iter()
                            .filter_map(|p| p.get("name").and_then(Value::as_str))
                            .collect()
                    })
                    .unwrap_or_default();
                for end in ["from", "to"] {
                    let Some(value) = between.get(end).and_then(Value::as_str) else {
                        continue;
                    };
                    if endpoint_resolves(value, positions, anatomy, &declared) {
                        continue;
                    }
                    if ctx.graph.components.is_empty() && component.is_some() {
                        continue;
                    }
                    bad.push((format!("scope.between.{end}"), value));
                }
            }
            for (path, value) in bad {
                out.push(Diagnostic {
                    file: rel.file.clone(),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Warning,
                    message: format!(
                        "Relationship record {} has {path} '{value}', which is not in the vocabulary for that field",
                        rel.index
                    ),
                    instance_path: Some(format!("/{}/{}", rel.index, path.replace('.', "/"))),
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

    fn run(scope_extra: Value) -> Vec<String> {
        let mut g = TokenGraph::from_records(vec![]);
        g.components = vec![ComponentRecord {
            name: "x".into(),
            file: PathBuf::from("components/x.json"),
            raw: json!({"name": "x", "anatomy": [{"name": "control"}, {"name": "label"}]}),
            layer: Layer::Foundation,
        }];
        let mut raw = json!({"scope": {"component": "x", "property": "gap"}, "$ref": "t"});
        for (k, v) in scope_extra.as_object().unwrap() {
            raw["scope"][k] = v.clone();
        }
        g.relationships = vec![RelationshipRecord {
            file: PathBuf::from("relationships/x.json"),
            index: 0,
            uuid: None,
            raw,
        }];
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
    fn registered_values_and_declared_parts_pass() {
        let n = run(json!({
            "between": {"from": "top", "to": "control"},
            "object": "background", "position": "top", "structure": "base"
        }));
        assert!(n.is_empty(), "{n:?}");
    }

    #[test]
    fn qualifier_and_icon_are_checked_against_their_registries() {
        let r = RegistryData::embedded();
        let q = r
            .for_field("qualifier")
            .expect("qualifier registry")
            .iter()
            .next()
            .unwrap()
            .clone();
        let i = r
            .for_field("icon")
            .expect("icon registry")
            .iter()
            .next()
            .unwrap()
            .clone();
        assert!(run(json!({"qualifier": q, "icon": i})).is_empty());
        assert_eq!(run(json!({"qualifier": "nope", "icon": "nope"})).len(), 2);
    }

    #[test]
    fn a_one_ended_between_is_checked_on_the_end_it_has() {
        assert!(run(json!({"between": {"from": "top"}})).is_empty());
        assert_eq!(run(json!({"between": {"to": "nope"}})).len(), 1);
    }

    #[test]
    fn unknown_values_warn_once_each() {
        let n = run(json!({
            "between": {"from": "nope", "to": "label"},
            "object": "not-an-object", "position": "not-a-position"
        }));
        assert_eq!(n.len(), 3, "{n:?}");
        assert!(n.iter().any(|m| m.contains("scope.between.from 'nope'")));
    }
}
