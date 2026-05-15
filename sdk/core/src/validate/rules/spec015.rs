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

/// Per-schema descriptor: whether the composite value is an array of objects
/// (true) or a flat object (false), plus the sub-key → acceptable scalar types map.
struct CompositeDescriptor {
    value_is_array: bool,
    sub_key_types: HashMap<String, Vec<String>>,
}

/// Map of composite `$valueType` path → descriptor, initialized once.
///
/// Storing `value_is_array` here keeps the dispatch data-driven: adding a new
/// array-typed composite schema requires only a new entry in the `entries` slice
/// below, not a code-path change in `validate`.
static DESCRIPTORS: LazyLock<HashMap<&'static str, CompositeDescriptor>> = LazyLock::new(|| {
    let entries: &[(&str, &str, bool)] = &[
        ("value-types/typography.schema.json", TYPOGRAPHY_SCHEMA, false),
        (
            "value-types/typography-scale.schema.json",
            TYPOGRAPHY_SCALE_SCHEMA,
            false,
        ),
        ("value-types/drop-shadow.schema.json", DROP_SHADOW_SCHEMA, true),
    ];

    let mut map: HashMap<&'static str, CompositeDescriptor> = HashMap::new();
    for (key, src, value_is_array) in entries {
        let schema: Value =
            serde_json::from_str(src).expect("embedded value-type schema is valid JSON");

        let props_loc = if *value_is_array {
            schema.pointer("/items/properties")
        } else {
            schema.pointer("/properties")
        };

        let Some(props) = props_loc.and_then(|v| v.as_object()) else {
            continue;
        };

        let mut sub_key_types: HashMap<String, Vec<String>> = HashMap::new();
        for (sub_key, prop_schema) in props {
            let types: Vec<String> = match prop_schema.get("x-valueType") {
                Some(Value::String(s)) => vec![s.clone()],
                Some(Value::Array(arr)) => {
                    arr.iter().filter_map(|v| v.as_str().map(String::from)).collect()
                }
                _ => continue,
            };
            sub_key_types.insert(sub_key.clone(), types);
        }

        map.insert(
            key,
            CompositeDescriptor { value_is_array: *value_is_array, sub_key_types },
        );
    }
    map
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
///
/// `{` and `}` are single-byte ASCII, so `s.len() > 2` is a safe byte-length
/// guard for the subsequent `&s[1..s.len()-1]` slice in `inline_alias_target`.
fn is_inline_alias(s: &str) -> bool {
    s.starts_with('{') && s.ends_with('}') && s.len() > 2
}

/// Extract the target name from an inline alias string (strips `{` and `}`).
fn inline_alias_target(s: &str) -> &str {
    &s[1..s.len() - 1]
}

/// Collect `(sub_key, alias_target_name)` pairs from a composite token value.
fn collect_inline_aliases(value: &Value, value_is_array: bool) -> Vec<(String, String)> {
    if value_is_array {
        let Some(arr) = value.as_array() else {
            return Vec::new();
        };
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
        let Some(obj) = value.as_object() else {
            return Vec::new();
        };
        obj.iter()
            .filter_map(|(k, v)| {
                v.as_str()
                    .filter(|s| is_inline_alias(s))
                    .map(|s| (k.clone(), inline_alias_target(s).to_string()))
            })
            .collect()
    }
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
            let Some(desc) = DESCRIPTORS.get(value_type) else {
                // Not a composite schema we know about.
                continue;
            };
            let Some(value) = t.raw.get("value") else {
                continue;
            };

            let aliases = collect_inline_aliases(value, desc.value_is_array);

            for (sub_key, target_name) in aliases {
                let Some(expected_types) = desc.sub_key_types.get(&sub_key) else {
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

    /// Build a graph from (name, raw_json, optional_alias_target) triples.
    fn make_graph(tokens: Vec<(String, serde_json::Value, Option<String>)>) -> TokenGraph {
        let mut g = TokenGraph::default();
        for (name, raw, alias_target) in tokens {
            g.tokens.insert(
                name.clone(),
                TokenRecord {
                    name,
                    file: PathBuf::from("dataset.json"),
                    index: 0,
                    schema_url: None,
                    uuid: None,
                    alias_target,
                    raw,
                },
            );
        }
        g
    }

    fn run(tokens: Vec<(String, serde_json::Value, Option<String>)>) -> Vec<crate::report::Diagnostic> {
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
            None,
        )]);
        assert!(diags.is_empty());
    }

    #[test]
    fn non_composite_value_type_skipped() {
        let diags = run(vec![(
            "t".into(),
            json!({"name": {"property": "color"}, "$valueType": "value-types/color.schema.json", "value": "#fff"}),
            None,
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
            None,
        )]);
        assert!(diags.is_empty());
    }

    #[test]
    fn typography_inline_alias_compatible_no_error() {
        let diags = run(vec![
            (
                "font-size-100".into(),
                json!({
                    "name": {"property": "font-size-100"},
                    "$valueType": "value-types/dimension.schema.json",
                    "value": "16px"
                }),
                None,
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
                None,
            ),
        ]);
        assert!(diags.is_empty());
    }

    #[test]
    fn typography_inline_alias_type_mismatch_error() {
        let diags = run(vec![
            (
                "accent-color".into(),
                json!({
                    "name": {"property": "accent-color"},
                    "$valueType": "value-types/color.schema.json",
                    "value": "#0265DC"
                }),
                None,
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
                None,
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
        let diags = run(vec![
            (
                "line-height-token".into(),
                json!({
                    "name": {"property": "line-height-token"},
                    "$valueType": "value-types/number.schema.json",
                    "value": "1.5"
                }),
                None,
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
                None,
            ),
        ]);
        assert!(diags.is_empty());
    }

    #[test]
    fn missing_alias_target_no_spec015_error() {
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
            None,
        )]);
        assert!(diags.is_empty());
    }

    #[test]
    fn drop_shadow_inline_alias_color_mismatch_error() {
        let diags = run(vec![
            (
                "a-dimension".into(),
                json!({
                    "name": {"property": "a-dimension"},
                    "$valueType": "value-types/dimension.schema.json",
                    "value": "4px"
                }),
                None,
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
                None,
            ),
        ]);
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
        assert!(diags[0].message.contains("color"));
        assert!(diags[0].message.contains("dimension"));
    }

    #[test]
    fn typography_scale_inline_alias_type_mismatch_error() {
        // Covers the typography-scale composite schema path.
        let diags = run(vec![
            (
                "accent-color".into(),
                json!({
                    "name": {"property": "accent-color"},
                    "$valueType": "value-types/color.schema.json",
                    "value": "rgb(2, 101, 220)"
                }),
                None,
            ),
            (
                "scale-100".into(),
                json!({
                    "name": {"property": "scale-100"},
                    "$valueType": "value-types/typography-scale.schema.json",
                    "value": {
                        "fontSize": "{accent-color}",
                        "lineHeight": "1.4"
                    }
                }),
                None,
            ),
        ]);
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-015"));
        assert!(diags[0].message.contains("fontSize"));
        assert!(diags[0].message.contains("color"));
    }

    #[test]
    fn typography_scale_inline_alias_compatible_no_error() {
        let diags = run(vec![
            (
                "font-size-200".into(),
                json!({
                    "name": {"property": "font-size-200"},
                    "$valueType": "value-types/dimension.schema.json",
                    "value": "20px"
                }),
                None,
            ),
            (
                "scale-200".into(),
                json!({
                    "name": {"property": "scale-200"},
                    "$valueType": "value-types/typography-scale.schema.json",
                    "value": {
                        "fontSize": "{font-size-200}",
                        "lineHeight": "1.4"
                    }
                }),
                None,
            ),
        ]);
        assert!(diags.is_empty());
    }

    #[test]
    fn chained_alias_resolves_to_leaf_type() {
        // fontSize → intermediate-alias → color-leaf: resolve_leaf follows the chain.
        let diags = run(vec![
            (
                "color-leaf".into(),
                json!({
                    "name": {"property": "color-leaf"},
                    "$valueType": "value-types/color.schema.json",
                    "value": "rgb(2, 101, 220)"
                }),
                None,
            ),
            (
                "intermediate-alias".into(),
                // No $valueType on the alias itself; alias_target points to the leaf.
                json!({"name": {"property": "intermediate-alias"}}),
                Some("color-leaf".to_string()),
            ),
            (
                "heading-style".into(),
                json!({
                    "name": {"property": "heading-style"},
                    "$valueType": "value-types/typography.schema.json",
                    "value": {
                        "fontFamily": "Adobe Clean",
                        "fontSize": "{intermediate-alias}",
                        "fontWeight": "700",
                        "lineHeight": "1.2"
                    }
                }),
                None,
            ),
        ]);
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-015"));
        assert!(diags[0].message.contains("color"));
    }

    #[test]
    fn drop_shadow_multi_layer_partial_alias_error() {
        // Array with two shadow layers; second layer's color aliases a dimension.
        let diags = run(vec![
            (
                "a-dimension".into(),
                json!({
                    "name": {"property": "a-dimension"},
                    "$valueType": "value-types/dimension.schema.json",
                    "value": "4px"
                }),
                None,
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
                            "color": "rgb(0,0,0)"
                        },
                        {
                            "x": "0px",
                            "y": "4px",
                            "blur": "8px",
                            "spread": "0px",
                            "color": "{a-dimension}"
                        }
                    ]
                }),
                None,
            ),
        ]);
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-015"));
        assert!(diags[0].message.contains("color"));
        assert!(diags[0].message.contains("dimension"));
    }
}
