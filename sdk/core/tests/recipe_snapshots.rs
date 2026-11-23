// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Render snapshots for every visual recipe.
//!
//! For each recipe this renders every valid option combination (booleans and
//! declared values of the options the recipe uses; combinations an `error`
//! constraint excludes are skipped) across every size, interaction state, color
//! scheme and scale, and hashes the SVG and diagnostics of each option set. The
//! hashes are committed in `tests/fixtures/recipe-snapshots.json`, so a change to
//! a recipe, a relationship, a token or the renderer shows up in review as the
//! option sets whose output changed. Every combination must also render without
//! a diagnostic.
//!
//! After an intended change, regenerate with:
//! `UPDATE_RECIPE_SNAPSHOTS=1 cargo test -p design-data-core --test recipe_snapshots`

use std::collections::{BTreeMap, HashMap};
use std::path::PathBuf;

use design_data_core::constraints::{read_constraints, Combination};
use design_data_core::graph::TokenGraph;
use design_data_core::visual::{
    build_scene_cached, recipe_options_in, scene_to_svg, RenderRequest, SceneCache,
};
use serde_json::Value;

const SCHEMES: &[&str] = &["light", "dark", "wireframe"];
const SCALES: &[&str] = &["desktop", "mobile"];

type Snapshots = BTreeMap<String, BTreeMap<String, String>>;

fn data_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data")
}

fn fixture_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/recipe-snapshots.json")
}

/// FNV-1a, 64 bit: stable across Rust versions, unlike `DefaultHasher`.
struct Fnv(u64);

impl Fnv {
    fn new() -> Self {
        Fnv(0xcbf2_9ce4_8422_2325)
    }
    fn write(&mut self, s: &str) {
        for b in s.bytes() {
            self.0 ^= u64::from(b);
            self.0 = self.0.wrapping_mul(0x0100_0000_01b3);
        }
    }
    fn finish(&self) -> String {
        format!("{:016x}", self.0)
    }
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

fn read_json(path: PathBuf) -> Value {
    serde_json::from_str(
        &std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("{path:?}: {e}")),
    )
    .unwrap_or_else(|e| panic!("{path:?}: {e}"))
}

/// Values an option takes in the matrix: booleans, or its declared `values`.
/// Options with any other domain (free text, icons) keep their default.
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

/// Every combination of the given option domains, in a stable order.
fn option_sets(domains: &[(String, Vec<Value>)]) -> Vec<Vec<(String, Value)>> {
    let mut sets: Vec<Vec<(String, Value)>> = vec![vec![]];
    for (name, values) in domains {
        let mut next = Vec::new();
        for set in &sets {
            for v in values {
                let mut s = set.clone();
                s.push((name.clone(), v.clone()));
                next.push(s);
            }
        }
        sets = next;
    }
    sets
}

fn key(set: &[(String, Value)]) -> String {
    if set.is_empty() {
        return "(defaults)".into();
    }
    set.iter()
        .map(|(k, v)| format!("{k}={v}"))
        .collect::<Vec<_>>()
        .join(",")
}

struct Run {
    snapshots: BTreeMap<String, String>,
    diagnostics: Vec<String>,
    combinations: usize,
}

fn render_recipe(graph: &TokenGraph, cache: &SceneCache, name: &str) -> Run {
    let d = data_dir();
    let recipe = read_json(d.join(format!("visuals/{name}.json")));
    let component = read_json(d.join(format!("components/{name}.json")));
    // Sorted, so the manifest does not depend on the order a recipe mentions its options.
    let (mut used, _) = recipe_options_in(graph, &recipe, name);
    used.sort();
    let options = component.get("options").and_then(Value::as_object);

    let domains: Vec<(String, Vec<Value>)> = used
        .iter()
        .filter(|o| o.as_str() != "size")
        .filter_map(|o| {
            let vals = domain(options?.get(o)?)?;
            Some((o.clone(), vals))
        })
        .collect();
    let states: Vec<String> = component
        .get("states")
        .and_then(Value::as_array)
        .map(|a| {
            a.iter()
                .filter(|s| s.get("trigger").and_then(Value::as_str) == Some("interaction"))
                .filter_map(|s| s.get("name").and_then(Value::as_str).map(String::from))
                .collect()
        })
        .unwrap_or_default();
    let sizes: Vec<String> = recipe
        .get("sizeScale")
        .and_then(Value::as_object)
        .map(|m| m.keys().cloned().collect())
        .unwrap_or_default();
    let constraints = read_constraints(&component);

    let mut run = Run {
        snapshots: BTreeMap::new(),
        diagnostics: Vec::new(),
        combinations: 0,
    };
    for set in option_sets(&domains) {
        let valid_for = |size: &str| {
            let mut combo: Combination = set
                .iter()
                .map(|(k, v)| (k.clone(), Some(v.clone())))
                .collect();
            combo.insert("size".into(), Some(Value::String(size.into())));
            !constraints.iter().any(|(_, c)| {
                c.severity == design_data_core::constraints::ConstraintSeverity::Error
                    && c.excludes(&combo)
            })
        };
        let mut hash = Fnv::new();
        let mut any = false;
        for size in &sizes {
            if !valid_for(size) {
                continue;
            }
            let state_list: Vec<Option<&String>> = std::iter::once(None)
                .chain(states.iter().map(Some))
                .collect();
            for state in state_list {
                for scheme in SCHEMES {
                    for scale in SCALES {
                        let req = RenderRequest {
                            component: name.into(),
                            size: size.clone(),
                            states: state.into_iter().cloned().collect(),
                            options: set.iter().cloned().collect::<HashMap<_, _>>(),
                            mode: [("colorScheme", *scheme), ("scale", *scale)]
                                .iter()
                                .map(|(k, v)| (k.to_string(), v.to_string()))
                                .collect(),
                            // The avatar's label is its initials, one letter here: the fixed
                            // 14px font is wider than the size 50 circle with two (qkj5.194).
                            label: if name == "avatar" { "A" } else { "Label" }.into(),
                            icon: None,
                            text_metrics: None,
                            slots: group_fills(name),
                            width: None,
                        };
                        let label = format!(
                            "{name} [{}] size={size} state={} {scheme}/{scale}",
                            key(&set),
                            state.map_or("none", |s| s.as_str())
                        );
                        hash.write(&label);
                        match build_scene_cached(graph, &recipe, &req, cache) {
                            Ok(scene) => {
                                hash.write(&scene_to_svg(&scene));
                                for diag in &scene.diagnostics {
                                    hash.write(diag);
                                    run.diagnostics.push(format!("{label}: {diag}"));
                                }
                            }
                            Err(e) => {
                                hash.write(&e);
                                run.diagnostics.push(format!("{label}: {e}"));
                            }
                        }
                        run.combinations += 1;
                        any = true;
                    }
                }
            }
        }
        if any {
            run.snapshots.insert(key(&set), hash.finish());
        }
    }
    run
}

/// A group recipe is only drawn through its slot, so its snapshots fill the default slot with
/// three items (an empty group draws nothing and hides a gap binding).
fn group_fills(name: &str) -> HashMap<String, Vec<design_data_core::visual::SlotFill>> {
    let (slot, item) = match name {
        "alert-dialog" | "standard-dialog" => ("button-group", "button"),
        _ => (
            "default",
            match name {
                "button-group" => "button",
                "action-group" => "action-button",
                "swatch-group" => "swatch",
                "checkbox-group" => "checkbox",
                "radio-group" => "radio-button",
                _ => return Default::default(),
            },
        ),
    };
    HashMap::from([(
        slot.to_string(),
        (0..3)
            .map(|_| design_data_core::visual::SlotFill {
                component: item.into(),
                ..Default::default()
            })
            .collect(),
    )])
}

fn recipe_names() -> Vec<String> {
    let mut names: Vec<String> = std::fs::read_dir(data_dir().join("visuals"))
        .expect("visuals dir")
        .filter_map(|e| e.ok())
        .filter_map(|e| {
            e.path()
                .file_stem()
                .and_then(|s| s.to_str())
                .map(String::from)
                .filter(|_| e.path().extension().is_some_and(|x| x == "json"))
        })
        .collect();
    names.sort();
    names
}

fn updating() -> bool {
    std::env::var_os("UPDATE_RECIPE_SNAPSHOTS").is_some()
}

fn read_snapshots() -> Snapshots {
    serde_json::from_str(&std::fs::read_to_string(fixture_path()).expect("read snapshots"))
        .expect("parse snapshots")
}

fn assert_no_diagnostics(diagnostics: &[String]) {
    assert!(
        diagnostics.is_empty(),
        "render diagnostics ({}):\n{}",
        diagnostics.len(),
        diagnostics
            .iter()
            .take(20)
            .cloned()
            .collect::<Vec<_>>()
            .join("\n")
    );
}

fn check_recipe(name: &str) {
    if updating() {
        return; // `update_recipe_snapshots` rewrites the whole fixture
    }
    let graph = load_graph();
    let run = render_recipe(&graph, &SceneCache::default(), name);
    assert_no_diagnostics(&run.diagnostics);

    let expected = read_snapshots();
    let empty = BTreeMap::new();
    let e = expected.get(name).unwrap_or(&empty);
    let a = &run.snapshots;
    let sets: std::collections::BTreeSet<&String> = a.keys().chain(e.keys()).collect();
    let (mut changed, mut added, mut removed) = (Vec::new(), Vec::new(), Vec::new());
    for set in sets {
        match (a.get(set), e.get(set)) {
            (Some(x), Some(y)) if x != y => changed.push(set.as_str()),
            (Some(_), None) => added.push(set.as_str()),
            (None, Some(_)) => removed.push(set.as_str()),
            _ => {}
        }
    }
    let mut problems = Vec::new();
    for (what, list) in [
        ("changed", &changed),
        ("new", &added),
        ("removed", &removed),
    ] {
        if !list.is_empty() {
            problems.push(format!(
                "{name}: {} option set(s) {what}, for example [{}]",
                list.len(),
                list.iter().take(3).copied().collect::<Vec<_>>().join(" | ")
            ));
        }
    }
    assert!(
        problems.is_empty(),
        "\nRendered output differs from tests/fixtures/recipe-snapshots.json:\n{}\n\nIf the change is intended, review it with `design-data render <component> --option name=value ...` and regenerate with UPDATE_RECIPE_SNAPSHOTS=1.\n",
        problems.join("\n")
    );
}

/// One test per recipe, so nextest runs them in parallel instead of one long test. The macro
/// also builds `RECIPES`, so a recipe cannot be listed without being tested.
/// `every_recipe_has_a_test` fails when `visuals/` and this list disagree.
macro_rules! recipe_tests {
    ($($test:ident => $name:literal),* $(,)?) => {
        const RECIPES: &[&str] = &[$($name),*];
        $(
            #[test]
            fn $test() {
                check_recipe($name);
            }
        )*
    };
}

recipe_tests! {
    accordion => "accordion",
    action_button => "action-button",
    action_group => "action-group",
    alert_banner => "alert-banner",
    alert_dialog => "alert-dialog",
    avatar => "avatar",
    badge => "badge",
    bar_panel => "bar-panel",
    button => "button",
    button_group => "button-group",
    checkbox => "checkbox",
    checkbox_group => "checkbox-group",
    clear_button => "clear-button",
    close_button => "close-button",
    coach_indicator => "coach-indicator",
    coach_mark => "coach-mark",
    color_handle => "color-handle",
    color_loupe => "color-loupe",
    combo_box => "combo-box",
    contextual_help => "contextual-help",
    divider => "divider",
    field_label => "field-label",
    help_text => "help-text",
    in_field_button => "in-field-button",
    in_field_progress_circle => "in-field-progress-circle",
    in_line_alert => "in-line-alert",
    link => "link",
    meter => "meter",
    number_field => "number-field",
    opacity_checkerboard => "opacity-checkerboard",
    picker => "picker",
    popover => "popover",
    progress_bar => "progress-bar",
    progress_circle => "progress-circle",
    radio_button => "radio-button",
    radio_group => "radio-group",
    search_field => "search-field",
    segmented_control => "segmented-control",
    standard_dialog => "standard-dialog",
    standard_panel => "standard-panel",
    status_light => "status-light",
    swatch => "swatch",
    swatch_group => "swatch-group",
    switch => "switch",
    tabs => "tabs",
    tag => "tag",
    text_area => "text-area",
    text_field => "text-field",
    thumbnail => "thumbnail",
    toast => "toast",
    tooltip => "tooltip",
}

#[test]
fn every_recipe_has_a_test() {
    assert_eq!(
        recipe_names(),
        RECIPES,
        "visuals/ and the recipe_tests! list must name the same recipes"
    );
    if updating() {
        return; // update_recipe_snapshots is rewriting the fixture
    }
    let expected = read_snapshots();
    let stale: Vec<&String> = expected
        .keys()
        .filter(|k| !RECIPES.contains(&k.as_str()))
        .collect();
    assert!(
        stale.is_empty(),
        "tests/fixtures/recipe-snapshots.json has snapshots for recipes that no longer exist: {stale:?}"
    );
}

/// Rewrites the fixture; does nothing unless UPDATE_RECIPE_SNAPSHOTS is set.
#[test]
fn update_recipe_snapshots() {
    if !updating() {
        return;
    }
    let graph = load_graph();
    let cache = SceneCache::default();
    let mut actual = Snapshots::new();
    let mut diagnostics = Vec::new();
    for name in recipe_names() {
        let run = render_recipe(&graph, &cache, &name);
        diagnostics.extend(run.diagnostics);
        actual.insert(name, run.snapshots);
    }
    assert_no_diagnostics(&diagnostics);
    let json = serde_json::to_string_pretty(&actual).unwrap() + "\n";
    std::fs::write(fixture_path(), json).expect("write snapshots");
}
