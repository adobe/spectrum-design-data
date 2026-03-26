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
        "SPEC-004"
    }

    fn name(&self) -> &'static str {
        "uuid-global-uniqueness"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut by_uuid: HashMap<&str, Vec<&crate::graph::TokenRecord>> = HashMap::new();
        for t in ctx.graph.tokens.values() {
            let Some(u) = t.uuid.as_deref() else {
                continue;
            };
            by_uuid.entry(u).or_default().push(t);
        }

        let mut out = Vec::new();
        for (uuid, group) in by_uuid {
            if group.len() < 2 {
                continue;
            }
            for t in group {
                out.push(Diagnostic {
                    file: t.file.clone(),
                    token: Some(t.name.clone()),
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Error,
                    message: format!("Duplicate uuid {uuid}"),
                    instance_path: None,
                    schema_path: None,
                });
            }
        }
        out
    }
}
