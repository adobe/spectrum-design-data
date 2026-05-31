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
//! `.design-data.toml`'s `[source].manifest` field (epic #1047 Phase 2, #1053).

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
            "[source]\ntype = \"path\"\nroot = \"{}\"\nmanifest = \"manifest.json\"\n",
            repo_root().display()
        ),
    )
    .expect("write config");

    project
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
