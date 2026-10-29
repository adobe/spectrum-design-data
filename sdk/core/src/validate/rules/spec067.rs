// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-067: visual-prefers-relationship
//!
//! A `token` selector in a visual recipe SHOULD NOT bind a token that one of the
//! component's relationships already binds. Relationships carry the component
//! scope and the design-token group label, so a recipe binds through them by
//! default. Use a `token` selector only when no relationship covers the value.

use std::collections::BTreeSet;

use crate::graph::TokenRecord;
use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::{
    component_of, component_relationships, expand_selector, size_entries, tokens_matching,
    walk_objects, warning,
};

pub struct Rule;

fn same_token(a: &TokenRecord, b: &TokenRecord) -> bool {
    match (&a.uuid, &b.uuid) {
        (Some(x), Some(y)) => x == y,
        _ => std::ptr::eq(a, b),
    }
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-067"
    }

    fn name(&self) -> &'static str {
        "visual-prefers-relationship"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for v in &ctx.graph.visuals {
            if component_of(ctx.graph, v).is_none() {
                continue; // SPEC-060 covers undeclared component
            }
            let Some(parts) = v.raw.get("parts") else {
                continue;
            };
            let sizes = size_entries(&v.raw);
            let rels = component_relationships(ctx.graph, &v.component);
            walk_objects(parts, "/parts", &mut |path, node| {
                let Some(sel) = node.get("token").filter(|t| t.is_object()) else {
                    return;
                };
                let mut found: BTreeSet<String> = BTreeSet::new();
                for e in expand_selector(sel, &sizes) {
                    let Some(m) = e.as_object() else { continue };
                    let matched = tokens_matching(ctx.graph, m);
                    for r in &rels {
                        let Some(t) = r.token else { continue };
                        if matched.iter().any(|m| same_token(m, t)) {
                            let context = r.context.as_deref().unwrap_or("(no context)");
                            found.insert(format!("'{}' / '{context}'", r.property));
                        }
                    }
                }
                if found.is_empty() {
                    return;
                }
                let shown: Vec<_> = found.iter().take(3).cloned().collect();
                let more = found.len().saturating_sub(shown.len());
                let tail = if more > 0 {
                    format!(" and {more} more")
                } else {
                    String::new()
                };
                out.push(warning(
                    self.id(),
                    v,
                    &format!("{path}/token"),
                    format!(
                        "Token selector {} is also bound by relationship {}{tail}; bind it through the relationship",
                        sel,
                        shown.join(", ")
                    ),
                ));
            });
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::Rule;
    use crate::validate::rules::visual_util::test_util::{graph, run, token};

    fn data(
        recipe_binding: serde_json::Value,
        with_relationship: bool,
    ) -> Vec<crate::report::Diagnostic> {
        let rels = if with_relationship {
            vec![
                json!({"scope": {"component": "switch", "property": "color"}, "context": "Control", "$ref": "t1"}),
            ]
        } else {
            vec![]
        };
        let g = graph(
            json!({"name": "switch"}),
            rels,
            vec![token(
                "t1",
                json!({"property": "color", "variant": "neutral"}),
                None,
            )],
            vec![(
                "switch",
                json!({"component": "switch", "root": "r", "parts": {"r": {"kind": "box", "props": {"fill": recipe_binding}}}}),
            )],
        );
        run(&Rule, &g)
    }

    #[test]
    fn token_selector_covered_by_a_relationship_warns() {
        let d = data(
            json!({"token": {"property": "color", "variant": "neutral"}}),
            true,
        );
        assert_eq!(d.len(), 1, "{d:?}");
        assert!(d[0].message.contains("'color' / 'Control'"));
    }

    #[test]
    fn token_selector_without_a_relationship_is_fine() {
        assert!(data(
            json!({"token": {"property": "color", "variant": "neutral"}}),
            false
        )
        .is_empty());
    }

    #[test]
    fn relationship_binding_is_fine() {
        assert!(data(
            json!({"relationship": {"property": "color", "context": "Control"}}),
            true
        )
        .is_empty());
    }
}
