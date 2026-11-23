// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `design-data site` stamps a content-hash build id into index.html so a redeploy that keeps
//! file names cannot serve stale scripts or data.

use std::path::{Path, PathBuf};

use assert_cmd::Command;

fn build(out: &Path, component: &str) -> String {
    Command::cargo_bin("design-data")
        .unwrap()
        .current_dir(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."))
        .args(["site", "--data-only", "--components", component, "--out"])
        .arg(out)
        .assert()
        .success();
    std::fs::read_to_string(out.join("index.html")).unwrap()
}

fn id(html: &str) -> String {
    let at = html.find("backend.js?v=").expect("backend.js is stamped") + "backend.js?v=".len();
    html[at..]
        .chars()
        .take_while(|c| c.is_ascii_hexdigit())
        .collect()
}

#[test]
fn index_html_carries_a_deterministic_content_hash() {
    let dir = tempfile::tempdir().unwrap();
    let a = build(&dir.path().join("a"), "button");
    let b = build(&dir.path().join("b"), "button");
    let (ida, idb) = (id(&a), id(&b));
    assert_eq!(ida.len(), 16);
    assert_eq!(ida, idb, "same inputs, same id");
    assert!(!a.contains("__BUILD_ID__"));
    assert!(a.contains(&format!("spectrum-controls.js?v={ida}")));

    // A different data set changes the id.
    let other = build(&dir.path().join("c"), "action-button");
    assert_ne!(id(&other), ida);
}
