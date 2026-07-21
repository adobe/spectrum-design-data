// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Internal builder helpers for the wizard — extracted from `wizard.rs` to keep
//! the parent module within the 800-LOC cap enforced by `tests/budget.rs` (GH #1018).

use std::path::{Path, PathBuf};

use design_data_core::graph::{Layer, ModeSetRecord, TokenGraph};
use design_data_core::suggest;
use design_data_core::write::cascade_target_filename;
use tui_input::Input;

use super::{ClassificationDraft, ValueKind, ValueRow};

/// Derive the cascade target file path from `property` inside `dataset_path`.
///
/// Routes to `{dataset_path}/tokens/{property}.tokens.json` — the cascade
/// convention used by Phase B.  The legacy flat-file routing
/// (`foundation.json` / `platform.json` / `product.json`) is no longer used
/// for new tokens authored through the cascade write path.
///
/// The `layer` parameter is retained for the call-site signature so the
/// classification screen's layer selector can remain in the UI while the
/// layer-routing → cascade-routing migration is completed; it is otherwise
/// unused here.
pub(super) fn resolve_target_file(_layer: Layer, property: &str, dataset_path: &Path) -> PathBuf {
    dataset_path
        .join("tokens")
        .join(cascade_target_filename(property))
}

/// Scan the graph for a token whose `name.property` matches `property` and
/// return its `$schema` URL.
///
/// Delegates to [`design_data_core::graph::TokenGraph::infer_schema_url`].
pub(super) fn infer_schema_url(graph: &TokenGraph, property: &str) -> Option<String> {
    graph.infer_schema_url(property)
}

/// Convert TUI classification name fields into the serializable DTO shape consumed by
/// [`design_data_core::authoring::draft::build_name_object`].
pub(super) fn classification_to_name_dtos(
    classification: &ClassificationDraft,
) -> Vec<design_data_core::authoring::draft::NameFieldDto> {
    classification
        .name_fields
        .iter()
        .map(|f| design_data_core::authoring::draft::NameFieldDto {
            key: f.key.clone(),
            value: f.value.value().trim().to_string(),
        })
        .collect()
}

/// Convert TUI value rows into the serializable DTO shape consumed by
/// [`design_data_core::authoring::draft::build_value_fields`].
///
/// `tui_input::Input` collapses to `String` on the boundary, mirroring the
/// `WizardState` → `WizardDraft` conversion in `wizard_draft::to_draft`.
pub(super) fn value_rows_to_dtos(
    rows: &[ValueRow],
) -> Vec<design_data_core::authoring::draft::ValueRowDto> {
    rows.iter()
        .map(|r| design_data_core::authoring::draft::ValueRowDto {
            mode_combo: r.mode_combo.clone(),
            kind: r.kind,
            alias_target: r.alias_target.value().to_string(),
            literal: r.literal.value().to_string(),
        })
        .collect()
}

/// Build Screen 3 value rows from a graph's mode sets.
///
/// Produces the Cartesian product of all mode values.  If the graph has no
/// mode sets, a single "default" row is returned.
pub(super) fn build_value_rows(
    mode_sets: &[ModeSetRecord],
    graph: &TokenGraph,
    intent: &str,
) -> Vec<ValueRow> {
    let combos = cartesian_product(mode_sets);
    if combos.is_empty() {
        return vec![ValueRow {
            mode_combo: vec![],
            kind: ValueKind::Alias,
            alias_target: seed_alias(graph, intent, None),
            literal: Input::default(),
        }];
    }
    combos
        .into_iter()
        .map(|combo| {
            let property_hint: Option<String> = None; // refined in M4 with primer
            ValueRow {
                mode_combo: combo,
                kind: ValueKind::Alias,
                alias_target: seed_alias(graph, intent, property_hint.as_deref()),
                literal: Input::default(),
            }
        })
        .collect()
}

fn seed_alias(graph: &TokenGraph, intent: &str, property_hint: Option<&str>) -> Input {
    let suggestions = suggest::suggest(graph, intent, property_hint, 1);
    if let Some(top) = suggestions.into_iter().next() {
        Input::from(top.display_name())
    } else {
        Input::default()
    }
}

#[cfg(test)]
mod seed_alias_tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn seed_alias_uses_readable_legacy_key_for_cascade_token() {
        // Cascade tokens are keyed "<file>:<index>" in the graph, not a
        // readable name — seed_alias must resolve to the name object's
        // legacyKey, never leak that raw graph key into the wizard input.
        let graph = TokenGraph::from_pairs(vec![(
            "color-aliases.tokens.json:0".to_string(),
            PathBuf::from("color-aliases.tokens.json"),
            json!({
                "name": {
                    "colorRole": "accent",
                    "property": "background-color",
                    "state": "default",
                    "legacyKey": "accent-background-color-default",
                }
            }),
        )]);

        let seeded = seed_alias(&graph, "accent background color", None);
        assert_eq!(seeded.value(), "accent-background-color-default");
    }
}

/// Cartesian product of mode sets → list of mode-combo vectors.
fn cartesian_product(mode_sets: &[ModeSetRecord]) -> Vec<Vec<(String, String)>> {
    let mut result: Vec<Vec<(String, String)>> = vec![vec![]];
    for ms in mode_sets {
        let mut next = Vec::new();
        for combo in &result {
            for mode in &ms.modes {
                let mut new_combo = combo.clone();
                new_combo.push((ms.name.clone(), mode.clone()));
                next.push(new_combo);
            }
        }
        result = next;
    }
    result
}
