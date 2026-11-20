// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Harness for the recipe `typeStyle` prop.
//!
//! No recipe in `packages/design-data/visuals` uses `typeStyle` yet. This test converts eight
//! text recipes in memory (their `fontSize`, `fontWeight` and, where a composite's px line
//! height matches, `lineHeight` bindings become one `typeStyle` bound to in-memory `type-style`
//! relationships) and renders every combination `recipe_snapshots` covers. The converted scene
//! must equal the original, with `tokens` removed and the font family normalized: same geometry,
//! font size, weight and line height. The family differs by design, because the composite binds
//! it, and must be the head of the default stack. The same-geometry rule is what lets a recipe
//! move to a type style without a snapshot-breaking layout change (bead 5m92.25.1, decision D3a).

use std::collections::HashMap;
use std::path::PathBuf;

use design_data_core::constraints::{read_constraints, Combination, ConstraintSeverity};
use design_data_core::graph::{RelationshipRecord, TokenGraph, TokenRecord};
use design_data_core::visual::{
    build_scene_cached, recipe_options_in, RenderRequest, Scene, SceneCache,
};
use serde_json::{json, Value};

const FAMILY: &str = "Adobe Clean Spectrum VF";

/// (recipe, text part, composite weight, keeps its own `lineHeight` binding). The first six
/// match a composite exactly, line height included; field-label and help-text bind a x1.3
/// line height that differs from the composite's px one, so they keep it as a per-axis override.
const CASES: &[(&str, &str, &str, bool)] = &[
    ("action-button", "label", "medium", false),
    ("badge", "label", "medium", false),
    ("button", "label", "bold", false),
    ("checkbox", "label", "regular", false),
    ("radio-button", "label", "regular", false),
    ("switch", "label", "regular", false),
    ("field-label", "label", "regular", true),
    ("help-text", "text", "regular", true),
];

fn data_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data")
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

fn composite_uuid(graph: &TokenGraph, legacy_key: &str) -> String {
    graph
        .tokens
        .values()
        .find(|t| t.raw.pointer("/name/legacyKey").and_then(Value::as_str) == Some(legacy_key))
        .and_then(|t| t.uuid.clone())
        .unwrap_or_else(|| panic!("no composite {legacy_key}"))
}

/// One `type-style` relationship per size for `component`/`part`, `$ref`ing the composite.
fn add_type_styles(
    graph: &mut TokenGraph,
    component: &str,
    part: &str,
    weight: &str,
    sizes: &[String],
) {
    let mut rels = graph.relationships.clone();
    for size in sizes {
        let uuid = format!("harness-{component}-{part}-{size}");
        rels.push(RelationshipRecord {
            file: PathBuf::from("harness.json"),
            index: rels.len(),
            uuid: Some(uuid.clone()),
            raw: json!({
                "uuid": uuid,
                "scope": {"component": component, "part": part, "property": "type-style"},
                "context": "Harness",
                "$ref": composite_uuid(graph, &format!("component-{size}-{weight}")),
            }),
        });
    }
    *graph = graph.clone().with_relationships(rels);
}

fn convert(recipe: &Value, part: &str, keep_line_height: bool) -> Value {
    let mut r = recipe.clone();
    let props = r["parts"][part]["props"].as_object_mut().expect("props");
    for k in ["fontSize", "fontWeight", "fontFamily"] {
        props.remove(k);
    }
    if !keep_line_height {
        props.remove("lineHeight");
    }
    props.insert(
        "typeStyle".into(),
        json!({"relationship": {"property": "type-style", "part": part}}),
    );
    r
}

/// The scene as JSON with every `tokens` list removed and each text node's family replaced.
/// Returns the families it replaced.
fn normalize(scene: &Scene) -> (Value, Vec<Option<String>>) {
    fn strip(v: &mut Value, families: &mut Vec<Option<String>>) {
        match v {
            Value::Object(m) => {
                m.remove("tokens");
                if m.get("kind").and_then(Value::as_str) == Some("text") {
                    families.push(
                        m.remove("font_family")
                            .and_then(|f| f.as_str().map(String::from)),
                    );
                }
                m.values_mut().for_each(|x| strip(x, families));
            }
            Value::Array(a) => a.iter_mut().for_each(|x| strip(x, families)),
            _ => {}
        }
    }
    let mut v = serde_json::to_value(scene).expect("scene json");
    let mut families = Vec::new();
    strip(&mut v, &mut families);
    (v, families)
}

fn domain(option: &Value) -> Option<Vec<Value>> {
    if let Some(vals) = option.get("values").and_then(Value::as_array) {
        return Some(
            vals.iter()
                .map(|v| v.get("value").cloned().unwrap_or_else(|| v.clone()))
                .collect(),
        );
    }
    (option.get("type").and_then(Value::as_str) == Some("boolean"))
        .then(|| vec![Value::Bool(false), Value::Bool(true)])
}

fn run_case(name: &str, part: &str, weight: &str, keep_lh: bool) -> usize {
    let mut graph = load_graph();
    let d = data_dir();
    let recipe = read_json(d.join(format!("visuals/{name}.json")));
    let component = read_json(d.join(format!("components/{name}.json")));
    let sizes: Vec<String> = recipe["sizeScale"]
        .as_object()
        .expect("sizeScale")
        .keys()
        .cloned()
        .collect();
    add_type_styles(&mut graph, name, part, weight, &sizes);
    let converted = convert(&recipe, part, keep_lh);

    let (mut used, _) = recipe_options_in(&graph, &recipe, name);
    used.sort();
    let options = component.get("options").and_then(Value::as_object);
    let mut sets: Vec<Vec<(String, Value)>> = vec![vec![]];
    for o in used.iter().filter(|o| o.as_str() != "size") {
        if let Some(vals) = options.and_then(|m| m.get(o)).and_then(domain) {
            sets = sets
                .into_iter()
                .flat_map(|s| {
                    vals.iter().map(move |v| {
                        let mut n = s.clone();
                        n.push((o.clone(), v.clone()));
                        n
                    })
                })
                .collect();
        }
    }
    let states: Vec<String> = component["states"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|s| s["trigger"].as_str() == Some("interaction"))
        .filter_map(|s| s["name"].as_str().map(String::from))
        .collect();
    let constraints = read_constraints(&component);
    let (orig_cache, conv_cache) = (SceneCache::default(), SceneCache::default());

    let (mut combos, mut with_text) = (0, 0);
    for set in &sets {
        for size in &sizes {
            let mut combo: Combination = set
                .iter()
                .map(|(k, v)| (k.clone(), Some(v.clone())))
                .collect();
            combo.insert("size".into(), Some(Value::String(size.clone())));
            if constraints
                .iter()
                .any(|(_, c)| c.severity == ConstraintSeverity::Error && c.excludes(&combo))
            {
                continue;
            }
            for state in std::iter::once(None).chain(states.iter().map(Some)) {
                for scheme in ["light", "dark", "wireframe"] {
                    for scale in ["desktop", "mobile"] {
                        let req = RenderRequest {
                            component: name.into(),
                            size: size.clone(),
                            states: state.into_iter().cloned().collect(),
                            options: set.iter().cloned().collect::<HashMap<_, _>>(),
                            mode: [("colorScheme", scheme), ("scale", scale)]
                                .iter()
                                .map(|(k, v)| (k.to_string(), v.to_string()))
                                .collect(),
                            label: "Label".into(),
                            ..Default::default()
                        };
                        let at =
                            format!("{name} {set:?} size={size} state={state:?} {scheme}/{scale}");
                        let a = build_scene_cached(&graph, &recipe, &req, &orig_cache).expect(&at);
                        let b =
                            build_scene_cached(&graph, &converted, &req, &conv_cache).expect(&at);
                        assert_eq!(a.diagnostics, b.diagnostics, "{at}");
                        let (na, _) = normalize(&a);
                        let (nb, fam) = normalize(&b);
                        assert_eq!(na, nb, "{at}: scene differs");
                        let text_nodes = b.nodes.iter().filter(|n| n.kind == "text").count();
                        with_text += usize::from(text_nodes > 0);
                        let in_scene: Vec<_> = b
                            .nodes
                            .iter()
                            .filter(|n| n.kind == "text")
                            .map(|n| n.font_family.as_deref())
                            .collect();
                        assert_eq!(fam.len(), in_scene.len());
                        for f in in_scene {
                            assert_eq!(f, Some(FAMILY), "{at}: family");
                        }
                        combos += 1;
                    }
                }
            }
        }
    }
    assert!(with_text > 0, "{name}: no combination drew text");
    combos
}

/// One test per recipe, so nextest runs them in parallel.
macro_rules! converted {
    ($($test:ident: $i:expr),+ $(,)?) => {$(
        #[test]
        fn $test() {
            let (name, part, weight, keep_lh) = CASES[$i];
            let n = run_case(name, part, weight, keep_lh);
            eprintln!("{name}: {n} combinations, zero diff");
        }
    )+};
}

converted! {
    action_button_matches: 0,
    badge_matches: 1,
    button_matches: 2,
    checkbox_matches: 3,
    radio_button_matches: 4,
    switch_matches: 5,
    field_label_matches: 6,
    help_text_matches: 7,
}

fn button_with(props: &[(&str, Value)]) -> (TokenGraph, Value) {
    let mut graph = load_graph();
    let d = data_dir();
    let recipe = read_json(d.join("visuals/button.json"));
    let sizes: Vec<String> = recipe["sizeScale"]
        .as_object()
        .unwrap()
        .keys()
        .cloned()
        .collect();
    add_type_styles(&mut graph, "button", "label", "bold", &sizes);
    let mut r = convert(&recipe, "label", false);
    let p = r["parts"]["label"]["props"].as_object_mut().unwrap();
    for (k, v) in props {
        p.insert((*k).into(), v.clone());
    }
    (graph, r)
}

fn text_scene(graph: &TokenGraph, recipe: &Value, scale: &str) -> Scene {
    let req = RenderRequest {
        component: "button".into(),
        size: "m".into(),
        mode: [("colorScheme", "light"), ("scale", scale)]
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect(),
        label: "Label".into(),
        ..Default::default()
    };
    build_scene_cached(graph, recipe, &req, &SceneCache::default()).expect("scene")
}

fn label(scene: &Scene) -> &design_data_core::visual::SceneNode {
    scene
        .nodes
        .iter()
        .find(|n| n.kind == "text")
        .expect("text node")
}

#[test]
fn a_part_bound_prop_beats_the_type_style_for_its_axis() {
    let (graph, recipe) = button_with(&[("fontSize", json!({"value": "10"}))]);
    let scene = text_scene(&graph, &recipe, "desktop");
    let n = label(&scene);
    assert_eq!(n.font_size, 10.0);
    assert_eq!(n.font_weight.as_deref(), Some("bold"));
    assert_eq!(n.font_family.as_deref(), Some(FAMILY));
    let fs = n.tokens.iter().find(|t| t.prop == "fontSize");
    assert!(
        fs.is_none_or(|t| t.token.is_empty()),
        "fontSize is the literal"
    );
    let fw = n
        .tokens
        .iter()
        .find(|t| t.prop == "fontWeight")
        .expect("fontWeight token");
    assert_eq!(fw.token, "component-m-bold");
    assert_eq!(fw.chain, vec!["bold-font-weight".to_string()]);
    assert!(scene.diagnostics.is_empty(), "{:?}", scene.diagnostics);
}

#[test]
fn the_type_style_resolves_by_scale() {
    let (graph, recipe) = button_with(&[]);
    let desktop = label(&text_scene(&graph, &recipe, "desktop")).font_size;
    let mobile = label(&text_scene(&graph, &recipe, "mobile")).font_size;
    assert!(
        mobile > desktop,
        "mobile {mobile} should exceed desktop {desktop}"
    );
}

#[test]
fn a_ref_that_is_not_a_composite_is_reported_once() {
    let (mut graph, recipe) = button_with(&[]);
    let plain = graph
        .tokens
        .values()
        .find(|t| {
            t.raw.pointer("/name/legacyKey").and_then(Value::as_str) == Some("bold-font-weight")
        })
        .and_then(|t| t.uuid.clone())
        .expect("bold-font-weight");
    for r in graph.relationships.iter_mut().filter(|r| {
        r.raw.pointer("/scope/property").and_then(Value::as_str) == Some("type-style")
            && r.raw["uuid"]
                .as_str()
                .is_some_and(|u| u.starts_with("harness-"))
    }) {
        r.raw["$ref"] = json!(plain);
    }
    let scene = text_scene(&graph, &recipe, "desktop");
    let hits: Vec<_> = scene
        .diagnostics
        .iter()
        .filter(|d| d.contains("is not a typography composite"))
        .collect();
    assert_eq!(hits.len(), 1, "{:?}", scene.diagnostics);
    assert!(hits[0].starts_with("typeStyle: '"), "{}", hits[0]);
}

#[test]
fn an_inner_alias_that_does_not_resolve_is_reported() {
    let (mut graph, recipe) = button_with(&[]);
    let uuid = composite_uuid(&graph, "component-m-bold");
    let key = graph
        .tokens
        .iter()
        .find(|(_, t)| t.uuid.as_deref() == Some(uuid.as_str()))
        .map(|(k, _)| k.clone())
        .unwrap();
    let t: &mut TokenRecord = graph.tokens.get_mut(&key).unwrap();
    t.raw["value"]["fontSize"] = json!("{no-such-font-size}");
    let scene = text_scene(&graph, &recipe, "desktop");
    assert!(
        scene
            .diagnostics
            .iter()
            .any(|d| d == "typeStyle: component-m-bold.fontSize '{no-such-font-size}' not found"),
        "{:?}",
        scene.diagnostics
    );
}

#[test]
fn a_prebuilt_alias_index_unpacks_like_a_scan() {
    let graph = load_graph();
    let keys = design_data_core::cascade::legacy_keys(&graph);
    let mut n = 0;
    for t in graph
        .tokens
        .values()
        .filter(|t| design_data_core::typography::is_composite(t))
    {
        for scale in ["desktop", "mobile"] {
            let ctx = HashMap::from([("scale".to_string(), scale.to_string())]);
            let scan = design_data_core::typography::unpack(&graph, t, &ctx);
            let indexed = design_data_core::typography::unpack_in(&graph, t, &ctx, Some(&keys));
            assert_eq!(scan, indexed, "{} {scale}", t.name);
            n += 1;
        }
    }
    assert!(n >= 30, "{n}");
}
