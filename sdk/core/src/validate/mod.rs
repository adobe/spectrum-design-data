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

pub mod dataset_structure;
pub mod relational;
pub mod rule;
pub mod rules;
pub mod structural;

use std::collections::HashSet;
use std::path::Path;

use crate::graph::TokenGraph;
use crate::report::{Severity, ValidationReport};
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
///
/// `mode_sets_path` is an optional directory containing spec-format mode set
/// declaration JSON files (e.g. `packages/design-data/mode-sets/`). When
/// provided, mode sets are loaded and attached to the token graph so that
/// mode-set-aware rules (SPEC-005, SPEC-008) can fire correctly.
pub fn validate_all_with_exceptions(
    data_path: &Path,
    schema_registry: &SchemaRegistry,
    naming_exceptions: &HashSet<String>,
) -> Result<ValidationReport, CoreError> {
    validate_all_with_options(data_path, schema_registry, naming_exceptions, None, None)
}

/// Full validation with all options.
///
/// `mode_sets_path` — optional directory of spec-format mode set JSON files.
/// `components_path` — optional directory of spec-format component JSON files;
/// when provided, SPEC-028 and SPEC-029 also check components and anatomy parts.
/// `names_dir` — optional directory of sidecar name maps (mirrors the token
/// source layout); when provided, name objects are merged into `record.raw`
/// at ingest so relational rules see `name` as if it were inline.
///
/// When `data_path` is a directory, a `manifest.json` sibling is loaded
/// automatically and passed to manifest-aware rules (e.g. SPEC-039).
/// When `data_path` is a single file, no manifest is loaded and SPEC-039
/// is a silent no-op even if a sibling `manifest.json` exists.
pub fn validate_all_with_options(
    data_path: &Path,
    schema_registry: &SchemaRegistry,
    naming_exceptions: &HashSet<String>,
    mode_sets_path: Option<&Path>,
    components_path: Option<&Path>,
) -> Result<ValidationReport, CoreError> {
    validate_all_with_options_and_names(
        data_path,
        schema_registry,
        naming_exceptions,
        mode_sets_path,
        components_path,
        None,
    )
}

/// Full validation with all options including sidecar names directory.
pub fn validate_all_with_options_and_names(
    data_path: &Path,
    schema_registry: &SchemaRegistry,
    naming_exceptions: &HashSet<String>,
    mode_sets_path: Option<&Path>,
    components_path: Option<&Path>,
    names_dir: Option<&Path>,
) -> Result<ValidationReport, CoreError> {
    let mut report = structural::validate_structural(data_path, schema_registry)?;
    let graph = TokenGraph::from_json_dir_with_names_and_catalogs(
        data_path,
        names_dir,
        mode_sets_path,
        components_path,
    )?;
    // Load manifest.json from the data directory when present.
    let manifest: Option<serde_json::Value> = if data_path.is_dir() {
        let mp = data_path.join("manifest.json");
        if mp.is_file() {
            std::fs::read_to_string(&mp)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
        } else {
            None
        }
    } else {
        None
    };
    let rel = relational::validate_relational(&graph, naming_exceptions, manifest.as_ref());
    report.merge(rel);
    Ok(report)
}

/// Validate a whole **dataset** rooted at `dataset_root` (or its `tokens/` dir).
///
/// Runs the SPEC-044 structural pre-check ([`dataset_structure::check_dataset_structure`])
/// **first**, so its diagnostics precede the token/relational rules and a
/// missing `tokens/` directory produces a clear "structure is incomplete"
/// message instead of a cascade of per-file errors. When `tokens/` is absent the
/// graph cannot be built, so the structural diagnostics are returned directly.
///
/// `dataset_root` MAY be the dataset root or its `tokens/` directory; it is
/// normalized via [`dataset_structure::resolve_dataset_root`].
pub fn validate_dataset(
    dataset_root: &Path,
    schema_registry: &SchemaRegistry,
    naming_exceptions: &HashSet<String>,
    mode_sets_path: Option<&Path>,
    components_path: Option<&Path>,
    names_dir: Option<&Path>,
) -> Result<ValidationReport, CoreError> {
    let root = dataset_structure::resolve_dataset_root(dataset_root);

    let mut report = ValidationReport::default();
    let structure = dataset_structure::check_dataset_structure(&root);
    let tokens_missing = structure.iter().any(|d| d.severity == Severity::Error);
    for d in structure {
        match d.severity {
            Severity::Error => report.push_error(d),
            _ => report.push_warning(d),
        }
    }

    // Without a `tokens/` directory there is nothing to build a graph from; the
    // SPEC-044 error already explains the problem, so return early.
    if tokens_missing {
        report.recompute_valid();
        return Ok(report);
    }

    let tokens_dir = root.join("tokens");
    let rest = validate_all_with_options_and_names(
        &tokens_dir,
        schema_registry,
        naming_exceptions,
        mode_sets_path,
        components_path,
        names_dir,
    )?;
    report.merge(rest);
    Ok(report)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::io::Write;
    use tempfile::TempDir;

    fn write_json(dir: &Path, file: &str, value: serde_json::Value) {
        let mut f = std::fs::File::create(dir.join(file)).unwrap();
        write!(f, "{value}").unwrap();
    }

    /// Inline mode sets co-located in the token tree must survive even when a
    /// separate mode-sets catalog is also passed (extend, not replace). A broken
    /// inline mode set (default outside modes) must still trip SPEC-005.
    #[test]
    fn inline_mode_set_retained_when_catalog_passed() {
        let data = TempDir::new().unwrap();
        let catalog = TempDir::new().unwrap();

        write_json(
            data.path(),
            "color.json",
            json!({
                "blue-100": {
                    "$schema": "https://example.com/color.json",
                    "value": "#00f",
                    "name": {"property": "background-color"}
                }
            }),
        );
        // Inline mode set with default NOT in modes → SPEC-005 violation.
        write_json(
            data.path(),
            "broken-mode-set.json",
            json!({ "name": "scale", "modes": ["medium"], "default": "large" }),
        );
        // Valid catalog mode set (default in modes) → no SPEC-005 violation.
        write_json(
            catalog.path(),
            "color-scheme.json",
            json!({ "name": "colorScheme", "modes": ["light", "dark"], "default": "light" }),
        );

        let report = validate_all_with_options(
            data.path(),
            &SchemaRegistry::new_stub(),
            &HashSet::new(),
            Some(catalog.path()),
            None,
        )
        .unwrap();

        let spec005: Vec<_> = report
            .errors
            .iter()
            .chain(report.warnings.iter())
            .filter(|d| d.rule_id.as_deref() == Some("SPEC-005"))
            .collect();
        assert_eq!(
            spec005.len(),
            1,
            "inline mode set must be retained and trip SPEC-005"
        );
        assert!(
            spec005[0].message.contains("scale"),
            "diagnostic should name the inline 'scale' mode set, got: {}",
            spec005[0].message
        );
    }
}
