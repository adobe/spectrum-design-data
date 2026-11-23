// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-074: anatomy-present-when-declared
//!
//! An anatomy part's `presentWhen` MUST only name what the component declares. Every
//! `states` entry MUST be a declared state: a dangling reference, the anatomy version of
//! SPEC-054. State names are compared after the engine's own normalization (`focus`,
//! `key-focus` and `keyboard-focus` are one state). Every `options` key MUST be a declared
//! option and every value one it allows (as SPEC-064: a boolean option takes a boolean; an
//! option that lists no values accepts any).

use std::collections::HashSet;

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::option_values;
use crate::visual::state_ids;

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-074"
    }

    fn name(&self) -> &'static str {
        "anatomy-present-when-declared"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for comp in &ctx.graph.components {
            let Some(anatomy) = comp.raw.get("anatomy").and_then(Value::as_array) else {
                continue;
            };
            let declared: Vec<&str> = comp
                .raw
                .get("states")
                .and_then(Value::as_array)
                .map(|a| {
                    a.iter()
                        .filter_map(|s| s.get("name").and_then(Value::as_str))
                        .collect()
                })
                .unwrap_or_default();
            let normalized: HashSet<String> = declared.iter().flat_map(|n| state_ids(n)).collect();
            let options = comp.raw.get("options").and_then(Value::as_object);

            for part in anatomy {
                let Some(when) = part.get("presentWhen") else {
                    continue;
                };
                let part_name = part.get("name").and_then(Value::as_str).unwrap_or("?");
                let mut report = |path: String, message: String| {
                    out.push(Diagnostic {
                        file: comp.file.clone(),
                        token: None,
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Error,
                        message,
                        instance_path: Some(format!("/anatomy/{part_name}/presentWhen{path}")),
                        schema_path: None,
                    });
                };
                let states = when.get("states").and_then(Value::as_array);
                for state in states.into_iter().flatten().filter_map(Value::as_str) {
                    let known = declared.contains(&state)
                        || state_ids(state).iter().all(|id| normalized.contains(id));
                    if known {
                        continue;
                    }
                    let why = if declared.is_empty() {
                        "the component declares no states"
                    } else {
                        "it is not a declared state"
                    };
                    report(
                        "/states".into(),
                        format!(
                            "Anatomy part '{part_name}' on component '{}' is present in state '{state}', but {why}",
                            comp.name
                        ),
                    );
                }
                for (name, want) in when
                    .get("options")
                    .and_then(Value::as_object)
                    .into_iter()
                    .flatten()
                {
                    let opath = format!("/options/{name}");
                    let Some(def) = options.and_then(|o| o.get(name)) else {
                        report(
                            opath,
                            format!(
                                "Anatomy part '{part_name}' on component '{}' is present when option '{name}' has a value, but it is not an option of the component",
                                comp.name
                            ),
                        );
                        continue;
                    };
                    let is_bool = def.get("type").and_then(Value::as_str) == Some("boolean");
                    let allowed = option_values(def);
                    let wanted = match want {
                        Value::Array(any) => any.iter().collect::<Vec<_>>(),
                        one => vec![one],
                    };
                    for want in wanted {
                        if is_bool && !want.is_boolean() {
                            report(
                                opath.clone(),
                                format!(
                                    "Anatomy part '{part_name}' on component '{}': option '{name}' is boolean but presentWhen uses {want}",
                                    comp.name
                                ),
                            );
                        } else if allowed
                            .as_ref()
                            .filter(|_| !is_bool)
                            .is_some_and(|a| !a.contains(want))
                        {
                            report(
                                opath.clone(),
                                format!(
                                    "Anatomy part '{part_name}' on component '{}': option '{name}' has no value {want}",
                                    comp.name
                                ),
                            );
                        }
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

    use super::Rule;
    use crate::graph::{ComponentRecord, Layer, TokenGraph};
    use crate::registry::RegistryData;
    use crate::report::{Diagnostic, Severity};
    use crate::validate::rule::{ValidationContext, ValidationRule};

    fn run(component: Value) -> Vec<Diagnostic> {
        let mut g = TokenGraph::default();
        g.components.push(ComponentRecord {
            name: component["name"].as_str().unwrap().to_string(),
            file: PathBuf::from("c.json"),
            raw: component,
            layer: Layer::Foundation,
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

    fn comp(states: &[&str], present_in: &[&str]) -> Value {
        json!({
            "name": "demo",
            "states": states.iter().map(|s| json!({"name": s})).collect::<Vec<_>>(),
            "anatomy": [{"name": "focus-indicator", "presentWhen": {"states": present_in}}]
        })
    }

    fn with_option(when: Value) -> Value {
        json!({
            "name": "demo",
            "options": {
                "isSelected": {"type": "boolean"},
                "variant": {"type": "string", "values": ["accent", "negative"]},
                "label": {"type": "string"}
            },
            "anatomy": [{"name": "checkmark", "presentWhen": when}]
        })
    }

    #[test]
    fn accepts_declared_options_and_values() {
        for when in [
            json!({"options": {"isSelected": true}}),
            json!({"options": {"variant": ["accent", "negative"]}}),
            json!({"options": {"label": "anything"}}),
        ] {
            assert!(run(with_option(when.clone())).is_empty(), "{when}");
        }
    }

    #[test]
    fn rejects_an_undeclared_option_a_bad_value_and_a_wrong_type() {
        let cases = [
            (json!({"options": {"nope": true}}), "not an option"),
            (json!({"options": {"variant": "quiet"}}), "has no value"),
            (
                json!({"options": {"variant": ["accent", "quiet"]}}),
                "has no value",
            ),
            (json!({"options": {"isSelected": "yes"}}), "is boolean"),
        ];
        for (when, why) in cases {
            let d = run(with_option(when.clone()));
            assert_eq!(d.len(), 1, "{when}: {d:?}");
            assert!(d[0].message.contains(why), "{when}: {}", d[0].message);
            assert_eq!(d[0].severity, Severity::Error);
        }
    }

    #[test]
    fn warns_on_an_undeclared_state() {
        let d = run(comp(&["hover", "down"], &["focus"]));
        assert_eq!(d.len(), 1);
        assert_eq!(d[0].severity, Severity::Error);
        assert!(d[0].message.contains("state 'focus'"));
        assert!(d[0].message.contains("not a declared state"));
    }

    #[test]
    fn treats_focus_spellings_as_one_state() {
        for (declared, used) in [
            ("focus", "keyboard-focus"),
            ("keyboard-focus", "focus"),
            ("keyboard-focus", "key-focus"),
            ("focus", "focus"),
        ] {
            assert!(
                run(comp(&[declared], &[used])).is_empty(),
                "{declared} / {used}"
            );
        }
    }

    #[test]
    fn warns_when_the_component_declares_no_states() {
        let d = run(comp(&[], &["focus"]));
        assert_eq!(d.len(), 1);
        assert!(d[0].message.contains("declares no states"));
    }

    #[test]
    fn silent_without_presence_states() {
        let d = run(json!({"name": "demo", "anatomy": [{"name": "label"}]}));
        assert!(d.is_empty());
    }

    #[test]
    fn matches_a_declared_name_that_has_no_normal_form() {
        assert!(run(comp(&["focus-+-hover"], &["focus-+-hover"])).is_empty());
    }
}
