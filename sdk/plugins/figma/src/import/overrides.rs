// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! [`build_import_overrides`]: emit a manifest `overrides` array from a
//! Figma Variables snapshot's currently-diverged values.

use std::collections::HashMap;

use serde_json::Value;

use super::naming::invert_name;
use super::resolve::{collapse_modes, diff_against_source, record_is_font_name, record_is_opacity};
use crate::types::VariablesMeta;
use design_data_core::graph::TokenGraph;

/// Summary of one import run.
#[derive(Debug, Default)]
pub struct ImportSummary {
    /// Overrides emitted because the Figma value diverged from the source.
    pub overrides_emitted: usize,
    /// Variables whose Figma value already matches the resolved source.
    pub unchanged: usize,
    /// Variable names that didn't invert to a known token (renamed with no
    /// mapping entry, non-legacy-shaped, or net-new in Figma).
    pub unmapped: Vec<String>,
    /// Variables whose modes disagree — a manifest override is single-valued
    /// and can't express per-mode differences, so these are reported, not applied.
    pub multimode_divergent: Vec<String>,
    /// Variables whose value couldn't be converted (unresolved alias, or a
    /// resolved type this importer doesn't handle).
    pub unconvertible: Vec<String>,
}

/// Build a manifest `overrides` array from Figma's current variable values.
///
/// `renames` is the reversed name-mapping artifact (Figma name → legacy key) —
/// invert the map `figma audit`/`figma export --mapping` uses. A variable not
/// covered by it falls back to the default convention: everything after the
/// first `/` in its name is the legacy key.
pub fn build_import_overrides(
    meta: &VariablesMeta,
    graph: &TokenGraph,
    renames: Option<&HashMap<String, String>>,
) -> (Vec<Value>, ImportSummary) {
    let mut overrides = Vec::new();
    let mut summary = ImportSummary::default();

    let mut variables: Vec<&crate::types::FigmaVariable> =
        meta.variables.values().filter(|v| !v.remote).collect();
    variables.sort_by(|a, b| a.name.cmp(&b.name));

    for variable in variables {
        let Some(legacy_key) = invert_name(&variable.name, renames) else {
            summary.unmapped.push(variable.name.clone());
            continue;
        };
        let Some(record) = graph.resolve_alias_key(&legacy_key) else {
            summary.unmapped.push(variable.name.clone());
            continue;
        };

        let collapsed = match collapse_modes(variable, meta) {
            Ok(Some(v)) => v,
            Ok(None) => {
                summary.multimode_divergent.push(variable.name.clone());
                continue;
            }
            Err(()) => {
                summary.unconvertible.push(variable.name.clone());
                continue;
            }
        };

        // ponytail: a manifest override is single-valued, so there's no scale
        // to align to here the way diff_values does below — leave this arbitrary
        // scale-entry pick as-is; a per-scale override target is a separate,
        // thornier design question that hasn't come up in practice.
        let leaf = record.resolve_leaf(graph);
        let source_value = leaf.raw.get("value").cloned();
        let is_opacity = record_is_opacity(leaf);
        let is_font_name = record_is_font_name(leaf);
        match diff_against_source(
            &variable.resolved_type,
            &collapsed,
            source_value.as_ref(),
            is_opacity,
            is_font_name,
        ) {
            Ok(None) => summary.unchanged += 1,
            Ok(Some(value)) => {
                let target = record.uuid.clone().unwrap_or_else(|| record.name.clone());
                overrides.push(serde_json::json!({ "target": target, "value": value }));
                summary.overrides_emitted += 1;
            }
            Err(()) => summary.unconvertible.push(variable.name.clone()),
        }
    }

    (overrides, summary)
}
