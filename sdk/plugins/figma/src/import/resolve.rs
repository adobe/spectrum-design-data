// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Shared core: resolving a Figma variable's (possibly per-mode, possibly
//! aliased) value to a concrete literal, resolving the design-data value to
//! compare it against, and comparing the two. [`overrides`](super::overrides),
//! [`diff`](super::diff), and [`pair`](super::pair) all build on this.

use std::collections::HashMap;

use serde_json::Value;

use crate::color::{format_color, parse_color};
use crate::mapping::figma_opacity_to_fraction;
use crate::mapping::{FONT_STYLE, FONT_WEIGHT, OPACITY};
use crate::types::{FigmaColor, FigmaVariable, VariablesMeta};
use design_data_core::graph::TokenGraph;

/// Whether `leaf`'s (already alias-resolved) schema is the opacity schema.
pub(super) fn record_is_opacity(leaf: &design_data_core::graph::TokenRecord) -> bool {
    leaf.raw
        .get("$schema")
        .and_then(Value::as_str)
        .is_some_and(|s| s.ends_with(OPACITY))
}

/// Whether `leaf`'s (already alias-resolved) schema is a font-weight/style
/// token, whose STRING value is compared name-insensitively
/// (`canon_font_name`) rather than verbatim.
pub(super) fn record_is_font_name(leaf: &design_data_core::graph::TokenRecord) -> bool {
    leaf.raw
        .get("$schema")
        .and_then(Value::as_str)
        .is_some_and(|s| s.ends_with(FONT_STYLE) || s.ends_with(FONT_WEIGHT))
}

/// Canonicalize a font-weight/style name for comparison: casing and
/// kebab-case/space punctuation aren't meaningful ("extra-bold" == "ExtraBold"
/// == "Extra Bold"), and "normal" is Figma's "Regular" — the only such
/// synonym seen in the corpus (ponytail: add more, e.g. "oblique", only if
/// they show up).
fn canon_font_name(s: &str) -> String {
    let s = s.to_lowercase().replace(['-', ' '], "");
    if s == "normal" {
        "regular".to_string()
    } else {
        s
    }
}

/// `raw`'s scale/mode-set anchor, checking both the token-side `conceptId`
/// (`tokens/*.tokens.json`) and the CTR-side camelCase `setUuid`
/// (`relationships/*.json`, see `graph.rs`'s `reindex_relationship_tokens`
/// doc) — a CTR-only `record`/`leaf` (no owning token, resolved via
/// `resolve_relationship_ref`) carries its raw straight from the
/// relationship record, so only checking `conceptId` silently treats it as
/// single-mode everywhere this is read.
pub(super) fn record_concept_id(raw: &Value) -> Option<&str> {
    raw.get("conceptId")
        .or_else(|| raw.get("setUuid"))
        .and_then(Value::as_str)
}

/// The Figma mode name a scale-set token's `name.scale` field would match
/// ("Desktop" -> "desktop"), used to align a per-scale-divergent design-data
/// token to the one Figma mode actually present, instead of an arbitrary
/// scale entry. Only applied when the variable has exactly one populated
/// mode — with more than one, which scale to align to is ambiguous
/// (ponytail: no case in the corpus needs that; add it if one shows up).
fn figma_mode_scale(variable: &FigmaVariable, meta: &VariablesMeta) -> Option<String> {
    if variable.values_by_mode.len() != 1 {
        return None;
    }
    let mode_id = variable.values_by_mode.keys().next()?;
    let collection = meta
        .variable_collections
        .get(&variable.variable_collection_id)?;
    collection
        .modes
        .iter()
        .find(|m| &m.mode_id == mode_id)
        .map(|m| m.name.to_lowercase())
}

/// The design-data value to compare a Figma variable against: aligned to the
/// variable's own scale (e.g. Desktop -> "desktop") when `leaf` is a
/// scale-set token (`conceptId` present) that diverges per scale — otherwise
/// an arbitrary scale entry could be compared against a specific Figma mode
/// and false-positive (or false-negative) the comparison. Falls back to
/// `leaf`'s own value when there's no scale to align to, or alignment fails.
pub(super) fn scale_aligned_source_value(
    variable: &FigmaVariable,
    meta: &VariablesMeta,
    graph: &TokenGraph,
    leaf: &design_data_core::graph::TokenRecord,
) -> Option<Value> {
    let scale_source_value = figma_mode_scale(variable, meta).and_then(|scale| {
        if let Some(values) = leaf.raw.get("ctrScaleValues").and_then(Value::as_object) {
            return values.get(&scale).cloned();
        }
        let concept_id = record_concept_id(&leaf.raw)?;
        resolve_set_member_in_context(graph, concept_id, "scale", &scale)
    });
    scale_source_value.or_else(|| leaf.raw.get("value").cloned())
}

/// The axis (e.g. `scale`, `colorScheme`, `contrast`) `record` was itself
/// disambiguated on, as a one-entry context map — `None` when `record`
/// carries none of `graph.mode_sets`'s declared fields (an ordinary,
/// unambiguous token). Lets a caller keep an alias chain pinned to the same
/// axis `record` was picked for, instead of dropping it the moment a hop
/// lands on another `conceptId`. Derived from `graph.mode_sets` (matching
/// [`multimode_name_field`]'s pattern below) rather than a hardcoded field
/// list, so a token disambiguated by any declared mode set — not just
/// `scale`/`colorScheme` — is covered without a code change.
pub(super) fn default_source_context(
    graph: &TokenGraph,
    record: &design_data_core::graph::TokenRecord,
) -> Option<HashMap<String, String>> {
    let name = record.raw.get("name")?;
    graph.mode_sets.iter().find_map(|mode_set| {
        name.get(&mode_set.name)
            .and_then(Value::as_str)
            .map(|mode| HashMap::from([(mode_set.name.clone(), mode.to_string())]))
    })
}

/// Resolve `conceptId`'s member whose `name.<field>` matches `mode_key`,
/// re-verifying the winner rather than trusting it blindly:
/// `resolve_concept_in_context` degrades to an arbitrary tie-broken member when
/// none actually matches (e.g. a Figma mode like "Tablet" with no
/// design-data counterpart), so only a candidate whose own `field` really
/// agrees is accepted. Resolves through any alias (`resolve_leaf`) before
/// reading `value`, so an aliased set member is followed rather than
/// compared as its own raw record.
pub(super) fn resolve_set_member_in_context(
    graph: &TokenGraph,
    concept_id: &str,
    field: &str,
    mode_key: &str,
) -> Option<Value> {
    let ctx = HashMap::from([(field.to_string(), mode_key.to_string())]);
    let candidate = graph.resolve_concept_in_context(concept_id, &ctx)?;
    let candidate_val = candidate.raw.get("name")?.get(field)?.as_str()?;
    (candidate_val == mode_key).then(|| {
        candidate
            .resolve_leaf_in_context(graph, &ctx)
            .raw
            .get("value")
            .cloned()
    })?
}

/// The `name` field a genuinely multi-mode variable's design-data set is
/// discriminated by, keyed by the lowercased Figma mode name it corresponds
/// to. Looked up from `graph.mode_sets` (e.g. `colorScheme` for
/// light/dark/wireframe, `scale` for desktop/mobile) so each mode set's own
/// `name`/`modes` stay the single source of truth — see
/// [`figma_mode_scale`]/[`scale_aligned_source_value`] for the single-mode
/// counterpart of scale.
pub(super) fn multimode_name_field<'g>(graph: &'g TokenGraph, mode_name: &str) -> Option<&'g str> {
    graph
        .mode_sets
        .iter()
        .find(|m| m.modes.iter().any(|mode| mode == mode_name))
        .map(|m| m.name.as_str())
}

/// The unit suffixes recognized on a dimension-like token value, matching the
/// ones stripped on export (`mapping.rs`'s `value_to_figma`), plus `dp` —
/// recognized here for comparison only; export still never strips it (see
/// `value_to_figma`'s FLOAT arm).
const UNIT_SUFFIXES: &[&str] = &["rem", "em", "px", "%", "dp"];

/// Collapse a variable's per-mode values into one comparable value, only when
/// every mode agrees (within floating-point tolerance for numeric/color data).
///
/// `Ok(None)` means modes diverge — the caller reports and skips it, since a
/// manifest override has no per-mode dimension. `Err(())` means a mode holds
/// a `VARIABLE_ALIAS` this importer couldn't resolve (see
/// [`resolve_figma_value`]) — a broken reference or a cyclic/too-deep chain.
pub(super) fn collapse_modes(
    variable: &FigmaVariable,
    meta: &VariablesMeta,
) -> Result<Option<Value>, ()> {
    let mut values = variable.values_by_mode.values();
    let Some(first) = values.next() else {
        return Ok(None);
    };
    let first = resolve_figma_value(meta, first, 0, None).ok_or(())?;
    for other in values {
        let other = resolve_figma_value(meta, other, 0, None).ok_or(())?;
        if !values_agree(&first, &other) {
            return Ok(None);
        }
    }
    Ok(Some(first))
}

pub(super) fn is_alias(v: &Value) -> bool {
    v.get("type").and_then(Value::as_str) == Some("VARIABLE_ALIAS")
}

/// Cap on `VARIABLE_ALIAS` hops [`resolve_figma_value`] will follow, guarding
/// against a cyclic or pathologically deep chain. S2.Color-theme's real
/// chains are 1-3 hops deep; this is generous headroom, not a tuned figure.
pub(super) const MAX_ALIAS_DEPTH: usize = 16;

/// Resolve a variable value to a concrete literal, following `VARIABLE_ALIAS`
/// chains through `meta.variables`. `mode_name` (case-insensitive) picks which
/// of the target's own modes to read when the target has more than one — e.g.
/// resolving `.Color theme`'s Dark mode through an alias must read the
/// target's Dark mode too, not its default. Falls back to the target
/// collection's default mode when `mode_name` is `None` or has no match
/// there (Modeless collections like S2.Color-theme have exactly one mode, so
/// "default" is the only choice; `collapse_modes` relies on this fallback).
pub(super) fn resolve_figma_value(
    meta: &VariablesMeta,
    value: &Value,
    depth: usize,
    mode_name: Option<&str>,
) -> Option<Value> {
    if !is_alias(value) {
        return Some(value.clone());
    }
    if depth >= MAX_ALIAS_DEPTH {
        return None;
    }
    let target_id = value.get("id").and_then(Value::as_str)?;
    let target = meta.variables.get(target_id)?;
    let collection = meta
        .variable_collections
        .get(&target.variable_collection_id)?;
    let mode_id = mode_name
        .and_then(|name| {
            collection
                .modes
                .iter()
                .find(|m| m.name.eq_ignore_ascii_case(name))
        })
        .map_or(&collection.default_mode_id, |m| &m.mode_id);
    let next = target.values_by_mode.get(mode_id)?;
    resolve_figma_value(meta, next, depth + 1, mode_name)
}

fn values_agree(a: &Value, b: &Value) -> bool {
    match (color_from(a), color_from(b)) {
        (Some(ca), Some(cb)) => colors_agree(&ca, &cb),
        _ => match (a.as_f64(), b.as_f64()) {
            (Some(x), Some(y)) => approx_eq(x, y),
            _ => a == b,
        },
    }
}

pub(super) fn color_from(v: &Value) -> Option<FigmaColor> {
    if !v.is_object() {
        return None;
    }
    serde_json::from_value(v.clone()).ok()
}

pub(super) fn colors_agree(a: &FigmaColor, b: &FigmaColor) -> bool {
    approx_eq(a.r, b.r) && approx_eq(a.g, b.g) && approx_eq(a.b, b.b) && approx_eq(a.a, b.a)
}

/// Absolute tolerance for numeric agreement between a design-data value and
/// a Figma-authored one. Wider than float-arithmetic noise (`1e-6`) on
/// purpose: a manually authored Figma library's FLOAT variables round-trip
/// through 32-bit float storage on top of being hand-typed to ~3 decimal
/// places, so an intended `0` or `8/9` can arrive as `0.0010000000474974513`
/// or `0.8889999985694885` — noise, not a real disagreement. `2e-3` clears
/// that noise with headroom below the smallest real mismatch seen in
/// practice (a 2px scale-step drift).
pub(super) const VALUE_TOLERANCE: f64 = 2e-3;

pub(super) fn approx_eq(a: f64, b: f64) -> bool {
    (a - b).abs() < VALUE_TOLERANCE
}

/// Parse a Spectrum value string's leading number and its unit suffix, e.g.
/// `"8px"` → `(8.0, "px")`. Mirrors the suffix list `value_to_figma` strips
/// on export.
fn parse_float_with_unit(s: &str) -> Option<(f64, &str)> {
    let s = s.trim();
    for suffix in UNIT_SUFFIXES {
        if let Some(n) = s.strip_suffix(suffix).and_then(|n| n.parse::<f64>().ok()) {
            return Some((n, suffix));
        }
    }
    s.parse::<f64>().ok().map(|n| (n, ""))
}

/// Compare a collapsed Figma value against the token's currently-resolved
/// source value, and produce the override `value` to emit if they differ.
///
/// `Ok(None)` = unchanged, no override needed. `Err(())` = this importer
/// can't convert `resolved_type` (or the Figma value doesn't match it).
pub(super) fn diff_against_source(
    resolved_type: &str,
    figma_value: &Value,
    source: Option<&Value>,
    is_opacity: bool,
    is_font_name: bool,
) -> Result<Option<Value>, ()> {
    let source_str = source.and_then(Value::as_str);
    match resolved_type {
        "COLOR" => {
            let color = color_from(figma_value).ok_or(())?;
            if let Some(source_color) = source_str.and_then(|s| parse_color(s).ok()) {
                if colors_agree(&color, &source_color) {
                    return Ok(None);
                }
            }
            Ok(Some(Value::String(format_color(&color))))
        }
        "FLOAT" => {
            let raw_n = figma_value.as_f64().ok_or(())?;
            let n = if is_opacity {
                figma_opacity_to_fraction(raw_n)
            } else {
                raw_n
            };
            if let Some(source_n) = source.and_then(Value::as_f64) {
                if approx_eq(n, source_n) {
                    return Ok(None);
                }
                return Ok(Some(Value::Number(
                    serde_json::Number::from_f64(n).ok_or(())?,
                )));
            }
            if let Some((source_n, unit)) = source_str.and_then(parse_float_with_unit) {
                if approx_eq(n, source_n) {
                    return Ok(None);
                }
                return Ok(Some(Value::String(format!("{n}{unit}"))));
            }
            Ok(Some(Value::Number(
                serde_json::Number::from_f64(n).ok_or(())?,
            )))
        }
        "STRING" => {
            let s = figma_value.as_str().ok_or(())?;
            if source_str == Some(s) {
                return Ok(None);
            }
            if is_font_name {
                if let Some(src) = source_str {
                    if canon_font_name(src) == canon_font_name(s) {
                        return Ok(None);
                    }
                }
            }
            Ok(Some(Value::String(s.to_string())))
        }
        _ => Err(()),
    }
}
