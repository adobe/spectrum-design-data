// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! CLI output formatters (`pretty` and `json`).

use design_data_core::report::ValidationReport;

/// Human-readable stderr/stdout mix: errors on stderr, success line on stdout.
pub fn print_report_pretty(report: &ValidationReport) {
    if report.errors.is_empty() && report.warnings.is_empty() {
        println!("No issues found.");
        return;
    }
    for d in &report.errors {
        eprintln!(
            "error: {} [{}] {}",
            d.file.display(),
            d.rule_id.as_deref().unwrap_or("structural"),
            d.message
        );
        if let Some(t) = &d.token {
            eprintln!("  token: {t}");
        }
        if let Some(p) = &d.instance_path {
            eprintln!("  at: {p}");
        }
    }
    for d in &report.warnings {
        eprintln!(
            "warning: {} [{}] {}",
            d.file.display(),
            d.rule_id.as_deref().unwrap_or("?"),
            d.message
        );
    }
}

/// Full report as JSON (stdout).
pub fn format_report_json(report: &ValidationReport) -> Result<String, serde_json::Error> {
    serde_json::to_string_pretty(report)
}
