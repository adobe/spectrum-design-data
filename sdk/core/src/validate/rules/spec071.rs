// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-071: visual-relationship-contexts-used
//!
//! Informational. Reports how many of a component's relationship contexts the
//! visual recipe never binds. Unused contexts are not errors (relationships
//! describe the component beyond its recipe); the count shows how much of the
//! component's token data a recipe still has to cover.

use std::collections::BTreeSet;

use serde_json::Value;

use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::{
    component_of, component_relationships, expand_selector, info, size_entries, walk_objects,
};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-071"
    }

    fn name(&self) -> &'static str {
        "visual-relationship-contexts-used"
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
            let mut used: BTreeSet<String> = BTreeSet::new();
            walk_objects(parts, "/parts", &mut |_, node| {
                if let Some(sel) = node.get("relationship").filter(|r| r.is_object()) {
                    for e in expand_selector(sel, &sizes) {
                        if let Some(c) = e.get("context").and_then(Value::as_str) {
                            used.insert(c.trim().to_string());
                        }
                    }
                }
            });
            let all: BTreeSet<String> = component_relationships(ctx.graph, &v.component)
                .into_iter()
                .filter_map(|r| r.context)
                .collect();
            let unused: Vec<&String> = all.iter().filter(|c| !used.contains(*c)).collect();
            if all.is_empty() || unused.is_empty() {
                continue;
            }
            let sample: Vec<String> = unused.iter().take(3).map(|c| format!("'{c}'")).collect();
            out.push(info(
                self.id(),
                v,
                "/parts",
                format!(
                    "{} of {} relationship contexts of '{}' have no binding in this recipe, for example {}",
                    unused.len(),
                    all.len(),
                    v.component,
                    sample.join(", ")
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
    use crate::report::Severity;
    use crate::validate::rules::visual_util::test_util::{graph, run, token};

    #[test]
    fn counts_unbound_contexts_as_info() {
        let rels = vec![
            json!({"scope": {"component": "switch", "property": "color"}, "context": "Control", "$ref": "t1"}),
            json!({"scope": {"component": "switch", "property": "color"}, "context": "Label", "$ref": "t1"}),
        ];
        let g = graph(
            json!({"name": "switch"}),
            rels,
            vec![token("t1", json!({"property": "color"}), None)],
            vec![(
                "switch",
                json!({"component": "switch", "root": "r", "parts": {"r": {"kind": "box", "props": {"fill": {"relationship": {"property": "color", "context": "Control"}}}}}}),
            )],
        );
        let d = run(&Rule, &g);
        assert_eq!(d.len(), 1);
        assert_eq!(d[0].severity, Severity::Info);
        assert!(d[0].message.starts_with("1 of 2"));
    }
}
