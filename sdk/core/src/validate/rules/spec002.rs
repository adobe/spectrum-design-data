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
        "SPEC-002"
    }

    fn name(&self) -> &'static str {
        "alias-type-compatibility"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for t in ctx.graph.tokens.values() {
            let Some(target_name) = &t.alias_target else {
                continue;
            };
            let Some(target) = ctx.graph.tokens.get(target_name) else {
                continue;
            };
            let leaf = target.resolve_leaf(ctx.graph);

            // Conformance heuristic: spacing-like alias must not resolve to a color leaf.
            if name_suggests_spacing(&t.name)
                && is_color_schema(leaf.schema_url.as_deref().unwrap_or(""))
            {
                out.push(diagnostic(
                    self.id(),
                    t,
                    format!(
                        "Alias {} resolves to incompatible type (expected spacing-related, got color)",
                        t.name
                    ),
                ));
            }
        }
        out
    }
}

fn diagnostic(id: &str, t: &crate::graph::TokenRecord, message: String) -> Diagnostic {
    Diagnostic {
        file: t.file.clone(),
        token: Some(t.name.clone()),
        rule_id: Some(id.to_string()),
        severity: Severity::Error,
        message,
        instance_path: None,
        schema_path: None,
    }
}

fn is_color_schema(url: &str) -> bool {
    url.ends_with("color.json")
}

fn name_suggests_spacing(name: &str) -> bool {
    let n = name.to_ascii_lowercase();
    n.contains("spacing") || n.contains("spacing-alias")
}
