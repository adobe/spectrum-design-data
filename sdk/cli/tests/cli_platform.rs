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
