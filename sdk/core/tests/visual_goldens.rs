// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Golden SVGs: three renders per recipe, committed under
//! `tests/fixtures/visual-golden/<component>/<name>.svg`, so a change to a recipe,
//! token, relationship or the layout engine shows up in review as an SVG diff.
//!
//! After an intended change, regenerate with:
//! `VISUAL_PARITY_UPDATE=1 cargo test -p design-data-core --test visual_goldens`

use std::collections::HashMap;
use std::path::PathBuf;

use design_data_core::graph::TokenGraph;
use design_data_core::visual::{build_scene_cached, scene_to_svg, RenderRequest, SceneCache};
use serde_json::Value;

fn data_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data")
}

fn golden_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/visual-golden")
}

fn read_json(path: PathBuf) -> Value {
    serde_json::from_str(
        &std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("{path:?}: {e}")),
    )
    .unwrap_or_else(|e| panic!("{path:?}: {e}"))
}

fn load_graph() -> TokenGraph {
    let d = data_dir();
    TokenGraph::from_json_dir_with_catalogs(
        &d.join("tokens"),
        Some(&d.join("mode-sets")),
        Some(&d.join("components")),
    )
    .expect("graph")
    .with_relationships(
        TokenGraph::load_spec_relationships(&d.join("relationships")).expect("rels"),
    )
    .with_icons(TokenGraph::load_spec_icons(&d.join("icons")).expect("icons"))
    .with_visuals(TokenGraph::load_spec_visuals(&d.join("visuals")).expect("visuals"))
}

/// The option values for one golden: `pick` maps an option definition to a value or skips it.
fn pick(
    options: &serde_json::Map<String, Value>,
    f: impl Fn(&Value) -> Option<Value>,
) -> HashMap<String, Value> {
    options
        .iter()
        .filter(|(n, _)| n.as_str() != "size")
        .filter_map(|(n, def)| f(def).map(|v| (n.clone(), v)))
        .collect()
}

fn enum_at(first: bool) -> impl Fn(&Value) -> Option<Value> {
    move |def| {
        let vals = def.get("values")?.as_array()?;
        let v = if first { vals.first() } else { vals.last() }?;
        Some(v.get("value").cloned().unwrap_or_else(|| v.clone()))
    }
}

fn bools(def: &Value) -> Option<Value> {
    (def.get("type").and_then(Value::as_str) == Some("boolean")).then_some(Value::Bool(true))
}

fn requests(name: &str, recipe: &Value, component: &Value) -> Vec<(&'static str, RenderRequest)> {
    let none = serde_json::Map::new();
    let options = component
        .get("options")
        .and_then(Value::as_object)
        .unwrap_or(&none);
    let size = options
        .get("size")
        .and_then(|s| s.get("default"))
        .and_then(Value::as_str)
        .map(String::from)
        .or_else(|| {
            recipe
                .get("sizeScale")
                .and_then(Value::as_object)
                .and_then(|m| m.keys().next().cloned())
        })
        .expect("size");
    let state = component
        .get("states")
        .and_then(Value::as_array)
        .and_then(|a| {
            a.iter()
                .filter_map(|s| s.get("name").and_then(Value::as_str))
                .find(|n| *n != "disabled")
        })
        .map(String::from);
    let req = |states: Vec<String>, options: HashMap<String, Value>, scheme: &str, scale: &str| {
        RenderRequest {
            component: name.into(),
            size: size.clone(),
            states,
            options,
            mode: [("colorScheme", scheme), ("scale", scale)]
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect(),
            label: "Label".into(),
            icon: None,
            text_metrics: None,
            width: None,
        }
    };
    let mut all_on = pick(options, enum_at(false));
    all_on.extend(pick(options, bools));
    let mut out = vec![
        ("default", req(vec![], HashMap::new(), "light", "desktop")),
        (
            "all-on-dark-mobile",
            req(state.into_iter().collect(), all_on, "dark", "mobile"),
        ),
        (
            "first-values-wireframe",
            req(vec![], pick(options, enum_at(true)), "wireframe", "desktop"),
        ),
    ];
    // Badge wraps its label (`overflow`): a narrow width forces two lines, and the icon
    // centres on the first.
    if name == "badge" {
        let narrow = |icon: bool| {
            let mut r = req(vec![], HashMap::new(), "light", "desktop");
            r.label = "Three word label".into();
            r.width = Some(if icon { 104.0 } else { 80.0 });
            if icon {
                r.options.insert("icon".into(), Value::Bool(true));
            }
            r
        };
        out.push(("wrapped-label-narrow", narrow(false)));
        out.push(("wrapped-label-icon-narrow", narrow(true)));
    }
    // The item with its trailing action button and switch (nested recipes), at the default
    // size: the case the M size Figma measurements are compared with.
    if name == "accordion" {
        let on = ["hasActionButton", "hasSwitch"]
            .iter()
            .map(|o| (o.to_string(), Value::Bool(true)))
            .collect();
        out.push(("direct-actions", req(vec![], on, "light", "desktop")));
    }
    out
}

#[test]
fn recipe_renders_match_the_golden_svgs() {
    let graph = load_graph();
    let cache = SceneCache::default();
    let update = std::env::var("VISUAL_PARITY_UPDATE").is_ok_and(|v| v == "1");
    let mut recipes: Vec<String> = std::fs::read_dir(data_dir().join("visuals"))
        .expect("visuals dir")
        .filter_map(|e| e.ok())
        .filter_map(|e| {
            let p = e.path();
            (p.extension().is_some_and(|x| x == "json"))
                .then(|| p.file_stem().unwrap().to_string_lossy().into_owned())
        })
        .collect();
    recipes.sort();
    assert!(!recipes.is_empty());

    let mut problems = Vec::new();
    for name in recipes {
        let recipe = read_json(data_dir().join(format!("visuals/{name}.json")));
        let component = read_json(data_dir().join(format!("components/{name}.json")));
        for (golden, req) in requests(&name, &recipe, &component) {
            let svg = scene_to_svg(
                &build_scene_cached(&graph, &recipe, &req, &cache)
                    .unwrap_or_else(|e| panic!("{name}/{golden}: {e}")),
            );
            let file = golden_dir().join(&name).join(format!("{golden}.svg"));
            if update {
                std::fs::create_dir_all(file.parent().unwrap()).unwrap();
                std::fs::write(&file, &svg).unwrap();
                continue;
            }
            match std::fs::read_to_string(&file) {
                Ok(g) if g == svg => {}
                Ok(_) => problems.push(format!("{name}/{golden}: differs from the golden")),
                Err(_) => problems.push(format!(
                    "{name}/{golden}: missing golden; run with VISUAL_PARITY_UPDATE=1"
                )),
            }
        }
    }
    assert!(problems.is_empty(), "{}", problems.join("\n"));
}
