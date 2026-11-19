// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Ratchet for the per-component status levels (`design-data status`, `design_data_core::status`).
//!
//! A component's computed level may not drop below the committed baseline. When it rises, the
//! test also fails until the baseline is regenerated, so the gain is locked in:
//! `UPDATE_COMPONENT_STATUS_BASELINE=1 cargo test -p design-data-core --test component_status_baseline`

use std::collections::BTreeMap;
use std::path::PathBuf;

use design_data_core::graph::TokenGraph;
use design_data_core::status::{levels, status_report};

fn data_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data")
}

fn baseline_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/component-status-baseline.json")
}

fn actual_levels() -> BTreeMap<String, u8> {
    let d = data_dir();
    let graph = TokenGraph::from_json_dir_with_catalogs(
        &d.join("tokens"),
        Some(&d.join("mode-sets")),
        Some(&d.join("components")),
    )
    .expect("tokens")
    .with_relationships(
        TokenGraph::load_spec_relationships(&d.join("relationships")).expect("relationships"),
    );
    let mut graph = graph;
    graph.visuals = TokenGraph::load_spec_visuals(&d.join("visuals")).expect("visuals");
    levels(&status_report(&graph))
}

#[test]
fn component_levels_match_the_baseline() {
    let actual = actual_levels();

    if std::env::var_os("UPDATE_COMPONENT_STATUS_BASELINE").is_some() {
        let json = serde_json::to_string_pretty(&actual).unwrap() + "\n";
        std::fs::write(baseline_path(), json).expect("write baseline");
        return;
    }

    let baseline: BTreeMap<String, u8> = serde_json::from_str(
        &std::fs::read_to_string(baseline_path()).expect("read component-status-baseline.json"),
    )
    .expect("parse baseline");

    let mut dropped = Vec::new();
    let mut stale = Vec::new();
    for (name, have) in &actual {
        match baseline.get(name) {
            Some(allowed) if have < allowed => {
                dropped.push(format!("{name}: level {have}, baseline is {allowed}"))
            }
            Some(allowed) if have > allowed => {
                stale.push(format!("{name}: level {have}, baseline is {allowed}"))
            }
            None if *have > 0 => stale.push(format!("{name}: new, level {have}")),
            _ => {}
        }
    }
    for name in baseline.keys().filter(|n| !actual.contains_key(*n)) {
        stale.push(format!("{name}: removed"));
    }
    assert!(
        dropped.is_empty(),
        "\nA component dropped a level (run `design-data status <component>` to see why):\n{}\n",
        dropped.join("\n")
    );
    assert!(
        stale.is_empty(),
        "\nThe baseline is out of date:\n{}\nRegenerate it with UPDATE_COMPONENT_STATUS_BASELINE=1 cargo test -p design-data-core --test component_status_baseline\n",
        stale.join("\n")
    );
}
