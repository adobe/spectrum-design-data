// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-080: platform-recipe-replaces-foundation
//!
//! A platform recipe with the same component name as a foundation recipe replaces it for
//! that platform. Reports the pair so a reviewer can see a copy that may drift. Info only;
//! a silent no-op without a manifest or without platform recipes.

use std::path::PathBuf;

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-080"
    }

    fn name(&self) -> &'static str {
        "platform-recipe-replaces-foundation"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let Some(manifest) = ctx.manifest else {
            return vec![];
        };
        let platform = manifest
            .get("platform")
            .and_then(Value::as_str)
            .unwrap_or("platform");
        let entries = manifest
            .get("extensions")
            .and_then(|e| e.get("visuals"))
            .and_then(Value::as_array)
            .into_iter()
            .flatten();
        let mut out = Vec::new();
        for entry in entries {
            let Some(component) = entry
                .get("recipe")
                .and_then(|r| r.get("component"))
                .and_then(Value::as_str)
            else {
                continue;
            };
            if !ctx.graph.visuals.iter().any(|v| v.component == component) {
                continue;
            }
            out.push(Diagnostic {
                file: PathBuf::from(entry.get("file").and_then(Value::as_str).unwrap_or("")),
                token: None,
                rule_id: Some(self.id().to_string()),
                severity: Severity::Info,
                message: format!(
                    "Recipe for '{component}' in platform '{platform}' replaces the foundation recipe"
                ),
                instance_path: Some("/component".to_string()),
                schema_path: None,
            });
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use serde_json::{json, Value};

    use super::Rule;
    use crate::registry::RegistryData;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::visual_util::test_util::{graph, token};

    fn count(manifest: Option<&Value>) -> usize {
        let g = graph(
            json!({ "name": "button" }),
            vec![],
            vec![token("h", json!({ "property": "x" }), None)],
            vec![("button", json!({ "component": "button" }))],
        );
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest,
        };
        Rule.validate(&ctx).len()
    }

    fn manifest(component: &str) -> Value {
        json!({ "platform": "fixture", "extensions": { "visuals": [
            { "file": "x.json", "recipe": { "component": component } } ] } })
    }

    #[test]
    fn reports_a_recipe_that_replaces_a_foundation_recipe() {
        assert_eq!(count(Some(&manifest("button"))), 1);
    }

    #[test]
    fn ignores_a_platform_only_recipe_and_a_run_without_a_manifest() {
        assert_eq!(count(Some(&manifest("button-ios"))), 0);
        assert_eq!(count(None), 0);
    }
}
