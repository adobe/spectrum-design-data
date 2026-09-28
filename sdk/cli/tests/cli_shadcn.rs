// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use std::path::PathBuf;

use assert_cmd::Command;
use serde_json::Value;
use tempfile::tempdir;

fn repo_path(relative: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .join(relative)
}

#[test]
fn export_shadcn_theme_emits_both_color_schemes() {
    let output = Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "export",
            repo_path("packages/design-data/tokens")
                .to_str()
                .expect("utf8 path"),
            "--format",
            "shadcn-theme",
        ])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();

    let doc: Value = serde_json::from_slice(&output).expect("valid JSON");
    assert_eq!(doc["type"], "registry:theme");
    assert!(doc["cssVars"]["light"]
        .as_object()
        .is_some_and(|vars| !vars.is_empty()));
    assert!(doc["cssVars"]["dark"]
        .as_object()
        .is_some_and(|vars| !vars.is_empty()));
}

#[test]
fn shadcn_registry_writes_component_item_and_index() {
    let output_dir = tempdir().expect("temporary output directory");
    let components_dir = repo_path("packages/design-data/components");

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "shadcn",
            "registry",
            "--component",
            "action-button",
            "--components-dir",
            components_dir.to_str().expect("utf8 path"),
            "--output",
            output_dir.path().to_str().expect("utf8 path"),
        ])
        .assert()
        .success();

    let item: Value = serde_json::from_slice(
        &std::fs::read(output_dir.path().join("items/action-button.json"))
            .expect("generated component item"),
    )
    .expect("valid component item JSON");
    let expected: Value = serde_json::from_slice(
        &std::fs::read(repo_path(
            "sdk/plugins/shadcn/examples/action-button.registry-item.sample.json",
        ))
        .expect("registry item fixture"),
    )
    .expect("valid fixture JSON");
    assert_eq!(item, expected);

    let registry: Value = serde_json::from_slice(
        &std::fs::read(output_dir.path().join("registry.json")).expect("generated index"),
    )
    .expect("valid registry JSON");
    assert_eq!(registry["name"], "spectrum");
    assert_eq!(registry["items"].as_array().unwrap().len(), 1);
    assert_eq!(registry["items"][0], item);
}

#[test]
fn shadcn_registry_exports_all_components() {
    let output_dir = tempdir().expect("temporary output directory");
    let components_dir = repo_path("packages/design-data/components");

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "shadcn",
            "registry",
            "--components-dir",
            components_dir.to_str().expect("utf8 path"),
            "--output",
            output_dir.path().to_str().expect("utf8 path"),
        ])
        .assert()
        .success();

    let registry: Value = serde_json::from_slice(
        &std::fs::read(output_dir.path().join("registry.json")).expect("generated index"),
    )
    .expect("valid registry JSON");
    let items = registry["items"]
        .as_array()
        .expect("registry has an item array");
    assert_eq!(items.len(), 97);
    for item in items {
        assert_eq!(item["type"], "registry:component");
        assert!(item["meta"].is_object());
        let name = item["name"].as_str().expect("component name");
        assert!(output_dir
            .path()
            .join(format!("items/{name}.json"))
            .is_file());
    }
}
