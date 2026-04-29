// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use semver::Version;

use crate::report::{Diagnostic, Severity};
use crate::validate::rule::{ValidationContext, ValidationRule};

pub struct Rule;

impl ValidationRule for Rule {
    fn id(&self) -> &'static str {
        "SPEC-014"
    }

    fn name(&self) -> &'static str {
        "last-modified-not-before-introduced"
    }

    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic> {
        let mut out = Vec::new();
        for t in ctx.graph.tokens.values() {
            let Some(last_modified) = t.raw.get("lastModified").and_then(|v| v.as_str()) else {
                continue;
            };
            let Some(introduced) = t.raw.get("introduced").and_then(|v| v.as_str()) else {
                continue;
            };

            // Skip check if either version string can't be parsed — don't emit false positives
            // for unexpected formats; a separate structural rule can flag unparseable versions.
            let (Ok(lm), Ok(intro)) = (
                Version::parse(last_modified),
                Version::parse(introduced),
            ) else {
                continue;
            };

            if lm < intro {
                out.push(Diagnostic {
                    file: t.file.clone(),
                    token: Some(t.name.clone()),
                    rule_id: Some(self.id().to_string()),
                    severity: Severity::Error,
                    message: format!(
                        "Token {} has lastModified {last_modified} earlier than introduced {introduced}",
                        t.name
                    ),
                    instance_path: None,
                    schema_path: None,
                });
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn precedes(a: &str, b: &str) -> bool {
        let va = Version::parse(a).unwrap();
        let vb = Version::parse(b).unwrap();
        va < vb
    }

    #[test]
    fn basic_ordering() {
        assert!(precedes("1.0.0", "2.0.0"));
        assert!(!precedes("2.0.0", "1.0.0"));
        assert!(!precedes("2.0.0", "2.0.0"));
    }

    #[test]
    fn multi_digit_segments() {
        assert!(precedes("2.2.0", "2.10.0"));
        assert!(!precedes("2.10.0", "2.2.0"));
    }

    #[test]
    fn prerelease_precedes_release() {
        // SemVer: 1.0.0-draft < 1.0.0 (prerelease sorts before the release)
        assert!(precedes("1.0.0-draft", "1.0.0"));
        assert!(!precedes("1.0.0", "1.0.0-draft"));
    }

    #[test]
    fn equal_prerelease_versions() {
        assert!(!precedes("1.0.0-draft", "1.0.0-draft"));
    }

    #[test]
    fn introduced_in_prerelease_modified_in_release_ok() {
        // introduced: "1.0.0-draft", lastModified: "1.0.0" → modified after intro, no error
        assert!(!precedes("1.0.0", "1.0.0-draft"));
    }
}
