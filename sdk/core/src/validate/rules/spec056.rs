// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-056: ctr-uuid-unique
//!
//! CTR `uuid` values MUST be unique across all relationship entries in the
//! dataset. Mirrors SPEC-004 (uuid-global-uniqueness) for relationships.
//!
//! `RelationshipRecord` carries no layer distinction (unlike `TokenRecord`),
//! so — unlike SPEC-004, which only flags duplicates within the same
//! cascade layer — this rule flags any duplicate `uuid` across all loaded
//! relationship entries. Per-layer grouping can be added if/when relationship
//! entries gain layer-aware loading (out of scope for this foundation).

use std::collections::HashMap;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-056"
    }

    fn name(&self) -> &'static str {
        "ctr-uuid-unique"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut by_uuid: HashMap<&str, Vec<&crate::graph::RelationshipRecord>> = HashMap::new();
        for rel in &ctx.graph.relationships {
            let Some(u) = rel.uuid.as_deref() else {
                continue;
            };
            by_uuid.entry(u).or_default().push(rel);
        }

        let mut out = Vec::new();
        for (uuid, group) in by_uuid {
            if group.len() < 2 {
                continue;
            }
            for rel in group {
                out.push(Diagnostic {
                    file: rel.file.clone(),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Error,
                    message: format!("Duplicate relationship uuid {uuid}"),
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
    use crate::validate::rules::spec056::Rule;

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
    fn unique_uuids_no_error() {
        let mut g = TokenGraph::default();
        g.relationships.push(RelationshipRecord {
            file: PathBuf::from("a.json"),
            index: 0,
            uuid: Some("11111111-1111-1111-1111-111111111111".into()),
            raw: json!({}),
        });
        g.relationships.push(RelationshipRecord {
            file: PathBuf::from("a.json"),
            index: 1,
            uuid: Some("22222222-2222-2222-2222-222222222222".into()),
            raw: json!({}),
        });
        assert!(run(&g).is_empty());
    }

    #[test]
    fn duplicate_uuid_errors_for_each_occurrence() {
        let mut g = TokenGraph::default();
        g.relationships.push(RelationshipRecord {
            file: PathBuf::from("a.json"),
            index: 0,
            uuid: Some("11111111-1111-1111-1111-111111111111".into()),
            raw: json!({}),
        });
        g.relationships.push(RelationshipRecord {
            file: PathBuf::from("b.json"),
            index: 0,
            uuid: Some("11111111-1111-1111-1111-111111111111".into()),
            raw: json!({}),
        });
        let diags = run(&g);
        assert_eq!(diags.len(), 2);
        assert!(diags
            .iter()
            .all(|d| d.severity == Severity::Error && d.rule_id.as_deref() == Some("SPEC-056")));
    }

    #[test]
    fn missing_uuid_skipped() {
        let mut g = TokenGraph::default();
        g.relationships.push(RelationshipRecord {
            file: PathBuf::from("a.json"),
            index: 0,
            uuid: None,
            raw: json!({}),
        });
        g.relationships.push(RelationshipRecord {
            file: PathBuf::from("b.json"),
            index: 0,
            uuid: None,
            raw: json!({}),
        });
        assert!(run(&g).is_empty());
    }
}
