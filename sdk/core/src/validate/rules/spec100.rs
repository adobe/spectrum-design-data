// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-100: relationship-options-mergeable
//!
//! Two or more records of one component that share `property`, `context` and `$ref` and
//! have the same pins except for one declared option say the same thing twice: one record
//! pinning an array (`size: ["m", "l"]`) says it once. Records with a `legacyKey` are
//! skipped, because each names a legacy token, and so are records that use an any-of.
//!
//! Warning, held at a baseline by `tests/recipe_lint_baseline.rs`.

use std::collections::BTreeMap;

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

const RESERVED: &[&str] = &["state", "scale", "colorScheme", crate::scope::ANY_OF];

/// Group key: the record's identity apart from one option, then that option's name.
type Key = (String, String, String, String, String, String);

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-100"
    }

    fn name(&self) -> &'static str {
        "relationship-options-mergeable"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let components = super::component_map(ctx.graph);
        let mut groups: BTreeMap<Key, Vec<(usize, &std::path::Path, Value)>> = BTreeMap::new();
        for rel in &ctx.graph.relationships {
            let raw = &rel.raw;
            if raw.get("legacyKey").is_some() {
                continue;
            }
            let (Some(component), Some(property), Some(target)) = (
                raw.pointer("/scope/component").and_then(Value::as_str),
                raw.pointer("/scope/property").and_then(Value::as_str),
                raw.get("$ref").and_then(Value::as_str),
            ) else {
                continue;
            };
            let Some(options) = raw.pointer("/scope/options").and_then(Value::as_object) else {
                continue;
            };
            if crate::scope::uses_any_of(options) {
                continue;
            }
            let declared = components
                .get(component)
                .and_then(|c| c.raw.get("options"))
                .and_then(Value::as_object);
            // Scope fields beyond component/property/options also identify a record.
            let identity: String = raw
                .pointer("/scope")
                .and_then(Value::as_object)
                .map(|s| {
                    s.iter()
                        .filter(|(k, _)| {
                            !["component", "property", "options"].contains(&k.as_str())
                        })
                        .map(|(k, v)| format!("|{k}={v}"))
                        .collect()
                })
                .unwrap_or_default();
            let context = raw.get("context").and_then(Value::as_str).unwrap_or("");
            for (name, value) in options {
                if RESERVED.contains(&name.as_str())
                    || !declared.is_some_and(|d| d.contains_key(name))
                {
                    continue;
                }
                let rest: BTreeMap<&String, &Value> =
                    options.iter().filter(|(k, _)| *k != name).collect();
                let key = (
                    component.to_string(),
                    property.to_string(),
                    context.to_string(),
                    target.to_string(),
                    name.clone(),
                    format!(
                        "{}{}",
                        serde_json::to_string(&rest).unwrap_or_default(),
                        identity
                    ),
                );
                groups
                    .entry(key)
                    .or_default()
                    .push((rel.index, rel.file.as_path(), value.clone()));
            }
        }

        let mut out = Vec::new();
        for (key, members) in groups {
            let mut values: Vec<String> = members.iter().map(|(_, _, v)| v.to_string()).collect();
            values.sort();
            values.dedup();
            if members.len() < 2 || values.len() < 2 {
                continue;
            }
            let (index, file, _) = &members[0];
            out.push(Diagnostic {
                file: file.to_path_buf(),
                token: None,
                rule_id: Some(self.id().to_string()),
                severity: Severity::Warning,
                message: format!(
                    "{} relationship records for '{}' / '{}' differ only in option '{}' ({}); merge them into one record that pins an array, or drop a record whose values another one covers",
                    members.len(),
                    key.1,
                    key.2,
                    key.4,
                    values.join(", ")
                ),
                instance_path: Some(format!("/{index}/scope/options/{}", key.4)),
                schema_path: None,
            });
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

    fn run(relationships: Vec<Value>) -> usize {
        let mut g = TokenGraph::from_records(vec![]);
        g.components = vec![ComponentRecord {
            name: "x".into(),
            file: PathBuf::from("components/x.json"),
            raw: json!({"name": "x", "options": {
                "size": {"type": "string", "values": [{"value": "s"}, {"value": "m"}, {"value": "l"}]},
                "isQuiet": {"type": "boolean"}}}),
            layer: Layer::Foundation,
        }];
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
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest: None,
        };
        Rule.validate(&ctx).len()
    }

    fn rel(options: Value, target: &str) -> Value {
        json!({"scope": {"component": "x", "property": "p", "options": options},
            "context": "C", "$ref": target})
    }

    #[test]
    fn records_differing_in_one_option_warn_once() {
        let n = run(vec![
            rel(json!({"size": "m"}), "t"),
            rel(json!({"size": "l"}), "t"),
            rel(json!({"size": ["s", "m"]}), "t"),
        ]);
        assert_eq!(n, 1);
    }

    #[test]
    fn different_tokens_other_pins_and_legacy_keys_do_not() {
        let mut legacy_a = rel(json!({"size": "m"}), "t");
        legacy_a["legacyKey"] = json!("a");
        let mut legacy_b = rel(json!({"size": "l"}), "t");
        legacy_b["legacyKey"] = json!("b");
        let n = run(vec![
            rel(json!({"size": "m"}), "t1"),
            rel(json!({"size": "l"}), "t2"),
            rel(json!({"size": "m", "isQuiet": true}), "t3"),
            rel(json!({"size": "l", "isQuiet": false}), "t3"),
            legacy_a,
            legacy_b,
            rel(json!({"size": "m", "extra": 1}), "t4"),
            rel(json!({"size": "l", "extra": 2}), "t4"),
        ]);
        assert_eq!(n, 0);
    }

    #[test]
    fn records_that_differ_in_another_scope_field_are_not_merged() {
        let mut a = rel(json!({"size": "m"}), "t");
        a["scope"]["between"] = json!({"from": "top", "to": "control"});
        let mut b = rel(json!({"size": "l"}), "t");
        b["scope"]["between"] = json!({"from": "top", "to": "label"});
        assert_eq!(run(vec![a, b]), 0);
    }

    #[test]
    fn an_undeclared_option_and_an_any_of_are_skipped() {
        let n = run(vec![
            rel(json!({"emphasis": "a"}), "t"),
            rel(json!({"emphasis": "b"}), "t"),
            rel(json!({"anyOf": [{"isQuiet": true}, {"size": "s"}]}), "u"),
            rel(json!({"anyOf": [{"isQuiet": true}, {"size": "m"}]}), "u"),
        ]);
        assert_eq!(n, 0);
    }
}
