// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-079: platform-recipe-resolves
//!
//! With a platform manifest in scope, a platform-owned recipe (one in the platform's
//! `extensions/visuals/`) MUST render over the request grid without a scene diagnostic.
//! No foundation comparison: a replaced or platform-only recipe has nothing to diff against.
//! A warning for now; promotion to an error is tracked separately. A silent no-op without a
//! manifest or without platform recipes.

use std::collections::BTreeSet;

use serde_json::Value;

use crate::graph::Layer;
use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::spec076::requests;
use crate::validate::rules::visual_util::{component_of, platform_graph, warning};
use crate::visual::{build_scene_cached, SceneCache};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-079"
    }

    fn name(&self) -> &'static str {
        "platform-recipe-resolves"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let Some(manifest) = ctx.manifest else {
            return vec![];
        };
        let Some(platform_graph) = platform_graph(ctx.graph, manifest) else {
            return vec![];
        };
        let platform = manifest
            .get("platform")
            .and_then(Value::as_str)
            .unwrap_or("platform");
        let mut out = Vec::new();
        for v in platform_graph
            .visuals
            .iter()
            .filter(|v| v.layer == Layer::Platform)
        {
            if component_of(&platform_graph, v).is_none() {
                continue; // SPEC-060 covers undeclared component
            }
            let cache = SceneCache::default();
            let mut found = BTreeSet::new();
            for req in requests(&platform_graph, v) {
                match build_scene_cached(&platform_graph, &v.raw, &req, &cache) {
                    Ok(scene) => found.extend(scene.diagnostics),
                    Err(e) => {
                        found.insert(e);
                    }
                }
            }
            for d in found {
                out.push(warning(
                    self.id(),
                    v,
                    "/parts",
                    format!(
                        "Platform recipe for '{}' does not render under platform '{platform}': {d}",
                        v.component
                    ),
                ));
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use serde_json::{json, Value};

    use super::Rule;
    use crate::graph::TokenGraph;
    use crate::registry::RegistryData;
    use crate::report::Diagnostic;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::visual_util::test_util::{graph, token};

    fn recipe(property: &str) -> Value {
        json!({ "component": "button", "root": "container", "sizeScale": { "m": 100 },
            "parts": { "container": { "kind": "box", "props": {
                "height": { "token": { "property": property } } } } } })
    }

    fn fixture() -> TokenGraph {
        graph(
            json!({ "name": "button", "options": { "size": { "type": "string", "default": "m",
                "values": [{ "value": "m" }] } } }),
            vec![],
            vec![token(
                "h",
                json!({ "property": "component-height-100" }),
                None,
            )],
            vec![("button", recipe("component-height-100"))],
        )
    }

    fn manifest(property: &str) -> Value {
        json!({ "platform": "fixture", "extensions": { "visuals": [
            { "file": "button.json", "recipe": recipe(property) } ] } })
    }

    fn check(g: &TokenGraph, manifest: Option<&Value>) -> Vec<Diagnostic> {
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest,
        };
        Rule.validate(&ctx)
    }

    #[test]
    fn ignores_a_run_without_a_manifest_or_platform_recipes() {
        assert!(check(&fixture(), None).is_empty());
        let m = json!({ "platform": "fixture" });
        assert!(check(&fixture(), Some(&m)).is_empty());
    }

    #[test]
    fn warns_when_a_platform_recipe_does_not_resolve() {
        let out = check(&fixture(), Some(&manifest("component-missing-100")));
        assert!(!out.is_empty(), "{out:?}");
        assert!(out[0].message.contains("platform 'fixture'"), "{out:?}");
    }

    #[test]
    fn passes_a_platform_recipe_that_resolves() {
        assert!(check(&fixture(), Some(&manifest("component-height-100"))).is_empty());
    }
}
