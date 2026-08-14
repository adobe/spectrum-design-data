// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-055: ctr-ref-resolves
//!
//! A CTR's `$ref` value MUST resolve to a declared token or relationship
//! `uuid` in the dataset. Mirrors SPEC-001 (alias-target-exists) and SPEC-027
//! (token-binding-token-exists) for the CTR alias direction — a CTR may alias
//! either a token (existing corpus) or another CTR (relationship-to-relationship
//! aliasing).

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-055"
    }

    fn name(&self) -> &'static str {
        "ctr-ref-resolves"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        for rel in &ctx.graph.relationships {
            let Some(target) = rel.raw.get("$ref").and_then(|v| v.as_str()) else {
                continue;
            };
            let resolves_to_token = ctx.graph.resolve_alias_key(target).is_some();
            // A sibling relationship's own `uuid` or `setUuid` is a valid $ref
            // target too — once every member of a mode-set group has been
            // migrated to CTRs, the group id only survives as `setUuid` on
            // sibling CTRs (see graph.rs's set_uuid_index for the equivalent
            // token-side precedent).
            let resolves_to_relationship = ctx.graph.relationship_target_exists(target);
            if !resolves_to_token && !resolves_to_relationship {
                out.push(Diagnostic {
                    file: rel.file.clone(),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Error,
                    message: format!("Relationship alias target not found for $ref: {target}"),
                    instance_path: None,
                    schema_path: None,
                });
            }
        }

        out
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::json;

    use crate::graph::{Layer, RelationshipRecord, TokenGraph, TokenRecord};
    use crate::registry::RegistryData;
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec055::Rule;

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

    #[test]
    fn ref_to_known_token_no_error() {
        let mut g = TokenGraph::from_records(vec![TokenRecord {
            name: "t".into(),
            file: PathBuf::from("tokens.json"),
            index: 0,
            schema_url: None,
            uuid: Some("11111111-1111-1111-1111-111111111111".into()),
            alias_target: None,
            layer: Layer::Foundation,
            raw: json!({"name": "t", "value": "#000", "uuid": "11111111-1111-1111-1111-111111111111"}),
        }]);
        g.relationships.push(RelationshipRecord {
            file: PathBuf::from("relationships.json"),
            index: 0,
            uuid: None,
            raw: json!({
                "scope": {"component": "button", "property": "color"},
                "$ref": "11111111-1111-1111-1111-111111111111"
            }),
        });
        assert!(run(&g).is_empty());
    }

    #[test]
    fn ref_to_known_relationship_no_error() {
        let mut g = TokenGraph::default();
        g.relationships.push(RelationshipRecord {
            file: PathBuf::from("relationships.json"),
            index: 0,
            uuid: Some("22222222-2222-2222-2222-222222222222".into()),
            raw: json!({
                "scope": {"component": "button", "property": "color"},
                "value": "#000",
                "uuid": "22222222-2222-2222-2222-222222222222"
            }),
        });
        g.relationships.push(RelationshipRecord {
            file: PathBuf::from("relationships.json"),
            index: 1,
            uuid: None,
            raw: json!({
                "scope": {"component": "checkbox", "property": "color"},
                "$ref": "22222222-2222-2222-2222-222222222222"
            }),
        });
        assert!(run(&g).is_empty());
    }

    #[test]
    fn ref_to_unknown_target_error() {
        let mut g = TokenGraph::default();
        g.relationships.push(RelationshipRecord {
            file: PathBuf::from("relationships.json"),
            index: 0,
            uuid: None,
            raw: json!({
                "scope": {"component": "button", "property": "color"},
                "$ref": "99999999-9999-9999-9999-999999999999"
            }),
        });
        let diags = run(&g);
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-055"));
        assert!(diags[0]
            .message
            .contains("99999999-9999-9999-9999-999999999999"));
    }

    #[test]
    fn no_ref_skipped() {
        let mut g = TokenGraph::default();
        g.relationships.push(RelationshipRecord {
            file: PathBuf::from("relationships.json"),
            index: 0,
            uuid: None,
            raw: json!({"scope": {"component": "button", "property": "color"}, "value": "#000"}),
        });
        assert!(run(&g).is_empty());
    }
}
