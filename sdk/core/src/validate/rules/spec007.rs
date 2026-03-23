// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use crate::naming;
use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-007"
    }

    fn name(&self) -> &'static str {
        "name-roundtrip"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for t in ctx.graph.tokens.values() {
            let component_hint = t
                .raw
                .as_object()
                .and_then(|o| o.get("component"))
                .and_then(|v| v.as_str());

            if naming::roundtrips(&t.name, component_hint) {
                continue;
            }

            if ctx.naming_exceptions.contains(&t.name) {
                out.push(Diagnostic {
                    file: t.file.clone(),
                    token: Some(t.name.clone()),
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Info,
                    message: format!(
                        "Known naming exception: '{}' does not match canonical generation rules (tracked in naming-exceptions.json)",
                        t.name
                    ),
                    instance_path: None,
                    schema_path: None,
                });
            } else {
                out.push(Diagnostic {
                    file: t.file.clone(),
                    token: Some(t.name.clone()),
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Warning,
                    message: format!(
                        "Token '{}' does not roundtrip through name-object generation rules and is not in the exceptions allowlist",
                        t.name
                    ),
                    instance_path: None,
                    schema_path: None,
                });
            }
        }
        out
    }
}
