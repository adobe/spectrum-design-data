// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-032: product-layer-override-type-compat
//!
//! A Product-layer (or Platform-layer) token that overrides a Foundation token by UUID
//! MUST NOT change the JSON value type of the `value` field.
//! Per spec/cascade.md: "Overrides MUST NOT change the resolved token's value type."

use std::collections::HashMap;

use serde_json::Value;

use crate::graph::Layer;
use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-032"
    }

    fn name(&self) -> &'static str {
        "product-layer-override-type-compat"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        // Build a map: UUID → Foundation-layer token value type.
        // If two Foundation tokens share a UUID, HashMap insertion is non-deterministic;
        // SPEC-004 catches that data error before this rule runs, so it's acceptable here.
        let foundation_value_types: HashMap<&str, &str> = ctx
            .graph
            .tokens
            .values()
            .filter(|t| t.layer == Layer::Foundation)
            .filter_map(|t| {
                let uuid = t.uuid.as_deref()?;
                let value = t.raw.get("value")?;
                Some((uuid, json_type_name(value)))
            })
            .collect();

        // Check every non-Foundation token against the Foundation type for its UUID.
        for t in ctx
            .graph
            .tokens
            .values()
            .filter(|t| t.layer > Layer::Foundation)
        {
            let Some(uuid) = t.uuid.as_deref() else {
                continue;
            };
            let Some(override_value) = t.raw.get("value") else {
                continue;
            };
            let Some(&foundation_type) = foundation_value_types.get(uuid) else {
                // No Foundation token with this UUID — not a type-compat violation.
                continue;
            };
            let override_type = json_type_name(override_value);
            if override_type != foundation_type {
                out.push(Diagnostic {
                    file: t.file.clone(),
                    token: Some(t.name.clone()),
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Error,
                    message: format!(
                        "Token '{}' override changes value type from '{}' to '{}' — overrides MUST NOT change the resolved token's value type",
                        t.name, foundation_type, override_type
                    ),
                    instance_path: None,
                    schema_path: None,
                });
            }
        }

        out
    }
}

fn json_type_name(v: &Value) -> &'static str {
    match v {
        Value::Null => "null",
        Value::Bool(_) => "boolean",
        Value::Number(_) => "number",
        Value::String(_) => "string",
        Value::Array(_) => "array",
        Value::Object(_) => "object",
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::json;

    use crate::graph::{Layer, TokenGraph, TokenRecord};
    use crate::registry::RegistryData;
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec032::Rule;

    fn make_graph(records: Vec<TokenRecord>) -> TokenGraph {
        TokenGraph::from_records(records)
    }

    fn run(records: Vec<TokenRecord>) -> Vec<crate::report::Diagnostic> {
        let g = make_graph(records);
        let exceptions = std::collections::HashSet::new();
        let registry = RegistryData::embedded();
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: &registry,
            manifest: None,
        };
        Rule.validate(&ctx)
    }

    fn foundation(uuid: &str, value: serde_json::Value) -> TokenRecord {
        TokenRecord {
            name: format!("foundation-{uuid}"),
            file: PathBuf::from("foundation.tokens.json"),
            index: 0,
            schema_url: None,
            uuid: Some(uuid.into()),
            alias_target: None,
            raw: json!({"name": {"property": "p"}, "uuid": uuid, "value": value}),
            layer: Layer::Foundation,
        }
    }

    fn product_override(uuid: &str, value: serde_json::Value) -> TokenRecord {
        TokenRecord {
            name: format!("product-context:{uuid}:0"),
            file: PathBuf::from("product-context.json"),
            index: 0,
            schema_url: None,
            uuid: Some(uuid.into()),
            alias_target: None,
            raw: json!({"name": {"property": "p"}, "uuid": uuid, "value": value}),
            layer: Layer::Product,
        }
    }

    #[test]
    fn same_type_no_error() {
        let diags = run(vec![
            foundation("uuid-1", json!("#abc")),
            product_override("uuid-1", json!("#fff")),
        ]);
        assert!(diags.is_empty());
    }

    #[test]
    fn type_change_string_to_object_is_error() {
        let diags = run(vec![
            foundation("uuid-2", json!("#abc")),
            product_override("uuid-2", json!({"r": 0, "g": 0, "b": 0})),
        ]);
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-032"));
        assert!(diags[0].message.contains("string"));
        assert!(diags[0].message.contains("object"));
    }

    #[test]
    fn type_change_object_to_string_is_error() {
        let diags = run(vec![
            foundation("uuid-3", json!({"fontFamily": "Adobe Clean"})),
            product_override("uuid-3", json!("some-alias")),
        ]);
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
    }

    #[test]
    fn product_token_without_foundation_no_error() {
        // Net-new product token (no Foundation match) should not trigger rule.
        let net_new = TokenRecord {
            name: "product-context-ext:p:0".into(),
            file: PathBuf::from("product-context.json"),
            index: 0,
            schema_url: None,
            uuid: Some("uuid-new".into()),
            alias_target: None,
            raw: json!({"name": {"property": "q"}, "uuid": "uuid-new", "value": "#123"}),
            layer: Layer::Product,
        };
        let diags = run(vec![net_new]);
        assert!(diags.is_empty());
    }

    #[test]
    fn foundation_only_no_error() {
        let diags = run(vec![foundation("uuid-5", json!("#abc"))]);
        assert!(diags.is_empty());
    }

    #[test]
    fn platform_layer_type_change_is_error() {
        // Per spec/cascade.md, Platform layer MUST also remain type-compatible.
        let platform = TokenRecord {
            name: "platform:uuid-6:0".into(),
            file: PathBuf::from("platform-context.json"),
            index: 0,
            schema_url: None,
            uuid: Some("uuid-6".into()),
            alias_target: None,
            raw: json!({"name": {"property": "spacing"}, "uuid": "uuid-6", "value": 8}),
            layer: Layer::Platform,
        };
        let diags = run(vec![foundation("uuid-6", json!("8px")), platform]);
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-032"));
        assert!(diags[0].message.contains("string"));
        assert!(diags[0].message.contains("number"));
    }

    #[test]
    fn platform_layer_same_type_no_error() {
        let platform = TokenRecord {
            name: "platform:uuid-7:0".into(),
            file: PathBuf::from("platform-context.json"),
            index: 0,
            schema_url: None,
            uuid: Some("uuid-7".into()),
            alias_target: None,
            raw: json!({"name": {"property": "spacing"}, "uuid": "uuid-7", "value": "12px"}),
            layer: Layer::Platform,
        };
        let diags = run(vec![foundation("uuid-7", json!("8px")), platform]);
        assert!(diags.is_empty());
    }
}
