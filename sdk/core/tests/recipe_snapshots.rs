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
    build_scene_cached, recipe_options, scene_to_svg, RenderRequest, SceneCache,
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
    let (used, _) = recipe_options(&recipe);
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
                            label: "Label".into(),
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

#[test]
fn recipe_renders_match_the_snapshots() {
    let graph = load_graph();
    let cache = SceneCache::default();
    let mut actual = Snapshots::new();
    let mut diagnostics = Vec::new();
    let mut total = 0;
    for name in recipe_names() {
        let started = std::time::Instant::now();
        let run = render_recipe(&graph, &cache, &name);
        eprintln!(
            "{name}: {} combinations in {:.1}s",
            run.combinations,
            started.elapsed().as_secs_f64()
        );
        total += run.combinations;
        diagnostics.extend(run.diagnostics);
        actual.insert(name, run.snapshots);
    }
    eprintln!(
        "rendered {total} combinations across {} recipes",
        actual.len()
    );

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

    if std::env::var_os("UPDATE_RECIPE_SNAPSHOTS").is_some() {
        let json = serde_json::to_string_pretty(&actual).unwrap() + "\n";
        std::fs::write(fixture_path(), json).expect("write snapshots");
        return;
    }

    let expected: Snapshots =
        serde_json::from_str(&std::fs::read_to_string(fixture_path()).expect("read snapshots"))
            .expect("parse snapshots");

    let mut problems = Vec::new();
    let recipes: std::collections::BTreeSet<&String> =
        actual.keys().chain(expected.keys()).collect();
    for recipe in recipes {
        let empty = BTreeMap::new();
        let (a, e) = (
            actual.get(recipe).unwrap_or(&empty),
            expected.get(recipe).unwrap_or(&empty),
        );
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
        for (what, list) in [
            ("changed", &changed),
            ("new", &added),
            ("removed", &removed),
        ] {
            if !list.is_empty() {
                problems.push(format!(
                    "{recipe}: {} option set(s) {what}, for example [{}]",
                    list.len(),
                    list.iter().take(3).copied().collect::<Vec<_>>().join(" | ")
                ));
            }
        }
    }
    assert!(
        problems.is_empty(),
        "\nRendered output differs from tests/fixtures/recipe-snapshots.json:\n{}\n\nIf the change is intended, review it with `design-data render <component> --option name=value ...` and regenerate with UPDATE_RECIPE_SNAPSHOTS=1.\n",
        problems.join("\n")
    );
}
