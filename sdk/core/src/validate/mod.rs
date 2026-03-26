// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Structural (Layer 1) and relational (Layer 2) validation.

pub mod relational;
pub mod rule;
pub mod rules;
pub mod structural;

use std::collections::HashSet;
use std::path::Path;

use crate::graph::TokenGraph;
use crate::report::ValidationReport;
use crate::schema::SchemaRegistry;
use crate::CoreError;

/// Core validation pipeline is available (schemas + engine compile).
pub fn engine_ready() -> bool {
    true
}

/// Run structural validation then relational rules on legacy token JSON under `data_path`.
pub fn validate_all(
    data_path: &Path,
    schema_registry: &SchemaRegistry,
) -> Result<ValidationReport, CoreError> {
    validate_all_with_exceptions(data_path, schema_registry, &HashSet::new())
}

/// Run structural + relational validation with a naming-exceptions allowlist.
pub fn validate_all_with_exceptions(
    data_path: &Path,
    schema_registry: &SchemaRegistry,
    naming_exceptions: &HashSet<String>,
) -> Result<ValidationReport, CoreError> {
    let mut report = structural::validate_structural(data_path, schema_registry)?;
    let graph = TokenGraph::from_json_dir(data_path)?;
    let rel = relational::validate_relational(&graph, naming_exceptions);
    report.merge(rel);
    Ok(report)
}
