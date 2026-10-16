// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Integration tests for bulk/dataset DTCG export — `export --format dtcg` and
//! `query --format dtcg` (bead `spectrum-design-data-cqx1`) — against real repo data.

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
fn export_format_dtcg_emits_one_flat_document_for_the_whole_dataset() {
    let output = Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "export",
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
    // Distinct token *identities* (not just distinct property names) should survive —
    // regression guard for collapsing state/variant siblings into one arbitrary winner.
    assert!(
        obj.len() > 1000,
        "expected close to the full ~2374-token dataset (minus mode-variant siblings \
         collapsed per context), got only {} entries",
        obj.len()
    );

    // Every entry is a flat DTCG token with $value/$type, not a raw cascade record.
    let (_key, token) = obj.iter().next().expect("at least one token");
    assert!(token.get("$value").is_some(), "$value present");
    assert!(token.get("uuid").is_none(), "dtcg document omits raw uuid");
}

#[test]
fn query_format_dtcg_preserves_distinct_state_variants_sharing_a_property() {
    // `background-color` has multiple tokens sharing that property, differing only by
    // interaction `state` (default/hover/down/key-focus) — none of them mode-set fields.
    // Regression guard: these must NOT collapse into a single arbitrary winner.
    let output = Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "query",
            tokens_dir().to_str().expect("utf8 path"),
            "--filter",
            "property=background-color",
            "--format",
            "dtcg",
            "--color-scheme",
            "light",
        ])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();

    let doc: serde_json::Value = serde_json::from_slice(&output).expect("valid JSON");
    let obj = doc.as_object().expect("document is a JSON object");
    assert!(
        obj.len() > 1,
        "expected multiple distinct background-color tokens (by state/variant), got {obj:?}"
    );

    let has_suffix = |suffix: &str| obj.keys().any(|k| k.ends_with(suffix));
    assert!(has_suffix("-default"), "expected a -default state token");
    assert!(has_suffix("-hover"), "expected a -hover state token");
}

#[test]
fn query_format_dtcg_is_mode_aware() {
    let run = |color_scheme: &str| {
        let output = Command::cargo_bin("design-data")
            .expect("binary design-data")
            .args([
                "query",
                tokens_dir().to_str().expect("utf8 path"),
                "--filter",
                "property=color",
                "--format",
                "dtcg",
                "--color-scheme",
                color_scheme,
            ])
            .assert()
            .success()
            .get_output()
            .stdout
            .clone();
        serde_json::from_slice::<serde_json::Value>(&output).expect("valid JSON")
    };

    let light = run("light");
    let dark = run("dark");
    assert_ne!(
        light, dark,
        "expected color resolution to differ between light and dark mode contexts"
    );
}
