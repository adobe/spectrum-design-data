// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Shared helpers for the behavior contract rules (SPEC-118..120). All are warnings: no
//! component has a contract yet (spec/behavior-contract.md, "Expand, migrate, contract").

use std::collections::HashSet;

use serde_json::Value;

use crate::graph::{BehaviorRecord, TokenGraph};
use crate::registry::RegistryData;
use crate::report::{Diagnostic, Severity};

pub(crate) fn warning(
    rule_id: &str,
    b: &BehaviorRecord,
    instance_path: &str,
    message: String,
) -> Diagnostic {
    Diagnostic {
        file: b.file.clone(),
        token: None,
        rule_id: Some(rule_id.to_string()),
        severity: Severity::Warning,
        message,
        instance_path: Some(instance_path.to_string()),
        schema_path: None,
    }
}

/// Option names the component declares, or `None` when it is not loaded (rules skip then).
pub(crate) fn option_names(graph: &TokenGraph, b: &BehaviorRecord) -> Option<HashSet<String>> {
    let c = graph.components.iter().find(|c| c.name == b.component)?;
    Some(
        c.raw
            .get("options")
            .and_then(Value::as_object)
            .map(|o| o.keys().cloned().collect())
            .unwrap_or_default(),
    )
}

/// Anatomy part names the component declares, or `None` when it declares no anatomy.
pub(crate) fn part_names(graph: &TokenGraph, b: &BehaviorRecord) -> Option<HashSet<String>> {
    let c = graph.components.iter().find(|c| c.name == b.component)?;
    let parts = c.raw.get("anatomy")?.as_array()?;
    Some(
        parts
            .iter()
            .filter_map(|p| p.get("name")?.as_str().map(String::from))
            .collect(),
    )
}

/// The `state` option ids a contract lists.
pub(crate) fn state_ids(b: &BehaviorRecord) -> HashSet<String> {
    b.raw
        .get("state")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|s| s.as_str().map(String::from))
        .collect()
}

/// The values a facet may take in this contract: its own declaration, else the registry value
/// list of an interaction facet. `None` when the contract cannot read the facet.
pub(crate) fn facet_values(
    b: &BehaviorRecord,
    registry: &RegistryData,
    name: &str,
) -> Option<HashSet<String>> {
    if let Some(f) = b
        .raw
        .pointer(&format!("/facets/{name}/values"))
        .and_then(Value::as_object)
    {
        return Some(f.keys().cloned().collect());
    }
    registry
        .facet(name)
        .filter(|f| f.interaction)
        .map(|f| f.values.clone())
}

#[cfg(test)]
pub(crate) mod test_util {
    use std::path::PathBuf;

    use serde_json::{json, Value};

    use crate::graph::{BehaviorRecord, ComponentRecord, Layer, TokenGraph};

    pub type Case = (Box<dyn FnOnce(&mut Value)>, &'static str);

    /// A switch with options and anatomy, plus the given contracts.
    pub fn graph(contracts: Vec<Value>) -> TokenGraph {
        let mut g = TokenGraph::default();
        g.components.push(ComponentRecord {
            name: "switch".into(),
            file: PathBuf::from("dataset.json"),
            raw: json!({
                "name": "switch",
                "options": {
                    "isSelected": { "type": "boolean" },
                    "isDisabled": { "type": "boolean" }
                },
                "anatomy": [{ "name": "track" }, { "name": "handle" }]
            }),
            layer: Layer::Foundation,
        });
        for raw in contracts {
            g.behaviors.push(BehaviorRecord {
                component: raw["component"].as_str().unwrap_or("switch").into(),
                file: PathBuf::from("behaviors/switch.json"),
                raw,
            });
        }
        g
    }

    /// A contract that passes every behavior rule, for tests to break one field at a time.
    pub fn good() -> Value {
        json!({
            "component": "switch",
            "extends": ["interactive"],
            "state": ["isSelected", "isDisabled"],
            "facets": {
                "checked": { "from": "isSelected", "values": { "unchecked": false, "checked": true } },
                "disabled": { "from": "isDisabled", "values": { "false": false, "true": true } }
            },
            "parts": { "track": { "role": "switch", "focus": "tab-stop", "press": "activate" } },
            "transitions": [{
                "on": "activate",
                "guard": { "facet": "disabled", "is": "false" },
                "do": { "toggle": "isSelected" },
                "emit": "change"
            }],
            "semantics": { "track": { "checked": { "ariaState": "aria-checked", "map": { "unchecked": "false", "checked": "true" } } } },
            "vectors": [{
                "name": "activate checks an unchecked switch",
                "start": { "isSelected": false },
                "steps": [{ "intent": "activate" }],
                "expect": [{ "after": 1, "facets": { "checked": "checked" } }]
            }]
        })
    }

    pub fn run(rule: &dyn crate::validate::rule::ValidationRule, g: &TokenGraph) -> Vec<String> {
        let exceptions = std::collections::HashSet::new();
        let ctx = crate::validate::rule::ValidationContext {
            graph: g,
            naming_exceptions: &exceptions,
            registry: crate::registry::RegistryData::embedded(),
            manifest: None,
        };
        rule.validate(&ctx).into_iter().map(|d| d.message).collect()
    }
}
