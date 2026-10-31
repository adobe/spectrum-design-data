// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-063: visual-size-scale-valid
//!
//! A visual recipe's `sizeScale` keys MUST match the values of the component's
//! `size` option.

use std::collections::BTreeSet;

use serde_json::Value;

use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::{component_of, error, option_values};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-063"
    }

    fn name(&self) -> &'static str {
        "visual-size-scale-valid"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        if ctx.graph.components.is_empty() {
            return vec![];
        }
        let mut out = Vec::new();
        for v in &ctx.graph.visuals {
            let Some(comp) = component_of(ctx.graph, v) else {
                continue; // SPEC-060 covers undeclared component
            };
            let Some(scale) = v.raw.get("sizeScale").and_then(Value::as_object) else {
                continue;
            };
            let comp_name = &v.component;
            let Some(size) = comp.raw.pointer("/options/size") else {
                out.push(error(
                    self.id(),
                    v,
                    "/sizeScale",
                    format!("Recipe declares a sizeScale but '{comp_name}' has no 'size' option"),
                ));
                continue;
            };
            let sizes: BTreeSet<String> = option_values(size)
                .unwrap_or_default()
                .iter()
                .filter_map(|s| s.as_str().map(str::to_string))
                .collect();
            for key in scale.keys().filter(|k| !sizes.contains(*k)) {
                out.push(error(
                    self.id(),
                    v,
                    &format!("/sizeScale/{key}"),
                    format!("sizeScale key '{key}' is not a 'size' value of '{comp_name}'"),
                ));
            }
            for size in sizes.iter().filter(|s| !scale.contains_key(*s)) {
                out.push(error(
                    self.id(),
                    v,
                    "/sizeScale",
                    format!("'size' value '{size}' of '{comp_name}' is missing from sizeScale"),
                ));
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::{json, Value};

    use crate::graph::{ComponentRecord, Layer, TokenGraph, VisualRecord};
    use crate::registry::RegistryData;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec063::Rule;

    fn run(scale: Value) -> Vec<crate::report::Diagnostic> {
        let mut g = TokenGraph::default();
        g.components.push(ComponentRecord {
            name: "button".into(),
            file: PathBuf::from("components/button.json"),
            raw: json!({"name": "button", "options": {"size": {"type": "string",
                "values": [{"value": "s"}, {"value": "m"}]}}}),
            layer: Layer::Foundation,
        });
        g.visuals.push(VisualRecord {
            component: "button".into(),
            file: PathBuf::from("visuals/button.json"),
            raw: json!({"component": "button", "sizeScale": scale, "parts": {}}),
        });
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest: None,
        };
        Rule.validate(&ctx)
    }

    #[test]
    fn matching_scale_passes() {
        assert!(run(json!({"s": 75, "m": 100})).is_empty());
    }

    #[test]
    fn extra_key_errors() {
        let d = run(json!({"xs": 50, "s": 75, "m": 100}));
        assert_eq!(d.len(), 1);
        assert_eq!(d[0].rule_id.as_deref(), Some("SPEC-063"));
        assert!(d[0].message.contains("'xs'"));
    }

    #[test]
    fn missing_key_errors() {
        let d = run(json!({"s": 75}));
        assert_eq!(d.len(), 1);
        assert!(d[0].message.contains("'m'"));
    }
}
