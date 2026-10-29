// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-069: visual-token-not-deprecated
//!
//! A `token` or `relationship` selector in a visual recipe SHOULD NOT resolve
//! only to deprecated tokens (`lifecycle.deprecatedIn`). Extends SPEC-058, which
//! checks relationship `$ref`s, to the bindings a recipe actually draws with.

use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::{
    component_of, component_relationships, expand_selector, is_deprecated, size_entries,
    tokens_matching, walk_objects, warning,
};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-069"
    }

    fn name(&self) -> &'static str {
        "visual-token-not-deprecated"
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
                let mut tokens = Vec::new();
                let mut what = String::new();
                let mut at = String::new();
                if let Some(sel) = node.get("token").filter(|t| t.is_object()) {
                    for e in expand_selector(sel, &sizes) {
                        if let Some(m) = e.as_object() {
                            tokens.extend(tokens_matching(ctx.graph, m));
                        }
                    }
                    what = format!("Token selector {sel}");
                    at = format!("{path}/token");
                } else if let Some(sel) = node.get("relationship").filter(|r| r.is_object()) {
                    for e in expand_selector(sel, &sizes) {
                        let property = e.get("property").and_then(serde_json::Value::as_str);
                        let context = e
                            .get("context")
                            .and_then(serde_json::Value::as_str)
                            .map(str::trim);
                        for r in &rels {
                            if Some(r.property.as_str()) == property
                                && r.context.as_deref() == context
                            {
                                tokens.extend(r.token);
                            }
                        }
                    }
                    what = format!("Relationship selector {sel}");
                    at = format!("{path}/relationship");
                }
                if tokens.is_empty() || !tokens.iter().all(|t| is_deprecated(t)) {
                    return;
                }
                let first = tokens[0];
                let since = first
                    .raw
                    .pointer("/lifecycle/deprecatedIn")
                    .and_then(serde_json::Value::as_str)
                    .unwrap_or("?");
                out.push(warning(
                    self.id(),
                    v,
                    &at,
                    format!(
                        "{what} resolves only to deprecated tokens (for example '{}', deprecated in {since})",
                        first.name
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

    fn d(deprecated: bool, binding: serde_json::Value) -> Vec<crate::report::Diagnostic> {
        let life = deprecated.then(|| json!({"deprecatedIn": "14.5.0"}));
        let g = graph(
            json!({"name": "switch"}),
            vec![
                json!({"scope": {"component": "switch", "property": "size"}, "context": "Handle", "$ref": "t1"}),
            ],
            vec![token(
                "t1",
                json!({"property": "size", "anatomy": "handle"}),
                life,
            )],
            vec![(
                "switch",
                json!({"component": "switch", "root": "r", "parts": {"r": {"kind": "box", "props": {"width": binding}}}}),
            )],
        );
        run(&Rule, &g)
    }

    #[test]
    fn deprecated_token_selector_warns() {
        let x = d(
            true,
            json!({"token": {"property": "size", "anatomy": "handle"}}),
        );
        assert_eq!(x.len(), 1, "{x:?}");
        assert!(x[0].message.contains("14.5.0"));
    }

    #[test]
    fn deprecated_relationship_target_warns() {
        assert_eq!(
            d(
                true,
                json!({"relationship": {"property": "size", "context": "Handle"}})
            )
            .len(),
            1
        );
    }

    #[test]
    fn current_tokens_are_fine() {
        assert!(d(
            false,
            json!({"token": {"property": "size", "anatomy": "handle"}})
        )
        .is_empty());
    }
}
