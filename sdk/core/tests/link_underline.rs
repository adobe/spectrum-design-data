// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! An underlined label that wraps or truncates keeps its underline, one per line node, as wide
//! as that line (component-visuals.md, **Underline**).

use std::collections::HashMap;
use std::path::PathBuf;

use design_data_core::graph::TokenGraph;
use design_data_core::visual::{build_scene, RenderRequest, Scene};
use serde_json::{json, Value};

fn data_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data")
}

fn scene(overflow: &str, label: &str, width: f64) -> Scene {
    scene_with(overflow, label, width, json!({}))
}

fn scene_with(overflow: &str, label: &str, width: f64, extra: Value) -> Scene {
    let d = data_dir();
    let graph = TokenGraph::from_json_dir_with_catalogs(
        &d.join("tokens"),
        Some(&d.join("mode-sets")),
        Some(&d.join("components")),
    )
    .expect("graph")
    .with_relationships(
        TokenGraph::load_spec_relationships(&d.join("relationships")).expect("rels"),
    );
    let mut recipe: Value =
        serde_json::from_str(&std::fs::read_to_string(d.join("visuals/link.json")).unwrap())
            .unwrap();
    recipe["parts"]["text"]["props"]["overflow"] = json!({ "value": overflow });
    for (k, v) in extra.as_object().unwrap() {
        recipe["parts"]["text"]["props"][k] = v.clone();
    }
    let req = RenderRequest {
        component: "link".into(),
        size: "m".into(),
        states: vec![],
        options: HashMap::new(),
        mode: [("colorScheme", "light"), ("scale", "desktop")]
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect(),
        label: label.into(),
        icon: None,
        text_metrics: None,
        width: Some(width),
    };
    build_scene(&graph, &recipe, &req).expect("scene")
}

#[test]
fn wrapped_label_underlines_every_line_at_its_own_width() {
    let s = scene("wrap", "Learn more about this long link", 70.0);
    let lines: Vec<_> = s.nodes.iter().filter(|n| n.part == "text").collect();
    assert!(lines.len() > 1, "label did not wrap");
    for n in lines {
        let (x, _, w, _) = n.underline.expect("underline on every line").rect(n);
        assert_eq!((x, w), (n.x, n.w));
    }
}

#[test]
fn truncated_label_underlines_the_visible_text_only() {
    let s = scene("truncate", "Learn more about this long link", 70.0);
    let n = s.nodes.iter().find(|n| n.part == "text").unwrap();
    assert!(n.text.as_deref().unwrap().ends_with("..."));
    assert!(n.w <= 70.0 + 1e-6, "{}", n.w);
    assert_eq!(n.underline.expect("underline").rect(n).2, n.w);
}

#[test]
fn a_bound_but_non_numeric_underline_size_reports_a_diagnostic() {
    let s = scene_with(
        "wrap",
        "Link",
        70.0,
        json!({ "underlineThickness": { "value": "thick" } }),
    );
    assert!(
        s.diagnostics
            .iter()
            .any(|d| d.contains("underlineThickness 'thick' is not a number")),
        "{:?}",
        s.diagnostics
    );
    let n = s.nodes.iter().find(|n| n.part == "text").unwrap();
    assert_eq!(n.underline.unwrap().thickness, 1.0);
}
