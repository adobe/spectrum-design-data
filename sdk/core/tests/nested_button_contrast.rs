// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Ratchet for a nested remove button whose cross is not drawn in the tag's content color.
//!
//! A removable tag (GitHub #2120) draws its `clear-button` through the nested recipe, which
//! knows nothing of the tag's selected fill, so the cross can match the fill and vanish. In
//! Figma and React Spectrum the cross takes the color of the label (`color: inherit`). Each
//! look below renders the tag and compares the cross (`clear-button.icon`) with the `label`
//! color and the `container` fill. A look whose cross is not the label color, or is the fill
//! color, is committed in `tests/fixtures/nested-button-contrast-baseline.json`. A new one
//! fails the test, and a fixed one must be removed from the baseline. Regenerate with:
//! `UPDATE_NESTED_BUTTON_BASELINE=1 cargo test -p design-data-core --test nested_button_contrast`

use std::path::PathBuf;

use design_data_core::graph::TokenGraph;
use design_data_core::visual::{build_scene_cached, RenderRequest, SceneCache};
use serde_json::json;

fn data_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data")
}

fn baseline_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/nested-button-contrast-baseline.json")
}

/// `(selected, emphasized, color scheme)` looks of a removable tag, and whether its cross
/// is not the label color or is the fill color.
fn low_contrast_looks() -> Vec<String> {
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
    .with_visuals(TokenGraph::load_spec_visuals(&d.join("visuals")).expect("visuals"));
    let recipe: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(d.join("visuals/tag.json")).unwrap())
            .unwrap();

    let mut out = Vec::new();
    for (selected, emphasized) in [(false, false), (true, false), (true, true)] {
        for scheme in ["light", "dark"] {
            let mut req = RenderRequest {
                component: "tag".into(),
                size: "m".into(),
                label: "Label".into(),
                ..Default::default()
            };
            req.options.insert("isRemovable".into(), json!(true));
            req.options.insert("isSelected".into(), json!(selected));
            req.options.insert("isEmphasized".into(), json!(emphasized));
            req.mode.insert("colorScheme".into(), scheme.into());
            let scene = build_scene_cached(&graph, &recipe, &req, &SceneCache::default())
                .expect("tag scene");
            let node = |part: &str| scene.nodes.iter().find(|n| n.part == part).expect(part);
            let cross = node("clear-button.icon").color.clone();
            let fill = node("container").fill.clone();
            assert!(cross.is_some() && fill.is_some(), "cross and fill resolve");
            if cross != node("label").color.clone() || cross == fill {
                out.push(format!(
                    "tag isRemovable isSelected={selected} isEmphasized={emphasized} {scheme}"
                ));
            }
        }
    }
    out
}

#[test]
fn a_removable_tags_cross_takes_the_label_color() {
    let actual = low_contrast_looks();
    if std::env::var_os("UPDATE_NESTED_BUTTON_BASELINE").is_some() {
        std::fs::write(
            baseline_path(),
            serde_json::to_string_pretty(&actual).unwrap() + "\n",
        )
        .expect("write baseline");
        return;
    }
    let baseline: Vec<String> =
        serde_json::from_str(&std::fs::read_to_string(baseline_path()).expect("read baseline"))
            .expect("parse baseline");
    assert_eq!(
        actual, baseline,
        "a look draws the cross in a color other than the label's (#2120). Fix the recipe, or after a fix lower the baseline (UPDATE_NESTED_BUTTON_BASELINE=1)."
    );
}
