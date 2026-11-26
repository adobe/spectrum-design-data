// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! The swatch draws two strokes and a stacked checkerboard: the selected swatch's border and
//! inner band come from records of one part and property told apart by a `position` pin, and
//! the checkerboard sits under the fill in one box.

use std::collections::HashMap;
use std::path::PathBuf;

use design_data_core::graph::TokenGraph;
use design_data_core::visual::{build_scene, RenderRequest, Scene};
use serde_json::{json, Value};

fn scene(options: &[(&str, Value)], scheme: &str) -> Scene {
    let d = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data");
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
    let recipe: Value =
        serde_json::from_str(&std::fs::read_to_string(d.join("visuals/swatch.json")).unwrap())
            .unwrap();
    let req = RenderRequest {
        component: "swatch".into(),
        size: "m".into(),
        options: options
            .iter()
            .map(|(k, v)| (k.to_string(), v.clone()))
            .collect::<HashMap<_, _>>(),
        mode: [("colorScheme", scheme), ("scale", "desktop")]
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect(),
        ..Default::default()
    };
    build_scene(&graph, &recipe, &req).expect("scene")
}

fn node<'a>(s: &'a Scene, part: &str) -> Option<&'a design_data_core::visual::SceneNode> {
    s.nodes.iter().find(|n| n.part == part)
}

#[test]
fn a_selected_swatch_has_a_border_and_a_different_inner_band_in_each_mode() {
    for (scheme, outer, inner) in [
        ("light", "rgb(0, 0, 0)", "rgb(255, 255, 255)"),
        ("dark", "rgb(255, 255, 255)", "rgb(17, 17, 17)"),
    ] {
        let s = scene(&[("isSelected", json!(true))], scheme);
        assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
        let border = node(&s, "container.border").expect("border");
        let band = node(&s, "container.inner-border").expect("inner band");
        assert_eq!(border.stroke.as_deref(), Some(outer), "{scheme}");
        assert_eq!(band.stroke.as_deref(), Some(inner), "{scheme}");
    }
}

#[test]
fn an_unselected_swatch_has_no_inner_band() {
    let s = scene(&[], "light");
    assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
    assert!(node(&s, "container.inner-border").is_none());
}

#[test]
fn the_checkerboard_sits_under_the_fill() {
    let s = scene(&[("preview", json!("#9197fe80"))], "light");
    let at = |p: &str| s.nodes.iter().position(|n| n.part == p).expect(p);
    assert!(at("opacity-checkerboard") < at("fill"));
    let (board, fill) = (
        node(&s, "opacity-checkerboard").unwrap(),
        node(&s, "fill").unwrap(),
    );
    assert_eq!(
        (board.x, board.y, board.w, board.h),
        (fill.x, fill.y, fill.w, fill.h)
    );
}
