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
//! hashes are committed per component in `tests/fixtures/components/<name>/snapshots.json`,
//! so a change to a recipe, a relationship, a token or the renderer shows up in review as
//! the option sets whose output changed, and recipe PRs for different components touch
//! different files. Every combination must also render without a diagnostic.
//!
//! The harness is `libtest-mimic` (`harness = false`): one test per file in
//! `packages/design-data/visuals/`, built at run time, so there is no list to keep. Run or
//! regenerate one component with `-- <name> --exact`, for example:
//! `cargo test -p design-data-core --test recipe_snapshots -- tree-view --exact`
//!
//! After an intended change, regenerate (all components, or add `-- <name> --exact`):
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

/// Option set key -> hash, for one recipe.
type Snapshots = BTreeMap<String, String>;

fn data_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data")
}

fn components_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/components")
}

fn snapshot_path(name: &str) -> PathBuf {
    components_dir().join(name).join("snapshots.json")
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
    .with_behaviors_dir(&d.join("behaviors"))
    .expect("behaviors")
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
                            options: set
                                .iter()
                                .cloned()
                                .chain(fixed_options(name))
                                .collect::<HashMap<_, _>>(),
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

/// A calendar draws its months and weekdays from collection options, and an empty nested
/// repeat draws no cell, so its snapshots carry a month of days (a blank cell, a day that
/// follows the request, a selected one, a disabled one and a range with its two ends and a
/// day between them) and the weekday headings.
fn fixed_options(name: &str) -> Vec<(String, Value)> {
    if name == "accordion" {
        // An open item draws its content text only when `content` is set, and that text takes
        // its own color binding (disabled grey when `isDisabled`), so it is part of every snapshot.
        return vec![("content".into(), Value::String("Content text".into()))];
    }
    if name == "illustrated-message" {
        // The text parts draw nothing without copy, so every snapshot carries both.
        return vec![
            ("title".into(), Value::String("No results found".into())),
            (
                "description".into(),
                Value::String(
                    "Try a different search term or remove some of the filters you applied.".into(),
                ),
            ),
        ];
    }
    if matches!(
        name,
        "date-field" | "time-field" | "segmented-text-field" | "date-picker"
    ) {
        // The fields draw only the segments the request supplies: a value, a separator, an
        // empty segment showing its format text and the last value, so each segment binding
        // is part of every snapshot. Every entry sets both flags, because a request option
        // such as isLiteral applies to each entry that does not.
        let seg = |label: &str, placeholder: bool, literal: bool| serde_json::json!({ "label": label, "isPlaceholder": placeholder, "isLiteral": literal });
        let segments = if name == "time-field" {
            serde_json::json!([
                seg("10", false, false),
                seg(":", false, true),
                seg("mm", true, false),
                seg("AM", false, false)
            ])
        } else {
            serde_json::json!([
                seg("11", false, false),
                seg("/", false, true),
                seg("dd", true, false),
                seg("/", false, true),
                seg("2026", false, false)
            ])
        };
        return vec![("segments".into(), segments)];
    }
    if name == "drop-zone" {
        // The text parts draw nothing without copy, so every snapshot carries both.
        return vec![
            (
                "title".into(),
                Value::String("Drag and drop your file".into()),
            ),
            (
                "description".into(),
                Value::String("Or select a file from your computer".into()),
            ),
        ];
    }
    if name == "list-view" {
        // Rows draw only from `items`: a description row, selected, disabled and plain rows,
        // each with its checkbox (multiple selection).
        return vec![
            (
                "items".into(),
                serde_json::json!([
                    { "label": "Home", "description": "Start page", "isSelected": true },
                    { "label": "Projects" },
                    { "label": "Settings", "isDisabled": true },
                    { "label": "Archive", "isSelected": true, "isDisabled": true }
                ]),
            ),
            ("selectionMode".into(), "multiple".into()),
        ];
    }
    if name == "tree-view" {
        // Items draw only from `items`: nested, expanded and collapsed, selected and disabled.
        return vec![
            (
                "items".into(),
                serde_json::json!([
                    { "label": "Documents", "hasChildren": true, "isExpanded": true, "children": [
                        { "label": "Work", "hasChildren": true, "isExpanded": true, "isSelected": true, "children": [
                            { "label": "Report", "hasChildren": false, "isSelected": false, "isDisabled": true }
                        ] },
                        { "label": "Photos", "hasChildren": true, "isExpanded": false, "isSelected": false }
                    ] },
                    { "label": "Archive", "hasChildren": false, "isSelected": true, "isDisabled": true }
                ]),
            ),
            ("selectionMode".into(), "multiple".into()),
        ];
    }
    if name != "calendar" {
        return Vec::new();
    }
    let weekdays: Vec<Value> = ["S", "M", "T", "W", "T", "F", "S"]
        .iter()
        .map(|l| serde_json::json!({ "label": l }))
        .collect();
    let days = serde_json::json!([
        { "label": "" },
        { "label": "1" },
        { "label": "2", "isSelected": true },
        { "label": "3", "isDisabled": true },
        { "label": "4" },
        { "label": "5", "isSelected": true, "isRangeStart": true },
        { "label": "6", "isSelected": true },
        { "label": "7", "isSelected": true, "isRangeEnd": true }
    ]);
    vec![
        (
            "months".into(),
            serde_json::json!([{ "title": "February 2026", "days": days }]),
        ),
        ("weekdays".into(), Value::Array(weekdays)),
    ]
}

/// A group recipe is only drawn through its slot, so its snapshots fill the default slot with
/// three items (two for the illustrated message, whose slot takes at most two; an empty group draws nothing and hides a gap binding).
fn group_fills(name: &str) -> HashMap<String, Vec<design_data_core::visual::SlotFill>> {
    let (slot, item) = match name {
        "alert-dialog" | "standard-dialog" | "illustrated-message" | "takeover-dialog" => {
            ("button-group", "button")
        }
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
        (0..if name == "illustrated-message" { 2 } else { 3 })
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

/// The recipe's committed snapshots; empty when the file does not exist yet (a new recipe:
/// every option set then shows as new).
fn read_snapshots(name: &str) -> Snapshots {
    match std::fs::read_to_string(snapshot_path(name)) {
        Ok(text) => serde_json::from_str(&text)
            .unwrap_or_else(|e| panic!("parse {}: {e}", snapshot_path(name).display())),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Snapshots::new(),
        Err(e) => panic!("read {}: {e}", snapshot_path(name).display()),
    }
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

/// Renders one recipe and compares it with its committed snapshots, or rewrites them when
/// UPDATE_RECIPE_SNAPSHOTS is set.
fn check_recipe(name: &str) {
    let graph = load_graph();
    let run = render_recipe(&graph, &SceneCache::default(), name);
    assert_no_diagnostics(&run.diagnostics);

    if updating() {
        let path = snapshot_path(name);
        std::fs::create_dir_all(path.parent().expect("component dir"))
            .expect("create component dir");
        let json = serde_json::to_string_pretty(&run.snapshots).unwrap() + "\n";
        std::fs::write(&path, json).expect("write snapshots");
        return;
    }

    let e = read_snapshots(name);
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
        "\nRendered output differs from tests/fixtures/components/{name}/snapshots.json:\n{}\n\nIf the change is intended, review it with `design-data render <component> --option name=value ...` and regenerate with UPDATE_RECIPE_SNAPSHOTS=1 (add `-- {name} --exact` for this recipe only).\n",
        problems.join("\n")
    );
}

/// Every recipe has a committed snapshot file, and no snapshot file is left for a recipe
/// that no longer exists. Other files in a component directory (goldens, baselines) may
/// belong to components without a recipe, so only `snapshots.json` is checked.
fn check_snapshot_files() {
    let recipes = recipe_names();
    let mut with_snapshots: Vec<String> = std::fs::read_dir(components_dir())
        .expect("components dir")
        .filter_map(|e| e.ok())
        .filter(|e| e.path().join("snapshots.json").is_file())
        .filter_map(|e| e.file_name().to_str().map(String::from))
        .collect();
    with_snapshots.sort();
    let orphaned: Vec<&String> = with_snapshots
        .iter()
        .filter(|n| !recipes.contains(n))
        .collect();
    assert!(
        orphaned.is_empty(),
        "tests/fixtures/components has snapshots.json for recipes that no longer exist: {orphaned:?} (delete those files)"
    );
    if updating() {
        return; // the recipe tests are writing the missing files in this run
    }
    let missing: Vec<&String> = recipes
        .iter()
        .filter(|n| !with_snapshots.contains(n))
        .collect();
    assert!(
        missing.is_empty(),
        "recipes without tests/fixtures/components/<name>/snapshots.json: {missing:?} (regenerate with UPDATE_RECIPE_SNAPSHOTS=1 -- <name> --exact)"
    );
}

/// Runs a check as a libtest-mimic trial: a panic (an assert) becomes the test's failure.
fn trial(
    name: String,
    check: impl FnOnce() + Send + std::panic::UnwindSafe + 'static,
) -> libtest_mimic::Trial {
    libtest_mimic::Trial::test(name, move || {
        std::panic::catch_unwind(check).map_err(|panic| {
            let msg = panic
                .downcast_ref::<String>()
                .cloned()
                .or_else(|| panic.downcast_ref::<&str>().map(|s| s.to_string()))
                .unwrap_or_else(|| "test panicked".into());
            libtest_mimic::Failed::from(msg)
        })
    })
}

fn main() {
    let args = libtest_mimic::Arguments::from_args();
    let mut trials = vec![trial(
        "snapshot_files_match_recipes".into(),
        check_snapshot_files,
    )];
    trials.extend(
        recipe_names()
            .into_iter()
            .map(|name| trial(name.clone(), move || check_recipe(&name))),
    );
    libtest_mimic::run(&args, trials).exit();
}
