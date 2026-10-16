// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Integration tests for `resolve --format dtcg` (bead `spectrum-design-data-u1zx`)
//! against real repo data.

use std::path::PathBuf;

use assert_cmd::Command;

/// Real `packages/design-data/tokens` dir in this checkout.
fn tokens_dir() -> PathBuf {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let dir = manifest.join("../../packages/design-data/tokens");
    assert!(dir.is_dir(), "expected tokens at {}", dir.display());
    dir
}

#[test]
fn resolve_color_format_dtcg_emits_value_and_type() {
    let output = Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "resolve",
            "color",
            tokens_dir().to_str().expect("utf8 path"),
            "--color-scheme",
            "light",
            "--format",
            "dtcg",
        ])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();

    let doc: serde_json::Value = serde_json::from_slice(&output).expect("valid JSON");
    let obj = doc.as_object().expect("document is a JSON object");
    assert_eq!(obj.len(), 1, "expected exactly one top-level token");
    let (_key, token) = obj.iter().next().expect("one token");

    let value = token
        .get("$value")
        .and_then(|v| v.as_str())
        .expect("$value present and a string");
    assert!(
        value.starts_with('#'),
        "expected a hex color string, got {value}"
    );
    assert_eq!(token["$type"], "color");
}

#[test]
fn resolve_typography_format_dtcg_emits_composite_with_resolved_dimensions() {
    let output = Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "resolve",
            "typography",
            tokens_dir().to_str().expect("utf8 path"),
            "--format",
            "dtcg",
        ])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();

    let doc: serde_json::Value = serde_json::from_slice(&output).expect("valid JSON");
    let obj = doc.as_object().expect("document is a JSON object");
    let (_key, token) = obj.iter().next().expect("one token");

    assert_eq!(token["$type"], "typography");
    let value = token["$value"].as_object().expect("$value is an object");
    // fontSize must have been resolved from its inline `{font-size-...}` alias into a
    // DTCG dimension object, not left as a raw alias string.
    let font_size = value.get("fontSize").expect("fontSize sub-value present");
    assert!(font_size.get("value").is_some(), "fontSize has a value");
    assert!(font_size.get("unit").is_some(), "fontSize has a unit");
}

#[test]
fn resolve_format_dtcg_output_is_valid_json_pretty_printed() {
    // `pretty`/`json` remain byte-identical to their pre-existing behavior; `dtcg` is
    // purely additive. Smoke-test that the flag is accepted and produces parseable JSON
    // distinct from `--format json`'s raw cascade record shape (no `uuid`/`$schema` at
    // the top level of the dtcg document).
    let output = Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "resolve",
            "opacity",
            tokens_dir().to_str().expect("utf8 path"),
            "--format",
            "dtcg",
        ])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();

    let doc: serde_json::Value = serde_json::from_slice(&output).expect("valid JSON");
    let (_key, token) = doc
        .as_object()
        .expect("object")
        .iter()
        .next()
        .expect("one token");
    assert!(token.get("uuid").is_none(), "dtcg document omits raw uuid");
    assert!(
        token.get("$schema").is_none(),
        "dtcg document omits raw $schema"
    );
    assert_eq!(token["$type"], "number");
    assert!(token["$value"].is_number());
}
