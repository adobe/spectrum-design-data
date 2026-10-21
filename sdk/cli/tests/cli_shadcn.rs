// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use std::path::PathBuf;

use assert_cmd::Command;
use serde_json::Value;
use tempfile::tempdir;

fn repo_path(relative: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .join(relative)
}

#[test]
fn export_shadcn_theme_emits_both_color_schemes() {
    let output = Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "export",
            repo_path("packages/design-data/tokens")
                .to_str()
                .expect("utf8 path"),
            "--format",
            "shadcn-theme",
            "--mode-sets-path",
            repo_path("packages/design-data/mode-sets")
                .to_str()
                .expect("utf8 path"),
        ])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();

    let doc: Value = serde_json::from_slice(&output).expect("valid JSON");
    assert_eq!(doc["type"], "registry:theme");
    assert!(doc["cssVars"]["light"]
        .as_object()
        .is_some_and(|vars| !vars.is_empty()));
    assert!(doc["cssVars"]["dark"]
        .as_object()
        .is_some_and(|vars| !vars.is_empty()));
}

#[test]
fn shadcn_registry_writes_component_item_and_index() {
    let output_dir = tempdir().expect("temporary output directory");
    let components_dir = repo_path("packages/design-data/components");

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "shadcn",
            "registry",
            "--component",
            "action-button",
            "--components-dir",
            components_dir.to_str().expect("utf8 path"),
            "--output",
            output_dir.path().to_str().expect("utf8 path"),
        ])
        .assert()
        .success();

    let item: Value = serde_json::from_slice(
        &std::fs::read(output_dir.path().join("items/action-button.json"))
            .expect("generated component item"),
    )
    .expect("valid component item JSON");
    let expected: Value = serde_json::from_slice(
        &std::fs::read(repo_path(
            "sdk/plugins/shadcn/examples/action-button.registry-item.sample.json",
        ))
        .expect("registry item fixture"),
    )
    .expect("valid fixture JSON");
    assert_eq!(item, expected);

    let registry: Value = serde_json::from_slice(
        &std::fs::read(output_dir.path().join("registry.json")).expect("generated index"),
    )
    .expect("valid registry JSON");
    assert_eq!(registry["name"], "spectrum");
    assert_eq!(registry["items"].as_array().unwrap().len(), 1);
    assert_eq!(registry["items"][0], item);
}

#[test]
fn shadcn_registry_applies_selected_platform_manifest() {
    let output_dir = tempdir().expect("temporary output directory");

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(repo_path(""))
        .args([
            "shadcn",
            "registry",
            "--platform",
            "react-spectrum",
            "--component",
            "action-button",
            "--output",
            output_dir.path().to_str().expect("utf8 path"),
        ])
        .assert()
        .success();

    let item: Value = serde_json::from_slice(
        &std::fs::read(output_dir.path().join("items/action-button.json"))
            .expect("generated component item"),
    )
    .expect("valid component item JSON");
    let implementations = item["meta"]["implementations"]
        .as_array()
        .expect("implementations");
    assert!(
        implementations
            .iter()
            .any(|row| row["implementation"] == "react-spectrum"),
        "platform-owned mapping missing: {implementations:?}"
    );
}

#[test]
fn shadcn_registry_exports_all_components() {
    let output_dir = tempdir().expect("temporary output directory");
    let components_dir = repo_path("packages/design-data/components");

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "shadcn",
            "registry",
            "--components-dir",
            components_dir.to_str().expect("utf8 path"),
            "--output",
            output_dir.path().to_str().expect("utf8 path"),
        ])
        .assert()
        .success();

    let registry: Value = serde_json::from_slice(
        &std::fs::read(output_dir.path().join("registry.json")).expect("generated index"),
    )
    .expect("valid registry JSON");
    let items = registry["items"]
        .as_array()
        .expect("registry has an item array");
    let mut expected: Vec<String> = std::fs::read_dir(&components_dir)
        .expect("components dir")
        .filter_map(|e| {
            let p = e.ok()?.path();
            (p.extension()? == "json").then(|| p.file_stem()?.to_str().map(String::from))?
        })
        .collect();
    expected.sort();
    let actual: Vec<String> = items
        .iter()
        .map(|i| i["name"].as_str().expect("name").to_string())
        .collect();
    assert_eq!(actual, expected);
    for item in items {
        assert_eq!(item["type"], "registry:component");
        assert!(item["meta"].is_object());
        let name = item["name"].as_str().expect("component name");
        assert!(output_dir
            .path()
            .join(format!("items/{name}.json"))
            .is_file());
    }
}

fn shadcn_registry(
    components_dir: &std::path::Path,
    output: &std::path::Path,
    extra: &[&str],
) -> Command {
    let mut cmd = Command::cargo_bin("design-data").expect("binary design-data");
    cmd.args([
        "shadcn",
        "registry",
        "--components-dir",
        components_dir.to_str().expect("utf8 path"),
        "--output",
        output.to_str().expect("utf8 path"),
    ]);
    cmd.args(extra);
    cmd
}

fn assert_registry_failure(mut cmd: Command, message: &str) {
    let assert = cmd.assert().failure();
    let code = assert.get_output().status.code();
    assert_ne!(code, Some(0));
    // miette wraps long messages at the terminal width, so rejoin wrapped lines.
    let stderr = String::from_utf8_lossy(&assert.get_output().stderr)
        .replace('│', " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    assert!(
        stderr.contains(message),
        "expected {message:?} in stderr: {stderr}"
    );
}

#[test]
fn shadcn_registry_rejects_invalid_component_id() {
    let components = tempdir().expect("components dir");
    let output = tempdir().expect("output dir");
    assert_registry_failure(
        shadcn_registry(
            components.path(),
            output.path(),
            &["--component", "Bad_Name"],
        ),
        "invalid component id 'Bad_Name'",
    );
}

#[test]
fn shadcn_registry_reports_missing_component() {
    let components = tempdir().expect("components dir");
    let output = tempdir().expect("output dir");
    assert_registry_failure(
        shadcn_registry(
            components.path(),
            output.path(),
            &["--component", "missing"],
        ),
        "reading component",
    );
}

#[test]
fn shadcn_registry_reports_malformed_json() {
    let components = tempdir().expect("components dir");
    let output = tempdir().expect("output dir");
    std::fs::write(components.path().join("broken.json"), "{ not json").expect("fixture");
    assert_registry_failure(
        shadcn_registry(components.path(), output.path(), &["--component", "broken"]),
        "parsing component",
    );
}

#[test]
fn shadcn_registry_rejects_filename_name_mismatch() {
    let components = tempdir().expect("components dir");
    let output = tempdir().expect("output dir");
    std::fs::write(
        components.path().join("alpha.json"),
        r#"{"name":"beta","displayName":"Beta","meta":{"category":"actions","documentationUrl":"https://example.com"}}"#,
    )
    .expect("fixture");
    assert_registry_failure(
        shadcn_registry(components.path(), output.path(), &["--component", "alpha"]),
        "declares name 'beta', expected 'alpha'",
    );
    assert_registry_failure(
        shadcn_registry(components.path(), output.path(), &[]),
        "does not match declared name 'beta'",
    );
}

#[test]
fn shadcn_registry_reports_write_failure() {
    let components = tempdir().expect("components dir");
    std::fs::write(
        components.path().join("alpha.json"),
        r#"{"name":"alpha","displayName":"Alpha","meta":{"category":"actions","documentationUrl":"https://example.com"}}"#,
    )
    .expect("fixture");
    let scratch = tempdir().expect("scratch dir");
    let blocker = scratch.path().join("not-a-directory");
    std::fs::write(&blocker, "file").expect("blocker file");
    assert_registry_failure(
        shadcn_registry(components.path(), &blocker, &[]),
        "creating",
    );
}

#[test]
fn export_shadcn_theme_resolves_light_and_dark_values() {
    let output = Command::cargo_bin("design-data")
        .expect("binary design-data")
        .args([
            "export",
            repo_path("packages/design-data/tokens")
                .to_str()
                .expect("utf8 path"),
            "--format",
            "shadcn-theme",
            "--mode-sets-path",
            repo_path("packages/design-data/mode-sets")
                .to_str()
                .expect("utf8 path"),
        ])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();
    let doc: Value = serde_json::from_slice(&output).expect("valid JSON");
    let light = doc["cssVars"]["light"].as_object().expect("light vars");
    let dark = doc["cssVars"]["dark"].as_object().expect("dark vars");

    // Values match `export --format dtcg --color-scheme light|dark`.
    for (key, light_value, dark_value) in [
        ("spectrum-gray-50", "#f8f8f8", "#1b1b1b"),
        ("spectrum-background-base-color", "#ffffff", "#111111"),
        (
            "spectrum-accent-background-color-default",
            "#3b63fb",
            "#4069fd",
        ),
    ] {
        assert_eq!(light[key], light_value, "light {key}");
        assert_eq!(dark[key], dark_value, "dark {key}");
    }
    // Scheme-independent non-color values live in `theme` (not light/dark), so shadcn
    // doesn't mirror them into `@theme inline` as self-referencing `var()` entries.
    let theme = doc["cssVars"]["theme"].as_object().expect("theme vars");
    assert_eq!(theme["spectrum-border-width-100"], "1px");
    assert!(!light.contains_key("spectrum-border-width-100"));
    assert!(!dark.contains_key("spectrum-border-width-100"));
    assert!(theme.values().all(|v| v.is_string()));
    assert!(theme
        .keys()
        .all(|k| !light.contains_key(k) && !dark.contains_key(k)));

    // shadcn prepends `--` itself, so a `--` prefix would become `var(----…)`.
    assert!(light
        .keys()
        .chain(dark.keys())
        .all(|key| key.starts_with("spectrum-")));
    assert_eq!(
        light.keys().collect::<Vec<_>>(),
        dark.keys().collect::<Vec<_>>()
    );
    let mut sorted: Vec<_> = light.keys().cloned().collect();
    sorted.sort();
    assert_eq!(light.keys().cloned().collect::<Vec<_>>(), sorted);
}

#[test]
fn export_shadcn_theme_ignores_requested_color_scheme_for_keys() {
    let run = |scheme: &str| -> Value {
        let output = Command::cargo_bin("design-data")
            .expect("binary design-data")
            .args([
                "export",
                repo_path("packages/design-data/tokens")
                    .to_str()
                    .expect("utf8 path"),
                "--format",
                "shadcn-theme",
                "--mode-sets-path",
                repo_path("packages/design-data/mode-sets")
                    .to_str()
                    .expect("utf8 path"),
                "--color-scheme",
                scheme,
            ])
            .assert()
            .success()
            .get_output()
            .stdout
            .clone();
        serde_json::from_slice(&output).expect("valid JSON")
    };
    assert_eq!(run("light"), run("dark"));
}
