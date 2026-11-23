// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `design-data refinements` against real repo data.

use std::path::PathBuf;

use assert_cmd::Command;

fn dataset(sub: &str) -> String {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../packages/design-data")
        .join(sub);
    assert!(dir.is_dir(), "expected {}", dir.display());
    dir.to_str().expect("utf8 path").to_string()
}

fn run(args: &[&str]) -> std::process::Output {
    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args(args)
        .arg("--mode-sets-path")
        .arg(dataset("mode-sets"))
        .output()
        .expect("run")
}

#[test]
fn refinements_json_lists_broader_neighbor_with_value_match() {
    let out = run(&[
        "refinements",
        "neutral-subdued-content-color-hover",
        &dataset("tokens"),
        "--format",
        "json",
    ]);
    assert!(out.status.success());
    let v: serde_json::Value = serde_json::from_slice(&out.stdout).expect("json");
    assert_eq!(v["specificity"]["tier"], "semantic");
    let broader = &v["broader"][0];
    assert_eq!(broader["name"], "neutral-content-color-hover");
    assert_eq!(broader["fields"]["variant"], "subdued");
    assert!(matches!(
        broader["valueMatch"].as_str(),
        Some("drop-in" | "consider")
    ));
}

#[test]
fn refinements_unknown_token_exits_nonzero() {
    let out = run(&["refinements", "no-such-token", &dataset("tokens")]);
    assert_eq!(out.status.code(), Some(1));
}

#[test]
fn query_prints_purpose_fields() {
    let out = Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "query",
            &dataset("tokens"),
            "--filter",
            "uuid=f24eb871-6419-4cef-88a2-cca8548ae31e",
        ])
        .output()
        .expect("run");
    let text = String::from_utf8_lossy(&out.stdout);
    assert!(text.contains("Purpose: 3 purpose fields"), "{text}");
}
