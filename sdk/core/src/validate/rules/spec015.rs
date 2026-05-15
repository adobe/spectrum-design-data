// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-015: composite-inline-alias-type-compatible
//!
//! When a composite token value contains an inline alias `{token-name}` in one
//! of its sub-values, the resolved target's `$valueType` MUST be compatible with
//! the sub-key's expected scalar type as declared by `x-valueType` in the
//! value-type schema.

use std::collections::HashMap;
use std::sync::LazyLock;

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

// Embed composite value-type schemas to extract x-valueType metadata.
static TYPOGRAPHY_SCHEMA: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../packages/design-data-spec/schemas/value-types/typography.schema.json"
));
static TYPOGRAPHY_SCALE_SCHEMA: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../packages/design-data-spec/schemas/value-types/typography-scale.schema.json"
));
static DROP_SHADOW_SCHEMA: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../packages/design-data-spec/schemas/value-types/drop-shadow.schema.json"
));

/// For each composite `$valueType` path, a map from sub-key name to the list of
/// acceptable scalar value-type names (from `x-valueType` in the schema).
static SUB_KEY_TYPES: LazyLock<HashMap<&'static str, HashMap<String, Vec<String>>>> =
    LazyLock::new(|| {
        let entries: &[(&str, &str, bool)] = &[
            ("value-types/typography.schema.json", TYPOGRAPHY_SCHEMA, false),
            (
                "value-types/typography-scale.schema.json",
                TYPOGRAPHY_SCALE_SCHEMA,
                false,
            ),
            ("value-types/drop-shadow.schema.json", DROP_SHADOW_SCHEMA, true),
        ];

        let mut outer: HashMap<&'static str, HashMap<String, Vec<String>>> = HashMap::new();
        for (key, src, is_array) in entries {
            let schema: Value =
                serde_json::from_str(src).expect("embedded value-type schema is valid JSON");

            let props_loc = if *is_array {
                schema.pointer("/items/properties")
            } else {
                schema.pointer("/properties")
            };

            let Some(props) = props_loc.and_then(|v| v.as_object()) else {
                continue;
            };

            let mut sub_map: HashMap<String, Vec<String>> = HashMap::new();
            for (sub_key, prop_schema) in props {
                let x_value_type = prop_schema.get("x-valueType");
                let types: Vec<String> = match x_value_type {
                    Some(Value::String(s)) => vec![s.clone()],
                    Some(Value::Array(arr)) => arr
                        .iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect(),
                    _ => continue,
                };
                sub_map.insert(sub_key.clone(), types);
            }
            outer.insert(key, sub_map);
        }
        outer
    });

/// Extract the scalar value-type name from a `$valueType` string.
///
/// Token `$valueType` is a schema-relative path like `"value-types/color.schema.json"`.
/// We strip the `value-types/` prefix and `.schema.json` suffix to get `"color"`.
/// If the string doesn't match that pattern, it's returned as-is for forward compatibility.
fn scalar_name_from_value_type(vt: &str) -> &str {
    let s = vt.strip_prefix("value-types/").unwrap_or(vt);
    s.strip_suffix(".schema.json").unwrap_or(s)
}

/// Returns `true` if the string looks like an inline alias: `{token-name}`.
fn is_inline_alias(s: &str) -> bool {
    s.starts_with('{') && s.ends_with('}') && s.len() > 2
}

/// Extract the target name from an inline alias string (strips `{` and `}`).
fn inline_alias_target(s: &str) -> &str {
    &s[1..s.len() - 1]
}

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-015"
    }

    fn name(&self) -> &'static str {
        "composite-inline-alias-type-compatible"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        for t in ctx.graph.tokens.values() {
            let Some(value_type) = t.raw.get("$valueType").and_then(|v| v.as_str()) else {
                continue;
            };
            let Some(sub_key_types) = SUB_KEY_TYPES.get(value_type) else {
                // Not a composite schema we know about.
                continue;
            };
            let Some(value) = t.raw.get("value") else {
                continue;
            };

            // Collect (sub_key, inline_alias_target) pairs from the composite value.
            let aliases: Vec<(String, String)> =
                if value_type == "value-types/drop-shadow.schema.json" {
                    // Drop-shadow: array of objects.
                    let Some(arr) = value.as_array() else { continue };
                    arr.iter()
                        .filter_map(|item| item.as_object())
                        .flat_map(|obj| {
                            obj.iter().filter_map(|(k, v)| {
                                v.as_str()
                                    .filter(|s| is_inline_alias(s))
                                    .map(|s| (k.clone(), inline_alias_target(s).to_string()))
                            })
                        })
                        .collect()
                } else {
                    // Typography / typography-scale: flat object.
                    let Some(obj) = value.as_object() else { continue };
                    obj.iter()
                        .filter_map(|(k, v)| {
                            v.as_str()
                                .filter(|s| is_inline_alias(s))
                                .map(|s| (k.clone(), inline_alias_target(s).to_string()))
                        })
                        .collect()
                };

            for (sub_key, target_name) in aliases {
                let Some(expected_types) = sub_key_types.get(&sub_key) else {
                    // Sub-key has no x-valueType annotation — skip.
                    continue;
                };

                let Some(target_record) = ctx.graph.tokens.get(&target_name) else {
                    // Missing target is SPEC-014's job, not ours.
                    continue;
                };

                let leaf = target_record.resolve_leaf(ctx.graph);

                let Some(leaf_value_type) = leaf.raw.get("$valueType").and_then(|v| v.as_str())
                else {
                    // Leaf has no $valueType — we can't check compatibility.
                    continue;
                };

                let actual = scalar_name_from_value_type(leaf_value_type);

                if !expected_types.iter().any(|e| e == actual) {
                    out.push(Diagnostic {
                        file: t.file.clone(),
                        token: Some(t.name.clone()),
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Error,
                        message: format!(
                            "Token '{}' composite sub-value '{}' resolves alias '{{{}}}' to value-type '{}', expected one of [{}]",
                            t.name,
                            sub_key,
                            target_name,
                            actual,
                            expected_types.join(", ")
                        ),
                        instance_path: None,
                        schema_path: None,
                    });
                }
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
    use crate::validate::rules::spec015::Rule;

    fn make_graph(tokens: Vec<(String, serde_json::Value)>) -> TokenGraph {
        let mut g = TokenGraph::default();
        for (name, raw) in tokens {
            g.tokens.insert(
                name.clone(),
                TokenRecord {
                    name,
                    file: PathBuf::from("dataset.json"),
                    index: 0,
                    schema_url: None,
                    uuid: None,
                    alias_target: None,
                    raw,
                },
            );
        }
        g
    }

    fn run(tokens: Vec<(String, serde_json::Value)>) -> Vec<crate::report::Diagnostic> {
        let g = make_graph(tokens);
        let exceptions = std::collections::HashSet::new();
        let registry = RegistryData::embedded();
        let ctx = ValidationContext { graph: &g, naming_exceptions: &exceptions, registry: &registry };
        Rule.validate(&ctx)
    }

    #[test]
    fn no_value_type_no_error() {
        let diags = run(vec![(
            "t".into(),
            json!({"name": {"property": "thing"}, "value": "1px"}),
        )]);
        assert!(diags.is_empty());
    }

    #[test]
    fn non_composite_value_type_skipped() {
        let diags = run(vec![(
            "t".into(),
            json!({"name": {"property": "color"}, "$valueType": "value-types/color.schema.json", "value": "#fff"}),
        )]);
        assert!(diags.is_empty());
    }

    #[test]
    fn typography_literal_sub_values_no_error() {
        let diags = run(vec![(
            "t".into(),
            json!({
                "name": {"property": "heading"},
                "$valueType": "value-types/typography.schema.json",
                "value": {
                    "fontFamily": "Adobe Clean",
                    "fontSize": "32px",
                    "fontWeight": "700",
                    "lineHeight": "1.2"
                }
            }),
        )]);
        assert!(diags.is_empty());
    }

    #[test]
    fn typography_inline_alias_compatible_no_error() {
        // fontSize alias resolves to a dimension token.
        let diags = run(vec![
            (
                "font-size-100".into(),
                json!({
                    "name": {"property": "font-size-100"},
                    "$valueType": "value-types/dimension.schema.json",
                    "value": "16px"
                }),
            ),
            (
                "heading-style".into(),
                json!({
                    "name": {"property": "heading-style"},
                    "$valueType": "value-types/typography.schema.json",
                    "value": {
                        "fontFamily": "Adobe Clean",
                        "fontSize": "{font-size-100}",
                        "fontWeight": "700",
                        "lineHeight": "1.2"
                    }
                }),
            ),
        ]);
        assert!(diags.is_empty());
    }

    #[test]
    fn typography_inline_alias_type_mismatch_error() {
        // fontSize alias resolves to a color token — mismatch.
        let diags = run(vec![
            (
                "accent-color".into(),
                json!({
                    "name": {"property": "accent-color"},
                    "$valueType": "value-types/color.schema.json",
                    "value": "#0265DC"
                }),
            ),
            (
                "heading-style".into(),
                json!({
                    "name": {"property": "heading-style"},
                    "$valueType": "value-types/typography.schema.json",
                    "value": {
                        "fontFamily": "Adobe Clean",
                        "fontSize": "{accent-color}",
                        "fontWeight": "700",
                        "lineHeight": "1.2"
                    }
                }),
            ),
        ]);
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-015"));
        assert!(diags[0].message.contains("fontSize"));
        assert!(diags[0].message.contains("color"));
    }

    #[test]
    fn typography_line_height_accepts_number_type() {
        // lineHeight accepts both "dimension" and "number".
        let diags = run(vec![
            (
                "line-height-token".into(),
                json!({
                    "name": {"property": "line-height-token"},
                    "$valueType": "value-types/number.schema.json",
                    "value": "1.5"
                }),
            ),
            (
                "heading-style".into(),
                json!({
                    "name": {"property": "heading-style"},
                    "$valueType": "value-types/typography.schema.json",
                    "value": {
                        "fontFamily": "Adobe Clean",
                        "fontSize": "16px",
                        "fontWeight": "700",
                        "lineHeight": "{line-height-token}"
                    }
                }),
            ),
        ]);
        assert!(diags.is_empty());
    }

    #[test]
    fn missing_alias_target_no_spec015_error() {
        // Missing target is SPEC-014's responsibility.
        let diags = run(vec![(
            "heading-style".into(),
            json!({
                "name": {"property": "heading-style"},
                "$valueType": "value-types/typography.schema.json",
                "value": {
                    "fontFamily": "Adobe Clean",
                    "fontSize": "{nonexistent-token}",
                    "fontWeight": "700",
                    "lineHeight": "1.2"
                }
            }),
        )]);
        assert!(diags.is_empty());
    }

    #[test]
    fn drop_shadow_inline_alias_color_mismatch_error() {
        // drop-shadow color sub-value aliases a dimension token — mismatch.
        let diags = run(vec![
            (
                "a-dimension".into(),
                json!({
                    "name": {"property": "a-dimension"},
                    "$valueType": "value-types/dimension.schema.json",
                    "value": "4px"
                }),
            ),
            (
                "shadow-token".into(),
                json!({
                    "name": {"property": "shadow-token"},
                    "$valueType": "value-types/drop-shadow.schema.json",
                    "value": [
                        {
                            "x": "0px",
                            "y": "2px",
                            "blur": "4px",
                            "spread": "0px",
                            "color": "{a-dimension}"
                        }
                    ]
                }),
            ),
        ]);
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
        assert!(diags[0].message.contains("color"));
        assert!(diags[0].message.contains("dimension"));
    }
}
