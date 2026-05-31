// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-013"
    }

    fn name(&self) -> &'static str {
        "planned-removal-requires-deprecated"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for t in ctx.graph.tokens.values() {
            let Some(planned) = t.raw.get("plannedRemoval").and_then(|v| v.as_str()) else {
                continue;
            };
            let deprecated_str = t.raw.get("deprecated").and_then(|v| v.as_str());

            if deprecated_str.is_none() {
                out.push(Diagnostic {
                    file: t.file.clone(),
                    token: Some(t.name.clone()),
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Error,
                    message: format!(
                        "Token {} has plannedRemoval but is not marked deprecated",
                        t.name
                    ),
                    instance_path: None,
                    schema_path: None,
                });
                continue;
            }

            // Check that plannedRemoval does not precede deprecated using
            // numeric segment comparison (handles "3.10.0" > "3.2.0" correctly).
            if let Some(dep) = deprecated_str {
                if semver_precedes(planned, dep) {
                    out.push(Diagnostic {
                        file: t.file.clone(),
                        token: Some(t.name.clone()),
                        rule_id: Some(self.id().to_string()),
                        severity: Severity::Error,
                        message: format!(
                            "Token {} has plannedRemoval ({planned}) preceding deprecated ({dep})",
                            t.name
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

/// Returns true if version `a` precedes version `b` using numeric segment
/// comparison (e.g. "3.2.0" < "3.10.0"). Falls back to lexicographic
/// comparison if segments aren't numeric.
fn semver_precedes(a: &str, b: &str) -> bool {
    let parse = |s: &str| -> Vec<u64> {
        s.split('.')
            .map(|seg| seg.parse::<u64>().unwrap_or(u64::MAX))
            .collect()
    };
    let va = parse(a);
    let vb = parse(b);
    va < vb
}

#[cfg(test)]
mod tests {
    use super::semver_precedes;

    #[test]
    fn basic_ordering() {
        assert!(semver_precedes("3.1.0", "3.2.0"));
        assert!(!semver_precedes("3.2.0", "3.1.0"));
        assert!(!semver_precedes("3.2.0", "3.2.0"));
    }

    #[test]
    fn multi_digit_segments() {
        assert!(semver_precedes("3.2.0", "3.10.0"));
        assert!(!semver_precedes("3.10.0", "3.2.0"));
    }

    #[test]
    fn major_version_difference() {
        assert!(semver_precedes("3.9.9", "4.0.0"));
        assert!(!semver_precedes("4.0.0", "3.9.9"));
    }
}
