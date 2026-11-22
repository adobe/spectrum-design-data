// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-111: platform-deviation-property-set
//!
//! A deviation's `property`, when present with a `part`, SHOULD be a property the
//! effective recipe sets for that part. A deviation without a property is documentation and
//! is not checked; a part the recipe does not draw is SPEC-110's concern.

use std::path::PathBuf;

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::deviation_util::{entries, files, id};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-111"
    }

    fn name(&self) -> &'static str {
        "platform-deviation-property-set"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for (file, doc) in files(ctx.manifest) {
            let name = doc.get("component").and_then(Value::as_str).unwrap_or("");
            let Some(recipe) = ctx.graph.visual_recipe(name) else {
                continue;
            };
            for (i, entry) in entries(doc).enumerate() {
                let (Some(part), Some(property)) = (
                    entry.get("part").and_then(Value::as_str),
                    entry.get("property").and_then(Value::as_str),
                ) else {
                    continue;
                };
                let Some(drawn) = recipe.raw.get("parts").and_then(|p| p.get(part)) else {
                    continue;
                };
                if drawn.get("props").and_then(|p| p.get(property)).is_some() {
                    continue;
                }
                out.push(Diagnostic {
                    file: PathBuf::from(file),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Warning,
                    message: format!(
                        "Deviation '{}' of '{name}': part '{part}' has no '{property}' in the recipe",
                        id(entry)
                    ),
                    instance_path: Some(format!("/deviations/{i}/property")),
                    schema_path: None,
                });
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use serde_json::{json, Value};

    use super::Rule;
    use crate::graph::{Layer, TokenGraph, VisualRecord};
    use crate::registry::RegistryData;
    use crate::validate::rule::{ValidationContext, ValidationRule};

    fn run(entry: Value) -> usize {
        let g = TokenGraph::default().with_visuals(vec![VisualRecord {
            component: "switch".into(),
            file: "switch.json".into(),
            raw: json!({ "component": "switch",
                "parts": { "track": { "kind": "box", "props": { "fill": {} } } } }),
            layer: Layer::Foundation,
        }]);
        let m = json!({ "extensions": { "deviations": [{ "file": "switch.json", "deviations": {
            "component": "switch", "deviations": [entry] } }] } });
        let ex = std::collections::HashSet::new();
        Rule.validate(&ValidationContext {
            graph: &g,
            naming_exceptions: &ex,
            registry: RegistryData::embedded(),
            manifest: Some(&m),
        })
        .len()
    }

    #[test]
    fn warns_only_on_a_property_the_part_does_not_set() {
        assert_eq!(
            run(json!({ "id": "a", "part": "track", "property": "stroke" })),
            1
        );
        assert_eq!(
            run(json!({ "id": "a", "part": "track", "property": "fill" })),
            0
        );
        assert_eq!(run(json!({ "id": "a", "property": "stroke" })), 0);
        assert_eq!(run(json!({ "id": "a", "part": "track" })), 0);
    }
}
