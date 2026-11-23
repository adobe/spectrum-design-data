// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-109: platform-deviation-file-valid
//!
//! A platform's `extensions/deviations/` files MUST validate against
//! `platform-deviation.schema.json` (checked when the manifest loads, which rejects a bad
//! file) and each deviation `id` MUST be unique within its file (checked here).

use std::collections::HashSet;
use std::path::PathBuf;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};
use crate::validate::rules::deviation_util::{entries, files, id};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-109"
    }

    fn name(&self) -> &'static str {
        "platform-deviation-file-valid"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for (file, doc) in files(ctx.manifest) {
            let mut seen = HashSet::new();
            for (i, entry) in entries(doc).enumerate() {
                if seen.insert(id(entry)) {
                    continue;
                }
                out.push(Diagnostic {
                    file: PathBuf::from(file),
                    token: None,
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Error,
                    message: format!(
                        "Deviations file '{file}': duplicate deviation id '{}'",
                        id(entry)
                    ),
                    instance_path: Some(format!("/deviations/{i}/id")),
                    schema_path: None,
                });
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::Rule;
    use crate::graph::TokenGraph;
    use crate::registry::RegistryData;
    use crate::validate::rule::{ValidationContext, ValidationRule};

    #[test]
    fn flags_a_repeated_id_in_one_file_only() {
        let dup = |a: &str, b: &str| {
            json!({ "extensions": { "deviations": [{ "file": "switch.json", "deviations": {
                "component": "switch",
                "deviations": [{ "id": a }, { "id": b }] } }] } })
        };
        let g = TokenGraph::default();
        let ex = std::collections::HashSet::new();
        let run = |m: &serde_json::Value| {
            Rule.validate(&ValidationContext {
                graph: &g,
                naming_exceptions: &ex,
                registry: RegistryData::embedded(),
                manifest: Some(m),
            })
        };
        assert_eq!(run(&dup("a", "a")).len(), 1);
        assert!(run(&dup("a", "b")).is_empty());
    }

    #[test]
    fn conformance_fixture() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(
            "../../packages/design-data-spec/conformance/deviations/invalid/SPEC-109-duplicate-id/switch.json",
        );
        let doc: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap();
        let m = json!({ "extensions": { "deviations": [{ "file": "switch.json", "deviations": doc }] } });
        let g = TokenGraph::default();
        let ex = std::collections::HashSet::new();
        let out = Rule.validate(&ValidationContext {
            graph: &g,
            naming_exceptions: &ex,
            registry: RegistryData::embedded(),
            manifest: Some(&m),
        });
        assert_eq!(out.len(), 1);
    }
}
