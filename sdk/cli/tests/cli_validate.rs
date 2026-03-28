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

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "validate",
            src.to_str().expect("utf8 path"),
            "--schema-path",
            schemas.to_str().expect("utf8 path"),
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
