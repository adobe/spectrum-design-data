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

use serde_json::Value;

use crate::graph::{ComponentRecord, TokenGraph, VisualRecord};
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
