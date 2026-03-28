// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Layer 1 — per-token JSON Schema validation for legacy and cascade token files.

use std::path::Path;

use jsonschema::ValidationError;

use serde_json::Value;

use crate::discovery::discover_json_files;
use crate::report::{Diagnostic, Severity, ValidationReport};
use crate::schema::SchemaRegistry;
use crate::CoreError;

/// Validate every `*.json` file under `data_path` as a legacy Spectrum token file.
pub fn validate_structural(
    data_path: &Path,
    registry: &SchemaRegistry,
) -> Result<ValidationReport, CoreError> {
    let mut report = ValidationReport {
        valid: true,
        errors: Vec::new(),
        warnings: Vec::new(),
    };

    let files = discover_json_files(data_path)?;
    for file in files {
        validate_token_file(&file, registry, &mut report)?;
    }

    report.recompute_valid();
    Ok(report)
}

fn validate_token_file(
    path: &Path,
    registry: &SchemaRegistry,
    report: &mut ValidationReport,
) -> Result<(), CoreError> {
    let text = std::fs::read_to_string(path)?;
    let root: Value = match serde_json::from_str(&text) {
        Ok(v) => v,
        Err(e) => {
            report.push_error(Diagnostic {
                file: path.to_path_buf(),
                token: None,
                rule_id: None,
                severity: Severity::Error,
                message: format!("invalid JSON: {e}"),
                instance_path: None,
                schema_path: None,
            });
            return Ok(());
        }
    };

    // Cascade format: top-level array of token objects.
    if let Some(arr) = root.as_array() {
        for (idx, token_value) in arr.iter().enumerate() {
            let Some(token_obj) = token_value.as_object() else {
                report.push_error(Diagnostic {
                    file: path.to_path_buf(),
                    token: None,
                    rule_id: None,
                    severity: Severity::Error,
                    message: "cascade token array element must be a JSON object".to_string(),
                    instance_path: Some(format!("/{idx}")),
                    schema_path: None,
                });
                continue;
            };

            let token_label = token_obj
                .get("uuid")
                .or_else(|| token_obj.get("name"))
                .map(|v| v.to_string())
                .unwrap_or_else(|| format!("[{idx}]"));

            let Some(schema_url) = token_obj.get("$schema").and_then(|v| v.as_str()) else {
                // Cascade tokens without $schema are allowed (e.g. alias-only tokens).
                continue;
            };

            let Some(validator) = registry.validator_for_url(schema_url) else {
                report.push_error(Diagnostic {
                    file: path.to_path_buf(),
                    token: Some(token_label),
                    rule_id: None,
                    severity: Severity::Error,
                    message: format!("unknown \"$schema\" URL (no loaded schema): {schema_url}"),
                    instance_path: Some(format!("/{idx}")),
                    schema_path: None,
                });
                continue;
            };

            for err in validator.iter_errors(token_value) {
                let err: ValidationError<'_> = err;
                report.push_error(Diagnostic {
                    file: path.to_path_buf(),
                    token: Some(token_label.clone()),
                    rule_id: None,
                    severity: Severity::Error,
                    message: err.to_string(),
                    instance_path: Some(format!("/{}{}", idx, err.instance_path)),
                    schema_path: Some(err.schema_path.to_string()),
                });
            }
        }
        return Ok(());
    }

    let Some(obj) = root.as_object() else {
        report.push_error(Diagnostic {
            file: path.to_path_buf(),
            token: None,
            rule_id: None,
            severity: Severity::Error,
            message: "token file root must be a JSON object or array".to_string(),
            instance_path: Some("/".to_string()),
            schema_path: None,
        });
        return Ok(());
    };

    for (token_name, token_value) in obj {
        let Some(token_obj) = token_value.as_object() else {
            report.push_error(Diagnostic {
                file: path.to_path_buf(),
                token: Some(token_name.clone()),
                rule_id: None,
                severity: Severity::Error,
                message: "token value must be a JSON object".to_string(),
                instance_path: Some(format!("/{}", escape_json_pointer(token_name))),
                schema_path: None,
            });
            continue;
        };

        let schema_url = match token_obj.get("$schema").and_then(|v| v.as_str()) {
            Some(u) => u,
            None => {
                report.push_error(Diagnostic {
                    file: path.to_path_buf(),
                    token: Some(token_name.clone()),
                    rule_id: None,
                    severity: Severity::Error,
                    message: "missing required \"$schema\" property".to_string(),
                    instance_path: Some(format!("/{}", escape_json_pointer(token_name))),
                    schema_path: None,
                });
                continue;
            }
        };

        let Some(validator) = registry.validator_for_url(schema_url) else {
            report.push_error(Diagnostic {
                file: path.to_path_buf(),
                token: Some(token_name.clone()),
                rule_id: None,
                severity: Severity::Error,
                message: format!("unknown \"$schema\" URL (no loaded schema): {schema_url}"),
                instance_path: Some(format!("/{}", escape_json_pointer(token_name))),
                schema_path: None,
            });
            continue;
        };

        for err in validator.iter_errors(token_value) {
            let err: ValidationError<'_> = err;
            report.push_error(Diagnostic {
                file: path.to_path_buf(),
                token: Some(token_name.clone()),
                rule_id: None,
                severity: Severity::Error,
                message: err.to_string(),
                instance_path: Some(err.instance_path.to_string()),
                schema_path: Some(err.schema_path.to_string()),
            });
        }
    }

    // Whole-file validation against token-file.json (matches packages/tokens tests).
    for err in registry.token_file_validator().iter_errors(&root) {
        let err: ValidationError<'_> = err;
        report.push_error(Diagnostic {
            file: path.to_path_buf(),
            token: None,
            rule_id: None,
            severity: Severity::Error,
            message: err.to_string(),
            instance_path: Some(err.instance_path.to_string()),
            schema_path: Some(err.schema_path.to_string()),
        });
    }

    Ok(())
}

fn escape_json_pointer(key: &str) -> String {
    key.replace('~', "~0").replace('/', "~1")
}
