// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-072: relationship-duplicate-ref-scale-counterpart
//!
//! Two relationship records with the same scope, context and `$ref` SHOULD NOT both
//! point at a token that has a scale counterpart (the same name with another `scale`
//! value). Such a pair is almost always a desktop and a mobile record where the second
//! was copied without repointing it, so the other scale's token is never reachable
//! through the relationship and a recipe that binds it resolves on one scale only.
//!
//! Warning: a repeated record is harmless when the token has no counterpart.

use std::collections::{HashMap, HashSet};

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

/// The token name object without `scale`, as a stable string.
fn name_key(name: &Value) -> Option<String> {
    let obj = name.as_object()?;
    obj.get("scale")?;
    let mut rest: Vec<(&String, &Value)> = obj.iter().filter(|(k, _)| *k != "scale").collect();
    rest.sort_by(|a, b| a.0.cmp(b.0));
    Some(format!("{rest:?}"))
}

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-072"
    }

    fn name(&self) -> &'static str {
        "relationship-duplicate-ref-scale-counterpart"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        let mut seen: HashSet<(String, String, String)> = HashSet::new();
        let mut counterparts: Option<HashMap<String, Vec<(String, String)>>> = None;

        for rel in &ctx.graph.relationships {
            if rel.uuid.is_some() {
                continue;
            }
            let Some(target) = rel.raw.get("$ref").and_then(Value::as_str) else {
                continue;
            };
            let scope = rel
                .raw
                .get("scope")
                .map(Value::to_string)
                .unwrap_or_default();
            let context = rel
                .raw
                .get("context")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string();
            if seen.insert((scope.clone(), context, target.to_string())) {
                continue;
            }
            let Some(token) = ctx.graph.resolve_alias_key(target) else {
                continue;
            };
            let Some(name) = token.raw.get("name") else {
                continue;
            };
            let Some(key) = name_key(name) else {
                continue;
            };
            let own_scale = name
                .get("scale")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string();
            let index = counterparts.get_or_insert_with(|| {
                let mut m: HashMap<String, Vec<(String, String)>> = HashMap::new();
                for t in ctx.graph.tokens.values() {
                    let Some(n) = t.raw.get("name") else { continue };
                    let Some(k) = name_key(n) else { continue };
                    let scale = n.get("scale").and_then(Value::as_str).unwrap_or("");
                    let uuid = t.uuid.clone().unwrap_or_else(|| t.name.clone());
                    m.entry(k).or_default().push((scale.to_string(), uuid));
                }
                m
            });
            let other = index
                .get(&key)
                .and_then(|v| v.iter().find(|(s, _)| *s != own_scale));
            if let Some((scale, uuid)) = other {
                out.push(Diagnostic {
                    file: rel.file.clone(),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Warning,
                    message: format!(
                        "Relationship {scope} references {target} twice, but the token has a {scale} counterpart ({uuid}); point one record at it"
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

    use serde_json::{json, Value};

    use crate::graph::{Layer, RelationshipRecord, TokenGraph, TokenRecord};
    use crate::registry::RegistryData;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec072::Rule;

    const DESKTOP: &str = "11111111-1111-1111-1111-111111111111";
    const MOBILE: &str = "22222222-2222-2222-2222-222222222222";
    const PLAIN: &str = "33333333-3333-3333-3333-333333333333";

    fn token(uuid: &str, name: Value) -> TokenRecord {
        TokenRecord {
            name: uuid.into(),
            file: PathBuf::from("tokens.json"),
            index: 0,
            schema_url: None,
            uuid: Some(uuid.into()),
            alias_target: None,
            layer: Layer::Foundation,
            raw: json!({"name": name, "value": "8px", "uuid": uuid}),
        }
    }

    fn rel(index: usize, target: &str, context: &str) -> RelationshipRecord {
        RelationshipRecord {
            file: PathBuf::from("relationships.json"),
            index,
            uuid: None,
            raw: json!({
                "scope": {"component": "tag", "property": "gap"},
                "context": context,
                "$ref": target
            }),
        }
    }

    fn run(g: &TokenGraph) -> usize {
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest: None,
        };
        Rule.validate(&ctx).len()
    }

    fn graph() -> TokenGraph {
        TokenGraph::from_records(vec![
            token(DESKTOP, json!({"property": "gap", "scale": "desktop"})),
            token(MOBILE, json!({"property": "gap", "scale": "mobile"})),
            token(PLAIN, json!({"property": "padding"})),
        ])
    }

    #[test]
    fn a_pair_on_a_scaled_token_with_a_counterpart_warns() {
        let mut g = graph();
        g.relationships.push(rel(0, DESKTOP, "Spacing"));
        g.relationships.push(rel(1, DESKTOP, "Spacing"));
        assert_eq!(run(&g), 1);
    }

    #[test]
    fn desktop_and_mobile_records_are_fine() {
        let mut g = graph();
        g.relationships.push(rel(0, DESKTOP, "Spacing"));
        g.relationships.push(rel(1, MOBILE, "Spacing"));
        assert_eq!(run(&g), 0);
    }

    #[test]
    fn a_repeat_on_a_token_without_a_counterpart_is_ignored() {
        let mut g = graph();
        g.relationships.push(rel(0, PLAIN, "Spacing"));
        g.relationships.push(rel(1, PLAIN, "Spacing"));
        assert_eq!(run(&g), 0);
    }

    #[test]
    fn the_same_token_in_another_context_is_not_a_pair() {
        let mut g = graph();
        g.relationships.push(rel(0, DESKTOP, "Spacing"));
        g.relationships.push(rel(1, DESKTOP, "Gap"));
        assert_eq!(run(&g), 0);
    }
}
