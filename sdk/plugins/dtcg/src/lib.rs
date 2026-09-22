// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Serialize a resolved [`TokenRecord`] to a W3C [DTCG](https://tr.designtokens.org/format/)
//! ("Design Token Community Group") token document.
//!
//! This is a purely additive export path: it does not change the internal cascade/token
//! model (`cascade.rs`, `graph.rs`), it just re-shapes an already-resolved token for
//! ecosystem tools that expect `$value`/`$type`/`$description` (Style Dictionary,
//! Terrazzo, Tokens Studio, ...).
//!
//! ## Why the leaf, not the cascade winner
//!
//! [`resolve_property`](design_data_core::cascade::resolve_property)'s winner is frequently an
//! *alias* record (`$ref` pointing at a UUID, no `value` of its own; `$schema` is
//! `alias.json`). DTCG's `$type`/`$value` describe the *actual value*, so this module
//! always follows [`TokenRecord::resolve_leaf`] first and derives both from the leaf.
//!
//! ## Why `$schema`, not `$valueType`
//!
//! The Design Data Spec's `$valueType` field (see
//! `docs/proposals/010-composite-token-support.md`) is the forward-looking type
//! annotation, but as of this writing it is not present on any token in
//! `packages/design-data/tokens/*.tokens.json` — the type signal that actually exists on
//! every token is its `$schema` token-type URL (`color.json`, `dimension.json`,
//! `typography.json`, ...). `$type` is derived from that instead.
//!
//! ## Document shape
//!
//! The document is a **flat** single-token document keyed by the token's canonical
//! legacy kebab-case key (via [`design_data_core::naming::extract_legacy_key`]), e.g.:
//!
//! ```json
//! {
//!   "accent-background-color-default": {
//!     "$value": "#1473e6",
//!     "$type": "color"
//!   }
//! }
//! ```
//!
//! Flat + legacy-key naming was chosen (over nesting by structured `name` fields) because
//! it reproduces the names ecosystem tools and published CSS custom properties already
//! use, at zero translation cost — see the plan discussion on bead `spectrum-design-data-u1zx`
//! for the full rationale. `resolve` only ever emits a single token; a future bulk/dataset
//! DTCG exporter can reuse [`token_to_dtcg_document`] per-token and merge into deeper groups
//! without a breaking rename, since flat keys remain valid DTCG group members.
//!
//! ## Known v1 limitations
//!
//! * Color is normalized to a CSS hex string rather than the DTCG draft's
//!   `{colorSpace, components, alpha}` object form. This is a deliberate deviation for
//!   compatibility with the ecosystem tools this format targets (Style Dictionary,
//!   Terrazzo), which consume CSS color strings, not the draft object form.
//!
//! Inline `{alias}` references inside composite values (typography, drop-shadow) used
//! to always resolve to the default-context sibling regardless of mode — fine for a
//! single-token export, wrong for a bulk export spanning many mode combinations. See
//! [`token_to_dtcg_document_in_context`], which fixes this for bulk/dataset exporters.

use std::collections::HashMap;

use serde_json::{Map, Value};

use design_data_core::graph::{TokenGraph, TokenRecord};
use design_data_core::naming::extract_legacy_key;

/// Build a flat, single-token DTCG document from a resolved token.
///
/// `record` is the cascade winner (may be an alias); this function follows
/// [`TokenRecord::resolve_leaf`] internally to find the actual value and its type.
/// Composite sub-value inline aliases resolve to their default-context sibling — use
/// [`token_to_dtcg_document_in_context`] when resolving many tokens across mode
/// combinations, where that would be wrong.
pub fn token_to_dtcg_document(graph: &TokenGraph, record: &TokenRecord) -> Value {
    let leaf = record.resolve_leaf(graph);
    build_document(graph, record, leaf, None)
}

/// Context-aware sibling of [`token_to_dtcg_document`], for bulk/dataset exporters.
///
/// Resolves the leaf and every composite sub-value's inline `{alias}` reference via
/// [`TokenRecord::resolve_leaf_in_context`]/[`TokenGraph::resolve_alias_in_context`]
/// instead of their mode-agnostic counterparts, so a composite whose sub-value alias
/// varies by mode (e.g. a typography token's `fontSize` pointing at a scale-set concept)
/// picks the member matching `ctx`, not an arbitrary default-context one.
pub fn token_to_dtcg_document_in_context(
    graph: &TokenGraph,
    record: &TokenRecord,
    ctx: &HashMap<String, String>,
) -> Value {
    let leaf = record.resolve_leaf_in_context(graph, ctx);
    build_document(graph, record, leaf, Some(ctx))
}

/// [`design_data_core::export::TokenExporter`] impl: merges each of `winners`'
/// single-key document (via [`token_to_dtcg_document_in_context`]) into one flat
/// DTCG document. This is the same shape the CLI's `export --format dtcg` and
/// `query --format dtcg` paths already produce by hand — implementing the trait
/// here just gives that shape a name plugin dispatch can look up by `format_id()`.
pub struct DtcgExporter;

impl design_data_core::export::TokenExporter for DtcgExporter {
    fn format_id(&self) -> &'static str {
        "dtcg"
    }

    fn export(
        &self,
        graph: &TokenGraph,
        winners: &[TokenRecord],
        mode_ctx: &HashMap<String, String>,
    ) -> Value {
        let mut doc = Map::new();
        for winner in winners {
            if let Value::Object(entry) = token_to_dtcg_document_in_context(graph, winner, mode_ctx)
            {
                doc.extend(entry);
            }
        }
        Value::Object(doc)
    }
}

/// Shared body for [`token_to_dtcg_document`] and [`token_to_dtcg_document_in_context`]:
/// `leaf` is the already-resolved leaf (mode-agnostic or mode-aware, per caller); `ctx`
/// (when present) threads through composite sub-value resolution the same way.
fn build_document(
    graph: &TokenGraph,
    record: &TokenRecord,
    leaf: &TokenRecord,
    ctx: Option<&HashMap<String, String>>,
) -> Value {
    let key = extract_legacy_key(&record.raw.get("name").cloned().unwrap_or(Value::Null))
        .unwrap_or_else(|| record.name.clone());

    let mut token = Map::new();
    let dtcg_type = schema_to_dtcg_type(leaf.schema_url.as_deref());

    if let Some(value) = leaf.raw.get("value") {
        token.insert(
            "$value".to_string(),
            convert_value(value, dtcg_type, graph, ctx),
        );
    }
    if let Some(t) = dtcg_type {
        token.insert("$type".to_string(), Value::String(t.to_string()));
    }
    if let Some(desc) = leaf
        .raw
        .get("description")
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty())
    {
        token.insert("$description".to_string(), Value::String(desc.to_string()));
    }

    let mut doc = Map::new();
    doc.insert(key, Value::Object(token));
    Value::Object(doc)
}

/// DTCG `$type` values this module knows how to derive and convert.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum DtcgType {
    Color,
    Dimension,
    Number,
    FontFamily,
    FontWeight,
    Typography,
    Shadow,
}

impl DtcgType {
    fn as_str(self) -> &'static str {
        match self {
            DtcgType::Color => "color",
            DtcgType::Dimension => "dimension",
            DtcgType::Number => "number",
            DtcgType::FontFamily => "fontFamily",
            DtcgType::FontWeight => "fontWeight",
            DtcgType::Typography => "typography",
            DtcgType::Shadow => "shadow",
        }
    }
}

impl std::fmt::Display for DtcgType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

/// Map a token's `$schema` token-type URL to a DTCG `$type`.
///
/// Returns `None` for token-types with no DTCG equivalent (`alignment.json`,
/// `text-transform.json`, `font-style.json`, `gradient-stop.json`, `alias.json` when it
/// somehow can't be resolved further) — `$type` is optional in DTCG, so these tokens are
/// emitted with `$value` passed through as-is and no `$type`.
fn schema_to_dtcg_type(schema_url: Option<&str>) -> Option<DtcgType> {
    let file_name = schema_url?.rsplit('/').next()?;
    match file_name {
        "color.json" => Some(DtcgType::Color),
        "dimension.json" | "font-size.json" => Some(DtcgType::Dimension),
        "opacity.json" | "multiplier.json" | "angle.json" => Some(DtcgType::Number),
        "font-family.json" => Some(DtcgType::FontFamily),
        "font-weight.json" => Some(DtcgType::FontWeight),
        "typography.json" => Some(DtcgType::Typography),
        "drop-shadow.json" => Some(DtcgType::Shadow),
        _ => None,
    }
}

/// Convert a raw cascade value to its DTCG-conformant JSON shape for `dtcg_type`.
///
/// `ctx`, when present, threads mode-aware alias resolution through composite
/// sub-values — see [`resolve_inline`].
fn convert_value(
    value: &Value,
    dtcg_type: Option<DtcgType>,
    graph: &TokenGraph,
    ctx: Option<&HashMap<String, String>>,
) -> Value {
    match dtcg_type {
        Some(DtcgType::Color) => value
            .as_str()
            .and_then(css_color_to_hex)
            .map(Value::String)
            .unwrap_or_else(|| value.clone()),
        Some(DtcgType::Dimension) => value
            .as_str()
            .and_then(dimension_to_dtcg)
            .unwrap_or_else(|| value.clone()),
        Some(DtcgType::Number) => value
            .as_str()
            .and_then(numeric_string_to_number)
            .unwrap_or_else(|| value.clone()),
        Some(DtcgType::FontWeight) => value.clone(),
        Some(DtcgType::FontFamily) => value.clone(),
        Some(DtcgType::Typography) => convert_typography(value, graph, ctx),
        Some(DtcgType::Shadow) => convert_shadow(value, graph, ctx),
        None => value.clone(),
    }
}

/// Resolve an inline `{alias}` string to its target's literal value, following the chain
/// to a leaf. Non-alias strings (and non-string values) pass through unchanged.
///
/// `ctx: None` uses the mode-agnostic [`TokenGraph::resolve_alias_key`]/
/// [`TokenRecord::resolve_leaf`] path (a composite sub-value alias that varies by mode
/// picks the default-context sibling). `ctx: Some(_)` uses
/// [`TokenGraph::resolve_alias_in_context`]/[`TokenRecord::resolve_leaf_in_context`]
/// instead, so it picks the member matching `ctx`.
fn resolve_inline(
    value: &Value,
    graph: &TokenGraph,
    ctx: Option<&HashMap<String, String>>,
) -> Value {
    let Some(s) = value.as_str() else {
        return value.clone();
    };
    let Some(inner) = s.strip_prefix('{').and_then(|s| s.strip_suffix('}')) else {
        return value.clone();
    };
    let target = match ctx {
        Some(c) => graph.resolve_alias_in_context(inner, c),
        None => graph.resolve_alias_key(inner),
    };
    let Some(target) = target else {
        return value.clone();
    };
    let leaf = match ctx {
        Some(c) => target.resolve_leaf_in_context(graph, c),
        None => target.resolve_leaf(graph),
    };
    let leaf_type = schema_to_dtcg_type(leaf.schema_url.as_deref());
    leaf.raw
        .get("value")
        .map(|v| convert_value(v, leaf_type, graph, ctx))
        .unwrap_or_else(|| value.clone())
}

/// Convert a typography composite: resolve each sub-value's inline alias, then convert
/// dimension-shaped sub-values (`fontSize`, `lineHeight`, `letterSpacing`) to DTCG
/// dimension objects.
fn convert_typography(
    value: &Value,
    graph: &TokenGraph,
    ctx: Option<&HashMap<String, String>>,
) -> Value {
    let Some(obj) = value.as_object() else {
        return value.clone();
    };
    let mut out = Map::new();
    for (k, v) in obj {
        let resolved = resolve_inline(v, graph, ctx);
        let converted = match k.as_str() {
            "fontSize" | "lineHeight" | "letterSpacing" => resolved
                .as_str()
                .and_then(dimension_to_dtcg)
                .unwrap_or(resolved),
            _ => resolved,
        };
        out.insert(k.clone(), converted);
    }
    Value::Object(out)
}

/// Convert a drop-shadow composite (array of shadow layers): resolve inline aliases,
/// convert dimension sub-values, and rename `x`/`y` to DTCG's `offsetX`/`offsetY`.
fn convert_shadow(
    value: &Value,
    graph: &TokenGraph,
    ctx: Option<&HashMap<String, String>>,
) -> Value {
    let Some(layers) = value.as_array() else {
        return value.clone();
    };
    Value::Array(
        layers
            .iter()
            .map(|layer| {
                let Some(obj) = layer.as_object() else {
                    return layer.clone();
                };
                let mut out = Map::new();
                for (k, v) in obj {
                    let resolved = resolve_inline(v, graph, ctx);
                    let dtcg_key = match k.as_str() {
                        "x" => "offsetX",
                        "y" => "offsetY",
                        other => other,
                    };
                    let converted = match dtcg_key {
                        "offsetX" | "offsetY" | "blur" | "spread" => resolved
                            .as_str()
                            .and_then(dimension_to_dtcg)
                            .unwrap_or(resolved),
                        "color" => resolved
                            .as_str()
                            .and_then(css_color_to_hex)
                            .map(Value::String)
                            .unwrap_or(resolved),
                        _ => resolved,
                    };
                    out.insert(dtcg_key.to_string(), converted);
                }
                Value::Object(out)
            })
            .collect(),
    )
}

/// Parse a Spectrum dimension string (`"10px"`, `"1.5em"`, `"4dp"`) into a DTCG
/// dimension object `{"value": <number>, "unit": <unit>}`.
fn dimension_to_dtcg(s: &str) -> Option<Value> {
    let s = s.trim();
    let split_at = s.find(|c: char| !(c.is_ascii_digit() || c == '.' || c == '-'))?;
    let (num_part, unit) = s.split_at(split_at);
    let num: f64 = num_part.parse().ok()?;
    let mut obj = Map::new();
    obj.insert(
        "value".to_string(),
        serde_json::Number::from_f64(num)
            .map(Value::Number)
            .unwrap_or(Value::Null),
    );
    obj.insert("unit".to_string(), Value::String(unit.to_string()));
    Some(Value::Object(obj))
}

/// Parse a plain numeric string (opacity, multiplier, angle) into a JSON number.
fn numeric_string_to_number(s: &str) -> Option<Value> {
    // Strip a trailing unit if present (e.g. angle's "deg") — the corpus currently has
    // no angle/multiplier tokens, but the mapping is kept schema-complete.
    let trimmed = s.trim().trim_end_matches(|c: char| c.is_ascii_alphabetic());
    let num: f64 = trimmed.parse().ok()?;
    serde_json::Number::from_f64(num).map(Value::Number)
}

/// Convert a CSS `rgb()`/`rgba()` color string to a `#rrggbb`/`#rrggbbaa` hex string.
///
/// Already-hex strings pass through unchanged. Returns `None` for forms this doesn't
/// recognize (the corpus only contains comma-syntax `rgb()`/`rgba()`), leaving the
/// caller to fall back to the raw value.
fn css_color_to_hex(s: &str) -> Option<String> {
    let s = s.trim();
    if s.starts_with('#') {
        return Some(s.to_string());
    }
    let inner = s
        .strip_prefix("rgba(")
        .or_else(|| s.strip_prefix("rgb("))?
        .strip_suffix(')')?;
    let parts: Vec<f64> = inner
        .split(',')
        .map(|p| p.trim().parse::<f64>())
        .collect::<Result<_, _>>()
        .ok()?;
    let (r, g, b) = (*parts.first()?, *parts.get(1)?, *parts.get(2)?);
    let alpha = parts.get(3).copied();

    let hex = |v: f64| -> u8 { v.round().clamp(0.0, 255.0) as u8 };
    let mut out = format!("#{:02x}{:02x}{:02x}", hex(r), hex(g), hex(b));
    if let Some(a) = alpha {
        let alpha_byte = (a * 255.0).round().clamp(0.0, 255.0) as u8;
        out.push_str(&format!("{alpha_byte:02x}"));
    }
    Some(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use design_data_core::graph::Layer;
    use std::path::PathBuf;

    /// Build a `TokenRecord` for a fixture, stamping `raw["$schema"]` with the given
    /// token-type filename so that `TokenGraph::from_pairs` (which re-derives
    /// `schema_url`/`uuid`/`alias_target` from `raw` alone) sees a consistent type.
    fn record(name: &str, schema: &str, mut raw: Value) -> TokenRecord {
        let schema_url = format!(
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/{schema}"
        );
        raw.as_object_mut()
            .expect("fixture raw must be a JSON object")
            .insert("$schema".to_string(), Value::String(schema_url.clone()));
        TokenRecord {
            name: name.to_string(),
            file: PathBuf::from("test.tokens.json"),
            index: 0,
            schema_url: Some(schema_url),
            uuid: raw.get("uuid").and_then(Value::as_str).map(str::to_string),
            alias_target: raw.get("$ref").and_then(Value::as_str).map(str::to_string),
            raw,
            layer: Layer::default(),
        }
    }

    #[test]
    fn alias_winner_types_from_leaf() {
        let leaf = record(
            "leaf-token",
            "color.json",
            serde_json::json!({
                "name": {"property": "color"},
                "value": "rgb(0, 0, 0)",
                "uuid": "leaf-uuid",
            }),
        );
        let alias = record(
            "alias-token",
            "alias.json",
            serde_json::json!({
                "name": {"property": "color", "legacyKey": "my-alias-token"},
                "$ref": "leaf-uuid",
            }),
        );
        let graph = TokenGraph::from_pairs(vec![
            (leaf.name.clone(), leaf.file.clone(), leaf.raw.clone()),
            (alias.name.clone(), alias.file.clone(), alias.raw.clone()),
        ]);

        let doc = token_to_dtcg_document(&graph, &alias);
        let token = &doc["my-alias-token"];
        assert_eq!(token["$type"], "color");
        assert_eq!(token["$value"], "#000000");
    }

    #[test]
    fn dimension_converts_to_value_and_unit() {
        let rec = record(
            "size-token",
            "dimension.json",
            serde_json::json!({
                "name": {"property": "size", "legacyKey": "size-100"},
                "value": "10px",
            }),
        );
        let graph =
            TokenGraph::from_pairs(vec![(rec.name.clone(), rec.file.clone(), rec.raw.clone())]);

        let doc = token_to_dtcg_document(&graph, &rec);
        let token = &doc["size-100"];
        assert_eq!(token["$type"], "dimension");
        assert_eq!(token["$value"]["value"], 10.0);
        assert_eq!(token["$value"]["unit"], "px");
    }

    #[test]
    fn number_type_converts_opacity_string_to_json_number() {
        let rec = record(
            "opacity-token",
            "opacity.json",
            serde_json::json!({
                "name": {"property": "opacity", "legacyKey": "opacity-default"},
                "value": "0.48",
            }),
        );
        let graph =
            TokenGraph::from_pairs(vec![(rec.name.clone(), rec.file.clone(), rec.raw.clone())]);

        let doc = token_to_dtcg_document(&graph, &rec);
        assert_eq!(doc["opacity-default"]["$value"], 0.48);
        assert_eq!(doc["opacity-default"]["$type"], "number");
    }

    #[test]
    fn typography_composite_resolves_inline_aliases_and_dimensions() {
        let font_size = record(
            "font-size-200",
            "font-size.json",
            serde_json::json!({
                "name": {"property": "font-size", "legacyKey": "font-size-200"},
                "value": "16px",
            }),
        );
        let typography = record(
            "component-l-bold",
            "typography.json",
            serde_json::json!({
                "name": {"property": "typography", "legacyKey": "component-l-bold"},
                "value": {
                    "fontFamily": "Adobe Clean",
                    "fontSize": "{font-size-200}",
                    "fontWeight": "bold",
                },
            }),
        );
        let graph = TokenGraph::from_pairs(vec![
            (
                font_size.name.clone(),
                font_size.file.clone(),
                font_size.raw.clone(),
            ),
            (
                typography.name.clone(),
                typography.file.clone(),
                typography.raw.clone(),
            ),
        ]);

        let doc = token_to_dtcg_document(&graph, &typography);
        let value = &doc["component-l-bold"]["$value"];
        assert_eq!(value["fontFamily"], "Adobe Clean");
        assert_eq!(value["fontSize"]["value"], 16.0);
        assert_eq!(value["fontSize"]["unit"], "px");
        assert_eq!(value["fontWeight"], "bold");
        assert_eq!(doc["component-l-bold"]["$type"], "typography");
    }

    #[test]
    fn in_context_composite_picks_mode_matching_sub_value_alias() {
        // Two scale-set members of the same concept: mode-agnostic resolution
        // (`resolve_alias_key`) can only ever land on one of them (whichever the
        // concept-id index registered first), so this proves the `_in_context` path
        // picks the member matching `ctx`, not a fixed default.
        let font_size_desktop = record(
            "font-size-200-desktop",
            "font-size.json",
            serde_json::json!({
                "name": {"property": "font-size", "legacyKey": "font-size-200", "scale": "desktop"},
                "value": "16px",
                "conceptId": "font-size-200-concept",
            }),
        );
        let font_size_mobile = record(
            "font-size-200-mobile",
            "font-size.json",
            serde_json::json!({
                "name": {"property": "font-size", "legacyKey": "font-size-200", "scale": "mobile"},
                "value": "14px",
                "conceptId": "font-size-200-concept",
            }),
        );
        let typography = record(
            "component-l-bold",
            "typography.json",
            serde_json::json!({
                "name": {"property": "typography", "legacyKey": "component-l-bold"},
                "value": {
                    "fontFamily": "Adobe Clean",
                    "fontSize": "{font-size-200-concept}",
                    "fontWeight": "bold",
                },
            }),
        );
        let graph = TokenGraph::from_pairs(vec![
            (
                font_size_desktop.name.clone(),
                font_size_desktop.file.clone(),
                font_size_desktop.raw.clone(),
            ),
            (
                font_size_mobile.name.clone(),
                font_size_mobile.file.clone(),
                font_size_mobile.raw.clone(),
            ),
            (
                typography.name.clone(),
                typography.file.clone(),
                typography.raw.clone(),
            ),
        ]);

        let mobile_ctx = HashMap::from([("scale".to_string(), "mobile".to_string())]);
        let mobile_doc = token_to_dtcg_document_in_context(&graph, &typography, &mobile_ctx);
        assert_eq!(
            mobile_doc["component-l-bold"]["$value"]["fontSize"]["value"],
            14.0
        );

        let desktop_ctx = HashMap::from([("scale".to_string(), "desktop".to_string())]);
        let desktop_doc = token_to_dtcg_document_in_context(&graph, &typography, &desktop_ctx);
        assert_eq!(
            desktop_doc["component-l-bold"]["$value"]["fontSize"]["value"],
            16.0
        );
    }

    #[test]
    fn drop_shadow_composite_renames_x_y_to_offset_x_offset_y() {
        let color = record(
            "shadow-color",
            "color.json",
            serde_json::json!({
                "name": {"property": "color", "legacyKey": "shadow-color"},
                "value": "rgb(0, 0, 0)",
            }),
        );
        let shadow = record(
            "drop-shadow-dragged",
            "drop-shadow.json",
            serde_json::json!({
                "name": {"property": "drop-shadow", "legacyKey": "drop-shadow-dragged"},
                "value": [{
                    "x": "0px",
                    "y": "12px",
                    "blur": "16px",
                    "spread": "0px",
                    "color": "{shadow-color}",
                }],
            }),
        );
        let graph = TokenGraph::from_pairs(vec![
            (color.name.clone(), color.file.clone(), color.raw.clone()),
            (shadow.name.clone(), shadow.file.clone(), shadow.raw.clone()),
        ]);

        let doc = token_to_dtcg_document(&graph, &shadow);
        let layer = &doc["drop-shadow-dragged"]["$value"][0];
        assert_eq!(layer["offsetX"]["value"], 0.0);
        assert_eq!(layer["offsetY"]["value"], 12.0);
        assert_eq!(layer["color"], "#000000");
        assert!(layer.get("x").is_none());
        assert!(layer.get("y").is_none());
    }

    #[test]
    fn untyped_schema_passes_through_without_dollar_type() {
        let rec = record(
            "alignment-token",
            "alignment.json",
            serde_json::json!({
                "name": {"property": "alignment", "legacyKey": "alignment-start"},
                "value": "start",
            }),
        );
        let graph =
            TokenGraph::from_pairs(vec![(rec.name.clone(), rec.file.clone(), rec.raw.clone())]);

        let doc = token_to_dtcg_document(&graph, &rec);
        let token = doc["alignment-start"].as_object().unwrap();
        assert_eq!(token["$value"], "start");
        assert!(!token.contains_key("$type"));
    }

    #[test]
    fn description_is_carried_through_as_dollar_description() {
        let rec = record(
            "described-token",
            "color.json",
            serde_json::json!({
                "name": {"property": "color", "legacyKey": "described-token"},
                "value": "rgb(0, 0, 0)",
                "description": "Pure black.",
            }),
        );
        let graph =
            TokenGraph::from_pairs(vec![(rec.name.clone(), rec.file.clone(), rec.raw.clone())]);

        let doc = token_to_dtcg_document(&graph, &rec);
        assert_eq!(doc["described-token"]["$description"], "Pure black.");
    }
}
