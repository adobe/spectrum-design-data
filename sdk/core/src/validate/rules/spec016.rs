// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-016: value-type-match
//!
//! When a token carries a `$valueType` field, its `value` MUST validate against
//! the referenced value-type schema.

use std::collections::HashMap;
use std::sync::LazyLock;

use jsonschema::Validator;
use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

// Embed all value-type schemas from the spec at compile time.
static COLOR_SCHEMA: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../packages/design-data-spec/schemas/value-types/color.schema.json"
));
static DROP_SHADOW_SCHEMA: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../packages/design-data-spec/schemas/value-types/drop-shadow.schema.json"
));
static TYPOGRAPHY_SCHEMA: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../packages/design-data-spec/schemas/value-types/typography.schema.json"
));
static TYPOGRAPHY_SCALE_SCHEMA: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../packages/design-data-spec/schemas/value-types/typography-scale.schema.json"
));

/// Map of `$valueType` relative path → compiled validator, initialized once.
static VALIDATORS: LazyLock<HashMap<&'static str, Validator>> = LazyLock::new(|| {
    let schemas: &[(&str, &str)] = &[
        ("value-types/color.schema.json", COLOR_SCHEMA),
        ("value-types/drop-shadow.schema.json", DROP_SHADOW_SCHEMA),
        ("value-types/typography.schema.json", TYPOGRAPHY_SCHEMA),
        (
            "value-types/typography-scale.schema.json",
            TYPOGRAPHY_SCALE_SCHEMA,
        ),
    ];
    let mut map = HashMap::new();
    for (key, src) in schemas {
        let schema: Value = serde_json::from_str(src).expect("embedded schema is valid JSON");
        let validator = jsonschema::validator_for(&schema).expect("embedded schema compiles");
        map.insert(*key, validator);
    }
    map
});

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-016"
    }

    fn name(&self) -> &'static str {
        "value-type-match"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        for t in ctx.graph.tokens.values() {
            let Some(value_type) = t.raw.get("$valueType").and_then(|v| v.as_str()) else {
                continue;
            };
            let Some(value) = t.raw.get("value") else {
                continue;
            };

            let Some(validator) = VALIDATORS.get(value_type) else {
                // Unknown $valueType path — not our schema to validate.
                continue;
            };

            if !validator.is_valid(value) {
                out.push(Diagnostic {
                    file: t.file.clone(),
                    token: Some(t.name.clone()),
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Error,
                    message: format!(
                        "Token '{}' value does not validate against declared $valueType schema '{value_type}'",
                        t.name
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

    use crate::graph::{TokenGraph, TokenRecord};
    use crate::registry::RegistryData;
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec016::Rule;

    fn make_graph(raw: serde_json::Value) -> TokenGraph {
        let mut g = TokenGraph::default();
        g.tokens.insert(
            "t".into(),
            TokenRecord {
                name: "t".into(),
                file: PathBuf::from("dataset.json"),
                index: 0,
                schema_url: None,
                uuid: None,
                alias_target: None,
                raw,
            },
        );
        g
    }

    fn run(raw: serde_json::Value) -> Vec<crate::report::Diagnostic> {
        let g = make_graph(raw);
        let exceptions = std::collections::HashSet::new();
        let registry = RegistryData::embedded();
        let ctx = ValidationContext { graph: &g, naming_exceptions: &exceptions, registry: &registry };
        Rule.validate(&ctx)
    }

    #[test]
    fn no_value_type_no_error() {
        let diags = run(json!({"name": {"property": "color"}, "value": "#fff"}));
        assert!(diags.is_empty());
    }

    #[test]
    fn valid_typography_value_no_error() {
        let diags = run(json!({
            "name": {"property": "heading"},
            "$valueType": "value-types/typography.schema.json",
            "value": {
                "fontFamily": "Adobe Clean",
                "fontSize": "32px",
                "fontWeight": "700",
                "lineHeight": "1.2"
            }
        }));
        assert!(diags.is_empty());
    }

    #[test]
    fn invalid_typography_value_error() {
        let diags = run(json!({
            "name": {"property": "bad-typography"},
            "$valueType": "value-types/typography.schema.json",
            "value": "not-an-object"
        }));
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-016"));
        assert!(diags[0].message.contains("$valueType schema"));
    }

    #[test]
    fn unknown_value_type_path_skipped() {
        let diags = run(json!({
            "name": {"property": "thing"},
            "$valueType": "value-types/unknown-future-type.schema.json",
            "value": "anything"
        }));
        assert!(diags.is_empty());
    }
}
