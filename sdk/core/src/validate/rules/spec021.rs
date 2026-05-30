// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-021: component-slot-vocabulary
//!
//! Component slot declarations with a name outside the canonical slot vocabulary
//! SHOULD include a description.

use std::collections::HashSet;
use std::sync::LazyLock;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

static CANONICAL_SLOTS: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    [
        "default",
        "icon",
        "label",
        "help-text",
        "negative-help-text",
        "action",
        "heading",
        "description",
        "hero",
        "footer",
        "tooltip",
    ]
    .into_iter()
    .collect()
});

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-021"
    }

    fn name(&self) -> &'static str {
        "component-slot-vocabulary"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();

        for comp in &ctx.graph.components {
            let Some(slots) = comp.raw.get("slots").and_then(|v| v.as_array()) else {
                continue;
            };
            for slot in slots {
                let Some(name) = slot.get("name").and_then(|v| v.as_str()) else {
                    continue;
                };
                if CANONICAL_SLOTS.contains(name) {
                    continue;
                }
                let has_description = slot
                    .get("description")
                    .and_then(|v| v.as_str())
                    .map(|s| !s.is_empty())
                    .unwrap_or(false);
                if !has_description {
                    out.push(Diagnostic {
                        file: comp.file.clone(),
                        token: None,
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Warning,
                        message: format!(
                            "Component '{}' has custom slot '{name}' with no description — add a description or use a canonical slot name",
                            comp.name
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

    use crate::graph::{ComponentRecord, TokenGraph};
    use crate::registry::RegistryData;
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec021::Rule;

    fn make_graph(comp_raw: serde_json::Value) -> TokenGraph {
        let mut g = TokenGraph::default();
        let name = comp_raw
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("comp")
            .to_string();
        g.components.push(ComponentRecord {
            name,
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
    fn canonical_slot_no_warning() {
        let diags = run(json!({"name": "button", "slots": [{"name": "icon"}]}));
        assert!(diags.is_empty());
    }

    #[test]
    fn custom_slot_with_description_no_warning() {
        let diags = run(json!({
            "name": "button",
            "slots": [{"name": "badge", "description": "Notification badge overlay."}]
        }));
        assert!(diags.is_empty());
    }

    #[test]
    fn custom_slot_no_description_warning() {
        let diags = run(json!({
            "name": "button",
            "slots": [{"name": "badge"}]
        }));
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-021"));
        assert!(diags[0].message.contains("badge"));
    }
}
