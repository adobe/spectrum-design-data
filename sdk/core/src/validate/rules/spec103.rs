// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-103: token-tier-override
//!
//! A token's explicit `tokenTier` overrides the tier derived from its name and value
//! (see `token_tier`). The override is allowed; this rule reports it when it differs from
//! the derived tier so exceptions stay visible in review.

use crate::report::{Diagnostic, Severity};
use crate::token_tier::{derive, explicit};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-103"
    }

    fn name(&self) -> &'static str {
        "token-tier-override"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        ctx.graph
            .tokens
            .values()
            .filter_map(|record| {
                let declared = explicit(record)?;
                let derived = derive(record);
                (declared != derived).then(|| Diagnostic {
                    file: record.file.clone(),
                    token: Some(record.name.clone()),
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Info,
                    message: format!(
                        "tokenTier '{declared}' overrides the derived tier '{derived}'"
                    ),
                    instance_path: Some("/tokenTier".to_string()),
                    schema_path: None,
                })
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::json;

    use crate::graph::TokenGraph;
    use crate::validate::relational::diagnostics_for_rule;

    fn graph(token: serde_json::Value) -> TokenGraph {
        TokenGraph::from_pairs(vec![("t".into(), PathBuf::from("a.tokens.json"), token)])
    }

    #[test]
    fn override_that_differs_is_reported() {
        let g = graph(json!({
            "tokenTier": "primitive",
            "name": { "structure": "accessory", "property": "gap" },
            "value": "4px"
        }));
        let d = diagnostics_for_rule(&g, "SPEC-103");
        assert_eq!(d.len(), 1);
        assert!(d[0].message.contains("derived tier 'semantic'"));
    }

    #[test]
    fn override_that_matches_is_quiet() {
        let g = graph(json!({
            "tokenTier": "semantic",
            "name": { "structure": "accessory", "property": "gap" },
            "value": "4px"
        }));
        assert!(diagnostics_for_rule(&g, "SPEC-103").is_empty());
    }

    #[test]
    fn no_override_is_quiet() {
        let g = graph(json!({ "name": { "property": "gap" }, "value": "4px" }));
        assert!(diagnostics_for_rule(&g, "SPEC-103").is_empty());
    }

    #[test]
    fn derivation_order() {
        use crate::token_tier::derive;
        let rec = |v: serde_json::Value| {
            let g = graph(v);
            g.tokens.values().next().unwrap().clone()
        };
        assert_eq!(
            derive(&rec(
                json!({ "name": { "component": "tabs", "state": "hover" }, "value": "1px" })
            )),
            "component"
        );
        assert_eq!(
            derive(&rec(
                json!({ "name": { "property": "gap" }, "value": "{other}" })
            )),
            "semantic"
        );
        assert_eq!(
            derive(&rec(
                json!({ "name": { "icon": "ui", "property": "size" }, "value": "1px" })
            )),
            "semantic"
        );
        assert_eq!(
            derive(&rec(
                json!({ "name": { "property": "gap", "scaleIndex": 100 }, "value": "1px" })
            )),
            "primitive"
        );
    }
}
