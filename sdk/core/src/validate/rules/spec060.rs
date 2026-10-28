// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-060: visual-anatomy-valid
//!
//! A visual recipe MUST name a declared component, and its parts MUST agree
//! with that component's anatomy.

use std::collections::HashSet;

use serde_json::Value;

use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::{component_of, error};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-060"
    }

    fn name(&self) -> &'static str {
        "visual-anatomy-valid"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        // Without a component catalog there is nothing to check recipes against.
        if ctx.graph.components.is_empty() {
            return vec![];
        }
        let mut out = Vec::new();
        for v in &ctx.graph.visuals {
            let Some(comp) = component_of(ctx.graph, v) else {
                out.push(error(
                    self.id(),
                    v,
                    "/component",
                    format!(
                        "Visual recipe references undeclared component '{}'",
                        v.component
                    ),
                ));
                continue;
            };
            let anatomy: Vec<&Value> = comp
                .raw
                .get("anatomy")
                .and_then(Value::as_array)
                .map(|a| a.iter().collect())
                .unwrap_or_default();
            let declared: HashSet<&str> = anatomy
                .iter()
                .filter_map(|a| a.get("name").and_then(Value::as_str))
                .collect();
            let contained: HashSet<&str> = anatomy
                .iter()
                .filter_map(|a| a.get("contains").and_then(Value::as_array))
                .flatten()
                .filter_map(Value::as_str)
                .collect();
            let contains_of = |part: &str| -> HashSet<&str> {
                anatomy
                    .iter()
                    .find(|a| a.get("name").and_then(Value::as_str) == Some(part))
                    .and_then(|a| a.get("contains").and_then(Value::as_array))
                    .map(|c| c.iter().filter_map(Value::as_str).collect())
                    .unwrap_or_default()
            };
            let comp_name = &v.component;
            let Some(parts) = v.raw.get("parts").and_then(Value::as_object) else {
                continue;
            };

            for key in parts.keys() {
                if !declared.contains(key.as_str()) {
                    out.push(error(
                        self.id(),
                        v,
                        &format!("/parts/{key}"),
                        format!(
                            "Recipe part '{key}' is not a declared anatomy part of '{comp_name}'"
                        ),
                    ));
                }
            }

            if let Some(root) = v.raw.get("root").and_then(Value::as_str) {
                if !parts.contains_key(root) {
                    out.push(error(
                        self.id(),
                        v,
                        "/root",
                        format!("Recipe root '{root}' is not a recipe part"),
                    ));
                }
                if declared.contains(root) && contained.contains(root) {
                    out.push(error(
                        self.id(),
                        v,
                        "/root",
                        format!(
                            "Recipe root '{root}' is not a top-level anatomy part of '{comp_name}'"
                        ),
                    ));
                } else if !declared.contains(root) {
                    out.push(error(
                        self.id(),
                        v,
                        "/root",
                        format!(
                            "Recipe root '{root}' is not a declared anatomy part of '{comp_name}'"
                        ),
                    ));
                }
            }

            for (key, part) in parts {
                let allowed = contains_of(key);
                for (i, child) in part
                    .get("children")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                    .filter_map(Value::as_str)
                    .enumerate()
                {
                    let path = format!("/parts/{key}/children/{i}");
                    if !parts.contains_key(child) {
                        out.push(error(
                            self.id(),
                            v,
                            &path,
                            format!("Child '{child}' of part '{key}' is not a recipe part"),
                        ));
                    }
                    if !allowed.contains(child) {
                        out.push(error(
                            self.id(),
                            v,
                            &path,
                            format!(
                                "Child '{child}' of part '{key}' is not in that anatomy part's 'contains' on '{comp_name}'"
                            ),
                        ));
                    }
                }
                for field in ["around", "pressTarget"] {
                    let Some(target) = part.get(field).and_then(Value::as_str) else {
                        continue;
                    };
                    let path = format!("/parts/{key}/{field}");
                    if !declared.contains(target) {
                        out.push(error(
                            self.id(),
                            v,
                            &path,
                            format!(
                                "Part '{key}' {field} '{target}' is not a declared anatomy part of '{comp_name}'"
                            ),
                        ));
                    }
                    if field == "pressTarget" && !parts.contains_key(target) {
                        out.push(error(
                            self.id(),
                            v,
                            &path,
                            format!("Part '{key}' pressTarget '{target}' is not a recipe part"),
                        ));
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

    use crate::graph::{ComponentRecord, Layer, TokenGraph, VisualRecord};
    use crate::registry::RegistryData;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec060::Rule;

    fn comp() -> Value {
        json!({"name": "button", "anatomy": [
            {"name": "container", "contains": ["icon", "label"]},
            {"name": "icon"},
            {"name": "label"},
            {"name": "focus-ring"}
        ]})
    }

    fn run(recipe: Value) -> Vec<crate::report::Diagnostic> {
        let mut g = TokenGraph::default();
        g.components.push(ComponentRecord {
            name: "button".into(),
            file: PathBuf::from("components/button.json"),
            raw: comp(),
            layer: Layer::Foundation,
        });
        g.visuals.push(VisualRecord {
            component: recipe["component"].as_str().unwrap().to_string(),
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

    fn valid() -> Value {
        json!({"component": "button", "root": "container", "parts": {
            "container": {"children": ["icon", "label"], "pressTarget": "container"},
            "icon": {},
            "label": {"around": "focus-ring"}
        }})
    }

    #[test]
    fn matching_recipe_passes() {
        assert!(run(valid()).is_empty());
    }

    #[test]
    fn undeclared_component_errors() {
        let mut r = valid();
        r["component"] = json!("ghost");
        let d = run(r);
        assert_eq!(d.len(), 1);
        assert_eq!(d[0].rule_id.as_deref(), Some("SPEC-060"));
        assert!(d[0].message.contains("ghost"));
    }

    #[test]
    fn undeclared_part_errors() {
        let mut r = valid();
        r["parts"]["progress"] = json!({});
        let d = run(r);
        assert_eq!(d.len(), 1);
        assert!(d[0].message.contains("progress"));
    }

    #[test]
    fn child_outside_contains_errors() {
        let mut r = valid();
        r["parts"]["container"]["children"] = json!(["icon", "label", "focus-ring"]);
        let d = run(r);
        assert!(d.iter().any(|d| d.message.contains("not a recipe part")));
        assert!(d.iter().any(|d| d.message.contains("'contains'")));
    }

    #[test]
    fn root_must_be_top_level_recipe_part() {
        let mut r = valid();
        r["root"] = json!("icon");
        let d = run(r);
        assert_eq!(d.len(), 1);
        assert!(d[0].message.contains("top-level"));
        let mut r = valid();
        r["root"] = json!("focus-ring");
        let d = run(r);
        assert!(d.iter().any(|d| d.message.contains("not a recipe part")));
    }

    #[test]
    fn around_and_press_target_must_be_declared() {
        let mut r = valid();
        r["parts"]["label"]["around"] = json!("halo");
        r["parts"]["container"]["pressTarget"] = json!("focus-ring");
        let d = run(r);
        assert!(d.iter().any(|d| d.message.contains("halo")));
        assert!(d.iter().any(|d| d
            .message
            .contains("pressTarget 'focus-ring' is not a recipe part")));
    }
}
