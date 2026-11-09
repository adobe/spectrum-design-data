// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! A recipe part of kind `component` draws another component's recipe (the accordion item's
//! direct actions), and a cycle is refused by `render` and reported by `validate`.

use std::path::PathBuf;

use assert_cmd::Command;
use predicates::str::contains;
use serde_json::Value;

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .expect("repo root canonicalizes")
}

fn dd(args: &[&str]) -> assert_cmd::assert::Assert {
    Command::cargo_bin("design-data")
        .unwrap()
        .current_dir(repo_root())
        .args(args)
        .assert()
}

fn scene(args: &[&str]) -> Value {
    let out = Command::cargo_bin("design-data")
        .unwrap()
        .current_dir(repo_root())
        .args(["render", "accordion", "--format", "scene"])
        .args(args)
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    serde_json::from_slice(&out.stdout).unwrap()
}

fn parts(scene: &Value) -> Vec<&str> {
    scene["nodes"]
        .as_array()
        .unwrap()
        .iter()
        .map(|n| n["part"].as_str().unwrap())
        .collect()
}

#[test]
fn direct_actions_draw_a_nested_button_and_switch() {
    let on = scene(&[
        "--option",
        "hasActionButton=true",
        "--option",
        "hasSwitch=true",
    ]);
    let p = parts(&on);
    for want in [
        "direct-actions",
        "action-button",
        "action-button.icon",
        "switch",
        "switch.track",
        "switch.handle",
    ] {
        assert!(p.contains(&want), "{want} in {p:?}");
    }
    assert_eq!(on["diagnostics"].as_array().unwrap().len(), 0);
    // The nested root is the host part: 32 high at the default size.
    let button = on["nodes"]
        .as_array()
        .unwrap()
        .iter()
        .find(|n| n["part"] == "action-button")
        .unwrap();
    assert_eq!(button["h"], 32.0);

    // Without the options the item is what it was: no nested parts.
    let off = scene(&[]);
    assert!(parts(&off)
        .iter()
        .all(|p| !p.contains('.') && *p != "direct-actions"));
}

#[test]
fn a_recipe_that_nests_itself_is_refused_and_reported() {
    let dir = tempfile::tempdir().unwrap();
    let visuals = repo_root().join("packages/design-data/visuals");
    for e in std::fs::read_dir(&visuals).unwrap() {
        let p = e.unwrap().path();
        std::fs::copy(&p, dir.path().join(p.file_name().unwrap())).unwrap();
    }
    let path = dir.path().join("switch.json");
    let mut switch: Value = serde_json::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
    switch["parts"]["container"]["children"] = serde_json::json!(["track", "label", "again"]);
    switch["parts"]["again"] = serde_json::json!({
        "kind": "component", "component": "switch",
        "sizeMap": { "s": "s", "m": "m", "l": "l", "xl": "xl" }
    });
    std::fs::write(&path, switch.to_string()).unwrap();
    let dir_arg = dir.path().to_str().unwrap();

    dd(&[
        "render",
        "accordion",
        "--visuals-path",
        dir_arg,
        "--option",
        "hasSwitch=true",
    ])
    .failure()
    .stderr(contains("inside itself"));
    dd(&["validate", "--visuals-path", dir_arg])
        .failure()
        .stderr(contains("SPEC-089"));
}
