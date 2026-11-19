// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Ratchet for the `relationship.context` selectors in each component's visual recipe.
//!
//! A recipe binds a relationship by `context` (a free-text label) or by structured identity
//! (`part`, `between`, `attribute`). New bindings use the structured form, so a recipe's count of
//! `context` selectors may not rise, and a recipe with no entry starts at zero. When a count
//! falls, the test fails until the baseline is lowered, so the gain is locked in:
//! `UPDATE_CONTEXT_SELECTOR_BASELINE=1 cargo test -p design-data-core --test context_selector_baseline`

use std::collections::BTreeMap;
use std::path::PathBuf;

use design_data_core::graph::TokenGraph;
use design_data_core::status::status_report;

fn data_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data")
}

fn baseline_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/context-selector-baseline.json")
}

/// Components that have a recipe and at least one `context` selector.
fn actual_counts() -> BTreeMap<String, usize> {
    let d = data_dir();
    let mut graph = TokenGraph::from_json_dir_with_catalogs(
        &d.join("tokens"),
        Some(&d.join("mode-sets")),
        Some(&d.join("components")),
    )
    .expect("tokens")
    .with_relationships(
        TokenGraph::load_spec_relationships(&d.join("relationships")).expect("relationships"),
    );
    graph.visuals = TokenGraph::load_spec_visuals(&d.join("visuals")).expect("visuals");
    status_report(&graph)
        .into_iter()
        .filter(|s| s.context_selectors > 0)
        .map(|s| (s.component, s.context_selectors))
        .collect()
}

#[test]
fn context_selector_counts_match_the_baseline() {
    let actual = actual_counts();

    if std::env::var_os("UPDATE_CONTEXT_SELECTOR_BASELINE").is_some() {
        let json = serde_json::to_string_pretty(&actual).unwrap() + "\n";
        std::fs::write(baseline_path(), json).expect("write baseline");
        return;
    }

    let baseline: BTreeMap<String, usize> = serde_json::from_str(
        &std::fs::read_to_string(baseline_path()).expect("read context-selector-baseline.json"),
    )
    .expect("parse baseline");

    let mut problems = Vec::new();
    for name in actual.keys().chain(baseline.keys()) {
        let have = actual.get(name).copied().unwrap_or(0);
        let allowed = baseline.get(name).copied().unwrap_or(0);
        if have > allowed {
            problems.push(format!(
                "{name}: {have} context selectors, baseline allows {allowed}. Bind the relationship by part, between or attribute instead."
            ));
        } else if have < allowed {
            problems.push(format!(
                "{name}: {have} context selectors, baseline is {allowed}. Lower the baseline (UPDATE_CONTEXT_SELECTOR_BASELINE=1) to keep the improvement."
            ));
        }
    }
    problems.sort();
    problems.dedup();
    assert!(problems.is_empty(), "\n{}\n", problems.join("\n"));
}
