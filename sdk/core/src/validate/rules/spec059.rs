// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-059: alias-mode-context-compatibility
//!
//! Mode analogue of SPEC-002 (alias-type-compatibility): an alias whose own
//! name object sets a mode-set field (e.g. `colorScheme: dark`) SHOULD NOT
//! resolve to a leaf token that sets the same field to a *different* value
//! (e.g. `colorScheme: light`) — that alias is almost certainly pinned to the
//! wrong mode row.
//!
//! Exempt: a `$ref` target that is a `conceptId` (see `graph.rs`'s
//! `concept_id_index`) is context-resolved — `resolve_alias_in_context`
//! already picks the mode-appropriate row, so a plain `resolve_alias_key`
//! walk (used here) may land on a differently-scoped sibling without that
//! being a real authoring mistake. Also exempt when either side omits the
//! field (mode-agnostic) — only a genuine value mismatch is flagged.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};
use serde_json::Value;

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-059"
    }

    fn name(&self) -> &'static str {
        "alias-mode-context-compatibility"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        let mode_fields: Vec<&str> = ctx
            .graph
            .mode_sets
            .iter()
            .map(|m| m.name.as_str())
            .collect();

        for t in ctx.graph.tokens.values() {
            let Some(target_name) = &t.alias_target else {
                continue;
            };
            // A conceptId target is context-resolved elsewhere; skip it here.
            let empty_ctx = std::collections::HashMap::new();
            if ctx
                .graph
                .resolve_concept_in_context(target_name, &empty_ctx)
                .is_some()
            {
                continue;
            }
            let Some(target) = ctx.graph.resolve_alias_key(target_name) else {
                continue;
            };
            let leaf = target.resolve_leaf(ctx.graph);

            for field in &mode_fields {
                let Some(own_value) = name_field(&t.raw, field) else {
                    continue;
                };
                let Some(leaf_value) = name_field(&leaf.raw, field) else {
                    continue;
                };
                if own_value != leaf_value {
                    out.push(Diagnostic {
                        file: t.file.clone(),
                        token: Some(t.name.clone()),
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Warning,
                        message: format!(
                            "Alias {} sets {field}={own_value} but its $ref chain resolves to a token with {field}={leaf_value}",
                            t.name
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

fn name_field<'a>(raw: &'a Value, field: &str) -> Option<&'a str> {
    raw.get("name")
        .and_then(Value::as_object)
        .and_then(|n| n.get(field))
        .and_then(Value::as_str)
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::json;

    use crate::graph::{Layer, ModeSetRecord, TokenGraph, TokenRecord};
    use crate::registry::RegistryData;
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec059::Rule;

    fn run(g: &TokenGraph) -> Vec<crate::report::Diagnostic> {
        let exceptions = std::collections::HashSet::new();
        let registry = RegistryData::embedded();
        let ctx = ValidationContext {
            graph: g,
            naming_exceptions: &exceptions,
            registry: &registry,
            manifest: None,
        };
        Rule.validate(&ctx)
    }

    fn color_scheme_mode_set() -> ModeSetRecord {
        ModeSetRecord {
            file: PathBuf::from("mode-sets.json"),
            name: "colorScheme".into(),
            modes: vec!["light".into(), "dark".into()],
            default_mode: "light".into(),
        }
    }

    #[test]
    fn mismatched_mode_flags_warning() {
        let mut g = TokenGraph::from_records(vec![
            TokenRecord {
                name: "leaf".into(),
                file: PathBuf::from("tokens.json"),
                index: 0,
                schema_url: None,
                uuid: Some("11111111-0000-0000-0000-000000000001".into()),
                alias_target: None,
                layer: Layer::Foundation,
                raw: json!({
                    "name": {"property": "accent-color", "colorScheme": "light"},
                    "value": "#fff",
                    "uuid": "11111111-0000-0000-0000-000000000001"
                }),
            },
            TokenRecord {
                name: "alias".into(),
                file: PathBuf::from("tokens.json"),
                index: 1,
                schema_url: None,
                uuid: Some("11111111-0000-0000-0000-000000000002".into()),
                alias_target: Some("11111111-0000-0000-0000-000000000001".into()),
                layer: Layer::Foundation,
                raw: json!({
                    "name": {"property": "background-color", "colorScheme": "dark"},
                    "$ref": "11111111-0000-0000-0000-000000000001",
                    "uuid": "11111111-0000-0000-0000-000000000002"
                }),
            },
        ]);
        g.mode_sets.push(color_scheme_mode_set());

        let diags = run(&g);
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-059"));
        assert!(diags[0].message.contains("colorScheme"));
    }

    #[test]
    fn matching_mode_no_warning() {
        let mut g = TokenGraph::from_records(vec![
            TokenRecord {
                name: "leaf".into(),
                file: PathBuf::from("tokens.json"),
                index: 0,
                schema_url: None,
                uuid: Some("22222222-0000-0000-0000-000000000001".into()),
                alias_target: None,
                layer: Layer::Foundation,
                raw: json!({
                    "name": {"property": "accent-color", "colorScheme": "dark"},
                    "value": "#000",
                    "uuid": "22222222-0000-0000-0000-000000000001"
                }),
            },
            TokenRecord {
                name: "alias".into(),
                file: PathBuf::from("tokens.json"),
                index: 1,
                schema_url: None,
                uuid: Some("22222222-0000-0000-0000-000000000002".into()),
                alias_target: Some("22222222-0000-0000-0000-000000000001".into()),
                layer: Layer::Foundation,
                raw: json!({
                    "name": {"property": "background-color", "colorScheme": "dark"},
                    "$ref": "22222222-0000-0000-0000-000000000001",
                    "uuid": "22222222-0000-0000-0000-000000000002"
                }),
            },
        ]);
        g.mode_sets.push(color_scheme_mode_set());

        assert!(run(&g).is_empty());
    }

    #[test]
    fn mode_agnostic_alias_no_warning() {
        let mut g = TokenGraph::from_records(vec![
            TokenRecord {
                name: "leaf".into(),
                file: PathBuf::from("tokens.json"),
                index: 0,
                schema_url: None,
                uuid: Some("33333333-0000-0000-0000-000000000001".into()),
                alias_target: None,
                layer: Layer::Foundation,
                raw: json!({
                    "name": {"property": "accent-color", "colorScheme": "light"},
                    "value": "#fff",
                    "uuid": "33333333-0000-0000-0000-000000000001"
                }),
            },
            TokenRecord {
                name: "alias".into(),
                file: PathBuf::from("tokens.json"),
                index: 1,
                schema_url: None,
                uuid: Some("33333333-0000-0000-0000-000000000002".into()),
                alias_target: Some("33333333-0000-0000-0000-000000000001".into()),
                layer: Layer::Foundation,
                raw: json!({
                    "name": {"property": "background-color"},
                    "$ref": "33333333-0000-0000-0000-000000000001",
                    "uuid": "33333333-0000-0000-0000-000000000002"
                }),
            },
        ]);
        g.mode_sets.push(color_scheme_mode_set());

        assert!(run(&g).is_empty());
    }

    #[test]
    fn concept_id_target_exempt() {
        let mut g = TokenGraph::from_records(vec![
            TokenRecord {
                name: "light".into(),
                file: PathBuf::from("tokens.json"),
                index: 0,
                schema_url: None,
                uuid: Some("44444444-0000-0000-0000-000000000001".into()),
                alias_target: None,
                layer: Layer::Foundation,
                raw: json!({
                    "name": {"property": "accent-color", "colorScheme": "light"},
                    "value": "#fff",
                    "uuid": "44444444-0000-0000-0000-000000000001",
                    "conceptId": "concept-accent-color"
                }),
            },
            TokenRecord {
                name: "dark".into(),
                file: PathBuf::from("tokens.json"),
                index: 1,
                schema_url: None,
                uuid: Some("44444444-0000-0000-0000-000000000002".into()),
                alias_target: None,
                layer: Layer::Foundation,
                raw: json!({
                    "name": {"property": "accent-color", "colorScheme": "dark"},
                    "value": "#000",
                    "uuid": "44444444-0000-0000-0000-000000000002",
                    "conceptId": "concept-accent-color"
                }),
            },
            TokenRecord {
                name: "alias".into(),
                file: PathBuf::from("tokens.json"),
                index: 2,
                schema_url: None,
                uuid: Some("44444444-0000-0000-0000-000000000003".into()),
                alias_target: Some("concept-accent-color".into()),
                layer: Layer::Foundation,
                raw: json!({
                    "name": {"property": "background-color", "colorScheme": "dark"},
                    "$ref": "concept-accent-color",
                    "uuid": "44444444-0000-0000-0000-000000000003"
                }),
            },
        ]);
        g.mode_sets.push(color_scheme_mode_set());

        assert!(run(&g).is_empty());
    }
}
