// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `render --batch` writes SVG + scene JSON per state, and `render-compare` reports the
//! differences between those scenes and measured platform values.

use std::path::PathBuf;

use assert_cmd::Command;
use predicates::str::contains;
use serde_json::{json, Value};

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

#[test]
fn batch_renders_each_state_and_compare_reports_differences() {
    let dir = tempfile::tempdir().unwrap();
    let states = dir.path().join("states.json");
    std::fs::write(
        &states,
        json!([
            { "component": "button", "options": { "style": "accent" } },
            { "id": "dark", "component": "button", "colorScheme": "dark" }
        ])
        .to_string(),
    )
    .unwrap();
    let out = dir.path().join("renders");
    dd(&[
        "render",
        "--batch",
        states.to_str().unwrap(),
        "--out",
        out.to_str().unwrap(),
    ])
    .success();

    let index: Value =
        serde_json::from_str(&std::fs::read_to_string(out.join("index.json")).unwrap()).unwrap();
    let ids: Vec<&str> = index["states"]
        .as_array()
        .unwrap()
        .iter()
        .map(|s| s["id"].as_str().unwrap())
        .collect();
    assert_eq!(ids, ["button-m-style-accent-light-desktop", "dark"]);
    for id in &ids {
        let svg = std::fs::read_to_string(out.join(format!("{id}.svg"))).unwrap();
        assert!(svg.starts_with("<svg"), "{svg}");
    }
    let scene: Value =
        serde_json::from_str(&std::fs::read_to_string(out.join("dark.scene.json")).unwrap())
            .unwrap();
    let height = scene["nodes"][0]["h"].as_f64().unwrap();

    // The platform matches the height and is 5 taller on the other state's label size.
    let measured = dir.path().join("measured.json");
    std::fs::write(
        &measured,
        json!({
            "format": "design-data-measured/1",
            "source": { "platform": "react-spectrum-s2" },
            "states": [
                { "id": "dark", "parts": { "container": { "height": height + 0.5 } } },
                { "id": "button-m-style-accent-light-desktop",
                  "parts": { "container": { "height": height + 5.0 } } },
                { "id": "missing", "parts": {} }
            ]
        })
        .to_string(),
    )
    .unwrap();
    let args = [
        "render-compare",
        "--scenes",
        out.to_str().unwrap(),
        "--measured",
        measured.to_str().unwrap(),
    ];
    let stdout = dd(&args).success().get_output().stdout.clone();
    let report: Value = serde_json::from_slice(&stdout).unwrap();
    assert_eq!(report["format"], "design-data-comparison/1");
    assert_eq!(report["summary"]["differences"], 1, "{report}");
    assert_eq!(report["statesWithoutScene"], json!(["missing"]));
    let diff = &report["states"][1]["differences"][0];
    assert_eq!(diff["property"], "height");
    assert_eq!(diff["delta"], 5.0);

    // A looser tolerance clears the difference; markdown and --fail-on-diff follow the report.
    let mut loose = args.to_vec();
    loose.extend(["--tolerance", "size=6", "--format", "markdown"]);
    dd(&loose).success().stdout(contains("0 difference(s)"));
    let mut strict = args.to_vec();
    strict.extend(["--format", "markdown", "--fail-on-diff"]);
    dd(&strict).code(1).stdout(contains("Gap bead candidates"));
}

#[test]
fn batch_requires_out_and_reports_failed_states() {
    let dir = tempfile::tempdir().unwrap();
    let states = dir.path().join("states.json");
    std::fs::write(&states, r#"[{ "component": "no-such-component" }]"#).unwrap();
    dd(&["render", "--batch", states.to_str().unwrap()]).failure();
    dd(&[
        "render",
        "--batch",
        states.to_str().unwrap(),
        "--out",
        dir.path().join("o").to_str().unwrap(),
    ])
    .code(1)
    .stderr(contains("no visual recipe for 'no-such-component'"));
}

#[test]
fn icon_none_makes_a_label_only_button_in_render_and_in_a_batch() {
    let scene = |args: &[&str]| -> Value {
        let out = Command::cargo_bin("design-data")
            .unwrap()
            .current_dir(repo_root())
            .args(["render", "button", "--format", "scene"])
            .args(args)
            .output()
            .unwrap();
        serde_json::from_slice(&out.stdout).unwrap()
    };
    let has_icon = |s: &Value| {
        s["nodes"]
            .as_array()
            .unwrap()
            .iter()
            .any(|n| n["part"] == "icon")
    };
    assert!(has_icon(&scene(&[])));
    assert!(!has_icon(&scene(&["--icon", "none"])));
    let edit = scene(&["--icon", "workflow:edit"]);
    let node = edit["nodes"]
        .as_array()
        .unwrap()
        .iter()
        .find(|n| n["part"] == "icon")
        .unwrap();
    assert_eq!(node["icon"]["name"], "edit");

    let dir = tempfile::tempdir().unwrap();
    let states = dir.path().join("states.json");
    std::fs::write(
        &states,
        json!([{ "id": "bare", "component": "button", "icon": "none" }]).to_string(),
    )
    .unwrap();
    let out = dir.path().join("renders");
    dd(&[
        "render",
        "--batch",
        states.to_str().unwrap(),
        "--out",
        out.to_str().unwrap(),
    ])
    .success();
    let bare: Value =
        serde_json::from_str(&std::fs::read_to_string(out.join("bare.scene.json")).unwrap())
            .unwrap();
    assert!(!has_icon(&bare));
}

fn root_width(scene: &Value) -> f64 {
    scene["nodes"][0]["w"].as_f64().unwrap()
}

#[test]
fn a_long_badge_label_wraps_at_a_narrow_width_and_hugs_without_one() {
    let scene = |extra: &[&str]| -> Value {
        let mut args = vec![
            "render",
            "badge",
            "--format",
            "scene",
            "--option",
            "label=true",
        ];
        args.extend(["--label", "Three word label that is long"]);
        args.extend(extra);
        serde_json::from_slice(&dd(&args).success().get_output().stdout).unwrap()
    };
    let lines = |s: &Value| {
        s["nodes"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|n| n["part"] == "label")
            .count()
    };
    let height = |s: &Value| s["nodes"][0]["h"].as_f64().unwrap();
    let hug = scene(&[]);
    let narrow = scene(&["--width", "90"]);
    assert_eq!(lines(&hug), 1);
    assert!(lines(&narrow) > 1);
    assert!(height(&narrow) > height(&hug));
    assert_eq!(root_width(&narrow), 90.0);
    assert!(narrow["diagnostics"].as_array().unwrap().is_empty());
}

#[test]
fn width_sets_the_demo_width_for_render_and_for_a_batch_state() {
    let hug = dd(&["render", "accordion", "--format", "scene"])
        .success()
        .get_output()
        .stdout
        .clone();
    let hug: Value = serde_json::from_slice(&hug).unwrap();
    // The recipe's own width for the medium size, from the field width tokens.
    assert_eq!(root_width(&hug), 192.0);

    let out = dd(&["render", "accordion", "--format", "scene", "--width", "300"])
        .success()
        .get_output()
        .stdout
        .clone();
    assert_eq!(root_width(&serde_json::from_slice(&out).unwrap()), 300.0);

    let dir = tempfile::tempdir().unwrap();
    let states = dir.path().join("states.json");
    std::fs::write(
        &states,
        json!([
            { "component": "accordion" },
            { "component": "accordion", "width": 120 }
        ])
        .to_string(),
    )
    .unwrap();
    let renders = dir.path().join("renders");
    dd(&[
        "render",
        "--batch",
        states.to_str().unwrap(),
        "--out",
        renders.to_str().unwrap(),
    ])
    .success();
    let read = |id: &str| -> Value {
        serde_json::from_str(
            &std::fs::read_to_string(renders.join(format!("{id}.scene.json"))).unwrap(),
        )
        .unwrap()
    };
    assert_eq!(
        root_width(&read("accordion-m-light-desktop")),
        192.0,
        "a state without a width keeps the recipe's"
    );
    assert_eq!(root_width(&read("accordion-m-w120-light-desktop")), 120.0);
}
