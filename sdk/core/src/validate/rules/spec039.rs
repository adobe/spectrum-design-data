// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-039: manifest-query-parseable
//!
//! Each entry in `manifest.include` and `manifest.exclude` MUST parse as a valid
//! query expression per `spec/query.md` and MUST use only the supported query keys.
//!
//! This rule lifts the deferred "treat as opaque" clause from `spec/manifest.md`
//! — query notation is now normative in manifest fields (RFC #715).

use crate::query;
use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-039"
    }

    fn name(&self) -> &'static str {
        "manifest-query-parseable"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let Some(manifest) = ctx.manifest else {
            return Vec::new();
        };

        let mut out = Vec::new();

        for array_name in &["include", "exclude"] {
            let Some(entries) = manifest.get(array_name).and_then(|v| v.as_array()) else {
                continue;
            };
            for (idx, entry) in entries.iter().enumerate() {
                let Some(entry_str) = entry.as_str() else {
                    continue;
                };
                if let Err(err) = query::parse(entry_str) {
                    out.push(Diagnostic {
                        file: std::path::PathBuf::from("manifest.json"),
                        token: None,
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Error,
                        message: format!(
                            "Manifest {array_name}[{idx}] {entry_str:?} failed to parse as a query: {err}"
                        ),
                        instance_path: Some(format!("/{array_name}/{idx}")),
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
    use serde_json::json;

    use crate::graph::TokenGraph;
    use crate::registry::RegistryData;
    use crate::report::Severity;
    use crate::validate::rule::{ValidationContext, ValidationRule};
    use crate::validate::rules::spec039::Rule;

    fn run(manifest: Option<serde_json::Value>) -> Vec<crate::report::Diagnostic> {
        let g = TokenGraph::default();
        let exceptions = std::collections::HashSet::new();
        let registry = RegistryData::embedded();
        let ctx = ValidationContext {
            graph: &g,
            naming_exceptions: &exceptions,
            registry: &registry,
            manifest: manifest.as_ref(),
        };
        Rule.validate(&ctx)
    }

    #[test]
    fn no_manifest_no_diagnostics() {
        assert!(run(None).is_empty());
    }

    #[test]
    fn empty_include_exclude_no_diagnostics() {
        let diags = run(Some(json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "include": [],
            "exclude": []
        })));
        assert!(diags.is_empty());
    }

    #[test]
    fn valid_queries_pass() {
        let diags = run(Some(json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "include": ["component=button", "component=button,state=hover"],
            "exclude": ["component=button,colorScheme!=light"]
        })));
        assert!(diags.is_empty());
    }

    #[test]
    fn unknown_key_errors() {
        let diags = run(Some(json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "include": ["component=button,bogusKey=foo"]
        })));
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-039"));
        assert!(diags[0].message.contains("bogusKey"));
        assert_eq!(diags[0].instance_path.as_deref(), Some("/include/0"));
    }

    #[test]
    fn syntax_error_errors() {
        // A bare word with no `=` or `!=` operator is a syntax error.
        let diags = run(Some(json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "include": ["not-a-valid-query"]
        })));
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-039"));
        assert_eq!(diags[0].instance_path.as_deref(), Some("/include/0"));
    }

    #[test]
    fn exclude_unknown_key_errors() {
        let diags = run(Some(json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "exclude": ["badField=x"]
        })));
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].instance_path.as_deref(), Some("/exclude/0"));
    }

    #[test]
    fn multiple_errors_reported() {
        let diags = run(Some(json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "include": ["component=button", "badKey=foo", "otherBad=bar"]
        })));
        assert_eq!(diags.len(), 2);
        assert!(diags.iter().all(|d| d.severity == Severity::Error));
    }

    #[test]
    fn no_include_exclude_no_diagnostics() {
        // Manifest with no include/exclude keys — spec allows them to be absent.
        let diags = run(Some(json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0"
        })));
        assert!(diags.is_empty());
    }

    #[test]
    fn non_string_entries_silently_skipped() {
        // Non-string entries (e.g. a number) are skipped without an error.
        // Layer 1 schema validation catches these; SPEC-039 only parses strings.
        let diags = run(Some(json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "include": [42, true, null]
        })));
        assert!(diags.is_empty());
    }
}
