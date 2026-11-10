// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-081: component-alias-valid
//!
//! Each `componentAliases` key MUST be a foundation component, its target MUST be a
//! component the platform declares in `extensions/components/`, aliases MUST NOT chain
//! or form a cycle, and a key MUST NOT also be replaced by `extensions/components/<key>.json`.
//! Reads the manifest's merged `extensions.components`; a silent no-op without a manifest.

use std::collections::HashSet;

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-081"
    }

    fn name(&self) -> &'static str {
        "component-alias-valid"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let Some(manifest) = ctx.manifest else {
            return vec![];
        };
        let Some(aliases) = manifest.get("componentAliases").and_then(Value::as_object) else {
            return vec![];
        };
        let platform = manifest
            .get("platform")
            .and_then(Value::as_str)
            .unwrap_or("platform");
        let declared: HashSet<&str> = manifest
            .get("extensions")
            .and_then(|e| e.get("components"))
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(|c| c.get("name").and_then(Value::as_str))
            .collect();

        let mut out = Vec::new();
        for (alias, target) in aliases {
            let Some(target) = target.as_str() else {
                continue; // Layer 1 rejects non-string targets
            };
            let reason = if declared.contains(alias.as_str()) {
                Some(format!(
                    "'{alias}' is also replaced by extensions/components/{alias}.json"
                ))
            } else if !ctx.graph.components.iter().any(|c| &c.name == alias) {
                Some(format!("'{alias}' is not a foundation component"))
            } else if aliases.contains_key(target) {
                Some(format!(
                    "'{target}' is itself an alias, so aliases chain or form a cycle"
                ))
            } else if !declared.contains(target) {
                Some(format!(
                    "'{target}' is not declared in the platform's extensions/components"
                ))
            } else {
                None
            };
            if let Some(reason) = reason {
                out.push(Diagnostic {
                    file: std::path::PathBuf::from("manifest.json"),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Error,
                    message: format!(
                        "Invalid component alias '{alias}' in platform '{platform}': {reason}"
                    ),
                    instance_path: Some(format!("/componentAliases/{alias}")),
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
    use crate::graph::{ComponentRecord, Layer, TokenGraph};
    use crate::registry::RegistryData;
    use crate::report::Diagnostic;
    use crate::validate::rule::{ValidationContext, ValidationRule};

    fn check(manifest: Value) -> Vec<Diagnostic> {
        let g = TokenGraph::default().with_components(vec![ComponentRecord {
            name: "button".into(),
            file: "button.json".into(),
            raw: json!({ "name": "button" }),
            layer: Layer::Foundation,
        }]);
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest: Some(&manifest),
        };
        Rule.validate(&ctx)
    }

    fn manifest(aliases: Value, declared: &[&str]) -> Value {
        let comps: Vec<Value> = declared.iter().map(|n| json!({ "name": n })).collect();
        json!({ "platform": "p", "componentAliases": aliases,
                "extensions": { "components": comps } })
    }

    fn reason(out: &[Diagnostic]) -> &str {
        assert_eq!(out.len(), 1, "{out:?}");
        &out[0].message
    }

    #[test]
    fn accepts_a_valid_alias_and_ignores_no_aliases() {
        assert!(check(manifest(json!({ "button": "button-ios" }), &["button-ios"])).is_empty());
        assert!(check(json!({ "platform": "p" })).is_empty());
    }

    #[test]
    fn rejects_a_key_that_is_not_a_foundation_component() {
        let out = check(manifest(json!({ "nope": "button-ios" }), &["button-ios"]));
        assert!(reason(&out).contains("not a foundation component"));
    }

    #[test]
    fn rejects_an_undeclared_target() {
        let out = check(manifest(json!({ "button": "button-ios" }), &[]));
        assert!(reason(&out).contains("not declared"));
    }

    #[test]
    fn rejects_chains_and_cycles() {
        let chain = check(manifest(
            json!({ "button": "button-ios", "button-ios": "x" }),
            &["button-ios", "x"],
        ));
        assert!(
            chain.iter().any(|d| d.message.contains("chain")),
            "{chain:?}"
        );
        let cycle = check(manifest(json!({ "button": "button" }), &["button-ios"]));
        assert!(reason(&cycle).contains("chain or form a cycle"));
    }

    #[test]
    fn rejects_a_key_the_platform_also_replaces() {
        let out = check(manifest(
            json!({ "button": "button-ios" }),
            &["button", "button-ios"],
        ));
        assert!(reason(&out).contains("also replaced"));
    }
}
