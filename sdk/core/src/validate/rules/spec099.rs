// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-099: relationship-any-of-legacy-key
//!
//! A relationship record that carries a `legacyKey` has a legacy token counterpart, and a legacy
//! token name cannot express an any-of (proposal 017). The legacy conversion skips such a record,
//! so its legacy token would vanish. A record that uses an any-of **MUST NOT** carry a
//! `legacyKey`.
//!
//! Error.

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-099"
    }

    fn name(&self) -> &'static str {
        "relationship-any-of-legacy-key"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        ctx.graph
            .relationships
            .iter()
            .filter(|rel| {
                rel.raw
                    .get("legacyKey")
                    .and_then(Value::as_str)
                    .is_some_and(|k| !k.is_empty())
                    && rel
                        .raw
                        .pointer("/scope/options")
                        .and_then(Value::as_object)
                        .is_some_and(crate::scope::uses_any_of)
            })
            .map(|rel| Diagnostic {
                file: rel.file.clone(),
                token: None,
                rule_id: Some(self.id().to_string()),
                severity: Severity::Error,
                message: format!(
                    "Relationship with legacyKey '{}' uses an anyOf; a legacy token cannot express it, so remove the legacyKey or the anyOf",
                    rel.raw.get("legacyKey").and_then(Value::as_str).unwrap_or_default()
                ),
                instance_path: Some(format!("/{}/scope/options", rel.index)),
                schema_path: None,
            })
            .collect()
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
    fn a_legacy_key_with_an_any_of_is_an_error() {
        let mut option_any_of = rel(json!({"anyOf": [{"a": true}, {"b": true}]}));
        option_any_of["legacyKey"] = json!("button-color");
        let mut state_any_of = rel(json!({"state": [{"anyOf": ["hover", "down"]}]}));
        state_any_of["legacyKey"] = json!("button-color-hover");
        let g = graph(vec![], vec![option_any_of, state_any_of]);
        assert_eq!(run(&g).len(), 2);
    }

    #[test]
    fn an_any_of_without_a_legacy_key_and_a_plain_legacy_key_pass() {
        let any_of = rel(json!({"anyOf": [{"a": true}, {"b": true}]}));
        let mut plain = rel(json!({"size": "m"}));
        plain["legacyKey"] = json!("button-color");
        let g = graph(vec![], vec![any_of, plain]);
        assert!(run(&g).is_empty());
    }
}
