// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-008: cascade-completeness
//!
//! For every cascade token property that has a non-default mode variant, a
//! base/default variant must also exist. A "base variant" is a token whose
//! name object contains the `property` key but omits the dimension key
//! entirely (wildcard — applies to all modes) or explicitly sets it to the
//! dimension's declared default value.
//!
//! This prevents consumers from encountering resolution gaps when a non-default
//! mode is not active.

use std::collections::{HashMap, HashSet};

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-008"
    }

    fn name(&self) -> &'static str {
        "cascade-completeness"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        if ctx.graph.dimensions.is_empty() {
            // No dimension declarations loaded — cannot evaluate coverage.
            return Vec::new();
        }

        // Collect dimension names and their defaults.
        let dim_defaults: HashMap<&str, &str> = ctx
            .graph
            .dimensions
            .iter()
            .map(|d| (d.name.as_str(), d.default_mode.as_str()))
            .collect();

        // For each (property, dimension) pair, track:
        // - whether a base/default variant exists
        // - which non-default modes are present (for diagnostics)
        #[derive(Default)]
        struct Coverage {
            has_base: bool,
            non_default_modes: Vec<String>,
        }
        // key: (property, dimension_name)
        let mut coverage: HashMap<(String, String), Coverage> = HashMap::new();

        for token in ctx.graph.tokens.values() {
            let Some(name_obj) = token.raw.get("name").and_then(|v| v.as_object()) else {
                continue;
            };
            let Some(property) = name_obj.get("property").and_then(|v| v.as_str()) else {
                continue;
            };

            for (dim_name, default_mode) in &dim_defaults {
                let key = (property.to_string(), dim_name.to_string());
                let entry = coverage.entry(key).or_default();

                match name_obj.get(*dim_name).and_then(|v| v.as_str()) {
                    None => {
                        // Dimension absent → wildcard → this serves as the base.
                        entry.has_base = true;
                    }
                    Some(mode) if mode == *default_mode => {
                        // Explicitly set to default → also a base.
                        entry.has_base = true;
                    }
                    Some(mode) => {
                        entry.non_default_modes.push(mode.to_string());
                    }
                }
            }
        }

        let mut out = Vec::new();
        let mut reported: HashSet<(String, String)> = HashSet::new();

        for ((property, dim_name), cov) in &coverage {
            if cov.has_base || cov.non_default_modes.is_empty() {
                continue;
            }
            // Non-default modes exist but no base — emit one warning per property+dim.
            let key = (property.clone(), dim_name.clone());
            if reported.contains(&key) {
                continue;
            }
            reported.insert(key);

            // Find representative file from any token with this property.
            let representative_file = ctx
                .graph
                .tokens
                .values()
                .find(|t| {
                    t.raw
                        .get("name")
                        .and_then(|v| v.as_object())
                        .and_then(|n| n.get("property"))
                        .and_then(|v| v.as_str())
                        == Some(property.as_str())
                })
                .map(|t| t.file.clone())
                .unwrap_or_default();

            let modes_str = cov.non_default_modes.join(", ");
            out.push(Diagnostic {
                file: representative_file,
                token: Some(property.clone()),
                rule_id: Some(self.id().to_string()),
                severity: Severity::Warning,
                message: format!(
                    "Token property '{property}' has non-default {dim_name} variant(s) [{modes_str}] but no base/default variant — resolution will fail for unlisted contexts"
                ),
                instance_path: None,
                schema_path: None,
            });
        }

        out
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::json;

    use crate::graph::{DimensionRecord, TokenGraph};
    use crate::validate::relational::diagnostics_for_rule;

    fn color_scheme_dim() -> DimensionRecord {
        DimensionRecord {
            file: PathBuf::from("dimensions/color-scheme.json"),
            name: "colorScheme".into(),
            modes: vec!["light".into(), "dark".into()],
            default_mode: "light".into(),
        }
    }

    #[test]
    fn no_warning_when_base_exists() {
        let g = TokenGraph::from_pairs(vec![
            (
                "t-base".into(),
                PathBuf::from("a.tokens.json"),
                json!({"name": {"property": "bg"}, "value": "#fff"}),
            ),
            (
                "t-dark".into(),
                PathBuf::from("a.tokens.json"),
                json!({"name": {"property": "bg", "colorScheme": "dark"}, "value": "#000"}),
            ),
        ])
        .with_dimensions(vec![color_scheme_dim()]);

        assert!(diagnostics_for_rule(&g, "SPEC-008").is_empty());
    }

    #[test]
    fn warning_when_only_non_default_mode_exists() {
        let g = TokenGraph::from_pairs(vec![(
            "t-dark-only".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "bg", "colorScheme": "dark"}, "value": "#000"}),
        )])
        .with_dimensions(vec![color_scheme_dim()]);

        let diags = diagnostics_for_rule(&g, "SPEC-008");
        assert!(!diags.is_empty());
        assert!(diags[0].message.contains("bg"));
        assert!(diags[0].message.contains("dark"));
    }

    #[test]
    fn no_warning_when_explicit_default_exists() {
        let g = TokenGraph::from_pairs(vec![
            (
                "t-light".into(),
                PathBuf::from("a.tokens.json"),
                // Explicit default value = light
                json!({"name": {"property": "bg", "colorScheme": "light"}, "value": "#fff"}),
            ),
            (
                "t-dark".into(),
                PathBuf::from("a.tokens.json"),
                json!({"name": {"property": "bg", "colorScheme": "dark"}, "value": "#000"}),
            ),
        ])
        .with_dimensions(vec![color_scheme_dim()]);

        assert!(diagnostics_for_rule(&g, "SPEC-008").is_empty());
    }

    #[test]
    fn no_warning_without_dimension_declarations() {
        // Without dimension declarations we can't determine what's non-default.
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "bg", "colorScheme": "dark"}, "value": "#000"}),
        )]);

        assert!(diagnostics_for_rule(&g, "SPEC-008").is_empty());
    }
}
