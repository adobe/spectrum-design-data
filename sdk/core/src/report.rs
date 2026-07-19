// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Validation reports and diagnostics (structural + relational).

use std::path::PathBuf;

use serde::Serialize;

/// Severity for a diagnostic.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Error,
    Warning,
    Info,
}

/// Single validation diagnostic.
#[derive(Debug, Clone, Serialize)]
pub struct Diagnostic {
    /// Source file (token JSON or manifest).
    pub file: PathBuf,
    /// Token name when applicable (top-level key in a token file).
    pub token: Option<String>,
    /// Rule id from the catalog (e.g. SPEC-001); structural issues omit this.
    pub rule_id: Option<String>,
    pub severity: Severity,
    pub message: String,
    /// JSON Schema instance path or similar.
    pub instance_path: Option<String>,
    /// JSON Schema keyword path when from structural validation.
    pub schema_path: Option<String>,
}

/// Combined validation result.
#[derive(Debug, Clone, Default, Serialize)]
pub struct ValidationReport {
    pub valid: bool,
    pub errors: Vec<Diagnostic>,
    pub warnings: Vec<Diagnostic>,
}

impl ValidationReport {
    /// Merge another report into `self` (recomputes `valid`).
    pub fn merge(&mut self, other: ValidationReport) {
        self.errors.extend(other.errors);
        self.warnings.extend(other.warnings);
        self.recompute_valid();
    }

    pub fn recompute_valid(&mut self) {
        self.valid = self.errors.is_empty();
    }

    pub fn push_error(&mut self, d: Diagnostic) {
        self.errors.push(d);
        self.valid = false;
    }

    pub fn push_warning(&mut self, d: Diagnostic) {
        self.warnings.push(d);
    }

    /// True if there are errors, or warnings when `strict` is set.
    pub fn failed(&self, strict: bool) -> bool {
        !self.errors.is_empty() || (strict && !self.warnings.is_empty())
    }

    /// Downgrade errors whose `rule_id` is in `ids` to warnings, and recompute
    /// `valid`. Used for report-only rollout of a rule set (e.g. component-aware
    /// rules) so violations still print without failing CI.
    pub fn downgrade_rules(&mut self, ids: &std::collections::HashSet<&str>) {
        let (keep, mut downgrade): (Vec<_>, Vec<_>) = self
            .errors
            .drain(..)
            .partition(|d| !matches!(&d.rule_id, Some(id) if ids.contains(id.as_str())));
        self.errors = keep;
        for d in &mut downgrade {
            d.severity = Severity::Warning;
        }
        self.warnings.extend(downgrade);
        self.recompute_valid();
    }
}
