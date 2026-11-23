// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-064: constraint-options-declared
//!
//! Every option name and value used in a component constraint's `when` or
//! `require` MUST be declared in that component's `options`. Value checks are
//! silent for an option with no (or an empty) `values[]` list, mirroring
//! SPEC-019 / SPEC-040.

use serde_json::Value;

use crate::constraints::{read_constraints, Requirement};
use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::option_values;

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-064"
    }

    fn name(&self) -> &'static str {
        "constraint-options-declared"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for comp in &ctx.graph.components {
            let options = comp.raw.get("options").and_then(Value::as_object);
            for (i, c) in read_constraints(&comp.raw) {
                let mut check = |section: &str, name: &str, values: &[Value]| {
                    let path = format!("/constraints/{i}/{section}/{name}");
                    let diag = |message: String| Diagnostic {
                        file: comp.file.clone(),
                        token: None,
                        rule_id: Some("SPEC-064".to_string()),
                        severity: Severity::Error,
                        message,
                        instance_path: Some(path.clone()),
                        schema_path: None,
                    };
                    let Some(def) = options.and_then(|o| o.get(name)) else {
                        out.push(diag(format!(
                            "Constraint option '{name}' is not declared on component '{}'",
                            comp.name
                        )));
                        return;
                    };
                    let declared = option_values(def).unwrap_or_default();
                    if declared.is_empty() {
                        return;
                    }
                    for v in values.iter().filter(|v| !declared.contains(v)) {
                        out.push(diag(format!(
                            "Constraint value {v} for option '{name}' is not declared on component '{}'",
                            comp.name
                        )));
                    }
                };
                for (name, vals) in &c.when {
                    check("when", name, vals);
                }
                for (name, req) in &c.require {
                    match req {
                        Requirement::OneOf(vals) => check("require", name, vals),
                        Requirement::Present => check("require", name, &[]),
                    }
                }
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
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};

    fn run(constraints: Value) -> Vec<crate::report::Diagnostic> {
        let comp = ComponentRecord {
            name: "button".into(),
            file: PathBuf::from("button.json"),
            raw: json!({
                "name": "button",
                "options": {
                    "variant": {"values": [{"value": "primary"}, {"value": "accent"}]},
                    "style": {"values": [{"value": "fill"}, {"value": "outline"}]},
                    "isLabelHidden": {"type": "boolean"},
                    "icon": {}
                },
                "constraints": constraints
            }),
            layer: Layer::Foundation,
        };
        let mut graph = TokenGraph::default();
        graph.components = vec![comp];
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: &graph,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest: None,
        };
        super::Rule.validate(&ctx)
    }

    #[test]
    fn valid_constraints_are_silent() {
        let d = run(json!([
            {"when": {"style": "outline"}, "require": {"variant": ["primary"]}, "severity": "error"},
            {"when": {"isLabelHidden": true}, "require": {"icon": {"present": true}}, "severity": "error"}
        ]));
        assert!(d.is_empty(), "{d:?}");
    }

    #[test]
    fn undeclared_names_and_values_error() {
        let d = run(json!([
            {"when": {"shape": "round"}, "require": {"variant": ["primary", "electric"]}, "severity": "error"},
            {"when": {"style": ["fill", "dashed"]}, "require": {"missing": {"present": true}}, "severity": "advisory"}
        ]));
        assert_eq!(d.len(), 4, "{d:?}");
        assert!(d.iter().all(|x| x.severity == Severity::Error));
        assert!(d.iter().all(|x| x.rule_id.as_deref() == Some("SPEC-064")));
        let msgs: Vec<_> = d.iter().map(|x| x.message.as_str()).collect();
        assert!(msgs.iter().any(|m| m.contains("'shape'")));
        assert!(msgs.iter().any(|m| m.contains("\"electric\"")));
        assert!(msgs.iter().any(|m| m.contains("\"dashed\"")));
        assert!(msgs.iter().any(|m| m.contains("'missing'")));
    }

    #[test]
    fn option_without_values_is_silent_on_values() {
        let d = run(json!([
            {"when": {"icon": "anything"}, "require": {"isLabelHidden": [true]}, "severity": "error"}
        ]));
        assert!(d.is_empty(), "{d:?}");
    }
}
