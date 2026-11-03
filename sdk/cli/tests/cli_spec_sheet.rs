// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `design-data spec-sheet action-button` emits a model that validates against the draft
//! schema, with labelled token rows and a scene (with measurements) per block.

use std::path::PathBuf;

use assert_cmd::Command;
use serde_json::Value;

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .expect("repo root canonicalizes")
}

#[test]
fn action_button_sheet_matches_the_schema_and_labels_rows_from_data() {
    let out = Command::cargo_bin("design-data")
        .unwrap()
        .current_dir(repo_root())
        .args(["spec-sheet", "action-button"])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();
    let sheet: Value = serde_json::from_slice(&out).expect("sheet is JSON");

    let schema: Value = serde_json::from_str(
        &std::fs::read_to_string(
            repo_root().join("packages/design-data-spec/schemas/component-spec-sheet.schema.json"),
        )
        .unwrap(),
    )
    .unwrap();
    let validator = jsonschema::validator_for(&schema).expect("schema compiles");
    let errors: Vec<String> = validator
        .iter_errors(&sheet)
        .map(|e| format!("{}: {e}", e.instance_path))
        .collect();
    assert!(errors.is_empty(), "{errors:#?}");

    let layout = &sheet["pages"][0];
    assert_eq!(layout["title"], "Layout");
    let height = layout["blocks"]
        .as_array()
        .unwrap()
        .iter()
        .find(|b| b["title"] == "Height")
        .expect("a Height block");
    let items = height["rows"][0]["items"].as_array().unwrap();
    assert_eq!(items.len(), 5);
    assert_eq!(items[0]["label"], "Extra Small");
    assert_eq!(items[0]["marker"], 1);
    assert_eq!(height["render"]["markers"][0]["n"], 1);
    assert_eq!(items[0]["token"]["name"], "component-height-50");
    assert_eq!(items[0]["values"]["desktop"], "20px");
    let scene = &height["render"]["scene"];
    assert!(scene["measurements"]
        .as_array()
        .unwrap()
        .iter()
        .any(|m| m["prop"] == "height"));
    let m = &height["render"]["measurements"][0];
    assert_eq!(m["prop"], "height");
    assert_eq!(m["label"], "component-height-100");
    assert!(m["relationship"].is_string());
    assert!(height["render"]["view"]["scale"].as_f64().unwrap() > 1.0);

    let icon_only = layout["blocks"]
        .as_array()
        .unwrap()
        .iter()
        .find(|b| b["title"] == "Spacing (start/end edges, icon only)")
        .expect("an icon-only spacing block");
    let labels: Vec<&str> = icon_only["render"]["measurements"]
        .as_array()
        .unwrap()
        .iter()
        .map(|m| m["label"].as_str().unwrap())
        .collect();
    assert_eq!(labels.len(), 2, "{labels:?}");
    assert!(labels.iter().all(|l| l.contains("edge-to-visual-only")));
}
