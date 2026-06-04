// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! SPEC-044 `dataset-structure` — filesystem structural pre-check.
//!
//! Unlike the Layer 2 relational rules (which operate on an in-memory
//! [`crate::graph::TokenGraph`]), this check inspects the **on-disk directory
//! layout** of a dataset, so it is implemented as a free function pre-pass that
//! runs *before* the graph is built. See
//! `packages/design-data-spec/spec/dataset-layout.md#structural-validation` and
//! the `SPEC-044` entry in `packages/design-data-spec/rules/rules.yaml`.

use std::path::{Path, PathBuf};

use crate::report::{Diagnostic, Severity};

/// The rule id reported by this pre-check.
pub const RULE_ID: &str = "SPEC-044";

/// Registered optional directories, each validated against its own schema when present.
const REGISTERED_OPTIONAL_DIRS: &[&str] = &["components", "fields", "mode-sets", "registry"];

/// Resolve the dataset root from a path that may be the dataset root itself or
/// its `tokens/` directory.
///
/// The CLI commonly validates `<root>/tokens`, so when `path` is named `tokens`
/// the dataset root is its parent; otherwise `path` is treated as the root.
pub fn resolve_dataset_root(path: &Path) -> PathBuf {
    if path.file_name().and_then(|n| n.to_str()) == Some("tokens") {
        path.parent()
            .map(Path::to_path_buf)
            .unwrap_or_else(|| path.to_path_buf())
    } else {
        path.to_path_buf()
    }
}

/// Run the SPEC-044 structural pre-check against `dataset_root`.
///
/// - **Error** when `tokens/` is absent, or present but contains no
///   `*.tokens.json` file.
/// - **Warning** when a registered optional directory (`components/`, `fields/`,
///   `mode-sets/`, `registry/`) is present but contains no `*.json` file.
///
/// Returns an empty vec for a conformant layout.
pub fn check_dataset_structure(dataset_root: &Path) -> Vec<Diagnostic> {
    let mut out = Vec::new();

    let tokens_dir = dataset_root.join("tokens");
    if !tokens_dir.is_dir() {
        out.push(diag(
            dataset_root,
            Severity::Error,
            format!(
                "required `tokens/` directory not found at {}",
                tokens_dir.display()
            ),
        ));
    } else if !has_file_with_suffix(&tokens_dir, ".tokens.json") {
        out.push(diag(
            &tokens_dir,
            Severity::Error,
            format!(
                "`tokens/` at {} contains no `*.tokens.json` files",
                tokens_dir.display()
            ),
        ));
    }

    for name in REGISTERED_OPTIONAL_DIRS {
        let dir = dataset_root.join(name);
        if dir.is_dir() && !has_file_with_suffix(&dir, ".json") {
            out.push(diag(
                &dir,
                Severity::Warning,
                format!("registered `{name}/` directory is present but contains no `*.json` files"),
            ));
        }
    }

    out
}

/// Build a SPEC-044 diagnostic with the rule's `message` template applied.
fn diag(file: &Path, severity: Severity, detail: String) -> Diagnostic {
    Diagnostic {
        file: file.to_path_buf(),
        token: None,
        rule_id: Some(RULE_ID.to_string()),
        severity,
        message: format!("Dataset structure incomplete: {detail}"),
        instance_path: None,
        schema_path: None,
    }
}

/// Recursively report whether `dir` contains at least one file whose name ends
/// with `suffix`. Unreadable subdirectories are skipped rather than erroring.
fn has_file_with_suffix(dir: &Path, suffix: &str) -> bool {
    let mut stack = vec![dir.to_path_buf()];
    while let Some(current) = stack.pop() {
        let Ok(entries) = std::fs::read_dir(&current) else {
            continue;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path
                .file_name()
                .and_then(|n| n.to_str())
                .is_some_and(|n| n.ends_with(suffix))
            {
                return true;
            }
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn touch(path: &Path) {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        fs::write(path, b"{}").unwrap();
    }

    #[test]
    fn missing_tokens_dir_is_error() {
        let tmp = TempDir::new().unwrap();
        let diags = check_dataset_structure(tmp.path());
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
        assert_eq!(diags[0].rule_id.as_deref(), Some("SPEC-044"));
        assert!(diags[0].message.contains("tokens/"));
    }

    #[test]
    fn empty_tokens_dir_is_error() {
        let tmp = TempDir::new().unwrap();
        fs::create_dir_all(tmp.path().join("tokens")).unwrap();
        let diags = check_dataset_structure(tmp.path());
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
        assert!(diags[0].message.contains("*.tokens.json"));
    }

    #[test]
    fn tokens_with_non_tokens_json_is_error() {
        let tmp = TempDir::new().unwrap();
        touch(&tmp.path().join("tokens/color.json"));
        let diags = check_dataset_structure(tmp.path());
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Error);
    }

    #[test]
    fn valid_layout_has_no_diagnostics() {
        let tmp = TempDir::new().unwrap();
        touch(&tmp.path().join("tokens/color.tokens.json"));
        let diags = check_dataset_structure(tmp.path());
        assert!(diags.is_empty(), "expected no diagnostics, got {diags:?}");
    }

    #[test]
    fn nested_tokens_file_satisfies_requirement() {
        let tmp = TempDir::new().unwrap();
        touch(&tmp.path().join("tokens/color/blue.tokens.json"));
        let diags = check_dataset_structure(tmp.path());
        assert!(diags.is_empty(), "expected no diagnostics, got {diags:?}");
    }

    #[test]
    fn empty_registered_optional_dir_is_warning() {
        let tmp = TempDir::new().unwrap();
        touch(&tmp.path().join("tokens/color.tokens.json"));
        fs::create_dir_all(tmp.path().join("components")).unwrap();
        let diags = check_dataset_structure(tmp.path());
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, Severity::Warning);
        assert!(diags[0].message.contains("components/"));
    }

    #[test]
    fn populated_optional_dir_has_no_warning() {
        let tmp = TempDir::new().unwrap();
        touch(&tmp.path().join("tokens/color.tokens.json"));
        touch(&tmp.path().join("components/button.json"));
        let diags = check_dataset_structure(tmp.path());
        assert!(diags.is_empty(), "expected no diagnostics, got {diags:?}");
    }

    #[test]
    fn resolve_dataset_root_from_tokens_dir() {
        let root = Path::new("/some/dataset");
        assert_eq!(resolve_dataset_root(&root.join("tokens")), root);
        assert_eq!(resolve_dataset_root(root), root);
    }
}
