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

use std::collections::{BTreeSet, HashMap};

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

        let collapsed = match collapse_modes(variable) {
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
    tokens: &[(String, Value)],
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

        let collapsed = match collapse_modes(variable) {
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
        // Align to the design-data entry for the Figma variable's own scale
        // (e.g. Desktop -> "desktop") when the source is a scale-set token
        // (`set_uuid` present) that diverges per scale — otherwise a single
        // arbitrary scale entry gets compared against a specific Figma mode
        // and can false-positive (or false-negative) the diff.
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
        let source_value = scale_source_value.or_else(|| leaf.raw.get("value").cloned());
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
                counts.design_data_only += 1;
                let legacy_key = invert_name(&action.name, reversed.as_ref());
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
/// map takes precedence, else strip everything up to and including the
/// first `/` (the exact reverse of `format!("{prefix}/{token_name}")`).
fn invert_name(figma_name: &str, renames: Option<&HashMap<String, String>>) -> Option<String> {
    renames
        .and_then(|m| m.get(figma_name))
        .cloned()
        .or_else(|| figma_name.split_once('/').map(|(_, key)| key.to_string()))
}

/// Collapse a variable's per-mode values into one comparable value, only when
/// every mode agrees (within floating-point tolerance for numeric/color data).
///
/// `Ok(None)` means modes diverge — the caller reports and skips it, since a
/// manifest override has no per-mode dimension. `Err(())` means a mode holds
/// an unresolved alias (`VARIABLE_ALIAS`), which this importer doesn't follow.
fn collapse_modes(variable: &FigmaVariable) -> Result<Option<Value>, ()> {
    let mut values = variable.values_by_mode.values();
    let Some(first) = values.next() else {
        return Ok(None);
    };
    if is_alias(first) {
        return Err(());
    }
    for other in values {
        if is_alias(other) {
            return Err(());
        }
        if !values_agree(first, other) {
            return Ok(None);
        }
    }
    Ok(Some(first.clone()))
}

fn is_alias(v: &Value) -> bool {
    v.get("type").and_then(Value::as_str) == Some("VARIABLE_ALIAS")
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
