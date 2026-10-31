// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-073: component-anatomy-reviewed
//!
//! Informational. Reports components that have relationship records but declare no
//! anatomy, and components whose anatomy is still draft (`anatomyReview.status` is not
//! `reviewed`). It is one diagnostic for the whole dataset, so the gap stays visible
//! without adding a line per component. Never an error: anatomy is authored as recipes
//! are built (anatomy-format.md#review-checklist).

use std::collections::BTreeSet;
use std::path::PathBuf;

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

fn list(names: &[&String]) -> String {
    names
        .iter()
        .map(|n| n.as_str())
        .collect::<Vec<_>>()
        .join(", ")
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-073"
    }

    fn name(&self) -> &'static str {
        "component-anatomy-reviewed"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let with_relationships: BTreeSet<&str> = ctx
            .graph
            .relationships
            .iter()
            .filter_map(|r| r.raw.get("scope")?.get("component")?.as_str())
            .collect();

        let mut missing: Vec<&String> = Vec::new();
        let mut draft: Vec<&String> = Vec::new();
        for comp in &ctx.graph.components {
            let has_anatomy = comp
                .raw
                .get("anatomy")
                .and_then(Value::as_array)
                .is_some_and(|a| !a.is_empty());
            if !has_anatomy {
                if with_relationships.contains(comp.name.as_str()) {
                    missing.push(&comp.name);
                }
                continue;
            }
            let reviewed = comp
                .raw
                .get("anatomyReview")
                .and_then(|r| r.get("status"))
                .and_then(Value::as_str)
                == Some("reviewed");
            if !reviewed {
                draft.push(&comp.name);
            }
        }
        if missing.is_empty() && draft.is_empty() {
            return Vec::new();
        }
        missing.sort();
        draft.sort();

        let mut parts = Vec::new();
        if !missing.is_empty() {
            parts.push(format!(
                "{} with relationships but no anatomy ({})",
                missing.len(),
                list(&missing)
            ));
        }
        if !draft.is_empty() {
            parts.push(format!(
                "{} with draft anatomy ({})",
                draft.len(),
                list(&draft)
            ));
        }
        vec![Diagnostic {
            file: PathBuf::from("components"),
            token: None,
            rule_id: Some(self.id().to_string()),
            severity: Severity::Info,
            message: format!("Components without reviewed anatomy: {}", parts.join("; ")),
            instance_path: None,
            schema_path: None,
        }]
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::{json, Value};

    use super::Rule;
    use crate::graph::{ComponentRecord, Layer, RelationshipRecord, TokenGraph};
    use crate::registry::RegistryData;
    use crate::report::{Diagnostic, Severity};
    use crate::validate::rule::{ValidationContext, ValidationRule};

    fn run(components: Vec<Value>, rel_components: &[&str]) -> Vec<Diagnostic> {
        let mut g = TokenGraph::default();
        for raw in components {
            g.components.push(ComponentRecord {
                name: raw["name"].as_str().unwrap().to_string(),
                file: PathBuf::from("dataset.json"),
                raw,
                layer: Layer::Foundation,
            });
        }
        for c in rel_components {
            g.relationships.push(RelationshipRecord {
                file: PathBuf::from("rel.json"),
                index: 0,
                uuid: None,
                raw: json!({"scope": {"component": c, "property": "gap"}, "context": "x", "$ref": "t"}),
            });
        }
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest: None,
        };
        Rule.validate(&ctx)
    }

    #[test]
    fn reports_missing_and_draft_anatomy_as_one_info() {
        let d = run(
            vec![
                json!({"name": "accordion"}),
                json!({"name": "divider"}),
                json!({"name": "switch", "anatomy": [{"name": "track"}]}),
                json!({"name": "button", "anatomy": [{"name": "container"}], "anatomyReview": {"status": "reviewed"}}),
            ],
            &["accordion"],
        );
        assert_eq!(d.len(), 1);
        assert_eq!(d[0].severity, Severity::Info);
        assert_eq!(
            d[0].message,
            "Components without reviewed anatomy: 1 with relationships but no anatomy (accordion); 1 with draft anatomy (switch)"
        );
    }

    #[test]
    fn silent_when_every_component_is_reviewed_or_has_no_relationships() {
        let d = run(
            vec![
                json!({"name": "divider"}),
                json!({"name": "button", "anatomy": [{"name": "container"}], "anatomyReview": {"status": "reviewed"}}),
            ],
            &[],
        );
        assert!(d.is_empty());
    }
}
