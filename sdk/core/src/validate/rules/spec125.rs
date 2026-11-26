// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language

//! SPEC-125: relationship-ordinal-valid
//!
//! A relationship's `scope.ordinal` MUST be an integer of 1 or more.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-125"
    }

    fn name(&self) -> &'static str {
        "relationship-ordinal-valid"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        ctx.graph
            .relationships
            .iter()
            .filter_map(|r| {
                let v = r.raw.pointer("/scope/ordinal")?;
                v.as_u64().is_none_or(|n| n < 1).then(|| Diagnostic {
                    file: r.file.clone(),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Error,
                    message: format!("scope.ordinal {v} is not an integer of 1 or more"),
                    instance_path: Some("/scope/ordinal".to_string()),
                    schema_path: None,
                })
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::{json, Value};

    use crate::graph::{RelationshipRecord, TokenGraph};
    use crate::registry::RegistryData;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec125::Rule;

    fn run(scope: Value) -> usize {
        let mut g = TokenGraph::default();
        g.relationships.push(RelationshipRecord {
            uuid: None,
            index: 0,
            file: PathBuf::from("relationships/a.json"),
            raw: json!({ "scope": scope }),
        });
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
    fn a_positive_integer_or_no_ordinal_passes() {
        assert_eq!(run(json!({ "property": "x", "ordinal": 1 })), 0);
        assert_eq!(run(json!({ "property": "x", "ordinal": 3 })), 0);
        assert_eq!(run(json!({ "property": "x" })), 0);
    }

    #[test]
    fn zero_negative_fractional_and_non_numbers_error() {
        for bad in [json!(0), json!(-1), json!(1.5), json!("1"), json!(null)] {
            assert_eq!(run(json!({ "property": "x", "ordinal": bad })), 1, "{bad}");
        }
    }
}
