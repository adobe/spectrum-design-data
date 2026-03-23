// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-003"
    }

    fn name(&self) -> &'static str {
        "no-circular-aliases"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for start in ctx.graph.tokens.values() {
            if start.alias_target.is_none() {
                continue;
            }
            let mut path: Vec<String> = vec![start.name.clone()];
            let mut current = start;
            loop {
                let Some(next_name) = current.alias_target.as_ref() else {
                    break;
                };
                if path.iter().any(|p| p == next_name) {
                    out.push(Diagnostic {
                        file: start.file.clone(),
                        token: Some(start.name.clone()),
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Error,
                        message: format!("Circular alias chain detected involving {}", start.name),
                        instance_path: None,
                        schema_path: None,
                    });
                    break;
                }
                path.push(next_name.clone());
                let Some(next) = ctx.graph.tokens.get(next_name.as_str()) else {
                    break;
                };
                current = next;
            }
        }
        out
    }
}
