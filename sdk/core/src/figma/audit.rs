// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Audit generated Figma Variable names against a real Figma snapshot.
//!
//! [`build_export_payload`] assumes `{prefix}/{legacyKey}` naming and only ever
//! targets the `.Color theme` and `.Platform scale` collections. This module
//! compares what it *would* generate (from a legacy token directory) against
//! the real names/collections captured in a Figma [`VariablesMeta`] snapshot
//! (see `sdk/core/tests/fixtures/figma/README.md`), producing the divergence
//! classes and coverage gaps that feed the name-mapping override artifact
//! (`spectrum-design-data-11k.4`).

use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;

use serde::Serialize;

use super::mapping::{build_export_payload, summarize_variables};
use super::types::VariablesMeta;
use super::FigmaError;

/// Coverage/divergence report for one Figma collection.
#[derive(Debug, Clone, Serialize, Default)]
pub struct CollectionAudit {
    pub collection_name: String,
    pub real_variable_count: usize,
    /// Whether the generator ever targets this collection at all.
    pub generator_covers: bool,
    /// Names present in both the real file and the generated payload.
    pub matched: usize,
    /// Real Figma variables the generator never emits — a coverage gap.
    pub figma_only: Vec<String>,
    /// Names the generator would CREATE that don't exist in Figma — a naming divergence.
    pub generated_only: Vec<String>,
}

/// Full audit report: per-collection coverage/divergence, the generator's own
/// skip buckets, and a seeded override scaffold for [`spectrum-design-data-11k.5`]-style
/// consumption.
#[derive(Debug, Clone, Serialize, Default)]
pub struct AuditReport {
    pub collections: Vec<CollectionAudit>,
    pub skipped_composite: Vec<String>,
    pub skipped_alias_unresolved: Vec<String>,
    pub skipped_unknown_schema: Vec<String>,
    pub skipped_unparseable_value: Vec<String>,
    /// `legacyKey` → proposed Figma name override, seeded (empty) for every
    /// `generated_only` divergence — each one needs a human decision before
    /// 11k.5 can consume it.
    pub overrides: BTreeMap<String, String>,
}

/// Compare the generator's output against a real Figma snapshot.
///
/// `existing` is the captured `VariablesMeta` (e.g. the 11k.3 baseline
/// fixture); `token_dir` is a legacy-format token directory — the shape
/// [`crate::legacy::convert_dir`] produces from cascade `.tokens.json` files,
/// not the cascade format itself.
pub fn audit_names(existing: &VariablesMeta, token_dir: &Path) -> Result<AuditReport, FigmaError> {
    let (body, summary) = build_export_payload(token_dir, existing, None)?;

    // Real variable names per collection, from the snapshot (non-remote only,
    // matching summarize_variables' existing convention). The real file has
    // multiple collections sharing a display name (a local one plus a
    // remote-library-linked stub, e.g. two "Iconography" entries) — union
    // their variable sets by name rather than overwrite, since HashMap
    // iteration order (and thus which one `summarize_variables` yields last)
    // is non-deterministic per process.
    let mut real_by_collection: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    for cs in summarize_variables(existing) {
        real_by_collection
            .entry(cs.collection.name.clone())
            .or_default()
            .extend(cs.variables.into_iter().map(|v| v.name));
    }

    // Generated names, grouped by collection name (looked up via the existing
    // meta's collection id -> name, since VariableAction only carries the id).
    let collection_name_by_id: BTreeMap<&str, &str> = existing
        .variable_collections
        .values()
        .map(|c| (c.id.as_str(), c.name.as_str()))
        .collect();

    let mut generated_by_collection: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    for va in &body.variables {
        let cname = collection_name_by_id
            .get(va.variable_collection_id.as_str())
            .copied()
            .unwrap_or("<unknown>");
        generated_by_collection
            .entry(cname.to_string())
            .or_default()
            .insert(va.name.clone());
    }

    // Keyed by legacy_key alone, shared across all collections: relies on
    // legacy keys not overlapping between `.Color theme` and `.Platform scale`
    // (true today — distinct token namespaces). If that ever changes, a
    // generated_only name in the second collection to touch a given key would
    // silently no-op against the first's entry.
    let mut overrides = BTreeMap::new();
    let mut collections = Vec::new();
    for (name, real_names) in &real_by_collection {
        let generated_set = generated_by_collection.get(name);
        let generator_covers = generated_set.is_some();
        let empty = BTreeSet::new();
        let generated_set = generated_set.unwrap_or(&empty);

        let matched = real_names.intersection(generated_set).count();
        let figma_only: Vec<String> = real_names.difference(generated_set).cloned().collect();
        let generated_only: Vec<String> = generated_set.difference(real_names).cloned().collect();

        for gname in &generated_only {
            // VariableAction.name is "{prefix}/{legacyKey}" (mapping.rs make_variable_action).
            if let Some((_, legacy_key)) = gname.split_once('/') {
                overrides.entry(legacy_key.to_string()).or_default();
            }
        }

        collections.push(CollectionAudit {
            collection_name: name.clone(),
            real_variable_count: real_names.len(),
            generator_covers,
            matched,
            figma_only,
            generated_only,
        });
    }

    Ok(AuditReport {
        collections,
        skipped_composite: summary.skipped_composite,
        skipped_alias_unresolved: summary.skipped_alias_unresolved,
        skipped_unknown_schema: summary.skipped_unknown_schema,
        skipped_unparseable_value: summary.skipped_unparseable_value,
        overrides,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::figma::types::{FigmaMode, FigmaVariable, FigmaVariableCollection};
    use serde_json::json;
    use std::collections::HashMap;
    use std::io::Write;

    /// A snapshot with the two generator-targeted collections plus a third
    /// ("Typography") the generator never touches — mirrors the real baseline
    /// fixture's shape (9 collections, only 2 covered).
    fn mock_meta_with_uncovered_collection() -> VariablesMeta {
        let mut variables = HashMap::new();
        variables.insert(
            "typo-var".into(),
            FigmaVariable {
                id: "typo-var".into(),
                name: "Typography/heading-size".into(),
                key: "k".into(),
                variable_collection_id: "col-typo".into(),
                resolved_type: "FLOAT".into(),
                values_by_mode: HashMap::new(),
                remote: false,
                description: String::new(),
                hidden_from_publishing: false,
                scopes: vec![],
                code_syntax: HashMap::new(),
            },
        );
        // A real .Color theme variable the legacy source doesn't define, so it
        // shows up as a figma_only coverage gap within a *covered* collection.
        variables.insert(
            "figma-only-color".into(),
            FigmaVariable {
                id: "figma-only-color".into(),
                name: "colorTheme/only-in-figma".into(),
                key: "k2".into(),
                variable_collection_id: "col-1".into(),
                resolved_type: "COLOR".into(),
                values_by_mode: HashMap::new(),
                remote: false,
                description: String::new(),
                hidden_from_publishing: false,
                scopes: vec![],
                code_syntax: HashMap::new(),
            },
        );
        // A real .Color theme variable that DOES match what the generator
        // produces from the "test-color" legacy token, so `matched` is non-zero.
        variables.insert(
            "matched-color".into(),
            FigmaVariable {
                id: "matched-color".into(),
                name: "colorTheme/test-color".into(),
                key: "k4".into(),
                variable_collection_id: "col-1".into(),
                resolved_type: "COLOR".into(),
                values_by_mode: HashMap::new(),
                remote: false,
                description: String::new(),
                hidden_from_publishing: false,
                scopes: vec![],
                code_syntax: HashMap::new(),
            },
        );

        VariablesMeta {
            variables,
            variable_collections: HashMap::from([
                (
                    "col-1".into(),
                    FigmaVariableCollection {
                        id: "col-1".into(),
                        name: ".Color theme".into(),
                        key: "k1".into(),
                        modes: vec![
                            FigmaMode {
                                mode_id: "m-light".into(),
                                name: "Light".into(),
                            },
                            FigmaMode {
                                mode_id: "m-dark".into(),
                                name: "Dark".into(),
                            },
                            FigmaMode {
                                mode_id: "m-wire".into(),
                                name: "Wireframe".into(),
                            },
                        ],
                        default_mode_id: "m-light".into(),
                        remote: false,
                        hidden_from_publishing: false,
                        variable_ids: vec![],
                    },
                ),
                (
                    "col-2".into(),
                    FigmaVariableCollection {
                        id: "col-2".into(),
                        name: ".Platform scale".into(),
                        key: "k2".into(),
                        modes: vec![FigmaMode {
                            mode_id: "m-desktop".into(),
                            name: "Desktop".into(),
                        }],
                        default_mode_id: "m-desktop".into(),
                        remote: false,
                        hidden_from_publishing: false,
                        variable_ids: vec![],
                    },
                ),
                (
                    "col-typo".into(),
                    FigmaVariableCollection {
                        id: "col-typo".into(),
                        name: "Typography".into(),
                        key: "k3".into(),
                        modes: vec![FigmaMode {
                            mode_id: "m-modeless".into(),
                            name: "Modeless".into(),
                        }],
                        default_mode_id: "m-modeless".into(),
                        remote: false,
                        hidden_from_publishing: false,
                        variable_ids: vec![],
                    },
                ),
            ]),
        }
    }

    #[test]
    fn uncovered_collection_and_coverage_gap_are_reported() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("colors.json");
        let mut f = std::fs::File::create(&path).unwrap();
        write!(
            f,
            "{}",
            json!({
                "test-color": {
                    "$schema": "https://example.com/color.json",
                    "value": "rgb(255, 0, 0)",
                    "uuid": "u1"
                },
                "test-size": {
                    "$schema": "https://example.com/dimension.json",
                    "value": "16px",
                    "uuid": "u2"
                }
            })
        )
        .unwrap();

        let meta = mock_meta_with_uncovered_collection();
        let report = audit_names(&meta, dir.path()).unwrap();

        let typo = report
            .collections
            .iter()
            .find(|c| c.collection_name == "Typography")
            .expect("Typography collection must be reported");
        assert!(
            !typo.generator_covers,
            "generator never targets Typography — must be reported as uncovered"
        );
        assert_eq!(typo.real_variable_count, 1);

        let color_theme = report
            .collections
            .iter()
            .find(|c| c.collection_name == ".Color theme")
            .expect(".Color theme must be reported");
        assert!(color_theme.generator_covers);
        assert_eq!(color_theme.matched, 1, "test-color should match 1:1");
        assert_eq!(
            color_theme.figma_only,
            vec!["colorTheme/only-in-figma".to_string()],
            "real variable the generator never emits must surface as a coverage gap"
        );

        let platform_scale = report
            .collections
            .iter()
            .find(|c| c.collection_name == ".Platform scale")
            .expect(".Platform scale must be reported");
        assert_eq!(
            platform_scale.generated_only,
            vec!["platformScale/test-size".to_string()],
            "test-size has no real counterpart, so the generator would create a name Figma doesn't have"
        );
        assert_eq!(
            report.overrides.get("test-size"),
            Some(&String::new()),
            "a generated_only name must seed the override scaffold with its stripped legacyKey"
        );
    }
}
