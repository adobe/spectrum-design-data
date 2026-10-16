// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Inverting a Figma variable name back to its source legacy key — the
//! reverse of the exporter's naming convention (`mapping.rs`'s
//! `{prefix}/{legacyKey}`), plus the Typography-collection special cases and
//! the alias-chain fallback for variables that are themselves aliases.

use std::collections::HashMap;

use serde_json::Value;

use super::resolve::{is_alias, MAX_ALIAS_DEPTH};
use crate::types::VariablesMeta;
use design_data_core::graph::TokenGraph;

/// Invert a Figma variable name back to its legacy token key: the rename
/// map takes precedence, else a Typography-leaf-specific rule (see
/// [`normalize_typography_leaf`]), else a Typography-grouping rule (see
/// [`normalize_typography_grouping`]), else strip everything up to and
/// including the first `/` (the exact reverse of
/// `format!("{prefix}/{token_name}")`).
///
/// A nested Figma name (e.g. `Palette/blue/100`, from a source collection
/// whose names cascade multiple path segments) leaves further `/`s in the
/// stripped tail — normalize those to `-` since legacy keys are dash-form
/// (`blue-100`). Slash-form keys never resolve today, so this is additive.
pub(super) fn invert_name(
    figma_name: &str,
    renames: Option<&HashMap<String, String>>,
) -> Option<String> {
    renames
        .and_then(|m| m.get(figma_name))
        .cloned()
        .or_else(|| normalize_typography_leaf(figma_name))
        .or_else(|| normalize_typography_grouping(figma_name))
        .or_else(|| {
            figma_name
                .split_once('/')
                .map(|(_, key)| key.replace('/', "-"))
        })
}

/// Resolve a Figma variable that is itself a `VARIABLE_ALIAS` through to the
/// design-data record its *alias chain* eventually maps to. Some collections
/// (Layout, for one) model every variable as a semantic alias into
/// `.Platform scale` (e.g. `Alert dialog/Maximum width` ->
/// `platformScale/alert-dialog-maximum-width`) — the variable's own
/// hierarchical name never inverts to a real legacy key, but a name further
/// down the chain does via the ordinary [`invert_name`] rules. The
/// intermediate target itself is sometimes just another alias (e.g. Layout's
/// `Banner/Gap/Horizontal` -> `platformScale/banner-gap-horizontal` ->
/// `platformScale/spacing-400`, where only the final hop's name inverts to a
/// real graph key), so each hop is tried in turn rather than only the first.
///
/// Fallback only: callers try direct name inversion first, so this can only
/// turn a would-be `figma_only` variable into a match/value-mismatch, never
/// regress an existing one. Capped at [`MAX_ALIAS_DEPTH`] hops, the same guard
/// `resolve_figma_value` uses against a cyclic or pathologically deep chain.
///
/// Reads the variable's value from its collection's `default_mode_id` — the
/// same mode `resolve_figma_value` reads for an alias target — rather than an
/// arbitrary `HashMap` entry, since a multi-mode variable's iteration order
/// isn't guaranteed to land on the mode that actually holds the alias.
/// `renames` is the same reversed name-mapping `diff_values` threads into its
/// own direct `invert_name` call, applied here to each hop's target name.
pub(super) fn resolve_alias_target<'a>(
    variable: &crate::types::FigmaVariable,
    meta: &VariablesMeta,
    graph: &'a TokenGraph,
    renames: Option<&HashMap<String, String>>,
) -> Option<(String, &'a design_data_core::graph::TokenRecord)> {
    let collection = meta
        .variable_collections
        .get(&variable.variable_collection_id)?;
    let mut value = variable.values_by_mode.get(&collection.default_mode_id)?;
    if !is_alias(value) {
        return None;
    }
    for _ in 0..MAX_ALIAS_DEPTH {
        let target_id = value.get("id").and_then(Value::as_str)?;
        let target = meta.variables.get(target_id)?;
        if let Some(key) = invert_name(&target.name, renames) {
            if let Some(record) = graph
                .resolve_alias_key(&key)
                .or_else(|| graph.resolve_relationship_ref(&key))
            {
                return Some((key, record));
            }
        }
        let target_collection = meta
            .variable_collections
            .get(&target.variable_collection_id)?;
        let next = target
            .values_by_mode
            .get(&target_collection.default_mode_id)?;
        if !is_alias(next) {
            return None;
        }
        value = next;
    }
    None
}

/// Map an atomic Typography-collection Figma name to its exact design-data
/// legacy key, for the handful of prefixes whose naming convention diverges
/// from the generic `{prefix}/{legacyKey}` one `invert_name`'s fallback
/// assumes. `resolve_alias_key` does exact lookup only (no fuzzy matching),
/// so this must reproduce the legacy key verbatim.
///
/// Only the five atomic leaf prefixes are handled here — the Typography
/// collection's grouping variables (`Heading/…`, `Body/…`, etc.) invert via
/// [`normalize_typography_grouping`] instead, to their Component/Token
/// Relationship (CTR) `legacyKey` in `packages/design-data/relationships/`.
fn normalize_typography_leaf(figma_name: &str) -> Option<String> {
    let slug = |name: &str| name.to_lowercase().replace(' ', "-");
    if let Some(n) = figma_name.strip_prefix("Font size/") {
        return Some(format!("font-size-{n}"));
    }
    if let Some(n) = figma_name.strip_prefix("Line height/Font size ") {
        return Some(format!("line-height-font-size-{n}"));
    }
    if let Some(name) = figma_name.strip_prefix("Font weight/") {
        return Some(format!("{}-font-weight", slug(name)));
    }
    if let Some(name) = figma_name.strip_prefix("Font style/") {
        return Some(format!("{}-font-style", slug(name)));
    }
    if let Some(name) = figma_name.strip_prefix("Font family/") {
        return Some(format!("{}-font-family", slug(name)));
    }
    None
}

/// Map a Typography-grouping Figma name (`Heading/…`, `Body/…`, `Title/…`,
/// `Detail/…`, `Code/…`) to its Component/Token Relationship (CTR)
/// `legacyKey` in `packages/design-data/relationships/*.json`, resolved by
/// [`design_data_core::graph::TokenGraph::resolve_relationship_ref`]. Every grouping
/// shape (`{Type}/{Script}/[Strong/][Emphasized/]{Field}`,
/// `{Type}/[Emphasized/]{Field}`, `{Type}/Size/{Tier}`) reduces to the same
/// slug transform — verified against all 130 grouping variables in the
/// Typography collection.
fn normalize_typography_grouping(figma_name: &str) -> Option<String> {
    const PREFIXES: [&str; 5] = ["Heading/", "Body/", "Title/", "Detail/", "Code/"];
    if PREFIXES.iter().any(|p| figma_name.starts_with(p)) {
        return Some(figma_name.to_lowercase().replace(['/', ' '], "-"));
    }
    None
}
