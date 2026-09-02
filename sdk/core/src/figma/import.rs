// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Convert a Figma Variables snapshot back into manifest `overrides` entries.
//!
//! Reverse of [`super::mapping::build_export_payload`]: for each non-remote
//! Figma variable, inverts its `{prefix}/{legacyKey}` name back to the source
//! token, collapses its per-mode values into one, and diffs that against the
//! token's currently-resolved value. An override is emitted only when the
//! Figma value has actually diverged — re-running import on an unedited file
//! produces an empty `overrides` array.

use std::collections::{BTreeSet, HashMap, HashSet};
use std::path::PathBuf;

use serde::Serialize;
use serde_json::Value;

use super::color::{format_color, parse_color};
use super::mapping::{
    build_export_payload, figma_opacity_to_fraction, FONT_STYLE, FONT_WEIGHT, OPACITY,
};
use super::types::{FigmaColor, FigmaVariable, VariablesMeta};
use super::FigmaError;
use crate::graph::TokenGraph;

/// Whether `leaf`'s (already alias-resolved) schema is the opacity schema.
fn record_is_opacity(leaf: &crate::graph::TokenRecord) -> bool {
    leaf.raw
        .get("$schema")
        .and_then(Value::as_str)
        .is_some_and(|s| s.ends_with(OPACITY))
}

/// Whether `leaf`'s (already alias-resolved) schema is a font-weight/style
/// token, whose STRING value is compared name-insensitively
/// (`canon_font_name`) rather than verbatim.
fn record_is_font_name(leaf: &crate::graph::TokenRecord) -> bool {
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
/// scale-set token (`set_uuid` present) that diverges per scale — otherwise
/// an arbitrary scale entry could be compared against a specific Figma mode
/// and false-positive (or false-negative) the comparison. Falls back to
/// `leaf`'s own value when there's no scale to align to, or alignment fails.
fn scale_aligned_source_value(
    variable: &FigmaVariable,
    meta: &VariablesMeta,
    graph: &TokenGraph,
    leaf: &crate::graph::TokenRecord,
) -> Option<Value> {
    let scale_source_value = figma_mode_scale(variable, meta).and_then(|scale| {
        let set_uuid = leaf.raw.get("set_uuid").and_then(Value::as_str)?;
        let ctx = HashMap::from([("scale".to_string(), scale.clone())]);
        let candidate = graph.resolve_set_in_context(set_uuid, &ctx)?;
        // `resolve_set_in_context` degrades to an arbitrary tie-broken
        // member when none actually matches `scale` (e.g. a Figma mode
        // like "Tablet" with no design-data counterpart) — only trust
        // the alignment when the candidate's own scale really agrees.
        let candidate_scale = candidate.raw.get("name")?.get("scale")?.as_str()?;
        (candidate_scale == scale).then(|| candidate.raw.get("value").cloned())?
    });
    scale_source_value.or_else(|| leaf.raw.get("value").cloned())
}

/// The unit suffixes recognized on a dimension-like token value, matching the
/// ones stripped on export (`mapping.rs`'s `value_to_figma`), plus `dp` —
/// recognized here for comparison only; export still never strips it (see
/// `value_to_figma`'s FLOAT arm).
const UNIT_SUFFIXES: &[&str] = &["rem", "em", "px", "%", "dp"];

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

    let mut variables: Vec<&FigmaVariable> =
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

/// One variable/token's classification in a [`DiffReport`].
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "class", rename_all = "kebab-case")]
pub enum DiffClass {
    /// Figma's value matches the manifest-resolved source.
    Match,
    /// Figma's value diverges from the manifest-resolved source.
    ValueMismatch { design_data: Value, figma: Value },
    /// A Figma variable with no corresponding design-data token.
    FigmaOnly,
    /// A design-data token the generator would export, but no matching
    /// Figma variable exists in the file.
    DesignDataOnly,
    /// Covered by neither an override (multi-mode divergent) nor a
    /// convertible value (unresolved alias, or an unhandled resolved type).
    SkippedUncovered { reason: String },
}

/// One entry in a [`DiffReport`]: a Figma variable name (or, for
/// [`DiffClass::DesignDataOnly`], the name the generator would produce)
/// paired with its classification.
#[derive(Debug, Clone, Serialize)]
pub struct DiffEntry {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub legacy_key: Option<String>,
    /// True when this variable's name came from the `--mapping` rename
    /// artifact rather than the default `{prefix}/{legacyKey}` convention.
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub renamed: bool,
    #[serde(flatten)]
    pub class: DiffClass,
}

/// Per-category totals for a [`DiffReport`], for quick scanning.
#[derive(Debug, Clone, Serialize, Default)]
pub struct DiffCounts {
    pub matched: usize,
    pub value_mismatch: usize,
    pub figma_only: usize,
    pub design_data_only: usize,
    pub renamed: usize,
    pub skipped_uncovered: usize,
}

/// Value-level diff report: every Figma variable and every design-data
/// token the generator would export, classified.
#[derive(Debug, Clone, Serialize, Default)]
pub struct DiffReport {
    /// Sorted by name for stable, script-friendly output.
    pub entries: Vec<DiffEntry>,
    pub counts: DiffCounts,
}

/// Read-only, value-level counterpart to [`build_import_overrides`]: instead
/// of emitting manifest overrides for divergent variables, classifies *every*
/// Figma variable and design-data token as match / value-mismatch /
/// figma-only / design-data-only / skipped-uncovered (with a `renamed` flag
/// when the `--mapping` artifact supplied the name).
///
/// `mapping` is the forward name-mapping artifact (legacy key → Figma name),
/// the same direction `figma export --mapping` and [`build_export_payload`]
/// use; this reverses it internally for the Figma-driven walk, which needs
/// the opposite direction (as `build_import_overrides` does).
///
/// The design-data-only pass reuses [`build_export_payload`] to compute the
/// set of Figma names the generator would produce (the same approach
/// `figma::audit::audit_names` uses for its `generated_only` bucket), so it
/// requires the file to contain the `.Color theme` and `.Platform scale`
/// collections `build_export_payload` targets.
pub fn diff_values(
    meta: &VariablesMeta,
    graph: &TokenGraph,
    tokens: &[(String, PathBuf, Value)],
    mapping: Option<&HashMap<String, String>>,
) -> Result<DiffReport, FigmaError> {
    let reversed: Option<HashMap<String, String>> =
        mapping.map(|m| m.iter().map(|(k, v)| (v.clone(), k.clone())).collect());

    let mut entries = Vec::new();
    let mut counts = DiffCounts::default();
    let mut seen: BTreeSet<String> = BTreeSet::new();

    let mut variables: Vec<&FigmaVariable> =
        meta.variables.values().filter(|v| !v.remote).collect();
    variables.sort_by(|a, b| a.name.cmp(&b.name));

    for variable in variables {
        seen.insert(variable.name.clone());
        let renamed = reversed
            .as_ref()
            .is_some_and(|m| m.contains_key(&variable.name));
        if renamed {
            counts.renamed += 1;
        }

        let Some(legacy_key) = invert_name(&variable.name, reversed.as_ref()) else {
            counts.figma_only += 1;
            entries.push(DiffEntry {
                name: variable.name.clone(),
                legacy_key: None,
                renamed,
                class: DiffClass::FigmaOnly,
            });
            continue;
        };
        let Some(record) = graph.resolve_alias_key(&legacy_key) else {
            counts.figma_only += 1;
            entries.push(DiffEntry {
                name: variable.name.clone(),
                legacy_key: Some(legacy_key),
                renamed,
                class: DiffClass::FigmaOnly,
            });
            continue;
        };

        let collapsed = match collapse_modes(variable, meta) {
            Ok(Some(v)) => v,
            Ok(None) => {
                counts.skipped_uncovered += 1;
                entries.push(DiffEntry {
                    name: variable.name.clone(),
                    legacy_key: Some(legacy_key),
                    renamed,
                    class: DiffClass::SkippedUncovered {
                        reason: "multimode-divergent".to_string(),
                    },
                });
                continue;
            }
            Err(()) => {
                counts.skipped_uncovered += 1;
                entries.push(DiffEntry {
                    name: variable.name.clone(),
                    legacy_key: Some(legacy_key),
                    renamed,
                    class: DiffClass::SkippedUncovered {
                        reason: "unconvertible".to_string(),
                    },
                });
                continue;
            }
        };

        let leaf = record.resolve_leaf(graph);
        let source_value = scale_aligned_source_value(variable, meta, graph, leaf);
        let is_opacity = record_is_opacity(leaf);
        let is_font_name = record_is_font_name(leaf);
        let class = match diff_against_source(
            &variable.resolved_type,
            &collapsed,
            source_value.as_ref(),
            is_opacity,
            is_font_name,
        ) {
            Ok(None) => {
                counts.matched += 1;
                DiffClass::Match
            }
            Ok(Some(figma_value)) => {
                counts.value_mismatch += 1;
                DiffClass::ValueMismatch {
                    design_data: source_value.clone().unwrap_or(Value::Null),
                    figma: figma_value,
                }
            }
            Err(()) => {
                counts.skipped_uncovered += 1;
                DiffClass::SkippedUncovered {
                    reason: "unconvertible".to_string(),
                }
            }
        };
        entries.push(DiffEntry {
            name: variable.name.clone(),
            legacy_key: Some(legacy_key),
            renamed,
            class,
        });
    }

    // Design-data-only pass: names the generator would produce that no real
    // Figma variable in the file covers.
    // A file missing the `.Color theme`/`.Platform scale` collections can't
    // produce an export payload at all; that's a reason to skip this one
    // pass, not to discard the Figma-driven diff already computed above.
    if let Ok((body, _summary)) = build_export_payload(tokens, meta, mapping) {
        for action in &body.variables {
            if !seen.contains(&action.name) {
                let legacy_key = invert_name(&action.name, reversed.as_ref());
                // A legacy key that never resolved (e.g. a cascade-format
                // token with no usable `name`/`legacyKey` field) falls back
                // to its synthetic `path:index` graph key, which always
                // contains `.json:` — surface that as a skip, not a
                // misleading "real gap" entry.
                if action.name.contains(".json:") {
                    counts.skipped_uncovered += 1;
                    entries.push(DiffEntry {
                        name: action.name.clone(),
                        legacy_key,
                        renamed: false,
                        class: DiffClass::SkippedUncovered {
                            reason: "legacy-key-unresolved".to_string(),
                        },
                    });
                    continue;
                }
                counts.design_data_only += 1;
                entries.push(DiffEntry {
                    name: action.name.clone(),
                    legacy_key,
                    renamed: false,
                    class: DiffClass::DesignDataOnly,
                });
            }
        }
    }

    entries.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(DiffReport { entries, counts })
}

/// Invert a Figma variable name back to its legacy token key: the rename
/// map takes precedence, else a Typography-leaf-specific rule (see
/// [`normalize_typography_leaf`]), else strip everything up to and including
/// the first `/` (the exact reverse of `format!("{prefix}/{token_name}")`).
///
/// A nested Figma name (e.g. `Palette/blue/100`, from a source collection
/// whose names cascade multiple path segments) leaves further `/`s in the
/// stripped tail — normalize those to `-` since legacy keys are dash-form
/// (`blue-100`). Slash-form keys never resolve today, so this is additive.
fn invert_name(figma_name: &str, renames: Option<&HashMap<String, String>>) -> Option<String> {
    renames
        .and_then(|m| m.get(figma_name))
        .cloned()
        .or_else(|| normalize_typography_leaf(figma_name))
        .or_else(|| {
            figma_name
                .split_once('/')
                .map(|(_, key)| key.replace('/', "-"))
        })
}

/// Map an atomic Typography-collection Figma name to its exact design-data
/// legacy key, for the handful of prefixes whose naming convention diverges
/// from the generic `{prefix}/{legacyKey}` one `invert_name`'s fallback
/// assumes. `resolve_alias_key` does exact lookup only (no fuzzy matching),
/// so this must reproduce the legacy key verbatim.
///
/// Only the five atomic leaf prefixes are handled — the Typography
/// collection's grouping variables (`Heading/…`, `Body/…`, etc.) have no
/// single design-data token to invert to (design-data models them as
/// orthogonal composites) and are deliberately left unmatched here.
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

/// Collapse a variable's per-mode values into one comparable value, only when
/// every mode agrees (within floating-point tolerance for numeric/color data).
///
/// `Ok(None)` means modes diverge — the caller reports and skips it, since a
/// manifest override has no per-mode dimension. `Err(())` means a mode holds
/// a `VARIABLE_ALIAS` this importer couldn't resolve (see
/// [`resolve_figma_value`]) — a broken reference or a cyclic/too-deep chain.
fn collapse_modes(variable: &FigmaVariable, meta: &VariablesMeta) -> Result<Option<Value>, ()> {
    let mut values = variable.values_by_mode.values();
    let Some(first) = values.next() else {
        return Ok(None);
    };
    let first = resolve_figma_value(meta, first, 0).ok_or(())?;
    for other in values {
        let other = resolve_figma_value(meta, other, 0).ok_or(())?;
        if !values_agree(&first, &other) {
            return Ok(None);
        }
    }
    Ok(Some(first))
}

fn is_alias(v: &Value) -> bool {
    v.get("type").and_then(Value::as_str) == Some("VARIABLE_ALIAS")
}

/// Cap on `VARIABLE_ALIAS` hops [`resolve_figma_value`] will follow, guarding
/// against a cyclic or pathologically deep chain. S2.Color-theme's real
/// chains are 1-3 hops deep; this is generous headroom, not a tuned figure.
const MAX_ALIAS_DEPTH: usize = 16;

/// Resolve a variable value to a concrete literal, following `VARIABLE_ALIAS`
/// chains through `meta.variables` (its own default mode, since Modeless
/// collections like S2.Color-theme have exactly one). Every S2 value is an
/// alias — without this, `collapse_modes` always failed them as unconvertible.
fn resolve_figma_value(meta: &VariablesMeta, value: &Value, depth: usize) -> Option<Value> {
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
    let next = target.values_by_mode.get(&collection.default_mode_id)?;
    resolve_figma_value(meta, next, depth + 1)
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

fn color_from(v: &Value) -> Option<FigmaColor> {
    if !v.is_object() {
        return None;
    }
    serde_json::from_value(v.clone()).ok()
}

fn colors_agree(a: &FigmaColor, b: &FigmaColor) -> bool {
    approx_eq(a.r, b.r) && approx_eq(a.g, b.g) && approx_eq(a.b, b.b) && approx_eq(a.a, b.a)
}

fn approx_eq(a: f64, b: f64) -> bool {
    (a - b).abs() < 1e-6
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
fn diff_against_source(
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

/// One candidate `legacyKey -> figmaName` override drafted by
/// [`pair_by_value`], for human review before merging into a mapping
/// artifact consumed by `figma export`/`diff --mapping`.
#[derive(Debug, Clone, Serialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct PairingCandidate {
    pub legacy_key: String,
    pub figma_name: String,
}

/// Report from [`pair_by_value`]: drafted candidates plus what couldn't be
/// resolved, for human curation.
#[derive(Debug, Clone, Serialize, Default)]
pub struct PairingReport {
    pub candidates: Vec<PairingCandidate>,
    /// Figma names whose value resolved but matched more than one
    /// design-data token, even after path-based disambiguation — needs a
    /// human pick.
    pub ambiguous: Vec<String>,
    /// Figma names whose value didn't resolve (dangling/cyclic alias) or
    /// matched zero design-data tokens (e.g. `app-frame`, which has no
    /// design-data counterpart — permanently figma-only).
    pub unmatched: Vec<String>,
}

/// Word set used to disambiguate a value collision: `suggest::tokenize`'s
/// split (any non-alphanumeric separator, single-char words dropped) with
/// pure-digit words also dropped — a Figma path and a legacy key can share
/// a bare scale index (e.g. `100`) with no semantic overlap at all, which
/// must not read as a real word match.
fn semantic_words(s: &str) -> HashSet<String> {
    crate::suggest::tokenize(s)
        .into_iter()
        .filter(|w| !w.chars().all(|c| c.is_ascii_digit()))
        .collect()
}

/// Score how well two word sets match by Jaccard similarity, for
/// disambiguating a value collision (several design-data tokens sharing one
/// resolved value). A design-data token's semantic identity (e.g. `notice`,
/// `background`, `key-focus`) lives in its own key, not in its raw
/// name-cascade field values (those are primitive scale identifiers like
/// `colorFamily`/`scaleIndex`), so comparing against the key itself is what
/// actually breaks these ties.
///
/// Returned as `(intersection, union)` rather than a ratio so callers can
/// compare two scores exactly via cross-multiplication
/// (`a.0 * b.1` vs `b.0 * a.1`) instead of float equality.
fn word_overlap(a: &HashSet<String>, b: &HashSet<String>) -> (usize, usize) {
    let intersection = a.intersection(b).count();
    let union = a.union(b).count();
    (intersection, union.max(1))
}

/// Draft `legacyKey -> figmaName` override candidates for Figma variables
/// whose name doesn't already invert to a known legacy key (`invert_name`/
/// `resolve_alias_key`), by matching resolved values instead.
///
/// Only variables whose name starts with one of `name_prefixes` (e.g.
/// `["Alias/", "Icon/"]`) are considered — Palette and any name already
/// resolved or explicitly mapped via `mapping` are left alone, so this only
/// fills genuine gaps. `mapping` is the same forward `legacyKey ->
/// figmaName` artifact `figma export`/`diff --mapping` use. Every
/// candidate's value is checked against every design-data token's resolved
/// (alias-followed) value via the same [`diff_against_source`] comparison
/// the diff itself uses, so a candidate is never proposed on a value the
/// diff would call `value-mismatch`.
pub fn pair_by_value(
    meta: &VariablesMeta,
    graph: &TokenGraph,
    name_prefixes: &[&str],
    mapping: Option<&HashMap<String, String>>,
) -> PairingReport {
    // `invert_name` expects a figmaName -> legacyKey map, the reverse of
    // `mapping`'s legacyKey -> figmaName convention (mirrors `diff_values`).
    let reversed: Option<HashMap<String, String>> =
        mapping.map(|m| m.iter().map(|(k, v)| (v.clone(), k.clone())).collect());

    let mut report = PairingReport::default();

    // legacy_key -> alias-resolved leaf record, mirroring how the CLI
    // derives legacy keys for `diff_values` (main.rs: extract_legacy_key on
    // the raw name, falling back to the graph key).
    let mut by_key: std::collections::BTreeMap<String, &crate::graph::TokenRecord> =
        std::collections::BTreeMap::new();
    // `graph.tokens` is a HashMap, so iterate in graph-key order rather than
    // hash order — when two tokens derive the same legacy_key, `or_insert_with`
    // below keeps whichever comes first, and that pick must be stable across
    // runs (it previously wasn't: HashMap iteration order varies per process).
    let mut sorted_keys: Vec<&String> = graph.tokens.keys().collect();
    sorted_keys.sort();
    for key in sorted_keys {
        let record = &graph.tokens[key];
        let legacy_key = record
            .raw
            .get("name")
            .and_then(crate::naming::extract_legacy_key)
            .unwrap_or_else(|| record.name.clone());
        by_key
            .entry(legacy_key)
            .or_insert_with(|| record.resolve_leaf(graph));
    }
    // Each legacy_key's word set is reused across every colliding variable
    // that considers it, so tokenize once here rather than per comparison.
    let key_words: HashMap<&str, HashSet<String>> = by_key
        .keys()
        .map(|key| (key.as_str(), semantic_words(key)))
        .collect();

    for variable in meta.variables.values() {
        // A remote/library-linked variable is never a real pairing target —
        // `diff_values`/`build_import_overrides` both skip these too.
        if variable.remote {
            continue;
        }
        if !name_prefixes.iter().any(|p| variable.name.starts_with(p)) {
            continue;
        }
        if invert_name(&variable.name, reversed.as_ref()).is_some_and(|k| by_key.contains_key(&k)) {
            continue; // already resolves by name — nothing to pair
        }

        // `collapse_modes` (not a raw `values_by_mode.values().next()` pick)
        // both cross-checks multi-mode agreement and resolves alias chains
        // deterministically — a plain HashMap `.next()` here previously made
        // results flip between runs on the same snapshot.
        let resolved = match collapse_modes(variable, meta) {
            Ok(Some(v)) => v,
            Ok(None) | Err(()) => {
                report.unmatched.push(variable.name.clone());
                continue;
            }
        };

        // ponytail: O(N×M) scan (N unresolved variables × M design-data
        // tokens) — at S2.Color-theme's scale (hundreds of each) this runs
        // in milliseconds; build a value -> [legacy_key] index once if this
        // is ever called against a much larger corpus.
        let matches: Vec<&str> = by_key
            .iter()
            .filter(|(_, leaf)| {
                let source_value = scale_aligned_source_value(variable, meta, graph, leaf);
                diff_against_source(
                    &variable.resolved_type,
                    &resolved,
                    source_value.as_ref(),
                    record_is_opacity(leaf),
                    record_is_font_name(leaf),
                )
                .is_ok_and(|v| v.is_none())
            })
            .map(|(key, _)| key.as_str())
            .collect();

        let chosen = match matches.as_slice() {
            [] => None,
            [only] => Some((*only).to_string()),
            several => {
                // Compare Jaccard ratios (intersection/union) without floats:
                // a.0/a.1 >= b.0/b.1  <=>  a.0*b.1 >= b.0*a.1. Equal ratios
                // then break on the larger absolute intersection — 4/10 is a
                // stronger match than 2/5 even though the ratio is the same,
                // so it isn't treated as a coin-flip tie against it.
                let score_cmp = |a: &(usize, usize), b: &(usize, usize)| {
                    (a.0 * b.1).cmp(&(b.0 * a.1)).then(a.0.cmp(&b.0))
                };
                let name_words = semantic_words(&variable.name);
                let scored: Vec<((usize, usize), &str)> = several
                    .iter()
                    .map(|key| {
                        let overlap = key_words
                            .get(key)
                            .map_or((0, 1), |words| word_overlap(&name_words, words));
                        (overlap, *key)
                    })
                    .collect();
                let best = scored.iter().map(|(score, _)| *score).max_by(score_cmp);
                match best {
                    // A zero-intersection "winner" carries no signal — every
                    // candidate is equally (dis)similar, so it isn't a real
                    // disambiguation and must still fall through to ambiguous.
                    Some(best) if best.0 > 0 => {
                        let winners: Vec<&str> = scored
                            .iter()
                            .filter(|(score, _)| score_cmp(score, &best).is_eq())
                            .map(|(_, key)| *key)
                            .collect();
                        match winners.as_slice() {
                            [only] => Some((*only).to_string()),
                            _ => None,
                        }
                    }
                    _ => None,
                }
            }
        };

        match chosen {
            Some(legacy_key) => report.candidates.push(PairingCandidate {
                legacy_key,
                figma_name: variable.name.clone(),
            }),
            None if matches.len() > 1 => report.ambiguous.push(variable.name.clone()),
            None => report.unmatched.push(variable.name.clone()),
        }
    }

    // A `legacyKey -> figmaName` mapping artifact can only hold one figmaName
    // per key, so if two different Figma variables both independently chose
    // the same legacy_key, neither pick was truly distinguishing — demote
    // both back to ambiguous rather than silently emitting a pair the
    // mapping artifact would then collide on.
    let mut counts: HashMap<String, usize> = HashMap::new();
    for candidate in &report.candidates {
        *counts.entry(candidate.legacy_key.clone()).or_default() += 1;
    }
    let (colliding, unique): (Vec<_>, Vec<_>) = report
        .candidates
        .into_iter()
        .partition(|c| counts[&c.legacy_key] > 1);
    report.candidates = unique;
    report
        .ambiguous
        .extend(colliding.into_iter().map(|c| c.figma_name));

    report.candidates.sort();
    report.ambiguous.sort();
    report.unmatched.sort();
    report
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::io::Write;

    fn mock_variable(
        name: &str,
        resolved_type: &str,
        values_by_mode: Vec<(&str, Value)>,
    ) -> FigmaVariable {
        FigmaVariable {
            id: format!("var-{name}"),
            name: name.to_string(),
            key: "k".to_string(),
            variable_collection_id: "col-1".to_string(),
            resolved_type: resolved_type.to_string(),
            values_by_mode: values_by_mode
                .into_iter()
                .map(|(mode, v)| (mode.to_string(), v))
                .collect(),
            remote: false,
            description: String::new(),
            hidden_from_publishing: false,
            scopes: vec![],
            code_syntax: HashMap::new(),
        }
    }

    fn mock_meta(variables: Vec<FigmaVariable>) -> VariablesMeta {
        VariablesMeta {
            variables: variables.into_iter().map(|v| (v.id.clone(), v)).collect(),
            variable_collections: HashMap::new(),
        }
    }

    /// A one-token graph, loaded through the real `from_json_dir` path (same
    /// as the object-format fixtures `mapping.rs`'s export tests use) so the
    /// uuid/legacy-name indexes are populated exactly as they are in production.
    fn mock_graph(legacy_key: &str, uuid: &str, value: Value) -> TokenGraph {
        mock_graph_with_schema(legacy_key, uuid, value, "https://example.com/color.json")
    }

    fn mock_graph_with_schema(
        legacy_key: &str,
        uuid: &str,
        value: Value,
        schema: &str,
    ) -> TokenGraph {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("tokens.json");
        let mut f = std::fs::File::create(&path).unwrap();
        write!(
            f,
            "{}",
            json!({
                legacy_key: {
                    "$schema": schema,
                    "name": legacy_key,
                    "value": value,
                    "uuid": uuid,
                }
            })
        )
        .unwrap();
        TokenGraph::from_json_dir(dir.path()).unwrap()
    }

    /// A multi-token graph from full token JSON objects (`name` may be a
    /// cascade object, unlike `mock_graph`'s flat-string `name`) — needed
    /// for [`pair_by_value`] tests, which match/disambiguate by value across
    /// several design-data tokens at once.
    fn mock_graph_multi(tokens: Vec<(&str, Value)>) -> TokenGraph {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("tokens.json");
        let obj: serde_json::Map<String, Value> = tokens
            .into_iter()
            .map(|(key, token)| (key.to_string(), token))
            .collect();
        let mut f = std::fs::File::create(&path).unwrap();
        write!(f, "{}", Value::Object(obj)).unwrap();
        TokenGraph::from_json_dir(dir.path()).unwrap()
    }

    #[test]
    fn pair_by_value_matches_unresolvable_name_by_value() {
        // "Alias/accent-color-default" doesn't invert to any known legacy
        // key (design-data's key is "accent-background-color-default"), but
        // its value matches exactly one design-data token.
        let target = mock_variable(
            "Palette/orange/500",
            "COLOR",
            vec![(
                "m-modeless",
                json!({"r": 1.0, "g": 0.5019607843137255, "b": 0.0, "a": 1.0}),
            )],
        );
        let alias = mock_variable(
            "Alias/accent-color-default",
            "COLOR",
            vec![(
                "m-modeless",
                json!({"type": "VARIABLE_ALIAS", "id": target.id.clone()}),
            )],
        );
        let meta = mock_meta_modeless(vec![target, alias]);

        let graph = mock_graph_multi(vec![(
            "accent-background-color-default",
            json!({
                "$schema": "https://example.com/color.json",
                "name": {
                    "colorRole": "accent",
                    "object": "background",
                    "state": ["default"],
                    "legacyKey": "accent-background-color-default",
                },
                "value": "#ff8000",
                "uuid": "u1",
            }),
        )]);

        let report = pair_by_value(&meta, &graph, &["Alias/", "Icon/"], None);
        assert_eq!(
            report.candidates,
            vec![PairingCandidate {
                legacy_key: "accent-background-color-default".to_string(),
                figma_name: "Alias/accent-color-default".to_string(),
            }]
        );
        assert!(report.ambiguous.is_empty());
        assert!(report.unmatched.is_empty());
    }

    #[test]
    fn pair_by_value_disambiguates_collision_by_path_segments() {
        // Two design-data tokens share the resolved value; only one's name
        // fields overlap with the Figma path's segments.
        let target = mock_variable(
            "Palette/orange/500",
            "COLOR",
            vec![(
                "m-modeless",
                json!({"r": 1.0, "g": 0.5019607843137255, "b": 0.0, "a": 1.0}),
            )],
        );
        let alias = mock_variable(
            "Alias/background/accent/default",
            "COLOR",
            vec![(
                "m-modeless",
                json!({"type": "VARIABLE_ALIAS", "id": target.id.clone()}),
            )],
        );
        let meta = mock_meta_modeless(vec![target, alias]);

        let graph = mock_graph_multi(vec![
            (
                "accent-background-color-default",
                json!({
                    "$schema": "https://example.com/color.json",
                    "name": {
                        "colorRole": "accent",
                        "object": "background",
                        "state": ["default"],
                        "legacyKey": "accent-background-color-default",
                    },
                    "value": "#ff8000",
                    "uuid": "u1",
                }),
            ),
            (
                "informative-background-color-default",
                json!({
                    "$schema": "https://example.com/color.json",
                    "name": {
                        "colorRole": "informative",
                        "object": "background",
                        "state": ["default"],
                        "legacyKey": "informative-background-color-default",
                    },
                    "value": "#ff8000",
                    "uuid": "u2",
                }),
            ),
        ]);

        let report = pair_by_value(&meta, &graph, &["Alias/", "Icon/"], None);
        assert_eq!(
            report.candidates,
            vec![PairingCandidate {
                legacy_key: "accent-background-color-default".to_string(),
                figma_name: "Alias/background/accent/default".to_string(),
            }]
        );
        assert!(report.ambiguous.is_empty());
    }

    #[test]
    fn pair_by_value_leaves_true_word_tie_ambiguous() {
        // Two design-data tokens share the resolved value AND the exact same
        // word set (order differs, which the set-based Jaccard score ignores
        // by design) — neither name is a better match, so this must stay
        // ambiguous rather than the tiebreak guessing one.
        let target = mock_variable(
            "Palette/orange/500",
            "COLOR",
            vec![(
                "m-modeless",
                json!({"r": 1.0, "g": 0.5019607843137255, "b": 0.0, "a": 1.0}),
            )],
        );
        let alias = mock_variable(
            "Alias/accent/default",
            "COLOR",
            vec![(
                "m-modeless",
                json!({"type": "VARIABLE_ALIAS", "id": target.id.clone()}),
            )],
        );
        let meta = mock_meta_modeless(vec![target, alias]);

        let graph = mock_graph_multi(vec![
            (
                "accent-color-default",
                json!({
                    "$schema": "https://example.com/color.json",
                    "name": {"legacyKey": "accent-color-default"},
                    "value": "#ff8000",
                    "uuid": "u1",
                }),
            ),
            (
                "default-accent-color",
                json!({
                    "$schema": "https://example.com/color.json",
                    "name": {"legacyKey": "default-accent-color"},
                    "value": "#ff8000",
                    "uuid": "u2",
                }),
            ),
        ]);

        let report = pair_by_value(&meta, &graph, &["Alias/", "Icon/"], None);
        assert!(report.candidates.is_empty());
        assert_eq!(report.ambiguous, vec!["Alias/accent/default".to_string()]);
    }

    #[test]
    fn pair_by_value_demotes_cross_variable_legacy_key_collision() {
        // Two different Figma variables both uniquely tiebreak to the same
        // legacy_key — a legacyKey -> figmaName mapping artifact can only
        // hold one figmaName per key, so neither pick was truly
        // distinguishing; both must fall back to ambiguous instead of one
        // candidate silently overwriting the other in the mapping artifact.
        let target = mock_variable(
            "Palette/orange/500",
            "COLOR",
            vec![(
                "m-modeless",
                json!({"r": 1.0, "g": 0.5019607843137255, "b": 0.0, "a": 1.0}),
            )],
        );
        let first = mock_variable(
            "Alias/content/neutral/default",
            "COLOR",
            vec![(
                "m-modeless",
                json!({"type": "VARIABLE_ALIAS", "id": target.id.clone()}),
            )],
        );
        let second = mock_variable(
            "Alias/content/typography/body",
            "COLOR",
            vec![(
                "m-modeless",
                json!({"type": "VARIABLE_ALIAS", "id": target.id.clone()}),
            )],
        );
        let meta = mock_meta_modeless(vec![target, first, second]);

        let graph = mock_graph_multi(vec![
            (
                "neutral-content-color-default",
                json!({
                    "$schema": "https://example.com/color.json",
                    "name": {"legacyKey": "neutral-content-color-default"},
                    "value": "#ff8000",
                    "uuid": "u1",
                }),
            ),
            (
                "gray-800",
                json!({
                    "$schema": "https://example.com/color.json",
                    "name": {"legacyKey": "gray-800"},
                    "value": "#ff8000",
                    "uuid": "u2",
                }),
            ),
        ]);

        let report = pair_by_value(&meta, &graph, &["Alias/", "Icon/"], None);
        assert!(report.candidates.is_empty());
        assert_eq!(
            report.ambiguous,
            vec![
                "Alias/content/neutral/default".to_string(),
                "Alias/content/typography/body".to_string(),
            ]
        );
    }

    #[test]
    fn pair_by_value_reports_true_gap_as_unmatched() {
        // No design-data token holds this value at all (e.g. "app-frame",
        // which has no design-data counterpart) — a permanent figma-only.
        let variable = mock_variable(
            "Alias/app-frame",
            "COLOR",
            vec![(
                "m-modeless",
                json!({"r": 0.1, "g": 0.1, "b": 0.1, "a": 1.0}),
            )],
        );
        let meta = mock_meta_modeless(vec![variable]);
        let graph = mock_graph_multi(vec![(
            "accent-background-color-default",
            json!({
                "$schema": "https://example.com/color.json",
                "name": "accent-background-color-default",
                "value": "#ff8000",
                "uuid": "u1",
            }),
        )]);

        let report = pair_by_value(&meta, &graph, &["Alias/", "Icon/"], None);
        assert!(report.candidates.is_empty());
        assert_eq!(report.unmatched, vec!["Alias/app-frame".to_string()]);
    }

    /// A remote/library-linked variable must never be surfaced as a pairing
    /// candidate — `diff_values`/`build_import_overrides` both skip these,
    /// and a reviewer curating candidates has no way to act on one.
    #[test]
    fn pair_by_value_ignores_remote_variables() {
        let mut variable = mock_variable(
            "Alias/accent-color-default",
            "COLOR",
            vec![(
                "m-modeless",
                json!({"r": 1.0, "g": 0.5019607843137255, "b": 0.0, "a": 1.0}),
            )],
        );
        variable.remote = true;
        let meta = mock_meta_modeless(vec![variable]);
        let graph = mock_graph_multi(vec![(
            "accent-background-color-default",
            json!({
                "$schema": "https://example.com/color.json",
                "name": "accent-background-color-default",
                "value": "#ff8000",
                "uuid": "u1",
            }),
        )]);

        let report = pair_by_value(&meta, &graph, &["Alias/", "Icon/"], None);
        assert!(report.candidates.is_empty());
        assert!(report.ambiguous.is_empty());
        assert!(report.unmatched.is_empty());
    }

    /// The curated `S2.Color-theme` `--mapping` artifact is a hand-maintained
    /// override on top of `pair_by_value`'s output — nothing re-derives it
    /// from the fixture at test time, so a bad edit (e.g. two legacy_keys
    /// silently pointing at the same figmaName, which `load_overrides`'
    /// figmaName -> legacyKey reversal would then collapse into one) would
    /// otherwise go unnoticed until someone ran `figma export` for real.
    #[test]
    fn s2_color_theme_mapping_fixture_has_no_duplicate_figma_names() {
        let raw = include_str!("../../tests/fixtures/figma/s2-color-theme.mapping.json");
        #[derive(serde::Deserialize)]
        struct MappingFile {
            overrides: HashMap<String, String>,
        }
        let mapping: MappingFile =
            serde_json::from_str(raw).expect("mapping fixture is valid {overrides: {...}} JSON");
        assert!(
            !mapping.overrides.is_empty(),
            "expected at least one curated override"
        );

        let mut seen_figma_names: HashMap<&str, &str> = HashMap::new();
        for (legacy_key, figma_name) in &mapping.overrides {
            if let Some(other_key) = seen_figma_names.insert(figma_name, legacy_key) {
                panic!(
                    "figma_name {figma_name:?} is claimed by both {other_key:?} and \
                     {legacy_key:?} — load_overrides' reversed map can only keep one"
                );
            }
        }
    }

    /// A cyclic `VARIABLE_ALIAS` chain must fail closed via the depth guard,
    /// not loop forever or panic.
    #[test]
    fn resolve_figma_value_stops_on_cyclic_alias_chain() {
        let a = mock_variable(
            "Alias/a",
            "COLOR",
            vec![(
                "m-modeless",
                json!({"type": "VARIABLE_ALIAS", "id": "var-Alias/b"}),
            )],
        );
        let b = mock_variable(
            "Alias/b",
            "COLOR",
            vec![(
                "m-modeless",
                json!({"type": "VARIABLE_ALIAS", "id": "var-Alias/a"}),
            )],
        );
        let meta = mock_meta_modeless(vec![a, b]);
        let alias_value = json!({"type": "VARIABLE_ALIAS", "id": "var-Alias/a"});
        assert_eq!(resolve_figma_value(&meta, &alias_value, 0), None);
    }

    /// Build a `VariablesMeta` with one Modeless collection ("col-1", the
    /// same id [`mock_variable`] defaults to) so [`resolve_figma_value`] can
    /// look up each alias target's default mode.
    fn mock_meta_modeless(variables: Vec<FigmaVariable>) -> VariablesMeta {
        use super::super::types::{FigmaMode, FigmaVariableCollection};
        let collection = FigmaVariableCollection {
            id: "col-1".to_string(),
            name: "S2.Color-theme".to_string(),
            key: "k".to_string(),
            modes: vec![FigmaMode {
                mode_id: "m-modeless".to_string(),
                name: "Modeless".to_string(),
            }],
            default_mode_id: "m-modeless".to_string(),
            remote: false,
            hidden_from_publishing: false,
            variable_ids: vec![],
        };
        VariablesMeta {
            variables: variables.into_iter().map(|v| (v.id.clone(), v)).collect(),
            variable_collections: [(collection.id.clone(), collection)].into_iter().collect(),
        }
    }

    #[test]
    fn unchanged_color_produces_no_override() {
        let meta = mock_meta(vec![mock_variable(
            "colorTheme/blue-100",
            "COLOR",
            vec![(
                "m-light",
                json!({"r": 1.0, "g": 0.5019607843137255, "b": 0.0, "a": 1.0}),
            )],
        )]);
        let graph = mock_graph("blue-100", "u-blue-100", json!("#ff8000"));
        let (overrides, summary) = build_import_overrides(&meta, &graph, None);
        assert!(overrides.is_empty());
        assert_eq!(summary.unchanged, 1);
        assert_eq!(summary.overrides_emitted, 0);
    }

    #[test]
    fn diff_values_reports_known_mismatch() {
        use super::super::types::{FigmaMode, FigmaVariableCollection};

        let var = mock_variable(
            "colorTheme/blue-100",
            "COLOR",
            vec![("m-light", json!({"r": 0.0, "g": 0.0, "b": 1.0, "a": 1.0}))],
        );
        let mut variables = HashMap::new();
        variables.insert(var.id.clone(), var);
        let mut variable_collections = HashMap::new();
        variable_collections.insert(
            "col-1".to_string(),
            FigmaVariableCollection {
                id: "col-1".to_string(),
                name: ".Color theme".to_string(),
                key: "k1".to_string(),
                modes: vec![FigmaMode {
                    mode_id: "m-light".to_string(),
                    name: "Light".to_string(),
                }],
                default_mode_id: "m-light".to_string(),
                remote: false,
                hidden_from_publishing: false,
                variable_ids: vec![],
            },
        );
        variable_collections.insert(
            "col-2".to_string(),
            FigmaVariableCollection {
                id: "col-2".to_string(),
                name: ".Platform scale".to_string(),
                key: "k2".to_string(),
                modes: vec![FigmaMode {
                    mode_id: "m-desktop".to_string(),
                    name: "Desktop".to_string(),
                }],
                default_mode_id: "m-desktop".to_string(),
                remote: false,
                hidden_from_publishing: false,
                variable_ids: vec![],
            },
        );
        let meta = VariablesMeta {
            variables,
            variable_collections,
        };

        let graph = mock_graph("blue-100", "u-blue-100", json!("#ff8000"));
        let tokens = vec![(
            "blue-100".to_string(),
            PathBuf::from("test.json"),
            json!({
                "$schema": "https://example.com/color.json",
                "name": "blue-100",
                "value": "#ff8000",
                "uuid": "u-blue-100",
            }),
        )];

        let report = diff_values(&meta, &graph, &tokens, None).unwrap();
        assert_eq!(report.counts.value_mismatch, 1);
        assert_eq!(report.counts.matched, 0);
        let entry = report
            .entries
            .iter()
            .find(|e| e.name == "colorTheme/blue-100")
            .expect("mismatched variable must be reported");
        match &entry.class {
            DiffClass::ValueMismatch { design_data, figma } => {
                assert_eq!(design_data, &json!("#ff8000"));
                assert_eq!(figma, &json!("#0000ff"));
            }
            other => panic!("expected ValueMismatch, got {other:?}"),
        }
    }

    /// A design-data-only token that's covered by `--mapping` must report its
    /// real legacy key, not whatever comes after the last `/` in the mapped
    /// Figma name (which can differ, e.g. `spacing-100` -> `Layout/spacing-100-real`).
    #[test]
    fn design_data_only_entry_uses_mapping_for_legacy_key() {
        use super::super::types::{FigmaMode, FigmaVariableCollection};

        let mut variable_collections = HashMap::new();
        variable_collections.insert(
            "col-1".to_string(),
            FigmaVariableCollection {
                id: "col-1".to_string(),
                name: ".Color theme".to_string(),
                key: "k1".to_string(),
                modes: vec![FigmaMode {
                    mode_id: "m-light".to_string(),
                    name: "Light".to_string(),
                }],
                default_mode_id: "m-light".to_string(),
                remote: false,
                hidden_from_publishing: false,
                variable_ids: vec![],
            },
        );
        variable_collections.insert(
            "col-2".to_string(),
            FigmaVariableCollection {
                id: "col-2".to_string(),
                name: ".Platform scale".to_string(),
                key: "k2".to_string(),
                modes: vec![FigmaMode {
                    mode_id: "m-desktop".to_string(),
                    name: "Desktop".to_string(),
                }],
                default_mode_id: "m-desktop".to_string(),
                remote: false,
                hidden_from_publishing: false,
                variable_ids: vec![],
            },
        );
        let meta = VariablesMeta {
            variables: HashMap::new(),
            variable_collections,
        };

        let graph = mock_graph("spacing-100", "u-spacing-100", json!("8px"));
        let tokens = vec![(
            "spacing-100".to_string(),
            PathBuf::from("test.json"),
            json!({
                "$schema": "https://example.com/dimension.json",
                "name": "spacing-100",
                "value": "8px",
                "uuid": "u-spacing-100",
            }),
        )];
        let mapping: HashMap<String, String> = [(
            "spacing-100".to_string(),
            "Layout/spacing-100-real".to_string(),
        )]
        .into_iter()
        .collect();

        let report = diff_values(&meta, &graph, &tokens, Some(&mapping)).unwrap();
        let entry = report
            .entries
            .iter()
            .find(|e| e.name == "Layout/spacing-100-real")
            .expect("design-data-only entry must be reported");
        assert_eq!(entry.legacy_key.as_deref(), Some("spacing-100"));
    }

    /// A token whose name resolution fell back to its synthetic
    /// `path:index` graph key (no usable `name`/`legacyKey` field, e.g. a
    /// cascade-format token graph.rs couldn't extract a legacy key from)
    /// must be reported as skipped, not as a misleading "design-data-only"
    /// real gap.
    #[test]
    fn unresolved_legacy_key_is_skipped_not_design_data_only() {
        use super::super::types::{FigmaMode, FigmaVariableCollection};

        let mut variable_collections = HashMap::new();
        variable_collections.insert(
            "col-1".to_string(),
            FigmaVariableCollection {
                id: "col-1".to_string(),
                name: ".Color theme".to_string(),
                key: "k1".to_string(),
                modes: vec![FigmaMode {
                    mode_id: "m-light".to_string(),
                    name: "Light".to_string(),
                }],
                default_mode_id: "m-light".to_string(),
                remote: false,
                hidden_from_publishing: false,
                variable_ids: vec![],
            },
        );
        variable_collections.insert(
            "col-2".to_string(),
            FigmaVariableCollection {
                id: "col-2".to_string(),
                name: ".Platform scale".to_string(),
                key: "k2".to_string(),
                modes: vec![FigmaMode {
                    mode_id: "m-desktop".to_string(),
                    name: "Desktop".to_string(),
                }],
                default_mode_id: "m-desktop".to_string(),
                remote: false,
                hidden_from_publishing: false,
                variable_ids: vec![],
            },
        );
        let meta = VariablesMeta {
            variables: HashMap::new(),
            variable_collections,
        };

        let graph = mock_graph("spacing-100", "u-spacing-100", json!("8px"));
        let tokens = vec![(
            "/repo/packages/design-data/tokens/layout.tokens.json:3".to_string(),
            PathBuf::from("test.json"),
            json!({
                "$schema": "https://example.com/dimension.json",
                "value": "8px",
                "uuid": "u-spacing-100",
            }),
        )];

        let report = diff_values(&meta, &graph, &tokens, None).unwrap();
        assert_eq!(report.counts.design_data_only, 0);
        assert_eq!(report.counts.skipped_uncovered, 1);
        let entry = report
            .entries
            .iter()
            .find(|e| e.name.contains(".json:"))
            .expect("unresolved-name entry must be reported");
        match &entry.class {
            DiffClass::SkippedUncovered { reason } => {
                assert_eq!(reason, "legacy-key-unresolved");
            }
            other => panic!("expected SkippedUncovered, got {other:?}"),
        }
    }

    #[test]
    fn opacity_scale_agrees_when_figma_is_percent_of_fraction() {
        let meta = mock_meta(vec![mock_variable(
            "colorTheme/background-opacity-down",
            "FLOAT",
            vec![("m-light", json!(10.0))],
        )]);
        let graph = mock_graph_with_schema(
            "background-opacity-down",
            "u-opacity-down",
            json!("0.1"),
            "https://example.com/opacity.json",
        );
        let report = diff_values(&meta, &graph, &[], None).unwrap();
        assert_eq!(report.counts.matched, 1);
        assert_eq!(report.counts.value_mismatch, 0);
    }

    #[test]
    fn opacity_mismatch_reports_fraction_scale() {
        let meta = mock_meta(vec![mock_variable(
            "colorTheme/background-opacity-down",
            "FLOAT",
            vec![("m-light", json!(20.0))],
        )]);
        let graph = mock_graph_with_schema(
            "background-opacity-down",
            "u-opacity-down",
            json!("0.1"),
            "https://example.com/opacity.json",
        );
        let report = diff_values(&meta, &graph, &[], None).unwrap();
        assert_eq!(report.counts.value_mismatch, 1);
        let entry = &report.entries[0];
        match &entry.class {
            DiffClass::ValueMismatch { design_data, figma } => {
                assert_eq!(design_data, &json!("0.1"));
                assert_eq!(figma, &json!("0.2"));
            }
            other => panic!("expected ValueMismatch, got {other:?}"),
        }
    }

    #[test]
    fn opacity_import_override_uses_fraction_scale() {
        let meta = mock_meta(vec![mock_variable(
            "colorTheme/background-opacity-down",
            "FLOAT",
            vec![("m-light", json!(20.0))],
        )]);
        let graph = mock_graph_with_schema(
            "background-opacity-down",
            "u-opacity-down",
            json!("0.1"),
            "https://example.com/opacity.json",
        );
        let (overrides, summary) = build_import_overrides(&meta, &graph, None);
        assert_eq!(summary.overrides_emitted, 1);
        assert_eq!(overrides[0]["target"], "u-opacity-down");
        assert_eq!(overrides[0]["value"], "0.2");
    }

    #[test]
    fn opacity_import_no_override_when_scales_agree() {
        let meta = mock_meta(vec![mock_variable(
            "colorTheme/background-opacity-down",
            "FLOAT",
            vec![("m-light", json!(10.0))],
        )]);
        let graph = mock_graph_with_schema(
            "background-opacity-down",
            "u-opacity-down",
            json!("0.1"),
            "https://example.com/opacity.json",
        );
        let (overrides, summary) = build_import_overrides(&meta, &graph, None);
        assert!(overrides.is_empty());
        assert_eq!(summary.unchanged, 1);
    }

    #[test]
    fn font_weight_name_casing_agrees() {
        let meta = mock_meta(vec![mock_variable(
            "platformScale/bold-font-weight",
            "STRING",
            vec![("m-desktop", json!("Bold"))],
        )]);
        let graph = mock_graph_with_schema(
            "bold-font-weight",
            "u-bold",
            json!("bold"),
            "https://example.com/font-weight.json",
        );
        let report = diff_values(&meta, &graph, &[], None).unwrap();
        assert_eq!(report.counts.matched, 1);
        assert_eq!(report.counts.value_mismatch, 0);
    }

    #[test]
    fn font_weight_space_variant_agrees() {
        let meta = mock_meta(vec![mock_variable(
            "platformScale/extra-bold-font-weight",
            "STRING",
            vec![("m-desktop", json!("Extra Bold"))],
        )]);
        let graph = mock_graph_with_schema(
            "extra-bold-font-weight",
            "u-extra-bold",
            json!("extra-bold"),
            "https://example.com/font-weight.json",
        );
        let report = diff_values(&meta, &graph, &[], None).unwrap();
        assert_eq!(report.counts.matched, 1);
        assert_eq!(report.counts.value_mismatch, 0);
    }

    #[test]
    fn font_style_normal_agrees_with_figma_regular() {
        let meta = mock_meta(vec![mock_variable(
            "platformScale/default-font-style",
            "STRING",
            vec![("m-desktop", json!("Regular"))],
        )]);
        let graph = mock_graph_with_schema(
            "default-font-style",
            "u-default-style",
            json!("normal"),
            "https://example.com/font-style.json",
        );
        let report = diff_values(&meta, &graph, &[], None).unwrap();
        assert_eq!(report.counts.matched, 1);
        assert_eq!(report.counts.value_mismatch, 0);
    }

    /// A genuinely different weight must still be reported — canonicalization
    /// normalizes naming, not the underlying value.
    #[test]
    fn font_weight_genuine_difference_still_mismatches() {
        let meta = mock_meta(vec![mock_variable(
            "platformScale/bold-font-weight",
            "STRING",
            vec![("m-desktop", json!("Black"))],
        )]);
        let graph = mock_graph_with_schema(
            "bold-font-weight",
            "u-bold",
            json!("bold"),
            "https://example.com/font-weight.json",
        );
        let report = diff_values(&meta, &graph, &[], None).unwrap();
        assert_eq!(report.counts.value_mismatch, 1);
    }

    #[test]
    fn dp_unit_agrees_with_bare_figma_number() {
        let meta = mock_meta(vec![mock_variable(
            "platformScale/android-elevation",
            "FLOAT",
            vec![("m-desktop", json!(2.0))],
        )]);
        let graph = mock_graph("android-elevation", "u-elevation", json!("2dp"));
        let report = diff_values(&meta, &graph, &[], None).unwrap();
        assert_eq!(report.counts.matched, 1);
        assert_eq!(report.counts.value_mismatch, 0);
    }

    /// Two-entry scale-set graph (desktop/mobile sharing `set_uuid`), used to
    /// verify the diff aligns to the Figma variable's own scale instead of an
    /// arbitrary entry.
    fn mock_scale_graph(legacy_key: &str, desktop: Value, mobile: Value) -> TokenGraph {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("tokens.json");
        let mut f = std::fs::File::create(&path).unwrap();
        write!(
            f,
            "{}",
            json!([
                {
                    "$schema": "https://example.com/dimension.json",
                    "name": {"property": "padding", "scale": "desktop", "legacyKey": legacy_key},
                    "value": desktop,
                    "uuid": format!("u-{legacy_key}-desktop"),
                    "set_uuid": format!("su-{legacy_key}"),
                },
                {
                    "$schema": "https://example.com/dimension.json",
                    "name": {"property": "padding", "scale": "mobile", "legacyKey": legacy_key},
                    "value": mobile,
                    "uuid": format!("u-{legacy_key}-mobile"),
                    "set_uuid": format!("su-{legacy_key}"),
                },
            ])
        )
        .unwrap();
        TokenGraph::from_json_dir(dir.path()).unwrap()
    }

    fn mock_meta_with_single_mode(
        variable: FigmaVariable,
        mode_name: &str,
        mode_id: &str,
    ) -> VariablesMeta {
        use super::super::types::{FigmaMode, FigmaVariableCollection};
        let mut variable_collections = HashMap::new();
        variable_collections.insert(
            variable.variable_collection_id.clone(),
            FigmaVariableCollection {
                id: variable.variable_collection_id.clone(),
                name: ".Platform scale".to_string(),
                key: "k".to_string(),
                modes: vec![FigmaMode {
                    mode_id: mode_id.to_string(),
                    name: mode_name.to_string(),
                }],
                default_mode_id: mode_id.to_string(),
                remote: false,
                hidden_from_publishing: false,
                variable_ids: vec![],
            },
        );
        let mut variables = HashMap::new();
        variables.insert(variable.id.clone(), variable);
        VariablesMeta {
            variables,
            variable_collections,
        }
    }

    /// The false-positive case this fix targets: design-data's mobile entry
    /// (50) differs from Figma's captured Desktop mode (42), but the desktop
    /// entry (42) agrees — the diff must align to Figma's scale, not an
    /// arbitrary entry, and report a match.
    #[test]
    fn scale_set_aligns_to_figmas_captured_mode() {
        let var = mock_variable(
            "platformScale/line-height-900",
            "FLOAT",
            vec![("m-desktop", json!(42.0))],
        );
        let meta = mock_meta_with_single_mode(var, "Desktop", "m-desktop");
        let graph = mock_scale_graph("line-height-900", json!("42px"), json!("50px"));
        let report = diff_values(&meta, &graph, &[], None).unwrap();
        assert_eq!(report.counts.matched, 1);
        assert_eq!(report.counts.value_mismatch, 0);
    }

    /// A genuine desktop-to-desktop difference must still be reported once
    /// aligned to the correct scale.
    #[test]
    fn scale_set_still_mismatches_on_real_desktop_drift() {
        let var = mock_variable(
            "platformScale/base-padding-horizontal-large",
            "FLOAT",
            vec![("m-desktop", json!(16.0))],
        );
        let meta = mock_meta_with_single_mode(var, "Desktop", "m-desktop");
        let graph = mock_scale_graph(
            "base-padding-horizontal-large",
            json!("14px"),
            json!("12px"),
        );
        let report = diff_values(&meta, &graph, &[], None).unwrap();
        assert_eq!(report.counts.value_mismatch, 1);
        let entry = &report.entries[0];
        match &entry.class {
            DiffClass::ValueMismatch { design_data, .. } => {
                assert_eq!(design_data, &json!("14px"));
            }
            other => panic!("expected ValueMismatch, got {other:?}"),
        }
    }

    #[test]
    fn diverged_color_emits_uuid_override() {
        let meta = mock_meta(vec![mock_variable(
            "colorTheme/blue-100",
            "COLOR",
            vec![("m-light", json!({"r": 0.0, "g": 0.0, "b": 1.0, "a": 1.0}))],
        )]);
        let graph = mock_graph("blue-100", "u-blue-100", json!("#ff8000"));
        let (overrides, summary) = build_import_overrides(&meta, &graph, None);
        assert_eq!(summary.overrides_emitted, 1);
        assert_eq!(overrides[0]["target"], "u-blue-100");
        assert_eq!(overrides[0]["value"], "#0000ff");
    }

    #[test]
    fn modes_agree_still_emits_when_diverged() {
        let meta = mock_meta(vec![mock_variable(
            "platformScale/spacing-100",
            "FLOAT",
            vec![("m-desktop", json!(16.0)), ("m-mobile", json!(16.0))],
        )]);
        let graph = mock_graph("spacing-100", "u-spacing-100", json!("8px"));
        let (overrides, summary) = build_import_overrides(&meta, &graph, None);
        assert_eq!(summary.overrides_emitted, 1);
        assert_eq!(overrides[0]["value"], "16px");
    }

    /// A bare-number source (e.g. a font-weight token, not a unit-suffixed
    /// dimension, and not opacity — this mock's schema is `color.json`, so no
    /// opacity scaling applies) must still be compared numerically —
    /// otherwise an unedited FLOAT variable falsely reads as diverged.
    #[test]
    fn unchanged_bare_numeric_float_produces_no_override() {
        let meta = mock_meta(vec![mock_variable(
            "platformScale/font-weight-bold",
            "FLOAT",
            vec![("m-desktop", json!(0.6666))],
        )]);
        let graph = mock_graph("font-weight-bold", "u-font-weight-bold", json!(0.6666));
        let (overrides, summary) = build_import_overrides(&meta, &graph, None);
        assert!(overrides.is_empty());
        assert_eq!(summary.unchanged, 1);
        assert_eq!(summary.overrides_emitted, 0);
    }

    #[test]
    fn modes_disagree_reports_multimode_divergent() {
        let meta = mock_meta(vec![mock_variable(
            "platformScale/spacing-100",
            "FLOAT",
            vec![("m-desktop", json!(16.0)), ("m-mobile", json!(12.0))],
        )]);
        let graph = mock_graph("spacing-100", "u-spacing-100", json!("8px"));
        let (overrides, summary) = build_import_overrides(&meta, &graph, None);
        assert!(overrides.is_empty());
        assert_eq!(
            summary.multimode_divergent,
            vec!["platformScale/spacing-100"]
        );
    }

    #[test]
    fn unmapped_name_reports_unmapped() {
        let meta = mock_meta(vec![mock_variable(
            "SomeCollection/foo",
            "STRING",
            vec![("m-1", json!("bar"))],
        )]);
        let graph = mock_graph("blue-100", "u-blue-100", json!("#ff8000"));
        let (overrides, summary) = build_import_overrides(&meta, &graph, None);
        assert!(overrides.is_empty());
        assert_eq!(summary.unmapped, vec!["SomeCollection/foo"]);
    }

    #[test]
    fn rename_map_takes_precedence_over_prefix_strip() {
        let meta = mock_meta(vec![mock_variable(
            "Layout/spacing-100-real",
            "FLOAT",
            vec![("m-1", json!(24.0))],
        )]);
        let renames: HashMap<String, String> = [(
            "Layout/spacing-100-real".to_string(),
            "spacing-100".to_string(),
        )]
        .into_iter()
        .collect();
        let graph = mock_graph("spacing-100", "u-spacing-100", json!("8px"));
        let (overrides, summary) = build_import_overrides(&meta, &graph, Some(&renames));
        assert_eq!(summary.overrides_emitted, 1);
        assert_eq!(overrides[0]["target"], "u-spacing-100");
    }

    #[test]
    fn invert_name_normalizes_nested_slashes_to_dashes() {
        // A nested source name (e.g. S2.Color-theme's "Palette/blue/100")
        // must invert to the dash-form legacy key, not the slash-form tail.
        assert_eq!(
            invert_name("Palette/blue/100", None),
            Some("blue-100".to_string())
        );
        // A flat name is unaffected.
        assert_eq!(
            invert_name("colorTheme/blue-100", None),
            Some("blue-100".to_string())
        );
    }

    #[test]
    fn invert_name_normalizes_typography_atomic_leaves() {
        assert_eq!(
            invert_name("Font size/100", None),
            Some("font-size-100".to_string())
        );
        assert_eq!(
            invert_name("Line height/Font size 100", None),
            Some("line-height-font-size-100".to_string())
        );
        assert_eq!(
            invert_name("Font weight/Extra bold", None),
            Some("extra-bold-font-weight".to_string())
        );
        assert_eq!(
            invert_name("Font style/Italic", None),
            Some("italic-font-style".to_string())
        );
        assert_eq!(
            invert_name("Font family/Default", None),
            Some("default-font-family".to_string())
        );
        // No atomic `sans-serif`/`serif` font-family token exists in
        // design-data (only `default-font-family`) — the rule still
        // produces the naming-convention-correct key; `resolve_alias_key`
        // legitimately fails to find it, so this stays `figma_only` rather
        // than silently mismatching against an unrelated token.
        assert_eq!(
            invert_name("Font family/Serif", None),
            Some("serif-font-family".to_string())
        );
    }

    /// S2.Color-theme is Modeless and every value is a `VARIABLE_ALIAS` —
    /// this is the case `collapse_modes` used to hard-fail as unconvertible.
    /// `resolve_figma_value` must follow the chain to the target's concrete
    /// value so a same-value alias produces a real `match`.
    #[test]
    fn aliased_variable_resolves_through_target_to_concrete_value() {
        let target = mock_variable(
            "Palette/blue/100",
            "COLOR",
            vec![(
                "m-modeless",
                json!({"r": 1.0, "g": 0.5019607843137255, "b": 0.0, "a": 1.0}),
            )],
        );
        let alias = mock_variable(
            "Alias/accent-color-default",
            "COLOR",
            vec![(
                "m-modeless",
                json!({"type": "VARIABLE_ALIAS", "id": target.id.clone()}),
            )],
        );
        let meta = mock_meta_modeless(vec![target, alias]);

        let graph = mock_graph("accent-color-default", "u-accent", json!("#ff8000"));
        let (overrides, summary) = build_import_overrides(&meta, &graph, None);
        assert!(
            overrides.is_empty(),
            "resolved alias value matches design-data's value: no override needed"
        );
        assert_eq!(summary.unconvertible, Vec::<String>::new());
        assert_eq!(summary.unchanged, 1);
    }

    /// A `VARIABLE_ALIAS` pointing at a nonexistent target must still fail
    /// closed as unconvertible, not panic.
    #[test]
    fn alias_to_missing_target_stays_unconvertible() {
        let alias = mock_variable(
            "Alias/dangling",
            "COLOR",
            vec![(
                "m-modeless",
                json!({"type": "VARIABLE_ALIAS", "id": "VariableID:does-not-exist"}),
            )],
        );
        let meta = mock_meta(vec![alias]);
        let graph = mock_graph("dangling", "u-dangling", json!("#ff8000"));
        let (_, summary) = build_import_overrides(&meta, &graph, None);
        assert_eq!(summary.unconvertible, vec!["Alias/dangling".to_string()]);
    }

    #[test]
    fn nested_palette_name_resolves_instead_of_figma_only() {
        let meta = mock_meta(vec![mock_variable(
            "Palette/blue/100",
            "COLOR",
            vec![(
                "m-light",
                json!({"r": 1.0, "g": 0.5019607843137255, "b": 0.0, "a": 1.0}),
            )],
        )]);
        let graph = mock_graph("blue-100", "u-blue-100", json!("#ff8000"));
        let (overrides, summary) = build_import_overrides(&meta, &graph, None);
        assert!(overrides.is_empty());
        assert_eq!(
            summary.unchanged, 1,
            "nested Palette name must resolve to the known key, not fall through as unresolved"
        );
    }

    /// End-to-end check: an emitted override must satisfy
    /// `apply_platform_manifest`'s type-kind guard (`graph.rs:810`) — the
    /// value it feeds back in ("#0000ff") has to match the original's JSON
    /// kind (string), or the manifest would reject its own generated output.
    #[test]
    fn emitted_override_applies_cleanly_through_platform_manifest() {
        let meta = mock_meta(vec![mock_variable(
            "colorTheme/blue-100",
            "COLOR",
            vec![("m-light", json!({"r": 0.0, "g": 0.0, "b": 1.0, "a": 1.0}))],
        )]);
        let mut graph = mock_graph("blue-100", "u-blue-100", json!("#ff8000"));
        let (overrides, summary) = build_import_overrides(&meta, &graph, None);
        assert_eq!(summary.overrides_emitted, 1);

        let manifest = json!({ "overrides": overrides });
        graph.apply_platform_manifest(&manifest).unwrap();

        let record = graph.resolve_alias_key("u-blue-100").unwrap();
        assert_eq!(record.raw.get("value"), Some(&json!("#0000ff")));
    }
}
