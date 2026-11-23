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

// The fixture datasets are symlink farms over this checkout's data.
#![cfg(unix)]

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

/// This checkout's data, symlinked under `root/packages/`, with its own `dataset.json`: the
/// layout of a checkout, of a fetched github tarball and of the embedded snapshot.
fn dataset_farm(root: &Path, dataset_json: &str) {
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
}

/// A project whose `[source]` is a temp dataset root: this checkout's data, symlinked, with its
/// own `dataset.json`.
fn project_with_dataset_json(dataset_json: &str) -> tempfile::TempDir {
    let project = tempfile::tempdir().expect("temp project dir");
    dataset_farm(&project.path().join("data"), dataset_json);
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

/// `platform show` only prints identity and pin information: a dataset this CLI is too old for is
/// a finding there, not a refusal.
#[test]
fn platform_show_reports_unmet_requirements_instead_of_refusing() {
    let p = project_with_dataset_json(r#"{"requires":{"cli":"99.0.0"}}"#);
    fs::write(
        p.path().join("manifest.json"),
        r#"{"specVersion":"1.0.0-draft","foundationVersion":"1.0.0","platform":"fixture"}"#,
    )
    .unwrap();
    fs::write(
        p.path().join(".design-data.toml"),
        format!(
            "[source]\ntype = \"path\"\nroot = \"{}\"\n\n[platforms]\nfixture = \"manifest.json\"\n",
            p.path().join("data").display()
        ),
    )
    .unwrap();
    let run = |extra: &[&str]| {
        Command::cargo_bin("design-data")
            .expect("design-data binary")
            .current_dir(p.path())
            .args(["platform", "show", "fixture"])
            .args(extra)
            .assert()
    };
    run(&[]).success().stdout(contains(
        "requirements: this dataset needs design-data CLI 99.0.0",
    ));
    run(&["--format", "json"])
        .success()
        .stdout(contains("\"requirements\""))
        .stdout(contains("99.0.0"));
    // `validate-manifest` reads the data, so it still refuses.
    Command::cargo_bin("design-data")
        .expect("design-data binary")
        .current_dir(p.path())
        .args(["validate-manifest", "--platform", "fixture"])
        .assert()
        .failure()
        .stderr(contains("needs design-data CLI 99.0.0"));
}

/// A dataset whose `tokens/` is not where the standard layout puts it is not checked: the
/// `dataset.json` next to it may belong to something else.
#[test]
fn a_moved_token_root_is_not_checked() {
    let p = project_with_dataset_json(r#"{"requires":{"cli":"99.0.0"}}"#);
    let data = p.path().join("data/packages/design-data");
    std::os::unix::fs::symlink(
        repo_root().join("packages/design-data/tokens"),
        data.join("alt-tokens"),
    )
    .unwrap();
    let alt = data.join("alt-tokens");
    Command::cargo_bin("design-data")
        .expect("design-data binary")
        .current_dir(p.path())
        .args([
            "query",
            alt.to_str().unwrap(),
            "--filter",
            "property=corner-radius",
            "--count",
        ])
        .assert()
        .success()
        .stderr(contains("needs design-data CLI").not());
}

/// The main case: a `github` source, whose dataset the CLI fetched into its cache
/// (`<cache>/sources/github/<repo>@tag-<tag with / and @ as ->/packages/design-data/tokens`). The check has to see
/// that cache-shaped dataset, not only a checkout: if its tokens root were named anything but
/// `tokens`, the whole check would be skipped without a word.
#[test]
fn a_fetched_dataset_in_the_cache_is_checked() {
    let tag = "@adobe/spectrum-design-data@3.99.0";
    let cache = tempfile::tempdir().expect("cache dir");
    let root = cache.path().join(format!(
        "sources/github/adobe-spectrum-design-data@tag-{}",
        tag.replace(['/', '@'], "-")
    ));
    dataset_farm(&root, r#"{"requires":{"cli":"99.0.0"}}"#);
    fs::write(root.join(".complete"), "3").unwrap();
    let project = tempfile::tempdir().expect("temp project dir");
    fs::write(
        project.path().join(".design-data.toml"),
        format!(
            "[source]\ntype = \"github\"\nrepo = \"adobe/spectrum-design-data\"\ntag = \"{tag}\"\n"
        ),
    )
    .unwrap();
    let run = |extra: &[&str]| {
        Command::cargo_bin("design-data")
            .expect("design-data binary")
            .current_dir(project.path())
            .env("DESIGN_DATA_CACHE_DIR", cache.path())
            // A cache miss must fail loudly, not quietly download the tag: nothing is listening.
            .env("HTTPS_PROXY", "http://127.0.0.1:9")
            .env("https_proxy", "http://127.0.0.1:9")
            .args(["query", "--filter", "property=corner-radius", "--count"])
            .args(extra)
            .assert()
    };
    run(&[])
        .failure()
        .stderr(contains("needs design-data CLI 99.0.0"));
    // The same cache with the escape reads fine, so the refusal above is the check, not a
    // broken fixture or a failed fetch.
    run(&["--ignore-data-requirements"])
        .success()
        .stderr(contains("Continuing because --ignore-data-requirements"));
}

/// The embedded snapshot (no config, no checkout) is materialized to
/// `<cache>/embedded/<version>/packages/design-data/tokens` and is checked like any other
/// dataset. Run once to materialize it, rewrite its `dataset.json`, run again.
#[test]
fn the_embedded_dataset_is_checked() {
    let cache = tempfile::tempdir().expect("cache dir");
    let outside_any_checkout = tempfile::tempdir().expect("empty dir");
    let run = || {
        Command::cargo_bin("design-data")
            .expect("design-data binary")
            .current_dir(outside_any_checkout.path())
            .env("DESIGN_DATA_CACHE_DIR", cache.path())
            .args(["query", "--filter", "property=corner-radius", "--count"])
            .assert()
    };
    run().success();
    let dataset_json = cache
        .path()
        .join("embedded")
        .join(design_data_core::data_source::EMBEDDED_DATA_VERSION)
        .join("packages/design-data/dataset.json");
    assert!(
        dataset_json.is_file(),
        "embedded snapshot not at {}",
        dataset_json.display()
    );
    fs::write(&dataset_json, r#"{"requires":{"cli":"99.0.0"}}"#).unwrap();
    run()
        .failure()
        .stderr(contains("needs design-data CLI 99.0.0"));
}

/// How many times `needle` appears in `haystack`.
fn count(haystack: &str, needle: &str) -> usize {
    haystack.matches(needle).count()
}

/// A command that goes through both the pre-dispatch `cli_version` check and data resolution
/// (which checks `dataset.json`) prints each warning once, not once per place that notices it.
#[test]
fn a_command_that_hits_both_checks_warns_once_per_message() {
    // Two different warnings at once: the dataset's `requires.cli` is not an exact version, and
    // the project's `cli_version` excludes this CLI.
    let p = project_with_dataset_json(r#"{"requires":{"cli":">=0.40"}}"#);
    write_config(p.path(), "cli_version = \">=99.0.0\"\n");
    let out = query(p.path(), &[]).success().get_output().stderr.clone();
    let stderr = String::from_utf8_lossy(&out);
    assert_eq!(count(&stderr, "not an exact version"), 1, "{stderr}");
    assert_eq!(count(&stderr, "this project's"), 1, "{stderr}");
}

/// The same with the escape flag on a command that writes committed output: the "continuing"
/// warning for the project range and for the dataset are each printed once.
#[test]
fn the_escape_flag_warns_once_per_message_on_an_output_command() {
    let p = project_with_dataset_json(r#"{"requires":{"cli":"99.0.0"}}"#);
    write_config(p.path(), "cli_version = \">=99.0.0\"\n");
    let out = Command::cargo_bin("design-data")
        .expect("design-data binary")
        .current_dir(p.path())
        .args([
            "render",
            "button",
            "--format",
            "scene",
            "--ignore-data-requirements",
        ])
        .assert()
        .success()
        .get_output()
        .stderr
        .clone();
    let stderr = String::from_utf8_lossy(&out);
    assert_eq!(count(&stderr, "this project's"), 1, "{stderr}");
    assert_eq!(
        count(&stderr, "this dataset needs design-data CLI 99.0.0"),
        1,
        "{stderr}"
    );
    assert_eq!(count(&stderr, "Continuing because"), 2, "{stderr}");
}

/// `platform doctor` has to run when the dataset needs a newer CLI than this one, which is when a
/// platform team needs it: the requirement is a finding, not a refusal.
#[test]
fn platform_doctor_reports_unmet_dataset_requirements_and_still_runs() {
    let p = project_with_dataset_json(r#"{"requires":{"cli":"99.0.0"}}"#);
    fs::write(
        p.path().join("manifest.json"),
        r#"{"specVersion":"1.0.0-draft","foundationVersion":"1.0.0","platform":"ios"}"#,
    )
    .unwrap();
    fs::write(
        p.path().join(".design-data.toml"),
        format!(
            "[source]\ntype = \"path\"\nroot = \"{}\"\n\n[platforms]\nfixture = \"manifest.json\"\n",
            p.path().join("data").display()
        ),
    )
    .unwrap();
    Command::cargo_bin("design-data")
        .expect("design-data binary")
        .current_dir(p.path())
        .args(["platform", "doctor", "fixture"])
        .assert()
        .code(1)
        .stdout(contains("FAIL cli"))
        .stdout(contains("99.0.0"))
        .stdout(contains("ok   manifest"))
        .stderr(contains("--ignore-data-requirements").not());
}
