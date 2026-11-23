// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-084: ctr-uuid-required
//!
//! Every relationship record carries a `uuid`: the stable identity changelogs, platform
//! overrides and `$ref` use. The schema enforces it for `relationships/*.json`; this rule
//! also covers records the schema never sees, such as a platform manifest's inline
//! `extensions.relationships` adds. Uniqueness is SPEC-056.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-084"
    }

    fn name(&self) -> &'static str {
        "ctr-uuid-required"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        ctx.graph
            .relationships
            .iter()
            .filter(|rel| rel.uuid.is_none())
            .map(|rel| Diagnostic {
                file: rel.file.clone(),
                token: None,
                rule_id: Some(self.id().to_string()),
                severity: Severity::Error,
                message: format!(
                    "Relationship #{} has no uuid (component '{}', property '{}')",
                    rel.index,
                    rel.raw
                        .pointer("/scope/component")
                        .and_then(|v| v.as_str())
                        .unwrap_or("?"),
                    rel.raw
                        .pointer("/scope/property")
                        .and_then(|v| v.as_str())
                        .unwrap_or("?")
                ),
                instance_path: None,
                schema_path: None,
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::json;

    use super::*;
    use crate::graph::{RelationshipRecord, TokenGraph};
    use crate::registry::RegistryData;

    fn rel(uuid: Option<&str>, file: &str) -> RelationshipRecord {
        RelationshipRecord {
            file: PathBuf::from(file),
            index: 0,
            uuid: uuid.map(String::from),
            raw: json!({"scope": {"component": "button", "property": "color"}, "$ref": "x"}),
        }
    }

    #[test]
    fn flags_a_platform_manifest_add_without_uuid() {
        let mut g = TokenGraph::default();
        g.relationships
            .push(rel(Some("u-1"), "relationships/button.json"));
        g.relationships.push(rel(None, "manifest.json"));
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest: None,
        };
        let diags = Rule.validate(&ctx);
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].file, PathBuf::from("manifest.json"));
    }
}
