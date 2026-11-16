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
    for args in [RENDER, QUERY] {
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
