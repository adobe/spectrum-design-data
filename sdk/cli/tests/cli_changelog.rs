// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `design-data changelog` against a throwaway repository with the dataset in a subdirectory,
//! so nothing depends on the monorepo layout.

use assert_cmd::Command;
use serde_json::{json, Value};
use std::path::Path;

fn git(dir: &Path, args: &[&str]) {
    let ok = std::process::Command::new("git")
        .arg("-C")
        .arg(dir)
        .args([
            "-c",
            "user.name=t",
            "-c",
            "user.email=t@t",
            "-c",
            "commit.gpgsign=false",
        ])
        .args(args)
        .status()
        .unwrap()
        .success();
    assert!(ok, "git {args:?}");
}

fn commit(dir: &Path, component: &Value, subject: &str) {
    let ds = dir.join("sub/ds");
    std::fs::create_dir_all(ds.join("components")).unwrap();
    std::fs::write(
        ds.join("components/c.json"),
        serde_json::to_string_pretty(component).unwrap(),
    )
    .unwrap();
    git(dir, &["add", "-A"]);
    git(dir, &["commit", "-qm", subject]);
}

fn run(dir: &Path, from: &str, to: &str, release: &str) {
    Command::cargo_bin("design-data")
        .unwrap()
        .current_dir(dir)
        .args([
            "changelog",
            "--from",
            from,
            "--to",
            to,
            "--release",
            release,
            "--dataset",
            "sub/ds",
        ])
        .assert()
        .success();
}

#[test]
fn appends_releases_and_never_rewrites_one() {
    let dir = tempfile::tempdir().unwrap();
    let d = dir.path();
    git(d, &["init", "-q", "-b", "main"]);
    let base =
        json!({"name": "c", "options": {"size": {"values": [{"value": "s"}, {"value": "m"}]}}});
    commit(d, &base, "init");
    git(d, &["tag", "v1"]);

    let mut v2 = base.clone();
    v2["options"]["size"]["values"] = json!([{"value": "s"}]);
    commit(d, &v2, "fix: drop m (#7)");
    git(d, &["tag", "v2"]);

    let file = d.join("sub/ds/changelog/c.json");
    run(d, "v1", "v2", "2.0.0");
    let first = std::fs::read_to_string(&file).unwrap();
    run(d, "v1", "v2", "2.0.0");
    assert_eq!(
        first,
        std::fs::read_to_string(&file).unwrap(),
        "second run changes nothing"
    );

    let log: Value = serde_json::from_str(&first).unwrap();
    assert_eq!(log["baseline"]["version"], "1.0.0");
    let release = &log["releases"][0];
    assert_eq!(
        (release["version"].as_str(), release["bump"].as_str()),
        (Some("2.0.0"), Some("major"))
    );
    assert_eq!(release["commits"][0]["source"]["number"], 7);
    assert_eq!(release["commits"][0]["entries"][0]["kind"], "option-value");

    // Formatting and key order alone record nothing.
    let mut v3 = v2.clone();
    v3["name"] = json!("c");
    commit(
        d,
        &serde_json::from_str::<Value>(&serde_json::to_string(&v3).unwrap()).unwrap(),
        "style: reformat",
    );
    run(d, "v2", "HEAD", "2.0.1");
    assert_eq!(first, std::fs::read_to_string(&file).unwrap());

    let mut v4 = v2.clone();
    v4["description"] = json!("new words");
    commit(d, &v4, "docs: describe");
    run(d, "v2", "HEAD", "2.1.0");
    let log: Value = serde_json::from_str(&std::fs::read_to_string(&file).unwrap()).unwrap();
    assert_eq!(log["releases"].as_array().unwrap().len(), 2);
    assert_eq!(
        log["releases"][0],
        serde_json::from_str::<Value>(&first).unwrap()["releases"][0]
    );
    assert_eq!(log["releases"][1]["version"], "2.0.1");
    assert_eq!(
        log["releases"][1]["commits"][0]["entries"][0]["class"],
        "documentation"
    );
    assert_eq!(log["releases"][1]["commits"][0]["source"]["type"], "commit");

    // `unreleased` is taken over by the next release, whatever else it adds.
    let mut v5 = v4.clone();
    v5["options"]["size"]["values"] = json!([{"value": "s"}, {"value": "l"}]);
    commit(d, &v5, "feat: add l (#9)");
    run(d, "v2", "HEAD", "unreleased");
    let log: Value = serde_json::from_str(&std::fs::read_to_string(&file).unwrap()).unwrap();
    let rels = log["releases"].as_array().unwrap();
    assert_eq!(rels.last().unwrap()["release"], "unreleased");
    git(d, &["tag", "v3"]);
    run(d, "v2", "HEAD", "2.2.0");
    let log: Value = serde_json::from_str(&std::fs::read_to_string(&file).unwrap()).unwrap();
    let rels = log["releases"].as_array().unwrap();
    assert!(rels.iter().all(|r| r["release"] != "unreleased"));
    assert_eq!(rels.last().unwrap()["release"], "2.2.0");
    let commits = rels.last().unwrap()["commits"].as_array().unwrap().len();
    assert_eq!(commits, 1);
}
