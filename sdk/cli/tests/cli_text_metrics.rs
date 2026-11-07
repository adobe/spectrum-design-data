// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `--text-metrics` swaps the text-measurement table for the commands that lay out text.

use std::path::{Path, PathBuf};

use assert_cmd::Command;
use predicates::prelude::*;
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

fn default_table() -> Value {
    let path = repo_root().join("sdk/core/src/text-metrics/source-sans-3.json");
    serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap()
}

/// The committed table with every advance 100 units (0.1 em) wider.
fn wide_table(dir: &Path) -> PathBuf {
    let mut t = default_table();
    for w in ["400", "700"] {
        for a in t[w]["adv"].as_array_mut().unwrap() {
            *a = json!(a.as_f64().unwrap() + 100.0);
        }
    }
    let p = dir.join("wide.json");
    std::fs::write(&p, t.to_string()).unwrap();
    p
}

fn bad_table(dir: &Path) -> PathBuf {
    let mut t = default_table();
    t["700"]["adv"] = json!([1, 2, 3]);
    let p = dir.join("bad.json");
    std::fs::write(&p, t.to_string()).unwrap();
    p
}

fn label_width(extra: &[&str]) -> f64 {
    let mut args = vec!["render", "button", "--label", "Test", "--format", "scene"];
    args.extend(extra);
    let out = dd(&args).success().get_output().stdout.clone();
    let scene: Value = serde_json::from_slice(&out).unwrap();
    scene["nodes"]
        .as_array()
        .unwrap()
        .iter()
        .find(|n| n["part"] == "label")
        .unwrap()["w"]
        .as_f64()
        .unwrap()
}

#[test]
fn render_uses_the_given_table_and_rejects_a_bad_one() {
    let dir = tempfile::tempdir().unwrap();
    let (wide, bad) = (wide_table(dir.path()), bad_table(dir.path()));
    let base = label_width(&[]);
    let wider = label_width(&["--text-metrics", wide.to_str().unwrap()]);
    // Four characters, 0.1 em more each, at the label's font size.
    assert!(wider > base + 4.0 * 0.1 * 12.0 - 1e-6, "{base} -> {wider}");

    dd(&["render", "button", "--text-metrics", bad.to_str().unwrap()])
        .failure()
        .stderr(contains("--text-metrics").and(contains("weight 700")));
    dd(&["render", "button", "--text-metrics", "/nonexistent.json"])
        .failure()
        .stderr(contains("failed to read --text-metrics"));
}

#[test]
fn batch_and_spec_sheet_take_the_table() {
    let dir = tempfile::tempdir().unwrap();
    let (wide, bad) = (wide_table(dir.path()), bad_table(dir.path()));
    let states = dir.path().join("states.json");
    std::fs::write(
        &states,
        json!([{ "id": "b", "component": "button" }]).to_string(),
    )
    .unwrap();
    let scene_w = |out: &Path| -> f64 {
        let s: Value =
            serde_json::from_str(&std::fs::read_to_string(out.join("b.scene.json")).unwrap())
                .unwrap();
        s["width"].as_f64().unwrap()
    };
    let run = |out: &Path, extra: &[&str]| {
        let mut a = vec![
            "render",
            "--batch",
            states.to_str().unwrap(),
            "--out",
            out.to_str().unwrap(),
        ];
        a.extend(extra);
        dd(&a)
    };
    let (o1, o2) = (dir.path().join("o1"), dir.path().join("o2"));
    run(&o1, &[]).success();
    run(&o2, &["--text-metrics", wide.to_str().unwrap()]).success();
    assert!(scene_w(&o2) > scene_w(&o1));
    run(
        &dir.path().join("o3"),
        &["--text-metrics", bad.to_str().unwrap()],
    )
    .failure();

    let sheet = |extra: &[&str]| {
        let mut a = vec!["spec-sheet", "action-button"];
        a.extend(extra);
        dd(&a).success().get_output().stdout.clone()
    };
    assert_ne!(
        sheet(&[]),
        sheet(&["--text-metrics", wide.to_str().unwrap()])
    );
    dd(&[
        "spec-sheet",
        "action-button",
        "--text-metrics",
        bad.to_str().unwrap(),
    ])
    .failure();
}

#[test]
fn site_ships_the_table_it_was_built_with() {
    let dir = tempfile::tempdir().unwrap();
    let (wide, bad) = (wide_table(dir.path()), bad_table(dir.path()));
    let default_out = dir.path().join("default");
    dd(&[
        "site",
        "--out",
        default_out.to_str().unwrap(),
        "--components",
        "button",
    ])
    .success();
    assert_eq!(
        serde_json::from_str::<Value>(
            &std::fs::read_to_string(default_out.join("text-metrics.json")).unwrap()
        )
        .unwrap(),
        default_table()
    );
    assert!(default_out.join("OFL-SourceSans3.txt").is_file());

    let out = dir.path().join("wide");
    dd(&[
        "site",
        "--out",
        out.to_str().unwrap(),
        "--components",
        "button",
        "--text-metrics",
        wide.to_str().unwrap(),
    ])
    .success();
    assert_eq!(
        std::fs::read_to_string(out.join("text-metrics.json")).unwrap(),
        std::fs::read_to_string(&wide).unwrap()
    );
    dd(&[
        "site",
        "--out",
        dir.path().join("x").to_str().unwrap(),
        "--text-metrics",
        bad.to_str().unwrap(),
    ])
    .failure()
    .stderr(contains("weight 700"));
}
