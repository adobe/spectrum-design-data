// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Integration tests for the Foundation→Platform manifest cascade wired through
//! `.design-data.toml`'s top-level `manifest` key (epic #1047 Phase 2, #1053).

use std::fs;
use std::path::PathBuf;

use assert_cmd::Command;
use predicates::str::contains;
use serde_json::json;

/// Absolute path to the repo root (so the resolver can locate the spec schemas).
fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .expect("repo root canonicalizes")
}

/// Create a temp project with a tokens dir, a platform manifest, and a
/// `.design-data.toml` whose `[source]` points at the repo root with the manifest.
fn setup_project(manifest: serde_json::Value) -> tempfile::TempDir {
    let project = tempfile::tempdir().expect("temp project dir");
    let tokens_dir = project.path().join("tokens");
    fs::create_dir_all(&tokens_dir).expect("create tokens dir");

    fs::write(
        tokens_dir.join("tokens.json"),
        json!({
            "btn-bg": {"name": {"property": "background-color", "component": "button"}, "value": "#aaa", "uuid": "u-btn-bg"},
            "btn-fg": {"name": {"property": "color", "component": "button"}, "value": "#111", "uuid": "u-btn-fg"},
            "chk-bg": {"name": {"property": "background-color", "component": "checkbox"}, "value": "#bbb", "uuid": "u-chk-bg"}
        })
        .to_string(),
    )
    .expect("write tokens");

    fs::write(
        project.path().join("manifest.json"),
        serde_json::to_string_pretty(&manifest).expect("serialize manifest"),
    )
    .expect("write manifest");

    fs::write(
        project.path().join(".design-data.toml"),
        format!(
            "manifest = \"manifest.json\"\n[source]\ntype = \"path\"\nroot = \"{}\"\n",
            repo_root().display()
        ),
    )
    .expect("write config");

    project
}

/// Like [`setup_project`], but the `.design-data.toml` has no top-level `manifest`
/// key — `manifest.json` is still written to the project root so a test can pass it
/// explicitly via `--manifest`.
fn setup_project_without_manifest_key(manifest: serde_json::Value) -> tempfile::TempDir {
    let project = setup_project(manifest);
    fs::write(
        project.path().join(".design-data.toml"),
        format!(
            "[source]\ntype = \"path\"\nroot = \"{}\"\n",
            repo_root().display()
        ),
    )
    .expect("rewrite config without manifest key");
    project
}

#[test]
fn validate_manifest_accepts_valid_manifest() {
    let project = setup_project(json!({
        "specVersion": "1.0.0-draft",
        "foundationVersion": "1.0.0",
        "include": ["component=button"]
    }));

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["validate-manifest", "tokens"])
        .assert()
        .success()
        .stdout(contains("valid"));
}

#[test]
fn validate_manifest_rejects_schema_violation() {
    // Missing required `foundationVersion` → Layer 1 schema validation fails.
    let project = setup_project(json!({
        "specVersion": "1.0.0-draft",
        "include": ["component=button"]
    }));

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["validate-manifest", "tokens"])
        .assert()
        .code(1);
}

#[test]
fn validate_manifest_rejects_unparseable_query() {
    let project = setup_project(json!({
        "specVersion": "1.0.0-draft",
        "foundationVersion": "1.0.0",
        "include": ["not-a-valid-query"]
    }));

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["validate-manifest", "tokens"])
        .assert()
        .code(1);
}

#[test]
fn validate_manifest_errors_when_none_configured() {
    let project = setup_project_without_manifest_key(json!({
        "specVersion": "1.0.0-draft",
        "foundationVersion": "1.0.0",
        "include": ["component=button"]
    }));

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["validate-manifest", "tokens"])
        .assert()
        .code(2)
        .stderr(contains("no platform manifest"));
}

#[test]
fn validate_manifest_honors_explicit_flag() {
    let project = setup_project_without_manifest_key(json!({
        "specVersion": "1.0.0-draft",
        "foundationVersion": "1.0.0",
        "include": ["component=button"]
    }));

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["validate-manifest", "tokens", "--manifest", "manifest.json"])
        .assert()
        .success()
        .stdout(contains("valid"));
}

#[test]
fn query_applies_manifest_include_filter() {
    let project = setup_project(json!({
        "specVersion": "1.0.0-draft",
        "foundationVersion": "1.0.0",
        "include": ["component=button"]
    }));

    // Empty filter matches everything that survives the manifest cascade.
    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["query", "tokens", "--filter", "", "--count"])
        .assert()
        .success()
        // 3 foundation tokens → 2 after include=component=button.
        .stdout(predicates::str::starts_with("2"));
}

#[test]
fn query_rejects_manifest_with_unparseable_query() {
    let project = setup_project(json!({
        "specVersion": "1.0.0-draft",
        "foundationVersion": "1.0.0",
        "include": ["not-a-valid-query"]
    }));

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["query", "tokens", "--filter", "", "--count"])
        .assert()
        .failure();
}

#[test]
fn query_rejects_manifest_failing_schema_validation() {
    // Missing required `foundationVersion` → Layer 1 schema validation fails.
    let project = setup_project(json!({
        "specVersion": "1.0.0-draft",
        "include": ["component=button"]
    }));

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["query", "tokens", "--filter", "", "--count"])
        .assert()
        .failure();
}

#[test]
fn migrate_legacy_output_cascaded_prefers_override_over_shadowed_foundation() {
    // Regression for spectrum-design-data-h890.10: `apply_platform_manifest`
    // inserts an override as a NEW Platform-layer TokenRecord under a
    // synthetic key, leaving the original Foundation-layer record (same
    // uuid) in place. `migrate legacy-output-cascaded` must emit only the
    // override's value, deterministically — not whichever copy `HashMap`
    // iteration visits last.
    let project = setup_project(json!({
        "specVersion": "1.0.0-draft",
        "foundationVersion": "1.0.0",
        "overrides": [{"target": "u-btn-bg", "value": "#ffffff"}]
    }));
    let output = project.path().join("legacy.json");

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["migrate", "legacy-output-cascaded", "tokens", "--output"])
        .arg(&output)
        .assert()
        .success();

    let legacy: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(&output).expect("read output"))
            .expect("parse output");
    assert_eq!(legacy["button-background-color"]["value"], "#ffffff");
}

#[test]
fn resolve_applies_manifest_override_by_uuid() {
    let project = setup_project(json!({
        "specVersion": "1.0.0-draft",
        "foundationVersion": "1.0.0",
        "overrides": [{"target": "u-btn-bg", "value": "#ffffff"}]
    }));

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["resolve", "background-color", "tokens", "--format", "json"])
        .assert()
        .success()
        .stdout(contains("#ffffff"));
}
