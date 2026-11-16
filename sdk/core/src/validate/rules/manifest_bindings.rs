// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `MANIFEST-001`: a platform-owned recipe binds a token or relationship the data does not have.
//!
//! Reported only by `design-data validate-manifest`; it is not in the rule registry, so
//! `validate` and foundation CI are unchanged. SPEC-076 and SPEC-079 stay warnings.
//!
//! A binding passes when it resolves for at least one option combination: the selector
//! `{style}` placeholders expand over every declared value, and a pin such as
//! `isSelected: true` still counts. Only a binding that resolves for none, in any size or mode,
//! is reported. Whether every combination resolves is `render --strict`'s question.

use std::collections::BTreeMap;
use std::collections::HashMap;
use std::path::PathBuf;

use serde_json::Value;

use crate::graph::{Layer, TokenGraph};
use crate::visual::compile_recipe;

pub const RULE_ID: &str = "MANIFEST-001";

const COLOR_SCHEMES: [&str; 2] = ["light", "dark"];
const SCALES: [&str; 2] = ["desktop", "mobile"];

/// One binding in a platform-owned recipe that resolves to nothing.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct UnresolvedBinding {
    pub file: PathBuf,
    pub component: String,
    /// Where the binding sits in the compiled recipe, for example `/label/props/fill/0`.
    pub path: String,
    /// The renderer's own wording, for example `fill: no relationship 'color' / 'Dot'`.
    pub miss: String,
}

impl UnresolvedBinding {
    pub fn message(&self) -> String {
        format!(
            "{RULE_ID} (validate-manifest): platform recipe for '{}' binds nothing the data has: {} \
             (at {}, in {})",
            self.component,
            self.miss,
            self.path,
            self.file.display()
        )
    }
}

/// Every binding of a platform-owned recipe (`Layer::Platform`) in `graph`, which must already
/// have the manifest applied, that resolves for no size, mode or option combination.
pub fn unresolved_platform_bindings(graph: &TokenGraph) -> Vec<UnresolvedBinding> {
    let modes: Vec<HashMap<String, String>> = COLOR_SCHEMES
        .iter()
        .flat_map(|cs| {
            SCALES.iter().map(move |scale| {
                HashMap::from([
                    ("colorScheme".to_string(), (*cs).to_string()),
                    ("scale".to_string(), (*scale).to_string()),
                ])
            })
        })
        .collect();
    let mut out = Vec::new();
    for v in graph.visuals.iter().filter(|v| v.layer == Layer::Platform) {
        // A recipe that does not compile at all is SPEC-079's and SPEC-082's to report.
        let Ok(compiled) = compile_recipe(graph, &v.raw, &v.component, &modes) else {
            continue;
        };
        let Some(variants) = compiled.get("variants").and_then(Value::as_object) else {
            continue;
        };
        // path -> (miss text, resolved in at least one variant)
        let mut seen: BTreeMap<String, (String, bool)> = BTreeMap::new();
        for variant in variants.values() {
            collect(variant, String::new(), &mut seen);
        }
        for (path, (miss, resolved)) in seen {
            if !resolved {
                out.push(UnresolvedBinding {
                    file: v.file.clone(),
                    component: v.component.clone(),
                    path,
                    miss,
                });
            }
        }
    }
    out
}

fn collect(value: &Value, path: String, seen: &mut BTreeMap<String, (String, bool)>) {
    match value {
        Value::Object(map) => {
            if let (Some(Value::Array(cands)), Some(Value::String(miss))) =
                (map.get("candidates"), map.get("miss"))
            {
                let entry = seen.entry(path.clone()).or_insert((miss.clone(), false));
                entry.1 |= !cands.is_empty();
            }
            for (k, v) in map {
                collect(v, format!("{path}/{k}"), seen);
            }
        }
        Value::Array(items) => {
            for (i, v) in items.iter().enumerate() {
                collect(v, format!("{path}/{i}"), seen);
            }
        }
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use serde_json::{json, Value};

    use super::unresolved_platform_bindings;
    use crate::graph::{Layer, TokenGraph, VisualRecord};
    use crate::validate::rules::visual_util::test_util::{graph, token};

    fn recipe(binding: Value) -> Value {
        json!({ "component": "button", "root": "container", "sizeScale": { "m": 100 },
            "parts": { "container": { "kind": "box", "props": { "fill": binding } } } })
    }

    fn with_platform_recipe(binding: Value) -> TokenGraph {
        let mut g = graph(
            json!({ "name": "button", "options": {
                "style": { "type": "string", "default": "a", "values": [
                    { "value": "a" }, { "value": "b" }] },
                "isSelected": { "type": "boolean", "default": false } } }),
            vec![
                json!({ "scope": { "component": "button", "property": "color" },
                    "context": "Control", "$ref": "c" }),
                json!({ "scope": { "component": "button", "property": "color",
                    "options": { "isSelected": true } },
                    "context": "Selected control", "$ref": "c" }),
                json!({ "scope": { "component": "button", "property": "color" },
                    "context": "Fill a", "$ref": "c" }),
            ],
            vec![token("c", json!({ "property": "color" }), None)],
            vec![],
        );
        g.visuals.push(VisualRecord {
            component: "button".into(),
            file: "extensions/visuals/button.json".into(),
            raw: recipe(binding),
            layer: Layer::Platform,
        });
        g
    }

    fn rel(property: &str, context: &str) -> Value {
        json!({ "relationship": { "property": property, "context": context } })
    }

    #[test]
    fn passes_a_binding_the_data_has() {
        let g = with_platform_recipe(rel("color", "Control"));
        assert!(unresolved_platform_bindings(&g).is_empty());
    }

    #[test]
    fn reports_a_context_the_data_does_not_have() {
        let g = with_platform_recipe(rel("color", "BogusContext"));
        let out = unresolved_platform_bindings(&g);
        assert_eq!(out.len(), 1, "{out:?}");
        assert!(out[0].miss.contains("'color' / 'BogusContext'"), "{out:?}");
        assert!(out[0]
            .message()
            .contains("MANIFEST-001 (validate-manifest)"));
    }

    #[test]
    fn passes_a_binding_pinned_to_one_option_value() {
        let g = with_platform_recipe(rel("color", "Selected control"));
        assert!(unresolved_platform_bindings(&g).is_empty());
    }

    #[test]
    fn passes_a_placeholder_that_resolves_for_one_declared_value() {
        // "Fill a" exists, "Fill b" does not: one combination is enough.
        let g = with_platform_recipe(rel("color", "Fill {style}"));
        assert!(unresolved_platform_bindings(&g).is_empty());
    }

    #[test]
    fn reports_a_token_selector_that_matches_nothing() {
        let g = with_platform_recipe(json!({ "token": { "property": "no-such-property" } }));
        let out = unresolved_platform_bindings(&g);
        assert_eq!(out.len(), 1, "{out:?}");
        assert!(out[0].miss.contains("no token matches"), "{out:?}");
    }

    #[test]
    fn ignores_foundation_recipes() {
        let mut g = with_platform_recipe(rel("color", "BogusContext"));
        g.visuals[0].layer = Layer::Foundation;
        assert!(unresolved_platform_bindings(&g).is_empty());
    }
}
