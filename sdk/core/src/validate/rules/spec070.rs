// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-070: visual-ring-names-agree
//!
//! Recipes SHOULD give the focus ring part (`kind: "ring"`) the same name. A
//! shared name lets tools, relationships and docs treat the focus ring alike
//! across components; this rule reports the disagreement, not which name wins.

use std::collections::BTreeSet;

use serde_json::Value;

use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::warning;

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-070"
    }

    fn name(&self) -> &'static str {
        "visual-ring-names-agree"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        if ctx.graph.components.is_empty() {
            return vec![];
        }
        let mut rings = Vec::new();
        for v in &ctx.graph.visuals {
            let Some(parts) = v.raw.get("parts").and_then(Value::as_object) else {
                continue;
            };
            for (name, def) in parts {
                if def.get("kind").and_then(Value::as_str) == Some("ring") {
                    rings.push((v, name.clone()));
                }
            }
        }
        let names: BTreeSet<&String> = rings.iter().map(|(_, n)| n).collect();
        let mut out = Vec::new();
        if names.len() < 2 {
            return out;
        }
        for (v, name) in &rings {
            let others: Vec<String> = names
                .iter()
                .filter(|n| **n != name)
                .map(|n| format!("'{n}'"))
                .collect();
            out.push(warning(
                self.id(),
                v,
                &format!("/parts/{name}"),
                format!(
                    "Focus ring part is named '{name}' here but {} in other recipes; recipes should name it alike",
                    others.join(" and ")
                ),
            ));
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::Rule;
    use crate::validate::rules::visual_util::test_util::{graph, run};

    fn recipe(component: &str, ring: &str) -> (String, serde_json::Value) {
        (
            component.to_string(),
            json!({"component": component, "root": "r", "parts": {"r": {"kind": "box"}, ring: {"kind": "ring"}}}),
        )
    }

    fn d(rings: &[(&str, &str)]) -> Vec<crate::report::Diagnostic> {
        let owned: Vec<_> = rings.iter().map(|(c, r)| recipe(c, r)).collect();
        let g = graph(
            json!({"name": "switch"}),
            vec![],
            vec![],
            owned.iter().map(|(c, r)| (c.as_str(), r.clone())).collect(),
        );
        run(&Rule, &g)
    }

    #[test]
    fn differing_ring_names_warn_in_each_recipe() {
        let x = d(&[("button", "focus-ring"), ("switch", "focus-indicator")]);
        assert_eq!(x.len(), 2, "{x:?}");
    }

    #[test]
    fn matching_names_are_fine() {
        assert!(d(&[("button", "focus-ring"), ("switch", "focus-ring")]).is_empty());
    }
}
