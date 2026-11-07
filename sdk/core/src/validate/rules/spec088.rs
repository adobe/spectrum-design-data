// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-088: relationship-duplicate-record
//!
//! Two relationship records in the same file with equal scope, context and `$ref` (or
//! inline value) are an exact duplicate: the second adds nothing and makes a changelog
//! pair the records ambiguously. Scale-counterpart pairs are SPEC-072.
//!
//! Warning: a repeat is harmless to resolution, only redundant.

use std::collections::HashSet;

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-088"
    }

    fn name(&self) -> &'static str {
        "relationship-duplicate-record"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        let mut seen: HashSet<(String, String, String, String)> = HashSet::new();
        for rel in &ctx.graph.relationships {
            let raw = &rel.raw;
            let scope = raw.get("scope").map(Value::to_string).unwrap_or_default();
            let context = raw.get("context").and_then(Value::as_str).unwrap_or("");
            let target = match raw.get("$ref").and_then(Value::as_str) {
                Some(r) => r.to_string(),
                None => raw.get("value").map(Value::to_string).unwrap_or_default(),
            };
            let file = rel.file.display().to_string();
            if seen.insert((file, scope.clone(), context.to_string(), target.clone())) {
                continue;
            }
            out.push(Diagnostic {
                file: rel.file.clone(),
                token: None,
                rule_id: Some(self.id().to_string()),
                severity: Severity::Warning,
                message: format!(
                    "Relationship {scope} (context '{context}') repeats an earlier record with the same {}; remove the duplicate",
                    if raw.get("$ref").is_some() { "$ref" } else { "value" }
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
    use crate::validate::rules::spec088::Rule;

    fn rel(file: &str, index: usize, raw: Value) -> RelationshipRecord {
        RelationshipRecord {
            file: PathBuf::from(file),
            index,
            uuid: raw.get("uuid").and_then(Value::as_str).map(String::from),
            raw,
        }
    }

    fn rec(uuid: &str, context: &str, target: &str) -> Value {
        json!({
            "scope": {"component": "tag", "property": "gap"},
            "context": context,
            "$ref": target,
            "uuid": uuid
        })
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
    fn a_repeat_that_differs_only_by_uuid_warns() {
        let n = run(vec![
            rel("tag.json", 0, rec("u1", "Spacing", "t")),
            rel("tag.json", 1, rec("u2", "Spacing", "t")),
        ]);
        assert_eq!(n, 1);
    }

    #[test]
    fn another_ref_context_or_file_is_not_a_duplicate() {
        let n = run(vec![
            rel("tag.json", 0, rec("u1", "Spacing", "t")),
            rel("tag.json", 1, rec("u2", "Spacing", "other")),
            rel("tag.json", 2, rec("u3", "Gap", "t")),
            rel("badge.json", 0, rec("u4", "Spacing", "t")),
        ]);
        assert_eq!(n, 0);
    }

    #[test]
    fn inline_values_are_compared_by_value() {
        let inline = |u: &str, v: i32| json!({"scope": {"component": "tag", "property": "gap"}, "value": v, "uuid": u});
        let n = run(vec![
            rel("tag.json", 0, inline("u1", 1)),
            rel("tag.json", 1, inline("u2", 1)),
            rel("tag.json", 2, inline("u3", 2)),
        ]);
        assert_eq!(n, 1);
    }
}
