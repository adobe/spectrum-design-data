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
//! one candidate that survives ALL restrictions simultaneously — either by omitting
//! the restricted mode set field (wildcard) or by setting it to an allowed mode value.
//!
//! All restrictions are applied simultaneously, matching the cascade step 0 filter,
//! so a group with tokens that each satisfy a different restriction but none satisfy
//! all restrictions simultaneously is also reported as a coverage gap.
//!
//! Sub-checks (reported as separate diagnostics before the coverage scan):
//! - Unknown mode set name in `modeSetRestrictions` → Warning (likely a typo).
//! - Mode set's `default` not in the `allowed` list → Error (resolver would return
//!   None even for the default context on this platform).

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

        let mode_set_names: Vec<&str> =
            ctx.graph.mode_sets.iter().map(|ms| ms.name.as_str()).collect();

        let mut out = Vec::new();

        // Validated restrictions: (mode_set_name, allowed_modes).
        // Only restrictions that pass the structural sub-checks below are included
        // in the coverage scan so a typo doesn't cascade into spurious coverage errors.
        let mut valid_restrictions: Vec<(&str, Vec<&str>)> = Vec::new();

        for (ms_name, restriction) in restrictions_obj {
            let Some(allowed_arr) = restriction.get("allowed").and_then(|v| v.as_array()) else {
                continue;
            };
            let allowed: Vec<&str> = allowed_arr.iter().filter_map(|v| v.as_str()).collect();

            // Sub-check 4: unknown mode set name.
            let Some(mode_set_record) = ctx.graph.mode_sets.iter().find(|ms| ms.name == *ms_name)
            else {
                out.push(Diagnostic {
                    file: std::path::PathBuf::from("manifest"),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Warning,
                    message: format!(
                        "modeSetRestrictions references unknown mode set '{}' — not declared in this dataset",
                        ms_name
                    ),
                    instance_path: Some(format!("modeSetRestrictions/{ms_name}")),
                    schema_path: None,
                });
                continue;
            };

            // Sub-check 3: mode set default must be in allowed.
            if !allowed.contains(&mode_set_record.default_mode.as_str()) {
                out.push(Diagnostic {
                    file: mode_set_record.file.clone(),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Error,
                    message: format!(
                        "modeSetRestrictions['{}'].allowed does not include the mode set's default '{}' — the resolver would return None for the default context on this platform",
                        ms_name, mode_set_record.default_mode
                    ),
                    instance_path: Some(format!("modeSetRestrictions/{ms_name}/allowed")),
                    schema_path: None,
                });
                // Still register the restriction for coverage scanning so that gap errors
                // are also surfaced — the two problems are independent.
            }

            valid_restrictions.push((ms_name.as_str(), allowed));
        }

        if valid_restrictions.is_empty() {
            return out;
        }

        // Build a summary string for diagnostic messages, e.g. "colorScheme: [light], scale: [large]".
        let restrictions_summary = valid_restrictions
            .iter()
            .map(|(ms, allowed)| format!("{}: [{}]", ms, allowed.join(", ")))
            .collect::<Vec<_>>()
            .join(", ");

        // Coverage scan: group tokens by base name (name obj with all mode-set keys removed),
        // then check whether any token in each group survives ALL restrictions simultaneously.
        // This matches cascade step 0, which applies restrictions as a conjunction, not per-axis.
        let mut groups: HashMap<String, (bool, std::path::PathBuf)> = HashMap::new();

        for token in ctx.graph.tokens.values() {
            let Some(name_obj) = token.raw.get("name").and_then(|v| v.as_object()) else {
                continue;
            };

            let base_name = base_name_key(name_obj, &mode_set_names);

            // A token survives if it passes every restriction (wildcard or allowed mode value).
            let survives_all = valid_restrictions.iter().all(|(ms_name, allowed)| {
                match name_obj.get(*ms_name).and_then(|v| v.as_str()) {
                    None => true, // omitted mode set field → wildcard → passes
                    Some(m) => allowed.contains(&m),
                }
            });

            let entry = groups
                .entry(base_name)
                .or_insert((false, token.file.clone()));

            if survives_all {
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
                        "Token group '{}' has no resolvable candidate under manifest mode-set restrictions ({})",
                        base_name, restrictions_summary
                    ),
                    instance_path: None,
                    schema_path: None,
                });
            }
        }

        out
    }
}

/// Produce a stable string key from a name object with all known mode-set keys removed.
fn base_name_key(name_obj: &Map<String, serde_json::Value>, mode_set_names: &[&str]) -> String {
    let mut pairs: Vec<_> = name_obj
        .iter()
        .filter(|(k, _)| !mode_set_names.contains(&k.as_str()))
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect();
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

    fn scale_mode_set() -> ModeSetRecord {
        ModeSetRecord {
            file: PathBuf::from("mode-sets/scale.json"),
            name: "scale".into(),
            modes: vec!["desktop".into(), "mobile".into()],
            default_mode: "desktop".into(),
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

    // ── Multi-restriction simultaneous check ─────────────────────────────────

    #[test]
    fn multi_restriction_gap_detected() {
        // Token A: { property: bg, colorScheme: dark, scale: desktop }
        // Token B: { property: bg, colorScheme: light, scale: mobile }
        // Restrictions: colorScheme: [light] (default=light ✓), scale: [desktop] (default=desktop ✓)
        // A fails colorScheme check; B fails scale check. No token survives both simultaneously.
        let g = TokenGraph::from_pairs(vec![
            (
                "t-a".into(),
                PathBuf::from("a.tokens.json"),
                json!({"name": {"property": "bg", "colorScheme": "dark", "scale": "desktop"}, "value": "#aaa"}),
            ),
            (
                "t-b".into(),
                PathBuf::from("a.tokens.json"),
                json!({"name": {"property": "bg", "colorScheme": "light", "scale": "mobile"}, "value": "#bbb"}),
            ),
        ])
        .with_mode_sets(vec![color_scheme_mode_set(), scale_mode_set()]);

        let registry = RegistryData::embedded();
        let exceptions = HashSet::new();
        let manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "modeSetRestrictions": {
                "colorScheme": { "allowed": ["light"] },
                "scale": { "allowed": ["desktop"] }
            }
        });
        let ctx = make_ctx(&g, &manifest, &registry, &exceptions);
        let diags = Rule.validate(&ctx);
        // Must detect the gap even though each restriction individually had a survivor.
        assert_eq!(diags.len(), 1, "expected 1 coverage-gap error, got: {:?}", diags);
        assert_eq!(diags[0].severity, Severity::Error);
    }

    #[test]
    fn multi_restriction_satisfied_by_single_token() {
        // Token satisfies both restrictions simultaneously.
        // Restrictions: colorScheme: [light] (default=light ✓), scale: [desktop] (default=desktop ✓)
        let g = TokenGraph::from_pairs(vec![(
            "t-ok".into(),
            PathBuf::from("a.tokens.json"),
            json!({"name": {"property": "bg", "colorScheme": "light", "scale": "desktop"}, "value": "#fff"}),
        )])
        .with_mode_sets(vec![color_scheme_mode_set(), scale_mode_set()]);

        let registry = RegistryData::embedded();
        let exceptions = HashSet::new();
        let manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "modeSetRestrictions": {
                "colorScheme": { "allowed": ["light"] },
                "scale": { "allowed": ["desktop"] }
            }
        });
        let ctx = make_ctx(&g, &manifest, &registry, &exceptions);
        assert!(Rule.validate(&ctx).is_empty());
    }

    // ── Default-must-be-in-allowed sub-check ─────────────────────────────────

    #[test]
    fn default_not_in_allowed_emits_error() {
        // colorScheme default is "light" but allowed only contains "dark".
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
                "colorScheme": { "allowed": ["dark"] }
            }
        });
        let ctx = make_ctx(&g, &manifest, &registry, &exceptions);
        let diags = Rule.validate(&ctx);
        // Expect both a "default not in allowed" error AND a coverage gap (no wildcard/light token).
        let default_errs: Vec<_> = diags
            .iter()
            .filter(|d| d.message.contains("default"))
            .collect();
        assert_eq!(default_errs.len(), 1);
        assert_eq!(default_errs[0].severity, Severity::Error);
    }

    // ── Unknown mode set name sub-check ──────────────────────────────────────

    #[test]
    fn unknown_mode_set_name_emits_warning() {
        let g = TokenGraph::default().with_mode_sets(vec![color_scheme_mode_set()]);

        let registry = RegistryData::embedded();
        let exceptions = HashSet::new();
        let manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "modeSetRestrictions": {
                "typoz": { "allowed": ["a"] }
            }
        });
        let ctx = make_ctx(&g, &manifest, &registry, &exceptions);
        let diags = Rule.validate(&ctx);
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert!(diags[0].message.contains("typoz"));
    }

    #[test]
    fn unknown_mode_set_does_not_trigger_coverage_scan() {
        // Unknown restriction should warn but not produce spurious coverage errors.
        let g = TokenGraph::from_pairs(vec![(
            "t".into(),
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
                "typoz": { "allowed": ["a"] }
            }
        });
        let ctx = make_ctx(&g, &manifest, &registry, &exceptions);
        let diags = Rule.validate(&ctx);
        // Only one warning, no coverage-gap errors.
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
    }
}
