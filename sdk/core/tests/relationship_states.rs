// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! A relationship's `scope.options.state` counts as a state of the token it binds, so a
//! recipe can bind a stateful color through a relationship even when the tokens are
//! plain palette steps whose names carry no state.

use std::collections::HashMap;
use std::path::PathBuf;

use design_data_core::graph::{
    ComponentRecord, Layer, RelationshipRecord, TokenGraph, TokenRecord,
};
use design_data_core::visual::{build_scene, compile_recipe, RenderRequest};
use serde_json::{json, Value};

fn token(key: &str, scale: u32, value: &str) -> TokenRecord {
    TokenRecord {
        name: key.into(),
        file: PathBuf::from("tokens.json"),
        index: 0,
        schema_url: None,
        uuid: Some(key.into()),
        alias_target: None,
        raw: json!({
            "name": {"property": "color", "colorFamily": "gray", "scaleIndex": scale, "colorScheme": "light"},
            "value": value,
        }),
        layer: Layer::Foundation,
    }
}

fn relationship(i: usize, token: &str, options: Option<Value>) -> RelationshipRecord {
    let mut scope = json!({"component": "widget", "property": "color"});
    if let Some(o) = options {
        scope["options"] = o;
    }
    RelationshipRecord {
        file: PathBuf::from("relationships.json"),
        index: i,
        uuid: None,
        raw: json!({"scope": scope, "context": "Fill", "$ref": token}),
    }
}

fn graph() -> TokenGraph {
    let mut g = TokenGraph::default();
    for t in [
        token("gray-800", 800, "rgb(1, 1, 1)"),
        token("gray-900", 900, "rgb(2, 2, 2)"),
    ] {
        g.tokens.insert(t.name.clone(), t);
    }
    g.components.push(ComponentRecord {
        name: "widget".into(),
        file: PathBuf::from("dataset.json"),
        raw: json!({"name": "widget", "options": {}}),
        layer: Layer::Foundation,
    });
    g.relationships.push(relationship(0, "gray-800", None));
    g.relationships.push(relationship(
        1,
        "gray-900",
        Some(json!({"state": ["hover"]})),
    ));
    g
}

fn recipe() -> Value {
    json!({
        "component": "widget",
        "root": "box",
        "sizeScale": {"m": 100},
        "parts": {"box": {"kind": "box", "props": {
            "width": {"value": 10},
            "height": {"value": 10},
            "fill": {"relationship": {"property": "color", "context": "Fill"}}
        }}}
    })
}

fn mode() -> HashMap<String, String> {
    [("colorScheme", "light"), ("scale", "desktop")]
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_string()))
        .collect()
}

fn fill(states: &[&str]) -> Option<String> {
    let req = RenderRequest {
        component: "widget".into(),
        size: "m".into(),
        states: states.iter().map(|s| s.to_string()).collect(),
        mode: mode(),
        ..Default::default()
    };
    let scene = build_scene(&graph(), &recipe(), &req).unwrap();
    assert!(scene.diagnostics.is_empty(), "{:?}", scene.diagnostics);
    scene.nodes.iter().find(|n| n.part == "box")?.fill.clone()
}

#[test]
fn the_relationship_state_picks_the_hover_token() {
    assert_eq!(
        fill(&[]).as_deref(),
        Some("rgb(1, 1, 1)"),
        "idle: the default"
    );
    assert_eq!(fill(&["hover"]).as_deref(), Some("rgb(2, 2, 2)"), "hover");
    assert_eq!(
        fill(&["down"]).as_deref(),
        Some("rgb(1, 1, 1)"),
        "a state no relationship names falls back to the default"
    );
}

#[test]
fn compiled_candidates_carry_the_relationship_state() {
    let compiled = compile_recipe(&graph(), &recipe(), "widget", &[mode()]).unwrap();
    let cands = compiled
        .pointer("/variants/m|light|desktop/box/props/fill/candidates")
        .and_then(Value::as_array)
        .expect("candidates");
    let hover: Vec<&Value> = cands
        .iter()
        .filter(|c| c["states"] == json!(["hover"]))
        .collect();
    assert_eq!(hover.len(), 1, "{cands:?}");
    assert_eq!(hover[0]["value"], "rgb(2, 2, 2)");
}
