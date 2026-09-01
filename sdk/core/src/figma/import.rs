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

use std::collections::HashMap;

use serde_json::Value;

use super::color::{format_color, parse_color};
use super::types::{FigmaColor, FigmaVariable, VariablesMeta};
use crate::graph::TokenGraph;

/// The unit suffixes recognized on a dimension-like token value, matching the
/// ones stripped on export (`mapping.rs`'s `value_to_figma`). `dp` is
/// intentionally excluded — it was never exported to Figma either.
const UNIT_SUFFIXES: &[&str] = &["rem", "em", "px", "%"];

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

        let source_value = record.resolve_leaf(graph).raw.get("value").cloned();
        match diff_against_source(&variable.resolved_type, &collapsed, source_value.as_ref()) {
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
            let n = figma_value.as_f64().ok_or(())?;
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
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("tokens.json");
        let mut f = std::fs::File::create(&path).unwrap();
        write!(
            f,
            "{}",
            json!({
                legacy_key: {
                    "$schema": "https://example.com/color.json",
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

    /// A bare-number source (e.g. an opacity/font-weight token, not a
    /// unit-suffixed dimension) must still be compared numerically —
    /// otherwise an unedited FLOAT variable falsely reads as diverged.
    #[test]
    fn unchanged_bare_numeric_float_produces_no_override() {
        let meta = mock_meta(vec![mock_variable(
            "platformScale/opacity-disabled",
            "FLOAT",
            vec![("m-desktop", json!(0.6666))],
        )]);
        let graph = mock_graph("opacity-disabled", "u-opacity-disabled", json!(0.6666));
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
