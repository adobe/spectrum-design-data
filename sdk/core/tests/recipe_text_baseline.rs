// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Ratchet for text that should draw and does not.
//!
//! Each recipe renders once with its default options and the request label "Label", the way
//! the explorer renders a component whose Label text is on. A text part that takes the request
//! label (no `text` binding, or `text.option` = `label`) must then draw it. The part is flagged
//! when its scene node has no text, or has text with no size or no width. A nested component's
//! parts are looked up in the nested recipe (`field-label.label`). The recipe snapshots hash the
//! SVG, so a label that silently drew nothing still matched its snapshot.
//!
//! The baseline is empty since the nested label follows the request label (layout revision 8):
//! keep it empty. The flagged parts, if any, are committed in `tests/fixtures/recipe-text-baseline.json`. A new one
//! fails the test, and a fixed one must be removed from the baseline. Regenerate with:
//! `UPDATE_RECIPE_TEXT_BASELINE=1 cargo test -p design-data-core --test recipe_text_baseline`

use std::collections::BTreeMap;
use std::path::PathBuf;

use design_data_core::graph::TokenGraph;
use design_data_core::visual::{build_scene_cached, RenderRequest, SceneCache};
use serde_json::Value;

type Flags = BTreeMap<String, Vec<String>>;

fn data_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data")
}

fn baseline_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/recipe-text-baseline.json")
}

fn recipe(name: &str) -> Option<Value> {
    let text = std::fs::read_to_string(data_dir().join(format!("visuals/{name}.json"))).ok()?;
    serde_json::from_str(&text).ok()
}

/// The recipe part a scene node id names, following `host.child` into nested recipes.
fn part_of(name: &str, id: &str) -> Option<Value> {
    let recipe = recipe(name)?;
    let (head, rest) = id.split_once('.').map_or((id, None), |(h, r)| (h, Some(r)));
    let part = recipe.get("parts")?.get(head)?.clone();
    match rest {
        None => Some(part),
        // A component part names its recipe, else the anatomy part's own name does.
        Some(rest) => part_of(
            part.get("component")
                .and_then(Value::as_str)
                .unwrap_or(head),
            rest,
        ),
    }
}

fn takes_the_request_label(part: &Value) -> bool {
    part.get("kind").and_then(Value::as_str) == Some("text")
        && part
            .get("text")
            .and_then(|t| t.get("option"))
            .is_none_or(|o| o.as_str() == Some("label"))
}

fn graph() -> TokenGraph {
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
    .with_behaviors_dir(&d.join("behaviors"))
    .expect("behaviors")
}

fn nested_label(label: &str, option: Option<Value>) -> String {
    let mut req = RenderRequest {
        component: "text-field".into(),
        size: "m".into(),
        label: label.into(),
        ..Default::default()
    };
    if let Some(v) = option {
        req.options.insert("label".into(), v);
    }
    let scene = build_scene_cached(
        &graph(),
        &recipe("text-field").unwrap(),
        &req,
        &SceneCache::default(),
    )
    .expect("scene");
    scene
        .nodes
        .iter()
        .find(|n| n.part == "field-label.label")
        .and_then(|n| n.text.clone())
        .unwrap_or_default()
}

#[test]
fn the_nested_label_follows_the_request_label_and_the_label_option() {
    assert_eq!(nested_label("Hello", None), "Hello");
    assert_eq!(nested_label("Hello", Some(Value::Bool(true))), "Hello");
    assert_eq!(nested_label("Hello", Some(Value::Bool(false))), "");
    assert_eq!(nested_label("", None), "");
    assert_eq!(
        nested_label("Hello", Some(Value::String("Opt".into()))),
        "Opt"
    );
}

fn flagged(graph: &TokenGraph, name: &str) -> Vec<String> {
    let recipe = recipe(name).expect("recipe");
    let size = recipe
        .get("sizeScale")
        .and_then(Value::as_object)
        .map(|m| {
            if m.contains_key("m") {
                "m"
            } else {
                m.keys().next().map_or("m", |k| k)
            }
        })
        .unwrap_or("m")
        .to_string();
    let req = RenderRequest {
        component: name.into(),
        size,
        label: "Label".into(),
        ..Default::default()
    };
    let Ok(scene) = build_scene_cached(graph, &recipe, &req, &SceneCache::default()) else {
        return Vec::new();
    };
    let mut out: Vec<String> = scene
        .nodes
        .iter()
        .filter(|n| n.kind == "text")
        .filter(|n| part_of(name, &n.part).is_some_and(|p| takes_the_request_label(&p)))
        .filter(|n| {
            let text = n.text.as_deref().unwrap_or_default();
            text.is_empty() || n.font_size <= 0.0 || n.w <= 0.0
        })
        .map(|n| n.part.clone())
        .collect();
    out.sort();
    out.dedup();
    out
}

#[test]
fn text_parts_that_take_the_label_draw_it() {
    let d = data_dir();
    let graph = TokenGraph::from_json_dir_with_catalogs(
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
    .with_behaviors_dir(&d.join("behaviors"))
    .expect("behaviors");

    let mut actual = Flags::new();
    for entry in std::fs::read_dir(d.join("visuals"))
        .expect("visuals dir")
        .flatten()
    {
        let path = entry.path();
        if path.extension().is_none_or(|x| x != "json") {
            continue;
        }
        let name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap()
            .to_string();
        let parts = flagged(&graph, &name);
        if !parts.is_empty() {
            actual.insert(name, parts);
        }
    }

    if std::env::var_os("UPDATE_RECIPE_TEXT_BASELINE").is_some() {
        std::fs::write(
            baseline_path(),
            serde_json::to_string_pretty(&actual).unwrap() + "\n",
        )
        .expect("write baseline");
        return;
    }
    let baseline: Flags = serde_json::from_str(
        &std::fs::read_to_string(baseline_path()).expect("read recipe-text-baseline.json"),
    )
    .expect("parse baseline");

    let mut problems = Vec::new();
    for name in actual.keys().chain(baseline.keys()) {
        let (a, b) = (actual.get(name), baseline.get(name));
        if a != b {
            problems.push(format!(
                "{name}: draws no label text for {a:?}, baseline has {b:?}. Fix the recipe, or after a fix lower the baseline (UPDATE_RECIPE_TEXT_BASELINE=1)."
            ));
        }
    }
    problems.dedup();
    assert!(problems.is_empty(), "\n{}\n", problems.join("\n"));
}
