// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-092: relationship-live-record-has-context
//!
//! A recipe binds a relationship on `(property, context)`, so a live record with no
//! `context` can only be reached through an alias chain: a contexted record whose `$ref`
//! is the record's `uuid`, directly or through other records. A live record with no
//! context that no contexted record reaches is unaddressable and should get a context.
//! Deprecated records are exempt.
//!
//! Warning, held at a baseline by `tests/recipe_lint_baseline.rs`.

use std::collections::{HashMap, HashSet};

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

fn has_context(raw: &Value) -> bool {
    raw.get("context")
        .and_then(Value::as_str)
        .is_some_and(|c| !c.trim().is_empty())
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-092"
    }

    fn name(&self) -> &'static str {
        "relationship-live-record-has-context"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let rels = &ctx.graph.relationships;
        let by_uuid: HashMap<&str, &Value> = rels
            .iter()
            .filter_map(|r| Some((r.uuid.as_deref()?, &r.raw)))
            .collect();
        let mut reached: HashSet<&str> = HashSet::new();
        for rel in rels.iter().filter(|r| has_context(&r.raw)) {
            let mut next = rel.raw.get("$ref").and_then(Value::as_str);
            while let Some(uuid) = next {
                if !by_uuid.contains_key(uuid) || !reached.insert(uuid) {
                    break;
                }
                next = by_uuid[uuid].get("$ref").and_then(Value::as_str);
            }
        }
        let mut out = Vec::new();
        for rel in rels {
            let raw = &rel.raw;
            let deprecated = raw
                .get("lifecycle")
                .and_then(|l| l.get("deprecatedIn"))
                .is_some_and(|d| !d.is_null());
            if deprecated
                || has_context(raw)
                || rel.uuid.as_deref().is_some_and(|u| reached.contains(u))
            {
                continue;
            }
            out.push(Diagnostic {
                file: rel.file.clone(),
                token: None,
                rule_id: Some(self.id().to_string()),
                severity: Severity::Warning,
                message: format!(
                    "Relationship {} has no context and no contexted record references it; add a context so a recipe can bind it",
                    raw.get("scope").map(Value::to_string).unwrap_or_default()
                ),
                instance_path: Some(format!("/{}", rel.index)),
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

    use crate::graph::{RelationshipRecord, TokenGraph};
    use crate::registry::RegistryData;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec092::Rule;

    fn rec(i: usize, uuid: &str, extra: Value) -> RelationshipRecord {
        let mut raw = json!({"scope": {"component": "tag", "property": "gap"}, "uuid": uuid});
        for (k, v) in extra.as_object().unwrap() {
            raw[k] = v.clone();
        }
        RelationshipRecord {
            file: PathBuf::from("tag.json"),
            index: i,
            uuid: Some(uuid.into()),
            raw,
        }
    }

    fn run(records: Vec<RelationshipRecord>) -> usize {
        let mut g = TokenGraph::from_records(vec![]);
        g.relationships = records;
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
    fn an_unreferenced_live_record_without_context_warns() {
        assert_eq!(run(vec![rec(0, "a", json!({"$ref": "t"}))]), 1);
    }

    #[test]
    fn a_contexted_alias_chain_covers_the_records_it_reaches() {
        let n = run(vec![
            rec(0, "a", json!({"context": "Spacing", "$ref": "b"})),
            rec(1, "b", json!({"$ref": "c"})),
            rec(2, "c", json!({"$ref": "t"})),
        ]);
        assert_eq!(n, 0);
    }

    #[test]
    fn a_context_less_referrer_does_not_cover() {
        let n = run(vec![
            rec(0, "a", json!({"$ref": "b"})),
            rec(1, "b", json!({"$ref": "t"})),
        ]);
        assert_eq!(n, 2);
    }

    #[test]
    fn deprecated_and_contexted_records_are_exempt() {
        let n = run(vec![
            rec(
                0,
                "a",
                json!({"lifecycle": {"deprecatedIn": "3.0.0"}, "$ref": "t"}),
            ),
            rec(1, "b", json!({"context": "Spacing", "$ref": "t"})),
        ]);
        assert_eq!(n, 0);
    }

    #[test]
    fn a_cycle_terminates() {
        let n = run(vec![
            rec(0, "a", json!({"context": "Spacing", "$ref": "b"})),
            rec(1, "b", json!({"$ref": "a"})),
        ]);
        assert_eq!(n, 0);
    }
}
