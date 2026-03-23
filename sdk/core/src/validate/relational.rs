// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Layer 2 — relational rules from the catalog.

use crate::graph::TokenGraph;
use crate::report::{Diagnostic, Severity, ValidationReport};
use crate::validate::rules;

/// Run all relational rules; merges errors and warnings by severity on each diagnostic.
pub fn validate_relational(graph: &TokenGraph) -> ValidationReport {
    let mut report = ValidationReport {
        valid: true,
        errors: Vec::new(),
        warnings: Vec::new(),
    };

    for d in rules::run_rules(graph) {
        match d.severity {
            Severity::Error => report.push_error(d),
            Severity::Warning => report.push_warning(d),
            Severity::Info => report.warnings.push(d),
        }
    }

    report.recompute_valid();
    report
}

/// Test helper: filter diagnostics by rule id.
pub fn diagnostics_for_rule(graph: &TokenGraph, rule_id: &str) -> Vec<Diagnostic> {
    rules::run_rules(graph)
        .into_iter()
        .filter(|d| d.rule_id.as_deref() == Some(rule_id))
        .collect()
}
