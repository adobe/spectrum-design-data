// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Pixel checks that need a solved scene: the scenes are built through core's public
//! `build_scene` from small recipes, then drawn by the PNG renderer.

use design_data_core::graph::TokenGraph;
use design_data_core::visual::*;
use serde_json::Value;
use std::path::PathBuf;

fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../packages/design-data")
}

fn load() -> (TokenGraph, Value) {
    let r = root();
    let g = TokenGraph::from_json_dir_with_catalogs(
        &r.join("tokens"),
        Some(&r.join("mode-sets")),
        Some(&r.join("components")),
    )
    .expect("graph")
    .with_relationships(
        TokenGraph::load_spec_relationships(&r.join("relationships")).expect("rels"),
    )
    .with_icons(TokenGraph::load_spec_icons(&r.join("icons")).expect("icons"))
    .with_behaviors_dir(&r.join("behaviors"))
    .expect("behaviors");
    let recipe: Value = serde_json::from_str(
        &std::fs::read_to_string(r.join("visuals/action-button.json")).unwrap(),
    )
    .unwrap();
    (g, recipe)
}

fn req(states: &[&str]) -> RenderRequest {
    RenderRequest {
        component: "action-button".into(),
        size: "m".into(),
        states: states.iter().map(|s| s.to_string()).collect(),
        mode: [("colorScheme", "light"), ("scale", "desktop")]
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect(),
        label: "Action".into(),
        ..Default::default()
    }
}

fn lit(v: Value) -> Value {
    serde_json::json!({ "value": v })
}

fn solve_width(recipe: &Value, width: Option<f64>) -> Scene {
    let (g, _) = load();
    let mut r = req(&[]);
    r.width = width;
    build_scene(&g, recipe, &r).unwrap()
}

fn shadow_recipe(shadow: Value) -> Value {
    serde_json::json!({
        "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
        "parts": { "r": { "kind": "box", "props": {
            "width": lit(40.into()), "height": lit(20.into()), "fill": lit("#ffffff".into()),
            "shadow": shadow
        } } }
    })
}

fn layer(x: i32, y: i32, blur: i32, color: &str) -> Value {
    serde_json::json!({ "x": lit(x.into()), "y": lit(y.into()), "blur": lit(blur.into()),
        "color": lit(color.into()) })
}

/// The graph with an anatomy part per `component` part of `recipe` on `host`, as the data
/// carries it (a test recipe keeps `component` inline for readability; the engine ignores it).
fn link_nested(mut g: TokenGraph, host: &str, recipe: &Value) -> TokenGraph {
    let linked: Vec<(String, String)> = recipe["parts"]
        .as_object()
        .into_iter()
        .flatten()
        .filter(|(_, p)| p["kind"] == "component")
        .filter_map(|(id, p)| Some((id.clone(), p["component"].as_str()?.to_string())))
        .collect();
    if let Some(c) = g.components.iter_mut().find(|c| c.name == host) {
        let anatomy = c.raw["anatomy"].as_array_mut().unwrap();
        for (id, component) in linked {
            anatomy.retain(|p| p["name"] != id.as_str());
            anatomy.push(serde_json::json!({ "name": id, "component": component }));
        }
    }
    g
}

fn nest_graph(replace: &[(&str, Value)]) -> TokenGraph {
    let (g, _) = load();
    let mut visuals = TokenGraph::load_spec_visuals(&root().join("visuals")).expect("visuals");
    let mut g = g;
    for (name, raw) in replace {
        let v = visuals.iter_mut().find(|v| v.component == *name).unwrap();
        v.raw = raw.clone();
        g = link_nested(g, name, raw);
    }
    g.with_visuals(visuals)
}

fn lit_props(pairs: &[(&str, f64)]) -> Value {
    Value::Object(
        pairs
            .iter()
            .map(|(k, v)| (k.to_string(), serde_json::json!({ "value": v })))
            .collect(),
    )
}

fn host(parts: Value) -> Value {
    serde_json::json!({ "component": "accordion", "root": "r",
        "sizeScale": { "s": 100, "m": 200, "l": 300, "xl": 400 }, "parts": parts })
}

fn nest_scene(
    g: &TokenGraph,
    recipe: &Value,
    size: &str,
    states: &[&str],
    opts: &[(&str, Value)],
) -> Result<Scene, String> {
    let g = &link_nested(g.clone(), "accordion", recipe);
    let mut r = req(states);
    r.component = "accordion".into();
    r.size = size.into();
    r.options = opts
        .iter()
        .map(|(k, v)| (k.to_string(), v.clone()))
        .collect();
    build_scene(g, recipe, &r)
}

fn floating_recipe(floating: Value, props: Value) -> Value {
    let mut tip = serde_json::json!({
        "kind": "box", "floating": floating,
        "visibleWhen": { "options": { "isOpen": true } },
        "props": { "width": lit(10.into()), "height": lit(6.into()), "fill": lit("#ff0000".into()) }
    });
    tip["props"]
        .as_object_mut()
        .unwrap()
        .extend(props.as_object().unwrap().clone());
    serde_json::json!({
        "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
        "parts": { "r": { "kind": "box", "props": {
            "width": lit(40.into()), "height": lit(20.into()), "fill": lit("#ffffff".into())
        } }, "tip": tip }
    })
}

fn open_scene(recipe: &Value) -> Scene {
    let (g, _) = load();
    let mut r = req(&[]);
    r.options.insert("isOpen".into(), Value::Bool(true));
    build_scene(&g, recipe, &r).unwrap()
}

#[test]
fn png_draws_the_whole_shadow_and_the_floating_part() {
    let opts = design_data_png::RasterOptions {
        scale: 1.0,
        background: None,
    };
    let px = |img: &design_data_png::Image, x: u32, y: u32| {
        let i = ((y * img.width + x) * 4) as usize;
        img.rgba[i..i + 4].to_vec()
    };
    let scene = solve_width(
        &shadow_recipe(serde_json::json!({ "shadow": [layer(0, 6, 16, "#000000")] })),
        None,
    );
    let (img, _) = design_data_png::rasterize(&scene, &[], &opts).unwrap();
    assert_eq!((img.width, img.height), (88, 68));
    // Below the root (bottom at y 38) the shadow is still visible at y 50, beyond the old 8px margin.
    assert!(px(&img, 44, 50)[3] > 0);
    assert_eq!(px(&img, 44, 28), vec![255, 255, 255, 255]);
    let tip = open_scene(&floating_recipe(
        serde_json::json!({ "side": "top", "offset": lit(10.into()) }),
        serde_json::json!({}),
    ));
    let (img, _) = design_data_png::rasterize(&tip, &[], &opts).unwrap();
    assert_eq!((img.width, img.height), (56, 44));
    // The tip is 10x6 at (23, 0); the root starts at y 16.
    assert_eq!(px(&img, 28, 3), vec![255, 0, 0, 255]);
    assert_eq!(px(&img, 28, 9)[3], 0);
    assert_eq!(px(&img, 28, 20), vec![255, 255, 255, 255]);
}

const TEARDROP: &str =
    "M10 0C15.5 0 20 4.5 20 10C20 15 14 20 10 24C6 20 0 15 0 10C0 4.5 4.5 0 10 0Z";

/// A 40x20 root with a loupe-like floating teardrop (20x24, stack) over a checkerboard child.
fn loupe_recipe(floating: Value) -> Value {
    let teardrop = |extra: Value| {
        let mut p = serde_json::json!({ "kind": "box",
            "path": { "d": TEARDROP, "viewBox": [20, 24] },
            "props": { "width": lit(20.into()), "height": lit(24.into()) } });
        p["props"]
            .as_object_mut()
            .unwrap()
            .extend(extra.as_object().unwrap().clone());
        p
    };
    let mut loupe = teardrop(serde_json::json!({
        "direction": lit("stack".into()),
        "fill": lit("#0000ff".into()),
        "shadow": { "shadow": [layer(0, 2, 4, "#000000")] }
    }));
    loupe["floating"] = floating;
    loupe["children"] = serde_json::json!(["chk"]);
    loupe["visibleWhen"] = serde_json::json!({ "options": { "isOpen": true } });
    serde_json::json!({
        "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
        "parts": { "r": { "kind": "box", "props": {
            "width": lit(40.into()), "height": lit(20.into()), "fill": lit("#ffffff".into())
        } },
        "loupe": loupe,
        "chk": teardrop(serde_json::json!({
            "fill": lit("#ffffff".into()), "patternFill": lit("#cccccc".into()),
            "patternSize": lit(4.into()) })) }
    })
}

fn node_of<'a>(s: &'a Scene, part: &str) -> &'a SceneNode {
    s.nodes
        .iter()
        .find(|n| n.part == part)
        .unwrap_or_else(|| panic!("no node {part}"))
}

#[test]
fn png_canvas_stays_small_for_a_huge_shadow_offset_or_spread() {
    for key in ["x", "y", "spread"] {
        let mut l = layer(0, 0, 4, "#000000");
        l[key] = lit(1e300.into());
        let s = solve_width(&shadow_recipe(serde_json::json!({ "shadow": [l] })), None);
        let (img, _) = design_data_png::rasterize(
            &s,
            &[],
            &design_data_png::RasterOptions {
                scale: 1.0,
                background: None,
            },
        )
        .unwrap();
        assert_eq!(img.width as f64, s.width.ceil());
    }
}

#[test]
fn png_draws_the_teardrop_its_checker_and_a_shadow_outside_it() {
    let opts = design_data_png::RasterOptions {
        scale: 1.0,
        background: None,
    };
    let s = open_scene(&loupe_recipe(
        serde_json::json!({ "side": "top", "offset": lit(2.into()) }),
    ));
    let (img, _) = design_data_png::rasterize(&s, &[], &opts).unwrap();
    let px = |x: f64, y: f64| {
        let i = ((y as u32 * img.width + x as u32) * 4) as usize;
        img.rgba[i..i + 4].to_vec()
    };
    let l = node_of(&s, "loupe");
    // Inside the round top the checker (cells of 4, top-left cell is the plain fill) alternates.
    let at = |dx: f64, dy: f64| px(l.x + dx, l.y + dy);
    assert_eq!(at(10.5, 10.5), vec![255, 255, 255, 255]);
    assert_eq!(at(10.5, 6.5), vec![204, 204, 204, 255]);
    // The corner of the box is outside the teardrop: only the blurred shadow (or nothing).
    assert!(at(0.5, 0.5)[3] < 20, "{:?}", at(0.5, 0.5));
    // The point at the bottom is narrow: the bottom corners are empty too.
    assert!(at(1.5, 23.5)[3] < 20);
}

/// A 100x20 track at (8, 8) with a 10x10 red handle and a 4px blue fill, both placed from
/// `x` (and `y`) axes over the option `value` (0..200 unless `axis` overrides it).
fn slider_recipe(handle_pos: Value, fill_pos: Value, align: &str) -> Value {
    let mut handle = serde_json::json!({
        "kind": "box",
        "floating": { "position": handle_pos, "align": align },
        "props": { "width": lit(10.into()), "height": lit(10.into()), "fill": lit("#ff0000".into()) }
    });
    handle["floating"]["position"]["of"] = "track".into();
    let mut fill = serde_json::json!({
        "kind": "box", "floating": { "position": fill_pos },
        "props": { "height": lit(4.into()), "fill": lit("#0000ff".into()) }
    });
    fill["floating"]["position"]["of"] = "track".into();
    let mut recipe = serde_json::json!({
        "component": "action-button", "root": "track", "sizeScale": { "m": 100 },
        "parts": { "track": { "kind": "box", "props": {
            "width": lit(100.into()), "height": lit(20.into()), "fill": lit("#ffffff".into())
        } }, "handle": handle, "fill": fill }
    });
    if fill_pos.as_object().is_some_and(|o| o.is_empty()) {
        recipe["parts"].as_object_mut().unwrap().remove("fill");
    }
    recipe
}

fn axis(extra: Value) -> Value {
    let mut a = serde_json::json!({ "value": {"option": "value"},
        "min": {"value": 0}, "max": {"value": 200} });
    a.as_object_mut()
        .unwrap()
        .extend(extra.as_object().unwrap().clone());
    a
}

fn at(recipe: &Value, value: Value) -> Scene {
    let (g, _) = load();
    let mut r = req(&[]);
    r.options.insert("value".into(), value);
    build_scene(&g, recipe, &r).unwrap()
}

#[test]
fn png_draws_the_handle_and_fill_at_their_fraction() {
    let opts = design_data_png::RasterOptions {
        scale: 1.0,
        background: None,
    };
    let r = slider_recipe(
        serde_json::json!({ "x": axis(serde_json::json!({})) }),
        serde_json::json!({ "x": axis(serde_json::json!({ "length": true })) }),
        "center",
    );
    let s = at(&r, 100.into());
    let (img, _) = design_data_png::rasterize(&s, &[], &opts).unwrap();
    let px = |x: u32, y: u32| {
        let i = ((y * img.width + x) * 4) as usize;
        img.rgba[i..i + 4].to_vec()
    };
    // Track at (8, 8); the handle spans x 53..63, y 13..23; the fill 8..58 at y 16..20.
    assert_eq!(px(58, 14), vec![255, 0, 0, 255]);
    assert_eq!(px(30, 18), vec![0, 0, 255, 255]);
    assert_eq!(px(70, 18), vec![255, 255, 255, 255]);
    assert_eq!(px(30, 10), vec![255, 255, 255, 255]);
}

/// A 100x20 root with a checkerboard (white and black 10px squares) and a child, the same
/// size, whose fill is `fill`.
fn ramp_recipe(fill: Value) -> Value {
    serde_json::json!({
        "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
        "parts": { "r": { "kind": "box", "children": ["c"], "props": {
            "width": lit(100.into()), "height": lit(20.into()), "fill": lit("#ffffff".into()),
            "patternFill": lit("#000000".into()), "patternSize": lit(10.into())
        } }, "c": { "kind": "box", "props": {
            "width": lit(100.into()), "height": lit(20.into()), "fill": fill
        } } }
    })
}

fn ramp_fill(ramp: Value, from: [f64; 2], to: [f64; 2]) -> Value {
    serde_json::json!({ "gradient": { "from": from, "to": to, "ramp": ramp } })
}

fn ramp_scene(recipe: &Value, opts: &[(&str, Value)]) -> Scene {
    let (g, _) = load();
    let mut r = req(&[]);
    for (k, v) in opts {
        r.options.insert((*k).into(), v.clone());
    }
    build_scene(&g, recipe, &r).unwrap()
}

fn pixels(s: &Scene) -> impl Fn(f64, f64) -> [u8; 4] {
    let opts = design_data_png::RasterOptions {
        scale: 1.0,
        background: None,
    };
    let (img, _) = design_data_png::rasterize(s, &[], &opts).unwrap();
    move |x: f64, y: f64| {
        let i = ((y as u32 * img.width + x as u32) * 4) as usize;
        [
            img.rgba[i],
            img.rgba[i + 1],
            img.rgba[i + 2],
            img.rgba[i + 3],
        ]
    }
}

fn near(got: [u8; 4], want: [f64; 3]) {
    for i in 0..3 {
        assert!(
            (f64::from(got[i]) - want[i]).abs() <= 2.0,
            "{got:?} vs {want:?}"
        );
    }
}

fn hue_ramp() -> Value {
    serde_json::json!({
        "color": { "option": "color" }, "channel": { "value": "hue" }
    })
}

#[test]
fn png_blends_a_hue_ramp_between_its_stops() {
    let r = ramp_recipe(ramp_fill(hue_ramp(), [0.0, 0.0], [1.0, 0.0]));
    let s = ramp_scene(&r, &[("color", "hsl(0, 100%, 50%)".into())]);
    let c = s.nodes.iter().find(|n| n.part == "c").unwrap();
    let px = pixels(&s);
    let at = |t: f64| px(c.x + (t * 100.0).floor(), c.y + 5.0);
    // x = 50.5 of 100: offset 0.505, 3% into the cyan to blue segment: green 255 * 0.97.
    near(at(0.50), [0.0, 255.0 * (1.0 - 0.03), 255.0]);
    // x = 8.5: offset 0.085 in the red to yellow segment: green 255 * 0.085 / (1/6).
    near(at(0.08), [255.0, 255.0 * 0.085 / (1.0 / 6.0), 0.0]);
    near(
        at(0.99),
        [255.0, 0.0, 255.0 * (1.0 - (0.995 - 5.0 / 6.0) * 6.0)],
    );
}

#[test]
fn an_alpha_ramp_shows_the_checkerboard_through_its_start() {
    let ramp = serde_json::json!({
        "color": { "option": "color" }, "channel": { "value": "alpha" }
    });
    let r = ramp_recipe(ramp_fill(ramp, [0.0, 0.0], [1.0, 0.0]));
    let s = ramp_scene(&r, &[("color", "#336699".into())]);
    let c = s.nodes.iter().find(|n| n.part == "c").unwrap();
    let px = pixels(&s);
    // x = 95.5, offset 0.955: the square (9, 0) is the pattern's second color (black),
    // the square (9, 1) at y 10..20 is white.
    let a = 0.955;
    let over = |back: f64| {
        [
            51.0 * a + back * (1.0 - a),
            102.0 * a + back * (1.0 - a),
            153.0 * a + back * (1.0 - a),
        ]
    };
    near(px(c.x + 95.0, c.y + 5.0), over(0.0));
    near(px(c.x + 95.0, c.y + 15.0), over(255.0));
    // the start is almost clear: the first square is the pattern's own fill, white
    near(px(c.x, c.y + 5.0), [254.0, 254.0, 254.0]);
    near(
        px(c.x + 10.0, c.y + 5.0),
        [51.0 * 0.105, 102.0 * 0.105, 153.0 * 0.105],
    );
}

#[test]
fn a_vertical_track_starts_at_the_bottom_and_rtl_at_the_right() {
    let ramp = serde_json::json!({
        "color": { "option": "color" }, "channel": { "value": "red" }
    });
    let (g, _) = load();
    let mut rq = req(&[]);
    rq.options.insert("color".into(), "rgb(0, 0, 0)".into());
    for (from, to, probe_min, probe_max) in [
        ([0.0, 1.0], [0.0, 0.0], (50.0, 19.0), (50.0, 0.0)),
        ([1.0, 0.0], [0.0, 0.0], (99.0, 10.0), (0.0, 10.0)),
    ] {
        let r = ramp_recipe(ramp_fill(ramp.clone(), from, to));
        let s = build_scene(&g, &r, &rq).unwrap();
        let c = s.nodes.iter().find(|n| n.part == "c").unwrap();
        let px = pixels(&s);
        let lo = px(c.x + probe_min.0, c.y + probe_min.1);
        let hi = px(c.x + probe_max.0, c.y + probe_max.1);
        assert!(lo[0] < 20, "{lo:?}");
        assert!(hi[0] > 235, "{hi:?}");
    }
}

/// A 100x100 hsl color area: the base (z = hue) as the root fill, the saturation layer
/// (left to right) and the lightness layer (bottom to top) floating over it.
fn area_recipe() -> Value {
    let layer = |channel: &str, to: [f64; 2], from: [f64; 2]| {
        let fill = ramp_fill(
            serde_json::json!({
                "color": { "option": "color" }, "channel": { "value": channel },
                "z": { "value": "hue" }
            }),
            from,
            to,
        );
        serde_json::json!({
            "kind": "box",
            "floating": { "position": {
                "x": { "value": { "value": 1 }, "length": true },
                "y": { "value": { "value": 1 }, "length": true } } },
            "props": { "fill": fill }
        })
    };
    let base = ramp_fill(
        serde_json::json!({
            "color": { "option": "color" }, "channel": { "value": "hue" },
            "z": { "value": "hue" }
        }),
        [0.0, 0.0],
        [1.0, 0.0],
    );
    serde_json::json!({
        "component": "action-button", "root": "r", "sizeScale": { "m": 100 },
        "parts": {
            "r": { "kind": "box", "children": [], "props": {
                "width": lit(100.into()), "height": lit(100.into()), "fill": base } },
            "a-sat": layer("saturation", [1.0, 0.0], [0.0, 0.0]),
            "b-light": layer("lightness", [0.0, 0.0], [0.0, 1.0])
        }
    })
}

#[test]
fn png_composites_a_color_area_like_css_stacked_gradients() {
    let s = ramp_scene(&area_recipe(), &[("color", "hsl(120, 80%, 30%)".into())]);
    let r = s.nodes.iter().find(|n| n.part == "r").unwrap();
    let px = pixels(&s);
    for (x, y) in [(80.0, 75.0), (10.0, 75.0), (50.0, 20.0), (90.0, 90.0)] {
        // saturation grey fades out to the right over the green base, then black fades out
        // up to the middle and white fades in above it (to top: 0 at the bottom).
        let (tx, ty) = ((x + 0.5) / 100.0, (100.0 - y - 0.5) / 100.0);
        let a1 = 1.0 - tx;
        let c1 = [128.0 * a1, 128.0 * a1 + 255.0 * (1.0 - a1), 128.0 * a1];
        let want: [f64; 3] = if ty < 0.5 {
            let a2 = 1.0 - ty / 0.5;
            c1.map(|v| v * (1.0 - a2))
        } else {
            let a2 = (ty - 0.5) / 0.5;
            c1.map(|v| v * (1.0 - a2) + 255.0 * a2)
        };
        near(px(r.x + x, r.y + y), want);
    }
}

fn cell(w: f64, h: f64, fill: &str) -> Value {
    let mut props = lit_props(&[("width", w), ("height", h)]);
    props["fill"] = serde_json::json!({ "value": fill });
    serde_json::json!({ "kind": "box", "props": props })
}

/// A grid root over `cells` (`a`, `b`, ...) with these props merged over `direction: grid`.
fn grid_recipe(cells: &[(f64, f64)], props: Value) -> Value {
    let ids: Vec<String> = (0..cells.len()).map(|i| format!("c{i}")).collect();
    let mut root_props = serde_json::json!({ "direction": { "value": "grid" } });
    root_props
        .as_object_mut()
        .unwrap()
        .extend(props.as_object().unwrap().clone());
    let mut parts = serde_json::Map::new();
    parts.insert(
        "r".into(),
        serde_json::json!({ "kind": "box", "children": ids, "props": root_props }),
    );
    for (i, (w, h)) in cells.iter().enumerate() {
        parts.insert(format!("c{i}"), cell(*w, *h, "#ff0000"));
    }
    host(Value::Object(parts))
}

fn grid_scene(cells: &[(f64, f64)], props: Value) -> Scene {
    nest_scene(&nest_graph(&[]), &grid_recipe(cells, props), "m", &[], &[]).unwrap()
}

fn lit_num(v: f64) -> Value {
    serde_json::json!({ "value": v })
}

#[test]
fn png_draws_a_grid_at_its_cells() {
    let s = grid_scene(
        &[(20.0, 10.0); 4],
        serde_json::json!({ "columns": lit_num(2.0), "gap": lit_num(4.0) }),
    );
    let opts = design_data_png::RasterOptions {
        scale: 1.0,
        background: None,
    };
    let (img, _) = design_data_png::rasterize(&s, &[], &opts).unwrap();
    let px = |x: u32, y: u32| {
        let i = ((y * img.width + x) * 4) as usize;
        img.rgba[i..i + 4].to_vec()
    };
    assert_eq!(
        px(42, 27),
        vec![255, 0, 0, 255],
        "the cell at column 1, row 1"
    );
    assert_eq!(px(28, 27)[3], 0, "the gap between columns is empty");
    assert_eq!(px(42, 20)[3], 0, "the gap between rows is empty");
}

/// A column root of grids and repeating boxes, built from `parts` and these `slots`.
fn subtree_scene(parts: Value, slots: Value, opts: &[(&str, Value)]) -> Scene {
    let (mut g, _) = load();
    let comp = g
        .components
        .iter_mut()
        .find(|c| c.name == "action-button")
        .unwrap();
    comp.raw["slots"] = slots;
    let recipe = serde_json::json!({ "component": "action-button", "root": "root",
        "sizeScale": { "m": 100 }, "parts": parts });
    let mut r = req(&[]);
    for (k, v) in opts {
        r.options.insert(k.to_string(), v.clone());
    }
    build_scene(&g, &recipe, &r).unwrap()
}

#[test]
fn png_draws_a_calendar_in_one_tree() {
    let mut parts = serde_json::json!({
        "root": { "kind": "box", "children": ["title", "weekdays", "days"],
            "props": { "direction": { "value": "column" }, "align": { "value": "start" },
                "gap": lit_num(4.0) } },
        "title": cell(70.0, 8.0, "#0000ff"),
        "weekdays": { "kind": "box", "children": (0..7).map(|i| format!("wd{i}")).collect::<Vec<_>>(),
            "props": { "direction": { "value": "grid" }, "columns": lit_num(7.0),
                "gap": lit_num(2.0), "justify": { "value": "start" } } },
        "days": { "kind": "box", "children": ["day"],
            "props": { "direction": { "value": "grid" }, "columns": lit_num(7.0),
                "gap": lit_num(2.0) },
            "repeat": { "slot": "days" } },
        "day": cell(10.0, 10.0, "#ff0000")
    });
    for i in 0..7 {
        parts[format!("wd{i}")] = cell(10.0, 6.0, "#00ff00");
    }
    let days: Vec<Value> = (0..10).map(|_| serde_json::json!({})).collect();
    let s = subtree_scene(
        parts,
        serde_json::json!([{ "name": "days", "part": "day", "collection": "days" }]),
        &[("days", Value::Array(days))],
    );
    let opts = design_data_png::RasterOptions {
        scale: 1.0,
        background: None,
    };
    let (img, _) = design_data_png::rasterize(&s, &[], &opts).unwrap();
    let px = |x: u32, y: u32| {
        let i = ((y * img.width + x) * 4) as usize;
        img.rgba[i..i + 4].to_vec()
    };
    assert_eq!(px(13, 47), vec![255, 0, 0, 255], "day 8, row 2 column 0");
    assert_eq!(px(13, 25), vec![0, 255, 0, 255], "weekday 0");
    assert_eq!(px(19, 47)[3], 0, "the gap between day columns is empty");
}
