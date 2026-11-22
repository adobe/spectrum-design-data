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
fn actions_draw_a_nested_button_and_switch() {
    let on = scene(&[
        "--option",
        "hasActionButton=true",
        "--option",
        "hasSwitch=true",
    ]);
    let p = parts(&on);
    for want in [
        "actions",
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
        .all(|p| !p.contains('.') && *p != "actions"));
}

#[test]
fn a_recipe_that_nests_itself_is_reported() {
    let dir = tempfile::tempdir().unwrap();
    let copy = |name: &str| {
        let out = dir.path().join(name);
        std::fs::create_dir(&out).unwrap();
        let from = repo_root().join("packages/design-data").join(name);
        for e in std::fs::read_dir(&from).unwrap() {
            let p = e.unwrap().path();
            std::fs::copy(&p, out.join(p.file_name().unwrap())).unwrap();
        }
        out
    };
    let visuals = copy("visuals");
    let components = copy("components");
    let edit = |path: std::path::PathBuf, f: &dyn Fn(&mut Value)| {
        let mut v: Value = serde_json::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
        f(&mut v);
        std::fs::write(&path, v.to_string()).unwrap();
    };
    edit(visuals.join("switch.json"), &|switch| {
        switch["parts"]["container"]["children"] = serde_json::json!(["track", "label", "again"]);
        switch["parts"]["again"] = serde_json::json!({
            "kind": "component",
            "sizeMap": { "s": "s", "m": "m", "l": "l", "xl": "xl" }
        });
    });
    edit(components.join("switch.json"), &|switch| {
        switch["anatomy"]
            .as_array_mut()
            .unwrap()
            .push(serde_json::json!({ "name": "again", "component": "switch" }));
    });

    dd(&[
        "validate",
        "--visuals-path",
        visuals.to_str().unwrap(),
        "--components-path",
        components.to_str().unwrap(),
    ])
    .failure()
    .stderr(contains("SPEC-089"));
}

#[test]
fn an_expanded_item_draws_its_content_and_a_collapsed_one_does_not() {
    let items = r#"[
        {"label": "A", "content": "Body text", "isExpanded": true},
        {"label": "B", "content": "Hidden"},
        {"label": "C", "isExpanded": true}
    ]"#;
    let s = scene(&["--option", &format!("items={items}")]);
    let text = |part: &str| {
        s["nodes"]
            .as_array()
            .unwrap()
            .iter()
            .find(|n| n["part"] == part)
            .map(|n| n["text"].as_str().unwrap().to_string())
    };
    assert_eq!(
        text("accordion-item-1.content").as_deref(),
        Some("Body text")
    );
    assert_eq!(text("accordion-item-2.content"), None);
    assert_eq!(text("accordion-item-3.content"), None);
}
