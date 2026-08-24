// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Regression tests for spectrum-design-data-h890.19 and h890.20: `query`, `resolve`,
//! `migrate legacy-output-cascaded`, `validate`, and `dump-legacy-keys` must load
//! tokens from `resolved.tokens_root` (i.e. respect a `.design-data.toml` `[source]`
//! block) when no positional PATH is given — not always fall back to the raw `.` CWD.
//!
//! Unlike `cli_manifest.rs`'s `setup_project`, these tests pass **no** positional
//! path, which is exactly the case the bug affected.

use std::fs;
use std::path::PathBuf;

use assert_cmd::Command;
use serde_json::json;

/// Real `packages/tokens/schemas` dir in this checkout, for `--schema-path` —
/// the fixture source in [`setup_source_project`] has no schemas of its own.
fn real_schemas_dir() -> PathBuf {
    let schemas = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/tokens/schemas");
    assert!(
        schemas.join("token-types").is_dir(),
        "expected schemas at {}",
        schemas.display()
    );
    schemas
}

/// Create a standalone dataset root (`packages/design-data/tokens/tokens.json`)
/// and a project dir whose `.design-data.toml` points a `[source]` `path` at it.
/// Returns `(source_dir, project_dir)`; both must stay alive for the test.
fn setup_source_project() -> (tempfile::TempDir, tempfile::TempDir) {
    let source = tempfile::tempdir().expect("temp source dir");
    let tokens_dir = source.path().join("packages/design-data/tokens");
    fs::create_dir_all(&tokens_dir).expect("create tokens dir");
    fs::write(
        tokens_dir.join("tokens.json"),
        json!({
            "btn-bg": {"name": {"property": "background-color", "component": "button"}, "value": "#aaa", "uuid": "u-btn-bg"},
            "btn-fg": {"name": {"property": "color", "component": "button"}, "value": "#111", "uuid": "u-btn-fg"},
            "chk-bg": {"name": {"property": "background-color", "component": "checkbox"}, "value": "#bbb", "uuid": "u-chk-bg"},
        })
        .to_string(),
    )
    .expect("write tokens.json");

    let project = tempfile::tempdir().expect("temp project dir");
    let source_root = source.path().canonicalize().expect("canonicalize source");
    fs::write(
        project.path().join(".design-data.toml"),
        format!(
            "[source]\ntype = \"path\"\nroot = \"{}\"\n",
            source_root.display().to_string().replace('\\', "\\\\")
        ),
    )
    .expect("write .design-data.toml");

    (source, project)
}

#[test]
fn query_with_no_path_arg_loads_configured_source() {
    let (_source, project) = setup_source_project();

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["query", "--filter", "", "--count"])
        .assert()
        .success()
        .stdout(predicates::str::starts_with("3"));
}

#[test]
fn resolve_with_no_path_arg_loads_configured_source() {
    let (_source, project) = setup_source_project();

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["resolve", "color", "--format", "json"])
        .assert()
        .success()
        .stdout(predicates::str::contains("u-btn-fg"));
}

#[test]
fn migrate_legacy_output_cascaded_with_no_path_arg_loads_configured_source() {
    let (_source, project) = setup_source_project();
    let output = project.path().join("legacy.json");

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["migrate", "legacy-output-cascaded", "--output"])
        .arg(&output)
        .assert()
        .success();

    let legacy: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(&output).expect("read output"))
            .expect("parse output");
    assert!(legacy.get("button-background-color").is_some());
}

#[test]
fn validate_with_no_path_arg_loads_configured_source() {
    let (source, project) = setup_source_project();
    let schemas = real_schemas_dir();
    let source_root = source.path().canonicalize().expect("canonicalize source");

    // The fixture tokens don't pass real schema validation (no `$schema`, made-up
    // shape) — that's not what's under test here. What matters is that the
    // dataset loaded from the configured `[source]` at all: the report's `file`
    // fields point at the source dir's `tokens.json`, not the empty project dir.
    let output = Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args([
            "validate",
            "--format",
            "json",
            "--schema-path",
            schemas.to_str().expect("utf8 path"),
        ])
        .output()
        .expect("run design-data validate");

    let stdout = String::from_utf8_lossy(&output.stdout);
    let expected_file = source_root.join("packages/design-data/tokens/tokens.json");
    assert!(
        stdout.contains(expected_file.to_str().expect("utf8 path")),
        "expected report to reference source's tokens.json ({}), got: {stdout}\nstderr: {}",
        expected_file.display(),
        String::from_utf8_lossy(&output.stderr)
    );
}

#[test]
fn dump_legacy_keys_with_no_path_arg_loads_configured_source() {
    let (_source, project) = setup_source_project();

    let output = Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["dump-legacy-keys"])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();

    let keys: serde_json::Value = serde_json::from_slice(&output).expect("parse output");
    let keys = keys.as_array().expect("array of legacy keys");
    assert_eq!(
        keys.len(),
        3,
        "expected one entry per source token: {keys:?}"
    );
}
