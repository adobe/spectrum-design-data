// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `design-data platform doctor` (h890.36.9, GH #1870): the checks that exist elsewhere,
//! reported together. Every finding is reported and none refuses to run.

use std::fs;
use std::path::{Path, PathBuf};

use assert_cmd::Command;
use predicates::prelude::PredicateBooleanExt;
use predicates::str::contains;
use serde_json::json;

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .expect("repo root canonicalizes")
}

/// A project that reads this checkout's data with a platform manifest `platform`, optionally a
/// top-level config line, and an `extensions/visuals/<component>.json` recipe.
fn project(
    platform: &str,
    config_prefix: &str,
    recipe: Option<(&str, serde_json::Value)>,
) -> tempfile::TempDir {
    let p = tempfile::tempdir().expect("temp project dir");
    fs::write(
        p.path().join("manifest.json"),
        json!({"specVersion": "1.0.0-draft", "foundationVersion": "1.0.0", "platform": platform})
            .to_string(),
    )
    .unwrap();
    fs::write(
        p.path().join(".design-data.toml"),
        format!(
            "{config_prefix}[source]\ntype = \"path\"\nroot = \"{}\"\n\n[platforms]\nfixture = \"manifest.json\"\n",
            repo_root().display()
        ),
    )
    .unwrap();
    if let Some((component, recipe)) = recipe {
        let dir = p.path().join("extensions/visuals");
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join(format!("{component}.json")), recipe.to_string()).unwrap();
    }
    p
}

fn doctor(p: &Path, extra: &[&str]) -> assert_cmd::assert::Assert {
    Command::cargo_bin("design-data")
        .expect("design-data binary")
        .current_dir(p)
        .args(["platform", "doctor", "fixture"])
        .args(extra)
        .assert()
}

/// An action-button recipe that binds `color` / `context`.
fn recipe(context: &str) -> serde_json::Value {
    json!({"component": "action-button", "root": "container", "sizeScale": {"m": 100},
        "parts": {"container": {"kind": "box", "props": {
            "fill": {"relationship": {"property": "color", "context": context}}}}}})
}

#[test]
fn a_healthy_platform_passes_every_check() {
    let p = project("ios", "", Some(("action-button", recipe("Background"))));
    doctor(p.path(), &[])
        .success()
        .stdout(contains("ok   manifest"))
        .stdout(contains("ok   bindings"))
        .stdout(contains("ok   cli"))
        .stdout(contains("ok   registry"))
        .stdout(contains("0 error(s), 0 warning(s)"))
        // A `path` source has no release pin to compare, and `--latest` was not asked for.
        .stdout(contains("skip pin"))
        .stdout(contains("skip latest"));
}

#[test]
fn a_binding_the_data_lacks_fails_but_the_other_checks_still_run() {
    let p = project("ios", "", Some(("action-button", recipe("BogusContext"))));
    doctor(p.path(), &[])
        .code(1)
        .stdout(contains("FAIL bindings"))
        .stdout(contains("MANIFEST-001"))
        .stdout(contains("BogusContext"))
        .stdout(contains("ok   manifest"))
        .stdout(contains("ok   registry"))
        .stdout(contains("1 error(s)"));
}

/// Doctor reports an unmet `cli_version` as a finding: it has to run when this CLI is outside the
/// project's range, which is when a team needs it, and it does not print the generic warning too.
#[test]
fn a_cli_outside_the_project_range_is_a_finding_not_a_refusal() {
    let p = project("ios", "cli_version = \">=99.0.0\"\n", None);
    doctor(p.path(), &[])
        .code(1)
        .stdout(contains("FAIL cli"))
        .stdout(contains(">=99.0.0"))
        .stdout(contains("ok   manifest"))
        .stderr(contains("warning:").not());
}

#[test]
fn an_unregistered_platform_warns_without_failing() {
    let p = project("not-a-registered-platform", "", None);
    doctor(p.path(), &[])
        .success()
        .stdout(contains("warn registry"))
        .stdout(contains("0 error(s), 1 warning(s)"));
}

/// A platform recipe for a component the foundation also has replaces it: allowed, and a
/// promotion candidate, so a note and not a problem.
#[test]
fn an_extension_that_replaces_a_foundation_artifact_is_a_note() {
    let badge = json!({"component": "badge", "root": "container", "sizeScale": {"m": 100},
        "parts": {"container": {"kind": "box", "props": {}}}});
    let p = project("ios", "", Some(("badge", badge)));
    doctor(p.path(), &[])
        .success()
        .stdout(contains("note shadows"))
        .stdout(contains("visuals: badge"))
        .stdout(contains("0 error(s), 0 warning(s)"));
}

#[test]
fn json_output_lists_every_check_with_a_status() {
    let p = project("ios", "", Some(("action-button", recipe("BogusContext"))));
    let out = doctor(p.path(), &["--format", "json"])
        .code(1)
        .get_output()
        .stdout
        .clone();
    let report: serde_json::Value = serde_json::from_slice(&out).expect("json report");
    let ids: Vec<&str> = report["checks"]
        .as_array()
        .unwrap()
        .iter()
        .map(|c| c["id"].as_str().unwrap())
        .collect();
    assert_eq!(
        ids,
        [
            "manifest",
            "bindings",
            "extensions",
            "pin",
            "cli",
            "registry",
            "shadows",
            "latest"
        ],
        "{report}"
    );
    let mut unique = ids.clone();
    unique.sort_unstable();
    unique.dedup();
    assert_eq!(unique.len(), ids.len(), "duplicate check ids: {ids:?}");
    assert_eq!(report["errors"], 1, "{report}");
    let bindings = report["checks"]
        .as_array()
        .unwrap()
        .iter()
        .find(|c| c["id"] == "bindings")
        .unwrap();
    assert_eq!(bindings["status"], "error");
    assert!(bindings["details"][0]
        .as_str()
        .unwrap()
        .contains("MANIFEST-001"));
}

#[test]
fn without_a_configured_manifest_it_says_so() {
    let p = tempfile::tempdir().unwrap();
    fs::write(
        p.path().join(".design-data.toml"),
        format!(
            "[source]\ntype = \"path\"\nroot = \"{}\"\n",
            repo_root().display()
        ),
    )
    .unwrap();
    Command::cargo_bin("design-data")
        .expect("design-data binary")
        .current_dir(p.path())
        .args(["platform", "doctor"])
        .assert()
        .code(2)
        .stderr(contains("no platform manifest configured"));
}

/// A broken setup is what doctor is for: a `cli_version` that is not a range is a failed `config`
/// check with the message that names the key, and a report, not a bare error.
#[test]
fn a_malformed_cli_version_is_a_finding_not_a_crash() {
    let p = project("ios", "cli_version = \"latest\"\n", None);
    doctor(p.path(), &[])
        .code(1)
        .stdout(contains("FAIL config"))
        .stdout(contains("`cli_version`"))
        .stdout(contains("1 error(s)"));
    let out = doctor(p.path(), &["--format", "json"])
        .code(1)
        .get_output()
        .stdout
        .clone();
    let report: serde_json::Value = serde_json::from_slice(&out).expect("json report");
    assert_eq!(report["checks"][0]["id"], "config", "{report}");
    assert_eq!(report["checks"][0]["status"], "error");
    assert!(
        report["manifest"].is_null(),
        "no manifest was resolved: {report}"
    );
}

/// An invalid manifest and a foundation that will not load are two findings with two ids: a
/// consumer keyed by `id` must not lose one.
#[test]
fn an_invalid_manifest_and_an_unloadable_foundation_are_distinct_checks() {
    let p = tempfile::tempdir().unwrap();
    let empty_root = p.path().join("empty-foundation");
    fs::create_dir_all(&empty_root).unwrap();
    fs::write(p.path().join("manifest.json"), r#"{"not": "a manifest"}"#).unwrap();
    fs::write(
        p.path().join(".design-data.toml"),
        format!(
            "[source]\ntype = \"path\"\nroot = \"{}\"\n\n[platforms]\nfixture = \"manifest.json\"\n",
            empty_root.display()
        ),
    )
    .unwrap();
    let out = doctor(p.path(), &["--format", "json"])
        .code(1)
        .get_output()
        .stdout
        .clone();
    let report: serde_json::Value = serde_json::from_slice(&out).expect("json report");
    let ids: Vec<&str> = report["checks"]
        .as_array()
        .unwrap()
        .iter()
        .map(|c| c["id"].as_str().unwrap())
        .collect();
    let mut unique = ids.clone();
    unique.sort_unstable();
    unique.dedup();
    assert_eq!(unique.len(), ids.len(), "duplicate check ids: {ids:?}");
    assert!(
        ids.contains(&"manifest") && ids.contains(&"foundation"),
        "{ids:?}"
    );
}
