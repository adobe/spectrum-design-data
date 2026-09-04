// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-058: ctr-ref-not-deprecated
//!
//! A relationship-only CTR's `$ref` SHOULD NOT resolve to a token whose
//! `lifecycle.deprecatedIn` is set. Relationship-only CTRs (no `uuid`/
//! `legacyKey` — see relationship-format.md) describe current
//! component-to-token bindings; a deprecated target means the binding was
//! carried over from an older source (a legacy `tokenBindings` migration or a
//! Figma spec export) without following the token's `lifecycle.replacedBy`
//! pointer to its live replacement.
//!
//! Scoped to relationship-only CTRs deliberately: a *value-owning* CTR
//! (`uuid`/`legacyKey` present) legitimately **is** a deprecated token record
//! — that's SPEC-057's territory, not this rule's.
//!
//! Warning, not error: some deprecated targets have no `replacedBy` (or an
//! ambiguous array-form one) and can't be auto-corrected, so this can't be a
//! hard gate yet without blocking on manual triage.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-058"
    }

    fn name(&self) -> &'static str {
        "ctr-ref-not-deprecated"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        for rel in &ctx.graph.relationships {
            // Value-owning CTRs (uuid present) are themselves deprecated-token
            // records when applicable — not this rule's concern.
            if rel.uuid.is_some() {
                continue;
            }
            let Some(target) = rel.raw.get("$ref").and_then(|v| v.as_str()) else {
                continue;
            };

            let lifecycle = if let Some(tok) = ctx.graph.resolve_alias_key(target) {
                tok.raw.get("lifecycle").cloned()
            } else {
                ctx.graph
                    .relationships
                    .iter()
                    .find(|r| r.uuid.as_deref() == Some(target))
                    .and_then(|r| r.raw.get("lifecycle").cloned())
            };

            let Some(lifecycle) = lifecycle else {
                continue;
            };
            let deprecated_in = lifecycle
                .get("deprecatedIn")
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty());
            let Some(deprecated_in) = deprecated_in else {
                continue;
            };

            let replaced_by = lifecycle.get("replacedBy");
            let suffix = match replaced_by {
                Some(serde_json::Value::String(uuid)) if !uuid.is_empty() => {
                    format!(" (replacedBy: {uuid})")
                }
                Some(serde_json::Value::Array(uuids)) if !uuids.is_empty() => {
                    " (replacedBy: multiple candidates, needs manual mapping)".to_string()
                }
                _ => " (no replacedBy on target; needs manual mapping)".to_string(),
            };

            out.push(Diagnostic {
                file: rel.file.clone(),
                token: None,
                rule_id: Some(self.id().to_string()),
                severity: Severity::Warning,
                message: format!(
                    "Relationship $ref {target} resolves to a token deprecated in {deprecated_in}{suffix}"
                ),
                instance_path: None,
                schema_path: None,
            });
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
    use crate::validate::rules::spec058::Rule;

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
    fn ref_to_live_token_no_warning() {
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
    fn ref_to_deprecated_token_with_replaced_by_warns() {
        let mut g = TokenGraph::from_records(vec![TokenRecord {
            name: "old".into(),
            file: PathBuf::from("tokens.json"),
            index: 0,
            schema_url: None,
            uuid: Some("22222222-2222-2222-2222-222222222222".into()),
            alias_target: None,
            layer: Layer::Foundation,
            raw: json!({
                "name": "old",
                "value": "8px",
                "uuid": "22222222-2222-2222-2222-222222222222",
                "lifecycle": {"deprecatedIn": "14.3.0", "replacedBy": "33333333-3333-3333-3333-333333333333"}
            }),
        }]);
        g.relationships.push(RelationshipRecord {
            file: PathBuf::from("relationships.json"),
            index: 0,
            uuid: None,
            raw: json!({
                "scope": {"component": "accordion", "property": "top-to-text-compact-medium"},
                "$ref": "22222222-2222-2222-2222-222222222222"
            }),
        });
        let diags = run(&g);
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-058"));
        assert!(diags[0].message.contains("14.3.0"));
        assert!(diags[0]
            .message
            .contains("33333333-3333-3333-3333-333333333333"));
    }

    #[test]
    fn ref_to_deprecated_token_without_replaced_by_warns_manual_mapping() {
        let mut g = TokenGraph::from_records(vec![TokenRecord {
            name: "old".into(),
            file: PathBuf::from("tokens.json"),
            index: 0,
            schema_url: None,
            uuid: Some("44444444-4444-4444-4444-444444444444".into()),
            alias_target: None,
            layer: Layer::Foundation,
            raw: json!({
                "name": "old",
                "value": "8px",
                "uuid": "44444444-4444-4444-4444-444444444444",
                "lifecycle": {"deprecatedIn": "14.3.0"}
            }),
        }]);
        g.relationships.push(RelationshipRecord {
            file: PathBuf::from("relationships.json"),
            index: 0,
            uuid: None,
            raw: json!({
                "scope": {"component": "accordion", "property": "space-between"},
                "$ref": "44444444-4444-4444-4444-444444444444"
            }),
        });
        let diags = run(&g);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("needs manual mapping"));
    }

    #[test]
    fn value_owning_ctr_to_deprecated_target_skipped() {
        // A value-owning CTR (uuid present) is itself a deprecated-token
        // record when applicable; SPEC-058 only looks at relationship-only refs.
        let mut g = TokenGraph::default();
        g.relationships.push(RelationshipRecord {
            file: PathBuf::from("relationships.json"),
            index: 0,
            uuid: Some("55555555-5555-5555-5555-555555555555".into()),
            raw: json!({
                "scope": {"component": "accordion", "property": "top-to-text-compact-medium"},
                "value": "5px",
                "uuid": "55555555-5555-5555-5555-555555555555",
                "legacyKey": "accordion-top-to-text-compact-medium",
                "lifecycle": {"deprecatedIn": "14.3.0"}
            }),
        });
        assert!(run(&g).is_empty());
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
