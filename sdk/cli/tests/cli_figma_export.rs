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
