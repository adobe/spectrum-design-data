// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-057: ctr-legacykey-present-if-legacy
//!
//! Advisory placeholder. Detecting "this CTR should have a legacy
//! counterpart" in general is a generator-side determination deferred to the
//! legacy-migration phase (out of scope here) — this rule only catches the
//! one case it can check cheaply and unambiguously at the graph level: a CTR
//! that carries `setUuid`/`setSchema` (legacy color-set membership) but no
//! `legacyKey` is definitely mid-migration and missing the field it needs
//! to round-trip through the legacy generator (`packages/tokens/src`).

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-057"
    }

    fn name(&self) -> &'static str {
        "ctr-legacykey-present-if-legacy"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        for rel in &ctx.graph.relationships {
            let has_set_fields =
                rel.raw.get("setUuid").is_some() || rel.raw.get("setSchema").is_some();
            let has_legacy_key = rel
                .raw
                .get("legacyKey")
                .and_then(|v| v.as_str())
                .is_some_and(|s| !s.is_empty());

            if has_set_fields && !has_legacy_key {
                let rel_label = rel
                    .raw
                    .get("scope")
                    .map(|c| serde_json::to_string(c).unwrap_or_default())
                    .unwrap_or_default();
                out.push(Diagnostic {
                    file: rel.file.clone(),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Warning,
                    message: format!(
                        "Relationship '{rel_label}' may need a legacyKey to round-trip through the legacy generator"
                    ),
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

    use crate::graph::{RelationshipRecord, TokenGraph};
    use crate::registry::RegistryData;
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec057::Rule;

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
    fn set_fields_with_legacy_key_no_warning() {
        let mut g = TokenGraph::default();
        g.relationships.push(RelationshipRecord {
            file: PathBuf::from("a.json"),
            index: 0,
            uuid: None,
            raw: json!({
                "scope": {"component": "button", "property": "color"},
                "value": "#fff",
                "setUuid": "11111111-1111-1111-1111-111111111111",
                "setSchema": "color-set",
                "legacyKey": "button-background-color"
            }),
        });
        assert!(run(&g).is_empty());
    }

    #[test]
    fn set_fields_without_legacy_key_warns() {
        let mut g = TokenGraph::default();
        g.relationships.push(RelationshipRecord {
            file: PathBuf::from("a.json"),
            index: 0,
            uuid: None,
            raw: json!({
                "scope": {"component": "button", "property": "color"},
                "value": "#fff",
                "setUuid": "11111111-1111-1111-1111-111111111111"
            }),
        });
        let diags = run(&g);
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-057"));
    }

    #[test]
    fn no_set_fields_no_warning() {
        let mut g = TokenGraph::default();
        g.relationships.push(RelationshipRecord {
            file: PathBuf::from("a.json"),
            index: 0,
            uuid: None,
            raw: json!({
                "scope": {"component": "button", "property": "color"},
                "value": "#fff"
            }),
        });
        assert!(run(&g).is_empty());
    }
}
