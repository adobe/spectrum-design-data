// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Ratchet for the visual recipe lints (SPEC-066..070).
//!
//! The lints are warnings, so `validate` stays green while the existing recipes
//! are migrated. This test keeps the debt from growing: each (rule, recipe)
//! count must equal the committed baseline, so a new warning fails the test and
//! an improvement must be locked in by lowering the baseline. A recipe that is
//! not in the baseline (a new recipe) must have no warnings.
//!
//! Regenerate after fixing recipes with:
//! `UPDATE_RECIPE_BASELINE=1 cargo test -p design-data-core --test recipe_lint_baseline`

use std::collections::{BTreeMap, HashSet};
use std::path::PathBuf;

use design_data_core::schema::SchemaRegistry;
use design_data_core::validate::validate_all_with_full_options;

const RULES: &[&str] = &["SPEC-066", "SPEC-067", "SPEC-068", "SPEC-069", "SPEC-070"];

type Counts = BTreeMap<String, BTreeMap<String, usize>>;

fn data_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data")
}

fn baseline_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/recipe-lint-baseline.json")
}

fn actual_counts() -> Counts {
    let d = data_dir();
    let registry =
        SchemaRegistry::load_legacy_token_schemas(&d.join("../design-data-spec/schemas"))
            .expect("schemas");
    let report = validate_all_with_full_options(
        &d.join("tokens"),
        &registry,
        &HashSet::new(),
        Some(&d.join("mode-sets")),
        Some(&d.join("components")),
        None,
        None,
        Some(&d.join("relationships")),
        Some(&d.join("visuals")),
    )
    .expect("validate");
    let mut counts = Counts::new();
    for diag in report.errors.iter().chain(report.warnings.iter()) {
        let Some(rule) = diag.rule_id.as_deref().filter(|r| RULES.contains(r)) else {
            continue;
        };
        let recipe = diag
            .file
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("?")
            .to_string();
        *counts
            .entry(rule.to_string())
            .or_default()
            .entry(recipe)
            .or_default() += 1;
    }
    counts
}

#[test]
fn recipe_lint_warnings_match_the_baseline() {
    let actual = actual_counts();

    if std::env::var_os("UPDATE_RECIPE_BASELINE").is_some() {
        let json = serde_json::to_string_pretty(&actual).unwrap() + "\n";
        std::fs::write(baseline_path(), json).expect("write baseline");
        return;
    }

    let baseline: Counts = serde_json::from_str(
        &std::fs::read_to_string(baseline_path()).expect("read recipe-lint-baseline.json"),
    )
    .expect("parse baseline");

    let mut problems = Vec::new();
    let rules: std::collections::BTreeSet<&String> = actual.keys().chain(baseline.keys()).collect();
    for rule in rules {
        let empty = BTreeMap::new();
        let (a, b) = (
            actual.get(rule).unwrap_or(&empty),
            baseline.get(rule).unwrap_or(&empty),
        );
        let recipes: std::collections::BTreeSet<&String> = a.keys().chain(b.keys()).collect();
        for recipe in recipes {
            let (have, allowed) = (
                a.get(recipe).copied().unwrap_or(0),
                b.get(recipe).copied().unwrap_or(0),
            );
            if have > allowed {
                problems.push(format!(
                    "{rule} {recipe}: {have} warnings, baseline allows {allowed}. Fix the new warnings."
                ));
            } else if have < allowed {
                problems.push(format!(
                    "{rule} {recipe}: {have} warnings, baseline is {allowed}. Lower the baseline (UPDATE_RECIPE_BASELINE=1) to keep the improvement."
                ));
            }
        }
    }
    assert!(problems.is_empty(), "\n{}\n", problems.join("\n"));
}
