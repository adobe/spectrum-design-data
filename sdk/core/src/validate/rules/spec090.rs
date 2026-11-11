// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-090: relationship-context-fields-agree
//!
//! `contextRole`, `contextPart` and `contextQualifier` are generated from, and checked
//! against, the `context` string. The string stays the identity key a recipe binds on, so
//! when both exist the string must equal the label derived from the fields
//! (`RegistryData::derive_context`). Also flags a part or qualifier with no role, both
//! of them together, and a role id that is not in the registry.
//!
//! Warning: starts as a warning so existing data passes.

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-090"
    }

    fn name(&self) -> &'static str {
        "relationship-context-fields-agree"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for rel in &ctx.graph.relationships {
            let raw = &rel.raw;
            let s = |k: &str| raw.get(k).and_then(Value::as_str);
            let roles: Vec<&str> = raw
                .get("contextRole")
                .and_then(Value::as_array)
                .map(|a| a.iter().filter_map(Value::as_str).collect())
                .unwrap_or_default();
            let (part, qualifier) = (s("contextPart"), s("contextQualifier"));
            if roles.is_empty() && part.is_none() && qualifier.is_none() {
                continue;
            }
            let problem = if roles.is_empty() {
                Some("contextPart or contextQualifier needs a contextRole".to_string())
            } else if part.is_some() && qualifier.is_some() {
                Some("contextPart and contextQualifier are mutually exclusive".to_string())
            } else if let Some(bad) = roles
                .iter()
                .find(|r| ctx.registry.context_label(r).is_none())
            {
                Some(format!(
                    "contextRole '{bad}' is not in the relationship-contexts registry"
                ))
            } else {
                match (
                    s("context"),
                    ctx.registry.derive_context(&roles, part.or(qualifier)),
                ) {
                    (Some(c), Some(d)) if c.trim() != d => Some(format!(
                        "context '{c}' does not equal '{d}' derived from the structured fields"
                    )),
                    _ => None,
                }
            };
            if let Some(message) = problem {
                out.push(Diagnostic {
                    file: rel.file.clone(),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Warning,
                    message: format!(
                        "Relationship {}: {message}",
                        raw.get("scope").map(Value::to_string).unwrap_or_default()
                    ),
                    instance_path: Some(format!("/{}", rel.index)),
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

    use serde_json::{json, Value};

    use crate::graph::{RelationshipRecord, TokenGraph};
    use crate::registry::RegistryData;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec090::Rule;

    fn run(extra: Value) -> usize {
        let mut raw =
            json!({"scope": {"component": "tag", "property": "gap"}, "$ref": "t", "uuid": "u"});
        for (k, v) in extra.as_object().unwrap() {
            raw[k] = v.clone();
        }
        let mut g = TokenGraph::from_records(vec![]);
        g.relationships = vec![RelationshipRecord {
            file: PathBuf::from("tag.json"),
            index: 0,
            uuid: Some("u".into()),
            raw,
        }];
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest: None,
        };
        Rule.validate(&ctx).len()
    }

    #[test]
    fn matching_fields_pass() {
        assert_eq!(
            run(
                json!({"context": "Spacing (icon to label)", "contextRole": ["spacing"], "contextPart": "icon to label"})
            ),
            0
        );
        assert_eq!(
            run(
                json!({"context": "Background and border", "contextRole": ["background", "border"]})
            ),
            0
        );
        assert_eq!(
            run(
                json!({"context": "Label, icon, and border", "contextRole": ["label", "icon", "border"]})
            ),
            0
        );
        assert_eq!(run(json!({"contextRole": ["spacing"]})), 0);
    }

    #[test]
    fn a_string_that_differs_from_the_fields_warns() {
        assert_eq!(
            run(json!({"context": "Spacing", "contextRole": ["background"]})),
            1
        );
        assert_eq!(
            run(
                json!({"context": "Background (semantic)", "contextRole": ["background"], "contextQualifier": "non-semantic"})
            ),
            1
        );
        assert_eq!(
            run(json!({"context": "Minimum Height", "contextRole": ["height"]})),
            1
        );
    }

    #[test]
    fn malformed_field_combinations_warn() {
        assert_eq!(run(json!({"contextPart": "dot"})), 1);
        assert_eq!(
            run(json!({"contextRole": ["spacing"], "contextPart": "a", "contextQualifier": "b"})),
            1
        );
        assert_eq!(run(json!({"contextRole": ["not-a-role"]})), 1);
    }

    #[test]
    fn a_record_without_structured_fields_is_ignored() {
        assert_eq!(run(json!({"context": "Anything (at all)"})), 0);
    }
}
