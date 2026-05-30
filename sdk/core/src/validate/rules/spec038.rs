// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-038: option-enum-obsolete
//!
//! Option descriptors SHOULD NOT use the JSON Schema `enum` keyword; use `values`
//! instead so per-value lifecycle metadata can be expressed. `optionDescriptor` uses
//! `additionalProperties: true` to permit JSON Schema passthrough fields, so `enum`
//! is silently accepted at Layer 1 — this advisory rule closes that gap at Layer 2.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-038"
    }

    fn name(&self) -> &'static str {
        "option-enum-obsolete"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        for comp in &ctx.graph.components {
            let Some(options) = comp.raw.get("options").and_then(|v| v.as_object()) else {
                continue;
            };

            for (option_key, option_desc) in options {
                if option_desc.get("enum").is_some() {
                    out.push(Diagnostic {
                        file: comp.file.clone(),
                        token: None,
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Warning,
                        message: format!(
                            "Component '{}' option '{option_key}' uses the obsolete `enum` \
                             keyword; replace with a `values` array so per-value lifecycle \
                             metadata can be expressed",
                            comp.name
                        ),
                        instance_path: Some(format!("/options/{option_key}/enum")),
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

    use crate::graph::{ComponentRecord, TokenGraph};
    use crate::registry::RegistryData;
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec038::Rule;

    fn make_graph(comp_raw: serde_json::Value) -> TokenGraph {
        let mut g = TokenGraph::default();
        let comp_name = comp_raw
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("button")
            .to_string();
        g.components.push(ComponentRecord {
            name: comp_name,
            file: PathBuf::from("dataset.json"),
            raw: comp_raw,
        });
        g
    }

    fn run(comp_raw: serde_json::Value) -> Vec<crate::report::Diagnostic> {
        let g = make_graph(comp_raw);
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

    #[test]
    fn values_array_no_warning() {
        let diags = run(json!({
            "name": "button",
            "options": {
                "variant": {
                    "type": "string",
                    "values": [{"value": "primary"}, {"value": "secondary"}]
                }
            }
        }));
        assert!(diags.is_empty());
    }

    #[test]
    fn enum_keyword_warns() {
        let diags = run(json!({
            "name": "button",
            "options": {
                "variant": {
                    "type": "string",
                    "enum": ["primary", "secondary"]
                }
            }
        }));
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-038"));
        assert!(diags[0].message.contains("obsolete"));
        assert!(diags[0].message.contains("variant"));
        assert!(diags[0].message.contains("button"));
        assert_eq!(
            diags[0].instance_path.as_deref(),
            Some("/options/variant/enum")
        );
    }

    #[test]
    fn multiple_options_one_enum_one_warning() {
        let diags = run(json!({
            "name": "button",
            "options": {
                "variant": {"type": "string", "enum": ["primary", "secondary"]},
                "size": {"type": "string", "values": [{"value": "s"}, {"value": "m"}]}
            }
        }));
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("variant"));
    }

    #[test]
    fn multiple_enum_options_multiple_warnings() {
        let diags = run(json!({
            "name": "button",
            "options": {
                "variant": {"type": "string", "enum": ["primary"]},
                "size": {"type": "string", "enum": ["s", "m"]}
            }
        }));
        assert_eq!(diags.len(), 2);
        assert!(diags.iter().all(|d| d.severity == Severity::Warning));
        assert!(diags
            .iter()
            .all(|d| d.rule_id.as_deref() == Some("SPEC-038")));
    }

    #[test]
    fn no_options_block_no_warning() {
        let diags = run(json!({"name": "button"}));
        assert!(diags.is_empty());
    }

    #[test]
    fn boolean_option_no_warning() {
        let diags = run(json!({
            "name": "button",
            "options": {
                "isDisabled": {"type": "boolean", "default": false}
            }
        }));
        assert!(diags.is_empty());
    }
}
