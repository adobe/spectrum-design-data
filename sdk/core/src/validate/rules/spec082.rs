// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-082: platform-manifest-applies
//!
//! A platform manifest MUST apply to the foundation graph. SPEC-076, SPEC-079 and the platform
//! recipe checks all apply it themselves and return nothing when it fails, so without this
//! rule a manifest that cannot apply (for example one that extends a mode set that was not
//! loaded) looks like a pass. A silent no-op without a manifest.

use serde_json::Value;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-082"
    }

    fn name(&self) -> &'static str {
        "platform-manifest-applies"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let Some(manifest) = ctx.manifest else {
            return vec![];
        };
        if has_unparseable_query(manifest) {
            return vec![]; // SPEC-039 explains it
        }
        let Err(error) = ctx.graph.clone().apply_platform_manifest(manifest) else {
            return vec![];
        };
        let platform = manifest
            .get("platform")
            .and_then(Value::as_str)
            .unwrap_or("platform");
        vec![Diagnostic {
            file: std::path::PathBuf::from("manifest.json"),
            token: None,
            rule_id: Some(self.id().to_string()),
            severity: Severity::Error,
            message: format!(
                "Platform '{platform}' failed to apply, so the platform rules (SPEC-076, SPEC-079 and the platform recipe checks) did not run: {error}. If the manifest extends a mode set, pass --mode-sets-path"
            ),
            instance_path: None,
            schema_path: None,
        }]
    }
}

fn has_unparseable_query(manifest: &Value) -> bool {
    ["include", "exclude"]
        .iter()
        .filter_map(|k| manifest.get(k).and_then(Value::as_array))
        .flatten()
        .filter_map(Value::as_str)
        .any(|q| crate::query::parse(q).is_err())
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use serde_json::{json, Value};

    use crate::validate::rules::run_rules;
    use crate::validate::rules::visual_util::test_util::graph;

    fn spec082(manifest: Option<&Value>) -> Vec<String> {
        let g = graph(
            json!({ "name": "button", "anatomy": [{ "name": "container" }],
                "options": { "size": { "type": "string", "default": "m",
                    "values": [{ "value": "m" }] } } }),
            vec![],
            vec![],
            vec![],
        );
        run_rules(&g, &HashSet::new(), manifest)
            .into_iter()
            .filter(|d| d.rule_id.as_deref() == Some("SPEC-082"))
            .map(|d| d.message)
            .collect()
    }

    #[test]
    fn a_manifest_that_cannot_apply_is_an_error_naming_the_platform_and_the_cause() {
        let m = json!({ "platform": "fixture", "extensions": { "platformExtensions": [
            { "platform": "fixture", "extends": "no-such-mode-set", "termId": "x" } ] } });
        let msgs = spec082(Some(&m));
        assert_eq!(msgs.len(), 1, "{msgs:?}");
        assert!(msgs[0].contains("'fixture'"), "{}", msgs[0]);
        assert!(msgs[0].contains("no-such-mode-set"), "{}", msgs[0]);
        assert!(msgs[0].contains("--mode-sets-path"), "{}", msgs[0]);
    }

    #[test]
    fn a_bad_query_is_left_to_spec_039() {
        let m = json!({ "platform": "fixture", "exclude": ["not-a-valid-query"] });
        assert!(spec082(Some(&m)).is_empty());
    }

    #[test]
    fn a_manifest_that_applies_or_is_absent_reports_nothing() {
        assert!(spec082(None).is_empty());
        assert!(spec082(Some(&json!({ "platform": "fixture" }))).is_empty());
        assert!(spec082(Some(
            &json!({ "platform": "fixture", "exclude": ["colorScheme=dark"] })
        ))
        .is_empty());
    }
}
