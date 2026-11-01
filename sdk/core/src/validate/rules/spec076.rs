// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-076: visual-bindings-resolve-on-platform
//!
//! With a platform manifest in scope, every token or relationship binding a recipe
//! resolves on the foundation SHOULD also resolve once the manifest's cascade is applied.
//! Reuses the render scene diagnostics, so the check cannot drift from what a render reports.
//! A silent no-op without a manifest or without recipes.

use std::collections::{BTreeSet, HashMap};

use serde_json::Value;

use crate::graph::{TokenGraph, VisualRecord};
use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::visual_util::{
    component_of, option_values, platform_recipe_components, size_entries, warning,
};
use crate::visual::{build_scene_cached, recipe_options_in, RenderRequest, SceneCache};

pub struct Rule;

const COLOR_SCHEMES: [&str; 2] = ["light", "dark"];
const SCALES: [&str; 2] = ["desktop", "mobile"];
const STATES: [&str; 3] = ["hover", "down", "keyboard-focus"];

/// Requests that cover a recipe's bindings: the default for every size, mode and scale, then
/// each interaction state and each used option value on its own.
pub(crate) fn requests(graph: &TokenGraph, v: &VisualRecord) -> Vec<RenderRequest> {
    let sizes: Vec<String> = size_entries(&v.raw).into_iter().map(|(k, _)| k).collect();
    let (used, _) = recipe_options_in(graph, &v.raw, &v.component);
    let declared = component_of(graph, v)
        .and_then(|c| c.raw.get("options"))
        .and_then(Value::as_object);
    let mut variants: Vec<(Vec<String>, HashMap<String, Value>)> = vec![(vec![], HashMap::new())];
    for s in STATES {
        variants.push((vec![s.to_string()], HashMap::new()));
    }
    for name in used.iter().filter(|n| *n != "size") {
        let Some(opt) = declared.and_then(|d| d.get(name)) else {
            continue;
        };
        let values = option_values(opt).unwrap_or_else(|| {
            if opt.get("type").and_then(Value::as_str) == Some("boolean") {
                vec![Value::Bool(true), Value::Bool(false)]
            } else {
                vec![]
            }
        });
        for value in values {
            variants.push((vec![], HashMap::from([(name.clone(), value)])));
        }
    }
    let mut out = Vec::new();
    for size in &sizes {
        for cs in COLOR_SCHEMES {
            for scale in SCALES {
                for (states, options) in &variants {
                    out.push(RenderRequest {
                        component: v.component.clone(),
                        size: size.clone(),
                        states: states.clone(),
                        options: options.clone(),
                        mode: HashMap::from([
                            ("colorScheme".to_string(), cs.to_string()),
                            ("scale".to_string(), scale.to_string()),
                        ]),
                        label: "Label".into(),
                    });
                }
            }
        }
    }
    out
}

fn diagnostics_for(graph: &TokenGraph, v: &VisualRecord) -> BTreeSet<String> {
    let cache = SceneCache::default();
    requests(graph, v)
        .iter()
        .filter_map(|req| build_scene_cached(graph, &v.raw, req, &cache).ok())
        .flat_map(|scene| scene.diagnostics)
        .collect()
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-076"
    }

    fn name(&self) -> &'static str {
        "visual-bindings-resolve-on-platform"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let Some(manifest) = ctx.manifest else {
            return vec![];
        };
        if ctx.graph.visuals.is_empty() {
            return vec![];
        }
        let platform = manifest
            .get("platform")
            .and_then(Value::as_str)
            .unwrap_or("platform");
        let mut platform_graph = ctx.graph.clone();
        if platform_graph.apply_platform_manifest(manifest).is_err() {
            return vec![]; // manifest errors belong to SPEC-039 and `validate-manifest`
        }
        let replaced = platform_recipe_components(manifest);
        let mut out = Vec::new();
        for v in &ctx.graph.visuals {
            if component_of(ctx.graph, v).is_none() {
                continue; // SPEC-060 covers undeclared component
            }
            if replaced.contains(&v.component.as_str()) {
                continue; // the platform recipe replaces it; SPEC-079 checks that one
            }
            let foundation = diagnostics_for(ctx.graph, v);
            for d in diagnostics_for(&platform_graph, v).difference(&foundation) {
                out.push(warning(
                    self.id(),
                    v,
                    "/parts",
                    format!(
                        "Recipe for '{}' binds something that resolves on the foundation but not under platform '{platform}': {d}",
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
            vec![(
                "button",
                json!({ "component": "button", "root": "container", "sizeScale": { "m": 100 },
                    "parts": { "container": { "kind": "box", "props": {
                        "height": { "token": { "property": "component-height-100" } } } } } }),
            )],
        )
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
    fn ignores_a_dataset_without_a_manifest() {
        assert!(check(&fixture(), None).is_empty());
    }

    #[test]
    fn passes_when_the_platform_keeps_every_binding() {
        let m = json!({ "platform": "keep", "exclude": ["colorScheme=wireframe"] });
        assert!(check(&fixture(), Some(&m)).is_empty());
    }

    #[test]
    fn warns_when_the_platform_drops_a_bound_token() {
        let m = json!({ "platform": "drop", "exclude": ["property=component-height-100"] });
        let out = check(&fixture(), Some(&m));
        assert_eq!(out.len(), 1, "{out:?}");
        assert!(out[0].message.contains("platform 'drop'"));
    }

    #[test]
    fn skips_a_recipe_the_platform_replaces() {
        let m = json!({ "platform": "drop", "exclude": ["property=component-height-100"],
            "extensions": { "visuals": [{ "file": "button.json", "recipe": { "component": "button" } }] } });
        assert!(check(&fixture(), Some(&m)).is_empty());
    }

    #[test]
    fn does_not_blame_the_platform_for_a_foundation_gap() {
        let mut g = fixture();
        g.tokens.clear();
        let m = json!({ "platform": "keep" });
        assert!(check(&g, Some(&m)).is_empty());
    }
}
