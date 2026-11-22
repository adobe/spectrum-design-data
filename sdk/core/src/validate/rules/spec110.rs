// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-110: platform-deviation-selector-resolves
//!
//! A deviation's `component` MUST resolve to a declared component (directly or through
//! `componentAliases`), its `part` MUST be an anatomy part, every `when.states` value a
//! state of the component (compared after state-name normalization, as SPEC-074), every
//! `when.options` key an option with every value one it allows, and every `when.modes` key
//! and value a known mode set and mode.

use std::collections::HashSet;
use std::path::PathBuf;

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::deviation_util::{entries, files, id};
use crate::validate::rules::visual_util::option_values;
use crate::visual::state_ids;

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-110"
    }

    fn name(&self) -> &'static str {
        "platform-deviation-selector-resolves"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        // Without a component catalog there is nothing to check selectors against.
        if ctx.graph.components.is_empty() {
            return vec![];
        }
        let mut out = Vec::new();
        for (file, doc) in files(ctx.manifest) {
            let name = doc.get("component").and_then(Value::as_str).unwrap_or("");
            let canonical = ctx.graph.canonical_component(name);
            let comp = ctx.graph.components.iter().find(|c| c.name == canonical);
            for (i, entry) in entries(doc).enumerate() {
                let dev = id(entry);
                let mut report = |path: &str, problem: String| {
                    out.push(Diagnostic {
                        file: PathBuf::from(file),
                        token: None,
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Error,
                        message: format!("Deviation '{dev}' of '{name}': {problem}"),
                        instance_path: Some(format!("/deviations/{i}{path}")),
                        schema_path: None,
                    });
                };
                let Some(comp) = comp else {
                    report("", "the component is not declared".into());
                    continue;
                };
                if let Some(part) = entry.get("part").and_then(Value::as_str) {
                    let known = comp
                        .raw
                        .get("anatomy")
                        .and_then(Value::as_array)
                        .is_some_and(|a| {
                            a.iter()
                                .any(|p| p.get("name").and_then(Value::as_str) == Some(part))
                        });
                    if !known {
                        report("/part", format!("part '{part}' is not in the anatomy"));
                    }
                }
                let Some(when) = entry.get("when") else {
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
                let normalized: HashSet<String> =
                    declared.iter().flat_map(|n| state_ids(n)).collect();
                for state in when
                    .get("states")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                    .filter_map(Value::as_str)
                {
                    let known = declared.contains(&state)
                        || state_ids(state).iter().all(|id| normalized.contains(id));
                    if !known {
                        report("/when/states", format!("'{state}' is not a state"));
                    }
                }
                let options = comp.raw.get("options").and_then(Value::as_object);
                for (key, want) in when
                    .get("options")
                    .and_then(Value::as_object)
                    .into_iter()
                    .flatten()
                {
                    let path = format!("/when/options/{key}");
                    let Some(def) = options.and_then(|o| o.get(key)) else {
                        report(&path, format!("'{key}' is not an option"));
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
                            report(&path, format!("option '{key}' is boolean but uses {want}"));
                        } else if allowed
                            .as_ref()
                            .filter(|_| !is_bool)
                            .is_some_and(|a| !a.contains(want))
                        {
                            report(&path, format!("option '{key}' has no value {want}"));
                        }
                    }
                }
                for (set, mode) in when
                    .get("modes")
                    .and_then(Value::as_object)
                    .into_iter()
                    .flatten()
                {
                    let path = format!("/when/modes/{set}");
                    match ctx.graph.mode_sets.iter().find(|m| &m.name == set) {
                        None => report(&path, format!("'{set}' is not a mode set")),
                        Some(m)
                            if !mode
                                .as_str()
                                .is_some_and(|v| m.modes.iter().any(|x| x == v)) =>
                        {
                            report(&path, format!("mode set '{set}' has no mode {mode}"));
                        }
                        Some(_) => {}
                    }
                }
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
    use crate::validate::rule::{ValidationContext, ValidationRule};

    fn run(entry: Value) -> Vec<String> {
        let g = TokenGraph::default().with_components(vec![ComponentRecord {
            name: "switch".into(),
            file: "switch.json".into(),
            raw: json!({ "name": "switch",
                "anatomy": [{ "name": "track" }],
                "states": [{ "name": "hover" }],
                "options": { "isSelected": { "type": "boolean" },
                             "size": { "values": ["s", "m"] } } }),
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
        .into_iter()
        .map(|d| d.message)
        .collect()
    }

    #[test]
    fn accepts_a_resolving_selector() {
        let ok = json!({ "id": "a", "part": "track",
            "when": { "states": ["hover"], "options": { "isSelected": false, "size": "m" } } });
        assert!(run(ok).is_empty());
    }

    #[test]
    fn flags_each_unresolved_selector() {
        assert_eq!(run(json!({ "id": "a", "part": "nope" })).len(), 1);
        assert_eq!(
            run(json!({ "id": "a", "when": { "states": ["nope"] } })).len(),
            1
        );
        assert_eq!(
            run(json!({ "id": "a", "when": { "options": { "x": 1 } } })).len(),
            1
        );
        assert_eq!(
            run(json!({ "id": "a", "when": { "options": { "size": "xl" } } })).len(),
            1
        );
        assert_eq!(
            run(json!({ "id": "a", "when": { "options": { "isSelected": "yes" } } })).len(),
            1
        );
        assert_eq!(
            run(json!({ "id": "a", "when": { "modes": { "colorTheme": "dark" } } })).len(),
            1
        );
    }

    #[test]
    fn conformance_fixtures() {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../packages/design-data-spec/conformance/deviations");
        let load = |case: &str| -> Value {
            serde_json::from_str(
                &std::fs::read_to_string(root.join(case).join("switch.json")).unwrap(),
            )
            .unwrap()
        };
        let g = TokenGraph::default().with_components(vec![ComponentRecord {
            name: "switch".into(),
            file: "switch.json".into(),
            raw: json!({ "name": "switch", "anatomy": [{ "name": "track" }],
                "states": [{ "name": "keyboard-focus" }],
                "options": { "isSelected": { "type": "boolean" } } }),
            layer: Layer::Foundation,
        }]);
        let ex = std::collections::HashSet::new();
        let count = |case: &str| {
            let m = json!({ "extensions": { "deviations": [
                { "file": "switch.json", "deviations": load(case) }] } });
            Rule.validate(&ValidationContext {
                graph: &g,
                naming_exceptions: &ex,
                registry: RegistryData::embedded(),
                manifest: Some(&m),
            })
            .len()
        };
        assert_eq!(count("valid/switch-focus-stroke"), 0);
        assert_eq!(count("invalid/SPEC-110-unknown-part"), 1);
        assert_eq!(count("invalid/SPEC-110-unknown-state"), 1);
    }
}
