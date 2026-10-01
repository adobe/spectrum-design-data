// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Integration tests for `design-data figma export` (`assert_cmd`).

use assert_cmd::Command;
use predicates::str::contains;

#[test]
fn audit_reports_unsupported_units_in_json_and_pretty_output() {
    let dir = tempfile::tempdir().unwrap();
    let snapshot = dir.path().join("snapshot.json");
    let token_dir = dir.path().join("tokens");
    std::fs::create_dir(&token_dir).unwrap();
    std::fs::write(
        token_dir.join("layout.json"),
        serde_json::to_vec(&serde_json::json!({
            "android-elevation": {
                "$schema": "https://example.com/dimension.json",
                "value": "2dp",
            },
            "strikethrough-day-orientation": {
                "$schema": "https://example.com/angle.json",
                "value": -25,
            },
            "bold-font-weight": {
                "$schema": "https://example.com/font-weight.json",
                "value": "bold",
            },
        }))
        .unwrap(),
    )
    .unwrap();
    std::fs::write(
        &snapshot,
        serde_json::to_vec(&serde_json::json!({
            "variables": {},
            "variableCollections": {
                "color": {
                    "id": "color", "name": ".Color theme", "key": "color",
                    "modes": [{ "modeId": "light", "name": "Light" }],
                    "defaultModeId": "light",
                },
                "scale": {
                    "id": "scale", "name": ".Platform scale", "key": "scale",
                    "modes": [{ "modeId": "desktop", "name": "Desktop" }],
                    "defaultModeId": "desktop",
                },
            },
        }))
        .unwrap(),
    )
    .unwrap();

    let output = Command::cargo_bin("design-data")
        .unwrap()
        .args(["figma", "audit", "--snapshot"])
        .arg(&snapshot)
        .arg("--token-dir")
        .arg(&token_dir)
        .args(["--format", "json"])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();
    let report: serde_json::Value = serde_json::from_slice(&output).unwrap();
    assert_eq!(
        report["skipped_unsupported_unit"],
        serde_json::json!(["android-elevation"])
    );
    assert_eq!(report["skipped_unparseable_value"], serde_json::json!([]));
    assert_eq!(report["skipped_unknown_schema"], serde_json::json!([]));
    let scale = report["collections"]
        .as_array()
        .unwrap()
        .iter()
        .find(|c| c["collection_name"] == ".Platform scale")
        .unwrap();
    assert_eq!(
        scale["generated_only"],
        serde_json::json!([
            "platformScale/bold-font-weight",
            "platformScale/strikethrough-day-orientation",
        ])
    );

    Command::cargo_bin("design-data")
        .unwrap()
        .args(["figma", "audit", "--snapshot"])
        .arg(&snapshot)
        .arg("--token-dir")
        .arg(&token_dir)
        .args(["--format", "pretty"])
        .assert()
        .success()
        .stdout(contains("unparseable=0 unsupported_unit=1"));
}

/// Regression for a bug found reviewing PR #1479: `--code-syntax-manifest WEB=...`
/// used to silently overwrite the authoritative `--spectrum-{legacyKey}` `WEB`
/// codeSyntax entry with a lossy `formatting`-derived reconstruction. This must be
/// rejected before any network call, so a bogus path/token/manifest still exercises
/// the check deterministically.
#[test]
fn code_syntax_manifest_rejects_web_platform() {
    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "figma",
            "export",
            "does-not-matter",
            "--file-key",
            "does-not-matter",
            "--token",
            "does-not-matter",
            "--code-syntax-manifest",
            "WEB=does-not-matter.json",
            "--dry-run",
        ])
        .assert()
        .failure()
        .stderr(contains("WEB is not supported"));
}
