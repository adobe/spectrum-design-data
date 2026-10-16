// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! The in-memory graph projection that `figma export` consumes must match the
//! on-disk legacy projection (`packages/tokens/src`) generated from the same
//! canonical `packages/design-data` dataset.

use assert_cmd::Command;
use std::path::PathBuf;

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .unwrap()
}

fn read_legacy_dir(dir: &std::path::Path) -> serde_json::Map<String, serde_json::Value> {
    let mut merged = serde_json::Map::new();
    for entry in std::fs::read_dir(dir).unwrap() {
        let path = entry.unwrap().path();
        if path.extension().is_some_and(|e| e == "json") {
            let v: serde_json::Value =
                serde_json::from_slice(&std::fs::read(&path).unwrap()).unwrap();
            merged.extend(v.as_object().unwrap().clone());
        }
    }
    merged
}

#[test]
fn graph_projection_matches_per_file_legacy_output() {
    let root = repo_root();
    let tokens = root.join("packages/design-data/tokens");
    if !tokens.is_dir() {
        return;
    }
    let tmp = tempfile::tempdir().unwrap();
    let per_file = tmp.path().join("per-file");
    let combined = tmp.path().join("combined.json");

    Command::cargo_bin("design-data")
        .unwrap()
        .current_dir(&root)
        .args(["migrate", "legacy-output"])
        .arg(&tokens)
        .arg("--output")
        .arg(&per_file)
        .assert()
        .success();
    Command::cargo_bin("design-data")
        .unwrap()
        .current_dir(&root)
        .args(["migrate", "legacy-output-cascaded"])
        .arg(&tokens)
        .arg("--output")
        .arg(&combined)
        .assert()
        .success();

    let expected = read_legacy_dir(&per_file);
    let actual: serde_json::Value =
        serde_json::from_slice(&std::fs::read(&combined).unwrap()).unwrap();
    assert_eq!(&serde_json::Value::Object(expected), &actual);
}
