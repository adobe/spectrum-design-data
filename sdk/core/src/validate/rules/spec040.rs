// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-040: component-option-field-valid
//!
//! For every token whose name object contains a key that (a) is not a reserved
//! name-object field and (b) matches a declared `component.options.<key>` with a
//! `values[]` list, the token's value MUST appear in that `values[]` list.
//!
//! This generalises SPEC-019 (`component-variant-valid`, Error) to the remaining
//! option-enum fields such as `style`, `size`, `staticColor`, etc. Severity is
//! Warning (advisory) so real datasets can absorb the new check incrementally;
//! promotion to Error is deferred until the option catalog stabilises.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

/// Name-object keys owned by other rules or the cascade machinery.
/// SPEC-040 skips these to avoid double-reporting.
///
/// `state` is validated by SPEC-022 against `component.states[].name`, not
/// `component.options.state.values[]`. If a future component declared a `state`
/// option with its own `values[]`, SPEC-040 would still skip it — intentionally
/// conservative so SPEC-022 remains the sole authority on state values.
const RESERVED: &[&str] = &[
    "property",
    "component",
    "variant", // SPEC-019: component-variant-valid (Error)
    "state",   // SPEC-022: component-state-valid (Error) — validated against states[], not options
    "anatomy", // SPEC-020: component-anatomy-valid (Error)
    "colorScheme",
    "scale",
    "contrast",
    "uuid",
    "object",
    "category",
];

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-040"
    }

    fn name(&self) -> &'static str {
        "component-option-field-valid"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        let comp_map: std::collections::HashMap<&str, &crate::graph::ComponentRecord> = ctx
            .graph
            .components
            .iter()
            .map(|c| (c.name.as_str(), c))
            .collect();

        for t in ctx.graph.tokens.values() {
            let Some(name_obj) = t.raw.get("name").and_then(|v| v.as_object()) else {
                continue;
            };
            let Some(component) = name_obj.get("component").and_then(|v| v.as_str()) else {
                continue;
            };
            let Some(comp) = comp_map.get(component) else {
                continue; // SPEC-018 covers undeclared component
            };

            let token_label = serde_json::to_string(name_obj).unwrap_or_default();

            for (key, val) in name_obj {
                if RESERVED.contains(&key.as_str()) {
                    continue;
                }
                let Some(field_val) = val.as_str() else {
                    continue; // Layer 1 catches non-string option values
                };

                let Some(declared_values) = comp
                    .raw
                    .get("options")
                    .and_then(|o| o.get(key.as_str()))
                    .and_then(|opt| opt.get("values"))
                    .and_then(|v| v.as_array())
                else {
                    continue; // option not declared, or no values[] — any value allowed
                };

                let declared: std::collections::HashSet<&str> = declared_values
                    .iter()
                    .filter_map(|entry| entry.get("value").and_then(|v| v.as_str()))
                    .collect();

                // An empty values[] is a schema oddity (no valid values declared).
                // Treat it the same as an absent values[] — no constraint — rather
                // than warning on every token value, which would be a false-positive
                // storm from a malformed component definition.
                if declared.is_empty() {
                    continue;
                }

                // Deprecated-but-declared values (lifecycle.deprecated on the values
                // entry) still appear in `declared` and pass here. SPEC-037 fires the
                // advisory warning for those separately — this rule only checks
                // existence in the declared set, not lifecycle status.
                if !declared.contains(field_val) {
                    out.push(Diagnostic {
                        file: t.file.clone(),
                        token: Some(t.name.clone()),
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Warning,
                        message: format!(
                            "Token '{token_label}' has {key} '{field_val}' which is not declared on component '{component}'"
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

    use crate::graph::{ComponentRecord, Layer, TokenGraph, TokenRecord};
    use crate::registry::RegistryData;
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec040::Rule;

    fn make_graph(token_name: serde_json::Value, component_json: serde_json::Value) -> TokenGraph {
        let comp_name = component_json
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("test-component")
            .to_string();
        let mut g = TokenGraph::default();
        g.tokens.insert(
            "t".into(),
            TokenRecord {
                name: "t".into(),
                raw: json!({ "name": token_name, "value": "#000" }),
                file: PathBuf::from("tokens.json"),
                index: 0,
                schema_url: None,
                uuid: None,
                alias_target: None,
                layer: Layer::Foundation,
            },
        );
        g.components.push(ComponentRecord {
            name: comp_name,
            file: PathBuf::from("components/test.json"),
            raw: component_json,
        });
        g
    }

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
    fn valid_value_passes() {
        let g = make_graph(
            json!({ "component": "button", "style": "fill" }),
            json!({
                "name": "button",
                "options": {
                    "style": {
                        "type": "enum",
                        "values": [{ "value": "fill" }, { "value": "outline" }]
                    }
                }
            }),
        );
        assert!(run(&g).is_empty());
    }

    #[test]
    fn unknown_value_warns() {
        let g = make_graph(
            json!({ "component": "button", "style": "ghost" }),
            json!({
                "name": "button",
                "options": {
                    "style": {
                        "type": "enum",
                        "values": [{ "value": "fill" }, { "value": "outline" }]
                    }
                }
            }),
        );
        let diags = run(&g);
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-040"));
        assert!(diags[0].message.contains("style"));
        assert!(diags[0].message.contains("ghost"));
    }

    #[test]
    fn option_without_values_skipped() {
        // Boolean / free-form options that have no values[] are not checked.
        let g = make_graph(
            json!({ "component": "button", "isDisabled": "true" }),
            json!({
                "name": "button",
                "options": {
                    "isDisabled": { "type": "boolean" }
                }
            }),
        );
        assert!(run(&g).is_empty());
    }

    #[test]
    fn empty_values_array_skipped() {
        // An empty values[] is a malformed component definition. Treat it the same
        // as an absent values[] (no constraint) rather than warning on every value.
        let g = make_graph(
            json!({ "component": "button", "style": "fill" }),
            json!({
                "name": "button",
                "options": {
                    "style": {
                        "type": "enum",
                        "values": []
                    }
                }
            }),
        );
        assert!(run(&g).is_empty(), "empty values[] must not warn");
    }

    #[test]
    fn unknown_key_not_in_options_skipped() {
        // Name field has no matching option at all — silently skip (SPEC-009 handles vocab).
        let g = make_graph(
            json!({ "component": "button", "customField": "whatever" }),
            json!({ "name": "button", "options": {} }),
        );
        assert!(run(&g).is_empty());
    }

    #[test]
    fn reserved_key_variant_skipped() {
        // `variant` is owned by SPEC-019; SPEC-040 must not double-report.
        let g = make_graph(
            json!({ "component": "button", "variant": "primary" }),
            json!({
                "name": "button",
                "options": {
                    "variant": {
                        "type": "enum",
                        "values": [{ "value": "accent" }, { "value": "primary" }]
                    }
                }
            }),
        );
        assert!(
            run(&g).is_empty(),
            "variant must be skipped (owned by SPEC-019)"
        );
    }

    #[test]
    fn other_reserved_keys_skipped() {
        // Cascade-dimension and structural keys must never be treated as options.
        let g = make_graph(
            json!({ "component": "button", "colorScheme": "dark", "scale": "large" }),
            json!({ "name": "button", "options": {} }),
        );
        assert!(run(&g).is_empty());
    }

    #[test]
    fn missing_component_skipped() {
        // If the referenced component isn't loaded, SPEC-018 handles it; SPEC-040 is silent.
        let mut g = TokenGraph::default();
        g.tokens.insert(
            "t".into(),
            TokenRecord {
                name: "t".into(),
                raw: json!({ "name": { "component": "missing-comp", "style": "fill" }, "value": "#000" }),
                file: PathBuf::from("tokens.json"),
                index: 0,
                schema_url: None,
                uuid: None,
                alias_target: None,
                layer: Layer::Foundation,
            },
        );
        assert!(run(&g).is_empty());
    }

    #[test]
    fn non_string_option_value_skipped() {
        // A number or boolean option value is a Layer 1 violation; SPEC-040 skips it.
        let g = make_graph(
            json!({ "component": "button", "style": 42 }),
            json!({
                "name": "button",
                "options": {
                    "style": {
                        "type": "enum",
                        "values": [{ "value": "fill" }]
                    }
                }
            }),
        );
        assert!(run(&g).is_empty());
    }

    #[test]
    fn multiple_invalid_fields_all_warned() {
        let g = make_graph(
            json!({ "component": "button", "style": "ghost", "size": "xxl" }),
            json!({
                "name": "button",
                "options": {
                    "style": {
                        "type": "enum",
                        "values": [{ "value": "fill" }, { "value": "outline" }]
                    },
                    "size": {
                        "type": "enum",
                        "values": [{ "value": "s" }, { "value": "m" }, { "value": "l" }]
                    }
                }
            }),
        );
        let diags = run(&g);
        assert_eq!(diags.len(), 2);
        assert!(diags.iter().all(|d| d.severity == Severity::Warning));
    }
}
