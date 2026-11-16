// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `dataset.json` `requires.cli` and a newer `layoutRevision` (h890.36.2, GH #1869): a CLI older
//! than its data refuses it, `--ignore-data-requirements` reads it anyway and warns every run.

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

/// A project whose `[source]` is a temp dataset root: this checkout's data, symlinked, with its
/// own `dataset.json`.
fn project_with_dataset_json(dataset_json: &str) -> tempfile::TempDir {
    let project = tempfile::tempdir().expect("temp project dir");
    let root = project.path().join("data");
    let data = root.join("packages/design-data");
    fs::create_dir_all(&data).unwrap();
    let real = repo_root().join("packages");
    std::os::unix::fs::symlink(
        real.join("design-data-spec"),
        root.join("packages/design-data-spec"),
    )
    .unwrap();
    for entry in fs::read_dir(real.join("design-data")).unwrap() {
        let entry = entry.unwrap();
        if entry.file_name() != "dataset.json" && entry.file_name() != "node_modules" {
            std::os::unix::fs::symlink(entry.path(), data.join(entry.file_name())).unwrap();
        }
    }
    fs::write(data.join("dataset.json"), dataset_json).unwrap();
    write_config(project.path(), "");
    project
}

fn write_config(project: &Path, extra: &str) {
    fs::write(
        project.join(".design-data.toml"),
        format!(
            "{extra}[source]\ntype = \"path\"\nroot = \"{}\"\n",
            project.join("data").display()
        ),
    )
    .unwrap();
}

fn query(project: &Path, extra: &[&str]) -> assert_cmd::assert::Assert {
    Command::cargo_bin("design-data")
        .expect("design-data binary")
        .current_dir(project)
        .args(["query", "--filter", "property=corner-radius", "--count"])
        .args(extra)
        .assert()
}

#[test]
fn a_cli_older_than_the_data_minimum_refuses_it() {
    let p = project_with_dataset_json(r#"{"requires":{"cli":"99.0.0"}}"#);
    query(p.path(), &[])
        .failure()
        .stderr(contains("needs design-data CLI 99.0.0 or newer"))
        .stderr(contains("--ignore-data-requirements"));
}

#[test]
fn the_escape_flag_reads_the_data_and_warns() {
    let p = project_with_dataset_json(r#"{"requires":{"cli":"99.0.0"}}"#);
    query(p.path(), &["--ignore-data-requirements"])
        .success()
        .stderr(contains(
            "warning: this dataset needs design-data CLI 99.0.0",
        ))
        .stderr(contains(
            "Continuing because --ignore-data-requirements is set",
        ));
}

#[test]
fn a_minimum_this_cli_meets_passes_silently() {
    let p = project_with_dataset_json(r#"{"requires":{"cli":"0.1.0"},"layoutRevision":0}"#);
    query(p.path(), &[])
        .success()
        .stderr(contains("warning").not());
}

#[test]
fn data_without_the_field_is_not_checked() {
    let p = project_with_dataset_json(r#"{"specVersion":"1.0.0-draft"}"#);
    query(p.path(), &[])
        .success()
        .stderr(contains("warning").not());
}

#[test]
fn a_layout_revision_newer_than_the_cli_refuses_the_data() {
    let p = project_with_dataset_json(r#"{"layoutRevision":99}"#);
    query(p.path(), &[])
        .failure()
        .stderr(contains("layout revision 99"));
    query(p.path(), &["--ignore-data-requirements"]).success();
}

#[test]
fn a_minimum_that_is_not_an_exact_version_only_warns() {
    let p = project_with_dataset_json(r#"{"requires":{"cli":">=0.40"}}"#);
    query(p.path(), &[])
        .success()
        .stderr(contains("not an exact version"));
}

#[test]
fn the_config_file_cannot_turn_the_escape_on() {
    let p = project_with_dataset_json(r#"{"requires":{"cli":"99.0.0"}}"#);
    write_config(p.path(), "ignore_data_requirements = true\n");
    query(p.path(), &[])
        .failure()
        .stderr(contains("unknown field `ignore_data_requirements`"));
}

/// This checkout's own dataset must be readable by this checkout's CLI: a change that raises
/// `requires.cli` (or `layoutRevision`) past the CLI bumps the CLI version in the same change.
#[test]
fn this_checkouts_dataset_is_readable_by_this_checkouts_cli() {
    let unmet = design_data_core::data_source::requirements::unmet_requirements(
        &repo_root().join("packages/design-data"),
        env!("CARGO_PKG_VERSION"),
        design_data_core::visual::LAYOUT_REVISION,
    );
    assert!(unmet.errors.is_empty(), "{:?}", unmet.errors);
    assert!(unmet.warnings.is_empty(), "{:?}", unmet.warnings);
}
