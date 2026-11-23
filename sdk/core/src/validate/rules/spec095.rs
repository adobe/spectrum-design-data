// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-095: component-option-name-reserved
//!
//! `anyOf` is reserved in `scope.options` (proposal 017), so a component **MUST NOT** declare
//! an option with that name: a relationship could not pin it.
//!
//! Error.

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-095"
    }

    fn name(&self) -> &'static str {
        "component-option-name-reserved"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        ctx.graph
            .components
            .iter()
            .filter(|c| {
                c.raw
                    .get("options")
                    .and_then(Value::as_object)
                    .is_some_and(|o| o.contains_key(crate::scope::ANY_OF))
            })
            .map(|c| Diagnostic {
                file: c.file.clone(),
                token: None,
                rule_id: Some(self.id().to_string()),
                severity: Severity::Error,
                message: format!(
                    "Component '{}' declares an option named '{}', which is reserved in relationship scopes",
                    c.name,
                    crate::scope::ANY_OF
                ),
                instance_path: Some("/options/anyOf".to_string()),
                schema_path: None,
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::{json, Value};

    use crate::graph::{ComponentRecord, Layer, RelationshipRecord, TokenGraph};
    use crate::registry::RegistryData;
    use crate::validate::rule::{ValidationContext, ValidationRule};

    use super::Rule;

    fn graph(components: Vec<Value>, relationships: Vec<Value>) -> TokenGraph {
        let mut g = TokenGraph::from_records(vec![]);
        g.components = components
            .into_iter()
            .map(|raw| ComponentRecord {
                name: raw["name"].as_str().unwrap_or("x").to_string(),
                file: PathBuf::from("components/x.json"),
                raw,
                layer: Layer::Foundation,
            })
            .collect();
        g.relationships = relationships
            .into_iter()
            .enumerate()
            .map(|(index, raw)| RelationshipRecord {
                file: PathBuf::from("relationships/x.json"),
                index,
                uuid: None,
                raw,
            })
            .collect();
        g
    }

    fn run(g: &TokenGraph) -> Vec<crate::report::Diagnostic> {
        let exceptions = std::collections::HashSet::new();
        let ctx = ValidationContext {
            graph: g,
            naming_exceptions: &exceptions,
            registry: RegistryData::embedded(),
            manifest: None,
        };
        Rule.validate(&ctx)
    }

    #[test]
    fn an_option_named_any_of_is_an_error() {
        let g = graph(
            vec![
                json!({"name": "a", "options": {"anyOf": {"type": "boolean"}}}),
                json!({"name": "b", "options": {"isSelected": {"type": "boolean"}}}),
            ],
            vec![],
        );
        let d = run(&g);
        assert_eq!(d.len(), 1);
        assert!(d[0].message.contains("'a'"));
    }
}
