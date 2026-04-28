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
        "SPEC-010"
    }

    fn name(&self) -> &'static str {
        "replaced-by-target-exists"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for t in ctx.graph.tokens.values() {
            let Some(replaced_by) = t.raw.get("replaced_by") else {
                continue;
            };

            let uuids: Vec<&str> = if let Some(s) = replaced_by.as_str() {
                vec![s]
            } else if let Some(arr) = replaced_by.as_array() {
                arr.iter().filter_map(|v| v.as_str()).collect()
            } else {
                continue;
            };

            for uuid in uuids {
                let exists = ctx
                    .graph
                    .tokens
                    .values()
                    .any(|other| other.uuid.as_deref() == Some(uuid));
                if !exists {
                    out.push(Diagnostic {
                        file: t.file.clone(),
                        token: Some(t.name.clone()),
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Error,
                        message: format!("replaced_by target UUID not found: {uuid}"),
                        instance_path: None,
                        schema_path: None,
                    });
                }
            }
        }
        out
    }
}
