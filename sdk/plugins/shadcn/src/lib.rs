// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Validation spike: export resolved Spectrum tokens as a shadcn
//! [`registry:theme`](https://ui.shadcn.com/docs/registry/registry-item-json) item
//! (`cssVars.light` / `cssVars.dark`), reusing the existing `TokenExporter` plugin
//! seam (`sdk/plugins/PLUGINS.md`) rather than inventing a new one.
//!
//! ## Why this leans on `design-data-dtcg` instead of re-deriving values
//!
//! `TokenExporter::export` hands us already-resolved `winners`, but turning a
//! resolved [`TokenRecord`] into a CSS-ready value (color hex, dimension string, ...)
//! is exactly what [`design_data_dtcg::token_to_dtcg_document`] already does. Rather
//! than duplicate that leaf-resolution logic, this exporter calls it per winner and
//! lifts `$value` straight into a `--spectrum-{legacyKey}` custom property.
//!
//! ## The one-mode-per-call limitation (`PLUGINS.md`, "Open question — mode coverage")
//!
//! `export` only receives winners for the single `mode_ctx` the CLI resolved. shadcn's
//! `cssVars` wants `light` *and* `dark` in one document, so this exporter re-resolves
//! the `dark` side itself from `graph` via [`design_data_core::cascade::resolve_dataset`],
//! using whatever `mode_ctx` the light side arrived with, colorScheme flipped. This
//! settles the open question for the spike: re-resolve per scheme inside `export`,
//! not at the CLI call site.
use std::collections::HashMap;

use design_data_core::cascade::{resolve_dataset, ResolutionContext};
use design_data_core::export::TokenExporter;
use design_data_core::graph::{TokenGraph, TokenRecord};
use design_data_core::naming::extract_legacy_key;
use serde_json::{json, Map, Value};

/// Exports resolved tokens as a shadcn `registry:theme` registry item.
pub struct ShadcnThemeExporter;

impl TokenExporter for ShadcnThemeExporter {
    fn format_id(&self) -> &'static str {
        "shadcn-theme"
    }

    fn export(
        &self,
        graph: &TokenGraph,
        winners: &[TokenRecord],
        mode_ctx: &HashMap<String, String>,
    ) -> Value {
        let light_scheme = mode_ctx
            .get("colorScheme")
            .cloned()
            .unwrap_or_else(|| "light".to_string());
        let dark_scheme = if light_scheme == "dark" {
            "light"
        } else {
            "dark"
        };

        let light_vars = css_vars(graph, winners);

        let mut dark_ctx = ResolutionContext::new();
        for (mode_set, mode) in mode_ctx {
            dark_ctx = dark_ctx.with(mode_set.clone(), mode.clone());
        }
        dark_ctx = dark_ctx.with("colorScheme", dark_scheme);
        let dark_winners = resolve_dataset(graph, &dark_ctx);
        let dark_vars = css_vars(graph, &dark_winners);

        let (light_vars, dark_vars) = if light_scheme == "dark" {
            (dark_vars, light_vars)
        } else {
            (light_vars, dark_vars)
        };

        json!({
            "name": "spectrum-theme",
            "type": "registry:theme",
            "cssVars": {
                "light": light_vars,
                "dark": dark_vars,
            }
        })
    }
}

/// Build a flat `{"--spectrum-{legacyKey}": "<css value>"}` map from resolved winners,
/// deriving each value via the DTCG exporter's leaf resolution (`$value`).
fn css_vars(graph: &TokenGraph, winners: &[TokenRecord]) -> Map<String, Value> {
    let mut vars = Map::new();
    for winner in winners {
        let Some(name) = winner.raw.get("name") else {
            continue;
        };
        let Some(legacy_key) = extract_legacy_key(name) else {
            continue;
        };
        let doc = design_data_dtcg::token_to_dtcg_document(graph, winner);
        let Some(entry) = doc.get(&legacy_key) else {
            continue;
        };
        let Some(value) = entry.get("$value") else {
            continue;
        };
        let Some(css_value) = dtcg_value_to_css(entry.get("$type"), value) else {
            continue;
        };
        vars.insert(format!("--spectrum-{legacy_key}"), Value::String(css_value));
    }
    vars
}

/// Render a DTCG `$value` as a CSS-ready string, keyed off its `$type`. Scalars
/// (`color`, `number`, strings) pass through as-is; `dimension` (`{value, unit}`)
/// becomes `"{value}{unit}"`. Composite types (`typography`, `shadow`, ...) aren't
/// single CSS values, so this spike skips them (`None`) rather than emit the raw
/// JSON object as a nonsense custom-property string.
fn dtcg_value_to_css(dtcg_type: Option<&Value>, value: &Value) -> Option<String> {
    match value {
        Value::String(s) => Some(s.clone()),
        Value::Number(n) => Some(n.to_string()),
        Value::Object(obj) if dtcg_type.and_then(Value::as_str) == Some("dimension") => {
            let value = obj.get("value")?.as_f64()?;
            let unit = obj.get("unit")?.as_str()?;
            Some(format!("{value}{unit}"))
        }
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use design_data_core::graph::{Layer, ModeSetRecord, TokenGraph, TokenRecord};
    use std::path::PathBuf;

    fn record(name: &str, color_scheme: &str, value: &str) -> TokenRecord {
        let schema_url =
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json"
                .to_string();
        let raw = json!({
            "$schema": schema_url,
            "name": {"property": "accent-color", "colorScheme": color_scheme},
            "value": value,
        });
        TokenRecord {
            name: name.to_string(),
            file: PathBuf::from("test.tokens.json"),
            index: 0,
            schema_url: Some(schema_url),
            uuid: None,
            alias_target: None,
            raw,
            layer: Layer::default(),
        }
    }

    #[test]
    fn export_emits_light_and_dark_css_vars() {
        let light = record("t-light", "light", "#1473e6");
        let dark = record("t-dark", "dark", "#2680eb");
        let graph = TokenGraph::from_pairs(vec![
            (light.name.clone(), light.file.clone(), light.raw.clone()),
            (dark.name.clone(), dark.file.clone(), dark.raw.clone()),
        ])
        .with_mode_sets(vec![ModeSetRecord {
            file: PathBuf::from("test.mode-sets.json"),
            name: "colorScheme".into(),
            modes: vec!["light".into(), "dark".into()],
            default_mode: "light".into(),
        }]);

        let ctx = ResolutionContext::new().with("colorScheme", "light");
        let winners = resolve_dataset(&graph, &ctx);

        let doc = ShadcnThemeExporter.export(&graph, &winners, &ctx.mode_sets);

        assert_eq!(
            doc["cssVars"]["light"]["--spectrum-accent-color"],
            json!("#1473e6")
        );
        assert_eq!(
            doc["cssVars"]["dark"]["--spectrum-accent-color"],
            json!("#2680eb")
        );
        assert_eq!(doc["type"], json!("registry:theme"));
    }

    #[test]
    fn format_id_is_shadcn_theme() {
        assert_eq!(ShadcnThemeExporter.format_id(), "shadcn-theme");
    }

    #[test]
    fn dimension_value_renders_as_css_length() {
        let dtcg_type = json!("dimension");
        let value = json!({"value": 8.0, "unit": "px"});
        assert_eq!(
            dtcg_value_to_css(Some(&dtcg_type), &value),
            Some("8px".to_string())
        );
    }

    #[test]
    fn composite_value_is_skipped() {
        let dtcg_type = json!("typography");
        let value = json!({"fontFamily": "adobe-clean"});
        assert_eq!(dtcg_value_to_css(Some(&dtcg_type), &value), None);
    }
}
