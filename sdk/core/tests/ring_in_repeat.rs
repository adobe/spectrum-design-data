// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! A `ring` part listed in `children` of a repeated copy (a collection item, a nested repeat) is
//! drawn around that copy exactly as a ring on a root part is drawn around the root. Before, the
//! solver treated the ring as a flowed child and read `color` on it (a debug assertion).
//!
//! Goldens live in `tests/fixtures/ring-repeat/*.svg`; regenerate after an intended change with
//! `VISUAL_PARITY_UPDATE=1 cargo test -p design-data-core --test ring_in_repeat`.

use std::path::PathBuf;

use design_data_core::graph::TokenGraph;
use design_data_core::visual::{
    build_scene, scene_to_svg, RenderRequest, Scene, SceneNode, SlotFill,
};
use serde_json::{json, Value};

fn data_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data")
}

fn fixture_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/ring-repeat")
}

fn recipe(name: &str) -> Value {
    let path = fixture_dir().join(format!("{name}.json"));
    serde_json::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap()
}

fn draw(recipe: &Value, items: Value, options: &[(&str, Value)]) -> Scene {
    draw_filled(recipe, items, options, false)
}

fn draw_filled(recipe: &Value, items: Value, options: &[(&str, Value)], fill: bool) -> Scene {
    let d = data_dir();
    let mut graph = TokenGraph::from_json_dir_with_catalogs(
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
    let comp = graph
        .components
        .iter_mut()
        .find(|c| c.name == "action-button")
        .unwrap();
    comp.raw["slots"] = json!([
        { "name": "default", "part": "item", "collection": "items" },
        { "name": "second", "part": "level2", "collection": "second" },
        { "name": "extra", "part": "fill", "accepts": ["badge"] }
    ]);
    if recipe["root"] == "tree" {
        comp.raw["slots"][0]["part"] = json!("level1");
    }
    let mut req = RenderRequest {
        component: "action-button".into(),
        size: "m".into(),
        ..Default::default()
    };
    if !items.is_null() {
        req.options.insert("items".into(), items);
    }
    if fill {
        req.slots.insert(
            "extra".into(),
            vec![SlotFill {
                component: "badge".into(),
                ..Default::default()
            }],
        );
    }
    for (k, v) in options {
        req.options.insert(k.to_string(), v.clone());
    }
    build_scene(&graph, recipe, &req).expect("scene")
}

fn node<'a>(s: &'a Scene, part: &str) -> &'a SceneNode {
    s.nodes.iter().find(|n| n.part == part).unwrap_or_else(|| {
        panic!(
            "no {part}: {:?}",
            s.nodes.iter().map(|n| &n.part).collect::<Vec<_>>()
        )
    })
}

/// The ring is its target box grown by `gap + stroke / 2` on every side.
fn assert_ring(s: &Scene, ring: &str, target: &str, gap: f64, sw: f64, stroke: &str) {
    let (r, t) = (node(s, ring), node(s, target));
    let off = gap + sw / 2.0;
    assert_eq!(r.kind, "ring", "{ring}");
    assert_eq!(
        (r.x, r.y, r.w, r.h),
        (t.x - off, t.y - off, t.w + 2.0 * off, t.h + 2.0 * off),
        "{ring} around {target}"
    );
    assert_eq!(r.radius, (t.radius + off).max(0.0), "{ring} radius");
    assert_eq!(r.stroke_width, sw, "{ring} width");
    assert_eq!(r.stroke.as_deref(), Some(stroke), "{ring} stroke");
}

fn two() -> Value {
    json!([{ "label": "a" }, { "label": "bb" }])
}

fn check_golden(name: &str, s: &Scene) {
    let path = fixture_dir().join(format!("{name}.svg"));
    let svg = scene_to_svg(s);
    if std::env::var("VISUAL_PARITY_UPDATE").is_ok_and(|v| v == "1") {
        std::fs::write(&path, &svg).unwrap();
        return;
    }
    let want = std::fs::read_to_string(&path)
        .unwrap_or_else(|_| panic!("{name}: missing golden; run with VISUAL_PARITY_UPDATE=1"));
    assert_eq!(svg, want, "{name} differs from its golden");
}

#[test]
fn a_ring_in_a_collection_item_matches_a_ring_on_a_plain_root() {
    let s = draw(&recipe("collection"), two(), &[]);
    assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
    let plain = draw(&recipe("plain"), Value::Null, &[]);
    assert!(plain.diagnostics.is_empty(), "{:?}", plain.diagnostics);
    for item in ["item-1", "item-2"] {
        assert_ring(&s, &format!("{item}.ring"), item, 3.0, 2.0, "#ff0000");
    }
    // The same ring on the item drawn as the root: relative to its box it is identical.
    let rel = |s: &Scene, root: &str, ring: &str| {
        let (r, t) = (node(s, ring), node(s, root));
        (
            r.x - t.x,
            r.y - t.y,
            r.w - t.w,
            r.h - t.h,
            r.radius,
            r.stroke.clone(),
            r.stroke_width,
        )
    };
    assert_eq!(
        rel(&s, "item-1", "item-1.ring"),
        rel(&plain, "item", "ring")
    );
    // Only the copies draw it: the container has no ring of its own.
    assert_eq!(s.nodes.iter().filter(|n| n.kind == "ring").count(), 2);
    check_golden("collection", &s);
}

#[test]
fn a_ring_in_a_repeat_inside_a_repeat_wraps_its_own_level() {
    let items = json!([
        { "children": [{ "label": "x" }, { "label": "y" }] },
        { "children": [{ "label": "z" }] }
    ]);
    let s = draw(&recipe("nested"), items, &[]);
    assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
    for l1 in ["level1-1", "level1-2"] {
        assert_ring(&s, &format!("{l1}.ring1"), l1, 1.0, 2.0, "#0000ff");
    }
    // gap 0, 3 wide, in the inner copies; the lone inner copy of the second entry is unnumbered.
    for l2 in ["level1-1.level2-1", "level1-1.level2-2"] {
        assert_ring(&s, &format!("{l2}.ring2"), l2, 0.0, 3.0, "#ff0000");
    }
    assert_ring(&s, "level1-2.ring2", "level1-2.level2", 0.0, 3.0, "#ff0000");
    assert_eq!(s.nodes.iter().filter(|n| n.kind == "ring").count(), 5);
    check_golden("nested", &s);
}

#[test]
fn a_ring_with_gap_zero_and_a_square_or_round_box() {
    for (gap, radius) in [(0.0, 0.0), (0.0, 8.0), (5.0, 12.0)] {
        let mut r = recipe("collection");
        r["parts"]["ring"]["props"]["gapToParent"] = json!({ "value": gap });
        r["parts"]["item"]["props"]["cornerRadius"] = json!({ "value": radius });
        let s = draw(&r, two(), &[]);
        assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
        assert_ring(&s, "item-2.ring", "item-2", gap, 2.0, "#ff0000");
    }
}

#[test]
fn a_ring_follows_its_conditions_in_each_copy() {
    let mut r = recipe("collection");
    r["parts"]["ring"]["props"]["stroke"] = json!([
        { "value": "#00ff00", "when": { "options": { "tint": true } } },
        { "value": "#ff0000" }
    ]);
    r["parts"]["ring"]["visibleWhen"] = json!({ "options": { "focused": true } });
    let hidden = draw(&r, two(), &[]);
    assert!(hidden.nodes.iter().all(|n| n.kind != "ring"));
    let shown = draw(&r, two(), &[("focused", json!(true))]);
    assert_ring(&shown, "item-1.ring", "item-1", 3.0, 2.0, "#ff0000");
    let tinted = draw(
        &r,
        two(),
        &[("focused", json!(true)), ("tint", json!(true))],
    );
    assert_ring(&tinted, "item-2.ring", "item-2", 3.0, 2.0, "#00ff00");
    // One copy is not numbered, and still draws its ring.
    let one = draw(&r, json!([{ "label": "a" }]), &[("focused", json!(true))]);
    assert_ring(&one, "ring", "item", 3.0, 2.0, "#ff0000");
}

#[test]
fn an_inside_ring_around_a_part_of_the_copy() {
    let mut r = recipe("collection");
    r["parts"]["ring"]["around"] = json!("label");
    r["parts"]["ring"]["inside"] = json!(true);
    let s = draw(&r, two(), &[]);
    assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
    // An inside ring grows by -(gap + stroke / 2).
    let (r, t) = (node(&s, "item-2.ring"), node(&s, "item-2.label"));
    assert_eq!(
        (r.x, r.y, r.w, r.h),
        (t.x + 4.0, t.y + 4.0, t.w - 8.0, t.h - 8.0)
    );
}

#[test]
fn a_ring_in_a_floating_part_wraps_the_floating_part() {
    for repeated in [false, true] {
        let mut r = recipe(if repeated { "collection" } else { "plain" });
        let host = if repeated { "container" } else { "item" };
        if let Some(c) = r["parts"][host]["children"].as_array_mut() {
            c.retain(|v| v != "ring");
        }
        r["parts"]["item"]["children"] = json!(["label"]);
        r["parts"]["pop"] = json!({
            "kind": "box", "floating": { "side": "bottom" }, "children": ["ring"],
            "props": { "width": { "value": 20 }, "height": { "value": 10 } }
        });
        let s = draw(&r, if repeated { two() } else { Value::Null }, &[]);
        let rings: Vec<&SceneNode> = s.nodes.iter().filter(|n| n.kind == "ring").collect();
        assert!(!rings.is_empty(), "{:?}", s.diagnostics);
        for ring in rings {
            let pop = ring.part.replace("ring", "pop");
            assert_ring(&s, &ring.part, &pop, 3.0, 2.0, "#ff0000");
        }
    }
}

#[test]
fn a_ring_next_to_a_slot_fill_in_a_copy() {
    let mut r = recipe("collection");
    r["parts"]["item"]["children"] = json!(["label", "fill", "ring"]);
    r["parts"]["fill"] = json!({ "kind": "slot", "sizeMap": { "m": "m" } });
    let s = draw_filled(&r, two(), &[], true);
    assert!(
        s.nodes.iter().any(|n| n.part.starts_with("item-1.fill")),
        "the slot fill is drawn: {:?} {:?}",
        s.nodes.iter().map(|n| &n.part).collect::<Vec<_>>(),
        s.diagnostics
    );
    assert_ring(&s, "item-1.ring", "item-1", 3.0, 2.0, "#ff0000");
    assert_ring(&s, "item-2.ring", "item-2", 3.0, 2.0, "#ff0000");
}

#[test]
fn an_orphan_ring_wraps_the_recipes_root_only_once() {
    let mut r = recipe("collection");
    r["parts"]["item"]["children"] = json!(["label"]);
    let s = draw(&r, two(), &[]);
    assert_eq!(s.nodes.iter().filter(|n| n.kind == "ring").count(), 1);
    assert_ring(&s, "ring", "container", 3.0, 2.0, "#ff0000");
    // An orphan ring on a plain root is unchanged.
    let mut p = recipe("plain");
    p["parts"]["item"]["children"] = json!(["label"]);
    let s = draw(&p, Value::Null, &[]);
    assert_ring(&s, "ring", "item", 3.0, 2.0, "#ff0000");
}

#[test]
fn a_ring_deeper_than_the_scene_root_does_not_panic() {
    let mut r = recipe("collection");
    r["parts"]["item"]["children"] = json!(["wrap"]);
    r["parts"]["wrap"] = json!({ "kind": "box", "children": ["label", "ring"] });
    let s = draw(&r, two(), &[]);
    assert!(s.nodes.iter().all(|n| n.kind != "ring"));
}

#[test]
fn a_ring_in_a_row_box_does_not_join_the_row() {
    let mut r = recipe("collection");
    r["parts"]["item"]["props"]["direction"] = json!({ "value": "row" });
    let a = draw(&r, two(), &[]);
    r["parts"]["item"]["children"] = json!(["label"]);
    r["parts"]["ring"]["visibleWhen"] = json!({ "options": { "never": true } });
    let b = draw(&r, two(), &[]);
    assert_eq!(node(&a, "item-1").w, node(&b, "item-1").w);
    assert_eq!(node(&a, "item-1").h, node(&b, "item-1").h);
}
