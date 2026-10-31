// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-061: visual-conditions-valid
//!
//! `when` / `visibleWhen` conditions in a visual recipe MUST only name options
//! and states the component declares, with values the option allows.

use serde_json::Value;

use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::{component_of, error, option_values, walk_objects};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-061"
    }

    fn name(&self) -> &'static str {
        "visual-conditions-valid"
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
            let options = comp.raw.get("options").and_then(Value::as_object);
            let states: Vec<&str> = comp
                .raw
                .get("states")
                .and_then(Value::as_array)
                .map(|s| {
                    s.iter()
                        .filter_map(|s| s.get("name").and_then(Value::as_str))
                        .collect()
                })
                .unwrap_or_default();
            let comp_name = &v.component;
            let Some(parts) = v.raw.get("parts") else {
                continue;
            };
            walk_objects(parts, "/parts", &mut |path, node| {
                for key in ["when", "visibleWhen"] {
                    let Some(cond) = node.get(key).filter(|c| c.is_object()) else {
                        continue;
                    };
                    let cpath = format!("{path}/{key}");
                    for (name, want) in cond
                        .get("options")
                        .and_then(Value::as_object)
                        .into_iter()
                        .flatten()
                    {
                        let opath = format!("{cpath}/options/{name}");
                        let Some(def) = options.and_then(|o| o.get(name)) else {
                            out.push(error(
                                self.id(),
                                v,
                                &opath,
                                format!(
                                    "Condition option '{name}' is not an option of '{comp_name}'"
                                ),
                            ));
                            continue;
                        };
                        let is_bool = def.get("type").and_then(Value::as_str) == Some("boolean");
                        let allowed = option_values(def);
                        // An array means "any of"; check every element.
                        let wanted = match want {
                            Value::Array(any) => any.iter().collect::<Vec<_>>(),
                            one => vec![one],
                        };
                        for want in wanted {
                            if is_bool && !want.is_boolean() {
                                out.push(error(
                                    self.id(),
                                    v,
                                    &opath,
                                    format!("Option '{name}' of '{comp_name}' is boolean but the condition uses {want}"),
                                ));
                            } else if let Some(allowed) = allowed.as_ref().filter(|_| !is_bool) {
                                if !allowed.contains(want) {
                                    out.push(error(
                                        self.id(),
                                        v,
                                        &opath,
                                        format!(
                                            "Option '{name}' of '{comp_name}' has no value {want}"
                                        ),
                                    ));
                                }
                            }
                        }
                    }
                    for (i, s) in cond
                        .get("states")
                        .and_then(Value::as_array)
                        .into_iter()
                        .flatten()
                        .enumerate()
                    {
                        if !s.as_str().is_some_and(|s| states.contains(&s)) {
                            out.push(error(
                                self.id(),
                                v,
                                &format!("{cpath}/states/{i}"),
                                format!("Condition state {s} is not a state of '{comp_name}'"),
                            ));
                        }
                    }
                }
            });
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
    use crate::validate::rules::spec061::Rule;

    fn run(recipe: Value) -> Vec<crate::report::Diagnostic> {
        let mut g = TokenGraph::default();
        g.components.push(ComponentRecord {
            name: "button".into(),
            file: PathBuf::from("components/button.json"),
            raw: json!({"name": "button",
                "options": {
                    "variant": {"type": "string", "values": [{"value": "accent"}, {"value": "primary"}]},
                    "isDisabled": {"type": "boolean"}
                },
                "states": [{"name": "hover"}, {"name": "down"}]}),
            layer: Layer::Foundation,
        });
        g.visuals.push(VisualRecord {
            component: "button".into(),
            file: PathBuf::from("visuals/button.json"),
            raw: recipe,
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

    fn recipe(when: Value, visible_when: Value) -> Value {
        json!({"component": "button", "parts": {"container": {
            "visibleWhen": visible_when,
            "props": {"fill": [{"when": when, "value": "red"}]}
        }}})
    }

    #[test]
    fn declared_conditions_pass() {
        let r = recipe(
            json!({"options": {"variant": "primary", "isDisabled": true}, "states": ["hover"]}),
            json!({"options": {"isDisabled": false}}),
        );
        assert!(run(r).is_empty());
    }

    #[test]
    fn unknown_option_errors() {
        let d = run(recipe(json!({"options": {"tone": "x"}}), json!({})));
        assert_eq!(d.len(), 1);
        assert_eq!(d[0].rule_id.as_deref(), Some("SPEC-061"));
        assert!(d[0].message.contains("tone"));
    }

    #[test]
    fn value_outside_values_errors() {
        let d = run(recipe(json!({"options": {"variant": "neon"}}), json!({})));
        assert_eq!(d.len(), 1);
        assert!(d[0].message.contains("neon"));
    }

    #[test]
    fn array_of_declared_values_passes() {
        let r = recipe(
            json!({"options": {"variant": ["accent", "primary"], "isDisabled": [true, false]}}),
            json!({}),
        );
        assert!(run(r).is_empty());
    }

    #[test]
    fn array_with_an_undeclared_value_errors() {
        let d = run(recipe(
            json!({"options": {"variant": ["primary", "neon"]}}),
            json!({}),
        ));
        assert_eq!(d.len(), 1);
        assert!(d[0].message.contains("neon"));
    }

    #[test]
    fn array_with_a_non_boolean_for_a_boolean_option_errors() {
        let d = run(recipe(
            json!({"options": {"isDisabled": [true, "yes"]}}),
            json!({}),
        ));
        assert_eq!(d.len(), 1);
        assert!(d[0].message.contains("boolean"));
    }

    #[test]
    fn boolean_option_requires_boolean() {
        let d = run(recipe(json!({"options": {"isDisabled": "yes"}}), json!({})));
        assert_eq!(d.len(), 1);
        assert!(d[0].message.contains("boolean"));
    }

    #[test]
    fn unknown_state_errors() {
        let d = run(recipe(json!({"states": ["focus"]}), json!({})));
        assert_eq!(d.len(), 1);
        assert!(d[0].message.contains("focus"));
    }

    #[test]
    fn visible_when_is_checked() {
        let d = run(recipe(json!({}), json!({"options": {"tone": true}})));
        assert_eq!(d.len(), 1);
        assert!(d[0]
            .instance_path
            .as_deref()
            .unwrap()
            .contains("visibleWhen"));
    }
}
