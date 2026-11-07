// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Write a static, server-free component explorer: HTML plus a vanilla JS renderer
//! over recipes whose token bindings were resolved at build time.

use std::collections::HashMap;
use std::path::Path;

use design_data_core::graph::{Layer, TokenGraph};
use design_data_core::manifest::PlatformIdentity;
use design_data_core::naming::extract_legacy_key;
use design_data_core::text_metrics::{DEFAULT_TABLE_JSON, DEFAULT_TABLE_LICENSE};
use design_data_core::visual;
use design_data_figma as figma;

const INDEX: &str = include_str!("../assets/index.html");
const BACKEND: &str = include_str!("../assets/backend.js");
const RUNTIME: &str = include_str!("../assets/visual-runtime.js");
const CONTENT: &str = include_str!("../assets/content-controls.js");
const CONSTRAINTS: &str = include_str!("../assets/constraints.js");
const SWITCHER: &str = include_str!("../assets/platform-switcher.js");
const CONTROLS: &str = include_str!("../assets/spectrum-controls.js");
const NOTICES: &str = include_str!("../assets/THIRD-PARTY-NOTICES.txt");

/// Write the site for `components` (all when empty) to `out`. Returns the number
/// of components that had a visual recipe. Recipes come from `graph.visuals`; under a
/// platform, only components the platform implements are listed, and `componentAliases`
/// lists the alias key with its target's data and hides the target.
pub fn write_site(
    graph: &TokenGraph,
    components: &[String],
    out: &Path,
    platform: Option<&PlatformIdentity>,
    text_metrics: Option<&str>,
) -> Result<usize, String> {
    let modes: Vec<HashMap<String, String>> = ["light", "dark", "wireframe"]
        .iter()
        .flat_map(|cs| {
            ["desktop", "mobile"].iter().map(move |sc| {
                HashMap::from([
                    ("colorScheme".to_string(), cs.to_string()),
                    ("scale".to_string(), sc.to_string()),
                ])
            })
        })
        .collect();

    let mut list = Vec::new();
    let mut by_name = serde_json::Map::new();
    let mut compiled = serde_json::Map::new();
    let mut comps: Vec<_> = graph.components.iter().collect();
    comps.sort_by(|a, b| a.name.cmp(&b.name));
    for c in comps {
        if !components.is_empty() && !components.contains(&c.name) {
            continue;
        }
        if graph.is_alias_target(&c.name) {
            continue;
        }
        let canonical = graph.canonical_component(&c.name);
        if platform.is_some_and(|p| !implemented_by(graph, canonical, &p.id)) {
            continue;
        }
        let display = c
            .raw
            .get("displayName")
            .and_then(|v| v.as_str())
            .unwrap_or(&c.name)
            .to_string();
        let recipe = graph.visual_recipe(&c.name);
        let mut entry = serde_json::json!({
            "name": c.name, "displayName": display, "hasVisual": recipe.is_some()
        });
        if platform.is_some() {
            let platform_owned =
                recipe.map_or(c.layer == Layer::Platform, |r| r.layer == Layer::Platform);
            entry["source"] = if platform_owned {
                "platform"
            } else {
                "foundation"
            }
            .into();
            if canonical != c.name {
                entry["aliasOf"] = canonical.into();
            }
        }
        list.push(entry);
        let Some(recipe) = recipe.map(|r| &r.raw) else {
            continue;
        };
        let (used, structural) = visual::recipe_options_in(graph, recipe, canonical);
        let mut def = graph
            .components
            .iter()
            .find(|x| x.name == canonical)
            .unwrap_or(c)
            .raw
            .clone();
        def["recipe"] = serde_json::json!({
            "sizeScale": recipe.get("sizeScale"),
            "used": used,
            "structural": structural,
        });
        by_name.insert(c.name.clone(), def);
        compiled.insert(
            c.name.clone(),
            visual::compile_recipe(graph, recipe, canonical, &modes)
                .map_err(|e| format!("{}: {e}", c.name))?,
        );
    }
    list.sort_by(|a, b| a["displayName"].as_str().cmp(&b["displayName"].as_str()));
    let figma = figma_names(graph, &compiled)?;
    let mut data = serde_json::json!({
        "components": list, "byName": by_name, "compiled": compiled, "figma": figma,
        "icons": workflow_icons(graph),
    });
    if let Some(p) = platform {
        data["platform"] = serde_json::json!({ "id": p.id, "name": p.name });
    }

    std::fs::create_dir_all(out).map_err(|e| format!("failed to create {}: {e}", out.display()))?;
    let write = |name: &str, body: &str| -> Result<(), String> {
        std::fs::write(out.join(name), body).map_err(|e| format!("failed to write {name}: {e}"))
    };
    write("index.html", INDEX)?;
    write("backend.js", BACKEND)?;
    write("visual-runtime.js", RUNTIME)?;
    write("spectrum-controls.js", CONTROLS)?;
    write("THIRD-PARTY-NOTICES.txt", NOTICES)?;
    write("constraints.js", CONSTRAINTS)?;
    write("content-controls.js", CONTENT)?;
    write("platform-switcher.js", SWITCHER)?;
    // The caller validated an override; with none, ship the default table and its licence.
    write(
        "text-metrics.json",
        text_metrics.unwrap_or(DEFAULT_TABLE_JSON),
    )?;
    if text_metrics.is_none() {
        write("OFL-SourceSans3.txt", DEFAULT_TABLE_LICENSE)?;
    }
    write(
        "data.json",
        &serde_json::to_string(&data).map_err(|e| e.to_string())?,
    )?;
    write(".nojekyll", "")?;
    Ok(compiled.len())
}

/// The demo workflow icons (one drawing each), keyed `workflow:<name>` like a compiled
/// recipe's `drawings`, so the explorer can swap a content icon without the catalog.
fn workflow_icons(graph: &TokenGraph) -> serde_json::Map<String, serde_json::Value> {
    graph
        .icons
        .iter()
        .filter(|s| s.set == "workflow")
        .filter_map(|s| s.raw.get("icons")?.as_object())
        .flatten()
        .map(|(name, icon)| {
            (
                format!("workflow:{name}"),
                serde_json::json!({ "viewBox": icon.get("viewBox"), "paths": icon.get("paths") }),
            )
        })
        .collect()
}

/// Whether `component` has an implementation row the platform's manifest owns (the
/// cascade stamps each merged row's `implementation` with the platform id).
fn implemented_by(graph: &TokenGraph, component: &str, platform_id: &str) -> bool {
    graph
        .components
        .iter()
        .find(|c| c.name == component)
        .and_then(|c| c.raw.get("implementations"))
        .and_then(|rows| rows.as_array())
        .is_some_and(|rows| {
            rows.iter()
                .any(|r| r.get("implementation").and_then(|v| v.as_str()) == Some(platform_id))
        })
}

/// Collect the token labels (and alias-chain hops) a compiled recipe refers to.
fn referenced_labels(v: &serde_json::Value, out: &mut std::collections::HashSet<String>) {
    match v {
        serde_json::Value::Object(m) => {
            for (k, val) in m {
                match (k.as_str(), val) {
                    ("token", serde_json::Value::String(s)) => {
                        out.insert(s.clone());
                    }
                    ("chain", serde_json::Value::Array(a)) => {
                        out.extend(a.iter().filter_map(|x| x.as_str().map(String::from)));
                    }
                    _ => referenced_labels(val, out),
                }
            }
        }
        serde_json::Value::Array(a) => a.iter().for_each(|x| referenced_labels(x, out)),
        _ => {}
    }
}

/// Figma collection and variable name for each token the compiled recipes use.
fn figma_names(
    graph: &TokenGraph,
    compiled: &serde_json::Map<String, serde_json::Value>,
) -> Result<serde_json::Map<String, serde_json::Value>, String> {
    let mut labels = std::collections::HashSet::new();
    compiled
        .values()
        .for_each(|c| referenced_labels(c, &mut labels));
    let specs = figma::mapping::collection_specs(&graph.mode_sets).map_err(|e| e.to_string())?;
    let tokens = figma::mapping::export_tokens(graph).map_err(|e| e.to_string())?;
    let names = figma::mapping::variable_names(&tokens, &specs, None);
    let mut out = serde_json::Map::new();
    for rec in graph.tokens.values() {
        let label = visual::token_label(rec);
        if !labels.contains(&label) || out.contains_key(&label) {
            continue;
        }
        let Some(key) = rec.raw.get("name").and_then(extract_legacy_key) else {
            continue;
        };
        if let Some(n) = names.get(&key) {
            out.insert(
                label,
                serde_json::json!({ "collection": n.collection, "name": n.name }),
            );
        }
    }
    Ok(out)
}
