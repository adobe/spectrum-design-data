// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Snapshot comparison for `migrate --verify` backward-compat checks.

use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::report::{Severity, ValidationReport};
use crate::CoreError;

/// Serializable validation outcome for golden-file comparison.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ValidationSnapshot {
    pub errors: Vec<SnapshotDiagnostic>,
    pub warnings: Vec<SnapshotDiagnostic>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct SnapshotDiagnostic {
    pub file: String,
    pub token: Option<String>,
    pub rule_id: Option<String>,
    pub severity: String,
    pub message: String,
}

impl From<&ValidationReport> for ValidationSnapshot {
    fn from(report: &ValidationReport) -> Self {
        Self {
            errors: report.errors.iter().map(SnapshotDiagnostic::from).collect(),
            warnings: report
                .warnings
                .iter()
                .map(SnapshotDiagnostic::from)
                .collect(),
        }
    }
}

impl From<&crate::report::Diagnostic> for SnapshotDiagnostic {
    fn from(d: &crate::report::Diagnostic) -> Self {
        SnapshotDiagnostic {
            file: d.file.display().to_string(),
            token: d.token.clone(),
            rule_id: d.rule_id.clone(),
            severity: match d.severity {
                Severity::Error => "error".to_string(),
                Severity::Warning => "warning".to_string(),
                Severity::Info => "info".to_string(),
            },
            message: d.message.clone(),
        }
    }
}

/// Read a snapshot JSON file from disk.
pub fn load_snapshot(path: &Path) -> Result<ValidationSnapshot, CoreError> {
    let text = std::fs::read_to_string(path)?;
    let snap: ValidationSnapshot = serde_json::from_str(&text)?;
    Ok(snap)
}

/// Write snapshot JSON (stable key order via sorted diagnostics).
pub fn write_snapshot(path: &Path, snapshot: &ValidationSnapshot) -> Result<(), CoreError> {
    let mut snap = snapshot.clone();
    snap.errors.sort();
    snap.warnings.sort();
    let text = serde_json::to_string_pretty(&snap)?;
    std::fs::write(path, text)?;
    Ok(())
}

/// Compare current report to an expected snapshot (sorted).
pub fn snapshot_matches(report: &ValidationReport, expected: &ValidationSnapshot) -> bool {
    let mut current = ValidationSnapshot::from(report);
    current.errors.sort();
    current.warnings.sort();
    let mut exp = expected.clone();
    exp.errors.sort();
    exp.warnings.sort();
    current == exp
}
