// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Extension checks reported only by `design-data validate-manifest` and `platform doctor`;
//! not in the rule registry, so `validate` is unchanged.
//!
//! * `MANIFEST-003`: a platform-owned relationship (an added one, or a foundation one the
//!   manifest overrides) whose component, part, option, state or `$ref` does not resolve. It
//!   reuses SPEC-051 to SPEC-055 on the graph the manifest is applied to.
//! * `MANIFEST-004`: a relationship `override`/`remove` that targets no record. Raised by
//!   `apply_platform_manifest`, so every command that applies the manifest hits it.
//! * `MANIFEST-005`: an `extensions/implementations` fragment naming a component that does not
//!   exist, or a `remove` that matches no row. Raised the same way. Rows carry no option field.
//! * `MANIFEST-006`: a `componentAliases` entry SPEC-081 rejects, or whose target is deprecated.

use std::collections::HashSet;
use std::path::Path;

use serde_json::Value;

use super::{embedded_registry, spec051, spec052, spec053, spec054, spec055, spec081};
use crate::graph::TokenGraph;
use crate::validate::rule::{ValidationContext, ValidationRule};

/// One extension problem, with the stable id of the check that found it.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct ExtensionProblem {
    pub id: &'static str,
    pub message: String,
}

/// Problems in a platform's relationships and component aliases. `graph` must have `manifest`
/// applied; `manifest` is the document `load_configured_manifest` returns.
pub fn extension_problems(graph: &TokenGraph, manifest: &Value) -> Vec<ExtensionProblem> {
    let exceptions = HashSet::new();
    let ctx = ValidationContext {
        graph,
        naming_exceptions: &exceptions,
        registry: embedded_registry(),
        manifest: Some(manifest),
    };
    let mut out = Vec::new();

    let rules: [&dyn ValidationRule; 5] = [
        &spec051::Rule,
        &spec052::Rule,
        &spec053::Rule,
        &spec054::Rule,
        &spec055::Rule,
    ];
    for rule in rules {
        for d in rule.validate(&ctx) {
            if d.file == Path::new("manifest.json") {
                out.push(ExtensionProblem {
                    id: "MANIFEST-003",
                    message: format!(
                        "MANIFEST-003 (validate-manifest): platform relationship: {} ({})",
                        d.message,
                        rule.id()
                    ),
                });
            }
        }
    }

    for d in spec081::Rule.validate(&ctx) {
        out.push(alias_problem(&d.message));
    }
    if let Some(aliases) = manifest.get("componentAliases").and_then(Value::as_object) {
        for (alias, target) in aliases {
            let Some(target) = target.as_str() else {
                continue;
            };
            let deprecated = graph.components.iter().any(|c| {
                c.name == target
                    && c.raw
                        .pointer("/lifecycle/deprecatedIn")
                        .and_then(Value::as_str)
                        .is_some_and(|v| !v.is_empty())
            });
            if deprecated {
                out.push(alias_problem(&format!(
                    "component alias '{alias}' targets '{target}', which is deprecated"
                )));
            }
        }
    }
    out
}

fn alias_problem(detail: &str) -> ExtensionProblem {
    ExtensionProblem {
        id: "MANIFEST-006",
        message: format!("MANIFEST-006 (validate-manifest): {detail}"),
    }
}

#[cfg(test)]
mod tests {
    use serde_json::{json, Value};

    use super::extension_problems;
    use crate::graph::{ComponentRecord, Layer, TokenGraph};

    fn graph(manifest: &Value) -> TokenGraph {
        let comp = |name: &str, extra: Value| {
            let mut raw = json!({ "name": name, "options": {
                "size": { "type": "string", "values": [{ "value": "m" }] } } });
            raw.as_object_mut()
                .unwrap()
                .extend(extra.as_object().unwrap().clone());
            ComponentRecord {
                name: name.into(),
                file: "c.json".into(),
                raw,
                layer: Layer::Foundation,
            }
        };
        let mut g = TokenGraph::default().with_components(vec![
            comp("button", json!({})),
            comp("button-ios", json!({})),
            comp("old", json!({})),
        ]);
        g.apply_platform_manifest(manifest).unwrap();
        g
    }

    fn ids(manifest: Value) -> Vec<&'static str> {
        extension_problems(&graph(&manifest), &manifest)
            .iter()
            .map(|p| p.id)
            .collect()
    }

    fn rel(component: &str, option: &str) -> Value {
        json!({ "uuid": "00000000-0000-4000-8000-000000000001",
            "scope": { "component": component, "options": { option: "m" } },
            "context": "x", "value": "1px" })
    }

    #[test]
    fn valid_extensions_pass() {
        let m = json!({ "platform": "p", "componentAliases": { "button": "button-ios" },
            "extensions": { "components": [{ "name": "button-ios" }],
                "relationships": [rel("button", "size")] } });
        assert!(ids(m).is_empty());
    }

    #[test]
    fn reports_a_relationship_on_a_missing_component_or_option() {
        let mut bad_value = rel("button", "size");
        bad_value["scope"]["options"]["size"] = json!("zz");
        for r in [rel("nope", "size"), bad_value] {
            let m = json!({ "platform": "p", "extensions": { "relationships": [r] } });
            assert!(ids(m).contains(&"MANIFEST-003"));
        }
    }

    #[test]
    fn reports_an_alias_to_a_missing_or_deprecated_target() {
        let m = json!({ "platform": "p", "componentAliases": { "button": "ghost" } });
        assert_eq!(ids(m), ["MANIFEST-006"]);
        let m = json!({ "platform": "p", "componentAliases": { "button": "old" },
            "extensions": { "components": [{ "name": "old",
                "lifecycle": { "deprecatedIn": "1.0.0" } }] } });
        assert!(ids(m).contains(&"MANIFEST-006"));
    }

    #[test]
    fn apply_errors_carry_their_ids() {
        let mut g = graph(&json!({ "platform": "p" }));
        let e = g
            .apply_platform_manifest(&json!({ "extensions": { "relationships": [
                { "op": "remove", "uuid": "missing" }] } }))
            .unwrap_err();
        assert!(e.to_string().contains("MANIFEST-004"));
        let e = g
            .apply_platform_manifest(&json!({ "extensions": { "implementations": [
                { "component": "ghost", "implementations": [] }] } }))
            .unwrap_err();
        assert!(e.to_string().contains("MANIFEST-005"));
    }
}
