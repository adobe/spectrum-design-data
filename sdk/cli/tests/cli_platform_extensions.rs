// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `validate-manifest` and `platform doctor` check a platform's extension relationships,
//! implementations and componentAliases (GH #1878): MANIFEST-003 to MANIFEST-006.

use std::fs;
use std::path::{Path, PathBuf};

use assert_cmd::assert::Assert;
use assert_cmd::Command;
use predicates::str::contains;
use serde_json::{json, Value};

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .expect("repo root canonicalizes")
}

/// A foundation relationship on `action-button` (`Height`).
const FOUNDATION_UUID: &str = "072d31fc-09bd-5653-9fb9-a7441f287709";

fn project(manifest_extra: Value, files: &[(&str, Value)]) -> tempfile::TempDir {
    let dir = tempfile::tempdir().expect("temp project dir");
    let mut manifest = json!({"specVersion": "1.0.0-draft", "foundationVersion": "1.0.0",
        "platform": "fixture"});
    manifest
        .as_object_mut()
        .unwrap()
        .extend(manifest_extra.as_object().unwrap().clone());
    fs::write(dir.path().join("manifest.json"), manifest.to_string()).unwrap();
    fs::write(
        dir.path().join(".design-data.toml"),
        format!(
            "manifest = \"manifest.json\"\n[source]\ntype = \"path\"\nroot = \"{}\"\n",
            repo_root().display()
        ),
    )
    .unwrap();
    for (rel, body) in files {
        let path = dir.path().join(rel);
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(path, body.to_string()).unwrap();
    }
    dir
}

fn run(dir: &Path, args: &[&str]) -> Assert {
    Command::cargo_bin("design-data")
        .unwrap()
        .current_dir(dir)
        .args(args)
        .assert()
}

fn relationship(component: &str, size: &str, uuid: &str) -> Value {
    json!({"uuid": uuid, "scope": {"component": component, "property": "component-height-50",
            "options": {"size": size}},
        "context": "Height", "contextRole": ["height"], "$ref": "053e6718-fedb-4944-8e17-ea49f263dd25"})
}

const NEW: &str = "11111111-1111-4111-8111-111111111111";

fn with_relationship(entry: Value) -> tempfile::TempDir {
    project(json!({}), &[("extensions/relationships/r.json", entry)])
}

fn fails(dir: &Path, id: &str) {
    run(dir, &["validate-manifest"])
        .code(1)
        .stderr(contains(id));
}

#[test]
fn valid_extensions_pass() {
    let dir = project(
        json!({}),
        &[
            (
                "extensions/relationships/r.json",
                relationship("action-button", "m", NEW),
            ),
            (
                "extensions/implementations/action-button.json",
                json!({"component": "action-button", "implementations": [
                    {"platform": "web", "componentName": "Button", "package": "@x/y"}]}),
            ),
        ],
    );
    run(dir.path(), &["validate-manifest"])
        .success()
        .stdout(contains("is valid"));
    run(dir.path(), &["platform", "doctor"]).stdout(contains("ok   extensions"));
}

#[test]
fn manifest_003_relationship_that_does_not_resolve() {
    for bad in [
        relationship("no-such-component", "m", NEW),
        relationship("action-button", "no-such-size", NEW),
    ] {
        let dir = with_relationship(bad);
        fails(dir.path(), "MANIFEST-003 (validate-manifest)");
        run(dir.path(), &["platform", "doctor"])
            .code(1)
            .stdout(contains("FAIL extensions"));
    }
}

#[test]
fn manifest_003_applies_to_an_override_of_a_foundation_relationship() {
    let dir = with_relationship(json!({"op": "override", "uuid": FOUNDATION_UUID,
        "value": relationship("action-button", "no-such-size", FOUNDATION_UUID)}));
    fails(dir.path(), "MANIFEST-003");
}

#[test]
fn manifest_004_override_or_remove_that_targets_nothing() {
    for op in ["override", "remove"] {
        let mut entry = json!({"op": op, "uuid": "00000000-0000-4000-8000-00000000dead"});
        if op == "override" {
            entry["value"] = relationship("action-button", "m", NEW);
        }
        fails(with_relationship(entry).path(), "MANIFEST-004");
    }
}

#[test]
fn manifest_005_implementation_that_names_nothing() {
    let dir = project(
        json!({}),
        &[(
            "extensions/implementations/ghost.json",
            json!({"component": "ghost", "implementations": [
                {"platform": "web", "componentName": "G", "package": "@x/y"}]}),
        )],
    );
    fails(dir.path(), "MANIFEST-005");
    let dir = project(
        json!({}),
        &[(
            "extensions/implementations/action-button.json",
            json!({"component": "action-button", "implementations": [
                {"op": "remove", "componentName": "NoSuchRow", "package": "@none/none"}]}),
        )],
    );
    fails(dir.path(), "MANIFEST-005");
}

#[test]
fn manifest_006_alias_target_that_is_missing_or_deprecated() {
    let dir = project(json!({"componentAliases": {"action-button": "ghost"}}), &[]);
    fails(dir.path(), "MANIFEST-006");
    run(dir.path(), &["platform", "doctor"])
        .code(1)
        .stdout(contains("FAIL extensions"));
    let dir = project(
        json!({"componentAliases": {"action-button": "action-button-old"}}),
        &[(
            "extensions/components/action-button-old.json",
            json!({"$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/v0/component.schema.json",
                "$id": "https://opensource.adobe.com/spectrum-design-data/schemas/v0/components/action-button-old.json",
                "name": "action-button-old", "displayName": "Old",
                "meta": {"category": "actions", "documentationUrl": "https://example.com/old"},
                "lifecycle": {"deprecatedIn": "1.0.0"}}),
        )],
    );
    fails(dir.path(), "deprecated");
}
