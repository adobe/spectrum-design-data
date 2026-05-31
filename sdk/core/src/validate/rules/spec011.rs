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
        "SPEC-011"
    }

    fn name(&self) -> &'static str {
        "replaced-by-array-requires-comment"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for t in ctx.graph.tokens.values() {
            let Some(replaced_by) = t.raw.get("replaced_by") else {
                continue;
            };
            if !replaced_by.is_array() {
                continue;
            }
            let has_comment = t
                .raw
                .get("deprecated_comment")
                .and_then(|v| v.as_str())
                .is_some_and(|s| !s.is_empty());
            if !has_comment {
                out.push(Diagnostic {
                    file: t.file.clone(),
                    token: Some(t.name.clone()),
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Error,
                    message: format!(
                        "replaced_by is an array but deprecated_comment is missing on token {}",
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
