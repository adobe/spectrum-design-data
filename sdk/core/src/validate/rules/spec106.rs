// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-106: anatomy-part-component-valid
//!
//! An anatomy part's `component` MUST name a declared component that is not deprecated and is
//! not the component itself. Deprecated parts are skipped.

use std::collections::HashMap;

use serde_json::Value;

use crate::graph::ComponentRecord;
use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

fn deprecated(raw: &Value) -> bool {
    raw.pointer("/lifecycle/deprecatedIn")
        .and_then(Value::as_str)
        .is_some()
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-106"
    }

    fn name(&self) -> &'static str {
        "anatomy-part-component-valid"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let components: HashMap<&str, &ComponentRecord> = ctx
            .graph
            .components
            .iter()
            .map(|c| (c.name.as_str(), c))
            .collect();
        let mut out = Vec::new();
        for comp in &ctx.graph.components {
            let parts = comp.raw.get("anatomy").and_then(Value::as_array);
            for (i, part) in parts.into_iter().flatten().enumerate() {
                let Some(target) = part.get("component").and_then(Value::as_str) else {
                    continue;
                };
                if deprecated(part) {
                    continue;
                }
                let part_name = part.get("name").and_then(Value::as_str).unwrap_or("?");
                let problem = if target == comp.name {
                    "the component itself"
                } else {
                    match components.get(target) {
                        None => "not a declared component",
                        Some(t) if deprecated(&t.raw) => "deprecated",
                        Some(_) => continue,
                    }
                };
                out.push(Diagnostic {
                    file: comp.file.clone(),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Error,
                    message: format!(
                        "Part '{part_name}' of '{}' has component '{target}', which is {problem}",
                        comp.name
                    ),
                    instance_path: Some(format!("/anatomy/{i}/component")),
                    schema_path: None,
                });
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::{json, Value};

    use crate::graph::{ComponentRecord, Layer, TokenGraph};
    use crate::registry::RegistryData;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec106::Rule;

    fn component(name: &str, extra: Value) -> ComponentRecord {
        let mut raw = json!({ "name": name });
        raw.as_object_mut()
            .unwrap()
            .extend(extra.as_object().unwrap().clone());
        ComponentRecord {
            name: name.into(),
            file: PathBuf::from(format!("components/{name}.json")),
            raw,
            layer: Layer::Foundation,
        }
    }

    fn run(parts: Value) -> Vec<String> {
        let mut g = TokenGraph::default();
        g.components
            .push(component("host", json!({ "anatomy": parts })));
        g.components.push(component("chip", json!({})));
        g.components.push(component(
            "old",
            json!({ "lifecycle": { "deprecatedIn": "1.0.0" } }),
        ));
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest: None,
        };
        Rule.validate(&ctx).into_iter().map(|d| d.message).collect()
    }

    #[test]
    fn a_declared_component_passes() {
        assert!(run(json!([{ "name": "chip", "component": "chip" }])).is_empty());
    }

    #[test]
    fn unknown_deprecated_and_self_error() {
        let m = run(json!([
            { "name": "a", "component": "ghost" },
            { "name": "b", "component": "old" },
            { "name": "c", "component": "host" },
            { "name": "d", "component": "ghost", "lifecycle": { "deprecatedIn": "1.0.0" } }
        ]));
        assert_eq!(m.len(), 3, "{m:?}");
        assert!(m[0].contains("not a declared component"));
        assert!(m[1].contains("deprecated"));
        assert!(m[2].contains("the component itself"));
    }
}
