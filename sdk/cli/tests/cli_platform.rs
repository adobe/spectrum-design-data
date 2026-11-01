// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! CLI-level regression tests for spectrum-design-data-h890.27.4 (the global
//! `--platform <id>` flag) and h890.27.6 (`platform list`/`platform show`).
//! `--platform` must select a named `[platforms.<id>]` manifest entry from
//! `.design-data.toml` regardless of which subcommand it's paired with, and
//! must error clearly on an unknown id. `DESIGN_DATA_PLATFORM` precedence is
//! already covered at the `data_source` unit-test layer (h890.27.3); this file
//! only checks the CLI plumbing. `platform list`/`show` tests here stick to
//! local `[platforms.<id>]` entries (no network) — remote-entry `show` is
//! covered by a `#[ignore]`d network test at the `data_source` unit-test layer
//! (h890.27.5).

use std::fs;
use std::path::PathBuf;

use assert_cmd::Command;
use predicates::prelude::PredicateBooleanExt;
use predicates::str::contains;
use serde_json::json;

/// Absolute path to the repo root (so the resolver can locate the spec schemas).
fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .expect("repo root canonicalizes")
}

/// Temp project with a `[platforms]` table naming one manifest entry, `rsp`.
fn setup_project_with_named_platform() -> tempfile::TempDir {
    let project = tempfile::tempdir().expect("temp project dir");
    let tokens_dir = project.path().join("tokens");
    fs::create_dir_all(&tokens_dir).expect("create tokens dir");
    fs::write(
        tokens_dir.join("tokens.json"),
        json!({
            "btn-bg": {"name": {"property": "background-color", "component": "button"}, "value": "#aaa", "uuid": "u-btn-bg"},
        })
        .to_string(),
    )
    .expect("write tokens");

    fs::write(
        project.path().join("rsp.manifest.json"),
        json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "platform": "react-spectrum",
        })
        .to_string(),
    )
    .expect("write manifest");

    fs::write(
        project.path().join(".design-data.toml"),
        format!(
            "[platforms]\nrsp = \"rsp.manifest.json\"\n[source]\ntype = \"path\"\nroot = \"{}\"\n",
            repo_root().display()
        ),
    )
    .expect("write config");

    project
}

#[test]
fn ios_repo_profile_validates_real_manifest() {
    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(repo_root())
        .args(["validate-manifest", "--platform", "ios", "--format", "json"])
        .assert()
        .success()
        .stdout(contains("\"valid\":true"));
}

#[test]
fn platform_flag_selects_named_manifest_entry() {
    let project = setup_project_with_named_platform();

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["validate-manifest", "--platform", "rsp", "--format", "json"])
        .assert()
        .success()
        .stdout(contains("\"valid\":true"));
}

#[test]
fn platform_flag_unknown_id_errors_listing_available_ids() {
    let project = setup_project_with_named_platform();

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["validate-manifest", "--platform", "nope"])
        .assert()
        .failure()
        .stderr(contains("no platform \"nope\" configured"))
        .stderr(contains("rsp"));
}

#[test]
fn platform_flag_works_after_subcommand() {
    let project = setup_project_with_named_platform();

    // The global flag must be accepted whether it appears before or after the
    // subcommand token, since `--manifest` (its per-subcommand sibling) is only
    // valid after the subcommand.
    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["validate-manifest", "--format", "json", "--platform", "rsp"])
        .assert()
        .success()
        .stdout(contains("\"valid\":true"));
}

#[test]
fn platform_list_reports_named_entry_and_default() {
    let project = setup_project_with_named_platform();

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["platform", "list", "--format", "json"])
        .assert()
        .success()
        .stdout(contains("\"id\":\"rsp\""))
        .stdout(contains("\"location\":\"local\""));
}

#[test]
fn platform_list_reports_nothing_configured_when_no_config() {
    let project = tempfile::tempdir().expect("temp project dir");

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["platform", "list"])
        .assert()
        .success()
        .stdout(contains("no platform manifests configured"));
}

#[test]
fn platform_show_reports_identity_and_drift() {
    let project = setup_project_with_named_platform();

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["platform", "show", "rsp", "--format", "json"])
        .assert()
        .success()
        .stdout(contains("\"platform\":\"react-spectrum\""))
        .stdout(contains("\"drift\""));
}

#[test]
fn platform_show_unknown_id_errors_listing_available_ids() {
    let project = setup_project_with_named_platform();

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["platform", "show", "nope"])
        .assert()
        .failure()
        .stderr(contains("no platform \"nope\" configured"))
        .stderr(contains("rsp"));
}

/// spectrum-design-data-h890.27.11: `platform eject` packages a local
/// `[platforms.<id>]` entry (manifest, sibling `extensions/`, README) as a
/// standalone repo, plus a generated `.design-data.toml`/CI workflow/LICENSE.
#[test]
fn platform_eject_local_entry_creates_standalone_repo() {
    let project = setup_project_with_named_platform();
    // Give `rsp` a README and an extensions/ dir to confirm both get copied.
    fs::write(project.path().join("README.md"), "# RSP manifest\n").expect("write readme");
    let ext_dir = project
        .path()
        .join("extensions")
        .join("platform-extensions");
    fs::create_dir_all(&ext_dir).expect("create extensions dir");
    fs::write(
        ext_dir.join("foo.json"),
        json!({
            "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/platform-extension.json",
            "platform": "React Spectrum",
            "extends": "states",
            "extensions": []
        })
        .to_string(),
    )
    .expect("write extension fragment");

    let out_dir = project.path().join("ejected");
    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["platform", "eject", "rsp", "--out"])
        .arg(&out_dir)
        .assert()
        .success()
        .stdout(contains("ejected \"rsp\""))
        .stdout(contains("git subtree split --prefix=platforms/rsp"));

    assert!(out_dir.join("manifest.json").is_file());
    assert!(out_dir.join("README.md").is_file());
    assert!(out_dir
        .join("extensions/platform-extensions/foo.json")
        .is_file());
    assert!(out_dir.join(".github/workflows/validate.yml").is_file());
    let drift = std::fs::read_to_string(out_dir.join(".github/workflows/foundation-drift.yml"))
        .expect("foundation-drift.yml written");
    assert!(drift.contains("open-pr: true"));
    assert!(drift.contains("cron:"), "{drift}");
    assert!(drift.contains("workflow_dispatch:"), "{drift}");
    assert!(drift.contains("contents: write"), "{drift}");
    assert!(drift.contains("pull-requests: write"), "{drift}");
    assert!(
        drift.contains("adobe/spectrum-design-data/.github/actions/validate@"),
        "{drift}"
    );
    assert!(drift.contains("skip-dataset-validation: true"), "{drift}");

    // Every emitted workflow must be valid YAML, and the smoke workflow is
    // opt-in.
    for name in ["validate.yml", "foundation-drift.yml"] {
        let text = fs::read_to_string(out_dir.join(".github/workflows").join(name))
            .expect("workflow written");
        serde_norway::from_str::<serde_norway::Value>(&text)
            .unwrap_or_else(|e| panic!("{name} is not valid YAML: {e}\n{text}"));
    }
    assert!(!out_dir
        .join(".github/workflows/consumer-smoke.yml")
        .exists());

    let config = fs::read_to_string(out_dir.join(".design-data.toml")).expect("read config");
    assert!(config.contains("manifest = \"manifest.json\""));
    assert!(config.contains("type = \"github\""));
    assert!(config.contains("tag = \"1.0.0\""));

    // The generated config must itself be valid TOML with `manifest` correctly
    // ordered before `[source]` (a root key after a table header is a parse
    // error in TOML).
    config
        .parse::<toml::Value>()
        .expect("ejected .design-data.toml must be valid TOML");
}

/// `--with-consumer-smoke` opts into a language-agnostic workflow that runs the
/// repo's own `consumer/smoke.sh` (h890.7.3). It must parse as YAML, install
/// the CLI via the validate action's `install-only` mode, guard on the script
/// existing, and hardcode no UUIDs.
#[test]
fn platform_eject_with_consumer_smoke_writes_workflow() {
    let project = setup_project_with_named_platform();
    let out_dir = project.path().join("ejected");
    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["platform", "eject", "rsp", "--with-consumer-smoke", "--out"])
        .arg(&out_dir)
        .assert()
        .success()
        .stdout(contains("consumer/smoke.sh"));

    let text = fs::read_to_string(out_dir.join(".github/workflows/consumer-smoke.yml"))
        .expect("consumer-smoke.yml written");
    let doc: serde_norway::Value =
        serde_norway::from_str(&text).unwrap_or_else(|e| panic!("invalid YAML: {e}\n{text}"));

    let on = doc.get("on").expect("on trigger");
    assert!(on.get("workflow_dispatch").is_some(), "{text}");
    let paths: Vec<&str> = on["pull_request"]["paths"]
        .as_sequence()
        .expect("pull_request.paths")
        .iter()
        .filter_map(|p| p.as_str())
        .collect();
    for want in [
        "manifest.json",
        "extensions/**",
        ".design-data.toml",
        "consumer/**",
    ] {
        assert!(paths.contains(&want), "missing path {want}: {paths:?}");
    }
    assert_eq!(doc["permissions"]["contents"].as_str(), Some("read"));

    let steps = doc["jobs"]["smoke"]["steps"]
        .as_sequence()
        .expect("smoke steps");
    let install = steps
        .iter()
        .find(|s| {
            s.get("uses")
                .and_then(|u| u.as_str())
                .is_some_and(|u| u.contains(".github/actions/validate@"))
        })
        .expect("validate action step");
    assert_eq!(install["with"]["install-only"].as_bool(), Some(true));

    let run = steps
        .iter()
        .find(|s| s.get("run").and_then(|r| r.as_str()) == Some("bash consumer/smoke.sh"))
        .expect("smoke.sh step");
    assert_eq!(
        run["if"].as_str(),
        Some("hashFiles('consumer/smoke.sh') != ''")
    );
    assert_eq!(run["env"]["DESIGN_DATA_BIN"].as_str(), Some("design-data"));

    let uuid_like = text
        .split(|c: char| !(c.is_ascii_hexdigit() || c == '-'))
        .any(|w| w.len() == 36 && w.matches('-').count() == 4);
    assert!(!uuid_like, "no hardcoded UUIDs expected:\n{text}");
}

/// An `--out` nested inside the platform's own `extensions/` dir must be
/// rejected up front, rather than letting `copy_dir_all` walk into a
/// destination it's actively creating inside its own source tree.
#[test]
fn platform_eject_rejects_out_nested_inside_extensions_dir() {
    let project = setup_project_with_named_platform();
    let ext_dir = project
        .path()
        .join("extensions")
        .join("platform-extensions");
    fs::create_dir_all(&ext_dir).expect("create extensions dir");
    fs::write(
        ext_dir.join("foo.json"),
        json!({
            "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/platform-extension.json",
            "platform": "React Spectrum",
            "extends": "states",
            "extensions": []
        })
        .to_string(),
    )
    .expect("write extension fragment");

    // Nested inside the source extensions/ dir being copied.
    let out_dir = project.path().join("extensions").join("nested-out");

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["platform", "eject", "rsp", "--out"])
        .arg(&out_dir)
        .assert()
        .failure()
        .stderr(contains("is inside platform \"rsp\"'s extensions/ dir"));

    // Must fail before creating anything, and must not have recursed.
    assert!(!out_dir.exists());
}

#[test]
fn platform_eject_remote_entry_errors_clearly() {
    let project = tempfile::tempdir().expect("temp project dir");
    fs::write(
        project.path().join(".design-data.toml"),
        "[platforms.remote-x]\nrepo = \"adobe/spectrum-ios-design-data\"\ntag = \"v1.0.0\"\n",
    )
    .expect("write config");

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["platform", "eject", "remote-x"])
        .assert()
        .failure()
        .stderr(contains("already external"));
}

#[test]
fn platform_eject_unknown_id_errors_listing_available_ids() {
    let project = setup_project_with_named_platform();

    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(project.path())
        .args(["platform", "eject", "nope"])
        .assert()
        .failure()
        .stderr(contains("unknown platform id \"nope\""))
        .stderr(contains("rsp"));
}

// --- component / catalog reads through the platform cascade (h890.30) ---

fn design_data(dir: &std::path::Path, args: &[&str]) -> assert_cmd::assert::Assert {
    Command::cargo_bin("design-data")
        .expect("binary design-data")
        .current_dir(dir)
        .args(args)
        .assert()
}

/// Write an extension fragment into the temp project's `extensions/<category>/`.
fn write_extension(project: &std::path::Path, category: &str, file: &str, body: &str) {
    let dir = project.join("extensions").join(category);
    fs::create_dir_all(&dir).expect("create extensions dir");
    fs::write(dir.join(file), body).expect("write extension");
}

/// The real iOS tab-bar-ios component, renamed, for replacement fixtures.
fn ios_component_as(name: &str, description: &str) -> String {
    let path = repo_root().join("platforms/ios/extensions/components/tab-bar-ios.json");
    let mut doc: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(path).expect("read ios component")).unwrap();
    doc["name"] = json!(name);
    doc["description"] = json!(description);
    doc.to_string()
}

#[test]
fn component_with_ios_platform_returns_extension_component() {
    design_data(
        repo_root().as_path(),
        &["component", "tab-bar-ios", "--platform", "ios"],
    )
    .success()
    .stdout(contains("\"name\": \"tab-bar-ios\""));
}

#[test]
fn component_without_platform_does_not_see_ios_extension() {
    design_data(repo_root().as_path(), &["component", "tab-bar-ios"])
        .failure()
        .stderr(contains("Component 'tab-bar-ios' not found."));
}

#[test]
fn component_platform_profiles_are_isolated_from_ios() {
    for platform in ["react-spectrum", "web-components"] {
        design_data(
            repo_root().as_path(),
            &["component", "tab-bar-ios", "--platform", platform],
        )
        .failure()
        .stderr(contains("Component 'tab-bar-ios' not found."));
    }
}

#[test]
fn component_foundation_output_matches_with_platform_that_does_not_touch_it() {
    let plain = design_data(repo_root().as_path(), &["component", "accordion"]).success();
    let with_platform = design_data(
        repo_root().as_path(),
        &["component", "accordion", "--platform", "ios"],
    )
    .success();
    assert_eq!(
        plain.get_output().stdout,
        with_platform.get_output().stdout,
        "ios does not extend accordion, so cascade output must equal raw output"
    );
}

#[test]
fn component_platform_merges_implementation_rows_and_replacements() {
    let project = setup_project_with_named_platform();
    write_extension(
        project.path(),
        "implementations",
        "button.json",
        &json!({
            "component": "button",
            "implementations": [{"platform": "web", "componentName": "RspOnlyButton", "package": "rsp-test"}]
        })
        .to_string(),
    );
    write_extension(
        project.path(),
        "components",
        "accordion.json",
        &ios_component_as("accordion", "Replaced by platform"),
    );

    design_data(
        project.path(),
        &["component", "button", "--platform", "rsp"],
    )
    .success()
    .stdout(contains("RspOnlyButton"));
    design_data(
        project.path(),
        &["component", "accordion", "--platform", "rsp"],
    )
    .success()
    .stdout(contains("Replaced by platform"));
    design_data(project.path(), &["component", "button"])
        .success()
        .stdout(contains("RspOnlyButton").not());
}

#[test]
fn component_with_unknown_platform_errors() {
    design_data(
        repo_root().as_path(),
        &["component", "button", "--platform", "nope"],
    )
    .failure()
    .stderr(contains("no platform \"nope\" configured"));
}

#[test]
fn component_with_malformed_extension_errors() {
    let project = setup_project_with_named_platform();
    write_extension(project.path(), "components", "broken.json", "{ not json");

    design_data(
        project.path(),
        &["component", "button", "--platform", "rsp"],
    )
    .failure()
    .stderr(contains("broken.json"));
}

#[test]
fn component_missing_with_platform_lists_merged_components() {
    design_data(
        repo_root().as_path(),
        &["component", "nope-xyz", "--platform", "ios"],
    )
    .failure()
    .stderr(contains("Component 'nope-xyz' not found."))
    .stderr(contains("tab-bar-ios"));
}

#[test]
fn catalog_export_with_ios_writes_extension_component_and_guideline() {
    let out = tempfile::tempdir().expect("out dir");
    design_data(
        repo_root().as_path(),
        &[
            "catalog",
            "export",
            "--platform",
            "ios",
            "--out",
            out.path().to_str().unwrap(),
        ],
    )
    .success();
    assert!(out.path().join("components/tab-bar-ios.json").is_file());
    assert!(out.path().join("components/accordion.json").is_file());
    assert!(out.path().join("guidelines/tab-bar-ios.json").is_file());
    let manifest = fs::read_to_string(out.path().join("guidelines/manifest.json")).unwrap();
    assert!(manifest.contains("\"slug\": \"tab-bar-ios\""));
    assert!(
        manifest.contains("ai-resource-guide"),
        "foundation entries preserved"
    );
}

#[test]
fn catalog_export_without_platform_omits_ios_extension() {
    let out = tempfile::tempdir().expect("out dir");
    design_data(
        repo_root().as_path(),
        &["catalog", "export", "--out", out.path().to_str().unwrap()],
    )
    .success();
    assert!(!out.path().join("components/tab-bar-ios.json").exists());
    assert!(out.path().join("components/accordion.json").is_file());
}

#[test]
fn catalog_export_into_reused_dir_removes_stale_files() {
    let out = tempfile::tempdir().expect("out dir");
    let out_arg = out.path().to_str().unwrap();
    design_data(
        repo_root().as_path(),
        &["catalog", "export", "--platform", "ios", "--out", out_arg],
    )
    .success();
    assert!(out.path().join("components/tab-bar-ios.json").is_file());

    design_data(
        repo_root().as_path(),
        &["catalog", "export", "--out", out_arg],
    )
    .success();
    assert!(!out.path().join("components/tab-bar-ios.json").exists());
    assert!(!out.path().join("guidelines/tab-bar-ios.json").exists());
    assert!(out.path().join("components/accordion.json").is_file());
}

/// p6ga.8.1: `render` applies the platform cascade. A fixture platform that drops a token
/// the button recipe binds makes the render name the platform in a warning; the real iOS
/// manifest (p6ga.8.2) and no platform both stay silent.
#[test]
fn render_applies_the_selected_platform_and_names_it_in_diagnostics() {
    let project = tempfile::tempdir().expect("temp project dir");
    fs::write(
        project.path().join("manifest.json"),
        json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "platform": "fixture-drop",
            "exclude": ["property=component-height-100"]
        })
        .to_string(),
    )
    .expect("write manifest");
    fs::write(
        project.path().join(".design-data.toml"),
        format!(
            "[source]\ntype = \"path\"\nroot = \"{}\"\n[platforms]\nfixture-drop = \"manifest.json\"\n",
            repo_root().display()
        ),
    )
    .expect("write config");
    Command::cargo_bin("design-data")
        .expect("design-data binary")
        .current_dir(project.path())
        .args([
            "render",
            "button",
            "--platform",
            "fixture-drop",
            "--format",
            "scene",
        ])
        .assert()
        .success()
        .stderr(contains(
            "warning: platform 'fixture-drop': height: no relationship 'component-height-100'",
        ));

    for args in [
        &["render", "button", "--platform", "ios", "--format", "scene"][..],
        &["render", "button", "--format", "scene"][..],
    ] {
        Command::cargo_bin("design-data")
            .expect("design-data binary")
            .current_dir(repo_root())
            .args(args)
            .assert()
            .success()
            .stderr(contains("warning").not());
    }
}

/// p6ga.8.37: a platform with `componentAliases` (button -> button-ios) and its own recipe.
/// The data is a fixture so the test does not depend on the real iOS button data.
fn alias_fixture_project() -> tempfile::TempDir {
    let project = tempfile::tempdir().expect("temp project dir");
    let root = project.path();
    let ext = root.join("extensions");
    fs::create_dir_all(ext.join("components")).expect("components dir");
    fs::create_dir_all(ext.join("visuals")).expect("visuals dir");
    fs::write(
        root.join("manifest.json"),
        json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "platform": "fixture-alias",
            "componentAliases": { "button": "button-ios" }
        })
        .to_string(),
    )
    .expect("write manifest");
    fs::write(
        ext.join("components/button-ios.json"),
        json!({
            "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/v0/component.schema.json",
            "$id": "https://opensource.adobe.com/spectrum-design-data/schemas/v0/components/button-ios.json",
            "specVersion": "1.0.0-draft",
            "name": "button-ios",
            "displayName": "Button (iOS)",
            "meta": {
                "category": "actions",
                "documentationUrl": "https://spectrum.adobe.com/page/button/"
            },
            "options": {}
        })
        .to_string(),
    )
    .expect("write component");
    fs::write(
        ext.join("visuals/button-ios.json"),
        json!({
            "component": "button-ios",
            "root": "box",
            "sizeScale": { "m": 100 },
            "parts": { "box": { "kind": "box", "props": {
                "height": { "value": 33 },
                "fill": { "value": "rgb(1, 2, 3)" }
            } } }
        })
        .to_string(),
    )
    .expect("write recipe");
    fs::write(
        root.join(".design-data.toml"),
        format!(
            "[source]\ntype = \"path\"\nroot = \"{}\"\n[platforms]\nfixture-alias = \"manifest.json\"\n",
            repo_root().display()
        ),
    )
    .expect("write config");
    project
}

fn render_scene(project: &std::path::Path, args: &[&str]) -> serde_json::Value {
    let out = Command::cargo_bin("design-data")
        .expect("design-data binary")
        .current_dir(project)
        .arg("render")
        .args(args)
        .args(["--format", "scene"])
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();
    serde_json::from_slice(&out).expect("scene json")
}

#[test]
fn render_follows_a_component_alias_to_the_platform_recipe() {
    let project = alias_fixture_project();
    let via_alias = render_scene(project.path(), &["button", "--platform", "fixture-alias"]);
    let root = &via_alias["nodes"][0];
    assert_eq!(root["fill"], "rgb(1, 2, 3)", "{via_alias}");
    assert_eq!(root["h"], 33.0, "{via_alias}");
    // The alias target is still renderable by name, with the same scene.
    let direct = render_scene(
        project.path(),
        &["button-ios", "--platform", "fixture-alias"],
    );
    assert_eq!(via_alias, direct);
    // Without the platform, `button` is the foundation recipe and `button-ios` has none.
    let foundation = render_scene(project.path(), &["button"]);
    assert_ne!(foundation["nodes"][0]["fill"], "rgb(1, 2, 3)");
    Command::cargo_bin("design-data")
        .expect("design-data binary")
        .current_dir(project.path())
        .args(["render", "button-ios"])
        .assert()
        .failure()
        .stderr(contains("no visual recipe for 'button-ios'"));
}

/// p6ga.8.40: the real iOS manifest aliases `button` to `button-ios`, so `render button
/// --platform ios` draws the iOS recipe (its own size and Primary fill) and plain `render
/// button` stays the foundation recipe.
#[test]
fn ios_render_button_draws_button_ios_and_foundation_is_unchanged() {
    let root = repo_root();
    let ios = render_scene(&root, &["button", "--platform", "ios"]);
    assert_eq!(ios["component"], "button-ios", "{ios}");
    let container = &ios["nodes"][0];
    // The radius token (20) is larger than half the 34.2 high container, so the corner is
    // clamped to a pill.
    assert_eq!(
        container["radius"].as_f64().unwrap(),
        container["h"].as_f64().unwrap() / 2.0,
        "{ios}"
    );
    assert_eq!(container["w"], 60.2, "{ios}");
    let direct = render_scene(&root, &["button-ios", "--platform", "ios"]);
    assert_eq!(ios, direct);
    let primary = render_scene(
        &root,
        &["button", "--platform", "ios", "--option", "style=primary"],
    );
    assert_eq!(
        primary["nodes"][0]["fill"], "rgba(0, 0, 0, 0.84)",
        "{primary}"
    );

    let foundation = render_scene(&root, &["button"]);
    assert_eq!(foundation["component"], "button", "{foundation}");
    assert_eq!(foundation["nodes"][0]["radius"], 16.0, "{foundation}");
    assert_ne!(foundation["nodes"][0]["w"], container["w"]);
    design_data(root.as_path(), &["render", "button-ios"])
        .failure()
        .stderr(contains("no visual recipe for 'button-ios'"));
}

#[test]
fn site_lists_the_alias_key_with_the_target_data_and_hides_the_target() {
    let project = alias_fixture_project();
    let site = |platform: &[&str], out: &str| -> serde_json::Value {
        let dir = project.path().join(out);
        Command::cargo_bin("design-data")
            .expect("design-data binary")
            .current_dir(project.path())
            .args(["site", "--components", "button,button-ios", "--out"])
            .arg(&dir)
            .args(platform)
            .assert()
            .success();
        serde_json::from_str(&fs::read_to_string(dir.join("data.json")).expect("data.json"))
            .expect("data.json parses")
    };
    let with = site(&["--platform", "fixture-alias"], "with");
    let list = with["components"].as_array().expect("components");
    assert_eq!(list.len(), 1, "alias target is hidden: {list:?}");
    assert_eq!(list[0]["name"], "button");
    assert_eq!(list[0]["aliasOf"], "button-ios");
    assert_eq!(list[0]["source"], "platform");
    assert_eq!(list[0]["hasVisual"], true);
    assert_eq!(with["byName"]["button"]["name"], "button-ios");

    let without = site(&[], "without");
    assert!(without["components"][0].get("source").is_none());
    assert!(without["components"][0].get("aliasOf").is_none());
}

#[test]
fn a_malformed_recipe_names_its_file() {
    let project = tempfile::tempdir().expect("temp dir");
    let visuals = project.path().join("visuals");
    fs::create_dir_all(&visuals).expect("visuals dir");
    fs::write(visuals.join("broken.json"), "{ not json").expect("write recipe");
    Command::cargo_bin("design-data")
        .expect("design-data binary")
        .current_dir(repo_root())
        .args(["render", "button", "--visuals-path"])
        .arg(&visuals)
        .assert()
        .failure()
        .stderr(contains("broken.json"));
}
