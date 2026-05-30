// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Integration tests for the `design-data` binary (`assert_cmd`).

use std::path::PathBuf;

use assert_cmd::Command;
use predicates::str::contains;
use serde_json::json;

fn tokens_src_and_schemas() -> (PathBuf, PathBuf) {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let src = manifest.join("../../packages/tokens/src");
    let schemas = manifest.join("../../packages/tokens/schemas");
    assert!(src.is_dir(), "expected token sources at {}", src.display());
    assert!(
        schemas.join("token-types").is_dir(),
        "expected schemas at {}",
        schemas.display()
    );
    (src, schemas)
}

#[test]
fn validate_spectrum_tokens_json_success() {
    let (src, schemas) = tokens_src_and_schemas();

    // Pass an empty temp dir as --components-path so no component-binding rules
    // (SPEC-027, etc.) fire on this partial dataset.  The embedded snapshot would
    // otherwise auto-load components, causing SPEC-027 failures on `tokens/src`
    // because component schemas reference the full token corpus, not just `src/`.
    let empty_components = tempfile::tempdir().expect("temp dir for empty components");

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "validate",
            src.to_str().expect("utf8 path"),
            "--schema-path",
            schemas.to_str().expect("utf8 path"),
            "--components-path",
            empty_components.path().to_str().expect("utf8 path"),
            "--format",
            "json",
        ])
        .assert()
        .success()
        .stdout(contains("\"valid\": true"));
}

#[test]
fn validate_bad_token_file_fails() {
    let (_src, schemas) = tokens_src_and_schemas();

    let tmp = tempfile::Builder::new()
        .suffix(".json")
        .tempfile()
        .expect("tempfile");
    let body = json!({
        "bad-token": {
            "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
            "value": "not-a-color",
            "uuid": "00000000-0000-4000-8000-000000000001"
        }
    });
    std::fs::write(tmp.path(), body.to_string()).expect("write token file");

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "validate",
            tmp.path().to_str().expect("utf8 path"),
            "--schema-path",
            schemas.to_str().expect("utf8 path"),
            "--format",
            "json",
        ])
        .assert()
        .failure();
}

#[test]
fn write_creates_new_file() {
    let tmp = tempfile::Builder::new()
        .suffix(".json")
        .tempfile()
        .expect("tempfile");
    let path = tmp.path().to_path_buf();
    // tempfile creates the file; remove it so write creates it fresh.
    drop(tmp);

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args(["write", "--output", path.to_str().expect("utf8 path")])
        .assert()
        .success();

    let content = std::fs::read_to_string(&path).expect("read output");
    let doc: serde_json::Value = serde_json::from_str(&content).expect("valid json");
    assert_eq!(doc["specVersion"], "1.0.0-draft");
    assert_eq!(doc["layer"], "product");
    assert!(doc["createdBy"].is_object());
    assert!(doc["createdAt"].is_string());
    assert!(doc["rationale"].is_null(), "rationale should be absent");
}

#[test]
fn write_with_rationale() {
    let tmp = tempfile::Builder::new()
        .suffix(".json")
        .tempfile()
        .expect("tempfile");
    let path = tmp.path().to_path_buf();
    drop(tmp);

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "write",
            "--output",
            path.to_str().expect("utf8 path"),
            "--rationale",
            "Test run",
        ])
        .assert()
        .success();

    let content = std::fs::read_to_string(&path).expect("read output");
    let doc: serde_json::Value = serde_json::from_str(&content).expect("valid json");
    assert_eq!(doc["rationale"], "Test run");
}

#[test]
fn write_updates_existing_rationale() {
    let tmp = tempfile::Builder::new()
        .suffix(".json")
        .tempfile()
        .expect("tempfile");
    let path = tmp.path().to_path_buf();
    drop(tmp);

    // First write — establishes createdAt.
    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "write",
            "--output",
            path.to_str().expect("utf8 path"),
            "--rationale",
            "initial",
        ])
        .assert()
        .success();

    let first: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(&path).expect("read")).expect("json");
    let created_at = first["createdAt"].clone();

    // Second write — updates rationale only.
    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "write",
            "--output",
            path.to_str().expect("utf8 path"),
            "--rationale",
            "updated",
        ])
        .assert()
        .success();

    let second: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(&path).expect("read")).expect("json");
    assert_eq!(second["rationale"], "updated");
    assert_eq!(
        second["createdAt"], created_at,
        "createdAt must not change on update"
    );
}

#[test]
fn write_creates_parent_dirs() {
    let tmp_dir = tempfile::tempdir().expect("tempdir");
    let output = tmp_dir.path().join("nested").join("sub").join("pc.json");

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args(["write", "--output", output.to_str().expect("utf8 path")])
        .assert()
        .success();

    assert!(
        output.exists(),
        "output file should exist after creating parent dirs"
    );
    let content = std::fs::read_to_string(&output).expect("read output");
    let doc: serde_json::Value = serde_json::from_str(&content).expect("valid json");
    assert_eq!(doc["specVersion"], "1.0.0-draft");
}

fn primer_paths() -> (PathBuf, PathBuf, PathBuf, PathBuf) {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let src = manifest.join("../../packages/tokens/src");
    let components = manifest.join("../../packages/design-data-spec/components");
    let mode_sets = manifest.join("../../packages/design-data-spec/mode-sets");
    let fields = manifest.join("../../packages/design-data-spec/fields");
    assert!(src.is_dir(), "expected token sources at {}", src.display());
    assert!(
        components.is_dir(),
        "expected components at {}",
        components.display()
    );
    assert!(
        mode_sets.is_dir(),
        "expected mode sets at {}",
        mode_sets.display()
    );
    assert!(fields.is_dir(), "expected fields at {}", fields.display());
    (src, components, mode_sets, fields)
}

#[test]
fn primer_emits_json_with_required_fields() {
    let (src, components, mode_sets, fields) = primer_paths();

    let output = Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "primer",
            src.to_str().expect("utf8 path"),
            "--format",
            "json",
            "--components-dir",
            components.to_str().expect("utf8 path"),
            "--mode-sets-dir",
            mode_sets.to_str().expect("utf8 path"),
            "--fields-dir",
            fields.to_str().expect("utf8 path"),
        ])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();

    let doc: serde_json::Value =
        serde_json::from_slice(&output).expect("primer --format json must emit valid JSON");

    assert_eq!(doc["specVersion"], "1.0.0-draft");
    assert!(
        doc["tokenCount"].as_u64().unwrap_or(0) > 0,
        "tokenCount must be positive"
    );
    assert!(
        doc["modeSets"].as_array().map_or(false, |a| !a.is_empty()),
        "modeSets must be non-empty"
    );
    assert!(
        doc["components"]
            .as_array()
            .map_or(false, |a| !a.is_empty()),
        "components must be non-empty"
    );
    assert!(
        doc["taxonomyFields"]
            .as_array()
            .map_or(false, |a| !a.is_empty()),
        "taxonomyFields must be non-empty"
    );
}

#[test]
fn primer_components_are_sorted() {
    let (src, components, mode_sets, fields) = primer_paths();

    let output = Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "primer",
            src.to_str().expect("utf8 path"),
            "--format",
            "json",
            "--components-dir",
            components.to_str().expect("utf8 path"),
            "--mode-sets-dir",
            mode_sets.to_str().expect("utf8 path"),
            "--fields-dir",
            fields.to_str().expect("utf8 path"),
        ])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();

    let doc: serde_json::Value = serde_json::from_slice(&output).expect("valid json");
    let names: Vec<&str> = doc["components"]
        .as_array()
        .expect("components is an array")
        .iter()
        .filter_map(|v| v.as_str())
        .collect();

    assert!(!names.is_empty(), "components list must not be empty");
    for window in names.windows(2) {
        assert!(
            window[0] <= window[1],
            "components must be sorted: {:?} > {:?}",
            window[0],
            window[1]
        );
    }
}

#[test]
fn primer_pretty_output_contains_token_count() {
    let (src, components, mode_sets, fields) = primer_paths();

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "primer",
            src.to_str().expect("utf8 path"),
            "--components-dir",
            components.to_str().expect("utf8 path"),
            "--mode-sets-dir",
            mode_sets.to_str().expect("utf8 path"),
            "--fields-dir",
            fields.to_str().expect("utf8 path"),
        ])
        .assert()
        .success()
        .stdout(contains("Token count:"));
}

#[test]
fn primer_fails_on_nonexistent_path() {
    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args(["primer", "/nonexistent/path/that/does/not/exist"])
        .assert()
        .failure();
}

fn component_dir() -> PathBuf {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let dir = manifest.join("../../packages/design-data-spec/components");
    assert!(dir.is_dir(), "expected components at {}", dir.display());
    dir
}

#[test]
fn component_button_returns_json() {
    let dir = component_dir();

    let output = Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "component",
            "button",
            "--components-dir",
            dir.to_str().expect("utf8 path"),
        ])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();

    let doc: serde_json::Value =
        serde_json::from_slice(&output).expect("component output must be valid JSON");

    assert_eq!(doc["name"], "button");
    assert!(
        doc["tokenBindings"].is_array(),
        "tokenBindings must be present"
    );
    assert!(doc["anatomy"].is_array(), "anatomy must be present");
}

#[test]
fn component_nonexistent_fails() {
    let dir = component_dir();

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "component",
            "nonexistent-xyz",
            "--components-dir",
            dir.to_str().expect("utf8 path"),
        ])
        .assert()
        .failure();
}

#[test]
fn component_path_traversal_rejected() {
    let dir = component_dir();

    for bad_id in &[
        "../button",
        "/etc/passwd",
        "button.json",
        "Button",
        "button/x",
    ] {
        Command::cargo_bin("design-data")
            .expect("binary design-data")
            .args([
                "component",
                bad_id,
                "--components-dir",
                dir.to_str().expect("utf8 path"),
            ])
            .assert()
            .failure();
    }
}
