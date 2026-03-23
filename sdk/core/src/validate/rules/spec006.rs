// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use std::collections::HashMap;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-006"
    }

    fn name(&self) -> &'static str {
        "specificity-correctness"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut by_name_key: HashMap<String, Vec<&crate::graph::TokenRecord>> = HashMap::new();
        for t in ctx.graph.tokens.values() {
            let Some(name_val) = t.raw.get("name") else {
                continue;
            };
            if !name_val.is_object() {
                continue;
            }
            let Ok(key) = serde_json::to_string(name_val) else {
                continue;
            };
            by_name_key.entry(key).or_default().push(t);
        }

        let mut out = Vec::new();
        for (key, group) in by_name_key {
            if group.len() < 2 {
                continue;
            }
            let first = group[0];
            out.push(Diagnostic {
                file: first.file.clone(),
                token: Some(first.name.clone()),
                rule_id: Some(self.id().to_string()),
                severity: Severity::Warning,
                message: format!(
                    "Ambiguous cascade resolution (specificity tie) for context {key}"
                ),
                instance_path: None,
                schema_path: None,
            });
        }
        out
    }
}
