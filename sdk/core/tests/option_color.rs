// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! A color the request carries in an option read by an `option` value source (the swatch
//! `preview`): a solid color is drawn, an unset or transparent one draws the unset look, and
//! anything else (a radial gradient, an image, a number) draws the unset look with a diagnostic.

use std::collections::HashMap;
use std::path::PathBuf;

use design_data_core::graph::TokenGraph;
use design_data_core::visual::{build_scene, RenderRequest, Scene};
use serde_json::{json, Value};

fn scene(preview: Option<Value>) -> Scene {
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
        options: preview
            .into_iter()
            .map(|v| ("preview".to_string(), v))
            .collect::<HashMap<_, _>>(),
        mode: [("colorScheme", "light"), ("scale", "desktop")]
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect(),
        ..Default::default()
    };
    build_scene(&graph, &recipe, &req).expect("scene")
}

fn has(s: &Scene, part: &str) -> bool {
    s.nodes.iter().any(|n| n.part == part)
}

fn fill(s: &Scene) -> Option<String> {
    s.nodes.iter().find(|n| n.part == "fill")?.fill.clone()
}

#[test]
fn a_solid_color_is_drawn_and_hides_the_slash() {
    for c in [
        "#9197fe",
        "#9197feff",
        "rgb(145, 151, 254)",
        "rgba(145 151 254 / 50%)",
    ] {
        let s = scene(Some(json!(c)));
        assert_eq!(fill(&s).as_deref(), Some(c), "{c}");
        assert!(!has(&s, "slash"), "{c}");
        assert!(s.diagnostics.is_empty(), "{c}: {:?}", s.diagnostics);
    }
}

#[test]
fn unset_and_transparent_draw_the_slash_without_a_diagnostic() {
    for v in [
        None,
        Some(json!("")),
        Some(json!("transparent")),
        Some(json!("#0000")),
        Some(json!("rgba(0, 0, 0, 0)")),
    ] {
        let s = scene(v.clone());
        assert_eq!(fill(&s), None, "{v:?}");
        assert!(has(&s, "slash"), "{v:?}");
        assert!(s.diagnostics.is_empty(), "{v:?}: {:?}", s.diagnostics);
    }
}

#[test]
fn a_value_that_is_not_a_solid_color_draws_the_slash_with_a_diagnostic() {
    for v in [
        json!("radial-gradient(#f00, #00f)"),
        json!("url(photo.png)"),
        json!("rebeccapurple"),
        json!("#12"),
        json!(42),
        json!({"stops": []}),
    ] {
        let s = scene(Some(v.clone()));
        assert_eq!(fill(&s), None, "{v}");
        assert!(has(&s, "slash"), "{v}");
        assert!(
            s.diagnostics
                .iter()
                .any(|d| d.contains("not a solid color")),
            "{v}: {:?}",
            s.diagnostics
        );
    }
}
