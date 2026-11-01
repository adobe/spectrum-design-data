// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-066: visual-covers-component
//!
//! Every option and state a component declares SHOULD either affect its visual
//! recipe or be listed in the recipe's `notVisual` array. A name counts as used
//! when a `when` / `visibleWhen` condition names it, when a token the recipe
//! binds carries the state, or when it is implied: `size` by `sizeScale`,
//! `label` by a text part, and `isDisabled` / `isSelected` by the `disabled` /
//! `selected` states (and the reverse). `notVisual` names MUST be declared and
//! SHOULD NOT also be used.

use std::collections::BTreeSet;

use serde_json::Value;

use crate::graph::VisualRecord;
use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::{
    component_of, component_relationships, expand_selector, option_entries, size_entries,
    tokens_matching, walk_objects, warning,
};
use crate::visual::{name_states, OPTION_STATES};

pub struct Rule;

#[derive(Default)]
struct Used {
    options: BTreeSet<String>,
    states: BTreeSet<String>,
}

fn conditions(node: &Value) -> Vec<&Value> {
    let mut out = Vec::new();
    for key in ["when", "visibleWhen"] {
        match node.get(key) {
            Some(Value::Array(a)) => out.extend(a.iter()),
            Some(v @ Value::Object(_)) => out.push(v),
            _ => {}
        }
    }
    out
}

fn used_by(ctx: &ValidationContext<'_>, v: &VisualRecord) -> Used {
    let mut used = Used::default();
    let graph = ctx.graph;
    let sizes = size_entries(&v.raw);
    let options = option_entries(ctx.graph, v);
    let rels = component_relationships(graph, &v.component);
    let Some(parts) = v.raw.get("parts") else {
        return used;
    };
    walk_objects(parts, "/parts", &mut |_, node| {
        for cond in conditions(node) {
            if let Some(o) = cond.get("options").and_then(Value::as_object) {
                used.options.extend(o.keys().cloned());
            }
            if let Some(s) = cond.get("states").and_then(Value::as_array) {
                used.states
                    .extend(s.iter().filter_map(|x| x.as_str().map(String::from)));
            }
        }
        if let Some(sel) = node.get("relationship").filter(|r| r.is_object()) {
            for e in expand_selector(sel, &sizes, &options) {
                let property = e.get("property").and_then(Value::as_str).unwrap_or("");
                let context = e.get("context").and_then(Value::as_str).map(str::trim);
                for r in &rels {
                    if r.property == property && r.context.as_deref() == context {
                        used.states.extend(r.states.iter().cloned());
                        used.options.extend(r.options.iter().cloned());
                    }
                }
            }
        }
        if let Some(sel) = node.get("token").filter(|t| t.is_object()) {
            for e in expand_selector(sel, &sizes, &options) {
                if let Some(m) = e.as_object() {
                    for t in tokens_matching(graph, m) {
                        used.states.extend(name_states(t.raw.get("name")));
                    }
                }
            }
        }
    });
    if !sizes.is_empty() {
        used.options.insert("size".into());
    }
    let has_text = parts.as_object().is_some_and(|m| {
        m.values()
            .any(|p| p.get("kind").and_then(Value::as_str) == Some("text"))
    });
    if has_text {
        used.options.insert("label".into());
    }
    for (opt, state) in OPTION_STATES {
        if used.options.contains(*opt) {
            used.states.insert((*state).into());
        }
        if used.states.contains(*state) {
            used.options.insert((*opt).into());
        }
    }
    used
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-066"
    }

    fn name(&self) -> &'static str {
        "visual-covers-component"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for v in &ctx.graph.visuals {
            let Some(comp) = component_of(ctx.graph, v) else {
                continue; // SPEC-060 covers undeclared component
            };
            let options: BTreeSet<String> = comp
                .raw
                .get("options")
                .and_then(Value::as_object)
                .map(|m| m.keys().cloned().collect())
                .unwrap_or_default();
            let states: BTreeSet<String> = comp
                .raw
                .get("states")
                .and_then(Value::as_array)
                .map(|a| {
                    a.iter()
                        .filter_map(|s| s.get("name").and_then(Value::as_str).map(String::from))
                        .collect()
                })
                .unwrap_or_default();
            let not_visual: BTreeSet<String> = v
                .raw
                .get("notVisual")
                .and_then(Value::as_array)
                .map(|a| {
                    a.iter()
                        .filter_map(|x| x.as_str().map(String::from))
                        .collect()
                })
                .unwrap_or_default();
            let used = used_by(ctx, v);
            let name = &v.component;

            for opt in options.difference(&used.options) {
                if !not_visual.contains(opt) {
                    out.push(warning(
                        self.id(),
                        v,
                        "/component",
                        format!(
                            "Option '{opt}' of '{name}' does not affect the recipe; use it in a condition or list it in notVisual"
                        ),
                    ));
                }
            }
            for state in states.difference(&used.states) {
                if !not_visual.contains(state) {
                    out.push(warning(
                        self.id(),
                        v,
                        "/component",
                        format!(
                            "State '{state}' of '{name}' does not affect the recipe; use it in a condition or list it in notVisual"
                        ),
                    ));
                }
            }
            for nv in &not_visual {
                let path = "/notVisual";
                if !options.contains(nv) && !states.contains(nv) {
                    out.push(warning(
                        self.id(),
                        v,
                        path,
                        format!("notVisual lists '{nv}', which '{name}' does not declare as an option or state"),
                    ));
                } else if used.options.contains(nv) || used.states.contains(nv) {
                    out.push(warning(
                        self.id(),
                        v,
                        path,
                        format!("notVisual lists '{nv}', but the recipe uses it"),
                    ));
                }
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::json;

    use crate::graph::{ComponentRecord, Layer, TokenGraph, VisualRecord};
    use crate::registry::RegistryData;
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec066::Rule;

    fn run(
        recipe: serde_json::Value,
        component: serde_json::Value,
    ) -> Vec<crate::report::Diagnostic> {
        let mut g = TokenGraph::default();
        g.components.push(ComponentRecord {
            name: "switch".into(),
            file: PathBuf::from("dataset.json"),
            raw: component,
            layer: Layer::Foundation,
        });
        g.visuals.push(VisualRecord {
            component: "switch".into(),
            file: PathBuf::from("visuals/switch.json"),
            raw: recipe,
            layer: crate::graph::Layer::Foundation,
        });
        let exceptions = std::collections::HashSet::new();
        let registry = RegistryData::embedded();
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry,
            manifest: None,
        };
        Rule.validate(&ctx)
    }

    fn component() -> serde_json::Value {
        json!({
            "name": "switch",
            "options": {"isSelected": {"type": "boolean"}, "isReadOnly": {"type": "boolean"}},
            "states": [{"name": "hover"}, {"name": "selected"}]
        })
    }

    fn recipe(extra: serde_json::Value) -> serde_json::Value {
        let mut r = json!({
            "component": "switch",
            "root": "track",
            "parts": {"track": {"kind": "box", "props": {"fill": [
                {"token": {"property": "color"}},
                {"when": {"options": {"isSelected": true}, "states": ["hover"]}, "token": {"property": "color"}}
            ]}}}
        });
        r.as_object_mut()
            .unwrap()
            .extend(extra.as_object().unwrap().clone());
        r
    }

    #[test]
    fn unused_option_warns() {
        let diags = run(recipe(json!({})), component());
        assert_eq!(diags.len(), 1, "{diags:?}");
        assert_eq!(diags[0].severity, Severity::Warning);
        assert!(diags[0].message.contains("'isReadOnly'"));
    }

    #[test]
    fn not_visual_silences_it() {
        let diags = run(recipe(json!({"notVisual": ["isReadOnly"]})), component());
        assert!(diags.is_empty(), "{diags:?}");
    }

    #[test]
    fn selected_option_covers_selected_state() {
        let diags = run(recipe(json!({"notVisual": ["isReadOnly"]})), component());
        assert!(diags.iter().all(|d| !d.message.contains("'selected'")));
    }

    #[test]
    fn undeclared_not_visual_name_warns() {
        let diags = run(
            recipe(json!({"notVisual": ["isReadOnly", "nope"]})),
            component(),
        );
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("'nope'"));
    }

    #[test]
    fn not_visual_on_a_used_name_warns() {
        let diags = run(
            recipe(json!({"notVisual": ["isReadOnly", "isSelected"]})),
            component(),
        );
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("uses it"));
    }
}
