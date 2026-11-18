// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! The tools default to size `m`. A component whose size is numeric (the avatar's 500) does
//! not declare it, so the render uses the component's default size instead of failing.

use std::path::PathBuf;

use assert_cmd::Command;
use serde_json::Value;

fn render_avatar(args: &[&str]) -> std::process::Output {
    Command::cargo_bin("design-data")
        .unwrap()
        .current_dir(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."))
        .args(["render", "avatar", "--format", "scene"])
        .args(args)
        .output()
        .unwrap()
}

#[test]
fn render_uses_the_component_default_size_when_m_is_not_declared() {
    let out = render_avatar(&[]);
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let scene: Value = serde_json::from_slice(&out.stdout).unwrap();
    let container = scene["nodes"]
        .as_array()
        .unwrap()
        .iter()
        .find(|n| n["part"] == "container")
        .unwrap();
    assert_eq!(container["w"], 40.0);
}

#[test]
fn an_explicit_size_is_kept() {
    let out = render_avatar(&["--size", "1000"]);
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let scene: Value = serde_json::from_slice(&out.stdout).unwrap();
    let w = scene["nodes"][0]["w"].as_f64().unwrap();
    assert_eq!(w, 64.0);
}
