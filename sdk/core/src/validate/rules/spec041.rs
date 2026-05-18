// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-041: mode-set-restriction-coverage
//!
//! When a platform manifest declares `modeSetRestrictions`, every token group
//! (tokens sharing the same non-mode-set name object fields) MUST have at least
//! one candidate that survives the restriction filter — either by omitting the
//! restricted mode set field (wildcard) or by setting it to an allowed mode value.
//!
//! A group whose every member sets the restricted mode set field to a disallowed
//! value has no resolvable candidate on the restricted platform and is reported as
//! a coverage gap.

use std::collections::HashMap;

use serde_json::Map;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-041"
    }

    fn name(&self) -> &'static str {
        "mode-set-restriction-coverage"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let Some(manifest) = ctx.manifest else {
            return Vec::new();
        };

        let Some(restrictions_obj) = manifest
            .get("modeSetRestrictions")
            .and_then(|v| v.as_object())
        else {
            return Vec::new();
        };

        // Collect mode set names known to the graph (used to strip mode-set keys
        // from name objects when building the base-name key).
        let mode_set_names: Vec<&str> = ctx.graph.mode_sets.iter().map(|ms| ms.name.as_str()).collect();

        let mut out = Vec::new();

        for (ms_name, restriction) in restrictions_obj {
            let Some(allowed_arr) = restriction.get("allowed").and_then(|v| v.as_array()) else {
                continue;
            };
            let allowed: Vec<&str> = allowed_arr
                .iter()
                .filter_map(|v| v.as_str())
                .collect();

            // Find all modes for this mode set that are NOT in allowed (restricted modes).
            let restricted_modes: Vec<&str> = ctx
                .graph
                .mode_sets
                .iter()
                .find(|ms| ms.name == *ms_name)
                .map(|ms| {
                    ms.modes
                        .iter()
                        .map(|m| m.as_str())
                        .filter(|m| !allowed.contains(m))
                        .collect()
                })
                .unwrap_or_default();

            if restricted_modes.is_empty() {
                continue;
            }

            // Group tokens by their base name: the name object with the restricted mode set
            // key removed. This identifies tokens that represent the same semantic slot.
            //
            // Key: stable JSON string of the base name map.
            // Value: (has_surviving_candidate, representative file path for diagnostics).
            let mut groups: HashMap<String, (bool, std::path::PathBuf)> = HashMap::new();

            for token in ctx.graph.tokens.values() {
                let Some(name_obj) = token.raw.get("name").and_then(|v| v.as_object()) else {
                    continue;
                };

                let base_name = base_name_key(name_obj, &mode_set_names);
                let mode_val = name_obj.get(ms_name.as_str()).and_then(|v| v.as_str());

                let survives = match mode_val {
                    None => true, // wildcard — always survives
                    Some(m) => allowed.contains(&m),
                };

                let entry = groups
                    .entry(base_name)
                    .or_insert((false, token.file.clone()));

                if survives {
                    entry.0 = true;
                }
            }

            for (base_name, (has_survivor, file)) in &groups {
                if !has_survivor {
                    out.push(Diagnostic {
                        file: file.clone(),
                        token: None,
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Error,
                        message: format!(
                            "Token group '{}' has no resolvable candidate under mode-set restriction on '{}' (allowed: [{}])",
                            base_name,
                            ms_name,
                            allowed.join(", ")
                        ),
                        instance_path: None,
                        schema_path: None,
                    });
                }
            }
        }

        out
    }
}

/// Produce a stable string key from a name object with all known mode-set keys removed.
fn base_name_key(name_obj: &Map<String, serde_json::Value>, mode_set_names: &[&str]) -> String {
    let mut base: Map<String, serde_json::Value> = Map::new();
    for (k, v) in name_obj {
        if !mode_set_names.contains(&k.as_str()) {
            base.insert(k.clone(), v.clone());
        }
    }
    // Stable JSON: sort keys.
    let mut pairs: Vec<_> = base.into_iter().collect();
    pairs.sort_by(|a, b| a.0.cmp(&b.0));
    let sorted: Map<_, _> = pairs.into_iter().collect();
    serde_json::to_string(&serde_json::Value::Object(sorted)).unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;
    use std::path::PathBuf;

    use serde_json::json;

    use super::*;
    use crate::graph::{ModeSetRecord, TokenGraph};
    use crate::registry::RegistryData;
    use crate::validate::rule::ValidationContext;

    fn color_scheme_mode_set() -> ModeSetRecord {
        ModeSetRecord {
            file: PathBuf::from("mode-sets/color-scheme.json"),
            name: "colorScheme".into(),
            modes: vec!["light".into(), "dark".into(), "wireframe".into()],
            default_mode: "light".into(),
        }
    }

    fn make_ctx<'a>(
        graph: &'a TokenGraph,
        manifest: &'a serde_json::Value,
        registry: &'a RegistryData,
        naming_exceptions: &'a HashSet<String>,
    ) -> ValidationContext<'a> {
        ValidationContext {
            graph,
            naming_exceptions,
            registry,
            manifest: Some(manifest),
        }
    }

    #[test]
    fn no_manifest_is_noop() {
        let graph = TokenGraph::default();
        let registry = RegistryData::embedded();
        let exceptions = HashSet::new();
        let ctx = ValidationContext {
            graph: &graph,
            naming_exceptions: &exceptions,
            registry: &registry,
            manifest: None,
        };
        assert!(Rule.validate(&ctx).is_empty());
    }

    #[test]
    fn no_restrictions_field_is_noop() {
        let graph = TokenGraph::default();
        let registry = RegistryData::embedded();
        let exceptions = HashSet::new();
        let manifest = json!({"specVersion": "1.0.0-draft", "foundationVersion": "1.0.0"});
        let ctx = make_ctx(&graph, &manifest, &registry, &exceptions);
        assert!(Rule.validate(&ctx).is_empty());
    }

    #[test]
    fn wildcard_token_satisfies_restriction() {
        // Token omits colorScheme → wildcard → survives even under light-only restriction.
        let g = TokenGraph::from_pairs(vec![(
            "t-wildcard".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "bg"}, "value": "#ccc"}),
        )])
        .with_mode_sets(vec![color_scheme_mode_set()]);

        let registry = RegistryData::embedded();
        let exceptions = HashSet::new();
        let manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "modeSetRestrictions": {
                "colorScheme": { "allowed": ["light"] }
            }
        });
        let ctx = make_ctx(&g, &manifest, &registry, &exceptions);
        assert!(Rule.validate(&ctx).is_empty(), "wildcard token covers the restriction");
    }

    #[test]
    fn allowed_mode_token_satisfies_restriction() {
        let g = TokenGraph::from_pairs(vec![
            (
                "t-light".into(),
                PathBuf::from("a.tokens.json"),
                json!({"name": {"property": "bg", "colorScheme": "light"}, "value": "#fff"}),
            ),
            (
                "t-dark".into(),
                PathBuf::from("a.tokens.json"),
                json!({"name": {"property": "bg", "colorScheme": "dark"}, "value": "#000"}),
            ),
        ])
        .with_mode_sets(vec![color_scheme_mode_set()]);

        let registry = RegistryData::embedded();
        let exceptions = HashSet::new();
        let manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "modeSetRestrictions": {
                "colorScheme": { "allowed": ["light"] }
            }
        });
        let ctx = make_ctx(&g, &manifest, &registry, &exceptions);
        // t-light covers the group — no coverage gap even though t-dark is restricted.
        assert!(Rule.validate(&ctx).is_empty());
    }

    #[test]
    fn restricted_only_group_emits_error() {
        // Only dark exists; restriction allows only light → coverage gap.
        let g = TokenGraph::from_pairs(vec![(
            "t-dark".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "bg", "colorScheme": "dark"}, "value": "#000"}),
        )])
        .with_mode_sets(vec![color_scheme_mode_set()]);

        let registry = RegistryData::embedded();
        let exceptions = HashSet::new();
        let manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "modeSetRestrictions": {
                "colorScheme": { "allowed": ["light"] }
            }
        });
        let ctx = make_ctx(&g, &manifest, &registry, &exceptions);
        let diags = Rule.validate(&ctx);
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
        assert!(diags[0].message.contains("colorScheme"));
        assert!(diags[0].message.contains("light"));
    }
}
