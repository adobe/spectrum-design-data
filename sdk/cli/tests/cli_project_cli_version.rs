// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `cli_version` in `.design-data.toml` (h890.36.3, GH #1742): the CLI versions a project's
//! generated files are made with. An error for a command whose output a project commits, a
//! warning for the rest.

use std::fs;
use std::path::{Path, PathBuf};

use assert_cmd::Command;
use predicates::prelude::PredicateBooleanExt;
use predicates::str::contains;

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .expect("repo root canonicalizes")
}

/// A project that reads this checkout's data and carries `cli_version = <range>`.
fn project(range: &str) -> tempfile::TempDir {
    let project = tempfile::tempdir().expect("temp project dir");
    fs::write(
        project.path().join(".design-data.toml"),
        format!(
            "cli_version = \"{range}\"\n\n[source]\ntype = \"path\"\nroot = \"{}\"\n\n[platforms]\nfixture = \"manifest.json\"\n",
            repo_root().display()
        ),
    )
    .unwrap();
    fs::write(
        project.path().join("manifest.json"),
        r#"{"specVersion":"1.0.0-draft","foundationVersion":"1.0.0","platform":"fixture"}"#,
    )
    .unwrap();
    project
}

fn run(project: &Path, args: &[&str]) -> assert_cmd::assert::Assert {
    Command::cargo_bin("design-data")
        .expect("design-data binary")
        .current_dir(project)
        .args(args)
        .assert()
}

const RENDER: &[&str] = &["render", "button", "--format", "scene"];
const QUERY: &[&str] = &["query", "--filter", "property=corner-radius", "--count"];

#[test]
fn a_command_that_writes_committed_output_refuses_a_cli_outside_the_range() {
    // Newer than this CLI, and older: both are outside the range.
    for range in [">=99.0.0", "<0.1.0"] {
        let p = project(range);
        run(p.path(), RENDER)
            .failure()
            .stderr(contains(range))
            .stderr(contains("--ignore-data-requirements"));
    }
}

#[test]
fn a_command_that_only_reads_warns_instead() {
    let p = project(">=99.0.0");
    run(p.path(), QUERY)
        .success()
        .stderr(contains("warning: this project's"));
}

#[test]
fn a_cli_inside_the_range_is_silent() {
    let p = project(">=0.1.0, <99.0.0");
    run(p.path(), RENDER)
        .success()
        .stderr(contains("warning").not());
    run(p.path(), QUERY)
        .success()
        .stderr(contains("warning").not());
}

#[test]
fn the_escape_flag_runs_anyway_and_warns() {
    let p = project(">=99.0.0");
    let mut args = RENDER.to_vec();
    args.push("--ignore-data-requirements");
    run(p.path(), &args).success().stderr(contains(
        "Continuing because --ignore-data-requirements is set",
    ));
}

#[test]
fn a_project_without_cli_version_is_not_checked() {
    let none = tempfile::tempdir().unwrap();
    fs::write(
        none.path().join(".design-data.toml"),
        format!(
            "[source]\ntype = \"path\"\nroot = \"{}\"\n",
            repo_root().display()
        ),
    )
    .unwrap();
    run(none.path(), RENDER)
        .success()
        .stderr(contains("warning").not());
}

#[test]
fn a_range_that_is_not_semver_is_a_config_error_for_every_command() {
    let p = project("latest");
    // `platform show` and `platform list` read the config too, so they fail the same way: the
    // message names the key and the syntax, which is the diagnosis.
    let show: &[&str] = &["platform", "show", "fixture"];
    let list: &[&str] = &["platform", "list"];
    for args in [RENDER, QUERY, show, list] {
        run(p.path(), args)
            .failure()
            .stderr(contains("`cli_version` is 'latest'"))
            .stderr(contains("not a semver range"));
    }
}

#[test]
fn platform_show_reports_the_range_instead_of_refusing() {
    let p = project(">=99.0.0");
    run(p.path(), &["platform", "show", "fixture"])
        .success()
        .stdout(contains("requirements: this project's"));
}

/// `render-compare` reads scenes and a measured file and never resolves a dataset, so the check
/// has to run before dispatch, not inside data resolution.
#[test]
fn render_compare_is_held_to_the_range_without_resolving_a_dataset() {
    let scratch = tempfile::tempdir().unwrap();
    let measured = scratch.path().join("measured.json");
    let scenes = scratch.path().join("scenes");
    let args = [
        "render-compare",
        "--scenes",
        scenes.to_str().unwrap(),
        "--measured",
        measured.to_str().unwrap(),
    ];
    // Out of range: refused before it reads either path.
    let p = project(">=99.0.0");
    run(p.path(), &args)
        .failure()
        .stderr(contains(">=99.0.0"))
        .stderr(contains("--ignore-data-requirements"));
    // In range: the range is not what stops it (the paths do not exist), so no range message.
    let ok = project(">=0.1.0");
    run(ok.path(), &args)
        .failure()
        .stderr(contains("--ignore-data-requirements").not());
}

/// A command that never loads a dataset still warns when it is outside the range.
#[test]
fn a_command_that_resolves_no_dataset_still_warns() {
    let p = project(">=99.0.0");
    run(p.path(), &["decompose-legacy-name", "corner-radius-100"])
        .stderr(contains("warning: this project's"));
}

/// A command that writes nothing a project commits does not need the config, so a broken one
/// does not stop it (the commands that do use the config report it themselves).
#[test]
fn a_broken_config_does_not_stop_a_command_that_ignores_it() {
    let p = tempfile::tempdir().unwrap();
    fs::write(p.path().join(".design-data.toml"), "bogus_key = 1\n").unwrap();
    run(p.path(), &["decompose-legacy-name", "corner-radius-100"])
        .stderr(contains("is invalid").not());
}

/// `catalog export` and `figma export` write files a project commits or ships, so they are held
/// to the range like `render`; they are refused before they read data or reach for Figma.
#[test]
fn catalog_export_and_figma_export_are_held_to_the_range() {
    let p = project(">=99.0.0");
    let out = tempfile::tempdir().unwrap();
    run(
        p.path(),
        &["catalog", "export", "--out", out.path().to_str().unwrap()],
    )
    .failure()
    .stderr(contains(">=99.0.0"));
    run(
        p.path(),
        &["figma", "export", "--file-key", "x", "--token", "y"],
    )
    .failure()
    .stderr(contains(">=99.0.0"));
}
