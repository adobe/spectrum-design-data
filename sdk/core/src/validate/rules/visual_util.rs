// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Shared helpers for the visual-recipe rules (SPEC-060..063).

use serde_json::{Map, Value};

use crate::graph::{ComponentRecord, TokenGraph, TokenRecord, VisualRecord};
use crate::report::{Diagnostic, Severity};

/// The declared component a recipe names, if any.
pub(crate) fn component_of<'a>(
    graph: &'a TokenGraph,
    visual: &VisualRecord,
) -> Option<&'a ComponentRecord> {
    graph.components.iter().find(|c| c.name == visual.component)
}

pub(crate) fn error(
    rule_id: &str,
    visual: &VisualRecord,
    instance_path: &str,
    message: String,
) -> Diagnostic {
    Diagnostic {
        file: visual.file.clone(),
        token: None,
        rule_id: Some(rule_id.to_string()),
        severity: Severity::Error,
        message,
        instance_path: Some(instance_path.to_string()),
        schema_path: None,
    }
}

/// Call `f` with a JSON-pointer path for every object nested under `value`.
pub(crate) fn diagnostic(
    rule_id: &str,
    visual: &VisualRecord,
    instance_path: &str,
    severity: Severity,
    message: String,
) -> Diagnostic {
    Diagnostic {
        file: visual.file.clone(),
        token: None,
        rule_id: Some(rule_id.to_string()),
        severity,
        message,
        instance_path: Some(instance_path.to_string()),
        schema_path: None,
    }
}

pub(crate) fn warning(
    rule_id: &str,
    visual: &VisualRecord,
    instance_path: &str,
    message: String,
) -> Diagnostic {
    diagnostic(rule_id, visual, instance_path, Severity::Warning, message)
}

pub(crate) fn info(
    rule_id: &str,
    visual: &VisualRecord,
    instance_path: &str,
    message: String,
) -> Diagnostic {
    diagnostic(rule_id, visual, instance_path, Severity::Info, message)
}

/// Whether a token `name` object carries every field of a selector. A scalar selector
/// value matches an array-valued name field that contains it.
pub(crate) fn name_matches(name: &Value, sel: &Map<String, Value>) -> bool {
    sel.iter().all(|(k, want)| match name.get(k) {
        Some(Value::Array(a)) => a.contains(want),
        Some(have) => have == want,
        None => false,
    })
}

/// Tokens a `token` selector matches. A bare `font-size-{n}` style property also matches
/// the property + scaleIndex encoding.
pub(crate) fn tokens_matching<'a>(
    graph: &'a TokenGraph,
    sel: &Map<String, Value>,
) -> Vec<&'a TokenRecord> {
    let find = |sel: &Map<String, Value>| -> Vec<&'a TokenRecord> {
        graph
            .tokens
            .values()
            .filter(|t| t.raw.get("name").is_some_and(|n| name_matches(n, sel)))
            .collect()
    };
    let found = find(sel);
    if !found.is_empty() {
        return found;
    }
    let Some((base, idx)) = sel
        .get("property")
        .and_then(Value::as_str)
        .and_then(|p| p.rsplit_once('-'))
    else {
        return found;
    };
    let Ok(i) = idx.parse::<u64>() else {
        return found;
    };
    let mut alt = sel.clone();
    alt.insert("property".into(), Value::String(base.into()));
    alt.insert("scaleIndex".into(), Value::from(i));
    find(&alt)
}

/// One relationship on a component, with the token it binds (when it has a `$ref`).
pub(crate) struct RelTarget<'a> {
    pub property: String,
    pub context: Option<String>,
    pub token: Option<&'a TokenRecord>,
    /// State ids the relationship selects, from the bound token or its own scope.
    pub states: Vec<String>,
    /// Option names the relationship's `scope.options` pins (not `state`).
    pub options: Vec<String>,
}

pub(crate) fn component_relationships<'a>(
    graph: &'a TokenGraph,
    component: &str,
) -> Vec<RelTarget<'a>> {
    graph
        .relationships
        .iter()
        .filter(|r| r.raw.pointer("/scope/component").and_then(Value::as_str) == Some(component))
        .map(|r| {
            let property = r
                .raw
                .pointer("/scope/property")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string();
            let context = r
                .raw
                .get("context")
                .and_then(Value::as_str)
                .map(|c| c.trim().to_string());
            let token = r
                .raw
                .get("$ref")
                .and_then(Value::as_str)
                .and_then(|rf| graph.resolve_alias_key(rf));
            let pinned: Vec<String> = r
                .raw
                .pointer("/scope/options")
                .and_then(Value::as_object)
                .map(crate::visual::scope_states)
                .unwrap_or_default()
                .iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect();
            // A pinned relationship state replaces the bound token's own states.
            let states = match token {
                Some(t) if pinned.is_empty() => crate::visual::name_states(t.raw.get("name")),
                _ => pinned,
            };
            let options = r
                .raw
                .pointer("/scope/options")
                .and_then(Value::as_object)
                .map(|o| {
                    o.keys()
                        .filter(|k| k.as_str() != "state")
                        .cloned()
                        .collect()
                })
                .unwrap_or_default();
            RelTarget {
                property,
                context,
                token,
                states,
                options,
            }
        })
        .collect()
}

/// Whether a token has been deprecated.
pub(crate) fn is_deprecated(token: &TokenRecord) -> bool {
    token
        .raw
        .pointer("/lifecycle/deprecatedIn")
        .is_some_and(|v| !v.is_null())
}

pub(crate) fn walk_objects(value: &Value, path: &str, f: &mut dyn FnMut(&str, &Value)) {
    match value {
        Value::Object(map) => {
            f(path, value);
            for (k, v) in map {
                walk_objects(v, &format!("{path}/{k}"), f);
            }
        }
        Value::Array(items) => {
            for (i, v) in items.iter().enumerate() {
                walk_objects(v, &format!("{path}/{i}"), f);
            }
        }
        _ => {}
    }
}

/// `sizeScale` entries as `(size key, size index)` strings.
pub(crate) fn size_entries(recipe: &Value) -> Vec<(String, String)> {
    recipe
        .get("sizeScale")
        .and_then(Value::as_object)
        .map(|m| {
            m.iter()
                .map(|(k, v)| {
                    let idx = match v {
                        Value::String(s) => s.clone(),
                        other => other.to_string(),
                    };
                    (k.clone(), idx)
                })
                .collect()
        })
        .unwrap_or_default()
}

fn is_templated(s: &str) -> bool {
    s.contains("{size}") || s.contains("{sizeIndex}")
}

/// Whether any string field of a flat selector uses a size template.
pub(crate) fn has_template(selector: &Value) -> bool {
    selector
        .as_object()
        .is_some_and(|m| m.values().any(|v| v.as_str().is_some_and(is_templated)))
}

/// Expand `{size}` / `{sizeIndex}` in a flat selector over the size scale.
/// A selector without templates expands to itself.
pub(crate) fn expand_selector(selector: &Value, sizes: &[(String, String)]) -> Vec<Value> {
    if !has_template(selector) {
        return vec![selector.clone()];
    }
    let mut out: Vec<Value> = Vec::new();
    for (size, index) in sizes {
        let mut expanded = selector.clone();
        if let Some(map) = expanded.as_object_mut() {
            for v in map.values_mut() {
                if let Some(s) = v.as_str() {
                    *v = Value::String(s.replace("{sizeIndex}", index).replace("{size}", size));
                }
            }
        }
        if !out.contains(&expanded) {
            out.push(expanded);
        }
    }
    out
}

/// The `name` of each value in an option's `values` list (strings or `{value}`).
pub(crate) fn option_values(option: &Value) -> Option<Vec<Value>> {
    option.get("values")?.as_array().map(|vals| {
        vals.iter()
            .map(|v| v.get("value").cloned().unwrap_or_else(|| v.clone()))
            .collect()
    })
}

#[cfg(test)]
pub(crate) mod test_util {
    use std::path::PathBuf;

    use serde_json::{json, Value};

    use crate::graph::{
        ComponentRecord, Layer, RelationshipRecord, TokenGraph, TokenRecord, VisualRecord,
    };
    use crate::registry::RegistryData;
    use crate::report::Diagnostic;
    use crate::validate::rule::{ValidationContext, ValidationRule};

    /// A token record keyed by `key`; `lifecycle` is merged into the raw record.
    pub fn token(key: &str, name: Value, lifecycle: Option<Value>) -> TokenRecord {
        let mut raw = json!({ "name": name, "value": "1px" });
        if let Some(l) = lifecycle {
            raw["lifecycle"] = l;
        }
        TokenRecord {
            name: key.into(),
            file: PathBuf::from("tokens.json"),
            index: 0,
            schema_url: None,
            uuid: Some(key.into()),
            alias_target: None,
            raw,
            layer: Layer::Foundation,
        }
    }

    pub fn graph(
        component: Value,
        relationships: Vec<Value>,
        tokens: Vec<TokenRecord>,
        recipes: Vec<(&str, Value)>,
    ) -> TokenGraph {
        let mut g = TokenGraph::default();
        let name = component["name"].as_str().unwrap_or("switch").to_string();
        g.components.push(ComponentRecord {
            name,
            file: PathBuf::from("dataset.json"),
            raw: component,
            layer: Layer::Foundation,
        });
        for (i, raw) in relationships.into_iter().enumerate() {
            g.relationships.push(RelationshipRecord {
                file: PathBuf::from("relationships.json"),
                index: i,
                uuid: None,
                raw,
            });
        }
        for t in tokens {
            g.tokens.insert(t.name.clone(), t);
        }
        for (component, raw) in recipes {
            g.visuals.push(VisualRecord {
                component: component.into(),
                file: PathBuf::from(format!("visuals/{component}.json")),
                raw,
                layer: crate::graph::Layer::Foundation,
            });
        }
        g
    }

    pub fn run(rule: &dyn ValidationRule, g: &TokenGraph) -> Vec<Diagnostic> {
        let exceptions = std::collections::HashSet::new();
        let registry = RegistryData::embedded();
        let ctx = ValidationContext {
            graph: g,
            naming_exceptions: &exceptions,
            registry,
            manifest: None,
        };
        rule.validate(&ctx)
    }
}
